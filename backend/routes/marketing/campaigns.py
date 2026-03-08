"""
Campaigns Routes - Unified campaigns, stats
NOTE: Full implementation will be migrated from marketing_v2.py
"""

from fastapi import APIRouter, Depends, HTTPException, Query
from typing import List, Optional
import uuid
from datetime import datetime, timezone, timedelta

from .base import get_db, get_marketing_auth

router = APIRouter(tags=["Campaigns"])


@router.get("/unified-campaigns")
async def get_unified_campaigns(
    status: Optional[str] = None,
    campaign_type: Optional[str] = None,
    search: Optional[str] = None,
    limit: int = 100,
    user: dict = Depends(get_marketing_auth())
):
    """Get all campaigns (influencer + PR) in a unified view"""
    db = get_db()
    
    campaigns = []
    
    # Get influencer campaigns
    inf_query = {}
    if status:
        inf_query["status"] = status
    if search:
        inf_query["$or"] = [
            {"name": {"$regex": search, "$options": "i"}},
            {"description": {"$regex": search, "$options": "i"}}
        ]
    
    if campaign_type != "pr":
        inf_campaigns = await db.marketing_campaigns.find(inf_query, {"_id": 0}).to_list(limit)
        for c in inf_campaigns:
            c["campaign_type"] = "influencer"
            influencer_count = await db.contacts.count_documents({"campaign_id": c["id"]})
            c["contact_count"] = influencer_count
            campaigns.append(c)
    
    # Get PR campaigns
    pr_query = {}
    if status:
        pr_query["status"] = status
    if search:
        pr_query["$or"] = [
            {"name": {"$regex": search, "$options": "i"}},
            {"description": {"$regex": search, "$options": "i"}}
        ]
    
    if campaign_type != "influencer":
        pr_campaigns = await db.pr_campaigns.find(pr_query, {"_id": 0}).to_list(limit)
        for c in pr_campaigns:
            c["campaign_type"] = "pr"
            journalist_count = len(c.get("journalists", []))
            c["contact_count"] = journalist_count
            campaigns.append(c)
    
    campaigns.sort(key=lambda x: x.get("created_at", ""), reverse=True)
    return campaigns[:limit]


@router.get("/unified-campaigns/stats")
async def get_unified_campaign_stats(user: dict = Depends(get_marketing_auth())):
    """Get unified campaign statistics"""
    db = get_db()
    
    inf_total = await db.marketing_campaigns.count_documents({})
    inf_active = await db.marketing_campaigns.count_documents({"status": "active"})
    pr_total = await db.pr_campaigns.count_documents({})
    pr_active = await db.pr_campaigns.count_documents({"status": "active"})
    
    # Budget stats
    inf_campaigns = await db.marketing_campaigns.find({}, {"budget": 1, "spend": 1}).to_list(1000)
    inf_budget = sum(c.get("budget", 0) for c in inf_campaigns)
    inf_spend = sum(c.get("spend", 0) for c in inf_campaigns)
    
    pr_campaigns = await db.pr_campaigns.find({}, {"budget": 1, "spend": 1}).to_list(1000)
    pr_budget = sum(c.get("budget", 0) for c in pr_campaigns)
    pr_spend = sum(c.get("spend", 0) for c in pr_campaigns)
    
    return {
        "total_campaigns": inf_total + pr_total,
        "active_campaigns": inf_active + pr_active,
        "influencer_campaigns": inf_total,
        "pr_campaigns": pr_total,
        "total_budget": inf_budget + pr_budget,
        "total_spend": inf_spend + pr_spend,
        "budget_remaining": (inf_budget + pr_budget) - (inf_spend + pr_spend)
    }


@router.post("/campaigns/bulk-delete")
async def bulk_delete_campaigns(data: dict, user: dict = Depends(get_marketing_auth())):
    """Bulk delete multiple campaigns (both influencer and PR)"""
    db = get_db()
    
    ids = data.get("ids", [])
    if not ids:
        raise HTTPException(status_code=400, detail="No IDs provided")
    
    inf_result = await db.marketing_campaigns.delete_many({"id": {"$in": ids}})
    pr_result = await db.pr_campaigns.delete_many({"id": {"$in": ids}})
    
    await db.pr_pitches.delete_many({"campaign_id": {"$in": ids}})
    await db.contacts.update_many(
        {"campaign_id": {"$in": ids}},
        {"$set": {"campaign_id": None}}
    )
    
    total_deleted = inf_result.deleted_count + pr_result.deleted_count
    return {"deleted_count": total_deleted, "message": f"Deleted {total_deleted} campaigns"}
