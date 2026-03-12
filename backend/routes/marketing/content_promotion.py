"""
Content Promotion Routes - UGC/Influencer Content to Ads

Handles:
- Promoting influencer content as paid ads
- Tracking promotion performance
- Managing usage rights
"""

from fastapi import APIRouter, HTTPException, Query
from typing import Optional, List
from datetime import datetime, date
import uuid
import os

from models.marketing_promotion import (
    PromotionStatus, PromotionType, ContentSource,
    ContentPromotionCreate, ContentPromotionUpdate, ContentPromotionResponse,
    PromotionRequestCreate, PromotionRequestResponse,
    PromotionStats, InfluencerPromotionSummary
)

router = APIRouter(prefix="/content-promotion", tags=["Marketing - Content Promotion"])


def get_db():
    """Get database connection"""
    from pymongo import MongoClient
    client = MongoClient(os.environ.get("MONGO_URL"))
    return client[os.environ.get("DB_NAME", "sevora_production")]


def serialize_doc(doc: dict) -> dict:
    """Serialize MongoDB document for JSON response"""
    if doc is None:
        return None
    doc["id"] = str(doc.pop("_id", doc.get("id", "")))
    return doc


# ============== PROMOTIONS ==============

@router.get("/promotions", response_model=List[ContentPromotionResponse])
async def list_promotions(
    status: Optional[PromotionStatus] = None,
    influencer_id: Optional[str] = None,
    platform: Optional[str] = None,
    promotion_type: Optional[PromotionType] = None,
    ad_campaign_id: Optional[str] = None,
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100)
):
    """List content promotions with filters"""
    db = get_db()
    
    query = {}
    if status:
        query["status"] = status.value
    if influencer_id:
        query["influencer_id"] = influencer_id
    if platform:
        query["platform"] = platform
    if promotion_type:
        query["promotion_type"] = promotion_type.value
    if ad_campaign_id:
        query["ad_campaign_id"] = ad_campaign_id
    
    promotions = list(
        db.marketing_content_promotions.find(query)
        .sort("created_at", -1)
        .skip(skip)
        .limit(limit)
    )
    
    # Enrich with influencer and campaign info
    for promo in promotions:
        # Get influencer info
        if promo.get("influencer_id"):
            influencer = db.marketing_contacts.find_one(
                {"_id": promo["influencer_id"]},
                {"name": 1, "instagram_handle": 1, "youtube_handle": 1}
            )
            if influencer:
                promo["influencer_name"] = influencer.get("name")
                promo["influencer_handle"] = influencer.get("instagram_handle") or influencer.get("youtube_handle")
        
        # Get campaign name
        if promo.get("ad_campaign_id"):
            campaign = db.marketing_ads_campaigns.find_one(
                {"_id": promo["ad_campaign_id"]},
                {"name": 1}
            )
            if campaign:
                promo["campaign_name"] = campaign.get("name")
        
        # Calculate metrics
        if promo.get("clicks", 0) > 0 and promo.get("impressions", 0) > 0:
            promo["ctr"] = round((promo["clicks"] / promo["impressions"]) * 100, 2)
        else:
            promo["ctr"] = 0
        
        if promo.get("clicks", 0) > 0 and promo.get("total_spend", 0) > 0:
            promo["cpc"] = round(promo["total_spend"] / promo["clicks"], 2)
        else:
            promo["cpc"] = 0
    
    return [serialize_doc(p) for p in promotions]


@router.post("/promotions", response_model=ContentPromotionResponse)
async def create_promotion(promotion: ContentPromotionCreate, user_id: Optional[str] = None):
    """Create a new content promotion"""
    db = get_db()
    
    # Verify influencer exists
    influencer = db.marketing_contacts.find_one({"_id": promotion.influencer_id})
    if not influencer:
        raise HTTPException(status_code=404, detail="Influencer not found")
    
    promo_doc = promotion.model_dump()
    promo_doc["_id"] = str(uuid.uuid4())
    promo_doc["content_source"] = promotion.content_source.value
    promo_doc["promotion_type"] = promotion.promotion_type.value
    promo_doc["status"] = promotion.status.value
    
    # Convert dates
    for date_field in ["start_date", "end_date", "usage_rights_until"]:
        if promo_doc.get(date_field):
            promo_doc[date_field] = promo_doc[date_field].isoformat()
    
    promo_doc["created_by"] = user_id
    promo_doc["created_at"] = datetime.utcnow()
    
    # Add influencer info
    promo_doc["influencer_name"] = influencer.get("name")
    promo_doc["influencer_handle"] = influencer.get("instagram_handle") or influencer.get("youtube_handle")
    
    db.marketing_content_promotions.insert_one(promo_doc)
    
    promo_doc["ctr"] = 0
    promo_doc["cpc"] = 0
    promo_doc["roas"] = 0
    
    return serialize_doc(promo_doc)


@router.get("/promotions/{promotion_id}", response_model=ContentPromotionResponse)
async def get_promotion(promotion_id: str):
    """Get a specific promotion"""
    db = get_db()
    
    promo = db.marketing_content_promotions.find_one({"_id": promotion_id})
    if not promo:
        raise HTTPException(status_code=404, detail="Promotion not found")
    
    # Enrich
    if promo.get("influencer_id"):
        influencer = db.marketing_contacts.find_one({"_id": promo["influencer_id"]})
        if influencer:
            promo["influencer_name"] = influencer.get("name")
            promo["influencer_handle"] = influencer.get("instagram_handle")
    
    # Calculate metrics
    promo["ctr"] = round((promo.get("clicks", 0) / promo.get("impressions", 1)) * 100, 2) if promo.get("impressions", 0) > 0 else 0
    promo["cpc"] = round(promo.get("total_spend", 0) / promo.get("clicks", 1), 2) if promo.get("clicks", 0) > 0 else 0
    promo["roas"] = 0
    
    return serialize_doc(promo)


@router.put("/promotions/{promotion_id}", response_model=ContentPromotionResponse)
async def update_promotion(promotion_id: str, update: ContentPromotionUpdate):
    """Update a promotion"""
    db = get_db()
    
    update_data = {k: v for k, v in update.model_dump().items() if v is not None}
    
    # Convert enums
    if "promotion_type" in update_data:
        update_data["promotion_type"] = update_data["promotion_type"].value
    if "status" in update_data:
        update_data["status"] = update_data["status"].value
    
    # Convert dates
    for date_field in ["start_date", "end_date", "usage_rights_until"]:
        if date_field in update_data and update_data[date_field]:
            update_data[date_field] = update_data[date_field].isoformat()
    
    # Track influencer approval
    if update_data.get("influencer_approved"):
        update_data["influencer_approved_at"] = datetime.utcnow()
    
    update_data["updated_at"] = datetime.utcnow()
    
    result = db.marketing_content_promotions.find_one_and_update(
        {"_id": promotion_id},
        {"$set": update_data},
        return_document=True
    )
    
    if not result:
        raise HTTPException(status_code=404, detail="Promotion not found")
    
    result["ctr"] = 0
    result["cpc"] = 0
    result["roas"] = 0
    
    return serialize_doc(result)


@router.delete("/promotions/{promotion_id}")
async def delete_promotion(promotion_id: str):
    """Delete/cancel a promotion"""
    db = get_db()
    
    promo = db.marketing_content_promotions.find_one({"_id": promotion_id})
    if not promo:
        raise HTTPException(status_code=404, detail="Promotion not found")
    
    # If active, cancel instead of delete
    if promo.get("status") == "active":
        db.marketing_content_promotions.update_one(
            {"_id": promotion_id},
            {"$set": {"status": "cancelled", "updated_at": datetime.utcnow()}}
        )
        return {"message": "Active promotion cancelled"}
    
    db.marketing_content_promotions.delete_one({"_id": promotion_id})
    return {"message": "Promotion deleted successfully"}


@router.put("/promotions/{promotion_id}/status")
async def update_promotion_status(promotion_id: str, status: PromotionStatus):
    """Update promotion status"""
    db = get_db()
    
    result = db.marketing_content_promotions.find_one_and_update(
        {"_id": promotion_id},
        {"$set": {"status": status.value, "updated_at": datetime.utcnow()}},
        return_document=True
    )
    
    if not result:
        raise HTTPException(status_code=404, detail="Promotion not found")
    
    return serialize_doc(result)


@router.post("/promotions/{promotion_id}/link-ad")
async def link_promotion_to_ad(
    promotion_id: str,
    ad_campaign_id: Optional[str] = None,
    ad_set_id: Optional[str] = None,
    ad_id: Optional[str] = None
):
    """Link a promotion to an ad campaign/set/ad"""
    db = get_db()
    
    update_data = {"updated_at": datetime.utcnow()}
    if ad_campaign_id:
        update_data["ad_campaign_id"] = ad_campaign_id
    if ad_set_id:
        update_data["ad_set_id"] = ad_set_id
    if ad_id:
        update_data["ad_id"] = ad_id
    
    result = db.marketing_content_promotions.find_one_and_update(
        {"_id": promotion_id},
        {"$set": update_data},
        return_document=True
    )
    
    if not result:
        raise HTTPException(status_code=404, detail="Promotion not found")
    
    return serialize_doc(result)


# ============== PROMOTION REQUESTS ==============

@router.post("/requests", response_model=PromotionRequestResponse)
async def create_promotion_request(request: PromotionRequestCreate, user_id: Optional[str] = None):
    """Create a promotion request to send to influencer"""
    db = get_db()
    
    # Verify influencer exists
    influencer = db.marketing_contacts.find_one({"_id": request.influencer_id})
    if not influencer:
        raise HTTPException(status_code=404, detail="Influencer not found")
    
    request_doc = request.model_dump()
    request_doc["_id"] = str(uuid.uuid4())
    request_doc["status"] = "pending"
    request_doc["created_by"] = user_id
    request_doc["created_at"] = datetime.utcnow()
    
    db.marketing_promotion_requests.insert_one(request_doc)
    
    # TODO: Send notification to influencer
    
    return serialize_doc(request_doc)


@router.get("/requests", response_model=List[PromotionRequestResponse])
async def list_promotion_requests(
    influencer_id: Optional[str] = None,
    status: Optional[str] = None
):
    """List promotion requests"""
    db = get_db()
    
    query = {}
    if influencer_id:
        query["influencer_id"] = influencer_id
    if status:
        query["status"] = status
    
    requests = list(
        db.marketing_promotion_requests.find(query)
        .sort("created_at", -1)
    )
    
    return [serialize_doc(r) for r in requests]


@router.put("/requests/{request_id}/respond")
async def respond_to_promotion_request(
    request_id: str,
    approved: bool,
    response: Optional[str] = None
):
    """Influencer responds to promotion request"""
    db = get_db()
    
    update_data = {
        "status": "approved" if approved else "rejected",
        "influencer_response": response,
        "responded_at": datetime.utcnow()
    }
    
    result = db.marketing_promotion_requests.find_one_and_update(
        {"_id": request_id},
        {"$set": update_data},
        return_document=True
    )
    
    if not result:
        raise HTTPException(status_code=404, detail="Request not found")
    
    # If approved, create the promotion
    if approved:
        promo_doc = {
            "_id": str(uuid.uuid4()),
            "name": f"Promotion from request {request_id[:8]}",
            "influencer_id": result["influencer_id"],
            "content_source": "influencer_post",
            "original_post_url": result["content_url"],
            "promotion_type": "boosted_post",
            "platform": result["platforms"][0] if result.get("platforms") else "instagram",
            "budget": result.get("proposed_budget", 0),
            "status": "approved",
            "influencer_approved": True,
            "influencer_approved_at": datetime.utcnow(),
            "created_at": datetime.utcnow()
        }
        db.marketing_content_promotions.insert_one(promo_doc)
    
    return serialize_doc(result)


# ============== STATS ==============

@router.get("/stats", response_model=PromotionStats)
async def get_promotion_stats():
    """Get promotion statistics"""
    db = get_db()
    
    total_promotions = db.marketing_content_promotions.count_documents({})
    active_promotions = db.marketing_content_promotions.count_documents({"status": "active"})
    
    # Aggregations
    pipeline = [
        {
            "$group": {
                "_id": None,
                "total_spend": {"$sum": "$total_spend"},
                "total_impressions": {"$sum": "$impressions"},
                "total_clicks": {"$sum": "$clicks"},
                "total_conversions": {"$sum": "$conversions"}
            }
        }
    ]
    agg_result = list(db.marketing_content_promotions.aggregate(pipeline))
    
    total_spend = 0
    total_impressions = 0
    total_clicks = 0
    total_conversions = 0
    
    if agg_result:
        total_spend = agg_result[0].get("total_spend", 0)
        total_impressions = agg_result[0].get("total_impressions", 0)
        total_clicks = agg_result[0].get("total_clicks", 0)
        total_conversions = agg_result[0].get("total_conversions", 0)
    
    # By status
    status_pipeline = [{"$group": {"_id": "$status", "count": {"$sum": 1}}}]
    by_status = {r["_id"]: r["count"] for r in db.marketing_content_promotions.aggregate(status_pipeline)}
    
    # By platform
    platform_pipeline = [{"$group": {"_id": "$platform", "count": {"$sum": 1}}}]
    by_platform = {r["_id"]: r["count"] for r in db.marketing_content_promotions.aggregate(platform_pipeline)}
    
    # By type
    type_pipeline = [{"$group": {"_id": "$promotion_type", "count": {"$sum": 1}}}]
    by_type = {r["_id"]: r["count"] for r in db.marketing_content_promotions.aggregate(type_pipeline)}
    
    return PromotionStats(
        total_promotions=total_promotions,
        active_promotions=active_promotions,
        total_spend=total_spend,
        total_impressions=total_impressions,
        total_clicks=total_clicks,
        total_conversions=total_conversions,
        avg_ctr=round((total_clicks / total_impressions * 100), 2) if total_impressions > 0 else 0,
        avg_cpc=round(total_spend / total_clicks, 2) if total_clicks > 0 else 0,
        by_status=by_status,
        by_platform=by_platform,
        by_type=by_type,
        top_performing=[]
    )


@router.get("/influencer/{influencer_id}/summary", response_model=InfluencerPromotionSummary)
async def get_influencer_promotion_summary(influencer_id: str):
    """Get promotion summary for a specific influencer"""
    db = get_db()
    
    # Get influencer info
    influencer = db.marketing_contacts.find_one({"_id": influencer_id})
    if not influencer:
        raise HTTPException(status_code=404, detail="Influencer not found")
    
    # Aggregate promotions
    pipeline = [
        {"$match": {"influencer_id": influencer_id}},
        {
            "$group": {
                "_id": None,
                "total_promotions": {"$sum": 1},
                "total_spend": {"$sum": "$total_spend"},
                "total_impressions": {"$sum": "$impressions"},
                "total_conversions": {"$sum": "$conversions"}
            }
        }
    ]
    
    result = list(db.marketing_content_promotions.aggregate(pipeline))
    
    active_count = db.marketing_content_promotions.count_documents({
        "influencer_id": influencer_id,
        "status": "active"
    })
    
    if result:
        return InfluencerPromotionSummary(
            influencer_id=influencer_id,
            influencer_name=influencer.get("name", ""),
            total_promotions=result[0].get("total_promotions", 0),
            active_promotions=active_count,
            total_spend=result[0].get("total_spend", 0),
            total_impressions=result[0].get("total_impressions", 0),
            total_conversions=result[0].get("total_conversions", 0),
            avg_performance_score=0
        )
    
    return InfluencerPromotionSummary(
        influencer_id=influencer_id,
        influencer_name=influencer.get("name", ""),
        total_promotions=0,
        active_promotions=0,
        total_spend=0,
        total_impressions=0,
        total_conversions=0,
        avg_performance_score=0
    )
