from datetime import date, datetime, timedelta
from functools import wraps

from sqlalchemy import func, select
from sqlalchemy.exc import IntegrityError, SQLAlchemyError
from sqlalchemy.orm import Session

from app.models import Estancia, Novedad, Usuario, Vehiculo
from app.schemas.novedad import NovedadCrear
from app.services.pago import BOGOTA


class NovedadError(Exception):
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
            raise NovedadError(409, "La operación entra en conflicto con los datos existentes.") from None
        except SQLAlchemyError:
            session.rollback()
            raise NovedadError(503, "No se pudo completar la operación con la base de datos.") from None
    return wrapped


def _fila(novedad: Novedad) -> dict:
    return {
        "id": novedad.id, "estancia_id": novedad.estancia_id,
        "placa": novedad.estancia.vehiculo.placa, "celda": novedad.estancia.celda.codigo,
        "tipo": novedad.tipo, "momento": novedad.momento, "descripcion": novedad.descripcion,
        "registrada_por": novedad.registrada_por.nombre, "creada": novedad.creada,
    }


@database_operation
def crear_novedad(session: Session, data: NovedadCrear, actor: Usuario) -> dict:
    vehiculo = session.scalar(select(Vehiculo).where(Vehiculo.placa == data.placa))
    if vehiculo is None:
        raise NovedadError(404, "Vehículo no encontrado.")
    # La novedad se asocia a la estancia más reciente del vehículo (abierta o ya cerrada).
    estancia = session.scalar(select(Estancia).where(Estancia.vehiculo_id == vehiculo.id)
                              .order_by(Estancia.entrada.desc(), Estancia.id.desc()).limit(1))
    if estancia is None:
        raise NovedadError(409, "El vehículo no tiene entradas registradas.")
    if data.momento == "SALIDA" and estancia.salida is None:
        raise NovedadError(409, "El vehículo aún no ha salido: registra la novedad como de entrada.")
    novedad = Novedad(estancia_id=estancia.id, tipo=data.tipo, momento=data.momento,
                      descripcion=data.descripcion, registrada_por_id=actor.id)
    session.add(novedad)
    session.commit()
    session.refresh(novedad)
    return _fila(novedad)


@database_operation
def listar_novedades(session: Session, offset: int, limit: int, desde: date | None, hasta: date | None,
                     placa: str | None) -> dict:
    conditions = []
    if desde is not None:
        conditions.append(Novedad.creada >= datetime.combine(desde, datetime.min.time(), BOGOTA))
    if hasta is not None:
        conditions.append(Novedad.creada < datetime.combine(hasta + timedelta(days=1), datetime.min.time(), BOGOTA))
    if placa and placa.strip():
        conditions.append(Novedad.estancia.has(Estancia.vehiculo.has(Vehiculo.placa == placa.strip().upper())))
    total = session.scalar(select(func.count()).select_from(Novedad).where(*conditions))
    rows = session.scalars(select(Novedad).where(*conditions).order_by(Novedad.creada.desc(), Novedad.id.desc())
                           .offset(offset).limit(limit))
    return {"items": [_fila(n) for n in rows], "total": total, "offset": offset, "limit": limit}
