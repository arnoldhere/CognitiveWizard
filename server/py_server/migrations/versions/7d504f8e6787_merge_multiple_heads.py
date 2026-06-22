"""merge multiple heads

Revision ID: 7d504f8e6787
Revises: 236cafe36eb9, bb52f9e5673a
Create Date: 2026-05-28 14:44:05.209265

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '7d504f8e6787'
down_revision: Union[str, Sequence[str], None] = ('236cafe36eb9', 'bb52f9e5673a')
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    pass


def downgrade() -> None:
    """Downgrade schema."""
    pass
