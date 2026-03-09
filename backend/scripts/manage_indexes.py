"""
Database Index Management Script
Run this script to ensure all required indexes are present.

Usage:
    python scripts/manage_indexes.py --create
    python scripts/manage_indexes.py --list
    python scripts/manage_indexes.py --drop-unused
"""

import asyncio
import argparse
from motor.motor_asyncio import AsyncIOMotorClient
import os
from dotenv import load_dotenv

load_dotenv()

MONGO_URL = os.environ.get('MONGO_URL')
DB_NAME = os.environ.get('DB_NAME')

# Index definitions by collection
INDEX_DEFINITIONS = {
    "employees": [
        {"keys": [("user_id", 1)], "options": {"unique": True, "sparse": True}},
        {"keys": [("employee_code", 1)], "options": {"unique": True, "sparse": True}},
        {"keys": [("department_id", 1), ("status", 1)], "options": {}},
        {"keys": [("reports_to", 1)], "options": {}},
        {"keys": [("grade_id", 1)], "options": {}},
    ],
    "users": [
        {"keys": [("email", 1)], "options": {"unique": True}},
        {"keys": [("employee_id_ref", 1)], "options": {}},
    ],
    "contacts": [
        {"keys": [("email", 1)], "options": {}},
        {"keys": [("contact_type", 1), ("status", 1)], "options": {}},
        {"keys": [("campaign_id", 1)], "options": {}},
        {"keys": [("name", "text"), ("email", "text")], "options": {}},
    ],
    "pm_tasks": [
        {"keys": [("project_id", 1), ("status", 1)], "options": {}},
        {"keys": [("assigned_to", 1), ("status", 1)], "options": {}},
        {"keys": [("due_date", 1)], "options": {}},
    ],
    "notifications": [
        {"keys": [("user_id", 1), ("read", 1), ("created_at", -1)], "options": {}},
    ],
    "influencers": [
        {"keys": [("score", -1)], "options": {}},
        {"keys": [("status", 1)], "options": {}},
    ],
    "marketing_campaigns": [
        {"keys": [("status", 1)], "options": {}},
        {"keys": [("created_at", -1)], "options": {}},
    ],
    "departments": [
        {"keys": [("code", 1)], "options": {"unique": True, "sparse": True}},
    ],
    "support_tickets": [
        {"keys": [("user_id", 1), ("status", 1)], "options": {}},
        {"keys": [("priority", 1)], "options": {}},
    ],
}


async def create_indexes():
    """Create all defined indexes"""
    client = AsyncIOMotorClient(MONGO_URL)
    db = client[DB_NAME]
    
    print(f"Creating indexes on database: {DB_NAME}")
    
    created = 0
    errors = 0
    
    for collection_name, indexes in INDEX_DEFINITIONS.items():
        print(f"\n📁 {collection_name}:")
        collection = db[collection_name]
        
        for index_def in indexes:
            try:
                await collection.create_index(index_def["keys"], **index_def["options"])
                key_names = [k[0] for k in index_def["keys"]]
                print(f"  ✓ {' + '.join(key_names)}")
                created += 1
            except Exception as e:
                print(f"  ✗ {index_def['keys']}: {e}")
                errors += 1
    
    print(f"\n=== Summary: {created} created, {errors} errors ===")
    client.close()


async def list_indexes():
    """List all existing indexes"""
    client = AsyncIOMotorClient(MONGO_URL)
    db = client[DB_NAME]
    
    print(f"Listing indexes on database: {DB_NAME}")
    
    collections = await db.list_collection_names()
    
    for collection_name in sorted(collections):
        indexes = await db[collection_name].index_information()
        if len(indexes) > 1:  # More than just _id
            print(f"\n📁 {collection_name}:")
            for index_name, index_info in indexes.items():
                if index_name != "_id_":
                    print(f"  - {index_name}: {index_info.get('key')}")
    
    client.close()


async def main():
    parser = argparse.ArgumentParser(description="Manage database indexes")
    parser.add_argument("--create", action="store_true", help="Create all indexes")
    parser.add_argument("--list", action="store_true", help="List existing indexes")
    
    args = parser.parse_args()
    
    if args.create:
        await create_indexes()
    elif args.list:
        await list_indexes()
    else:
        parser.print_help()


if __name__ == "__main__":
    asyncio.run(main())
