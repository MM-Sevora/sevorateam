"""
Manufacturers Management - Buying & Sourcing Module
"""
from fastapi import APIRouter, HTTPException, Depends, Query
from pydantic import BaseModel
from typing import List, Optional, Callable
from datetime import datetime, timezone
import uuid


def create_manufacturers_router(db, get_current_user: Callable):
    """Factory function to create manufacturers router"""
    
    router = APIRouter(prefix="/manufacturers", tags=["Manufacturers"])
    
    PIPELINE_STAGES = ["Discovery", "Contacted", "Factory Visit", "Sampling", "Production Trial", "Active", "Inactive"]
    
    class ManufacturerCreate(BaseModel):
        name: str
        manufacturer_type: str = "Garment"
        country: str = "India"
        region: Optional[str] = None
        city: str
        address: Optional[str] = None
        website: Optional[str] = None
        email: Optional[str] = None
        phone: Optional[str] = None
        whatsapp: Optional[str] = None
        specialties: List[str] = []
        certifications: List[str] = []
        moq: int = 0
        moq_unit: str = "pieces"
        lead_time_days: int = 0
        payment_terms: Optional[str] = None
        price_range_min: Optional[float] = None
        price_range_max: Optional[float] = None
        currency: str = "INR"
        description: Optional[str] = None
        notes: Optional[str] = None

    class ManufacturerUpdate(BaseModel):
        name: Optional[str] = None
        manufacturer_type: Optional[str] = None
        city: Optional[str] = None
        email: Optional[str] = None
        phone: Optional[str] = None
        pipeline_stage: Optional[str] = None
        sub_stage: Optional[str] = None
        notes: Optional[str] = None

    @router.post("")
    async def create_manufacturer(manufacturer: ManufacturerCreate, current_user: dict = Depends(get_current_user)):
        now = datetime.now(timezone.utc).isoformat()
        doc = {
            "id": str(uuid.uuid4()),
            **manufacturer.dict(),
            "fit_score": 0,
            "quality_rating": None,
            "reliability_rating": None,
            "pipeline_stage": "Discovery",
            "sub_stage": "New",
            "ai_discovered": False,
            "source": "manual",
            "created_by": current_user.get("id"),
            "updated_by": current_user.get("id"),
            "created_at": now,
            "updated_at": now
        }
        await db.sourcing_manufacturers.insert_one(doc)
        doc.pop("_id", None)
        return doc

    @router.get("")
    async def list_manufacturers(
        current_user: dict = Depends(get_current_user),
        manufacturer_type: Optional[str] = None,
        pipeline_stage: Optional[str] = None,
        city: Optional[str] = None,
        search: Optional[str] = None,
        limit: int = Query(default=100, le=500)
    ):
        query = {}
        if manufacturer_type:
            query["manufacturer_type"] = manufacturer_type
        if pipeline_stage:
            query["pipeline_stage"] = pipeline_stage
        if city:
            query["city"] = city
        if search:
            query["$or"] = [
                {"name": {"$regex": search, "$options": "i"}},
                {"city": {"$regex": search, "$options": "i"}}
            ]
        return await db.sourcing_manufacturers.find(query, {"_id": 0}).sort("created_at", -1).limit(limit).to_list(length=limit)

    @router.get("/metadata")
    async def get_manufacturer_metadata(current_user: dict = Depends(get_current_user)):
        cities = await db.sourcing_manufacturers.distinct("city")
        types = await db.sourcing_manufacturers.distinct("manufacturer_type")
        return {
            "cities": [c for c in cities if c],
            "types": [t for t in types if t],
            "pipeline_stages": PIPELINE_STAGES
        }

    @router.get("/{manufacturer_id}")
    async def get_manufacturer(manufacturer_id: str, current_user: dict = Depends(get_current_user)):
        manufacturer = await db.sourcing_manufacturers.find_one({"id": manufacturer_id}, {"_id": 0})
        if not manufacturer:
            raise HTTPException(status_code=404, detail="Manufacturer not found")
        return manufacturer

    @router.put("/{manufacturer_id}")
    async def update_manufacturer(manufacturer_id: str, update: ManufacturerUpdate, current_user: dict = Depends(get_current_user)):
        existing = await db.sourcing_manufacturers.find_one({"id": manufacturer_id})
        if not existing:
            raise HTTPException(status_code=404, detail="Manufacturer not found")
        
        update_data = {k: v for k, v in update.dict().items() if v is not None}
        update_data["updated_at"] = datetime.now(timezone.utc).isoformat()
        update_data["updated_by"] = current_user.get("id")
        
        await db.sourcing_manufacturers.update_one({"id": manufacturer_id}, {"$set": update_data})
        return await db.sourcing_manufacturers.find_one({"id": manufacturer_id}, {"_id": 0})

    @router.put("/{manufacturer_id}/stage")
    async def update_manufacturer_stage(manufacturer_id: str, stage_data: dict, current_user: dict = Depends(get_current_user)):
        existing = await db.sourcing_manufacturers.find_one({"id": manufacturer_id})
        if not existing:
            raise HTTPException(status_code=404, detail="Manufacturer not found")
        
        update_data = {"updated_at": datetime.now(timezone.utc).isoformat()}
        if stage_data.get("pipeline_stage"):
            update_data["pipeline_stage"] = stage_data["pipeline_stage"]
        if stage_data.get("sub_stage"):
            update_data["sub_stage"] = stage_data["sub_stage"]
        
        await db.sourcing_manufacturers.update_one({"id": manufacturer_id}, {"$set": update_data})
        return await db.sourcing_manufacturers.find_one({"id": manufacturer_id}, {"_id": 0})

    @router.delete("/{manufacturer_id}")
    async def delete_manufacturer(manufacturer_id: str, current_user: dict = Depends(get_current_user)):
        result = await db.sourcing_manufacturers.delete_one({"id": manufacturer_id})
        if result.deleted_count == 0:
            raise HTTPException(status_code=404, detail="Manufacturer not found")
        return {"success": True, "message": "Manufacturer deleted"}

    @router.get("/analytics/summary")
    async def get_manufacturer_analytics(current_user: dict = Depends(get_current_user)):
        total = await db.sourcing_manufacturers.count_documents({})
        active = await db.sourcing_manufacturers.count_documents({"pipeline_stage": "Active"})
        sampling = await db.sourcing_manufacturers.count_documents({"pipeline_stage": "Sampling"})
        return {"total": total, "active": active, "sampling": sampling}

    return router
