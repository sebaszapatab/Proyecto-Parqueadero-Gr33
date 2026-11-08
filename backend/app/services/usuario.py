from datetime import datetime, timedelta, timezone
from functools import wraps

from sqlalchemy import delete, func, select
from sqlalchemy.exc import IntegrityError, SQLAlchemyError
from sqlalchemy.orm import Session

from app.models import Sesion, Usuario
from app.schemas.usuario import UsuarioActualizar, UsuarioCrear
from app.security import hash_password, hash_token, new_token, verify_password

INACTIVIDAD = timedelta(minutes=30)
_REFRESCO = timedelta(seconds=60)
_CLAVE_FALSA = hash_password("clave-falsa-para-igualar-tiempos")


class UsuarioError(Exception):
    def __init__(self, status_code: int, detail: str) -> None:
        self.status_code = status_code
        self.detail = detail


def database_operation(operation):
    @wraps(operation)
    def wrapped(session: Session, *args, **kwargs):
        try:
            return operation(session, *args, **kwargs)
        except IntegrityError as error:
            session.rollback()
            if getattr(error.orig, "sqlstate", None) == "23505":
                raise UsuarioError(409, "Ya existe un usuario con ese nombre de usuario.") from None
            raise UsuarioError(409, "La operación entra en conflicto con los datos existentes.") from None
        except SQLAlchemyError:
            session.rollback()
            raise UsuarioError(503, "No se pudo completar la operación con la base de datos.") from None
    return wrapped


def _find(session: Session, user_id: int) -> Usuario:
    user = session.get(Usuario, user_id)
    if user is None:
        raise UsuarioError(404, "Usuario no encontrado.")
    return user


@database_operation
def create_user(session: Session, data: UsuarioCrear) -> Usuario:
    user = Usuario(nombre=data.nombre, usuario=data.usuario, clave_hash=hash_password(data.clave), rol=data.rol)
    session.add(user)
    session.commit()
    session.refresh(user)
    return user


@database_operation
def list_users(session: Session, offset: int, limit: int) -> dict:
    total = session.scalar(select(func.count()).select_from(Usuario))
    items = list(session.scalars(select(Usuario).order_by(Usuario.id).offset(offset).limit(limit)))
    return {"items": items, "total": total, "offset": offset, "limit": limit}


@database_operation
def get_user(session: Session, user_id: int) -> Usuario:
    return _find(session, user_id)


@database_operation
def update_user(session: Session, user_id: int, data: UsuarioActualizar, actor: Usuario) -> Usuario:
    user = _find(session, user_id)
    changes = data.model_dump(exclude_unset=True)
    if user.id == actor.id and (changes.get("activo") is False or ("rol" in changes and changes["rol"] != user.rol)):
        raise UsuarioError(409, "No puedes desactivarte ni cambiar tu propio rol.")
    if "clave" in changes:
        user.clave_hash = hash_password(changes.pop("clave"))
    for key, value in changes.items():
        setattr(user, key, value)
    session.flush()
    admins = session.scalar(select(func.count()).select_from(Usuario).where(
        Usuario.rol == "administrador", Usuario.activo.is_(True)))
    if admins == 0:
        session.rollback()
        raise UsuarioError(409, "Debe quedar al menos un administrador activo.")
    if changes.get("activo") is False or "rol" in changes:
        session.execute(delete(Sesion).where(Sesion.usuario_id == user.id))
    session.commit()
    session.refresh(user)
    return user


@database_operation
def login(session: Session, usuario: str, clave: str) -> tuple[str, Usuario]:
    user = session.scalar(select(Usuario).where(Usuario.usuario == usuario.strip().lower()))
    valid = verify_password(clave, user.clave_hash if user else _CLAVE_FALSA)
    if user is None or not valid or not user.activo:
        raise UsuarioError(401, "Usuario o contraseña incorrectos.")
    now = datetime.now(timezone.utc)
    session.execute(delete(Sesion).where(Sesion.usuario_id == user.id, Sesion.ultima_actividad < now - INACTIVIDAD))
    token = new_token()
    session.add(Sesion(usuario_id=user.id, token_hash=hash_token(token)))
    session.commit()
    session.refresh(user)
    return token, user


@database_operation
def logout(session: Session, token: str) -> None:
    session.execute(delete(Sesion).where(Sesion.token_hash == hash_token(token)))
    session.commit()


@database_operation
def user_from_token(session: Session, token: str) -> Usuario | None:
    sesion = session.scalar(select(Sesion).where(Sesion.token_hash == hash_token(token)))
    if sesion is None:
        return None
    now = datetime.now(timezone.utc)
    user = sesion.usuario
    if now - sesion.ultima_actividad > INACTIVIDAD or not user.activo:
        session.delete(sesion)
        session.commit()
        return None
    if now - sesion.ultima_actividad > _REFRESCO:
        sesion.ultima_actividad = now
        session.commit()
        session.refresh(user)
    return user
