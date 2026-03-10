"""
Buying & Sourcing Module Routes
Includes: Brands, Suppliers, Manufacturers, Samples, AI Discovery
Self-contained auth handling using JWT verification
"""
from fastapi import APIRouter, Depends, HTTPException
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
import os
import jwt
from motor.motor_asyncio import AsyncIOMotorClient

sourcing_router = APIRouter(prefix="/sourcing", tags=["Buying & Sourcing"])

# MongoDB connection
mongo_url = os.environ.get('MONGO_URL')
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ.get('DB_NAME', 'test_database')]

# JWT Settings
JWT_SECRET = os.environ.get('JWT_SECRET', 'sevora-team-secret-2024')
JWT_ALGORITHM = 'HS256'

# Security
security = HTTPBearer()


async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    """Verify JWT and return current user"""
    try:
        token = credentials.credentials
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        user_id = payload.get("sub")
        if not user_id:
            raise HTTPException(status_code=401, detail="Invalid token")
        
        user = await db.users.find_one({"id": user_id}, {"_id": 0, "password": 0})
        if not user:
            raise HTTPException(status_code=401, detail="User not found")
        
        return user
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token has expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")


# Import sub-routers after defining get_current_user
from .brands import create_brands_router
from .suppliers import create_suppliers_router
from .manufacturers import create_manufacturers_router
from .samples import create_samples_router
from .discovery import create_discovery_router
from .templates import create_templates_router
from .campaigns import create_campaigns_router

# Create and include all sub-routers
brands_router = create_brands_router(db, get_current_user)
suppliers_router = create_suppliers_router(db, get_current_user)
manufacturers_router = create_manufacturers_router(db, get_current_user)
samples_router = create_samples_router(db, get_current_user)
discovery_router = create_discovery_router(db, get_current_user)
templates_router = create_templates_router(db, get_current_user)
campaigns_router = create_campaigns_router(db, get_current_user)

sourcing_router.include_router(brands_router)
sourcing_router.include_router(suppliers_router)
sourcing_router.include_router(manufacturers_router)
sourcing_router.include_router(samples_router)
sourcing_router.include_router(discovery_router)
sourcing_router.include_router(templates_router)
sourcing_router.include_router(campaigns_router)


# =====================
# DASHBOARD ENDPOINT
# =====================

@sourcing_router.get("/dashboard")
async def get_sourcing_dashboard(current_user: dict = Depends(get_current_user)):
    """Get unified dashboard for Buying & Sourcing module"""
    
    # Brands stats
    total_brands = await db.sourcing_brands.count_documents({})
    brands_by_stage = {}
    brand_stages = await db.sourcing_brands.aggregate([
        {"$group": {"_id": "$pipeline_stage", "count": {"$sum": 1}}}
    ]).to_list(length=20)
    for s in brand_stages:
        if s["_id"]:
            brands_by_stage[s["_id"]] = s["count"]
    
    high_priority_brands = await db.sourcing_brands.count_documents({"match_status": "High Priority"})
    
    # Suppliers stats
    total_suppliers = await db.sourcing_suppliers.count_documents({})
    active_suppliers = await db.sourcing_suppliers.count_documents({"pipeline_stage": "Active"})
    sampling_suppliers = await db.sourcing_suppliers.count_documents({"pipeline_stage": "Sampling"})
    
    # Manufacturers stats
    total_manufacturers = await db.sourcing_manufacturers.count_documents({})
    active_manufacturers = await db.sourcing_manufacturers.count_documents({"pipeline_stage": "Active"})
    sampling_manufacturers = await db.sourcing_manufacturers.count_documents({"pipeline_stage": "Sampling"})
    
    # Samples stats
    total_samples = await db.sourcing_samples.count_documents({})
    samples_by_status = {}
    sample_statuses = await db.sourcing_samples.aggregate([
        {"$group": {"_id": "$status", "count": {"$sum": 1}}}
    ]).to_list(length=20)
    for s in sample_statuses:
        if s["_id"]:
            samples_by_status[s["_id"]] = s["count"]
    
    # Recent activity
    recent_activity = await db.sourcing_activity_logs.find(
        {},
        {"_id": 0}
    ).sort("created_at", -1).limit(10).to_list(length=10)
    
    # Brands by city (top 10)
    brands_by_city = await db.sourcing_brands.aggregate([
        {"$group": {"_id": "$city", "count": {"$sum": 1}}},
        {"$sort": {"count": -1}},
        {"$limit": 10}
    ]).to_list(length=10)
    
    return {
        "brands": {
            "total": total_brands,
            "high_priority": high_priority_brands,
            "by_stage": brands_by_stage,
            "by_city": [{"city": b["_id"], "count": b["count"]} for b in brands_by_city if b["_id"]]
        },
        "suppliers": {
            "total": total_suppliers,
            "active": active_suppliers,
            "sampling": sampling_suppliers
        },
        "manufacturers": {
            "total": total_manufacturers,
            "active": active_manufacturers,
            "sampling": sampling_manufacturers
        },
        "samples": {
            "total": total_samples,
            "by_status": samples_by_status
        },
        "recent_activity": recent_activity
    }
