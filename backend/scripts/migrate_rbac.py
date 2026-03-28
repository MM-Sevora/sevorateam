"""
RBAC Migration Script
Migrates old roles and user permissions to the new RBAC system.

This script:
1. Reads old roles from 'roles' collection (access/roles endpoint)
2. Updates new RBAC roles with module_access from old roles
3. Maps users' custom_role_ids to new RBAC role IDs
4. Updates users with proper role_ids field
"""

import asyncio
import os
from motor.motor_asyncio import AsyncIOMotorClient
from datetime import datetime, timezone

# MongoDB connection
MONGO_URL = os.environ.get("MONGO_URL", "mongodb://localhost:27017")
DB_NAME = os.environ.get("DB_NAME", "sevora_hub")

# Module access mappings for different role types
ROLE_MODULE_DEFAULTS = {
    "super_admin": {
        "module_access": [
            "dashboard", "sevora_pulse", "analytics_insights", "sourcing", "goals",
            "project_management", "operational_tasks", "marketing_ops", "social",
            "sales", "hr", "expense", "employee_self_service", "meetings", "mail",
            "knowledge_base", "automations", "admin", "notifications", "help_support"
        ],
        "module_permissions": {},  # Super admin has all permissions by default
        "can_manage_users": True,
        "can_manage_roles": True
    },
    "admin": {
        "module_access": [
            "dashboard", "sevora_pulse", "analytics_insights", "goals",
            "project_management", "operational_tasks", "hr", "admin",
            "notifications", "help_support"
        ],
        "module_permissions": {},
        "can_manage_users": True,
        "can_manage_roles": True
    },
    "hr_admin": {
        "module_access": [
            "dashboard", "sevora_pulse", "analytics_insights", "goals",
            "hr", "expense", "employee_self_service", "notifications", "help_support"
        ],
        "module_permissions": {
            "hr": {"create": True, "read": True, "update": True, "delete": True, "data_scope": "all"},
            "expense": {"create": True, "read": True, "update": True, "delete": False, "data_scope": "all", "can_approve": True}
        },
        "can_manage_users": True,
        "can_manage_roles": False
    },
    "finance_admin": {
        "module_access": [
            "dashboard", "sevora_pulse", "analytics_insights", "expense",
            "employee_self_service", "notifications", "help_support"
        ],
        "module_permissions": {
            "expense": {"create": False, "read": True, "update": True, "delete": False, "data_scope": "all", "can_approve": True}
        },
        "can_manage_users": False,
        "can_manage_roles": False
    },
    "marketing_manager": {
        "module_access": [
            "dashboard", "sevora_pulse", "analytics_insights", "goals",
            "marketing_ops", "social", "project_management", "operational_tasks",
            "meetings", "notifications", "help_support"
        ],
        "module_permissions": {
            "marketing_ops": {"create": True, "read": True, "update": True, "delete": True, "data_scope": "department"},
            "social": {"create": True, "read": True, "update": True, "delete": True, "data_scope": "department"}
        },
        "can_manage_users": False,
        "can_manage_roles": False
    },
    "marketing_exec": {
        "module_access": [
            "dashboard", "sevora_pulse", "marketing_ops", "social",
            "operational_tasks", "notifications", "help_support"
        ],
        "module_permissions": {
            "marketing_ops": {"create": True, "read": True, "update": True, "delete": False, "data_scope": "own_assigned"},
            "social": {"create": True, "read": True, "update": True, "delete": False, "data_scope": "own_assigned"}
        },
        "can_manage_users": False,
        "can_manage_roles": False
    },
    "sales_manager": {
        "module_access": [
            "dashboard", "sevora_pulse", "analytics_insights", "goals",
            "sales", "sourcing", "project_management", "operational_tasks",
            "meetings", "notifications", "help_support"
        ],
        "module_permissions": {
            "sales": {"create": True, "read": True, "update": True, "delete": True, "data_scope": "department"},
            "sourcing": {"create": True, "read": True, "update": True, "delete": False, "data_scope": "department"}
        },
        "can_manage_users": False,
        "can_manage_roles": False
    },
    "sales_exec": {
        "module_access": [
            "dashboard", "sevora_pulse", "sales", "sourcing",
            "operational_tasks", "notifications", "help_support"
        ],
        "module_permissions": {
            "sales": {"create": True, "read": True, "update": True, "delete": False, "data_scope": "own_assigned"},
            "sourcing": {"create": True, "read": True, "update": False, "delete": False, "data_scope": "own_assigned"}
        },
        "can_manage_users": False,
        "can_manage_roles": False
    },
    "social_manager": {
        "module_access": [
            "dashboard", "sevora_pulse", "marketing_ops", "social",
            "analytics_insights", "operational_tasks", "notifications", "help_support"
        ],
        "module_permissions": {
            "social": {"create": True, "read": True, "update": True, "delete": True, "data_scope": "all"},
            "marketing_ops": {"create": False, "read": True, "update": False, "delete": False, "data_scope": "all"}
        },
        "can_manage_users": False,
        "can_manage_roles": False
    },
    "project_manager": {
        "module_access": [
            "dashboard", "sevora_pulse", "goals", "project_management",
            "operational_tasks", "meetings", "notifications", "help_support"
        ],
        "module_permissions": {
            "project_management": {"create": True, "read": True, "update": True, "delete": True, "data_scope": "department"},
            "operational_tasks": {"create": True, "read": True, "update": True, "delete": True, "data_scope": "department"}
        },
        "can_manage_users": False,
        "can_manage_roles": False
    },
    "employee": {
        "module_access": [
            "dashboard", "sevora_pulse", "goals", "project_management",
            "operational_tasks", "employee_self_service", "notifications", "help_support"
        ],
        "module_permissions": {
            "project_management": {"create": False, "read": True, "update": True, "delete": False, "data_scope": "own_assigned"},
            "operational_tasks": {"create": True, "read": True, "update": True, "delete": False, "data_scope": "own_assigned"}
        },
        "can_manage_users": False,
        "can_manage_roles": False
    },
    "viewer": {
        "module_access": [
            "dashboard", "sevora_pulse", "notifications", "help_support", "employee_self_service"
        ],
        "module_permissions": {},
        "can_manage_users": False,
        "can_manage_roles": False
    },
    "it_admin": {
        "module_access": [
            "dashboard", "sevora_pulse", "analytics_insights", "admin",
            "automations", "notifications", "help_support"
        ],
        "module_permissions": {},
        "can_manage_users": True,
        "can_manage_roles": False
    },
    "finance_employee": {
        "module_access": [
            "dashboard", "sevora_pulse", "expense", "employee_self_service",
            "notifications", "help_support"
        ],
        "module_permissions": {
            "expense": {"create": False, "read": True, "update": False, "delete": False, "data_scope": "own_assigned"}
        },
        "can_manage_users": False,
        "can_manage_roles": False
    },
    "it_employee": {
        "module_access": [
            "dashboard", "sevora_pulse", "operational_tasks",
            "notifications", "help_support"
        ],
        "module_permissions": {},
        "can_manage_users": False,
        "can_manage_roles": False
    },
    "hr_employee": {
        "module_access": [
            "dashboard", "sevora_pulse", "hr", "employee_self_service",
            "notifications", "help_support"
        ],
        "module_permissions": {
            "hr": {"create": False, "read": True, "update": False, "delete": False, "data_scope": "own_assigned"}
        },
        "can_manage_users": False,
        "can_manage_roles": False
    }
}


async def migrate_rbac():
    """Main migration function"""
    client = AsyncIOMotorClient(MONGO_URL)
    db = client[DB_NAME]
    
    print("=" * 60)
    print("RBAC Migration Script")
    print("=" * 60)
    
    # Step 1: Get old roles
    print("\n[1/4] Fetching old roles...")
    old_roles = await db.roles.find({"is_deleted": {"$ne": True}}, {"_id": 0}).to_list(100)
    print(f"   Found {len(old_roles)} old roles")
    
    # Create mapping of old role ID -> old role data
    old_role_map = {r["id"]: r for r in old_roles}
    
    # Step 2: Get new RBAC roles
    print("\n[2/4] Fetching new RBAC roles...")
    new_roles = await db.custom_roles.find({"is_deleted": {"$ne": True}}, {"_id": 0}).to_list(100)
    print(f"   Found {len(new_roles)} new RBAC roles")
    
    # Create mapping of role code -> new role
    new_role_code_map = {r.get("code"): r for r in new_roles}
    
    # Step 3: Update new RBAC roles with module_access
    print("\n[3/4] Updating new RBAC roles with module permissions...")
    roles_updated = 0
    
    for role_code, defaults in ROLE_MODULE_DEFAULTS.items():
        if role_code in new_role_code_map:
            new_role = new_role_code_map[role_code]
            
            # Check if already has module_access
            existing_modules = new_role.get("module_access", [])
            if len(existing_modules) >= len(defaults["module_access"]):
                print(f"   ⏭️  {role_code}: Already has {len(existing_modules)} modules, skipping")
                continue
            
            # Update the role
            update_data = {
                "module_access": defaults["module_access"],
                "module_permissions": defaults["module_permissions"],
                "can_manage_users": defaults["can_manage_users"],
                "can_manage_roles": defaults["can_manage_roles"],
                "updated_at": datetime.now(timezone.utc).isoformat()
            }
            
            result = await db.custom_roles.update_one(
                {"id": new_role["id"]},
                {"$set": update_data}
            )
            
            if result.modified_count > 0:
                roles_updated += 1
                print(f"   ✅ {role_code}: Updated with {len(defaults['module_access'])} modules")
            else:
                print(f"   ⚠️  {role_code}: No changes made")
    
    print(f"\n   Total roles updated: {roles_updated}")
    
    # Step 4: Map users' custom_role_ids to new role_ids
    print("\n[4/4] Migrating user role assignments...")
    
    # Get all users
    users = await db.users.find({}, {"_id": 0}).to_list(1000)
    print(f"   Found {len(users)} users")
    
    users_migrated = 0
    users_skipped = 0
    
    for user in users:
        user_id = user.get("id")
        custom_role_ids = user.get("custom_role_ids", [])
        legacy_role = user.get("role", "")
        existing_role_ids = user.get("role_ids", [])
        
        # Skip if already has role_ids populated
        if existing_role_ids and len(existing_role_ids) > 0:
            users_skipped += 1
            continue
        
        new_role_ids = []
        
        # Map custom_role_ids to new role codes
        for old_role_id in custom_role_ids:
            if old_role_id in old_role_map:
                old_role = old_role_map[old_role_id]
                old_code = old_role.get("code", "")
                
                # Find corresponding new role
                if old_code in new_role_code_map:
                    new_role_ids.append(new_role_code_map[old_code]["id"])
        
        # Also consider legacy role field
        if legacy_role and legacy_role in new_role_code_map:
            new_role_id = new_role_code_map[legacy_role]["id"]
            if new_role_id not in new_role_ids:
                new_role_ids.append(new_role_id)
        
        # Update user if we found matching roles
        if new_role_ids:
            result = await db.users.update_one(
                {"id": user_id},
                {"$set": {"role_ids": new_role_ids}}
            )
            if result.modified_count > 0:
                users_migrated += 1
    
    print(f"   Users migrated: {users_migrated}")
    print(f"   Users skipped (already had role_ids): {users_skipped}")
    
    # Summary
    print("\n" + "=" * 60)
    print("Migration Complete!")
    print("=" * 60)
    print(f"  Roles updated with module_access: {roles_updated}")
    print(f"  Users migrated to new role_ids: {users_migrated}")
    print("=" * 60)
    
    client.close()
    return {
        "roles_updated": roles_updated,
        "users_migrated": users_migrated,
        "users_skipped": users_skipped
    }


if __name__ == "__main__":
    asyncio.run(migrate_rbac())
