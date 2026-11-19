from datetime import date
from typing import Annotated

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.auth import operativo
from app.database import get_session
from app.schemas.reporte import ReporteMovimientos
from app.services import reporte as service

router = APIRouter(prefix="/reportes", tags=["Reportes"], dependencies=[Depends(operativo)])
DatabaseSession = Annotated[Session, Depends(get_session)]


@router.get("/movimientos", response_model=ReporteMovimientos)
def movimientos(
    session: DatabaseSession,
    offset: Annotated[int, Query(ge=0, le=9223372036854775807)] = 0,
    limit: Annotated[int, Query(ge=1, le=500)] = 20,
    desde: date | None = None,
    hasta: date | None = None,
    placa: Annotated[str | None, Query(max_length=20)] = None,
):
    """Entradas y salidas por rango de fechas (zona horaria de Bogotá)."""
    return service.reporte_movimientos(session, offset, limit, desde, hasta, placa)
