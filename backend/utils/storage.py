"""
Emergent Object Storage Utility
For file uploads and downloads using Emergent's storage API
"""

import os
import requests
import logging

logger = logging.getLogger(__name__)

STORAGE_URL = "https://integrations.emergentagent.com/objstore/api/v1/storage"
EMERGENT_KEY = os.environ.get("EMERGENT_LLM_KEY")
APP_NAME = "sevora-pm"

# Module-level storage key - initialized once
storage_key = None


def init_storage():
    """Initialize storage and get session-scoped storage key. Call ONCE at startup."""
    global storage_key
    if storage_key:
        return storage_key
    
    if not EMERGENT_KEY:
        raise ValueError("EMERGENT_LLM_KEY not set in environment")
    
    try:
        resp = requests.post(
            f"{STORAGE_URL}/init",
            json={"emergent_key": EMERGENT_KEY},
            timeout=30
        )
        resp.raise_for_status()
        storage_key = resp.json()["storage_key"]
        logger.info("Storage initialized successfully")
        return storage_key
    except Exception as e:
        logger.error(f"Storage initialization failed: {e}")
        raise


def put_object(path: str, data: bytes, content_type: str) -> dict:
    """
    Upload file to storage.
    
    Args:
        path: Storage path (no leading slash)
        data: File content as bytes
        content_type: MIME type of the file
        
    Returns:
        dict with path, size, etag
    """
    key = init_storage()
    
    resp = requests.put(
        f"{STORAGE_URL}/objects/{path}",
        headers={
            "X-Storage-Key": key,
            "Content-Type": content_type
        },
        data=data,
        timeout=120
    )
    resp.raise_for_status()
    return resp.json()


def get_object(path: str) -> tuple:
    """
    Download file from storage.
    
    Args:
        path: Storage path
        
    Returns:
        tuple of (content_bytes, content_type)
    """
    key = init_storage()
    
    resp = requests.get(
        f"{STORAGE_URL}/objects/{path}",
        headers={"X-Storage-Key": key},
        timeout=60
    )
    resp.raise_for_status()
    return resp.content, resp.headers.get("Content-Type", "application/octet-stream")


# Common MIME types mapping
MIME_TYPES = {
    "jpg": "image/jpeg",
    "jpeg": "image/jpeg",
    "png": "image/png",
    "gif": "image/gif",
    "webp": "image/webp",
    "pdf": "application/pdf",
    "doc": "application/msword",
    "docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "xls": "application/vnd.ms-excel",
    "xlsx": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "ppt": "application/vnd.ms-powerpoint",
    "pptx": "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    "txt": "text/plain",
    "csv": "text/csv",
    "json": "application/json",
    "zip": "application/zip",
    "mp4": "video/mp4",
    "mp3": "audio/mpeg",
}


def get_mime_type(filename: str) -> str:
    """Get MIME type from filename extension"""
    ext = filename.rsplit(".", 1)[-1].lower() if "." in filename else "bin"
    return MIME_TYPES.get(ext, "application/octet-stream")


def generate_storage_path(user_id: str, filename: str, file_uuid: str) -> str:
    """Generate storage path for a file"""
    ext = filename.rsplit(".", 1)[-1].lower() if "." in filename else "bin"
    return f"{APP_NAME}/tasks/{user_id}/{file_uuid}.{ext}"
