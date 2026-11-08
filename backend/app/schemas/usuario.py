from datetime import datetime
from typing import Annotated, Literal

from pydantic import BaseModel, BeforeValidator, ConfigDict, Field, field_validator

from app.models import required_text

Texto = Annotated[str, BeforeValidator(lambda value: required_text(value, "El campo"))]
NombreUsuario = Annotated[
    str,
    BeforeValidator(lambda value: required_text(value, "El usuario").lower()),
    Field(pattern=r"^[a-z0-9._-]{3,30}$"),
]
Clave = Annotated[str, Field(min_length=8, max_length=128)]
Rol = Literal["operador", "administrador", "desarrollador"]


class UsuarioCrear(BaseModel):
    model_config = ConfigDict(extra="forbid")
    nombre: Texto
    usuario: NombreUsuario
    clave: Clave
    rol: Rol


class UsuarioActualizar(BaseModel):
    model_config = ConfigDict(extra="forbid")
    nombre: Texto | None = None
    rol: Rol | None = None
    activo: bool | None = None
    clave: Clave | None = None

    @field_validator("*", mode="before")
    @classmethod
    def reject_null(cls, value):
        if value is None:
            raise ValueError("Los campos enviados no pueden ser nulos.")
        return value


class UsuarioRespuesta(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    nombre: str
    usuario: str
    rol: Rol
    activo: bool
    creado: datetime


class UsuariosPagina(BaseModel):
    items: list[UsuarioRespuesta]
    total: int
    offset: int
    limit: int


class LoginSolicitud(BaseModel):
    model_config = ConfigDict(extra="forbid")
    usuario: Annotated[str, Field(min_length=1, max_length=60)]
    clave: Annotated[str, Field(min_length=1, max_length=128)]


class LoginRespuesta(BaseModel):
    token: str
    usuario: UsuarioRespuesta
