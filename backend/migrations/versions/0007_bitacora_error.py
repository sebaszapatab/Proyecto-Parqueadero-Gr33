"""Crea bitacora_error para los errores del servidor.

Revision ID: 0007
Revises: 0006
"""
from alembic import op
import sqlalchemy as sa

revision = "0007"
down_revision = "0006"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "bitacora_error",
        sa.Column("id", sa.BigInteger(), sa.Identity(always=True), primary_key=True),
        sa.Column("creado", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("metodo", sa.Text(), nullable=False),
        sa.Column("ruta", sa.Text(), nullable=False),
        sa.Column("estado", sa.Integer(), nullable=False),
        sa.Column("mensaje", sa.Text(), nullable=False),
    )
    op.create_index("ix_bitacora_error_creado", "bitacora_error", ["creado"])


def downgrade() -> None:
    op.drop_index("ix_bitacora_error_creado", table_name="bitacora_error")
    op.drop_table("bitacora_error")
