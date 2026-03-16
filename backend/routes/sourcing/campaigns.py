"""
Email Campaigns - Buying & Sourcing Module
Handles single emails, bulk campaigns, and follow-up sequences
"""
from fastapi import APIRouter, HTTPException, Depends, BackgroundTasks
from pydantic import BaseModel, EmailStr
from typing import List, Optional, Callable, Dict
from datetime import datetime, timezone
import uuid

from services.email_service import email_service


def create_campaigns_router(db, get_current_user: Callable):
    """Factory function to create campaigns router"""
    
    router = APIRouter(prefix="/campaigns", tags=["Email Campaigns"])
    
    # =====================
    # MODELS
    # =====================
    
    class SendSingleEmailRequest(BaseModel):
        to_email: EmailStr
        to_name: Optional[str] = None
        subject: str
        content: str
        brand_id: Optional[str] = None
        template_id: Optional[str] = None
    
    class BulkRecipient(BaseModel):
        email: EmailStr
        name: Optional[str] = None
        brand_id: Optional[str] = None
        substitutions: Optional[Dict[str, str]] = {}
    
    class SendBulkEmailRequest(BaseModel):
        recipients: List[BulkRecipient]
        subject: str
        content: str
        campaign_name: str
        template_id: Optional[str] = None
    
    class CampaignCreate(BaseModel):
        name: str
        description: Optional[str] = None
        template_id: Optional[str] = None
        subject: str
        content: str
        target_criteria: Optional[Dict] = {}
    
    class FollowUpCreate(BaseModel):
        campaign_id: str
        delay_days: int = 3
        subject: str
        content: str
        condition: str = "no_reply"  # no_reply, no_open, all
    
    # =====================
    # SERVICE STATUS
    # =====================
    
    @router.get("/status")
    async def get_email_service_status(current_user: dict = Depends(get_current_user)):
        """Check if email service is configured"""
        return {
            "configured": email_service.is_configured(),
            "message": "Email service ready" if email_service.is_configured() else "SendGrid API key not configured"
        }
    
    # =====================
    # SINGLE EMAIL
    # =====================
    
    @router.post("/send-single")
    async def send_single_email(
        request: SendSingleEmailRequest,
        background_tasks: BackgroundTasks,
        current_user: dict = Depends(get_current_user)
    ):
        """Send a single email to a contact using Microsoft Graph API"""
        from services.microsoft_email import MicrosoftEmailService
        
        # Fetch email settings from database
        settings = await db.sourcing_settings.find_one({}) or {}
        email_config = settings.get("email", {})
        shared_mailbox = email_config.get("fromEmail", "seller@sevora.com")
        
        email_service = MicrosoftEmailService()
        
        try:
            # First, try to get the shared mailbox's Object ID
            # This allows us to send directly from the shared mailbox
            mailbox_id = await email_service.get_user_id(shared_mailbox)
            
            if mailbox_id:
                # Send directly from the shared mailbox using its Object ID
                result = await email_service.send_email(
                    sender_email=mailbox_id,  # Use Object ID instead of email
                    to_recipients=[request.to_email],
                    subject=request.subject,
                    body=request.content,
                    is_html=True
                )
            else:
                # Fallback: use logged-in user's email
                sender_email = current_user.get("email")
                if not sender_email:
                    raise HTTPException(status_code=400, detail="User email not found")
                result = await email_service.send_email(
                    sender_email=sender_email,
                    to_recipients=[request.to_email],
                    subject=request.subject,
                    body=request.content,
                    is_html=True,
                    from_shared_mailbox=shared_mailbox
                )
        except Exception as e:
            result = {"success": False, "error": str(e)}
        
        # Log the outreach
        now = datetime.now(timezone.utc).isoformat()
        outreach_log = {
            "id": str(uuid.uuid4()),
            "type": "email",
            "to_email": request.to_email,
            "to_name": request.to_name,
            "subject": request.subject,
            "brand_id": request.brand_id,
            "template_id": request.template_id,
            "status": "sent" if result.get("success") else "failed",
            "error": result.get("error"),
            "message_id": result.get("message_id"),
            "sent_by": current_user.get("id"),
            "sent_by_name": current_user.get("name"),
            "sent_at": now,
            "created_at": now
        }
        await db.sourcing_outreach_logs.insert_one(outreach_log)
        
        # Update brand's last contacted date if brand_id provided
        if request.brand_id:
            await db.sourcing_brands.update_one(
                {"id": request.brand_id},
                {"$set": {"last_contacted_at": now, "last_contact_type": "email"}}
            )
        
        if not result.get("success"):
            raise HTTPException(status_code=500, detail=result.get("error", "Failed to send email"))
        
        return {
            "success": True,
            "message": f"Email sent to {request.to_email}",
            "log_id": outreach_log["id"]
        }
    
    # =====================
    # BULK EMAIL
    # =====================
    
    @router.post("/send-bulk")
    async def send_bulk_email(
        request: SendBulkEmailRequest,
        background_tasks: BackgroundTasks,
        current_user: dict = Depends(get_current_user)
    ):
        """Send bulk emails as a campaign"""
        if not email_service.is_configured():
            raise HTTPException(status_code=503, detail="Email service not configured")
        
        if not request.recipients:
            raise HTTPException(status_code=400, detail="No recipients provided")
        
        from services.microsoft_service import microsoft_service
        
        # Fetch email settings from database
        settings = await db.sourcing_settings.find_one({}) or {}
        email_config = settings.get("email", {})
        from_email = email_config.get("fromEmail", "seller@sevora.com")
        
        # Create campaign record
        now = datetime.now(timezone.utc).isoformat()
        campaign_id = str(uuid.uuid4())
        campaign_doc = {
            "id": campaign_id,
            "name": request.campaign_name,
            "subject": request.subject,
            "template_id": request.template_id,
            "recipients_count": len(request.recipients),
            "sent_count": 0,
            "failed_count": 0,
            "opened_count": 0,
            "replied_count": 0,
            "status": "sending",
            "created_by": current_user.get("id"),
            "created_by_name": current_user.get("name"),
            "created_at": now,
            "updated_at": now
        }
        await db.sourcing_campaigns.insert_one(campaign_doc)
        
        # Send emails one by one via Microsoft Graph (shared mailbox)
        sent_count = 0
        failed_count = 0
        
        for recipient in request.recipients:
            try:
                result = await microsoft_service.send_email(
                    to_email=recipient.email,
                    subject=request.subject,
                    body=request.content,
                    is_html=True,
                    sender_email=from_email
                )
                if result.get("success"):
                    sent_count += 1
                else:
                    failed_count += 1
            except Exception as e:
                failed_count += 1
                logger.error(f"Failed to send email to {recipient.email}: {e}")
        
        # Update campaign status
        final_status = "sent" if sent_count > 0 else "failed"
        await db.sourcing_campaigns.update_one(
            {"id": campaign_id},
            {"$set": {
                "status": final_status,
                "sent_count": sent_count,
                "failed_count": failed_count,
                "sent_at": now,
                "updated_at": now
            }}
        )
        
        result = {"success": sent_count > 0, "sent_count": sent_count, "failed_count": failed_count}
        
        # Log individual outreach for each recipient
        for recipient in request.recipients:
            outreach_log = {
                "id": str(uuid.uuid4()),
                "type": "email",
                "campaign_id": campaign_id,
                "to_email": recipient.email,
                "to_name": recipient.name,
                "subject": request.subject,
                "brand_id": recipient.brand_id,
                "status": "sent" if result.get("success") else "failed",
                "sent_by": current_user.get("id"),
                "sent_at": now,
                "created_at": now
            }
            await db.sourcing_outreach_logs.insert_one(outreach_log)
            
            # Update brand's last contacted date
            if recipient.brand_id:
                await db.sourcing_brands.update_one(
                    {"id": recipient.brand_id},
                    {"$set": {"last_contacted_at": now, "last_contact_type": "email", "campaign_id": campaign_id}}
                )
        
        return {
            "success": result.get("success"),
            "campaign_id": campaign_id,
            "recipients_count": len(request.recipients),
            "message": f"Campaign '{request.campaign_name}' sent to {len(request.recipients)} recipients" if result.get("success") else result.get("error")
        }
    
    # =====================
    # CAMPAIGNS CRUD
    # =====================
    
    @router.get("")
    async def list_campaigns(
        current_user: dict = Depends(get_current_user),
        status: Optional[str] = None,
        limit: int = 50
    ):
        """List all campaigns"""
        query = {}
        if status:
            query["status"] = status
        return await db.sourcing_campaigns.find(query, {"_id": 0}).sort("created_at", -1).limit(limit).to_list(length=limit)
    
    @router.get("/{campaign_id}")
    async def get_campaign(campaign_id: str, current_user: dict = Depends(get_current_user)):
        """Get campaign details"""
        campaign = await db.sourcing_campaigns.find_one({"id": campaign_id}, {"_id": 0})
        if not campaign:
            raise HTTPException(status_code=404, detail="Campaign not found")
        
        # Get outreach logs for this campaign
        logs = await db.sourcing_outreach_logs.find(
            {"campaign_id": campaign_id},
            {"_id": 0}
        ).sort("sent_at", -1).to_list(length=1000)
        
        campaign["outreach_logs"] = logs
        return campaign
    
    @router.get("/{campaign_id}/stats")
    async def get_campaign_stats(campaign_id: str, current_user: dict = Depends(get_current_user)):
        """Get campaign statistics"""
        campaign = await db.sourcing_campaigns.find_one({"id": campaign_id}, {"_id": 0})
        if not campaign:
            raise HTTPException(status_code=404, detail="Campaign not found")
        
        # Get outreach logs stats
        logs = await db.sourcing_outreach_logs.find({"campaign_id": campaign_id}).to_list(length=10000)
        
        sent_count = sum(1 for log in logs if log.get("status") == "sent")
        failed_count = sum(1 for log in logs if log.get("status") == "failed")
        opened_count = sum(1 for log in logs if log.get("opened_at"))
        replied_count = sum(1 for log in logs if log.get("replied_at"))
        
        return {
            "campaign_id": campaign_id,
            "name": campaign.get("name"),
            "total_recipients": campaign.get("recipients_count", 0),
            "sent": sent_count,
            "failed": failed_count,
            "opened": opened_count,
            "replied": replied_count,
            "open_rate": round(opened_count / sent_count * 100, 1) if sent_count > 0 else 0,
            "reply_rate": round(replied_count / sent_count * 100, 1) if sent_count > 0 else 0
        }
    
    # =====================
    # OUTREACH LOGS
    # =====================
    
    @router.get("/logs/brand/{brand_id}")
    async def get_brand_outreach_logs(
        brand_id: str,
        current_user: dict = Depends(get_current_user),
        limit: int = 50
    ):
        """Get all outreach logs for a brand"""
        return await db.sourcing_outreach_logs.find(
            {"brand_id": brand_id},
            {"_id": 0}
        ).sort("sent_at", -1).limit(limit).to_list(length=limit)
    
    @router.get("/logs/recent")
    async def get_recent_outreach_logs(
        current_user: dict = Depends(get_current_user),
        limit: int = 100
    ):
        """Get recent outreach logs"""
        return await db.sourcing_outreach_logs.find(
            {},
            {"_id": 0}
        ).sort("sent_at", -1).limit(limit).to_list(length=limit)
    
    # =====================
    # FOLLOW-UPS
    # =====================
    
    @router.post("/follow-ups")
    async def create_follow_up(
        follow_up: FollowUpCreate,
        current_user: dict = Depends(get_current_user)
    ):
        """Create a follow-up for a campaign"""
        # Verify campaign exists
        campaign = await db.sourcing_campaigns.find_one({"id": follow_up.campaign_id})
        if not campaign:
            raise HTTPException(status_code=404, detail="Campaign not found")
        
        now = datetime.now(timezone.utc).isoformat()
        follow_up_doc = {
            "id": str(uuid.uuid4()),
            "campaign_id": follow_up.campaign_id,
            "delay_days": follow_up.delay_days,
            "subject": follow_up.subject,
            "content": follow_up.content,
            "condition": follow_up.condition,
            "status": "scheduled",
            "created_by": current_user.get("id"),
            "created_at": now
        }
        
        await db.sourcing_follow_ups.insert_one(follow_up_doc)
        follow_up_doc.pop("_id", None)
        
        return follow_up_doc
    
    @router.get("/follow-ups/campaign/{campaign_id}")
    async def get_campaign_follow_ups(
        campaign_id: str,
        current_user: dict = Depends(get_current_user)
    ):
        """Get follow-ups for a campaign"""
        return await db.sourcing_follow_ups.find(
            {"campaign_id": campaign_id},
            {"_id": 0}
        ).sort("delay_days", 1).to_list(length=50)
    
    @router.get("/follow-ups")
    async def get_all_follow_ups(
        current_user: dict = Depends(get_current_user)
    ):
        """Get all upcoming follow-ups for calendar integration"""
        # Get follow-ups from campaigns
        campaign_follow_ups = await db.sourcing_follow_ups.find(
            {},
            {"_id": 0}
        ).to_list(length=100)
        
        # Get brands/contacts with follow_up_date set
        brands_with_followup = await db.sourcing_brands.find(
            {"follow_up_date": {"$exists": True, "$ne": None}},
            {"_id": 0, "id": 1, "name": 1, "follow_up_date": 1}
        ).to_list(length=100)
        
        results = []
        
        # Add campaign follow-ups
        for f in campaign_follow_ups:
            results.append({
                "id": f.get("id"),
                "entity_type": "campaign",
                "entity_id": f.get("campaign_id"),
                "entity_name": f.get("subject", "Follow-up"),
                "follow_up_date": f.get("scheduled_date") or f.get("created_at"),
                "delay_days": f.get("delay_days"),
                "condition": f.get("condition")
            })
        
        # Add brand follow-ups
        for b in brands_with_followup:
            results.append({
                "id": f"brand-{b.get('id')}",
                "entity_type": "brand",
                "entity_id": b.get("id"),
                "entity_name": b.get("name"),
                "follow_up_date": b.get("follow_up_date")
            })
        
        return results
    
    # =====================
    # QUICK SEND FROM BRAND
    # =====================
    
    @router.post("/quick-send/{brand_id}")
    async def quick_send_to_brand(
        brand_id: str,
        request: SendSingleEmailRequest,
        current_user: dict = Depends(get_current_user)
    ):
        """Quick send email to a brand using their stored email"""
        brand = await db.sourcing_brands.find_one({"id": brand_id}, {"_id": 0})
        if not brand:
            raise HTTPException(status_code=404, detail="Brand not found")
        
        # Get brand's email
        brand_email = brand.get("email") or brand.get("contact_email")
        if not brand_email:
            # Try to get from contacts
            contact = await db.sourcing_contacts.find_one({"brand_id": brand_id, "business_email": {"$exists": True}})
            if contact:
                brand_email = contact.get("business_email")
        
        if not brand_email:
            raise HTTPException(status_code=400, detail="No email found for this brand")
        
        # Override the to_email with brand's email
        request.to_email = brand_email
        request.to_name = brand.get("founder_name") or brand.get("name")
        request.brand_id = brand_id
        
        # Use the send_single_email logic
        return await send_single_email(request, BackgroundTasks(), current_user)
    
    return router
