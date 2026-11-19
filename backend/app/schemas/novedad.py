from datetime import datetime
from typing import Annotated, Literal

from pydantic import BaseModel, BeforeValidator, ConfigDict, Field

from app.models import required_text
from app.schemas.vehiculo import Placa

Texto = Annotated[str, BeforeValidator(lambda value: required_text(value, "El campo"))]
TipoNovedad = Literal["DANO", "OBJETO_OLVIDADO", "OTRO"]
Momento = Literal["ENTRADA", "SALIDA"]


class NovedadCrear(BaseModel):
    model_config = ConfigDict(extra="forbid")
    placa: Placa
    tipo: TipoNovedad
    momento: Momento
    descripcion: Annotated[Texto, Field(max_length=500)]


class NovedadRespuesta(BaseModel):
    id: int
    estancia_id: int
    placa: str
    celda: str
    tipo: TipoNovedad
    momento: Momento
    descripcion: str
    registrada_por: str
    creada: datetime


class NovedadesPagina(BaseModel):
    items: list[NovedadRespuesta]
    total: int
    offset: int
    limit: int
