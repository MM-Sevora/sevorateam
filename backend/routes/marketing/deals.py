"""
Deals Routes - Deals, contracts, payments
"""

from fastapi import APIRouter, Depends, HTTPException
from typing import List, Optional
import uuid
from datetime import datetime, timezone

from .base import (
    get_db, get_marketing_auth,
    DealCreate, DealResponse,
    ContractCreate, ContractResponse,
    PaymentCreate, PaymentResponse
)

router = APIRouter(tags=["Deals"])


@router.get("/contacts/{contact_id}/deals", response_model=List[DealResponse])
async def get_contact_deals(contact_id: str):
    """Get all deals for a contact"""
    db = get_db()
    deals = await db.deals.find({"contact_id": contact_id}, {"_id": 0}).sort("created_at", -1).to_list(100)
    return deals


@router.post("/deals", response_model=DealResponse)
async def create_deal(data: DealCreate, user: dict = Depends(get_marketing_auth())):
    """Create a new deal"""
    db = get_db()
    
    contact = await db.contacts.find_one({"id": data.contact_id})
    if not contact:
        raise HTTPException(status_code=404, detail="Contact not found")
    
    deal_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc).isoformat()
    
    deal_doc = {
        "id": deal_id,
        **data.model_dump(),
        "contact_name": contact.get("name"),
        "status": "negotiating",
        "created_at": now,
        "updated_at": now,
    }
    
    await db.deals.insert_one(deal_doc)
    del deal_doc["_id"]
    return deal_doc


@router.put("/deals/{deal_id}/status")
async def update_deal_status(
    deal_id: str,
    data: dict,
    user: dict = Depends(get_marketing_auth())
):
    """Update deal status and optionally advance contact stage"""
    db = get_db()
    
    deal = await db.deals.find_one({"id": deal_id})
    if not deal:
        raise HTTPException(status_code=404, detail="Deal not found")
    
    new_status = data.get("status")
    notes = data.get("notes")
    
    update_fields = {"updated_at": datetime.now(timezone.utc).isoformat()}
    if new_status:
        update_fields["status"] = new_status
    if notes:
        update_fields["notes"] = notes
    
    await db.deals.update_one({"id": deal_id}, {"$set": update_fields})
    
    # Auto-advance contact pipeline stage based on deal status
    contact_id = deal.get("contact_id")
    if contact_id and new_status:
        stage_map = {
            "proposal_sent": "negotiating",
            "negotiating": "negotiating",
            "agreed": "agreed",
            "signed": "agreed",
            "completed": "delivered",
            "cancelled": "lost"
        }
        new_stage = stage_map.get(new_status)
        if new_stage:
            await db.contacts.update_one(
                {"id": contact_id},
                {"$set": {
                    "pipeline_stage": new_stage,
                    "status": new_stage,
                    "stage_updated_at": datetime.now(timezone.utc).isoformat()
                }}
            )
    
    updated = await db.deals.find_one({"id": deal_id}, {"_id": 0})
    return updated


@router.post("/deals/bulk-delete")
async def bulk_delete_deals(data: dict, user: dict = Depends(get_marketing_auth())):
    """Bulk delete multiple deals"""
    db = get_db()
    
    ids = data.get("ids", [])
    if not ids:
        raise HTTPException(status_code=400, detail="No IDs provided")
    
    result = await db.deals.delete_many({"id": {"$in": ids}})
    return {"deleted_count": result.deleted_count, "message": f"Deleted {result.deleted_count} deals"}


# ============== CONTRACTS ==============

@router.get("/deals/{deal_id}/contracts", response_model=List[ContractResponse])
async def get_deal_contracts(deal_id: str):
    """Get all contracts for a deal"""
    db = get_db()
    contracts = await db.contracts.find({"deal_id": deal_id}, {"_id": 0}).to_list(50)
    return contracts


@router.post("/contracts", response_model=ContractResponse)
async def create_contract(data: ContractCreate, user: dict = Depends(get_marketing_auth())):
    """Create a new contract"""
    db = get_db()
    
    contract_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc).isoformat()
    
    contract_doc = {
        "id": contract_id,
        **data.model_dump(),
        "status": "draft",
        "created_at": now,
        "updated_at": now,
    }
    
    await db.contracts.insert_one(contract_doc)
    del contract_doc["_id"]
    return contract_doc


# ============== PAYMENTS ==============

@router.get("/contacts/{contact_id}/payments", response_model=List[PaymentResponse])
async def get_contact_payments(contact_id: str):
    """Get all payments for a contact"""
    db = get_db()
    payments = await db.payments.find({"contact_id": contact_id}, {"_id": 0}).sort("created_at", -1).to_list(100)
    return payments


@router.get("/campaigns/{campaign_id}/payments", response_model=List[PaymentResponse])
async def get_campaign_payments(campaign_id: str):
    """Get all payments for a campaign"""
    db = get_db()
    payments = await db.payments.find({"campaign_id": campaign_id}, {"_id": 0}).to_list(100)
    return payments


@router.post("/payments", response_model=PaymentResponse)
async def create_payment(data: PaymentCreate, user: dict = Depends(get_marketing_auth())):
    """Create a new payment record"""
    db = get_db()
    
    payment_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc).isoformat()
    
    # Get contact name if contact_id provided
    contact_name = None
    if data.contact_id:
        contact = await db.contacts.find_one({"id": data.contact_id})
        if contact:
            contact_name = contact.get("name")
    
    payment_doc = {
        "id": payment_id,
        **data.model_dump(),
        "contact_name": contact_name,
        "created_at": now,
        "updated_at": now,
    }
    
    await db.payments.insert_one(payment_doc)
    del payment_doc["_id"]
    return payment_doc


@router.put("/payments/{payment_id}/status")
async def update_payment_status(
    payment_id: str,
    data: dict,
    user: dict = Depends(get_marketing_auth())
):
    """Update payment status"""
    db = get_db()
    
    payment = await db.payments.find_one({"id": payment_id})
    if not payment:
        raise HTTPException(status_code=404, detail="Payment not found")
    
    new_status = data.get("status")
    update_fields = {"updated_at": datetime.now(timezone.utc).isoformat()}
    
    if new_status:
        update_fields["status"] = new_status
        if new_status == "paid":
            update_fields["paid_at"] = datetime.now(timezone.utc).isoformat()
    
    await db.payments.update_one({"id": payment_id}, {"$set": update_fields})
    
    updated = await db.payments.find_one({"id": payment_id}, {"_id": 0})
    return updated


@router.put("/payments/{payment_id}")
async def update_payment(
    payment_id: str,
    data: dict,
    user: dict = Depends(get_marketing_auth())
):
    """Update payment details"""
    db = get_db()
    
    payment = await db.payments.find_one({"id": payment_id})
    if not payment:
        raise HTTPException(status_code=404, detail="Payment not found")
    
    update_fields = {k: v for k, v in data.items() if v is not None}
    update_fields["updated_at"] = datetime.now(timezone.utc).isoformat()
    
    await db.payments.update_one({"id": payment_id}, {"$set": update_fields})
    
    updated = await db.payments.find_one({"id": payment_id}, {"_id": 0})
    return updated


@router.delete("/payments/{payment_id}")
async def delete_payment(payment_id: str, user: dict = Depends(get_marketing_auth())):
    """Delete a payment"""
    db = get_db()
    
    result = await db.payments.delete_one({"id": payment_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Payment not found")
    
    return {"success": True, "message": "Payment deleted"}
