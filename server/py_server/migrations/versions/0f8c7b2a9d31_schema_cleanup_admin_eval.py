"""schema cleanup admin eval

Revision ID: 0f8c7b2a9d31
Revises: b75a4f0ed747
Create Date: 2026-05-16 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "0f8c7b2a9d31"
down_revision: Union[str, Sequence[str], None] = "b75a4f0ed747"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def _columns(table_name: str) -> set[str]:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    if table_name not in inspector.get_table_names():
        return set()
    return {column["name"] for column in inspector.get_columns(table_name)}


def upgrade() -> None:
    """Upgrade schema."""
    user_columns = _columns("users")
    if "subscription_plan" not in user_columns:
        op.add_column(
            "users", sa.Column("subscription_plan", sa.String(50), nullable=True)
        )
    if "daily_chat_limit" not in user_columns:
        op.add_column(
            "users", sa.Column("daily_chat_limit", sa.Integer(), nullable=True)
        )
    if "otp" not in user_columns:
        op.add_column("users", sa.Column("otp", sa.String(10), nullable=True))
    if "otp_expires" not in user_columns:
        op.add_column(
            "users", sa.Column("otp_expires", sa.DateTime(timezone=True), nullable=True)
        )

    grade_columns = _columns("grades")
    if "time_limit_seconds" not in grade_columns:
        op.add_column(
            "grades",
            sa.Column(
                "time_limit_seconds",
                sa.Integer(),
                nullable=False,
                server_default="480",
            ),
        )
        op.alter_column("grades", "time_limit_seconds", server_default=None)
    if "time_taken" not in grade_columns:
        op.add_column("grades", sa.Column("time_taken", sa.Integer(), nullable=True))
    if "started_at" not in grade_columns:
        op.add_column(
            "grades", sa.Column("started_at", sa.DateTime(timezone=True), nullable=True)
        )

    inspector = sa.inspect(op.get_bind())
    if "payment_transactions" not in inspector.get_table_names():
        op.create_table(
            "payment_transactions",
            sa.Column("id", sa.Integer(), nullable=False),
            sa.Column("user_id", sa.Integer(), nullable=False),
            sa.Column("plan", sa.String(50), nullable=False),
            sa.Column("amount", sa.Integer(), nullable=False),
            sa.Column("amount_inr", sa.Integer(), nullable=False),
            sa.Column("currency", sa.String(10), nullable=False),
            sa.Column("razorpay_order_id", sa.String(100), nullable=False),
            sa.Column("razorpay_payment_id", sa.String(100), nullable=True),
            sa.Column("razorpay_signature", sa.String(255), nullable=True),
            sa.Column("status", sa.String(50), nullable=False),
            sa.Column(
                "created_at",
                sa.DateTime(timezone=True),
                server_default=sa.text("now()"),
                nullable=True,
            ),
            sa.Column("paid_at", sa.DateTime(timezone=True), nullable=True),
            sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
            sa.PrimaryKeyConstraint("id"),
            sa.UniqueConstraint("razorpay_order_id"),
            sa.UniqueConstraint("razorpay_payment_id"),
        )
        op.create_index(
            op.f("ix_payment_transactions_id"),
            "payment_transactions",
            ["id"],
            unique=False,
        )
    elif "amount_inr" not in _columns("payment_transactions"):
        op.add_column(
            "payment_transactions",
            sa.Column("amount_inr", sa.Integer(), nullable=False, server_default="0"),
        )
        op.alter_column("payment_transactions", "amount_inr", server_default=None)


def downgrade() -> None:
    """Downgrade schema."""
    inspector = sa.inspect(op.get_bind())
    if "payment_transactions" in inspector.get_table_names():
        index_names = {
            index["name"] for index in inspector.get_indexes("payment_transactions")
        }
        if op.f("ix_payment_transactions_id") in index_names:
            op.drop_index(
                op.f("ix_payment_transactions_id"), table_name="payment_transactions"
            )
        op.drop_table("payment_transactions")

    for column_name in ("started_at", "time_taken", "time_limit_seconds"):
        if column_name in _columns("grades"):
            op.drop_column("grades", column_name)

    for column_name in (
        "otp_expires",
        "otp",
        "daily_chat_limit",
        "subscription_plan",
    ):
        if column_name in _columns("users"):
            op.drop_column("users", column_name)
