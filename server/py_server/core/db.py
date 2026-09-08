import pymysql
from urllib.parse import urlparse
from config.settings import settings


def get_db_connection():
    """
    Returns a raw pymysql connection based on the SQLAlchemy DATABASE_URL.
    """
    # url = settings.DATABASE_URL

    return pymysql.connect(
        host=settings.DB_HOST,
        port=settings.DB_PORT,
        user=settings.DB_USER,
        password=settings.DB_PASSWORD,
        database=settings.DB_NAME,
        autocommit=True,
    )
