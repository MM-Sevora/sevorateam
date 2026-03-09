"""
Core Database Module
Provides centralized database access for all modules.
"""

from motor.motor_asyncio import AsyncIOMotorClient
import os
from functools import lru_cache

_client = None
_db = None


def get_mongo_client():
    """Get singleton MongoDB client"""
    global _client
    if _client is None:
        mongo_url = os.environ.get("MONGO_URL", "mongodb://localhost:27017")
        _client = AsyncIOMotorClient(mongo_url)
    return _client


def get_database():
    """Get database instance"""
    global _db
    if _db is None:
        client = get_mongo_client()
        db_name = os.environ.get("DB_NAME", "sevora_hub")
        _db = client[db_name]
    return _db


# Shorthand for common access
db = property(lambda self: get_database())


class DatabaseMixin:
    """Mixin class for easy database access in services"""
    
    @property
    def db(self):
        return get_database()
    
    async def find_one(self, collection: str, query: dict, projection: dict = None):
        """Find one document"""
        if projection is None:
            projection = {"_id": 0}
        return await self.db[collection].find_one(query, projection)
    
    async def find_many(self, collection: str, query: dict, projection: dict = None, 
                       limit: int = 100, skip: int = 0, sort: list = None):
        """Find multiple documents"""
        if projection is None:
            projection = {"_id": 0}
        cursor = self.db[collection].find(query, projection)
        if sort:
            cursor = cursor.sort(sort)
        if skip:
            cursor = cursor.skip(skip)
        if limit:
            cursor = cursor.limit(limit)
        return await cursor.to_list(limit)
    
    async def insert_one(self, collection: str, document: dict):
        """Insert one document"""
        result = await self.db[collection].insert_one(document)
        return result.inserted_id
    
    async def update_one(self, collection: str, query: dict, update: dict):
        """Update one document"""
        return await self.db[collection].update_one(query, {"$set": update})
    
    async def delete_one(self, collection: str, query: dict):
        """Delete one document"""
        return await self.db[collection].delete_one(query)
    
    async def count(self, collection: str, query: dict = None):
        """Count documents"""
        return await self.db[collection].count_documents(query or {})
