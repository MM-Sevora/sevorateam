"""
Marketing Assets Models - Database schemas and Pydantic models for Creative Asset Management

Collections:
- marketing_assets: Creative assets (images, videos, documents)
- marketing_asset_usage: Track where assets are used
- marketing_asset_folders: Folder organization
"""

from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from datetime import datetime
from enum import Enum


# ============== ENUMS ==============

class AssetType(str, Enum):
    IMAGE = "image"
    VIDEO = "video"
    DOCUMENT = "document"
    GRAPHIC = "graphic"
    AUDIO = "audio"
    ARCHIVE = "archive"
    OTHER = "other"


class AssetStatus(str, Enum):
    UPLOADING = "uploading"
    PROCESSING = "processing"
    ACTIVE = "active"
    ARCHIVED = "archived"
    DELETED = "deleted"


class AssetPlatform(str, Enum):
    ALL = "all"
    INSTAGRAM = "instagram"
    FACEBOOK = "facebook"
    YOUTUBE = "youtube"
    TIKTOK = "tiktok"
    LINKEDIN = "linkedin"
    TWITTER = "twitter"
    WEBSITE = "website"
    EMAIL = "email"


class UsageType(str, Enum):
    AD = "ad"
    CAMPAIGN = "campaign"
    INFLUENCER_POST = "influencer_post"
    WEBSITE = "website"
    EMAIL = "email"
    SOCIAL_POST = "social_post"
    PRESENTATION = "presentation"
    OTHER = "other"


class StorageProvider(str, Enum):
    ONEDRIVE = "onedrive"
    LOCAL = "local"
    S3 = "s3"
    CLOUDFLARE_R2 = "cloudflare_r2"


# ============== ASSET FOLDERS ==============

class AssetFolderBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=200)
    parent_id: Optional[str] = None
    description: Optional[str] = None
    campaign_id: Optional[str] = None  # Link to marketing campaign
    color: Optional[str] = None  # For UI display
    icon: Optional[str] = None


class AssetFolderCreate(AssetFolderBase):
    pass


class AssetFolderUpdate(BaseModel):
    name: Optional[str] = None
    parent_id: Optional[str] = None
    description: Optional[str] = None
    campaign_id: Optional[str] = None
    color: Optional[str] = None
    icon: Optional[str] = None


class AssetFolderResponse(AssetFolderBase):
    id: str
    path: str  # Full path like /marketing_assets/campaign_name/images
    external_id: Optional[str] = None  # OneDrive folder ID
    created_by: Optional[str] = None
    created_at: datetime
    updated_at: Optional[datetime] = None
    asset_count: int = 0
    
    class Config:
        from_attributes = True


# ============== ASSETS ==============

class AssetDimensions(BaseModel):
    width: Optional[int] = None
    height: Optional[int] = None
    duration: Optional[float] = None  # For video/audio in seconds
    aspect_ratio: Optional[str] = None


class AssetBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=300)
    type: AssetType
    file_url: str
    file_size: int = Field(..., ge=0)  # In bytes
    mime_type: Optional[str] = None
    folder_id: Optional[str] = None
    campaign_id: Optional[str] = None
    influencer_id: Optional[str] = None
    platform: AssetPlatform = AssetPlatform.ALL
    tags: List[str] = []
    description: Optional[str] = None
    alt_text: Optional[str] = None  # For accessibility
    dimensions: Optional[AssetDimensions] = None
    thumbnail_url: Optional[str] = None
    preview_url: Optional[str] = None
    status: AssetStatus = AssetStatus.ACTIVE
    metadata: Optional[Dict[str, Any]] = None


class AssetCreate(AssetBase):
    pass


class AssetUpdate(BaseModel):
    name: Optional[str] = None
    folder_id: Optional[str] = None
    campaign_id: Optional[str] = None
    influencer_id: Optional[str] = None
    platform: Optional[AssetPlatform] = None
    tags: Optional[List[str]] = None
    description: Optional[str] = None
    alt_text: Optional[str] = None
    status: Optional[AssetStatus] = None
    metadata: Optional[Dict[str, Any]] = None


class AssetResponse(AssetBase):
    id: str
    external_id: Optional[str] = None  # OneDrive file ID
    storage_provider: StorageProvider = StorageProvider.ONEDRIVE
    uploaded_by: Optional[str] = None
    uploaded_by_name: Optional[str] = None
    created_at: datetime
    updated_at: Optional[datetime] = None
    usage_count: int = 0
    download_url: Optional[str] = None
    
    class Config:
        from_attributes = True


# ============== ASSET USAGE TRACKING ==============

class AssetUsageBase(BaseModel):
    asset_id: str
    usage_type: UsageType
    reference_id: str  # ID of the ad, campaign, post, etc.
    reference_name: Optional[str] = None
    notes: Optional[str] = None


class AssetUsageCreate(AssetUsageBase):
    pass


class AssetUsageResponse(AssetUsageBase):
    id: str
    created_by: Optional[str] = None
    created_at: datetime
    
    class Config:
        from_attributes = True


# ============== UPLOAD MODELS ==============

class UploadRequest(BaseModel):
    filename: str
    file_size: int
    mime_type: str
    folder_id: Optional[str] = None
    campaign_id: Optional[str] = None
    tags: List[str] = []
    description: Optional[str] = None
    platform: AssetPlatform = AssetPlatform.ALL


class UploadResponse(BaseModel):
    upload_url: str
    asset_id: str
    method: str  # "simple" or "chunked"
    expires_at: datetime


class ChunkedUploadInit(BaseModel):
    filename: str
    file_size: int
    mime_type: str
    chunk_size: int = 320 * 1024  # 320 KB default


class ChunkedUploadSession(BaseModel):
    session_id: str
    upload_url: str
    asset_id: str
    chunk_size: int
    total_chunks: int
    expires_at: datetime


class ChunkedUploadProgress(BaseModel):
    session_id: str
    asset_id: str
    uploaded_chunks: int
    total_chunks: int
    uploaded_bytes: int
    total_bytes: int
    progress_percent: float
    status: str  # uploading, completed, failed


# ============== STATS & OVERVIEW ==============

class AssetTypeStats(BaseModel):
    type: AssetType
    count: int
    total_size: int  # In bytes


class AssetsOverviewStats(BaseModel):
    total_assets: int
    total_size: int  # In bytes
    total_folders: int
    assets_by_type: List[AssetTypeStats]
    assets_by_platform: Dict[str, int]
    recent_uploads: int  # Last 7 days
    most_used_assets: List[str]  # Asset IDs


# ============== SEARCH & FILTER ==============

class AssetSearchFilters(BaseModel):
    query: Optional[str] = None
    types: Optional[List[AssetType]] = None
    platforms: Optional[List[AssetPlatform]] = None
    folder_id: Optional[str] = None
    campaign_id: Optional[str] = None
    influencer_id: Optional[str] = None
    tags: Optional[List[str]] = None
    status: Optional[AssetStatus] = None
    uploaded_by: Optional[str] = None
    date_from: Optional[datetime] = None
    date_to: Optional[datetime] = None
    min_size: Optional[int] = None
    max_size: Optional[int] = None


class AssetSearchResponse(BaseModel):
    assets: List[AssetResponse]
    total_count: int
    page: int
    page_size: int
    has_more: bool
