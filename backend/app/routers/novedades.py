from datetime import date
from typing import Annotated

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.auth import operativo, solo_operador
from app.database import get_session
from app.models import Usuario
from app.schemas.novedad import NovedadCrear, NovedadesPagina, NovedadRespuesta
from app.services import novedad as service

router = APIRouter(prefix="/novedades", tags=["Novedades"])
DatabaseSession = Annotated[Session, Depends(get_session)]


@router.post("", response_model=NovedadRespuesta, status_code=201)
def crear(data: NovedadCrear, actor: Annotated[Usuario, Depends(solo_operador)], session: DatabaseSession):
    return service.crear_novedad(session, data, actor)


@router.get("", response_model=NovedadesPagina, dependencies=[Depends(operativo)])
def listar(
    session: DatabaseSession,
    offset: Annotated[int, Query(ge=0, le=9223372036854775807)] = 0,
    limit: Annotated[int, Query(ge=1, le=100)] = 20,
    desde: date | None = None,
    hasta: date | None = None,
    placa: Annotated[str | None, Query(max_length=20)] = None,
):
    return service.listar_novedades(session, offset, limit, desde, hasta, placa)
