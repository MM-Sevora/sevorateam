"""
Suppliers Management - Buying & Sourcing Module
"""
from fastapi import APIRouter, HTTPException, Depends, Query
from pydantic import BaseModel
from typing import List, Optional, Callable
from datetime import datetime, timezone
import uuid

from utils.permissions import can_delete_record, get_delete_error_message


def create_suppliers_router(db, get_current_user: Callable):
    """Factory function to create suppliers router"""
    
    router = APIRouter(prefix="/suppliers", tags=["Suppliers"])
    
    PIPELINE_STAGES = ["Discovery", "Contacted", "Sampling", "Evaluation", "Negotiation", "Active", "Inactive"]
    
    class SupplierCreate(BaseModel):
        name: str
        supplier_type: str = "Fabric"
        country: str = "India"
        region: Optional[str] = None
        city: str
        address: Optional[str] = None
        website: Optional[str] = None
        email: Optional[str] = None
        phone: Optional[str] = None
        whatsapp: Optional[str] = None
        categories: List[str] = []
        specialties: List[str] = []
        certifications: List[str] = []
        moq_meters: int = 0
        lead_time_days: int = 0
        payment_terms: Optional[str] = None
        price_range_min: Optional[float] = None
        price_range_max: Optional[float] = None
        currency: str = "INR"
        description: Optional[str] = None
        notes: Optional[str] = None

    class SupplierUpdate(BaseModel):
        name: Optional[str] = None
        supplier_type: Optional[str] = None
        city: Optional[str] = None
        email: Optional[str] = None
        phone: Optional[str] = None
        pipeline_stage: Optional[str] = None
        sub_stage: Optional[str] = None
        notes: Optional[str] = None
        follow_up_date: Optional[str] = None

    @router.post("")
    async def create_supplier(supplier: SupplierCreate, current_user: dict = Depends(get_current_user)):
        now = datetime.now(timezone.utc).isoformat()
        doc = {
            "id": str(uuid.uuid4()),
            **supplier.dict(),
            "fit_score": 0,
            "quality_rating": None,
            "reliability_rating": None,
            "pipeline_stage": "Discovery",
            "sub_stage": "New",
            "follow_up_date": None,
            "ai_discovered": False,
            "source": "manual",
            "created_by": current_user.get("id"),
            "updated_by": current_user.get("id"),
            "created_at": now,
            "updated_at": now
        }
        await db.sourcing_suppliers.insert_one(doc)
        doc.pop("_id", None)
        return doc

    @router.get("")
    async def list_suppliers(
        current_user: dict = Depends(get_current_user),
        supplier_type: Optional[str] = None,
        pipeline_stage: Optional[str] = None,
        city: Optional[str] = None,
        search: Optional[str] = None,
        include_my_suppliers: bool = True,
        limit: int = Query(default=100, le=500)
    ):
        """List suppliers with filters. Respects data scope permissions."""
        from utils.permissions import get_data_scope_query
        
        user_id = current_user.get("id")
        user_role = current_user.get("role", "")
        is_admin = user_role in ["super_admin", "admin"] or current_user.get("can_manage_users")
        
        filter_query = {}
        if supplier_type:
            filter_query["supplier_type"] = supplier_type
        if pipeline_stage:
            filter_query["pipeline_stage"] = pipeline_stage
        if city:
            filter_query["city"] = city
        if search:
            filter_query["$or"] = [
                {"name": {"$regex": search, "$options": "i"}},
                {"city": {"$regex": search, "$options": "i"}}
            ]
        
        # Apply data scope filtering based on user's module permissions
        query = get_data_scope_query(current_user, "sourcing", filter_query)
        
        suppliers = await db.sourcing_suppliers.find(query, {"_id": 0}).sort("created_at", -1).limit(limit).to_list(length=limit)
        
        # Populate creator names and permissions
        user_ids = list(set([s.get("created_by") for s in suppliers if s.get("created_by")]))
        user_map = {}
        if user_ids:
            users = await db.users.find({"id": {"$in": user_ids}}, {"_id": 0, "id": 1, "name": 1}).to_list(100)
            user_map = {u["id"]: u.get("name", "Unknown") for u in users}
        
        for supplier in suppliers:
            supplier["created_by_name"] = user_map.get(supplier.get("created_by"), "Unknown") if supplier.get("created_by") else None
            supplier["_permissions"] = {
                "can_edit": supplier.get("created_by") == user_id or supplier.get("assigned_to") == user_id or is_admin,
                "can_delete": supplier.get("created_by") == user_id or is_admin,
                "is_owner": supplier.get("created_by") == user_id if supplier.get("created_by") else False,
            }
        
        return suppliers

    async def populate_creator_names(db, items):
        """Helper to populate created_by_name for a list of items"""
        user_ids = list(set([i.get("created_by") for i in items if i.get("created_by")]))
        if user_ids:
            users = await db.users.find({"id": {"$in": user_ids}}, {"_id": 0, "id": 1, "name": 1}).to_list(100)
            user_map = {u["id"]: u.get("name", "Unknown") for u in users}
            for item in items:
                item["created_by_name"] = user_map.get(item.get("created_by"), "Unknown")
        return items

    @router.get("/metadata")
    async def get_supplier_metadata(current_user: dict = Depends(get_current_user)):
        cities = await db.sourcing_suppliers.distinct("city")
        types = await db.sourcing_suppliers.distinct("supplier_type")
        return {
            "cities": [c for c in cities if c],
            "types": [t for t in types if t],
            "pipeline_stages": PIPELINE_STAGES
        }

    @router.get("/{supplier_id}")
    async def get_supplier(supplier_id: str, current_user: dict = Depends(get_current_user)):
        supplier = await db.sourcing_suppliers.find_one({"id": supplier_id}, {"_id": 0})
        if not supplier:
            raise HTTPException(status_code=404, detail="Supplier not found")
        return supplier

    @router.put("/{supplier_id}")
    async def update_supplier(supplier_id: str, update: SupplierUpdate, current_user: dict = Depends(get_current_user)):
        existing = await db.sourcing_suppliers.find_one({"id": supplier_id})
        if not existing:
            raise HTTPException(status_code=404, detail="Supplier not found")
        
        update_data = {k: v for k, v in update.dict().items() if v is not None}
        update_data["updated_at"] = datetime.now(timezone.utc).isoformat()
        update_data["updated_by"] = current_user.get("id")
        
        await db.sourcing_suppliers.update_one({"id": supplier_id}, {"$set": update_data})
        return await db.sourcing_suppliers.find_one({"id": supplier_id}, {"_id": 0})

    @router.put("/{supplier_id}/stage")
    async def update_supplier_stage(supplier_id: str, stage_data: dict, current_user: dict = Depends(get_current_user)):
        existing = await db.sourcing_suppliers.find_one({"id": supplier_id})
        if not existing:
            raise HTTPException(status_code=404, detail="Supplier not found")
        
        update_data = {"updated_at": datetime.now(timezone.utc).isoformat()}
        if stage_data.get("pipeline_stage"):
            update_data["pipeline_stage"] = stage_data["pipeline_stage"]
        if stage_data.get("sub_stage"):
            update_data["sub_stage"] = stage_data["sub_stage"]
        
        await db.sourcing_suppliers.update_one({"id": supplier_id}, {"$set": update_data})
        return await db.sourcing_suppliers.find_one({"id": supplier_id}, {"_id": 0})

    @router.delete("/{supplier_id}")
    async def delete_supplier(supplier_id: str, current_user: dict = Depends(get_current_user)):
        """Delete a supplier - only creator or admin can delete"""
        existing = await db.sourcing_suppliers.find_one({"id": supplier_id})
        if not existing:
            raise HTTPException(status_code=404, detail="Supplier not found")
        
        # Check delete permission
        if not can_delete_record(existing, current_user):
            raise HTTPException(status_code=403, detail=get_delete_error_message(existing))
        
        await db.sourcing_suppliers.delete_one({"id": supplier_id})
        return {"success": True, "message": "Supplier deleted"}

    @router.get("/analytics/summary")
    async def get_supplier_analytics(current_user: dict = Depends(get_current_user)):
        total = await db.sourcing_suppliers.count_documents({})
        active = await db.sourcing_suppliers.count_documents({"pipeline_stage": "Active"})
        sampling = await db.sourcing_suppliers.count_documents({"pipeline_stage": "Sampling"})
        return {"total": total, "active": active, "sampling": sampling}

    @router.get("/{supplier_id}/inbox")
    async def get_supplier_inbox(supplier_id: str, current_user: dict = Depends(get_current_user)):
        """Get all emails related to this supplier (sent and received)"""
        import httpx
        
        supplier = await db.sourcing_suppliers.find_one({"id": supplier_id}, {"_id": 0})
        if not supplier:
            raise HTTPException(status_code=404, detail="Supplier not found")
        
        supplier_email = supplier.get("email")
        if not supplier_email:
            return []
        
        # Get shared mailbox
        shared_mailbox = await db.shared_mailboxes.find_one(
            {"is_active": True, "display_name": {"$regex": "seller", "$options": "i"}},
            {"_id": 0}
        )
        if not shared_mailbox:
            shared_mailbox = await db.shared_mailboxes.find_one({"is_active": True}, {"_id": 0})
        
        if not shared_mailbox:
            return []
        
        try:
            from services.microsoft_email import MicrosoftEmailService
            
            email_svc = MicrosoftEmailService()
            access_token = await email_svc._get_app_token()
            if not access_token:
                return []
            
            mailbox_email = shared_mailbox.get("email")
            
            async with httpx.AsyncClient() as client:
                search_url = f"https://graph.microsoft.com/v1.0/users/{mailbox_email}/messages"
                params = {
                    "$search": f'"{supplier_email}"',
                    "$top": 50,
                    "$select": "id,subject,bodyPreview,from,toRecipients,receivedDateTime,sentDateTime,isRead,hasAttachments"
                }
                
                response = await client.get(
                    search_url,
                    headers={"Authorization": f"Bearer {access_token}", "ConsistencyLevel": "eventual"},
                    params=params,
                    timeout=30.0
                )
                
                if response.status_code == 200:
                    data = response.json()
                    emails = []
                    for msg in data.get("value", []):
                        from_email = msg.get("from", {}).get("emailAddress", {}).get("address", "")
                        to_emails = [r.get("emailAddress", {}).get("address", "") for r in msg.get("toRecipients", [])]
                        is_incoming = from_email.lower() == supplier_email.lower()
                        
                        emails.append({
                            "id": msg.get("id"),
                            "subject": msg.get("subject"),
                            "body_preview": msg.get("bodyPreview"),
                            "from_email": from_email,
                            "from_name": msg.get("from", {}).get("emailAddress", {}).get("name"),
                            "to_emails": to_emails,
                            "received_at": msg.get("receivedDateTime"),
                            "sent_at": msg.get("sentDateTime"),
                            "is_read": msg.get("isRead", False),
                            "has_attachments": msg.get("hasAttachments", False),
                            "direction": "incoming" if is_incoming else "outgoing"
                        })
                    
                    emails.sort(key=lambda x: x.get('received_at') or x.get('sent_at') or '', reverse=True)
                    return emails
                else:
                    return []
                    
        except Exception as e:
            import logging
            logging.error(f"Error fetching supplier inbox: {e}")
            return []

    return router
