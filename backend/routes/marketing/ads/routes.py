"""
Digital Ads Management Routes

Handles:
- Ad accounts (Meta, Google, YouTube)
- Ad campaigns
- Ad sets with targeting
- Individual ads
- Metrics tracking
"""

from fastapi import APIRouter, HTTPException, Depends, Query, BackgroundTasks
from typing import Optional, List
from datetime import datetime, date, timedelta
from bson import ObjectId
import uuid
import os

# Import models
from models.marketing_ads import (
    AdPlatform, AdAccountStatus, AdCampaignStatus, AdSetStatus, AdStatus,
    AdAccountCreate, AdAccountUpdate, AdAccountResponse,
    AdCampaignCreate, AdCampaignUpdate, AdCampaignResponse,
    AdSetCreate, AdSetUpdate, AdSetResponse,
    AdCreate, AdUpdate, AdResponse,
    AdMetricsCreate, AdMetricsResponse,
    CampaignMetricsSummary, PlatformMetricsSummary, AdsOverviewStats
)

router = APIRouter(prefix="/ads", tags=["Marketing - Digital Ads"])


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


# ============== AD ACCOUNTS ==============

@router.get("/accounts", response_model=List[AdAccountResponse])
async def list_ad_accounts(
    platform: Optional[AdPlatform] = None,
    status: Optional[AdAccountStatus] = None
):
    """List all ad platform accounts"""
    db = get_db()
    
    query = {}
    if platform:
        query["platform"] = platform.value
    if status:
        query["status"] = status.value
    
    accounts = list(db.marketing_ads_accounts.find(query).sort("created_at", -1))
    
    return [serialize_doc(acc) for acc in accounts]


@router.post("/accounts", response_model=AdAccountResponse)
async def create_ad_account(account: AdAccountCreate):
    """Create a new ad platform account"""
    db = get_db()
    
    # Check for duplicate account
    existing = db.marketing_ads_accounts.find_one({
        "platform": account.platform.value,
        "account_id": account.account_id
    })
    if existing:
        raise HTTPException(status_code=400, detail="Account already exists for this platform")
    
    account_doc = account.model_dump()
    account_doc["_id"] = str(uuid.uuid4())
    account_doc["platform"] = account.platform.value
    account_doc["status"] = account.status.value
    account_doc["created_at"] = datetime.utcnow()
    
    db.marketing_ads_accounts.insert_one(account_doc)
    
    return serialize_doc(account_doc)


@router.get("/accounts/{account_id}", response_model=AdAccountResponse)
async def get_ad_account(account_id: str):
    """Get a specific ad account"""
    db = get_db()
    
    account = db.marketing_ads_accounts.find_one({"_id": account_id})
    if not account:
        raise HTTPException(status_code=404, detail="Account not found")
    
    return serialize_doc(account)


@router.put("/accounts/{account_id}", response_model=AdAccountResponse)
async def update_ad_account(account_id: str, update: AdAccountUpdate):
    """Update an ad account"""
    db = get_db()
    
    update_data = {k: v for k, v in update.model_dump().items() if v is not None}
    if "status" in update_data:
        update_data["status"] = update_data["status"].value
    update_data["updated_at"] = datetime.utcnow()
    
    result = db.marketing_ads_accounts.find_one_and_update(
        {"_id": account_id},
        {"$set": update_data},
        return_document=True
    )
    
    if not result:
        raise HTTPException(status_code=404, detail="Account not found")
    
    return serialize_doc(result)


@router.delete("/accounts/{account_id}")
async def delete_ad_account(account_id: str):
    """Delete an ad account"""
    db = get_db()
    
    # Check if account has campaigns
    campaign_count = db.marketing_ads_campaigns.count_documents({"account_id": account_id})
    if campaign_count > 0:
        raise HTTPException(
            status_code=400,
            detail=f"Cannot delete account with {campaign_count} campaigns. Archive campaigns first."
        )
    
    result = db.marketing_ads_accounts.delete_one({"_id": account_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Account not found")
    
    return {"message": "Account deleted successfully"}


# ============== AD CAMPAIGNS ==============

@router.get("/campaigns", response_model=List[AdCampaignResponse])
async def list_ad_campaigns(
    platform: Optional[AdPlatform] = None,
    account_id: Optional[str] = None,
    status: Optional[AdCampaignStatus] = None,
    marketing_campaign_id: Optional[str] = None,
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100)
):
    """List ad campaigns with filters"""
    db = get_db()
    
    query = {}
    if platform:
        query["platform"] = platform.value
    if account_id:
        query["account_id"] = account_id
    if status:
        query["status"] = status.value
    if marketing_campaign_id:
        query["marketing_campaign_id"] = marketing_campaign_id
    
    campaigns = list(
        db.marketing_ads_campaigns.find(query)
        .sort("created_at", -1)
        .skip(skip)
        .limit(limit)
    )
    
    # Enrich with metrics
    for campaign in campaigns:
        metrics = _get_campaign_metrics_summary(db, str(campaign["_id"]))
        campaign.update(metrics)
    
    return [serialize_doc(c) for c in campaigns]


@router.post("/campaigns", response_model=AdCampaignResponse)
async def create_ad_campaign(campaign: AdCampaignCreate, user_id: Optional[str] = None):
    """Create a new ad campaign"""
    db = get_db()
    
    # Verify account exists
    account = db.marketing_ads_accounts.find_one({"_id": campaign.account_id})
    if not account:
        raise HTTPException(status_code=404, detail="Ad account not found")
    
    campaign_doc = campaign.model_dump()
    campaign_doc["_id"] = str(uuid.uuid4())
    campaign_doc["platform"] = campaign.platform.value
    campaign_doc["objective"] = campaign.objective.value
    campaign_doc["campaign_type"] = campaign.campaign_type.value
    campaign_doc["status"] = campaign.status.value
    campaign_doc["start_date"] = campaign.start_date.isoformat()
    if campaign.end_date:
        campaign_doc["end_date"] = campaign.end_date.isoformat()
    campaign_doc["created_by"] = user_id
    campaign_doc["created_at"] = datetime.utcnow()
    
    db.marketing_ads_campaigns.insert_one(campaign_doc)
    
    # Initialize metrics fields
    campaign_doc["total_spend"] = 0
    campaign_doc["total_impressions"] = 0
    campaign_doc["total_clicks"] = 0
    campaign_doc["total_conversions"] = 0
    
    return serialize_doc(campaign_doc)


@router.get("/campaigns/{campaign_id}", response_model=AdCampaignResponse)
async def get_ad_campaign(campaign_id: str):
    """Get a specific ad campaign with metrics"""
    db = get_db()
    
    campaign = db.marketing_ads_campaigns.find_one({"_id": campaign_id})
    if not campaign:
        raise HTTPException(status_code=404, detail="Campaign not found")
    
    # Add metrics
    metrics = _get_campaign_metrics_summary(db, campaign_id)
    campaign.update(metrics)
    
    return serialize_doc(campaign)


@router.put("/campaigns/{campaign_id}", response_model=AdCampaignResponse)
async def update_ad_campaign(campaign_id: str, update: AdCampaignUpdate):
    """Update an ad campaign"""
    db = get_db()
    
    update_data = {k: v for k, v in update.model_dump().items() if v is not None}
    
    # Convert enums to values
    if "objective" in update_data:
        update_data["objective"] = update_data["objective"].value
    if "campaign_type" in update_data:
        update_data["campaign_type"] = update_data["campaign_type"].value
    if "status" in update_data:
        update_data["status"] = update_data["status"].value
    if "start_date" in update_data:
        update_data["start_date"] = update_data["start_date"].isoformat()
    if "end_date" in update_data:
        update_data["end_date"] = update_data["end_date"].isoformat()
    
    update_data["updated_at"] = datetime.utcnow()
    
    result = db.marketing_ads_campaigns.find_one_and_update(
        {"_id": campaign_id},
        {"$set": update_data},
        return_document=True
    )
    
    if not result:
        raise HTTPException(status_code=404, detail="Campaign not found")
    
    return serialize_doc(result)


@router.delete("/campaigns/{campaign_id}")
async def delete_ad_campaign(campaign_id: str):
    """Delete/archive an ad campaign"""
    db = get_db()
    
    # Soft delete by setting status to archived
    result = db.marketing_ads_campaigns.find_one_and_update(
        {"_id": campaign_id},
        {"$set": {"status": "archived", "updated_at": datetime.utcnow()}},
        return_document=True
    )
    
    if not result:
        raise HTTPException(status_code=404, detail="Campaign not found")
    
    return {"message": "Campaign archived successfully"}


# ============== AD SETS ==============

@router.get("/adsets", response_model=List[AdSetResponse])
async def list_ad_sets(
    campaign_id: Optional[str] = None,
    status: Optional[AdSetStatus] = None,
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100)
):
    """List ad sets with filters"""
    db = get_db()
    
    query = {}
    if campaign_id:
        query["campaign_id"] = campaign_id
    if status:
        query["status"] = status.value
    
    adsets = list(
        db.marketing_ads_sets.find(query)
        .sort("created_at", -1)
        .skip(skip)
        .limit(limit)
    )
    
    return [serialize_doc(a) for a in adsets]


@router.post("/adsets", response_model=AdSetResponse)
async def create_ad_set(adset: AdSetCreate):
    """Create a new ad set"""
    db = get_db()
    
    # Verify campaign exists
    campaign = db.marketing_ads_campaigns.find_one({"_id": adset.campaign_id})
    if not campaign:
        raise HTTPException(status_code=404, detail="Campaign not found")
    
    adset_doc = adset.model_dump()
    adset_doc["_id"] = str(uuid.uuid4())
    adset_doc["status"] = adset.status.value
    adset_doc["optimization_goal"] = adset.optimization_goal.value
    if adset.start_date:
        adset_doc["start_date"] = adset.start_date.isoformat()
    if adset.end_date:
        adset_doc["end_date"] = adset.end_date.isoformat()
    adset_doc["created_at"] = datetime.utcnow()
    
    db.marketing_ads_sets.insert_one(adset_doc)
    
    return serialize_doc(adset_doc)


@router.get("/adsets/{adset_id}", response_model=AdSetResponse)
async def get_ad_set(adset_id: str):
    """Get a specific ad set"""
    db = get_db()
    
    adset = db.marketing_ads_sets.find_one({"_id": adset_id})
    if not adset:
        raise HTTPException(status_code=404, detail="Ad set not found")
    
    return serialize_doc(adset)


@router.put("/adsets/{adset_id}", response_model=AdSetResponse)
async def update_ad_set(adset_id: str, update: AdSetUpdate):
    """Update an ad set"""
    db = get_db()
    
    update_data = {k: v for k, v in update.model_dump().items() if v is not None}
    
    if "status" in update_data:
        update_data["status"] = update_data["status"].value
    if "optimization_goal" in update_data:
        update_data["optimization_goal"] = update_data["optimization_goal"].value
    if "start_date" in update_data:
        update_data["start_date"] = update_data["start_date"].isoformat()
    if "end_date" in update_data:
        update_data["end_date"] = update_data["end_date"].isoformat()
    
    update_data["updated_at"] = datetime.utcnow()
    
    result = db.marketing_ads_sets.find_one_and_update(
        {"_id": adset_id},
        {"$set": update_data},
        return_document=True
    )
    
    if not result:
        raise HTTPException(status_code=404, detail="Ad set not found")
    
    return serialize_doc(result)


@router.delete("/adsets/{adset_id}")
async def delete_ad_set(adset_id: str):
    """Delete an ad set"""
    db = get_db()
    
    result = db.marketing_ads_sets.delete_one({"_id": adset_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Ad set not found")
    
    return {"message": "Ad set deleted successfully"}


# ============== ADS ==============

@router.get("", response_model=List[AdResponse])
async def list_ads(
    ad_set_id: Optional[str] = None,
    campaign_id: Optional[str] = None,
    status: Optional[AdStatus] = None,
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100)
):
    """List ads with filters"""
    db = get_db()
    
    query = {}
    if ad_set_id:
        query["ad_set_id"] = ad_set_id
    if status:
        query["status"] = status.value
    
    # If campaign_id filter, get all ad sets for that campaign first
    if campaign_id:
        adset_ids = [
            str(a["_id"]) for a in 
            db.marketing_ads_sets.find({"campaign_id": campaign_id}, {"_id": 1})
        ]
        query["ad_set_id"] = {"$in": adset_ids}
    
    ads = list(
        db.marketing_ads.find(query)
        .sort("created_at", -1)
        .skip(skip)
        .limit(limit)
    )
    
    return [serialize_doc(ad) for ad in ads]


@router.post("", response_model=AdResponse)
async def create_ad(ad: AdCreate, user_id: Optional[str] = None):
    """Create a new ad"""
    db = get_db()
    
    # Verify ad set exists
    adset = db.marketing_ads_sets.find_one({"_id": ad.ad_set_id})
    if not adset:
        raise HTTPException(status_code=404, detail="Ad set not found")
    
    ad_doc = ad.model_dump()
    ad_doc["_id"] = str(uuid.uuid4())
    ad_doc["status"] = ad.status.value
    ad_doc["format"] = ad.format.value
    ad_doc["created_by"] = user_id
    ad_doc["created_at"] = datetime.utcnow()
    
    db.marketing_ads.insert_one(ad_doc)
    
    return serialize_doc(ad_doc)


@router.get("/{ad_id}", response_model=AdResponse)
async def get_ad(ad_id: str):
    """Get a specific ad with metrics"""
    db = get_db()
    
    ad = db.marketing_ads.find_one({"_id": ad_id})
    if not ad:
        raise HTTPException(status_code=404, detail="Ad not found")
    
    # Add metrics summary
    metrics = _get_ad_metrics_summary(db, ad_id)
    ad.update(metrics)
    
    return serialize_doc(ad)


@router.put("/{ad_id}", response_model=AdResponse)
async def update_ad(ad_id: str, update: AdUpdate):
    """Update an ad"""
    db = get_db()
    
    update_data = {k: v for k, v in update.model_dump().items() if v is not None}
    
    if "status" in update_data:
        update_data["status"] = update_data["status"].value
    if "format" in update_data:
        update_data["format"] = update_data["format"].value
    
    update_data["updated_at"] = datetime.utcnow()
    
    result = db.marketing_ads.find_one_and_update(
        {"_id": ad_id},
        {"$set": update_data},
        return_document=True
    )
    
    if not result:
        raise HTTPException(status_code=404, detail="Ad not found")
    
    return serialize_doc(result)


@router.delete("/{ad_id}")
async def delete_ad(ad_id: str):
    """Delete an ad"""
    db = get_db()
    
    result = db.marketing_ads.delete_one({"_id": ad_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Ad not found")
    
    return {"message": "Ad deleted successfully"}


# ============== METRICS ==============

@router.get("/{ad_id}/metrics", response_model=List[AdMetricsResponse])
async def get_ad_metrics(
    ad_id: str,
    start_date: Optional[date] = None,
    end_date: Optional[date] = None
):
    """Get metrics for a specific ad"""
    db = get_db()
    
    query = {"ad_id": ad_id}
    if start_date:
        query["date"] = {"$gte": start_date.isoformat()}
    if end_date:
        if "date" in query:
            query["date"]["$lte"] = end_date.isoformat()
        else:
            query["date"] = {"$lte": end_date.isoformat()}
    
    metrics = list(db.marketing_ads_metrics.find(query).sort("date", -1))
    
    return [serialize_doc(m) for m in metrics]


@router.post("/{ad_id}/metrics", response_model=AdMetricsResponse)
async def add_ad_metrics(ad_id: str, metrics: AdMetricsCreate):
    """Add/update metrics for an ad (manual entry)"""
    db = get_db()
    
    # Verify ad exists
    ad = db.marketing_ads.find_one({"_id": ad_id})
    if not ad:
        raise HTTPException(status_code=404, detail="Ad not found")
    
    # Get ad set and campaign info
    adset = db.marketing_ads_sets.find_one({"_id": ad.get("ad_set_id")})
    campaign_id = adset.get("campaign_id") if adset else None
    
    metrics_doc = metrics.model_dump()
    metrics_doc["ad_id"] = ad_id
    metrics_doc["ad_set_id"] = ad.get("ad_set_id")
    metrics_doc["campaign_id"] = campaign_id
    metrics_doc["date"] = metrics.date.isoformat()
    
    # Calculate derived metrics
    if metrics_doc["clicks"] > 0 and metrics_doc["impressions"] > 0:
        metrics_doc["ctr"] = round((metrics_doc["clicks"] / metrics_doc["impressions"]) * 100, 2)
    if metrics_doc["clicks"] > 0 and metrics_doc["cost"] > 0:
        metrics_doc["cpc"] = round(metrics_doc["cost"] / metrics_doc["clicks"], 2)
    if metrics_doc["impressions"] > 0 and metrics_doc["cost"] > 0:
        metrics_doc["cpm"] = round((metrics_doc["cost"] / metrics_doc["impressions"]) * 1000, 2)
    if metrics_doc["cost"] > 0 and metrics_doc["revenue"] > 0:
        metrics_doc["roas"] = round(metrics_doc["revenue"] / metrics_doc["cost"], 2)
    
    # Upsert - update if exists for same ad and date
    existing = db.marketing_ads_metrics.find_one({
        "ad_id": ad_id,
        "date": metrics_doc["date"]
    })
    
    if existing:
        metrics_doc["_id"] = existing["_id"]
        db.marketing_ads_metrics.replace_one({"_id": existing["_id"]}, metrics_doc)
    else:
        metrics_doc["_id"] = str(uuid.uuid4())
        metrics_doc["created_at"] = datetime.utcnow()
        db.marketing_ads_metrics.insert_one(metrics_doc)
    
    return serialize_doc(metrics_doc)


# ============== OVERVIEW & STATS ==============

@router.get("/overview/stats", response_model=AdsOverviewStats)
async def get_ads_overview_stats():
    """Get overall ads statistics"""
    db = get_db()
    
    # Count totals
    total_accounts = db.marketing_ads_accounts.count_documents({})
    total_campaigns = db.marketing_ads_campaigns.count_documents({})
    active_campaigns = db.marketing_ads_campaigns.count_documents({"status": "active"})
    total_ad_sets = db.marketing_ads_sets.count_documents({})
    total_ads = db.marketing_ads.count_documents({})
    
    # Aggregate metrics
    pipeline = [
        {
            "$group": {
                "_id": None,
                "total_spend": {"$sum": "$cost"},
                "total_impressions": {"$sum": "$impressions"},
                "total_clicks": {"$sum": "$clicks"},
                "total_conversions": {"$sum": "$conversions"}
            }
        }
    ]
    
    metrics_agg = list(db.marketing_ads_metrics.aggregate(pipeline))
    
    total_spend = 0
    total_impressions = 0
    total_clicks = 0
    total_conversions = 0
    
    if metrics_agg:
        total_spend = metrics_agg[0].get("total_spend", 0)
        total_impressions = metrics_agg[0].get("total_impressions", 0)
        total_clicks = metrics_agg[0].get("total_clicks", 0)
        total_conversions = metrics_agg[0].get("total_conversions", 0)
    
    # Calculate averages
    avg_ctr = round((total_clicks / total_impressions * 100), 2) if total_impressions > 0 else 0
    avg_cpc = round(total_spend / total_clicks, 2) if total_clicks > 0 else 0
    
    # Platform breakdown
    platforms_breakdown = []
    for platform in AdPlatform:
        platform_campaigns = db.marketing_ads_campaigns.count_documents({"platform": platform.value})
        active_platform_campaigns = db.marketing_ads_campaigns.count_documents({
            "platform": platform.value,
            "status": "active"
        })
        
        if platform_campaigns > 0:
            platforms_breakdown.append(PlatformMetricsSummary(
                platform=platform,
                total_campaigns=platform_campaigns,
                active_campaigns=active_platform_campaigns,
                total_spend=0,  # Would aggregate from metrics
                total_impressions=0,
                total_clicks=0,
                total_conversions=0,
                avg_ctr=0,
                avg_cpc=0,
                roas=0
            ))
    
    return AdsOverviewStats(
        total_accounts=total_accounts,
        total_campaigns=total_campaigns,
        active_campaigns=active_campaigns,
        total_ad_sets=total_ad_sets,
        total_ads=total_ads,
        total_spend=total_spend,
        total_impressions=total_impressions,
        total_clicks=total_clicks,
        total_conversions=total_conversions,
        avg_ctr=avg_ctr,
        avg_cpc=avg_cpc,
        overall_roas=0,
        platforms_breakdown=platforms_breakdown
    )


# ============== HELPER FUNCTIONS ==============

def _get_campaign_metrics_summary(db, campaign_id: str) -> dict:
    """Get aggregated metrics for a campaign"""
    pipeline = [
        {"$match": {"campaign_id": campaign_id}},
        {
            "$group": {
                "_id": None,
                "total_spend": {"$sum": "$cost"},
                "total_impressions": {"$sum": "$impressions"},
                "total_clicks": {"$sum": "$clicks"},
                "total_conversions": {"$sum": "$conversions"}
            }
        }
    ]
    
    result = list(db.marketing_ads_metrics.aggregate(pipeline))
    
    if result:
        return {
            "total_spend": result[0].get("total_spend", 0),
            "total_impressions": result[0].get("total_impressions", 0),
            "total_clicks": result[0].get("total_clicks", 0),
            "total_conversions": result[0].get("total_conversions", 0)
        }
    
    return {
        "total_spend": 0,
        "total_impressions": 0,
        "total_clicks": 0,
        "total_conversions": 0
    }


def _get_ad_metrics_summary(db, ad_id: str) -> dict:
    """Get aggregated metrics for an ad"""
    pipeline = [
        {"$match": {"ad_id": ad_id}},
        {
            "$group": {
                "_id": None,
                "total_spend": {"$sum": "$cost"},
                "total_impressions": {"$sum": "$impressions"},
                "total_clicks": {"$sum": "$clicks"},
                "ctr": {"$avg": "$ctr"},
                "cpc": {"$avg": "$cpc"}
            }
        }
    ]
    
    result = list(db.marketing_ads_metrics.aggregate(pipeline))
    
    if result:
        return {
            "total_spend": result[0].get("total_spend", 0),
            "total_impressions": result[0].get("total_impressions", 0),
            "total_clicks": result[0].get("total_clicks", 0),
            "ctr": round(result[0].get("ctr", 0), 2),
            "cpc": round(result[0].get("cpc", 0), 2)
        }
    
    return {
        "total_spend": 0,
        "total_impressions": 0,
        "total_clicks": 0,
        "ctr": 0,
        "cpc": 0
    }
