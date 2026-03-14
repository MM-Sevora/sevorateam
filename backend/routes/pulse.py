"""
Sevora Pulse - Company Wall & Team Engagement System
Phase 1: Posts, Feed, Reactions, Comments

Central hub for internal communication, activity updates, and team engagement.
"""

from fastapi import APIRouter, HTTPException, Depends, Query
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
from datetime import datetime, timezone, timedelta
import uuid
import os
import logging
import jwt
import re

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/pulse", tags=["Sevora Pulse"])

# Database reference
db = None
security = HTTPBearer(auto_error=False)

# Import notification helpers (will be set after init)
notify_pulse_mention = None
notify_pulse_reaction = None
notify_pulse_comment = None
notify_pulse_recognition = None
notify_pulse_announcement = None

# WebSocket manager for real-time updates
ws_manager = None

def init_router(database):
    """Initialize router with database and notification helpers"""
    global db, notify_pulse_mention, notify_pulse_reaction, notify_pulse_comment
    global notify_pulse_recognition, notify_pulse_announcement, ws_manager
    db = database
    
    # Import WebSocket manager
    try:
        from services.websocket_service import manager
        ws_manager = manager
        logger.info("Pulse WebSocket manager initialized")
    except Exception as e:
        logger.warning(f"Could not initialize Pulse WebSocket manager: {e}")
    
    # Import notification helpers
    try:
        from routes.notifications import (
            notify_pulse_mention as npm,
            notify_pulse_reaction as npr,
            notify_pulse_comment as npc,
            notify_pulse_recognition as nprc,
            notify_pulse_announcement as npa
        )
        notify_pulse_mention = npm
        notify_pulse_reaction = npr
        notify_pulse_comment = npc
        notify_pulse_recognition = nprc
        notify_pulse_announcement = npa
        logger.info("Pulse notification helpers initialized")
    except ImportError as e:
        logger.warning(f"Could not import notification helpers: {e}")


# ============== MODELS ==============

class PostCreate(BaseModel):
    title: str
    content: str
    post_type: str = "update"  # announcement, operational, achievement, issue, appreciation, daily_update, weekly_update
    visibility: str = "public"  # public, department, team, private
    department: Optional[str] = None
    team: Optional[str] = None
    visible_to: List[str] = []  # For private posts - list of user IDs
    priority: str = "normal"  # low, normal, high, urgent
    tags: List[str] = []
    attachments: List[Dict[str, str]] = []  # [{type, url, name}]
    linked_module: Optional[str] = None  # marketing, warehouse, buying, technology
    linked_item_id: Optional[str] = None

class PostUpdate(BaseModel):
    title: Optional[str] = None
    content: Optional[str] = None
    post_type: Optional[str] = None
    visibility: Optional[str] = None
    priority: Optional[str] = None
    tags: Optional[List[str]] = None
    attachments: Optional[List[Dict[str, str]]] = None

class CommentCreate(BaseModel):
    content: str
    parent_id: Optional[str] = None  # For threaded comments

class ReactionCreate(BaseModel):
    reaction_type: str  # like, celebrate, appreciate, idea


# ============== POST TYPE CONFIGS ==============

POST_TYPES = {
    "announcement": {"label": "Announcement", "icon": "megaphone", "color": "#3B82F6"},
    "operational": {"label": "Operational Update", "icon": "settings", "color": "#6B7280"},
    "achievement": {"label": "Achievement", "icon": "trophy", "color": "#F59E0B"},
    "issue": {"label": "Issue / Alert", "icon": "alert-triangle", "color": "#EF4444"},
    "appreciation": {"label": "Appreciation", "icon": "heart", "color": "#EC4899"},
    "daily_update": {"label": "Daily Update", "icon": "calendar", "color": "#10B981"},
    "weekly_update": {"label": "Weekly Update", "icon": "calendar-range", "color": "#8B5CF6"},
    "monthly_update": {"label": "Monthly Update", "icon": "calendar-days", "color": "#3B82F6"},
    "quarterly_update": {"label": "Quarterly Update", "icon": "calendar-check", "color": "#F59E0B"},
    "update": {"label": "General Update", "icon": "message-circle", "color": "#64748B"},
}

REACTION_TYPES = {
    "like": {"label": "Like", "emoji": "👍"},
    "celebrate": {"label": "Celebrate", "emoji": "🎉"},
    "appreciate": {"label": "Appreciate", "emoji": "❤️"},
    "idea": {"label": "Great Idea", "emoji": "💡"},
}

DEPARTMENTS = [
    "marketing", "buying", "warehouse", "technology", 
    "operations", "finance", "hr", "sales", "leadership"
]

VISIBILITY_OPTIONS = {
    "public": {"label": "Everyone", "description": "Visible to entire organization"},
    "department": {"label": "Department", "description": "Visible to your department"},
    "team": {"label": "Team", "description": "Visible to specific team"},
    "private": {"label": "Private", "description": "Visible to selected individuals"},
}


# ============== AUTH ==============

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    """Get current user from JWT token"""
    if not credentials:
        raise HTTPException(status_code=401, detail="Not authenticated")
    try:
        secret = os.environ.get('JWT_SECRET', 'sevora-team-secret-2024')
        payload = jwt.decode(credentials.credentials, secret, algorithms=['HS256'])
        user_id = payload.get("sub")
        if not user_id:
            raise HTTPException(status_code=401, detail="Invalid token")
        if db is None:
            return {"id": user_id, "name": "User", "department": "general"}
        user = await db.users.find_one({"id": user_id}, {"_id": 0, "password": 0})
        if not user:
            raise HTTPException(status_code=401, detail="User not found")
        return user
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")


# ============== HELPER FUNCTIONS ==============

def can_view_post(post: dict, user: dict) -> bool:
    """Check if user can view a post based on visibility settings"""
    visibility = post.get("visibility", "public")
    
    if visibility == "public":
        return True
    elif visibility == "department":
        return user.get("department") == post.get("department")
    elif visibility == "team":
        return user.get("team") == post.get("team") or user.get("id") in post.get("visible_to", [])
    elif visibility == "private":
        return user.get("id") in post.get("visible_to", []) or user.get("id") == post.get("author_id")
    
    return False


# ============== PULSE PERMISSIONS ==============

PULSE_PERMISSIONS = {
    # Role -> Allowed actions
    "super_admin": ["*"],  # All actions
    "admin": ["create_announcement", "pin_post", "delete_any_post", "view_leadership_dashboard", "manage_recognitions"],
    "department_manager": ["create_announcement", "pin_post", "view_leadership_dashboard", "view_department_updates"],
    "team_lead": ["create_announcement", "view_department_updates"],
    "employee": ["create_post", "create_update", "give_recognition"],
}

def has_pulse_permission(user: dict, action: str) -> bool:
    """Check if user has permission for a Pulse action"""
    role = user.get("role", "employee")
    permissions = PULSE_PERMISSIONS.get(role, PULSE_PERMISSIONS["employee"])
    
    # Super admin or wildcard permission
    if "*" in permissions:
        return True
    
    return action in permissions


def can_create_announcement(user: dict) -> bool:
    """Check if user can create announcements"""
    return has_pulse_permission(user, "create_announcement")


def can_pin_post(user: dict) -> bool:
    """Check if user can pin posts"""
    return has_pulse_permission(user, "pin_post")


def can_delete_any_post(user: dict) -> bool:
    """Check if user can delete any post"""
    return has_pulse_permission(user, "delete_any_post")


def can_view_leadership_dashboard(user: dict) -> bool:
    """Check if user can view leadership dashboard"""
    return has_pulse_permission(user, "view_leadership_dashboard")


async def extract_mentions(content: str) -> List[dict]:
    """Extract @mentions from content and resolve to user IDs"""
    if not content or db is None:
        return []
    
    # Find all @mentions (handles names with spaces like "@John Doe")
    mention_pattern = r'@([A-Za-z]+(?:\s+[A-Za-z]+)?)'
    matches = re.findall(mention_pattern, content)
    
    if not matches:
        return []
    
    mentions = []
    for name in matches:
        # Try to find user by name (case-insensitive)
        user = await db.users.find_one(
            {"name": {"$regex": f"^{re.escape(name)}$", "$options": "i"}},
            {"_id": 0, "id": 1, "name": 1}
        )
        if user:
            mentions.append({
                "user_id": user["id"],
                "name": user["name"],
                "mention_text": f"@{name}"
            })
    
    return mentions


async def send_mention_notifications(mentions: List[dict], author_name: str, post_title: str, post_id: str):
    """Send notifications to all mentioned users"""
    if not mentions or notify_pulse_mention is None:
        return
    
    for mention in mentions:
        try:
            await notify_pulse_mention(
                mentioned_user_id=mention["user_id"],
                author_name=author_name,
                post_title=post_title,
                post_id=post_id
            )
        except Exception as e:
            logger.error(f"Failed to send mention notification: {e}")


async def enrich_post(post: dict) -> dict:
    """Add author info, reaction counts, comment counts to post"""
    if db is None:
        return post
    
    # Get author info
    author = await db.users.find_one(
        {"id": post.get("author_id")},
        {"_id": 0, "id": 1, "name": 1, "email": 1, "role": 1, "department": 1, "avatar": 1}
    )
    post["author"] = author or {"name": "Unknown User"}
    
    # Get reaction counts
    reactions = await db.pulse_reactions.aggregate([
        {"$match": {"post_id": post["id"]}},
        {"$group": {"_id": "$reaction_type", "count": {"$sum": 1}}}
    ]).to_list(10)
    post["reactions"] = {r["_id"]: r["count"] for r in reactions}
    post["total_reactions"] = sum(r["count"] for r in reactions)
    
    # Get comment count
    comment_count = await db.pulse_comments.count_documents({"post_id": post["id"]})
    post["comment_count"] = comment_count
    
    return post


# ============== ENDPOINTS ==============

@router.get("/config")
async def get_pulse_config():
    """Get Pulse configuration (post types, reactions, departments)"""
    return {
        "post_types": POST_TYPES,
        "reaction_types": REACTION_TYPES,
        "departments": DEPARTMENTS,
        "visibility_options": VISIBILITY_OPTIONS,
    }


# ============== POSTS ==============

@router.post("/posts")
async def create_post(post: PostCreate, user: dict = Depends(get_current_user)):
    """Create a new post on the Pulse wall"""
    
    # Permission check for announcements
    if post.post_type == "announcement" and not can_create_announcement(user):
        raise HTTPException(
            status_code=403, 
            detail="Only managers and admins can create announcements"
        )
    
    post_id = str(uuid.uuid4())
    
    # Extract @mentions from content
    mentions = await extract_mentions(post.content)
    
    post_doc = {
        "id": post_id,
        "title": post.title,
        "content": post.content,
        "post_type": post.post_type,
        "visibility": post.visibility,
        "department": post.department or user.get("department"),
        "team": post.team,
        "visible_to": post.visible_to,
        "priority": post.priority,
        "tags": post.tags,
        "attachments": post.attachments,
        "linked_module": post.linked_module,
        "linked_item_id": post.linked_item_id,
        "author_id": user["id"],
        "author_name": user.get("name", "Unknown"),
        "author_department": user.get("department"),
        "mentions": mentions,  # Store extracted mentions
        "created_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat(),
        "is_pinned": False,
        "is_edited": False,
    }
    
    if db is not None:
        await db.pulse_posts.insert_one(post_doc)
        
        # Create activity log
        await db.pulse_activity.insert_one({
            "id": str(uuid.uuid4()),
            "user_id": user["id"],
            "action": "create_post",
            "post_id": post_id,
            "created_at": datetime.now(timezone.utc).isoformat(),
        })
        
        # Send mention notifications (async, don't block)
        if mentions:
            await send_mention_notifications(
                mentions=mentions,
                author_name=user.get("name", "Someone"),
                post_title=post.title,
                post_id=post_id
            )
        
        # Send announcement notifications if it's an announcement
        if post.post_type == "announcement" and notify_pulse_announcement:
            try:
                # Get all users to notify (based on visibility)
                if post.visibility == "public":
                    users = await db.users.find(
                        {"status": {"$ne": "inactive"}},
                        {"_id": 0, "id": 1}
                    ).to_list(1000)
                    user_ids = [u["id"] for u in users if u["id"] != user["id"]]
                elif post.visibility == "department":
                    users = await db.users.find(
                        {"department": post.department or user.get("department"), "status": {"$ne": "inactive"}},
                        {"_id": 0, "id": 1}
                    ).to_list(500)
                    user_ids = [u["id"] for u in users if u["id"] != user["id"]]
                else:
                    user_ids = []
                
                if user_ids:
                    await notify_pulse_announcement(
                        user_ids=user_ids,
                        author_name=user.get("name", "Someone"),
                        announcement_title=post.title,
                        post_id=post_id,
                        department=post.department
                    )
            except Exception as e:
                logger.error(f"Failed to send announcement notifications: {e}")
    
    # Remove _id if added by MongoDB
    if "_id" in post_doc:
        del post_doc["_id"]
    
    # Broadcast new post via WebSocket for real-time feed updates
    if ws_manager:
        try:
            await ws_manager.broadcast_pulse_post(
                post=post_doc,
                department=post_doc.get("department") if post_doc.get("visibility") == "department" else None
            )
        except Exception as e:
            logger.warning(f"Failed to broadcast Pulse post via WebSocket: {e}")
    
    return {
        "success": True,
        "message": "Post created successfully",
        "post": await enrich_post(post_doc)
    }


@router.get("/posts")
async def get_posts(
    visibility: Optional[str] = None,
    department: Optional[str] = None,
    post_type: Optional[str] = None,
    author_id: Optional[str] = None,
    tag: Optional[str] = None,
    search: Optional[str] = None,
    time_filter: Optional[str] = None,  # today, week, month
    limit: int = 20,
    offset: int = 0,
    user: dict = Depends(get_current_user)
):
    """Get posts from the Pulse feed with filters"""
    if db is None:
        return {"posts": [], "total": 0}
    
    # Build query
    query = {}
    
    # Visibility filtering - show posts user can see
    visibility_query = {
        "$or": [
            {"visibility": "public"},
            {"visibility": "department", "department": user.get("department")},
            {"visibility": "team", "team": user.get("team")},
            {"visibility": "private", "visible_to": user["id"]},
            {"author_id": user["id"]},  # Always show own posts
        ]
    }
    query.update(visibility_query)
    
    # Apply filters
    if department:
        query["department"] = department
    if post_type:
        query["post_type"] = post_type
    if author_id:
        query["author_id"] = author_id
    if tag:
        query["tags"] = tag
    if search:
        query["$or"] = [
            {"title": {"$regex": search, "$options": "i"}},
            {"content": {"$regex": search, "$options": "i"}},
        ]
    
    # Time filter
    if time_filter:
        now = datetime.now(timezone.utc)
        if time_filter == "today":
            start = now.replace(hour=0, minute=0, second=0, microsecond=0)
        elif time_filter == "week":
            start = now - timedelta(days=7)
        elif time_filter == "month":
            start = now - timedelta(days=30)
        else:
            start = None
        
        if start:
            query["created_at"] = {"$gte": start.isoformat()}
    
    # Get total count
    total = await db.pulse_posts.count_documents(query)
    
    # Get posts with sorting (pinned first, then by date)
    posts = await db.pulse_posts.find(
        query,
        {"_id": 0}
    ).sort([
        ("is_pinned", -1),
        ("created_at", -1)
    ]).skip(offset).limit(limit).to_list(limit)
    
    # Enrich posts with author info and counts
    enriched_posts = []
    for post in posts:
        enriched = await enrich_post(post)
        enriched_posts.append(enriched)
    
    return {
        "posts": enriched_posts,
        "total": total,
        "limit": limit,
        "offset": offset,
    }


@router.get("/posts/{post_id}")
async def get_post(post_id: str, user: dict = Depends(get_current_user)):
    """Get a single post by ID"""
    if db is None:
        raise HTTPException(status_code=404, detail="Post not found")
    
    post = await db.pulse_posts.find_one({"id": post_id}, {"_id": 0})
    
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")
    
    if not can_view_post(post, user):
        raise HTTPException(status_code=403, detail="You don't have permission to view this post")
    
    return await enrich_post(post)


@router.put("/posts/{post_id}")
async def update_post(post_id: str, update: PostUpdate, user: dict = Depends(get_current_user)):
    """Update a post (only author or admin can update)"""
    if db is None:
        raise HTTPException(status_code=404, detail="Post not found")
    
    post = await db.pulse_posts.find_one({"id": post_id}, {"_id": 0})
    
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")
    
    # Check permission
    if post["author_id"] != user["id"] and user.get("role") not in ["superadmin", "admin"]:
        raise HTTPException(status_code=403, detail="You can only edit your own posts")
    
    # Build update
    update_data = {k: v for k, v in update.dict().items() if v is not None}
    update_data["updated_at"] = datetime.now(timezone.utc).isoformat()
    update_data["is_edited"] = True
    
    await db.pulse_posts.update_one(
        {"id": post_id},
        {"$set": update_data}
    )
    
    updated_post = await db.pulse_posts.find_one({"id": post_id}, {"_id": 0})
    return await enrich_post(updated_post)


@router.delete("/posts/{post_id}")
async def delete_post(post_id: str, user: dict = Depends(get_current_user)):
    """Delete a post (only author or admin can delete)"""
    if db is None:
        raise HTTPException(status_code=404, detail="Post not found")
    
    post = await db.pulse_posts.find_one({"id": post_id}, {"_id": 0})
    
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")
    
    # Check permission
    if post["author_id"] != user["id"] and user.get("role") not in ["superadmin", "admin"]:
        raise HTTPException(status_code=403, detail="You can only delete your own posts")
    
    await db.pulse_posts.delete_one({"id": post_id})
    await db.pulse_comments.delete_many({"post_id": post_id})
    await db.pulse_reactions.delete_many({"post_id": post_id})
    
    return {"success": True, "message": "Post deleted successfully"}


@router.post("/posts/{post_id}/pin")
async def pin_post(post_id: str, user: dict = Depends(get_current_user)):
    """Pin/unpin a post (requires pin_post permission)"""
    if not can_pin_post(user):
        raise HTTPException(status_code=403, detail="You don't have permission to pin posts")
    
    if db is None:
        raise HTTPException(status_code=404, detail="Post not found")
    
    post = await db.pulse_posts.find_one({"id": post_id}, {"_id": 0})
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")
    
    new_status = not post.get("is_pinned", False)
    await db.pulse_posts.update_one(
        {"id": post_id},
        {"$set": {"is_pinned": new_status}}
    )
    
    return {"success": True, "is_pinned": new_status}


# ============== COMMENTS ==============

@router.post("/posts/{post_id}/comments")
async def create_comment(post_id: str, comment: CommentCreate, user: dict = Depends(get_current_user)):
    """Add a comment to a post"""
    if db is None:
        raise HTTPException(status_code=404, detail="Post not found")
    
    post = await db.pulse_posts.find_one({"id": post_id}, {"_id": 0})
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")
    
    if not can_view_post(post, user):
        raise HTTPException(status_code=403, detail="You don't have permission to comment on this post")
    
    comment_id = str(uuid.uuid4())
    
    # Extract mentions from comment
    mentions = await extract_mentions(comment.content)
    
    comment_doc = {
        "id": comment_id,
        "post_id": post_id,
        "content": comment.content,
        "parent_id": comment.parent_id,  # For threaded comments
        "author_id": user["id"],
        "author_name": user.get("name", "Unknown"),
        "author_avatar": user.get("avatar"),
        "mentions": mentions,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "is_edited": False,
    }
    
    await db.pulse_comments.insert_one(comment_doc)
    
    # Send notification to post author (if not self-commenting)
    if post["author_id"] != user["id"]:
        if notify_pulse_comment:
            try:
                await notify_pulse_comment(
                    post_author_id=post["author_id"],
                    commenter_name=user.get("name", "Someone"),
                    comment_preview=comment.content,
                    post_title=post["title"],
                    post_id=post_id
                )
            except Exception as e:
                logger.error(f"Failed to send comment notification: {e}")
    
    # Send mention notifications
    if mentions:
        await send_mention_notifications(
            mentions=mentions,
            author_name=user.get("name", "Someone"),
            post_title=f"comment on: {post['title']}",
            post_id=post_id
        )
    
    return {
        "success": True,
        "comment": {k: v for k, v in comment_doc.items() if k != "_id"}
    }


@router.get("/posts/{post_id}/comments")
async def get_comments(post_id: str, user: dict = Depends(get_current_user)):
    """Get all comments for a post"""
    if db is None:
        return {"comments": []}
    
    post = await db.pulse_posts.find_one({"id": post_id}, {"_id": 0})
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")
    
    if not can_view_post(post, user):
        raise HTTPException(status_code=403, detail="You don't have permission to view this post")
    
    comments = await db.pulse_comments.find(
        {"post_id": post_id},
        {"_id": 0}
    ).sort("created_at", 1).to_list(100)
    
    return {"comments": comments}


@router.delete("/comments/{comment_id}")
async def delete_comment(comment_id: str, user: dict = Depends(get_current_user)):
    """Delete a comment (only author or admin)"""
    if db is None:
        raise HTTPException(status_code=404, detail="Comment not found")
    
    comment = await db.pulse_comments.find_one({"id": comment_id}, {"_id": 0})
    if not comment:
        raise HTTPException(status_code=404, detail="Comment not found")
    
    if comment["author_id"] != user["id"] and user.get("role") not in ["superadmin", "admin"]:
        raise HTTPException(status_code=403, detail="You can only delete your own comments")
    
    await db.pulse_comments.delete_one({"id": comment_id})
    
    return {"success": True, "message": "Comment deleted"}


# ============== REACTIONS ==============

@router.post("/posts/{post_id}/reactions")
async def add_reaction(post_id: str, reaction: ReactionCreate, user: dict = Depends(get_current_user)):
    """Add or update a reaction to a post"""
    if reaction.reaction_type not in REACTION_TYPES:
        raise HTTPException(status_code=400, detail=f"Invalid reaction type. Must be one of: {list(REACTION_TYPES.keys())}")
    
    if db is None:
        return {"success": True, "message": "Reaction added"}
    
    post = await db.pulse_posts.find_one({"id": post_id}, {"_id": 0})
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")
    
    if not can_view_post(post, user):
        raise HTTPException(status_code=403, detail="You don't have permission to react to this post")
    
    # Check if user already reacted
    existing = await db.pulse_reactions.find_one({
        "post_id": post_id,
        "user_id": user["id"]
    })
    
    if existing:
        if existing["reaction_type"] == reaction.reaction_type:
            # Remove reaction (toggle off)
            await db.pulse_reactions.delete_one({"id": existing["id"]})
            return {"success": True, "action": "removed", "reaction_type": reaction.reaction_type}
        else:
            # Update reaction type
            await db.pulse_reactions.update_one(
                {"id": existing["id"]},
                {"$set": {"reaction_type": reaction.reaction_type}}
            )
            return {"success": True, "action": "updated", "reaction_type": reaction.reaction_type}
    else:
        # Add new reaction
        reaction_doc = {
            "id": str(uuid.uuid4()),
            "post_id": post_id,
            "user_id": user["id"],
            "user_name": user.get("name", "Unknown"),
            "reaction_type": reaction.reaction_type,
            "created_at": datetime.now(timezone.utc).isoformat(),
        }
        await db.pulse_reactions.insert_one(reaction_doc)
        
        # Send notification to post author (if not self-reacting)
        if post["author_id"] != user["id"]:
            if notify_pulse_reaction:
                try:
                    await notify_pulse_reaction(
                        post_author_id=post["author_id"],
                        reactor_name=user.get("name", "Someone"),
                        reaction_type=reaction.reaction_type,
                        post_title=post["title"],
                        post_id=post_id
                    )
                except Exception as e:
                    logger.error(f"Failed to send reaction notification: {e}")
        
        return {"success": True, "action": "added", "reaction_type": reaction.reaction_type}


@router.get("/posts/{post_id}/reactions")
async def get_reactions(post_id: str, user: dict = Depends(get_current_user)):
    """Get all reactions for a post"""
    if db is None:
        return {"reactions": [], "user_reaction": None}
    
    reactions = await db.pulse_reactions.find(
        {"post_id": post_id},
        {"_id": 0}
    ).to_list(100)
    
    # Get user's reaction
    user_reaction = next(
        (r["reaction_type"] for r in reactions if r["user_id"] == user["id"]),
        None
    )
    
    # Group by type
    by_type = {}
    for r in reactions:
        rt = r["reaction_type"]
        if rt not in by_type:
            by_type[rt] = {"count": 0, "users": []}
        by_type[rt]["count"] += 1
        by_type[rt]["users"].append(r["user_name"])
    
    return {
        "reactions": by_type,
        "user_reaction": user_reaction,
        "total": len(reactions)
    }


# ============== DEPARTMENT WALLS ==============

@router.get("/departments/{department}/feed")
async def get_department_feed(
    department: str,
    limit: int = 20,
    offset: int = 0,
    user: dict = Depends(get_current_user)
):
    """Get posts for a specific department"""
    if department not in DEPARTMENTS:
        raise HTTPException(status_code=400, detail=f"Invalid department. Must be one of: {DEPARTMENTS}")
    
    if db is None:
        return {"posts": [], "total": 0}
    
    query = {
        "department": department,
        "$or": [
            {"visibility": "public"},
            {"visibility": "department"},
        ]
    }
    
    total = await db.pulse_posts.count_documents(query)
    posts = await db.pulse_posts.find(
        query,
        {"_id": 0}
    ).sort([("is_pinned", -1), ("created_at", -1)]).skip(offset).limit(limit).to_list(limit)
    
    enriched = [await enrich_post(p) for p in posts]
    
    return {
        "department": department,
        "posts": enriched,
        "total": total
    }


# ============== USER ACTIVITY ==============

@router.get("/users/{user_id}/activity")
async def get_user_activity(user_id: str, current_user: dict = Depends(get_current_user)):
    """Get activity timeline for a user"""
    if db is None:
        return {"posts": [], "stats": {}}
    
    # Get user's posts
    posts = await db.pulse_posts.find(
        {"author_id": user_id, "visibility": "public"},
        {"_id": 0}
    ).sort("created_at", -1).limit(20).to_list(20)
    
    enriched = [await enrich_post(p) for p in posts]
    
    # Get stats
    post_count = await db.pulse_posts.count_documents({"author_id": user_id})
    comment_count = await db.pulse_comments.count_documents({"author_id": user_id})
    reactions_received = await db.pulse_reactions.count_documents({
        "post_id": {"$in": [p["id"] for p in posts]}
    })
    
    return {
        "posts": enriched,
        "stats": {
            "total_posts": post_count,
            "total_comments": comment_count,
            "reactions_received": reactions_received,
        }
    }


# ============== STATS & DASHBOARD ==============

@router.get("/stats")
async def get_pulse_stats(user: dict = Depends(get_current_user)):
    """Get Pulse statistics for dashboard"""
    if db is None:
        return {
            "posts_today": 0,
            "posts_this_week": 0,
            "total_posts": 0,
            "by_department": {},
            "by_type": {},
            "top_contributors": [],
        }
    
    now = datetime.now(timezone.utc)
    today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
    week_start = now - timedelta(days=7)
    
    # Today's posts
    posts_today = await db.pulse_posts.count_documents({
        "created_at": {"$gte": today_start.isoformat()}
    })
    
    # This week's posts
    posts_week = await db.pulse_posts.count_documents({
        "created_at": {"$gte": week_start.isoformat()}
    })
    
    # Total posts
    total_posts = await db.pulse_posts.count_documents({})
    
    # By department
    dept_agg = await db.pulse_posts.aggregate([
        {"$group": {"_id": "$department", "count": {"$sum": 1}}}
    ]).to_list(20)
    by_department = {d["_id"]: d["count"] for d in dept_agg if d["_id"]}
    
    # By type
    type_agg = await db.pulse_posts.aggregate([
        {"$group": {"_id": "$post_type", "count": {"$sum": 1}}}
    ]).to_list(20)
    by_type = {t["_id"]: t["count"] for t in type_agg if t["_id"]}
    
    # Top contributors (this week)
    contrib_agg = await db.pulse_posts.aggregate([
        {"$match": {"created_at": {"$gte": week_start.isoformat()}}},
        {"$group": {"_id": "$author_id", "name": {"$first": "$author_name"}, "count": {"$sum": 1}}},
        {"$sort": {"count": -1}},
        {"$limit": 5}
    ]).to_list(5)
    
    return {
        "posts_today": posts_today,
        "posts_this_week": posts_week,
        "total_posts": total_posts,
        "by_department": by_department,
        "by_type": by_type,
        "top_contributors": [
            {"user_id": c["_id"], "name": c["name"], "posts": c["count"]}
            for c in contrib_agg
        ],
    }


# ============== TAGS ==============

@router.get("/tags")
async def get_popular_tags(user: dict = Depends(get_current_user)):
    """Get popular tags"""
    if db is None:
        return {"tags": []}
    
    # Aggregate tags
    tag_agg = await db.pulse_posts.aggregate([
        {"$unwind": "$tags"},
        {"$group": {"_id": "$tags", "count": {"$sum": 1}}},
        {"$sort": {"count": -1}},
        {"$limit": 20}
    ]).to_list(20)
    
    return {
        "tags": [{"name": t["_id"], "count": t["count"]} for t in tag_agg]
    }



# ============== RECOGNITION & BADGES ==============

BADGE_TYPES = {
    "team_player": {"label": "Team Player", "emoji": "🤝", "color": "#3B82F6", "description": "Goes above and beyond to help teammates"},
    "problem_solver": {"label": "Problem Solver", "emoji": "🧩", "color": "#10B981", "description": "Finds creative solutions to challenges"},
    "innovation": {"label": "Innovation", "emoji": "💡", "color": "#F59E0B", "description": "Brings fresh ideas and improvements"},
    "execution_champion": {"label": "Execution Champion", "emoji": "🏆", "color": "#8B5CF6", "description": "Delivers results with excellence"},
    "mentor": {"label": "Mentor", "emoji": "🎓", "color": "#EC4899", "description": "Helps others grow and learn"},
    "customer_hero": {"label": "Customer Hero", "emoji": "⭐", "color": "#EF4444", "description": "Exceptional customer service"},
}

class RecognitionCreate(BaseModel):
    recipient_id: str
    badge_type: str
    reason: str
    is_public: bool = True


@router.get("/badges/types")
async def get_badge_types():
    """Get all available badge types"""
    return {"badges": BADGE_TYPES}


@router.post("/recognition")
async def give_recognition(recognition: RecognitionCreate, user: dict = Depends(get_current_user)):
    """Give a badge/recognition to another employee"""
    if recognition.badge_type not in BADGE_TYPES:
        raise HTTPException(status_code=400, detail=f"Invalid badge type. Must be one of: {list(BADGE_TYPES.keys())}")
    
    if recognition.recipient_id == user["id"]:
        raise HTTPException(status_code=400, detail="You cannot give a badge to yourself")
    
    if db is None:
        raise HTTPException(status_code=500, detail="Database not available")
    
    # Get recipient info
    recipient = await db.users.find_one({"id": recognition.recipient_id}, {"_id": 0, "password": 0})
    if not recipient:
        raise HTTPException(status_code=404, detail="Recipient not found")
    
    recognition_id = str(uuid.uuid4())
    badge_info = BADGE_TYPES[recognition.badge_type]
    
    recognition_doc = {
        "id": recognition_id,
        "giver_id": user["id"],
        "giver_name": user.get("name", "Unknown"),
        "giver_department": user.get("department"),
        "recipient_id": recognition.recipient_id,
        "recipient_name": recipient.get("name", "Unknown"),
        "recipient_department": recipient.get("department"),
        "badge_type": recognition.badge_type,
        "badge_label": badge_info["label"],
        "badge_emoji": badge_info["emoji"],
        "reason": recognition.reason,
        "is_public": recognition.is_public,
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    
    await db.pulse_recognitions.insert_one(recognition_doc)
    
    # Also create a post if public
    if recognition.is_public:
        post_id = str(uuid.uuid4())
        post_doc = {
            "id": post_id,
            "title": f"{badge_info['emoji']} {recipient.get('name')} received {badge_info['label']} badge!",
            "content": f"{user.get('name')} recognized {recipient.get('name')} with the {badge_info['label']} badge.\n\n\"{recognition.reason}\"",
            "post_type": "appreciation",
            "visibility": "public",
            "department": recipient.get("department"),
            "author_id": user["id"],
            "author_name": user.get("name"),
            "author_department": user.get("department"),
            "tags": ["recognition", recognition.badge_type],
            "attachments": [],
            "priority": "normal",
            "created_at": datetime.now(timezone.utc).isoformat(),
            "updated_at": datetime.now(timezone.utc).isoformat(),
            "is_pinned": False,
            "is_edited": False,
            "recognition_id": recognition_id,
        }
        await db.pulse_posts.insert_one(post_doc)
    
    # Send notification to recipient using proper helper
    if notify_pulse_recognition:
        try:
            await notify_pulse_recognition(
                recipient_id=recognition.recipient_id,
                giver_name=user.get("name", "Someone"),
                badge_type=recognition.badge_type,
                reason=recognition.reason,
                recognition_id=recognition_id
            )
        except Exception as e:
            logger.error(f"Failed to send recognition notification: {e}")
    
    # Remove _id if present
    if "_id" in recognition_doc:
        del recognition_doc["_id"]
    
    return {
        "success": True,
        "message": f"Badge awarded to {recipient.get('name')}!",
        "recognition": recognition_doc
    }


@router.get("/recognition")
async def get_recognitions(
    recipient_id: Optional[str] = None,
    badge_type: Optional[str] = None,
    limit: int = 50,
    user: dict = Depends(get_current_user)
):
    """Get recognition/badges with optional filters"""
    if db is None:
        return {"recognitions": [], "total": 0}
    
    query = {"is_public": True}
    if recipient_id:
        query["recipient_id"] = recipient_id
    if badge_type:
        query["badge_type"] = badge_type
    
    recognitions = await db.pulse_recognitions.find(
        query, {"_id": 0}
    ).sort("created_at", -1).limit(limit).to_list(limit)
    
    total = await db.pulse_recognitions.count_documents(query)
    
    return {"recognitions": recognitions, "total": total}


@router.get("/recognition/leaderboard")
async def get_recognition_leaderboard(
    period: str = "month",
    user: dict = Depends(get_current_user)
):
    """Get badge leaderboard - top recognized employees"""
    if db is None:
        return {"leaderboard": [], "by_badge": {}}
    
    # Calculate date range
    now = datetime.now(timezone.utc)
    if period == "week":
        start = now - timedelta(days=7)
    elif period == "month":
        start = now - timedelta(days=30)
    elif period == "year":
        start = now - timedelta(days=365)
    else:
        start = None
    
    match_query = {}
    if start:
        match_query["created_at"] = {"$gte": start.isoformat()}
    
    # Top recipients
    pipeline = [
        {"$match": match_query},
        {"$group": {
            "_id": "$recipient_id",
            "name": {"$first": "$recipient_name"},
            "department": {"$first": "$recipient_department"},
            "badge_count": {"$sum": 1},
            "badges": {"$push": "$badge_type"}
        }},
        {"$sort": {"badge_count": -1}},
        {"$limit": 10}
    ]
    top_recipients = await db.pulse_recognitions.aggregate(pipeline).to_list(10)
    
    # Count by badge type
    badge_pipeline = [
        {"$match": match_query},
        {"$group": {"_id": "$badge_type", "count": {"$sum": 1}}}
    ]
    badge_counts = await db.pulse_recognitions.aggregate(badge_pipeline).to_list(10)
    by_badge = {b["_id"]: b["count"] for b in badge_counts}
    
    return {
        "leaderboard": [
            {
                "user_id": r["_id"],
                "name": r["name"],
                "department": r["department"],
                "badge_count": r["badge_count"],
                "badge_types": list(set(r["badges"]))
            }
            for r in top_recipients
        ],
        "by_badge": by_badge,
        "period": period
    }


@router.get("/users/{user_id}/badges")
async def get_user_badges(user_id: str, current_user: dict = Depends(get_current_user)):
    """Get all badges received by a specific user"""
    if db is None:
        return {"badges": [], "total": 0}
    
    badges = await db.pulse_recognitions.find(
        {"recipient_id": user_id},
        {"_id": 0}
    ).sort("created_at", -1).to_list(50)
    
    # Count by type
    badge_counts = {}
    for b in badges:
        bt = b["badge_type"]
        badge_counts[bt] = badge_counts.get(bt, 0) + 1
    
    return {
        "badges": badges,
        "total": len(badges),
        "by_type": badge_counts
    }


# ============== DAILY/WEEKLY UPDATES ==============

class LinkedItem(BaseModel):
    """Represents a linked task, project, or activity"""
    item_type: str  # "task", "project", "activity"
    item_id: str
    item_name: str
    project_id: Optional[str] = None  # Parent project if item is a task
    project_name: Optional[str] = None

class LinkableTextItem(BaseModel):
    """A text item with optional link to system item (used for all fields)"""
    text: str
    linked_item: Optional[LinkedItem] = None
    completion_date: Optional[str] = None  # Date from linked item if available

# Alias for backward compatibility
CompletedTaskItem = LinkableTextItem

class DailyUpdateCreate(BaseModel):
    completed_tasks: List[str] = []  # Legacy: simple text list
    completed_items: List[LinkableTextItem] = []  # New: items with links
    blockers: List[str] = []  # Legacy: simple text list
    blocker_items: List[LinkableTextItem] = []  # New: blockers with links
    tomorrow_focus: List[str] = []  # Legacy: simple text list
    tomorrow_focus_items: List[LinkableTextItem] = []  # New: focus items with links
    notes: Optional[str] = None
    update_date: Optional[str] = None  # Allow specifying date (defaults to today)

class WeeklyUpdateCreate(BaseModel):
    achievements: List[str] = []  # Legacy: simple text list
    achievement_items: List[LinkableTextItem] = []  # New: items with links
    key_metrics: Dict[str, Any] = {}
    issues_faced: List[str] = []  # Legacy: simple text list
    issues_faced_items: List[LinkableTextItem] = []  # New: issues with links
    next_week_focus: List[str] = []  # Legacy: simple text list
    next_week_focus_items: List[LinkableTextItem] = []  # New: focus items with links
    team_highlights: List[str] = []  # Legacy: simple text list
    team_highlights_items: List[LinkableTextItem] = []  # New: highlights with links
    notes: Optional[str] = None


class MonthlyUpdateCreate(BaseModel):
    """Monthly update model"""
    # Key accomplishments
    accomplishments: List[str] = []  # Legacy
    accomplishment_items: List[LinkableTextItem] = []  # New: items with links
    # Goals progress
    goals_progress: List[str] = []  # Legacy
    goals_progress_items: List[LinkableTextItem] = []  # Goals achieved or progressed
    # Challenges
    challenges: List[str] = []  # Legacy
    challenge_items: List[LinkableTextItem] = []  # Major challenges faced
    # Next month focus
    next_month_focus: List[str] = []  # Legacy
    next_month_focus_items: List[LinkableTextItem] = []  # Priorities for next month
    # Team/department highlights
    team_highlights: List[str] = []  # Legacy
    team_highlights_items: List[LinkableTextItem] = []
    # Key metrics
    key_metrics: Dict[str, Any] = {}
    notes: Optional[str] = None
    month: Optional[str] = None  # Format: "2026-03"


class QuarterlyUpdateCreate(BaseModel):
    """Quarterly update model"""
    # Quarter achievements
    achievements: List[str] = []  # Legacy
    achievement_items: List[LinkableTextItem] = []  # Major wins
    # OKR progress
    okr_progress: List[str] = []  # Legacy
    okr_progress_items: List[LinkableTextItem] = []  # OKR updates
    # Key learnings
    learnings: List[str] = []  # Legacy
    learning_items: List[LinkableTextItem] = []
    # Challenges overcome
    challenges: List[str] = []  # Legacy
    challenge_items: List[LinkableTextItem] = []
    # Next quarter priorities
    next_quarter_focus: List[str] = []  # Legacy
    next_quarter_focus_items: List[LinkableTextItem] = []
    # Team highlights
    team_highlights: List[str] = []  # Legacy
    team_highlights_items: List[LinkableTextItem] = []
    # Key metrics
    key_metrics: Dict[str, Any] = {}
    notes: Optional[str] = None
    quarter: Optional[str] = None  # Format: "2026-Q1"


@router.post("/updates/daily")
async def submit_daily_update(update: DailyUpdateCreate, user: dict = Depends(get_current_user)):
    """Submit a daily work update with optional linked tasks/projects for all fields"""
    if db is None:
        raise HTTPException(status_code=500, detail="Database not available")
    
    update_id = str(uuid.uuid4())
    update_date = update.update_date or datetime.now(timezone.utc).strftime("%Y-%m-%d")
    
    # Helper function to merge legacy and new items
    def merge_items(legacy_list, new_items_list):
        all_items = []
        for text in legacy_list:
            if text and text.strip():
                all_items.append({"text": text, "linked_item": None, "completion_date": None})
        for item in new_items_list:
            all_items.append({
                "text": item.text,
                "linked_item": item.linked_item.model_dump() if item.linked_item else None,
                "completion_date": item.completion_date
            })
        return all_items
    
    # Merge all fields
    all_completed_items = merge_items(update.completed_tasks, update.completed_items)
    all_blocker_items = merge_items(update.blockers, update.blocker_items)
    all_tomorrow_focus_items = merge_items(update.tomorrow_focus, update.tomorrow_focus_items)
    
    if not all_completed_items:
        raise HTTPException(status_code=400, detail="Please add at least one completed task")
    
    # Check if already submitted for this date
    existing = await db.pulse_daily_updates.find_one({
        "user_id": user["id"],
        "date": update_date
    })
    
    update_doc = {
        "id": update_id,
        "user_id": user["id"],
        "user_name": user.get("name"),
        "department": user.get("department"),
        "date": update_date,
        "completed_tasks": [item["text"] for item in all_completed_items],
        "completed_items": all_completed_items,
        "blockers": [item["text"] for item in all_blocker_items],
        "blocker_items": all_blocker_items,
        "tomorrow_focus": [item["text"] for item in all_tomorrow_focus_items],
        "tomorrow_focus_items": all_tomorrow_focus_items,
        "notes": update.notes,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat(),
    }
    
    if existing:
        await db.pulse_daily_updates.update_one(
            {"id": existing["id"]},
            {"$set": {
                "completed_tasks": [item["text"] for item in all_completed_items],
                "completed_items": all_completed_items,
                "blockers": [item["text"] for item in all_blocker_items],
                "blocker_items": all_blocker_items,
                "tomorrow_focus": [item["text"] for item in all_tomorrow_focus_items],
                "tomorrow_focus_items": all_tomorrow_focus_items,
                "notes": update.notes,
                "updated_at": datetime.now(timezone.utc).isoformat(),
            }}
        )
        update_doc["id"] = existing["id"]
        message = "Daily update updated"
    else:
        await db.pulse_daily_updates.insert_one(update_doc)
        
        # Helper to format items for post content
        def format_items_for_content(items, section_title):
            if not items:
                return ""
            lines = [f"\n\n**{section_title}:**"]
            for item in items:
                if item.get("linked_item"):
                    link = item["linked_item"]
                    lines.append(f"• {item['text']} [🔗 {link.get('item_type', 'item')}: {link.get('item_name', '')}]")
                else:
                    lines.append(f"• {item['text']}")
            return "\n".join(lines)
        
        content = format_items_for_content(all_completed_items, "Completed").strip()
        content += format_items_for_content(all_blocker_items, "Blockers")
        content += format_items_for_content(all_tomorrow_focus_items, "Tomorrow's Focus")
        
        # Collect all linked items from all fields
        all_linked = []
        for items in [all_completed_items, all_blocker_items, all_tomorrow_focus_items]:
            all_linked.extend([item["linked_item"] for item in items if item.get("linked_item")])
        
        post_doc = {
            "id": str(uuid.uuid4()),
            "title": f"Daily Update - {update_date}",
            "content": content,
            "post_type": "daily_update",
            "visibility": "department",
            "department": user.get("department"),
            "author_id": user["id"],
            "author_name": user.get("name"),
            "author_department": user.get("department"),
            "tags": ["daily-update"],
            "attachments": [],
            "priority": "normal",
            "created_at": datetime.now(timezone.utc).isoformat(),
            "updated_at": datetime.now(timezone.utc).isoformat(),
            "is_pinned": False,
            "is_edited": False,
            "daily_update_id": update_id,
            "linked_items": all_linked,
        }
        await db.pulse_posts.insert_one(post_doc)
        message = "Daily update submitted"
    
    if "_id" in update_doc:
        del update_doc["_id"]
    
    return {"success": True, "message": message, "update": update_doc}


@router.post("/updates/weekly")
async def submit_weekly_update(update: WeeklyUpdateCreate, user: dict = Depends(get_current_user)):
    """Submit a weekly update with optional linked tasks/projects for all fields"""
    if db is None:
        raise HTTPException(status_code=500, detail="Database not available")
    
    update_id = str(uuid.uuid4())
    week_start = (datetime.now(timezone.utc) - timedelta(days=datetime.now(timezone.utc).weekday())).strftime("%Y-%m-%d")
    
    # Helper function to merge legacy and new items
    def merge_items(legacy_list, new_items_list):
        all_items = []
        for text in legacy_list:
            if text and text.strip():
                all_items.append({"text": text, "linked_item": None, "completion_date": None})
        for item in new_items_list:
            all_items.append({
                "text": item.text,
                "linked_item": item.linked_item.model_dump() if item.linked_item else None,
                "completion_date": item.completion_date
            })
        return all_items
    
    # Merge all fields
    all_achievement_items = merge_items(update.achievements, update.achievement_items)
    all_issues_items = merge_items(update.issues_faced, update.issues_faced_items)
    all_next_week_items = merge_items(update.next_week_focus, update.next_week_focus_items)
    all_highlights_items = merge_items(update.team_highlights, update.team_highlights_items)
    
    if not all_achievement_items:
        raise HTTPException(status_code=400, detail="Please add at least one achievement")
    
    update_doc = {
        "id": update_id,
        "user_id": user["id"],
        "user_name": user.get("name"),
        "department": user.get("department"),
        "week_start": week_start,
        "achievements": [item["text"] for item in all_achievement_items],
        "achievement_items": all_achievement_items,
        "key_metrics": update.key_metrics,
        "issues_faced": [item["text"] for item in all_issues_items],
        "issues_faced_items": all_issues_items,
        "next_week_focus": [item["text"] for item in all_next_week_items],
        "next_week_focus_items": all_next_week_items,
        "team_highlights": [item["text"] for item in all_highlights_items],
        "team_highlights_items": all_highlights_items,
        "notes": update.notes,
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    
    await db.pulse_weekly_updates.insert_one(update_doc)
    
    # Helper to format items for post content
    def format_items_for_content(items, section_title):
        if not items:
            return ""
        lines = [f"\n\n**{section_title}:**"]
        for item in items:
            if item.get("linked_item"):
                link = item["linked_item"]
                lines.append(f"• {item['text']} [🔗 {link.get('item_type', 'item')}: {link.get('item_name', '')}]")
            else:
                lines.append(f"• {item['text']}")
        return "\n".join(lines)
    
    content = format_items_for_content(all_achievement_items, "Weekly Achievements").strip()
    content += format_items_for_content(all_highlights_items, "Team Highlights")
    content += format_items_for_content(all_issues_items, "Challenges")
    content += format_items_for_content(all_next_week_items, "Next Week Focus")
    
    # Collect all linked items from all fields
    all_linked = []
    for items in [all_achievement_items, all_issues_items, all_next_week_items, all_highlights_items]:
        all_linked.extend([item["linked_item"] for item in items if item.get("linked_item")])
    
    post_doc = {
        "id": str(uuid.uuid4()),
        "title": f"Weekly Update - Week of {week_start}",
        "content": content,
        "post_type": "weekly_update",
        "visibility": "public",
        "department": user.get("department"),
        "author_id": user["id"],
        "author_name": user.get("name"),
        "author_department": user.get("department"),
        "tags": ["weekly-update", user.get("department", "general")],
        "attachments": [],
        "priority": "normal",
        "created_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat(),
        "is_pinned": False,
        "is_edited": False,
        "weekly_update_id": update_id,
        "linked_items": all_linked,
    }
    await db.pulse_posts.insert_one(post_doc)
    
    if "_id" in update_doc:
        del update_doc["_id"]
    
    return {"success": True, "message": "Weekly update submitted", "update": update_doc}


@router.get("/updates/daily")
async def get_daily_updates(
    user_id: Optional[str] = None,
    department: Optional[str] = None,
    date: Optional[str] = None,
    limit: int = 20,
    current_user: dict = Depends(get_current_user)
):
    """Get daily updates with filters"""
    if db is None:
        return {"updates": []}
    
    query = {}
    if user_id:
        query["user_id"] = user_id
    if department:
        query["department"] = department
    if date:
        query["date"] = date
    
    updates = await db.pulse_daily_updates.find(
        query, {"_id": 0}
    ).sort("created_at", -1).limit(limit).to_list(limit)
    
    return {"updates": updates}


@router.get("/updates/weekly")
async def get_weekly_updates(
    user_id: Optional[str] = None,
    department: Optional[str] = None,
    limit: int = 10,
    current_user: dict = Depends(get_current_user)
):
    """Get weekly updates"""
    if db is None:
        return {"updates": []}
    
    query = {}
    if user_id:
        query["user_id"] = user_id
    if department:
        query["department"] = department
    
    updates = await db.pulse_weekly_updates.find(
        query, {"_id": 0}
    ).sort("created_at", -1).limit(limit).to_list(limit)
    
    return {"updates": updates}


# ============== MONTHLY UPDATES ==============

@router.post("/updates/monthly")
async def submit_monthly_update(update: MonthlyUpdateCreate, user: dict = Depends(get_current_user)):
    """Submit a monthly work update"""
    if db is None:
        raise HTTPException(status_code=500, detail="Database not available")
    
    update_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc)
    month = update.month or now.strftime("%Y-%m")
    
    # Helper function to merge legacy and new items
    def merge_items(legacy_list, new_items_list):
        all_items = []
        for text in legacy_list:
            if text and text.strip():
                all_items.append({"text": text, "linked_item": None})
        for item in new_items_list:
            all_items.append({
                "text": item.text,
                "linked_item": item.linked_item.model_dump() if item.linked_item else None,
            })
        return all_items
    
    # Merge all fields
    all_accomplishments = merge_items(update.accomplishments, update.accomplishment_items)
    all_goals_progress = merge_items(update.goals_progress, update.goals_progress_items)
    all_challenges = merge_items(update.challenges, update.challenge_items)
    all_next_focus = merge_items(update.next_month_focus, update.next_month_focus_items)
    all_team_highlights = merge_items(update.team_highlights, update.team_highlights_items)
    
    if not all_accomplishments:
        raise HTTPException(status_code=400, detail="Please add at least one accomplishment")
    
    # Check if already submitted for this month
    existing = await db.pulse_monthly_updates.find_one({
        "user_id": user["id"],
        "month": month
    })
    
    update_doc = {
        "id": update_id,
        "user_id": user["id"],
        "user_name": user.get("name"),
        "department": user.get("department"),
        "month": month,
        "accomplishment_items": all_accomplishments,
        "goals_progress_items": all_goals_progress,
        "challenge_items": all_challenges,
        "next_month_focus_items": all_next_focus,
        "team_highlights_items": all_team_highlights,
        "key_metrics": update.key_metrics,
        "notes": update.notes,
        "created_at": now.isoformat(),
        "updated_at": now.isoformat()
    }
    
    if existing:
        # Update existing
        await db.pulse_monthly_updates.update_one(
            {"id": existing["id"]},
            {"$set": {
                **update_doc,
                "id": existing["id"],
                "created_at": existing.get("created_at", now.isoformat())
            }}
        )
        update_id = existing["id"]
        logger.info(f"Monthly update updated for {user['id']} - {month}")
    else:
        await db.pulse_monthly_updates.insert_one(update_doc)
        logger.info(f"Monthly update created for {user['id']} - {month}")
    
    # Create a pulse post for visibility
    month_name = datetime.strptime(month, "%Y-%m").strftime("%B %Y")
    post_doc = {
        "id": str(uuid.uuid4()),
        "author_id": user["id"],
        "author_name": user.get("name"),
        "department": user.get("department"),
        "title": f"Monthly Update - {month_name}",
        "content": f"Shared monthly update for {month_name}",
        "post_type": "monthly_update",
        "visibility": "public",
        "priority": "normal",
        "tags": ["monthly-update", user.get("department", "general")],
        "reactions": {},
        "comment_count": 0,
        "monthly_update_id": update_id,
        "created_at": now.isoformat(),
        "updated_at": now.isoformat(),
    }
    await db.pulse_posts.insert_one(post_doc)
    
    return {"message": "Monthly update submitted", "update_id": update_id}


@router.get("/updates/monthly")
async def get_monthly_updates(
    user_id: Optional[str] = None,
    department: Optional[str] = None,
    limit: int = 10,
    current_user: dict = Depends(get_current_user)
):
    """Get monthly updates"""
    if db is None:
        return {"updates": []}
    
    query = {}
    if user_id:
        query["user_id"] = user_id
    if department:
        query["department"] = department
    
    updates = await db.pulse_monthly_updates.find(
        query, {"_id": 0}
    ).sort("month", -1).limit(limit).to_list(limit)
    
    return {"updates": updates}


# ============== QUARTERLY UPDATES ==============

@router.post("/updates/quarterly")
async def submit_quarterly_update(update: QuarterlyUpdateCreate, user: dict = Depends(get_current_user)):
    """Submit a quarterly work update"""
    if db is None:
        raise HTTPException(status_code=500, detail="Database not available")
    
    update_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc)
    
    # Determine current quarter
    if update.quarter:
        quarter = update.quarter
    else:
        month = now.month
        q = (month - 1) // 3 + 1
        quarter = f"{now.year}-Q{q}"
    
    # Helper function to merge legacy and new items
    def merge_items(legacy_list, new_items_list):
        all_items = []
        for text in legacy_list:
            if text and text.strip():
                all_items.append({"text": text, "linked_item": None})
        for item in new_items_list:
            all_items.append({
                "text": item.text,
                "linked_item": item.linked_item.model_dump() if item.linked_item else None,
            })
        return all_items
    
    # Merge all fields
    all_achievements = merge_items(update.achievements, update.achievement_items)
    all_okr_progress = merge_items(update.okr_progress, update.okr_progress_items)
    all_learnings = merge_items(update.learnings, update.learning_items)
    all_challenges = merge_items(update.challenges, update.challenge_items)
    all_next_focus = merge_items(update.next_quarter_focus, update.next_quarter_focus_items)
    all_team_highlights = merge_items(update.team_highlights, update.team_highlights_items)
    
    if not all_achievements:
        raise HTTPException(status_code=400, detail="Please add at least one achievement")
    
    # Check if already submitted for this quarter
    existing = await db.pulse_quarterly_updates.find_one({
        "user_id": user["id"],
        "quarter": quarter
    })
    
    update_doc = {
        "id": update_id,
        "user_id": user["id"],
        "user_name": user.get("name"),
        "department": user.get("department"),
        "quarter": quarter,
        "achievement_items": all_achievements,
        "okr_progress_items": all_okr_progress,
        "learning_items": all_learnings,
        "challenge_items": all_challenges,
        "next_quarter_focus_items": all_next_focus,
        "team_highlights_items": all_team_highlights,
        "key_metrics": update.key_metrics,
        "notes": update.notes,
        "created_at": now.isoformat(),
        "updated_at": now.isoformat()
    }
    
    if existing:
        # Update existing
        await db.pulse_quarterly_updates.update_one(
            {"id": existing["id"]},
            {"$set": {
                **update_doc,
                "id": existing["id"],
                "created_at": existing.get("created_at", now.isoformat())
            }}
        )
        update_id = existing["id"]
        logger.info(f"Quarterly update updated for {user['id']} - {quarter}")
    else:
        await db.pulse_quarterly_updates.insert_one(update_doc)
        logger.info(f"Quarterly update created for {user['id']} - {quarter}")
    
    # Create a pulse post for visibility
    post_doc = {
        "id": str(uuid.uuid4()),
        "author_id": user["id"],
        "author_name": user.get("name"),
        "department": user.get("department"),
        "title": f"Quarterly Update - {quarter}",
        "content": f"Shared quarterly update for {quarter}",
        "post_type": "quarterly_update",
        "visibility": "public",
        "priority": "normal",
        "tags": ["quarterly-update", user.get("department", "general")],
        "reactions": {},
        "comment_count": 0,
        "quarterly_update_id": update_id,
        "created_at": now.isoformat(),
        "updated_at": now.isoformat(),
    }
    await db.pulse_posts.insert_one(post_doc)
    
    return {"message": "Quarterly update submitted", "update_id": update_id}


@router.get("/updates/quarterly")
async def get_quarterly_updates(
    user_id: Optional[str] = None,
    department: Optional[str] = None,
    limit: int = 10,
    current_user: dict = Depends(get_current_user)
):
    """Get quarterly updates"""
    if db is None:
        return {"updates": []}
    
    query = {}
    if user_id:
        query["user_id"] = user_id
    if department:
        query["department"] = department
    
    updates = await db.pulse_quarterly_updates.find(
        query, {"_id": 0}
    ).sort("quarter", -1).limit(limit).to_list(limit)
    
    return {"updates": updates}



@router.get("/updates/linkable-items")
async def get_linkable_items(
    search: Optional[str] = None,
    item_type: Optional[str] = None,  # "task", "project", or None for all
    limit: int = 50,
    current_user: dict = Depends(get_current_user)
):
    """Get tasks and projects that can be linked to work updates"""
    if db is None:
        return {"items": []}
    
    items = []
    user_id = current_user["id"]
    
    # Get tasks assigned to user or created by user
    if not item_type or item_type == "task":
        task_query = {
            "$or": [
                {"assigned_to": user_id},
                {"created_by": user_id}
            ]
        }
        if search:
            task_query["name"] = {"$regex": search, "$options": "i"}
        
        tasks = await db.pm_tasks.find(
            task_query,
            {"_id": 0, "id": 1, "name": 1, "project_id": 1, "status": 1, "due_date": 1, "updated_at": 1}
        ).sort("updated_at", -1).limit(limit).to_list(limit)
        
        # Enrich tasks with project name
        for task in tasks:
            project_name = None
            if task.get("project_id"):
                project = await db.pm_projects.find_one(
                    {"id": task["project_id"]},
                    {"_id": 0, "name": 1}
                )
                project_name = project.get("name") if project else None
            
            items.append({
                "item_type": "task",
                "item_id": task["id"],
                "item_name": task["name"],
                "project_id": task.get("project_id"),
                "project_name": project_name,
                "status": task.get("status"),
                "due_date": task.get("due_date"),
            })
    
    # Get projects user is part of
    if not item_type or item_type == "project":
        project_query = {
            "$or": [
                {"owner_id": user_id},
                {"project_manager": user_id},
                {"team_members": user_id}
            ]
        }
        if search:
            project_query["name"] = {"$regex": search, "$options": "i"}
        
        projects = await db.pm_projects.find(
            project_query,
            {"_id": 0, "id": 1, "name": 1, "project_id": 1, "status": 1, "end_date": 1, "updated_at": 1}
        ).sort("updated_at", -1).limit(limit).to_list(limit)
        
        for project in projects:
            items.append({
                "item_type": "project",
                "item_id": project["id"],
                "item_name": project["name"],
                "project_id": None,
                "project_name": None,
                "status": project.get("status"),
                "due_date": project.get("end_date"),
                "display_id": project.get("project_id"),  # PRJ-XXX format
            })
    
    # Sort all items by most recently updated
    items.sort(key=lambda x: x.get("due_date") or "", reverse=True)
    
    return {"items": items[:limit]}


# ============== LEADERSHIP DASHBOARD ==============

@router.get("/leadership/dashboard")
async def get_leadership_dashboard(user: dict = Depends(get_current_user)):
    """Get leadership overview dashboard with all departments"""
    
    # Permission check
    if not can_view_leadership_dashboard(user):
        raise HTTPException(
            status_code=403, 
            detail="Only managers and admins can view the leadership dashboard"
        )
    
    if db is None:
        return {
            "overview": {},
            "departments": [],
            "top_contributors": [],
            "recent_issues": [],
            "recent_achievements": []
        }
    
    now = datetime.now(timezone.utc)
    today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
    week_start = now - timedelta(days=7)
    
    # Overall stats
    total_posts = await db.pulse_posts.count_documents({})
    posts_today = await db.pulse_posts.count_documents({"created_at": {"$gte": today_start.isoformat()}})
    posts_week = await db.pulse_posts.count_documents({"created_at": {"$gte": week_start.isoformat()}})
    total_recognitions = await db.pulse_recognitions.count_documents({})
    
    # Issues raised this week
    issues_count = await db.pulse_posts.count_documents({
        "post_type": "issue",
        "created_at": {"$gte": week_start.isoformat()}
    })
    
    # Achievements this week
    achievements_count = await db.pulse_posts.count_documents({
        "post_type": "achievement",
        "created_at": {"$gte": week_start.isoformat()}
    })
    
    # Department breakdown
    dept_pipeline = [
        {"$match": {"created_at": {"$gte": week_start.isoformat()}}},
        {"$group": {
            "_id": "$department",
            "post_count": {"$sum": 1},
            "contributors": {"$addToSet": "$author_id"}
        }},
        {"$project": {
            "department": "$_id",
            "post_count": 1,
            "contributor_count": {"$size": "$contributors"}
        }},
        {"$sort": {"post_count": -1}}
    ]
    departments = await db.pulse_posts.aggregate(dept_pipeline).to_list(20)
    
    # Top contributors this week
    contrib_pipeline = [
        {"$match": {"created_at": {"$gte": week_start.isoformat()}}},
        {"$group": {
            "_id": "$author_id",
            "name": {"$first": "$author_name"},
            "department": {"$first": "$author_department"},
            "post_count": {"$sum": 1}
        }},
        {"$sort": {"post_count": -1}},
        {"$limit": 5}
    ]
    top_contributors = await db.pulse_posts.aggregate(contrib_pipeline).to_list(5)
    
    # Recent issues
    recent_issues = await db.pulse_posts.find(
        {"post_type": "issue"},
        {"_id": 0, "id": 1, "title": 1, "author_name": 1, "department": 1, "created_at": 1, "priority": 1}
    ).sort("created_at", -1).limit(5).to_list(5)
    
    # Recent achievements
    recent_achievements = await db.pulse_posts.find(
        {"post_type": "achievement"},
        {"_id": 0, "id": 1, "title": 1, "author_name": 1, "department": 1, "created_at": 1}
    ).sort("created_at", -1).limit(5).to_list(5)
    
    return {
        "overview": {
            "total_posts": total_posts,
            "posts_today": posts_today,
            "posts_this_week": posts_week,
            "total_recognitions": total_recognitions,
            "issues_this_week": issues_count,
            "achievements_this_week": achievements_count,
        },
        "departments": [
            {
                "name": d.get("_id") or "general",
                "posts": d["post_count"],
                "contributors": d["contributor_count"]
            }
            for d in departments if d.get("_id")
        ],
        "top_contributors": [
            {
                "user_id": c["_id"],
                "name": c["name"],
                "department": c["department"],
                "posts": c["post_count"]
            }
            for c in top_contributors
        ],
        "recent_issues": recent_issues,
        "recent_achievements": recent_achievements,
    }


# ============== AUTOMATED SYSTEM UPDATES ==============

@router.post("/system/auto-update")
async def create_system_update(
    module: str,
    title: str,
    content: str,
    metrics: Dict[str, Any] = None,
    api_key: str = None
):
    """
    Create an automated system update from other Sevora modules.
    Can be called by internal services.
    """
    # Simple API key check (in production, use proper service auth)
    expected_key = os.environ.get("PULSE_SYSTEM_KEY", "sevora-pulse-internal")
    if api_key != expected_key:
        raise HTTPException(status_code=403, detail="Invalid system key")
    
    if db is None:
        raise HTTPException(status_code=500, detail="Database not available")
    
    post_id = str(uuid.uuid4())
    post_doc = {
        "id": post_id,
        "title": title,
        "content": content,
        "post_type": "operational",
        "visibility": "public",
        "department": module,
        "author_id": "system",
        "author_name": f"Sevora {module.title()} System",
        "author_department": module,
        "tags": ["system-update", module],
        "attachments": [],
        "priority": "normal",
        "is_system_generated": True,
        "system_module": module,
        "system_metrics": metrics or {},
        "created_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat(),
        "is_pinned": False,
        "is_edited": False,
    }
    
    await db.pulse_posts.insert_one(post_doc)
    
    return {"success": True, "post_id": post_id, "message": "System update posted"}


@router.get("/system/recent")
async def get_system_updates(limit: int = 10, user: dict = Depends(get_current_user)):
    """Get recent system-generated updates"""
    if db is None:
        return {"updates": []}
    
    updates = await db.pulse_posts.find(
        {"is_system_generated": True},
        {"_id": 0}
    ).sort("created_at", -1).limit(limit).to_list(limit)
    
    return {"updates": updates}



# ============== EMPLOYEE PROFILE ==============

@router.get("/employees/{employee_id}/profile")
async def get_employee_profile(employee_id: str, current_user: dict = Depends(get_current_user)):
    """Get employee profile with activity summary"""
    if db is None:
        raise HTTPException(status_code=500, detail="Database not available")
    
    # Get employee info
    employee = await db.users.find_one({"id": employee_id}, {"_id": 0, "password": 0})
    if not employee:
        raise HTTPException(status_code=404, detail="Employee not found")
    
    # Get activity counts
    posts_count = await db.pulse_posts.count_documents({"author_id": employee_id})
    recognitions_received = await db.pulse_recognitions.count_documents({"recipient_id": employee_id})
    recognitions_given = await db.pulse_recognitions.count_documents({"giver_id": employee_id})
    daily_updates = await db.pulse_daily_updates.count_documents({"user_id": employee_id})
    weekly_updates = await db.pulse_weekly_updates.count_documents({"user_id": employee_id})
    
    # Get badge breakdown
    badge_pipeline = [
        {"$match": {"recipient_id": employee_id}},
        {"$group": {"_id": "$badge_type", "count": {"$sum": 1}}}
    ]
    badges = await db.pulse_recognitions.aggregate(badge_pipeline).to_list(20)
    badges_by_type = {b["_id"]: b["count"] for b in badges}
    
    return {
        "employee": employee,
        "stats": {
            "posts_count": posts_count,
            "recognitions_received": recognitions_received,
            "recognitions_given": recognitions_given,
            "daily_updates": daily_updates,
            "weekly_updates": weekly_updates,
            "total_badges": recognitions_received,
            "badges_by_type": badges_by_type
        }
    }


@router.get("/employees/{employee_id}/activity")
async def get_employee_activity(
    employee_id: str,
    activity_type: Optional[str] = None,  # posts, recognitions, updates
    limit: int = 20,
    skip: int = 0,
    current_user: dict = Depends(get_current_user)
):
    """Get employee activity timeline"""
    if db is None:
        return {"activities": [], "total": 0}
    
    activities = []
    
    # Fetch posts
    if not activity_type or activity_type == "posts":
        posts = await db.pulse_posts.find(
            {"author_id": employee_id},
            {"_id": 0}
        ).sort("created_at", -1).limit(limit if activity_type else 10).to_list(limit if activity_type else 10)
        
        for post in posts:
            activities.append({
                "type": "post",
                "id": post.get("id"),
                "title": post.get("title"),
                "content": post.get("content", "")[:200],
                "post_type": post.get("post_type"),
                "created_at": post.get("created_at"),
                "reactions": post.get("reactions", {}),
                "comment_count": post.get("comment_count", 0)
            })
    
    # Fetch recognitions received
    if not activity_type or activity_type == "recognitions":
        recognitions = await db.pulse_recognitions.find(
            {"recipient_id": employee_id},
            {"_id": 0}
        ).sort("created_at", -1).limit(limit if activity_type else 10).to_list(limit if activity_type else 10)
        
        for rec in recognitions:
            activities.append({
                "type": "recognition_received",
                "id": rec.get("id"),
                "badge_type": rec.get("badge_type"),
                "reason": rec.get("reason"),
                "giver_name": rec.get("giver_name"),
                "giver_id": rec.get("giver_id"),
                "created_at": rec.get("created_at")
            })
    
    # Fetch daily updates
    if not activity_type or activity_type == "updates":
        daily = await db.pulse_daily_updates.find(
            {"user_id": employee_id},
            {"_id": 0}
        ).sort("created_at", -1).limit(limit if activity_type else 5).to_list(limit if activity_type else 5)
        
        for update in daily:
            activities.append({
                "type": "daily_update",
                "id": update.get("id"),
                "date": update.get("date"),
                "completed_tasks": update.get("completed_tasks", []),
                "blockers": update.get("blockers", []),
                "created_at": update.get("created_at")
            })
        
        # Weekly updates
        weekly = await db.pulse_weekly_updates.find(
            {"user_id": employee_id},
            {"_id": 0}
        ).sort("created_at", -1).limit(limit if activity_type else 5).to_list(limit if activity_type else 5)
        
        for update in weekly:
            activities.append({
                "type": "weekly_update",
                "id": update.get("id"),
                "week_start": update.get("week_start"),
                "achievements": update.get("achievements", []),
                "created_at": update.get("created_at")
            })
    
    # Sort all activities by created_at
    activities.sort(key=lambda x: x.get("created_at", ""), reverse=True)
    
    # Apply pagination
    total = len(activities)
    activities = activities[skip:skip + limit]
    
    return {"activities": activities, "total": total}


@router.get("/employees")
async def list_employees(
    department: Optional[str] = None,
    search: Optional[str] = None,
    limit: int = 50,
    current_user: dict = Depends(get_current_user)
):
    """List employees for mentions and profiles"""
    if db is None:
        return {"employees": []}
    
    query = {"status": {"$ne": "inactive"}}
    if department:
        query["department"] = department
    
    employees = await db.users.find(
        query,
        {"_id": 0, "id": 1, "name": 1, "email": 1, "department": 1, "role": 1, "avatar": 1}
    ).limit(limit).to_list(limit)
    
    # Filter by search if provided
    if search:
        search_lower = search.lower()
        employees = [e for e in employees if 
                    search_lower in e.get("name", "").lower() or 
                    search_lower in e.get("email", "").lower()]
    
    return {"employees": employees}



# ============== PERMISSIONS ==============

@router.get("/permissions")
async def get_user_permissions(user: dict = Depends(get_current_user)):
    """Get current user's Pulse permissions"""
    role = user.get("role", "employee")
    permissions = PULSE_PERMISSIONS.get(role, PULSE_PERMISSIONS["employee"])
    
    # Expand wildcard
    if "*" in permissions:
        all_permissions = set()
        for perms in PULSE_PERMISSIONS.values():
            if "*" not in perms:
                all_permissions.update(perms)
        permissions = list(all_permissions)
    
    return {
        "role": role,
        "permissions": permissions,
        "can_create_announcement": can_create_announcement(user),
        "can_pin_post": can_pin_post(user),
        "can_delete_any_post": can_delete_any_post(user),
        "can_view_leadership_dashboard": can_view_leadership_dashboard(user),
    }



# ============== ANALYTICS & REPORTING ==============

@router.get("/analytics/engagement")
async def get_engagement_analytics(
    period: str = "week",  # day, week, month
    user: dict = Depends(get_current_user)
):
    """Get engagement analytics for Pulse"""
    if not can_view_leadership_dashboard(user):
        raise HTTPException(status_code=403, detail="Access denied")
    
    if db is None:
        return {"analytics": {}}
    
    # Calculate date range
    now = datetime.now(timezone.utc)
    if period == "day":
        start_date = (now - timedelta(days=1)).isoformat()
    elif period == "week":
        start_date = (now - timedelta(days=7)).isoformat()
    else:  # month
        start_date = (now - timedelta(days=30)).isoformat()
    
    # Posts by type
    posts_by_type = await db.pulse_posts.aggregate([
        {"$match": {"created_at": {"$gte": start_date}}},
        {"$group": {"_id": "$post_type", "count": {"$sum": 1}}}
    ]).to_list(20)
    
    # Reactions count
    reactions_count = await db.pulse_reactions.count_documents({"created_at": {"$gte": start_date}})
    
    # Comments count
    comments_count = await db.pulse_comments.count_documents({"created_at": {"$gte": start_date}})
    
    # Recognitions count
    recognitions_count = await db.pulse_recognitions.count_documents({"created_at": {"$gte": start_date}})
    
    # Most engaging posts (by reactions + comments)
    top_posts = await db.pulse_posts.aggregate([
        {"$match": {"created_at": {"$gte": start_date}}},
        {"$lookup": {
            "from": "pulse_reactions",
            "localField": "id",
            "foreignField": "post_id",
            "as": "reactions_list"
        }},
        {"$lookup": {
            "from": "pulse_comments",
            "localField": "id",
            "foreignField": "post_id",
            "as": "comments_list"
        }},
        {"$addFields": {
            "engagement": {"$add": [{"$size": "$reactions_list"}, {"$size": "$comments_list"}]}
        }},
        {"$sort": {"engagement": -1}},
        {"$limit": 5},
        {"$project": {
            "_id": 0,
            "id": 1,
            "title": 1,
            "author_name": 1,
            "post_type": 1,
            "engagement": 1,
            "created_at": 1
        }}
    ]).to_list(5)
    
    # Activity by day
    daily_activity = await db.pulse_posts.aggregate([
        {"$match": {"created_at": {"$gte": start_date}}},
        {"$addFields": {
            "date": {"$substr": ["$created_at", 0, 10]}
        }},
        {"$group": {"_id": "$date", "posts": {"$sum": 1}}},
        {"$sort": {"_id": 1}}
    ]).to_list(31)
    
    return {
        "period": period,
        "analytics": {
            "posts_by_type": {p["_id"]: p["count"] for p in posts_by_type},
            "total_posts": sum(p["count"] for p in posts_by_type),
            "total_reactions": reactions_count,
            "total_comments": comments_count,
            "total_recognitions": recognitions_count,
            "top_engaging_posts": top_posts,
            "daily_activity": [{"date": d["_id"], "posts": d["posts"]} for d in daily_activity]
        }
    }


@router.get("/analytics/export")
async def export_pulse_data(
    export_type: str = "posts",  # posts, recognitions, updates
    format: str = "json",  # json, csv
    limit: int = 1000,
    user: dict = Depends(get_current_user)
):
    """Export Pulse data for reporting"""
    if not can_view_leadership_dashboard(user):
        raise HTTPException(status_code=403, detail="Access denied")
    
    if db is None:
        return {"data": []}
    
    if export_type == "posts":
        data = await db.pulse_posts.find(
            {},
            {"_id": 0, "id": 1, "title": 1, "content": 1, "post_type": 1, "author_name": 1, 
             "department": 1, "created_at": 1, "visibility": 1}
        ).sort("created_at", -1).limit(limit).to_list(limit)
    elif export_type == "recognitions":
        data = await db.pulse_recognitions.find(
            {},
            {"_id": 0, "id": 1, "giver_name": 1, "recipient_name": 1, "badge_type": 1, 
             "reason": 1, "created_at": 1}
        ).sort("created_at", -1).limit(limit).to_list(limit)
    elif export_type == "updates":
        daily = await db.pulse_daily_updates.find(
            {},
            {"_id": 0, "id": 1, "user_name": 1, "department": 1, "date": 1, 
             "completed_tasks": 1, "blockers": 1}
        ).sort("created_at", -1).limit(limit // 2).to_list(limit // 2)
        weekly = await db.pulse_weekly_updates.find(
            {},
            {"_id": 0, "id": 1, "user_name": 1, "department": 1, "week_start": 1, 
             "achievements": 1}
        ).sort("created_at", -1).limit(limit // 2).to_list(limit // 2)
        data = {"daily_updates": daily, "weekly_updates": weekly}
    else:
        data = []
    
    if format == "csv" and export_type != "updates":
        # Convert to CSV string
        import csv
        import io
        output = io.StringIO()
        if data:
            writer = csv.DictWriter(output, fieldnames=data[0].keys())
            writer.writeheader()
            writer.writerows(data)
        return {"csv": output.getvalue(), "filename": f"pulse_{export_type}_{datetime.now().strftime('%Y%m%d')}.csv"}
    
    return {"data": data, "count": len(data) if isinstance(data, list) else None}



# ============== QUICK ACTIONS - REVERSE INTEGRATIONS ==============

class CreateTaskFromPostRequest(BaseModel):
    project_id: Optional[str] = None
    assignee_id: Optional[str] = None
    due_date: Optional[str] = None
    priority: Optional[str] = "medium"

@router.post("/posts/{post_id}/create-task")
async def create_task_from_post(
    post_id: str,
    request: CreateTaskFromPostRequest = None,
    user: dict = Depends(get_current_user)
):
    """Create a task from a Pulse post (blocker, issue, or any post)"""
    if db is None:
        raise HTTPException(status_code=500, detail="Database not available")
    
    # Get the post
    post = await db.pulse_posts.find_one({"id": post_id})
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")
    
    # Check if task already exists for this post
    if post.get("linked_task_id"):
        existing_task = await db.pm_tasks.find_one({"id": post["linked_task_id"]}, {"_id": 0})
        if existing_task:
            return {
                "success": False,
                "message": "Task already exists for this post",
                "task": existing_task
            }
    
    # Create the task
    task_id = str(uuid.uuid4())
    task_doc = {
        "id": task_id,
        "name": f"[From Pulse] {post.get('title', 'Task from Pulse')}",
        "description": f"Created from Pulse post.\n\n---\n{post.get('content', '')}",
        "status": "not_started",
        "priority": request.priority if request else post.get("priority", "medium"),
        "project_id": request.project_id if request else None,
        "assigned_to": request.assignee_id if request else user.get("id"),
        "due_date": request.due_date if request else None,
        "labels": ["from-pulse"],
        "created_by": user.get("id"),
        "created_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat(),
        "source_module": "pulse",
        "source_post_id": post_id,
    }
    
    # Add specific labels based on post type
    if post.get("post_type") == "daily_update" and "blocker" in post.get("content", "").lower():
        task_doc["labels"].append("blocker")
    if post.get("post_type") == "issue":
        task_doc["labels"].append("issue")
    
    await db.pm_tasks.insert_one(task_doc)
    
    # Update the post to link to the task
    await db.pulse_posts.update_one(
        {"id": post_id},
        {"$set": {
            "linked_task_id": task_id,
            "updated_at": datetime.now(timezone.utc).isoformat()
        }}
    )
    
    # Remove MongoDB _id
    if "_id" in task_doc:
        del task_doc["_id"]
    
    return {
        "success": True,
        "message": "Task created successfully",
        "task": task_doc
    }


@router.get("/posts/{post_id}/linked-task")
async def get_linked_task(post_id: str, user: dict = Depends(get_current_user)):
    """Get the task linked to a Pulse post, if any"""
    if db is None:
        return {"task": None}
    
    post = await db.pulse_posts.find_one({"id": post_id}, {"linked_task_id": 1})
    if not post or not post.get("linked_task_id"):
        return {"task": None}
    
    task = await db.pm_tasks.find_one({"id": post["linked_task_id"]}, {"_id": 0})
    return {"task": task}


@router.post("/updates/daily/{update_id}/create-task")
async def create_task_from_daily_update_blocker(
    update_id: str,
    blocker_index: int = 0,
    request: CreateTaskFromPostRequest = None,
    user: dict = Depends(get_current_user)
):
    """Create a task from a specific blocker in a daily update"""
    if db is None:
        raise HTTPException(status_code=500, detail="Database not available")
    
    # Get the daily update
    update = await db.pulse_daily_updates.find_one({"id": update_id})
    if not update:
        raise HTTPException(status_code=404, detail="Daily update not found")
    
    # Get blocker items (prefer new structure, fallback to legacy)
    blocker_items = update.get("blocker_items", [])
    if not blocker_items:
        blockers = update.get("blockers", [])
        blocker_items = [{"text": b} for b in blockers]
    
    if blocker_index >= len(blocker_items):
        raise HTTPException(status_code=400, detail="Invalid blocker index")
    
    blocker = blocker_items[blocker_index]
    blocker_text = blocker.get("text", "") if isinstance(blocker, dict) else blocker
    
    # Check if task already exists
    existing_task = await db.pm_tasks.find_one({
        "source_module": "pulse_blocker",
        "source_update_id": update_id,
        "source_blocker_index": blocker_index
    }, {"_id": 0})
    
    if existing_task:
        return {
            "success": False,
            "message": "Task already exists for this blocker",
            "task": existing_task
        }
    
    # Create the task
    task_id = str(uuid.uuid4())
    linked_item = blocker.get("linked_item") if isinstance(blocker, dict) else None
    
    task_doc = {
        "id": task_id,
        "name": f"[Blocker] {blocker_text[:100]}",
        "description": f"Blocker reported by {update.get('user_name', 'Team member')} on {update.get('date', 'unknown date')}.\n\n{blocker_text}",
        "status": "not_started",
        "priority": request.priority if request else "high",  # Blockers are high priority by default
        "project_id": request.project_id if request else (linked_item.get("project_id") if linked_item else None),
        "assigned_to": request.assignee_id if request else user.get("id"),
        "due_date": request.due_date if request else None,
        "labels": ["from-pulse", "blocker"],
        "created_by": user.get("id"),
        "created_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat(),
        "source_module": "pulse_blocker",
        "source_update_id": update_id,
        "source_blocker_index": blocker_index,
    }
    
    await db.pm_tasks.insert_one(task_doc)
    
    # Update the blocker to link to the task
    if blocker_items and isinstance(blocker_items[blocker_index], dict):
        blocker_items[blocker_index]["linked_task_id"] = task_id
        await db.pulse_daily_updates.update_one(
            {"id": update_id},
            {"$set": {"blocker_items": blocker_items}}
        )
    
    if "_id" in task_doc:
        del task_doc["_id"]
    
    return {
        "success": True,
        "message": "Task created from blocker",
        "task": task_doc
    }
