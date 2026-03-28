"""
Unified RBAC Routes
Clean, streamlined role-based access control API
"""

from fastapi import APIRouter, Depends, HTTPException, Query
from typing import List, Optional, Dict, Any
import uuid
from datetime import datetime, timezone

from models.rbac import (
    RoleCreate, RoleUpdate, RoleResponse,
    UserRoleAssignment, EffectivePermissions,
    ModulePermission, DataScope,
    SYSTEM_MODULES, DEFAULT_ROLES, PERMISSION_PRESETS,
    get_all_modules, get_modules_by_category, get_default_modules
)

rbac_router = APIRouter(prefix="/rbac", tags=["RBAC - Roles & Permissions"])


# ============== DEPENDENCIES ==============

def get_db():
    from server import db
    return db


def require_admin():
    from server import require_department
    return require_department(["admin"])


def get_current_user_dep():
    from server import get_current_user
    return get_current_user


# ============== MODULE ENDPOINTS ==============

@rbac_router.get("/modules")
async def get_modules(
    category: Optional[str] = None,
    include_inactive: bool = False,
    user: dict = Depends(get_current_user_dep())
):
    """Get all system modules, optionally filtered by category"""
    modules = get_all_modules()
    
    if category:
        modules = [m for m in modules if m["category"] == category]
    
    if not include_inactive:
        modules = [m for m in modules if m.get("is_active", True)]
    
    return {
        "modules": modules,
        "total": len(modules),
        "categories": list(set(m["category"] for m in modules))
    }


@rbac_router.get("/modules/by-category")
async def get_modules_grouped(
    user: dict = Depends(get_current_user_dep())
):
    """Get modules grouped by category"""
    return get_modules_by_category()


@rbac_router.get("/modules/defaults")
async def get_default_module_list(
    user: dict = Depends(get_current_user_dep())
):
    """Get list of default modules (auto-granted to all users)"""
    return {"default_modules": get_default_modules()}


# ============== ROLE ENDPOINTS ==============

@rbac_router.get("/roles", response_model=List[RoleResponse])
async def get_roles(
    include_inactive: bool = False,
    user: dict = Depends(get_current_user_dep())
):
    """Get all roles with user counts"""
    db = get_db()
    
    query = {}
    if not include_inactive:
        query["is_active"] = {"$ne": False}
    
    # Use custom_roles collection (main roles collection)
    roles = await db.roles.find(query, {"_id": 0}).to_list(100)
    
    # Auto-seed default roles if none exist
    if len(roles) == 0:
        now = datetime.now(timezone.utc).isoformat()
        for role_data in DEFAULT_ROLES:
            role_id = str(uuid.uuid4())
            role_doc = {
                "id": role_id,
                **role_data,
                "is_active": True,
                "user_count": 0,
                "created_at": now,
                "updated_at": now
            }
            await db.roles.insert_one(role_doc)
        roles = await db.roles.find(query, {"_id": 0}).to_list(100)
    
    # Enrich with user counts and module names
    for role in roles:
        # Count users with this role (check multiple assignment methods)
        role_id = role["id"]
        role_code = role.get("code", "")
        role_name = role.get("name", "")
        
        # Check role_ids, custom_role_ids, and legacy role field
        user_count = await db.users.count_documents({
            "$or": [
                {"role_ids": role_id},
                {"custom_role_ids": role_id},
                {"role": role_code},  # Legacy: role field matches role code
                {"role": role_name.lower().replace(" ", "_")}  # Legacy: role field matches role name as snake_case
            ]
        })
        role["user_count"] = user_count
        
        # Add human-readable module names
        module_codes = role.get("module_access", [])
        role["module_names"] = [
            SYSTEM_MODULES[code].name 
            for code in module_codes 
            if code in SYSTEM_MODULES
        ]
    
    return roles


@rbac_router.get("/roles/{role_id}", response_model=RoleResponse)
async def get_role(
    role_id: str,
    user: dict = Depends(get_current_user_dep())
):
    """Get a specific role by ID"""
    db = get_db()
    
    role = await db.roles.find_one({"id": role_id}, {"_id": 0})
    if not role:
        raise HTTPException(status_code=404, detail="Role not found")
    
    # Enrich with user count
    user_count = await db.users.count_documents({"role_ids": role_id})
    role["user_count"] = user_count
    
    # Add module names
    module_codes = role.get("module_access", [])
    role["module_names"] = [
        SYSTEM_MODULES[code].name 
        for code in module_codes 
        if code in SYSTEM_MODULES
    ]
    
    return role


@rbac_router.post("/roles", response_model=RoleResponse)
async def create_role(
    data: RoleCreate,
    user: dict = Depends(require_admin())
):
    """Create a new role"""
    db = get_db()
    
    # Check for duplicate code
    existing = await db.roles.find_one({"code": data.code})
    if existing:
        raise HTTPException(status_code=400, detail="Role code already exists")
    
    now = datetime.now(timezone.utc).isoformat()
    role_id = str(uuid.uuid4())
    
    role_doc = {
        "id": role_id,
        "name": data.name,
        "code": data.code,
        "description": data.description,
        "module_access": data.module_access,
        "module_permissions": data.module_permissions,
        "is_system_role": data.is_system_role,
        "can_manage_users": data.can_manage_users,
        "can_manage_roles": data.can_manage_roles,
        "is_active": True,
        "user_count": 0,
        "created_at": now,
        "updated_at": now,
        "created_by": user.get("id")
    }
    
    await db.roles.insert_one(role_doc)
    if "_id" in role_doc:
        del role_doc["_id"]
    
    role_doc["module_names"] = [
        SYSTEM_MODULES[code].name 
        for code in data.module_access 
        if code in SYSTEM_MODULES
    ]
    
    return role_doc


@rbac_router.put("/roles/{role_id}", response_model=RoleResponse)
async def update_role(
    role_id: str,
    data: RoleUpdate,
    user: dict = Depends(require_admin())
):
    """Update an existing role"""
    db = get_db()
    
    role = await db.roles.find_one({"id": role_id})
    if not role:
        raise HTTPException(status_code=404, detail="Role not found")
    
    # Don't allow modifying system roles' core properties
    if role.get("is_system_role") and data.name:
        raise HTTPException(status_code=400, detail="Cannot change system role name")
    
    update_data = {"updated_at": datetime.now(timezone.utc).isoformat()}
    
    if data.name is not None:
        update_data["name"] = data.name
    if data.description is not None:
        update_data["description"] = data.description
    if data.module_access is not None:
        update_data["module_access"] = data.module_access
    if data.module_permissions is not None:
        update_data["module_permissions"] = data.module_permissions
    if data.can_manage_users is not None:
        update_data["can_manage_users"] = data.can_manage_users
    if data.can_manage_roles is not None:
        update_data["can_manage_roles"] = data.can_manage_roles
    if data.is_active is not None:
        update_data["is_active"] = data.is_active
    
    await db.roles.update_one({"id": role_id}, {"$set": update_data})
    
    # Fetch updated role
    updated_role = await db.roles.find_one({"id": role_id}, {"_id": 0})
    
    # Enrich
    user_count = await db.users.count_documents({"role_ids": role_id})
    updated_role["user_count"] = user_count
    updated_role["module_names"] = [
        SYSTEM_MODULES[code].name 
        for code in updated_role.get("module_access", [])
        if code in SYSTEM_MODULES
    ]
    
    return updated_role


@rbac_router.delete("/roles/{role_id}")
async def delete_role(
    role_id: str,
    user: dict = Depends(require_admin())
):
    """Delete a role (soft delete)"""
    db = get_db()
    
    role = await db.roles.find_one({"id": role_id})
    if not role:
        raise HTTPException(status_code=404, detail="Role not found")
    
    if role.get("is_system_role"):
        raise HTTPException(status_code=400, detail="Cannot delete system roles")
    
    # Check if role is assigned to any users
    user_count = await db.users.count_documents({"role_ids": role_id})
    if user_count > 0:
        raise HTTPException(
            status_code=400, 
            detail=f"Cannot delete role assigned to {user_count} user(s). Remove role from users first."
        )
    
    # Soft delete
    await db.roles.update_one(
        {"id": role_id}, 
        {"$set": {"is_active": False, "deleted_at": datetime.now(timezone.utc).isoformat()}}
    )
    
    return {"message": "Role deleted", "role_id": role_id}


# ============== USER ROLE ASSIGNMENT ==============

@rbac_router.get("/users/{user_id}/permissions")
async def get_user_permissions(
    user_id: str,
    current_user: dict = Depends(get_current_user_dep())
):
    """Get effective permissions for a user (merged from all roles)"""
    db = get_db()
    
    target_user = await db.users.find_one({"id": user_id}, {"_id": 0, "password": 0, "hashed_password": 0})
    if not target_user:
        raise HTTPException(status_code=404, detail="User not found")
    
    return await compute_effective_permissions(db, target_user)


@rbac_router.put("/users/{user_id}/roles")
async def assign_user_roles(
    user_id: str,
    role_ids: List[str],
    current_user: dict = Depends(require_admin())
):
    """Assign roles to a user"""
    db = get_db()
    
    # Verify user exists
    target_user = await db.users.find_one({"id": user_id})
    if not target_user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Verify all roles exist
    for role_id in role_ids:
        role = await db.roles.find_one({"id": role_id, "is_active": {"$ne": False}})
        if not role:
            raise HTTPException(status_code=400, detail=f"Role not found: {role_id}")
    
    # Compute merged permissions
    merged = await compute_merged_permissions(db, role_ids)
    
    # Update user
    await db.users.update_one(
        {"id": user_id},
        {"$set": {
            "role_ids": role_ids,
            "merged_module_access": merged["modules"],
            "module_permissions": merged["permissions"],
            "can_manage_users": merged["can_manage_users"],
            "can_manage_roles": merged["can_manage_roles"],
            "permissions_updated_at": datetime.now(timezone.utc).isoformat()
        }}
    )
    
    return {
        "message": "Roles assigned successfully",
        "user_id": user_id,
        "role_ids": role_ids,
        "merged_modules": merged["modules"]
    }


@rbac_router.get("/users/{user_id}/preview-permissions")
async def preview_user_permissions(
    user_id: str,
    role_ids: List[str] = Query(default=[]),
    current_user: dict = Depends(get_current_user_dep())
):
    """Preview what permissions a user would have with given roles (without saving)"""
    db = get_db()
    
    # Verify user exists
    target_user = await db.users.find_one({"id": user_id}, {"_id": 0})
    if not target_user:
        raise HTTPException(status_code=404, detail="User not found")
    
    if not role_ids:
        # Return current permissions
        return await compute_effective_permissions(db, target_user)
    
    # Compute what permissions would be with new roles
    merged = await compute_merged_permissions(db, role_ids)
    
    return {
        "preview": True,
        "user_id": user_id,
        "role_ids": role_ids,
        "modules": merged["modules"],
        "permissions": merged["permissions"],
        "can_manage_users": merged["can_manage_users"],
        "can_manage_roles": merged["can_manage_roles"]
    }


# ============== PERMISSION PRESETS ==============

@rbac_router.get("/presets")
async def get_permission_presets(
    user: dict = Depends(get_current_user_dep())
):
    """Get available permission presets (viewer, editor, manager, admin)"""
    return {
        preset_name: preset.to_dict()
        for preset_name, preset in PERMISSION_PRESETS.items()
    }


# ============== HELPER FUNCTIONS ==============

async def compute_merged_permissions(db, role_ids: List[str]) -> Dict[str, Any]:
    """
    Merge permissions from multiple roles.
    Rules:
    - Modules: Union of all role modules
    - CRUD: Most permissive wins (if any role grants it, user has it)
    - Data Scope: Most permissive wins (all > department > team > own)
    """
    merged_modules = set()
    merged_permissions = {}
    can_manage_users = False
    can_manage_roles = False
    
    # Data scope hierarchy (higher = more permissive)
    scope_hierarchy = {"own": 0, "own_assigned": 1, "team": 2, "department": 3, "all": 4}
    
    for role_id in role_ids:
        role = await db.roles.find_one({"id": role_id, "is_active": {"$ne": False}}, {"_id": 0})
        if not role:
            continue
        
        # Merge modules
        merged_modules.update(role.get("module_access", []))
        
        # Merge administrative permissions
        if role.get("can_manage_users"):
            can_manage_users = True
        if role.get("can_manage_roles"):
            can_manage_roles = True
        
        # Merge module permissions
        for module_code, perms in role.get("module_permissions", {}).items():
            if module_code not in merged_permissions:
                merged_permissions[module_code] = dict(perms)
            else:
                existing = merged_permissions[module_code]
                # Merge CRUD (most permissive)
                for key in ["create", "read", "update", "delete", "can_edit_others", "can_delete_others", "can_approve", "can_export", "can_bulk_edit"]:
                    if perms.get(key, False):
                        existing[key] = True
                # Merge data scope (most permissive)
                existing_scope = scope_hierarchy.get(existing.get("data_scope", "own"), 0)
                new_scope = scope_hierarchy.get(perms.get("data_scope", "own"), 0)
                if new_scope > existing_scope:
                    existing["data_scope"] = perms.get("data_scope")
    
    # Add default modules
    merged_modules.update(get_default_modules())
    
    return {
        "modules": list(merged_modules),
        "permissions": merged_permissions,
        "can_manage_users": can_manage_users,
        "can_manage_roles": can_manage_roles
    }


async def compute_effective_permissions(db, user: dict) -> Dict[str, Any]:
    """Compute effective permissions for a user from their assigned roles"""
    role_ids = user.get("role_ids", [])
    
    # Legacy support: check for old custom_role_ids field
    if not role_ids and user.get("custom_role_ids"):
        role_ids = user.get("custom_role_ids", [])
    
    # Get roles
    roles = []
    for role_id in role_ids:
        role = await db.roles.find_one({"id": role_id, "is_active": {"$ne": False}}, {"_id": 0})
        if role:
            roles.append({
                "id": role["id"],
                "name": role["name"],
                "code": role.get("code"),
            })
    
    # Compute merged permissions
    if role_ids:
        merged = await compute_merged_permissions(db, role_ids)
    else:
        merged = {
            "modules": get_default_modules(),
            "permissions": {},
            "can_manage_users": False,
            "can_manage_roles": False
        }
    
    # Super admin override
    if user.get("role") == "super_admin":
        merged["modules"] = list(SYSTEM_MODULES.keys())
        merged["can_manage_users"] = True
        merged["can_manage_roles"] = True
    
    return {
        "user_id": user.get("id"),
        "user_name": user.get("name"),
        "user_email": user.get("email"),
        "roles": roles,
        "modules": merged["modules"],
        "permissions": merged["permissions"],
        "can_manage_users": merged["can_manage_users"],
        "can_manage_roles": merged["can_manage_roles"],
        "is_admin": user.get("role") in ["super_admin", "admin"] or merged["can_manage_users"]
    }



# ============== ADMIN: SYNC DEFAULT ROLES ==============

@rbac_router.post("/sync-defaults")
async def sync_default_roles(
    user: dict = Depends(get_current_user_dep())
):
    """
    Sync default roles with correct module_access.
    This ensures production roles have the correct permissions.
    Also removes duplicates and ensures Super Admin has all modules.
    Only accessible by admins.
    """
    # Check if user has admin access
    if user.get("role") not in ["super_admin", "admin"] and not user.get("can_manage_roles"):
        raise HTTPException(status_code=403, detail="Admin access required")
    
    db = get_db()
    now = datetime.now(timezone.utc).isoformat()
    
    results = {
        "created": [],
        "updated": [],
        "skipped": [],
        "duplicates_removed": []
    }
    
    # First, remove duplicate roles
    for role_data in DEFAULT_ROLES:
        role_code = role_data["code"]
        duplicates = await db.roles.find({"code": role_code}).to_list(100)
        
        if len(duplicates) > 1:
            # Keep the one with most modules, delete others
            duplicates_sorted = sorted(duplicates, key=lambda r: len(r.get("module_access", [])), reverse=True)
            for dup in duplicates_sorted[1:]:
                await db.roles.delete_one({"_id": dup["_id"]})
                results["duplicates_removed"].append({
                    "code": role_code,
                    "id": str(dup.get("id", dup.get("_id")))
                })
    
    # Now sync default roles
    for role_data in DEFAULT_ROLES:
        role_code = role_data["code"]
        
        # Check if role exists (after duplicate cleanup)
        existing = await db.roles.find_one({"code": role_code}, {"_id": 0})
        
        if not existing:
            # Create new role
            role_id = str(uuid.uuid4())
            role_doc = {
                "id": role_id,
                **role_data,
                "is_active": True,
                "user_count": 0,
                "created_at": now,
                "updated_at": now
            }
            await db.roles.insert_one(role_doc)
            results["created"].append(role_code)
        else:
            # Check if module_access needs updating
            existing_modules = set(existing.get("module_access", []))
            expected_modules = set(role_data.get("module_access", []))
            
            if existing_modules != expected_modules or len(existing_modules) == 0:
                # Update with correct module_access and permissions
                await db.roles.update_one(
                    {"code": role_code},
                    {"$set": {
                        "module_access": role_data["module_access"],
                        "module_permissions": role_data.get("module_permissions", {}),
                        "can_manage_users": role_data.get("can_manage_users", False),
                        "can_manage_roles": role_data.get("can_manage_roles", False),
                        "updated_at": now
                    }}
                )
                results["updated"].append({
                    "code": role_code,
                    "old_modules": len(existing_modules),
                    "new_modules": len(expected_modules)
                })
            else:
                results["skipped"].append(role_code)
    
    return {
        "status": "success",
        "message": f"Synced {len(results['created'])} created, {len(results['updated'])} updated, {len(results['skipped'])} skipped",
        "details": results
    }


@rbac_router.post("/cleanup-duplicates")
async def cleanup_duplicate_roles(
    user: dict = Depends(get_current_user_dep())
):
    """
    Remove duplicate roles keeping only one copy per role code.
    Also ensures Super Admin has all modules.
    Only accessible by admins.
    """
    # Check if user has admin access
    if user.get("role") not in ["super_admin", "admin"] and not user.get("can_manage_roles"):
        raise HTTPException(status_code=403, detail="Admin access required")
    
    db = get_db()
    now = datetime.now(timezone.utc).isoformat()
    
    results = {
        "duplicates_removed": [],
        "super_admin_fixed": False,
        "total_roles_before": 0,
        "total_roles_after": 0
    }
    
    # Get all roles
    all_roles = await db.roles.find({}, {"_id": 0}).to_list(500)
    results["total_roles_before"] = len(all_roles)
    
    # Group roles by code
    roles_by_code = {}
    for role in all_roles:
        code = role.get("code", "")
        if code not in roles_by_code:
            roles_by_code[code] = []
        roles_by_code[code].append(role)
    
    # Process duplicates
    for code, roles in roles_by_code.items():
        if len(roles) > 1:
            # Keep the one with most module_access, delete the rest
            roles_sorted = sorted(roles, key=lambda r: len(r.get("module_access", [])), reverse=True)
            
            # Delete duplicates (all except the first/best one)
            for role in roles_sorted[1:]:
                await db.roles.delete_one({"id": role["id"]})
                results["duplicates_removed"].append({
                    "code": code,
                    "name": role.get("name"),
                    "id": role["id"],
                    "modules_count": len(role.get("module_access", []))
                })
    
    # Ensure Super Admin has ALL modules
    all_module_codes = list(SYSTEM_MODULES.keys())
    super_admin = await db.roles.find_one({"code": "super_admin"}, {"_id": 0})
    
    if super_admin:
        current_modules = set(super_admin.get("module_access", []))
        expected_modules = set(all_module_codes)
        
        if current_modules != expected_modules:
            # Update Super Admin with all modules
            await db.roles.update_one(
                {"code": "super_admin"},
                {"$set": {
                    "module_access": all_module_codes,
                    "module_permissions": {
                        module: PERMISSION_PRESETS["admin"].to_dict()
                        for module in all_module_codes
                    },
                    "can_manage_users": True,
                    "can_manage_roles": True,
                    "updated_at": now
                }}
            )
            results["super_admin_fixed"] = True
            results["super_admin_modules"] = {
                "before": len(current_modules),
                "after": len(expected_modules)
            }
    
    # Get final count
    final_count = await db.roles.count_documents({})
    results["total_roles_after"] = final_count
    
    return {
        "status": "success",
        "message": f"Cleanup complete. Removed {len(results['duplicates_removed'])} duplicates. Roles: {results['total_roles_before']} → {results['total_roles_after']}",
        "details": results
    }
