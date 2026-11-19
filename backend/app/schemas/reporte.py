from datetime import datetime

from pydantic import BaseModel


class MovimientoFila(BaseModel):
    id: int
    placa: str
    tipo_vehiculo: str
    celda: str
    entrada: datetime
    salida: datetime | None
    operador_entrada: str
    operador_salida: str | None
    minutos: int | None  # tiempo dentro; None mientras el vehículo sigue dentro


class ReporteMovimientos(BaseModel):
    items: list[MovimientoFila]
    total: int
    offset: int
    limit: int
    entradas: int  # entradas ocurridas en el rango
    salidas: int  # salidas ocurridas en el rango
    dentro: int  # estancias del filtro que siguen abiertas
