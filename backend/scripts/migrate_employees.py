"""
Migration Script: Migrate HR data from users to employees collection
Run once to create the clean architecture separation.
"""

import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
from datetime import datetime, timezone
import uuid
import os

MONGO_URL = os.environ.get("MONGO_URL", "mongodb://localhost:27017")
DB_NAME = os.environ.get("DB_NAME", "sevora_hub")


async def migrate_users_to_employees():
    """
    Migration steps:
    1. Create employees collection with proper indexes
    2. For each user with HR data (department_id, employee_id, etc.), create an employee record
    3. Link employee record to user via user_id
    4. Keep user collection clean (just auth data)
    """
    client = AsyncIOMotorClient(MONGO_URL)
    db = client[DB_NAME]
    
    print(f"Connected to MongoDB: {DB_NAME}")
    
    # Check if migration already ran
    existing_employees = await db.employees.count_documents({})
    if existing_employees > 0:
        print(f"Migration appears to have already run ({existing_employees} employees exist).")
        user_input = input("Do you want to run it again? This will create duplicates. (y/n): ")
        if user_input.lower() != 'y':
            print("Migration aborted.")
            return
    
    # Create indexes on employees collection
    print("Creating indexes on employees collection...")
    await db.employees.create_index("user_id", unique=True)
    await db.employees.create_index("employee_code", unique=True, sparse=True)
    await db.employees.create_index("department_id")
    await db.employees.create_index("team_id")
    await db.employees.create_index("grade_id")
    await db.employees.create_index("reports_to")
    await db.employees.create_index("status")
    
    # HR-related fields to migrate from users
    hr_fields = [
        "employee_id", "department_id", "team_id", "position_id", "grade_id",
        "reports_to", "secondary_manager_id", "designation", "employment_type",
        "work_mode", "status", "joining_date", "probation_end_date", 
        "confirmation_date", "exit_date", "exit_reason", "phone", "personal_email",
        "date_of_birth", "gender", "blood_group", "address_line1", "address_line2",
        "city", "state", "country", "postal_code", "emergency_contact_name",
        "emergency_contact_phone", "emergency_contact_relation", "bank_name",
        "bank_account_number", "bank_ifsc", "pan_number", "bio", "skills",
        "certifications", "work_location", "desk_number", "work_phone"
    ]
    
    # Get all users with HR data (have department_id or employee_id set)
    query = {
        "$or": [
            {"department_id": {"$exists": True, "$ne": None}},
            {"employee_id": {"$exists": True, "$ne": None}},
            {"grade_id": {"$exists": True, "$ne": None}}
        ]
    }
    
    users_cursor = db.users.find(query)
    users_with_hr = await users_cursor.to_list(1000)
    
    print(f"Found {len(users_with_hr)} users with HR data to migrate")
    
    migrated = 0
    skipped = 0
    now = datetime.now(timezone.utc).isoformat()
    
    for user in users_with_hr:
        user_id = user.get("id")
        
        # Check if employee record already exists for this user
        existing = await db.employees.find_one({"user_id": user_id})
        if existing:
            print(f"  Skipping user {user.get('email')} - employee record exists")
            skipped += 1
            continue
        
        # Create employee record
        employee_doc = {
            "id": str(uuid.uuid4()),
            "user_id": user_id,
            "employee_code": user.get("employee_id", f"EMP-{str(migrated + 1).zfill(4)}"),
            "status": user.get("status", "active"),
            "is_active": user.get("is_active", True),
            "created_at": user.get("created_at", now),
            "updated_at": now,
            "migrated_from_users": True,
            "migration_date": now
        }
        
        # Copy HR fields
        for field in hr_fields:
            if field in user and user[field] is not None:
                # Rename employee_id to employee_code
                if field == "employee_id":
                    continue  # Already handled above
                employee_doc[field] = user[field]
        
        # Insert employee record
        try:
            await db.employees.insert_one(employee_doc)
            print(f"  Migrated: {user.get('email')} -> Employee {employee_doc['employee_code']}")
            migrated += 1
        except Exception as e:
            print(f"  Error migrating {user.get('email')}: {e}")
            skipped += 1
    
    print(f"\nMigration complete!")
    print(f"  Migrated: {migrated}")
    print(f"  Skipped: {skipped}")
    print(f"  Total employees now: {await db.employees.count_documents({})}")
    
    # Add reference to employees collection from users
    print("\nUpdating users with employee references...")
    employees = await db.employees.find({}, {"id": 1, "user_id": 1}).to_list(1000)
    for emp in employees:
        await db.users.update_one(
            {"id": emp["user_id"]},
            {"$set": {"employee_id_ref": emp["id"]}}
        )
    print("Done!")
    
    client.close()


if __name__ == "__main__":
    asyncio.run(migrate_users_to_employees())
