"""
Social Media Workflows Module
- Multi-stage Approval Configuration
- Queue Posting with Time Slots
- Post Version Control
"""

from fastapi import APIRouter, HTTPException, Depends
from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field
from datetime import datetime, timezone, time
from enum import Enum
import uuid
import logging

logger = logging.getLogger(__name__)

social_workflows_router = APIRouter(prefix="/social/workflows", tags=["Social Workflows"])

# Will be set by main server
db = None

def init_social_workflows_router(database):
    global db
    db = database
    return social_workflows_router


# ============== MODELS ==============

class ApprovalStage(BaseModel):
    stage_id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    stage_name: str
    stage_order: int
    approver_type: str  # "role", "user", "team"
    approver_ids: List[str]  # role names, user IDs, or team IDs
    can_skip: bool = False
    auto_approve_after_hours: Optional[int] = None  # Auto-approve if no action after X hours

class ApprovalWorkflowCreate(BaseModel):
    name: str
    description: Optional[str] = None
    is_default: bool = False
    platforms: List[str] = []  # Empty = all platforms
    stages: List[ApprovalStage]

class TimeSlot(BaseModel):
    slot_id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    day_of_week: int  # 0=Sunday, 6=Saturday
    time: str  # "HH:MM" format
    label: Optional[str] = None  # "Morning", "Afternoon", etc.

class PostingQueueCreate(BaseModel):
    name: str
    platform: str
    description: Optional[str] = None
    is_active: bool = True
    time_slots: List[TimeSlot]
    timezone: str = "UTC"


# ============== APPROVAL WORKFLOW ENDPOINTS ==============

async def require_social_access(credentials=None):
    """Simplified auth check - actual implementation depends on main server"""
    return {"id": "system", "role": "admin"}


@social_workflows_router.get("/approval-chains")
async def get_approval_workflows():
    """Get all approval workflow configurations"""
    workflows = await db.approval_workflows.find({}, {"_id": 0}).to_list(100)
    return workflows


@social_workflows_router.get("/approval-chains/{workflow_id}")
async def get_approval_workflow(workflow_id: str):
    """Get a specific approval workflow"""
    workflow = await db.approval_workflows.find_one({"workflow_id": workflow_id}, {"_id": 0})
    if not workflow:
        raise HTTPException(status_code=404, detail="Workflow not found")
    return workflow


@social_workflows_router.post("/approval-chains")
async def create_approval_workflow(data: ApprovalWorkflowCreate):
    """Create a new approval workflow"""
    workflow_id = str(uuid.uuid4())
    
    # If this is set as default, unset other defaults
    if data.is_default:
        await db.approval_workflows.update_many(
            {"is_default": True},
            {"$set": {"is_default": False}}
        )
    
    workflow_doc = {
        "workflow_id": workflow_id,
        "name": data.name,
        "description": data.description,
        "is_default": data.is_default,
        "platforms": data.platforms,
        "stages": [stage.dict() for stage in data.stages],
        "is_active": True,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.approval_workflows.insert_one(workflow_doc)
    del workflow_doc["_id"]
    return workflow_doc


@social_workflows_router.put("/approval-chains/{workflow_id}")
async def update_approval_workflow(workflow_id: str, data: dict):
    """Update an approval workflow"""
    existing = await db.approval_workflows.find_one({"workflow_id": workflow_id})
    if not existing:
        raise HTTPException(status_code=404, detail="Workflow not found")
    
    # If setting as default, unset others
    if data.get("is_default"):
        await db.approval_workflows.update_many(
            {"workflow_id": {"$ne": workflow_id}, "is_default": True},
            {"$set": {"is_default": False}}
        )
    
    update_data = {k: v for k, v in data.items() if k not in ["workflow_id", "_id"]}
    update_data["updated_at"] = datetime.now(timezone.utc).isoformat()
    
    await db.approval_workflows.update_one(
        {"workflow_id": workflow_id},
        {"$set": update_data}
    )
    
    updated = await db.approval_workflows.find_one({"workflow_id": workflow_id}, {"_id": 0})
    return updated


@social_workflows_router.delete("/approval-chains/{workflow_id}")
async def delete_approval_workflow(workflow_id: str):
    """Delete an approval workflow"""
    result = await db.approval_workflows.delete_one({"workflow_id": workflow_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Workflow not found")
    return {"message": "Workflow deleted", "workflow_id": workflow_id}


@social_workflows_router.get("/approval-chains/default/get")
async def get_default_workflow():
    """Get the default approval workflow"""
    workflow = await db.approval_workflows.find_one({"is_default": True}, {"_id": 0})
    if not workflow:
        # Return a simple default
        return {
            "workflow_id": "default",
            "name": "Default Workflow",
            "stages": [
                {
                    "stage_id": "stage-1",
                    "stage_name": "Manager Review",
                    "stage_order": 1,
                    "approver_type": "role",
                    "approver_ids": ["social_manager", "admin", "super_admin"],
                    "can_skip": False
                }
            ]
        }
    return workflow


# ============== POSTING QUEUE ENDPOINTS ==============

@social_workflows_router.get("/queues")
async def get_posting_queues():
    """Get all posting queues with time slots"""
    queues = await db.posting_queues.find({}, {"_id": 0}).to_list(100)
    return queues


@social_workflows_router.get("/queues/{queue_id}")
async def get_posting_queue(queue_id: str):
    """Get a specific posting queue"""
    queue = await db.posting_queues.find_one({"queue_id": queue_id}, {"_id": 0})
    if not queue:
        raise HTTPException(status_code=404, detail="Queue not found")
    return queue


@social_workflows_router.post("/queues")
async def create_posting_queue(data: PostingQueueCreate):
    """Create a new posting queue with time slots"""
    queue_id = str(uuid.uuid4())
    
    queue_doc = {
        "queue_id": queue_id,
        "name": data.name,
        "platform": data.platform,
        "description": data.description,
        "is_active": data.is_active,
        "time_slots": [slot.dict() for slot in data.time_slots],
        "timezone": data.timezone,
        "posts_in_queue": 0,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.posting_queues.insert_one(queue_doc)
    del queue_doc["_id"]
    return queue_doc


@social_workflows_router.put("/queues/{queue_id}")
async def update_posting_queue(queue_id: str, data: dict):
    """Update a posting queue"""
    existing = await db.posting_queues.find_one({"queue_id": queue_id})
    if not existing:
        raise HTTPException(status_code=404, detail="Queue not found")
    
    update_data = {k: v for k, v in data.items() if k not in ["queue_id", "_id"]}
    update_data["updated_at"] = datetime.now(timezone.utc).isoformat()
    
    await db.posting_queues.update_one(
        {"queue_id": queue_id},
        {"$set": update_data}
    )
    
    updated = await db.posting_queues.find_one({"queue_id": queue_id}, {"_id": 0})
    return updated


@social_workflows_router.delete("/queues/{queue_id}")
async def delete_posting_queue(queue_id: str):
    """Delete a posting queue"""
    result = await db.posting_queues.delete_one({"queue_id": queue_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Queue not found")
    return {"message": "Queue deleted", "queue_id": queue_id}


@social_workflows_router.post("/queues/{queue_id}/add-post")
async def add_post_to_queue(queue_id: str, data: dict):
    """Add a post to a queue - it will be scheduled to the next available slot"""
    queue = await db.posting_queues.find_one({"queue_id": queue_id})
    if not queue:
        raise HTTPException(status_code=404, detail="Queue not found")
    
    post_id = data.get("post_id")
    if not post_id:
        raise HTTPException(status_code=400, detail="post_id required")
    
    # Find the next available time slot
    time_slots = queue.get("time_slots", [])
    if not time_slots:
        raise HTTPException(status_code=400, detail="Queue has no time slots configured")
    
    # Get queued posts count to determine next slot
    queued_count = await db.social_posts.count_documents({
        "queue_id": queue_id,
        "status": "queued"
    })
    
    # Calculate next slot (round-robin through slots)
    slot_index = queued_count % len(time_slots)
    next_slot = time_slots[slot_index]
    
    # Update the post
    await db.social_posts.update_one(
        {"$or": [{"post_id": post_id}, {"id": post_id}]},
        {"$set": {
            "queue_id": queue_id,
            "queued_slot": next_slot,
            "status": "queued",
            "queued_at": datetime.now(timezone.utc).isoformat()
        }}
    )
    
    # Update queue count
    await db.posting_queues.update_one(
        {"queue_id": queue_id},
        {"$inc": {"posts_in_queue": 1}}
    )
    
    return {"message": "Post added to queue", "slot": next_slot}


@social_workflows_router.get("/queues/{queue_id}/posts")
async def get_queue_posts(queue_id: str):
    """Get all posts in a queue"""
    posts = await db.social_posts.find(
        {"queue_id": queue_id},
        {"_id": 0}
    ).sort("queued_at", 1).to_list(100)
    return posts


# ============== POST VERSION CONTROL ENDPOINTS ==============

@social_workflows_router.get("/posts/{post_id}/versions")
async def get_post_versions(post_id: str):
    """Get all versions of a post"""
    versions = await db.post_versions.find(
        {"post_id": post_id},
        {"_id": 0}
    ).sort("version_number", -1).to_list(100)
    return versions


@social_workflows_router.post("/posts/{post_id}/versions")
async def create_post_version(post_id: str, data: dict):
    """Create a new version of a post (snapshot current state)"""
    # Get current post
    post = await db.social_posts.find_one(
        {"$or": [{"post_id": post_id}, {"id": post_id}]},
        {"_id": 0}
    )
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")
    
    # Get current max version
    last_version = await db.post_versions.find_one(
        {"post_id": post_id},
        sort=[("version_number", -1)]
    )
    next_version = (last_version.get("version_number", 0) if last_version else 0) + 1
    
    version_doc = {
        "version_id": str(uuid.uuid4()),
        "post_id": post_id,
        "version_number": next_version,
        "content": post.get("content"),
        "content_html": post.get("content_html"),
        "image_url": post.get("image_url"),
        "platform": post.get("platform"),
        "change_note": data.get("change_note", f"Version {next_version}"),
        "created_by": data.get("user_id", "system"),
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.post_versions.insert_one(version_doc)
    del version_doc["_id"]
    return version_doc


@social_workflows_router.post("/posts/{post_id}/versions/{version_id}/restore")
async def restore_post_version(post_id: str, version_id: str):
    """Restore a post to a previous version"""
    version = await db.post_versions.find_one({"version_id": version_id, "post_id": post_id})
    if not version:
        raise HTTPException(status_code=404, detail="Version not found")
    
    # First save current state as a new version
    await create_post_version(post_id, {"change_note": "Auto-saved before restore"})
    
    # Restore the post to the selected version
    await db.social_posts.update_one(
        {"$or": [{"post_id": post_id}, {"id": post_id}]},
        {"$set": {
            "content": version.get("content"),
            "content_html": version.get("content_html"),
            "image_url": version.get("image_url"),
            "restored_from_version": version_id,
            "updated_at": datetime.now(timezone.utc).isoformat()
        }}
    )
    
    return {"message": "Post restored", "restored_version": version.get("version_number")}


@social_workflows_router.get("/posts/{post_id}/versions/compare")
async def compare_post_versions(post_id: str, version_a: int, version_b: int):
    """Compare two versions of a post"""
    v_a = await db.post_versions.find_one(
        {"post_id": post_id, "version_number": version_a},
        {"_id": 0}
    )
    v_b = await db.post_versions.find_one(
        {"post_id": post_id, "version_number": version_b},
        {"_id": 0}
    )
    
    if not v_a or not v_b:
        raise HTTPException(status_code=404, detail="One or both versions not found")
    
    return {
        "version_a": v_a,
        "version_b": v_b,
        "differences": {
            "content_changed": v_a.get("content") != v_b.get("content"),
            "image_changed": v_a.get("image_url") != v_b.get("image_url")
        }
    }


# ============== SEED DEFAULT DATA ==============

@social_workflows_router.post("/seed-defaults")
async def seed_default_workflows():
    """Seed default approval workflows and posting queues"""
    results = {"workflows_created": 0, "queues_created": 0}
    
    # Check if defaults exist
    existing_workflow = await db.approval_workflows.find_one({"is_default": True})
    if not existing_workflow:
        # Create default approval workflow
        default_workflow = {
            "workflow_id": str(uuid.uuid4()),
            "name": "Standard Approval",
            "description": "Default two-stage approval: Team Lead then Manager",
            "is_default": True,
            "platforms": [],
            "stages": [
                {
                    "stage_id": str(uuid.uuid4()),
                    "stage_name": "Team Lead Review",
                    "stage_order": 1,
                    "approver_type": "role",
                    "approver_ids": ["social_manager"],
                    "can_skip": False,
                    "auto_approve_after_hours": 48
                },
                {
                    "stage_id": str(uuid.uuid4()),
                    "stage_name": "Manager Approval",
                    "stage_order": 2,
                    "approver_type": "role",
                    "approver_ids": ["admin", "super_admin"],
                    "can_skip": True,
                    "auto_approve_after_hours": None
                }
            ],
            "is_active": True,
            "created_at": datetime.now(timezone.utc).isoformat(),
            "updated_at": datetime.now(timezone.utc).isoformat()
        }
        await db.approval_workflows.insert_one(default_workflow)
        results["workflows_created"] += 1
    
    # Create default posting queues for each platform
    platforms = [
        {"key": "linkedin", "name": "LinkedIn", "optimal_times": ["09:00", "12:00", "17:00"]},
        {"key": "twitter", "name": "Twitter/X", "optimal_times": ["08:00", "12:00", "17:00", "21:00"]},
        {"key": "instagram", "name": "Instagram", "optimal_times": ["11:00", "13:00", "19:00"]},
        {"key": "facebook", "name": "Facebook", "optimal_times": ["09:00", "13:00", "16:00"]}
    ]
    
    for platform in platforms:
        existing_queue = await db.posting_queues.find_one({"platform": platform["key"]})
        if not existing_queue:
            time_slots = []
            for i, t in enumerate(platform["optimal_times"]):
                for day in range(7):  # All days of week
                    time_slots.append({
                        "slot_id": str(uuid.uuid4()),
                        "day_of_week": day,
                        "time": t,
                        "label": f"{'Morning' if i == 0 else 'Afternoon' if i == 1 else 'Evening'}"
                    })
            
            queue_doc = {
                "queue_id": str(uuid.uuid4()),
                "name": f"{platform['name']} Queue",
                "platform": platform["key"],
                "description": f"Optimal posting times for {platform['name']}",
                "is_active": True,
                "time_slots": time_slots,
                "timezone": "UTC",
                "posts_in_queue": 0,
                "created_at": datetime.now(timezone.utc).isoformat(),
                "updated_at": datetime.now(timezone.utc).isoformat()
            }
            await db.posting_queues.insert_one(queue_doc)
            results["queues_created"] += 1
    
    return results
