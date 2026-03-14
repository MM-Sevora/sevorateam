"""
WorkOS Routes - Organization, Departments, Roles, Permissions, User Management
"""

from fastapi import APIRouter, Depends, HTTPException, Query
from typing import List, Optional
import uuid
from datetime import datetime, timezone
import httpx
import os

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


# ============== AZURE AD LICENSE MANAGEMENT ==============

async def get_azure_ad_access_token():
    """Get access token for Microsoft Graph API using client credentials"""
    tenant_id = os.environ.get("AZURE_AD_TENANT_ID")
    client_id = os.environ.get("AZURE_AD_CLIENT_ID")
    client_secret = os.environ.get("AZURE_AD_CLIENT_SECRET")
    
    if not all([tenant_id, client_id, client_secret]):
        return None
    
    token_url = f"https://login.microsoftonline.com/{tenant_id}/oauth2/v2.0/token"
    
    async with httpx.AsyncClient() as client:
        response = await client.post(
            token_url,
            data={
                "grant_type": "client_credentials",
                "client_id": client_id,
                "client_secret": client_secret,
                "scope": "https://graph.microsoft.com/.default"
            }
        )
        
        if response.status_code == 200:
            return response.json().get("access_token")
        return None


async def fetch_azure_ad_users_with_licenses():
    """Fetch users and their licenses from Azure AD"""
    token = await get_azure_ad_access_token()
    if not token:
        return None, "Azure AD credentials not configured"
    
    headers = {"Authorization": f"Bearer {token}"}
    
    async with httpx.AsyncClient() as client:
        # Fetch all users with their assigned licenses
        users_response = await client.get(
            "https://graph.microsoft.com/v1.0/users?$select=id,displayName,mail,userPrincipalName,assignedLicenses,accountEnabled",
            headers=headers
        )
        
        if users_response.status_code != 200:
            return None, f"Failed to fetch users: {users_response.text}"
        
        users_data = users_response.json().get("value", [])
        
        # Fetch SKU details for license names
        skus_response = await client.get(
            "https://graph.microsoft.com/v1.0/subscribedSkus",
            headers=headers
        )
        
        sku_map = {}
        if skus_response.status_code == 200:
            for sku in skus_response.json().get("value", []):
                sku_map[sku.get("skuId")] = {
                    "name": sku.get("skuPartNumber"),
                    "display_name": sku.get("skuPartNumber", "").replace("_", " ").title()
                }
        
        # Process users with license info
        licensed_users = []
        for user in users_data:
            assigned_licenses = user.get("assignedLicenses", [])
            if assigned_licenses:  # Only include users with licenses
                license_names = []
                for lic in assigned_licenses:
                    sku_info = sku_map.get(lic.get("skuId"), {})
                    license_names.append(sku_info.get("display_name", lic.get("skuId")))
                
                licensed_users.append({
                    "azure_id": user.get("id"),
                    "name": user.get("displayName"),
                    "email": user.get("mail") or user.get("userPrincipalName"),
                    "account_enabled": user.get("accountEnabled", False),
                    "licenses": license_names,
                    "license_count": len(assigned_licenses)
                })
        
        return licensed_users, None


@workos_router.get("/azure-ad/licensed-users")
async def get_azure_ad_licensed_users(
    user: dict = Depends(get_current_user_dep())
):
    """Get all users with licenses from Azure AD"""
    licensed_users, error = await fetch_azure_ad_users_with_licenses()
    
    if error:
        raise HTTPException(status_code=400, detail=error)
    
    return {
        "total_licensed": len(licensed_users),
        "users": licensed_users
    }


@workos_router.post("/azure-ad/sync-licenses")
async def sync_azure_ad_licenses(
    user: dict = Depends(get_current_user_dep())
):
    """Sync license information from Azure AD to local users"""
    db = get_db()
    
    licensed_users, error = await fetch_azure_ad_users_with_licenses()
    
    if error:
        raise HTTPException(status_code=400, detail=error)
    
    synced_count = 0
    new_users = []
    updated_users = []
    
    for azure_user in licensed_users:
        email = azure_user.get("email")
        azure_id = azure_user.get("azure_id")
        
        if not email:
            continue
        
        # Find existing user by azure_id or email
        existing_user = await db.users.find_one({
            "$or": [{"azure_id": azure_id}, {"email": email.lower()}]
        })
        
        license_data = {
            "azure_licenses": azure_user.get("licenses", []),
            "azure_license_count": azure_user.get("license_count", 0),
            "azure_account_enabled": azure_user.get("account_enabled", False),
            "azure_synced_at": datetime.now(timezone.utc).isoformat(),
            "has_azure_license": True
        }
        
        if existing_user:
            # Update existing user with license info
            await db.users.update_one(
                {"id": existing_user.get("id")},
                {"$set": license_data}
            )
            updated_users.append(email)
        else:
            # Optionally create new user (or just track for reporting)
            new_users.append({
                "name": azure_user.get("name"),
                "email": email,
                "licenses": azure_user.get("licenses")
            })
        
        synced_count += 1
    
    # Also mark users without Azure licenses
    await db.users.update_many(
        {"has_azure_license": {"$ne": True}},
        {"$set": {"has_azure_license": False}}
    )
    
    return {
        "success": True,
        "total_azure_licensed": len(licensed_users),
        "synced_count": synced_count,
        "updated_users": len(updated_users),
        "new_azure_users_not_in_system": new_users
    }


@workos_router.get("/license-stats")
async def get_license_stats(
    user: dict = Depends(get_current_user_dep())
):
    """Get license statistics for the organization"""
    db = get_db()
    
    # Count users by license status
    total_users = await db.users.count_documents({"status": {"$ne": "deleted"}})
    licensed_users = await db.users.count_documents({
        "status": {"$ne": "deleted"},
        "has_azure_license": True
    })
    unlicensed_users = await db.users.count_documents({
        "status": {"$ne": "deleted"},
        "has_azure_license": {"$ne": True}
    })
    
    # Get last sync time
    last_synced_user = await db.users.find_one(
        {"azure_synced_at": {"$exists": True}},
        {"azure_synced_at": 1, "_id": 0},
        sort=[("azure_synced_at", -1)]
    )
    
    # Get license distribution
    pipeline = [
        {"$match": {"status": {"$ne": "deleted"}, "azure_licenses": {"$exists": True, "$ne": []}}},
        {"$unwind": "$azure_licenses"},
        {"$group": {"_id": "$azure_licenses", "count": {"$sum": 1}}},
        {"$sort": {"count": -1}}
    ]
    license_distribution = await db.users.aggregate(pipeline).to_list(20)
    
    return {
        "total_users": total_users,
        "licensed_users": licensed_users,
        "unlicensed_users": unlicensed_users,
        "license_percentage": round((licensed_users / total_users * 100) if total_users > 0 else 0, 1),
        "last_synced_at": last_synced_user.get("azure_synced_at") if last_synced_user else None,
        "license_distribution": [{"license": d["_id"], "count": d["count"]} for d in license_distribution]
    }


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
    include_deleted: bool = False,
    licensed_only: bool = False,
    limit: int = Query(default=100, le=500),
    user: dict = Depends(get_current_user_dep())
):
    """Get all users with enhanced data"""
    db = get_db()
    
    query = {}
    
    # By default, exclude deleted users unless explicitly requested
    if not include_deleted:
        query["status"] = {"$ne": "deleted"}
    
    # Filter by Azure AD license
    if licensed_only:
        query["has_azure_license"] = True
    
    if department_id:
        query["department_id"] = department_id
    if role_id:
        query["role_id"] = role_id
    if status:
        query["status"] = status  # Override the default filter if specific status requested
    if search:
        query["$or"] = [
            {"name": {"$regex": search, "$options": "i"}},
            {"email": {"$regex": search, "$options": "i"}}
        ]
    
    users = await db.users.find(query, {"_id": 0, "password": 0}).limit(limit).to_list(limit)
    
    # Enrich with department, role, grade, and manager names
    for u in users:
        if u.get("department_id"):
            dept = await db.departments.find_one({"id": u["department_id"]}, {"name": 1})
            u["department_name"] = dept.get("name") if dept else None
        if u.get("role_id"):
            role = await db.roles.find_one({"id": u["role_id"]}, {"name": 1})
            u["role_name"] = role.get("name") if role else None
        if u.get("grade_id"):
            grade = await db.grade_types.find_one({"id": u["grade_id"]}, {"name": 1})
            u["grade_name"] = grade.get("name") if grade else None
        if u.get("reports_to"):
            manager = await db.users.find_one({"id": u["reports_to"]}, {"name": 1})
            u["manager_name"] = manager.get("name") if manager else None
        
        # Clean Architecture: Add is_onboarded flag
        u["is_onboarded"] = bool(u.get("custom_role_ids") and u.get("department_id"))
        
        # Get custom role names
        custom_role_ids = u.get("custom_role_ids", [])
        if not custom_role_ids and u.get("custom_role_id"):
            custom_role_ids = [u.get("custom_role_id")]
        
        if custom_role_ids:
            custom_roles = await db.custom_roles.find(
                {"id": {"$in": custom_role_ids}}, 
                {"name": 1}
            ).to_list(10)
            u["custom_role_names"] = [r.get("name") for r in custom_roles if r.get("name")]
        else:
            u["custom_role_names"] = []
        
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
    if user.get("grade_id"):
        grade = await db.grade_types.find_one({"id": user["grade_id"]}, {"name": 1})
        user["grade_name"] = grade.get("name") if grade else None
    if user.get("reports_to"):
        manager = await db.users.find_one({"id": user["reports_to"]}, {"name": 1})
        user["manager_name"] = manager.get("name") if manager else None
    
    # Clean Architecture: Add is_onboarded flag
    user["is_onboarded"] = bool(user.get("employee_id"))
    
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
    if updated.get("grade_id"):
        grade = await db.grade_types.find_one({"id": updated["grade_id"]}, {"name": 1})
        updated["grade_name"] = grade.get("name") if grade else None
    if updated.get("reports_to"):
        manager = await db.users.find_one({"id": updated["reports_to"]}, {"name": 1})
        updated["manager_name"] = manager.get("name") if manager else None
    
    return updated


@workos_router.delete("/users/{user_id}")
async def delete_user(user_id: str, current_user: dict = Depends(require_admin())):
    """Delete a user (soft delete - sets status to deleted)"""
    db = get_db()
    
    existing = await db.users.find_one({"id": user_id})
    if not existing:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Cannot delete yourself
    if user_id == current_user.get("id"):
        raise HTTPException(status_code=400, detail="Cannot delete your own account")
    
    # Check if user has direct reports
    reports_count = await db.users.count_documents({"reports_to": user_id})
    if reports_count > 0:
        raise HTTPException(
            status_code=400, 
            detail=f"Cannot delete user with {reports_count} direct reports. Reassign them first."
        )
    
    # Soft delete - mark as deleted
    await db.users.update_one(
        {"id": user_id},
        {"$set": {
            "status": "deleted",
            "is_active": False,
            "deleted_at": datetime.now(timezone.utc).isoformat(),
            "deleted_by": current_user.get("id"),
            "updated_at": datetime.now(timezone.utc).isoformat()
        }}
    )
    
    # Also deactivate related employee record if exists
    await db.employees.update_one(
        {"user_id": user_id},
        {"$set": {
            "status": "terminated",
            "is_active": False,
            "exit_reason": "User account deleted",
            "updated_at": datetime.now(timezone.utc).isoformat()
        }}
    )
    
    return {"success": True, "message": "User deleted successfully"}


@workos_router.post("/users/bulk/delete")
async def bulk_delete_users(data: dict, current_user: dict = Depends(require_admin())):
    """Bulk delete users (soft delete)"""
    db = get_db()
    
    user_ids = data.get("user_ids", [])
    if not user_ids:
        raise HTTPException(status_code=400, detail="No user IDs provided")
    
    # Cannot delete yourself
    if current_user.get("id") in user_ids:
        raise HTTPException(status_code=400, detail="Cannot delete your own account")
    
    # Check for direct reports
    for uid in user_ids:
        reports_count = await db.users.count_documents({"reports_to": uid})
        if reports_count > 0:
            user = await db.users.find_one({"id": uid}, {"name": 1})
            raise HTTPException(
                status_code=400, 
                detail=f"Cannot delete {user.get('name', 'user')} - has {reports_count} direct reports"
            )
    
    now = datetime.now(timezone.utc).isoformat()
    
    # Soft delete all
    result = await db.users.update_many(
        {"id": {"$in": user_ids}},
        {"$set": {
            "status": "deleted",
            "is_active": False,
            "deleted_at": now,
            "deleted_by": current_user.get("id"),
            "updated_at": now
        }}
    )
    
    # Also deactivate related employee records
    await db.employees.update_many(
        {"user_id": {"$in": user_ids}},
        {"$set": {
            "status": "terminated",
            "is_active": False,
            "exit_reason": "User account deleted",
            "updated_at": now
        }}
    )
    
    return {"success": True, "message": f"{result.modified_count} users deleted"}


@workos_router.post("/users/bulk/status")
async def bulk_update_user_status(data: dict, current_user: dict = Depends(require_admin())):
    """Bulk update user status"""
    db = get_db()
    
    user_ids = data.get("user_ids", [])
    new_status = data.get("status")
    
    if not user_ids:
        raise HTTPException(status_code=400, detail="No user IDs provided")
    if not new_status:
        raise HTTPException(status_code=400, detail="Status is required")
    if new_status not in ["active", "inactive"]:
        raise HTTPException(status_code=400, detail="Invalid status. Must be 'active' or 'inactive'")
    
    now = datetime.now(timezone.utc).isoformat()
    
    result = await db.users.update_many(
        {"id": {"$in": user_ids}},
        {"$set": {"status": new_status, "updated_at": now}}
    )
    
    # Also update employee records
    emp_status = "active" if new_status == "active" else "inactive"
    await db.employees.update_many(
        {"user_id": {"$in": user_ids}},
        {"$set": {"status": emp_status, "is_active": new_status == "active", "updated_at": now}}
    )
    
    return {"success": True, "message": f"{result.modified_count} users updated to {new_status}"}


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


# ============== PASSWORD MANAGEMENT ==============

import secrets
import string
import bcrypt

def generate_secure_password(length: int = 12) -> str:
    """Generate a secure random password"""
    alphabet = string.ascii_letters + string.digits + "!@#$%^&*"
    password = ''.join(secrets.choice(alphabet) for _ in range(length))
    # Ensure at least one of each type
    password = (
        secrets.choice(string.ascii_uppercase) +
        secrets.choice(string.ascii_lowercase) +
        secrets.choice(string.digits) +
        secrets.choice("!@#$%^&*") +
        password[4:]
    )
    return password


@workos_router.post("/users/{user_id}/generate-password")
async def generate_user_password(user_id: str, current_user: dict = Depends(require_admin())):
    """Generate a new password for a user (admin only)"""
    db = get_db()
    
    user = await db.users.find_one({"id": user_id})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Generate new password
    new_password = generate_secure_password()
    hashed_password = bcrypt.hashpw(new_password.encode(), bcrypt.gensalt()).decode()
    
    # Update user with new password and mark as temporary
    await db.users.update_one(
        {"id": user_id},
        {"$set": {
            "password": hashed_password,
            "hashed_password": hashed_password,  # Support both field names
            "temp_password": new_password,  # Store temporarily for admin viewing
            "password_must_change": True,
            "password_generated_at": datetime.now(timezone.utc).isoformat(),
            "password_generated_by": current_user.get("id"),
            "updated_at": datetime.now(timezone.utc).isoformat()
        }}
    )
    
    return {
        "success": True,
        "password": new_password,
        "message": "Password generated successfully. User will be prompted to change it on first login."
    }


@workos_router.get("/users/{user_id}/temp-password")
async def get_temp_password(user_id: str, current_user: dict = Depends(require_admin())):
    """Get the temporary password for a user (admin only) - only available until user logs in"""
    db = get_db()
    
    user = await db.users.find_one({"id": user_id}, {"_id": 0, "temp_password": 1, "password_generated_at": 1, "name": 1, "email": 1})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    temp_password = user.get("temp_password")
    if not temp_password:
        return {
            "has_temp_password": False,
            "message": "No temporary password available. Generate a new one if needed."
        }
    
    return {
        "has_temp_password": True,
        "password": temp_password,
        "generated_at": user.get("password_generated_at"),
        "user_name": user.get("name"),
        "user_email": user.get("email")
    }


@workos_router.post("/users/{user_id}/set-password")
async def set_user_password(user_id: str, data: dict, current_user: dict = Depends(require_admin())):
    """Set a specific password for a user (admin only)"""
    db = get_db()
    
    password = data.get("password")
    if not password or len(password) < 8:
        raise HTTPException(status_code=400, detail="Password must be at least 8 characters")
    
    user = await db.users.find_one({"id": user_id})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    hashed_password = bcrypt.hashpw(password.encode(), bcrypt.gensalt()).decode()
    
    await db.users.update_one(
        {"id": user_id},
        {"$set": {
            "password": hashed_password,
            "hashed_password": hashed_password,
            "temp_password": password,  # Store for admin viewing
            "password_must_change": data.get("must_change", False),
            "password_generated_at": datetime.now(timezone.utc).isoformat(),
            "password_generated_by": current_user.get("id"),
            "updated_at": datetime.now(timezone.utc).isoformat()
        }}
    )
    
    return {
        "success": True,
        "message": "Password set successfully"
    }


@workos_router.delete("/users/{user_id}/temp-password")
async def clear_temp_password(user_id: str, current_user: dict = Depends(require_admin())):
    """Clear the temporary password (called after user successfully logs in)"""
    db = get_db()
    
    await db.users.update_one(
        {"id": user_id},
        {"$unset": {"temp_password": ""}, "$set": {"updated_at": datetime.now(timezone.utc).isoformat()}}
    )
    
    return {"success": True, "message": "Temporary password cleared"}


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


@workos_router.post("/migrate-users")
async def migrate_users_to_workos(user: dict = Depends(require_admin())):
    """Migrate existing users to WorkOS roles by matching their legacy role codes"""
    db = get_db()
    now = datetime.now(timezone.utc).isoformat()
    
    # Get all roles
    roles = await db.roles.find({}, {"_id": 0}).to_list(100)
    role_map = {r["code"]: r["id"] for r in roles}
    
    # Get all departments
    departments = await db.departments.find({}, {"_id": 0}).to_list(100)
    dept_map = {d["code"]: d["id"] for d in departments}
    
    # Role to department mapping for migration
    role_to_dept = {
        "super_admin": "admin",
        "admin": "admin",
        "marketing_manager": "marketing",
        "marketing_exec": "marketing",
        "sales_manager": "sales",
        "sales_exec": "sales",
        "social_manager": "social",
        "viewer": "marketing"  # Default viewers to marketing
    }
    
    # Get users without role_id
    users_to_migrate = await db.users.find(
        {"$or": [{"role_id": None}, {"role_id": {"$exists": False}}]},
        {"_id": 0, "id": 1, "name": 1, "email": 1, "role": 1}
    ).to_list(1000)
    
    migrated = 0
    for u in users_to_migrate:
        legacy_role = u.get("role", "viewer")
        
        # Find matching WorkOS role
        role_id = role_map.get(legacy_role)
        if not role_id and legacy_role == "marketing":
            role_id = role_map.get("marketing_exec")  # Map "marketing" to "marketing_exec"
        if not role_id:
            role_id = role_map.get("viewer")  # Default to viewer
        
        # Find matching department
        dept_code = role_to_dept.get(legacy_role, "marketing")
        dept_id = dept_map.get(dept_code)
        
        # Update user
        update_data = {
            "role_id": role_id,
            "updated_at": now
        }
        if dept_id:
            update_data["department_id"] = dept_id
        if not u.get("status"):
            update_data["status"] = "active"
        
        await db.users.update_one({"id": u["id"]}, {"$set": update_data})
        migrated += 1
    
    return {
        "success": True,
        "message": f"Migrated {migrated} users to WorkOS roles",
        "migrated": migrated,
        "total_users": len(users_to_migrate)
    }


@workos_router.get("/my-permissions")
async def get_my_permissions(user: dict = Depends(get_current_user_dep())):
    """Get current user's full permissions from WorkOS"""
    return {
        "user_id": user.get("id"),
        "role": user.get("role"),
        "role_id": user.get("role_id"),
        "workos_role": user.get("workos_role"),
        "departments": user.get("departments", []),
        "permissions": user.get("permissions", {}),
        "role_level": user.get("role_level", 10)
    }


# ============== TEAM DASHBOARD ==============

@workos_router.get("/team/dashboard")
async def get_team_dashboard(user: dict = Depends(get_current_user_dep())):
    """Get team dashboard data for managers - shows direct reports and their pipeline stats"""
    db = get_db()
    
    user_id = user.get("id")
    role_level = user.get("role_level", 0)
    
    # Check if user is a manager (level 50+)
    if role_level < 50:
        return {
            "is_manager": False,
            "message": "Team dashboard is only available for managers",
            "team_members": [],
            "team_stats": {}
        }
    
    # Get direct reports
    direct_reports = await db.users.find(
        {"reports_to": user_id},
        {"_id": 0, "password": 0}
    ).to_list(100)
    
    # For super admins (level 80+), show all users in their department
    if role_level >= 80:
        dept_id = user.get("department_id")
        if dept_id:
            dept_users = await db.users.find(
                {"department_id": dept_id, "id": {"$ne": user_id}},
                {"_id": 0, "password": 0}
            ).to_list(200)
            # Merge with direct reports (unique)
            existing_ids = {r["id"] for r in direct_reports}
            for u in dept_users:
                if u["id"] not in existing_ids:
                    direct_reports.append(u)
    
    # Enrich each team member with their pipeline stats
    team_data = []
    total_contacts = 0
    total_deals_value = 0
    stage_breakdown = {
        "identified": 0,
        "contacted": 0,
        "replied": 0,
        "negotiating": 0,
        "agreed": 0,
        "delivered": 0,
        "lost": 0
    }
    
    for member in direct_reports:
        member_id = member["id"]
        
        # Get contacts assigned to or created by this user
        member_contacts = await db.contacts.find(
            {"$or": [
                {"assigned_to": member_id},
                {"created_by": member_id}
            ]},
            {"_id": 0, "id": 1, "status": 1, "pipeline_stage": 1, "stage": 1}
        ).to_list(500)
        
        # Calculate stats
        contact_count = len(member_contacts)
        member_stages = {}
        for c in member_contacts:
            stage = c.get("pipeline_stage") or c.get("status") or c.get("stage") or "identified"
            member_stages[stage] = member_stages.get(stage, 0) + 1
            if stage in stage_breakdown:
                stage_breakdown[stage] += 1
        
        # Get deals for this user
        member_deals = await db.deals.find(
            {"created_by": member_id},
            {"_id": 0, "value": 1, "status": 1}
        ).to_list(100)
        
        deals_value = sum(d.get("value", 0) for d in member_deals if d.get("status") not in ["cancelled", "lost"])
        
        # Get role and department names
        role_name = None
        if member.get("role_id"):
            role = await db.roles.find_one({"id": member["role_id"]}, {"name": 1})
            role_name = role.get("name") if role else None
        
        dept_name = None
        if member.get("department_id"):
            dept = await db.departments.find_one({"id": member["department_id"]}, {"name": 1})
            dept_name = dept.get("name") if dept else None
        
        team_data.append({
            "id": member_id,
            "name": member.get("name"),
            "email": member.get("email"),
            "title": member.get("title"),
            "role_name": role_name,
            "department_name": dept_name,
            "avatar_url": member.get("avatar_url"),
            "contact_count": contact_count,
            "stage_breakdown": member_stages,
            "deals_value": deals_value,
            "deals_count": len(member_deals),
            "last_login": member.get("last_login")
        })
        
        total_contacts += contact_count
        total_deals_value += deals_value
    
    # Sort by contact count (most active first)
    team_data.sort(key=lambda x: x["contact_count"], reverse=True)
    
    return {
        "is_manager": True,
        "team_members": team_data,
        "team_size": len(team_data),
        "team_stats": {
            "total_contacts": total_contacts,
            "total_deals_value": total_deals_value,
            "stage_breakdown": stage_breakdown,
            "avg_contacts_per_member": round(total_contacts / len(team_data), 1) if team_data else 0
        }
    }


@workos_router.get("/team/member/{member_id}/pipeline")
async def get_team_member_pipeline(member_id: str, user: dict = Depends(get_current_user_dep())):
    """Get detailed pipeline data for a specific team member"""
    db = get_db()
    
    # Verify this user is the member's manager or is admin
    role_level = user.get("role_level", 0)
    member = await db.users.find_one({"id": member_id}, {"_id": 0, "reports_to": 1, "name": 1})
    
    if not member:
        raise HTTPException(status_code=404, detail="Team member not found")
    
    if role_level < 80 and member.get("reports_to") != user.get("id"):
        raise HTTPException(status_code=403, detail="You can only view your direct reports' data")
    
    # Get contacts
    contacts = await db.contacts.find(
        {"$or": [
            {"assigned_to": member_id},
            {"created_by": member_id}
        ]},
        {"_id": 0}
    ).sort("updated_at", -1).to_list(200)
    
    # Get deals
    deals = await db.deals.find(
        {"created_by": member_id},
        {"_id": 0}
    ).sort("created_at", -1).to_list(100)
    
    # Get communications
    comms = await db.communications.find(
        {"sent_by": member_id},
        {"_id": 0}
    ).sort("sent_at", -1).limit(50).to_list(50)
    
    return {
        "member_id": member_id,
        "member_name": member.get("name"),
        "contacts": contacts,
        "deals": deals,
        "recent_communications": comms
    }


