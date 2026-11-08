from datetime import date

import pytest
from fastapi.testclient import TestClient
from pydantic import ValidationError

from app.auth import bearer_token
from app.main import app
from app.schemas.usuario import UsuarioCrear
from app.security import hash_password, hash_token, new_token, verify_password
from app.services.pago import clasificar, sumar_mes


def test_hash_y_verificacion_de_clave():
    stored = hash_password("Clave-Segura-1")
    assert stored.startswith("scrypt$") and "Clave-Segura-1" not in stored
    assert verify_password("Clave-Segura-1", stored)
    assert not verify_password("otra", stored)
    assert not verify_password("x", "formato-roto")


def test_tokens():
    a, b = new_token(), new_token()
    assert a != b and len(a) >= 40
    assert hash_token(a) == hash_token(a) != a


@pytest.mark.parametrize("header,expected", [
    (None, None), ("", None), ("Basic abc", None), ("Bearer", None), ("Bearer  ", None), ("Bearer abc", "abc"),
    ("bearer xyz", "xyz"),
])
def test_bearer(header, expected):
    assert bearer_token(header) == expected


def test_usuario_se_normaliza_y_valida():
    ok = UsuarioCrear(nombre=" Ana ", usuario=" ANA.Lopez ", clave="12345678", rol="operador")
    assert ok.usuario == "ana.lopez" and ok.nombre == "Ana"
    for bad in [dict(usuario="a b"), dict(usuario="ab"), dict(clave="corta"), dict(rol="root")]:
        with pytest.raises(ValidationError):
            UsuarioCrear(**{"nombre": "Ana", "usuario": "ana", "clave": "12345678", "rol": "operador", **bad})


def test_sumar_mes_y_estado():
    assert sumar_mes(date(2026, 1, 15)) == date(2026, 2, 15)
    assert sumar_mes(date(2026, 1, 31)) == date(2026, 2, 28)
    assert sumar_mes(date(2026, 12, 5)) == date(2027, 1, 5)
    hoy = date(2026, 6, 10)
    assert clasificar(None, hoy) == "sin_pago"
    assert clasificar(date(2026, 6, 10), hoy) == "vigente"
    assert clasificar(date(2026, 6, 9), hoy) == "vencida"


@pytest.mark.real_auth
def test_sin_sesion_se_rechaza():
    with TestClient(app) as client:
        for method, url in [("get", "/vehiculos"), ("get", "/celdas/ocupacion"), ("get", "/pagos"),
                            ("get", "/usuarios"), ("get", "/sistema/estado"), ("get", "/auth/me")]:
            assert getattr(client, method)(url).status_code == 401
        assert client.get("/vehiculos", headers={"Authorization": "Basic x"}).status_code == 401


def test_rutas_protegidas_declaradas():
    schema = app.openapi()["paths"]
    for path in ["/auth/login", "/auth/logout", "/auth/me", "/usuarios", "/pagos", "/pagos/{id}/anular",
                 "/pagos/estado/{placa}", "/pagos/vencidos", "/pagos/tarifas/{tipo}", "/sistema/estado"]:
        assert path in schema
