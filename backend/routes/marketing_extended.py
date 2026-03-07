"""
Extended Marketing Routes - Gifting, Contracts, Promo Codes, Content Approval, etc.
"""

from fastapi import APIRouter, HTTPException, Query, Request
from typing import List, Optional
import uuid
import random
import string
from datetime import datetime, timezone
import urllib.parse

from models.marketing_extended import (
    # Gifting
    GiftingCreate, GiftingResponse,
    # Promo Codes
    PromoCodeCreate, PromoCodeResponse,
    # UTM Links
    UTMLinkCreate, UTMLinkResponse,
    # Contracts
    ContractTemplateCreate, ContractTemplateResponse,
    InfluencerContractCreate, InfluencerContractResponse,
    # Content Approval
    ContentSubmissionCreate, ContentSubmissionResponse,
    # Brand Safety
    BrandSafetyCheckCreate, BrandSafetyCheckResponse,
    # Sentiment
    SentimentAnalysisCreate, SentimentAnalysisResponse,
    # Availability
    AvailabilitySlot, AvailabilityResponse,
    # Reports
    CampaignReportResponse, RelationshipScoreResponse,
)

marketing_extended_router = APIRouter(prefix="/marketing/v2", tags=["Marketing Extended"])

def get_db():
    from server import db
    return db

# ============== GIFTING/SEEDING ==============

@marketing_extended_router.get("/gifting", response_model=List[GiftingResponse])
async def get_all_gifting(
    contact_id: Optional[str] = None,
    campaign_id: Optional[str] = None,
    status: Optional[str] = None,
    limit: int = 100,
):
    """Get all gifting/seeding records"""
    db = get_db()
    query = {}
    if contact_id:
        query["contact_id"] = contact_id
    if campaign_id:
        query["campaign_id"] = campaign_id
    if status:
        query["status"] = status
    
    records = await db.gifting.find(query, {"_id": 0}).sort("created_at", -1).limit(limit).to_list(limit)
    return records

@marketing_extended_router.post("/gifting", response_model=GiftingResponse)
async def create_gifting(data: GiftingCreate):
    """Create a new gifting/seeding record"""
    db = get_db()
    
    contact = await db.contacts.find_one({"id": data.contact_id})
    if not contact:
        raise HTTPException(status_code=404, detail="Contact not found")
    
    campaign_name = None
    if data.campaign_id:
        campaign = await db.campaigns.find_one({"id": data.campaign_id})
        campaign_name = campaign.get("name") if campaign else None
    
    gift_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc).isoformat()
    
    gift_doc = {
        "id": gift_id,
        **data.model_dump(),
        "contact_name": contact.get("name"),
        "campaign_name": campaign_name,
        "status": "planned",
        "created_at": now,
    }
    
    await db.gifting.insert_one(gift_doc)
    del gift_doc["_id"]
    return gift_doc

@marketing_extended_router.put("/gifting/{gift_id}/status")
async def update_gifting_status(gift_id: str, status: str, post_url: Optional[str] = None):
    """Update gifting status"""
    db = get_db()
    
    update_data = {"status": status}
    now = datetime.now(timezone.utc).isoformat()
    
    if status == "shipped":
        update_data["shipped_date"] = now
    elif status == "delivered":
        update_data["delivered_date"] = now
    elif status == "posted" and post_url:
        update_data["actual_post_date"] = now
        update_data["post_url"] = post_url
    
    result = await db.gifting.update_one({"id": gift_id}, {"$set": update_data})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Gift record not found")
    
    return {"message": f"Status updated to {status}"}

# ============== PROMO CODES ==============

def generate_promo_code(prefix: str = "SEVORA", length: int = 6) -> str:
    """Generate a unique promo code"""
    chars = string.ascii_uppercase + string.digits
    suffix = ''.join(random.choices(chars, k=length))
    return f"{prefix}{suffix}"

@marketing_extended_router.get("/promo-codes", response_model=List[PromoCodeResponse])
async def get_promo_codes(
    contact_id: Optional[str] = None,
    campaign_id: Optional[str] = None,
    is_active: Optional[bool] = None,
    limit: int = 100,
):
    """Get all promo codes"""
    db = get_db()
    query = {}
    if contact_id:
        query["contact_id"] = contact_id
    if campaign_id:
        query["campaign_id"] = campaign_id
    if is_active is not None:
        query["is_active"] = is_active
    
    codes = await db.promo_codes.find(query, {"_id": 0}).sort("created_at", -1).limit(limit).to_list(limit)
    return codes

@marketing_extended_router.post("/promo-codes", response_model=PromoCodeResponse)
async def create_promo_code(data: PromoCodeCreate):
    """Create a new promo code"""
    db = get_db()
    
    contact = await db.contacts.find_one({"id": data.contact_id})
    if not contact:
        raise HTTPException(status_code=404, detail="Contact not found")
    
    # Generate code if not provided
    code = data.code
    if not code:
        # Use influencer name for prefix
        prefix = contact.get("name", "SEVORA")[:6].upper().replace(" ", "")
        code = generate_promo_code(prefix)
        
        # Ensure uniqueness
        while await db.promo_codes.find_one({"code": code}):
            code = generate_promo_code(prefix)
    
    campaign_name = None
    if data.campaign_id:
        campaign = await db.campaigns.find_one({"id": data.campaign_id})
        campaign_name = campaign.get("name") if campaign else None
    
    code_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc).isoformat()
    
    code_doc = {
        "id": code_id,
        **data.model_dump(),
        "code": code,
        "contact_name": contact.get("name"),
        "campaign_name": campaign_name,
        "current_uses": 0,
        "total_revenue": 0.0,
        "is_active": True,
        "created_at": now,
    }
    
    await db.promo_codes.insert_one(code_doc)
    del code_doc["_id"]
    return code_doc

@marketing_extended_router.put("/promo-codes/{code_id}/use")
async def record_promo_code_use(code_id: str, revenue: float = 0.0):
    """Record a promo code use"""
    db = get_db()
    
    result = await db.promo_codes.update_one(
        {"id": code_id},
        {
            "$inc": {"current_uses": 1, "total_revenue": revenue}
        }
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Promo code not found")
    
    return {"message": "Use recorded"}

# ============== UTM LINKS ==============

@marketing_extended_router.get("/utm-links", response_model=List[UTMLinkResponse])
async def get_utm_links(
    contact_id: Optional[str] = None,
    campaign_id: Optional[str] = None,
    limit: int = 100,
):
    """Get all UTM links"""
    db = get_db()
    query = {}
    if contact_id:
        query["contact_id"] = contact_id
    if campaign_id:
        query["campaign_id"] = campaign_id
    
    links = await db.utm_links.find(query, {"_id": 0}).sort("created_at", -1).limit(limit).to_list(limit)
    return links

@marketing_extended_router.post("/utm-links", response_model=UTMLinkResponse)
async def create_utm_link(data: UTMLinkCreate):
    """Create a new UTM tracking link"""
    db = get_db()
    
    contact = await db.contacts.find_one({"id": data.contact_id})
    if not contact:
        raise HTTPException(status_code=404, detail="Contact not found")
    
    # Build UTM parameters
    utm_params = {
        "utm_source": data.utm_source,
        "utm_medium": data.utm_medium,
    }
    if data.utm_campaign:
        utm_params["utm_campaign"] = data.utm_campaign
    else:
        # Use contact name as campaign identifier
        utm_params["utm_campaign"] = contact.get("name", "").lower().replace(" ", "_")
    
    if data.utm_content:
        utm_params["utm_content"] = data.utm_content
    else:
        utm_params["utm_content"] = data.contact_id[:8]
    
    # Build full URL
    separator = "&" if "?" in data.base_url else "?"
    params_string = urllib.parse.urlencode(utm_params)
    full_url = f"{data.base_url}{separator}{params_string}"
    
    link_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc).isoformat()
    
    link_doc = {
        "id": link_id,
        **data.model_dump(),
        "contact_name": contact.get("name"),
        "full_url": full_url,
        "short_url": None,  # Can integrate with URL shortener later
        "clicks": 0,
        "created_at": now,
    }
    
    await db.utm_links.insert_one(link_doc)
    del link_doc["_id"]
    return link_doc

# ============== CONTRACT TEMPLATES ==============

@marketing_extended_router.get("/contract-templates", response_model=List[ContractTemplateResponse])
async def get_contract_templates(category: Optional[str] = None):
    """Get all contract templates"""
    db = get_db()
    query = {}
    if category:
        query["category"] = category
    
    templates = await db.contract_templates.find(query, {"_id": 0}).to_list(100)
    return templates

@marketing_extended_router.post("/contract-templates", response_model=ContractTemplateResponse)
async def create_contract_template(data: ContractTemplateCreate):
    """Create a new contract template"""
    db = get_db()
    
    template_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc).isoformat()
    
    template_doc = {
        "id": template_id,
        **data.model_dump(),
        "usage_count": 0,
        "created_at": now,
    }
    
    await db.contract_templates.insert_one(template_doc)
    del template_doc["_id"]
    return template_doc

# ============== INFLUENCER CONTRACTS ==============

@marketing_extended_router.get("/contracts", response_model=List[InfluencerContractResponse])
async def get_contracts(
    contact_id: Optional[str] = None,
    campaign_id: Optional[str] = None,
    status: Optional[str] = None,
    limit: int = 100,
):
    """Get all influencer contracts"""
    db = get_db()
    query = {}
    if contact_id:
        query["contact_id"] = contact_id
    if campaign_id:
        query["campaign_id"] = campaign_id
    if status:
        query["status"] = status
    
    contracts = await db.influencer_contracts.find(query, {"_id": 0}).sort("created_at", -1).limit(limit).to_list(limit)
    return contracts

@marketing_extended_router.post("/contracts", response_model=InfluencerContractResponse)
async def create_contract(data: InfluencerContractCreate):
    """Create a new influencer contract"""
    db = get_db()
    
    contact = await db.contacts.find_one({"id": data.contact_id})
    if not contact:
        raise HTTPException(status_code=404, detail="Contact not found")
    
    campaign_name = None
    if data.campaign_id:
        campaign = await db.campaigns.find_one({"id": data.campaign_id})
        campaign_name = campaign.get("name") if campaign else None
    
    contract_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc).isoformat()
    
    contract_doc = {
        "id": contract_id,
        **data.model_dump(),
        "contact_name": contact.get("name"),
        "campaign_name": campaign_name,
        "status": "draft",
        "created_at": now,
    }
    
    await db.influencer_contracts.insert_one(contract_doc)
    del contract_doc["_id"]
    return contract_doc

@marketing_extended_router.put("/contracts/{contract_id}/acknowledge")
async def acknowledge_contract(contract_id: str, request: Request):
    """Acknowledge/sign contract (simple checkbox acknowledgment)"""
    db = get_db()
    
    now = datetime.now(timezone.utc).isoformat()
    client_ip = request.client.host if request.client else "unknown"
    
    result = await db.influencer_contracts.update_one(
        {"id": contract_id},
        {
            "$set": {
                "status": "acknowledged",
                "acknowledged_at": now,
                "acknowledged_by_ip": client_ip,
            }
        }
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Contract not found")
    
    return {"message": "Contract acknowledged", "acknowledged_at": now}

@marketing_extended_router.put("/contracts/{contract_id}/send")
async def send_contract(contract_id: str):
    """Mark contract as sent"""
    db = get_db()
    
    now = datetime.now(timezone.utc).isoformat()
    
    result = await db.influencer_contracts.update_one(
        {"id": contract_id},
        {"$set": {"status": "sent", "sent_at": now}}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Contract not found")
    
    return {"message": "Contract marked as sent"}

# ============== CONTENT APPROVAL ==============

@marketing_extended_router.get("/content-approval", response_model=List[ContentSubmissionResponse])
async def get_content_submissions(
    contact_id: Optional[str] = None,
    campaign_id: Optional[str] = None,
    status: Optional[str] = None,
    limit: int = 100,
):
    """Get all content submissions for approval"""
    db = get_db()
    query = {}
    if contact_id:
        query["contact_id"] = contact_id
    if campaign_id:
        query["campaign_id"] = campaign_id
    if status:
        query["status"] = status
    
    submissions = await db.content_submissions.find(query, {"_id": 0}).sort("created_at", -1).limit(limit).to_list(limit)
    return submissions

@marketing_extended_router.post("/content-approval", response_model=ContentSubmissionResponse)
async def create_content_submission(data: ContentSubmissionCreate):
    """Create a new content submission for approval"""
    db = get_db()
    
    contact = await db.contacts.find_one({"id": data.contact_id})
    if not contact:
        raise HTTPException(status_code=404, detail="Contact not found")
    
    submission_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc).isoformat()
    
    submission_doc = {
        "id": submission_id,
        **data.model_dump(),
        "contact_name": contact.get("name"),
        "status": "submitted",
        "submitted_at": now,
        "revision_count": 0,
        "revision_history": [],
        "created_at": now,
    }
    
    await db.content_submissions.insert_one(submission_doc)
    del submission_doc["_id"]
    return submission_doc

@marketing_extended_router.put("/content-approval/{submission_id}/review")
async def review_content_submission(
    submission_id: str,
    status: str,  # approved, revision_requested, rejected
    reviewed_by: str,
    review_notes: Optional[str] = None,
):
    """Review and approve/reject content submission"""
    db = get_db()
    
    submission = await db.content_submissions.find_one({"id": submission_id})
    if not submission:
        raise HTTPException(status_code=404, detail="Submission not found")
    
    now = datetime.now(timezone.utc).isoformat()
    
    # Add to revision history if requesting revision
    revision_entry = None
    if status == "revision_requested":
        revision_entry = {
            "requested_at": now,
            "requested_by": reviewed_by,
            "notes": review_notes,
        }
    
    update_data = {
        "status": status,
        "reviewed_by": reviewed_by,
        "reviewed_at": now,
        "review_notes": review_notes,
    }
    
    update_ops = {"$set": update_data}
    if revision_entry:
        update_ops["$push"] = {"revision_history": revision_entry}
        update_ops["$inc"] = {"revision_count": 1}
    
    await db.content_submissions.update_one({"id": submission_id}, update_ops)
    
    return {"message": f"Content {status}", "reviewed_at": now}

# ============== BRAND SAFETY SCANNER ==============

@marketing_extended_router.post("/brand-safety/scan", response_model=BrandSafetyCheckResponse)
async def scan_brand_safety(data: BrandSafetyCheckCreate):
    """Run brand safety scan on influencer (AI-powered)"""
    db = get_db()
    
    contact = await db.contacts.find_one({"id": data.contact_id})
    if not contact:
        raise HTTPException(status_code=404, detail="Contact not found")
    
    # Get AI service for analysis
    try:
        from services.ai_service import ai_service
        
        prompt = f"""Analyze this influencer for brand safety:
        Name: {contact.get('name')}
        Platform: {contact.get('primary_platform', 'instagram')}
        Industry: {contact.get('industry', 'fashion')}
        Followers: {contact.get('followers', 0)}
        Bio: {contact.get('bio', 'N/A')}
        
        Evaluate for:
        1. Controversial content history
        2. Brand alignment risks
        3. Audience authenticity concerns
        4. Past brand partnership issues
        
        Return a JSON with:
        - overall_score (0-100, higher is safer)
        - risk_level (low/medium/high/critical)
        - issues_found (list of potential issues)
        - recommendations (list of recommendations)
        """
        
        result = await ai_service.generate_text(prompt)
        
        # Parse AI response (simplified)
        import json
        try:
            ai_result = json.loads(result)
        except:
            ai_result = {
                "overall_score": 75,
                "risk_level": "low",
                "issues_found": [],
                "recommendations": ["Regular monitoring recommended"]
            }
    except Exception as e:
        # Fallback if AI service unavailable
        ai_result = {
            "overall_score": 70,
            "risk_level": "medium",
            "issues_found": [{"type": "limited_data", "description": "Unable to perform full AI analysis"}],
            "recommendations": ["Manual review recommended"]
        }
    
    check_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc).isoformat()
    
    check_doc = {
        "id": check_id,
        "contact_id": data.contact_id,
        "contact_name": contact.get("name"),
        "overall_score": ai_result.get("overall_score", 70),
        "risk_level": ai_result.get("risk_level", "medium"),
        "issues_found": ai_result.get("issues_found", []),
        "recommendations": ai_result.get("recommendations", []),
        "last_checked": now,
        "content_analyzed": 0,
    }
    
    # Store in database
    await db.brand_safety_checks.insert_one(check_doc)
    del check_doc["_id"]
    
    # Update contact with latest safety score
    await db.contacts.update_one(
        {"id": data.contact_id},
        {"$set": {"brand_safety_score": ai_result.get("overall_score", 70)}}
    )
    
    return check_doc

@marketing_extended_router.get("/brand-safety/{contact_id}", response_model=BrandSafetyCheckResponse)
async def get_brand_safety_check(contact_id: str):
    """Get latest brand safety check for contact"""
    db = get_db()
    
    check = await db.brand_safety_checks.find_one(
        {"contact_id": contact_id},
        {"_id": 0},
        sort=[("last_checked", -1)]
    )
    if not check:
        raise HTTPException(status_code=404, detail="No brand safety check found")
    
    return check

# ============== SENTIMENT ANALYSIS ==============

@marketing_extended_router.post("/sentiment/analyze", response_model=SentimentAnalysisResponse)
async def analyze_sentiment(data: SentimentAnalysisCreate):
    """Run sentiment analysis on influencer content (AI-powered)"""
    db = get_db()
    
    contact = await db.contacts.find_one({"id": data.contact_id})
    if not contact:
        raise HTTPException(status_code=404, detail="Contact not found")
    
    try:
        from services.ai_service import ai_service
        
        prompt = f"""Analyze the sentiment of this influencer's content and audience:
        Name: {contact.get('name')}
        Platform: {contact.get('primary_platform', 'instagram')}
        Industry: {contact.get('industry', 'fashion')}
        Content URLs: {data.content_urls if data.content_urls else 'N/A'}
        
        Provide sentiment analysis with:
        - overall_sentiment (positive/neutral/negative)
        - sentiment_score (-1 to 1, where 1 is most positive)
        - positive_ratio (0-1)
        - negative_ratio (0-1)
        - neutral_ratio (0-1)
        - top_positive_themes (list)
        - top_negative_themes (list)
        
        Return as JSON.
        """
        
        result = await ai_service.generate_text(prompt)
        
        import json
        try:
            ai_result = json.loads(result)
        except:
            ai_result = {
                "overall_sentiment": "positive",
                "sentiment_score": 0.6,
                "positive_ratio": 0.65,
                "negative_ratio": 0.10,
                "neutral_ratio": 0.25,
                "top_positive_themes": ["fashion", "style", "inspiration"],
                "top_negative_themes": [],
            }
    except:
        ai_result = {
            "overall_sentiment": "neutral",
            "sentiment_score": 0.5,
            "positive_ratio": 0.5,
            "negative_ratio": 0.2,
            "neutral_ratio": 0.3,
            "top_positive_themes": [],
            "top_negative_themes": [],
        }
    
    analysis_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc).isoformat()
    
    analysis_doc = {
        "id": analysis_id,
        "contact_id": data.contact_id,
        "contact_name": contact.get("name"),
        **ai_result,
        "sample_comments": [],
        "analyzed_at": now,
    }
    
    await db.sentiment_analyses.insert_one(analysis_doc)
    del analysis_doc["_id"]
    
    return analysis_doc

# ============== AVAILABILITY CALENDAR ==============

@marketing_extended_router.get("/availability", response_model=List[AvailabilityResponse])
async def get_availability(
    contact_id: Optional[str] = None,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
):
    """Get availability slots"""
    db = get_db()
    query = {}
    if contact_id:
        query["contact_id"] = contact_id
    if start_date:
        query["start_date"] = {"$gte": start_date}
    if end_date:
        if "end_date" not in query:
            query["end_date"] = {}
        query["end_date"]["$lte"] = end_date
    
    slots = await db.availability.find(query, {"_id": 0}).sort("start_date", 1).to_list(500)
    return slots

@marketing_extended_router.post("/availability", response_model=AvailabilityResponse)
async def create_availability_slot(data: AvailabilitySlot):
    """Create availability slot for contact"""
    db = get_db()
    
    contact = await db.contacts.find_one({"id": data.contact_id})
    if not contact:
        raise HTTPException(status_code=404, detail="Contact not found")
    
    campaign_name = None
    if data.campaign_id:
        campaign = await db.campaigns.find_one({"id": data.campaign_id})
        campaign_name = campaign.get("name") if campaign else None
    
    slot_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc).isoformat()
    
    slot_doc = {
        "id": slot_id,
        **data.model_dump(),
        "contact_name": contact.get("name"),
        "campaign_name": campaign_name,
        "created_at": now,
    }
    
    await db.availability.insert_one(slot_doc)
    del slot_doc["_id"]
    return slot_doc

@marketing_extended_router.get("/availability/check/{contact_id}")
async def check_contact_availability(contact_id: str, date: str):
    """Check if contact is available on a specific date"""
    db = get_db()
    
    # Check for any busy slots on this date
    busy_slot = await db.availability.find_one({
        "contact_id": contact_id,
        "start_date": {"$lte": date},
        "end_date": {"$gte": date},
        "status": {"$in": ["busy", "blocked"]}
    })
    
    return {
        "contact_id": contact_id,
        "date": date,
        "available": busy_slot is None,
        "blocking_reason": busy_slot.get("reason") if busy_slot else None,
    }

# ============== EXCLUSIVITY TRACKER ==============

@marketing_extended_router.get("/exclusivity/{contact_id}")
async def get_contact_exclusivity(contact_id: str):
    """Get exclusivity status for a contact"""
    db = get_db()
    
    now = datetime.now(timezone.utc).isoformat()
    
    # Find active exclusivity agreements
    active_exclusivities = await db.influencer_contracts.find({
        "contact_id": contact_id,
        "exclusivity_period": {"$gt": 0},
        "status": {"$in": ["acknowledged", "signed"]},
        "end_date": {"$gte": now}
    }, {"_id": 0}).to_list(100)
    
    categories_blocked = []
    for contract in active_exclusivities:
        # Extract category from campaign or contract
        if contract.get("campaign_id"):
            campaign = await db.campaigns.find_one({"id": contract["campaign_id"]})
            if campaign and campaign.get("category"):
                categories_blocked.append({
                    "category": campaign.get("category"),
                    "brand": contract.get("campaign_name", "Unknown"),
                    "until": contract.get("end_date"),
                })
    
    return {
        "contact_id": contact_id,
        "has_exclusivity": len(active_exclusivities) > 0,
        "active_agreements": len(active_exclusivities),
        "categories_blocked": categories_blocked,
    }

# ============== RELATIONSHIP SCORE ==============

@marketing_extended_router.get("/relationship-score/{contact_id}", response_model=RelationshipScoreResponse)
async def get_relationship_score(contact_id: str):
    """Calculate relationship score for a contact"""
    db = get_db()
    
    contact = await db.contacts.find_one({"id": contact_id})
    if not contact:
        raise HTTPException(status_code=404, detail="Contact not found")
    
    # Get all related data
    campaigns_count = await db.deals.count_documents({"contact_id": contact_id, "status": "agreed"})
    communications = await db.communications.find({"contact_id": contact_id}).to_list(1000)
    payments = await db.payments.find({"contact_id": contact_id, "status": "paid"}).to_list(1000)
    content_submissions = await db.content_submissions.find({"contact_id": contact_id}).to_list(100)
    
    # Calculate total revenue
    total_revenue = sum(p.get("amount", 0) for p in payments)
    
    # Calculate content quality (approved vs rejected)
    approved_content = len([c for c in content_submissions if c.get("status") == "approved"])
    total_content = len(content_submissions)
    content_quality = (approved_content / total_content * 100) if total_content > 0 else 50
    
    # Calculate overall score
    score = 0
    score += min(campaigns_count * 10, 30)  # Max 30 points for campaigns
    score += min(total_revenue / 100000 * 20, 20)  # Max 20 points for revenue
    score += min(len(communications) * 2, 20)  # Max 20 points for engagement
    score += content_quality * 0.3  # Max 30 points for content quality
    
    # Determine tier
    if score >= 80:
        tier = "ambassador"
    elif score >= 60:
        tier = "vip"
    elif score >= 40:
        tier = "established"
    elif score >= 20:
        tier = "developing"
    else:
        tier = "new"
    
    return {
        "contact_id": contact_id,
        "contact_name": contact.get("name"),
        "overall_score": min(round(score, 1), 100),
        "tier": tier,
        "total_campaigns": campaigns_count,
        "total_revenue": total_revenue,
        "avg_response_time": 24.0,  # Placeholder
        "content_quality_avg": round(content_quality, 1),
        "reliability_score": round(content_quality, 1),
        "engagement_trend": "stable",
        "last_collaboration": payments[-1].get("created_at") if payments else None,
        "next_scheduled": None,
        "recommendations": [
            "Continue regular engagement" if tier in ["vip", "ambassador"] else "Increase collaboration frequency"
        ],
    }

# ============== POST-CAMPAIGN REPORTS ==============

@marketing_extended_router.get("/campaign-report/{campaign_id}", response_model=CampaignReportResponse)
async def get_campaign_report(campaign_id: str):
    """Generate comprehensive post-campaign report"""
    db = get_db()
    
    campaign = await db.campaigns.find_one({"id": campaign_id})
    if not campaign:
        raise HTTPException(status_code=404, detail="Campaign not found")
    
    # Get all related data
    deals = await db.deals.find({"campaign_id": campaign_id}).to_list(100)
    content = await db.content_submissions.find({"campaign_id": campaign_id}).to_list(500)
    promo_codes = await db.promo_codes.find({"campaign_id": campaign_id}).to_list(100)
    ugc = await db.ugc.find({"campaign_id": campaign_id}).to_list(500)
    
    # Calculate stats
    total_influencers = len(set(d.get("contact_id") for d in deals))
    completed_deals = len([d for d in deals if d.get("status") in ["agreed", "signed"]])
    
    total_spent = sum(d.get("final_amount", 0) or d.get("initial_quote", 0) for d in deals)
    
    # Content stats
    content_by_type = {}
    for c in content:
        ct = c.get("content_type", "other")
        content_by_type[ct] = content_by_type.get(ct, 0) + 1
    
    # Promo code stats
    promo_uses = sum(p.get("current_uses", 0) for p in promo_codes)
    promo_revenue = sum(p.get("total_revenue", 0) for p in promo_codes)
    
    # Calculate engagement from UGC
    total_engagement = sum(u.get("metrics", {}).get("likes", 0) + u.get("metrics", {}).get("comments", 0) for u in ugc)
    total_reach = sum(u.get("metrics", {}).get("reach", 0) for u in ugc)
    
    # Calculate ROI metrics
    cost_per_engagement = total_spent / total_engagement if total_engagement > 0 else 0
    cost_per_reach = total_spent / total_reach if total_reach > 0 else 0
    roi_percentage = ((promo_revenue - total_spent) / total_spent * 100) if total_spent > 0 else 0
    
    now = datetime.now(timezone.utc).isoformat()
    
    return {
        "campaign_id": campaign_id,
        "campaign_name": campaign.get("name", "Unknown"),
        "report_generated_at": now,
        "status": campaign.get("status", "unknown"),
        "start_date": campaign.get("start_date", ""),
        "end_date": campaign.get("end_date"),
        "total_budget": campaign.get("budget", 0),
        "total_spent": total_spent,
        "total_influencers": total_influencers,
        "influencers_completed": completed_deals,
        "influencers_pending": total_influencers - completed_deals,
        "total_content_pieces": len(content) + len(ugc),
        "content_by_type": content_by_type,
        "total_reach": total_reach,
        "total_impressions": total_reach,  # Simplified
        "total_engagement": total_engagement,
        "avg_engagement_rate": (total_engagement / total_reach * 100) if total_reach > 0 else 0,
        "promo_codes_used": promo_uses,
        "promo_revenue": promo_revenue,
        "cost_per_engagement": round(cost_per_engagement, 2),
        "cost_per_reach": round(cost_per_reach, 4),
        "estimated_media_value": total_engagement * 0.5,  # Simplified EMV calculation
        "roi_percentage": round(roi_percentage, 2),
        "top_influencers": [],
        "top_content": [],
        "ai_insights": [
            f"Campaign engaged {total_influencers} influencers",
            f"Generated {len(content) + len(ugc)} pieces of content",
        ],
        "recommendations": [
            "Consider increasing budget for top performers" if roi_percentage > 0 else "Optimize influencer selection criteria"
        ],
    }
