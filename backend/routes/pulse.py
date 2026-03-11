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

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/pulse", tags=["Sevora Pulse"])

# Database reference
db = None
security = HTTPBearer(auto_error=False)

def init_router(database):
    """Initialize router with database"""
    global db
    db = database


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
    post_id = str(uuid.uuid4())
    
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
    
    # Remove _id if added by MongoDB
    if "_id" in post_doc:
        del post_doc["_id"]
    
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
    """Pin/unpin a post (admin only)"""
    if user.get("role") not in ["superadmin", "admin", "department_manager"]:
        raise HTTPException(status_code=403, detail="Only admins can pin posts")
    
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
    comment_doc = {
        "id": comment_id,
        "post_id": post_id,
        "content": comment.content,
        "parent_id": comment.parent_id,  # For threaded comments
        "author_id": user["id"],
        "author_name": user.get("name", "Unknown"),
        "author_avatar": user.get("avatar"),
        "created_at": datetime.now(timezone.utc).isoformat(),
        "is_edited": False,
    }
    
    await db.pulse_comments.insert_one(comment_doc)
    
    # Create notification for post author
    if post["author_id"] != user["id"]:
        await db.notifications.insert_one({
            "id": str(uuid.uuid4()),
            "user_id": post["author_id"],
            "type": "pulse_comment",
            "title": "New comment on your post",
            "message": f"{user.get('name', 'Someone')} commented on your post: \"{post['title'][:50]}...\"",
            "link": f"/pulse/post/{post_id}",
            "read": False,
            "created_at": datetime.now(timezone.utc).isoformat(),
        })
    
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
        
        # Create notification for post author
        if post["author_id"] != user["id"]:
            emoji = REACTION_TYPES[reaction.reaction_type]["emoji"]
            await db.notifications.insert_one({
                "id": str(uuid.uuid4()),
                "user_id": post["author_id"],
                "type": "pulse_reaction",
                "title": f"{emoji} New reaction",
                "message": f"{user.get('name', 'Someone')} reacted to your post",
                "link": f"/pulse/post/{post_id}",
                "read": False,
                "created_at": datetime.now(timezone.utc).isoformat(),
            })
        
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
