"""Ocupación de celdas: integración optativa con PostgreSQL; todo se revierte."""
import os
from uuid import uuid4

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import text
from sqlalchemy.orm import Session

from app.database import get_engine, get_session
from app.main import app

pytestmark = pytest.mark.skipif(os.getenv("RUN_POSTGRES_TESTS") != "1", reason="Requiere PostgreSQL local.")


@pytest.fixture
def connection():
    with get_engine().connect() as connection:
        transaction = connection.begin()
        try:
            assert connection.scalar(text("SELECT current_database()")) == "autos_colombia"
            yield connection
        finally:
            transaction.rollback()


def test_ocupacion_muestra_la_placa_mientras_la_estancia_esta_abierta(connection):
    with Session(bind=connection, join_transaction_mode="create_savepoint") as session:
        def override():
            yield session

        app.dependency_overrides[get_session] = override
        try:
            with TestClient(app) as client:
                suffix = uuid4().hex.upper()
                cell = client.post("/celdas", json={"codigo": "OCU-" + suffix, "tipo": "AUTOMOVIL"}).json()
                operator = client.post("/operadores", json={"nombre": "OCU " + suffix, "telefono": "001"}).json()
                plate = "OCU-" + suffix[:8]
                vehicle = client.post("/vehiculos", json={
                    "placa": plate, "color": "Azul", "modelo": 2026, "marca": "Prueba", "tipo": "AUTOMOVIL",
                })
                assert vehicle.status_code == 201

                def mine():
                    data = client.get("/celdas/ocupacion").json()
                    return data, next(item for item in data["items"] if item["id"] == cell["id"])

                data, item = mine()
                assert item["placa"] is None
                assert data["total"] == data["ocupadas"] + data["libres"]

                entry = client.post("/estancias/entrada", json={
                    "placa": plate, "celda_id": cell["id"], "operador_id": operator["id"],
                })
                assert entry.status_code == 201
                data, item = mine()
                assert item["placa"] == plate
                assert data["total"] == data["ocupadas"] + data["libres"]

                exit_ = client.post("/estancias/salida", json={"placa": plate, "operador_id": operator["id"]})
                assert exit_.status_code == 200
                _, item = mine()
                assert item["placa"] is None
        finally:
            app.dependency_overrides.clear()
