"""
AI Discovery - Buying & Sourcing Module
Uses Google Search API + OpenAI GPT-4o for intelligent brand discovery
"""
from fastapi import APIRouter, HTTPException, Depends, BackgroundTasks
from pydantic import BaseModel
from typing import List, Optional, Callable
from datetime import datetime, timezone
import uuid

from services.brand_discovery_service import brand_discovery_service


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

    @router.get("/status")
    async def get_discovery_service_status(current_user: dict = Depends(get_current_user)):
        """Check if AI discovery service is configured"""
        return {
            "configured": brand_discovery_service.is_configured(),
            "message": "AI discovery service ready" if brand_discovery_service.is_configured() else "Missing configuration: GOOGLE_SEARCH_API_KEY, GOOGLE_SEARCH_ENGINE_ID, or EMERGENT_LLM_KEY"
        }

    @router.get("/options")
    async def get_discovery_options(current_user: dict = Depends(get_current_user)):
        """Get available options for AI discovery"""
        return {
            "categories": list(DISCOVERY_CATEGORIES.keys()),
            "subcategories": DISCOVERY_CATEGORIES,
            "cities": DISCOVERY_CITIES,
            "segments": DISCOVERY_SEGMENTS,
            "target_segments": TARGET_SEGMENTS,
            "service_configured": brand_discovery_service.is_configured()
        }

    @router.get("/history")
    async def get_discovery_history(current_user: dict = Depends(get_current_user), limit: int = 20):
        """Get recent discovery job history"""
        jobs = await db.sourcing_discovery_jobs.find({}, {"_id": 0}).sort("created_at", -1).limit(limit).to_list(length=limit)
        return jobs

    @router.post("/run-now")
    async def run_discovery_now(request: AIDiscoverRequest, current_user: dict = Depends(get_current_user)):
        """Run AI-powered brand discovery"""
        now = datetime.now(timezone.utc).isoformat()
        
        # Create job record
        job_id = str(uuid.uuid4())
        job_doc = {
            "id": job_id,
            "user_id": current_user.get("id"),
            "user_name": current_user.get("name"),
            "category": request.category,
            "subcategories": request.subcategories,
            "segment": request.segment,
            "city": request.city,
            "requested_count": request.count,
            "found_count": 0,
            "status": "running",
            "created_at": now
        }
        await db.sourcing_discovery_jobs.insert_one(job_doc)
        
        # Run discovery
        try:
            result = await brand_discovery_service.discover_brands(
                category=request.category,
                subcategories=request.subcategories,
                segment=request.segment,
                city=request.city,
                count=request.count
            )
            
            discovered_brands = result.get("brands", [])
            
            # Save discovered brands to database
            saved_count = 0
            for brand in discovered_brands:
                # Check if brand already exists by website
                existing = await db.sourcing_brands.find_one({"website": brand.get("website")})
                if not existing:
                    brand_doc = {
                        "id": str(uuid.uuid4()),
                        "name": brand.get("name"),
                        "website": brand.get("website"),
                        "city": brand.get("city"),
                        "categories": brand.get("categories", []),
                        "segment": brand.get("segment"),
                        "fit_score": brand.get("fit_score", 50),
                        "match_status": "High Priority" if brand.get("fit_score", 0) >= 80 else "Review",
                        "description": brand.get("description"),
                        "pipeline_stage": "Discovery",
                        "discovery_job_id": job_id,
                        "discovery_method": "ai_search",
                        "discovered_at": brand.get("discovered_at"),
                        "created_at": now,
                        "updated_at": now
                    }
                    await db.sourcing_brands.insert_one(brand_doc)
                    saved_count += 1
            
            # Update job status
            await db.sourcing_discovery_jobs.update_one(
                {"id": job_id},
                {"$set": {
                    "status": "completed",
                    "found_count": len(discovered_brands),
                    "saved_count": saved_count,
                    "search_results_count": result.get("search_results_count", 0),
                    "completed_at": datetime.now(timezone.utc).isoformat()
                }}
            )
            
            return {
                "success": True,
                "job_id": job_id,
                "message": f"Discovery completed! Found {len(discovered_brands)} brands, saved {saved_count} new brands.",
                "brands": discovered_brands,
                "stats": {
                    "search_results": result.get("search_results_count", 0),
                    "analyzed_brands": len(discovered_brands),
                    "new_brands_saved": saved_count
                }
            }
            
        except Exception as e:
            # Update job status on failure
            await db.sourcing_discovery_jobs.update_one(
                {"id": job_id},
                {"$set": {
                    "status": "failed",
                    "error": str(e),
                    "completed_at": datetime.now(timezone.utc).isoformat()
                }}
            )
            raise HTTPException(status_code=500, detail=f"Discovery failed: {str(e)}")

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
