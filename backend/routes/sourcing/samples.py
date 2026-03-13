"""
Samples Management - Buying & Sourcing Module
"""
from fastapi import APIRouter, HTTPException, Depends, Query
from pydantic import BaseModel
from typing import List, Optional, Callable
from datetime import datetime, timezone
import uuid


def create_samples_router(db, get_current_user: Callable):
    """Factory function to create samples router"""
    
    router = APIRouter(prefix="/samples", tags=["Samples"])
    
    SAMPLE_STATUSES = ["Requested", "Confirmed", "Shipped", "Received", "Testing", "Approved", "Rejected"]
    
    class SampleCreate(BaseModel):
        supplier_id: str
        supplier_name: Optional[str] = None
        fabric_type: str
        fabric_name: str
        composition: Optional[str] = None
        color: Optional[str] = None
        weight_gsm: Optional[int] = None
        width_inches: Optional[int] = None
        price_per_meter: Optional[float] = None
        currency: str = "INR"
        quantity_meters: float = 1.0
        notes: Optional[str] = None

    class SampleUpdate(BaseModel):
        status: Optional[str] = None
        tracking_number: Optional[str] = None
        quality_score: Optional[int] = None
        quality_notes: Optional[str] = None
        approved: Optional[bool] = None
        rejection_reason: Optional[str] = None

    @router.post("")
    async def create_sample(sample: SampleCreate, current_user: dict = Depends(get_current_user)):
        now = datetime.now(timezone.utc).isoformat()
        
        supplier_name = sample.supplier_name
        if not supplier_name and sample.supplier_id:
            supplier = await db.sourcing_suppliers.find_one({"id": sample.supplier_id}, {"name": 1})
            if supplier:
                supplier_name = supplier.get("name")
        
        doc = {
            "id": str(uuid.uuid4()),
            **sample.dict(),
            "supplier_name": supplier_name,
            "status": "Requested",
            "tracking_number": None,
            "requested_at": now,
            "confirmed_at": None,
            "shipped_at": None,
            "received_at": None,
            "tested_at": None,
            "quality_score": None,
            "quality_notes": None,
            "approved": None,
            "rejection_reason": None,
            "images": [],
            "created_by": current_user.get("id"),
            "updated_at": now
        }
        await db.sourcing_samples.insert_one(doc)
        doc.pop("_id", None)
        return doc

    @router.get("")
    async def list_samples(
        current_user: dict = Depends(get_current_user),
        supplier_id: Optional[str] = None,
        status: Optional[str] = None,
        limit: int = Query(default=100, le=500)
    ):
        query = {}
        if supplier_id:
            query["supplier_id"] = supplier_id
        if status:
            query["status"] = status
        return await db.sourcing_samples.find(query, {"_id": 0}).sort("requested_at", -1).limit(limit).to_list(length=limit)

    @router.get("/dashboard")
    async def get_samples_dashboard(current_user: dict = Depends(get_current_user)):
        total = await db.sourcing_samples.count_documents({})
        pending_receipt = await db.sourcing_samples.count_documents({"status": "Shipped"})
        pending_testing = await db.sourcing_samples.count_documents({"status": "Received"})
        pending_decision = await db.sourcing_samples.count_documents({"status": "Testing"})
        
        return {
            "total": total,
            "pending_receipt": pending_receipt,
            "pending_testing": pending_testing,
            "pending_decision": pending_decision
        }

    @router.get("/{sample_id}")
    async def get_sample(sample_id: str, current_user: dict = Depends(get_current_user)):
        sample = await db.sourcing_samples.find_one({"id": sample_id}, {"_id": 0})
        if not sample:
            raise HTTPException(status_code=404, detail="Sample not found")
        return sample

    @router.put("/{sample_id}")
    async def update_sample(sample_id: str, update: SampleUpdate, current_user: dict = Depends(get_current_user)):
        existing = await db.sourcing_samples.find_one({"id": sample_id})
        if not existing:
            raise HTTPException(status_code=404, detail="Sample not found")
        
        update_data = {k: v for k, v in update.dict().items() if v is not None}
        update_data["updated_at"] = datetime.now(timezone.utc).isoformat()
        
        await db.sourcing_samples.update_one({"id": sample_id}, {"$set": update_data})
        return await db.sourcing_samples.find_one({"id": sample_id}, {"_id": 0})

    @router.put("/{sample_id}/status")
    async def update_sample_status(sample_id: str, status_data: dict, current_user: dict = Depends(get_current_user)):
        existing = await db.sourcing_samples.find_one({"id": sample_id})
        if not existing:
            raise HTTPException(status_code=404, detail="Sample not found")
        
        new_status = status_data.get("status")
        if new_status not in SAMPLE_STATUSES:
            raise HTTPException(status_code=400, detail=f"Invalid status. Must be one of: {SAMPLE_STATUSES}")
        
        old_status = existing.get("status", "Requested")
        now = datetime.now(timezone.utc).isoformat()
        update_data = {"status": new_status, "updated_at": now}
        
        status_timestamp_map = {
            "Confirmed": "confirmed_at",
            "Shipped": "shipped_at",
            "Received": "received_at",
            "Testing": "tested_at"
        }
        if new_status in status_timestamp_map:
            update_data[status_timestamp_map[new_status]] = now
        
        if new_status == "Approved":
            update_data["approved"] = True
        elif new_status == "Rejected":
            update_data["approved"] = False
            update_data["rejection_reason"] = status_data.get("rejection_reason", "Not specified")
        
        if status_data.get("tracking_number"):
            update_data["tracking_number"] = status_data["tracking_number"]
        
        await db.sourcing_samples.update_one({"id": sample_id}, {"$set": update_data})
        
        # Trigger automation for status change
        if old_status != new_status:
            try:
                from services.automation_triggers import trigger_sample_status_changed
                import asyncio
                asyncio.create_task(trigger_sample_status_changed(
                    sample_id=sample_id,
                    sample_name=existing.get("fabric_name", "Sample"),
                    old_status=old_status,
                    new_status=new_status,
                    changed_by_id=current_user.get("id"),
                    changed_by_name=current_user.get("name", "User"),
                    brand_name=existing.get("supplier_name"),
                    assigned_to=existing.get("requested_by") or existing.get("created_by")
                ))
            except Exception:
                pass  # Don't fail the request if notification fails
        
        return await db.sourcing_samples.find_one({"id": sample_id}, {"_id": 0})

    @router.delete("/{sample_id}")
    async def delete_sample(sample_id: str, current_user: dict = Depends(get_current_user)):
        result = await db.sourcing_samples.delete_one({"id": sample_id})
        if result.deleted_count == 0:
            raise HTTPException(status_code=404, detail="Sample not found")
        return {"success": True, "message": "Sample deleted"}

    return router
