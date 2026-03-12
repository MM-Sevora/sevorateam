"""
Publications Pitches Routes - PR Pipeline Management

Handles tracking of pitches to publications/journalists through various stages
"""

from fastapi import APIRouter, HTTPException, Query
from typing import Optional, List
from datetime import datetime
from pydantic import BaseModel, Field
from enum import Enum
import uuid
import os


router = APIRouter(prefix="/publications", tags=["Marketing - Publications Pipeline"])


class PitchStage(str, Enum):
    PITCHED = "pitched"
    INTERESTED = "interested"
    INTERVIEW_SCHEDULED = "interview_scheduled"
    CONTENT_REVIEW = "content_review"
    APPROVED = "approved"
    PUBLISHED = "published"
    DECLINED = "declined"


class PitchType(str, Enum):
    PRESS_RELEASE = "press_release"
    STORY_PITCH = "story_pitch"
    PRODUCT_LAUNCH = "product_launch"
    INTERVIEW_REQUEST = "interview_request"
    EVENT_COVERAGE = "event_coverage"
    SPONSORED_CONTENT = "sponsored_content"
    THOUGHT_LEADERSHIP = "thought_leadership"


class Priority(str, Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    URGENT = "urgent"


class PitchCreate(BaseModel):
    publication_id: str
    journalist_name: Optional[str] = None
    journalist_email: Optional[str] = None
    pitch_type: PitchType = PitchType.STORY_PITCH
    subject: str = Field(..., min_length=1)
    description: Optional[str] = None
    target_date: Optional[str] = None
    priority: Priority = Priority.MEDIUM
    stage: PitchStage = PitchStage.PITCHED
    notes: Optional[str] = None


class PitchUpdate(BaseModel):
    publication_id: Optional[str] = None
    journalist_name: Optional[str] = None
    journalist_email: Optional[str] = None
    pitch_type: Optional[PitchType] = None
    subject: Optional[str] = None
    description: Optional[str] = None
    target_date: Optional[str] = None
    priority: Optional[Priority] = None
    stage: Optional[PitchStage] = None
    notes: Optional[str] = None


class PitchResponse(BaseModel):
    id: str
    publication_id: str
    publication_name: Optional[str] = None
    journalist_name: Optional[str] = None
    journalist_email: Optional[str] = None
    pitch_type: str
    subject: str
    description: Optional[str] = None
    target_date: Optional[str] = None
    priority: str
    stage: str
    notes: Optional[str] = None
    created_at: datetime
    updated_at: Optional[datetime] = None


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


@router.get("/pitches", response_model=List[PitchResponse])
async def list_pitches(
    stage: Optional[PitchStage] = None,
    priority: Optional[Priority] = None,
    publication_id: Optional[str] = None,
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=200)
):
    """List all publication pitches"""
    db = get_db()
    
    query = {}
    if stage:
        query["stage"] = stage.value
    if priority:
        query["priority"] = priority.value
    if publication_id:
        query["publication_id"] = publication_id
    
    pitches = list(
        db.publication_pitches.find(query)
        .sort("created_at", -1)
        .skip(skip)
        .limit(limit)
    )
    
    # Enrich with publication name
    pub_ids = list(set(p.get("publication_id") for p in pitches if p.get("publication_id")))
    publications = {p["id"]: p["name"] for p in db.publications.find({"id": {"$in": pub_ids}}, {"id": 1, "name": 1})}
    
    for pitch in pitches:
        pitch["publication_name"] = publications.get(pitch.get("publication_id"), "Unknown")
    
    return [serialize_doc(p) for p in pitches]


@router.post("/pitches", response_model=PitchResponse)
async def create_pitch(pitch: PitchCreate):
    """Create a new pitch"""
    db = get_db()
    
    # Verify publication exists
    publication = db.publications.find_one({"id": pitch.publication_id}, {"name": 1})
    if not publication:
        raise HTTPException(status_code=404, detail="Publication not found")
    
    pitch_doc = pitch.model_dump()
    pitch_doc["_id"] = str(uuid.uuid4())
    pitch_doc["pitch_type"] = pitch.pitch_type.value
    pitch_doc["priority"] = pitch.priority.value
    pitch_doc["stage"] = pitch.stage.value
    pitch_doc["publication_name"] = publication.get("name", "Unknown")
    pitch_doc["created_at"] = datetime.utcnow()
    
    db.publication_pitches.insert_one(pitch_doc)
    
    return serialize_doc(pitch_doc)


@router.get("/pitches/{pitch_id}", response_model=PitchResponse)
async def get_pitch(pitch_id: str):
    """Get a specific pitch"""
    db = get_db()
    
    pitch = db.publication_pitches.find_one({"_id": pitch_id})
    if not pitch:
        raise HTTPException(status_code=404, detail="Pitch not found")
    
    # Get publication name
    publication = db.publications.find_one({"id": pitch.get("publication_id")}, {"name": 1})
    pitch["publication_name"] = publication.get("name", "Unknown") if publication else "Unknown"
    
    return serialize_doc(pitch)


@router.put("/pitches/{pitch_id}", response_model=PitchResponse)
async def update_pitch(pitch_id: str, update: PitchUpdate):
    """Update a pitch"""
    db = get_db()
    
    update_data = {k: v for k, v in update.model_dump().items() if v is not None}
    
    # Convert enums
    if "pitch_type" in update_data:
        update_data["pitch_type"] = update_data["pitch_type"].value
    if "priority" in update_data:
        update_data["priority"] = update_data["priority"].value
    if "stage" in update_data:
        update_data["stage"] = update_data["stage"].value
    
    # If publication changed, update name
    if "publication_id" in update_data:
        publication = db.publications.find_one({"id": update_data["publication_id"]}, {"name": 1})
        if publication:
            update_data["publication_name"] = publication.get("name", "Unknown")
    
    update_data["updated_at"] = datetime.utcnow()
    
    result = db.publication_pitches.find_one_and_update(
        {"_id": pitch_id},
        {"$set": update_data},
        return_document=True
    )
    
    if not result:
        raise HTTPException(status_code=404, detail="Pitch not found")
    
    return serialize_doc(result)


@router.delete("/pitches/{pitch_id}")
async def delete_pitch(pitch_id: str):
    """Delete a pitch"""
    db = get_db()
    
    result = db.publication_pitches.delete_one({"_id": pitch_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Pitch not found")
    
    return {"message": "Pitch deleted"}


@router.get("/pitches/stats/summary")
async def get_pitch_stats():
    """Get pitch statistics"""
    db = get_db()
    
    pipeline = [
        {"$group": {
            "_id": "$stage",
            "count": {"$sum": 1}
        }}
    ]
    
    results = list(db.publication_pitches.aggregate(pipeline))
    by_stage = {r["_id"]: r["count"] for r in results}
    
    total = sum(by_stage.values())
    published = by_stage.get("published", 0)
    declined = by_stage.get("declined", 0)
    completed = published + declined
    
    return {
        "total": total,
        "by_stage": by_stage,
        "published": published,
        "declined": declined,
        "success_rate": round((published / completed * 100) if completed > 0 else 0, 1)
    }
