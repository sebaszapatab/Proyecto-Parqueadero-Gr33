"""Prepara una base de datos nueva para probar Autos Colombia.

Es seguro ejecutarlo varias veces: solo crea lo que falta.
Crea: 100 celdas (90 de carros y 10 de motos), un operador de ejemplo,
tres vehículos de ejemplo y los usuarios de demostración.

Uso (con el entorno virtual activo y la migración aplicada):
    python preparar_demo.py
"""
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.database import get_engine
from app.models import Celda, Operador, Usuario, Vehiculo
from app.security import hash_password

# Credenciales de DEMOSTRACIÓN para una base de datos local. No uses estas claves en producción.
USUARIOS = [
    ("profesor", "Profesor (administrador)", "administradorprofesor", "administrador"),
    ("operador", "Operador de ejemplo", "operadorprofesor", "operador"),
    ("desarrollador", "Desarrollador de ejemplo", "desarrolladorprofesor", "desarrollador"),
]
VEHICULOS = [
    ("ABC123", "Blanco", 2022, "Toyota", "AUTOMOVIL"),
    ("XYZ789", "Negro", 2020, "Yamaha", "MOTO"),
    ("DEF456", "Rojo", 2021, "Chevrolet", "CAMIONETA"),
]


def main() -> None:
    with Session(get_engine()) as session:
        existentes = set(session.scalars(select(Celda.codigo)))
        nuevas = [Celda(codigo=f"C-{n:02d}", tipo="AUTOMOVIL") for n in range(1, 91)]
        nuevas += [Celda(codigo=f"M-{n:02d}", tipo="MOTO") for n in range(1, 11)]
        faltantes = [c for c in nuevas if c.codigo not in existentes]
        session.add_all(faltantes)
        print(f"Celdas creadas: {len(faltantes)}")

        if session.scalar(select(Operador.id).limit(1)) is None:
            session.add(Operador(nombre="Operador de ejemplo", telefono="3000000000"))
            print("Operador de ejemplo creado.")

        placas = set(session.scalars(select(Vehiculo.placa)))
        for placa, color, modelo, marca, tipo in VEHICULOS:
            if placa not in placas:
                session.add(Vehiculo(placa=placa, color=color, modelo=modelo, marca=marca, tipo=tipo))
                print(f"Vehículo de ejemplo {placa} creado.")

        usuarios = set(session.scalars(select(Usuario.usuario)))
        for usuario, nombre, clave, rol in USUARIOS:
            if usuario not in usuarios:
                session.add(Usuario(usuario=usuario, nombre=nombre, clave_hash=hash_password(clave), rol=rol))
                print(f"Usuario '{usuario}' creado con rol {rol}.")
        session.commit()
    print("Listo. Ya puedes iniciar el backend y el frontend.")


if __name__ == "__main__":
    main()
