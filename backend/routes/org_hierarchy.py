"""
Organization Hierarchy Routes
- Reporting structure management
- Organizational context
- Manager-reportee relationships
"""

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from typing import List, Optional, Dict, Any
from datetime import datetime, timezone

org_router = APIRouter(prefix="/org", tags=["Organization Hierarchy"])


# ============== DEPENDENCIES ==============

def get_db():
    from server import db
    return db


def get_current_user_dep():
    from server import get_current_user
    return get_current_user


# ============== MODELS ==============

class ReportingUpdate(BaseModel):
    """Update reporting structure for a user"""
    reports_to: Optional[str] = None  # New manager ID (null to remove)
    secondary_manager_id: Optional[str] = None


class DepartmentHeadUpdate(BaseModel):
    """Update department head"""
    department_head_id: str


class OrgContextResponse(BaseModel):
    """User's organizational context"""
    user_id: str
    direct_reportees: List[str]
    direct_reportees_count: int
    all_reportees: List[str]
    all_reportees_count: int
    reports_to: Optional[Dict[str, Any]]
    reporting_chain: List[Dict[str, Any]]
    department: Optional[Dict[str, Any]]
    is_department_head: bool
    is_manager: bool


# ============== ENDPOINTS ==============

@org_router.get("/my-context")
async def get_my_org_context(
    user: dict = Depends(get_current_user_dep())
):
    """Get current user's organizational context"""
    from utils.org_hierarchy import get_user_org_context
    
    db = get_db()
    context = await get_user_org_context(db, user.get("id"))
    
    return context


@org_router.get("/context/{user_id}")
async def get_user_org_context_endpoint(
    user_id: str,
    user: dict = Depends(get_current_user_dep())
):
    """Get organizational context for a specific user (admin or manager of user)"""
    from utils.org_hierarchy import get_user_org_context, is_user_reportee_of
    
    db = get_db()
    current_user_id = user.get("id")
    user_role = user.get("role", "")
    
    # Check permission: admin, or manager of the user
    can_view = (
        user_role in ["super_admin", "admin"] or
        user.get("can_manage_users") or
        current_user_id == user_id or
        await is_user_reportee_of(db, user_id, current_user_id)
    )
    
    if not can_view:
        raise HTTPException(status_code=403, detail="Not authorized to view this user's org context")
    
    context = await get_user_org_context(db, user_id)
    
    if "error" in context:
        raise HTTPException(status_code=404, detail=context["error"])
    
    return context


@org_router.get("/my-reportees")
async def get_my_reportees(
    include_indirect: bool = Query(default=False, description="Include indirect reportees"),
    user: dict = Depends(get_current_user_dep())
):
    """Get list of reportees for current user"""
    from utils.org_hierarchy import get_direct_reportees, get_all_reportees
    
    db = get_db()
    user_id = user.get("id")
    
    if include_indirect:
        reportee_ids = await get_all_reportees(db, user_id)
    else:
        reportee_ids = await get_direct_reportees(db, user_id)
    
    # Fetch reportee details
    reportees = []
    for rid in reportee_ids:
        reportee = await db.users.find_one(
            {"id": rid},
            {"_id": 0, "id": 1, "name": 1, "email": 1, "designation": 1, "department_id": 1, "avatar_url": 1}
        )
        if reportee:
            # Enrich with department name
            if reportee.get("department_id"):
                dept = await db.departments.find_one({"id": reportee["department_id"]}, {"name": 1})
                reportee["department_name"] = dept.get("name") if dept else None
            reportees.append(reportee)
    
    return {
        "reportees": reportees,
        "total": len(reportees),
        "include_indirect": include_indirect
    }


@org_router.get("/reporting-chain/{user_id}")
async def get_reporting_chain(
    user_id: str,
    user: dict = Depends(get_current_user_dep())
):
    """Get upward reporting chain for a user"""
    from utils.org_hierarchy import get_reporting_chain_up
    
    db = get_db()
    chain = await get_reporting_chain_up(db, user_id)
    
    return {
        "user_id": user_id,
        "reporting_chain": chain,
        "levels": len(chain)
    }


@org_router.get("/approval-chain/{user_id}")
async def get_approval_chain_endpoint(
    user_id: str,
    approval_type: str = Query(default="standard", description="Type: standard, skip_level, direct_only"),
    user: dict = Depends(get_current_user_dep())
):
    """Get approval chain for a user based on their reporting structure"""
    from utils.org_hierarchy import get_approval_chain
    
    db = get_db()
    chain = await get_approval_chain(db, user_id, approval_type)
    
    return {
        "user_id": user_id,
        "approval_type": approval_type,
        "approval_chain": chain,
        "total_levels": len(chain)
    }


@org_router.put("/reporting/{user_id}")
async def update_user_reporting(
    user_id: str,
    data: ReportingUpdate,
    user: dict = Depends(get_current_user_dep())
):
    """Update user's reporting structure (admin only)"""
    user_role = user.get("role", "")
    
    if user_role not in ["super_admin", "admin"] and not user.get("can_manage_users"):
        raise HTTPException(status_code=403, detail="Admin access required")
    
    db = get_db()
    now = datetime.now(timezone.utc).isoformat()
    
    # Validate target user exists
    target_user = await db.users.find_one({"id": user_id})
    if not target_user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Validate new manager exists (if provided)
    if data.reports_to:
        manager = await db.users.find_one({"id": data.reports_to})
        if not manager:
            raise HTTPException(status_code=400, detail="Manager not found")
        
        # Prevent circular reporting
        from utils.org_hierarchy import is_user_reportee_of
        if await is_user_reportee_of(db, data.reports_to, user_id):
            raise HTTPException(status_code=400, detail="Cannot create circular reporting structure")
    
    # Build update
    update_data = {"updated_at": now}
    
    if data.reports_to is not None:
        update_data["reports_to"] = data.reports_to if data.reports_to else None
    
    if data.secondary_manager_id is not None:
        update_data["secondary_manager_id"] = data.secondary_manager_id if data.secondary_manager_id else None
    
    await db.users.update_one({"id": user_id}, {"$set": update_data})
    
    # Sync org flags for affected users
    from utils.org_hierarchy import sync_user_org_flags
    
    # Update old manager's flags (if had one)
    old_manager_id = target_user.get("reports_to")
    if old_manager_id:
        await sync_user_org_flags(db, old_manager_id)
    
    # Update new manager's flags (if set)
    if data.reports_to:
        await sync_user_org_flags(db, data.reports_to)
    
    return {
        "success": True,
        "user_id": user_id,
        "reports_to": data.reports_to,
        "secondary_manager_id": data.secondary_manager_id
    }


@org_router.put("/department/{department_id}/head")
async def update_department_head(
    department_id: str,
    data: DepartmentHeadUpdate,
    user: dict = Depends(get_current_user_dep())
):
    """Update department head (admin only)"""
    user_role = user.get("role", "")
    
    if user_role not in ["super_admin", "admin"] and not user.get("can_manage_users"):
        raise HTTPException(status_code=403, detail="Admin access required")
    
    db = get_db()
    now = datetime.now(timezone.utc).isoformat()
    
    # Validate department exists
    department = await db.departments.find_one({"id": department_id})
    if not department:
        raise HTTPException(status_code=404, detail="Department not found")
    
    # Validate new head exists
    new_head = await db.users.find_one({"id": data.department_head_id})
    if not new_head:
        raise HTTPException(status_code=400, detail="User not found")
    
    # Update department
    old_head_id = department.get("department_head_id")
    
    await db.departments.update_one(
        {"id": department_id},
        {"$set": {
            "department_head_id": data.department_head_id,
            "updated_at": now
        }}
    )
    
    # Sync org flags
    from utils.org_hierarchy import sync_user_org_flags
    
    if old_head_id:
        await sync_user_org_flags(db, old_head_id)
    await sync_user_org_flags(db, data.department_head_id)
    
    return {
        "success": True,
        "department_id": department_id,
        "department_head_id": data.department_head_id,
        "department_head_name": new_head.get("name")
    }


@org_router.post("/sync-flags")
async def sync_all_org_flags(
    user: dict = Depends(get_current_user_dep())
):
    """Sync organizational flags for all users (admin only)"""
    user_role = user.get("role", "")
    
    if user_role not in ["super_admin", "admin"]:
        raise HTTPException(status_code=403, detail="Admin access required")
    
    db = get_db()
    from utils.org_hierarchy import sync_user_org_flags
    
    # Get all active users
    users = await db.users.find(
        {"status": {"$ne": "inactive"}},
        {"id": 1}
    ).to_list(5000)
    
    synced = 0
    for u in users:
        await sync_user_org_flags(db, u["id"])
        synced += 1
    
    return {
        "success": True,
        "users_synced": synced
    }


@org_router.get("/department-heads")
async def get_all_department_heads(
    user: dict = Depends(get_current_user_dep())
):
    """Get all department heads"""
    db = get_db()
    
    # Get departments with heads
    departments = await db.departments.find(
        {"department_head_id": {"$exists": True, "$ne": None}},
        {"_id": 0, "id": 1, "name": 1, "department_head_id": 1}
    ).to_list(100)
    
    # Enrich with head details
    for dept in departments:
        if dept.get("department_head_id"):
            head = await db.users.find_one(
                {"id": dept["department_head_id"]},
                {"_id": 0, "id": 1, "name": 1, "email": 1, "designation": 1, "avatar_url": 1}
            )
            dept["department_head"] = head
    
    return {
        "departments": departments,
        "total": len(departments)
    }
