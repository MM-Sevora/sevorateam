"""
Creative Assets Management Routes

Handles:
- Asset folders (OneDrive integration)
- Asset uploads (simple and chunked)
- Asset downloads
- Asset metadata and usage tracking
"""

from fastapi import APIRouter, HTTPException, UploadFile, File, Form, Query, BackgroundTasks
from fastapi.responses import StreamingResponse, JSONResponse
from typing import Optional, List
from datetime import datetime
import uuid
import os
import io
import mimetypes

# Import models
from models.marketing_assets import (
    AssetType, AssetStatus, AssetPlatform, UsageType, StorageProvider,
    AssetFolderCreate, AssetFolderUpdate, AssetFolderResponse,
    AssetCreate, AssetUpdate, AssetResponse,
    AssetUsageCreate, AssetUsageResponse,
    UploadRequest, UploadResponse, ChunkedUploadSession,
    AssetsOverviewStats, AssetTypeStats, AssetSearchFilters, AssetSearchResponse
)

router = APIRouter(prefix="/assets", tags=["Marketing - Creative Assets"])


def get_db():
    """Get database connection"""
    from pymongo import MongoClient
    client = MongoClient(os.environ.get("MONGO_URL"))
    return client[os.environ.get("DB_NAME", "sevora_production")]


def serialize_doc(doc: dict) -> dict:
    """Serialize MongoDB document for JSON response"""
    if doc is None:
        return None
    doc["id"] = str(doc.pop("_id", doc.get("id", "")))
    return doc


def get_asset_type_from_mime(mime_type: str) -> AssetType:
    """Determine asset type from MIME type"""
    if not mime_type:
        return AssetType.OTHER
    
    if mime_type.startswith("image/"):
        return AssetType.IMAGE
    elif mime_type.startswith("video/"):
        return AssetType.VIDEO
    elif mime_type.startswith("audio/"):
        return AssetType.AUDIO
    elif mime_type in ["application/pdf", "application/msword", 
                       "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
                       "text/plain", "text/csv"]:
        return AssetType.DOCUMENT
    elif mime_type in ["application/zip", "application/x-rar-compressed", "application/x-7z-compressed"]:
        return AssetType.ARCHIVE
    elif mime_type in ["image/svg+xml", "application/illustrator", 
                       "application/vnd.adobe.photoshop"]:
        return AssetType.GRAPHIC
    else:
        return AssetType.OTHER


def get_onedrive_service():
    """Get OneDrive service - lazy import to avoid circular imports"""
    from services.marketing.onedrive_service import get_onedrive_service as _get_service
    return _get_service()


# ============== STORAGE STATUS ==============

@router.get("/storage/status")
async def get_storage_status():
    """Check OneDrive storage configuration status"""
    try:
        service = get_onedrive_service()
        is_configured = service.is_configured()
        
        return {
            "provider": "onedrive",
            "configured": is_configured,
            "root_folder": service.root_folder if is_configured else None,
            "message": "OneDrive is ready" if is_configured else "OneDrive credentials not configured"
        }
    except Exception as e:
        return {
            "provider": "onedrive",
            "configured": False,
            "error": str(e)
        }


# ============== FOLDERS ==============

@router.get("/folders", response_model=List[AssetFolderResponse])
async def list_asset_folders(parent_id: Optional[str] = None):
    """List asset folders"""
    db = get_db()
    
    query = {}
    if parent_id:
        query["parent_id"] = parent_id
    else:
        query["parent_id"] = None  # Root level folders
    
    folders = list(db.marketing_asset_folders.find(query).sort("name", 1))
    
    # Add asset count for each folder
    for folder in folders:
        folder["asset_count"] = db.marketing_assets.count_documents({
            "folder_id": str(folder["_id"])
        })
    
    return [serialize_doc(f) for f in folders]


@router.post("/folders", response_model=AssetFolderResponse)
async def create_asset_folder(folder: AssetFolderCreate, user_id: Optional[str] = None):
    """Create a new asset folder (also creates in OneDrive if configured)"""
    db = get_db()
    
    # Build path
    if folder.parent_id:
        parent = db.marketing_asset_folders.find_one({"_id": folder.parent_id})
        if not parent:
            raise HTTPException(status_code=404, detail="Parent folder not found")
        path = f"{parent.get('path', '')}/{folder.name}"
    else:
        path = f"/{folder.name}"
    
    folder_doc = folder.model_dump()
    folder_doc["_id"] = str(uuid.uuid4())
    folder_doc["path"] = path
    folder_doc["created_by"] = user_id
    folder_doc["created_at"] = datetime.utcnow()
    folder_doc["asset_count"] = 0
    
    # Try to create in OneDrive
    try:
        service = get_onedrive_service()
        if service.is_configured():
            onedrive_folder = service.create_folder(folder.name, folder.parent_id)
            folder_doc["external_id"] = onedrive_folder.get("id")
    except Exception as e:
        # Log but don't fail - folder will be local only
        print(f"OneDrive folder creation failed: {e}")
    
    db.marketing_asset_folders.insert_one(folder_doc)
    
    return serialize_doc(folder_doc)


@router.get("/folders/{folder_id}", response_model=AssetFolderResponse)
async def get_asset_folder(folder_id: str):
    """Get a specific folder"""
    db = get_db()
    
    folder = db.marketing_asset_folders.find_one({"_id": folder_id})
    if not folder:
        raise HTTPException(status_code=404, detail="Folder not found")
    
    folder["asset_count"] = db.marketing_assets.count_documents({"folder_id": folder_id})
    
    return serialize_doc(folder)


@router.put("/folders/{folder_id}", response_model=AssetFolderResponse)
async def update_asset_folder(folder_id: str, update: AssetFolderUpdate):
    """Update a folder"""
    db = get_db()
    
    update_data = {k: v for k, v in update.model_dump().items() if v is not None}
    update_data["updated_at"] = datetime.utcnow()
    
    result = db.marketing_asset_folders.find_one_and_update(
        {"_id": folder_id},
        {"$set": update_data},
        return_document=True
    )
    
    if not result:
        raise HTTPException(status_code=404, detail="Folder not found")
    
    return serialize_doc(result)


@router.delete("/folders/{folder_id}")
async def delete_asset_folder(folder_id: str, force: bool = False):
    """Delete a folder"""
    db = get_db()
    
    folder = db.marketing_asset_folders.find_one({"_id": folder_id})
    if not folder:
        raise HTTPException(status_code=404, detail="Folder not found")
    
    # Check for assets
    asset_count = db.marketing_assets.count_documents({"folder_id": folder_id})
    if asset_count > 0 and not force:
        raise HTTPException(
            status_code=400,
            detail=f"Folder contains {asset_count} assets. Use force=true to delete anyway."
        )
    
    # Check for subfolders
    subfolder_count = db.marketing_asset_folders.count_documents({"parent_id": folder_id})
    if subfolder_count > 0:
        raise HTTPException(
            status_code=400,
            detail=f"Folder contains {subfolder_count} subfolders. Delete them first."
        )
    
    # Try to delete from OneDrive
    if folder.get("external_id"):
        try:
            service = get_onedrive_service()
            if service.is_configured():
                service.delete_folder(folder["external_id"])
        except Exception as e:
            print(f"OneDrive folder deletion failed: {e}")
    
    db.marketing_asset_folders.delete_one({"_id": folder_id})
    
    return {"message": "Folder deleted successfully"}


@router.post("/folders/campaign-structure")
async def create_campaign_folder_structure(campaign_name: str, campaign_id: Optional[str] = None):
    """Create complete folder structure for a campaign"""
    db = get_db()
    
    asset_types = ["Images", "Videos", "Documents", "Graphics", "Archive"]
    created_folders = []
    
    # Create main campaign folder
    campaign_folder_doc = {
        "_id": str(uuid.uuid4()),
        "name": campaign_name,
        "parent_id": None,
        "campaign_id": campaign_id,
        "path": f"/{campaign_name}",
        "created_at": datetime.utcnow(),
        "asset_count": 0
    }
    
    # Try OneDrive
    try:
        service = get_onedrive_service()
        if service.is_configured():
            result = service.create_campaign_structure(campaign_name)
            if result.get("folders"):
                campaign_folder_doc["external_id"] = result["folders"][0].get("id")
    except Exception as e:
        print(f"OneDrive campaign structure creation failed: {e}")
    
    db.marketing_asset_folders.insert_one(campaign_folder_doc)
    created_folders.append(serialize_doc(campaign_folder_doc.copy()))
    
    # Create subfolders
    for asset_type in asset_types:
        subfolder_doc = {
            "_id": str(uuid.uuid4()),
            "name": asset_type,
            "parent_id": campaign_folder_doc["_id"],
            "campaign_id": campaign_id,
            "path": f"/{campaign_name}/{asset_type}",
            "created_at": datetime.utcnow(),
            "asset_count": 0
        }
        db.marketing_asset_folders.insert_one(subfolder_doc)
        created_folders.append(serialize_doc(subfolder_doc.copy()))
    
    return {
        "campaign_name": campaign_name,
        "folders_created": len(created_folders),
        "folders": created_folders
    }


# ============== ASSET UPLOAD ==============

@router.post("/upload")
async def upload_asset(
    file: UploadFile = File(...),
    folder_id: Optional[str] = Form(None),
    campaign_id: Optional[str] = Form(None),
    influencer_id: Optional[str] = Form(None),
    platform: Optional[str] = Form("all"),
    tags: Optional[str] = Form(""),  # Comma-separated
    description: Optional[str] = Form(None),
    user_id: Optional[str] = Form(None)
):
    """Upload an asset file"""
    db = get_db()
    
    # Read file content
    file_content = await file.read()
    file_size = len(file_content)
    
    if file_size == 0:
        raise HTTPException(status_code=400, detail="File is empty")
    
    # Determine asset type
    mime_type = file.content_type or mimetypes.guess_type(file.filename)[0]
    asset_type = get_asset_type_from_mime(mime_type)
    
    # Parse tags
    tag_list = [t.strip() for t in tags.split(",") if t.strip()] if tags else []
    
    # Get folder path for OneDrive
    folder_path = None
    if folder_id:
        folder = db.marketing_asset_folders.find_one({"_id": folder_id})
        if folder:
            folder_path = folder.get("path", "").lstrip("/")
    
    # Create asset document
    asset_doc = {
        "_id": str(uuid.uuid4()),
        "name": file.filename,
        "type": asset_type.value,
        "file_size": file_size,
        "mime_type": mime_type,
        "folder_id": folder_id,
        "campaign_id": campaign_id,
        "influencer_id": influencer_id,
        "platform": platform,
        "tags": tag_list,
        "description": description,
        "status": AssetStatus.ACTIVE.value,
        "storage_provider": StorageProvider.ONEDRIVE.value,
        "uploaded_by": user_id,
        "created_at": datetime.utcnow(),
        "usage_count": 0
    }
    
    # Upload to OneDrive
    try:
        service = get_onedrive_service()
        if service.is_configured():
            # Use simple or chunked upload based on size
            if file_size <= service.SIMPLE_UPLOAD_LIMIT:
                result = service.upload_simple(file_content, file.filename, folder_path)
            else:
                result = service.upload_chunked(file_content, file.filename, folder_path)
            
            asset_doc["external_id"] = result.get("id")
            asset_doc["file_url"] = result.get("web_url", "")
            asset_doc["download_url"] = result.get("download_url")
        else:
            # Fallback to local storage
            asset_doc["storage_provider"] = StorageProvider.LOCAL.value
            asset_doc["file_url"] = f"/api/marketing/assets/{asset_doc['_id']}/download"
            
            # Store file locally (for development/fallback)
            local_path = f"/app/uploads/marketing_assets/{asset_doc['_id']}"
            os.makedirs(os.path.dirname(local_path), exist_ok=True)
            with open(local_path, "wb") as f:
                f.write(file_content)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Upload failed: {str(e)}")
    
    db.marketing_assets.insert_one(asset_doc)
    
    return serialize_doc(asset_doc)


@router.post("/upload/init-chunked")
async def init_chunked_upload(
    filename: str,
    file_size: int,
    folder_id: Optional[str] = None
):
    """Initialize a chunked upload session for large files"""
    db = get_db()
    
    # Get folder path
    folder_path = None
    if folder_id:
        folder = db.marketing_asset_folders.find_one({"_id": folder_id})
        if folder:
            folder_path = folder.get("path", "").lstrip("/")
    
    try:
        service = get_onedrive_service()
        if not service.is_configured():
            raise HTTPException(status_code=500, detail="OneDrive not configured")
        
        session = service.create_upload_session(filename, folder_path)
        
        # Create pending asset record
        asset_id = str(uuid.uuid4())
        chunk_size = service.CHUNK_SIZE
        total_chunks = (file_size + chunk_size - 1) // chunk_size
        
        return ChunkedUploadSession(
            session_id=asset_id,
            upload_url=session["upload_url"],
            asset_id=asset_id,
            chunk_size=chunk_size,
            total_chunks=total_chunks,
            expires_at=datetime.fromisoformat(session["expiration"].replace("Z", "+00:00"))
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to initialize upload: {str(e)}")


# ============== ASSET RETRIEVAL ==============

@router.get("", response_model=List[AssetResponse])
async def list_assets(
    folder_id: Optional[str] = None,
    campaign_id: Optional[str] = None,
    influencer_id: Optional[str] = None,
    asset_type: Optional[AssetType] = None,
    platform: Optional[AssetPlatform] = None,
    status: Optional[AssetStatus] = None,
    tags: Optional[str] = None,
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100)
):
    """List assets with filters"""
    db = get_db()
    
    query = {}
    if folder_id:
        query["folder_id"] = folder_id
    if campaign_id:
        query["campaign_id"] = campaign_id
    if influencer_id:
        query["influencer_id"] = influencer_id
    if asset_type:
        query["type"] = asset_type.value
    if platform:
        query["platform"] = platform.value
    if status:
        query["status"] = status.value
    if tags:
        tag_list = [t.strip() for t in tags.split(",")]
        query["tags"] = {"$in": tag_list}
    
    assets = list(
        db.marketing_assets.find(query)
        .sort("created_at", -1)
        .skip(skip)
        .limit(limit)
    )
    
    # Enrich with uploader info
    for asset in assets:
        if asset.get("uploaded_by"):
            user = db.users.find_one({"_id": asset["uploaded_by"]}, {"name": 1, "email": 1})
            if user:
                asset["uploaded_by_name"] = user.get("name") or user.get("email")
    
    return [serialize_doc(a) for a in assets]


@router.get("/search", response_model=AssetSearchResponse)
async def search_assets(
    query: Optional[str] = None,
    folder_id: Optional[str] = None,
    campaign_id: Optional[str] = None,
    types: Optional[str] = None,  # Comma-separated
    tags: Optional[str] = None,  # Comma-separated
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100)
):
    """Search assets with text query"""
    db = get_db()
    
    mongo_query = {}
    
    if query:
        mongo_query["$or"] = [
            {"name": {"$regex": query, "$options": "i"}},
            {"description": {"$regex": query, "$options": "i"}},
            {"tags": {"$in": [query]}}
        ]
    
    if folder_id:
        mongo_query["folder_id"] = folder_id
    if campaign_id:
        mongo_query["campaign_id"] = campaign_id
    if types:
        type_list = [t.strip() for t in types.split(",")]
        mongo_query["type"] = {"$in": type_list}
    if tags:
        tag_list = [t.strip() for t in tags.split(",")]
        mongo_query["tags"] = {"$in": tag_list}
    
    total_count = db.marketing_assets.count_documents(mongo_query)
    skip = (page - 1) * page_size
    
    assets = list(
        db.marketing_assets.find(mongo_query)
        .sort("created_at", -1)
        .skip(skip)
        .limit(page_size)
    )
    
    return AssetSearchResponse(
        assets=[serialize_doc(a) for a in assets],
        total_count=total_count,
        page=page,
        page_size=page_size,
        has_more=(skip + len(assets)) < total_count
    )


@router.get("/{asset_id}", response_model=AssetResponse)
async def get_asset(asset_id: str):
    """Get a specific asset"""
    db = get_db()
    
    asset = db.marketing_assets.find_one({"_id": asset_id})
    if not asset:
        raise HTTPException(status_code=404, detail="Asset not found")
    
    # Get fresh download URL from OneDrive
    if asset.get("external_id") and asset.get("storage_provider") == "onedrive":
        try:
            service = get_onedrive_service()
            if service.is_configured():
                download_url = service.get_download_url(asset["external_id"])
                if download_url:
                    asset["download_url"] = download_url
        except Exception:
            pass
    
    return serialize_doc(asset)


@router.get("/{asset_id}/download")
async def download_asset(asset_id: str):
    """Download an asset file"""
    db = get_db()
    
    asset = db.marketing_assets.find_one({"_id": asset_id})
    if not asset:
        raise HTTPException(status_code=404, detail="Asset not found")
    
    if asset.get("storage_provider") == "onedrive" and asset.get("external_id"):
        try:
            service = get_onedrive_service()
            if service.is_configured():
                content, filename = service.download_file(asset["external_id"])
                
                return StreamingResponse(
                    io.BytesIO(content),
                    media_type=asset.get("mime_type", "application/octet-stream"),
                    headers={"Content-Disposition": f"attachment; filename={filename}"}
                )
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Download failed: {str(e)}")
    else:
        # Local storage fallback
        local_path = f"/app/uploads/marketing_assets/{asset_id}"
        if os.path.exists(local_path):
            with open(local_path, "rb") as f:
                content = f.read()
            
            return StreamingResponse(
                io.BytesIO(content),
                media_type=asset.get("mime_type", "application/octet-stream"),
                headers={"Content-Disposition": f"attachment; filename={asset.get('name', 'download')}"}
            )
    
    raise HTTPException(status_code=404, detail="File not found")


@router.put("/{asset_id}", response_model=AssetResponse)
async def update_asset(asset_id: str, update: AssetUpdate):
    """Update asset metadata"""
    db = get_db()
    
    update_data = {k: v for k, v in update.model_dump().items() if v is not None}
    
    if "platform" in update_data:
        update_data["platform"] = update_data["platform"].value
    if "status" in update_data:
        update_data["status"] = update_data["status"].value
    
    update_data["updated_at"] = datetime.utcnow()
    
    result = db.marketing_assets.find_one_and_update(
        {"_id": asset_id},
        {"$set": update_data},
        return_document=True
    )
    
    if not result:
        raise HTTPException(status_code=404, detail="Asset not found")
    
    return serialize_doc(result)


@router.delete("/{asset_id}")
async def delete_asset(asset_id: str, permanent: bool = False):
    """Delete an asset"""
    db = get_db()
    
    asset = db.marketing_assets.find_one({"_id": asset_id})
    if not asset:
        raise HTTPException(status_code=404, detail="Asset not found")
    
    if permanent:
        # Delete from OneDrive
        if asset.get("external_id") and asset.get("storage_provider") == "onedrive":
            try:
                service = get_onedrive_service()
                if service.is_configured():
                    service.delete_file(asset["external_id"])
            except Exception as e:
                print(f"OneDrive deletion failed: {e}")
        
        # Delete local file
        local_path = f"/app/uploads/marketing_assets/{asset_id}"
        if os.path.exists(local_path):
            os.remove(local_path)
        
        # Delete from database
        db.marketing_assets.delete_one({"_id": asset_id})
        
        # Delete usage records
        db.marketing_asset_usage.delete_many({"asset_id": asset_id})
        
        return {"message": "Asset permanently deleted"}
    else:
        # Soft delete
        db.marketing_assets.update_one(
            {"_id": asset_id},
            {"$set": {"status": AssetStatus.DELETED.value, "updated_at": datetime.utcnow()}}
        )
        return {"message": "Asset archived"}


# ============== ASSET USAGE TRACKING ==============

@router.get("/{asset_id}/usage", response_model=List[AssetUsageResponse])
async def get_asset_usage(asset_id: str):
    """Get usage history for an asset"""
    db = get_db()
    
    usage = list(
        db.marketing_asset_usage.find({"asset_id": asset_id})
        .sort("created_at", -1)
    )
    
    return [serialize_doc(u) for u in usage]


@router.post("/{asset_id}/usage", response_model=AssetUsageResponse)
async def add_asset_usage(asset_id: str, usage: AssetUsageCreate, user_id: Optional[str] = None):
    """Record asset usage"""
    db = get_db()
    
    # Verify asset exists
    asset = db.marketing_assets.find_one({"_id": asset_id})
    if not asset:
        raise HTTPException(status_code=404, detail="Asset not found")
    
    usage_doc = usage.model_dump()
    usage_doc["_id"] = str(uuid.uuid4())
    usage_doc["asset_id"] = asset_id
    usage_doc["usage_type"] = usage.usage_type.value
    usage_doc["created_by"] = user_id
    usage_doc["created_at"] = datetime.utcnow()
    
    db.marketing_asset_usage.insert_one(usage_doc)
    
    # Update usage count
    db.marketing_assets.update_one(
        {"_id": asset_id},
        {"$inc": {"usage_count": 1}}
    )
    
    return serialize_doc(usage_doc)


# ============== STATS ==============

@router.get("/overview/stats", response_model=AssetsOverviewStats)
async def get_assets_overview_stats():
    """Get overall asset statistics"""
    db = get_db()
    
    total_assets = db.marketing_assets.count_documents({"status": {"$ne": "deleted"}})
    total_folders = db.marketing_asset_folders.count_documents({})
    
    # Size aggregation
    size_pipeline = [
        {"$match": {"status": {"$ne": "deleted"}}},
        {"$group": {"_id": None, "total_size": {"$sum": "$file_size"}}}
    ]
    size_result = list(db.marketing_assets.aggregate(size_pipeline))
    total_size = size_result[0]["total_size"] if size_result else 0
    
    # By type
    type_pipeline = [
        {"$match": {"status": {"$ne": "deleted"}}},
        {"$group": {"_id": "$type", "count": {"$sum": 1}, "total_size": {"$sum": "$file_size"}}}
    ]
    type_results = list(db.marketing_assets.aggregate(type_pipeline))
    assets_by_type = [
        AssetTypeStats(type=AssetType(r["_id"]), count=r["count"], total_size=r["total_size"])
        for r in type_results
    ]
    
    # By platform
    platform_pipeline = [
        {"$match": {"status": {"$ne": "deleted"}}},
        {"$group": {"_id": "$platform", "count": {"$sum": 1}}}
    ]
    platform_results = list(db.marketing_assets.aggregate(platform_pipeline))
    assets_by_platform = {r["_id"]: r["count"] for r in platform_results}
    
    # Recent uploads (last 7 days)
    from datetime import timedelta
    week_ago = datetime.utcnow() - timedelta(days=7)
    recent_uploads = db.marketing_assets.count_documents({
        "created_at": {"$gte": week_ago},
        "status": {"$ne": "deleted"}
    })
    
    # Most used assets
    usage_pipeline = [
        {"$match": {"status": {"$ne": "deleted"}}},
        {"$sort": {"usage_count": -1}},
        {"$limit": 5},
        {"$project": {"_id": 1}}
    ]
    most_used = [str(r["_id"]) for r in db.marketing_assets.aggregate(usage_pipeline)]
    
    return AssetsOverviewStats(
        total_assets=total_assets,
        total_size=total_size,
        total_folders=total_folders,
        assets_by_type=assets_by_type,
        assets_by_platform=assets_by_platform,
        recent_uploads=recent_uploads,
        most_used_assets=most_used
    )
