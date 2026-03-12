"""
Marketing Configuration Routes - Admin settings for dropdown options

Handles:
- Project Types (HOW content is produced)
- Content Categories (WHAT type of content)
- Content Sub-Types (specific content types within categories)
- Mediums (WHERE content is published)
"""

from fastapi import APIRouter, HTTPException, Query
from typing import Optional, List
from datetime import datetime
import uuid
import os

from models.marketing_config import (
    ProjectTypeConfig, ProjectTypeCreate, ProjectTypeUpdate,
    ContentCategoryConfig, ContentCategoryCreate, ContentCategoryUpdate,
    ContentSubTypeConfig, ContentSubTypeCreate, ContentSubTypeUpdate,
    MediumConfig, MediumCreate, MediumUpdate,
    MarketingConfigResponse,
    DEFAULT_PROJECT_TYPES, DEFAULT_CONTENT_CATEGORIES, 
    DEFAULT_CONTENT_SUBTYPES, DEFAULT_MEDIUMS
)

router = APIRouter(prefix="/config", tags=["Marketing - Configuration"])


def get_db():
    """Get database connection"""
    from pymongo import MongoClient
    client = MongoClient(os.environ.get("MONGO_URL"))
    return client[os.environ.get("DB_NAME", "sevora_production")]


def serialize_doc(doc: dict) -> dict:
    """Serialize MongoDB document"""
    if doc is None:
        return None
    doc["id"] = str(doc.pop("_id", doc.get("id", "")))
    return doc


# ============== INITIALIZATION ==============

@router.post("/initialize")
async def initialize_default_config():
    """Initialize default configuration options (run once)"""
    db = get_db()
    
    created = {"project_types": 0, "categories": 0, "subtypes": 0, "mediums": 0}
    
    # Project Types
    for pt in DEFAULT_PROJECT_TYPES:
        existing = db.marketing_config_project_types.find_one({"slug": pt["slug"]})
        if not existing:
            pt["_id"] = str(uuid.uuid4())
            pt["is_active"] = True
            pt["created_at"] = datetime.utcnow()
            db.marketing_config_project_types.insert_one(pt)
            created["project_types"] += 1
    
    # Content Categories
    category_ids = {}
    for cat in DEFAULT_CONTENT_CATEGORIES:
        existing = db.marketing_config_content_categories.find_one({"slug": cat["slug"]})
        if not existing:
            cat["_id"] = str(uuid.uuid4())
            cat["is_active"] = True
            cat["created_at"] = datetime.utcnow()
            db.marketing_config_content_categories.insert_one(cat)
            category_ids[cat["slug"]] = cat["_id"]
            created["categories"] += 1
        else:
            category_ids[cat["slug"]] = str(existing["_id"])
    
    # Content Sub-Types
    for cat_slug, subtypes in DEFAULT_CONTENT_SUBTYPES.items():
        cat_id = category_ids.get(cat_slug)
        if cat_id:
            for idx, st in enumerate(subtypes):
                existing = db.marketing_config_content_subtypes.find_one({"slug": st["slug"]})
                if not existing:
                    st["_id"] = str(uuid.uuid4())
                    st["category_id"] = cat_id
                    st["category_slug"] = cat_slug
                    st["is_active"] = True
                    st["sort_order"] = idx + 1
                    st["created_at"] = datetime.utcnow()
                    db.marketing_config_content_subtypes.insert_one(st)
                    created["subtypes"] += 1
    
    # Mediums
    for med in DEFAULT_MEDIUMS:
        existing = db.marketing_config_mediums.find_one({"slug": med["slug"]})
        if not existing:
            med["_id"] = str(uuid.uuid4())
            med["is_active"] = True
            med["created_at"] = datetime.utcnow()
            db.marketing_config_mediums.insert_one(med)
            created["mediums"] += 1
    
    return {
        "message": "Configuration initialized",
        "created": created
    }


# ============== GET ALL CONFIG ==============

@router.get("/all", response_model=MarketingConfigResponse)
async def get_all_config(include_inactive: bool = False):
    """Get all configuration options in one call"""
    db = get_db()
    
    query = {} if include_inactive else {"is_active": True}
    
    project_types = list(db.marketing_config_project_types.find(query).sort("sort_order", 1))
    categories = list(db.marketing_config_content_categories.find(query).sort("sort_order", 1))
    subtypes = list(db.marketing_config_content_subtypes.find(query).sort("sort_order", 1))
    mediums = list(db.marketing_config_mediums.find(query).sort("sort_order", 1))
    
    return MarketingConfigResponse(
        project_types=[serialize_doc(p) for p in project_types],
        content_categories=[serialize_doc(c) for c in categories],
        content_subtypes=[serialize_doc(s) for s in subtypes],
        mediums=[serialize_doc(m) for m in mediums]
    )


# ============== PROJECT TYPES ==============

@router.get("/project-types", response_model=List[ProjectTypeConfig])
async def list_project_types(include_inactive: bool = False):
    """List all project types"""
    db = get_db()
    query = {} if include_inactive else {"is_active": True}
    types = list(db.marketing_config_project_types.find(query).sort("sort_order", 1))
    return [serialize_doc(t) for t in types]


@router.post("/project-types", response_model=ProjectTypeConfig)
async def create_project_type(data: ProjectTypeCreate):
    """Create a new project type"""
    db = get_db()
    
    # Check for duplicate slug
    existing = db.marketing_config_project_types.find_one({"slug": data.slug})
    if existing:
        raise HTTPException(status_code=400, detail=f"Project type with slug '{data.slug}' already exists")
    
    doc = data.model_dump()
    doc["_id"] = str(uuid.uuid4())
    doc["is_active"] = True
    doc["created_at"] = datetime.utcnow()
    
    db.marketing_config_project_types.insert_one(doc)
    return serialize_doc(doc)


@router.put("/project-types/{type_id}", response_model=ProjectTypeConfig)
async def update_project_type(type_id: str, data: ProjectTypeUpdate):
    """Update a project type"""
    db = get_db()
    
    update_data = {k: v for k, v in data.model_dump().items() if v is not None}
    update_data["updated_at"] = datetime.utcnow()
    
    result = db.marketing_config_project_types.find_one_and_update(
        {"_id": type_id},
        {"$set": update_data},
        return_document=True
    )
    
    if not result:
        raise HTTPException(status_code=404, detail="Project type not found")
    
    return serialize_doc(result)


@router.delete("/project-types/{type_id}")
async def delete_project_type(type_id: str):
    """Delete (deactivate) a project type"""
    db = get_db()
    
    result = db.marketing_config_project_types.find_one_and_update(
        {"_id": type_id},
        {"$set": {"is_active": False, "updated_at": datetime.utcnow()}},
        return_document=True
    )
    
    if not result:
        raise HTTPException(status_code=404, detail="Project type not found")
    
    return {"message": "Project type deactivated"}


# ============== CONTENT CATEGORIES ==============

@router.get("/content-categories", response_model=List[ContentCategoryConfig])
async def list_content_categories(include_inactive: bool = False):
    """List all content categories"""
    db = get_db()
    query = {} if include_inactive else {"is_active": True}
    categories = list(db.marketing_config_content_categories.find(query).sort("sort_order", 1))
    return [serialize_doc(c) for c in categories]


@router.post("/content-categories", response_model=ContentCategoryConfig)
async def create_content_category(data: ContentCategoryCreate):
    """Create a new content category"""
    db = get_db()
    
    existing = db.marketing_config_content_categories.find_one({"slug": data.slug})
    if existing:
        raise HTTPException(status_code=400, detail=f"Category with slug '{data.slug}' already exists")
    
    doc = data.model_dump()
    doc["_id"] = str(uuid.uuid4())
    doc["is_active"] = True
    doc["created_at"] = datetime.utcnow()
    
    db.marketing_config_content_categories.insert_one(doc)
    return serialize_doc(doc)


@router.put("/content-categories/{category_id}", response_model=ContentCategoryConfig)
async def update_content_category(category_id: str, data: ContentCategoryUpdate):
    """Update a content category"""
    db = get_db()
    
    update_data = {k: v for k, v in data.model_dump().items() if v is not None}
    update_data["updated_at"] = datetime.utcnow()
    
    result = db.marketing_config_content_categories.find_one_and_update(
        {"_id": category_id},
        {"$set": update_data},
        return_document=True
    )
    
    if not result:
        raise HTTPException(status_code=404, detail="Category not found")
    
    return serialize_doc(result)


@router.delete("/content-categories/{category_id}")
async def delete_content_category(category_id: str):
    """Delete (deactivate) a content category"""
    db = get_db()
    
    # Also deactivate related subtypes
    db.marketing_config_content_subtypes.update_many(
        {"category_id": category_id},
        {"$set": {"is_active": False, "updated_at": datetime.utcnow()}}
    )
    
    result = db.marketing_config_content_categories.find_one_and_update(
        {"_id": category_id},
        {"$set": {"is_active": False, "updated_at": datetime.utcnow()}},
        return_document=True
    )
    
    if not result:
        raise HTTPException(status_code=404, detail="Category not found")
    
    return {"message": "Category and related subtypes deactivated"}


# ============== CONTENT SUB-TYPES ==============

@router.get("/content-subtypes", response_model=List[ContentSubTypeConfig])
async def list_content_subtypes(
    category_id: Optional[str] = None,
    category_slug: Optional[str] = None,
    include_inactive: bool = False
):
    """List content sub-types, optionally filtered by category"""
    db = get_db()
    
    query = {} if include_inactive else {"is_active": True}
    if category_id:
        query["category_id"] = category_id
    if category_slug:
        query["category_slug"] = category_slug
    
    subtypes = list(db.marketing_config_content_subtypes.find(query).sort("sort_order", 1))
    return [serialize_doc(s) for s in subtypes]


@router.post("/content-subtypes", response_model=ContentSubTypeConfig)
async def create_content_subtype(data: ContentSubTypeCreate):
    """Create a new content sub-type"""
    db = get_db()
    
    # Verify category exists
    category = db.marketing_config_content_categories.find_one({"_id": data.category_id})
    if not category:
        raise HTTPException(status_code=404, detail="Category not found")
    
    existing = db.marketing_config_content_subtypes.find_one({"slug": data.slug})
    if existing:
        raise HTTPException(status_code=400, detail=f"Sub-type with slug '{data.slug}' already exists")
    
    doc = data.model_dump()
    doc["_id"] = str(uuid.uuid4())
    doc["category_slug"] = category.get("slug")
    doc["is_active"] = True
    doc["created_at"] = datetime.utcnow()
    
    db.marketing_config_content_subtypes.insert_one(doc)
    return serialize_doc(doc)


@router.put("/content-subtypes/{subtype_id}", response_model=ContentSubTypeConfig)
async def update_content_subtype(subtype_id: str, data: ContentSubTypeUpdate):
    """Update a content sub-type"""
    db = get_db()
    
    update_data = {k: v for k, v in data.model_dump().items() if v is not None}
    
    # If category changed, update category_slug
    if "category_id" in update_data:
        category = db.marketing_config_content_categories.find_one({"_id": update_data["category_id"]})
        if category:
            update_data["category_slug"] = category.get("slug")
    
    update_data["updated_at"] = datetime.utcnow()
    
    result = db.marketing_config_content_subtypes.find_one_and_update(
        {"_id": subtype_id},
        {"$set": update_data},
        return_document=True
    )
    
    if not result:
        raise HTTPException(status_code=404, detail="Sub-type not found")
    
    return serialize_doc(result)


@router.delete("/content-subtypes/{subtype_id}")
async def delete_content_subtype(subtype_id: str):
    """Delete (deactivate) a content sub-type"""
    db = get_db()
    
    result = db.marketing_config_content_subtypes.find_one_and_update(
        {"_id": subtype_id},
        {"$set": {"is_active": False, "updated_at": datetime.utcnow()}},
        return_document=True
    )
    
    if not result:
        raise HTTPException(status_code=404, detail="Sub-type not found")
    
    return {"message": "Sub-type deactivated"}


# ============== MEDIUMS ==============

@router.get("/mediums", response_model=List[MediumConfig])
async def list_mediums(
    platform_type: Optional[str] = None,
    include_inactive: bool = False
):
    """List all mediums"""
    db = get_db()
    
    query = {} if include_inactive else {"is_active": True}
    if platform_type:
        query["platform_type"] = platform_type
    
    mediums = list(db.marketing_config_mediums.find(query).sort("sort_order", 1))
    return [serialize_doc(m) for m in mediums]


@router.post("/mediums", response_model=MediumConfig)
async def create_medium(data: MediumCreate):
    """Create a new medium"""
    db = get_db()
    
    existing = db.marketing_config_mediums.find_one({"slug": data.slug})
    if existing:
        raise HTTPException(status_code=400, detail=f"Medium with slug '{data.slug}' already exists")
    
    doc = data.model_dump()
    doc["_id"] = str(uuid.uuid4())
    doc["is_active"] = True
    doc["created_at"] = datetime.utcnow()
    
    db.marketing_config_mediums.insert_one(doc)
    return serialize_doc(doc)


@router.put("/mediums/{medium_id}", response_model=MediumConfig)
async def update_medium(medium_id: str, data: MediumUpdate):
    """Update a medium"""
    db = get_db()
    
    update_data = {k: v for k, v in data.model_dump().items() if v is not None}
    update_data["updated_at"] = datetime.utcnow()
    
    result = db.marketing_config_mediums.find_one_and_update(
        {"_id": medium_id},
        {"$set": update_data},
        return_document=True
    )
    
    if not result:
        raise HTTPException(status_code=404, detail="Medium not found")
    
    return serialize_doc(result)


@router.delete("/mediums/{medium_id}")
async def delete_medium(medium_id: str):
    """Delete (deactivate) a medium"""
    db = get_db()
    
    result = db.marketing_config_mediums.find_one_and_update(
        {"_id": medium_id},
        {"$set": {"is_active": False, "updated_at": datetime.utcnow()}},
        return_document=True
    )
    
    if not result:
        raise HTTPException(status_code=404, detail="Medium not found")
    
    return {"message": "Medium deactivated"}
