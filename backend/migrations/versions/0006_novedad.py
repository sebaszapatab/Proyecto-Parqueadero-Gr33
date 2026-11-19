"""Crea novedad (daños, objetos olvidados) asociada a una estancia.

Revision ID: 0006
Revises: 0005
"""
from alembic import op
import sqlalchemy as sa

revision = "0006"
down_revision = "0005"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "novedad",
        sa.Column("id", sa.BigInteger(), sa.Identity(always=True), primary_key=True),
        sa.Column("estancia_id", sa.BigInteger(), nullable=False),
        sa.Column("tipo", sa.Text(), nullable=False),
        sa.Column("momento", sa.Text(), nullable=False),
        sa.Column("descripcion", sa.Text(), nullable=False),
        sa.Column("registrada_por_id", sa.BigInteger(), nullable=False),
        sa.Column("creada", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.ForeignKeyConstraint(["estancia_id"], ["estancia.id"], name="fk_novedad_estancia", ondelete="RESTRICT"),
        sa.ForeignKeyConstraint(["registrada_por_id"], ["usuario.id"], name="fk_novedad_usuario", ondelete="RESTRICT"),
        sa.CheckConstraint("tipo IN ('DANO', 'OBJETO_OLVIDADO', 'OTRO')", name="ck_novedad_tipo"),
        sa.CheckConstraint("momento IN ('ENTRADA', 'SALIDA')", name="ck_novedad_momento"),
        sa.CheckConstraint("descripcion ~ '[^[:space:]]'", name="ck_novedad_descripcion_no_vacia"),
    )
    op.create_index("ix_novedad_creada", "novedad", ["creada"])
    op.create_index("ix_novedad_estancia", "novedad", ["estancia_id"])


def downgrade() -> None:
    op.drop_index("ix_novedad_estancia", table_name="novedad")
    op.drop_index("ix_novedad_creada", table_name="novedad")
    op.drop_table("novedad")
