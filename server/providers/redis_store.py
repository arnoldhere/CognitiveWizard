from redis.asyncio import Redis
from config.settings import settings

redis_client = Redis(
    host=settings.REDIS_HOST,
    port=settings.REDIS_PORT,
    db=settings.REDIS_DB_INDEX,
    decode_responses=True,
)
