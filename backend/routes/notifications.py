"""
Notification Routes for Alert & Notification System
"""
from fastapi import APIRouter, HTTPException, Depends, Query
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from typing import List, Optional
from datetime import datetime, timezone
import uuid
import logging
import asyncio

from models.notifications import (
    NotificationCreate, NotificationResponse, NotificationPriority,
    NotificationCategory, NotificationType,
    NotificationPreferencesUpdate, NotificationPreferencesResponse
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/notifications", tags=["Notifications"])
security = HTTPBearer()

# Will be set by server.py
db = None
_get_current_user_func = None
ws_manager = None


def init_notifications_router(database, auth_dep, websocket_manager):
    """Initialize router with dependencies"""
    global db, _get_current_user_func, ws_manager
    db = database
    _get_current_user_func = auth_dep
    ws_manager = websocket_manager


async def get_current_user_dep(credentials: HTTPAuthorizationCredentials = Depends(security)):
    """Internal dependency that wraps the auth function"""
    if _get_current_user_func is None:
        raise HTTPException(status_code=500, detail="Auth not initialized")
    return await _get_current_user_func(credentials)


# ============== NOTIFICATION CRUD ==============

@router.get("", response_model=List[NotificationResponse])
async def get_notifications(
    category: Optional[str] = None,
    is_read: Optional[bool] = None,
    priority: Optional[str] = None,
    limit: int = Query(default=50, le=100),
    skip: int = 0,
    user: dict = Depends(get_current_user_dep)
):
    """Get user's notifications with filters"""
    query = {"user_id": user["id"]}
    
    if category:
        query["category"] = category
    if is_read is not None:
        query["is_read"] = is_read
    if priority:
        query["priority"] = priority
    
    notifications = await db.notifications.find(
        query, {"_id": 0}
    ).sort("created_at", -1).skip(skip).limit(limit).to_list(limit)
    
    return notifications


@router.get("/unread-count")
async def get_unread_count(user: dict = Depends(get_current_user_dep)):
    """Get count of unread notifications"""
    count = await db.notifications.count_documents({
        "user_id": user["id"],
        "is_read": False
    })
    
    return {"unread_count": count}


@router.get("/summary")
async def get_notification_summary(user: dict = Depends(get_current_user_dep)):
    """Get notification summary by category"""
    pipeline = [
        {"$match": {"user_id": user["id"], "is_read": False}},
        {"$group": {"_id": "$category", "count": {"$sum": 1}}}
    ]
    
    results = await db.notifications.aggregate(pipeline).to_list(20)
    
    summary = {r["_id"]: r["count"] for r in results}
    total = sum(summary.values())
    
    return {
        "total_unread": total,
        "by_category": summary
    }


@router.get("/grouped")
async def get_grouped_notifications(
    user: dict = Depends(get_current_user_dep),
    limit: int = Query(default=20, le=50)
):
    """
    Get notifications grouped by similar type/entity for smart display.
    Groups notifications like:
    - Multiple task assignments -> "3 new tasks assigned"
    - Multiple comments on same task -> "5 comments on Task X"
    - Multiple mentions -> "You were mentioned 4 times"
    """
    # Get recent notifications
    notifications = await db.notifications.find(
        {"user_id": user["id"], "is_read": False},
        {"_id": 0}
    ).sort("created_at", -1).limit(100).to_list(100)
    
    if not notifications:
        return {"groups": [], "ungrouped": []}
    
    # Group by type + entity (for entity-specific) or just type (for general)
    groups = {}
    ungrouped = []
    
    for n in notifications:
        notification_type = n.get("type", "")
        entity_id = n.get("entity_id")
        category = n.get("category", "system")
        
        # Determine grouping key
        if notification_type in ["task_comment", "task_status_changed"] and entity_id:
            # Group by specific entity
            key = f"{notification_type}:{entity_id}"
        elif notification_type in ["task_assigned", "user_mentioned", "email_received"]:
            # Group by type only
            key = notification_type
        else:
            # Don't group - show individually
            ungrouped.append(n)
            continue
        
        if key not in groups:
            groups[key] = {
                "type": notification_type,
                "category": category,
                "entity_id": entity_id,
                "entity_type": n.get("entity_type"),
                "notifications": [],
                "count": 0,
                "latest": n,
                "priority": n.get("priority", "medium")
            }
        
        groups[key]["notifications"].append(n)
        groups[key]["count"] += 1
        
        # Keep highest priority
        if n.get("priority") == "high":
            groups[key]["priority"] = "high"
    
    # Build grouped response
    grouped_result = []
    for key, group in groups.items():
        count = group["count"]
        notification_type = group["type"]
        latest = group["latest"]
        
        # Generate smart summary message
        if notification_type == "task_assigned":
            summary = f"You have {count} new task{'s' if count > 1 else ''} assigned"
            title = "New Tasks Assigned" if count > 1 else latest.get("title")
        elif notification_type == "task_comment":
            task_name = latest.get("metadata", {}).get("task_name", "a task")
            summary = f"{count} new comment{'s' if count > 1 else ''} on '{task_name}'"
            title = "New Comments" if count > 1 else latest.get("title")
        elif notification_type == "task_status_changed":
            summary = f"Task status updated {count} time{'s' if count > 1 else ''}"
            title = "Status Updates" if count > 1 else latest.get("title")
        elif notification_type == "user_mentioned":
            summary = f"You were mentioned {count} time{'s' if count > 1 else ''}"
            title = "New Mentions" if count > 1 else latest.get("title")
        elif notification_type == "email_received":
            summary = f"You have {count} new email{'s' if count > 1 else ''}"
            title = "New Emails" if count > 1 else latest.get("title")
        else:
            summary = latest.get("message", "")
            title = latest.get("title", "Notification")
        
        grouped_result.append({
            "id": f"group_{key}",
            "type": notification_type,
            "category": group["category"],
            "title": title,
            "message": summary,
            "count": count,
            "priority": group["priority"],
            "entity_type": group["entity_type"],
            "entity_id": group["entity_id"],
            "action_url": latest.get("action_url"),
            "notification_ids": [n["id"] for n in group["notifications"]],
            "created_at": latest.get("created_at"),
            "is_grouped": count > 1
        })
    
    # Sort by priority then date
    priority_order = {"high": 0, "medium": 1, "low": 2}
    grouped_result.sort(key=lambda x: (priority_order.get(x["priority"], 1), x["created_at"]), reverse=True)
    
    return {
        "groups": grouped_result[:limit],
        "ungrouped": ungrouped[:limit],
        "total_grouped": len(grouped_result),
        "total_ungrouped": len(ungrouped)
    }


@router.put("/{notification_id}/read")
async def mark_notification_read(
    notification_id: str,
    user: dict = Depends(get_current_user_dep)
):
    """Mark a single notification as read"""
    result = await db.notifications.update_one(
        {"id": notification_id, "user_id": user["id"]},
        {"$set": {"is_read": True, "read_at": datetime.now(timezone.utc).isoformat()}}
    )
    
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Notification not found")
    
    return {"message": "Notification marked as read"}


@router.put("/read-all")
async def mark_all_notifications_read(
    category: Optional[str] = None,
    user: dict = Depends(get_current_user_dep)
):
    """Mark all notifications as read"""
    query = {"user_id": user["id"], "is_read": False}
    if category:
        query["category"] = category
    
    result = await db.notifications.update_many(
        query,
        {"$set": {"is_read": True, "read_at": datetime.now(timezone.utc).isoformat()}}
    )
    
    return {"message": f"{result.modified_count} notifications marked as read"}


@router.delete("/{notification_id}")
async def delete_notification(
    notification_id: str,
    user: dict = Depends(get_current_user_dep)
):
    """Delete a notification"""
    result = await db.notifications.delete_one({
        "id": notification_id,
        "user_id": user["id"]
    })
    
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Notification not found")
    
    return {"message": "Notification deleted"}


@router.delete("")
async def delete_all_notifications(
    is_read_only: bool = True,
    user: dict = Depends(get_current_user_dep)
):
    """Delete notifications (read only by default)"""
    query = {"user_id": user["id"]}
    if is_read_only:
        query["is_read"] = True
    
    result = await db.notifications.delete_many(query)
    
    return {"message": f"{result.deleted_count} notifications deleted"}


# ============== NOTIFICATION PREFERENCES ==============

@router.get("/preferences", response_model=NotificationPreferencesResponse)
async def get_notification_preferences(user: dict = Depends(get_current_user_dep)):
    """Get user's notification preferences"""
    prefs = await db.notification_preferences.find_one(
        {"user_id": user["id"]}, {"_id": 0}
    )
    
    if not prefs:
        # Return default preferences
        prefs = {
            "user_id": user["id"],
            "task_notifications": True,
            "project_notifications": True,
            "marketing_notifications": True,
            "mail_notifications": True,
            "social_notifications": True,
            "mention_notifications": True,
            "approval_notifications": True,
            "email_enabled": False,
            "email_frequency": "instant",
            "updated_at": datetime.now(timezone.utc).isoformat()
        }
    
    return prefs


@router.put("/preferences", response_model=NotificationPreferencesResponse)
async def update_notification_preferences(
    data: NotificationPreferencesUpdate,
    user: dict = Depends(get_current_user_dep)
):
    """Update user's notification preferences"""
    update_data = {k: v for k, v in data.model_dump().items() if v is not None}
    update_data["updated_at"] = datetime.now(timezone.utc).isoformat()
    update_data["user_id"] = user["id"]
    
    result = await db.notification_preferences.find_one_and_update(
        {"user_id": user["id"]},
        {"$set": update_data},
        upsert=True,
        return_document=True
    )
    
    if "_id" in result:
        del result["_id"]
    
    return result


# ============== NOTIFICATION HELPER FUNCTIONS ==============

async def create_notification(
    user_id: str,
    notification_type: NotificationType,
    category: NotificationCategory,
    title: str,
    message: str,
    priority: NotificationPriority = NotificationPriority.MEDIUM,
    entity_type: str = None,
    entity_id: str = None,
    action_url: str = None,
    metadata: dict = None,
    send_realtime: bool = True
) -> dict:
    """
    Create a notification and optionally send via WebSocket
    This is the main function to be called from other modules
    """
    if db is None:
        logger.error("Notification DB not initialized")
        return None
    
    # Check user preferences
    prefs = await db.notification_preferences.find_one({"user_id": user_id})
    if prefs:
        category_pref_map = {
            NotificationCategory.TASK: "task_notifications",
            NotificationCategory.PROJECT: "project_notifications",
            NotificationCategory.MARKETING: "marketing_notifications",
            NotificationCategory.MAIL: "mail_notifications",
            NotificationCategory.SOCIAL: "social_notifications",
            NotificationCategory.MENTION: "mention_notifications",
            NotificationCategory.APPROVAL: "approval_notifications",
        }
        pref_key = category_pref_map.get(category)
        if pref_key and not prefs.get(pref_key, True):
            logger.info(f"Notification blocked by user preference: {category}")
            return None
    
    notification_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc).isoformat()
    
    notification_doc = {
        "id": notification_id,
        "user_id": user_id,
        "type": notification_type.value,
        "category": category.value,
        "title": title,
        "message": message,
        "priority": priority.value,
        "entity_type": entity_type,
        "entity_id": entity_id,
        "action_url": action_url,
        "metadata": metadata or {},
        "is_read": False,
        "read_at": None,
        "created_at": now
    }
    
    await db.notifications.insert_one(notification_doc)
    
    if "_id" in notification_doc:
        del notification_doc["_id"]
    
    # Send real-time notification via WebSocket
    if send_realtime and ws_manager:
        try:
            await ws_manager.send_personal_notification(user_id, notification_doc)
        except Exception as e:
            logger.error(f"Failed to send WebSocket notification: {e}")
    
    # Send email notification (async, don't block)
    try:
        from services.email_notification_service import send_instant_email_notification
        # Fire and forget - don't wait for email
        asyncio.create_task(send_instant_email_notification(user_id, notification_doc))
    except Exception as e:
        logger.error(f"Failed to queue email notification: {e}")
    
    logger.info(f"Notification created: {notification_id} for user {user_id}")
    return notification_doc


async def create_bulk_notifications(
    user_ids: List[str],
    notification_type: NotificationType,
    category: NotificationCategory,
    title: str,
    message: str,
    priority: NotificationPriority = NotificationPriority.MEDIUM,
    entity_type: str = None,
    entity_id: str = None,
    action_url: str = None,
    metadata: dict = None
) -> int:
    """Create notifications for multiple users"""
    count = 0
    for user_id in user_ids:
        result = await create_notification(
            user_id=user_id,
            notification_type=notification_type,
            category=category,
            title=title,
            message=message,
            priority=priority,
            entity_type=entity_type,
            entity_id=entity_id,
            action_url=action_url,
            metadata=metadata
        )
        if result:
            count += 1
    return count


async def notify_task_assigned(
    assignee_id: str,
    task_name: str,
    task_id: str,
    project_name: str,
    assigner_name: str
):
    """Send notification when task is assigned"""
    return await create_notification(
        user_id=assignee_id,
        notification_type=NotificationType.TASK_ASSIGNED,
        category=NotificationCategory.TASK,
        title="New Task Assigned",
        message=f"{assigner_name} assigned you: {task_name}",
        priority=NotificationPriority.HIGH,
        entity_type="task",
        entity_id=task_id,
        action_url=f"/projects?task={task_id}",
        metadata={"project_name": project_name, "assigner": assigner_name}
    )


async def notify_task_status_changed(
    user_id: str,
    task_name: str,
    task_id: str,
    old_status: str,
    new_status: str,
    changed_by: str
):
    """Send notification when task status changes"""
    return await create_notification(
        user_id=user_id,
        notification_type=NotificationType.TASK_STATUS_CHANGED,
        category=NotificationCategory.TASK,
        title="Task Status Updated",
        message=f"'{task_name}' moved to {new_status}",
        priority=NotificationPriority.MEDIUM,
        entity_type="task",
        entity_id=task_id,
        action_url=f"/projects?task={task_id}",
        metadata={"old_status": old_status, "new_status": new_status, "changed_by": changed_by}
    )


async def notify_mention(
    mentioned_user_id: str,
    mentioner_name: str,
    context: str,
    entity_type: str,
    entity_id: str,
    preview: str
):
    """Send notification when user is mentioned"""
    return await create_notification(
        user_id=mentioned_user_id,
        notification_type=NotificationType.USER_MENTIONED,
        category=NotificationCategory.MENTION,
        title=f"{mentioner_name} mentioned you",
        message=f"In {context}: {preview[:100]}...",
        priority=NotificationPriority.HIGH,
        entity_type=entity_type,
        entity_id=entity_id,
        metadata={"mentioner": mentioner_name, "context": context}
    )


async def notify_campaign_update(
    user_ids: List[str],
    campaign_name: str,
    campaign_id: str,
    action: str
):
    """Send notification for campaign updates"""
    return await create_bulk_notifications(
        user_ids=user_ids,
        notification_type=NotificationType.CAMPAIGN_APPROVED if action == "approved" else NotificationType.CAMPAIGN_CREATED,
        category=NotificationCategory.MARKETING,
        title=f"Campaign {action.title()}",
        message=f"Campaign '{campaign_name}' has been {action}",
        priority=NotificationPriority.MEDIUM,
        entity_type="campaign",
        entity_id=campaign_id,
        action_url=f"/marketing/campaigns/{campaign_id}"
    )


async def notify_email_received(
    user_id: str,
    sender: str,
    subject: str,
    email_id: str
):
    """Send notification for new email"""
    return await create_notification(
        user_id=user_id,
        notification_type=NotificationType.EMAIL_RECEIVED,
        category=NotificationCategory.MAIL,
        title="New Email",
        message=f"From {sender}: {subject}",
        priority=NotificationPriority.MEDIUM,
        entity_type="email",
        entity_id=email_id,
        action_url=f"/mail?email={email_id}",
        metadata={"sender": sender, "subject": subject}
    )


async def notify_post_published(
    user_id: str,
    platform: str,
    post_title: str,
    post_id: str
):
    """Send notification when social post is published"""
    return await create_notification(
        user_id=user_id,
        notification_type=NotificationType.POST_PUBLISHED,
        category=NotificationCategory.SOCIAL,
        title="Post Published",
        message=f"'{post_title}' published on {platform}",
        priority=NotificationPriority.LOW,
        entity_type="post",
        entity_id=post_id,
        action_url=f"/social/posts/{post_id}",
        metadata={"platform": platform}
    )
