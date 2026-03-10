"""
Admin Routes - User Management, Roles, Permissions
This file contains admin-only endpoints for managing users, roles and permissions.

NOTE: This is a new file that will gradually absorb admin routes from server.py
For now, it contains a subset of endpoints. server.py still has the main admin routes.
"""
from fastapi import APIRouter, HTTPException, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel, EmailStr
from typing import Optional, List, Dict, Any
from datetime import datetime, timezone
import uuid
import bcrypt
import jwt
import os
import logging

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/admin-v2", tags=["Admin V2"])

# Database and settings - will be set from server.py
db = None
JWT_SECRET = None
JWT_ALGORITHM = 'HS256'
security = HTTPBearer(auto_error=False)


def set_database(database):
    global db
    db = database


def set_jwt_settings(secret: str, algorithm: str = 'HS256'):
    global JWT_SECRET, JWT_ALGORITHM
    JWT_SECRET = secret
    JWT_ALGORITHM = algorithm


# ============== HELPER FUNCTIONS ==============
async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    """Verify JWT token and return current user"""
    if not credentials:
        raise HTTPException(status_code=401, detail="Authentication required")
    
    try:
        payload = jwt.decode(credentials.credentials, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        user_id = payload.get("sub")
        if not user_id:
            raise HTTPException(status_code=401, detail="Invalid token")
        
        user = await db.users.find_one({"id": user_id}, {"_id": 0, "password": 0, "hashed_password": 0})
        if not user:
            raise HTTPException(status_code=401, detail="User not found")
        return user
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")


def require_admin():
    """Dependency to require admin or super_admin role"""
    async def admin_check(user: dict = Depends(get_current_user)):
        if user.get('role') not in ['admin', 'super_admin']:
            raise HTTPException(status_code=403, detail="Admin access required")
        return user
    return admin_check


# ============== MODELS ==============
class SystemStatsResponse(BaseModel):
    total_users: int
    active_users: int
    pending_users: int
    inactive_users: int
    users_by_role: Dict[str, int]
    users_by_department: Dict[str, int]
    recent_logins_24h: int


# ============== ENDPOINTS ==============
@router.get("/system-health")
async def get_system_health(user: dict = Depends(require_admin())):
    """Get system health metrics"""
    try:
        # Database connectivity check
        await db.command("ping")
        db_status = "healthy"
    except Exception:
        db_status = "unhealthy"
    
    return {
        "status": "healthy" if db_status == "healthy" else "degraded",
        "database": db_status,
        "timestamp": datetime.now(timezone.utc).isoformat()
    }


@router.get("/stats/overview", response_model=SystemStatsResponse)
async def get_system_stats(user: dict = Depends(require_admin())):
    """Get overview statistics for admin dashboard"""
    from datetime import timedelta
    
    # Count users by status
    total = await db.users.count_documents({})
    active = await db.users.count_documents({"status": "active"})
    pending = await db.users.count_documents({"status": "pending"})
    inactive = await db.users.count_documents({"status": "inactive"})
    
    # Users by role
    roles = await db.users.aggregate([
        {"$group": {"_id": "$role", "count": {"$sum": 1}}}
    ]).to_list(100)
    users_by_role = {r["_id"] or "unknown": r["count"] for r in roles}
    
    # Users by department
    depts = await db.users.aggregate([
        {"$group": {"_id": "$department", "count": {"$sum": 1}}}
    ]).to_list(100)
    users_by_department = {d["_id"] or "unknown": d["count"] for d in depts}
    
    # Recent logins (24h)
    yesterday = (datetime.now(timezone.utc) - timedelta(hours=24)).isoformat()
    recent_logins = await db.users.count_documents({
        "last_login": {"$gte": yesterday}
    })
    
    return SystemStatsResponse(
        total_users=total,
        active_users=active,
        pending_users=pending,
        inactive_users=inactive,
        users_by_role=users_by_role,
        users_by_department=users_by_department,
        recent_logins_24h=recent_logins
    )


@router.get("/audit-logs")
async def get_audit_logs_v2(
    limit: int = 50,
    action_type: Optional[str] = None,
    user_id: Optional[str] = None,
    user: dict = Depends(require_admin())
):
    """Get admin audit logs with filters"""
    query = {}
    
    if action_type:
        query["action"] = action_type
    if user_id:
        query["performed_by"] = user_id
    
    logs = await db.admin_audit_logs.find(query, {"_id": 0}).sort("timestamp", -1).limit(limit).to_list(limit)
    
    return {"logs": logs, "total": len(logs)}


async def log_admin_action(action: str, details: dict, performed_by: str):
    """Helper to log admin actions"""
    log_entry = {
        "id": str(uuid.uuid4()),
        "action": action,
        "details": details,
        "performed_by": performed_by,
        "timestamp": datetime.now(timezone.utc).isoformat()
    }
    await db.admin_audit_logs.insert_one(log_entry)
