import calendar
from datetime import date, datetime, timedelta, timezone
from decimal import Decimal
from functools import wraps

from sqlalchemy import func, select
from sqlalchemy.exc import IntegrityError, SQLAlchemyError
from sqlalchemy.orm import Session

from app.models import Pago, Tarifa, Usuario, Vehiculo, required_text
from app.schemas.pago import PagoAnular, PagoCrear, TarifaActualizar

BOGOTA = timezone(timedelta(hours=-5))  # Colombia no usa horario de verano


class PagoError(Exception):
    def __init__(self, status_code: int, detail: str) -> None:
        self.status_code = status_code
        self.detail = detail


def database_operation(operation):
    @wraps(operation)
    def wrapped(session: Session, *args, **kwargs):
        try:
            return operation(session, *args, **kwargs)
        except IntegrityError:
            session.rollback()
            raise PagoError(409, "La operación entra en conflicto con los datos existentes.") from None
        except SQLAlchemyError:
            session.rollback()
            raise PagoError(503, "No se pudo completar la operación con la base de datos.") from None
    return wrapped


def hoy() -> date:
    return datetime.now(BOGOTA).date()


def sumar_mes(d: date) -> date:
    """Mismo día del mes siguiente (o el último día si ese mes es más corto)."""
    year, month = (d.year + 1, 1) if d.month == 12 else (d.year, d.month + 1)
    return date(year, month, min(d.day, calendar.monthrange(year, month)[1]))


def clasificar(vence: date | None, hoy_: date) -> str:
    if vence is None:
        return "sin_pago"
    return "vigente" if vence >= hoy_ else "vencida"


def _vehiculo_por_placa(session: Session, placa: str, lock: bool = False) -> Vehiculo:
    query = select(Vehiculo).where(Vehiculo.placa == placa)
    vehiculo = session.scalar(query.with_for_update() if lock else query)
    if vehiculo is None:
        raise PagoError(404, "Vehículo no encontrado.")
    return vehiculo


def _vence(session: Session, vehiculo_id: int) -> date | None:
    return session.scalar(select(func.max(Pago.hasta)).where(
        Pago.vehiculo_id == vehiculo_id, Pago.anulado.is_(False)))


def _valor_tarifa(session: Session, tipo: str) -> Decimal | None:
    return session.scalar(select(Tarifa.valor).where(Tarifa.tipo == tipo))


def _comprobante(pago: Pago) -> dict:
    return {
        "id": pago.id, "placa": pago.vehiculo.placa, "marca": pago.vehiculo.marca, "tipo": pago.vehiculo.tipo,
        "monto": pago.monto, "desde": pago.desde, "hasta": pago.hasta, "creado": pago.creado,
        "registrado_por": pago.registrado_por.nombre, "anulado": pago.anulado,
        "motivo_anulacion": pago.motivo_anulacion,
        "anulado_por": pago.anulado_por.nombre if pago.anulado_por else None,
        "anulado_en": pago.anulado_en,
    }


@database_operation
def list_tarifas(session: Session) -> list[Tarifa]:
    return list(session.scalars(select(Tarifa).order_by(Tarifa.tipo)))


@database_operation
def update_tarifa(session: Session, tipo: str, data: TarifaActualizar) -> Tarifa:
    tarifa = session.scalar(select(Tarifa).where(Tarifa.tipo == tipo))
    if tarifa is None:
        tarifa = Tarifa(tipo=tipo, valor=data.valor)
        session.add(tarifa)
    else:
        tarifa.valor = data.valor
    session.commit()
    session.refresh(tarifa)
    return tarifa


@database_operation
def estado_pago(session: Session, placa: str) -> dict:
    vehiculo = _vehiculo_por_placa(session, placa)
    vence = _vence(session, vehiculo.id)
    return {"placa": vehiculo.placa, "tipo": vehiculo.tipo, "estado": clasificar(vence, hoy()),
            "vence": vence, "valor_mensualidad": _valor_tarifa(session, vehiculo.tipo)}


@database_operation
def registrar_pago(session: Session, data: PagoCrear, actor: Usuario) -> dict:
    # Se bloquea el vehículo para que dos cobros simultáneos no repitan el mismo periodo.
    vehiculo = _vehiculo_por_placa(session, data.placa, lock=True)
    valor = _valor_tarifa(session, vehiculo.tipo)
    if valor is None:
        raise PagoError(409, f"No hay tarifa configurada para {vehiculo.tipo}.")
    hoy_ = hoy()
    vence = _vence(session, vehiculo.id)
    # Si sigue vigente, el nuevo mes se suma al vencimiento; si venció (o es el primero), empieza hoy.
    desde = vence if vence is not None and vence >= hoy_ else hoy_
    pago = Pago(vehiculo_id=vehiculo.id, monto=valor, desde=desde, hasta=sumar_mes(desde),
                registrado_por_id=actor.id)
    session.add(pago)
    session.commit()
    session.refresh(pago)
    return _comprobante(pago)


@database_operation
def get_pago(session: Session, pago_id: int) -> dict:
    pago = session.get(Pago, pago_id)
    if pago is None:
        raise PagoError(404, "Pago no encontrado.")
    return _comprobante(pago)


@database_operation
def anular_pago(session: Session, pago_id: int, data: PagoAnular, actor: Usuario) -> dict:
    pago = session.get(Pago, pago_id, with_for_update=True)
    if pago is None:
        raise PagoError(404, "Pago no encontrado.")
    if pago.anulado:
        raise PagoError(409, "El pago ya está anulado.")
    pago.anulado = True
    pago.motivo_anulacion = required_text(data.motivo, "motivo")
    pago.anulado_por_id = actor.id
    pago.anulado_en = datetime.now(timezone.utc)
    session.commit()
    session.refresh(pago)
    return _comprobante(pago)


def _rango(desde: date | None, hasta: date | None):
    conditions = []
    if desde is not None:
        conditions.append(Pago.creado >= datetime.combine(desde, datetime.min.time(), BOGOTA))
    if hasta is not None:
        conditions.append(Pago.creado < datetime.combine(hasta + timedelta(days=1), datetime.min.time(), BOGOTA))
    return conditions


@database_operation
def list_pagos(session: Session, offset: int, limit: int, desde: date | None, hasta: date | None,
               placa: str | None) -> dict:
    conditions = _rango(desde, hasta)
    if placa:
        conditions.append(Pago.vehiculo.has(Vehiculo.placa == placa.strip().upper()))
    total = session.scalar(select(func.count()).select_from(Pago).where(*conditions))
    recaudado = session.scalar(select(func.coalesce(func.sum(Pago.monto), 0)).where(
        *conditions, Pago.anulado.is_(False)))
    rows = session.scalars(select(Pago).where(*conditions).order_by(Pago.creado.desc(), Pago.id.desc())
                           .offset(offset).limit(limit))
    return {"items": [_comprobante(p) for p in rows], "total": total, "offset": offset, "limit": limit,
            "total_recaudado": recaudado}


@database_operation
def list_vencidos(session: Session) -> dict:
    vence = select(Pago.vehiculo_id, func.max(Pago.hasta).label("vence")).where(
        Pago.anulado.is_(False)).group_by(Pago.vehiculo_id).subquery()
    rows = session.execute(select(Vehiculo, vence.c.vence).outerjoin(vence, vence.c.vehiculo_id == Vehiculo.id)
                           .order_by(vence.c.vence.nulls_first(), Vehiculo.placa)).all()
    tarifas = {t.tipo: t.valor for t in session.scalars(select(Tarifa))}
    hoy_ = hoy()
    items = []
    for vehiculo, fecha in rows:
        estado = clasificar(fecha, hoy_)
        if estado != "vigente":
            items.append({"placa": vehiculo.placa, "tipo": vehiculo.tipo, "estado": estado, "vence": fecha,
                          "valor_mensualidad": tarifas.get(vehiculo.tipo)})
    return {"items": items, "total": len(items)}
