from typing import Annotated

from fastapi import APIRouter, Depends
from sqlalchemy import func, select, text
from sqlalchemy.orm import Session

from app.auth import tecnico
from app.database import get_session
from app.models import Celda, Estancia, Pago, Usuario, Vehiculo

router = APIRouter(prefix="/sistema", tags=["Sistema"], dependencies=[Depends(tecnico)])
DatabaseSession = Annotated[Session, Depends(get_session)]


@router.get("/estado")
def estado(session: DatabaseSession) -> dict:
    """Estado técnico para mantenimiento; no expone datos de pagos ni de personas."""
    try:
        session.execute(text("SELECT 1"))
        base_datos = "ok"
        version = session.scalar(text("SELECT version_num FROM alembic_version"))
        conteos = {
            "vehiculos": session.scalar(select(func.count()).select_from(Vehiculo)),
            "celdas": session.scalar(select(func.count()).select_from(Celda)),
            "estancias_abiertas": session.scalar(
                select(func.count()).select_from(Estancia).where(Estancia.salida.is_(None))),
            "usuarios_activos": session.scalar(
                select(func.count()).select_from(Usuario).where(Usuario.activo.is_(True))),
            "pagos_registrados": session.scalar(select(func.count()).select_from(Pago)),
        }
    except Exception:
        session.rollback()
        return {"api": "ok", "base_datos": "error", "migracion": None, "conteos": {}}
    return {"api": "ok", "base_datos": base_datos, "migracion": version, "conteos": conteos}
