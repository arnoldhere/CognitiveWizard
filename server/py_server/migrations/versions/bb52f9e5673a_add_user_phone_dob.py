"""add user phone and dob fields

Revision ID: bb52f9e5673a
Revises: a41642fc0891
Create Date: 2026-05-28 00:00:00.000000

"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = "bb52f9e5673a"
down_revision: Union[str, Sequence[str], None] = "a41642fc0891"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("users", sa.Column("phone", sa.String(length=30), nullable=True))
    op.add_column("users", sa.Column("dob", sa.Date(), nullable=True))


def downgrade() -> None:
    op.drop_column("users", "dob")
    op.drop_column("users", "phone")
