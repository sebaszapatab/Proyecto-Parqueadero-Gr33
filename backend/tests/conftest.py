"""Las pruebas existentes no inician sesión: se simula un usuario con acceso a todo.

Las pruebas marcadas con @pytest.mark.real_auth usan la autenticación real.
"""
from types import SimpleNamespace

import pytest

from app.auth import get_current_user
from app.main import app


class _CualquierRol(str):
    """Cadena que "coincide" con cualquier rol, solo para las pruebas heredadas."""

    def __eq__(self, other):
        return True

    __hash__ = str.__hash__


def pytest_configure(config):
    config.addinivalue_line("markers", "real_auth: usa la autenticación real en vez del usuario simulado")


@pytest.fixture(autouse=True)
def usuario_simulado(request):
    if request.node.get_closest_marker("real_auth"):
        yield
        return
    app.dependency_overrides[get_current_user] = lambda: SimpleNamespace(
        id=1, nombre="Pruebas", usuario="pruebas", rol=_CualquierRol("todos"), activo=True)
    yield
    app.dependency_overrides.pop(get_current_user, None)
