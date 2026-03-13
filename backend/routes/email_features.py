"""
Email Features API - Signatures, Templates, Labels, Snooze, Filters, Settings
"""
from fastapi import APIRouter, HTTPException, Depends, Query
from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime, timezone
import uuid

router = APIRouter(prefix="/email-features", tags=["Email Features"])

db = None


def init_email_features(database):
    global db
    db = database


# ============== PYDANTIC MODELS ==============

class EmailSignature(BaseModel):
    name: str
    content: str  # HTML content
    is_default: bool = False


class EmailTemplate(BaseModel):
    name: str
    subject: str
    body: str  # HTML content
    category: Optional[str] = "general"


class EmailLabel(BaseModel):
    name: str
    color: str  # hex color like #FF5733


class EmailFilter(BaseModel):
    name: str
    conditions: dict  # {from_contains: "", subject_contains: "", has_attachment: bool}
    actions: dict  # {label_id: "", mark_read: bool, archive: bool, delete: bool, forward_to: ""}
    is_active: bool = True


class SnoozedEmail(BaseModel):
    message_id: str
    mailbox: Optional[str] = None  # null for personal, email for shared
    snooze_until: str  # ISO datetime
    subject: str
    from_email: str
    from_name: Optional[str] = None


class OutOfOfficeSettings(BaseModel):
    is_enabled: bool
    start_date: Optional[str] = None
    end_date: Optional[str] = None
    internal_message: str
    external_message: Optional[str] = None
    send_to_external: bool = True


def create_router(get_current_user):
    
    # ============== SIGNATURES ==============
    
    @router.get("/signatures")
    async def get_signatures(current_user: dict = Depends(get_current_user)):
        """Get user's email signatures"""
        user_id = current_user.get("id")
        signatures = await db.email_signatures.find(
            {"user_id": user_id}, {"_id": 0}
        ).to_list(20)
        return signatures
    
    @router.post("/signatures")
    async def create_signature(
        signature: EmailSignature,
        current_user: dict = Depends(get_current_user)
    ):
        """Create a new email signature"""
        user_id = current_user.get("id")
        
        # If this is default, unset other defaults
        if signature.is_default:
            await db.email_signatures.update_many(
                {"user_id": user_id},
                {"$set": {"is_default": False}}
            )
        
        doc = {
            "id": str(uuid.uuid4()),
            "user_id": user_id,
            "name": signature.name,
            "content": signature.content,
            "is_default": signature.is_default,
            "created_at": datetime.now(timezone.utc).isoformat(),
            "updated_at": datetime.now(timezone.utc).isoformat()
        }
        await db.email_signatures.insert_one(doc)
        doc.pop("_id", None)
        return doc
    
    @router.put("/signatures/{signature_id}")
    async def update_signature(
        signature_id: str,
        signature: EmailSignature,
        current_user: dict = Depends(get_current_user)
    ):
        """Update an email signature"""
        user_id = current_user.get("id")
        
        existing = await db.email_signatures.find_one({"id": signature_id, "user_id": user_id})
        if not existing:
            raise HTTPException(status_code=404, detail="Signature not found")
        
        if signature.is_default:
            await db.email_signatures.update_many(
                {"user_id": user_id, "id": {"$ne": signature_id}},
                {"$set": {"is_default": False}}
            )
        
        await db.email_signatures.update_one(
            {"id": signature_id},
            {"$set": {
                "name": signature.name,
                "content": signature.content,
                "is_default": signature.is_default,
                "updated_at": datetime.now(timezone.utc).isoformat()
            }}
        )
        
        updated = await db.email_signatures.find_one({"id": signature_id}, {"_id": 0})
        return updated
    
    @router.delete("/signatures/{signature_id}")
    async def delete_signature(
        signature_id: str,
        current_user: dict = Depends(get_current_user)
    ):
        """Delete an email signature"""
        user_id = current_user.get("id")
        result = await db.email_signatures.delete_one({"id": signature_id, "user_id": user_id})
        if result.deleted_count == 0:
            raise HTTPException(status_code=404, detail="Signature not found")
        return {"message": "Signature deleted"}
    
    # ============== TEMPLATES ==============
    
    @router.get("/templates")
    async def get_templates(
        category: Optional[str] = None,
        current_user: dict = Depends(get_current_user)
    ):
        """Get user's email templates"""
        user_id = current_user.get("id")
        query = {"user_id": user_id}
        if category:
            query["category"] = category
        templates = await db.email_templates.find(query, {"_id": 0}).to_list(100)
        return templates
    
    @router.post("/templates")
    async def create_template(
        template: EmailTemplate,
        current_user: dict = Depends(get_current_user)
    ):
        """Create a new email template"""
        user_id = current_user.get("id")
        doc = {
            "id": str(uuid.uuid4()),
            "user_id": user_id,
            "name": template.name,
            "subject": template.subject,
            "body": template.body,
            "category": template.category,
            "created_at": datetime.now(timezone.utc).isoformat(),
            "updated_at": datetime.now(timezone.utc).isoformat()
        }
        await db.email_templates.insert_one(doc)
        doc.pop("_id", None)
        return doc
    
    @router.put("/templates/{template_id}")
    async def update_template(
        template_id: str,
        template: EmailTemplate,
        current_user: dict = Depends(get_current_user)
    ):
        """Update an email template"""
        user_id = current_user.get("id")
        
        existing = await db.email_templates.find_one({"id": template_id, "user_id": user_id})
        if not existing:
            raise HTTPException(status_code=404, detail="Template not found")
        
        await db.email_templates.update_one(
            {"id": template_id},
            {"$set": {
                "name": template.name,
                "subject": template.subject,
                "body": template.body,
                "category": template.category,
                "updated_at": datetime.now(timezone.utc).isoformat()
            }}
        )
        
        updated = await db.email_templates.find_one({"id": template_id}, {"_id": 0})
        return updated
    
    @router.delete("/templates/{template_id}")
    async def delete_template(
        template_id: str,
        current_user: dict = Depends(get_current_user)
    ):
        """Delete an email template"""
        user_id = current_user.get("id")
        result = await db.email_templates.delete_one({"id": template_id, "user_id": user_id})
        if result.deleted_count == 0:
            raise HTTPException(status_code=404, detail="Template not found")
        return {"message": "Template deleted"}
    
    # ============== CUSTOM LABELS ==============
    
    @router.get("/labels")
    async def get_labels(current_user: dict = Depends(get_current_user)):
        """Get user's custom email labels"""
        user_id = current_user.get("id")
        labels = await db.email_labels.find({"user_id": user_id}, {"_id": 0}).to_list(50)
        return labels
    
    @router.post("/labels")
    async def create_label(
        label: EmailLabel,
        current_user: dict = Depends(get_current_user)
    ):
        """Create a new custom label"""
        user_id = current_user.get("id")
        
        # Check for duplicate name
        existing = await db.email_labels.find_one({"user_id": user_id, "name": label.name})
        if existing:
            raise HTTPException(status_code=400, detail="Label with this name already exists")
        
        doc = {
            "id": str(uuid.uuid4()),
            "user_id": user_id,
            "name": label.name,
            "color": label.color,
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        await db.email_labels.insert_one(doc)
        doc.pop("_id", None)
        return doc
    
    @router.put("/labels/{label_id}")
    async def update_label(
        label_id: str,
        label: EmailLabel,
        current_user: dict = Depends(get_current_user)
    ):
        """Update a custom label"""
        user_id = current_user.get("id")
        
        existing = await db.email_labels.find_one({"id": label_id, "user_id": user_id})
        if not existing:
            raise HTTPException(status_code=404, detail="Label not found")
        
        await db.email_labels.update_one(
            {"id": label_id},
            {"$set": {"name": label.name, "color": label.color}}
        )
        
        updated = await db.email_labels.find_one({"id": label_id}, {"_id": 0})
        return updated
    
    @router.delete("/labels/{label_id}")
    async def delete_label(
        label_id: str,
        current_user: dict = Depends(get_current_user)
    ):
        """Delete a custom label"""
        user_id = current_user.get("id")
        
        # Also remove label from all emails
        await db.email_label_assignments.delete_many({"label_id": label_id})
        
        result = await db.email_labels.delete_one({"id": label_id, "user_id": user_id})
        if result.deleted_count == 0:
            raise HTTPException(status_code=404, detail="Label not found")
        return {"message": "Label deleted"}
    
    @router.post("/labels/{label_id}/assign")
    async def assign_label(
        label_id: str,
        message_ids: List[str],
        current_user: dict = Depends(get_current_user)
    ):
        """Assign label to emails"""
        user_id = current_user.get("id")
        
        for message_id in message_ids:
            existing = await db.email_label_assignments.find_one({
                "user_id": user_id,
                "label_id": label_id,
                "message_id": message_id
            })
            if not existing:
                await db.email_label_assignments.insert_one({
                    "id": str(uuid.uuid4()),
                    "user_id": user_id,
                    "label_id": label_id,
                    "message_id": message_id,
                    "created_at": datetime.now(timezone.utc).isoformat()
                })
        
        return {"message": f"Label assigned to {len(message_ids)} email(s)"}
    
    @router.post("/labels/{label_id}/remove")
    async def remove_label(
        label_id: str,
        message_ids: List[str],
        current_user: dict = Depends(get_current_user)
    ):
        """Remove label from emails"""
        user_id = current_user.get("id")
        
        result = await db.email_label_assignments.delete_many({
            "user_id": user_id,
            "label_id": label_id,
            "message_id": {"$in": message_ids}
        })
        
        return {"message": f"Label removed from {result.deleted_count} email(s)"}
    
    @router.get("/labels/assignments")
    async def get_label_assignments(
        message_ids: str = Query(..., description="Comma-separated message IDs"),
        current_user: dict = Depends(get_current_user)
    ):
        """Get label assignments for specific messages"""
        user_id = current_user.get("id")
        ids = [m.strip() for m in message_ids.split(",")]
        
        assignments = await db.email_label_assignments.find({
            "user_id": user_id,
            "message_id": {"$in": ids}
        }, {"_id": 0}).to_list(500)
        
        return assignments
    
    # ============== SNOOZE ==============
    
    @router.get("/snoozed")
    async def get_snoozed_emails(current_user: dict = Depends(get_current_user)):
        """Get user's snoozed emails"""
        user_id = current_user.get("id")
        now = datetime.now(timezone.utc).isoformat()
        
        snoozed = await db.snoozed_emails.find({
            "user_id": user_id,
            "snooze_until": {"$gt": now}
        }, {"_id": 0}).sort("snooze_until", 1).to_list(100)
        
        return snoozed
    
    @router.get("/snoozed/due")
    async def get_due_snoozed_emails(current_user: dict = Depends(get_current_user)):
        """Get snoozed emails that are due (snooze time passed)"""
        user_id = current_user.get("id")
        now = datetime.now(timezone.utc).isoformat()
        
        due = await db.snoozed_emails.find({
            "user_id": user_id,
            "snooze_until": {"$lte": now}
        }, {"_id": 0}).to_list(100)
        
        return due
    
    @router.post("/snooze")
    async def snooze_email(
        snooze: SnoozedEmail,
        current_user: dict = Depends(get_current_user)
    ):
        """Snooze an email until specified time"""
        user_id = current_user.get("id")
        
        # Remove existing snooze for this message
        await db.snoozed_emails.delete_one({
            "user_id": user_id,
            "message_id": snooze.message_id
        })
        
        doc = {
            "id": str(uuid.uuid4()),
            "user_id": user_id,
            "message_id": snooze.message_id,
            "mailbox": snooze.mailbox,
            "snooze_until": snooze.snooze_until,
            "subject": snooze.subject,
            "from_email": snooze.from_email,
            "from_name": snooze.from_name,
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        await db.snoozed_emails.insert_one(doc)
        doc.pop("_id", None)
        return doc
    
    @router.delete("/snooze/{message_id}")
    async def unsnooze_email(
        message_id: str,
        current_user: dict = Depends(get_current_user)
    ):
        """Unsnooze an email"""
        user_id = current_user.get("id")
        result = await db.snoozed_emails.delete_one({
            "user_id": user_id,
            "message_id": message_id
        })
        if result.deleted_count == 0:
            raise HTTPException(status_code=404, detail="Snoozed email not found")
        return {"message": "Email unsnoozed"}
    
    # ============== FILTERS/RULES ==============
    
    @router.get("/filters")
    async def get_filters(current_user: dict = Depends(get_current_user)):
        """Get user's email filters"""
        user_id = current_user.get("id")
        filters = await db.email_filters.find({"user_id": user_id}, {"_id": 0}).to_list(50)
        return filters
    
    @router.post("/filters")
    async def create_filter(
        filter_rule: EmailFilter,
        current_user: dict = Depends(get_current_user)
    ):
        """Create a new email filter"""
        user_id = current_user.get("id")
        doc = {
            "id": str(uuid.uuid4()),
            "user_id": user_id,
            "name": filter_rule.name,
            "conditions": filter_rule.conditions,
            "actions": filter_rule.actions,
            "is_active": filter_rule.is_active,
            "created_at": datetime.now(timezone.utc).isoformat(),
            "updated_at": datetime.now(timezone.utc).isoformat()
        }
        await db.email_filters.insert_one(doc)
        doc.pop("_id", None)
        return doc
    
    @router.put("/filters/{filter_id}")
    async def update_filter(
        filter_id: str,
        filter_rule: EmailFilter,
        current_user: dict = Depends(get_current_user)
    ):
        """Update an email filter"""
        user_id = current_user.get("id")
        
        existing = await db.email_filters.find_one({"id": filter_id, "user_id": user_id})
        if not existing:
            raise HTTPException(status_code=404, detail="Filter not found")
        
        await db.email_filters.update_one(
            {"id": filter_id},
            {"$set": {
                "name": filter_rule.name,
                "conditions": filter_rule.conditions,
                "actions": filter_rule.actions,
                "is_active": filter_rule.is_active,
                "updated_at": datetime.now(timezone.utc).isoformat()
            }}
        )
        
        updated = await db.email_filters.find_one({"id": filter_id}, {"_id": 0})
        return updated
    
    @router.delete("/filters/{filter_id}")
    async def delete_filter(
        filter_id: str,
        current_user: dict = Depends(get_current_user)
    ):
        """Delete an email filter"""
        user_id = current_user.get("id")
        result = await db.email_filters.delete_one({"id": filter_id, "user_id": user_id})
        if result.deleted_count == 0:
            raise HTTPException(status_code=404, detail="Filter not found")
        return {"message": "Filter deleted"}
    
    # ============== OUT OF OFFICE ==============
    
    @router.get("/out-of-office")
    async def get_out_of_office(current_user: dict = Depends(get_current_user)):
        """Get user's out of office settings"""
        user_id = current_user.get("id")
        settings = await db.email_out_of_office.find_one({"user_id": user_id}, {"_id": 0})
        if not settings:
            return {
                "is_enabled": False,
                "start_date": None,
                "end_date": None,
                "internal_message": "",
                "external_message": "",
                "send_to_external": True
            }
        return settings
    
    @router.put("/out-of-office")
    async def update_out_of_office(
        settings: OutOfOfficeSettings,
        current_user: dict = Depends(get_current_user)
    ):
        """Update out of office settings"""
        user_id = current_user.get("id")
        
        doc = {
            "user_id": user_id,
            "is_enabled": settings.is_enabled,
            "start_date": settings.start_date,
            "end_date": settings.end_date,
            "internal_message": settings.internal_message,
            "external_message": settings.external_message,
            "send_to_external": settings.send_to_external,
            "updated_at": datetime.now(timezone.utc).isoformat()
        }
        
        await db.email_out_of_office.update_one(
            {"user_id": user_id},
            {"$set": doc},
            upsert=True
        )
        
        return doc
    
    # ============== EMAIL SETTINGS ==============
    
    @router.get("/settings")
    async def get_email_settings(current_user: dict = Depends(get_current_user)):
        """Get user's email settings"""
        user_id = current_user.get("id")
        settings = await db.email_settings.find_one({"user_id": user_id}, {"_id": 0})
        if not settings:
            return {
                "undo_send_delay": 5,  # seconds
                "default_signature_id": None,
                "conversation_view": True,
                "keyboard_shortcuts": True,
                "auto_advance": "next",  # next, previous, list
                "reading_pane": "right"  # right, bottom, off
            }
        return settings
    
    @router.put("/settings")
    async def update_email_settings(
        settings: dict,
        current_user: dict = Depends(get_current_user)
    ):
        """Update email settings"""
        user_id = current_user.get("id")
        settings["user_id"] = user_id
        settings["updated_at"] = datetime.now(timezone.utc).isoformat()
        
        await db.email_settings.update_one(
            {"user_id": user_id},
            {"$set": settings},
            upsert=True
        )
        
        return settings
    
    return router
