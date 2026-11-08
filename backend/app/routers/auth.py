from typing import Annotated

from fastapi import APIRouter, Depends, Response
from sqlalchemy.orm import Session

from app.auth import get_current_user, get_token
from app.database import get_session
from app.models import Usuario
from app.schemas.usuario import LoginRespuesta, LoginSolicitud, UsuarioRespuesta
from app.services import usuario as service

router = APIRouter(prefix="/auth", tags=["Autenticación"])
DatabaseSession = Annotated[Session, Depends(get_session)]


@router.post("/login", response_model=LoginRespuesta)
def login(data: LoginSolicitud, session: DatabaseSession):
    token, user = service.login(session, data.usuario, data.clave)
    return {"token": token, "usuario": user}


@router.post("/logout", status_code=204)
def logout(token: Annotated[str, Depends(get_token)], session: DatabaseSession) -> Response:
    service.logout(session, token)
    return Response(status_code=204)


@router.get("/me", response_model=UsuarioRespuesta)
def me(user: Annotated[Usuario, Depends(get_current_user)]):
    return user
