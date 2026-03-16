"""
Brands Management - Buying & Sourcing Module
"""
from fastapi import APIRouter, HTTPException, Depends, Query
from pydantic import BaseModel, EmailStr
from typing import List, Optional, Callable
from datetime import datetime, timezone
import uuid

from utils.permissions import can_delete_record, get_delete_error_message


def create_brands_router(db, get_current_user: Callable):
    """Factory function to create brands router with dependencies"""
    
    router = APIRouter(prefix="/brands", tags=["Brands"])
    
    # Pipeline stages and sub-stages
    PIPELINE_STAGES = ["Discovery", "Contacted", "Qualified", "Interested", "Negotiation", "Onboarded", "Lost"]
    
    PIPELINE_SUBSTAGES = {
        "Discovery": ["New", "Researching", "Ready to Contact"],
        "Contacted": ["Email Sent", "WhatsApp Sent", "LinkedIn Sent", "No Response", "Follow Up Scheduled"],
        "Qualified": ["Initial Call Done", "Info Shared", "Evaluating"],
        "Interested": ["Pricing Discussed", "Samples Requested", "Demo Scheduled"],
        "Negotiation": ["Terms Shared", "Counter Offer", "Final Review"],
        "Onboarded": ["Contract Signed", "Onboarding", "Active Partner"],
        "Lost": ["Not Interested", "Budget Issues", "Competitor Chosen", "No Response", "Bad Fit"]
    }
    
    # Models
    class BrandCreate(BaseModel):
        name: str
        website: Optional[str] = None
        instagram: Optional[str] = None
        linkedin: Optional[str] = None
        division: str = "Apparel"
        categories: List[str] = []
        gender: List[str] = []
        segment: str = "Affordable Luxury"
        price_range_min: int = 5000
        price_range_max: int = 60000
        city: str
        email: Optional[str] = None
        phone_number: Optional[str] = None
        address: Optional[str] = None
        description: Optional[str] = None

    class BrandUpdate(BaseModel):
        name: Optional[str] = None
        website: Optional[str] = None
        instagram: Optional[str] = None
        linkedin: Optional[str] = None
        division: Optional[str] = None
        categories: Optional[List[str]] = None
        gender: Optional[List[str]] = None
        segment: Optional[str] = None
        price_range_min: Optional[int] = None
        price_range_max: Optional[int] = None
        city: Optional[str] = None
        email: Optional[str] = None
        phone_number: Optional[str] = None
        address: Optional[str] = None
        description: Optional[str] = None
        outreach_status: Optional[str] = None
        pipeline_stage: Optional[str] = None
        sub_stage: Optional[str] = None
        follow_up_date: Optional[str] = None

    class BrandNoteCreate(BaseModel):
        note: str
        status_change: Optional[str] = None

    class ContactCreate(BaseModel):
        name: str
        designation: Optional[str] = None
        email: Optional[EmailStr] = None
        phone: Optional[str] = None
        linkedin: Optional[str] = None
        is_primary: bool = False

    # Endpoints
    @router.post("")
    async def create_brand(brand: BrandCreate, current_user: dict = Depends(get_current_user)):
        """Create a new brand"""
        now = datetime.now(timezone.utc).isoformat()
        brand_doc = {
            "id": str(uuid.uuid4()),
            "name": brand.name,
            "website": brand.website,
            "instagram": brand.instagram,
            "linkedin": brand.linkedin,
            "division": brand.division,
            "categories": brand.categories,
            "gender": brand.gender,
            "segment": brand.segment,
            "price_range_min": brand.price_range_min,
            "price_range_max": brand.price_range_max,
            "city": brand.city,
            "email": brand.email,
            "phone_number": brand.phone_number,
            "address": brand.address,
            "description": brand.description,
            "fit_score": 0,
            "positioning_type": "Unknown",
            "match_status": "Pending",
            "outreach_status": "Not Contacted",
            "pipeline_stage": "Discovery",
            "sub_stage": "New",
            "follow_up_date": None,
            "ai_discovered": False,
            "ai_reasoning": None,
            "source": "manual",
            "created_by": current_user.get("id"),
            "updated_by": current_user.get("id"),
            "created_at": now,
            "updated_at": now
        }
        
        await db.sourcing_brands.insert_one(brand_doc)
        
        # Log activity
        await db.sourcing_activity_logs.insert_one({
            "id": str(uuid.uuid4()),
            "user_id": current_user.get("id"),
            "user_name": current_user.get("name"),
            "action": "created",
            "entity_type": "brand",
            "entity_id": brand_doc["id"],
            "entity_name": brand.name,
            "details": {"segment": brand.segment, "city": brand.city},
            "created_at": now
        })
        
        brand_doc.pop("_id", None)
        return brand_doc

    @router.get("")
    async def list_brands(
        current_user: dict = Depends(get_current_user),
        pipeline_stage: Optional[str] = None,
        segment: Optional[str] = None,
        city: Optional[str] = None,
        search: Optional[str] = None,
        limit: int = Query(default=100, le=500)
    ):
        """List all brands with optional filters"""
        from utils.permissions import get_data_scope_query
        
        filter_query = {}
        
        if pipeline_stage:
            filter_query["pipeline_stage"] = pipeline_stage
        if segment:
            filter_query["segment"] = segment
        if city:
            filter_query["city"] = city
        if search:
            filter_query["$or"] = [
                {"name": {"$regex": search, "$options": "i"}},
                {"city": {"$regex": search, "$options": "i"}},
                {"email": {"$regex": search, "$options": "i"}}
            ]
        
        # Apply data scope filtering based on user's module permissions
        query = get_data_scope_query(current_user, "sourcing", filter_query)
        
        brands = await db.sourcing_brands.find(query, {"_id": 0}).sort("created_at", -1).limit(limit).to_list(length=limit)
        
        # Populate creator names and permissions
        user_id = current_user.get("id")
        user_role = current_user.get("role", "")
        is_admin = user_role in ["super_admin", "admin"] or current_user.get("can_manage_users")
        
        user_ids = list(set([b.get("created_by") for b in brands if b.get("created_by")]))
        user_map = {}
        if user_ids:
            users = await db.users.find({"id": {"$in": user_ids}}, {"_id": 0, "id": 1, "name": 1}).to_list(100)
            user_map = {u["id"]: u.get("name", "System") for u in users}
        
        for brand in brands:
            # Show "System" for brands with no creator or unknown creator (e.g., imported data)
            if brand.get("created_by"):
                brand["created_by_name"] = user_map.get(brand.get("created_by"), "Imported")
            else:
                brand["created_by_name"] = None
            # Add permissions - if no created_by, only admin can delete
            brand["_permissions"] = {
                "can_edit": brand.get("created_by") == user_id or is_admin,
                "can_delete": brand.get("created_by") == user_id or is_admin,
                "is_owner": brand.get("created_by") == user_id if brand.get("created_by") else False,
            }
        
        return brands

    @router.get("/paginated")
    async def list_brands_paginated(
        current_user: dict = Depends(get_current_user),
        page: int = Query(default=1, ge=1),
        page_size: int = Query(default=20, le=100),
        pipeline_stage: Optional[str] = None,
        segment: Optional[str] = None,
        city: Optional[str] = None,
        search: Optional[str] = None,
        added_by: Optional[str] = None,
        sort_by: Optional[str] = Query(default="created_at", description="Field to sort by: created_at, name, city, segment, pipeline_stage, fit_score"),
        sort_order: Optional[str] = Query(default="desc", description="Sort order: asc or desc")
    ):
        """List brands with pagination, filtering, and sorting"""
        from utils.permissions import get_data_scope_query
        
        filter_query = {}
        
        if pipeline_stage:
            filter_query["pipeline_stage"] = pipeline_stage
        if segment:
            filter_query["segment"] = segment
        if city:
            filter_query["city"] = city
        if added_by:
            filter_query["created_by"] = added_by
        if search:
            filter_query["$or"] = [
                {"name": {"$regex": search, "$options": "i"}},
                {"city": {"$regex": search, "$options": "i"}}
            ]
        
        # Apply data scope filtering based on user's module permissions
        query = get_data_scope_query(current_user, "sourcing", filter_query)
        
        total = await db.sourcing_brands.count_documents(query)
        skip = (page - 1) * page_size
        
        # Determine sort direction
        sort_direction = -1 if sort_order == "desc" else 1
        
        # Validate sort field to prevent injection
        allowed_sort_fields = ["created_at", "name", "city", "segment", "pipeline_stage", "fit_score", "updated_at"]
        if sort_by not in allowed_sort_fields:
            sort_by = "created_at"
        
        brands = await db.sourcing_brands.find(query, {"_id": 0}).sort(sort_by, sort_direction).skip(skip).limit(page_size).to_list(length=page_size)
        
        # Get email counts for each brand
        brand_ids = [b.get("id") for b in brands if b.get("id")]
        if brand_ids:
            email_counts = await db.sourcing_outreach_logs.aggregate([
                {"$match": {"brand_id": {"$in": brand_ids}}},
                {"$group": {"_id": "$brand_id", "count": {"$sum": 1}}}
            ]).to_list(length=1000)
            email_count_map = {e["_id"]: e["count"] for e in email_counts}
            for brand in brands:
                brand["email_count"] = email_count_map.get(brand.get("id"), 0)
        
        # Populate creator names
        user_ids = list(set([b.get("created_by") for b in brands if b.get("created_by")]))
        if user_ids:
            users = await db.users.find({"id": {"$in": user_ids}}, {"_id": 0, "id": 1, "name": 1}).to_list(100)
            user_map = {u["id"]: u.get("name", "System") for u in users}
            for brand in brands:
                if brand.get("created_by"):
                    brand["created_by_name"] = user_map.get(brand.get("created_by"), "Imported")
        
        # Get unique creators for the "Added by" filter dropdown
        # Include both users who have created brands AND all active team members
        all_creators = await db.sourcing_brands.distinct("created_by")
        all_creators = [c for c in all_creators if c]  # Filter out None values
        
        # Also get all active users for the dropdown
        active_users = await db.users.find(
            {"status": "active"}, 
            {"_id": 0, "id": 1, "name": 1}
        ).to_list(100)
        
        # Merge: prioritize active users list, but include any creator not in that list
        user_ids_set = {u["id"] for u in active_users}
        creators_list = [{"id": u["id"], "name": u.get("name", "Team Member")} for u in active_users]
        
        # Add any creators not in active users
        missing_creators = [c for c in all_creators if c not in user_ids_set]
        if missing_creators:
            extra_users = await db.users.find(
                {"id": {"$in": missing_creators}}, 
                {"_id": 0, "id": 1, "name": 1}
            ).to_list(100)
            creators_list.extend([{"id": u["id"], "name": u.get("name", "Former Member")} for u in extra_users])
        
        # Sort by name
        creators_list.sort(key=lambda x: x.get("name", "").lower())
        
        # Get unique cities for the filter dropdown
        unique_cities = await db.sourcing_brands.distinct("city")
        unique_cities = [c for c in unique_cities if c]  # Filter out empty values
        
        return {
            "brands": brands,
            "total": total,
            "page": page,
            "page_size": page_size,
            "total_pages": (total + page_size - 1) // page_size,
            "filters_meta": {
                "creators": creators_list,
                "cities": sorted(unique_cities)
            }
        }

    @router.get("/substages")
    async def get_pipeline_substages():
        """Get pipeline stages and their sub-stages"""
        return PIPELINE_SUBSTAGES

    @router.get("/{brand_id}")
    async def get_brand(brand_id: str, current_user: dict = Depends(get_current_user)):
        """Get a specific brand by ID"""
        brand = await db.sourcing_brands.find_one({"id": brand_id}, {"_id": 0})
        if not brand:
            raise HTTPException(status_code=404, detail="Brand not found")
        return brand

    @router.put("/{brand_id}")
    async def update_brand(brand_id: str, brand_update: BrandUpdate, current_user: dict = Depends(get_current_user)):
        """Update a brand"""
        existing = await db.sourcing_brands.find_one({"id": brand_id})
        if not existing:
            raise HTTPException(status_code=404, detail="Brand not found")
        
        update_data = {k: v for k, v in brand_update.dict().items() if v is not None}
        update_data["updated_at"] = datetime.now(timezone.utc).isoformat()
        update_data["updated_by"] = current_user.get("id")
        
        await db.sourcing_brands.update_one({"id": brand_id}, {"$set": update_data})
        
        updated = await db.sourcing_brands.find_one({"id": brand_id}, {"_id": 0})
        return updated

    @router.put("/{brand_id}/stage")
    async def update_brand_stage(
        brand_id: str,
        stage_data: dict,
        current_user: dict = Depends(get_current_user)
    ):
        """Update brand pipeline stage and sub-stage"""
        existing = await db.sourcing_brands.find_one({"id": brand_id})
        if not existing:
            raise HTTPException(status_code=404, detail="Brand not found")
        
        new_stage = stage_data.get("pipeline_stage")
        new_sub_stage = stage_data.get("sub_stage")
        
        now = datetime.now(timezone.utc).isoformat()
        update_data = {"updated_at": now, "updated_by": current_user.get("id")}
        
        if new_stage:
            update_data["pipeline_stage"] = new_stage
        if new_sub_stage:
            update_data["sub_stage"] = new_sub_stage
        
        await db.sourcing_brands.update_one({"id": brand_id}, {"$set": update_data})
        
        # Log activity
        await db.sourcing_activity_logs.insert_one({
            "id": str(uuid.uuid4()),
            "user_id": current_user.get("id"),
            "user_name": current_user.get("name"),
            "action": "stage_changed",
            "entity_type": "brand",
            "entity_id": brand_id,
            "entity_name": existing.get("name"),
            "details": {
                "old_stage": existing.get("pipeline_stage"),
                "new_stage": new_stage or existing.get("pipeline_stage"),
                "old_sub_stage": existing.get("sub_stage"),
                "new_sub_stage": new_sub_stage
            },
            "created_at": now
        })
        
        # Trigger automation for stage change
        old_stage = existing.get("pipeline_stage")
        if new_stage and old_stage != new_stage:
            try:
                from services.automation_triggers import trigger_brand_stage_changed
                import asyncio
                asyncio.create_task(trigger_brand_stage_changed(
                    brand_id=brand_id,
                    brand_name=existing.get("name", "Brand"),
                    old_stage=old_stage or "new",
                    new_stage=new_stage,
                    changed_by_id=current_user.get("id"),
                    changed_by_name=current_user.get("name", "User")
                ))
            except Exception:
                pass  # Don't fail the request if notification fails
        
        updated = await db.sourcing_brands.find_one({"id": brand_id}, {"_id": 0})
        return updated

    @router.delete("/{brand_id}")
    async def delete_brand(brand_id: str, current_user: dict = Depends(get_current_user)):
        """Delete a brand - only creator or admin can delete"""
        existing = await db.sourcing_brands.find_one({"id": brand_id})
        if not existing:
            raise HTTPException(status_code=404, detail="Brand not found")
        
        # Check delete permission
        if not can_delete_record(existing, current_user):
            raise HTTPException(status_code=403, detail=get_delete_error_message(existing))
        
        await db.sourcing_brands.delete_one({"id": brand_id})
        await db.sourcing_contacts.delete_many({"brand_id": brand_id})
        await db.sourcing_brand_notes.delete_many({"brand_id": brand_id})
        
        return {"success": True, "message": "Brand deleted"}

    @router.post("/bulk-delete")
    async def bulk_delete_brands(data: dict, current_user: dict = Depends(get_current_user)):
        """Bulk delete brands - only items user can delete"""
        brand_ids = data.get("brand_ids", [])
        if not brand_ids:
            raise HTTPException(status_code=400, detail="No brand IDs provided")
        
        # Check permissions for each brand
        brands = await db.sourcing_brands.find({"id": {"$in": brand_ids}}).to_list(len(brand_ids))
        allowed_ids = [b["id"] for b in brands if can_delete_record(b, current_user)]
        denied_count = len(brand_ids) - len(allowed_ids)
        
        if not allowed_ids:
            raise HTTPException(status_code=403, detail="You don't have permission to delete any of these brands")
        
        result = await db.sourcing_brands.delete_many({"id": {"$in": allowed_ids}})
        await db.sourcing_contacts.delete_many({"brand_id": {"$in": allowed_ids}})
        await db.sourcing_brand_notes.delete_many({"brand_id": {"$in": allowed_ids}})
        
        return {"success": True, "deleted_count": result.deleted_count, "denied_count": denied_count}

    # Brand Notes
    @router.post("/{brand_id}/notes")
    async def create_brand_note(brand_id: str, note: BrandNoteCreate, current_user: dict = Depends(get_current_user)):
        """Add a note to a brand"""
        brand = await db.sourcing_brands.find_one({"id": brand_id})
        if not brand:
            raise HTTPException(status_code=404, detail="Brand not found")
        
        now = datetime.now(timezone.utc).isoformat()
        note_doc = {
            "id": str(uuid.uuid4()),
            "brand_id": brand_id,
            "user_id": current_user.get("id"),
            "user_name": current_user.get("name"),
            "note": note.note,
            "status_change": note.status_change,
            "created_at": now
        }
        
        await db.sourcing_brand_notes.insert_one(note_doc)
        note_doc.pop("_id", None)
        return note_doc

    @router.get("/{brand_id}/notes")
    async def get_brand_notes(brand_id: str, current_user: dict = Depends(get_current_user)):
        """Get all notes for a brand"""
        notes = await db.sourcing_brand_notes.find({"brand_id": brand_id}, {"_id": 0}).sort("created_at", -1).to_list(length=100)
        return notes

    # Brand Contacts
    @router.post("/{brand_id}/contacts")
    async def create_brand_contact(brand_id: str, contact: ContactCreate, current_user: dict = Depends(get_current_user)):
        """Add a contact to a brand"""
        brand = await db.sourcing_brands.find_one({"id": brand_id})
        if not brand:
            raise HTTPException(status_code=404, detail="Brand not found")
        
        now = datetime.now(timezone.utc).isoformat()
        contact_doc = {
            "id": str(uuid.uuid4()),
            "brand_id": brand_id,
            "name": contact.name,
            "designation": contact.designation,
            "email": contact.email,
            "phone": contact.phone,
            "linkedin": contact.linkedin,
            "is_primary": contact.is_primary,
            "email_verified": False,
            "verification_status": "Pending",
            "created_at": now,
            "updated_at": now
        }
        
        if contact.is_primary:
            await db.sourcing_contacts.update_many(
                {"brand_id": brand_id, "is_primary": True},
                {"$set": {"is_primary": False}}
            )
        
        await db.sourcing_contacts.insert_one(contact_doc)
        contact_doc.pop("_id", None)
        return contact_doc

    @router.get("/{brand_id}/contacts")
    async def get_brand_contacts(brand_id: str, current_user: dict = Depends(get_current_user)):
        """Get all contacts for a brand"""
        contacts = await db.sourcing_contacts.find({"brand_id": brand_id}, {"_id": 0}).to_list(length=50)
        return contacts

    @router.delete("/contacts/{contact_id}")
    async def delete_contact(contact_id: str, current_user: dict = Depends(get_current_user)):
        """Delete a contact"""
        result = await db.sourcing_contacts.delete_one({"id": contact_id})
        if result.deleted_count == 0:
            raise HTTPException(status_code=404, detail="Contact not found")
        return {"success": True, "message": "Contact deleted"}

    # Analytics
    @router.get("/analytics/pipeline")
    async def get_pipeline_analytics(current_user: dict = Depends(get_current_user)):
        """Get pipeline analytics for brands"""
        pipeline = [
            {"$group": {"_id": "$pipeline_stage", "count": {"$sum": 1}}},
            {"$sort": {"_id": 1}}
        ]
        
        results = await db.sourcing_brands.aggregate(pipeline).to_list(length=20)
        
        analytics = {stage: 0 for stage in PIPELINE_STAGES}
        for r in results:
            if r["_id"] in analytics:
                analytics[r["_id"]] = r["count"]
        
        total = sum(analytics.values())
        
        return {
            "stages": analytics,
            "total": total,
            "conversion_rates": {
                "discovery_to_contacted": round(analytics.get("Contacted", 0) / max(analytics.get("Discovery", 1), 1) * 100, 1),
                "contacted_to_qualified": round(analytics.get("Qualified", 0) / max(analytics.get("Contacted", 1), 1) * 100, 1),
                "qualified_to_onboarded": round(analytics.get("Onboarded", 0) / max(analytics.get("Qualified", 1), 1) * 100, 1)
            }
        }

    @router.get("/analytics/by-city")
    async def get_brands_by_city(current_user: dict = Depends(get_current_user)):
        """Get brand counts by city"""
        pipeline = [
            {"$group": {"_id": "$city", "count": {"$sum": 1}}},
            {"$sort": {"count": -1}},
            {"$limit": 20}
        ]
        
        results = await db.sourcing_brands.aggregate(pipeline).to_list(length=20)
        return [{"city": r["_id"], "count": r["count"]} for r in results if r["_id"]]

    return router
