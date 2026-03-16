"""
Shared Mailbox Management API
Allows admins to configure shared mailboxes and assign access to users/roles
"""
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel, EmailStr
from typing import List, Optional
from datetime import datetime, timezone
import uuid

router = APIRouter(prefix="/shared-mailboxes", tags=["Shared Mailboxes"])

# Will be initialized from server.py
db = None


def init_shared_mailboxes(database):
    """Initialize with database connection"""
    global db
    db = database


# Pydantic Models
class SharedMailboxCreate(BaseModel):
    email: EmailStr
    display_name: str
    description: Optional[str] = None
    allowed_users: List[str] = []  # List of user IDs
    allowed_roles: List[str] = []  # List of role names (e.g., "admin", "marketing")
    allowed_departments: List[str] = []  # List of department names
    is_active: bool = True


class SharedMailboxUpdate(BaseModel):
    email: Optional[EmailStr] = None
    display_name: Optional[str] = None
    description: Optional[str] = None
    allowed_users: Optional[List[str]] = None
    allowed_roles: Optional[List[str]] = None
    allowed_departments: Optional[List[str]] = None
    is_active: Optional[bool] = None


class SharedMailboxResponse(BaseModel):
    id: str
    email: str
    display_name: str
    description: Optional[str]
    allowed_users: List[str]
    allowed_roles: List[str]
    allowed_departments: List[str]
    is_active: bool
    created_at: str
    updated_at: str
    created_by: Optional[str]


def create_router(get_current_user):
    """Create router with dependency injection"""
    
    @router.get("")
    async def list_shared_mailboxes(
        current_user: dict = Depends(get_current_user)
    ):
        """List all shared mailboxes (admin) or user's accessible mailboxes"""
        user_role = current_user.get("role", "")
        is_admin = user_role in ["super_admin", "admin"] or current_user.get("can_manage_users")
        
        if is_admin:
            # Admins see all mailboxes
            mailboxes = await db.shared_mailboxes.find(
                {}, {"_id": 0}
            ).sort("display_name", 1).to_list(100)
        else:
            # Regular users see only their accessible mailboxes
            user_id = current_user.get("id")
            user_departments = current_user.get("departments", [])
            
            mailboxes = await db.shared_mailboxes.find({
                "is_active": True,
                "$or": [
                    {"allowed_users": user_id},
                    {"allowed_roles": user_role},
                    {"allowed_departments": {"$in": user_departments}},
                    {"allowed_users": [],"allowed_roles": [], "allowed_departments": []}  # Empty = all users
                ]
            }, {"_id": 0}).sort("display_name", 1).to_list(100)
        
        return mailboxes
    
    
    @router.get("/my-mailboxes")
    async def get_my_shared_mailboxes(
        current_user: dict = Depends(get_current_user)
    ):
        """Get shared mailboxes accessible to current user"""
        user_id = current_user.get("id")
        user_role = current_user.get("role", "")
        user_departments = current_user.get("departments", [])
        
        # Build query for user's accessible mailboxes
        mailboxes = await db.shared_mailboxes.find({
            "is_active": True,
            "$or": [
                {"allowed_users": user_id},
                {"allowed_roles": user_role},
                {"allowed_departments": {"$in": user_departments if user_departments else ["__none__"]}},
                # If all arrays are empty, mailbox is accessible to everyone
                {"$and": [
                    {"allowed_users": {"$size": 0}},
                    {"allowed_roles": {"$size": 0}},
                    {"allowed_departments": {"$size": 0}}
                ]}
            ]
        }, {"_id": 0, "id": 1, "email": 1, "display_name": 1}).sort("display_name", 1).to_list(50)
        
        return mailboxes
    
    
    @router.post("")
    async def create_shared_mailbox(
        mailbox: SharedMailboxCreate,
        current_user: dict = Depends(get_current_user)
    ):
        """Create a new shared mailbox (admin only)"""
        user_role = current_user.get("role", "")
        is_admin = user_role in ["super_admin", "admin"] or current_user.get("can_manage_users")
        
        if not is_admin:
            raise HTTPException(status_code=403, detail="Only admins can create shared mailboxes")
        
        # Check if email already exists
        existing = await db.shared_mailboxes.find_one({"email": mailbox.email.lower()})
        if existing:
            raise HTTPException(status_code=400, detail="Shared mailbox with this email already exists")
        
        now = datetime.now(timezone.utc).isoformat()
        mailbox_doc = {
            "id": str(uuid.uuid4()),
            "email": mailbox.email.lower(),
            "display_name": mailbox.display_name,
            "description": mailbox.description,
            "allowed_users": mailbox.allowed_users,
            "allowed_roles": mailbox.allowed_roles,
            "allowed_departments": mailbox.allowed_departments,
            "is_active": mailbox.is_active,
            "created_at": now,
            "updated_at": now,
            "created_by": current_user.get("id")
        }
        
        await db.shared_mailboxes.insert_one(mailbox_doc)
        mailbox_doc.pop("_id", None)
        
        return mailbox_doc
    
    
    @router.put("/{mailbox_id}")
    async def update_shared_mailbox(
        mailbox_id: str,
        update: SharedMailboxUpdate,
        current_user: dict = Depends(get_current_user)
    ):
        """Update a shared mailbox (admin only)"""
        user_role = current_user.get("role", "")
        is_admin = user_role in ["super_admin", "admin"] or current_user.get("can_manage_users")
        
        if not is_admin:
            raise HTTPException(status_code=403, detail="Only admins can update shared mailboxes")
        
        existing = await db.shared_mailboxes.find_one({"id": mailbox_id})
        if not existing:
            raise HTTPException(status_code=404, detail="Shared mailbox not found")
        
        update_data = {k: v for k, v in update.dict().items() if v is not None}
        update_data["updated_at"] = datetime.now(timezone.utc).isoformat()
        
        await db.shared_mailboxes.update_one({"id": mailbox_id}, {"$set": update_data})
        
        updated = await db.shared_mailboxes.find_one({"id": mailbox_id}, {"_id": 0})
        return updated
    
    
    @router.delete("/{mailbox_id}")
    async def delete_shared_mailbox(
        mailbox_id: str,
        current_user: dict = Depends(get_current_user)
    ):
        """Delete a shared mailbox (admin only)"""
        user_role = current_user.get("role", "")
        is_admin = user_role in ["super_admin", "admin"] or current_user.get("can_manage_users")
        
        if not is_admin:
            raise HTTPException(status_code=403, detail="Only admins can delete shared mailboxes")
        
        result = await db.shared_mailboxes.delete_one({"id": mailbox_id})
        if result.deleted_count == 0:
            raise HTTPException(status_code=404, detail="Shared mailbox not found")
        
        return {"message": "Shared mailbox deleted"}
    
    
    @router.get("/{mailbox_id}")
    async def get_shared_mailbox(
        mailbox_id: str,
        current_user: dict = Depends(get_current_user)
    ):
        """Get a specific shared mailbox"""
        mailbox = await db.shared_mailboxes.find_one({"id": mailbox_id}, {"_id": 0})
        if not mailbox:
            raise HTTPException(status_code=404, detail="Shared mailbox not found")
        
        # Check access
        user_role = current_user.get("role", "")
        is_admin = user_role in ["super_admin", "admin"] or current_user.get("can_manage_users")
        
        if not is_admin:
            user_id = current_user.get("id")
            user_departments = current_user.get("departments", [])
            
            has_access = (
                user_id in mailbox.get("allowed_users", []) or
                user_role in mailbox.get("allowed_roles", []) or
                any(d in mailbox.get("allowed_departments", []) for d in user_departments) or
                (not mailbox.get("allowed_users") and not mailbox.get("allowed_roles") and not mailbox.get("allowed_departments"))
            )
            
            if not has_access:
                raise HTTPException(status_code=403, detail="Access denied to this shared mailbox")
        
        return mailbox
    
    return router
