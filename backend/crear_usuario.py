"""Crea un usuario desde la terminal (sirve para el primer administrador).

Uso:  python crear_usuario.py USUARIO "Nombre completo" CLAVE ROL
Roles: operador | administrador | desarrollador
"""
import sys

from sqlalchemy.orm import Session

from app.database import get_engine
from app.schemas.usuario import UsuarioCrear
from app.services.usuario import UsuarioError, create_user


def main() -> int:
    if len(sys.argv) != 5:
        print(__doc__)
        return 1
    _, usuario, nombre, clave, rol = sys.argv
    try:
        data = UsuarioCrear(usuario=usuario, nombre=nombre, clave=clave, rol=rol)
        with Session(get_engine()) as session:
            user = create_user(session, data)
    except UsuarioError as error:
        print(f"Error: {error.detail}")
        return 1
    except ValueError as error:
        print(f"Datos no válidos: {error}")
        return 1
    print(f"Usuario '{user.usuario}' creado con rol {user.rol}.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
