import redis
import json
from config.settings import settings


class ChatStore:
    """
    persitent storage for chat
    """

    def __init__(self):
        self.client = redis.Redis(
            host=settings.REDIS_HOST,
            port=settings.REDIS_PORT,
            db=settings.REDIS_DB_INDEX,
        )

    # save to redis
    def save(self, ssid, message):
        self.client.rpush(ssid, json.dumps(message))

    # fetch from the redis
    def get_history(self, ssid):
        messages = self.client.lrange(ssid, 0, -1)
        return [json.loads(m) for m in messages]
