"""
OneDrive Storage Service - Microsoft Graph API integration for marketing assets

Handles:
- File uploads (simple and chunked)
- File downloads
- Folder management
- File listing with pagination
"""

import os
import asyncio
import logging
from typing import Optional, List, Dict, Any, Tuple
from datetime import datetime, timedelta
import requests
from azure.identity import ClientSecretCredential

logger = logging.getLogger(__name__)


class OneDriveService:
    """Service for managing files in OneDrive via Microsoft Graph API"""
    
    GRAPH_BASE_URL = "https://graph.microsoft.com/v1.0"
    CHUNK_SIZE = 320 * 1024 * 10  # 3.2 MB chunks (must be multiple of 320 KB)
    SIMPLE_UPLOAD_LIMIT = 4 * 1024 * 1024  # 4 MB
    
    def __init__(self):
        self.client_id = os.environ.get("AZURE_CLIENT_ID")
        self.tenant_id = os.environ.get("AZURE_TENANT_ID")
        self.client_secret = os.environ.get("AZURE_CLIENT_SECRET")
        self.root_folder = os.environ.get("ONEDRIVE_ROOT_FOLDER", "marketing_assets")
        self._access_token = None
        self._token_expires_at = None
    
    def is_configured(self) -> bool:
        """Check if OneDrive is properly configured"""
        return all([self.client_id, self.tenant_id, self.client_secret])
    
    def _get_access_token(self) -> str:
        """Get or refresh access token"""
        if self._access_token and self._token_expires_at and datetime.now() < self._token_expires_at:
            return self._access_token
        
        if not self.is_configured():
            raise ValueError("OneDrive credentials not configured")
        
        credential = ClientSecretCredential(
            tenant_id=self.tenant_id,
            client_id=self.client_id,
            client_secret=self.client_secret
        )
        
        token = credential.get_token("https://graph.microsoft.com/.default")
        self._access_token = token.token
        self._token_expires_at = datetime.now() + timedelta(minutes=50)  # Token valid for ~1 hour
        
        return self._access_token
    
    def _get_headers(self) -> Dict[str, str]:
        """Get headers with authorization"""
        return {
            "Authorization": f"Bearer {self._get_access_token()}",
            "Content-Type": "application/json"
        }
    
    def _build_path(self, *parts: str) -> str:
        """Build OneDrive path from parts"""
        cleaned = [p.strip("/") for p in parts if p]
        return "/" + "/".join(cleaned)
    
    # ============== FOLDER OPERATIONS ==============
    
    def create_folder(self, folder_name: str, parent_path: Optional[str] = None) -> Dict[str, Any]:
        """
        Create a folder in OneDrive
        
        Args:
            folder_name: Name of the folder
            parent_path: Path of parent folder (relative to root)
        
        Returns:
            Dict with folder details including id, name, webUrl
        """
        if parent_path:
            full_parent_path = self._build_path(self.root_folder, parent_path)
        else:
            full_parent_path = self._build_path(self.root_folder)
        
        # Ensure parent exists by creating root if needed
        self._ensure_root_folder()
        
        url = f"{self.GRAPH_BASE_URL}/me/drive/root:{full_parent_path}:/children"
        
        payload = {
            "name": folder_name,
            "folder": {},
            "@microsoft.graph.conflictBehavior": "rename"
        }
        
        response = requests.post(url, json=payload, headers=self._get_headers())
        
        if response.status_code in [200, 201]:
            data = response.json()
            return {
                "id": data.get("id"),
                "name": data.get("name"),
                "path": f"{full_parent_path}/{folder_name}",
                "web_url": data.get("webUrl"),
                "created_at": data.get("createdDateTime")
            }
        else:
            logger.error(f"Failed to create folder: {response.status_code} - {response.text}")
            raise Exception(f"Failed to create folder: {response.text}")
    
    def _ensure_root_folder(self):
        """Ensure the root marketing_assets folder exists"""
        url = f"{self.GRAPH_BASE_URL}/me/drive/root:/marketing_assets"
        response = requests.get(url, headers=self._get_headers())
        
        if response.status_code == 404:
            # Create root folder
            create_url = f"{self.GRAPH_BASE_URL}/me/drive/root/children"
            payload = {
                "name": "marketing_assets",
                "folder": {},
                "@microsoft.graph.conflictBehavior": "rename"
            }
            requests.post(create_url, json=payload, headers=self._get_headers())
    
    def create_campaign_structure(self, campaign_name: str) -> Dict[str, Any]:
        """
        Create complete folder structure for a campaign
        
        Args:
            campaign_name: Name of the campaign
        
        Returns:
            Dict with created folder details
        """
        asset_types = ["Images", "Videos", "Documents", "Graphics", "Archive"]
        created_folders = []
        
        # Create campaign folder
        campaign_folder = self.create_folder(campaign_name)
        created_folders.append(campaign_folder)
        
        # Create subfolders
        for asset_type in asset_types:
            try:
                subfolder = self.create_folder(asset_type, campaign_name)
                created_folders.append(subfolder)
            except Exception as e:
                logger.warning(f"Failed to create subfolder {asset_type}: {e}")
        
        return {
            "campaign_name": campaign_name,
            "folders_created": len(created_folders),
            "folders": created_folders
        }
    
    def list_folders(self, path: Optional[str] = None) -> List[Dict[str, Any]]:
        """List folders in a path"""
        if path:
            full_path = self._build_path(self.root_folder, path)
        else:
            full_path = self._build_path(self.root_folder)
        
        url = f"{self.GRAPH_BASE_URL}/me/drive/root:{full_path}:/children"
        params = {"$filter": "folder ne null", "$select": "id,name,folder,webUrl,createdDateTime"}
        
        response = requests.get(url, headers=self._get_headers(), params=params)
        
        if response.status_code == 200:
            data = response.json()
            return [
                {
                    "id": item.get("id"),
                    "name": item.get("name"),
                    "web_url": item.get("webUrl"),
                    "created_at": item.get("createdDateTime"),
                    "child_count": item.get("folder", {}).get("childCount", 0)
                }
                for item in data.get("value", [])
            ]
        elif response.status_code == 404:
            return []
        else:
            raise Exception(f"Failed to list folders: {response.text}")
    
    # ============== FILE UPLOAD OPERATIONS ==============
    
    def upload_simple(self, file_content: bytes, filename: str, folder_path: Optional[str] = None) -> Dict[str, Any]:
        """
        Upload a file using simple upload (files < 4MB)
        
        Args:
            file_content: File bytes
            filename: Name of the file
            folder_path: Path relative to root folder
        
        Returns:
            Dict with file details
        """
        file_size = len(file_content)
        if file_size > self.SIMPLE_UPLOAD_LIMIT:
            raise ValueError(f"File size {file_size} exceeds simple upload limit. Use chunked upload.")
        
        if folder_path:
            full_path = self._build_path(self.root_folder, folder_path, filename)
        else:
            full_path = self._build_path(self.root_folder, filename)
        
        url = f"{self.GRAPH_BASE_URL}/me/drive/root:{full_path}:/content"
        
        headers = self._get_headers()
        headers["Content-Type"] = "application/octet-stream"
        
        response = requests.put(url, data=file_content, headers=headers)
        
        if response.status_code in [200, 201]:
            data = response.json()
            return {
                "id": data.get("id"),
                "name": data.get("name"),
                "size": data.get("size"),
                "path": full_path,
                "web_url": data.get("webUrl"),
                "download_url": data.get("@microsoft.graph.downloadUrl"),
                "created_at": data.get("createdDateTime")
            }
        else:
            raise Exception(f"Upload failed: {response.text}")
    
    def create_upload_session(self, filename: str, folder_path: Optional[str] = None) -> Dict[str, Any]:
        """
        Create an upload session for large files
        
        Args:
            filename: Name of the file
            folder_path: Path relative to root folder
        
        Returns:
            Dict with upload session URL and expiration
        """
        if folder_path:
            full_path = self._build_path(self.root_folder, folder_path, filename)
        else:
            full_path = self._build_path(self.root_folder, filename)
        
        url = f"{self.GRAPH_BASE_URL}/me/drive/root:{full_path}:/createUploadSession"
        
        payload = {
            "item": {
                "@microsoft.graph.conflictBehavior": "rename",
                "name": filename
            }
        }
        
        response = requests.post(url, json=payload, headers=self._get_headers())
        
        if response.status_code in [200, 201]:
            data = response.json()
            return {
                "upload_url": data.get("uploadUrl"),
                "expiration": data.get("expirationDateTime")
            }
        else:
            raise Exception(f"Failed to create upload session: {response.text}")
    
    def upload_chunk(self, upload_url: str, chunk: bytes, start_byte: int, total_size: int) -> Dict[str, Any]:
        """
        Upload a chunk of data to an upload session
        
        Args:
            upload_url: The upload session URL
            chunk: Bytes to upload
            start_byte: Starting byte position
            total_size: Total file size
        
        Returns:
            Dict with upload status
        """
        end_byte = start_byte + len(chunk) - 1
        
        headers = {
            "Content-Length": str(len(chunk)),
            "Content-Range": f"bytes {start_byte}-{end_byte}/{total_size}"
        }
        
        response = requests.put(upload_url, data=chunk, headers=headers)
        
        if response.status_code in [200, 201]:
            # Upload complete
            data = response.json()
            return {
                "status": "complete",
                "id": data.get("id"),
                "name": data.get("name"),
                "size": data.get("size"),
                "web_url": data.get("webUrl"),
                "download_url": data.get("@microsoft.graph.downloadUrl")
            }
        elif response.status_code == 202:
            # More chunks needed
            data = response.json()
            return {
                "status": "in_progress",
                "next_expected_ranges": data.get("nextExpectedRanges", [])
            }
        else:
            raise Exception(f"Chunk upload failed: {response.text}")
    
    def upload_chunked(self, file_content: bytes, filename: str, folder_path: Optional[str] = None,
                       progress_callback=None) -> Dict[str, Any]:
        """
        Upload a large file using chunked upload
        
        Args:
            file_content: File bytes
            filename: Name of the file
            folder_path: Path relative to root folder
            progress_callback: Optional callback(uploaded_bytes, total_bytes)
        
        Returns:
            Dict with file details
        """
        total_size = len(file_content)
        
        # Create upload session
        session = self.create_upload_session(filename, folder_path)
        upload_url = session["upload_url"]
        
        # Upload chunks
        uploaded_bytes = 0
        while uploaded_bytes < total_size:
            chunk_end = min(uploaded_bytes + self.CHUNK_SIZE, total_size)
            chunk = file_content[uploaded_bytes:chunk_end]
            
            result = self.upload_chunk(upload_url, chunk, uploaded_bytes, total_size)
            uploaded_bytes = chunk_end
            
            if progress_callback:
                progress_callback(uploaded_bytes, total_size)
            
            if result["status"] == "complete":
                return result
        
        raise Exception("Chunked upload did not complete successfully")
    
    # ============== FILE DOWNLOAD OPERATIONS ==============
    
    def get_file_info(self, file_id: str) -> Dict[str, Any]:
        """Get file metadata by ID"""
        url = f"{self.GRAPH_BASE_URL}/me/drive/items/{file_id}"
        params = {"$select": "id,name,size,webUrl,createdDateTime,lastModifiedDateTime,@microsoft.graph.downloadUrl"}
        
        response = requests.get(url, headers=self._get_headers(), params=params)
        
        if response.status_code == 200:
            data = response.json()
            return {
                "id": data.get("id"),
                "name": data.get("name"),
                "size": data.get("size"),
                "web_url": data.get("webUrl"),
                "download_url": data.get("@microsoft.graph.downloadUrl"),
                "created_at": data.get("createdDateTime"),
                "modified_at": data.get("lastModifiedDateTime")
            }
        elif response.status_code == 404:
            return None
        else:
            raise Exception(f"Failed to get file info: {response.text}")
    
    def get_download_url(self, file_id: str) -> str:
        """Get a pre-authenticated download URL for a file"""
        file_info = self.get_file_info(file_id)
        if file_info:
            return file_info.get("download_url")
        return None
    
    def download_file(self, file_id: str) -> Tuple[bytes, str]:
        """
        Download file content by ID
        
        Returns:
            Tuple of (file_content, filename)
        """
        file_info = self.get_file_info(file_id)
        if not file_info:
            raise Exception("File not found")
        
        download_url = file_info.get("download_url")
        if not download_url:
            # Fallback to content endpoint
            url = f"{self.GRAPH_BASE_URL}/me/drive/items/{file_id}/content"
            response = requests.get(url, headers=self._get_headers())
        else:
            response = requests.get(download_url)
        
        if response.status_code == 200:
            return response.content, file_info.get("name", "download")
        else:
            raise Exception(f"Download failed: {response.text}")
    
    # ============== FILE LISTING OPERATIONS ==============
    
    def list_files(self, folder_path: Optional[str] = None, skip_token: Optional[str] = None,
                   top: int = 50) -> Dict[str, Any]:
        """
        List files in a folder with pagination
        
        Args:
            folder_path: Path relative to root folder
            skip_token: Pagination token
            top: Number of items per page
        
        Returns:
            Dict with items and pagination info
        """
        if folder_path:
            full_path = self._build_path(self.root_folder, folder_path)
        else:
            full_path = self._build_path(self.root_folder)
        
        url = f"{self.GRAPH_BASE_URL}/me/drive/root:{full_path}:/children"
        
        params = {
            "$top": str(top),
            "$select": "id,name,size,file,folder,webUrl,createdDateTime,lastModifiedDateTime,@microsoft.graph.downloadUrl"
        }
        
        if skip_token:
            params["$skiptoken"] = skip_token
        
        response = requests.get(url, headers=self._get_headers(), params=params)
        
        if response.status_code == 200:
            data = response.json()
            
            items = []
            for item in data.get("value", []):
                items.append({
                    "id": item.get("id"),
                    "name": item.get("name"),
                    "size": item.get("size", 0),
                    "is_folder": "folder" in item,
                    "mime_type": item.get("file", {}).get("mimeType") if "file" in item else None,
                    "web_url": item.get("webUrl"),
                    "download_url": item.get("@microsoft.graph.downloadUrl"),
                    "created_at": item.get("createdDateTime"),
                    "modified_at": item.get("lastModifiedDateTime")
                })
            
            # Extract next page token
            next_link = data.get("@odata.nextLink")
            next_token = None
            if next_link and "$skiptoken=" in next_link:
                next_token = next_link.split("$skiptoken=")[1].split("&")[0]
            
            return {
                "items": items,
                "total_count": len(items),
                "next_page_token": next_token,
                "has_more": bool(next_token)
            }
        elif response.status_code == 404:
            return {"items": [], "total_count": 0, "has_more": False}
        else:
            raise Exception(f"Failed to list files: {response.text}")
    
    def search_files(self, query: str, folder_path: Optional[str] = None) -> List[Dict[str, Any]]:
        """
        Search for files by name
        
        Args:
            query: Search query
            folder_path: Optional folder to limit search
        
        Returns:
            List of matching files
        """
        if folder_path:
            full_path = self._build_path(self.root_folder, folder_path)
            url = f"{self.GRAPH_BASE_URL}/me/drive/root:{full_path}:/search(q='{query}')"
        else:
            url = f"{self.GRAPH_BASE_URL}/me/drive/root:/{self.root_folder}:/search(q='{query}')"
        
        response = requests.get(url, headers=self._get_headers())
        
        if response.status_code == 200:
            data = response.json()
            return [
                {
                    "id": item.get("id"),
                    "name": item.get("name"),
                    "size": item.get("size", 0),
                    "is_folder": "folder" in item,
                    "web_url": item.get("webUrl"),
                    "created_at": item.get("createdDateTime")
                }
                for item in data.get("value", [])
            ]
        else:
            raise Exception(f"Search failed: {response.text}")
    
    # ============== FILE DELETE OPERATIONS ==============
    
    def delete_file(self, file_id: str) -> bool:
        """Delete a file (moves to recycle bin)"""
        url = f"{self.GRAPH_BASE_URL}/me/drive/items/{file_id}"
        
        response = requests.delete(url, headers=self._get_headers())
        
        return response.status_code == 204
    
    def delete_folder(self, folder_id: str) -> bool:
        """Delete a folder and its contents (moves to recycle bin)"""
        return self.delete_file(folder_id)


# Singleton instance
_onedrive_service = None


def get_onedrive_service() -> OneDriveService:
    """Get OneDrive service singleton"""
    global _onedrive_service
    if _onedrive_service is None:
        _onedrive_service = OneDriveService()
    return _onedrive_service
