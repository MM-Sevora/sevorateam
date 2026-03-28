"""
Audit Log Routes
Tracks all user activities across the application.
Access restricted to Super-Admins by default, can be granted to other roles.
"""

from fastapi import APIRouter, Depends, HTTPException, Query
from typing import List, Optional
from datetime import datetime, timezone, timedelta
from pydantic import BaseModel
import uuid

audit_router = APIRouter(prefix="/audit", tags=["Audit Log"])


def get_db():
    """Get database connection"""
    from server import db
    return db


def get_current_user_dep():
    """Get current user dependency"""
    from server import get_current_user
    return get_current_user


# ============== MODELS ==============

class AuditLogEntry(BaseModel):
    id: str = None
    timestamp: str = None
    user_id: str
    user_name: str
    user_email: str
    action: str  # create, read, update, delete, login, logout, export, etc.
    module: str  # users, roles, tasks, expenses, etc.
    entity_type: str  # user, role, task, expense_claim, etc.
    entity_id: Optional[str] = None
    entity_name: Optional[str] = None
    description: str
    details: Optional[dict] = None  # Additional context (old values, new values, etc.)
    ip_address: Optional[str] = None
    user_agent: Optional[str] = None
    status: str = "success"  # success, failure, warning


class AuditLogResponse(BaseModel):
    id: str
    timestamp: str
    user_id: str
    user_name: str
    user_email: str
    action: str
    module: str
    entity_type: str
    entity_id: Optional[str] = None
    entity_name: Optional[str] = None
    description: str
    details: Optional[dict] = None
    ip_address: Optional[str] = None
    status: str


class AuditLogStats(BaseModel):
    total_entries: int
    entries_today: int
    entries_this_week: int
    top_users: List[dict]
    top_actions: List[dict]
    top_modules: List[dict]


# ============== HELPER FUNCTIONS ==============

def check_audit_access(user: dict) -> bool:
    """Check if user has access to audit logs"""
    # Super admins always have access
    if user.get("role") in ["super_admin", "admin"]:
        return True
    
    # Check if user has audit_log module access
    module_access = user.get("module_access", [])
    merged_module_access = user.get("merged_module_access", [])
    
    if "audit_log" in module_access or "audit_log" in merged_module_access:
        return True
    
    # Check module permissions
    module_permissions = user.get("module_permissions", {})
    if "audit_log" in module_permissions:
        perms = module_permissions["audit_log"]
        if perms.get("read", False):
            return True
    
    return False


async def log_activity(
    user_id: str,
    user_name: str,
    user_email: str,
    action: str,
    module: str,
    entity_type: str,
    description: str,
    entity_id: str = None,
    entity_name: str = None,
    details: dict = None,
    ip_address: str = None,
    user_agent: str = None,
    status: str = "success"
):
    """
    Log a user activity to the audit log.
    Call this function from any route to track activities.
    """
    db = get_db()
    
    log_entry = {
        "id": str(uuid.uuid4()),
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "user_id": user_id,
        "user_name": user_name,
        "user_email": user_email,
        "action": action,
        "module": module,
        "entity_type": entity_type,
        "entity_id": entity_id,
        "entity_name": entity_name,
        "description": description,
        "details": details or {},
        "ip_address": ip_address,
        "user_agent": user_agent,
        "status": status
    }
    
    await db.audit_logs.insert_one(log_entry)
    return log_entry


# ============== ROUTES ==============

@audit_router.get("/logs", response_model=List[AuditLogResponse])
async def get_audit_logs(
    module: Optional[str] = None,
    action: Optional[str] = None,
    user_id: Optional[str] = None,
    entity_type: Optional[str] = None,
    entity_id: Optional[str] = None,
    status: Optional[str] = None,
    date_from: Optional[str] = None,
    date_to: Optional[str] = None,
    search: Optional[str] = None,
    limit: int = Query(default=100, le=500),
    skip: int = Query(default=0, ge=0),
    user: dict = Depends(get_current_user_dep())
):
    """
    Get audit log entries with filtering.
    Only accessible to users with audit_log module access.
    """
    if not check_audit_access(user):
        raise HTTPException(status_code=403, detail="You don't have access to audit logs")
    
    db = get_db()
    
    # Build query
    query = {}
    
    if module:
        query["module"] = module
    if action:
        query["action"] = action
    if user_id:
        query["user_id"] = user_id
    if entity_type:
        query["entity_type"] = entity_type
    if entity_id:
        query["entity_id"] = entity_id
    if status:
        query["status"] = status
    
    # Date range filtering
    if date_from or date_to:
        query["timestamp"] = {}
        if date_from:
            query["timestamp"]["$gte"] = date_from
        if date_to:
            query["timestamp"]["$lte"] = date_to
    
    # Text search
    if search:
        query["$or"] = [
            {"description": {"$regex": search, "$options": "i"}},
            {"user_name": {"$regex": search, "$options": "i"}},
            {"user_email": {"$regex": search, "$options": "i"}},
            {"entity_name": {"$regex": search, "$options": "i"}}
        ]
    
    logs = await db.audit_logs.find(query, {"_id": 0}).sort("timestamp", -1).skip(skip).limit(limit).to_list(limit)
    
    return logs


@audit_router.get("/logs/{log_id}", response_model=AuditLogResponse)
async def get_audit_log_entry(
    log_id: str,
    user: dict = Depends(get_current_user_dep())
):
    """Get a single audit log entry"""
    if not check_audit_access(user):
        raise HTTPException(status_code=403, detail="You don't have access to audit logs")
    
    db = get_db()
    log = await db.audit_logs.find_one({"id": log_id}, {"_id": 0})
    
    if not log:
        raise HTTPException(status_code=404, detail="Audit log entry not found")
    
    return log


@audit_router.get("/stats", response_model=AuditLogStats)
async def get_audit_stats(
    user: dict = Depends(get_current_user_dep())
):
    """Get audit log statistics"""
    if not check_audit_access(user):
        raise HTTPException(status_code=403, detail="You don't have access to audit logs")
    
    db = get_db()
    
    now = datetime.now(timezone.utc)
    today_start = now.replace(hour=0, minute=0, second=0, microsecond=0).isoformat()
    week_start = (now - timedelta(days=7)).isoformat()
    
    # Total entries
    total_entries = await db.audit_logs.count_documents({})
    
    # Entries today
    entries_today = await db.audit_logs.count_documents({"timestamp": {"$gte": today_start}})
    
    # Entries this week
    entries_this_week = await db.audit_logs.count_documents({"timestamp": {"$gte": week_start}})
    
    # Top users (by activity count)
    top_users_pipeline = [
        {"$group": {"_id": {"user_id": "$user_id", "user_name": "$user_name"}, "count": {"$sum": 1}}},
        {"$sort": {"count": -1}},
        {"$limit": 5},
        {"$project": {"user_id": "$_id.user_id", "user_name": "$_id.user_name", "count": 1, "_id": 0}}
    ]
    top_users = await db.audit_logs.aggregate(top_users_pipeline).to_list(5)
    
    # Top actions
    top_actions_pipeline = [
        {"$group": {"_id": "$action", "count": {"$sum": 1}}},
        {"$sort": {"count": -1}},
        {"$limit": 5},
        {"$project": {"action": "$_id", "count": 1, "_id": 0}}
    ]
    top_actions = await db.audit_logs.aggregate(top_actions_pipeline).to_list(5)
    
    # Top modules
    top_modules_pipeline = [
        {"$group": {"_id": "$module", "count": {"$sum": 1}}},
        {"$sort": {"count": -1}},
        {"$limit": 5},
        {"$project": {"module": "$_id", "count": 1, "_id": 0}}
    ]
    top_modules = await db.audit_logs.aggregate(top_modules_pipeline).to_list(5)
    
    return AuditLogStats(
        total_entries=total_entries,
        entries_today=entries_today,
        entries_this_week=entries_this_week,
        top_users=top_users,
        top_actions=top_actions,
        top_modules=top_modules
    )


@audit_router.get("/modules")
async def get_audit_modules(
    user: dict = Depends(get_current_user_dep())
):
    """Get list of modules that have audit entries"""
    if not check_audit_access(user):
        raise HTTPException(status_code=403, detail="You don't have access to audit logs")
    
    db = get_db()
    
    modules = await db.audit_logs.distinct("module")
    return sorted(modules)


@audit_router.get("/actions")
async def get_audit_actions(
    user: dict = Depends(get_current_user_dep())
):
    """Get list of action types that have audit entries"""
    if not check_audit_access(user):
        raise HTTPException(status_code=403, detail="You don't have access to audit logs")
    
    db = get_db()
    
    actions = await db.audit_logs.distinct("action")
    return sorted(actions)


@audit_router.get("/users")
async def get_audit_users(
    user: dict = Depends(get_current_user_dep())
):
    """Get list of users who have audit entries"""
    if not check_audit_access(user):
        raise HTTPException(status_code=403, detail="You don't have access to audit logs")
    
    db = get_db()
    
    pipeline = [
        {"$group": {"_id": {"user_id": "$user_id", "user_name": "$user_name", "user_email": "$user_email"}}},
        {"$project": {"user_id": "$_id.user_id", "user_name": "$_id.user_name", "user_email": "$_id.user_email", "_id": 0}},
        {"$sort": {"user_name": 1}}
    ]
    users = await db.audit_logs.aggregate(pipeline).to_list(100)
    return users


@audit_router.post("/export")
async def export_audit_logs(
    module: Optional[str] = None,
    action: Optional[str] = None,
    date_from: Optional[str] = None,
    date_to: Optional[str] = None,
    format: str = "json",
    user: dict = Depends(get_current_user_dep())
):
    """
    Export audit logs.
    Logs this export action to the audit log itself.
    """
    if not check_audit_access(user):
        raise HTTPException(status_code=403, detail="You don't have access to audit logs")
    
    db = get_db()
    
    # Build query
    query = {}
    if module:
        query["module"] = module
    if action:
        query["action"] = action
    if date_from or date_to:
        query["timestamp"] = {}
        if date_from:
            query["timestamp"]["$gte"] = date_from
        if date_to:
            query["timestamp"]["$lte"] = date_to
    
    logs = await db.audit_logs.find(query, {"_id": 0}).sort("timestamp", -1).to_list(10000)
    
    # Log this export action
    await log_activity(
        user_id=user.get("id"),
        user_name=user.get("name"),
        user_email=user.get("email"),
        action="export",
        module="audit_log",
        entity_type="audit_logs",
        description=f"Exported {len(logs)} audit log entries",
        details={"filters": {"module": module, "action": action, "date_from": date_from, "date_to": date_to}, "count": len(logs)}
    )
    
    return {"count": len(logs), "logs": logs}
