from typing import Annotated

from fastapi import APIRouter, Depends, Path, Query
from sqlalchemy.orm import Session

from app.auth import administrador
from app.database import get_session
from app.models import Usuario
from app.schemas.usuario import UsuarioActualizar, UsuarioCrear, UsuarioRespuesta, UsuariosPagina
from app.services import usuario as service

router = APIRouter(prefix="/usuarios", tags=["Usuarios"])
DatabaseSession = Annotated[Session, Depends(get_session)]
Actor = Annotated[Usuario, Depends(administrador)]
UserId = Annotated[int, Path(ge=1, le=9223372036854775807)]


@router.post("", response_model=UsuarioRespuesta, status_code=201)
def create(data: UsuarioCrear, session: DatabaseSession, actor: Actor):
    return service.create_user(session, data)


@router.get("", response_model=UsuariosPagina)
def list_all(
    session: DatabaseSession,
    actor: Actor,
    offset: Annotated[int, Query(ge=0, le=9223372036854775807)] = 0,
    limit: Annotated[int, Query(ge=1, le=100)] = 20,
):
    return service.list_users(session, offset, limit)


@router.get("/{id}", response_model=UsuarioRespuesta)
def get_one(id: UserId, session: DatabaseSession, actor: Actor):
    return service.get_user(session, id)


@router.patch("/{id}", response_model=UsuarioRespuesta)
def update(id: UserId, data: UsuarioActualizar, session: DatabaseSession, actor: Actor):
    return service.update_user(session, id, data, actor)
