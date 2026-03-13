"""
Entity Linking API
Allows linking entities (influencers, leads, emails, etc.) to campaigns
"""
from fastapi import APIRouter, HTTPException, Depends, Query
from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime, timezone
import uuid

router = APIRouter(prefix="/entity-links", tags=["Entity Links"])

db = None


def init_entity_links(database):
    """Initialize with database connection"""
    global db
    db = database


class EntityLinkCreate(BaseModel):
    source_type: str  # influencer, lead, email, contact, brand
    source_id: str
    source_name: Optional[str] = None
    target_type: str  # campaign, project, task
    target_id: str
    target_name: Optional[str] = None
    link_type: Optional[str] = "related"  # related, assigned, mentioned, etc.
    notes: Optional[str] = None


class EntityLinkResponse(BaseModel):
    id: str
    source_type: str
    source_id: str
    source_name: Optional[str]
    target_type: str
    target_id: str
    target_name: Optional[str]
    link_type: str
    notes: Optional[str]
    created_at: str
    created_by: Optional[str]


def create_router(get_current_user):
    """Create router with dependency injection"""
    
    @router.get("")
    async def list_entity_links(
        source_type: Optional[str] = None,
        source_id: Optional[str] = None,
        target_type: Optional[str] = None,
        target_id: Optional[str] = None,
        current_user: dict = Depends(get_current_user)
    ):
        """List entity links with optional filtering"""
        query = {}
        if source_type:
            query["source_type"] = source_type
        if source_id:
            query["source_id"] = source_id
        if target_type:
            query["target_type"] = target_type
        if target_id:
            query["target_id"] = target_id
            
        links = await db.entity_links.find(query, {"_id": 0}).sort("created_at", -1).to_list(100)
        return links
    
    @router.get("/for-entity/{entity_type}/{entity_id}")
    async def get_links_for_entity(
        entity_type: str,
        entity_id: str,
        current_user: dict = Depends(get_current_user)
    ):
        """Get all links for a specific entity (either as source or target)"""
        links = await db.entity_links.find({
            "$or": [
                {"source_type": entity_type, "source_id": entity_id},
                {"target_type": entity_type, "target_id": entity_id}
            ]
        }, {"_id": 0}).sort("created_at", -1).to_list(100)
        return links
    
    @router.post("")
    async def create_entity_link(
        link: EntityLinkCreate,
        current_user: dict = Depends(get_current_user)
    ):
        """Create a new entity link"""
        # Check if link already exists
        existing = await db.entity_links.find_one({
            "source_type": link.source_type,
            "source_id": link.source_id,
            "target_type": link.target_type,
            "target_id": link.target_id
        })
        if existing:
            raise HTTPException(status_code=400, detail="Link already exists")
        
        doc = {
            "id": str(uuid.uuid4()),
            "source_type": link.source_type,
            "source_id": link.source_id,
            "source_name": link.source_name,
            "target_type": link.target_type,
            "target_id": link.target_id,
            "target_name": link.target_name,
            "link_type": link.link_type or "related",
            "notes": link.notes,
            "created_at": datetime.now(timezone.utc).isoformat(),
            "created_by": current_user.get("id")
        }
        await db.entity_links.insert_one(doc)
        doc.pop("_id", None)
        return doc
    
    @router.delete("/{link_id}")
    async def delete_entity_link(
        link_id: str,
        current_user: dict = Depends(get_current_user)
    ):
        """Delete an entity link"""
        result = await db.entity_links.delete_one({"id": link_id})
        if result.deleted_count == 0:
            raise HTTPException(status_code=404, detail="Link not found")
        return {"message": "Link deleted"}
    
    @router.get("/campaigns")
    async def get_available_campaigns(
        current_user: dict = Depends(get_current_user)
    ):
        """Get all campaigns for linking dropdown"""
        campaigns = []
        
        # Fetch influencer campaigns
        inf_campaigns = await db.marketing_campaigns.find(
            {"status": {"$ne": "cancelled"}},
            {"_id": 0, "id": 1, "name": 1, "status": 1}
        ).sort("created_at", -1).limit(50).to_list(50)
        for c in inf_campaigns:
            c["campaign_type"] = "influencer"
            campaigns.append(c)
        
        # Fetch PR campaigns
        pr_campaigns = await db.pr_campaigns.find(
            {"status": {"$ne": "cancelled"}},
            {"_id": 0, "id": 1, "name": 1, "status": 1}
        ).sort("created_at", -1).limit(50).to_list(50)
        for c in pr_campaigns:
            c["campaign_type"] = "pr"
            campaigns.append(c)
        
        return campaigns
    
    @router.get("/campaign/{campaign_id}/linked-entities")
    async def get_campaign_linked_entities(
        campaign_id: str,
        current_user: dict = Depends(get_current_user)
    ):
        """Get all entities linked to a specific campaign"""
        links = await db.entity_links.find({
            "$or": [
                {"target_type": "campaign", "target_id": campaign_id},
                {"source_type": "campaign", "source_id": campaign_id}
            ]
        }, {"_id": 0}).to_list(100)
        
        # Group by entity type
        grouped = {
            "influencers": [],
            "leads": [],
            "emails": [],
            "contacts": [],
            "brands": [],
            "other": []
        }
        
        # Map singular types to plural keys
        type_to_key = {
            "influencer": "influencers",
            "lead": "leads",
            "email": "emails",
            "contact": "contacts",
            "brand": "brands"
        }
        
        for link in links:
            entity_type = link.get("source_type") if link.get("target_type") == "campaign" else link.get("target_type")
            entity_id = link.get("source_id") if link.get("target_type") == "campaign" else link.get("target_id")
            entity_name = link.get("source_name") if link.get("target_type") == "campaign" else link.get("target_name")
            
            entity_info = {
                "id": entity_id,
                "name": entity_name,
                "link_id": link.get("id"),
                "link_type": link.get("link_type"),
                "notes": link.get("notes"),
                "created_at": link.get("created_at")
            }
            
            # Get the plural key for the entity type
            group_key = type_to_key.get(entity_type)
            if group_key and group_key in grouped:
                grouped[group_key].append(entity_info)
            else:
                entity_info["type"] = entity_type
                grouped["other"].append(entity_info)
        
        return grouped
    
    return router
