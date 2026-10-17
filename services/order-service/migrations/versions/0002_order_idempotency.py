"""Add client idempotency keys to orders."""

from alembic import op
import sqlalchemy as sa


revision = "0002_order_idempotency"
down_revision = "0001_order_schema"
branch_labels = None
depends_on = None


def upgrade():
    op.add_column("orders", sa.Column("idempotency_key", sa.String(length=128), nullable=True))
    op.add_column("orders", sa.Column("request_hash", sa.String(length=64), nullable=True))
    op.create_unique_constraint(
        "uq_orders_user_idempotency_key", "orders", ["user_id", "idempotency_key"]
    )


def downgrade():
    op.drop_constraint("uq_orders_user_idempotency_key", "orders", type_="unique")
    op.drop_column("orders", "request_hash")
    op.drop_column("orders", "idempotency_key")
