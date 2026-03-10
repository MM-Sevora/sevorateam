"""
Email Templates - Buying & Sourcing Module
"""
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import List, Optional, Callable
from datetime import datetime, timezone
import uuid


def create_templates_router(db, get_current_user: Callable):
    """Factory function to create templates router"""
    
    router = APIRouter(prefix="/templates", tags=["Templates"])
    
    TEMPLATE_TYPES = ["email", "whatsapp", "follow_up", "introduction", "partnership", "sample_request"]
    
    class TemplateCreate(BaseModel):
        name: str
        type: str = "email"
        subject: Optional[str] = None
        content: str
        variables: List[str] = []

    class TemplateUpdate(BaseModel):
        name: Optional[str] = None
        type: Optional[str] = None
        subject: Optional[str] = None
        content: Optional[str] = None
        variables: Optional[List[str]] = None

    @router.post("")
    async def create_template(template: TemplateCreate, current_user: dict = Depends(get_current_user)):
        now = datetime.now(timezone.utc).isoformat()
        doc = {
            "id": str(uuid.uuid4()),
            "name": template.name,
            "type": template.type,
            "subject": template.subject,
            "content": template.content,
            "variables": template.variables,
            "created_by": current_user.get("id"),
            "created_at": now,
            "updated_at": now
        }
        await db.sourcing_templates.insert_one(doc)
        doc.pop("_id", None)
        return doc

    @router.get("")
    async def list_templates(current_user: dict = Depends(get_current_user), type: Optional[str] = None, search: Optional[str] = None):
        query = {}
        if type:
            query["type"] = type
        if search:
            query["name"] = {"$regex": search, "$options": "i"}
        return await db.sourcing_templates.find(query, {"_id": 0}).sort("name", 1).to_list(length=200)

    @router.get("/types")
    async def get_template_types():
        return {"types": TEMPLATE_TYPES}

    @router.get("/{template_id}")
    async def get_template(template_id: str, current_user: dict = Depends(get_current_user)):
        template = await db.sourcing_templates.find_one({"id": template_id}, {"_id": 0})
        if not template:
            raise HTTPException(status_code=404, detail="Template not found")
        return template

    @router.put("/{template_id}")
    async def update_template(template_id: str, update: TemplateUpdate, current_user: dict = Depends(get_current_user)):
        existing = await db.sourcing_templates.find_one({"id": template_id})
        if not existing:
            raise HTTPException(status_code=404, detail="Template not found")
        
        update_data = {k: v for k, v in update.dict().items() if v is not None}
        update_data["updated_at"] = datetime.now(timezone.utc).isoformat()
        
        await db.sourcing_templates.update_one({"id": template_id}, {"$set": update_data})
        return await db.sourcing_templates.find_one({"id": template_id}, {"_id": 0})

    @router.delete("/{template_id}")
    async def delete_template(template_id: str, current_user: dict = Depends(get_current_user)):
        result = await db.sourcing_templates.delete_one({"id": template_id})
        if result.deleted_count == 0:
            raise HTTPException(status_code=404, detail="Template not found")
        return {"success": True, "message": "Template deleted"}

    @router.post("/seed-defaults")
    async def seed_default_templates(current_user: dict = Depends(get_current_user)):
        now = datetime.now(timezone.utc).isoformat()
        
        default_templates = [
            {
                "name": "Brand Introduction",
                "type": "introduction",
                "subject": "Partnership Opportunity with {{company_name}}",
                "content": "Dear {{founder_name}},\n\nI hope this email finds you well. I'm reaching out from {{company_name}}...",
                "variables": ["founder_name", "company_name", "brand_name", "category"]
            },
            {
                "name": "Follow-up Email",
                "type": "follow_up",
                "subject": "Following up - {{brand_name}} x {{company_name}}",
                "content": "Hi {{founder_name}},\n\nI wanted to follow up on my previous email...",
                "variables": ["founder_name", "brand_name", "company_name"]
            },
            {
                "name": "Sample Request",
                "type": "sample_request",
                "subject": "Sample Request - {{company_name}}",
                "content": "Dear {{contact_name}},\n\nThank you for our conversation. We'd like to request samples...",
                "variables": ["contact_name", "sample_details", "company_name"]
            }
        ]
        
        inserted = 0
        for tmpl in default_templates:
            existing = await db.sourcing_templates.find_one({"name": tmpl["name"]})
            if not existing:
                tmpl["id"] = str(uuid.uuid4())
                tmpl["created_by"] = current_user.get("id")
                tmpl["created_at"] = now
                tmpl["updated_at"] = now
                await db.sourcing_templates.insert_one(tmpl)
                inserted += 1
        
        return {"success": True, "message": f"Seeded {inserted} default templates"}

    return router
