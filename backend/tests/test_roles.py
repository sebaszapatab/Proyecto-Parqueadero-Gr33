"""Separación de roles: las rutas prohibidas responden 403 sin tocar la base de datos."""
from types import SimpleNamespace

import pytest
from fastapi.testclient import TestClient

from app.auth import get_current_user
from app.main import app

# (rol, método, ruta) que NO debe poder usar
PROHIBIDO = [
    ("administrador", "get", "/estancias/vehiculo/ABC123"),   # entradas/salidas: solo operador
    ("desarrollador", "get", "/estancias/vehiculo/ABC123"),
    ("operador", "get", "/sistema/estado"),                    # sistema: solo desarrollador
    ("administrador", "get", "/sistema/estado"),
    ("desarrollador", "get", "/vehiculos"),
    ("desarrollador", "get", "/celdas/ocupacion"),
    ("desarrollador", "get", "/pagos/vencidos"),
    ("desarrollador", "get", "/pagos/tarifas"),
]


@pytest.mark.parametrize("rol,metodo,ruta", PROHIBIDO)
def test_rol_sin_permiso_recibe_403(rol, metodo, ruta):
    app.dependency_overrides[get_current_user] = lambda: SimpleNamespace(
        id=1, nombre="x", usuario="x", rol=rol, activo=True)
    with TestClient(app) as client:
        respuesta = getattr(client, metodo)(ruta)
    assert respuesta.status_code == 403
