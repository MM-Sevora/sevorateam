"""
Base utilities and dependencies for marketing routes
"""

from fastapi import Depends, HTTPException
from typing import Optional
import uuid
from datetime import datetime, timezone

# Database and auth dependencies - imported from main server
def get_db():
    """Get database instance - will be set by main server"""
    from server import db
    return db

def get_marketing_auth():
    """Get require_department dependency for marketing"""
    from server import require_department
    return require_department(["marketing"])

def get_current_user():
    """Get current user dependency"""
    from server import get_current_user as server_get_current_user
    return server_get_current_user

def generate_id() -> str:
    """Generate a new UUID"""
    return str(uuid.uuid4())

def now_iso() -> str:
    """Get current UTC datetime as ISO string"""
    return datetime.now(timezone.utc).isoformat()

def calculate_contact_score(contact: dict) -> float:
    """Calculate a score for a contact based on various factors"""
    score = 0.0
    
    # Base score for having key fields
    if contact.get('email'):
        score += 10
    if contact.get('phone'):
        score += 5
    if contact.get('instagram_handle'):
        score += 5
    if contact.get('youtube_handle'):
        score += 5
    if contact.get('twitter_handle'):
        score += 5
    if contact.get('linkedin_url'):
        score += 5
    
    # Engagement metrics
    followers = contact.get('followers', 0) or 0
    engagement_rate = contact.get('engagement_rate', 0) or 0
    
    # Follower tiers
    if followers >= 1000000:
        score += 25
    elif followers >= 500000:
        score += 20
    elif followers >= 100000:
        score += 15
    elif followers >= 50000:
        score += 10
    elif followers >= 10000:
        score += 5
    
    # Engagement rate bonus
    if engagement_rate >= 5:
        score += 15
    elif engagement_rate >= 3:
        score += 10
    elif engagement_rate >= 1:
        score += 5
    
    # Content completeness
    if contact.get('bio'):
        score += 5
    if contact.get('content_type') and len(contact.get('content_type', [])) > 0:
        score += 5
    if contact.get('style_tags') and len(contact.get('style_tags', [])) > 0:
        score += 5
    
    # PR-specific bonuses
    if contact.get('publication_id'):
        score += 10
    if contact.get('beat'):
        score += 5
    if contact.get('editor_level') in ['editor', 'senior_editor', 'editor_in_chief']:
        score += 10
    
    return min(score, 100)  # Cap at 100

# Re-export all models for convenience
from models.marketing import (
    # Contact models
    ContactCreate, ContactUpdate, ContactResponse, ContactType, ContactTier,
    # Communication models
    CommunicationCreate, CommunicationResponse,
    # Deal models
    DealCreate, DealResponse,
    # Contract models
    ContractCreate, ContractResponse,
    # Payment models
    PaymentCreate, PaymentResponse,
    # UGC models
    UGCCreate, UGCResponse,
    # PR Campaign models
    PRCampaignCreate, PRCampaignResponse,
    # Press Release models
    PressReleaseCreate, PressReleaseResponse,
    # Media Coverage models
    MediaCoverageCreate, MediaCoverageResponse,
    # PR Pitch models
    PRPitchCreate, PRPitchResponse,
    # Outreach Template models
    OutreachTemplateCreate, OutreachTemplateResponse,
    # Outreach Sequence models
    OutreachSequenceCreate, OutreachSequenceResponse,
    # Scheduled Outreach models
    ScheduledOutreachCreate, ScheduledOutreachResponse,
    # Event models
    EventCreate, EventResponse, EventAttendeeCreate,
    # Asset models
    AssetCreate, AssetResponse,
    # Approval models
    ApprovalCreate, ApprovalResponse,
    # Calendar models
    CalendarItemCreate, CalendarItemResponse,
    # Phase 5: Relationship CRM models
    InteractionCreate, InteractionResponse, RelationshipScoreUpdate,
    # Phase 8: Press Kit models
    PressKitAssetCreate, PressKitAssetResponse, PressKitCreate, PressKitResponse,
    # Phase 9: Alerts & Monitoring models
    MonitoringAlertCreate, MonitoringAlertResponse, AlertTriggerCreate, AlertTriggerResponse,
    # Phase 10: Pipeline models
    PipelineContactUpdate, PipelineContactResponse, PipelineStageStats,
    # Publication models
    PublicationCreate, PublicationResponse,
    # Unified Sequence & Activity models
    UnifiedSequenceCreate, UnifiedSequenceResponse, SequenceEnrollmentCreate, SequenceEnrollmentResponse, ActivityResponse,
    # Advertorial models
    AdvertorialCreate, AdvertorialResponse,
)
