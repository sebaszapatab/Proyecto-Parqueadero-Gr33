"""Crea usuario y sesion (roles e inicio de sesión).

Revision ID: 0003
Revises: 0002
"""
from alembic import op
import sqlalchemy as sa

revision = "0003"
down_revision = "0002"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "usuario",
        sa.Column("id", sa.BigInteger(), sa.Identity(always=True), primary_key=True),
        sa.Column("nombre", sa.Text(), nullable=False),
        sa.Column("usuario", sa.Text(), nullable=False),
        sa.Column("clave_hash", sa.Text(), nullable=False),
        sa.Column("rol", sa.Text(), nullable=False),
        sa.Column("activo", sa.Boolean(), server_default=sa.true(), nullable=False),
        sa.Column("creado", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.UniqueConstraint("usuario", name="uq_usuario_usuario"),
        sa.CheckConstraint("usuario ~ '^[a-z0-9._-]{3,30}$'", name="ck_usuario_formato"),
        sa.CheckConstraint("nombre ~ '[^[:space:]]'", name="ck_usuario_nombre_no_vacio"),
        sa.CheckConstraint("rol IN ('operador', 'administrador', 'desarrollador')", name="ck_usuario_rol"),
    )
    op.create_table(
        "sesion",
        sa.Column("id", sa.BigInteger(), sa.Identity(always=True), primary_key=True),
        sa.Column("usuario_id", sa.BigInteger(), nullable=False),
        sa.Column("token_hash", sa.Text(), nullable=False),
        sa.Column("creada", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("ultima_actividad", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.ForeignKeyConstraint(["usuario_id"], ["usuario.id"], name="fk_sesion_usuario", ondelete="CASCADE"),
        sa.UniqueConstraint("token_hash", name="uq_sesion_token_hash"),
    )
    op.create_index("ix_sesion_usuario", "sesion", ["usuario_id"])


def downgrade() -> None:
    op.drop_index("ix_sesion_usuario", table_name="sesion")
    op.drop_table("sesion")
    op.drop_table("usuario")
