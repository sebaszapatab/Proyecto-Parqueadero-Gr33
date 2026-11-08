from datetime import date
from typing import Annotated

from fastapi import APIRouter, Depends, Path, Query
from sqlalchemy.orm import Session

from app.auth import administrador, operativo
from app.database import get_session
from app.models import Usuario
from app.schemas.pago import (
    EstadoPago, PagoAnular, PagoCrear, PagoRespuesta, PagosPagina, TarifaActualizar,
    TarifaRespuesta, Tipo, VencidosRespuesta,
)
from app.schemas.vehiculo import Placa
from app.services import pago as service

router = APIRouter(prefix="/pagos", tags=["Pagos"])
DatabaseSession = Annotated[Session, Depends(get_session)]
Admin = Annotated[Usuario, Depends(administrador)]
PagoId = Annotated[int, Path(ge=1, le=9223372036854775807)]


@router.get("/tarifas", response_model=list[TarifaRespuesta], dependencies=[Depends(operativo)])
def tarifas(session: DatabaseSession):
    return service.list_tarifas(session)


@router.put("/tarifas/{tipo}", response_model=TarifaRespuesta)
def cambiar_tarifa(tipo: Tipo, data: TarifaActualizar, session: DatabaseSession, actor: Admin):
    return service.update_tarifa(session, tipo, data)


@router.get("/vencidos", response_model=VencidosRespuesta, dependencies=[Depends(operativo)])
def vencidos(session: DatabaseSession):
    return service.list_vencidos(session)


@router.get("/estado/{placa}", response_model=EstadoPago, dependencies=[Depends(operativo)])
def estado(placa: Placa, session: DatabaseSession):
    return service.estado_pago(session, placa)


@router.post("", response_model=PagoRespuesta, status_code=201)
def registrar(data: PagoCrear, session: DatabaseSession, actor: Annotated[Usuario, Depends(operativo)]):
    return service.registrar_pago(session, data, actor)


@router.get("", response_model=PagosPagina)
def listar(
    session: DatabaseSession,
    actor: Admin,
    offset: Annotated[int, Query(ge=0, le=9223372036854775807)] = 0,
    limit: Annotated[int, Query(ge=1, le=100)] = 20,
    desde: date | None = None,
    hasta: date | None = None,
    placa: Annotated[str | None, Query(max_length=20)] = None,
):
    return service.list_pagos(session, offset, limit, desde, hasta, placa)


@router.get("/{id}", response_model=PagoRespuesta)
def comprobante(id: PagoId, session: DatabaseSession, actor: Admin):
    return service.get_pago(session, id)


@router.post("/{id}/anular", response_model=PagoRespuesta)
def anular(id: PagoId, data: PagoAnular, session: DatabaseSession, actor: Admin):
    return service.anular_pago(session, id, data, actor)
