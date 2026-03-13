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


class ScheduledEmail(BaseModel):
    to_recipients: List[str]
    cc_recipients: Optional[List[str]] = None
    bcc_recipients: Optional[List[str]] = None
    subject: str
    body: str
    scheduled_time: str  # ISO datetime
    mailbox: Optional[str] = None  # null for personal, email for shared
    attachments: Optional[List[dict]] = None


class FollowUpReminder(BaseModel):
    message_id: str
    thread_id: Optional[str] = None
    subject: str
    to_email: str
    to_name: Optional[str] = None
    remind_after_hours: int = 48  # Default: remind if no reply in 48 hours
    mailbox: Optional[str] = None


class EmailTrackingCreate(BaseModel):
    message_id: str
    to_email: str
    subject: str
    tracking_type: str = "open"  # open, click
    mailbox: Optional[str] = None


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
    
    # ============== SCHEDULED EMAILS ==============
    
    @router.get("/scheduled")
    async def get_scheduled_emails(current_user: dict = Depends(get_current_user)):
        """Get user's scheduled emails"""
        user_id = current_user.get("id")
        now = datetime.now(timezone.utc).isoformat()
        
        scheduled = await db.scheduled_emails.find({
            "user_id": user_id,
            "status": "pending",
            "scheduled_time": {"$gt": now}
        }, {"_id": 0}).sort("scheduled_time", 1).to_list(100)
        
        return scheduled
    
    @router.post("/scheduled")
    async def schedule_email(
        email: ScheduledEmail,
        current_user: dict = Depends(get_current_user)
    ):
        """Schedule an email for later sending"""
        user_id = current_user.get("id")
        
        doc = {
            "id": str(uuid.uuid4()),
            "user_id": user_id,
            "to_recipients": email.to_recipients,
            "cc_recipients": email.cc_recipients or [],
            "bcc_recipients": email.bcc_recipients or [],
            "subject": email.subject,
            "body": email.body,
            "scheduled_time": email.scheduled_time,
            "mailbox": email.mailbox,
            "attachments": email.attachments or [],
            "status": "pending",  # pending, sent, cancelled, failed
            "created_at": datetime.now(timezone.utc).isoformat(),
            "updated_at": datetime.now(timezone.utc).isoformat()
        }
        await db.scheduled_emails.insert_one(doc)
        doc.pop("_id", None)
        return doc
    
    @router.put("/scheduled/{scheduled_id}")
    async def update_scheduled_email(
        scheduled_id: str,
        email: ScheduledEmail,
        current_user: dict = Depends(get_current_user)
    ):
        """Update a scheduled email"""
        user_id = current_user.get("id")
        
        existing = await db.scheduled_emails.find_one({
            "id": scheduled_id, 
            "user_id": user_id,
            "status": "pending"
        })
        if not existing:
            raise HTTPException(status_code=404, detail="Scheduled email not found or already sent")
        
        await db.scheduled_emails.update_one(
            {"id": scheduled_id},
            {"$set": {
                "to_recipients": email.to_recipients,
                "cc_recipients": email.cc_recipients or [],
                "bcc_recipients": email.bcc_recipients or [],
                "subject": email.subject,
                "body": email.body,
                "scheduled_time": email.scheduled_time,
                "attachments": email.attachments or [],
                "updated_at": datetime.now(timezone.utc).isoformat()
            }}
        )
        
        updated = await db.scheduled_emails.find_one({"id": scheduled_id}, {"_id": 0})
        return updated
    
    @router.delete("/scheduled/{scheduled_id}")
    async def cancel_scheduled_email(
        scheduled_id: str,
        current_user: dict = Depends(get_current_user)
    ):
        """Cancel a scheduled email"""
        user_id = current_user.get("id")
        
        result = await db.scheduled_emails.update_one(
            {"id": scheduled_id, "user_id": user_id, "status": "pending"},
            {"$set": {"status": "cancelled", "updated_at": datetime.now(timezone.utc).isoformat()}}
        )
        
        if result.modified_count == 0:
            raise HTTPException(status_code=404, detail="Scheduled email not found or already processed")
        
        return {"message": "Scheduled email cancelled"}
    
    @router.post("/scheduled/{scheduled_id}/send-now")
    async def send_scheduled_now(
        scheduled_id: str,
        current_user: dict = Depends(get_current_user)
    ):
        """Send a scheduled email immediately"""
        user_id = current_user.get("id")
        
        email = await db.scheduled_emails.find_one({
            "id": scheduled_id, 
            "user_id": user_id,
            "status": "pending"
        }, {"_id": 0})
        
        if not email:
            raise HTTPException(status_code=404, detail="Scheduled email not found or already sent")
        
        # Mark as ready to send (actual sending happens via Microsoft Graph from frontend)
        await db.scheduled_emails.update_one(
            {"id": scheduled_id},
            {"$set": {"status": "ready_to_send", "updated_at": datetime.now(timezone.utc).isoformat()}}
        )
        
        return {"message": "Email ready to send", "email": email}
    
    # ============== FOLLOW-UP REMINDERS ==============
    
    @router.get("/follow-ups")
    async def get_follow_up_reminders(current_user: dict = Depends(get_current_user)):
        """Get user's follow-up reminders"""
        user_id = current_user.get("id")
        
        reminders = await db.email_follow_ups.find({
            "user_id": user_id,
            "status": {"$in": ["pending", "reminded"]}
        }, {"_id": 0}).sort("remind_at", 1).to_list(100)
        
        return reminders
    
    @router.get("/follow-ups/due")
    async def get_due_follow_ups(current_user: dict = Depends(get_current_user)):
        """Get follow-up reminders that are due"""
        user_id = current_user.get("id")
        now = datetime.now(timezone.utc).isoformat()
        
        due = await db.email_follow_ups.find({
            "user_id": user_id,
            "status": "pending",
            "remind_at": {"$lte": now}
        }, {"_id": 0}).to_list(100)
        
        return due
    
    @router.post("/follow-ups")
    async def create_follow_up_reminder(
        reminder: FollowUpReminder,
        current_user: dict = Depends(get_current_user)
    ):
        """Create a follow-up reminder for an email"""
        user_id = current_user.get("id")
        
        # Calculate remind_at time
        from datetime import timedelta
        remind_at = datetime.now(timezone.utc) + timedelta(hours=reminder.remind_after_hours)
        
        doc = {
            "id": str(uuid.uuid4()),
            "user_id": user_id,
            "message_id": reminder.message_id,
            "thread_id": reminder.thread_id,
            "subject": reminder.subject,
            "to_email": reminder.to_email,
            "to_name": reminder.to_name,
            "remind_after_hours": reminder.remind_after_hours,
            "remind_at": remind_at.isoformat(),
            "mailbox": reminder.mailbox,
            "status": "pending",  # pending, reminded, replied, dismissed
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        await db.email_follow_ups.insert_one(doc)
        doc.pop("_id", None)
        return doc
    
    @router.put("/follow-ups/{reminder_id}/dismiss")
    async def dismiss_follow_up(
        reminder_id: str,
        current_user: dict = Depends(get_current_user)
    ):
        """Dismiss a follow-up reminder"""
        user_id = current_user.get("id")
        
        result = await db.email_follow_ups.update_one(
            {"id": reminder_id, "user_id": user_id},
            {"$set": {"status": "dismissed", "dismissed_at": datetime.now(timezone.utc).isoformat()}}
        )
        
        if result.modified_count == 0:
            raise HTTPException(status_code=404, detail="Reminder not found")
        
        return {"message": "Reminder dismissed"}
    
    @router.put("/follow-ups/{reminder_id}/snooze")
    async def snooze_follow_up(
        reminder_id: str,
        hours: int = Query(default=24, ge=1, le=168),
        current_user: dict = Depends(get_current_user)
    ):
        """Snooze a follow-up reminder"""
        user_id = current_user.get("id")
        
        from datetime import timedelta
        new_remind_at = datetime.now(timezone.utc) + timedelta(hours=hours)
        
        result = await db.email_follow_ups.update_one(
            {"id": reminder_id, "user_id": user_id},
            {"$set": {
                "remind_at": new_remind_at.isoformat(),
                "status": "pending",
                "snoozed_at": datetime.now(timezone.utc).isoformat()
            }}
        )
        
        if result.modified_count == 0:
            raise HTTPException(status_code=404, detail="Reminder not found")
        
        return {"message": f"Reminder snoozed for {hours} hours", "remind_at": new_remind_at.isoformat()}
    
    @router.delete("/follow-ups/{reminder_id}")
    async def delete_follow_up(
        reminder_id: str,
        current_user: dict = Depends(get_current_user)
    ):
        """Delete a follow-up reminder"""
        user_id = current_user.get("id")
        
        result = await db.email_follow_ups.delete_one({"id": reminder_id, "user_id": user_id})
        
        if result.deleted_count == 0:
            raise HTTPException(status_code=404, detail="Reminder not found")
        
        return {"message": "Reminder deleted"}
    
    @router.post("/follow-ups/mark-replied/{message_id}")
    async def mark_email_replied(
        message_id: str,
        current_user: dict = Depends(get_current_user)
    ):
        """Mark a follow-up as replied (called when reply is detected)"""
        user_id = current_user.get("id")
        
        result = await db.email_follow_ups.update_many(
            {"user_id": user_id, "message_id": message_id, "status": "pending"},
            {"$set": {"status": "replied", "replied_at": datetime.now(timezone.utc).isoformat()}}
        )
        
        return {"message": f"Marked {result.modified_count} reminder(s) as replied"}
    
    # ============== EMAIL TRACKING ==============
    
    @router.get("/tracking")
    async def get_email_tracking(
        limit: int = Query(default=50, le=200),
        current_user: dict = Depends(get_current_user)
    ):
        """Get email tracking records"""
        user_id = current_user.get("id")
        
        tracking = await db.email_tracking.find(
            {"user_id": user_id},
            {"_id": 0}
        ).sort("created_at", -1).limit(limit).to_list(limit)
        
        return tracking
    
    @router.get("/tracking/{tracking_id}")
    async def get_tracking_detail(
        tracking_id: str,
        current_user: dict = Depends(get_current_user)
    ):
        """Get detailed tracking info for a specific email"""
        user_id = current_user.get("id")
        
        tracking = await db.email_tracking.find_one(
            {"id": tracking_id, "user_id": user_id},
            {"_id": 0}
        )
        
        if not tracking:
            raise HTTPException(status_code=404, detail="Tracking record not found")
        
        # Get all events for this tracking
        events = await db.email_tracking_events.find(
            {"tracking_id": tracking_id},
            {"_id": 0}
        ).sort("timestamp", 1).to_list(1000)
        
        tracking["events"] = events
        return tracking
    
    @router.post("/tracking")
    async def create_tracking(
        tracking: EmailTrackingCreate,
        current_user: dict = Depends(get_current_user)
    ):
        """Create a tracking record for an email"""
        user_id = current_user.get("id")
        tracking_id = str(uuid.uuid4())
        
        doc = {
            "id": tracking_id,
            "user_id": user_id,
            "message_id": tracking.message_id,
            "to_email": tracking.to_email,
            "subject": tracking.subject,
            "mailbox": tracking.mailbox,
            "tracking_type": tracking.tracking_type,
            "open_count": 0,
            "click_count": 0,
            "first_opened_at": None,
            "last_opened_at": None,
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        await db.email_tracking.insert_one(doc)
        doc.pop("_id", None)
        
        # Generate tracking pixel URL
        doc["tracking_pixel_url"] = f"/api/email-features/track/{tracking_id}/pixel.gif"
        doc["tracking_link_prefix"] = f"/api/email-features/track/{tracking_id}/link?"
        
        return doc
    
    @router.delete("/tracking/{tracking_id}")
    async def delete_tracking(
        tracking_id: str,
        current_user: dict = Depends(get_current_user)
    ):
        """Delete a tracking record"""
        user_id = current_user.get("id")
        
        result = await db.email_tracking.delete_one({"id": tracking_id, "user_id": user_id})
        await db.email_tracking_events.delete_many({"tracking_id": tracking_id})
        
        if result.deleted_count == 0:
            raise HTTPException(status_code=404, detail="Tracking record not found")
        
        return {"message": "Tracking record deleted"}
    
    # Public tracking endpoints (no auth required)
    @router.get("/track/{tracking_id}/pixel.gif")
    async def track_email_open(tracking_id: str):
        """Tracking pixel endpoint - records email open"""
        tracking = await db.email_tracking.find_one({"id": tracking_id})
        
        if tracking:
            now = datetime.now(timezone.utc).isoformat()
            update_data = {
                "$inc": {"open_count": 1},
                "$set": {"last_opened_at": now}
            }
            if not tracking.get("first_opened_at"):
                update_data["$set"]["first_opened_at"] = now
            
            await db.email_tracking.update_one({"id": tracking_id}, update_data)
            
            # Record event
            await db.email_tracking_events.insert_one({
                "id": str(uuid.uuid4()),
                "tracking_id": tracking_id,
                "event_type": "open",
                "timestamp": now,
                "user_agent": "",  # Could be populated from request headers
                "ip_address": ""   # Could be populated from request
            })
        
        # Return 1x1 transparent GIF
        from fastapi.responses import Response
        gif_bytes = bytes([
            0x47, 0x49, 0x46, 0x38, 0x39, 0x61, 0x01, 0x00,
            0x01, 0x00, 0x80, 0x00, 0x00, 0xff, 0xff, 0xff,
            0x00, 0x00, 0x00, 0x21, 0xf9, 0x04, 0x01, 0x00,
            0x00, 0x00, 0x00, 0x2c, 0x00, 0x00, 0x00, 0x00,
            0x01, 0x00, 0x01, 0x00, 0x00, 0x02, 0x02, 0x44,
            0x01, 0x00, 0x3b
        ])
        return Response(content=gif_bytes, media_type="image/gif")
    
    @router.get("/track/{tracking_id}/link")
    async def track_link_click(
        tracking_id: str,
        url: str = Query(..., description="The actual URL to redirect to")
    ):
        """Link tracking endpoint - records click and redirects"""
        from fastapi.responses import RedirectResponse
        
        tracking = await db.email_tracking.find_one({"id": tracking_id})
        
        if tracking:
            now = datetime.now(timezone.utc).isoformat()
            await db.email_tracking.update_one(
                {"id": tracking_id},
                {"$inc": {"click_count": 1}}
            )
            
            # Record event
            await db.email_tracking_events.insert_one({
                "id": str(uuid.uuid4()),
                "tracking_id": tracking_id,
                "event_type": "click",
                "clicked_url": url,
                "timestamp": now,
                "user_agent": "",
                "ip_address": ""
            })
        
        return RedirectResponse(url=url, status_code=302)
    
    @router.get("/tracking/stats/summary")
    async def get_tracking_summary(
        days: int = Query(default=30, ge=1, le=90),
        current_user: dict = Depends(get_current_user)
    ):
        """Get tracking summary statistics"""
        user_id = current_user.get("id")
        from datetime import timedelta
        
        since = (datetime.now(timezone.utc) - timedelta(days=days)).isoformat()
        
        tracking_records = await db.email_tracking.find({
            "user_id": user_id,
            "created_at": {"$gte": since}
        }, {"_id": 0}).to_list(1000)
        
        total_emails = len(tracking_records)
        total_opens = sum(t.get("open_count", 0) for t in tracking_records)
        total_clicks = sum(t.get("click_count", 0) for t in tracking_records)
        emails_opened = sum(1 for t in tracking_records if t.get("open_count", 0) > 0)
        emails_clicked = sum(1 for t in tracking_records if t.get("click_count", 0) > 0)
        
        return {
            "period_days": days,
            "total_emails_tracked": total_emails,
            "total_opens": total_opens,
            "total_clicks": total_clicks,
            "emails_opened": emails_opened,
            "emails_clicked": emails_clicked,
            "open_rate": round(emails_opened / total_emails * 100, 1) if total_emails > 0 else 0,
            "click_rate": round(emails_clicked / total_emails * 100, 1) if total_emails > 0 else 0,
            "avg_opens_per_email": round(total_opens / total_emails, 1) if total_emails > 0 else 0
        }
    
    # ============== ADMIN SETTINGS ==============
    
    @router.get("/admin/settings")
    async def get_admin_mail_settings(current_user: dict = Depends(get_current_user)):
        """Get organization-wide mail settings (admin only)"""
        # Check if user is admin
        if current_user.get("role") not in ["super_admin", "admin"]:
            raise HTTPException(status_code=403, detail="Admin access required")
        
        settings = await db.admin_mail_settings.find_one({}, {"_id": 0})
        if not settings:
            # Return defaults
            return {
                "general": {
                    "default_undo_send_delay": 5,
                    "max_attachment_size_mb": 25,
                    "allowed_attachment_types": ".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.jpg,.jpeg,.png,.gif,.zip",
                    "enable_read_receipts": True,
                    "enable_email_tracking": True,
                    "default_signature_position": "bottom",
                    "auto_save_drafts_interval": 30,
                    "max_recipients_per_email": 100
                },
                "tracking": {
                    "track_opens": True,
                    "track_clicks": True,
                    "track_link_clicks": True,
                    "tracking_pixel_enabled": True,
                    "notify_on_first_open": True,
                    "aggregate_tracking_data": True,
                    "retention_days": 90
                },
                "auto_reply": {
                    "enable_ooo_for_all": True,
                    "allow_custom_ooo_messages": True,
                    "default_ooo_internal_message": "",
                    "default_ooo_external_message": "",
                    "ooo_excludes_internal": False
                },
                "security": {
                    "block_external_images": False,
                    "warn_external_recipients": True,
                    "require_tls": True,
                    "enable_spam_filter": True,
                    "spam_sensitivity": "medium",
                    "blocked_domains": "",
                    "blocked_file_types": ".exe,.bat,.cmd,.scr,.js,.vbs",
                    "enable_attachment_scanning": True
                },
                "scheduled": {
                    "enable_scheduled_send": True,
                    "max_scheduled_emails_per_user": 50,
                    "max_schedule_days_ahead": 30,
                    "send_time_optimization": False,
                    "default_send_window_start": "09:00",
                    "default_send_window_end": "17:00"
                }
            }
        return settings
    
    @router.put("/admin/settings")
    async def update_admin_mail_settings(
        settings: dict,
        current_user: dict = Depends(get_current_user)
    ):
        """Update organization-wide mail settings (admin only)"""
        if current_user.get("role") not in ["super_admin", "admin"]:
            raise HTTPException(status_code=403, detail="Admin access required")
        
        settings["updated_at"] = datetime.now(timezone.utc).isoformat()
        settings["updated_by"] = current_user.get("id")
        
        await db.admin_mail_settings.update_one(
            {},
            {"$set": settings},
            upsert=True
        )
        
        return {"status": "success", "message": "Settings updated"}
    
    @router.get("/admin/stats")
    async def get_admin_mail_stats(current_user: dict = Depends(get_current_user)):
        """Get mail feature usage statistics (admin only)"""
        if current_user.get("role") not in ["super_admin", "admin"]:
            raise HTTPException(status_code=403, detail="Admin access required")
        
        # Count templates
        total_templates = await db.email_templates.count_documents({})
        
        # Count signatures
        total_signatures = await db.email_signatures.count_documents({})
        
        # Count pending scheduled emails
        scheduled_pending = await db.scheduled_emails.count_documents({
            "status": {"$in": ["pending", None]}
        })
        
        # Count tracked emails
        tracked_total = await db.email_tracking.count_documents({})
        
        # Count active follow-ups
        active_followups = await db.follow_up_reminders.count_documents({
            "status": {"$in": ["pending", "active", None]}
        })
        
        return {
            "total_templates": total_templates,
            "total_signatures": total_signatures,
            "scheduled_emails_pending": scheduled_pending,
            "tracked_emails_total": tracked_total,
            "active_follow_ups": active_followups
        }
    
    return router
