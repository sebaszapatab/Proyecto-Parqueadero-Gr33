from datetime import date, datetime, timedelta
from functools import wraps

from sqlalchemy import and_, func, or_, select
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session, selectinload

from app.models import Estancia, Vehiculo
from app.services.pago import BOGOTA


class ReporteError(Exception):
    def __init__(self, status_code: int, detail: str) -> None:
        self.status_code = status_code
        self.detail = detail


def database_operation(operation):
    @wraps(operation)
    def wrapped(session: Session, *args, **kwargs):
        try:
            return operation(session, *args, **kwargs)
        except SQLAlchemyError:
            session.rollback()
            raise ReporteError(503, "No se pudo completar la operación con la base de datos.") from None
    return wrapped


def _limites(desde: date | None, hasta: date | None):
    ini = datetime.combine(desde, datetime.min.time(), BOGOTA) if desde else None
    fin = datetime.combine(hasta + timedelta(days=1), datetime.min.time(), BOGOTA) if hasta else None
    return ini, fin


def _en_rango(columna, ini, fin):
    condiciones = []
    if ini is not None:
        condiciones.append(columna >= ini)
    if fin is not None:
        condiciones.append(columna < fin)
    return and_(*condiciones) if condiciones else None


@database_operation
def reporte_movimientos(session: Session, offset: int, limit: int, desde: date | None, hasta: date | None,
                        placa: str | None) -> dict:
    if desde is not None and hasta is not None and desde > hasta:
        raise ReporteError(422, "La fecha inicial no puede ser posterior a la final.")
    ini, fin = _limites(desde, hasta)
    base = []
    if placa and placa.strip():
        base.append(Estancia.vehiculo.has(Vehiculo.placa == placa.strip().upper()))
    en_entrada = _en_rango(Estancia.entrada, ini, fin)
    en_salida = _en_rango(Estancia.salida, ini, fin)
    # Con rango: estancias cuya entrada o cuya salida cae dentro. Sin rango: todas.
    if en_entrada is not None:
        base.append(or_(en_entrada, en_salida))

    def contar(*extra) -> int:
        return session.scalar(select(func.count()).select_from(Estancia).where(*base, *extra))

    total = contar()
    entradas = contar(en_entrada) if en_entrada is not None else total
    salidas = contar(en_salida) if en_salida is not None else contar(Estancia.salida.is_not(None))
    dentro = contar(Estancia.salida.is_(None))
    rows = session.scalars(
        select(Estancia).where(*base)
        .options(selectinload(Estancia.vehiculo), selectinload(Estancia.celda),
                 selectinload(Estancia.operador_entrada), selectinload(Estancia.operador_salida))
        .order_by(Estancia.entrada.desc(), Estancia.id.desc()).offset(offset).limit(limit)
    )
    items = [{
        "id": e.id, "placa": e.vehiculo.placa, "tipo_vehiculo": e.vehiculo.tipo, "celda": e.celda.codigo,
        "entrada": e.entrada, "salida": e.salida, "operador_entrada": e.operador_entrada.nombre,
        "operador_salida": e.operador_salida.nombre if e.operador_salida else None,
        "minutos": int((e.salida - e.entrada).total_seconds() // 60) if e.salida else None,
    } for e in rows]
    return {"items": items, "total": total, "offset": offset, "limit": limit,
            "entradas": entradas, "salidas": salidas, "dentro": dentro}
