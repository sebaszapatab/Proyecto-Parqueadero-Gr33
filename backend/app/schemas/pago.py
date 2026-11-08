from datetime import date, datetime
from decimal import Decimal
from typing import Annotated, Literal

from pydantic import BaseModel, BeforeValidator, ConfigDict, Field

from app.models import required_text
from app.schemas.vehiculo import Placa

Texto = Annotated[str, BeforeValidator(lambda value: required_text(value, "El campo"))]
Tipo = Literal["MOTO", "AUTOMOVIL", "CAMIONETA"]
Monto = Annotated[Decimal, Field(gt=0, max_digits=12, decimal_places=2)]


class TarifaRespuesta(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    tipo: Tipo
    valor: Decimal


class TarifaActualizar(BaseModel):
    model_config = ConfigDict(extra="forbid")
    valor: Monto


class PagoCrear(BaseModel):
    model_config = ConfigDict(extra="forbid")
    placa: Placa


class PagoAnular(BaseModel):
    model_config = ConfigDict(extra="forbid")
    motivo: Annotated[Texto, Field(max_length=300)]


class PagoRespuesta(BaseModel):
    """Comprobante de pago."""
    id: int
    placa: str
    marca: str
    tipo: str
    monto: Decimal
    desde: date
    hasta: date
    creado: datetime
    registrado_por: str
    anulado: bool
    motivo_anulacion: str | None
    anulado_por: str | None
    anulado_en: datetime | None


class PagosPagina(BaseModel):
    items: list[PagoRespuesta]
    total: int
    offset: int
    limit: int
    total_recaudado: Decimal


class EstadoPago(BaseModel):
    placa: str
    tipo: str
    estado: Literal["vigente", "vencida", "sin_pago"]
    vence: date | None
    valor_mensualidad: Decimal | None


class VencidosRespuesta(BaseModel):
    items: list[EstadoPago]
    total: int
