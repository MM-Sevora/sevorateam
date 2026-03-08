"""
Publications Routes - CRUD operations, journalists, coverage
"""

from fastapi import APIRouter, Depends, HTTPException, Query
from typing import List, Optional
import uuid
from datetime import datetime, timezone

from .base import (
    get_db, get_marketing_auth,
    PublicationCreate, PublicationResponse,
    ContactResponse, MediaCoverageResponse
)

router = APIRouter(tags=["Publications"])


@router.get("/publications", response_model=List[PublicationResponse])
async def get_publications(
    publication_type: Optional[str] = None,
    tier: Optional[str] = None,
    beat: Optional[str] = None,
    search: Optional[str] = None,
    relationship_status: Optional[str] = None,
    limit: int = Query(default=100, le=500),
    skip: int = 0
):
    """Get all publications with optional filters"""
    db = get_db()
    
    query = {}
    if publication_type:
        query["publication_type"] = publication_type
    if tier:
        query["tier"] = tier
    if beat:
        query["beats_covered"] = {"$in": [beat]}
    if relationship_status:
        query["relationship_status"] = relationship_status
    if search:
        query["$or"] = [
            {"name": {"$regex": search, "$options": "i"}},
            {"website": {"$regex": search, "$options": "i"}},
            {"description": {"$regex": search, "$options": "i"}}
        ]
    
    publications = await db.publications.find(query, {"_id": 0}).skip(skip).limit(limit).to_list(limit)
    
    for pub in publications:
        journalist_count = await db.contacts.count_documents({
            "contact_type": "journalist",
            "publication_id": pub["id"]
        })
        pub["journalist_count"] = journalist_count
        
        coverage_count = await db.media_coverage.count_documents({
            "publication": pub["name"]
        })
        pub["coverage_count"] = coverage_count
    
    return publications


@router.get("/publications/{publication_id}", response_model=PublicationResponse)
async def get_publication(publication_id: str):
    """Get a single publication by ID"""
    db = get_db()
    publication = await db.publications.find_one({"id": publication_id}, {"_id": 0})
    if not publication:
        raise HTTPException(status_code=404, detail="Publication not found")
    
    publication["journalist_count"] = await db.contacts.count_documents({
        "contact_type": "journalist",
        "publication_id": publication_id
    })
    publication["coverage_count"] = await db.media_coverage.count_documents({
        "publication": publication["name"]
    })
    
    return publication


@router.post("/publications", response_model=PublicationResponse)
async def create_publication(data: PublicationCreate):
    """Create a new publication"""
    db = get_db()
    
    pub_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc).isoformat()
    
    pub_doc = {
        "id": pub_id,
        **data.model_dump(),
        "journalist_count": 0,
        "coverage_count": 0,
        "created_at": now,
        "updated_at": now
    }
    
    await db.publications.insert_one(pub_doc)
    del pub_doc["_id"]
    return pub_doc


@router.put("/publications/{publication_id}", response_model=PublicationResponse)
async def update_publication(publication_id: str, data: PublicationCreate):
    """Update a publication"""
    db = get_db()
    
    existing = await db.publications.find_one({"id": publication_id})
    if not existing:
        raise HTTPException(status_code=404, detail="Publication not found")
    
    now = datetime.now(timezone.utc).isoformat()
    update_data = {
        **data.model_dump(),
        "updated_at": now
    }
    
    await db.publications.update_one(
        {"id": publication_id},
        {"$set": update_data}
    )
    
    updated = await db.publications.find_one({"id": publication_id}, {"_id": 0})
    updated["journalist_count"] = await db.contacts.count_documents({
        "contact_type": "journalist",
        "publication_id": publication_id
    })
    updated["coverage_count"] = await db.media_coverage.count_documents({
        "publication": updated["name"]
    })
    
    return updated


@router.delete("/publications/{publication_id}")
async def delete_publication(publication_id: str):
    """Delete a publication"""
    db = get_db()
    
    result = await db.publications.delete_one({"id": publication_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Publication not found")
    
    await db.contacts.update_many(
        {"publication_id": publication_id},
        {"$unset": {"publication_id": ""}}
    )
    
    return {"success": True}


@router.post("/publications/bulk-delete")
async def bulk_delete_publications(data: dict, user: dict = Depends(get_marketing_auth())):
    """Bulk delete multiple publications"""
    db = get_db()
    
    ids = data.get("ids", [])
    if not ids:
        raise HTTPException(status_code=400, detail="No IDs provided")
    
    result = await db.publications.delete_many({"id": {"$in": ids}})
    
    await db.contacts.update_many(
        {"publication_id": {"$in": ids}},
        {"$unset": {"publication_id": ""}}
    )
    
    return {"deleted_count": result.deleted_count, "message": f"Deleted {result.deleted_count} publications"}


@router.get("/publications/{publication_id}/journalists", response_model=List[ContactResponse])
async def get_publication_journalists(publication_id: str):
    """Get all journalists linked to a publication"""
    db = get_db()
    
    journalists = await db.contacts.find({
        "contact_type": "journalist",
        "publication_id": publication_id
    }, {"_id": 0}).to_list(100)
    
    return journalists


@router.post("/publications/{publication_id}/journalists/{journalist_id}")
async def link_journalist_to_publication(publication_id: str, journalist_id: str):
    """Link a journalist to a publication"""
    db = get_db()
    
    publication = await db.publications.find_one({"id": publication_id})
    if not publication:
        raise HTTPException(status_code=404, detail="Publication not found")
    
    journalist = await db.contacts.find_one({"id": journalist_id, "contact_type": "journalist"})
    if not journalist:
        raise HTTPException(status_code=404, detail="Journalist not found")
    
    await db.contacts.update_one(
        {"id": journalist_id},
        {"$set": {
            "publication_id": publication_id,
            "publication": publication["name"]
        }}
    )
    
    return {"success": True, "message": f"Journalist linked to {publication['name']}"}


@router.delete("/publications/{publication_id}/journalists/{journalist_id}")
async def unlink_journalist_from_publication(publication_id: str, journalist_id: str):
    """Unlink a journalist from a publication"""
    db = get_db()
    
    await db.contacts.update_one(
        {"id": journalist_id, "publication_id": publication_id},
        {"$unset": {"publication_id": "", "publication": ""}}
    )
    
    return {"success": True}


@router.get("/publications/{publication_id}/coverage", response_model=List[MediaCoverageResponse])
async def get_publication_coverage(publication_id: str):
    """Get all media coverage from a publication"""
    db = get_db()
    
    publication = await db.publications.find_one({"id": publication_id})
    if not publication:
        raise HTTPException(status_code=404, detail="Publication not found")
    
    coverage = await db.media_coverage.find({
        "publication": publication["name"]
    }, {"_id": 0}).sort("created_at", -1).to_list(100)
    
    return coverage
