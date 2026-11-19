"""Novedades, reporte de movimientos, celdas fuera de servicio y bitácora: lógica sin base de datos."""
from datetime import date

import pytest
from pydantic import ValidationError

from app.main import app
from app.schemas.celda import CeldaActualizar
from app.schemas.novedad import NovedadCrear
from app.services import bitacora
from app.services.reporte import ReporteError, reporte_movimientos


def test_novedad_valida_y_normaliza():
    ok = NovedadCrear(placa=" abc123 ", tipo="DANO", momento="ENTRADA", descripcion="  Rayón en la puerta  ")
    assert ok.placa == "ABC123" and ok.descripcion == "Rayón en la puerta"


@pytest.mark.parametrize("cambio", [
    {"tipo": "OTRA"}, {"momento": "AYER"}, {"descripcion": "   "}, {"descripcion": "x" * 501}, {"placa": " "},
])
def test_novedad_invalida(cambio):
    base = {"placa": "ABC123", "tipo": "OTRO", "momento": "SALIDA", "descripcion": "Objeto olvidado"}
    with pytest.raises(ValidationError):
        NovedadCrear(**{**base, **cambio})


def test_celda_en_servicio_no_admite_nulo():
    assert CeldaActualizar(en_servicio=False).model_dump(exclude_unset=True) == {"en_servicio": False}
    with pytest.raises(ValidationError):
        CeldaActualizar(en_servicio=None)


def test_reporte_rechaza_rango_invertido():
    with pytest.raises(ReporteError) as error:
        reporte_movimientos(None, 0, 20, date(2026, 11, 10), date(2026, 11, 1), None)
    assert error.value.status_code == 422


def test_bitacora_no_falla_si_la_base_de_datos_no_responde(monkeypatch):
    def sin_base():
        raise RuntimeError("sin conexión")
    monkeypatch.setattr(bitacora, "get_engine", sin_base)
    bitacora.registrar_error("GET", "/x", 503, "prueba")  # no debe lanzar excepción


def test_rutas_nuevas_declaradas():
    rutas = app.openapi()["paths"]
    for ruta in ["/novedades", "/reportes/movimientos", "/sistema/bitacora"]:
        assert ruta in rutas
