"""
Knowledge Base Routes - Confluence-like documentation system
Wiki pages, spaces, templates, and version history
"""

from fastapi import APIRouter, HTTPException, Depends, Query
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from typing import Optional, List
from datetime import datetime, timezone
import uuid
import jwt
import os
from pydantic import BaseModel
from enum import Enum

router = APIRouter(prefix="/knowledge", tags=["Knowledge Base"])
security = HTTPBearer()

# Database connection
from motor.motor_asyncio import AsyncIOMotorClient
client = AsyncIOMotorClient(os.environ.get('MONGO_URL', 'mongodb://localhost:27017'))
db = client[os.environ.get('DB_NAME', 'sevora_production')]


# ============== MODELS ==============

class SpaceType(str, Enum):
    ENGINEERING = "engineering"
    PRODUCT = "product"
    COMPANY = "company"
    TEAM = "team"
    PROJECT = "project"


class PageStatus(str, Enum):
    DRAFT = "draft"
    PUBLISHED = "published"
    ARCHIVED = "archived"


class SpaceCreate(BaseModel):
    name: str
    description: Optional[str] = None
    space_type: SpaceType = SpaceType.TEAM
    icon: str = "📚"
    color: str = "#3B82F6"
    is_private: bool = False


class SpaceUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    icon: Optional[str] = None
    color: Optional[str] = None
    is_private: Optional[bool] = None


class PageCreate(BaseModel):
    title: str
    space_id: str
    content: str = ""
    parent_id: Optional[str] = None  # For page hierarchy
    template_id: Optional[str] = None  # Created from template


class PageUpdate(BaseModel):
    title: Optional[str] = None
    content: Optional[str] = None
    status: Optional[PageStatus] = None
    parent_id: Optional[str] = None


class TemplateCreate(BaseModel):
    name: str
    description: Optional[str] = None
    content: str
    category: str = "general"  # rfc, design_doc, adr, runbook, meeting_notes, etc.
    icon: str = "📄"


class CommentCreate(BaseModel):
    page_id: str
    content: str
    parent_comment_id: Optional[str] = None  # For threaded replies


# ============== AUTH ==============

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    """Verify JWT token and return user"""
    try:
        token = credentials.credentials
        payload = jwt.decode(token, os.environ.get('JWT_SECRET', 'your-secret-key'), algorithms=["HS256"])
        user_id = payload.get("sub")
        user = await db.users.find_one({"id": user_id}, {"_id": 0, "password": 0})
        if not user:
            raise HTTPException(status_code=401, detail="User not found")
        return user
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")


async def get_user_name(user_id: str) -> str:
    """Get user name by ID"""
    if not user_id:
        return None
    user = await db.users.find_one({"id": user_id}, {"name": 1})
    return user.get("name") if user else None


# ============== SPACE ENDPOINTS ==============

@router.get("/spaces")
async def list_spaces(
    space_type: Optional[SpaceType] = None,
    user: dict = Depends(get_current_user)
):
    """List all knowledge spaces"""
    query = {}
    if space_type:
        query["space_type"] = space_type.value
    
    # Include public spaces and private spaces user has access to
    query["$or"] = [
        {"is_private": False},
        {"is_private": True, "members": user.get("id")},
        {"created_by": user.get("id")}
    ]
    
    spaces = await db.kb_spaces.find(query, {"_id": 0}).sort("name", 1).to_list(100)
    
    # Enrich with page counts
    for space in spaces:
        space["page_count"] = await db.kb_pages.count_documents({
            "space_id": space["id"],
            "status": {"$ne": "archived"}
        })
        space["created_by_name"] = await get_user_name(space.get("created_by"))
    
    return spaces


@router.post("/spaces")
async def create_space(
    data: SpaceCreate,
    user: dict = Depends(get_current_user)
):
    """Create a new knowledge space"""
    now = datetime.now(timezone.utc).isoformat()
    space_id = str(uuid.uuid4())
    
    # Generate unique key from name
    key = data.name.lower().replace(" ", "-")[:20]
    existing = await db.kb_spaces.find_one({"key": key})
    if existing:
        key = f"{key}-{space_id[:8]}"
    
    space_doc = {
        "id": space_id,
        "key": key,
        "name": data.name,
        "description": data.description,
        "space_type": data.space_type.value,
        "icon": data.icon,
        "color": data.color,
        "is_private": data.is_private,
        "members": [user.get("id")] if data.is_private else [],
        "created_by": user.get("id"),
        "created_at": now,
        "updated_at": now
    }
    
    await db.kb_spaces.insert_one(space_doc)
    space_doc.pop("_id", None)
    space_doc["page_count"] = 0
    space_doc["created_by_name"] = user.get("name")
    
    return space_doc


@router.get("/spaces/{space_id}")
async def get_space(
    space_id: str,
    user: dict = Depends(get_current_user)
):
    """Get space details with page tree"""
    space = await db.kb_spaces.find_one({"id": space_id}, {"_id": 0})
    if not space:
        raise HTTPException(status_code=404, detail="Space not found")
    
    space["created_by_name"] = await get_user_name(space.get("created_by"))
    
    # Get pages in hierarchical structure
    pages = await db.kb_pages.find(
        {"space_id": space_id, "status": {"$ne": "archived"}},
        {"_id": 0, "id": 1, "title": 1, "parent_id": 1, "status": 1, "updated_at": 1}
    ).sort("title", 1).to_list(500)
    
    # Build tree structure
    def build_tree(parent_id=None):
        children = []
        for page in pages:
            if page.get("parent_id") == parent_id:
                page["children"] = build_tree(page["id"])
                children.append(page)
        return children
    
    space["page_tree"] = build_tree(None)
    space["page_count"] = len(pages)
    
    return space


@router.put("/spaces/{space_id}")
async def update_space(
    space_id: str,
    data: SpaceUpdate,
    user: dict = Depends(get_current_user)
):
    """Update a space"""
    space = await db.kb_spaces.find_one({"id": space_id})
    if not space:
        raise HTTPException(status_code=404, detail="Space not found")
    
    update_data = {k: v for k, v in data.dict(exclude_unset=True).items() if v is not None}
    update_data["updated_at"] = datetime.now(timezone.utc).isoformat()
    
    await db.kb_spaces.update_one({"id": space_id}, {"$set": update_data})
    
    return await get_space(space_id, user)


@router.delete("/spaces/{space_id}")
async def delete_space(
    space_id: str,
    user: dict = Depends(get_current_user)
):
    """Delete a space and all its pages"""
    space = await db.kb_spaces.find_one({"id": space_id})
    if not space:
        raise HTTPException(status_code=404, detail="Space not found")
    
    # Archive all pages instead of deleting
    await db.kb_pages.update_many(
        {"space_id": space_id},
        {"$set": {"status": "archived", "updated_at": datetime.now(timezone.utc).isoformat()}}
    )
    
    await db.kb_spaces.delete_one({"id": space_id})
    
    return {"success": True, "message": "Space deleted"}


# ============== PAGE ENDPOINTS ==============

@router.get("/pages")
async def list_pages(
    space_id: Optional[str] = None,
    status: Optional[PageStatus] = None,
    search: Optional[str] = None,
    limit: int = Query(default=50, le=100),
    user: dict = Depends(get_current_user)
):
    """List pages with optional filters"""
    query = {"status": {"$ne": "archived"}}
    
    if space_id:
        query["space_id"] = space_id
    if status:
        query["status"] = status.value
    if search:
        query["$or"] = [
            {"title": {"$regex": search, "$options": "i"}},
            {"content": {"$regex": search, "$options": "i"}}
        ]
    
    pages = await db.kb_pages.find(query, {"_id": 0, "content": 0}).sort("updated_at", -1).to_list(limit)
    
    # Enrich with space info and author
    space_cache = {}
    for page in pages:
        space_id = page.get("space_id")
        if space_id not in space_cache:
            space = await db.kb_spaces.find_one({"id": space_id}, {"name": 1, "icon": 1, "color": 1})
            space_cache[space_id] = space or {}
        
        page["space_name"] = space_cache[space_id].get("name")
        page["space_icon"] = space_cache[space_id].get("icon")
        page["space_color"] = space_cache[space_id].get("color")
        page["created_by_name"] = await get_user_name(page.get("created_by"))
        page["updated_by_name"] = await get_user_name(page.get("updated_by"))
    
    return pages


@router.post("/pages")
async def create_page(
    data: PageCreate,
    user: dict = Depends(get_current_user)
):
    """Create a new page"""
    # Verify space exists
    space = await db.kb_spaces.find_one({"id": data.space_id}, {"name": 1})
    if not space:
        raise HTTPException(status_code=404, detail="Space not found")
    
    now = datetime.now(timezone.utc).isoformat()
    page_id = str(uuid.uuid4())
    
    # If from template, get template content
    content = data.content
    if data.template_id:
        template = await db.kb_templates.find_one({"id": data.template_id}, {"content": 1})
        if template:
            content = template.get("content", "")
    
    page_doc = {
        "id": page_id,
        "title": data.title,
        "space_id": data.space_id,
        "content": content,
        "parent_id": data.parent_id,
        "status": PageStatus.DRAFT.value,
        "version": 1,
        "created_by": user.get("id"),
        "updated_by": user.get("id"),
        "created_at": now,
        "updated_at": now
    }
    
    await db.kb_pages.insert_one(page_doc)
    
    # Save initial version
    await db.kb_page_versions.insert_one({
        "id": str(uuid.uuid4()),
        "page_id": page_id,
        "version": 1,
        "title": data.title,
        "content": content,
        "created_by": user.get("id"),
        "created_at": now
    })
    
    page_doc.pop("_id", None)
    page_doc["space_name"] = space.get("name")
    page_doc["created_by_name"] = user.get("name")
    
    return page_doc


@router.get("/pages/{page_id}")
async def get_page(
    page_id: str,
    user: dict = Depends(get_current_user)
):
    """Get page with full content"""
    page = await db.kb_pages.find_one({"id": page_id}, {"_id": 0})
    if not page:
        raise HTTPException(status_code=404, detail="Page not found")
    
    # Get space info
    space = await db.kb_spaces.find_one({"id": page.get("space_id")}, {"_id": 0, "name": 1, "icon": 1, "color": 1})
    page["space_name"] = space.get("name") if space else None
    page["space_icon"] = space.get("icon") if space else None
    page["space_color"] = space.get("color") if space else None
    
    # Get author names
    page["created_by_name"] = await get_user_name(page.get("created_by"))
    page["updated_by_name"] = await get_user_name(page.get("updated_by"))
    
    # Get child pages
    children = await db.kb_pages.find(
        {"parent_id": page_id, "status": {"$ne": "archived"}},
        {"_id": 0, "id": 1, "title": 1, "status": 1}
    ).sort("title", 1).to_list(50)
    page["children"] = children
    
    # Get comment count
    page["comment_count"] = await db.kb_comments.count_documents({"page_id": page_id})
    
    return page


@router.put("/pages/{page_id}")
async def update_page(
    page_id: str,
    data: PageUpdate,
    user: dict = Depends(get_current_user)
):
    """Update a page and create new version"""
    page = await db.kb_pages.find_one({"id": page_id})
    if not page:
        raise HTTPException(status_code=404, detail="Page not found")
    
    now = datetime.now(timezone.utc).isoformat()
    update_data = {k: v for k, v in data.dict(exclude_unset=True).items() if v is not None}
    
    # If content changed, create new version
    if "content" in update_data and update_data["content"] != page.get("content"):
        new_version = page.get("version", 1) + 1
        update_data["version"] = new_version
        
        # Save version history
        await db.kb_page_versions.insert_one({
            "id": str(uuid.uuid4()),
            "page_id": page_id,
            "version": new_version,
            "title": update_data.get("title", page.get("title")),
            "content": update_data["content"],
            "created_by": user.get("id"),
            "created_at": now
        })
    
    if "status" in update_data:
        update_data["status"] = update_data["status"].value
    
    update_data["updated_by"] = user.get("id")
    update_data["updated_at"] = now
    
    await db.kb_pages.update_one({"id": page_id}, {"$set": update_data})
    
    return await get_page(page_id, user)


@router.delete("/pages/{page_id}")
async def delete_page(
    page_id: str,
    user: dict = Depends(get_current_user)
):
    """Archive a page"""
    page = await db.kb_pages.find_one({"id": page_id})
    if not page:
        raise HTTPException(status_code=404, detail="Page not found")
    
    await db.kb_pages.update_one(
        {"id": page_id},
        {"$set": {
            "status": "archived",
            "updated_by": user.get("id"),
            "updated_at": datetime.now(timezone.utc).isoformat()
        }}
    )
    
    # Also archive child pages
    await db.kb_pages.update_many(
        {"parent_id": page_id},
        {"$set": {"status": "archived", "updated_at": datetime.now(timezone.utc).isoformat()}}
    )
    
    return {"success": True, "message": "Page archived"}


# ============== VERSION HISTORY ==============

@router.get("/pages/{page_id}/versions")
async def get_page_versions(
    page_id: str,
    user: dict = Depends(get_current_user)
):
    """Get version history for a page"""
    versions = await db.kb_page_versions.find(
        {"page_id": page_id},
        {"_id": 0}
    ).sort("version", -1).to_list(50)
    
    for v in versions:
        v["created_by_name"] = await get_user_name(v.get("created_by"))
    
    return versions


@router.get("/pages/{page_id}/versions/{version}")
async def get_page_version(
    page_id: str,
    version: int,
    user: dict = Depends(get_current_user)
):
    """Get specific version of a page"""
    version_doc = await db.kb_page_versions.find_one(
        {"page_id": page_id, "version": version},
        {"_id": 0}
    )
    if not version_doc:
        raise HTTPException(status_code=404, detail="Version not found")
    
    version_doc["created_by_name"] = await get_user_name(version_doc.get("created_by"))
    return version_doc


@router.post("/pages/{page_id}/restore/{version}")
async def restore_page_version(
    page_id: str,
    version: int,
    user: dict = Depends(get_current_user)
):
    """Restore a page to a previous version"""
    version_doc = await db.kb_page_versions.find_one(
        {"page_id": page_id, "version": version}
    )
    if not version_doc:
        raise HTTPException(status_code=404, detail="Version not found")
    
    # Update page with version content
    data = PageUpdate(
        title=version_doc.get("title"),
        content=version_doc.get("content")
    )
    
    return await update_page(page_id, data, user)


# ============== TEMPLATES ==============

@router.get("/templates")
async def list_templates(
    category: Optional[str] = None,
    user: dict = Depends(get_current_user)
):
    """List all page templates"""
    query = {}
    if category:
        query["category"] = category
    
    templates = await db.kb_templates.find(query, {"_id": 0}).sort("name", 1).to_list(100)
    return templates


@router.post("/templates")
async def create_template(
    data: TemplateCreate,
    user: dict = Depends(get_current_user)
):
    """Create a new page template"""
    now = datetime.now(timezone.utc).isoformat()
    
    template_doc = {
        "id": str(uuid.uuid4()),
        "name": data.name,
        "description": data.description,
        "content": data.content,
        "category": data.category,
        "icon": data.icon,
        "created_by": user.get("id"),
        "created_at": now,
        "updated_at": now
    }
    
    await db.kb_templates.insert_one(template_doc)
    template_doc.pop("_id", None)
    
    return template_doc


@router.delete("/templates/{template_id}")
async def delete_template(
    template_id: str,
    user: dict = Depends(get_current_user)
):
    """Delete a template"""
    result = await db.kb_templates.delete_one({"id": template_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Template not found")
    return {"success": True}


# ============== COMMENTS ==============

@router.get("/pages/{page_id}/comments")
async def get_page_comments(
    page_id: str,
    user: dict = Depends(get_current_user)
):
    """Get comments for a page"""
    comments = await db.kb_comments.find(
        {"page_id": page_id},
        {"_id": 0}
    ).sort("created_at", 1).to_list(200)
    
    for c in comments:
        c["author_name"] = await get_user_name(c.get("author_id"))
    
    return comments


@router.post("/comments")
async def create_comment(
    data: CommentCreate,
    user: dict = Depends(get_current_user)
):
    """Add a comment to a page"""
    now = datetime.now(timezone.utc).isoformat()
    
    comment_doc = {
        "id": str(uuid.uuid4()),
        "page_id": data.page_id,
        "content": data.content,
        "parent_comment_id": data.parent_comment_id,
        "author_id": user.get("id"),
        "created_at": now,
        "updated_at": now
    }
    
    await db.kb_comments.insert_one(comment_doc)
    comment_doc.pop("_id", None)
    comment_doc["author_name"] = user.get("name")
    
    return comment_doc


@router.delete("/comments/{comment_id}")
async def delete_comment(
    comment_id: str,
    user: dict = Depends(get_current_user)
):
    """Delete a comment"""
    comment = await db.kb_comments.find_one({"id": comment_id})
    if not comment:
        raise HTTPException(status_code=404, detail="Comment not found")
    
    # Only author or admin can delete
    if comment.get("author_id") != user.get("id") and user.get("role") not in ["admin", "super_admin"]:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    await db.kb_comments.delete_one({"id": comment_id})
    
    # Also delete replies
    await db.kb_comments.delete_many({"parent_comment_id": comment_id})
    
    return {"success": True}


# ============== SEARCH ==============

@router.get("/search")
async def search_knowledge_base(
    q: str = Query(..., min_length=2),
    space_id: Optional[str] = None,
    user: dict = Depends(get_current_user)
):
    """Search across all knowledge base content"""
    query = {
        "status": {"$ne": "archived"},
        "$or": [
            {"title": {"$regex": q, "$options": "i"}},
            {"content": {"$regex": q, "$options": "i"}}
        ]
    }
    
    if space_id:
        query["space_id"] = space_id
    
    pages = await db.kb_pages.find(
        query,
        {"_id": 0, "id": 1, "title": 1, "space_id": 1, "updated_at": 1}
    ).limit(20).to_list(20)
    
    # Get space names
    space_ids = list(set(p.get("space_id") for p in pages))
    spaces = await db.kb_spaces.find({"id": {"$in": space_ids}}, {"_id": 0, "id": 1, "name": 1, "icon": 1}).to_list(100)
    space_map = {s["id"]: s for s in spaces}
    
    for page in pages:
        space = space_map.get(page.get("space_id"), {})
        page["space_name"] = space.get("name")
        page["space_icon"] = space.get("icon")
    
    return pages


# ============== SEED DEFAULT TEMPLATES ==============

@router.post("/seed-templates")
async def seed_default_templates(user: dict = Depends(get_current_user)):
    """Seed default industry-standard templates"""
    if user.get("role") not in ["admin", "super_admin"]:
        raise HTTPException(status_code=403, detail="Admin access required")
    
    templates = [
        {
            "name": "RFC (Request for Comments)",
            "description": "Propose and discuss significant changes or new features",
            "category": "rfc",
            "icon": "📋",
            "content": """# RFC: [Title]

## Summary
Brief description of what you're proposing.

## Motivation
Why are we doing this? What problem does it solve?

## Detailed Design
Technical details of the implementation.

## Drawbacks
What are the downsides of this approach?

## Alternatives
What other designs have been considered?

## Unresolved Questions
What aspects need further discussion?

---
**Author:** [Your Name]
**Status:** Draft
**Created:** [Date]
"""
        },
        {
            "name": "Architecture Decision Record (ADR)",
            "description": "Document significant architectural decisions",
            "category": "adr",
            "icon": "🏗️",
            "content": """# ADR-[Number]: [Title]

## Status
Proposed | Accepted | Deprecated | Superseded

## Context
What is the issue that we're seeing that is motivating this decision?

## Decision
What is the change that we're proposing/doing?

## Consequences
What becomes easier or more difficult as a result of this change?

---
**Date:** [Date]
**Deciders:** [Names]
"""
        },
        {
            "name": "Design Document",
            "description": "Technical design specification for a feature or system",
            "category": "design_doc",
            "icon": "📐",
            "content": """# Design Document: [Feature Name]

## Overview
High-level description of the feature.

## Goals
- Goal 1
- Goal 2

## Non-Goals
- Non-goal 1

## Background
Context and prior art.

## Technical Design

### Architecture
Describe the overall architecture.

### Data Model
Database schema changes.

### API Changes
New or modified APIs.

### Security Considerations
Security implications.

## Implementation Plan
1. Phase 1: ...
2. Phase 2: ...

## Testing Strategy
How will this be tested?

## Monitoring & Alerts
What metrics and alerts are needed?

---
**Author:** [Name]
**Reviewers:** [Names]
**Status:** Draft
"""
        },
        {
            "name": "Runbook",
            "description": "Operational procedures for running and troubleshooting",
            "category": "runbook",
            "icon": "🔧",
            "content": """# Runbook: [Service/System Name]

## Overview
Brief description of the service.

## Architecture
```
[Architecture diagram or description]
```

## Dependencies
- Dependency 1
- Dependency 2

## Common Operations

### Starting the Service
```bash
# Commands here
```

### Stopping the Service
```bash
# Commands here
```

### Checking Health
```bash
# Commands here
```

## Troubleshooting

### Issue: [Common Issue 1]
**Symptoms:** ...
**Solution:** ...

### Issue: [Common Issue 2]
**Symptoms:** ...
**Solution:** ...

## Alerts

| Alert | Severity | Response |
|-------|----------|----------|
| Alert 1 | High | ... |

## Contacts
- On-call: [Contact]
- Team Slack: #channel
"""
        },
        {
            "name": "Meeting Notes",
            "description": "Template for meeting documentation",
            "category": "meeting_notes",
            "icon": "📝",
            "content": """# Meeting: [Title]

**Date:** [Date]
**Attendees:** [Names]
**Facilitator:** [Name]

## Agenda
1. Item 1
2. Item 2

## Discussion Notes

### Topic 1
- Point discussed
- Decisions made

### Topic 2
- Point discussed

## Action Items
- [ ] Action 1 - @assignee - Due: [date]
- [ ] Action 2 - @assignee - Due: [date]

## Next Steps
- Follow-up meeting: [date]
"""
        },
        {
            "name": "Onboarding Guide",
            "description": "New team member onboarding documentation",
            "category": "onboarding",
            "icon": "🎓",
            "content": """# Welcome to [Team Name]!

## Getting Started

### Day 1
- [ ] Setup development environment
- [ ] Access to tools and systems
- [ ] Meet the team

### Week 1
- [ ] Complete security training
- [ ] Review codebase
- [ ] First PR

## Key Resources
- [Link to repo]
- [Link to docs]
- [Link to Slack channels]

## Who to Ask
- **Engineering questions:** @person
- **Product questions:** @person
- **HR questions:** @person

## Team Norms
- Stand-up: [time]
- Sprint planning: [day]
- Code review expectations
"""
        },
        {
            "name": "Post-Mortem",
            "description": "Incident post-mortem analysis template",
            "category": "post_mortem",
            "icon": "🔍",
            "content": """# Incident Post-Mortem: [Title]

## Summary
Brief description of what happened.

## Timeline (All times in UTC)
| Time | Event |
|------|-------|
| HH:MM | First alert |
| HH:MM | Investigation started |
| HH:MM | Root cause identified |
| HH:MM | Fix deployed |
| HH:MM | Incident resolved |

## Impact
- Duration: X hours
- Users affected: N
- Revenue impact: $X

## Root Cause
What caused the incident?

## Resolution
What was done to fix it?

## Lessons Learned
What went well?
What could be improved?

## Action Items
- [ ] Preventive measure 1
- [ ] Monitoring improvement
- [ ] Documentation update

---
**Incident Commander:** [Name]
**Date:** [Date]
"""
        }
    ]
    
    now = datetime.now(timezone.utc).isoformat()
    created = 0
    
    for t in templates:
        existing = await db.kb_templates.find_one({"name": t["name"]})
        if not existing:
            t["id"] = str(uuid.uuid4())
            t["created_by"] = user.get("id")
            t["created_at"] = now
            t["updated_at"] = now
            await db.kb_templates.insert_one(t)
            created += 1
    
    return {"success": True, "message": f"Created {created} templates"}
