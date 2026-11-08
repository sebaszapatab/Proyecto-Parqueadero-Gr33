"""Crea tarifa y pago (mensualidades).

Revision ID: 0004
Revises: 0003
"""
from alembic import op
import sqlalchemy as sa

revision = "0004"
down_revision = "0003"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "tarifa",
        sa.Column("id", sa.BigInteger(), sa.Identity(always=True), primary_key=True),
        sa.Column("tipo", sa.Text(), nullable=False),
        sa.Column("valor", sa.Numeric(12, 2), nullable=False),
        sa.UniqueConstraint("tipo", name="uq_tarifa_tipo"),
        sa.CheckConstraint("tipo IN ('MOTO', 'AUTOMOVIL', 'CAMIONETA')", name="ck_tarifa_tipo"),
        sa.CheckConstraint("valor > 0", name="ck_tarifa_valor_positivo"),
    )
    op.create_table(
        "pago",
        sa.Column("id", sa.BigInteger(), sa.Identity(always=True), primary_key=True),
        sa.Column("vehiculo_id", sa.BigInteger(), nullable=False),
        sa.Column("monto", sa.Numeric(12, 2), nullable=False),
        sa.Column("desde", sa.Date(), nullable=False),
        sa.Column("hasta", sa.Date(), nullable=False),
        sa.Column("registrado_por_id", sa.BigInteger(), nullable=False),
        sa.Column("creado", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("anulado", sa.Boolean(), server_default=sa.text("false"), nullable=False),
        sa.Column("motivo_anulacion", sa.Text(), nullable=True),
        sa.Column("anulado_por_id", sa.BigInteger(), nullable=True),
        sa.Column("anulado_en", sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(["vehiculo_id"], ["vehiculo.id"], name="fk_pago_vehiculo", ondelete="RESTRICT"),
        sa.ForeignKeyConstraint(["registrado_por_id"], ["usuario.id"], name="fk_pago_registrado_por", ondelete="RESTRICT"),
        sa.ForeignKeyConstraint(["anulado_por_id"], ["usuario.id"], name="fk_pago_anulado_por", ondelete="RESTRICT"),
        sa.CheckConstraint("monto > 0", name="ck_pago_monto_positivo"),
        sa.CheckConstraint("hasta > desde", name="ck_pago_periodo"),
        sa.CheckConstraint(
            "(anulado = false AND motivo_anulacion IS NULL AND anulado_por_id IS NULL AND anulado_en IS NULL)"
            " OR (anulado = true AND motivo_anulacion ~ '[^[:space:]]' AND anulado_por_id IS NOT NULL AND anulado_en IS NOT NULL)",
            name="ck_pago_anulacion_completa",
        ),
    )
    op.create_index("ix_pago_vehiculo", "pago", ["vehiculo_id", "hasta"])
    op.create_index("ix_pago_creado", "pago", ["creado"])
    # Tarifas iniciales de ejemplo; el administrador las ajusta desde la pantalla de pagos.
    op.execute("INSERT INTO tarifa (tipo, valor) VALUES ('MOTO', 80000), ('AUTOMOVIL', 180000), ('CAMIONETA', 220000)")


def downgrade() -> None:
    op.drop_index("ix_pago_creado", table_name="pago")
    op.drop_index("ix_pago_vehiculo", table_name="pago")
    op.drop_table("pago")
    op.drop_table("tarifa")
