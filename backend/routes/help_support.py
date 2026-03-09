"""
Help & Support Routes
Auto-scaffolds help structures when modules are created
"""
from fastapi import APIRouter, HTTPException, Depends, Query
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from typing import List, Optional
from datetime import datetime, timezone
import uuid
import re
import logging

from models.help_support import (
    HelpModuleCreate, HelpModuleUpdate, HelpModuleResponse,
    HelpArticleCreate, HelpArticleUpdate, HelpArticleResponse, ArticleStatus,
    FAQCreate, FAQUpdate, FAQResponse,
    TicketCreate, TicketUpdate, TicketResponse, TicketStatus, TicketPriority,
    TicketCommentCreate, TicketCommentResponse,
    HelpSearchResult, HelpAnalytics,
    DEFAULT_HELP_SECTIONS, DEFAULT_FAQ_TEMPLATES
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/help", tags=["Help & Support"])
security = HTTPBearer()

# Will be set by server.py
db = None
_get_current_user_func = None


def init_help_router(database, auth_dep):
    """Initialize router with dependencies"""
    global db, _get_current_user_func
    db = database
    _get_current_user_func = auth_dep


async def get_current_user_dep(credentials: HTTPAuthorizationCredentials = Depends(security)):
    """Internal dependency that wraps the auth function"""
    if _get_current_user_func is None:
        raise HTTPException(status_code=500, detail="Auth not initialized")
    return await _get_current_user_func(credentials)


def slugify(text: str) -> str:
    """Convert text to URL-friendly slug"""
    text = text.lower().strip()
    text = re.sub(r'[^\w\s-]', '', text)
    text = re.sub(r'[\s_-]+', '-', text)
    return text


# ============== HELP MODULES ==============

@router.get("/modules", response_model=List[HelpModuleResponse])
async def get_help_modules(
    include_inactive: bool = False,
    user: dict = Depends(get_current_user_dep)
):
    """Get all help modules"""
    query = {} if include_inactive else {"is_active": True}
    
    modules = await db.help_modules.find(query, {"_id": 0}).sort("order", 1).to_list(100)
    
    # Add counts
    for module in modules:
        module["article_count"] = await db.help_articles.count_documents({
            "module_key": module["module_key"],
            "status": "published"
        })
        module["faq_count"] = await db.help_faqs.count_documents({
            "module_key": module["module_key"],
            "is_active": True
        })
    
    return modules


@router.get("/modules/{module_key}", response_model=HelpModuleResponse)
async def get_help_module(
    module_key: str,
    user: dict = Depends(get_current_user_dep)
):
    """Get a specific help module with its content"""
    module = await db.help_modules.find_one({"module_key": module_key}, {"_id": 0})
    if not module:
        raise HTTPException(status_code=404, detail="Help module not found")
    
    # Add counts
    module["article_count"] = await db.help_articles.count_documents({
        "module_key": module_key,
        "status": "published"
    })
    module["faq_count"] = await db.help_faqs.count_documents({
        "module_key": module_key,
        "is_active": True
    })
    
    return module


@router.post("/modules", response_model=HelpModuleResponse)
async def create_help_module(
    data: HelpModuleCreate,
    user: dict = Depends(get_current_user_dep)
):
    """Create a new help module (admin only)"""
    if user.get("role") not in ["super_admin", "admin"]:
        raise HTTPException(status_code=403, detail="Admin access required")
    
    # Check if module already exists
    existing = await db.help_modules.find_one({"module_key": data.module_key})
    if existing:
        raise HTTPException(status_code=400, detail="Module already exists")
    
    now = datetime.now(timezone.utc).isoformat()
    module_doc = {
        "id": str(uuid.uuid4()),
        "module_key": data.module_key,
        "module_name": data.module_name,
        "description": data.description,
        "icon": data.icon or "help-circle",
        "parent_module_key": data.parent_module_key,
        "order": data.order,
        "is_active": True,
        "created_at": now,
        "updated_at": now
    }
    
    await db.help_modules.insert_one(module_doc)
    
    # Auto-scaffold default articles and FAQs
    await scaffold_module_help(data.module_key, data.module_name)
    
    module_doc["article_count"] = len(DEFAULT_HELP_SECTIONS)
    module_doc["faq_count"] = len(DEFAULT_FAQ_TEMPLATES)
    
    if "_id" in module_doc:
        del module_doc["_id"]
    
    logger.info(f"Created help module: {data.module_key}")
    return module_doc


@router.put("/modules/{module_key}", response_model=HelpModuleResponse)
async def update_help_module(
    module_key: str,
    data: HelpModuleUpdate,
    user: dict = Depends(get_current_user_dep)
):
    """Update a help module (admin only)"""
    if user.get("role") not in ["super_admin", "admin"]:
        raise HTTPException(status_code=403, detail="Admin access required")
    
    update_data = {k: v for k, v in data.model_dump().items() if v is not None}
    update_data["updated_at"] = datetime.now(timezone.utc).isoformat()
    
    result = await db.help_modules.find_one_and_update(
        {"module_key": module_key},
        {"$set": update_data},
        return_document=True
    )
    
    if not result:
        raise HTTPException(status_code=404, detail="Help module not found")
    
    if "_id" in result:
        del result["_id"]
    
    return result


# ============== AUTO-SCAFFOLD ==============

async def scaffold_module_help(module_key: str, module_name: str):
    """Auto-scaffold help content for a new module"""
    now = datetime.now(timezone.utc).isoformat()
    
    # Create default articles (as drafts)
    for section in DEFAULT_HELP_SECTIONS:
        article_doc = {
            "id": str(uuid.uuid4()),
            "module_key": module_key,
            "title": f"{module_name} - {section['title']}",
            "slug": slugify(f"{module_key}-{section['section']}"),
            "content": f"# {section['title']}\n\nContent for {module_name} {section['title'].lower()} goes here.\n\n*This article was auto-generated. Please update with actual content.*",
            "section": section["section"],
            "tags": [module_key, section["section"]],
            "order": section["order"],
            "status": "draft",
            "views": 0,
            "helpful_count": 0,
            "not_helpful_count": 0,
            "created_at": now,
            "updated_at": now
        }
        await db.help_articles.insert_one(article_doc)
    
    # Create default FAQs
    for faq_template in DEFAULT_FAQ_TEMPLATES:
        faq_doc = {
            "id": str(uuid.uuid4()),
            "module_key": module_key,
            "question": faq_template["question"].format(module_name=module_name),
            "answer": "*This FAQ was auto-generated. Please update with actual answer.*",
            "tags": [module_key],
            "order": faq_template["order"],
            "is_active": False,  # Draft state
            "helpful_count": 0,
            "created_at": now,
            "updated_at": now
        }
        await db.help_faqs.insert_one(faq_doc)
    
    # Create ticket category
    await db.help_ticket_categories.update_one(
        {"module_key": module_key},
        {"$set": {
            "module_key": module_key,
            "module_name": module_name,
            "created_at": now
        }},
        upsert=True
    )
    
    logger.info(f"Scaffolded help content for module: {module_key}")


@router.post("/modules/{module_key}/scaffold")
async def scaffold_existing_module(
    module_key: str,
    user: dict = Depends(get_current_user_dep)
):
    """Manually scaffold help content for an existing module (admin only)"""
    if user.get("role") not in ["super_admin", "admin"]:
        raise HTTPException(status_code=403, detail="Admin access required")
    
    module = await db.help_modules.find_one({"module_key": module_key})
    if not module:
        raise HTTPException(status_code=404, detail="Help module not found")
    
    # Check if already scaffolded
    article_count = await db.help_articles.count_documents({"module_key": module_key})
    if article_count > 0:
        raise HTTPException(status_code=400, detail="Module already has content")
    
    await scaffold_module_help(module_key, module["module_name"])
    
    return {"message": f"Help content scaffolded for {module_key}"}


# ============== ARTICLES ==============

@router.get("/articles", response_model=List[HelpArticleResponse])
async def get_articles(
    module_key: Optional[str] = None,
    section: Optional[str] = None,
    status: Optional[str] = None,
    search: Optional[str] = None,
    limit: int = Query(default=50, le=100),
    user: dict = Depends(get_current_user_dep)
):
    """Get help articles with filters"""
    query = {}
    
    if module_key:
        query["module_key"] = module_key
    if section:
        query["section"] = section
    if status:
        query["status"] = status
    else:
        # Default to published only for non-admins
        if user.get("role") not in ["super_admin", "admin"]:
            query["status"] = "published"
    if search:
        query["$or"] = [
            {"title": {"$regex": search, "$options": "i"}},
            {"content": {"$regex": search, "$options": "i"}},
            {"tags": {"$in": [search.lower()]}}
        ]
    
    articles = await db.help_articles.find(query, {"_id": 0}).sort("order", 1).limit(limit).to_list(limit)
    return articles


@router.get("/articles/{article_id}", response_model=HelpArticleResponse)
async def get_article(
    article_id: str,
    user: dict = Depends(get_current_user_dep)
):
    """Get a specific article and increment view count"""
    article = await db.help_articles.find_one_and_update(
        {"id": article_id},
        {"$inc": {"views": 1}},
        return_document=True
    )
    
    if not article:
        raise HTTPException(status_code=404, detail="Article not found")
    
    if "_id" in article:
        del article["_id"]
    
    return article


@router.post("/articles", response_model=HelpArticleResponse)
async def create_article(
    data: HelpArticleCreate,
    user: dict = Depends(get_current_user_dep)
):
    """Create a new help article (admin only)"""
    if user.get("role") not in ["super_admin", "admin"]:
        raise HTTPException(status_code=403, detail="Admin access required")
    
    now = datetime.now(timezone.utc).isoformat()
    article_doc = {
        "id": str(uuid.uuid4()),
        "module_key": data.module_key,
        "title": data.title,
        "slug": data.slug or slugify(data.title),
        "content": data.content,
        "section": data.section,
        "tags": data.tags,
        "order": data.order,
        "status": "draft",
        "views": 0,
        "helpful_count": 0,
        "not_helpful_count": 0,
        "created_by": user["id"],
        "created_at": now,
        "updated_at": now
    }
    
    await db.help_articles.insert_one(article_doc)
    
    if "_id" in article_doc:
        del article_doc["_id"]
    
    return article_doc


@router.put("/articles/{article_id}", response_model=HelpArticleResponse)
async def update_article(
    article_id: str,
    data: HelpArticleUpdate,
    user: dict = Depends(get_current_user_dep)
):
    """Update an article (admin only)"""
    if user.get("role") not in ["super_admin", "admin"]:
        raise HTTPException(status_code=403, detail="Admin access required")
    
    update_data = {k: v for k, v in data.model_dump().items() if v is not None}
    if "status" in update_data:
        update_data["status"] = update_data["status"].value
    update_data["updated_at"] = datetime.now(timezone.utc).isoformat()
    
    result = await db.help_articles.find_one_and_update(
        {"id": article_id},
        {"$set": update_data},
        return_document=True
    )
    
    if not result:
        raise HTTPException(status_code=404, detail="Article not found")
    
    if "_id" in result:
        del result["_id"]
    
    return result


@router.post("/articles/{article_id}/helpful")
async def mark_article_helpful(
    article_id: str,
    helpful: bool = True,
    user: dict = Depends(get_current_user_dep)
):
    """Mark an article as helpful or not helpful"""
    field = "helpful_count" if helpful else "not_helpful_count"
    
    result = await db.help_articles.update_one(
        {"id": article_id},
        {"$inc": {field: 1}}
    )
    
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Article not found")
    
    return {"message": "Feedback recorded"}


@router.delete("/articles/{article_id}")
async def delete_article(
    article_id: str,
    user: dict = Depends(get_current_user_dep)
):
    """Delete an article (admin only)"""
    if user.get("role") not in ["super_admin", "admin"]:
        raise HTTPException(status_code=403, detail="Admin access required")
    
    result = await db.help_articles.delete_one({"id": article_id})
    
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Article not found")
    
    return {"message": "Article deleted"}


# ============== FAQs ==============

@router.get("/faqs", response_model=List[FAQResponse])
async def get_faqs(
    module_key: Optional[str] = None,
    search: Optional[str] = None,
    include_inactive: bool = False,
    user: dict = Depends(get_current_user_dep)
):
    """Get FAQs with filters"""
    query = {}
    
    if module_key:
        query["module_key"] = module_key
    if not include_inactive and user.get("role") not in ["super_admin", "admin"]:
        query["is_active"] = True
    if search:
        query["$or"] = [
            {"question": {"$regex": search, "$options": "i"}},
            {"answer": {"$regex": search, "$options": "i"}}
        ]
    
    faqs = await db.help_faqs.find(query, {"_id": 0}).sort("order", 1).to_list(100)
    return faqs


@router.post("/faqs", response_model=FAQResponse)
async def create_faq(
    data: FAQCreate,
    user: dict = Depends(get_current_user_dep)
):
    """Create a new FAQ (admin only)"""
    if user.get("role") not in ["super_admin", "admin"]:
        raise HTTPException(status_code=403, detail="Admin access required")
    
    now = datetime.now(timezone.utc).isoformat()
    faq_doc = {
        "id": str(uuid.uuid4()),
        "module_key": data.module_key,
        "question": data.question,
        "answer": data.answer,
        "tags": data.tags,
        "order": data.order,
        "is_active": True,
        "helpful_count": 0,
        "created_at": now,
        "updated_at": now
    }
    
    await db.help_faqs.insert_one(faq_doc)
    
    if "_id" in faq_doc:
        del faq_doc["_id"]
    
    return faq_doc


@router.put("/faqs/{faq_id}", response_model=FAQResponse)
async def update_faq(
    faq_id: str,
    data: FAQUpdate,
    user: dict = Depends(get_current_user_dep)
):
    """Update a FAQ (admin only)"""
    if user.get("role") not in ["super_admin", "admin"]:
        raise HTTPException(status_code=403, detail="Admin access required")
    
    update_data = {k: v for k, v in data.model_dump().items() if v is not None}
    update_data["updated_at"] = datetime.now(timezone.utc).isoformat()
    
    result = await db.help_faqs.find_one_and_update(
        {"id": faq_id},
        {"$set": update_data},
        return_document=True
    )
    
    if not result:
        raise HTTPException(status_code=404, detail="FAQ not found")
    
    if "_id" in result:
        del result["_id"]
    
    return result


@router.delete("/faqs/{faq_id}")
async def delete_faq(
    faq_id: str,
    user: dict = Depends(get_current_user_dep)
):
    """Delete a FAQ (admin only)"""
    if user.get("role") not in ["super_admin", "admin"]:
        raise HTTPException(status_code=403, detail="Admin access required")
    
    result = await db.help_faqs.delete_one({"id": faq_id})
    
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="FAQ not found")
    
    return {"message": "FAQ deleted"}


# ============== SUPPORT TICKETS ==============

async def generate_ticket_number() -> str:
    """Generate a unique ticket number"""
    # Get the count of tickets
    count = await db.support_tickets.count_documents({})
    return f"HELP-{str(count + 1).zfill(4)}"


@router.get("/tickets", response_model=List[TicketResponse])
async def get_tickets(
    status: Optional[str] = None,
    priority: Optional[str] = None,
    module_key: Optional[str] = None,
    assigned_to: Optional[str] = None,
    my_tickets: bool = False,
    limit: int = Query(default=50, le=100),
    user: dict = Depends(get_current_user_dep)
):
    """Get support tickets with filters"""
    query = {}
    
    # Non-admins can only see their own tickets
    if user.get("role") not in ["super_admin", "admin"] or my_tickets:
        query["requester_id"] = user["id"]
    
    if status:
        query["status"] = status
    if priority:
        query["priority"] = priority
    if module_key:
        query["module_key"] = module_key
    if assigned_to:
        query["assigned_to"] = assigned_to
    
    tickets = await db.support_tickets.find(query, {"_id": 0}).sort("created_at", -1).limit(limit).to_list(limit)
    
    # Get module names
    for ticket in tickets:
        module = await db.help_modules.find_one({"module_key": ticket.get("module_key")})
        ticket["module_name"] = module["module_name"] if module else ticket.get("module_key", "Unknown")
        
        # Get assigned user name
        if ticket.get("assigned_to"):
            assigned_user = await db.users.find_one({"id": ticket["assigned_to"]}, {"name": 1})
            ticket["assigned_to_name"] = assigned_user["name"] if assigned_user else None
    
    return tickets


@router.get("/tickets/{ticket_id}", response_model=TicketResponse)
async def get_ticket(
    ticket_id: str,
    user: dict = Depends(get_current_user_dep)
):
    """Get a specific ticket with comments"""
    ticket = await db.support_tickets.find_one({"id": ticket_id}, {"_id": 0})
    
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket not found")
    
    # Non-admins can only see their own tickets
    if user.get("role") not in ["super_admin", "admin"] and ticket["requester_id"] != user["id"]:
        raise HTTPException(status_code=403, detail="Access denied")
    
    # Get module name
    module = await db.help_modules.find_one({"module_key": ticket.get("module_key")})
    ticket["module_name"] = module["module_name"] if module else ticket.get("module_key", "Unknown")
    
    # Get assigned user name
    if ticket.get("assigned_to"):
        assigned_user = await db.users.find_one({"id": ticket["assigned_to"]}, {"name": 1})
        ticket["assigned_to_name"] = assigned_user["name"] if assigned_user else None
    
    # Get comments
    comments = await db.ticket_comments.find(
        {"ticket_id": ticket_id},
        {"_id": 0}
    ).sort("created_at", 1).to_list(100)
    
    # Filter internal comments for non-admins
    if user.get("role") not in ["super_admin", "admin"]:
        comments = [c for c in comments if not c.get("is_internal")]
    
    ticket["comments"] = comments
    
    return ticket


@router.post("/tickets", response_model=TicketResponse)
async def create_ticket(
    data: TicketCreate,
    user: dict = Depends(get_current_user_dep)
):
    """Create a new support ticket"""
    now = datetime.now(timezone.utc).isoformat()
    ticket_number = await generate_ticket_number()
    
    # Get module name
    module = await db.help_modules.find_one({"module_key": data.module_key})
    module_name = module["module_name"] if module else data.module_key
    
    ticket_doc = {
        "id": str(uuid.uuid4()),
        "ticket_number": ticket_number,
        "requester_id": user["id"],
        "requester_name": user.get("name", "Unknown"),
        "requester_email": user.get("email", ""),
        "module_key": data.module_key,
        "submodule_key": data.submodule_key,
        "issue_type": data.issue_type.value,
        "priority": data.priority.value,
        "status": TicketStatus.OPEN.value,
        "subject": data.subject,
        "description": data.description,
        "attachments": data.attachments,
        "assigned_to": None,
        "resolution_notes": None,
        "created_at": now,
        "updated_at": now
    }
    
    await db.support_tickets.insert_one(ticket_doc)
    
    if "_id" in ticket_doc:
        del ticket_doc["_id"]
    
    ticket_doc["module_name"] = module_name
    ticket_doc["comments"] = []
    
    # Send notification to admins
    try:
        from routes.notifications import create_notification, NotificationType, NotificationCategory, NotificationPriority
        
        # Get admin users
        admins = await db.users.find({"role": {"$in": ["super_admin", "admin"]}}, {"id": 1}).to_list(10)
        for admin in admins:
            await create_notification(
                user_id=admin["id"],
                notification_type=NotificationType.SYSTEM_ALERT,
                category=NotificationCategory.SYSTEM,
                title="New Support Ticket",
                message=f"Ticket {ticket_number}: {data.subject}",
                priority=NotificationPriority.HIGH if data.priority == TicketPriority.URGENT else NotificationPriority.MEDIUM,
                entity_type="ticket",
                entity_id=ticket_doc["id"],
                action_url=f"/help/tickets/{ticket_doc['id']}"
            )
    except Exception as e:
        logger.error(f"Failed to send ticket notification: {e}")
    
    logger.info(f"Created support ticket: {ticket_number}")
    
    # Send confirmation email to requester
    try:
        from services.email_notification_service import send_ticket_email
        await send_ticket_email(
            recipient_email=user.get("email", ""),
            recipient_name=user.get("name", "User"),
            ticket=ticket_doc,
            email_type="created"
        )
    except Exception as e:
        logger.error(f"Failed to send ticket creation email: {e}")
    
    return ticket_doc


@router.put("/tickets/{ticket_id}", response_model=TicketResponse)
async def update_ticket(
    ticket_id: str,
    data: TicketUpdate,
    user: dict = Depends(get_current_user_dep)
):
    """Update a ticket (admin only for most fields)"""
    ticket = await db.support_tickets.find_one({"id": ticket_id})
    
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket not found")
    
    # Non-admins can only close their own tickets
    if user.get("role") not in ["super_admin", "admin"]:
        if ticket["requester_id"] != user["id"]:
            raise HTTPException(status_code=403, detail="Access denied")
        if data.status and data.status != TicketStatus.CLOSED:
            raise HTTPException(status_code=403, detail="You can only close your own tickets")
    
    update_data = {}
    if data.status:
        update_data["status"] = data.status.value
        if data.status == TicketStatus.RESOLVED:
            update_data["resolved_at"] = datetime.now(timezone.utc).isoformat()
    if data.priority:
        update_data["priority"] = data.priority.value
    if data.assigned_to is not None:
        update_data["assigned_to"] = data.assigned_to
    if data.resolution_notes is not None:
        update_data["resolution_notes"] = data.resolution_notes
    
    update_data["updated_at"] = datetime.now(timezone.utc).isoformat()
    
    result = await db.support_tickets.find_one_and_update(
        {"id": ticket_id},
        {"$set": update_data},
        return_document=True
    )
    
    if "_id" in result:
        del result["_id"]
    
    # Get module name
    module = await db.help_modules.find_one({"module_key": result.get("module_key")})
    result["module_name"] = module["module_name"] if module else result.get("module_key", "Unknown")
    
    # Send notification to requester on status change
    if data.status and data.status != TicketStatus.OPEN:
        try:
            from routes.notifications import create_notification, NotificationType, NotificationCategory, NotificationPriority
            
            await create_notification(
                user_id=result["requester_id"],
                notification_type=NotificationType.SYSTEM_ALERT,
                category=NotificationCategory.SYSTEM,
                title=f"Ticket {result['ticket_number']} Updated",
                message=f"Status changed to: {data.status.value.replace('_', ' ').title()}",
                priority=NotificationPriority.MEDIUM,
                entity_type="ticket",
                entity_id=ticket_id,
                action_url=f"/help/tickets/{ticket_id}"
            )
        except Exception as e:
            logger.error(f"Failed to send ticket update notification: {e}")
    
    # Send email notification for resolved tickets
    if data.status == TicketStatus.RESOLVED:
        try:
            from services.email_notification_service import send_ticket_email
            requester = await db.users.find_one({"id": result["requester_id"]}, {"email": 1, "name": 1})
            if requester and requester.get("email"):
                await send_ticket_email(
                    recipient_email=requester["email"],
                    recipient_name=requester.get("name", "User"),
                    ticket=result,
                    email_type="resolved",
                    extra_data={"resolution_notes": data.resolution_notes or ""}
                )
        except Exception as e:
            logger.error(f"Failed to send ticket resolution email: {e}")
    
    return result


@router.post("/tickets/{ticket_id}/comments", response_model=TicketCommentResponse)
async def add_ticket_comment(
    ticket_id: str,
    data: TicketCommentCreate,
    user: dict = Depends(get_current_user_dep)
):
    """Add a comment to a ticket"""
    ticket = await db.support_tickets.find_one({"id": ticket_id})
    
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket not found")
    
    # Non-admins can only comment on their own tickets and can't add internal notes
    if user.get("role") not in ["super_admin", "admin"]:
        if ticket["requester_id"] != user["id"]:
            raise HTTPException(status_code=403, detail="Access denied")
        if data.is_internal:
            raise HTTPException(status_code=403, detail="Only admins can add internal notes")
    
    now = datetime.now(timezone.utc).isoformat()
    comment_doc = {
        "id": str(uuid.uuid4()),
        "ticket_id": ticket_id,
        "user_id": user["id"],
        "user_name": user.get("name", "Unknown"),
        "content": data.content,
        "is_internal": data.is_internal,
        "created_at": now
    }
    
    await db.ticket_comments.insert_one(comment_doc)
    
    # Update ticket updated_at
    await db.support_tickets.update_one(
        {"id": ticket_id},
        {"$set": {"updated_at": now}}
    )
    
    if "_id" in comment_doc:
        del comment_doc["_id"]
    
    # Notify the other party
    try:
        from routes.notifications import create_notification, NotificationType, NotificationCategory, NotificationPriority
        
        # If admin commented, notify requester; if requester commented, notify assigned admin
        if user["id"] == ticket["requester_id"]:
            # Notify assigned admin or all admins
            if ticket.get("assigned_to"):
                notify_ids = [ticket["assigned_to"]]
            else:
                admins = await db.users.find({"role": {"$in": ["super_admin", "admin"]}}, {"id": 1}).to_list(10)
                notify_ids = [a["id"] for a in admins]
        else:
            # Notify requester (unless internal note)
            if not data.is_internal:
                notify_ids = [ticket["requester_id"]]
            else:
                notify_ids = []
        
        for notify_id in notify_ids:
            await create_notification(
                user_id=notify_id,
                notification_type=NotificationType.TASK_COMMENT,
                category=NotificationCategory.SYSTEM,
                title=f"New Comment on Ticket {ticket['ticket_number']}",
                message=f"{user.get('name', 'Someone')} replied: {data.content[:50]}...",
                priority=NotificationPriority.MEDIUM,
                entity_type="ticket",
                entity_id=ticket_id,
                action_url=f"/help/tickets/{ticket_id}"
            )
    except Exception as e:
        logger.error(f"Failed to send comment notification: {e}")
    
    # Send email to requester when support staff replies (not internal notes)
    if user["id"] != ticket["requester_id"] and not data.is_internal:
        try:
            from services.email_notification_service import send_ticket_email
            requester = await db.users.find_one({"id": ticket["requester_id"]}, {"email": 1, "name": 1})
            if requester and requester.get("email"):
                await send_ticket_email(
                    recipient_email=requester["email"],
                    recipient_name=requester.get("name", "User"),
                    ticket=ticket,
                    email_type="reply",
                    extra_data={
                        "reply_content": data.content,
                        "reply_by": user.get("name", "Support Team")
                    }
                )
        except Exception as e:
            logger.error(f"Failed to send comment email: {e}")
    
    return comment_doc


# ============== SEARCH ==============

@router.get("/search", response_model=List[HelpSearchResult])
async def search_help(
    q: str = Query(..., min_length=2),
    user: dict = Depends(get_current_user_dep)
):
    """Search across articles, FAQs, and modules"""
    results = []
    
    # Search articles
    articles = await db.help_articles.find(
        {
            "status": "published",
            "$or": [
                {"title": {"$regex": q, "$options": "i"}},
                {"content": {"$regex": q, "$options": "i"}},
                {"tags": {"$in": [q.lower()]}}
            ]
        },
        {"_id": 0}
    ).limit(10).to_list(10)
    
    for article in articles:
        module = await db.help_modules.find_one({"module_key": article["module_key"]})
        results.append({
            "type": "article",
            "id": article["id"],
            "title": article["title"],
            "snippet": article["content"][:150] + "..." if len(article["content"]) > 150 else article["content"],
            "module_key": article["module_key"],
            "module_name": module["module_name"] if module else article["module_key"],
            "url": f"/help/articles/{article['id']}",
            "score": 1.0
        })
    
    # Search FAQs
    faqs = await db.help_faqs.find(
        {
            "is_active": True,
            "$or": [
                {"question": {"$regex": q, "$options": "i"}},
                {"answer": {"$regex": q, "$options": "i"}}
            ]
        },
        {"_id": 0}
    ).limit(10).to_list(10)
    
    for faq in faqs:
        module = await db.help_modules.find_one({"module_key": faq["module_key"]})
        results.append({
            "type": "faq",
            "id": faq["id"],
            "title": faq["question"],
            "snippet": faq["answer"][:150] + "..." if len(faq["answer"]) > 150 else faq["answer"],
            "module_key": faq["module_key"],
            "module_name": module["module_name"] if module else faq["module_key"],
            "url": f"/help/modules/{faq['module_key']}#faq-{faq['id']}",
            "score": 0.8
        })
    
    # Search modules
    modules = await db.help_modules.find(
        {
            "is_active": True,
            "$or": [
                {"module_name": {"$regex": q, "$options": "i"}},
                {"description": {"$regex": q, "$options": "i"}}
            ]
        },
        {"_id": 0}
    ).limit(5).to_list(5)
    
    for module in modules:
        results.append({
            "type": "module",
            "id": module["id"],
            "title": module["module_name"],
            "snippet": module.get("description", ""),
            "module_key": module["module_key"],
            "module_name": module["module_name"],
            "url": f"/help/modules/{module['module_key']}",
            "score": 0.6
        })
    
    # Sort by score
    results.sort(key=lambda x: x["score"], reverse=True)
    
    return results[:20]


# ============== ANALYTICS ==============

@router.get("/analytics", response_model=HelpAnalytics)
async def get_help_analytics(
    user: dict = Depends(get_current_user_dep)
):
    """Get help center analytics (admin only)"""
    if user.get("role") not in ["super_admin", "admin"]:
        raise HTTPException(status_code=403, detail="Admin access required")
    
    # Counts
    total_articles = await db.help_articles.count_documents({"status": "published"})
    total_faqs = await db.help_faqs.count_documents({"is_active": True})
    total_tickets = await db.support_tickets.count_documents({})
    open_tickets = await db.support_tickets.count_documents({"status": {"$in": ["open", "in_progress"]}})
    
    # Average resolution time
    resolved_tickets = await db.support_tickets.find(
        {"resolved_at": {"$exists": True}},
        {"created_at": 1, "resolved_at": 1, "_id": 0}
    ).to_list(1000)
    
    if resolved_tickets:
        total_time = sum(
            (datetime.fromisoformat(t["resolved_at"].replace("Z", "+00:00")) - 
             datetime.fromisoformat(t["created_at"].replace("Z", "+00:00"))).total_seconds() / 3600
            for t in resolved_tickets
        )
        avg_resolution_time = total_time / len(resolved_tickets)
    else:
        avg_resolution_time = 0
    
    # Most viewed articles
    most_viewed = await db.help_articles.find(
        {"status": "published"},
        {"_id": 0, "id": 1, "title": 1, "views": 1}
    ).sort("views", -1).limit(5).to_list(5)
    
    # Common ticket categories
    category_pipeline = [
        {"$group": {"_id": "$module_key", "count": {"$sum": 1}}},
        {"$sort": {"count": -1}},
        {"$limit": 5}
    ]
    categories = await db.support_tickets.aggregate(category_pipeline).to_list(5)
    common_categories = [{"module_key": c["_id"], "count": c["count"]} for c in categories]
    
    return {
        "total_articles": total_articles,
        "total_faqs": total_faqs,
        "total_tickets": total_tickets,
        "open_tickets": open_tickets,
        "avg_resolution_time_hours": round(avg_resolution_time, 2),
        "most_viewed_articles": most_viewed,
        "common_ticket_categories": common_categories,
        "ticket_trend": []  # TODO: Implement daily trend
    }


# ============== SEED INITIAL DATA ==============

@router.post("/seed-initial")
async def seed_initial_help_data(
    user: dict = Depends(get_current_user_dep)
):
    """Seed initial help modules for existing platform modules (admin only, one-time)"""
    if user.get("role") not in ["super_admin", "admin"]:
        raise HTTPException(status_code=403, detail="Admin access required")
    
    # Check if already seeded
    existing = await db.help_modules.count_documents({})
    if existing > 0:
        raise HTTPException(status_code=400, detail="Help modules already exist. Use scaffold endpoint for individual modules.")
    
    initial_modules = [
        {"module_key": "overview", "module_name": "Platform Overview", "icon": "home", "order": 0,
         "description": "General platform help and getting started guides"},
        {"module_key": "project_management", "module_name": "Project Management", "icon": "clipboard-list", "order": 1,
         "description": "Help for projects, tasks, and team collaboration"},
        {"module_key": "marketing", "module_name": "Marketing Operations", "icon": "target", "order": 2,
         "description": "Help for campaigns, influencers, and marketing tools"},
        {"module_key": "mail", "module_name": "Mail", "icon": "mail", "order": 3,
         "description": "Help for email management and communication"},
        {"module_key": "social", "module_name": "Social Media", "icon": "share-2", "order": 4,
         "description": "Help for social media management and content publishing"},
    ]
    
    now = datetime.now(timezone.utc).isoformat()
    
    for module_data in initial_modules:
        module_doc = {
            "id": str(uuid.uuid4()),
            "module_key": module_data["module_key"],
            "module_name": module_data["module_name"],
            "description": module_data["description"],
            "icon": module_data["icon"],
            "parent_module_key": None,
            "order": module_data["order"],
            "is_active": True,
            "created_at": now,
            "updated_at": now
        }
        
        await db.help_modules.insert_one(module_doc)
        await scaffold_module_help(module_data["module_key"], module_data["module_name"])
    
    logger.info(f"Seeded {len(initial_modules)} help modules")
    
    return {
        "message": f"Successfully seeded {len(initial_modules)} help modules with scaffolded content",
        "modules": [m["module_key"] for m in initial_modules]
    }



# ============== GUIDED TOURS ==============

@router.get("/tours/completed")
async def get_completed_tours(
    user: dict = Depends(get_current_user_dep)
):
    """Get list of tours the user has completed"""
    user_tours = await db.user_tours.find_one({"user_id": user["id"]}, {"_id": 0})
    
    return {
        "completed_tours": user_tours.get("completed_tours", []) if user_tours else []
    }


@router.post("/tours/{tour_id}/complete")
async def mark_tour_completed(
    tour_id: str,
    user: dict = Depends(get_current_user_dep)
):
    """Mark a tour as completed for the current user"""
    now = datetime.now(timezone.utc).isoformat()
    
    await db.user_tours.update_one(
        {"user_id": user["id"]},
        {
            "$addToSet": {"completed_tours": tour_id},
            "$set": {"updated_at": now},
            "$setOnInsert": {"created_at": now}
        },
        upsert=True
    )
    
    return {"message": f"Tour {tour_id} marked as completed"}


@router.delete("/tours/{tour_id}/reset")
async def reset_tour(
    tour_id: str,
    user: dict = Depends(get_current_user_dep)
):
    """Reset a tour so the user can take it again"""
    await db.user_tours.update_one(
        {"user_id": user["id"]},
        {"$pull": {"completed_tours": tour_id}}
    )
    
    return {"message": f"Tour {tour_id} reset"}


# ============== SUPPORT STAFF MANAGEMENT ==============

@router.get("/support-staff")
async def get_support_staff(
    user: dict = Depends(get_current_user_dep)
):
    """Get list of support staff members"""
    if user.get("role") not in ["super_admin", "admin"]:
        raise HTTPException(status_code=403, detail="Admin access required")
    
    # Get users with support_staff role or admin roles
    staff = await db.users.find(
        {"role": {"$in": ["super_admin", "admin", "support_staff"]}},
        {"_id": 0, "id": 1, "name": 1, "email": 1, "role": 1}
    ).to_list(100)
    
    # Get open ticket counts per staff
    for s in staff:
        s["open_tickets"] = await db.support_tickets.count_documents({
            "assigned_to": s["id"],
            "status": {"$in": ["open", "in_progress", "waiting_user"]}
        })
    
    return staff


@router.put("/tickets/{ticket_id}/assign")
async def assign_ticket(
    ticket_id: str,
    staff_id: str = Query(..., description="ID of staff member to assign"),
    user: dict = Depends(get_current_user_dep)
):
    """Assign a ticket to a support staff member"""
    if user.get("role") not in ["super_admin", "admin", "support_staff"]:
        raise HTTPException(status_code=403, detail="Support staff access required")
    
    # Verify staff member exists
    staff = await db.users.find_one({"id": staff_id})
    if not staff:
        raise HTTPException(status_code=404, detail="Staff member not found")
    
    now = datetime.now(timezone.utc).isoformat()
    
    result = await db.support_tickets.find_one_and_update(
        {"id": ticket_id},
        {
            "$set": {
                "assigned_to": staff_id,
                "status": "in_progress",
                "updated_at": now
            }
        },
        return_document=True
    )
    
    if not result:
        raise HTTPException(status_code=404, detail="Ticket not found")
    
    # Send notification to assigned staff
    try:
        from routes.notifications import create_notification, NotificationType, NotificationCategory, NotificationPriority
        
        await create_notification(
            user_id=staff_id,
            notification_type=NotificationType.TASK_ASSIGNED,
            category=NotificationCategory.SYSTEM,
            title="Ticket Assigned to You",
            message=f"Ticket {result['ticket_number']}: {result['subject']}",
            priority=NotificationPriority.HIGH if result.get('priority') == 'urgent' else NotificationPriority.MEDIUM,
            entity_type="ticket",
            entity_id=ticket_id,
            action_url=f"/help/tickets/{ticket_id}"
        )
    except Exception as e:
        logger.error(f"Failed to send assignment notification: {e}")
    
    # Send email to assigned staff
    try:
        from services.email_notification_service import send_ticket_email
        if staff.get("email"):
            # Get module name
            module = await db.help_modules.find_one({"module_key": result.get("module_key")})
            result["module_name"] = module["module_name"] if module else result.get("module_key", "General")
            
            await send_ticket_email(
                recipient_email=staff["email"],
                recipient_name=staff.get("name", "Support Staff"),
                ticket=result,
                email_type="assigned"
            )
    except Exception as e:
        logger.error(f"Failed to send assignment email: {e}")
    
    return {"message": f"Ticket assigned to {staff.get('name', 'staff member')}"}


# ============== ADMIN ANALYTICS ==============

@router.get("/admin/dashboard")
async def get_admin_dashboard(
    user: dict = Depends(get_current_user_dep)
):
    """Get admin dashboard data"""
    if user.get("role") not in ["super_admin", "admin", "support_staff"]:
        raise HTTPException(status_code=403, detail="Staff access required")
    
    # Ticket stats
    total_tickets = await db.support_tickets.count_documents({})
    open_tickets = await db.support_tickets.count_documents({"status": "open"})
    in_progress = await db.support_tickets.count_documents({"status": "in_progress"})
    resolved_today = await db.support_tickets.count_documents({
        "status": "resolved",
        "resolved_at": {"$gte": datetime.now(timezone.utc).replace(hour=0, minute=0, second=0).isoformat()}
    })
    
    # Unassigned tickets
    unassigned = await db.support_tickets.count_documents({
        "assigned_to": None,
        "status": {"$nin": ["resolved", "closed"]}
    })
    
    # Article stats
    total_articles = await db.help_articles.count_documents({})
    published_articles = await db.help_articles.count_documents({"status": "published"})
    draft_articles = await db.help_articles.count_documents({"status": "draft"})
    
    # FAQ stats
    total_faqs = await db.help_faqs.count_documents({})
    active_faqs = await db.help_faqs.count_documents({"is_active": True})
    
    # Recent tickets
    recent_tickets = await db.support_tickets.find(
        {},
        {"_id": 0, "id": 1, "ticket_number": 1, "subject": 1, "status": 1, "priority": 1, "created_at": 1, "assigned_to": 1}
    ).sort("created_at", -1).limit(10).to_list(10)
    
    # Get assignee names
    for ticket in recent_tickets:
        if ticket.get("assigned_to"):
            assignee = await db.users.find_one({"id": ticket["assigned_to"]}, {"name": 1})
            ticket["assigned_to_name"] = assignee.get("name") if assignee else None
    
    return {
        "tickets": {
            "total": total_tickets,
            "open": open_tickets,
            "in_progress": in_progress,
            "resolved_today": resolved_today,
            "unassigned": unassigned
        },
        "articles": {
            "total": total_articles,
            "published": published_articles,
            "draft": draft_articles
        },
        "faqs": {
            "total": total_faqs,
            "active": active_faqs
        },
        "recent_tickets": recent_tickets
    }
