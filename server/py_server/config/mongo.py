from pymongo import MongoClient
from config.settings import settings


def get_mongo_client() -> MongoClient:
    return MongoClient(settings.MONGO_URI)


def get_mongo_db():
    return get_mongo_client()[settings.MONGO_DB_NAME]


def get_mongo_collection(collection_name: str):
    return get_mongo_db()[collection_name]
