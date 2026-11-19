"""Bitácora de errores del servidor. Nunca debe causar un nuevo fallo en la petición original."""
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.database import get_engine
from app.models import BitacoraError


def registrar_error(metodo: str, ruta: str, estado: int, mensaje: str) -> None:
    """Guarda un error 5xx con su propia sesión. Solo ruta sin parámetros y un mensaje corto."""
    try:
        with Session(get_engine()) as session:
            session.add(BitacoraError(metodo=metodo[:10], ruta=ruta[:200], estado=estado, mensaje=mensaje[:300]))
            session.commit()
    except Exception:
        pass  # si la base de datos es justo lo que falla, no se puede registrar


def listar_errores(session: Session, limit: int) -> dict:
    total = session.scalar(select(func.count()).select_from(BitacoraError))
    items = list(session.scalars(select(BitacoraError).order_by(BitacoraError.creado.desc(),
                                                                BitacoraError.id.desc()).limit(limit)))
    return {"items": items, "total": total}
