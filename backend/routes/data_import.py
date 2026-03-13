"""
Data Import API - Import JSON data into MongoDB collections
"""

from fastapi import APIRouter, HTTPException, Depends, UploadFile, File
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
import json
import logging
from typing import Optional
from datetime import datetime, timezone

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/data-import", tags=["Data Import"])
security = HTTPBearer()

# Database reference
db = None

def set_db(database):
    global db
    db = database

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    """Verify JWT token and return user"""
    import jwt
    import os
    
    token = credentials.credentials
    try:
        payload = jwt.decode(token, os.environ.get('JWT_SECRET', 'sevora-team-secret-2024'), algorithms=["HS256"])
        user_id = payload.get("sub")
        if not user_id:
            raise HTTPException(status_code=401, detail="Invalid token")
        
        if db is not None:
            user = await db.users.find_one({"id": user_id})
            if user:
                return {"id": user_id, "email": user.get("email"), "role": user.get("role")}
        
        return {"id": user_id, "email": payload.get("email"), "role": payload.get("role")}
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")


# Allowed collections for import
ALLOWED_COLLECTIONS = {
    "sourcing_brands": "sourcing_brands",
    "sourcing_contacts": "sourcing_contacts", 
    "sourcing_suppliers": "sourcing_suppliers",
    "sourcing_manufacturers": "sourcing_manufacturers",
    "sourcing_activity_logs": "sourcing_activity_logs",
}


@router.get("/export/{collection_name}")
async def export_collection_data(
    collection_name: str,
    user: dict = Depends(get_current_user)
):
    """
    Export collection data as JSON
    """
    import json
    from fastapi.responses import Response
    
    # Check admin permission
    if user.get("role") not in ["Super Admin", "Admin", "super_admin", "admin"]:
        raise HTTPException(status_code=403, detail="Only admins can export data")
    
    # Validate collection name
    if collection_name not in ALLOWED_COLLECTIONS:
        raise HTTPException(
            status_code=400, 
            detail=f"Invalid collection. Allowed: {list(ALLOWED_COLLECTIONS.keys())}"
        )
    
    collection = db[ALLOWED_COLLECTIONS[collection_name]]
    
    # Get all documents
    docs = await collection.find({}, {"_id": 0}).to_list(None)
    
    # Convert to JSON
    json_data = json.dumps(docs, indent=2, default=str)
    
    # Return as downloadable file
    return Response(
        content=json_data,
        media_type="application/json",
        headers={
            "Content-Disposition": f"attachment; filename={collection_name}_export.json"
        }
    )


@router.get("/collections")
async def get_importable_collections(user: dict = Depends(get_current_user)):
    """Get list of collections that can be imported"""
    if user.get("role") not in ["Super Admin", "Admin", "super_admin", "admin"]:
        raise HTTPException(status_code=403, detail="Only admins can import data")
    
    return {
        "collections": list(ALLOWED_COLLECTIONS.keys()),
        "descriptions": {
            "sourcing_brands": "Brand database for sourcing",
            "sourcing_contacts": "Contact information for brands/suppliers",
            "sourcing_suppliers": "Supplier database",
            "sourcing_manufacturers": "Manufacturer database",
            "sourcing_activity_logs": "Activity history logs",
        }
    }


@router.post("/upload/{collection_name}")
async def import_collection_data(
    collection_name: str,
    file: UploadFile = File(...),
    mode: str = "merge",  # "merge" or "replace"
    user: dict = Depends(get_current_user)
):
    """
    Import JSON data into a collection
    
    - collection_name: Name of the collection to import into
    - file: JSON file containing array of documents
    - mode: "merge" (add new, update existing) or "replace" (delete all, then import)
    """
    # Check admin permission
    if user.get("role") not in ["Super Admin", "Admin", "super_admin", "admin"]:
        raise HTTPException(status_code=403, detail="Only admins can import data")
    
    # Validate collection name
    if collection_name not in ALLOWED_COLLECTIONS:
        raise HTTPException(
            status_code=400, 
            detail=f"Invalid collection. Allowed: {list(ALLOWED_COLLECTIONS.keys())}"
        )
    
    # Validate file type
    if not file.filename.endswith('.json'):
        raise HTTPException(status_code=400, detail="Only JSON files are allowed")
    
    try:
        # Read and parse JSON
        content = await file.read()
        data = json.loads(content.decode('utf-8'))
        
        if not isinstance(data, list):
            raise HTTPException(status_code=400, detail="JSON must be an array of documents")
        
        if len(data) == 0:
            return {"success": True, "message": "No documents to import", "imported": 0}
        
        collection = db[ALLOWED_COLLECTIONS[collection_name]]
        
        imported_count = 0
        updated_count = 0
        skipped_count = 0
        
        if mode == "replace":
            # Delete all existing documents
            delete_result = await collection.delete_many({})
            logger.info(f"Deleted {delete_result.deleted_count} existing documents from {collection_name}")
            
            # Insert all new documents
            result = await collection.insert_many(data)
            imported_count = len(result.inserted_ids)
            
        else:  # merge mode
            for doc in data:
                # Use 'id' field as unique identifier if present
                doc_id = doc.get('id')
                
                if doc_id:
                    # Try to update existing, or insert new
                    result = await collection.update_one(
                        {"id": doc_id},
                        {"$set": doc},
                        upsert=True
                    )
                    if result.upserted_id:
                        imported_count += 1
                    elif result.modified_count > 0:
                        updated_count += 1
                    else:
                        skipped_count += 1
                else:
                    # No ID, just insert
                    await collection.insert_one(doc)
                    imported_count += 1
        
        # Log the import
        if db is not None:
            await db.admin_audit_logs.insert_one({
                "action": "data_import",
                "collection": collection_name,
                "mode": mode,
                "imported_count": imported_count,
                "updated_count": updated_count,
                "skipped_count": skipped_count,
                "user_id": user.get("id"),
                "user_email": user.get("email"),
                "filename": file.filename,
                "timestamp": datetime.now(timezone.utc).isoformat()
            })
        
        return {
            "success": True,
            "message": f"Import completed for {collection_name}",
            "imported": imported_count,
            "updated": updated_count,
            "skipped": skipped_count,
            "total_in_file": len(data),
            "mode": mode
        }
        
    except json.JSONDecodeError as e:
        raise HTTPException(status_code=400, detail=f"Invalid JSON format: {str(e)}")
    except Exception as e:
        logger.error(f"Import error: {e}")
        raise HTTPException(status_code=500, detail=f"Import failed: {str(e)}")


@router.get("/status/{collection_name}")
async def get_collection_status(
    collection_name: str,
    user: dict = Depends(get_current_user)
):
    """Get current document count in a collection"""
    if collection_name not in ALLOWED_COLLECTIONS:
        raise HTTPException(status_code=400, detail="Invalid collection name")
    
    collection = db[ALLOWED_COLLECTIONS[collection_name]]
    count = await collection.count_documents({})
    
    return {
        "collection": collection_name,
        "document_count": count
    }
