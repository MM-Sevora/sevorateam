"""
AI Discovery - Buying & Sourcing Module
"""
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import List, Optional, Callable
from datetime import datetime, timezone
import uuid


def create_discovery_router(db, get_current_user: Callable):
    """Factory function to create discovery router"""
    
    router = APIRouter(prefix="/discovery", tags=["AI Discovery"])
    
    DISCOVERY_CATEGORIES = {
        "Womenswear": ["Sarees", "Kurta Sets", "Dresses", "Indo-Western", "Bridal Wear"],
        "Menswear": ["Kurtas", "Sherwanis", "Casual Shirts", "Formal Wear"],
        "Accessories": ["Handbags", "Clutches", "Jewelry", "Watches", "Belts"],
        "Ethnic Wear": ["Lehengas", "Anarkalis", "Sharara Sets"],
        "Western Wear": ["Tops", "Dresses", "Jumpsuits", "Blazers"]
    }
    
    DISCOVERY_CITIES = [
        "Delhi", "Mumbai", "Bengaluru", "Jaipur", "Kolkata", "Chennai", "Hyderabad",
        "Ahmedabad", "Pune", "Lucknow", "Chandigarh", "Surat", "Indore", "Kochi"
    ]
    
    DISCOVERY_SEGMENTS = {
        "Mass Premium": {"price_range": "1,000 - 5,000"},
        "Bridge to Luxury": {"price_range": "5,000 - 15,000"},
        "Affordable Luxury": {"price_range": "15,000 - 40,000"},
        "Premium": {"price_range": "40,000 - 1,00,000"},
        "Luxury": {"price_range": "1,00,000+"}
    }
    
    TARGET_SEGMENTS = ["Mass Premium", "Bridge to Luxury", "Affordable Luxury"]
    
    class AIDiscoverRequest(BaseModel):
        category: str = "Womenswear"
        subcategories: List[str] = []
        segment: str = "Affordable Luxury"
        city: Optional[str] = None
        count: int = 10

    @router.get("/options")
    async def get_discovery_options(current_user: dict = Depends(get_current_user)):
        """Get available options for AI discovery"""
        return {
            "categories": list(DISCOVERY_CATEGORIES.keys()),
            "subcategories": DISCOVERY_CATEGORIES,
            "cities": DISCOVERY_CITIES,
            "segments": DISCOVERY_SEGMENTS,
            "target_segments": TARGET_SEGMENTS
        }

    @router.get("/history")
    async def get_discovery_history(current_user: dict = Depends(get_current_user), limit: int = 20):
        """Get recent discovery job history"""
        jobs = await db.sourcing_discovery_jobs.find({}, {"_id": 0}).sort("created_at", -1).limit(limit).to_list(length=limit)
        return jobs

    @router.post("/run-now")
    async def run_discovery_now(request: AIDiscoverRequest, current_user: dict = Depends(get_current_user)):
        """Trigger AI discovery manually (placeholder)"""
        now = datetime.now(timezone.utc).isoformat()
        
        job_doc = {
            "id": str(uuid.uuid4()),
            "user_id": current_user.get("id"),
            "category": request.category,
            "subcategories": request.subcategories,
            "segment": request.segment,
            "city": request.city,
            "requested_count": request.count,
            "found_count": 0,
            "status": "pending",
            "created_at": now
        }
        
        await db.sourcing_discovery_jobs.insert_one(job_doc)
        
        return {
            "success": True,
            "job_id": job_doc["id"],
            "message": f"Discovery job created for {request.category} in {request.city or 'all cities'}",
            "note": "AI discovery requires LLM integration. Configure EMERGENT_LLM_KEY for full functionality."
        }

    @router.post("/score-brand/{brand_id}")
    async def score_brand(brand_id: str, current_user: dict = Depends(get_current_user)):
        """Calculate fit score for a brand"""
        brand = await db.sourcing_brands.find_one({"id": brand_id})
        if not brand:
            raise HTTPException(status_code=404, detail="Brand not found")
        
        score = 50
        segment = brand.get("segment", "")
        if segment in TARGET_SEGMENTS:
            score += 20
        
        price_min = brand.get("price_range_min", 0)
        price_max = brand.get("price_range_max", 0)
        if 5000 <= price_min <= 60000 and 5000 <= price_max <= 60000:
            score += 15
        
        if brand.get("email"):
            score += 5
        if brand.get("phone_number"):
            score += 5
        if brand.get("website"):
            score += 5
        
        score = min(score, 100)
        
        if score >= 80:
            match_status = "High Priority"
        elif score >= 60:
            match_status = "Medium Priority"
        elif score >= 40:
            match_status = "Review"
        else:
            match_status = "Low Priority"
        
        now = datetime.now(timezone.utc).isoformat()
        await db.sourcing_brands.update_one(
            {"id": brand_id},
            {"$set": {"fit_score": score, "match_status": match_status, "score_updated_at": now, "updated_at": now}}
        )
        
        return {"brand_id": brand_id, "fit_score": score, "match_status": match_status}

    return router
