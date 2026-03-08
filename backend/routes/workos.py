"""
WorkOS Routes - Organization, Departments, Roles, Permissions, User Management
"""

from fastapi import APIRouter, Depends, HTTPException, Query
from typing import List, Optional
import uuid
from datetime import datetime, timezone

from models.workos import (
    DepartmentCreate, DepartmentUpdate, DepartmentResponse,
    RoleCreate, RoleUpdate, RoleResponse,
    UserEnhancedCreate, UserEnhancedUpdate, UserEnhancedResponse,
    OrganizationSettings,
    MODULE_DEFINITIONS, DEFAULT_ROLE_TEMPLATES
)

workos_router = APIRouter(prefix="/workos", tags=["WorkOS - Organization Management"])

# Import db and auth from main server
def get_db():
    from server import db
    return db

def require_admin():
    from server import require_department
    return require_department(["admin"])

def get_current_user_dep():
    from server import get_current_user
    return get_current_user


# ============== DEPARTMENTS ==============

@workos_router.get("/departments", response_model=List[DepartmentResponse])
async def get_departments(
    include_inactive: bool = False,
    user: dict = Depends(get_current_user_dep())
):
    """Get all departments"""
    db = get_db()
    
    query = {}
    if not include_inactive:
        query["is_active"] = {"$ne": False}
    
    departments = await db.departments.find(query, {"_id": 0}).to_list(100)
    
    # Enrich with member counts and lead names
    for dept in departments:
        dept["member_count"] = await db.users.count_documents({"department_id": dept["id"]})
        if dept.get("lead_id"):
            lead = await db.users.find_one({"id": dept["lead_id"]}, {"name": 1})
            dept["lead_name"] = lead.get("name") if lead else None
    
    return departments


@workos_router.get("/departments/{department_id}", response_model=DepartmentResponse)
async def get_department(department_id: str, user: dict = Depends(get_current_user_dep())):
    """Get a single department"""
    db = get_db()
    
    dept = await db.departments.find_one({"id": department_id}, {"_id": 0})
    if not dept:
        raise HTTPException(status_code=404, detail="Department not found")
    
    dept["member_count"] = await db.users.count_documents({"department_id": department_id})
    if dept.get("lead_id"):
        lead = await db.users.find_one({"id": dept["lead_id"]}, {"name": 1})
        dept["lead_name"] = lead.get("name") if lead else None
    
    return dept


@workos_router.post("/departments", response_model=DepartmentResponse)
async def create_department(data: DepartmentCreate, user: dict = Depends(require_admin())):
    """Create a new department"""
    db = get_db()
    
    # Check for duplicate code
    existing = await db.departments.find_one({"code": data.code})
    if existing:
        raise HTTPException(status_code=400, detail="Department code already exists")
    
    dept_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc).isoformat()
    
    dept_doc = {
        "id": dept_id,
        **data.model_dump(),
        "is_active": True,
        "member_count": 0,
        "created_at": now,
        "updated_at": now
    }
    
    await db.departments.insert_one(dept_doc)
    del dept_doc["_id"]
    return dept_doc


@workos_router.put("/departments/{department_id}", response_model=DepartmentResponse)
async def update_department(
    department_id: str,
    data: DepartmentUpdate,
    user: dict = Depends(require_admin())
):
    """Update a department"""
    db = get_db()
    
    existing = await db.departments.find_one({"id": department_id})
    if not existing:
        raise HTTPException(status_code=404, detail="Department not found")
    
    update_data = {k: v for k, v in data.model_dump().items() if v is not None}
    update_data["updated_at"] = datetime.now(timezone.utc).isoformat()
    
    await db.departments.update_one({"id": department_id}, {"$set": update_data})
    
    updated = await db.departments.find_one({"id": department_id}, {"_id": 0})
    updated["member_count"] = await db.users.count_documents({"department_id": department_id})
    return updated


@workos_router.delete("/departments/{department_id}")
async def delete_department(department_id: str, user: dict = Depends(require_admin())):
    """Delete a department (soft delete)"""
    db = get_db()
    
    # Check if department has members
    member_count = await db.users.count_documents({"department_id": department_id})
    if member_count > 0:
        raise HTTPException(status_code=400, detail=f"Cannot delete department with {member_count} members. Reassign them first.")
    
    await db.departments.update_one(
        {"id": department_id},
        {"$set": {"is_active": False, "updated_at": datetime.now(timezone.utc).isoformat()}}
    )
    
    return {"success": True, "message": "Department deactivated"}


@workos_router.get("/departments/{department_id}/members", response_model=List[UserEnhancedResponse])
async def get_department_members(department_id: str, user: dict = Depends(get_current_user_dep())):
    """Get all members of a department"""
    db = get_db()
    
    members = await db.users.find({"department_id": department_id}, {"_id": 0, "password": 0}).to_list(200)
    
    # Enrich with role and manager names
    for member in members:
        if member.get("role_id"):
            role = await db.roles.find_one({"id": member["role_id"]}, {"name": 1})
            member["role_name"] = role.get("name") if role else None
        if member.get("reports_to"):
            manager = await db.users.find_one({"id": member["reports_to"]}, {"name": 1})
            member["manager_name"] = manager.get("name") if manager else None
        
        # Get direct reports
        direct_reports = await db.users.find({"reports_to": member["id"]}, {"id": 1}).to_list(100)
        member["direct_reports"] = [r["id"] for r in direct_reports]
    
    return members


# ============== ROLES ==============

@workos_router.get("/roles", response_model=List[RoleResponse])
async def get_roles(
    include_inactive: bool = False,
    user: dict = Depends(get_current_user_dep())
):
    """Get all roles"""
    db = get_db()
    
    query = {}
    if not include_inactive:
        query["is_active"] = {"$ne": False}
    
    roles = await db.roles.find(query, {"_id": 0}).to_list(100)
    
    # Enrich with user counts
    for role in roles:
        role["user_count"] = await db.users.count_documents({"role_id": role["id"]})
    
    return roles


@workos_router.get("/roles/{role_id}", response_model=RoleResponse)
async def get_role(role_id: str, user: dict = Depends(get_current_user_dep())):
    """Get a single role"""
    db = get_db()
    
    role = await db.roles.find_one({"id": role_id}, {"_id": 0})
    if not role:
        raise HTTPException(status_code=404, detail="Role not found")
    
    role["user_count"] = await db.users.count_documents({"role_id": role_id})
    return role


@workos_router.post("/roles", response_model=RoleResponse)
async def create_role(data: RoleCreate, user: dict = Depends(require_admin())):
    """Create a new role"""
    db = get_db()
    
    # Check for duplicate code
    existing = await db.roles.find_one({"code": data.code})
    if existing:
        raise HTTPException(status_code=400, detail="Role code already exists")
    
    role_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc).isoformat()
    
    role_doc = {
        "id": role_id,
        **data.model_dump(),
        "is_active": True,
        "user_count": 0,
        "created_at": now,
        "updated_at": now
    }
    
    await db.roles.insert_one(role_doc)
    del role_doc["_id"]
    return role_doc


@workos_router.put("/roles/{role_id}", response_model=RoleResponse)
async def update_role(
    role_id: str,
    data: RoleUpdate,
    user: dict = Depends(require_admin())
):
    """Update a role"""
    db = get_db()
    
    existing = await db.roles.find_one({"id": role_id})
    if not existing:
        raise HTTPException(status_code=404, detail="Role not found")
    
    if existing.get("is_system"):
        raise HTTPException(status_code=400, detail="Cannot modify system roles")
    
    update_data = {k: v for k, v in data.model_dump().items() if v is not None}
    update_data["updated_at"] = datetime.now(timezone.utc).isoformat()
    
    await db.roles.update_one({"id": role_id}, {"$set": update_data})
    
    updated = await db.roles.find_one({"id": role_id}, {"_id": 0})
    updated["user_count"] = await db.users.count_documents({"role_id": role_id})
    return updated


@workos_router.delete("/roles/{role_id}")
async def delete_role(role_id: str, user: dict = Depends(require_admin())):
    """Delete a role (soft delete)"""
    db = get_db()
    
    role = await db.roles.find_one({"id": role_id})
    if not role:
        raise HTTPException(status_code=404, detail="Role not found")
    
    if role.get("is_system"):
        raise HTTPException(status_code=400, detail="Cannot delete system roles")
    
    # Check if role has users
    user_count = await db.users.count_documents({"role_id": role_id})
    if user_count > 0:
        raise HTTPException(status_code=400, detail=f"Cannot delete role with {user_count} users. Reassign them first.")
    
    await db.roles.update_one(
        {"id": role_id},
        {"$set": {"is_active": False, "updated_at": datetime.now(timezone.utc).isoformat()}}
    )
    
    return {"success": True, "message": "Role deactivated"}


# ============== ENHANCED USER MANAGEMENT ==============

@workos_router.get("/users", response_model=List[UserEnhancedResponse])
async def get_users_enhanced(
    department_id: Optional[str] = None,
    role_id: Optional[str] = None,
    status: Optional[str] = None,
    search: Optional[str] = None,
    limit: int = Query(default=100, le=500),
    user: dict = Depends(get_current_user_dep())
):
    """Get all users with enhanced data"""
    db = get_db()
    
    query = {}
    if department_id:
        query["department_id"] = department_id
    if role_id:
        query["role_id"] = role_id
    if status:
        query["status"] = status
    if search:
        query["$or"] = [
            {"name": {"$regex": search, "$options": "i"}},
            {"email": {"$regex": search, "$options": "i"}}
        ]
    
    users = await db.users.find(query, {"_id": 0, "password": 0}).limit(limit).to_list(limit)
    
    # Enrich with department, role, and manager names
    for u in users:
        if u.get("department_id"):
            dept = await db.departments.find_one({"id": u["department_id"]}, {"name": 1})
            u["department_name"] = dept.get("name") if dept else None
        if u.get("role_id"):
            role = await db.roles.find_one({"id": u["role_id"]}, {"name": 1})
            u["role_name"] = role.get("name") if role else None
        if u.get("reports_to"):
            manager = await db.users.find_one({"id": u["reports_to"]}, {"name": 1})
            u["manager_name"] = manager.get("name") if manager else None
        
        # Get direct reports
        direct_reports = await db.users.find({"reports_to": u["id"]}, {"id": 1}).to_list(100)
        u["direct_reports"] = [r["id"] for r in direct_reports]
    
    return users


@workos_router.get("/users/{user_id}", response_model=UserEnhancedResponse)
async def get_user_enhanced(user_id: str, current_user: dict = Depends(get_current_user_dep())):
    """Get a single user with enhanced data"""
    db = get_db()
    
    user = await db.users.find_one({"id": user_id}, {"_id": 0, "password": 0})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Enrich
    if user.get("department_id"):
        dept = await db.departments.find_one({"id": user["department_id"]}, {"name": 1})
        user["department_name"] = dept.get("name") if dept else None
    if user.get("role_id"):
        role = await db.roles.find_one({"id": user["role_id"]}, {"name": 1})
        user["role_name"] = role.get("name") if role else None
    if user.get("reports_to"):
        manager = await db.users.find_one({"id": user["reports_to"]}, {"name": 1})
        user["manager_name"] = manager.get("name") if manager else None
    
    direct_reports = await db.users.find({"reports_to": user_id}, {"id": 1}).to_list(100)
    user["direct_reports"] = [r["id"] for r in direct_reports]
    
    return user


@workos_router.put("/users/{user_id}", response_model=UserEnhancedResponse)
async def update_user_enhanced(
    user_id: str,
    data: UserEnhancedUpdate,
    current_user: dict = Depends(require_admin())
):
    """Update a user (admin only)"""
    db = get_db()
    
    existing = await db.users.find_one({"id": user_id})
    if not existing:
        raise HTTPException(status_code=404, detail="User not found")
    
    update_data = {k: v for k, v in data.model_dump().items() if v is not None}
    update_data["updated_at"] = datetime.now(timezone.utc).isoformat()
    
    await db.users.update_one({"id": user_id}, {"$set": update_data})
    
    # Return enriched user
    updated = await db.users.find_one({"id": user_id}, {"_id": 0, "password": 0})
    if updated.get("department_id"):
        dept = await db.departments.find_one({"id": updated["department_id"]}, {"name": 1})
        updated["department_name"] = dept.get("name") if dept else None
    if updated.get("role_id"):
        role = await db.roles.find_one({"id": updated["role_id"]}, {"name": 1})
        updated["role_name"] = role.get("name") if role else None
    if updated.get("reports_to"):
        manager = await db.users.find_one({"id": updated["reports_to"]}, {"name": 1})
        updated["manager_name"] = manager.get("name") if manager else None
    
    return updated


@workos_router.get("/users/{user_id}/team")
async def get_user_team(user_id: str, current_user: dict = Depends(get_current_user_dep())):
    """Get a user's team (direct reports and their reports)"""
    db = get_db()
    
    async def get_reports(manager_id: str, depth: int = 0) -> List[dict]:
        if depth > 5:  # Prevent infinite recursion
            return []
        
        reports = await db.users.find(
            {"reports_to": manager_id},
            {"_id": 0, "password": 0, "id": 1, "name": 1, "title": 1, "department_id": 1}
        ).to_list(100)
        
        result = []
        for r in reports:
            r["level"] = depth
            r["direct_reports"] = await get_reports(r["id"], depth + 1)
            result.append(r)
        
        return result
    
    user = await db.users.find_one({"id": user_id}, {"_id": 0, "password": 0, "id": 1, "name": 1, "title": 1})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    user["direct_reports"] = await get_reports(user_id)
    
    return user


# ============== ORGANIZATION SETTINGS ==============

@workos_router.get("/organization/settings")
async def get_organization_settings(user: dict = Depends(get_current_user_dep())):
    """Get organization settings"""
    db = get_db()
    
    settings = await db.organization_settings.find_one({"type": "global"}, {"_id": 0})
    if not settings:
        return OrganizationSettings().model_dump()
    
    return settings.get("settings", OrganizationSettings().model_dump())


@workos_router.put("/organization/settings")
async def update_organization_settings(
    data: OrganizationSettings,
    user: dict = Depends(require_admin())
):
    """Update organization settings"""
    db = get_db()
    
    await db.organization_settings.update_one(
        {"type": "global"},
        {"$set": {"settings": data.model_dump(), "updated_at": datetime.now(timezone.utc).isoformat()}},
        upsert=True
    )
    
    return {"success": True, "settings": data.model_dump()}


# ============== PERMISSION MATRIX ==============

@workos_router.get("/permissions/modules")
async def get_permission_modules(user: dict = Depends(get_current_user_dep())):
    """Get all modules and their available actions"""
    return MODULE_DEFINITIONS


@workos_router.get("/permissions/templates")
async def get_role_templates(user: dict = Depends(require_admin())):
    """Get default role permission templates"""
    return DEFAULT_ROLE_TEMPLATES


# ============== SEED DATA ==============

@workos_router.post("/seed")
async def seed_workos_data(user: dict = Depends(require_admin())):
    """Seed initial departments and roles"""
    db = get_db()
    now = datetime.now(timezone.utc).isoformat()
    
    # Check if already seeded
    dept_count = await db.departments.count_documents({})
    role_count = await db.roles.count_documents({})
    
    if dept_count > 0 or role_count > 0:
        return {"message": "Data already exists", "departments": dept_count, "roles": role_count}
    
    # Seed departments
    default_departments = [
        {"name": "Marketing", "code": "marketing", "description": "Marketing operations and campaigns", "color": "#8B7355", "icon": "Target"},
        {"name": "Sales", "code": "sales", "description": "Sales and business development", "color": "#4A90D9", "icon": "TrendingUp"},
        {"name": "Social Media", "code": "social", "description": "Social media management", "color": "#E91E63", "icon": "Share2"},
        {"name": "Public Relations", "code": "pr", "description": "PR and communications", "color": "#9C27B0", "icon": "Megaphone"},
        {"name": "Administration", "code": "admin", "description": "System administration", "color": "#607D8B", "icon": "Settings"},
    ]
    
    dept_ids = {}
    for dept in default_departments:
        dept_id = str(uuid.uuid4())
        dept_ids[dept["code"]] = dept_id
        await db.departments.insert_one({
            "id": dept_id,
            **dept,
            "is_active": True,
            "member_count": 0,
            "created_at": now,
            "updated_at": now
        })
    
    # Seed roles from templates
    for code, template in DEFAULT_ROLE_TEMPLATES.items():
        role_id = str(uuid.uuid4())
        await db.roles.insert_one({
            "id": role_id,
            "code": code,
            "name": template["name"],
            "description": template["description"],
            "level": template["level"],
            "permissions": template["permissions"],
            "department_ids": [],
            "is_system": code in ["super_admin", "admin", "viewer"],
            "is_active": True,
            "user_count": 0,
            "created_at": now,
            "updated_at": now
        })
    
    return {
        "success": True,
        "message": "WorkOS data seeded successfully",
        "departments": len(default_departments),
        "roles": len(DEFAULT_ROLE_TEMPLATES)
    }
