"""Dependencias de autenticación y control de acceso por rol."""
from typing import Annotated

from fastapi import Depends, Header
from sqlalchemy.orm import Session

from app.database import get_session
from app.models import Usuario
from app.services import usuario as service
from app.services.usuario import UsuarioError


def bearer_token(authorization: str | None) -> str | None:
    if not authorization:
        return None
    scheme, _, token = authorization.partition(" ")
    if scheme.lower() != "bearer" or not token.strip():
        return None
    return token.strip()


def get_token(authorization: Annotated[str | None, Header()] = None) -> str:
    token = bearer_token(authorization)
    if token is None:
        raise UsuarioError(401, "Inicia sesión para continuar.")
    return token


def get_current_user(token: Annotated[str, Depends(get_token)],
                     session: Annotated[Session, Depends(get_session)]) -> Usuario:
    user = service.user_from_token(session, token)
    if user is None:
        raise UsuarioError(401, "Tu sesión expiró. Inicia sesión de nuevo.")
    return user


def require_roles(*roles: str):
    def dependency(user: Annotated[Usuario, Depends(get_current_user)]) -> Usuario:
        if user.rol not in roles:
            raise UsuarioError(403, "No tienes permiso para esta acción.")
        return user
    return dependency


# Roles separados:
#   operador       -> opera el parqueadero (entradas, salidas, celdas libres, cobros)
#   administrador  -> gestiona (usuarios, operadores, celdas, tarifas, reportes de pagos)
#   desarrollador  -> solo mantenimiento técnico
solo_operador = require_roles("operador")
administrador = require_roles("administrador")
tecnico = require_roles("desarrollador")
# Consultas compartidas entre operación y administración (listar, ver disponibilidad, cobrar).
operativo = require_roles("operador", "administrador")
