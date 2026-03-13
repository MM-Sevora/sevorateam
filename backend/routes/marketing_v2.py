"""
Marketing Routes - Unified Contacts Hub, Digital PR, Events, Content & Assets
"""

import os
from fastapi import APIRouter, Depends, HTTPException, Query, Body
from typing import List, Optional
import uuid
from datetime import datetime, timezone, timedelta

from models.marketing import (
    # Contact models
    ContactCreate, ContactUpdate, ContactResponse, ContactType, ContactTier,
    # Communication models
    CommunicationCreate, CommunicationResponse,
    # Deal models
    DealCreate, DealResponse,
    # Contract models
    ContractCreate, ContractResponse,
    # Payment models
    PaymentCreate, PaymentResponse,
    # UGC models
    UGCCreate, UGCResponse,
    # PR Campaign models
    PRCampaignCreate, PRCampaignResponse,
    # Press Release models
    PressReleaseCreate, PressReleaseResponse,
    # Media Coverage models
    MediaCoverageCreate, MediaCoverageResponse,
    # PR Pitch models
    PRPitchCreate, PRPitchResponse,
    # Outreach Template models
    OutreachTemplateCreate, OutreachTemplateResponse,
    # Outreach Sequence models
    OutreachSequenceCreate, OutreachSequenceResponse,
    # Scheduled Outreach models
    ScheduledOutreachCreate, ScheduledOutreachResponse,
    # Event models
    EventCreate, EventResponse, EventAttendeeCreate,
    # Asset models
    AssetCreate, AssetResponse,
    # Approval models
    ApprovalCreate, ApprovalResponse,
    # Calendar models
    CalendarItemCreate, CalendarItemResponse,
    # Phase 5: Relationship CRM models
    InteractionCreate, InteractionResponse, RelationshipScoreUpdate,
    # Phase 8: Press Kit models
    PressKitAssetCreate, PressKitAssetResponse, PressKitCreate, PressKitResponse,
    # Phase 9: Alerts & Monitoring models
    MonitoringAlertCreate, MonitoringAlertResponse, AlertTriggerCreate, AlertTriggerResponse,
    # Phase 10: Pipeline models
    PipelineContactUpdate, PipelineContactResponse, PipelineStageStats,
    # Publication models (PR equivalent of Influencers)
    PublicationCreate, PublicationResponse,
    # Unified Sequence & Activity models
    UnifiedSequenceCreate, UnifiedSequenceResponse, SequenceEnrollmentCreate, SequenceEnrollmentResponse, ActivityResponse,
    # Advertorial/Paid Placement models
    AdvertorialCreate, AdvertorialResponse,
)

import logging
logger = logging.getLogger(__name__)

# Import pulse integration service for auto-posts
from services.pulse_integrations import on_press_release_published, on_media_coverage, on_deal_closed, on_influencer_signed

marketing_v2_router = APIRouter(prefix="/marketing/v2", tags=["Marketing V2"])

# Import db and auth dependencies from main server
# These will be injected when the router is included

def get_db():
    """Get database instance - will be set by main server"""
    from server import db
    return db

def get_marketing_auth():
    """Get require_department dependency for marketing"""
    from server import require_department
    return require_department(["marketing"])


# ============== MICROSOFT INTEGRATION ==============

@marketing_v2_router.get("/microsoft/status")
async def get_microsoft_status(user: dict = Depends(get_marketing_auth())):
    """Check Microsoft Graph API connection status"""
    try:
        from services.microsoft_service import microsoft_service
        status = await microsoft_service.get_connection_status()
        return status
    except Exception as e:
        return {
            "connected": False,
            "status": "error",
            "message": str(e)
        }

@marketing_v2_router.post("/microsoft/send-email")
async def send_email_via_microsoft(
    to_email: str,
    subject: str,
    body: str,
    is_html: bool = False,
    sender_email: str = None,
    user: dict = Depends(get_marketing_auth())
):
    """
    Send an email via Microsoft Graph API
    
    The sender_email must be provided by the user (their own Outlook/M365 email).
    If not provided, tries to use the logged-in user's email from their profile.
    """
    try:
        from services.microsoft_service import microsoft_service
        
        # If no sender specified, try to use the logged-in user's email
        if not sender_email:
            # Check if user has a Microsoft 365 email configured
            db = get_db()
            user_profile = await db.users.find_one({"id": user.get("id")}, {"email": 1, "microsoft_email": 1})
            sender_email = user_profile.get("microsoft_email") or user_profile.get("email") if user_profile else None
            
            if not sender_email:
                return {
                    "success": False,
                    "error": "No sender email provided. Please provide your Outlook email address."
                }
        
        result = await microsoft_service.send_email(
            to_email=to_email,
            subject=subject,
            body=body,
            is_html=is_html,
            sender_email=sender_email
        )
        return result
    except Exception as e:
        return {
            "success": False,
            "error": str(e)
        }

@marketing_v2_router.get("/microsoft/emails/{contact_id}")
async def get_emails_for_contact(
    contact_id: str,
    user_email: str,
    limit: int = 50,
    user: dict = Depends(get_marketing_auth())
):
    """Get all emails exchanged with a contact"""
    db = get_db()
    
    # Get contact email
    contact = await db.contacts.find_one({"id": contact_id}, {"email": 1})
    if not contact or not contact.get("email"):
        raise HTTPException(status_code=404, detail="Contact not found or no email")
    
    try:
        from services.microsoft_service import microsoft_service
        emails = await microsoft_service.get_emails_for_contact(
            user_email=user_email,
            contact_emails=[contact["email"]],
            limit=limit
        )
        return {"emails": emails, "count": len(emails)}
    except Exception as e:
        return {"emails": [], "count": 0, "error": str(e)}


@marketing_v2_router.get("/user/email-settings")
async def get_user_email_settings(user: dict = Depends(get_marketing_auth())):
    """Get user's email settings (Microsoft email for sending)"""
    db = get_db()
    user_profile = await db.users.find_one({"id": user.get("id")}, {"_id": 0, "email": 1, "microsoft_email": 1})
    return {
        "email": user_profile.get("email") if user_profile else None,
        "microsoft_email": user_profile.get("microsoft_email") if user_profile else None
    }


@marketing_v2_router.put("/user/email-settings")
async def update_user_email_settings(
    microsoft_email: str,
    user: dict = Depends(get_marketing_auth())
):
    """Update user's Microsoft email for sending"""
    db = get_db()
    
    await db.users.update_one(
        {"id": user.get("id")},
        {"$set": {"microsoft_email": microsoft_email}}
    )
    
    return {"message": "Email settings updated", "microsoft_email": microsoft_email}


# =====================
# MARKETING EMAIL SETTINGS (for outreach)
# =====================

@marketing_v2_router.get("/settings/email")
async def get_marketing_email_settings(user: dict = Depends(get_marketing_auth())):
    """Get marketing email settings for outreach"""
    db = get_db()
    settings = await db.marketing_settings.find_one({}, {"_id": 0})
    
    if not settings or "email" not in settings:
        # Return defaults
        return {
            "email": {
                "fromName": "Sevora Marketing Team",
                "fromEmail": "marketing@sevora.com",
                "replyTo": "marketing@sevora.com",
                "subjectPrefix": "[Sevora] ",
                "signature": "Best regards,\nSevora Marketing Team"
            }
        }
    return {"email": settings.get("email", {})}


@marketing_v2_router.put("/settings/email")
async def update_marketing_email_settings(
    body: dict,
    user: dict = Depends(get_marketing_auth())
):
    """Update marketing email settings for outreach"""
    db = get_db()
    
    # Extract email from body
    email = body.get("email", body)
    
    # Validate required fields
    required_fields = ["fromName", "fromEmail", "replyTo"]
    for field in required_fields:
        if field not in email:
            raise HTTPException(status_code=400, detail=f"Missing required field: {field}")
    
    await db.marketing_settings.update_one(
        {},
        {"$set": {"email": email}},
        upsert=True
    )
    
    return {"success": True, "message": "Email settings updated", "email": email}


@marketing_v2_router.post("/outreach/send-email")
async def send_outreach_email(
    contact_id: str,
    subject: str,
    body: str,
    template_id: str = None,
    sender_email: str = None,
    use_sendgrid: bool = False,
    user: dict = Depends(get_marketing_auth())
):
    """
    Send an outreach email to a contact.
    
    - If use_sendgrid=True, uses SendGrid with marketing email settings
    - If use_sendgrid=False (default), uses Microsoft Graph with user's Outlook email
    - Records the communication in the contact's history
    """
    db = get_db()
    
    # Get contact
    contact = await db.contacts.find_one({"id": contact_id}, {"_id": 0})
    if not contact:
        raise HTTPException(status_code=404, detail="Contact not found")
    
    if not contact.get("email"):
        return {"success": False, "error": "Contact has no email address"}
    
    if use_sendgrid:
        # Use SendGrid with marketing email settings
        from services.email_service import email_service
        
        if not email_service.is_configured():
            return {"success": False, "error": "SendGrid not configured"}
        
        # Get marketing email settings
        settings = await db.marketing_settings.find_one({}) or {}
        email_config = settings.get("email", {})
        from_email = email_config.get("fromEmail", "marketing@sevora.com")
        from_name = email_config.get("fromName", "Sevora Marketing Team")
        reply_to = email_config.get("replyTo", from_email)
        
        # Generate HTML email
        html_content = email_service.generate_html_email(body)
        
        result = await email_service.send_single_email(
            to_email=contact["email"],
            subject=subject,
            html_content=html_content,
            from_name=from_name,
            from_email=from_email,
            reply_to=reply_to
        )
        sender_email = from_email
    else:
        # Use Microsoft Graph (user's Outlook)
        if not sender_email:
            user_profile = await db.users.find_one({"id": user.get("id")}, {"microsoft_email": 1})
            sender_email = user_profile.get("microsoft_email") if user_profile else None
            
            if not sender_email:
                return {
                    "success": False, 
                    "error": "Please configure your Outlook email in settings first, or use SendGrid option"
                }
        
        try:
            from services.microsoft_service import microsoft_service
            
            result = await microsoft_service.send_email(
                to_email=contact["email"],
                subject=subject,
                body=body,
                is_html=True,
                sender_email=sender_email
            )
        except Exception as e:
            return {"success": False, "error": str(e)}
    
    if result.get("success"):
        # Record the communication
        comm_id = str(uuid.uuid4())
        now = datetime.now(timezone.utc).isoformat()
        
        comm_doc = {
            "id": comm_id,
            "contact_id": contact_id,
            "comm_type": "email",
            "direction": "outbound",
            "subject": subject,
            "message": body,
            "status": "sent",
            "sent_at": now,
            "sender_email": sender_email,
            "created_at": now
        }
        
        await db.communications.insert_one(comm_doc)
        
        # Update template usage count if template was used
        if template_id:
            await db.templates.update_one(
                {"id": template_id},
                {"$inc": {"usage_count": 1}}
            )
        
        return {
            "success": True,
            "message": f"Email sent to {contact['email']}",
            "communication_id": comm_id
        }
    else:
        return result


# ============== UNIFIED CAMPAIGNS (Both Influencer + PR) ==============

@marketing_v2_router.get("/unified-campaigns")
async def get_unified_campaigns(
    campaign_type: Optional[str] = None,  # "influencer", "pr", or None for all
    status: Optional[str] = None,
    search: Optional[str] = None,
    limit: int = 100,
    user: dict = Depends(get_marketing_auth())
):
    """Get all campaigns (both influencer and PR) in a unified view"""
    db = get_db()
    
    campaigns = []
    
    # Fetch influencer campaigns from marketing_campaigns collection
    if not campaign_type or campaign_type == "influencer":
        inf_query = {}
        if status:
            inf_query["status"] = status
        if search:
            inf_query["name"] = {"$regex": search, "$options": "i"}
        
        inf_campaigns = await db.marketing_campaigns.find(inf_query, {"_id": 0}).limit(limit).to_list(limit)
        for c in inf_campaigns:
            if not c.get("campaign_type") or c.get("campaign_type") == "influencer":
                c["campaign_type"] = "influencer"
                c["influencer_count"] = len(c.get("assigned_influencers", []))
                campaigns.append(c)
    
    # Fetch PR campaigns
    if not campaign_type or campaign_type == "pr":
        pr_query = {}
        if status:
            pr_query["status"] = status
        if search:
            pr_query["name"] = {"$regex": search, "$options": "i"}
        
        pr_campaigns = await db.pr_campaigns.find(pr_query, {"_id": 0}).limit(limit).to_list(limit)
        for c in pr_campaigns:
            c["campaign_type"] = "pr"
            c["journalist_count"] = len(c.get("journalist_ids", []))
            # Get coverage count
            coverage_count = await db.media_coverage.count_documents({"campaign_id": c["id"]})
            c["coverage_count"] = coverage_count
            campaigns.append(c)
    
    # Sort by created_at descending
    campaigns.sort(key=lambda x: x.get("created_at", ""), reverse=True)
    
    return campaigns

@marketing_v2_router.get("/unified-campaigns/stats")
async def get_unified_campaign_stats(user: dict = Depends(get_marketing_auth())):
    """Get aggregate stats across all campaign types"""
    db = get_db()
    
    # Influencer campaign stats (from marketing_campaigns collection)
    inf_count = await db.marketing_campaigns.count_documents({})
    inf_active = await db.marketing_campaigns.count_documents({"status": "active"})
    inf_campaigns = await db.marketing_campaigns.find({}, {"_id": 0, "budget": 1, "spent": 1}).to_list(1000)
    inf_budget = sum(c.get("budget", 0) for c in inf_campaigns)
    inf_spent = sum(c.get("spent", 0) for c in inf_campaigns)
    
    # PR campaign stats
    pr_count = await db.pr_campaigns.count_documents({})
    pr_active = await db.pr_campaigns.count_documents({"status": "active"})
    pr_campaigns = await db.pr_campaigns.find({}, {"_id": 0, "budget": 1, "spent": 1}).to_list(1000)
    pr_budget = sum(c.get("budget", 0) for c in pr_campaigns)
    pr_spent = sum(c.get("spent", 0) for c in pr_campaigns)
    
    # Deliverables stats
    ugc_count = await db.ugc.count_documents({})
    coverage_count = await db.media_coverage.count_documents({})
    
    # Payment stats
    total_paid = 0
    total_pending = 0
    payments = await db.payments.find({}, {"_id": 0, "amount": 1, "status": 1}).to_list(10000)
    for p in payments:
        if p.get("status") == "paid":
            total_paid += p.get("amount", 0)
        elif p.get("status") == "pending":
            total_pending += p.get("amount", 0)
    
    return {
        "total_campaigns": inf_count + pr_count,
        "influencer_campaigns": inf_count,
        "pr_campaigns": pr_count,
        "active_campaigns": inf_active + pr_active,
        "total_budget": inf_budget + pr_budget,
        "total_spent": inf_spent + pr_spent,
        "budget_utilization": round((inf_spent + pr_spent) / (inf_budget + pr_budget) * 100, 1) if (inf_budget + pr_budget) > 0 else 0,
        "total_deliverables": ugc_count + coverage_count,
        "ugc_count": ugc_count,
        "coverage_count": coverage_count,
        "total_paid": total_paid,
        "total_pending": total_pending,
    }


# ============== CONTACTS HUB ==============

@marketing_v2_router.get("/contacts", response_model=List[ContactResponse])
async def get_contacts(
    contact_type: Optional[str] = None,
    status: Optional[str] = None,
    tier: Optional[str] = None,
    industry: Optional[str] = None,
    city: Optional[str] = None,
    search: Optional[str] = None,
    limit: int = Query(default=100, le=500),
    skip: int = 0,
    user: dict = Depends(get_marketing_auth())
):
    """Get all contacts with filters - requires marketing auth"""
    db = get_db()
    query = {}
    
    if contact_type:
        query["contact_type"] = contact_type
    if status:
        query["status"] = status
    if tier:
        query["tier"] = tier
    if industry:
        query["industry"] = industry
    if city:
        query["city"] = {"$regex": city, "$options": "i"}
    if search:
        query["$or"] = [
            {"name": {"$regex": search, "$options": "i"}},
            {"email": {"$regex": search, "$options": "i"}},
            {"instagram_handle": {"$regex": search, "$options": "i"}},
            {"publication": {"$regex": search, "$options": "i"}},
        ]
    
    contacts = await db.contacts.find(query, {"_id": 0}).sort("score", -1).skip(skip).limit(limit).to_list(limit)
    return contacts

@marketing_v2_router.get("/contacts/{contact_id}", response_model=ContactResponse)
async def get_contact(contact_id: str, user: dict = Depends(get_marketing_auth())):
    """Get single contact by ID - requires marketing auth"""
    db = get_db()
    contact = await db.contacts.find_one({"id": contact_id}, {"_id": 0})
    if not contact:
        raise HTTPException(status_code=404, detail="Contact not found")
    return contact

@marketing_v2_router.post("/contacts", response_model=ContactResponse)
async def create_contact(data: ContactCreate, user: dict = Depends(get_marketing_auth())):
    """Create a new contact - requires marketing auth"""
    db = get_db()
    contact_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc).isoformat()
    
    contact_doc = {
        "id": contact_id,
        **data.model_dump(),
        "status": "identified",
        "score": calculate_contact_score(data.model_dump()),
        "created_at": now,
        "updated_at": now,
    }
    
    await db.contacts.insert_one(contact_doc)
    del contact_doc["_id"]
    return contact_doc

@marketing_v2_router.put("/contacts/{contact_id}", response_model=ContactResponse)
async def update_contact(contact_id: str, data: ContactUpdate, user: dict = Depends(get_marketing_auth())):
    """Update a contact - supports partial updates, syncs publication journalist count when publication_id changes"""
    db = get_db()
    existing = await db.contacts.find_one({"id": contact_id})
    if not existing:
        raise HTTPException(status_code=404, detail="Contact not found")
    
    old_publication_id = existing.get("publication_id")
    old_status = existing.get("status")
    
    # Only include non-None values for partial update
    update_data = {k: v for k, v in data.model_dump().items() if v is not None}
    
    # Handle empty strings - convert to None for optional fields
    empty_string_fields = ['email', 'bio', 'phone', 'city', 'instagram_handle', 'youtube_handle', 
                          'twitter_handle', 'linkedin_url', 'publication', 'publication_id', 
                          'beat', 'editor_level', 'notes', 'campaign_id']
    for field in empty_string_fields:
        if field in update_data and update_data[field] == "":
            update_data[field] = None
    
    # Recalculate score if relevant fields changed
    merged_data = {**existing, **update_data}
    update_data["score"] = calculate_contact_score(merged_data)
    update_data["updated_at"] = datetime.now(timezone.utc).isoformat()
    
    new_publication_id = update_data.get("publication_id", old_publication_id)
    new_status = update_data.get("status", old_status)
    
    await db.contacts.update_one({"id": contact_id}, {"$set": update_data})
    
    # SYNC: Update publication journalist counts when publication_id changes
    if old_publication_id != new_publication_id:
        if old_publication_id:
            # Decrement old publication's journalist count
            await db.publications.update_one(
                {"id": old_publication_id},
                {"$inc": {"journalist_count": -1}}
            )
        if new_publication_id:
            # Increment new publication's journalist count
            await db.publications.update_one(
                {"id": new_publication_id},
                {"$inc": {"journalist_count": 1}}
            )
    
    # PULSE INTEGRATION: Auto-post when influencer is signed/contracted
    if existing.get("contact_type") == "influencer":
        signed_statuses = ["signed", "contracted", "agreed", "delivered"]
        if new_status in signed_statuses and old_status not in signed_statuses:
            try:
                await on_influencer_signed(
                    influencer={**existing, **update_data},
                    signed_by=user
                )
            except Exception as e:
                # Log but don't fail the request
                print(f"Pulse integration error (influencer_signed): {e}")
    
    updated = await db.contacts.find_one({"id": contact_id}, {"_id": 0})
    return updated

@marketing_v2_router.delete("/contacts/{contact_id}")
async def delete_contact(contact_id: str, user: dict = Depends(get_marketing_auth())):
    """Delete a contact - syncs publication journalist count"""
    db = get_db()
    
    # Get contact first to check publication_id
    contact = await db.contacts.find_one({"id": contact_id})
    if not contact:
        raise HTTPException(status_code=404, detail="Contact not found")
    
    publication_id = contact.get("publication_id")
    
    await db.contacts.delete_one({"id": contact_id})
    
    # SYNC: Decrement publication journalist count if linked
    if publication_id:
        await db.publications.update_one(
            {"id": publication_id},
            {"$inc": {"journalist_count": -1}}
        )
    
    return {"message": "Contact deleted successfully"}


# ============== BULK DELETE ENDPOINTS ==============

@marketing_v2_router.post("/contacts/bulk-delete")
async def bulk_delete_contacts(data: dict, user: dict = Depends(get_marketing_auth())):
    """Bulk delete multiple contacts"""
    db = get_db()
    
    ids = data.get("ids", [])
    if not ids:
        raise HTTPException(status_code=400, detail="No IDs provided")
    
    # Get contacts to check publication links
    contacts = await db.contacts.find({"id": {"$in": ids}}).to_list(len(ids))
    
    # Track publication updates
    publication_decrements = {}
    for contact in contacts:
        pub_id = contact.get("publication_id")
        if pub_id:
            publication_decrements[pub_id] = publication_decrements.get(pub_id, 0) + 1
    
    # Delete contacts
    result = await db.contacts.delete_many({"id": {"$in": ids}})
    
    # Update publication journalist counts
    for pub_id, decrement in publication_decrements.items():
        await db.publications.update_one(
            {"id": pub_id},
            {"$inc": {"journalist_count": -decrement}}
        )
    
    # Also delete related data
    await db.communications.delete_many({"contact_id": {"$in": ids}})
    await db.deals.delete_many({"contact_id": {"$in": ids}})
    
    return {"deleted_count": result.deleted_count, "message": f"Deleted {result.deleted_count} contacts"}


@marketing_v2_router.post("/publications/bulk-delete")
async def bulk_delete_publications(data: dict, user: dict = Depends(get_marketing_auth())):
    """Bulk delete multiple publications"""
    db = get_db()
    
    ids = data.get("ids", [])
    if not ids:
        raise HTTPException(status_code=400, detail="No IDs provided")
    
    result = await db.publications.delete_many({"id": {"$in": ids}})
    
    # Unlink journalists from deleted publications
    await db.contacts.update_many(
        {"publication_id": {"$in": ids}},
        {"$unset": {"publication_id": ""}}
    )
    
    return {"deleted_count": result.deleted_count, "message": f"Deleted {result.deleted_count} publications"}


@marketing_v2_router.post("/campaigns/bulk-delete")
async def bulk_delete_campaigns(data: dict, user: dict = Depends(get_marketing_auth())):
    """Bulk delete multiple campaigns (both influencer and PR)"""
    db = get_db()
    
    ids = data.get("ids", [])
    if not ids:
        raise HTTPException(status_code=400, detail="No IDs provided")
    
    # Delete from marketing_campaigns (influencer campaigns)
    inf_result = await db.marketing_campaigns.delete_many({"id": {"$in": ids}})
    
    # Delete from pr_campaigns
    pr_result = await db.pr_campaigns.delete_many({"id": {"$in": ids}})
    
    # Clean up related data
    await db.pr_pitches.delete_many({"campaign_id": {"$in": ids}})
    
    # Remove campaign_id from contacts
    await db.contacts.update_many(
        {"campaign_id": {"$in": ids}},
        {"$set": {"campaign_id": None}}
    )
    
    total_deleted = inf_result.deleted_count + pr_result.deleted_count
    return {"deleted_count": total_deleted, "message": f"Deleted {total_deleted} campaigns"}


@marketing_v2_router.post("/deals/bulk-delete")
async def bulk_delete_deals(data: dict, user: dict = Depends(get_marketing_auth())):
    """Bulk delete multiple deals"""
    db = get_db()
    
    ids = data.get("ids", [])
    if not ids:
        raise HTTPException(status_code=400, detail="No IDs provided")
    
    result = await db.deals.delete_many({"id": {"$in": ids}})
    
    return {"deleted_count": result.deleted_count, "message": f"Deleted {result.deleted_count} deals"}


@marketing_v2_router.post("/communications/bulk-delete")
async def bulk_delete_communications(data: dict, user: dict = Depends(get_marketing_auth())):
    """Bulk delete multiple communications"""
    db = get_db()
    
    ids = data.get("ids", [])
    if not ids:
        raise HTTPException(status_code=400, detail="No IDs provided")
    
    result = await db.communications.delete_many({"id": {"$in": ids}})
    
    return {"deleted_count": result.deleted_count, "message": f"Deleted {result.deleted_count} communications"}


@marketing_v2_router.get("/contacts/{contact_id}/stats")
async def get_contact_stats(contact_id: str, user: dict = Depends(get_marketing_auth())):
    """Get contact statistics - requires marketing auth"""
    db = get_db()
    contact = await db.contacts.find_one({"id": contact_id})
    if not contact:
        raise HTTPException(status_code=404, detail="Contact not found")
    
    # Get related data counts
    comms_count = await db.communications.count_documents({"contact_id": contact_id})
    deals_count = await db.deals.count_documents({"contact_id": contact_id})
    payments_count = await db.payments.count_documents({"contact_id": contact_id})
    ugc_count = await db.ugc.count_documents({"contact_id": contact_id})
    
    # Calculate total paid
    payments = await db.payments.find({"contact_id": contact_id, "status": "paid"}).to_list(1000)
    total_paid = sum(p.get("amount", 0) for p in payments)
    
    return {
        "contact_id": contact_id,
        "communications": comms_count,
        "deals": deals_count,
        "payments": payments_count,
        "ugc_items": ugc_count,
        "total_paid": total_paid,
    }


@marketing_v2_router.get("/contacts/{contact_id}/deliverables")
async def get_contact_deliverables(contact_id: str, user: dict = Depends(get_marketing_auth())):
    """Get rate cards/deliverables for a specific contact (influencer)"""
    db = get_db()
    contact = await db.contacts.find_one({"id": contact_id}, {"_id": 0, "deliverables": 1, "name": 1})
    if not contact:
        raise HTTPException(status_code=404, detail="Contact not found")
    
    deliverables = contact.get("deliverables", [])
    
    # Ensure each deliverable has an id for selection
    for i, d in enumerate(deliverables):
        if not d.get("id"):
            d["id"] = f"{contact_id}_deliverable_{i}"
        # Normalize the rate field name
        if d.get("price") is not None and d.get("rate") is None:
            d["rate"] = d["price"]
        elif d.get("rate") is not None and d.get("price") is None:
            d["price"] = d["rate"]
    
    return deliverables


def calculate_contact_score(contact: dict) -> float:
    """Calculate a score for contact prioritization"""
    score = 0.0
    
    # Engagement rate (max 25 points)
    engagement = contact.get('engagement_rate', 0)
    score += min(engagement * 5, 25)
    
    # Followers (max 20 points)
    followers = contact.get('followers', 0)
    if followers >= 1000000:
        score += 20
    elif followers >= 500000:
        score += 18
    elif followers >= 100000:
        score += 15
    elif followers >= 50000:
        score += 10
    elif followers >= 10000:
        score += 5
    
    # Industry relevance (max 20 points)
    fashion_industries = ['fashion', 'luxury', 'beauty', 'lifestyle']
    if contact.get('industry', '').lower() in fashion_industries:
        score += 20
    
    # Contact type bonus
    contact_type = contact.get('contact_type', 'influencer')
    if contact_type == 'hybrid':
        score += 10
    elif contact_type == 'journalist':
        score += 8
    
    # Has contact info (max 10 points)
    if contact.get('email'):
        score += 5
    if contact.get('phone'):
        score += 5
    
    return round(min(score, 100), 1)


# ============== INFLUENCER ANALYTICS (Instagram & YouTube APIs) ==============

@marketing_v2_router.get("/influencer-analytics/instagram/{username}")
async def get_instagram_analytics(
    username: str,
    user: dict = Depends(get_marketing_auth())
):
    """
    Fetch Instagram profile analytics for an influencer.
    Returns: followers, engagement rate, recent posts performance.
    
    Note: Requires the target account to be a Business/Creator account.
    """
    from services.influencer_analytics import InfluencerAnalyticsService
    
    async with InfluencerAnalyticsService() as service:
        result = await service.get_instagram_profile(username)
        return result


@marketing_v2_router.get("/influencer-analytics/youtube/{channel_id}")
async def get_youtube_analytics(
    channel_id: str,
    user: dict = Depends(get_marketing_auth())
):
    """
    Fetch YouTube channel analytics for an influencer.
    Supports: channel ID (UC...), handle (@username), custom URL, or username.
    Returns: subscribers, total views, video count, tier.
    """
    from services.influencer_analytics import InfluencerAnalyticsService
    
    async with InfluencerAnalyticsService() as service:
        result = await service.get_youtube_channel(channel_id)
        return result


@marketing_v2_router.get("/influencer-analytics/youtube/{channel_id}/videos")
async def get_youtube_channel_videos(
    channel_id: str,
    limit: int = Query(default=10, le=50),
    user: dict = Depends(get_marketing_auth())
):
    """
    Get recent videos from a YouTube channel with performance metrics.
    Returns: video list with views, likes, comments, and averages.
    """
    from services.influencer_analytics import InfluencerAnalyticsService
    
    async with InfluencerAnalyticsService() as service:
        # First get channel info to get the real channel ID
        channel_info = await service.get_youtube_channel(channel_id)
        if not channel_info.get("success"):
            return channel_info
        
        real_channel_id = channel_info.get("channel_id")
        return await service.get_youtube_recent_videos(real_channel_id, limit)


# ============== CONTENT PERFORMANCE ANALYSIS ==============

@marketing_v2_router.get("/influencer-analytics/instagram/{username}/content-performance")
async def get_instagram_content_performance(
    username: str,
    user: dict = Depends(get_marketing_auth())
):
    """
    Deep content performance analysis for an Instagram account.
    Returns: best posts, engagement by type, posting frequency, peak times.
    """
    from services.influencer_analytics import InfluencerAnalyticsService
    
    async with InfluencerAnalyticsService() as service:
        return await service.analyze_instagram_content(username)


@marketing_v2_router.get("/influencer-analytics/youtube/{channel_id}/content-performance")
async def get_youtube_content_performance(
    channel_id: str,
    user: dict = Depends(get_marketing_auth())
):
    """
    Deep content performance analysis for a YouTube channel.
    Returns: best videos, engagement patterns, upload frequency.
    """
    from services.influencer_analytics import InfluencerAnalyticsService
    
    async with InfluencerAnalyticsService() as service:
        return await service.analyze_youtube_content(channel_id)


@marketing_v2_router.get("/contacts/{contact_id}/content-performance")
async def get_contact_content_performance(
    contact_id: str,
    user: dict = Depends(get_marketing_auth())
):
    """
    Get comprehensive content performance for an influencer contact.
    Analyzes both Instagram and YouTube if handles are available.
    """
    db = get_db()
    from services.influencer_analytics import InfluencerAnalyticsService
    
    contact = await db.contacts.find_one({"id": contact_id}, {"_id": 0})
    if not contact:
        raise HTTPException(status_code=404, detail="Contact not found")
    
    instagram_handle = contact.get("instagram_handle")
    youtube_handle = contact.get("youtube_handle")
    
    if not instagram_handle and not youtube_handle:
        raise HTTPException(
            status_code=400,
            detail="Contact has no Instagram or YouTube handle"
        )
    
    results = {
        "contact_id": contact_id,
        "contact_name": contact.get("name"),
        "instagram": None,
        "youtube": None
    }
    
    async with InfluencerAnalyticsService() as service:
        if instagram_handle:
            results["instagram"] = await service.analyze_instagram_content(instagram_handle)
        
        if youtube_handle:
            results["youtube"] = await service.analyze_youtube_content(youtube_handle)
    
    # Generate overall content insights
    insights = []
    recommendations = []
    
    if results["instagram"] and results["instagram"].get("success"):
        ig = results["instagram"]
        
        # Best content type
        content_types = ig.get("engagement_by_content_type", {})
        if content_types:
            best_type = max(content_types.items(), key=lambda x: x[1].get("avg_engagement_rate", 0))
            insights.append(f"Instagram: {best_type[0].upper()} content performs best ({best_type[1].get('avg_engagement_rate')}% avg engagement)")
        
        # Posting frequency recommendation
        freq = ig.get("posting_frequency", {})
        if freq.get("consistency_score", 0) < 60:
            recommendations.append("Increase Instagram posting frequency for better consistency")
        
        # Peak time
        peak = ig.get("peak_engagement_times", {})
        if peak.get("recommendation"):
            recommendations.append(f"Instagram: {peak['recommendation']}")
    
    if results["youtube"] and results["youtube"].get("success"):
        yt = results["youtube"]
        
        # Upload frequency
        freq = yt.get("upload_frequency", {})
        if freq.get("videos_per_week"):
            insights.append(f"YouTube: Uploads {freq['videos_per_week']} videos/week")
        
        if freq.get("consistency_score", 0) < 60:
            recommendations.append("Increase YouTube upload frequency for better audience retention")
        
        peak = yt.get("peak_upload_times", {})
        if peak.get("recommendation"):
            recommendations.append(f"YouTube: {peak['recommendation']}")
    
    results["insights"] = insights
    results["recommendations"] = recommendations
    
    return results


@marketing_v2_router.post("/contacts/{contact_id}/fetch-metrics")
async def fetch_contact_metrics(
    contact_id: str,
    user: dict = Depends(get_marketing_auth())
):
    """
    Fetch and update metrics for a contact from their social profiles.
    Automatically updates the contact record with fresh data.
    """
    db = get_db()
    from services.influencer_analytics import InfluencerAnalyticsService
    
    # Get contact
    contact = await db.contacts.find_one({"id": contact_id}, {"_id": 0})
    if not contact:
        raise HTTPException(status_code=404, detail="Contact not found")
    
    instagram_handle = contact.get("instagram_handle")
    youtube_handle = contact.get("youtube_handle")
    
    if not instagram_handle and not youtube_handle:
        raise HTTPException(
            status_code=400, 
            detail="Contact has no Instagram or YouTube handle to fetch metrics from"
        )
    
    async with InfluencerAnalyticsService() as service:
        results = await service.fetch_all_metrics(
            instagram_handle=instagram_handle,
            youtube_handle=youtube_handle
        )
    
    # Handle case where results is None (shouldn't happen but be defensive)
    if results is None:
        results = {
            "instagram": None,
            "youtube": None,
            "combined_metrics": {},
            "fetched_at": datetime.now(timezone.utc).isoformat()
        }
    
    # Prepare update data
    update_data = {
        "metrics_fetched_at": datetime.now(timezone.utc).isoformat(),
        "metrics_data": results
    }
    
    # Update with Instagram data if successful
    if results and results.get("instagram", {}) and results.get("instagram", {}).get("success"):
        ig_data = results["instagram"]
        ig_metrics = ig_data.get("metrics", {})
        update_data.update({
            "followers": ig_metrics.get("followers", contact.get("followers", 0)),
            "engagement_rate": ig_metrics.get("engagement_rate", contact.get("engagement_rate", 0)),
            "avg_likes": ig_metrics.get("avg_likes", 0),
            "avg_comments": ig_metrics.get("avg_comments", 0),
            "instagram_verified": True,
            "instagram_bio": ig_data.get("bio"),
            "instagram_profile_pic": ig_data.get("profile_picture"),
            "instagram_posts_count": ig_metrics.get("posts", 0),
        })
        
        # Update tier based on Instagram followers
        if ig_metrics.get("followers"):
            followers = ig_metrics["followers"]
            if followers >= 10_000_000:
                update_data["tier"] = "celebrity"
            elif followers >= 1_000_000:
                update_data["tier"] = "mega"
            elif followers >= 100_000:
                update_data["tier"] = "macro"
            elif followers >= 10_000:
                update_data["tier"] = "micro"
            else:
                update_data["tier"] = "nano"
    
    # Update with YouTube data if successful
    if results and results.get("youtube", {}) and results.get("youtube", {}).get("success"):
        yt_data = results["youtube"]
        yt_metrics = yt_data.get("metrics", {})
        update_data.update({
            "youtube_subscribers": yt_metrics.get("subscribers", 0),
            "youtube_total_views": yt_metrics.get("total_views", 0),
            "youtube_videos_count": yt_metrics.get("videos", 0),
            "youtube_verified": True,
            "youtube_channel_id": yt_data.get("channel_id"),
            "youtube_channel_url": yt_data.get("channel_url"),
            "youtube_profile_pic": yt_data.get("profile_picture"),
        })
    
    # Calculate combined reach
    total_reach = 0
    if results and results.get("combined_metrics"):
        total_reach = results.get("combined_metrics", {}).get("total_reach", 0)
    if total_reach > 0:
        update_data["total_reach"] = total_reach
    
    # Update contact in database
    await db.contacts.update_one(
        {"id": contact_id},
        {"$set": update_data}
    )
    
    # Record metrics history for tracking growth
    from services.metrics_history import get_metrics_history_service
    history_service = get_metrics_history_service(db)
    
    ig_data = results.get("instagram") if results else None
    if ig_data and isinstance(ig_data, dict) and ig_data.get("success"):
        await history_service.record_metrics_snapshot(
            contact_id=contact_id,
            platform="instagram",
            metrics=ig_data["metrics"],
            source="api_fetch"
        )
    
    yt_data = results.get("youtube") if results else None
    if yt_data and isinstance(yt_data, dict) and yt_data.get("success"):
        await history_service.record_metrics_snapshot(
            contact_id=contact_id,
            platform="youtube",
            metrics=yt_data["metrics"],
            source="api_fetch"
        )
    
    return {
        "success": True,
        "contact_id": contact_id,
        "results": results,
        "updated_fields": list(update_data.keys()),
        "message": "Metrics fetched and contact updated successfully",
        "history_recorded": True
    }


@marketing_v2_router.post("/contacts/bulk-fetch-metrics")
async def bulk_fetch_contact_metrics(
    data: dict,
    user: dict = Depends(get_marketing_auth())
):
    """
    Fetch metrics for multiple contacts at once.
    Limit: 10 contacts per request to avoid rate limiting.
    """
    db = get_db()
    from services.influencer_analytics import InfluencerAnalyticsService
    
    contact_ids = data.get("contact_ids", [])
    if not contact_ids:
        raise HTTPException(status_code=400, detail="No contact IDs provided")
    
    if len(contact_ids) > 10:
        raise HTTPException(
            status_code=400, 
            detail="Maximum 10 contacts per request to avoid API rate limiting"
        )
    
    # Get contacts
    contacts = await db.contacts.find(
        {"id": {"$in": contact_ids}},
        {"_id": 0}
    ).to_list(len(contact_ids))
    
    results = {
        "processed": 0,
        "successful": 0,
        "failed": 0,
        "details": []
    }
    
    async with InfluencerAnalyticsService() as service:
        for contact in contacts:
            contact_id = contact["id"]
            instagram_handle = contact.get("instagram_handle")
            youtube_handle = contact.get("youtube_handle")
            
            if not instagram_handle and not youtube_handle:
                results["details"].append({
                    "contact_id": contact_id,
                    "name": contact.get("name"),
                    "success": False,
                    "error": "No social handles"
                })
                results["failed"] += 1
                results["processed"] += 1
                continue
            
            try:
                fetch_results = await service.fetch_all_metrics(
                    instagram_handle=instagram_handle,
                    youtube_handle=youtube_handle
                )
                
                # Update contact
                update_data = {
                    "metrics_fetched_at": datetime.now(timezone.utc).isoformat(),
                    "metrics_data": fetch_results
                }
                
                if fetch_results.get("instagram", {}).get("success"):
                    ig_metrics = fetch_results["instagram"]["metrics"]
                    update_data["followers"] = ig_metrics.get("followers", 0)
                    update_data["engagement_rate"] = ig_metrics.get("engagement_rate", 0)
                    update_data["instagram_verified"] = True
                
                if fetch_results.get("youtube", {}).get("success"):
                    yt_metrics = fetch_results["youtube"]["metrics"]
                    update_data["youtube_subscribers"] = yt_metrics.get("subscribers", 0)
                    update_data["youtube_verified"] = True
                
                await db.contacts.update_one(
                    {"id": contact_id},
                    {"$set": update_data}
                )
                
                results["details"].append({
                    "contact_id": contact_id,
                    "name": contact.get("name"),
                    "success": True,
                    "instagram": fetch_results.get("instagram", {}).get("success", False),
                    "youtube": fetch_results.get("youtube", {}).get("success", False),
                })
                results["successful"] += 1
                
            except Exception as e:
                results["details"].append({
                    "contact_id": contact_id,
                    "name": contact.get("name"),
                    "success": False,
                    "error": str(e)
                })
                results["failed"] += 1
            
            results["processed"] += 1
    
    return results


# ============== INFLUENCER METRICS HISTORY ==============

@marketing_v2_router.get("/contacts/{contact_id}/metrics-history")
async def get_influencer_metrics_history(
    contact_id: str,
    platform: Optional[str] = None,
    days: int = Query(default=30, le=365),
    user: dict = Depends(get_marketing_auth())
):
    """
    Get metrics history for an influencer.
    Returns daily snapshots of followers, engagement, etc.
    """
    db = get_db()
    from services.metrics_history import get_metrics_history_service
    
    # Verify contact exists
    contact = await db.contacts.find_one({"id": contact_id}, {"_id": 0, "name": 1})
    if not contact:
        raise HTTPException(status_code=404, detail="Contact not found")
    
    service = get_metrics_history_service(db)
    history = await service.get_metrics_history(contact_id, platform, days)
    
    return {
        "contact_id": contact_id,
        "contact_name": contact.get("name"),
        "platform": platform,
        "period_days": days,
        "history": history,
        "total_snapshots": len(history)
    }


@marketing_v2_router.get("/contacts/{contact_id}/growth-analytics")
async def get_influencer_growth_analytics(
    contact_id: str,
    platform: str = Query(..., description="instagram or youtube"),
    days: int = Query(default=30, le=365),
    user: dict = Depends(get_marketing_auth())
):
    """
    Get growth analytics for an influencer.
    Returns: growth rate, trend direction, follower change.
    """
    db = get_db()
    from services.metrics_history import get_metrics_history_service
    
    # Verify contact exists
    contact = await db.contacts.find_one({"id": contact_id}, {"_id": 0, "name": 1})
    if not contact:
        raise HTTPException(status_code=404, detail="Contact not found")
    
    service = get_metrics_history_service(db)
    growth = await service.calculate_growth(contact_id, platform, days)
    
    return {
        "contact_id": contact_id,
        "contact_name": contact.get("name"),
        **growth
    }


@marketing_v2_router.get("/contacts/{contact_id}/growth-chart")
async def get_influencer_growth_chart(
    contact_id: str,
    platform: str = Query(..., description="instagram or youtube"),
    days: int = Query(default=30, le=365),
    user: dict = Depends(get_marketing_auth())
):
    """
    Get chart data for rendering follower growth visualization.
    Returns: dates[], followers[], engagement[] arrays.
    """
    db = get_db()
    from services.metrics_history import get_metrics_history_service
    
    # Verify contact exists
    contact = await db.contacts.find_one({"id": contact_id}, {"_id": 0, "name": 1})
    if not contact:
        raise HTTPException(status_code=404, detail="Contact not found")
    
    service = get_metrics_history_service(db)
    chart_data = await service.get_growth_chart_data(contact_id, platform, days)
    
    return {
        "contact_id": contact_id,
        "contact_name": contact.get("name"),
        **chart_data
    }


# ============== INFLUENCER DISCOVERY & COMPARISON ==============

@marketing_v2_router.get("/influencers/discover")
async def discover_influencers(
    niche: Optional[str] = Query(None, description="Industry/niche filter"),
    tier: Optional[str] = Query(None, description="nano, micro, macro, mega, celebrity"),
    min_followers: Optional[int] = Query(None, description="Minimum follower count"),
    max_followers: Optional[int] = Query(None, description="Maximum follower count"),
    min_engagement: Optional[float] = Query(None, description="Minimum engagement rate"),
    platform: Optional[str] = Query(None, description="instagram, youtube"),
    city: Optional[str] = Query(None, description="City filter"),
    verified_only: bool = Query(False, description="Only show verified profiles"),
    sort_by: str = Query("followers", description="followers, engagement_rate, score"),
    limit: int = Query(20, le=100),
    user: dict = Depends(get_marketing_auth())
):
    """
    Discover influencers from your database with advanced filters.
    Search by niche, tier, engagement rate, location, and more.
    """
    db = get_db()
    
    query = {"contact_type": "influencer"}
    
    if niche:
        query["industry"] = {"$regex": niche, "$options": "i"}
    
    if tier:
        query["tier"] = tier
    
    if min_followers:
        query["followers"] = {"$gte": min_followers}
    
    if max_followers:
        if "followers" in query:
            query["followers"]["$lte"] = max_followers
        else:
            query["followers"] = {"$lte": max_followers}
    
    if min_engagement:
        query["engagement_rate"] = {"$gte": min_engagement}
    
    if platform:
        query["primary_platform"] = platform
    
    if city:
        query["city"] = {"$regex": city, "$options": "i"}
    
    if verified_only:
        query["$or"] = [
            {"instagram_verified": True},
            {"youtube_verified": True}
        ]
    
    # Determine sort field
    sort_field = "followers"
    if sort_by == "engagement_rate":
        sort_field = "engagement_rate"
    elif sort_by == "score":
        sort_field = "score"
    
    influencers = await db.contacts.find(
        query,
        {"_id": 0}
    ).sort(sort_field, -1).limit(limit).to_list(limit)
    
    return {
        "influencers": influencers,
        "total": len(influencers),
        "filters_applied": {
            "niche": niche,
            "tier": tier,
            "min_followers": min_followers,
            "max_followers": max_followers,
            "min_engagement": min_engagement,
            "platform": platform,
            "city": city,
            "verified_only": verified_only
        }
    }


@marketing_v2_router.post("/influencers/ai-discover")
async def ai_discover_influencers(
    data: dict,
    user: dict = Depends(get_marketing_auth())
):
    """
    AI-powered influencer discovery using GPT.
    Describe what you're looking for and get recommendations.
    
    Request body:
    {
        "query": "Find fashion influencers in Mumbai with high engagement for a luxury brand campaign",
        "budget_range": "50000-100000",  # optional
        "campaign_type": "product_launch"  # optional
    }
    """
    db = get_db()
    
    user_query = data.get("query", "")
    budget_range = data.get("budget_range")
    campaign_type = data.get("campaign_type")
    
    if not user_query:
        raise HTTPException(status_code=400, detail="Query is required")
    
    # Get existing influencers from database for context
    all_influencers = await db.contacts.find(
        {"contact_type": "influencer"},
        {"_id": 0, "id": 1, "name": 1, "instagram_handle": 1, "youtube_handle": 1,
         "followers": 1, "engagement_rate": 1, "tier": 1, "industry": 1, "city": 1,
         "rate_per_post": 1, "rate_per_reel": 1, "bio": 1, "style_tags": 1,
         "audience_age_18_24": 1, "audience_age_25_34": 1, "audience_gender_female": 1}
    ).limit(100).to_list(100)
    
    # Build context for AI
    influencer_context = "\n".join([
        f"- {inf.get('name')} (@{inf.get('instagram_handle') or inf.get('youtube_handle')}): "
        f"{inf.get('followers', 0):,} followers, {inf.get('engagement_rate', 0)}% engagement, "
        f"Tier: {inf.get('tier')}, Industry: {inf.get('industry')}, City: {inf.get('city')}, "
        f"Rate: ₹{inf.get('rate_per_post', 'N/A')}/post"
        for inf in all_influencers[:50]
    ])
    
    prompt = f"""You are an influencer marketing expert. Based on the following database of influencers, recommend the best matches for this query:

USER QUERY: {user_query}
{f"BUDGET RANGE: ₹{budget_range}" if budget_range else ""}
{f"CAMPAIGN TYPE: {campaign_type}" if campaign_type else ""}

AVAILABLE INFLUENCERS:
{influencer_context}

Please recommend 5-10 influencers that best match the query. For each recommendation, explain:
1. Why they're a good fit
2. Their key strengths
3. Estimated cost if available
4. Any potential concerns

Format your response as JSON with this structure:
{{
    "recommendations": [
        {{
            "name": "Influencer Name",
            "handle": "@handle",
            "match_score": 85,
            "reasoning": "Why they're recommended",
            "strengths": ["strength1", "strength2"],
            "estimated_cost": "₹X-Y per post",
            "concerns": ["any concerns"]
        }}
    ],
    "search_insights": "Overall insights about the search",
    "alternative_suggestions": "Any suggestions for broadening or refining the search"
}}
"""
    
    try:
        # Use OpenAI for AI discovery
        from emergentintegrations.llm.chat import LlmChat, UserMessage
        
        chat = LlmChat(
            api_key=os.environ.get("EMERGENT_LLM_KEY"),
            session_id=f"influencer-discovery-{datetime.now().timestamp()}",
            system_message="You are an influencer marketing expert. Return responses as valid JSON."
        ).with_model("openai", "gpt-4o")
        
        message = UserMessage(text=prompt)
        response = await chat.send_message(message)
        
        import json
        # Try to parse JSON from response
        response_text = response.strip() if isinstance(response, str) else str(response)
        
        # Clean up markdown code blocks
        if response_text.startswith("```"):
            response_text = response_text.split("```")[1]
            if response_text.startswith("json"):
                response_text = response_text[4:]
        response_text = response_text.strip()
        
        # Find JSON in response
        json_start = response_text.find('{')
        json_end = response_text.rfind('}') + 1
        if json_start >= 0 and json_end > json_start:
            result = json.loads(response_text[json_start:json_end])
        else:
            result = {"recommendations": [], "search_insights": response_text}
        
        # Enrich with actual influencer IDs
        for rec in result.get("recommendations", []):
            handle = rec.get("handle", "").replace("@", "")
            matching = next(
                (inf for inf in all_influencers 
                 if inf.get("instagram_handle") == handle or inf.get("youtube_handle") == handle),
                None
            )
            if matching:
                rec["influencer_id"] = matching.get("id")
                rec["followers"] = matching.get("followers")
                rec["engagement_rate"] = matching.get("engagement_rate")
        
        return {
            "success": True,
            "query": user_query,
            **result
        }
        
    except Exception as e:
        logger.error(f"AI discovery error: {e}")
        return {
            "success": False,
            "error": str(e),
            "fallback_results": all_influencers[:10]
        }


@marketing_v2_router.post("/influencers/compare")
async def compare_influencers(
    data: dict,
    user: dict = Depends(get_marketing_auth())
):
    """
    Compare multiple influencers side-by-side.
    
    Request body:
    {
        "influencer_ids": ["id1", "id2", "id3"]
    }
    """
    db = get_db()
    
    influencer_ids = data.get("influencer_ids", [])
    
    if not influencer_ids or len(influencer_ids) < 2:
        raise HTTPException(status_code=400, detail="At least 2 influencer IDs required")
    
    if len(influencer_ids) > 10:
        raise HTTPException(status_code=400, detail="Maximum 10 influencers can be compared")
    
    influencers = await db.contacts.find(
        {"id": {"$in": influencer_ids}, "contact_type": "influencer"},
        {"_id": 0}
    ).to_list(len(influencer_ids))
    
    if len(influencers) < 2:
        raise HTTPException(status_code=404, detail="Not enough influencers found")
    
    # Calculate comparison metrics
    comparison = {
        "influencers": [],
        "metrics_comparison": {
            "followers": {},
            "engagement_rate": {},
            "estimated_reach": {},
            "cost_per_follower": {}
        },
        "winner_by_metric": {},
        "overall_recommendation": None
    }
    
    max_followers = 0
    max_engagement = 0
    best_value = None
    best_value_score = float('inf')
    
    for inf in influencers:
        inf_id = inf.get("id")
        followers = inf.get("followers", 0)
        engagement = inf.get("engagement_rate", 0)
        rate = inf.get("rate_per_post", 0) or 0
        
        # Calculate cost per 1000 followers
        cost_per_k = (rate / followers * 1000) if followers > 0 and rate > 0 else None
        
        # Calculate estimated reach (followers * engagement rate)
        estimated_reach = int(followers * (engagement / 100)) if engagement > 0 else 0
        
        comparison["influencers"].append({
            "id": inf_id,
            "name": inf.get("name"),
            "handle": inf.get("instagram_handle") or inf.get("youtube_handle"),
            "platform": inf.get("primary_platform"),
            "tier": inf.get("tier"),
            "followers": followers,
            "engagement_rate": engagement,
            "estimated_reach": estimated_reach,
            "rate_per_post": rate,
            "cost_per_1k_followers": round(cost_per_k, 2) if cost_per_k else None,
            "industry": inf.get("industry"),
            "city": inf.get("city"),
            "audience_demographics": {
                "age_18_24": inf.get("audience_age_18_24"),
                "age_25_34": inf.get("audience_age_25_34"),
                "gender_female": inf.get("audience_gender_female"),
                "top_locations": inf.get("audience_top_locations")
            },
            "verified": inf.get("instagram_verified") or inf.get("youtube_verified", False)
        })
        
        comparison["metrics_comparison"]["followers"][inf_id] = followers
        comparison["metrics_comparison"]["engagement_rate"][inf_id] = engagement
        comparison["metrics_comparison"]["estimated_reach"][inf_id] = estimated_reach
        comparison["metrics_comparison"]["cost_per_follower"][inf_id] = cost_per_k
        
        # Track winners
        if followers > max_followers:
            max_followers = followers
            comparison["winner_by_metric"]["followers"] = inf_id
        
        if engagement > max_engagement:
            max_engagement = engagement
            comparison["winner_by_metric"]["engagement_rate"] = inf_id
        
        # Best value = lowest cost per 1000 followers
        if cost_per_k and cost_per_k < best_value_score:
            best_value_score = cost_per_k
            best_value = inf_id
    
    if best_value:
        comparison["winner_by_metric"]["best_value"] = best_value
    
    # Calculate radar chart data (normalized 0-100)
    max_vals = {
        "followers": max(inf.get("followers", 0) for inf in influencers) or 1,
        "engagement": max(inf.get("engagement_rate", 0) for inf in influencers) or 1,
        "reach": max(comparison["metrics_comparison"]["estimated_reach"].values()) or 1
    }
    
    comparison["radar_chart_data"] = []
    for inf in comparison["influencers"]:
        comparison["radar_chart_data"].append({
            "id": inf["id"],
            "name": inf["name"],
            "data": {
                "followers": round(inf["followers"] / max_vals["followers"] * 100),
                "engagement": round(inf["engagement_rate"] / max_vals["engagement"] * 100),
                "reach": round(inf["estimated_reach"] / max_vals["reach"] * 100),
                "value": round(100 - (inf["cost_per_1k_followers"] or 100) / (best_value_score or 1) * 10) if inf["cost_per_1k_followers"] else 50
            }
        })
    
    return comparison


@marketing_v2_router.get("/publications", response_model=List[PublicationResponse])
async def get_publications(
    publication_type: Optional[str] = None,
    tier: Optional[str] = None,
    beat: Optional[str] = None,
    search: Optional[str] = None,
    relationship_status: Optional[str] = None,
    limit: int = Query(default=100, le=500),
    skip: int = 0
):
    """Get all publications with optional filters"""
    db = get_db()
    
    query = {}
    if publication_type:
        query["publication_type"] = publication_type
    if tier:
        query["tier"] = tier
    if beat:
        query["beats_covered"] = {"$in": [beat]}
    if relationship_status:
        query["relationship_status"] = relationship_status
    if search:
        query["$or"] = [
            {"name": {"$regex": search, "$options": "i"}},
            {"website": {"$regex": search, "$options": "i"}},
            {"description": {"$regex": search, "$options": "i"}}
        ]
    
    publications = await db.publications.find(query, {"_id": 0}).skip(skip).limit(limit).to_list(limit)
    
    # Enrich with counts
    for pub in publications:
        # Count journalists linked to this publication
        journalist_count = await db.contacts.count_documents({
            "contact_type": "journalist",
            "publication_id": pub["id"]
        })
        pub["journalist_count"] = journalist_count
        
        # Count coverages from this publication
        coverage_count = await db.media_coverage.count_documents({
            "publication": pub["name"]
        })
        pub["coverage_count"] = coverage_count
    
    return publications

@marketing_v2_router.get("/publications/{publication_id}", response_model=PublicationResponse)
async def get_publication(publication_id: str):
    """Get a single publication by ID"""
    db = get_db()
    publication = await db.publications.find_one({"id": publication_id}, {"_id": 0})
    if not publication:
        raise HTTPException(status_code=404, detail="Publication not found")
    
    # Enrich with counts
    publication["journalist_count"] = await db.contacts.count_documents({
        "contact_type": "journalist",
        "publication_id": publication_id
    })
    publication["coverage_count"] = await db.media_coverage.count_documents({
        "publication": publication["name"]
    })
    
    return publication

@marketing_v2_router.post("/publications", response_model=PublicationResponse)
async def create_publication(data: PublicationCreate):
    """Create a new publication"""
    db = get_db()
    
    pub_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc).isoformat()
    
    pub_doc = {
        "id": pub_id,
        **data.model_dump(),
        "journalist_count": 0,
        "coverage_count": 0,
        "created_at": now,
        "updated_at": now
    }
    
    await db.publications.insert_one(pub_doc)
    del pub_doc["_id"]
    return pub_doc

@marketing_v2_router.put("/publications/{publication_id}", response_model=PublicationResponse)
async def update_publication(publication_id: str, data: PublicationCreate):
    """Update a publication"""
    db = get_db()
    
    existing = await db.publications.find_one({"id": publication_id})
    if not existing:
        raise HTTPException(status_code=404, detail="Publication not found")
    
    now = datetime.now(timezone.utc).isoformat()
    update_data = {
        **data.model_dump(),
        "updated_at": now
    }
    
    await db.publications.update_one(
        {"id": publication_id},
        {"$set": update_data}
    )
    
    updated = await db.publications.find_one({"id": publication_id}, {"_id": 0})
    updated["journalist_count"] = await db.contacts.count_documents({
        "contact_type": "journalist",
        "publication_id": publication_id
    })
    updated["coverage_count"] = await db.media_coverage.count_documents({
        "publication": updated["name"]
    })
    
    return updated

@marketing_v2_router.delete("/publications/{publication_id}")
async def delete_publication(publication_id: str):
    """Delete a publication"""
    db = get_db()
    
    result = await db.publications.delete_one({"id": publication_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Publication not found")
    
    # Unlink journalists from this publication
    await db.contacts.update_many(
        {"publication_id": publication_id},
        {"$unset": {"publication_id": ""}}
    )
    
    return {"success": True}

@marketing_v2_router.get("/publications/{publication_id}/journalists", response_model=List[ContactResponse])
async def get_publication_journalists(publication_id: str):
    """Get all journalists linked to a publication"""
    db = get_db()
    
    journalists = await db.contacts.find({
        "contact_type": "journalist",
        "publication_id": publication_id
    }, {"_id": 0}).to_list(100)
    
    return journalists

@marketing_v2_router.post("/publications/{publication_id}/journalists/{journalist_id}")
async def link_journalist_to_publication(publication_id: str, journalist_id: str):
    """Link a journalist to a publication"""
    db = get_db()
    
    # Verify publication exists
    publication = await db.publications.find_one({"id": publication_id})
    if not publication:
        raise HTTPException(status_code=404, detail="Publication not found")
    
    # Verify journalist exists
    journalist = await db.contacts.find_one({"id": journalist_id, "contact_type": "journalist"})
    if not journalist:
        raise HTTPException(status_code=404, detail="Journalist not found")
    
    # Link journalist to publication
    await db.contacts.update_one(
        {"id": journalist_id},
        {"$set": {
            "publication_id": publication_id,
            "publication": publication["name"]
        }}
    )
    
    return {"success": True, "message": f"Journalist linked to {publication['name']}"}

@marketing_v2_router.delete("/publications/{publication_id}/journalists/{journalist_id}")
async def unlink_journalist_from_publication(publication_id: str, journalist_id: str):
    """Unlink a journalist from a publication"""
    db = get_db()
    
    await db.contacts.update_one(
        {"id": journalist_id, "publication_id": publication_id},
        {"$unset": {"publication_id": "", "publication": ""}}
    )
    
    return {"success": True}

@marketing_v2_router.get("/publications/{publication_id}/coverage", response_model=List[MediaCoverageResponse])
async def get_publication_coverage(publication_id: str):
    """Get all media coverage from a publication"""
    db = get_db()
    
    publication = await db.publications.find_one({"id": publication_id})
    if not publication:
        raise HTTPException(status_code=404, detail="Publication not found")
    
    coverage = await db.media_coverage.find({
        "publication": publication["name"]
    }, {"_id": 0}).sort("created_at", -1).to_list(100)
    
    return coverage

# ============== COMMUNICATIONS ==============

@marketing_v2_router.get("/contacts/{contact_id}/communications", response_model=List[CommunicationResponse])
async def get_contact_communications(contact_id: str):
    """Get all communications for a contact"""
    db = get_db()
    comms = await db.communications.find({"contact_id": contact_id}, {"_id": 0}).sort("sent_at", -1).to_list(500)
    return comms


@marketing_v2_router.put("/contacts/{contact_id}/communications/{comm_id}")
async def update_communication_status(
    contact_id: str,
    comm_id: str,
    data: dict
):
    """Update communication status (opened, replied, etc.)"""
    db = get_db()
    
    # Verify communication exists
    comm = await db.communications.find_one({"id": comm_id, "contact_id": contact_id})
    if not comm:
        raise HTTPException(status_code=404, detail="Communication not found")
    
    # Update status fields
    update_fields = {}
    if "status" in data:
        update_fields["status"] = data["status"]
    if "opened" in data:
        update_fields["opened"] = data["opened"]
    if "replied" in data:
        update_fields["replied"] = data["replied"]
    if data.get("status") == "replied":
        update_fields["replied"] = True
        update_fields["replied_at"] = datetime.now(timezone.utc).isoformat()
    if data.get("status") == "opened":
        update_fields["opened"] = True
        update_fields["opened_at"] = datetime.now(timezone.utc).isoformat()
    
    if update_fields:
        await db.communications.update_one(
            {"id": comm_id},
            {"$set": update_fields}
        )
    
    updated = await db.communications.find_one({"id": comm_id}, {"_id": 0})
    return updated


@marketing_v2_router.post("/contacts/{contact_id}/follow-ups")
async def create_follow_up(
    contact_id: str,
    data: dict,
    user: dict = Depends(get_marketing_auth())
):
    """Schedule a follow-up reminder for a contact"""
    db = get_db()
    
    # Verify contact exists
    contact = await db.contacts.find_one({"id": contact_id})
    if not contact:
        raise HTTPException(status_code=404, detail="Contact not found")
    
    follow_up_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc).isoformat()
    
    follow_up_doc = {
        "id": follow_up_id,
        "contact_id": contact_id,
        "contact_name": contact.get("name"),
        "communication_id": data.get("communication_id"),
        "scheduled_date": data.get("scheduled_date"),
        "note": data.get("note", ""),
        "priority": data.get("priority", "medium"),
        "status": "pending",
        "created_by": user.get("id"),
        "created_at": now
    }
    
    await db.follow_ups.insert_one(follow_up_doc)
    del follow_up_doc["_id"]
    return follow_up_doc


@marketing_v2_router.get("/follow-ups")
async def get_all_follow_ups(
    status: Optional[str] = None,
    user: dict = Depends(get_marketing_auth())
):
    """Get all scheduled follow-ups"""
    db = get_db()
    
    query = {}
    if status:
        query["status"] = status
    
    follow_ups = await db.follow_ups.find(query, {"_id": 0}).sort("scheduled_date", 1).to_list(100)
    return follow_ups


@marketing_v2_router.post("/communications", response_model=CommunicationResponse)
async def create_communication(data: CommunicationCreate):
    """Log a new communication"""
    db = get_db()
    
    # Verify contact exists
    contact = await db.contacts.find_one({"id": data.contact_id})
    if not contact:
        raise HTTPException(status_code=404, detail="Contact not found")
    
    comm_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc).isoformat()
    
    comm_doc = {
        "id": comm_id,
        **data.model_dump(),
        "contact_name": contact.get("name"),
        "status": "sent",
        "sent_at": now,
        "opened": False,
        "replied": False,
    }
    
    await db.communications.insert_one(comm_doc)
    del comm_doc["_id"]
    return comm_doc

@marketing_v2_router.get("/outreach/all")
async def get_all_outreach(
    contact_type: Optional[str] = None,  # "influencer" or "journalist"
    status: Optional[str] = None,
    campaign_id: Optional[str] = None,
    limit: int = 100,
    user: dict = Depends(get_marketing_auth())
):
    """Get unified outreach view (both communications and PR pitches)"""
    db = get_db()
    
    outreach = []
    
    # Get communications (used for influencers)
    comm_query = {}
    if status:
        comm_query["status"] = status
    if campaign_id:
        comm_query["campaign_id"] = campaign_id
    
    comms = await db.communications.find(comm_query, {"_id": 0}).sort("sent_at", -1).limit(limit).to_list(limit)
    
    # Enrich with contact type
    for comm in comms:
        contact = await db.contacts.find_one({"id": comm.get("contact_id")})
        if contact:
            comm["contact_type"] = contact.get("contact_type", "influencer")
            comm["outreach_type"] = "communication"
            
            # Filter by contact_type if specified
            if not contact_type or comm["contact_type"] == contact_type:
                outreach.append(comm)
    
    # Get PR pitches (used for journalists)
    if not contact_type or contact_type == "journalist":
        pitch_query = {}
        if status:
            pitch_query["status"] = status
        if campaign_id:
            pitch_query["campaign_id"] = campaign_id
        
        pitches = await db.pr_pitches.find(pitch_query, {"_id": 0}).sort("sent_at", -1).limit(limit).to_list(limit)
        
        for pitch in pitches:
            pitch["contact_type"] = "journalist"
            pitch["outreach_type"] = "pitch"
            outreach.append(pitch)
    
    # Sort all by sent_at
    outreach.sort(key=lambda x: x.get("sent_at", ""), reverse=True)
    
    return outreach[:limit]

@marketing_v2_router.get("/outreach/stats")
async def get_outreach_stats(
    campaign_id: Optional[str] = None,
    user: dict = Depends(get_marketing_auth())
):
    """Get unified outreach statistics"""
    db = get_db()
    
    # Communication stats
    comm_query = {}
    if campaign_id:
        comm_query["campaign_id"] = campaign_id
    
    total_comms = await db.communications.count_documents(comm_query)
    sent_comms = await db.communications.count_documents({**comm_query, "status": "sent"})
    opened_comms = await db.communications.count_documents({**comm_query, "opened": True})
    replied_comms = await db.communications.count_documents({**comm_query, "replied": True})
    
    # PR pitch stats
    pitch_query = {}
    if campaign_id:
        pitch_query["campaign_id"] = campaign_id
    
    total_pitches = await db.pr_pitches.count_documents(pitch_query)
    sent_pitches = await db.pr_pitches.count_documents({**pitch_query, "status": "sent"})
    opened_pitches = await db.pr_pitches.count_documents({**pitch_query, "status": "opened"})
    replied_pitches = await db.pr_pitches.count_documents({**pitch_query, "status": "replied"})
    interested_pitches = await db.pr_pitches.count_documents({**pitch_query, "status": "interested"})
    
    return {
        "total_outreach": total_comms + total_pitches,
        "total_sent": sent_comms + sent_pitches,
        "total_opened": opened_comms + opened_pitches,
        "total_replied": replied_comms + replied_pitches,
        "influencer_outreach": {
            "total": total_comms,
            "sent": sent_comms,
            "opened": opened_comms,
            "replied": replied_comms,
            "response_rate": round(replied_comms / total_comms * 100, 1) if total_comms > 0 else 0
        },
        "journalist_outreach": {
            "total": total_pitches,
            "sent": sent_pitches,
            "opened": opened_pitches,
            "replied": replied_pitches,
            "interested": interested_pitches,
            "response_rate": round((replied_pitches + interested_pitches) / total_pitches * 100, 1) if total_pitches > 0 else 0
        }
    }

# ============== DEALS & CONTRACTS ==============

@marketing_v2_router.get("/contacts/{contact_id}/deals", response_model=List[DealResponse])
async def get_contact_deals(contact_id: str):
    """Get all deals for a contact"""
    db = get_db()
    deals = await db.deals.find({"contact_id": contact_id}, {"_id": 0}).sort("created_at", -1).to_list(100)
    return deals

@marketing_v2_router.post("/deals", response_model=DealResponse)
async def create_deal(data: DealCreate):
    """Create a new deal"""
    db = get_db()
    
    # Verify contact exists
    contact = await db.contacts.find_one({"id": data.contact_id})
    if not contact:
        raise HTTPException(status_code=404, detail="Contact not found")
    
    campaign_name = None
    if data.campaign_id:
        campaign = await db.campaigns.find_one({"id": data.campaign_id})
        campaign_name = campaign.get("name") if campaign else None
    
    deal_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc).isoformat()
    
    deal_doc = {
        "id": deal_id,
        **data.model_dump(),
        "contact_name": contact.get("name"),
        "campaign_name": campaign_name,
        "status": "pending",
        "timeline": [{"event": "deal_created", "date": now, "note": "Deal initiated"}],
        "created_at": now,
        "updated_at": now,
    }
    
    await db.deals.insert_one(deal_doc)
    
    # Update contact status
    await db.contacts.update_one({"id": data.contact_id}, {"$set": {"status": "negotiating"}})
    
    del deal_doc["_id"]
    return deal_doc

@marketing_v2_router.put("/deals/{deal_id}/status")
async def update_deal_status(deal_id: str, status: str, note: Optional[str] = None, amount: Optional[float] = None):
    """Update deal status - syncs contact status and campaign metrics"""
    db = get_db()
    
    deal = await db.deals.find_one({"id": deal_id})
    if not deal:
        raise HTTPException(status_code=404, detail="Deal not found")
    
    old_status = deal.get("status")
    now = datetime.now(timezone.utc).isoformat()
    timeline_entry = {"event": f"status_changed_to_{status}", "date": now}
    if note:
        timeline_entry["note"] = note
    if amount:
        timeline_entry["amount"] = amount
    
    update_data = {
        "status": status,
        "updated_at": now,
    }
    
    if status == "agreed" and amount:
        update_data["final_amount"] = amount
    
    await db.deals.update_one(
        {"id": deal_id},
        {
            "$set": update_data,
            "$push": {"timeline": timeline_entry}
        }
    )
    
    # SYNC: Update contact status based on deal status
    contact_status_map = {
        "proposed": "interested",
        "negotiating": "negotiation",
        "agreed": "confirmed",
        "rejected": "identified",
        "signed": "confirmed",
        "completed": "completed",
    }
    if status in contact_status_map:
        await db.contacts.update_one(
            {"id": deal["contact_id"]},
            {"$set": {"status": contact_status_map[status]}}
        )
    
    # SYNC: Update campaign confirmed count when deal is signed/agreed
    campaign_id = deal.get("campaign_id")
    if campaign_id:
        if status in ["agreed", "signed"] and old_status not in ["agreed", "signed"]:
            # Deal just got confirmed - increment confirmed count
            await db.campaigns.update_one(
                {"id": campaign_id},
                {"$inc": {"confirmed_count": 1}}
            )
            
            # Send notification about influencer confirmation
            campaign = await db.campaigns.find_one({"id": campaign_id}, {"name": 1, "created_by": 1})
            contact = await db.contacts.find_one({"id": deal["contact_id"]}, {"name": 1})
            if campaign and campaign.get("created_by"):
                try:
                    from routes.notifications import (
                        create_notification, NotificationType, NotificationCategory, NotificationPriority
                    )
                    await create_notification(
                        user_id=campaign["created_by"],
                        notification_type=NotificationType.INFLUENCER_CONFIRMED,
                        category=NotificationCategory.MARKETING,
                        title="Influencer Confirmed",
                        message=f"{contact.get('name', 'Influencer')} confirmed for '{campaign.get('name')}'",
                        priority=NotificationPriority.MEDIUM,
                        entity_type="deal",
                        entity_id=deal_id,
                        action_url=f"/marketing/campaigns/{campaign_id}",
                        metadata={"influencer_name": contact.get("name") if contact else None}
                    )
                except Exception as e:
                    logger.error(f"Failed to send influencer confirmation notification: {e}")
        elif old_status in ["agreed", "signed"] and status not in ["agreed", "signed"]:
            # Deal was confirmed but now changed - decrement
            await db.campaigns.update_one(
                {"id": campaign_id},
                {"$inc": {"confirmed_count": -1}}
            )
    
    # PULSE INTEGRATION: Auto-post when deal is completed/signed
    if status in ["completed", "signed"] and old_status not in ["completed", "signed"]:
        try:
            await on_deal_closed(
                deal=deal,
                sales_rep=None,  # No user context in this endpoint
                amount=deal.get("final_amount") or deal.get("value") or amount
            )
        except Exception as e:
            print(f"Pulse integration error (deal_closed): {e}")
    
    return {"message": f"Deal status updated to {status}", "contact_synced": True}

# ============== CONTRACTS ==============

@marketing_v2_router.get("/deals/{deal_id}/contracts", response_model=List[ContractResponse])
async def get_deal_contracts(deal_id: str):
    """Get contracts for a deal"""
    db = get_db()
    contracts = await db.contracts.find({"deal_id": deal_id}, {"_id": 0}).to_list(50)
    return contracts

@marketing_v2_router.post("/contracts", response_model=ContractResponse)
async def create_contract(data: ContractCreate):
    """Create a new contract"""
    db = get_db()
    
    deal = await db.deals.find_one({"id": data.deal_id})
    if not deal:
        raise HTTPException(status_code=404, detail="Deal not found")
    
    contact = await db.contacts.find_one({"id": data.contact_id})
    
    contract_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc).isoformat()
    
    contract_doc = {
        "id": contract_id,
        **data.model_dump(),
        "contact_name": contact.get("name") if contact else None,
        "status": "draft",
        "created_at": now,
    }
    
    await db.contracts.insert_one(contract_doc)
    del contract_doc["_id"]
    return contract_doc

# ============== PAYMENTS ==============

@marketing_v2_router.get("/contacts/{contact_id}/payments", response_model=List[PaymentResponse])
async def get_contact_payments(contact_id: str):
    """Get all payments for a contact"""
    db = get_db()
    payments = await db.payments.find({"contact_id": contact_id}, {"_id": 0}).sort("created_at", -1).to_list(100)
    
    # Enrich with campaign names
    for payment in payments:
        if payment.get("campaign_id"):
            campaign = await db.campaigns.find_one({"id": payment["campaign_id"]})
            if not campaign:
                campaign = await db.pr_campaigns.find_one({"id": payment["campaign_id"]})
            payment["campaign_name"] = campaign.get("name") if campaign else None
    
    return payments

@marketing_v2_router.get("/campaigns/{campaign_id}/payments", response_model=List[PaymentResponse])
async def get_campaign_payments(campaign_id: str):
    """Get all payments for a campaign"""
    db = get_db()
    payments = await db.payments.find({"campaign_id": campaign_id}, {"_id": 0}).sort("created_at", -1).to_list(100)
    return payments

@marketing_v2_router.post("/payments", response_model=PaymentResponse)
async def create_payment(data: PaymentCreate):
    """Create a new payment record - linked to campaign budget"""
    db = get_db()
    
    contact = await db.contacts.find_one({"id": data.contact_id})
    if not contact:
        raise HTTPException(status_code=404, detail="Contact not found")
    
    # Get campaign name if campaign_id provided
    campaign_name = None
    if data.campaign_id:
        campaign = await db.campaigns.find_one({"id": data.campaign_id})
        if not campaign:
            campaign = await db.pr_campaigns.find_one({"id": data.campaign_id})
        if campaign:
            campaign_name = campaign.get("name")
    
    payment_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc).isoformat()
    
    # Generate invoice number if not provided
    invoice_number = data.invoice_number
    if not invoice_number:
        count = await db.payments.count_documents({})
        invoice_number = f"INV-{datetime.now().strftime('%Y%m')}-{count + 1:04d}"
    
    payment_doc = {
        "id": payment_id,
        **data.model_dump(),
        "invoice_number": invoice_number,
        "contact_name": contact.get("name"),
        "campaign_name": campaign_name,
        "status": "pending",
        "created_at": now,
    }
    
    await db.payments.insert_one(payment_doc)
    del payment_doc["_id"]
    return payment_doc

@marketing_v2_router.put("/payments/{payment_id}/status")
async def update_payment_status(payment_id: str, status: str):
    """Update payment status - auto-syncs campaign budget when paid"""
    db = get_db()
    
    # Get the payment first
    payment = await db.payments.find_one({"id": payment_id})
    if not payment:
        raise HTTPException(status_code=404, detail="Payment not found")
    
    old_status = payment.get("status")
    
    update_data = {"status": status}
    if status == "paid":
        update_data["paid_at"] = datetime.now(timezone.utc).isoformat()
    
    await db.payments.update_one({"id": payment_id}, {"$set": update_data})
    
    # SYNC: Update campaign spent when payment status changes
    campaign_id = payment.get("campaign_id")
    amount = payment.get("amount", 0)
    
    if campaign_id and amount > 0:
        # Determine which collection the campaign is in
        campaign = await db.campaigns.find_one({"id": campaign_id})
        collection = db.campaigns if campaign else db.pr_campaigns
        
        if status == "paid" and old_status != "paid":
            # Payment just marked as paid - increment spent
            await collection.update_one(
                {"id": campaign_id},
                {"$inc": {"spent": amount}}
            )
        elif old_status == "paid" and status != "paid":
            # Payment was paid but now changed to something else - decrement spent
            await collection.update_one(
                {"id": campaign_id},
                {"$inc": {"spent": -amount}}
            )
    
    return {"message": f"Payment status updated to {status}", "campaign_synced": bool(campaign_id)}

@marketing_v2_router.put("/payments/{payment_id}")
async def update_payment(payment_id: str, amount: float = None, description: str = None, 
                         payment_type: str = None, payment_method: str = None, due_date: str = None):
    """Update payment details"""
    db = get_db()
    
    payment = await db.payments.find_one({"id": payment_id})
    if not payment:
        raise HTTPException(status_code=404, detail="Payment not found")
    
    update_data = {"updated_at": datetime.now(timezone.utc).isoformat()}
    if amount is not None:
        update_data["amount"] = amount
    if description is not None:
        update_data["description"] = description
    if payment_type is not None:
        update_data["payment_type"] = payment_type
    if payment_method is not None:
        update_data["payment_method"] = payment_method
    if due_date is not None:
        update_data["due_date"] = due_date
    
    await db.payments.update_one({"id": payment_id}, {"$set": update_data})
    return {"message": "Payment updated", "id": payment_id}

@marketing_v2_router.delete("/payments/{payment_id}")
async def delete_payment(payment_id: str):
    """Delete a payment - also adjusts campaign spent if payment was paid"""
    db = get_db()
    
    payment = await db.payments.find_one({"id": payment_id})
    if not payment:
        raise HTTPException(status_code=404, detail="Payment not found")
    
    # If payment was paid, we need to decrement campaign spent
    if payment.get("status") == "paid":
        campaign_id = payment.get("campaign_id")
        amount = payment.get("amount", 0)
        if campaign_id and amount > 0:
            campaign = await db.campaigns.find_one({"id": campaign_id})
            collection = db.campaigns if campaign else db.pr_campaigns
            await collection.update_one(
                {"id": campaign_id},
                {"$inc": {"spent": -amount}}
            )
    
    await db.payments.delete_one({"id": payment_id})
    return {"message": "Payment deleted", "id": payment_id}

# ============== UGC (User Generated Content) ==============

@marketing_v2_router.get("/ugc", response_model=List[UGCResponse])
async def get_all_ugc(
    contact_id: Optional[str] = None,
    campaign_id: Optional[str] = None,
    status: Optional[str] = None,
    content_type: Optional[str] = None,
    limit: int = 100,
):
    """Get all UGC with filters"""
    db = get_db()
    query = {}
    if contact_id:
        query["contact_id"] = contact_id
    if campaign_id:
        query["campaign_id"] = campaign_id
    if status:
        query["status"] = status
    if content_type:
        query["content_type"] = content_type
    
    ugc = await db.ugc.find(query, {"_id": 0}).sort("created_at", -1).limit(limit).to_list(limit)
    return ugc

@marketing_v2_router.post("/ugc", response_model=UGCResponse)
async def create_ugc(data: UGCCreate):
    """Create a new UGC entry"""
    db = get_db()
    
    contact = await db.contacts.find_one({"id": data.contact_id})
    if not contact:
        raise HTTPException(status_code=404, detail="Contact not found")
    
    ugc_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc).isoformat()
    
    ugc_doc = {
        "id": ugc_id,
        **data.model_dump(),
        "contact_name": contact.get("name"),
        "status": "draft",
        "metrics": {},
        "created_at": now,
    }
    
    await db.ugc.insert_one(ugc_doc)
    del ugc_doc["_id"]
    return ugc_doc


# ============== UNIFIED DELIVERABLES (UGC + PR Coverage) ==============

@marketing_v2_router.get("/unified-deliverables")
async def get_unified_deliverables(
    campaign_id: Optional[str] = None,
    deliverable_type: Optional[str] = None,  # "ugc" or "coverage"
    status: Optional[str] = None,
    limit: int = 100,
    user: dict = Depends(get_marketing_auth())
):
    """Get all deliverables (UGC + PR Coverage) in a unified view"""
    db = get_db()
    
    deliverables = []
    
    # Fetch UGC (Influencer content)
    if not deliverable_type or deliverable_type == "ugc":
        ugc_query = {}
        if campaign_id:
            ugc_query["campaign_id"] = campaign_id
        if status:
            ugc_query["status"] = status
        
        ugc_items = await db.ugc.find(ugc_query, {"_id": 0}).sort("created_at", -1).limit(limit).to_list(limit)
        for item in ugc_items:
            item["deliverable_type"] = "ugc"
            item["deliverable_category"] = "influencer_content"
            deliverables.append(item)
    
    # Fetch PR Coverage
    if not deliverable_type or deliverable_type == "coverage":
        coverage_query = {}
        if campaign_id:
            coverage_query["campaign_id"] = campaign_id
        if status:
            coverage_query["status"] = status
        
        coverage_items = await db.media_coverage.find(coverage_query, {"_id": 0}).sort("created_at", -1).limit(limit).to_list(limit)
        for item in coverage_items:
            item["deliverable_type"] = "coverage"
            item["deliverable_category"] = "pr_coverage"
            deliverables.append(item)
    
    # Sort by created_at descending
    deliverables.sort(key=lambda x: x.get("created_at", ""), reverse=True)
    
    return deliverables[:limit]

@marketing_v2_router.get("/unified-deliverables/stats")
async def get_deliverables_stats(
    campaign_id: Optional[str] = None,
    user: dict = Depends(get_marketing_auth())
):
    """Get deliverables statistics"""
    db = get_db()
    
    ugc_query = {} if not campaign_id else {"campaign_id": campaign_id}
    coverage_query = {} if not campaign_id else {"campaign_id": campaign_id}
    
    # UGC stats
    total_ugc = await db.ugc.count_documents(ugc_query)
    ugc_approved = await db.ugc.count_documents({**ugc_query, "status": "approved"})
    ugc_published = await db.ugc.count_documents({**ugc_query, "status": "published"})
    ugc_pending = await db.ugc.count_documents({**ugc_query, "status": "pending_approval"})
    
    # Coverage stats
    total_coverage = await db.media_coverage.count_documents(coverage_query)
    coverage_published = await db.media_coverage.count_documents({**coverage_query, "status": "published"})
    coverage_pending = await db.media_coverage.count_documents({**coverage_query, "status": "pending"})
    
    # Calculate estimated media value from coverage
    coverage_items = await db.media_coverage.find(coverage_query, {"_id": 0, "estimated_media_value": 1}).to_list(10000)
    total_media_value = sum(c.get("estimated_media_value", 0) for c in coverage_items)
    
    return {
        "total_deliverables": total_ugc + total_coverage,
        "ugc": {
            "total": total_ugc,
            "approved": ugc_approved,
            "published": ugc_published,
            "pending": ugc_pending
        },
        "coverage": {
            "total": total_coverage,
            "published": coverage_published,
            "pending": coverage_pending,
            "estimated_media_value": total_media_value
        }
    }


# ============== DIGITAL PR - PRESS RELEASES ==============

@marketing_v2_router.get("/pr/releases", response_model=List[PressReleaseResponse])
async def get_press_releases(status: Optional[str] = None, limit: int = 50):
    """Get all press releases"""
    db = get_db()
    query = {}
    if status:
        query["status"] = status
    
    releases = await db.press_releases.find(query, {"_id": 0}).sort("created_at", -1).limit(limit).to_list(limit)
    return releases

@marketing_v2_router.post("/pr/releases", response_model=PressReleaseResponse)
async def create_press_release(data: PressReleaseCreate):
    """Create a new press release"""
    db = get_db()
    
    release_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc).isoformat()
    
    release_doc = {
        "id": release_id,
        **data.model_dump(),
        "status": "draft",
        "distributed_to": [],
        "coverage_count": 0,
        "created_at": now,
    }
    
    await db.press_releases.insert_one(release_doc)
    del release_doc["_id"]
    return release_doc

@marketing_v2_router.put("/pr/releases/{release_id}")
async def update_press_release(release_id: str, data: PressReleaseCreate):
    """Update a press release"""
    db = get_db()
    
    result = await db.press_releases.update_one(
        {"id": release_id},
        {"$set": data.model_dump()}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Press release not found")
    
    return {"message": "Press release updated"}

# ============== DIGITAL PR - MEDIA COVERAGE ==============

@marketing_v2_router.get("/pr/coverage", response_model=List[MediaCoverageResponse])
async def get_media_coverage(
    campaign_id: Optional[str] = None,
    sentiment: Optional[str] = None,
    limit: int = 100,
):
    """Get all media coverage"""
    db = get_db()
    query = {}
    if campaign_id:
        query["campaign_id"] = campaign_id
    if sentiment:
        query["sentiment"] = sentiment
    
    coverage = await db.media_coverage.find(query, {"_id": 0}).sort("published_date", -1).limit(limit).to_list(limit)
    return coverage

@marketing_v2_router.post("/pr/coverage", response_model=MediaCoverageResponse)
async def create_media_coverage(data: MediaCoverageCreate):
    """Record new media coverage"""
    db = get_db()
    
    contact_name = None
    if data.contact_id:
        contact = await db.contacts.find_one({"id": data.contact_id})
        contact_name = contact.get("name") if contact else None
    
    coverage_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc).isoformat()
    
    coverage_doc = {
        "id": coverage_id,
        **data.model_dump(),
        "contact_name": contact_name,
        "created_at": now,
    }
    
    await db.media_coverage.insert_one(coverage_doc)
    
    # Update press release coverage count if linked
    if data.press_release_id:
        await db.press_releases.update_one(
            {"id": data.press_release_id},
            {"$inc": {"coverage_count": 1}}
        )
    
    del coverage_doc["_id"]
    return coverage_doc

# ============== DIGITAL PR - PITCHES ==============

@marketing_v2_router.get("/pr/pitches", response_model=List[PRPitchResponse])
async def get_pr_pitches(status: Optional[str] = None, limit: int = 100):
    """Get all PR pitches"""
    db = get_db()
    query = {}
    if status:
        query["status"] = status
    
    pitches = await db.pr_pitches.find(query, {"_id": 0}).sort("created_at", -1).limit(limit).to_list(limit)
    return pitches

@marketing_v2_router.post("/pr/pitches", response_model=PRPitchResponse)
async def create_pr_pitch(data: PRPitchCreate):
    """Create a new PR pitch"""
    db = get_db()
    
    contact = await db.contacts.find_one({"id": data.contact_id})
    if not contact:
        raise HTTPException(status_code=404, detail="Contact not found")
    
    pitch_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc).isoformat()
    
    pitch_doc = {
        "id": pitch_id,
        **data.model_dump(),
        "contact_name": contact.get("name"),
        "publication": contact.get("publication"),
        "status": "draft",
        "created_at": now,
    }
    
    await db.pr_pitches.insert_one(pitch_doc)
    del pitch_doc["_id"]
    return pitch_doc

# ============== EVENTS ==============

@marketing_v2_router.get("/events", response_model=List[EventResponse])
async def get_events(
    event_type: Optional[str] = None,
    status: Optional[str] = None,
    limit: int = 50,
):
    """Get all events"""
    db = get_db()
    query = {}
    if event_type:
        query["event_type"] = event_type
    if status:
        query["status"] = status
    
    events = await db.events.find(query, {"_id": 0}).sort("start_date", -1).limit(limit).to_list(limit)
    return events

@marketing_v2_router.get("/events/{event_id}", response_model=EventResponse)
async def get_event(event_id: str):
    """Get single event"""
    db = get_db()
    event = await db.events.find_one({"id": event_id}, {"_id": 0})
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")
    return event

@marketing_v2_router.post("/events", response_model=EventResponse)
async def create_event(data: EventCreate):
    """Create a new event"""
    db = get_db()
    
    campaign_name = None
    if data.campaign_id:
        campaign = await db.campaigns.find_one({"id": data.campaign_id})
        campaign_name = campaign.get("name") if campaign else None
    
    event_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc).isoformat()
    
    event_doc = {
        "id": event_id,
        **data.model_dump(),
        "campaign_name": campaign_name,
        "status": "planning",
        "spent": 0.0,
        "confirmed_attendees": 0,
        "attendees": [],
        "created_at": now,
    }
    
    await db.events.insert_one(event_doc)
    del event_doc["_id"]
    return event_doc

@marketing_v2_router.post("/events/{event_id}/attendees")
async def add_event_attendee(event_id: str, data: EventAttendeeCreate):
    """Add attendee to event"""
    db = get_db()
    
    event = await db.events.find_one({"id": event_id})
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")
    
    contact = await db.contacts.find_one({"id": data.contact_id})
    if not contact:
        raise HTTPException(status_code=404, detail="Contact not found")
    
    attendee_entry = {
        "contact_id": data.contact_id,
        "contact_name": contact.get("name"),
        "rsvp_status": data.rsvp_status,
        "notes": data.notes,
        "added_at": datetime.now(timezone.utc).isoformat(),
    }
    
    # Update confirmed count if status is confirmed
    update_ops = {"$push": {"attendees": attendee_entry}}
    if data.rsvp_status == "confirmed":
        update_ops["$inc"] = {"confirmed_attendees": 1}
    
    await db.events.update_one({"id": event_id}, update_ops)
    
    return {"message": "Attendee added successfully"}

# ============== CONTENT & ASSETS ==============

@marketing_v2_router.get("/assets", response_model=List[AssetResponse])
async def get_assets(
    category: Optional[str] = None,
    asset_type: Optional[str] = None,
    search: Optional[str] = None,
    limit: int = 100,
):
    """Get all assets"""
    db = get_db()
    query = {}
    if category:
        query["category"] = category
    if asset_type:
        query["asset_type"] = asset_type
    if search:
        query["$or"] = [
            {"name": {"$regex": search, "$options": "i"}},
            {"tags": {"$in": [search]}},
        ]
    
    assets = await db.assets.find(query, {"_id": 0}).sort("created_at", -1).limit(limit).to_list(limit)
    return assets

@marketing_v2_router.post("/assets", response_model=AssetResponse)
async def create_asset(data: AssetCreate):
    """Upload a new asset"""
    db = get_db()
    
    asset_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc).isoformat()
    
    asset_doc = {
        "id": asset_id,
        **data.model_dump(),
        "downloads": 0,
        "created_at": now,
        "updated_at": now,
    }
    
    await db.assets.insert_one(asset_doc)
    del asset_doc["_id"]
    return asset_doc

@marketing_v2_router.put("/assets/{asset_id}/download")
async def track_asset_download(asset_id: str):
    """Track asset download"""
    db = get_db()
    await db.assets.update_one({"id": asset_id}, {"$inc": {"downloads": 1}})
    return {"message": "Download tracked"}

@marketing_v2_router.put("/assets/{asset_id}")
async def update_asset(asset_id: str, name: str = None, description: str = None, 
                       tags: List[str] = None, campaign_id: str = None):
    """Update asset details"""
    db = get_db()
    
    asset = await db.assets.find_one({"id": asset_id})
    if not asset:
        raise HTTPException(status_code=404, detail="Asset not found")
    
    update_data = {"updated_at": datetime.now(timezone.utc).isoformat()}
    if name is not None:
        update_data["name"] = name
    if description is not None:
        update_data["description"] = description
    if tags is not None:
        update_data["tags"] = tags
    if campaign_id is not None:
        update_data["campaign_id"] = campaign_id
    
    await db.assets.update_one({"id": asset_id}, {"$set": update_data})
    updated = await db.assets.find_one({"id": asset_id}, {"_id": 0})
    return updated

@marketing_v2_router.post("/assets/{asset_id}/version")
async def create_asset_version(asset_id: str, file_url: str, description: str = None):
    """Create a new version of an asset"""
    db = get_db()
    
    parent_asset = await db.assets.find_one({"id": asset_id})
    if not parent_asset:
        raise HTTPException(status_code=404, detail="Asset not found")
    
    # Get current max version
    current_version = parent_asset.get("version", 1)
    new_version = current_version + 1
    
    now = datetime.now(timezone.utc).isoformat()
    new_asset_id = str(uuid.uuid4())
    
    # Create new version
    new_asset_doc = {
        "id": new_asset_id,
        "name": parent_asset["name"],
        "asset_type": parent_asset["asset_type"],
        "category": parent_asset["category"],
        "description": description or parent_asset.get("description"),
        "file_url": file_url,
        "tags": parent_asset.get("tags", []),
        "campaign_id": parent_asset.get("campaign_id"),
        "version": new_version,
        "parent_asset_id": asset_id,
        "downloads": 0,
        "created_at": now,
        "updated_at": now,
    }
    
    await db.assets.insert_one(new_asset_doc)
    
    # Update parent to point to latest version
    await db.assets.update_one(
        {"id": asset_id},
        {"$set": {"latest_version_id": new_asset_id, "version": new_version, "updated_at": now}}
    )
    
    del new_asset_doc["_id"]
    return new_asset_doc

@marketing_v2_router.get("/assets/{asset_id}/versions")
async def get_asset_versions(asset_id: str):
    """Get all versions of an asset"""
    db = get_db()
    
    # Get the original asset and all versions
    versions = await db.assets.find(
        {"$or": [{"id": asset_id}, {"parent_asset_id": asset_id}]},
        {"_id": 0}
    ).sort("version", -1).to_list(100)
    
    return versions

@marketing_v2_router.delete("/assets/{asset_id}")
async def delete_asset(asset_id: str):
    """Delete an asset"""
    db = get_db()
    result = await db.assets.delete_one({"id": asset_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Asset not found")
    return {"message": "Asset deleted", "id": asset_id}

# ============== TEMPLATES ==============

@marketing_v2_router.get("/templates")
async def get_templates(template_type: str = None, search: str = None, limit: int = 100):
    """Get all templates"""
    db = get_db()
    query = {}
    if template_type:
        query["template_type"] = template_type
    if search:
        query["$or"] = [
            {"name": {"$regex": search, "$options": "i"}},
            {"tags": {"$in": [search]}},
        ]
    
    templates = await db.templates.find(query, {"_id": 0}).sort("created_at", -1).limit(limit).to_list(limit)
    return templates

@marketing_v2_router.post("/templates")
async def create_template(data: dict = Body(...)):
    """Create a new template"""
    db = get_db()
    
    template_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc).isoformat()
    
    template_doc = {
        "id": template_id,
        "name": data.get("name"),
        "template_type": data.get("template_type", "email"),
        "subject": data.get("subject"),
        "content": data.get("content", ""),
        "variables": data.get("variables", []),
        "category": data.get("category"),
        "tags": data.get("tags", []),
        "usage_count": 0,
        "created_at": now,
        "updated_at": now,
    }
    
    await db.templates.insert_one(template_doc)
    del template_doc["_id"]
    return template_doc

@marketing_v2_router.get("/templates/{template_id}")
async def get_template(template_id: str):
    """Get a single template"""
    db = get_db()
    template = await db.templates.find_one({"id": template_id}, {"_id": 0})
    if not template:
        raise HTTPException(status_code=404, detail="Template not found")
    return template

@marketing_v2_router.put("/templates/{template_id}")
async def update_template(template_id: str, data: dict = Body(...)):
    """Update a template"""
    db = get_db()
    
    template = await db.templates.find_one({"id": template_id})
    if not template:
        raise HTTPException(status_code=404, detail="Template not found")
    
    update_data = {"updated_at": datetime.now(timezone.utc).isoformat()}
    for field in ["name", "subject", "content", "variables", "category", "tags"]:
        if field in data:
            update_data[field] = data[field]
    
    await db.templates.update_one({"id": template_id}, {"$set": update_data})
    updated = await db.templates.find_one({"id": template_id}, {"_id": 0})
    return updated

@marketing_v2_router.delete("/templates/{template_id}")
async def delete_template(template_id: str):
    """Delete a template"""
    db = get_db()
    result = await db.templates.delete_one({"id": template_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Template not found")
    return {"message": "Template deleted", "id": template_id}

@marketing_v2_router.put("/templates/{template_id}/use")
async def track_template_usage(template_id: str):
    """Track template usage"""
    db = get_db()
    await db.templates.update_one({"id": template_id}, {"$inc": {"usage_count": 1}})
    return {"message": "Usage tracked"}

# ============== INFLUENCER DELIVERIES ==============

@marketing_v2_router.get("/deliveries/influencer")
async def get_influencer_deliveries(
    contact_id: str = None,
    campaign_id: str = None,
    platform: str = None,
    content_type: str = None,
    search: str = None,
    limit: int = 100
):
    """Get all influencer deliveries"""
    db = get_db()
    query = {}
    if contact_id:
        query["contact_id"] = contact_id
    if campaign_id:
        query["campaign_id"] = campaign_id
    if platform:
        query["platform"] = platform
    if content_type:
        query["content_type"] = content_type
    if search:
        query["$or"] = [
            {"title": {"$regex": search, "$options": "i"}},
            {"contact_name": {"$regex": search, "$options": "i"}},
        ]
    
    deliveries = await db.influencer_deliveries.find(query, {"_id": 0}).sort("publish_date", -1).limit(limit).to_list(limit)
    
    # Enrich with contact and campaign names
    for delivery in deliveries:
        if delivery.get("contact_id"):
            contact = await db.contacts.find_one({"id": delivery["contact_id"]}, {"name": 1})
            delivery["contact_name"] = contact.get("name") if contact else "Unknown"
        if delivery.get("campaign_id"):
            # Check both marketing_campaigns and campaigns collections
            campaign = await db.marketing_campaigns.find_one({"id": delivery["campaign_id"]}, {"name": 1})
            if not campaign:
                campaign = await db.campaigns.find_one({"id": delivery["campaign_id"]}, {"name": 1})
            delivery["campaign_name"] = campaign.get("name") if campaign else None
        
        # Calculate engagement rate
        total_engagement = delivery.get("likes", 0) + delivery.get("comments", 0) + delivery.get("shares", 0) + delivery.get("saves", 0)
        reach = delivery.get("reach", 0) or delivery.get("views", 0) or 1
        delivery["engagement_rate"] = round((total_engagement / reach) * 100, 2) if reach > 0 else 0
    
    return deliveries

@marketing_v2_router.post("/deliveries/influencer")
async def create_influencer_delivery(data: dict = Body(...)):
    """Create a new influencer delivery"""
    db = get_db()
    
    delivery_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc).isoformat()
    
    # Get contact name
    contact_name = None
    if data.get("contact_id"):
        contact = await db.contacts.find_one({"id": data["contact_id"]}, {"name": 1})
        contact_name = contact.get("name") if contact else None
    
    delivery_doc = {
        "id": delivery_id,
        "contact_id": data.get("contact_id"),
        "contact_name": contact_name,
        "campaign_id": data.get("campaign_id"),
        "deliverable_id": data.get("deliverable_id"),  # Links to rate card
        "deliverable_name": data.get("deliverable_name"),  # Name of the rate card
        "rate_amount": data.get("rate_amount", 0),  # Cost from rate card
        "platform": data.get("platform", "instagram"),
        "content_type": data.get("content_type", "post"),
        "content_url": data.get("content_url"),
        "title": data.get("title"),
        "description": data.get("description"),
        "publish_date": data.get("publish_date"),
        "views": data.get("views", 0),
        "likes": data.get("likes", 0),
        "comments": data.get("comments", 0),
        "shares": data.get("shares", 0),
        "saves": data.get("saves", 0),
        "reach": data.get("reach", 0),
        "impressions": data.get("impressions", 0),
        "created_at": now,
        "updated_at": now,
    }
    
    await db.influencer_deliveries.insert_one(delivery_doc)
    del delivery_doc["_id"]
    return delivery_doc

@marketing_v2_router.put("/deliveries/influencer/{delivery_id}")
async def update_influencer_delivery(delivery_id: str, data: dict = Body(...)):
    """Update an influencer delivery (mainly for updating metrics)"""
    db = get_db()
    
    delivery = await db.influencer_deliveries.find_one({"id": delivery_id})
    if not delivery:
        raise HTTPException(status_code=404, detail="Delivery not found")
    
    update_data = {"updated_at": datetime.now(timezone.utc).isoformat()}
    for field in ["views", "likes", "comments", "shares", "saves", "reach", "impressions", "title", "description", "content_url"]:
        if field in data:
            update_data[field] = data[field]
    
    await db.influencer_deliveries.update_one({"id": delivery_id}, {"$set": update_data})
    updated = await db.influencer_deliveries.find_one({"id": delivery_id}, {"_id": 0})
    return updated

@marketing_v2_router.delete("/deliveries/influencer/{delivery_id}")
async def delete_influencer_delivery(delivery_id: str):
    """Delete an influencer delivery"""
    db = get_db()
    result = await db.influencer_deliveries.delete_one({"id": delivery_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Delivery not found")
    return {"message": "Delivery deleted", "id": delivery_id}

# ============== DELIVERIES STATS ==============

@marketing_v2_router.get("/deliveries/stats")
async def get_deliveries_stats(campaign_id: str = None):
    """Get delivery statistics"""
    db = get_db()
    
    # Influencer deliveries stats
    inf_query = {"campaign_id": campaign_id} if campaign_id else {}
    inf_deliveries = await db.influencer_deliveries.find(inf_query, {"_id": 0}).to_list(10000)
    
    total_inf_deliveries = len(inf_deliveries)
    total_views = sum(d.get("views", 0) for d in inf_deliveries)
    total_engagement = sum(d.get("likes", 0) + d.get("comments", 0) + d.get("shares", 0) + d.get("saves", 0) for d in inf_deliveries)
    total_reach = sum(d.get("reach", 0) for d in inf_deliveries)
    
    # PR coverage stats
    coverage_query = {"campaign_id": campaign_id} if campaign_id else {}
    coverages = await db.media_coverage.find(coverage_query, {"_id": 0}).to_list(10000)
    total_coverage = len(coverages)
    total_coverage_reach = sum(c.get("estimated_reach", 0) for c in coverages)
    
    return {
        "influencer_deliveries": {
            "total": total_inf_deliveries,
            "total_views": total_views,
            "total_engagement": total_engagement,
            "total_reach": total_reach,
            "avg_engagement_rate": round((total_engagement / total_reach * 100), 2) if total_reach > 0 else 0
        },
        "pr_coverage": {
            "total": total_coverage,
            "total_reach": total_coverage_reach
        }
    }

# ============== APPROVAL WORKFLOW ==============

@marketing_v2_router.get("/approvals", response_model=List[ApprovalResponse])
async def get_approvals(status: Optional[str] = None, limit: int = 50):
    """Get all pending approvals"""
    db = get_db()
    query = {}
    if status:
        query["status"] = status
    else:
        query["status"] = "pending"  # Default to pending
    
    approvals = await db.approvals.find(query, {"_id": 0}).sort("submitted_at", -1).limit(limit).to_list(limit)
    return approvals

@marketing_v2_router.post("/approvals", response_model=ApprovalResponse)
async def submit_for_approval(data: ApprovalCreate):
    """Submit item for approval"""
    db = get_db()
    
    approval_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc).isoformat()
    
    # Get item title based on type
    item_title = None
    if data.item_type == "ugc":
        item = await db.ugc.find_one({"id": data.item_id})
        item_title = item.get("title") if item else None
    elif data.item_type == "press_release":
        item = await db.press_releases.find_one({"id": data.item_id})
        item_title = item.get("title") if item else None
    
    approval_doc = {
        "id": approval_id,
        **data.model_dump(),
        "item_title": item_title,
        "status": "pending",
        "submitted_at": now,
    }
    
    await db.approvals.insert_one(approval_doc)
    del approval_doc["_id"]
    return approval_doc

@marketing_v2_router.put("/approvals/{approval_id}/review")
async def review_approval(approval_id: str, status: str, reviewed_by: str, notes: Optional[str] = None):
    """Review and approve/reject"""
    db = get_db()
    
    now = datetime.now(timezone.utc).isoformat()
    
    update_data = {
        "status": status,
        "reviewed_by": reviewed_by,
        "review_notes": notes,
        "reviewed_at": now,
    }
    
    result = await db.approvals.update_one({"id": approval_id}, {"$set": update_data})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Approval not found")
    
    # Update the original item status
    approval = await db.approvals.find_one({"id": approval_id})
    if approval:
        item_status = "approved" if status == "approved" else "rejected"
        collection_map = {
            "ugc": db.ugc,
            "press_release": db.press_releases,
        }
        if approval["item_type"] in collection_map:
            await collection_map[approval["item_type"]].update_one(
                {"id": approval["item_id"]},
                {"$set": {"status": item_status}}
            )
        
        # Send notification to the person who submitted the approval
        submitter_id = approval.get("submitted_by")
        if submitter_id:
            try:
                from routes.notifications import (
                    create_notification, NotificationType, NotificationCategory, NotificationPriority
                )
                
                notification_type = NotificationType.APPROVAL_GRANTED if status == "approved" else NotificationType.APPROVAL_REJECTED
                reviewer = await db.users.find_one({"id": reviewed_by}, {"name": 1})
                reviewer_name = reviewer.get("name", "A reviewer") if reviewer else "A reviewer"
                
                await create_notification(
                    user_id=submitter_id,
                    notification_type=notification_type,
                    category=NotificationCategory.APPROVAL,
                    title=f"Approval {status.title()}",
                    message=f"Your {approval['item_type']} has been {status} by {reviewer_name}",
                    priority=NotificationPriority.HIGH,
                    entity_type=approval["item_type"],
                    entity_id=approval["item_id"],
                    action_url=f"/marketing/{approval['item_type']}s/{approval['item_id']}",
                    metadata={"reviewer": reviewer_name, "notes": notes}
                )
            except Exception as e:
                logger.error(f"Failed to send approval notification: {e}")
    
    return {"message": f"Approval {status}"}

# ============== MARKETING CALENDAR ==============

@marketing_v2_router.get("/calendar", response_model=List[CalendarItemResponse])
async def get_calendar_items(
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    item_type: Optional[str] = None,
):
    """Get calendar items"""
    db = get_db()
    query = {}
    
    if item_type:
        query["item_type"] = item_type
    
    if start_date:
        query["start_date"] = {"$gte": start_date}
    if end_date:
        if "start_date" in query:
            query["start_date"]["$lte"] = end_date
        else:
            query["start_date"] = {"$lte": end_date}
    
    items = await db.calendar_items.find(query, {"_id": 0}).sort("start_date", 1).to_list(500)
    return items

@marketing_v2_router.post("/calendar", response_model=CalendarItemResponse)
async def create_calendar_item(data: CalendarItemCreate):
    """Create a calendar item"""
    db = get_db()
    
    item_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc).isoformat()
    
    item_doc = {
        "id": item_id,
        **data.model_dump(),
        "created_at": now,
    }
    
    await db.calendar_items.insert_one(item_doc)
    del item_doc["_id"]
    return item_doc

# ============== DASHBOARD STATS ==============

@marketing_v2_router.get("/dashboard/stats")
async def get_marketing_dashboard_stats():
    """Get marketing dashboard statistics"""
    db = get_db()
    
    # Contact stats by type
    total_contacts = await db.contacts.count_documents({})
    influencer_count = await db.contacts.count_documents({"contact_type": "influencer"})
    journalist_count = await db.contacts.count_documents({"contact_type": "journalist"})
    blogger_count = await db.contacts.count_documents({"contact_type": "blogger"})
    hybrid_count = await db.contacts.count_documents({"contact_type": "hybrid"})
    
    # Deal stats
    active_deals = await db.deals.count_documents({"status": {"$in": ["pending", "negotiating"]}})
    agreed_deals = await db.deals.count_documents({"status": "agreed"})
    
    # PR stats
    press_releases = await db.press_releases.count_documents({})
    media_coverage = await db.media_coverage.count_documents({})
    
    # Event stats
    upcoming_events = await db.events.count_documents({"status": {"$in": ["planning", "confirmed"]}})
    
    # UGC stats
    pending_approvals = await db.approvals.count_documents({"status": "pending"})
    
    return {
        "contacts": {
            "total": total_contacts,
            "influencers": influencer_count,
            "journalists": journalist_count,
            "bloggers": blogger_count,
            "hybrid": hybrid_count,
        },
        "deals": {
            "active": active_deals,
            "agreed": agreed_deals,
        },
        "pr": {
            "press_releases": press_releases,
            "media_coverage": media_coverage,
        },
        "events": {
            "upcoming": upcoming_events,
        },
        "approvals": {
            "pending": pending_approvals,
        },
    }


# ============== PHASE 2: AI DISCOVERY ==============

# ---- External AI-Powered Influencer Discovery with API Verification ----
@marketing_v2_router.post("/ai/external-discover")
async def ai_external_discover_influencers(
    request: dict,
    user: dict = Depends(get_marketing_auth())
):
    """
    AI-powered external influencer discovery with real API verification.
    Uses GPT-4o to suggest influencers, then verifies with Instagram/YouTube APIs.
    Returns only verified influencers with real metrics.
    """
    from services.ai_influencer_discovery import get_discovery_service
    
    discovery_service = get_discovery_service()
    
    result = await discovery_service.discover_influencers(
        industry=request.get("industry", "Fashion"),
        platform=request.get("platform", "instagram"),
        objective=request.get("objective", "brand_awareness"),
        city=request.get("city"),
        follower_range=request.get("follower_range"),
        additional_requirements=request.get("additional_requirements", ""),
        limit=request.get("limit", 10)
    )
    
    # Save discovery session
    db = get_db()
    session_id = str(uuid.uuid4())
    session_doc = {
        "id": session_id,
        "type": "external_influencer_discovery",
        "request": request,
        "result_count": len(result.get("influencers", [])),
        "user_id": user.get("id"),
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.discovery_sessions.insert_one(session_doc)
    
    return {
        "session_id": session_id,
        "success": result.get("success", False),
        "message": result.get("message", ""),
        "ai_suggestions_count": result.get("ai_suggestions_count", 0),
        "verified_count": result.get("verified_count", 0),
        "influencers": result.get("influencers", [])
    }

# ---- Influencer AI Discovery ----
@marketing_v2_router.post("/ai/discover-influencers")
async def ai_discover_influencers(
    campaign_brief: dict,
    user: dict = Depends(get_marketing_auth())
):
    """AI-powered influencer discovery based on campaign brief"""
    from services.ai_discovery_service import AIDiscoveryService
    
    db = get_db()
    ai_service = AIDiscoveryService()
    
    # Get all influencers from database
    influencers = await db.contacts.find(
        {"contact_type": "influencer"},
        {"_id": 0}
    ).to_list(500)
    
    if not influencers:
        return {
            "success": False,
            "error": "No influencers in database. Add influencers first.",
            "recommendations": []
        }
    
    # Run AI discovery
    result = await ai_service.discover_influencers(campaign_brief, influencers)
    
    # Extract data from result
    ai_data = result.get("data", {}) if result.get("success") else {}
    
    # Save discovery session
    session_id = str(uuid.uuid4())
    session_doc = {
        "id": session_id,
        "type": "influencer_discovery",
        "brief": campaign_brief,
        "result": result,
        "user_id": user.get("id"),
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.discovery_sessions.insert_one(session_doc)
    
    # Enrich recommendations with full influencer data
    recommendations = []
    for rec in ai_data.get("recommendations", []):
        inf_id = rec.get("influencer_id")
        influencer = next((i for i in influencers if i.get("id") == inf_id), None)
        if influencer:
            recommendations.append({
                **rec,
                "influencer": influencer
            })
    
    return {
        "session_id": session_id,
        "recommendations": recommendations,
        "insights": ai_data.get("campaign_insights", {}),
        "additional_recommendations": ai_data.get("additional_recommendations", "")
    }


@marketing_v2_router.post("/ai/generate-outreach")
async def ai_generate_outreach(
    request: dict,
    user: dict = Depends(get_marketing_auth())
):
    """Generate AI-powered outreach message for an influencer"""
    from services.ai_discovery_service import AIDiscoveryService
    
    ai_service = AIDiscoveryService()
    
    influencer_data = request.get("influencer_data", {})
    campaign_brief = request.get("campaign_brief", {})
    
    result = await ai_service.generate_outreach_message(influencer_data, campaign_brief)
    
    # Extract data from result
    if result.get("success"):
        return result.get("data", {})
    else:
        return {"error": result.get("error", "Failed to generate outreach message")}


# ---- PR/Media AI Discovery ----
@marketing_v2_router.post("/pr/ai-discover")
async def ai_discover_journalists(
    discovery_brief: dict,
    user: dict = Depends(get_marketing_auth())
):
    """AI-powered journalist discovery based on PR brief"""
    from services.ai_pr_discovery_service import ai_pr_discovery_service
    
    db = get_db()
    
    # Get all journalists from database
    journalists = await db.contacts.find(
        {"contact_type": "journalist"},
        {"_id": 0}
    ).to_list(500)
    
    if not journalists:
        return {
            "success": False,
            "error": "No journalists in database. Add media contacts first.",
            "recommendations": []
        }
    
    # Run AI discovery
    result = await ai_pr_discovery_service.discover_journalists(discovery_brief, journalists)
    
    # Extract data from result
    ai_data = result.get("data", {}) if result.get("success") else {}
    
    # Save discovery session
    session_id = str(uuid.uuid4())
    session_doc = {
        "id": session_id,
        "type": "pr_discovery",
        "brief": discovery_brief,
        "result": ai_data,
        "user_id": user.get("id"),
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.discovery_sessions.insert_one(session_doc)
    
    # Enrich recommendations with full journalist data
    enriched_recommendations = []
    for rec in ai_data.get("recommendations", []):
        journalist_id = rec.get("journalist_id")
        journalist = next((j for j in journalists if j.get("id") == journalist_id), None)
        if journalist:
            enriched_recommendations.append({
                **rec,
                "journalist": journalist
            })
        else:
            enriched_recommendations.append(rec)
    
    return {
        "session_id": session_id,
        "success": result.get("success", False),
        "data": {
            **ai_data,
            "recommendations": enriched_recommendations
        },
        "timestamp": result.get("timestamp")
    }

@marketing_v2_router.post("/pr/ai-generate-pitch")
async def ai_generate_pitch(
    journalist_id: str,
    press_release_id: Optional[str] = None,
    tone: str = "professional",
    user: dict = Depends(get_marketing_auth())
):
    """AI-generate personalized pitch for a journalist"""
    from services.ai_pr_discovery_service import ai_pr_discovery_service
    
    db = get_db()
    
    journalist = await db.contacts.find_one({"id": journalist_id}, {"_id": 0})
    if not journalist:
        raise HTTPException(status_code=404, detail="Journalist not found")
    
    press_release = {}
    if press_release_id:
        press_release = await db.press_releases.find_one({"id": press_release_id}, {"_id": 0}) or {}
    
    result = await ai_pr_discovery_service.generate_pitch_message(journalist, press_release, tone)
    return result

@marketing_v2_router.post("/pr/ai-generate-followup")
async def ai_generate_followup(
    journalist_id: str,
    original_pitch_id: str,
    follow_up_number: int = 1,
    user: dict = Depends(get_marketing_auth())
):
    """AI-generate follow-up message for a pitch"""
    from services.ai_pr_discovery_service import ai_pr_discovery_service
    
    db = get_db()
    
    journalist = await db.contacts.find_one({"id": journalist_id}, {"_id": 0})
    if not journalist:
        raise HTTPException(status_code=404, detail="Journalist not found")
    
    original_pitch = await db.pr_pitches.find_one({"id": original_pitch_id}, {"_id": 0})
    if not original_pitch:
        raise HTTPException(status_code=404, detail="Original pitch not found")
    
    # Calculate days since sent
    if original_pitch.get("sent_at"):
        sent_date = datetime.fromisoformat(original_pitch["sent_at"].replace("Z", "+00:00"))
        days_since = (datetime.now(timezone.utc) - sent_date).days
        original_pitch["days_since_sent"] = days_since
    
    result = await ai_pr_discovery_service.generate_follow_up(journalist, original_pitch, follow_up_number)
    return result

@marketing_v2_router.post("/pr/ai-analyze-list")
async def ai_analyze_media_list(
    journalist_ids: List[str],
    campaign_objectives: dict,
    user: dict = Depends(get_marketing_auth())
):
    """AI-analyze a media list for coverage potential"""
    from services.ai_pr_discovery_service import ai_pr_discovery_service
    
    db = get_db()
    
    journalists = await db.contacts.find(
        {"id": {"$in": journalist_ids}},
        {"_id": 0}
    ).to_list(len(journalist_ids))
    
    result = await ai_pr_discovery_service.analyze_media_list(journalists, campaign_objectives)
    return result

# ============== PHASE 3: PR CAMPAIGN MANAGEMENT ==============

@marketing_v2_router.get("/pr/campaigns", response_model=List[PRCampaignResponse])
async def get_pr_campaigns(
    status: Optional[str] = None,
    limit: int = 50,
    user: dict = Depends(get_marketing_auth())
):
    """Get all PR campaigns"""
    db = get_db()
    query = {}
    if status:
        query["status"] = status
    
    campaigns = await db.pr_campaigns.find(query, {"_id": 0}).sort("created_at", -1).limit(limit).to_list(limit)
    return campaigns

@marketing_v2_router.get("/pr/campaigns/{campaign_id}", response_model=PRCampaignResponse)
async def get_pr_campaign(campaign_id: str, user: dict = Depends(get_marketing_auth())):
    """Get single PR campaign with details"""
    db = get_db()
    
    campaign = await db.pr_campaigns.find_one({"id": campaign_id}, {"_id": 0})
    if not campaign:
        raise HTTPException(status_code=404, detail="PR Campaign not found")
    
    # Get pitch and coverage counts
    pitch_count = await db.pr_pitches.count_documents({"pr_campaign_id": campaign_id})
    coverage_count = await db.media_coverage.count_documents({"campaign_id": campaign_id})
    responded_count = await db.pr_pitches.count_documents({
        "pr_campaign_id": campaign_id,
        "status": {"$in": ["responded", "interested"]}
    })
    
    campaign["pitch_count"] = pitch_count
    campaign["coverage_count"] = coverage_count
    campaign["response_rate"] = (responded_count / pitch_count * 100) if pitch_count > 0 else 0
    
    return campaign

@marketing_v2_router.post("/pr/campaigns", response_model=PRCampaignResponse)
async def create_pr_campaign(
    data: PRCampaignCreate,
    user: dict = Depends(get_marketing_auth())
):
    """Create a new PR campaign"""
    db = get_db()
    
    campaign_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc).isoformat()
    
    owner_name = None
    if data.owner_id:
        owner = await db.users.find_one({"id": data.owner_id})
        owner_name = owner.get("name") if owner else None
    
    campaign_doc = {
        "id": campaign_id,
        **data.model_dump(),
        "owner_name": owner_name,
        "status": "planning",
        "spent": 0.0,
        "journalist_ids": [],
        "press_release_ids": [],
        "pitch_count": 0,
        "coverage_count": 0,
        "response_rate": 0.0,
        "created_by": user.get("id"),
        "created_by_name": user.get("name"),
        "created_at": now,
        "updated_at": now,
    }
    
    await db.pr_campaigns.insert_one(campaign_doc)
    del campaign_doc["_id"]
    return campaign_doc

@marketing_v2_router.put("/pr/campaigns/{campaign_id}", response_model=PRCampaignResponse)
async def update_pr_campaign(
    campaign_id: str,
    data: PRCampaignCreate,
    user: dict = Depends(get_marketing_auth())
):
    """Update a PR campaign"""
    db = get_db()
    
    existing = await db.pr_campaigns.find_one({"id": campaign_id})
    if not existing:
        raise HTTPException(status_code=404, detail="PR Campaign not found")
    
    update_data = data.model_dump()
    update_data["updated_at"] = datetime.now(timezone.utc).isoformat()
    
    await db.pr_campaigns.update_one({"id": campaign_id}, {"$set": update_data})
    
    updated = await db.pr_campaigns.find_one({"id": campaign_id}, {"_id": 0})
    return updated

@marketing_v2_router.put("/pr/campaigns/{campaign_id}/status")
async def update_pr_campaign_status(
    campaign_id: str,
    status: str,
    user: dict = Depends(get_marketing_auth())
):
    """Update PR campaign status"""
    db = get_db()
    
    # Get existing campaign to check old status
    campaign = await db.pr_campaigns.find_one({"id": campaign_id})
    if not campaign:
        raise HTTPException(status_code=404, detail="PR Campaign not found")
    
    old_status = campaign.get("status")
    
    await db.pr_campaigns.update_one(
        {"id": campaign_id},
        {"$set": {"status": status, "updated_at": datetime.now(timezone.utc).isoformat()}}
    )
    
    # PULSE INTEGRATION: Auto-post when PR campaign goes active/live
    if status in ["active", "live", "published"] and old_status not in ["active", "live", "published"]:
        try:
            await on_press_release_published(
                press_release={
                    "id": campaign_id,
                    "title": campaign.get("name"),
                    "summary": campaign.get("description") or campaign.get("objectives", "")
                },
                published_by=user
            )
        except Exception as e:
            # Log but don't fail the request
            print(f"Pulse integration error: {e}")
    
    return {"message": f"Campaign status updated to {status}"}


@marketing_v2_router.delete("/pr/campaigns/{campaign_id}")
async def delete_pr_campaign(
    campaign_id: str,
    user: dict = Depends(get_marketing_auth())
):
    """Delete a PR campaign"""
    db = get_db()
    
    campaign = await db.pr_campaigns.find_one({"id": campaign_id})
    if not campaign:
        raise HTTPException(status_code=404, detail="PR Campaign not found")
    
    # Delete the campaign
    await db.pr_campaigns.delete_one({"id": campaign_id})
    
    # Optionally clean up related data (pitches, etc.)
    await db.pr_pitches.delete_many({"campaign_id": campaign_id})
    
    return {"message": "Campaign deleted successfully"}


@marketing_v2_router.post("/pr/campaigns/{campaign_id}/journalists/{journalist_id}")
async def add_journalist_to_campaign(
    campaign_id: str,
    journalist_id: str,
    user: dict = Depends(get_marketing_auth())
):
    """Add journalist to PR campaign"""
    db = get_db()
    
    campaign = await db.pr_campaigns.find_one({"id": campaign_id})
    if not campaign:
        raise HTTPException(status_code=404, detail="PR Campaign not found")
    
    journalist = await db.contacts.find_one({"id": journalist_id})
    if not journalist:
        raise HTTPException(status_code=404, detail="Journalist not found")
    
    await db.pr_campaigns.update_one(
        {"id": campaign_id},
        {"$addToSet": {"journalist_ids": journalist_id}}
    )
    
    return {"message": "Journalist added to campaign"}

@marketing_v2_router.delete("/pr/campaigns/{campaign_id}/journalists/{journalist_id}")
async def remove_journalist_from_campaign(
    campaign_id: str,
    journalist_id: str,
    user: dict = Depends(get_marketing_auth())
):
    """Remove journalist from PR campaign"""
    db = get_db()
    
    await db.pr_campaigns.update_one(
        {"id": campaign_id},
        {"$pull": {"journalist_ids": journalist_id}}
    )
    
    return {"message": "Journalist removed from campaign"}

@marketing_v2_router.post("/pr/campaigns/{campaign_id}/releases/{release_id}")
async def link_release_to_campaign(
    campaign_id: str,
    release_id: str,
    user: dict = Depends(get_marketing_auth())
):
    """Link press release to PR campaign"""
    db = get_db()
    
    await db.pr_campaigns.update_one(
        {"id": campaign_id},
        {"$addToSet": {"press_release_ids": release_id}}
    )
    
    # Also update the press release
    await db.press_releases.update_one(
        {"id": release_id},
        {"$set": {"pr_campaign_id": campaign_id}}
    )
    
    return {"message": "Press release linked to campaign"}

@marketing_v2_router.get("/pr/campaigns/{campaign_id}/journalists")
async def get_campaign_journalists(
    campaign_id: str,
    user: dict = Depends(get_marketing_auth())
):
    """Get all journalists in a PR campaign"""
    db = get_db()
    
    campaign = await db.pr_campaigns.find_one({"id": campaign_id}, {"_id": 0})
    if not campaign:
        raise HTTPException(status_code=404, detail="PR Campaign not found")
    
    journalist_ids = campaign.get("journalist_ids", [])
    if not journalist_ids:
        return []
    
    journalists = await db.contacts.find(
        {"id": {"$in": journalist_ids}},
        {"_id": 0}
    ).to_list(len(journalist_ids))
    
    # Add pitch status for each journalist
    for j in journalists:
        pitch = await db.pr_pitches.find_one(
            {"contact_id": j["id"], "pr_campaign_id": campaign_id},
            {"_id": 0, "status": 1, "sent_at": 1}
        )
        j["pitch_status"] = pitch.get("status") if pitch else "not_pitched"
        j["pitch_sent_at"] = pitch.get("sent_at") if pitch else None
    
    return journalists

# ============== PHASE 4: OUTREACH AUTOMATION ==============

@marketing_v2_router.get("/outreach/templates", response_model=List[OutreachTemplateResponse])
async def get_outreach_templates(
    template_type: Optional[str] = None,
    user: dict = Depends(get_marketing_auth())
):
    """Get all outreach email templates"""
    db = get_db()
    query = {}
    if template_type:
        query["template_type"] = template_type
    
    templates = await db.outreach_templates.find(query, {"_id": 0}).sort("created_at", -1).to_list(100)
    return templates

@marketing_v2_router.post("/outreach/templates", response_model=OutreachTemplateResponse)
async def create_outreach_template(
    data: OutreachTemplateCreate,
    user: dict = Depends(get_marketing_auth())
):
    """Create a new outreach email template"""
    db = get_db()
    
    template_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc).isoformat()
    
    template_doc = {
        "id": template_id,
        **data.model_dump(),
        "usage_count": 0,
        "created_at": now,
    }
    
    await db.outreach_templates.insert_one(template_doc)
    del template_doc["_id"]
    return template_doc

@marketing_v2_router.put("/outreach/templates/{template_id}")
async def update_outreach_template(
    template_id: str,
    data: OutreachTemplateCreate,
    user: dict = Depends(get_marketing_auth())
):
    """Update an outreach template"""
    db = get_db()
    
    result = await db.outreach_templates.update_one(
        {"id": template_id},
        {"$set": data.model_dump()}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Template not found")
    
    return {"message": "Template updated"}

@marketing_v2_router.delete("/outreach/templates/{template_id}")
async def delete_outreach_template(
    template_id: str,
    user: dict = Depends(get_marketing_auth())
):
    """Delete an outreach template"""
    db = get_db()
    
    result = await db.outreach_templates.delete_one({"id": template_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Template not found")
    
    return {"message": "Template deleted"}

@marketing_v2_router.get("/outreach/sequences", response_model=List[OutreachSequenceResponse])
async def get_outreach_sequences(user: dict = Depends(get_marketing_auth())):
    """Get all outreach sequences"""
    db = get_db()
    
    sequences = await db.outreach_sequences.find({}, {"_id": 0}).sort("created_at", -1).to_list(50)
    
    # Populate template details
    for seq in sequences:
        template_ids = seq.get("template_ids", [])
        if template_ids:
            templates = await db.outreach_templates.find(
                {"id": {"$in": template_ids}},
                {"_id": 0}
            ).to_list(len(template_ids))
            seq["templates"] = templates
    
    return sequences

@marketing_v2_router.post("/outreach/sequences", response_model=OutreachSequenceResponse)
async def create_outreach_sequence(
    data: OutreachSequenceCreate,
    user: dict = Depends(get_marketing_auth())
):
    """Create a new outreach sequence"""
    db = get_db()
    
    sequence_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc).isoformat()
    
    sequence_doc = {
        "id": sequence_id,
        **data.model_dump(),
        "contacts_enrolled": 0,
        "created_at": now,
    }
    
    await db.outreach_sequences.insert_one(sequence_doc)
    del sequence_doc["_id"]
    
    # Get template details
    if data.template_ids:
        templates = await db.outreach_templates.find(
            {"id": {"$in": data.template_ids}},
            {"_id": 0}
        ).to_list(len(data.template_ids))
        sequence_doc["templates"] = templates
    
    return sequence_doc

@marketing_v2_router.post("/outreach/schedule", response_model=ScheduledOutreachResponse)
async def schedule_outreach(
    data: ScheduledOutreachCreate,
    user: dict = Depends(get_marketing_auth())
):
    """Schedule an outreach email"""
    db = get_db()
    
    contact = await db.contacts.find_one({"id": data.contact_id}, {"_id": 0})
    if not contact:
        raise HTTPException(status_code=404, detail="Contact not found")
    
    template = await db.outreach_templates.find_one({"id": data.template_id}, {"_id": 0})
    if not template:
        raise HTTPException(status_code=404, detail="Template not found")
    
    outreach_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc).isoformat()
    
    # Personalize subject with contact name
    personalized_subject = template.get("subject", "").replace("{{name}}", contact.get("name", ""))
    
    outreach_doc = {
        "id": outreach_id,
        **data.model_dump(),
        "contact_name": contact.get("name"),
        "contact_email": contact.get("email"),
        "subject": personalized_subject,
        "status": "scheduled",
        "created_at": now,
    }
    
    await db.scheduled_outreach.insert_one(outreach_doc)
    del outreach_doc["_id"]
    
    # Update template usage count
    await db.outreach_templates.update_one(
        {"id": data.template_id},
        {"$inc": {"usage_count": 1}}
    )
    
    return outreach_doc

@marketing_v2_router.get("/outreach/scheduled", response_model=List[ScheduledOutreachResponse])
async def get_scheduled_outreach(
    status: Optional[str] = None,
    contact_id: Optional[str] = None,
    pr_campaign_id: Optional[str] = None,
    limit: int = 100,
    user: dict = Depends(get_marketing_auth())
):
    """Get all scheduled outreach"""
    db = get_db()
    query = {}
    if status:
        query["status"] = status
    if contact_id:
        query["contact_id"] = contact_id
    if pr_campaign_id:
        query["pr_campaign_id"] = pr_campaign_id
    
    outreach = await db.scheduled_outreach.find(query, {"_id": 0}).sort("scheduled_at", 1).limit(limit).to_list(limit)
    return outreach

@marketing_v2_router.put("/outreach/scheduled/{outreach_id}/send")
async def send_scheduled_outreach(
    outreach_id: str,
    use_microsoft_graph: bool = False,
    user: dict = Depends(get_marketing_auth())
):
    """Send a scheduled outreach email (manual or via Microsoft Graph)"""
    db = get_db()
    
    outreach = await db.scheduled_outreach.find_one({"id": outreach_id}, {"_id": 0})
    if not outreach:
        raise HTTPException(status_code=404, detail="Scheduled outreach not found")
    
    contact_email = outreach.get("contact_email")
    if not contact_email:
        raise HTTPException(status_code=400, detail="Contact has no email address")
    
    # Get template for full message
    template = await db.outreach_templates.find_one({"id": outreach.get("template_id")}, {"_id": 0})
    if not template:
        raise HTTPException(status_code=404, detail="Template not found")
    
    # Personalize message
    contact_name = outreach.get("contact_name", "")
    personalized_body = template.get("body", "").replace("{{name}}", contact_name)
    personalized_subject = outreach.get("subject", template.get("subject", ""))
    
    now = datetime.now(timezone.utc).isoformat()
    
    if use_microsoft_graph:
        # Try to send via Microsoft Graph
        try:
            from services.microsoft_service import microsoft_service
            result = await microsoft_service.send_email(
                to_email=contact_email,
                subject=personalized_subject,
                body=personalized_body,
                is_html=False
            )
            if result.get("success"):
                await db.scheduled_outreach.update_one(
                    {"id": outreach_id},
                    {"$set": {"status": "sent", "sent_at": now}}
                )
                
                # Update contact status
                await db.contacts.update_one(
                    {"id": outreach.get("contact_id")},
                    {"$set": {"status": "contacted", "last_contacted_date": now}}
                )
                
                # Log communication
                comm_doc = {
                    "id": str(uuid.uuid4()),
                    "contact_id": outreach.get("contact_id"),
                    "contact_name": contact_name,
                    "comm_type": "email",
                    "subject": personalized_subject,
                    "message": personalized_body,
                    "direction": "outbound",
                    "status": "sent",
                    "sent_at": now,
                    "opened": False,
                    "replied": False
                }
                await db.communications.insert_one(comm_doc)
                
                return {"message": "Email sent via Microsoft Graph", "status": "sent"}
            else:
                await db.scheduled_outreach.update_one(
                    {"id": outreach_id},
                    {"$set": {"status": "failed", "error_message": result.get("error")}}
                )
                return {"message": "Failed to send email", "error": result.get("error")}
        except Exception as e:
            await db.scheduled_outreach.update_one(
                {"id": outreach_id},
                {"$set": {"status": "failed", "error_message": str(e)}}
            )
            return {"message": "Failed to send email", "error": str(e)}
    else:
        # Manual send - just mark as sent and log
        await db.scheduled_outreach.update_one(
            {"id": outreach_id},
            {"$set": {"status": "sent", "sent_at": now}}
        )
        
        # Update contact status
        await db.contacts.update_one(
            {"id": outreach.get("contact_id")},
            {"$set": {"status": "contacted", "last_contacted_date": now}}
        )
        
        # Log communication
        comm_doc = {
            "id": str(uuid.uuid4()),
            "contact_id": outreach.get("contact_id"),
            "contact_name": contact_name,
            "comm_type": "email",
            "subject": personalized_subject,
            "message": personalized_body,
            "direction": "outbound",
            "status": "sent",
            "sent_at": now,
            "opened": False,
            "replied": False
        }
        await db.communications.insert_one(comm_doc)
        
        return {
            "message": "Outreach marked as sent (manual)",
            "status": "sent",
            "to": contact_email,
            "subject": personalized_subject
        }

@marketing_v2_router.put("/outreach/scheduled/{outreach_id}/cancel")
async def cancel_scheduled_outreach(
    outreach_id: str,
    user: dict = Depends(get_marketing_auth())
):
    """Cancel a scheduled outreach"""
    db = get_db()
    
    result = await db.scheduled_outreach.update_one(
        {"id": outreach_id},
        {"$set": {"status": "cancelled"}}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Scheduled outreach not found")
    
    return {"message": "Outreach cancelled"}

@marketing_v2_router.post("/outreach/enroll-sequence")
async def enroll_contacts_in_sequence(
    sequence_id: str,
    contact_ids: List[str],
    start_date: Optional[str] = None,
    user: dict = Depends(get_marketing_auth())
):
    """Enroll multiple contacts in an outreach sequence"""
    db = get_db()
    
    sequence = await db.outreach_sequences.find_one({"id": sequence_id}, {"_id": 0})
    if not sequence:
        raise HTTPException(status_code=404, detail="Sequence not found")
    
    template_ids = sequence.get("template_ids", [])
    if not template_ids:
        raise HTTPException(status_code=400, detail="Sequence has no templates")
    
    # Get templates with their delays
    templates = await db.outreach_templates.find(
        {"id": {"$in": template_ids}},
        {"_id": 0}
    ).to_list(len(template_ids))
    
    # Sort templates by their position in the sequence
    template_map = {t["id"]: t for t in templates}
    sorted_templates = [template_map[tid] for tid in template_ids if tid in template_map]
    
    base_date = datetime.fromisoformat(start_date.replace("Z", "+00:00")) if start_date else datetime.now(timezone.utc)
    
    scheduled_count = 0
    for contact_id in contact_ids:
        contact = await db.contacts.find_one({"id": contact_id}, {"_id": 0})
        if not contact:
            continue
        
        cumulative_delay = 0
        for template in sorted_templates:
            cumulative_delay += template.get("delay_days", 0)
            scheduled_at = base_date + timedelta(days=cumulative_delay)
            
            outreach_doc = {
                "id": str(uuid.uuid4()),
                "contact_id": contact_id,
                "contact_name": contact.get("name"),
                "contact_email": contact.get("email"),
                "sequence_id": sequence_id,
                "template_id": template["id"],
                "pr_campaign_id": sequence.get("pr_campaign_id"),
                "scheduled_at": scheduled_at.isoformat(),
                "channel": "email",
                "status": "scheduled",
                "subject": template.get("subject", "").replace("{{name}}", contact.get("name", "")),
                "created_at": datetime.now(timezone.utc).isoformat()
            }
            
            await db.scheduled_outreach.insert_one(outreach_doc)
            scheduled_count += 1
    
    # Update sequence enrollment count
    await db.outreach_sequences.update_one(
        {"id": sequence_id},
        {"$inc": {"contacts_enrolled": len(contact_ids)}}
    )
    
    return {
        "message": f"Enrolled {len(contact_ids)} contacts in sequence",
        "scheduled_emails": scheduled_count
    }

@marketing_v2_router.get("/pr/outreach/stats")
async def get_pr_outreach_stats(
    pr_campaign_id: Optional[str] = None,
    user: dict = Depends(get_marketing_auth())
):
    """Get PR-specific outreach statistics"""
    db = get_db()
    
    query = {}
    if pr_campaign_id:
        query["pr_campaign_id"] = pr_campaign_id
    
    total_scheduled = await db.scheduled_outreach.count_documents({**query, "status": "scheduled"})
    total_sent = await db.scheduled_outreach.count_documents({**query, "status": "sent"})
    total_failed = await db.scheduled_outreach.count_documents({**query, "status": "failed"})
    total_cancelled = await db.scheduled_outreach.count_documents({**query, "status": "cancelled"})
    
    # Get response stats from pitches
    pitch_query = {"pr_campaign_id": pr_campaign_id} if pr_campaign_id else {}
    total_pitches = await db.pr_pitches.count_documents(pitch_query)
    responded_pitches = await db.pr_pitches.count_documents({**pitch_query, "status": {"$in": ["responded", "interested"]}})
    
    return {
        "outreach": {
            "scheduled": total_scheduled,
            "sent": total_sent,
            "failed": total_failed,
            "cancelled": total_cancelled,
            "total": total_scheduled + total_sent + total_failed + total_cancelled
        },
        "pitches": {
            "total": total_pitches,
            "responded": responded_pitches,
            "response_rate": (responded_pitches / total_pitches * 100) if total_pitches > 0 else 0
        }
    }

# Update pitch status
@marketing_v2_router.put("/pr/pitches/{pitch_id}/status")
async def update_pitch_status(
    pitch_id: str,
    status: str,
    user: dict = Depends(get_marketing_auth())
):
    """Update PR pitch status"""
    db = get_db()
    
    now = datetime.now(timezone.utc).isoformat()
    update_data = {"status": status}
    
    if status == "sent":
        update_data["sent_at"] = now
    elif status == "opened":
        update_data["opened_at"] = now
    elif status in ["responded", "interested", "declined"]:
        update_data["responded_at"] = now
    
    result = await db.pr_pitches.update_one({"id": pitch_id}, {"$set": update_data})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Pitch not found")
    
    # Update contact status based on pitch response
    pitch = await db.pr_pitches.find_one({"id": pitch_id})
    if pitch and status in ["interested"]:
        await db.contacts.update_one(
            {"id": pitch["contact_id"]},
            {"$set": {"status": "interested"}}
        )
    
    return {"message": f"Pitch status updated to {status}"}


# ============== PHASE 5: RELATIONSHIP CRM ==============

@marketing_v2_router.get("/relationships/interactions", response_model=List[InteractionResponse])
async def get_interactions(
    contact_id: Optional[str] = None,
    interaction_type: Optional[str] = None,
    limit: int = 50,
    user: dict = Depends(get_marketing_auth())
):
    """Get interaction history"""
    db = get_db()
    query = {}
    if contact_id:
        query["contact_id"] = contact_id
    if interaction_type:
        query["interaction_type"] = interaction_type
    
    interactions = await db.interactions.find(query, {"_id": 0}).sort("created_at", -1).limit(limit).to_list(limit)
    return interactions

@marketing_v2_router.post("/relationships/interactions", response_model=InteractionResponse)
async def create_interaction(
    data: InteractionCreate,
    user: dict = Depends(get_marketing_auth())
):
    """Log an interaction with a contact"""
    db = get_db()
    
    contact = await db.contacts.find_one({"id": data.contact_id}, {"_id": 0})
    if not contact:
        raise HTTPException(status_code=404, detail="Contact not found")
    
    interaction_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc).isoformat()
    
    interaction_doc = {
        "id": interaction_id,
        **data.model_dump(),
        "contact_name": contact.get("name"),
        "created_by": user.get("id"),
        "created_by_name": user.get("name"),
        "created_at": now,
    }
    
    await db.interactions.insert_one(interaction_doc)
    del interaction_doc["_id"]
    
    # Update contact's last_contacted_date
    await db.contacts.update_one(
        {"id": data.contact_id},
        {"$set": {"last_contacted_date": now}}
    )
    
    # Adjust relationship score based on interaction type
    score_adjustments = {
        "email": 1, "call": 2, "meeting": 5, "event": 3,
        "pitch": 1, "follow_up": 1, "coverage": 10, "note": 0
    }
    adjustment = score_adjustments.get(data.interaction_type, 0)
    if data.outcome == "positive":
        adjustment += 2
    elif data.outcome == "negative":
        adjustment -= 2
    
    if adjustment != 0:
        await db.contacts.update_one(
            {"id": data.contact_id},
            {"$inc": {"relationship_score": adjustment}}
        )
    
    return interaction_doc

@marketing_v2_router.get("/relationships/contacts/{contact_id}/history")
async def get_contact_relationship_history(
    contact_id: str,
    user: dict = Depends(get_marketing_auth())
):
    """Get full relationship history for a contact"""
    db = get_db()
    
    contact = await db.contacts.find_one({"id": contact_id}, {"_id": 0})
    if not contact:
        raise HTTPException(status_code=404, detail="Contact not found")
    
    # Get interactions
    interactions = await db.interactions.find(
        {"contact_id": contact_id}, {"_id": 0}
    ).sort("created_at", -1).limit(50).to_list(50)
    
    # Get pitches
    pitches = await db.pr_pitches.find(
        {"contact_id": contact_id}, {"_id": 0}
    ).sort("created_at", -1).limit(20).to_list(20)
    
    # Get coverage
    coverage = await db.media_coverage.find(
        {"contact_id": contact_id}, {"_id": 0}
    ).sort("created_at", -1).limit(20).to_list(20)
    
    # Get communications
    communications = await db.communications.find(
        {"contact_id": contact_id}, {"_id": 0}
    ).sort("created_at", -1).limit(20).to_list(20)
    
    return {
        "contact": contact,
        "relationship_score": contact.get("relationship_score", 0),
        "interactions": interactions,
        "pitches": pitches,
        "coverage": coverage,
        "communications": communications,
        "stats": {
            "total_interactions": len(interactions),
            "total_pitches": len(pitches),
            "total_coverage": len(coverage),
            "response_rate": len([p for p in pitches if p.get("status") in ["responded", "interested"]]) / len(pitches) * 100 if pitches else 0
        }
    }

@marketing_v2_router.put("/relationships/contacts/{contact_id}/score")
async def update_relationship_score(
    contact_id: str,
    adjustment: int,
    reason: str,
    user: dict = Depends(get_marketing_auth())
):
    """Manually adjust relationship score"""
    db = get_db()
    
    adjustment = max(-10, min(10, adjustment))  # Clamp to -10 to +10
    
    result = await db.contacts.update_one(
        {"id": contact_id},
        {"$inc": {"relationship_score": adjustment}}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Contact not found")
    
    # Log the adjustment
    await db.interactions.insert_one({
        "id": str(uuid.uuid4()),
        "contact_id": contact_id,
        "interaction_type": "note",
        "notes": f"Relationship score adjusted by {adjustment}: {reason}",
        "created_by": user.get("id"),
        "created_by_name": user.get("name"),
        "created_at": datetime.now(timezone.utc).isoformat()
    })
    
    return {"message": f"Relationship score adjusted by {adjustment}"}

@marketing_v2_router.get("/relationships/top-contacts")
async def get_top_contacts(
    limit: int = 10,
    user: dict = Depends(get_marketing_auth())
):
    """Get contacts with highest relationship scores"""
    db = get_db()
    
    contacts = await db.contacts.find(
        {"contact_type": "journalist"},
        {"_id": 0}
    ).sort("relationship_score", -1).limit(limit).to_list(limit)
    
    return contacts

# ============== PHASE 8: PRESS KIT MANAGEMENT ==============

@marketing_v2_router.get("/press-kits/assets", response_model=List[PressKitAssetResponse])
async def get_press_kit_assets(
    asset_type: Optional[str] = None,
    category: Optional[str] = None,
    is_public: Optional[bool] = None,
    user: dict = Depends(get_marketing_auth())
):
    """Get all press kit assets"""
    db = get_db()
    query = {}
    if asset_type:
        query["asset_type"] = asset_type
    if category:
        query["category"] = category
    if is_public is not None:
        query["is_public"] = is_public
    
    assets = await db.press_kit_assets.find(query, {"_id": 0}).sort("created_at", -1).to_list(200)
    return assets

@marketing_v2_router.post("/press-kits/assets", response_model=PressKitAssetResponse)
async def create_press_kit_asset(
    data: PressKitAssetCreate,
    user: dict = Depends(get_marketing_auth())
):
    """Add a new asset to the press kit library"""
    db = get_db()
    
    asset_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc).isoformat()
    
    asset_doc = {
        "id": asset_id,
        **data.model_dump(),
        "download_count": 0,
        "created_at": now,
        "updated_at": now,
    }
    
    await db.press_kit_assets.insert_one(asset_doc)
    del asset_doc["_id"]
    return asset_doc

@marketing_v2_router.put("/press-kits/assets/{asset_id}")
async def update_press_kit_asset(
    asset_id: str,
    data: PressKitAssetCreate,
    user: dict = Depends(get_marketing_auth())
):
    """Update a press kit asset"""
    db = get_db()
    
    update_data = data.model_dump()
    update_data["updated_at"] = datetime.now(timezone.utc).isoformat()
    
    result = await db.press_kit_assets.update_one({"id": asset_id}, {"$set": update_data})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Asset not found")
    
    return {"message": "Asset updated"}

@marketing_v2_router.delete("/press-kits/assets/{asset_id}")
async def delete_press_kit_asset(
    asset_id: str,
    user: dict = Depends(get_marketing_auth())
):
    """Delete a press kit asset"""
    db = get_db()
    
    result = await db.press_kit_assets.delete_one({"id": asset_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Asset not found")
    
    # Remove from any press kits
    await db.press_kits.update_many(
        {"asset_ids": asset_id},
        {"$pull": {"asset_ids": asset_id}}
    )
    
    return {"message": "Asset deleted"}

@marketing_v2_router.get("/press-kits", response_model=List[PressKitResponse])
async def get_press_kits(
    is_active: Optional[bool] = None,
    user: dict = Depends(get_marketing_auth())
):
    """Get all press kits"""
    db = get_db()
    query = {}
    if is_active is not None:
        query["is_active"] = is_active
    
    kits = await db.press_kits.find(query, {"_id": 0}).sort("created_at", -1).to_list(50)
    
    # Populate assets
    for kit in kits:
        asset_ids = kit.get("asset_ids", [])
        if asset_ids:
            assets = await db.press_kit_assets.find(
                {"id": {"$in": asset_ids}}, {"_id": 0}
            ).to_list(len(asset_ids))
            kit["assets"] = assets
    
    return kits

@marketing_v2_router.post("/press-kits", response_model=PressKitResponse)
async def create_press_kit(
    data: PressKitCreate,
    user: dict = Depends(get_marketing_auth())
):
    """Create a new press kit"""
    db = get_db()
    
    kit_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc).isoformat()
    
    # Generate share URL
    share_token = str(uuid.uuid4())[:8]
    
    kit_doc = {
        "id": kit_id,
        **data.model_dump(),
        "share_url": f"/press-kit/{share_token}",
        "share_token": share_token,
        "view_count": 0,
        "download_count": 0,
        "created_at": now,
    }
    
    await db.press_kits.insert_one(kit_doc)
    del kit_doc["_id"]
    
    # Populate assets
    if data.asset_ids:
        assets = await db.press_kit_assets.find(
            {"id": {"$in": data.asset_ids}}, {"_id": 0}
        ).to_list(len(data.asset_ids))
        kit_doc["assets"] = assets
    
    return kit_doc

@marketing_v2_router.get("/press-kits/{kit_id}", response_model=PressKitResponse)
async def get_press_kit(
    kit_id: str,
    user: dict = Depends(get_marketing_auth())
):
    """Get a specific press kit"""
    db = get_db()
    
    kit = await db.press_kits.find_one({"id": kit_id}, {"_id": 0})
    if not kit:
        raise HTTPException(status_code=404, detail="Press kit not found")
    
    # Populate assets
    asset_ids = kit.get("asset_ids", [])
    if asset_ids:
        assets = await db.press_kit_assets.find(
            {"id": {"$in": asset_ids}}, {"_id": 0}
        ).to_list(len(asset_ids))
        kit["assets"] = assets
    
    return kit

@marketing_v2_router.put("/press-kits/{kit_id}/assets")
async def update_press_kit_assets(
    kit_id: str,
    asset_ids: List[str],
    user: dict = Depends(get_marketing_auth())
):
    """Update assets in a press kit"""
    db = get_db()
    
    result = await db.press_kits.update_one(
        {"id": kit_id},
        {"$set": {"asset_ids": asset_ids}}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Press kit not found")
    
    return {"message": "Press kit assets updated"}

@marketing_v2_router.get("/press-kits/public/{share_token}")
async def get_public_press_kit(share_token: str):
    """Get public press kit by share token (no auth required)"""
    db = get_db()
    
    kit = await db.press_kits.find_one(
        {"share_token": share_token, "is_active": True},
        {"_id": 0, "password": 0}
    )
    if not kit:
        raise HTTPException(status_code=404, detail="Press kit not found")
    
    # Check expiry
    if kit.get("expiry_date"):
        expiry = datetime.fromisoformat(kit["expiry_date"].replace("Z", "+00:00"))
        if datetime.now(timezone.utc) > expiry:
            raise HTTPException(status_code=410, detail="Press kit has expired")
    
    # Increment view count
    await db.press_kits.update_one({"id": kit["id"]}, {"$inc": {"view_count": 1}})
    
    # Get public assets only
    asset_ids = kit.get("asset_ids", [])
    if asset_ids:
        assets = await db.press_kit_assets.find(
            {"id": {"$in": asset_ids}, "is_public": True},
            {"_id": 0}
        ).to_list(len(asset_ids))
        kit["assets"] = assets
    
    return kit

# ============== PHASE 9: ALERTS & MONITORING ==============

@marketing_v2_router.get("/monitoring/alerts", response_model=List[MonitoringAlertResponse])
async def get_monitoring_alerts(
    alert_type: Optional[str] = None,
    is_active: Optional[bool] = None,
    user: dict = Depends(get_marketing_auth())
):
    """Get all monitoring alerts"""
    db = get_db()
    query = {}
    if alert_type:
        query["alert_type"] = alert_type
    if is_active is not None:
        query["is_active"] = is_active
    
    alerts = await db.monitoring_alerts.find(query, {"_id": 0}).sort("created_at", -1).to_list(50)
    return alerts

@marketing_v2_router.post("/monitoring/alerts", response_model=MonitoringAlertResponse)
async def create_monitoring_alert(
    data: MonitoringAlertCreate,
    user: dict = Depends(get_marketing_auth())
):
    """Create a new monitoring alert"""
    db = get_db()
    
    alert_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc).isoformat()
    
    alert_doc = {
        "id": alert_id,
        **data.model_dump(),
        "trigger_count": 0,
        "created_at": now,
    }
    
    await db.monitoring_alerts.insert_one(alert_doc)
    del alert_doc["_id"]
    return alert_doc

@marketing_v2_router.put("/monitoring/alerts/{alert_id}")
async def update_monitoring_alert(
    alert_id: str,
    data: MonitoringAlertCreate,
    user: dict = Depends(get_marketing_auth())
):
    """Update a monitoring alert"""
    db = get_db()
    
    result = await db.monitoring_alerts.update_one({"id": alert_id}, {"$set": data.model_dump()})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Alert not found")
    
    return {"message": "Alert updated"}

@marketing_v2_router.delete("/monitoring/alerts/{alert_id}")
async def delete_monitoring_alert(
    alert_id: str,
    user: dict = Depends(get_marketing_auth())
):
    """Delete a monitoring alert"""
    db = get_db()
    
    result = await db.monitoring_alerts.delete_one({"id": alert_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Alert not found")
    
    return {"message": "Alert deleted"}

@marketing_v2_router.put("/monitoring/alerts/{alert_id}/toggle")
async def toggle_monitoring_alert(
    alert_id: str,
    user: dict = Depends(get_marketing_auth())
):
    """Toggle alert active status"""
    db = get_db()
    
    alert = await db.monitoring_alerts.find_one({"id": alert_id})
    if not alert:
        raise HTTPException(status_code=404, detail="Alert not found")
    
    new_status = not alert.get("is_active", True)
    await db.monitoring_alerts.update_one({"id": alert_id}, {"$set": {"is_active": new_status}})
    
    return {"message": f"Alert {'activated' if new_status else 'deactivated'}"}

@marketing_v2_router.get("/monitoring/triggers", response_model=List[AlertTriggerResponse])
async def get_alert_triggers(
    alert_id: Optional[str] = None,
    is_read: Optional[bool] = None,
    limit: int = 50,
    user: dict = Depends(get_marketing_auth())
):
    """Get alert triggers/mentions"""
    db = get_db()
    query = {}
    if alert_id:
        query["alert_id"] = alert_id
    if is_read is not None:
        query["is_read"] = is_read
    
    triggers = await db.alert_triggers.find(query, {"_id": 0}).sort("created_at", -1).limit(limit).to_list(limit)
    return triggers

@marketing_v2_router.post("/monitoring/triggers", response_model=AlertTriggerResponse)
async def create_alert_trigger(
    data: AlertTriggerCreate,
    user: dict = Depends(get_marketing_auth())
):
    """Manually log an alert trigger/mention"""
    db = get_db()
    
    alert = await db.monitoring_alerts.find_one({"id": data.alert_id}, {"_id": 0})
    if not alert:
        raise HTTPException(status_code=404, detail="Alert not found")
    
    trigger_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc).isoformat()
    
    trigger_doc = {
        "id": trigger_id,
        **data.model_dump(),
        "alert_name": alert.get("name"),
        "is_read": False,
        "is_actioned": False,
        "created_at": now,
    }
    
    await db.alert_triggers.insert_one(trigger_doc)
    del trigger_doc["_id"]
    
    # Update alert stats
    await db.monitoring_alerts.update_one(
        {"id": data.alert_id},
        {"$inc": {"trigger_count": 1}, "$set": {"last_triggered": now}}
    )
    
    return trigger_doc

@marketing_v2_router.put("/monitoring/triggers/{trigger_id}/read")
async def mark_trigger_read(
    trigger_id: str,
    user: dict = Depends(get_marketing_auth())
):
    """Mark a trigger as read"""
    db = get_db()
    
    result = await db.alert_triggers.update_one({"id": trigger_id}, {"$set": {"is_read": True}})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Trigger not found")
    
    return {"message": "Marked as read"}

@marketing_v2_router.put("/monitoring/triggers/{trigger_id}/action")
async def mark_trigger_actioned(
    trigger_id: str,
    user: dict = Depends(get_marketing_auth())
):
    """Mark a trigger as actioned"""
    db = get_db()
    
    result = await db.alert_triggers.update_one(
        {"id": trigger_id},
        {"$set": {"is_read": True, "is_actioned": True}}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Trigger not found")
    
    return {"message": "Marked as actioned"}

@marketing_v2_router.get("/monitoring/stats")
async def get_monitoring_stats(user: dict = Depends(get_marketing_auth())):
    """Get monitoring statistics"""
    db = get_db()
    
    total_alerts = await db.monitoring_alerts.count_documents({})
    active_alerts = await db.monitoring_alerts.count_documents({"is_active": True})
    total_triggers = await db.alert_triggers.count_documents({})
    unread_triggers = await db.alert_triggers.count_documents({"is_read": False})
    
    # Triggers by sentiment
    positive_triggers = await db.alert_triggers.count_documents({"sentiment": "positive"})
    negative_triggers = await db.alert_triggers.count_documents({"sentiment": "negative"})
    
    # Recent triggers
    recent = await db.alert_triggers.find({}, {"_id": 0}).sort("created_at", -1).limit(5).to_list(5)
    
    return {
        "alerts": {
            "total": total_alerts,
            "active": active_alerts
        },
        "triggers": {
            "total": total_triggers,
            "unread": unread_triggers,
            "positive": positive_triggers,
            "negative": negative_triggers
        },
        "recent_triggers": recent
    }

# ============== PHASE 10: PIPELINE VIEW ==============

@marketing_v2_router.get("/pipeline/contacts")
async def get_pipeline_contacts(
    pr_campaign_id: Optional[str] = None,
    stage: Optional[str] = None,
    user: dict = Depends(get_marketing_auth())
):
    """Get contacts in pipeline format"""
    db = get_db()
    
    query = {"contact_type": "journalist"}
    if stage:
        query["pipeline_stage"] = stage
    
    # If campaign specified, only get journalists in that campaign
    if pr_campaign_id:
        campaign = await db.pr_campaigns.find_one({"id": pr_campaign_id})
        if campaign:
            journalist_ids = campaign.get("journalist_ids", [])
            if journalist_ids:
                query["id"] = {"$in": journalist_ids}
    
    contacts = await db.contacts.find(query, {"_id": 0}).to_list(500)
    
    # Group by stage
    stages = ["prospect", "researching", "contacted", "replied", "interested", "negotiating", "confirmed", "published", "declined"]
    pipeline = {}
    
    for stage_name in stages:
        stage_contacts = [c for c in contacts if c.get("pipeline_stage", "prospect") == stage_name]
        pipeline[stage_name] = {
            "count": len(stage_contacts),
            "contacts": stage_contacts
        }
    
    return pipeline

@marketing_v2_router.get("/pipeline/board")
async def get_pipeline_board(
    pr_campaign_id: Optional[str] = None,
    user: dict = Depends(get_marketing_auth())
):
    """Get Kanban-style pipeline board"""
    db = get_db()
    
    query = {"contact_type": "journalist"}
    
    if pr_campaign_id:
        campaign = await db.pr_campaigns.find_one({"id": pr_campaign_id})
        if campaign:
            journalist_ids = campaign.get("journalist_ids", [])
            if journalist_ids:
                query["id"] = {"$in": journalist_ids}
    
    contacts = await db.contacts.find(query, {"_id": 0}).to_list(500)
    
    # Define stages with display names
    stages = [
        {"id": "prospect", "name": "Prospect", "color": "gray"},
        {"id": "researching", "name": "Researching", "color": "blue"},
        {"id": "contacted", "name": "Contacted", "color": "purple"},
        {"id": "replied", "name": "Replied", "color": "amber"},
        {"id": "interested", "name": "Interested", "color": "green"},
        {"id": "negotiating", "name": "Negotiating", "color": "orange"},
        {"id": "confirmed", "name": "Confirmed", "color": "emerald"},
        {"id": "published", "name": "Published", "color": "teal"},
        {"id": "declined", "name": "Declined", "color": "red"},
    ]
    
    board = []
    for stage in stages:
        stage_contacts = [c for c in contacts if c.get("pipeline_stage", "prospect") == stage["id"]]
        
        # Calculate days in stage for each contact
        for c in stage_contacts:
            if c.get("stage_entered_at"):
                entered = datetime.fromisoformat(c["stage_entered_at"].replace("Z", "+00:00"))
                days = (datetime.now(timezone.utc) - entered).days
                c["days_in_stage"] = days
            else:
                c["days_in_stage"] = 0
        
        board.append({
            **stage,
            "count": len(stage_contacts),
            "contacts": stage_contacts
        })
    
    return board

@marketing_v2_router.put("/pipeline/contacts/{contact_id}/stage")
async def update_pipeline_stage(
    contact_id: str,
    stage: str,
    notes: Optional[str] = None,
    user: dict = Depends(get_marketing_auth())
):
    """Move contact to a different pipeline stage"""
    db = get_db()
    
    valid_stages = ["prospect", "researching", "contacted", "replied", "interested", "negotiating", "confirmed", "published", "declined"]
    if stage not in valid_stages:
        raise HTTPException(status_code=400, detail=f"Invalid stage. Must be one of: {valid_stages}")
    
    now = datetime.now(timezone.utc).isoformat()
    
    update_data = {
        "pipeline_stage": stage,
        "stage_entered_at": now,
    }
    
    # Also update the contact status to match certain stages
    status_mapping = {
        "contacted": "contacted",
        "replied": "contacted",
        "interested": "interested",
        "confirmed": "confirmed",
    }
    if stage in status_mapping:
        update_data["status"] = status_mapping[stage]
    
    result = await db.contacts.update_one({"id": contact_id}, {"$set": update_data})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Contact not found")
    
    # Log the stage change as an interaction
    contact = await db.contacts.find_one({"id": contact_id})
    await db.interactions.insert_one({
        "id": str(uuid.uuid4()),
        "contact_id": contact_id,
        "contact_name": contact.get("name") if contact else None,
        "interaction_type": "note",
        "notes": f"Moved to '{stage}' stage" + (f": {notes}" if notes else ""),
        "created_by": user.get("id"),
        "created_by_name": user.get("name"),
        "created_at": now
    })
    
    return {"message": f"Contact moved to {stage}"}

@marketing_v2_router.post("/pipeline/bulk-move")
async def bulk_move_pipeline(
    contact_ids: List[str],
    stage: str,
    user: dict = Depends(get_marketing_auth())
):
    """Move multiple contacts to a pipeline stage"""
    db = get_db()
    
    valid_stages = ["prospect", "researching", "contacted", "replied", "interested", "negotiating", "confirmed", "published", "declined"]
    if stage not in valid_stages:
        raise HTTPException(status_code=400, detail="Invalid stage")
    
    now = datetime.now(timezone.utc).isoformat()
    
    result = await db.contacts.update_many(
        {"id": {"$in": contact_ids}},
        {"$set": {"pipeline_stage": stage, "stage_entered_at": now}}
    )
    
    return {"message": f"Moved {result.modified_count} contacts to {stage}"}

@marketing_v2_router.get("/pipeline/stats")
async def get_pipeline_stats(
    pr_campaign_id: Optional[str] = None,
    user: dict = Depends(get_marketing_auth())
):
    """Get pipeline statistics"""
    db = get_db()
    
    query = {"contact_type": "journalist"}
    
    if pr_campaign_id:
        campaign = await db.pr_campaigns.find_one({"id": pr_campaign_id})
        if campaign:
            journalist_ids = campaign.get("journalist_ids", [])
            if journalist_ids:
                query["id"] = {"$in": journalist_ids}
    
    contacts = await db.contacts.find(query, {"_id": 0}).to_list(500)
    
    total = len(contacts)
    stage_counts = {}
    for c in contacts:
        stage = c.get("pipeline_stage", "prospect")
        stage_counts[stage] = stage_counts.get(stage, 0) + 1
    
    # Calculate conversion rates
    contacted = stage_counts.get("contacted", 0) + stage_counts.get("replied", 0) + stage_counts.get("interested", 0) + stage_counts.get("negotiating", 0) + stage_counts.get("confirmed", 0) + stage_counts.get("published", 0)
    responded = stage_counts.get("replied", 0) + stage_counts.get("interested", 0) + stage_counts.get("negotiating", 0) + stage_counts.get("confirmed", 0) + stage_counts.get("published", 0)
    published = stage_counts.get("published", 0)
    
    return {
        "total": total,
        "by_stage": stage_counts,
        "conversion": {
            "contact_rate": (contacted / total * 100) if total > 0 else 0,
            "response_rate": (responded / contacted * 100) if contacted > 0 else 0,
            "publish_rate": (published / total * 100) if total > 0 else 0
        }
    }


# ============== UNIFIED OUTREACH SEQUENCES ==============

@marketing_v2_router.get("/sequences")
async def get_sequences(
    target_type: Optional[str] = None,
    is_active: Optional[bool] = None,
    user: dict = Depends(get_marketing_auth())
):
    """Get all outreach sequences (for both influencers and journalists)"""
    db = get_db()
    
    query = {}
    if target_type:
        query["target_type"] = {"$in": [target_type, "both"]}
    if is_active is not None:
        query["is_active"] = is_active
    
    sequences = await db.outreach_sequences.find(query, {"_id": 0}).sort("created_at", -1).to_list(100)
    
    # Enrich with enrollment stats
    for seq in sequences:
        seq["enrolled_count"] = await db.sequence_enrollments.count_documents({"sequence_id": seq["id"]})
        seq["completed_count"] = await db.sequence_enrollments.count_documents({"sequence_id": seq["id"], "status": "completed"})
        seq["response_count"] = await db.sequence_enrollments.count_documents({"sequence_id": seq["id"], "has_response": True})
    
    return sequences

@marketing_v2_router.post("/sequences")
async def create_sequence(data: UnifiedSequenceCreate, user: dict = Depends(get_marketing_auth())):
    """Create a new outreach sequence"""
    db = get_db()
    
    sequence_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc).isoformat()
    
    sequence_doc = {
        "id": sequence_id,
        **data.model_dump(),
        "enrolled_count": 0,
        "completed_count": 0,
        "response_count": 0,
        "created_by": user.get("id"),
        "created_at": now,
    }
    
    await db.outreach_sequences.insert_one(sequence_doc)
    del sequence_doc["_id"]
    return sequence_doc

@marketing_v2_router.get("/sequences/{sequence_id}")
async def get_sequence(sequence_id: str, user: dict = Depends(get_marketing_auth())):
    """Get a single sequence with enrollments"""
    db = get_db()
    
    sequence = await db.outreach_sequences.find_one({"id": sequence_id}, {"_id": 0})
    if not sequence:
        raise HTTPException(status_code=404, detail="Sequence not found")
    
    # Get enrollments
    enrollments = await db.sequence_enrollments.find({"sequence_id": sequence_id}, {"_id": 0}).to_list(500)
    
    # Enrich enrollments with contact info
    for enrollment in enrollments:
        contact = await db.contacts.find_one({"id": enrollment.get("contact_id")})
        if contact:
            enrollment["contact_name"] = contact.get("name")
            enrollment["contact_type"] = contact.get("contact_type")
    
    sequence["enrollments"] = enrollments
    return sequence

@marketing_v2_router.post("/sequences/{sequence_id}/enroll")
async def enroll_in_sequence(sequence_id: str, data: SequenceEnrollmentCreate, user: dict = Depends(get_marketing_auth())):
    """Enroll a contact in an outreach sequence"""
    db = get_db()
    
    # Verify sequence exists
    sequence = await db.outreach_sequences.find_one({"id": sequence_id})
    if not sequence:
        raise HTTPException(status_code=404, detail="Sequence not found")
    
    # Verify contact exists
    contact = await db.contacts.find_one({"id": data.contact_id})
    if not contact:
        raise HTTPException(status_code=404, detail="Contact not found")
    
    # Check if already enrolled
    existing = await db.sequence_enrollments.find_one({
        "sequence_id": sequence_id,
        "contact_id": data.contact_id,
        "status": {"$in": ["active", "paused"]}
    })
    if existing:
        raise HTTPException(status_code=400, detail="Contact already enrolled in this sequence")
    
    enrollment_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc).isoformat()
    
    # Calculate next action time based on first step
    steps = sequence.get("steps", [])
    first_step = steps[0] if steps else {}
    delay_days = first_step.get("delay_days", 0)
    next_action = (datetime.now(timezone.utc) + timedelta(days=delay_days)).isoformat() if data.start_immediately else None
    
    enrollment_doc = {
        "id": enrollment_id,
        "sequence_id": sequence_id,
        "sequence_name": sequence.get("name"),
        "contact_id": data.contact_id,
        "contact_name": contact.get("name"),
        "contact_type": contact.get("contact_type"),
        "campaign_id": data.campaign_id,
        "current_step": 0,
        "status": "active",
        "has_response": False,
        "next_action_at": next_action,
        "enrolled_at": now,
        "enrolled_by": user.get("id"),
    }
    
    await db.sequence_enrollments.insert_one(enrollment_doc)
    
    # Update sequence enrolled count
    await db.outreach_sequences.update_one(
        {"id": sequence_id},
        {"$inc": {"enrolled_count": 1}}
    )
    
    del enrollment_doc["_id"]
    return enrollment_doc

@marketing_v2_router.put("/sequences/enrollments/{enrollment_id}/status")
async def update_enrollment_status(enrollment_id: str, status: str, user: dict = Depends(get_marketing_auth())):
    """Update enrollment status (pause, resume, stop)"""
    db = get_db()
    
    enrollment = await db.sequence_enrollments.find_one({"id": enrollment_id})
    if not enrollment:
        raise HTTPException(status_code=404, detail="Enrollment not found")
    
    update_data = {"status": status}
    if status == "completed":
        update_data["completed_at"] = datetime.now(timezone.utc).isoformat()
        # Update sequence completed count
        await db.outreach_sequences.update_one(
            {"id": enrollment["sequence_id"]},
            {"$inc": {"completed_count": 1}}
        )
    
    await db.sequence_enrollments.update_one({"id": enrollment_id}, {"$set": update_data})
    return {"message": f"Enrollment status updated to {status}"}

@marketing_v2_router.post("/sequences/enrollments/{enrollment_id}/advance")
async def advance_enrollment_step(enrollment_id: str, user: dict = Depends(get_marketing_auth())):
    """Advance enrollment to next step in sequence"""
    db = get_db()
    
    enrollment = await db.sequence_enrollments.find_one({"id": enrollment_id})
    if not enrollment:
        raise HTTPException(status_code=404, detail="Enrollment not found")
    
    sequence = await db.outreach_sequences.find_one({"id": enrollment["sequence_id"]})
    if not sequence:
        raise HTTPException(status_code=404, detail="Sequence not found")
    
    steps = sequence.get("steps", [])
    current_step = enrollment.get("current_step", 0)
    
    if current_step >= len(steps) - 1:
        # Complete the sequence
        await db.sequence_enrollments.update_one(
            {"id": enrollment_id},
            {"$set": {"status": "completed", "completed_at": datetime.now(timezone.utc).isoformat()}}
        )
        await db.outreach_sequences.update_one(
            {"id": enrollment["sequence_id"]},
            {"$inc": {"completed_count": 1}}
        )
        return {"message": "Sequence completed", "completed": True}
    
    # Advance to next step
    next_step = current_step + 1
    next_step_data = steps[next_step] if next_step < len(steps) else {}
    delay_days = next_step_data.get("delay_days", 1)
    next_action = (datetime.now(timezone.utc) + timedelta(days=delay_days)).isoformat()
    
    await db.sequence_enrollments.update_one(
        {"id": enrollment_id},
        {"$set": {"current_step": next_step, "next_action_at": next_action}}
    )
    
    return {"message": f"Advanced to step {next_step + 1}", "next_step": next_step, "next_action_at": next_action}

# ============== UNIFIED ACTIVITY FEED ==============

@marketing_v2_router.get("/activity-feed")
async def get_activity_feed(
    contact_id: Optional[str] = None,
    campaign_id: Optional[str] = None,
    activity_type: Optional[str] = None,
    limit: int = 50,
    user: dict = Depends(get_marketing_auth())
):
    """Get unified activity feed from all modules"""
    db = get_db()
    
    activities = []
    
    # Build query filters
    comm_query = {}
    deal_query = {}
    payment_query = {}
    pitch_query = {}
    interaction_query = {}
    
    if contact_id:
        comm_query["contact_id"] = contact_id
        deal_query["contact_id"] = contact_id
        payment_query["contact_id"] = contact_id
        pitch_query["journalist_id"] = contact_id
        interaction_query["contact_id"] = contact_id
    
    if campaign_id:
        comm_query["campaign_id"] = campaign_id
        deal_query["campaign_id"] = campaign_id
        payment_query["campaign_id"] = campaign_id
        pitch_query["campaign_id"] = campaign_id
        interaction_query["related_campaign_id"] = campaign_id
    
    # Communications
    if not activity_type or activity_type == "communication":
        comms = await db.communications.find(comm_query, {"_id": 0}).sort("sent_at", -1).limit(limit).to_list(limit)
        for c in comms:
            activities.append({
                "id": c.get("id"),
                "activity_type": "communication",
                "title": f"Outreach sent via {c.get('channel', 'email')}",
                "description": c.get("subject") or c.get("message", "")[:100],
                "contact_id": c.get("contact_id"),
                "contact_name": c.get("contact_name"),
                "campaign_id": c.get("campaign_id"),
                "reference_id": c.get("id"),
                "metadata": {"channel": c.get("channel"), "status": c.get("status")},
                "created_at": c.get("sent_at")
            })
    
    # Deals
    if not activity_type or activity_type == "deal":
        deals = await db.deals.find(deal_query, {"_id": 0}).sort("created_at", -1).limit(limit).to_list(limit)
        for d in deals:
            contact = await db.contacts.find_one({"id": d.get("contact_id")})
            activities.append({
                "id": d.get("id"),
                "activity_type": "deal",
                "title": f"Deal {d.get('status', 'created')}",
                "description": f"₹{d.get('proposed_amount', 0):,.0f} - {d.get('deliverables', [])}",
                "contact_id": d.get("contact_id"),
                "contact_name": contact.get("name") if contact else None,
                "campaign_id": d.get("campaign_id"),
                "reference_id": d.get("id"),
                "metadata": {"status": d.get("status"), "amount": d.get("final_amount") or d.get("proposed_amount")},
                "created_at": d.get("created_at")
            })
    
    # Payments
    if not activity_type or activity_type == "payment":
        payments = await db.payments.find(payment_query, {"_id": 0}).sort("created_at", -1).limit(limit).to_list(limit)
        for p in payments:
            activities.append({
                "id": p.get("id"),
                "activity_type": "payment",
                "title": f"Payment {p.get('status', 'created')}",
                "description": f"₹{p.get('amount', 0):,.0f} - {p.get('description', '')}",
                "contact_id": p.get("contact_id"),
                "contact_name": p.get("contact_name"),
                "campaign_id": p.get("campaign_id"),
                "campaign_name": p.get("campaign_name"),
                "reference_id": p.get("id"),
                "metadata": {"status": p.get("status"), "amount": p.get("amount")},
                "created_at": p.get("created_at")
            })
    
    # PR Pitches
    if not activity_type or activity_type == "pitch":
        pitches = await db.pr_pitches.find(pitch_query, {"_id": 0}).sort("sent_at", -1).limit(limit).to_list(limit)
        for p in pitches:
            activities.append({
                "id": p.get("id"),
                "activity_type": "pitch",
                "title": f"PR Pitch {p.get('status', 'sent')}",
                "description": p.get("subject", ""),
                "contact_id": p.get("journalist_id"),
                "contact_name": p.get("journalist_name"),
                "campaign_id": p.get("campaign_id"),
                "reference_id": p.get("id"),
                "metadata": {"status": p.get("status"), "publication": p.get("publication_name")},
                "created_at": p.get("sent_at")
            })
    
    # Interactions
    if not activity_type or activity_type == "interaction":
        interactions = await db.interactions.find(interaction_query, {"_id": 0}).sort("created_at", -1).limit(limit).to_list(limit)
        for i in interactions:
            activities.append({
                "id": i.get("id"),
                "activity_type": "interaction",
                "title": f"{i.get('interaction_type', 'note').title()} logged",
                "description": i.get("notes", "")[:100],
                "contact_id": i.get("contact_id"),
                "contact_name": i.get("contact_name"),
                "campaign_id": i.get("related_campaign_id"),
                "reference_id": i.get("id"),
                "metadata": {"type": i.get("interaction_type"), "outcome": i.get("outcome")},
                "created_at": i.get("created_at")
            })
    
    # Media Coverage
    if not activity_type or activity_type == "coverage":
        coverages = await db.media_coverage.find({} if not campaign_id else {"campaign_id": campaign_id}, {"_id": 0}).sort("created_at", -1).limit(limit).to_list(limit)
        for c in coverages:
            activities.append({
                "id": c.get("id"),
                "activity_type": "coverage",
                "title": f"Media Coverage: {c.get('title', '')}",
                "description": f"{c.get('publication_name', '')} - {c.get('coverage_type', '')}",
                "contact_id": c.get("journalist_id"),
                "campaign_id": c.get("campaign_id"),
                "reference_id": c.get("id"),
                "metadata": {"type": c.get("coverage_type"), "sentiment": c.get("sentiment")},
                "created_at": c.get("created_at")
            })
    
    # Sort all by created_at descending (handle None values)
    activities.sort(key=lambda x: x.get("created_at") or "", reverse=True)
    
    return activities[:limit]

@marketing_v2_router.get("/activity-feed/stats")
async def get_activity_stats(
    campaign_id: Optional[str] = None,
    days: int = 30,
    user: dict = Depends(get_marketing_auth())
):
    """Get activity statistics for dashboard"""
    db = get_db()
    
    cutoff_date = (datetime.now(timezone.utc) - timedelta(days=days)).isoformat()
    
    query_base = {"created_at": {"$gte": cutoff_date}}
    if campaign_id:
        query_base["campaign_id"] = campaign_id
    
    # Count activities by type
    comms_count = await db.communications.count_documents({**query_base} if "campaign_id" not in query_base else {"campaign_id": campaign_id, "sent_at": {"$gte": cutoff_date}})
    deals_count = await db.deals.count_documents(query_base)
    payments_count = await db.payments.count_documents(query_base)
    pitches_count = await db.pr_pitches.count_documents({**query_base} if "campaign_id" not in query_base else {"campaign_id": campaign_id, "sent_at": {"$gte": cutoff_date}})
    interactions_count = await db.interactions.count_documents(query_base)
    coverages_count = await db.media_coverage.count_documents(query_base)
    
    return {
        "period_days": days,
        "total_activities": comms_count + deals_count + payments_count + pitches_count + interactions_count + coverages_count,
        "by_type": {
            "communications": comms_count,
            "deals": deals_count,
            "payments": payments_count,
            "pitches": pitches_count,
            "interactions": interactions_count,
            "coverages": coverages_count
        }
    }

# ============== ADVERTORIALS / PAID PLACEMENTS ==============

@marketing_v2_router.get("/advertorials")
async def get_advertorials(
    publication_id: Optional[str] = None,
    campaign_id: Optional[str] = None,
    status: Optional[str] = None,
    user: dict = Depends(get_marketing_auth())
):
    """Get all advertorial/paid placement deals"""
    db = get_db()
    
    query = {}
    if publication_id:
        query["publication_id"] = publication_id
    if campaign_id:
        query["campaign_id"] = campaign_id
    if status:
        query["status"] = status
    
    advertorials = await db.advertorials.find(query, {"_id": 0}).sort("created_at", -1).to_list(100)
    
    # Enrich with publication and campaign names
    for ad in advertorials:
        pub = await db.publications.find_one({"id": ad.get("publication_id")})
        if pub:
            ad["publication_name"] = pub.get("name")
        
        if ad.get("campaign_id"):
            campaign = await db.pr_campaigns.find_one({"id": ad["campaign_id"]})
            if not campaign:
                campaign = await db.campaigns.find_one({"id": ad["campaign_id"]})
            if campaign:
                ad["campaign_name"] = campaign.get("name")
        
        if ad.get("journalist_id"):
            journalist = await db.contacts.find_one({"id": ad["journalist_id"]})
            if journalist:
                ad["journalist_name"] = journalist.get("name")
    
    return advertorials

@marketing_v2_router.post("/advertorials", response_model=AdvertorialResponse)
async def create_advertorial(data: AdvertorialCreate, user: dict = Depends(get_marketing_auth())):
    """Create a new advertorial/paid placement deal"""
    db = get_db()
    
    # Verify publication exists
    publication = await db.publications.find_one({"id": data.publication_id})
    if not publication:
        raise HTTPException(status_code=404, detail="Publication not found")
    
    advertorial_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc).isoformat()
    
    advertorial_doc = {
        "id": advertorial_id,
        **data.model_dump(),
        "publication_name": publication.get("name"),
        "status": "proposed",
        "payment_status": "pending",
        "timeline": [{"event": "created", "date": now, "by": user.get("email")}],
        "created_by": user.get("id"),
        "created_at": now,
    }
    
    # Get journalist name if provided
    if data.journalist_id:
        journalist = await db.contacts.find_one({"id": data.journalist_id})
        if journalist:
            advertorial_doc["journalist_name"] = journalist.get("name")
    
    # Get campaign name if provided
    if data.campaign_id:
        campaign = await db.pr_campaigns.find_one({"id": data.campaign_id})
        if not campaign:
            campaign = await db.campaigns.find_one({"id": data.campaign_id})
        if campaign:
            advertorial_doc["campaign_name"] = campaign.get("name")
    
    await db.advertorials.insert_one(advertorial_doc)
    del advertorial_doc["_id"]
    return advertorial_doc

@marketing_v2_router.get("/advertorials/{advertorial_id}")
async def get_advertorial(advertorial_id: str, user: dict = Depends(get_marketing_auth())):
    """Get a single advertorial with full details"""
    db = get_db()
    
    advertorial = await db.advertorials.find_one({"id": advertorial_id}, {"_id": 0})
    if not advertorial:
        raise HTTPException(status_code=404, detail="Advertorial not found")
    
    # Get related payments
    payments = await db.payments.find({"deliverable_id": advertorial_id, "deliverable_type": "advertorial"}, {"_id": 0}).to_list(100)
    advertorial["payments"] = payments
    
    return advertorial

@marketing_v2_router.put("/advertorials/{advertorial_id}/status")
async def update_advertorial_status(
    advertorial_id: str, 
    status: str, 
    note: Optional[str] = None,
    final_amount: Optional[float] = None,
    user: dict = Depends(get_marketing_auth())
):
    """Update advertorial status"""
    db = get_db()
    
    advertorial = await db.advertorials.find_one({"id": advertorial_id})
    if not advertorial:
        raise HTTPException(status_code=404, detail="Advertorial not found")
    
    now = datetime.now(timezone.utc).isoformat()
    timeline_entry = {"event": f"status_changed_to_{status}", "date": now, "by": user.get("email")}
    if note:
        timeline_entry["note"] = note
    
    update_data = {"status": status, "updated_at": now}
    if final_amount:
        update_data["final_amount"] = final_amount
    if status == "published":
        update_data["published_at"] = now
    
    await db.advertorials.update_one(
        {"id": advertorial_id},
        {"$set": update_data, "$push": {"timeline": timeline_entry}}
    )
    
    return {"message": f"Advertorial status updated to {status}"}

@marketing_v2_router.get("/publications/{publication_id}/advertorials")
async def get_publication_advertorials(publication_id: str, user: dict = Depends(get_marketing_auth())):
    """Get all advertorials for a specific publication"""
    db = get_db()
    
    advertorials = await db.advertorials.find({"publication_id": publication_id}, {"_id": 0}).sort("created_at", -1).to_list(100)
    
    # Calculate totals
    total_value = sum(ad.get("final_amount") or ad.get("proposed_amount", 0) for ad in advertorials)
    confirmed_value = sum(ad.get("final_amount") or ad.get("proposed_amount", 0) for ad in advertorials if ad.get("status") in ["confirmed", "in_progress", "published"])
    
    return {
        "advertorials": advertorials,
        "stats": {
            "total_count": len(advertorials),
            "total_value": total_value,
            "confirmed_value": confirmed_value,
            "by_status": {
                "proposed": len([a for a in advertorials if a.get("status") == "proposed"]),
                "negotiating": len([a for a in advertorials if a.get("status") == "negotiating"]),
                "confirmed": len([a for a in advertorials if a.get("status") == "confirmed"]),
                "in_progress": len([a for a in advertorials if a.get("status") == "in_progress"]),
                "published": len([a for a in advertorials if a.get("status") == "published"]),
            }
        }
    }

