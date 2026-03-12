"""
Meta Graph API Integration Service
Real Instagram publishing via Meta Graph API.
"""

import os
import asyncio
import aiohttp
import logging
from typing import Optional, List, Dict, Any
from datetime import datetime, timezone
import uuid

logger = logging.getLogger(__name__)

# Meta Graph API Configuration
GRAPH_API_VERSION = "v21.0"
GRAPH_API_URL = "https://graph.facebook.com"

# Credentials from environment
INSTAGRAM_ACCESS_TOKEN = os.environ.get("INSTAGRAM_ACCESS_TOKEN")
INSTAGRAM_BUSINESS_ACCOUNT_ID = os.environ.get("INSTAGRAM_BUSINESS_ACCOUNT_ID")


class MetaAPIError(Exception):
    """Custom exception for Meta API errors"""
    def __init__(self, message: str, error_code: int = None, error_subcode: int = None):
        self.message = message
        self.error_code = error_code
        self.error_subcode = error_subcode
        super().__init__(self.message)


class MetaInstagramService:
    """
    Service for Instagram publishing via Meta Graph API.
    Supports: Images, Carousels, Reels, Stories
    """
    
    def __init__(self):
        self.access_token = INSTAGRAM_ACCESS_TOKEN
        self.account_id = INSTAGRAM_BUSINESS_ACCOUNT_ID
        self.api_url = GRAPH_API_URL
        self.api_version = GRAPH_API_VERSION
        self.session: Optional[aiohttp.ClientSession] = None
    
    async def __aenter__(self):
        self.session = aiohttp.ClientSession()
        return self
    
    async def __aexit__(self, exc_type, exc_val, exc_tb):
        if self.session:
            await self.session.close()
    
    def is_configured(self) -> bool:
        """Check if Instagram credentials are configured"""
        return bool(self.access_token and self.account_id)
    
    async def _make_request(self, method: str, endpoint: str, **kwargs) -> Dict[str, Any]:
        """Make a request to the Meta Graph API"""
        url = f"{self.api_url}/{self.api_version}/{endpoint}"
        
        # Add access token to params
        if "params" not in kwargs:
            kwargs["params"] = {}
        kwargs["params"]["access_token"] = self.access_token
        
        try:
            async with getattr(self.session, method)(url, **kwargs) as response:
                data = await response.json()
                
                if "error" in data:
                    error = data["error"]
                    raise MetaAPIError(
                        message=error.get("message", "Unknown error"),
                        error_code=error.get("code"),
                        error_subcode=error.get("error_subcode")
                    )
                
                return data
        except aiohttp.ClientError as e:
            logger.error(f"HTTP error: {str(e)}")
            raise MetaAPIError(f"Network error: {str(e)}")
    
    async def get_account_info(self) -> Dict[str, Any]:
        """Get Instagram Business Account information"""
        if not self.is_configured():
            return {"error": "Instagram not configured"}
        
        try:
            data = await self._make_request(
                "get",
                self.account_id,
                params={
                    "fields": "id,username,name,profile_picture_url,followers_count,follows_count,media_count,biography,website"
                }
            )
            return {
                "success": True,
                "account": data
            }
        except MetaAPIError as e:
            logger.error(f"Failed to get account info: {e.message}")
            return {"success": False, "error": e.message}
    
    async def _create_media_container(
        self,
        media_type: str,
        image_url: Optional[str] = None,
        video_url: Optional[str] = None,
        caption: Optional[str] = None,
        children: Optional[List[str]] = None,
        is_carousel_item: bool = False
    ) -> str:
        """
        Create a media container for Instagram publishing.
        Returns the container ID.
        """
        endpoint = f"{self.account_id}/media"
        
        data = {}
        
        if media_type == "IMAGE":
            if not image_url:
                raise ValueError("image_url required for IMAGE type")
            data["image_url"] = image_url
            if not is_carousel_item and caption:
                data["caption"] = caption
        
        elif media_type == "VIDEO" or media_type == "REELS":
            if not video_url:
                raise ValueError("video_url required for VIDEO/REELS type")
            data["video_url"] = video_url
            data["media_type"] = "REELS"
            if caption:
                data["caption"] = caption
        
        elif media_type == "CAROUSEL":
            if not children or len(children) < 2:
                raise ValueError("CAROUSEL requires at least 2 children")
            data["media_type"] = "CAROUSEL"
            data["children"] = ",".join(children)
            if caption:
                data["caption"] = caption
        
        elif media_type == "STORIES":
            if image_url:
                data["image_url"] = image_url
            elif video_url:
                data["video_url"] = video_url
            else:
                raise ValueError("STORIES requires image_url or video_url")
            data["media_type"] = "STORIES"
        
        # Make request with form data
        result = await self._make_request("post", endpoint, data=data)
        return result.get("id")
    
    async def _check_container_status(self, container_id: str) -> Dict[str, Any]:
        """Check the status of a media container"""
        data = await self._make_request(
            "get",
            container_id,
            params={"fields": "status,status_code"}
        )
        return data
    
    async def _wait_for_container(self, container_id: str, max_wait: int = 300) -> bool:
        """Wait for container to be ready (FINISHED status)"""
        start_time = asyncio.get_event_loop().time()
        
        while asyncio.get_event_loop().time() - start_time < max_wait:
            status_data = await self._check_container_status(container_id)
            status = status_data.get("status_code") or status_data.get("status")
            
            if status == "FINISHED":
                return True
            elif status == "ERROR" or status == "EXPIRED":
                logger.error(f"Container {container_id} failed with status: {status}")
                return False
            
            # Wait before checking again
            await asyncio.sleep(5)
        
        logger.warning(f"Container {container_id} timed out")
        return False
    
    async def _publish_container(self, container_id: str) -> Dict[str, Any]:
        """Publish a media container"""
        endpoint = f"{self.account_id}/media_publish"
        
        result = await self._make_request(
            "post",
            endpoint,
            data={"creation_id": container_id}
        )
        return result
    
    async def publish_image(
        self,
        image_url: str,
        caption: str = ""
    ) -> Dict[str, Any]:
        """
        Publish a single image to Instagram.
        
        Args:
            image_url: Public URL to the image (must be accessible)
            caption: Post caption (max 2200 chars)
        
        Returns:
            Dict with post_id and status
        """
        if not self.is_configured():
            return {"success": False, "error": "Instagram not configured"}
        
        try:
            # Step 1: Create media container
            container_id = await self._create_media_container(
                media_type="IMAGE",
                image_url=image_url,
                caption=caption
            )
            logger.info(f"Created container: {container_id}")
            
            # Step 2: Wait for container to be ready
            if not await self._wait_for_container(container_id):
                return {"success": False, "error": "Media processing failed"}
            
            # Step 3: Publish
            result = await self._publish_container(container_id)
            
            return {
                "success": True,
                "platform": "instagram",
                "post_id": result.get("id"),
                "container_id": container_id,
                "message": "Image published successfully to Instagram"
            }
        
        except MetaAPIError as e:
            logger.error(f"Instagram publish error: {e.message}")
            return {
                "success": False,
                "error": e.message,
                "error_code": e.error_code
            }
        except Exception as e:
            logger.error(f"Unexpected error: {str(e)}")
            return {"success": False, "error": str(e)}
    
    async def publish_carousel(
        self,
        image_urls: List[str],
        caption: str = ""
    ) -> Dict[str, Any]:
        """
        Publish a carousel (multiple images) to Instagram.
        
        Args:
            image_urls: List of public image URLs (2-10 images)
            caption: Post caption
        
        Returns:
            Dict with post_id and status
        """
        if not self.is_configured():
            return {"success": False, "error": "Instagram not configured"}
        
        if len(image_urls) < 2:
            return {"success": False, "error": "Carousel requires at least 2 images"}
        if len(image_urls) > 10:
            return {"success": False, "error": "Carousel supports maximum 10 images"}
        
        try:
            # Step 1: Create containers for each image
            children_ids = []
            for img_url in image_urls:
                child_id = await self._create_media_container(
                    media_type="IMAGE",
                    image_url=img_url,
                    is_carousel_item=True
                )
                children_ids.append(child_id)
                logger.info(f"Created child container: {child_id}")
            
            # Step 2: Create carousel container
            carousel_id = await self._create_media_container(
                media_type="CAROUSEL",
                children=children_ids,
                caption=caption
            )
            logger.info(f"Created carousel container: {carousel_id}")
            
            # Step 3: Wait and publish
            if not await self._wait_for_container(carousel_id):
                return {"success": False, "error": "Carousel processing failed"}
            
            result = await self._publish_container(carousel_id)
            
            return {
                "success": True,
                "platform": "instagram",
                "post_id": result.get("id"),
                "container_id": carousel_id,
                "images_count": len(image_urls),
                "message": f"Carousel with {len(image_urls)} images published to Instagram"
            }
        
        except MetaAPIError as e:
            logger.error(f"Instagram carousel error: {e.message}")
            return {"success": False, "error": e.message}
        except Exception as e:
            logger.error(f"Unexpected error: {str(e)}")
            return {"success": False, "error": str(e)}
    
    async def publish_reel(
        self,
        video_url: str,
        caption: str = ""
    ) -> Dict[str, Any]:
        """
        Publish a Reel to Instagram.
        
        Args:
            video_url: Public URL to the video
            caption: Reel caption
        
        Returns:
            Dict with post_id and status
        """
        if not self.is_configured():
            return {"success": False, "error": "Instagram not configured"}
        
        try:
            # Step 1: Create video container
            container_id = await self._create_media_container(
                media_type="REELS",
                video_url=video_url,
                caption=caption
            )
            logger.info(f"Created Reel container: {container_id}")
            
            # Step 2: Wait for video processing (can take longer)
            if not await self._wait_for_container(container_id, max_wait=600):
                return {"success": False, "error": "Video processing failed or timed out"}
            
            # Step 3: Publish
            result = await self._publish_container(container_id)
            
            return {
                "success": True,
                "platform": "instagram",
                "post_id": result.get("id"),
                "container_id": container_id,
                "message": "Reel published successfully to Instagram"
            }
        
        except MetaAPIError as e:
            logger.error(f"Instagram Reel error: {e.message}")
            return {"success": False, "error": e.message}
        except Exception as e:
            logger.error(f"Unexpected error: {str(e)}")
            return {"success": False, "error": str(e)}
    
    async def get_media_insights(self, media_id: str) -> Dict[str, Any]:
        """Get insights for a specific media post"""
        if not self.is_configured():
            return {"success": False, "error": "Instagram not configured"}
        
        try:
            data = await self._make_request(
                "get",
                f"{media_id}/insights",
                params={
                    "metric": "impressions,reach,engagement,saved,likes,comments,shares"
                }
            )
            
            # Transform to dict
            insights = {}
            for item in data.get("data", []):
                insights[item["name"]] = item["values"][0]["value"] if item.get("values") else 0
            
            return {
                "success": True,
                "media_id": media_id,
                "insights": insights
            }
        
        except MetaAPIError as e:
            return {"success": False, "error": e.message}
    
    async def get_account_insights(self, period: str = "day") -> Dict[str, Any]:
        """Get account-level insights"""
        if not self.is_configured():
            return {"success": False, "error": "Instagram not configured"}
        
        try:
            data = await self._make_request(
                "get",
                f"{self.account_id}/insights",
                params={
                    "metric": "impressions,reach,profile_views,follower_count",
                    "period": period
                }
            )
            
            insights = {}
            for item in data.get("data", []):
                insights[item["name"]] = item["values"][0]["value"] if item.get("values") else 0
            
            return {
                "success": True,
                "period": period,
                "insights": insights
            }
        
        except MetaAPIError as e:
            return {"success": False, "error": e.message}
    
    async def get_recent_media(self, limit: int = 25) -> Dict[str, Any]:
        """Get recent media posts"""
        if not self.is_configured():
            return {"success": False, "error": "Instagram not configured"}
        
        try:
            data = await self._make_request(
                "get",
                f"{self.account_id}/media",
                params={
                    "fields": "id,caption,media_type,media_url,thumbnail_url,permalink,timestamp,like_count,comments_count",
                    "limit": limit
                }
            )
            
            return {
                "success": True,
                "media": data.get("data", []),
                "paging": data.get("paging", {})
            }
        
        except MetaAPIError as e:
            return {"success": False, "error": e.message}
    
    async def get_media_comments(self, media_id: str, limit: int = 50) -> Dict[str, Any]:
        """Get comments on a media post"""
        if not self.is_configured():
            return {"success": False, "error": "Instagram not configured"}
        
        try:
            data = await self._make_request(
                "get",
                f"{media_id}/comments",
                params={
                    "fields": "id,text,timestamp,from,like_count,hidden",
                    "limit": limit
                }
            )
            
            return {
                "success": True,
                "media_id": media_id,
                "comments": data.get("data", []),
                "paging": data.get("paging", {})
            }
        
        except MetaAPIError as e:
            return {"success": False, "error": e.message}
    
    async def reply_to_comment(self, comment_id: str, message: str) -> Dict[str, Any]:
        """Reply to a comment"""
        if not self.is_configured():
            return {"success": False, "error": "Instagram not configured"}
        
        try:
            data = await self._make_request(
                "post",
                f"{comment_id}/replies",
                data={"message": message}
            )
            
            return {
                "success": True,
                "reply_id": data.get("id"),
                "message": "Reply posted successfully"
            }
        
        except MetaAPIError as e:
            return {"success": False, "error": e.message}


# Singleton instance
_instagram_service: Optional[MetaInstagramService] = None

def get_instagram_service() -> MetaInstagramService:
    """Get or create Instagram service instance"""
    global _instagram_service
    if _instagram_service is None:
        _instagram_service = MetaInstagramService()
    return _instagram_service


async def test_instagram_connection() -> Dict[str, Any]:
    """Test Instagram API connection"""
    async with MetaInstagramService() as service:
        return await service.get_account_info()
