"""
Access & Credential Management System (ACMS)
- Tool Registry
- User Access Management
- Access Request System
- Credential Vault (encrypted)
- Activity & Audit Logs
- Onboarding/Offboarding Management
"""

from fastapi import APIRouter, Depends, HTTPException, Query, BackgroundTasks
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from datetime import datetime, timezone, timedelta
from enum import Enum
import uuid
import base64
import hashlib
from cryptography.fernet import Fernet
import os

router = APIRouter(prefix="/acms", tags=["Access & Credential Management"])
security = HTTPBearer()

# Will be set by main app
db = None
_get_current_user_func = None
_email_service = None  # Email service for notifications

# Encryption key for credential vault (in production, use env variable)
ENCRYPTION_KEY = os.environ.get("ACMS_ENCRYPTION_KEY", Fernet.generate_key().decode())


def get_fernet():
    """Get Fernet instance for encryption/decryption"""
    key = ENCRYPTION_KEY.encode() if isinstance(ENCRYPTION_KEY, str) else ENCRYPTION_KEY
    # Ensure key is valid Fernet key (32 url-safe base64-encoded bytes)
    if len(key) != 44:
        # Generate a consistent key from the provided key
        key = base64.urlsafe_b64encode(hashlib.sha256(key).digest())
    return Fernet(key)


def encrypt_credential(plain_text: str) -> str:
    """Encrypt a credential"""
    if not plain_text:
        return ""
    f = get_fernet()
    return f.encrypt(plain_text.encode()).decode()


def decrypt_credential(encrypted_text: str) -> str:
    """Decrypt a credential"""
    if not encrypted_text:
        return ""
    try:
        f = get_fernet()
        return f.decrypt(encrypted_text.encode()).decode()
    except Exception:
        return "***DECRYPTION_ERROR***"


def init_router(database, auth_dependency, email_service=None):
    global db, _get_current_user_func, _email_service
    db = database
    _get_current_user_func = auth_dependency
    _email_service = email_service
    return router


async def get_current_user_dep(credentials: HTTPAuthorizationCredentials = Depends(security)):
    if _get_current_user_func is None:
        raise HTTPException(status_code=500, detail="Auth not configured")
    return await _get_current_user_func(credentials)


async def send_access_request_notification(
    to_email: str,
    to_name: str,
    subject: str,
    request_info: dict,
    notification_type: str  # 'submitted', 'manager_approved', 'approved', 'rejected'
):
    """Send email notification for access request status changes"""
    if not _email_service:
        print(f"Email service not configured - skipping notification to {to_email}")
        return
    
    try:
        tool_name = request_info.get('tool_name', 'Unknown Tool')
        requester_name = request_info.get('requester_name', 'Unknown')
        comments = request_info.get('comments', '')
        
        if notification_type == 'submitted':
            body = f"""
            <h2>New Access Request</h2>
            <p>Hi {to_name},</p>
            <p>A new access request requires your approval:</p>
            <ul>
                <li><strong>Tool:</strong> {tool_name}</li>
                <li><strong>Requested by:</strong> {requester_name}</li>
                <li><strong>Reason:</strong> {request_info.get('reason', 'N/A')}</li>
                <li><strong>Access Level:</strong> {request_info.get('requested_level', 'viewer')}</li>
            </ul>
            <p>Please review this request in the IT Admin portal.</p>
            """
        elif notification_type == 'approved':
            body = f"""
            <h2>Access Request Approved</h2>
            <p>Hi {to_name},</p>
            <p>Your access request has been approved!</p>
            <ul>
                <li><strong>Tool:</strong> {tool_name}</li>
                <li><strong>Access Level:</strong> {request_info.get('requested_level', 'viewer')}</li>
            </ul>
            {f'<p><strong>Comments:</strong> {comments}</p>' if comments else ''}
            <p>You can now access this tool from the IT Admin portal.</p>
            """
        elif notification_type == 'rejected':
            body = f"""
            <h2>Access Request Denied</h2>
            <p>Hi {to_name},</p>
            <p>Unfortunately, your access request has been denied:</p>
            <ul>
                <li><strong>Tool:</strong> {tool_name}</li>
            </ul>
            {f'<p><strong>Reason:</strong> {comments}</p>' if comments else ''}
            <p>Please contact your manager if you have questions.</p>
            """
        elif notification_type == 'manager_approved':
            body = f"""
            <h2>Request Pending Admin Approval</h2>
            <p>Hi {to_name},</p>
            <p>Your access request has been approved by your manager and is now pending IT Admin approval:</p>
            <ul>
                <li><strong>Tool:</strong> {tool_name}</li>
            </ul>
            <p>You will be notified once the request is fully processed.</p>
            """
        else:
            return
        
        await _email_service.send_email(
            to_email=to_email,
            subject=subject,
            html_content=body
        )
        print(f"✅ Notification sent to {to_email}: {subject}")
    except Exception as e:
        print(f"❌ Failed to send notification: {e}")


# ============== ENUMS ==============

class ToolCategory(str, Enum):
    MARKETING = "marketing"
    DESIGN = "design"
    DEVELOPMENT = "development"
    FINANCE = "finance"
    HR = "hr"
    SALES = "sales"
    OPERATIONS = "operations"
    COMMUNICATION = "communication"
    ANALYTICS = "analytics"
    SECURITY = "security"
    OTHER = "other"


class LoginType(str, Enum):
    INDIVIDUAL = "individual"
    SHARED = "shared"
    SSO = "sso"
    API_KEY = "api_key"


class Criticality(str, Enum):
    HIGH = "high"
    MEDIUM = "medium"
    LOW = "low"


class AccessLevel(str, Enum):
    ADMIN = "admin"
    EDITOR = "editor"
    VIEWER = "viewer"
    CUSTOM = "custom"


class AccessType(str, Enum):
    ASSIGNED = "assigned"
    REQUESTED = "requested"
    DEFAULT = "default"  # Given during onboarding


class RequestStatus(str, Enum):
    PENDING = "pending"
    MANAGER_APPROVED = "manager_approved"
    APPROVED = "approved"
    REJECTED = "rejected"
    CANCELLED = "cancelled"


# ============== MODELS ==============

# Tool Registry Models
class ToolCreate(BaseModel):
    name: str
    url: Optional[str] = None
    description: Optional[str] = None
    category: ToolCategory = ToolCategory.OTHER
    department: Optional[str] = None
    owner_id: Optional[str] = None
    admin_id: Optional[str] = None
    login_type: LoginType = LoginType.INDIVIDUAL
    criticality: Criticality = Criticality.MEDIUM
    monthly_cost: Optional[float] = None
    icon: Optional[str] = None
    is_active: bool = True
    default_for_departments: List[str] = []  # Auto-assign to these departments
    default_for_roles: List[str] = []  # Auto-assign to these roles


class ToolUpdate(BaseModel):
    name: Optional[str] = None
    url: Optional[str] = None
    description: Optional[str] = None
    category: Optional[ToolCategory] = None
    department: Optional[str] = None
    owner_id: Optional[str] = None
    admin_id: Optional[str] = None
    login_type: Optional[LoginType] = None
    criticality: Optional[Criticality] = None
    monthly_cost: Optional[float] = None
    icon: Optional[str] = None
    is_active: Optional[bool] = None
    default_for_departments: Optional[List[str]] = None
    default_for_roles: Optional[List[str]] = None


# User Access Models
class UserAccessCreate(BaseModel):
    user_id: str
    tool_id: str
    access_level: AccessLevel = AccessLevel.VIEWER
    access_type: AccessType = AccessType.ASSIGNED
    expiry_date: Optional[str] = None
    notes: Optional[str] = None


class UserAccessUpdate(BaseModel):
    access_level: Optional[AccessLevel] = None
    expiry_date: Optional[str] = None
    notes: Optional[str] = None
    is_active: Optional[bool] = None


# Access Request Models
class AccessRequestCreate(BaseModel):
    tool_id: str
    reason: str
    duration: str = "permanent"  # permanent, temporary
    requested_level: AccessLevel = AccessLevel.VIEWER
    expiry_date: Optional[str] = None  # For temporary access


class AccessRequestAction(BaseModel):
    action: str  # approve, reject
    comments: Optional[str] = None


# Credential Vault Models
class CredentialCreate(BaseModel):
    tool_id: str
    login_email: str
    password: str
    two_factor_backup: Optional[str] = None
    notes: Optional[str] = None
    visible_to_roles: List[str] = []  # Roles that can view this credential
    visible_to_users: List[str] = []  # Specific user IDs
    visible_to_departments: List[str] = []


class CredentialUpdate(BaseModel):
    login_email: Optional[str] = None
    password: Optional[str] = None
    two_factor_backup: Optional[str] = None
    notes: Optional[str] = None
    visible_to_roles: Optional[List[str]] = None
    visible_to_users: Optional[List[str]] = None
    visible_to_departments: Optional[List[str]] = None


# ============== HELPER FUNCTIONS ==============

async def log_activity(
    action: str,
    entity_type: str,
    entity_id: str,
    entity_name: str,
    user_id: str,
    user_name: str,
    details: Optional[Dict] = None
):
    """Log an activity to the audit log"""
    log_entry = {
        "id": str(uuid.uuid4()),
        "action": action,
        "entity_type": entity_type,
        "entity_id": entity_id,
        "entity_name": entity_name,
        "user_id": user_id,
        "user_name": user_name,
        "details": details or {},
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "ip_address": None  # Could be added from request
    }
    await db.acms_audit_logs.insert_one(log_entry)


async def get_user_name(user_id: str) -> str:
    """Get user name by ID"""
    if not user_id:
        return "Unknown"
    user = await db.users.find_one({"id": user_id}, {"name": 1})
    return user.get("name", "Unknown") if user else "Unknown"


async def get_tool_name(tool_id: str) -> str:
    """Get tool name by ID"""
    if not tool_id:
        return "Unknown"
    tool = await db.acms_tools.find_one({"id": tool_id}, {"name": 1})
    return tool.get("name", "Unknown") if tool else "Unknown"


def can_view_credential(user: dict, credential: dict) -> bool:
    """Check if user can view a credential"""
    user_role = user.get("role", "")
    user_id = user.get("id", "")
    user_dept = user.get("department", "")
    
    # Super admin can view all
    if user_role == "super_admin":
        return True
    
    # Check if user is the owner
    if credential.get("owner_id") == user_id:
        return True
    
    # Check visible_to_users
    if user_id in credential.get("visible_to_users", []):
        return True
    
    # Check visible_to_roles
    if user_role in credential.get("visible_to_roles", []):
        return True
    
    # Check visible_to_departments
    if user_dept in credential.get("visible_to_departments", []):
        return True
    
    return False


# ============== TOOL REGISTRY ENDPOINTS ==============

@router.get("/tools")
async def get_tools(
    category: Optional[ToolCategory] = None,
    department: Optional[str] = None,
    login_type: Optional[LoginType] = None,
    criticality: Optional[Criticality] = None,
    is_active: Optional[bool] = None,
    search: Optional[str] = None,
    skip: int = 0,
    limit: int = 50,
    user: dict = Depends(get_current_user_dep)
):
    """Get all tools with filters"""
    query = {}
    
    if category:
        query["category"] = category.value
    if department:
        query["department"] = department
    if login_type:
        query["login_type"] = login_type.value
    if criticality:
        query["criticality"] = criticality.value
    if is_active is not None:
        query["is_active"] = is_active
    if search:
        query["$or"] = [
            {"name": {"$regex": search, "$options": "i"}},
            {"description": {"$regex": search, "$options": "i"}}
        ]
    
    tools = await db.acms_tools.find(query, {"_id": 0}).sort("name", 1).skip(skip).limit(limit).to_list(limit)
    total = await db.acms_tools.count_documents(query)
    
    # Enrich with owner/admin names and access count
    for tool in tools:
        tool["owner_name"] = await get_user_name(tool.get("owner_id"))
        tool["admin_name"] = await get_user_name(tool.get("admin_id"))
        tool["user_count"] = await db.acms_user_access.count_documents({
            "tool_id": tool["id"],
            "is_active": True
        })
    
    return {
        "tools": tools,
        "total": total,
        "skip": skip,
        "limit": limit
    }


@router.get("/tools/{tool_id}")
async def get_tool(tool_id: str, user: dict = Depends(get_current_user_dep)):
    """Get a specific tool with details"""
    tool = await db.acms_tools.find_one({"id": tool_id}, {"_id": 0})
    if not tool:
        raise HTTPException(status_code=404, detail="Tool not found")
    
    tool["owner_name"] = await get_user_name(tool.get("owner_id"))
    tool["admin_name"] = await get_user_name(tool.get("admin_id"))
    tool["user_count"] = await db.acms_user_access.count_documents({
        "tool_id": tool_id,
        "is_active": True
    })
    
    # Get users with access
    access_list = await db.acms_user_access.find(
        {"tool_id": tool_id, "is_active": True},
        {"_id": 0}
    ).to_list(100)
    
    for access in access_list:
        access["user_name"] = await get_user_name(access.get("user_id"))
    
    tool["access_list"] = access_list
    
    return tool


@router.post("/tools")
async def create_tool(
    tool: ToolCreate,
    background_tasks: BackgroundTasks,
    user: dict = Depends(get_current_user_dep)
):
    """Create a new tool"""
    now = datetime.now(timezone.utc).isoformat()
    
    tool_doc = {
        "id": str(uuid.uuid4()),
        **tool.dict(),
        "category": tool.category.value,
        "login_type": tool.login_type.value,
        "criticality": tool.criticality.value,
        "created_by": user.get("id"),
        "created_at": now,
        "updated_at": now
    }
    
    await db.acms_tools.insert_one(tool_doc)
    
    # Log activity
    background_tasks.add_task(
        log_activity,
        action="tool_created",
        entity_type="tool",
        entity_id=tool_doc["id"],
        entity_name=tool.name,
        user_id=user.get("id"),
        user_name=user.get("name"),
        details={"category": tool.category.value, "criticality": tool.criticality.value}
    )
    
    del tool_doc["_id"]
    return tool_doc


@router.put("/tools/{tool_id}")
async def update_tool(
    tool_id: str,
    update: ToolUpdate,
    background_tasks: BackgroundTasks,
    user: dict = Depends(get_current_user_dep)
):
    """Update a tool"""
    tool = await db.acms_tools.find_one({"id": tool_id})
    if not tool:
        raise HTTPException(status_code=404, detail="Tool not found")
    
    update_data = {k: v for k, v in update.dict().items() if v is not None}
    
    # Convert enums to values
    if "category" in update_data:
        update_data["category"] = update_data["category"].value
    if "login_type" in update_data:
        update_data["login_type"] = update_data["login_type"].value
    if "criticality" in update_data:
        update_data["criticality"] = update_data["criticality"].value
    
    update_data["updated_at"] = datetime.now(timezone.utc).isoformat()
    
    await db.acms_tools.update_one({"id": tool_id}, {"$set": update_data})
    
    # Log activity
    background_tasks.add_task(
        log_activity,
        action="tool_updated",
        entity_type="tool",
        entity_id=tool_id,
        entity_name=tool.get("name"),
        user_id=user.get("id"),
        user_name=user.get("name"),
        details={"updated_fields": list(update_data.keys())}
    )
    
    updated = await db.acms_tools.find_one({"id": tool_id}, {"_id": 0})
    return updated


@router.delete("/tools/{tool_id}")
async def delete_tool(
    tool_id: str,
    background_tasks: BackgroundTasks,
    user: dict = Depends(get_current_user_dep)
):
    """Delete a tool (soft delete)"""
    tool = await db.acms_tools.find_one({"id": tool_id})
    if not tool:
        raise HTTPException(status_code=404, detail="Tool not found")
    
    await db.acms_tools.update_one(
        {"id": tool_id},
        {"$set": {"is_active": False, "deleted_at": datetime.now(timezone.utc).isoformat()}}
    )
    
    # Log activity
    background_tasks.add_task(
        log_activity,
        action="tool_deleted",
        entity_type="tool",
        entity_id=tool_id,
        entity_name=tool.get("name"),
        user_id=user.get("id"),
        user_name=user.get("name")
    )
    
    return {"message": "Tool deleted"}


# ============== USER ACCESS MANAGEMENT ==============

@router.get("/access")
async def get_user_access_list(
    user_id: Optional[str] = None,
    tool_id: Optional[str] = None,
    access_level: Optional[AccessLevel] = None,
    is_active: Optional[bool] = True,
    skip: int = 0,
    limit: int = 100,
    user: dict = Depends(get_current_user_dep)
):
    """Get user access records"""
    query = {}
    
    if user_id:
        query["user_id"] = user_id
    if tool_id:
        query["tool_id"] = tool_id
    if access_level:
        query["access_level"] = access_level.value
    if is_active is not None:
        query["is_active"] = is_active
    
    records = await db.acms_user_access.find(query, {"_id": 0}).sort("granted_at", -1).skip(skip).limit(limit).to_list(limit)
    total = await db.acms_user_access.count_documents(query)
    
    # Enrich with names
    for record in records:
        record["user_name"] = await get_user_name(record.get("user_id"))
        record["tool_name"] = await get_tool_name(record.get("tool_id"))
        record["assigned_by_name"] = await get_user_name(record.get("assigned_by"))
    
    return {
        "access_records": records,
        "total": total,
        "skip": skip,
        "limit": limit
    }


@router.get("/access/my-tools")
async def get_my_tools(user: dict = Depends(get_current_user_dep)):
    """Get tools the current user has access to"""
    user_id = user.get("id")
    
    # Get user's access records
    access_records = await db.acms_user_access.find(
        {"user_id": user_id, "is_active": True},
        {"_id": 0}
    ).to_list(100)
    
    tool_ids = [r.get("tool_id") for r in access_records]
    
    # Get tool details
    tools = await db.acms_tools.find(
        {"id": {"$in": tool_ids}, "is_active": True},
        {"_id": 0}
    ).to_list(100)
    
    # Merge access info with tool info
    access_map = {r["tool_id"]: r for r in access_records}
    for tool in tools:
        access_info = access_map.get(tool["id"], {})
        tool["my_access_level"] = access_info.get("access_level")
        tool["access_granted_at"] = access_info.get("granted_at")
        tool["access_expiry"] = access_info.get("expiry_date")
    
    return {
        "tools": tools,
        "total": len(tools)
    }


@router.post("/access")
async def grant_access(
    access: UserAccessCreate,
    background_tasks: BackgroundTasks,
    user: dict = Depends(get_current_user_dep)
):
    """Grant access to a user"""
    # Check if tool exists
    tool = await db.acms_tools.find_one({"id": access.tool_id})
    if not tool:
        raise HTTPException(status_code=404, detail="Tool not found")
    
    # Check if user exists
    target_user = await db.users.find_one({"id": access.user_id})
    if not target_user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Check if access already exists
    existing = await db.acms_user_access.find_one({
        "user_id": access.user_id,
        "tool_id": access.tool_id,
        "is_active": True
    })
    
    if existing:
        raise HTTPException(status_code=400, detail="User already has access to this tool")
    
    now = datetime.now(timezone.utc).isoformat()
    
    access_doc = {
        "id": str(uuid.uuid4()),
        "user_id": access.user_id,
        "tool_id": access.tool_id,
        "access_level": access.access_level.value,
        "access_type": access.access_type.value,
        "expiry_date": access.expiry_date,
        "notes": access.notes,
        "is_active": True,
        "assigned_by": user.get("id"),
        "granted_at": now,
        "updated_at": now
    }
    
    await db.acms_user_access.insert_one(access_doc)
    
    # Log activity
    background_tasks.add_task(
        log_activity,
        action="access_granted",
        entity_type="user_access",
        entity_id=access_doc["id"],
        entity_name=f"{target_user.get('name')} → {tool.get('name')}",
        user_id=user.get("id"),
        user_name=user.get("name"),
        details={
            "target_user": target_user.get("name"),
            "tool": tool.get("name"),
            "access_level": access.access_level.value
        }
    )
    
    del access_doc["_id"]
    return access_doc


@router.put("/access/{access_id}")
async def update_access(
    access_id: str,
    update: UserAccessUpdate,
    background_tasks: BackgroundTasks,
    user: dict = Depends(get_current_user_dep)
):
    """Update user access"""
    access_record = await db.acms_user_access.find_one({"id": access_id})
    if not access_record:
        raise HTTPException(status_code=404, detail="Access record not found")
    
    update_data = {k: v for k, v in update.dict().items() if v is not None}
    if "access_level" in update_data:
        update_data["access_level"] = update_data["access_level"].value
    
    update_data["updated_at"] = datetime.now(timezone.utc).isoformat()
    
    await db.acms_user_access.update_one({"id": access_id}, {"$set": update_data})
    
    # Log activity
    background_tasks.add_task(
        log_activity,
        action="access_updated",
        entity_type="user_access",
        entity_id=access_id,
        entity_name=f"Access #{access_id[:8]}",
        user_id=user.get("id"),
        user_name=user.get("name"),
        details={"updated_fields": list(update_data.keys())}
    )
    
    return {"message": "Access updated"}


@router.delete("/access/{access_id}")
async def revoke_access(
    access_id: str,
    background_tasks: BackgroundTasks,
    user: dict = Depends(get_current_user_dep)
):
    """Revoke user access"""
    access_record = await db.acms_user_access.find_one({"id": access_id})
    if not access_record:
        raise HTTPException(status_code=404, detail="Access record not found")
    
    await db.acms_user_access.update_one(
        {"id": access_id},
        {"$set": {
            "is_active": False,
            "revoked_at": datetime.now(timezone.utc).isoformat(),
            "revoked_by": user.get("id")
        }}
    )
    
    target_user_name = await get_user_name(access_record.get("user_id"))
    tool_name = await get_tool_name(access_record.get("tool_id"))
    
    # Log activity
    background_tasks.add_task(
        log_activity,
        action="access_revoked",
        entity_type="user_access",
        entity_id=access_id,
        entity_name=f"{target_user_name} → {tool_name}",
        user_id=user.get("id"),
        user_name=user.get("name"),
        details={"target_user": target_user_name, "tool": tool_name}
    )
    
    return {"message": "Access revoked"}


# ============== ACCESS REQUEST SYSTEM ==============

@router.get("/requests")
async def get_access_requests(
    status: Optional[RequestStatus] = None,
    requester_id: Optional[str] = None,
    tool_id: Optional[str] = None,
    my_pending: bool = False,
    skip: int = 0,
    limit: int = 50,
    user: dict = Depends(get_current_user_dep)
):
    """Get access requests"""
    query = {}
    
    if status:
        query["status"] = status.value
    if requester_id:
        query["requester_id"] = requester_id
    if tool_id:
        query["tool_id"] = tool_id
    
    # If my_pending, show requests where current user is the approver
    if my_pending:
        user_role = user.get("role", "")
        if user_role in ["super_admin", "hr_admin"]:
            # IT/HR Admin sees all pending requests at admin level
            query["status"] = {"$in": [RequestStatus.PENDING.value, RequestStatus.MANAGER_APPROVED.value]}
        elif user_role in ["manager", "department_head"]:
            # Manager sees pending requests from their team
            query["status"] = RequestStatus.PENDING.value
            # Get users in manager's team
            team_members = await db.users.find(
                {"manager_id": user.get("id")},
                {"id": 1}
            ).to_list(100)
            team_ids = [m["id"] for m in team_members]
            query["requester_id"] = {"$in": team_ids}
    
    requests = await db.acms_access_requests.find(query, {"_id": 0}).sort("created_at", -1).skip(skip).limit(limit).to_list(limit)
    total = await db.acms_access_requests.count_documents(query)
    
    # Enrich with names
    for req in requests:
        req["requester_name"] = await get_user_name(req.get("requester_id"))
        req["tool_name"] = await get_tool_name(req.get("tool_id"))
        req["manager_name"] = await get_user_name(req.get("manager_approved_by"))
        req["admin_name"] = await get_user_name(req.get("admin_approved_by"))
    
    return {
        "requests": requests,
        "total": total,
        "skip": skip,
        "limit": limit
    }


@router.get("/requests/my-requests")
async def get_my_requests(
    status: Optional[RequestStatus] = None,
    user: dict = Depends(get_current_user_dep)
):
    """Get current user's access requests"""
    query = {"requester_id": user.get("id")}
    if status:
        query["status"] = status.value
    
    requests = await db.acms_access_requests.find(query, {"_id": 0}).sort("created_at", -1).to_list(50)
    
    for req in requests:
        req["tool_name"] = await get_tool_name(req.get("tool_id"))
    
    return {"requests": requests}


@router.post("/requests")
async def create_access_request(
    request: AccessRequestCreate,
    background_tasks: BackgroundTasks,
    user: dict = Depends(get_current_user_dep)
):
    """Submit an access request"""
    # Check if tool exists
    tool = await db.acms_tools.find_one({"id": request.tool_id, "is_active": True})
    if not tool:
        raise HTTPException(status_code=404, detail="Tool not found")
    
    # Check if user already has access
    existing_access = await db.acms_user_access.find_one({
        "user_id": user.get("id"),
        "tool_id": request.tool_id,
        "is_active": True
    })
    if existing_access:
        raise HTTPException(status_code=400, detail="You already have access to this tool")
    
    # Check if there's a pending request
    pending = await db.acms_access_requests.find_one({
        "requester_id": user.get("id"),
        "tool_id": request.tool_id,
        "status": {"$in": [RequestStatus.PENDING.value, RequestStatus.MANAGER_APPROVED.value]}
    })
    if pending:
        raise HTTPException(status_code=400, detail="You already have a pending request for this tool")
    
    now = datetime.now(timezone.utc).isoformat()
    
    request_doc = {
        "id": str(uuid.uuid4()),
        "requester_id": user.get("id"),
        "tool_id": request.tool_id,
        "reason": request.reason,
        "duration": request.duration,
        "requested_level": request.requested_level.value,
        "expiry_date": request.expiry_date,
        "status": RequestStatus.PENDING.value,
        "manager_approved_by": None,
        "manager_approved_at": None,
        "manager_comments": None,
        "admin_approved_by": None,
        "admin_approved_at": None,
        "admin_comments": None,
        "created_at": now,
        "updated_at": now
    }
    
    await db.acms_access_requests.insert_one(request_doc)
    
    # Log activity
    background_tasks.add_task(
        log_activity,
        action="request_submitted",
        entity_type="access_request",
        entity_id=request_doc["id"],
        entity_name=f"Request for {tool.get('name')}",
        user_id=user.get("id"),
        user_name=user.get("name"),
        details={"tool": tool.get("name"), "reason": request.reason}
    )
    
    # Send email notification to manager/admins
    # Find user's manager
    requester = await db.users.find_one({"id": user.get("id")}, {"manager_id": 1})
    if requester and requester.get("manager_id"):
        manager = await db.users.find_one({"id": requester["manager_id"]}, {"name": 1, "email": 1})
        if manager and manager.get("email"):
            background_tasks.add_task(
                send_access_request_notification,
                to_email=manager["email"],
                to_name=manager.get("name", "Manager"),
                subject=f"Access Request Pending: {tool.get('name')}",
                request_info={
                    "tool_name": tool.get("name"),
                    "requester_name": user.get("name"),
                    "reason": request.reason,
                    "requested_level": request.requested_level.value
                },
                notification_type="submitted"
            )
    
    del request_doc["_id"]
    return request_doc


@router.post("/requests/{request_id}/manager-action")
async def manager_action_on_request(
    request_id: str,
    action: AccessRequestAction,
    background_tasks: BackgroundTasks,
    user: dict = Depends(get_current_user_dep)
):
    """Manager approves/rejects a request"""
    request_doc = await db.acms_access_requests.find_one({"id": request_id})
    if not request_doc:
        raise HTTPException(status_code=404, detail="Request not found")
    
    if request_doc.get("status") != RequestStatus.PENDING.value:
        raise HTTPException(status_code=400, detail="Request is not pending manager approval")
    
    now = datetime.now(timezone.utc).isoformat()
    
    if action.action == "approve":
        update_data = {
            "status": RequestStatus.MANAGER_APPROVED.value,
            "manager_approved_by": user.get("id"),
            "manager_approved_at": now,
            "manager_comments": action.comments,
            "updated_at": now
        }
    else:
        update_data = {
            "status": RequestStatus.REJECTED.value,
            "manager_approved_by": user.get("id"),
            "manager_approved_at": now,
            "manager_comments": action.comments,
            "updated_at": now
        }
    
    await db.acms_access_requests.update_one({"id": request_id}, {"$set": update_data})
    
    # Log activity
    background_tasks.add_task(
        log_activity,
        action=f"request_manager_{action.action}d",
        entity_type="access_request",
        entity_id=request_id,
        entity_name=f"Request #{request_id[:8]}",
        user_id=user.get("id"),
        user_name=user.get("name")
    )
    
    # Send email notification to requester
    requester = await db.users.find_one({"id": request_doc.get("requester_id")}, {"name": 1, "email": 1})
    tool = await db.acms_tools.find_one({"id": request_doc.get("tool_id")}, {"name": 1})
    
    if requester and requester.get("email"):
        notification_type = "manager_approved" if action.action == "approve" else "rejected"
        subject = f"Access Request {'Approved by Manager' if action.action == 'approve' else 'Rejected'}: {tool.get('name') if tool else 'Tool'}"
        
        background_tasks.add_task(
            send_access_request_notification,
            to_email=requester["email"],
            to_name=requester.get("name", "User"),
            subject=subject,
            request_info={
                "tool_name": tool.get("name") if tool else "Unknown",
                "requester_name": requester.get("name"),
                "status": action.action,
                "comments": action.comments,
                "requested_level": request_doc.get("requested_level")
            },
            notification_type=notification_type
        )
    
    return {"message": f"Request {action.action}d by manager"}


@router.post("/requests/{request_id}/admin-action")
async def admin_action_on_request(
    request_id: str,
    action: AccessRequestAction,
    background_tasks: BackgroundTasks,
    user: dict = Depends(get_current_user_dep)
):
    """Admin approves/rejects a request and grants access"""
    request_doc = await db.acms_access_requests.find_one({"id": request_id})
    if not request_doc:
        raise HTTPException(status_code=404, detail="Request not found")
    
    if request_doc.get("status") != RequestStatus.MANAGER_APPROVED.value:
        raise HTTPException(status_code=400, detail="Request is not pending admin approval")
    
    now = datetime.now(timezone.utc).isoformat()
    
    if action.action == "approve":
        # Grant access
        access_doc = {
            "id": str(uuid.uuid4()),
            "user_id": request_doc.get("requester_id"),
            "tool_id": request_doc.get("tool_id"),
            "access_level": request_doc.get("requested_level"),
            "access_type": AccessType.REQUESTED.value,
            "expiry_date": request_doc.get("expiry_date"),
            "notes": f"Granted via request #{request_id[:8]}",
            "is_active": True,
            "assigned_by": user.get("id"),
            "granted_at": now,
            "updated_at": now,
            "request_id": request_id
        }
        await db.acms_user_access.insert_one(access_doc)
        
        update_data = {
            "status": RequestStatus.APPROVED.value,
            "admin_approved_by": user.get("id"),
            "admin_approved_at": now,
            "admin_comments": action.comments,
            "access_id": access_doc["id"],
            "updated_at": now
        }
    else:
        update_data = {
            "status": RequestStatus.REJECTED.value,
            "admin_approved_by": user.get("id"),
            "admin_approved_at": now,
            "admin_comments": action.comments,
            "updated_at": now
        }
    
    await db.acms_access_requests.update_one({"id": request_id}, {"$set": update_data})
    
    # Log activity
    background_tasks.add_task(
        log_activity,
        action=f"request_admin_{action.action}d",
        entity_type="access_request",
        entity_id=request_id,
        entity_name=f"Request #{request_id[:8]}",
        user_id=user.get("id"),
        user_name=user.get("name")
    )
    
    # Send email notification to requester
    requester = await db.users.find_one({"id": request_doc.get("requester_id")}, {"name": 1, "email": 1})
    tool = await db.acms_tools.find_one({"id": request_doc.get("tool_id")}, {"name": 1})
    
    if requester and requester.get("email"):
        notification_type = "approved" if action.action == "approve" else "rejected"
        subject = f"Access Request {'Approved' if action.action == 'approve' else 'Rejected'}: {tool.get('name') if tool else 'Tool'}"
        
        background_tasks.add_task(
            send_access_request_notification,
            to_email=requester["email"],
            to_name=requester.get("name", "User"),
            subject=subject,
            request_info={
                "tool_name": tool.get("name") if tool else "Unknown",
                "requester_name": requester.get("name"),
                "status": action.action,
                "comments": action.comments,
                "requested_level": request_doc.get("requested_level")
            },
            notification_type=notification_type
        )
    
    return {"message": f"Request {action.action}d by admin"}


# ============== CREDENTIAL VAULT ==============

@router.get("/credentials")
async def get_credentials(
    tool_id: Optional[str] = None,
    user: dict = Depends(get_current_user_dep)
):
    """Get credentials (filtered by visibility)"""
    query = {"is_active": True}
    if tool_id:
        query["tool_id"] = tool_id
    
    credentials = await db.acms_credentials.find(query, {"_id": 0}).to_list(100)
    
    # Filter by visibility and mask passwords
    visible_creds = []
    for cred in credentials:
        if can_view_credential(user, cred):
            cred["tool_name"] = await get_tool_name(cred.get("tool_id"))
            cred["owner_name"] = await get_user_name(cred.get("owner_id"))
            # Mask password unless specifically requested
            cred["password"] = "••••••••"
            cred["can_view_password"] = True
            visible_creds.append(cred)
    
    return {"credentials": visible_creds}


# Note: rotation-status must be defined BEFORE /credentials/{credential_id} to avoid route conflict
@router.get("/credentials/rotation-status")
async def get_password_rotation_status(user: dict = Depends(get_current_user_dep)):
    """Get password rotation status for all credentials"""
    now = datetime.now(timezone.utc)
    
    credentials = await db.acms_credentials.find(
        {"is_active": True},
        {"_id": 0}
    ).to_list(500)
    
    rotation_status = []
    overdue = []
    due_soon = []
    up_to_date = []
    
    for cred in credentials:
        # Get tool info
        tool = await db.acms_tools.find_one({"id": cred.get("tool_id")}, {"name": 1, "criticality": 1})
        tool_name = tool.get("name") if tool else "Unknown"
        
        # Get rotation config or use defaults
        rotation_config = cred.get("rotation_config", {})
        rotation_days = rotation_config.get("rotation_days", 90)
        notify_days = rotation_config.get("notify_days_before", 14)
        
        # Calculate last password change
        password_history = cred.get("password_history", [])
        if password_history:
            last_change = password_history[-1].get("changed_at")
            if last_change:
                last_change_date = datetime.fromisoformat(last_change.replace('Z', '+00:00'))
                days_since_change = (now - last_change_date).days
                next_rotation_date = last_change_date + timedelta(days=rotation_days)
                days_until_rotation = (next_rotation_date - now).days
            else:
                days_since_change = rotation_days + 1
                days_until_rotation = -1
        else:
            days_since_change = rotation_days + 1
            days_until_rotation = -1
        
        status_entry = {
            "credential_id": cred.get("id"),
            "tool_id": cred.get("tool_id"),
            "tool_name": tool_name,
            "criticality": tool.get("criticality") if tool else "medium",
            "login_email": cred.get("login_email"),
            "days_since_last_change": days_since_change,
            "days_until_rotation": days_until_rotation,
            "rotation_days_policy": rotation_days,
            "last_changed_at": password_history[-1].get("changed_at") if password_history else None,
            "status": "up_to_date"
        }
        
        if days_until_rotation < 0:
            status_entry["status"] = "overdue"
            overdue.append(status_entry)
        elif days_until_rotation <= notify_days:
            status_entry["status"] = "due_soon"
            due_soon.append(status_entry)
        else:
            up_to_date.append(status_entry)
        
        rotation_status.append(status_entry)
    
    return {
        "summary": {
            "total_credentials": len(credentials),
            "overdue": len(overdue),
            "due_soon": len(due_soon),
            "ok": len(up_to_date)
        },
        "rotation_status": rotation_status,
        "overdue": overdue,
        "due_soon": due_soon,
        "up_to_date": up_to_date
    }


@router.get("/credentials/{credential_id}")
async def get_credential(
    credential_id: str,
    reveal_password: bool = False,
    background_tasks: BackgroundTasks = None,
    user: dict = Depends(get_current_user_dep)
):
    """Get a specific credential"""
    cred = await db.acms_credentials.find_one({"id": credential_id}, {"_id": 0})
    if not cred:
        raise HTTPException(status_code=404, detail="Credential not found")
    
    if not can_view_credential(user, cred):
        raise HTTPException(status_code=403, detail="You don't have permission to view this credential")
    
    cred["tool_name"] = await get_tool_name(cred.get("tool_id"))
    cred["owner_name"] = await get_user_name(cred.get("owner_id"))
    
    if reveal_password:
        # Decrypt and reveal password
        cred["password"] = decrypt_credential(cred.get("password_encrypted", ""))
        if cred.get("two_factor_encrypted"):
            cred["two_factor_backup"] = decrypt_credential(cred["two_factor_encrypted"])
        
        # Log credential view
        if background_tasks:
            background_tasks.add_task(
                log_activity,
                action="credential_viewed",
                entity_type="credential",
                entity_id=credential_id,
                entity_name=f"Credential for {cred.get('tool_name')}",
                user_id=user.get("id"),
                user_name=user.get("name")
            )
    else:
        cred["password"] = "••••••••"
    
    return cred


@router.post("/credentials")
async def create_credential(
    credential: CredentialCreate,
    background_tasks: BackgroundTasks,
    user: dict = Depends(get_current_user_dep)
):
    """Create a new credential"""
    # Check if tool exists
    tool = await db.acms_tools.find_one({"id": credential.tool_id})
    if not tool:
        raise HTTPException(status_code=404, detail="Tool not found")
    
    now = datetime.now(timezone.utc).isoformat()
    
    cred_doc = {
        "id": str(uuid.uuid4()),
        "tool_id": credential.tool_id,
        "login_email": credential.login_email,
        "password_encrypted": encrypt_credential(credential.password),
        "two_factor_encrypted": encrypt_credential(credential.two_factor_backup) if credential.two_factor_backup else None,
        "notes": credential.notes,
        "visible_to_roles": credential.visible_to_roles,
        "visible_to_users": credential.visible_to_users,
        "visible_to_departments": credential.visible_to_departments,
        "owner_id": user.get("id"),
        "is_active": True,
        "created_at": now,
        "updated_at": now,
        "password_history": [{
            "changed_at": now,
            "changed_by": user.get("id")
        }]
    }
    
    await db.acms_credentials.insert_one(cred_doc)
    
    # Log activity
    background_tasks.add_task(
        log_activity,
        action="credential_created",
        entity_type="credential",
        entity_id=cred_doc["id"],
        entity_name=f"Credential for {tool.get('name')}",
        user_id=user.get("id"),
        user_name=user.get("name")
    )
    
    del cred_doc["_id"]
    cred_doc["password"] = "••••••••"  # Don't return actual password
    return cred_doc


@router.put("/credentials/{credential_id}")
async def update_credential(
    credential_id: str,
    update: CredentialUpdate,
    background_tasks: BackgroundTasks,
    user: dict = Depends(get_current_user_dep)
):
    """Update a credential"""
    cred = await db.acms_credentials.find_one({"id": credential_id})
    if not cred:
        raise HTTPException(status_code=404, detail="Credential not found")
    
    if not can_view_credential(user, cred):
        raise HTTPException(status_code=403, detail="You don't have permission to update this credential")
    
    now = datetime.now(timezone.utc).isoformat()
    update_data = {}
    
    if update.login_email is not None:
        update_data["login_email"] = update.login_email
    if update.password is not None:
        update_data["password_encrypted"] = encrypt_credential(update.password)
        # Add to password history
        await db.acms_credentials.update_one(
            {"id": credential_id},
            {"$push": {"password_history": {"changed_at": now, "changed_by": user.get("id")}}}
        )
    if update.two_factor_backup is not None:
        update_data["two_factor_encrypted"] = encrypt_credential(update.two_factor_backup)
    if update.notes is not None:
        update_data["notes"] = update.notes
    if update.visible_to_roles is not None:
        update_data["visible_to_roles"] = update.visible_to_roles
    if update.visible_to_users is not None:
        update_data["visible_to_users"] = update.visible_to_users
    if update.visible_to_departments is not None:
        update_data["visible_to_departments"] = update.visible_to_departments
    
    update_data["updated_at"] = now
    
    await db.acms_credentials.update_one({"id": credential_id}, {"$set": update_data})
    
    # Log activity
    action = "credential_password_updated" if update.password else "credential_updated"
    background_tasks.add_task(
        log_activity,
        action=action,
        entity_type="credential",
        entity_id=credential_id,
        entity_name=f"Credential #{credential_id[:8]}",
        user_id=user.get("id"),
        user_name=user.get("name")
    )
    
    return {"message": "Credential updated"}


@router.delete("/credentials/{credential_id}")
async def delete_credential(
    credential_id: str,
    background_tasks: BackgroundTasks,
    user: dict = Depends(get_current_user_dep)
):
    """Delete a credential"""
    cred = await db.acms_credentials.find_one({"id": credential_id})
    if not cred:
        raise HTTPException(status_code=404, detail="Credential not found")
    
    await db.acms_credentials.update_one(
        {"id": credential_id},
        {"$set": {"is_active": False, "deleted_at": datetime.now(timezone.utc).isoformat()}}
    )
    
    background_tasks.add_task(
        log_activity,
        action="credential_deleted",
        entity_type="credential",
        entity_id=credential_id,
        entity_name=f"Credential #{credential_id[:8]}",
        user_id=user.get("id"),
        user_name=user.get("name")
    )
    
    return {"message": "Credential deleted"}


# ============== AUDIT LOGS ==============

@router.get("/audit-logs")
async def get_audit_logs(
    action: Optional[str] = None,
    entity_type: Optional[str] = None,
    user_id: Optional[str] = None,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    skip: int = 0,
    limit: int = 100,
    user: dict = Depends(get_current_user_dep)
):
    """Get audit logs"""
    query = {}
    
    if action:
        query["action"] = action
    if entity_type:
        query["entity_type"] = entity_type
    if user_id:
        query["user_id"] = user_id
    if start_date:
        query["timestamp"] = {"$gte": start_date}
    if end_date:
        query.setdefault("timestamp", {})["$lte"] = end_date
    
    logs = await db.acms_audit_logs.find(query, {"_id": 0}).sort("timestamp", -1).skip(skip).limit(limit).to_list(limit)
    total = await db.acms_audit_logs.count_documents(query)
    
    return {
        "logs": logs,
        "total": total,
        "skip": skip,
        "limit": limit
    }


# ============== DASHBOARD ==============

@router.get("/dashboard")
async def get_acms_dashboard(user: dict = Depends(get_current_user_dep)):
    """Get ACMS dashboard metrics"""
    now = datetime.now(timezone.utc)
    week_ago = (now - timedelta(days=7)).isoformat()
    
    # Tool metrics
    total_tools = await db.acms_tools.count_documents({"is_active": True})
    tools_by_category = await db.acms_tools.aggregate([
        {"$match": {"is_active": True}},
        {"$group": {"_id": "$category", "count": {"$sum": 1}}},
        {"$sort": {"count": -1}}
    ]).to_list(20)
    
    # Calculate monthly cost
    cost_result = await db.acms_tools.aggregate([
        {"$match": {"is_active": True, "monthly_cost": {"$exists": True, "$ne": None}}},
        {"$group": {"_id": None, "total": {"$sum": "$monthly_cost"}}}
    ]).to_list(1)
    total_monthly_cost = cost_result[0]["total"] if cost_result else 0
    
    # User access metrics
    total_access_records = await db.acms_user_access.count_documents({"is_active": True})
    users_with_access = len(await db.acms_user_access.distinct("user_id", {"is_active": True}))
    
    # Request metrics
    pending_requests = await db.acms_access_requests.count_documents({
        "status": {"$in": [RequestStatus.PENDING.value, RequestStatus.MANAGER_APPROVED.value]}
    })
    requests_this_week = await db.acms_access_requests.count_documents({
        "created_at": {"$gte": week_ago}
    })
    
    # Credential metrics
    total_credentials = await db.acms_credentials.count_documents({"is_active": True})
    credentials_viewed_this_week = await db.acms_audit_logs.count_documents({
        "action": "credential_viewed",
        "timestamp": {"$gte": week_ago}
    })
    
    # Recent activity
    recent_logs = await db.acms_audit_logs.find({}, {"_id": 0}).sort("timestamp", -1).limit(10).to_list(10)
    
    # Tools by criticality
    critical_tools = await db.acms_tools.count_documents({"is_active": True, "criticality": "high"})
    
    return {
        "tools": {
            "total": total_tools,
            "by_category": [{"category": c["_id"], "count": c["count"]} for c in tools_by_category],
            "critical_count": critical_tools,
            "monthly_cost": total_monthly_cost
        },
        "access": {
            "total_records": total_access_records,
            "users_with_access": users_with_access
        },
        "requests": {
            "pending": pending_requests,
            "this_week": requests_this_week
        },
        "credentials": {
            "total": total_credentials,
            "viewed_this_week": credentials_viewed_this_week
        },
        "recent_activity": recent_logs
    }


# ============== ONBOARDING / OFFBOARDING ==============

@router.post("/onboard/{user_id}")
async def onboard_user(
    user_id: str,
    department: Optional[str] = None,
    role: Optional[str] = None,
    background_tasks: BackgroundTasks = None,
    user: dict = Depends(get_current_user_dep)
):
    """Onboard a new user - assign default tools based on department/role"""
    target_user = await db.users.find_one({"id": user_id})
    if not target_user:
        raise HTTPException(status_code=404, detail="User not found")
    
    user_dept = department or target_user.get("department")
    user_role = role or target_user.get("role")
    
    # Find tools with default access for this department/role
    query = {
        "is_active": True,
        "$or": [
            {"default_for_departments": user_dept},
            {"default_for_roles": user_role}
        ]
    }
    
    default_tools = await db.acms_tools.find(query, {"_id": 0, "id": 1, "name": 1}).to_list(50)
    
    now = datetime.now(timezone.utc).isoformat()
    assigned_tools = []
    
    for tool in default_tools:
        # Check if access already exists
        existing = await db.acms_user_access.find_one({
            "user_id": user_id,
            "tool_id": tool["id"],
            "is_active": True
        })
        
        if not existing:
            access_doc = {
                "id": str(uuid.uuid4()),
                "user_id": user_id,
                "tool_id": tool["id"],
                "access_level": AccessLevel.VIEWER.value,
                "access_type": AccessType.DEFAULT.value,
                "is_active": True,
                "assigned_by": user.get("id"),
                "granted_at": now,
                "updated_at": now,
                "notes": "Auto-assigned during onboarding"
            }
            await db.acms_user_access.insert_one(access_doc)
            assigned_tools.append(tool["name"])
    
    # Log activity
    if background_tasks:
        background_tasks.add_task(
            log_activity,
            action="user_onboarded",
            entity_type="onboarding",
            entity_id=user_id,
            entity_name=target_user.get("name"),
            user_id=user.get("id"),
            user_name=user.get("name"),
            details={"assigned_tools": assigned_tools}
        )
    
    return {
        "message": f"User onboarded with {len(assigned_tools)} default tools",
        "assigned_tools": assigned_tools
    }


@router.post("/offboard/{user_id}")
async def offboard_user(
    user_id: str,
    transfer_to: Optional[str] = None,
    background_tasks: BackgroundTasks = None,
    user: dict = Depends(get_current_user_dep)
):
    """Offboard a user - revoke all access and optionally transfer"""
    target_user = await db.users.find_one({"id": user_id})
    if not target_user:
        raise HTTPException(status_code=404, detail="User not found")
    
    now = datetime.now(timezone.utc).isoformat()
    
    # Get all active access for the user
    user_access = await db.acms_user_access.find(
        {"user_id": user_id, "is_active": True},
        {"_id": 0}
    ).to_list(100)
    
    revoked_tools = []
    transferred_tools = []
    
    for access in user_access:
        tool_name = await get_tool_name(access.get("tool_id"))
        
        # Revoke access
        await db.acms_user_access.update_one(
            {"id": access["id"]},
            {"$set": {
                "is_active": False,
                "revoked_at": now,
                "revoked_by": user.get("id"),
                "revoke_reason": "offboarding"
            }}
        )
        revoked_tools.append(tool_name)
        
        # If transfer_to is specified and access level is admin/editor, transfer
        if transfer_to and access.get("access_level") in [AccessLevel.ADMIN.value, AccessLevel.EDITOR.value]:
            # Check if transfer target already has access
            existing = await db.acms_user_access.find_one({
                "user_id": transfer_to,
                "tool_id": access["tool_id"],
                "is_active": True
            })
            
            if not existing:
                new_access = {
                    "id": str(uuid.uuid4()),
                    "user_id": transfer_to,
                    "tool_id": access["tool_id"],
                    "access_level": access["access_level"],
                    "access_type": AccessType.ASSIGNED.value,
                    "is_active": True,
                    "assigned_by": user.get("id"),
                    "granted_at": now,
                    "updated_at": now,
                    "notes": f"Transferred from {target_user.get('name')} during offboarding"
                }
                await db.acms_user_access.insert_one(new_access)
                transferred_tools.append(tool_name)
    
    # Log activity
    if background_tasks:
        background_tasks.add_task(
            log_activity,
            action="user_offboarded",
            entity_type="offboarding",
            entity_id=user_id,
            entity_name=target_user.get("name"),
            user_id=user.get("id"),
            user_name=user.get("name"),
            details={
                "revoked_tools": revoked_tools,
                "transferred_tools": transferred_tools,
                "transferred_to": transfer_to
            }
        )
    
    return {
        "message": f"User offboarded. {len(revoked_tools)} access records revoked.",
        "revoked_tools": revoked_tools,
        "transferred_tools": transferred_tools if transfer_to else []
    }


@router.get("/offboard/{user_id}/preview")
async def preview_offboard(user_id: str, user: dict = Depends(get_current_user_dep)):
    """Preview what will be affected when offboarding a user"""
    target_user = await db.users.find_one({"id": user_id})
    if not target_user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Get all active access
    user_access = await db.acms_user_access.find(
        {"user_id": user_id, "is_active": True},
        {"_id": 0}
    ).to_list(100)
    
    tools_to_revoke = []
    for access in user_access:
        tool = await db.acms_tools.find_one({"id": access.get("tool_id")}, {"_id": 0, "name": 1, "criticality": 1})
        if tool:
            tools_to_revoke.append({
                "tool_name": tool.get("name"),
                "access_level": access.get("access_level"),
                "criticality": tool.get("criticality"),
                "access_id": access.get("id")
            })
    
    # Check if user owns any credentials
    owned_credentials = await db.acms_credentials.find(
        {"owner_id": user_id, "is_active": True},
        {"_id": 0, "id": 1, "tool_id": 1}
    ).to_list(50)
    
    creds_to_transfer = []
    for cred in owned_credentials:
        tool_name = await get_tool_name(cred.get("tool_id"))
        creds_to_transfer.append({
            "credential_id": cred.get("id"),
            "tool_name": tool_name
        })
    
    return {
        "user": {
            "id": user_id,
            "name": target_user.get("name"),
            "email": target_user.get("email"),
            "department": target_user.get("department")
        },
        "tools_to_revoke": tools_to_revoke,
        "credentials_to_transfer": creds_to_transfer,
        "total_access_records": len(user_access)
    }



# ============== SAAS COST MANAGEMENT ==============

class SaaSCostUpdate(BaseModel):
    monthly_cost: float
    billing_cycle: str = "monthly"  # monthly, annual, quarterly
    renewal_date: Optional[str] = None
    contract_end_date: Optional[str] = None
    notes: Optional[str] = None


@router.get("/cost-management/overview")
async def get_saas_cost_overview(
    user: dict = Depends(get_current_user_dep)
):
    """Get SaaS cost overview and spending trends"""
    now = datetime.now(timezone.utc)
    
    # Total monthly cost
    cost_result = await db.acms_tools.aggregate([
        {"$match": {"is_active": True, "monthly_cost": {"$exists": True, "$gt": 0}}},
        {"$group": {"_id": None, "total": {"$sum": "$monthly_cost"}}}
    ]).to_list(1)
    total_monthly_cost = cost_result[0]["total"] if cost_result else 0
    
    # Cost by category
    cost_by_category = await db.acms_tools.aggregate([
        {"$match": {"is_active": True, "monthly_cost": {"$exists": True, "$gt": 0}}},
        {"$group": {
            "_id": "$category",
            "total_cost": {"$sum": "$monthly_cost"},
            "tool_count": {"$sum": 1}
        }},
        {"$sort": {"total_cost": -1}}
    ]).to_list(20)
    
    # Cost by department
    cost_by_department = await db.acms_tools.aggregate([
        {"$match": {"is_active": True, "monthly_cost": {"$exists": True, "$gt": 0}}},
        {"$group": {
            "_id": "$department",
            "total_cost": {"$sum": "$monthly_cost"},
            "tool_count": {"$sum": 1}
        }},
        {"$sort": {"total_cost": -1}}
    ]).to_list(20)
    
    # Top 10 most expensive tools
    top_expensive = await db.acms_tools.find(
        {"is_active": True, "monthly_cost": {"$exists": True, "$gt": 0}},
        {"_id": 0, "id": 1, "name": 1, "monthly_cost": 1, "category": 1, "department": 1, "criticality": 1}
    ).sort("monthly_cost", -1).limit(10).to_list(10)
    
    # Get user counts for cost-per-user calculation
    for tool in top_expensive:
        user_count = await db.acms_user_access.count_documents({
            "tool_id": tool["id"],
            "is_active": True
        })
        tool["user_count"] = user_count
        tool["cost_per_user"] = round(tool["monthly_cost"] / max(user_count, 1), 2)
    
    # Tools with upcoming renewals (next 30 days)
    renewal_date = (now + timedelta(days=30)).isoformat()
    upcoming_renewals = await db.acms_tools.find(
        {
            "is_active": True,
            "renewal_date": {"$lte": renewal_date, "$gte": now.isoformat()}
        },
        {"_id": 0, "id": 1, "name": 1, "monthly_cost": 1, "renewal_date": 1}
    ).sort("renewal_date", 1).to_list(10)
    
    # Unused tools (tools with zero active access in last 30 days)
    all_tools = await db.acms_tools.find(
        {"is_active": True},
        {"_id": 0, "id": 1, "name": 1, "monthly_cost": 1}
    ).to_list(100)
    
    potentially_unused = []
    for tool in all_tools:
        active_users = await db.acms_user_access.count_documents({
            "tool_id": tool["id"],
            "is_active": True
        })
        if active_users == 0 and tool.get("monthly_cost", 0) > 0:
            potentially_unused.append({
                **tool,
                "potential_savings": tool.get("monthly_cost", 0)
            })
    
    return {
        "total_monthly_cost": total_monthly_cost,
        "projected_annual_cost": total_monthly_cost * 12,
        "cost_by_category": [
            {"category": c["_id"] or "Uncategorized", "total_cost": c["total_cost"], "tool_count": c["tool_count"]}
            for c in cost_by_category
        ],
        "cost_by_department": [
            {"department": d["_id"] or "Unassigned", "total_cost": d["total_cost"], "tool_count": d["tool_count"]}
            for d in cost_by_department
        ],
        "top_expensive_tools": top_expensive,
        "upcoming_renewals": upcoming_renewals,
        "potentially_unused_tools": potentially_unused,
        "potential_savings": sum(t.get("potential_savings", 0) for t in potentially_unused)
    }


@router.put("/tools/{tool_id}/cost")
async def update_tool_cost(
    tool_id: str,
    cost_data: SaaSCostUpdate,
    background_tasks: BackgroundTasks,
    user: dict = Depends(get_current_user_dep)
):
    """Update tool cost and billing information"""
    tool = await db.acms_tools.find_one({"id": tool_id})
    if not tool:
        raise HTTPException(status_code=404, detail="Tool not found")
    
    update_data = {
        "monthly_cost": cost_data.monthly_cost,
        "billing_cycle": cost_data.billing_cycle,
        "renewal_date": cost_data.renewal_date,
        "contract_end_date": cost_data.contract_end_date,
        "cost_notes": cost_data.notes,
        "updated_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.acms_tools.update_one({"id": tool_id}, {"$set": update_data})
    
    # Log activity
    background_tasks.add_task(
        log_activity,
        action="tool_cost_updated",
        entity_type="tool",
        entity_id=tool_id,
        entity_name=tool.get("name"),
        user_id=user.get("id"),
        user_name=user.get("name"),
        details={"monthly_cost": cost_data.monthly_cost}
    )
    
    return {"message": "Tool cost updated", "monthly_cost": cost_data.monthly_cost}


# ============== ACCESS REVIEW REPORTS ==============

class AccessReviewReportRequest(BaseModel):
    report_type: str = "quarterly"  # monthly, quarterly, annual
    department: Optional[str] = None
    include_inactive: bool = False


@router.post("/reports/access-review")
async def generate_access_review_report(
    request: AccessReviewReportRequest,
    background_tasks: BackgroundTasks,
    user: dict = Depends(get_current_user_dep)
):
    """Generate an access review report for auditing purposes"""
    now = datetime.now(timezone.utc)
    
    # Calculate period boundaries
    if request.report_type == "monthly":
        period_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
        period_name = now.strftime("%B %Y")
    elif request.report_type == "quarterly":
        quarter_month = ((now.month - 1) // 3) * 3 + 1
        period_start = now.replace(month=quarter_month, day=1, hour=0, minute=0, second=0, microsecond=0)
        quarter_num = (now.month - 1) // 3 + 1
        period_name = f"Q{quarter_num} {now.year}"
    else:  # annual
        period_start = now.replace(month=1, day=1, hour=0, minute=0, second=0, microsecond=0)
        period_name = str(now.year)
    
    period_start_str = period_start.isoformat()
    
    # Get all active access records
    access_query = {"is_active": True}
    if not request.include_inactive:
        access_query["is_active"] = True
    
    access_records = await db.acms_user_access.find(access_query, {"_id": 0}).to_list(1000)
    
    # Enrich with user and tool details
    user_access_summary = {}
    tool_access_summary = {}
    
    for record in access_records:
        user_id = record.get("user_id")
        tool_id = record.get("tool_id")
        
        # Get user info
        if user_id not in user_access_summary:
            user_info = await db.users.find_one({"id": user_id}, {"name": 1, "email": 1, "department": 1, "status": 1})
            if user_info:
                # Apply department filter
                if request.department and user_info.get("department") != request.department:
                    continue
                user_access_summary[user_id] = {
                    "user_id": user_id,
                    "name": user_info.get("name", "Unknown"),
                    "email": user_info.get("email", ""),
                    "department": user_info.get("department", ""),
                    "status": user_info.get("status", "active"),
                    "tools": [],
                    "high_privilege_count": 0,
                    "total_tools": 0
                }
        
        if user_id in user_access_summary:
            tool_info = await db.acms_tools.find_one({"id": tool_id}, {"name": 1, "criticality": 1, "category": 1})
            tool_entry = {
                "tool_id": tool_id,
                "tool_name": tool_info.get("name") if tool_info else "Unknown",
                "access_level": record.get("access_level"),
                "criticality": tool_info.get("criticality") if tool_info else "medium",
                "granted_at": record.get("granted_at"),
                "access_type": record.get("access_type")
            }
            user_access_summary[user_id]["tools"].append(tool_entry)
            user_access_summary[user_id]["total_tools"] += 1
            if record.get("access_level") in ["admin", "editor"]:
                user_access_summary[user_id]["high_privilege_count"] += 1
        
        # Tool summary
        if tool_id not in tool_access_summary:
            tool_info = await db.acms_tools.find_one({"id": tool_id}, {"name": 1, "criticality": 1, "monthly_cost": 1})
            tool_access_summary[tool_id] = {
                "tool_id": tool_id,
                "tool_name": tool_info.get("name") if tool_info else "Unknown",
                "criticality": tool_info.get("criticality") if tool_info else "medium",
                "monthly_cost": tool_info.get("monthly_cost", 0),
                "users": [],
                "admin_count": 0,
                "editor_count": 0,
                "viewer_count": 0
            }
        
        tool_access_summary[tool_id]["users"].append({
            "user_id": user_id,
            "access_level": record.get("access_level")
        })
        if record.get("access_level") == "admin":
            tool_access_summary[tool_id]["admin_count"] += 1
        elif record.get("access_level") == "editor":
            tool_access_summary[tool_id]["editor_count"] += 1
        else:
            tool_access_summary[tool_id]["viewer_count"] += 1
    
    # Access changes in the period
    access_changes = await db.acms_audit_logs.find({
        "timestamp": {"$gte": period_start_str},
        "action": {"$in": ["access_granted", "access_revoked", "access_updated"]}
    }, {"_id": 0}).sort("timestamp", -1).to_list(500)
    
    # Identify risk indicators
    risk_indicators = []
    
    # Users with high-privilege access to critical tools
    for user_id, data in user_access_summary.items():
        critical_admin_access = [t for t in data["tools"] if t["criticality"] == "high" and t["access_level"] == "admin"]
        if len(critical_admin_access) > 3:
            risk_indicators.append({
                "type": "high_privilege_concentration",
                "user_id": user_id,
                "user_name": data["name"],
                "description": f"User has admin access to {len(critical_admin_access)} critical tools",
                "severity": "high"
            })
    
    # Tools with many admins
    for tool_id, data in tool_access_summary.items():
        if data["admin_count"] > 5:
            risk_indicators.append({
                "type": "excessive_admins",
                "tool_id": tool_id,
                "tool_name": data["tool_name"],
                "description": f"Tool has {data['admin_count']} admin users",
                "severity": "medium"
            })
    
    # Generate report
    report = {
        "id": str(uuid.uuid4()),
        "report_type": request.report_type,
        "period_name": period_name,
        "period_start": period_start_str,
        "period_end": now.isoformat(),
        "generated_at": now.isoformat(),
        "generated_by": user.get("id"),
        "generated_by_name": user.get("name"),
        "department_filter": request.department,
        "summary": {
            "total_users_with_access": len(user_access_summary),
            "total_tools_in_use": len(tool_access_summary),
            "total_access_records": len(access_records),
            "access_changes_in_period": len(access_changes),
            "risk_indicators_count": len(risk_indicators)
        },
        "user_access_summary": list(user_access_summary.values()),
        "tool_access_summary": list(tool_access_summary.values()),
        "access_changes": access_changes[:100],  # Limit to recent 100
        "risk_indicators": risk_indicators
    }
    
    # Save report to database
    await db.acms_reports.insert_one(report)
    
    # Log activity
    background_tasks.add_task(
        log_activity,
        action="access_review_report_generated",
        entity_type="report",
        entity_id=report["id"],
        entity_name=f"Access Review - {period_name}",
        user_id=user.get("id"),
        user_name=user.get("name")
    )
    
    del report["_id"]
    return report


@router.get("/reports")
async def list_access_reports(
    report_type: Optional[str] = None,
    skip: int = 0,
    limit: int = 20,
    user: dict = Depends(get_current_user_dep)
):
    """List generated access review reports"""
    query = {}
    if report_type:
        query["report_type"] = report_type
    
    reports = await db.acms_reports.find(
        query,
        {"_id": 0, "id": 1, "report_type": 1, "period_name": 1, "generated_at": 1, "generated_by_name": 1, "summary": 1}
    ).sort("generated_at", -1).skip(skip).limit(limit).to_list(limit)
    
    total = await db.acms_reports.count_documents(query)
    
    return {
        "reports": reports,
        "total": total,
        "skip": skip,
        "limit": limit
    }


@router.get("/reports/{report_id}")
async def get_access_report(report_id: str, user: dict = Depends(get_current_user_dep)):
    """Get a specific access review report"""
    report = await db.acms_reports.find_one({"id": report_id}, {"_id": 0})
    if not report:
        raise HTTPException(status_code=404, detail="Report not found")
    return report


# ============== PASSWORD ROTATION REMINDERS ==============

class PasswordRotationConfig(BaseModel):
    rotation_days: int = 90  # Days between required password changes
    notify_days_before: int = 14  # Days before expiry to start notifications
    is_enabled: bool = True


@router.put("/credentials/{credential_id}/rotation-config")
async def set_password_rotation_config(
    credential_id: str,
    config: PasswordRotationConfig,
    background_tasks: BackgroundTasks,
    user: dict = Depends(get_current_user_dep)
):
    """Set password rotation policy for a credential"""
    cred = await db.acms_credentials.find_one({"id": credential_id})
    if not cred:
        raise HTTPException(status_code=404, detail="Credential not found")
    
    rotation_config = {
        "rotation_days": config.rotation_days,
        "notify_days_before": config.notify_days_before,
        "is_enabled": config.is_enabled,
        "updated_at": datetime.now(timezone.utc).isoformat(),
        "updated_by": user.get("id")
    }
    
    await db.acms_credentials.update_one(
        {"id": credential_id},
        {"$set": {"rotation_config": rotation_config}}
    )
    
    background_tasks.add_task(
        log_activity,
        action="rotation_policy_updated",
        entity_type="credential",
        entity_id=credential_id,
        entity_name=f"Credential #{credential_id[:8]}",
        user_id=user.get("id"),
        user_name=user.get("name"),
        details={"rotation_days": config.rotation_days}
    )
    
    return {"message": "Rotation policy updated", "config": rotation_config}


@router.post("/credentials/send-rotation-reminders")
async def send_rotation_reminders(
    background_tasks: BackgroundTasks,
    user: dict = Depends(get_current_user_dep)
):
    """Send password rotation reminders for credentials that are due"""
    now = datetime.now(timezone.utc)
    
    credentials = await db.acms_credentials.find(
        {"is_active": True},
        {"_id": 0}
    ).to_list(500)
    
    reminders_sent = []
    
    for cred in credentials:
        rotation_config = cred.get("rotation_config", {})
        if not rotation_config.get("is_enabled", True):
            continue
        
        rotation_days = rotation_config.get("rotation_days", 90)
        notify_days = rotation_config.get("notify_days_before", 14)
        
        password_history = cred.get("password_history", [])
        if not password_history:
            continue
        
        last_change = password_history[-1].get("changed_at")
        if not last_change:
            continue
        
        last_change_date = datetime.fromisoformat(last_change.replace('Z', '+00:00'))
        next_rotation_date = last_change_date + timedelta(days=rotation_days)
        days_until_rotation = (next_rotation_date - now).days
        
        if days_until_rotation <= notify_days and days_until_rotation > -30:
            # Get tool name
            tool = await db.acms_tools.find_one({"id": cred.get("tool_id")}, {"name": 1})
            tool_name = tool.get("name") if tool else "Unknown Tool"
            
            # Get owner info
            owner = await db.users.find_one({"id": cred.get("owner_id")}, {"name": 1, "email": 1})
            
            if owner and owner.get("email"):
                reminder = {
                    "credential_id": cred.get("id"),
                    "tool_name": tool_name,
                    "owner_email": owner.get("email"),
                    "owner_name": owner.get("name"),
                    "days_until_rotation": days_until_rotation,
                    "status": "overdue" if days_until_rotation < 0 else "due_soon"
                }
                reminders_sent.append(reminder)
                
                # Send email notification (would be actual email in production)
                if _email_service:
                    subject = f"Password Rotation {'Overdue' if days_until_rotation < 0 else 'Reminder'}: {tool_name}"
                    body = f"""
                    <h2>Password Rotation {'Required' if days_until_rotation < 0 else 'Reminder'}</h2>
                    <p>Hi {owner.get('name')},</p>
                    <p>The password for <strong>{tool_name}</strong> {'is overdue for rotation' if days_until_rotation < 0 else 'needs to be rotated soon'}.</p>
                    <ul>
                        <li><strong>Login:</strong> {cred.get('login_email')}</li>
                        <li><strong>{'Days Overdue' if days_until_rotation < 0 else 'Days Until Rotation'}:</strong> {abs(days_until_rotation)}</li>
                    </ul>
                    <p>Please update the password in the Credential Vault.</p>
                    """
                    try:
                        await _email_service.send_email(
                            to_email=owner.get("email"),
                            subject=subject,
                            html_content=body
                        )
                    except Exception as e:
                        print(f"Failed to send reminder email: {e}")
    
    # Log activity
    background_tasks.add_task(
        log_activity,
        action="rotation_reminders_sent",
        entity_type="system",
        entity_id="rotation_reminders",
        entity_name="Password Rotation Reminders",
        user_id=user.get("id"),
        user_name=user.get("name"),
        details={"reminders_count": len(reminders_sent)}
    )
    
    return {
        "message": f"Sent {len(reminders_sent)} rotation reminders",
        "reminders": reminders_sent
    }
