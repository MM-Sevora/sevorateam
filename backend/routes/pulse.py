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
    
    # Create notification for recipient
    await db.notifications.insert_one({
        "id": str(uuid.uuid4()),
        "user_id": recognition.recipient_id,
        "type": "pulse_recognition",
        "title": f"{badge_info['emoji']} You received a badge!",
        "message": f"{user.get('name')} gave you the {badge_info['label']} badge: \"{recognition.reason[:100]}...\"",
        "link": "/pulse/recognition",
        "read": False,
        "created_at": datetime.now(timezone.utc).isoformat(),
    })
    
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

class DailyUpdateCreate(BaseModel):
    completed_tasks: List[str]
    blockers: List[str] = []
    tomorrow_focus: List[str] = []
    notes: Optional[str] = None

class WeeklyUpdateCreate(BaseModel):
    achievements: List[str]
    key_metrics: Dict[str, Any] = {}
    issues_faced: List[str] = []
    next_week_focus: List[str] = []
    team_highlights: List[str] = []
    notes: Optional[str] = None


@router.post("/updates/daily")
async def submit_daily_update(update: DailyUpdateCreate, user: dict = Depends(get_current_user)):
    """Submit a daily work update"""
    if db is None:
        raise HTTPException(status_code=500, detail="Database not available")
    
    update_id = str(uuid.uuid4())
    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    
    # Check if already submitted today
    existing = await db.pulse_daily_updates.find_one({
        "user_id": user["id"],
        "date": today
    })
    
    update_doc = {
        "id": update_id,
        "user_id": user["id"],
        "user_name": user.get("name"),
        "department": user.get("department"),
        "date": today,
        "completed_tasks": update.completed_tasks,
        "blockers": update.blockers,
        "tomorrow_focus": update.tomorrow_focus,
        "notes": update.notes,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat(),
    }
    
    if existing:
        # Update existing
        await db.pulse_daily_updates.update_one(
            {"id": existing["id"]},
            {"$set": {
                "completed_tasks": update.completed_tasks,
                "blockers": update.blockers,
                "tomorrow_focus": update.tomorrow_focus,
                "notes": update.notes,
                "updated_at": datetime.now(timezone.utc).isoformat(),
            }}
        )
        update_doc["id"] = existing["id"]
        message = "Daily update updated"
    else:
        await db.pulse_daily_updates.insert_one(update_doc)
        
        # Create a post
        content = "**Completed:**\n" + "\n".join(f"• {t}" for t in update.completed_tasks)
        if update.blockers:
            content += "\n\n**Blockers:**\n" + "\n".join(f"• {b}" for b in update.blockers)
        if update.tomorrow_focus:
            content += "\n\n**Tomorrow's Focus:**\n" + "\n".join(f"• {f}" for f in update.tomorrow_focus)
        
        post_doc = {
            "id": str(uuid.uuid4()),
            "title": f"Daily Update - {today}",
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
        }
        await db.pulse_posts.insert_one(post_doc)
        message = "Daily update submitted"
    
    if "_id" in update_doc:
        del update_doc["_id"]
    
    return {"success": True, "message": message, "update": update_doc}


@router.post("/updates/weekly")
async def submit_weekly_update(update: WeeklyUpdateCreate, user: dict = Depends(get_current_user)):
    """Submit a weekly update (usually by team leads)"""
    if db is None:
        raise HTTPException(status_code=500, detail="Database not available")
    
    update_id = str(uuid.uuid4())
    week_start = (datetime.now(timezone.utc) - timedelta(days=datetime.now(timezone.utc).weekday())).strftime("%Y-%m-%d")
    
    update_doc = {
        "id": update_id,
        "user_id": user["id"],
        "user_name": user.get("name"),
        "department": user.get("department"),
        "week_start": week_start,
        "achievements": update.achievements,
        "key_metrics": update.key_metrics,
        "issues_faced": update.issues_faced,
        "next_week_focus": update.next_week_focus,
        "team_highlights": update.team_highlights,
        "notes": update.notes,
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    
    await db.pulse_weekly_updates.insert_one(update_doc)
    
    # Create a post
    content = "**Weekly Achievements:**\n" + "\n".join(f"• {a}" for a in update.achievements)
    if update.team_highlights:
        content += "\n\n**Team Highlights:**\n" + "\n".join(f"• {h}" for h in update.team_highlights)
    if update.issues_faced:
        content += "\n\n**Challenges:**\n" + "\n".join(f"• {i}" for i in update.issues_faced)
    if update.next_week_focus:
        content += "\n\n**Next Week Focus:**\n" + "\n".join(f"• {f}" for f in update.next_week_focus)
    
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


# ============== LEADERSHIP DASHBOARD ==============

@router.get("/leadership/dashboard")
async def get_leadership_dashboard(user: dict = Depends(get_current_user)):
    """Get leadership overview dashboard with all departments"""
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

