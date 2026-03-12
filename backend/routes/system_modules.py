"""
System Modules Routes - CRUD for system modules configuration
Allows admin to manage modules, add department/team/tags
"""

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from typing import List, Optional, Dict
from datetime import datetime, timezone
import uuid

from models.system_modules import SYSTEM_MODULES, get_all_module_codes, get_default_modules

router = APIRouter(prefix="/system-modules", tags=["System Modules"])

# Database reference - set from server.py
db = None

def set_database(database):
    global db
    db = database


def require_admin():
    from server import require_department
    return require_department(["admin"])


def get_current_user_dep():
    from server import get_current_user
    return get_current_user


# ============== MODELS ==============

class ModuleMetadataUpdate(BaseModel):
    department: Optional[str] = None
    team: Optional[str] = None
    tags: List[str] = []
    is_active: bool = True
    category: Optional[str] = None  # general, operations, business, admin
    is_default: Optional[bool] = None  # Whether everyone gets access by default


class SubModuleToggle(BaseModel):
    sub_module_code: str
    is_active: bool


class ModuleResponse(BaseModel):
    code: str
    name: str
    description: str
    icon: str
    category: str
    is_default: bool
    sub_modules: List[dict]
    department: Optional[str] = None
    team: Optional[str] = None
    tags: List[str] = []
    is_active: bool = True


# ============== ENDPOINTS ==============

@router.get("/", response_model=List[ModuleResponse])
async def get_all_modules(user: dict = Depends(get_current_user_dep())):
    """
    Get all system modules with their metadata.
    Returns the base module definition + any custom metadata from DB.
    """
    modules = []
    
    for code, base_module in SYSTEM_MODULES.items():
        # Get custom metadata from DB if exists
        custom = await db.system_module_config.find_one({"code": code}, {"_id": 0})
        
        module_data = {
            "code": code,
            "name": base_module["name"],
            "description": base_module["description"],
            "icon": base_module["icon"],
            # Allow custom overrides for category and is_default
            "category": custom.get("category", base_module["category"]) if custom else base_module["category"],
            "is_default": custom.get("is_default", base_module["is_default"]) if custom else base_module["is_default"],
            "sub_modules": base_module["sub_modules"],
            # Override with custom metadata if exists
            "department": custom.get("department") if custom else None,
            "team": custom.get("team") if custom else None,
            "tags": custom.get("tags", []) if custom else [],
            "is_active": custom.get("is_active", True) if custom else True,
        }
        modules.append(module_data)
    
    return modules


@router.get("/categories")
async def get_module_categories(user: dict = Depends(get_current_user_dep())):
    """Get all module categories with their modules"""
    categories = {
        "general": {"name": "General", "description": "Everyone gets access", "color": "green", "modules": []},
        "operations": {"name": "Operations", "description": "Team-based access", "color": "yellow", "modules": []},
        "business": {"name": "Business", "description": "Department-based access", "color": "orange", "modules": []},
        "admin": {"name": "Administration", "description": "Admin-only access", "color": "red", "modules": []},
    }
    
    for code, mod in SYSTEM_MODULES.items():
        cat = mod.get("category", "general")
        if cat in categories:
            categories[cat]["modules"].append({
                "code": code,
                "name": mod["name"],
                "icon": mod["icon"],
                "is_default": mod["is_default"]
            })
    
    return categories


@router.get("/{module_code}")
async def get_module(module_code: str, user: dict = Depends(get_current_user_dep())):
    """Get a specific module with all details"""
    if module_code not in SYSTEM_MODULES:
        raise HTTPException(status_code=404, detail="Module not found")
    
    base_module = SYSTEM_MODULES[module_code]
    custom = await db.system_module_config.find_one({"code": module_code}, {"_id": 0})
    
    return {
        "code": module_code,
        "name": base_module["name"],
        "description": base_module["description"],
        "icon": base_module["icon"],
        "category": custom.get("category", base_module["category"]) if custom else base_module["category"],
        "is_default": custom.get("is_default", base_module["is_default"]) if custom else base_module["is_default"],
        "sub_modules": base_module["sub_modules"],
        "department": custom.get("department") if custom else None,
        "team": custom.get("team") if custom else None,
        "tags": custom.get("tags", []) if custom else [],
        "is_active": custom.get("is_active", True) if custom else True,
    }


@router.put("/{module_code}/metadata")
async def update_module_metadata(
    module_code: str, 
    data: ModuleMetadataUpdate,
    user: dict = Depends(require_admin())
):
    """Update module metadata (department, team, tags, category, is_default)"""
    if module_code not in SYSTEM_MODULES:
        raise HTTPException(status_code=404, detail="Module not found")
    
    base_module = SYSTEM_MODULES[module_code]
    
    update_data = {
        "code": module_code,
        "department": data.department,
        "team": data.team,
        "tags": data.tags,
        "is_active": data.is_active,
        # Allow overriding category and is_default
        "category": data.category if data.category else base_module["category"],
        "is_default": data.is_default if data.is_default is not None else base_module["is_default"],
        "updated_at": datetime.now(timezone.utc).isoformat(),
        "updated_by": user.get("id")
    }
    
    await db.system_module_config.update_one(
        {"code": module_code},
        {"$set": update_data},
        upsert=True
    )
    
    return {"success": True, "message": f"Module {module_code} updated"}


@router.get("/defaults/list")
async def get_default_module_list():
    """Get list of default modules (available to all users)"""
    return {
        "default_modules": get_default_modules(),
        "all_modules": get_all_module_codes()
    }


# ============== USER MODULE ACCESS ==============

@router.get("/user/{user_id}/access")
async def get_user_module_access(user_id: str, user: dict = Depends(require_admin())):
    """Get module access for a specific user"""
    target_user = await db.users.find_one({"id": user_id}, {"_id": 0})
    if not target_user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Get user's role-based module access
    merged_access = target_user.get("merged_module_access", [])
    
    # Get custom role module access if user has custom roles
    custom_role_ids = target_user.get("custom_role_ids", [])
    if custom_role_ids:
        roles = await db.custom_roles.find({"id": {"$in": custom_role_ids}}).to_list(10)
        role_modules = set()
        for role in roles:
            role_modules.update(role.get("module_access", []))
        merged_access = list(set(merged_access) | role_modules)
    
    # Get user-specific module overrides
    user_overrides = await db.user_module_access.find_one({"user_id": user_id}, {"_id": 0})
    
    # Build response with all modules
    result = []
    default_mods = get_default_modules()
    
    for code, mod in SYSTEM_MODULES.items():
        has_access = (
            code in default_mods or  # Default modules
            code in merged_access or  # Role-based access
            (user_overrides and code in user_overrides.get("granted_modules", []))  # Direct grant
        )
        
        # Check if explicitly denied
        if user_overrides and code in user_overrides.get("denied_modules", []):
            has_access = False
        
        result.append({
            "code": code,
            "name": mod["name"],
            "category": mod["category"],
            "is_default": mod["is_default"],
            "has_access": has_access,
            "access_source": "default" if code in default_mods else (
                "role" if code in merged_access else (
                    "direct" if has_access else "none"
                )
            )
        })
    
    return {
        "user_id": user_id,
        "user_name": target_user.get("name", target_user.get("email")),
        "modules": result
    }


@router.put("/user/{user_id}/access")
async def update_user_module_access(
    user_id: str,
    granted_modules: List[str],
    denied_modules: List[str] = [],
    user: dict = Depends(require_admin())
):
    """
    Update direct module access for a user.
    - granted_modules: Modules to grant (in addition to role-based)
    - denied_modules: Modules to explicitly deny (overrides role-based)
    """
    target_user = await db.users.find_one({"id": user_id}, {"_id": 0})
    if not target_user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Validate module codes
    valid_codes = set(SYSTEM_MODULES.keys())
    invalid_granted = set(granted_modules) - valid_codes
    invalid_denied = set(denied_modules) - valid_codes
    
    if invalid_granted or invalid_denied:
        raise HTTPException(status_code=400, detail=f"Invalid module codes: {invalid_granted | invalid_denied}")
    
    await db.user_module_access.update_one(
        {"user_id": user_id},
        {"$set": {
            "user_id": user_id,
            "granted_modules": granted_modules,
            "denied_modules": denied_modules,
            "updated_at": datetime.now(timezone.utc).isoformat(),
            "updated_by": user.get("id")
        }},
        upsert=True
    )
    
    return {"success": True, "message": "User module access updated"}


# ============== DEPARTMENTS & TEAMS ==============

@router.get("/config/departments")
async def get_departments_for_modules(user: dict = Depends(get_current_user_dep())):
    """Get all departments that can be assigned to modules"""
    departments = await db.departments.find({}, {"_id": 0, "id": 1, "name": 1, "code": 1}).to_list(100)
    return departments


@router.get("/config/teams")
async def get_teams_for_modules(user: dict = Depends(get_current_user_dep())):
    """Get all teams that can be assigned to modules"""
    teams = await db.teams.find({}, {"_id": 0, "id": 1, "name": 1}).to_list(100)
    return teams


@router.get("/config/tags")
async def get_all_module_tags(user: dict = Depends(get_current_user_dep())):
    """Get all unique tags used across modules"""
    pipeline = [
        {"$unwind": "$tags"},
        {"$group": {"_id": "$tags"}},
        {"$sort": {"_id": 1}}
    ]
    tags = await db.system_module_config.aggregate(pipeline).to_list(100)
    return [t["_id"] for t in tags]
