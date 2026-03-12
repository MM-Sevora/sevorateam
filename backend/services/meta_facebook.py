"""
Meta Graph API - Facebook Page Publishing Service
Real Facebook Page publishing via Meta Graph API.
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
FACEBOOK_PAGE_ID = os.environ.get("FACEBOOK_PAGE_ID")
FACEBOOK_PAGE_ACCESS_TOKEN = os.environ.get("FACEBOOK_PAGE_ACCESS_TOKEN")


class FacebookAPIError(Exception):
    """Custom exception for Facebook API errors"""
    def __init__(self, message: str, error_code: int = None, error_subcode: int = None):
        self.message = message
        self.error_code = error_code
        self.error_subcode = error_subcode
        super().__init__(self.message)


class FacebookPageService:
    """
    Service for Facebook Page publishing via Meta Graph API.
    Supports: Text posts, Photos, Videos, Links, Carousels
    """
    
    def __init__(self):
        self.page_id = FACEBOOK_PAGE_ID
        self.access_token = FACEBOOK_PAGE_ACCESS_TOKEN
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
        """Check if Facebook Page credentials are configured"""
        return bool(self.page_id and self.access_token)
    
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
                    raise FacebookAPIError(
                        message=error.get("message", "Unknown error"),
                        error_code=error.get("code"),
                        error_subcode=error.get("error_subcode")
                    )
                
                return data
        except aiohttp.ClientError as e:
            logger.error(f"HTTP error: {str(e)}")
            raise FacebookAPIError(f"Network error: {str(e)}")
    
    async def get_page_info(self) -> Dict[str, Any]:
        """Get Facebook Page information"""
        if not self.is_configured():
            return {"error": "Facebook Page not configured"}
        
        try:
            data = await self._make_request(
                "get",
                self.page_id,
                params={
                    "fields": "id,name,username,about,category,fan_count,followers_count,link,picture,cover,website"
                }
            )
            return {
                "success": True,
                "page": data
            }
        except FacebookAPIError as e:
            logger.error(f"Failed to get page info: {e.message}")
            return {"success": False, "error": e.message}
    
    async def publish_text_post(self, message: str) -> Dict[str, Any]:
        """
        Publish a text-only post to Facebook Page.
        
        Args:
            message: The post text content
        
        Returns:
            Dict with post_id and status
        """
        if not self.is_configured():
            return {"success": False, "error": "Facebook Page not configured"}
        
        try:
            result = await self._make_request(
                "post",
                f"{self.page_id}/feed",
                data={"message": message}
            )
            
            return {
                "success": True,
                "platform": "facebook",
                "post_id": result.get("id"),
                "message": "Text post published successfully to Facebook Page"
            }
        
        except FacebookAPIError as e:
            logger.error(f"Facebook publish error: {e.message}")
            return {"success": False, "error": e.message, "error_code": e.error_code}
    
    async def publish_link_post(self, message: str, link: str) -> Dict[str, Any]:
        """
        Publish a post with a link to Facebook Page.
        
        Args:
            message: The post text content
            link: URL to share
        
        Returns:
            Dict with post_id and status
        """
        if not self.is_configured():
            return {"success": False, "error": "Facebook Page not configured"}
        
        try:
            result = await self._make_request(
                "post",
                f"{self.page_id}/feed",
                data={
                    "message": message,
                    "link": link
                }
            )
            
            return {
                "success": True,
                "platform": "facebook",
                "post_id": result.get("id"),
                "message": "Link post published successfully to Facebook Page"
            }
        
        except FacebookAPIError as e:
            logger.error(f"Facebook publish error: {e.message}")
            return {"success": False, "error": e.message}
    
    async def publish_photo(self, photo_url: str, caption: str = "") -> Dict[str, Any]:
        """
        Publish a photo to Facebook Page.
        
        Args:
            photo_url: Public URL to the image
            caption: Photo caption
        
        Returns:
            Dict with post_id and status
        """
        if not self.is_configured():
            return {"success": False, "error": "Facebook Page not configured"}
        
        try:
            result = await self._make_request(
                "post",
                f"{self.page_id}/photos",
                data={
                    "url": photo_url,
                    "caption": caption,
                    "published": True
                }
            )
            
            return {
                "success": True,
                "platform": "facebook",
                "post_id": result.get("post_id") or result.get("id"),
                "photo_id": result.get("id"),
                "message": "Photo published successfully to Facebook Page"
            }
        
        except FacebookAPIError as e:
            logger.error(f"Facebook photo publish error: {e.message}")
            return {"success": False, "error": e.message}
    
    async def publish_video(
        self, 
        video_url: str, 
        title: str = "",
        description: str = ""
    ) -> Dict[str, Any]:
        """
        Publish a video to Facebook Page.
        
        Args:
            video_url: Public URL to the video
            title: Video title
            description: Video description
        
        Returns:
            Dict with video_id and status
        """
        if not self.is_configured():
            return {"success": False, "error": "Facebook Page not configured"}
        
        try:
            data = {
                "file_url": video_url,
                "published": True
            }
            if title:
                data["title"] = title
            if description:
                data["description"] = description
            
            result = await self._make_request(
                "post",
                f"{self.page_id}/videos",
                data=data
            )
            
            return {
                "success": True,
                "platform": "facebook",
                "video_id": result.get("id"),
                "message": "Video published successfully to Facebook Page"
            }
        
        except FacebookAPIError as e:
            logger.error(f"Facebook video publish error: {e.message}")
            return {"success": False, "error": e.message}
    
    async def publish_multi_photo(
        self, 
        photo_urls: List[str], 
        message: str = ""
    ) -> Dict[str, Any]:
        """
        Publish multiple photos as a single post (album-style).
        
        Args:
            photo_urls: List of public image URLs (2-10 images)
            message: Post message
        
        Returns:
            Dict with post_id and status
        """
        if not self.is_configured():
            return {"success": False, "error": "Facebook Page not configured"}
        
        if len(photo_urls) < 2:
            return {"success": False, "error": "Multi-photo requires at least 2 images"}
        if len(photo_urls) > 10:
            return {"success": False, "error": "Maximum 10 photos allowed"}
        
        try:
            # Step 1: Upload each photo as unpublished
            photo_ids = []
            for url in photo_urls:
                result = await self._make_request(
                    "post",
                    f"{self.page_id}/photos",
                    data={
                        "url": url,
                        "published": False
                    }
                )
                photo_ids.append(result.get("id"))
            
            # Step 2: Create post with attached photos
            attached_media = [{"media_fbid": pid} for pid in photo_ids]
            
            result = await self._make_request(
                "post",
                f"{self.page_id}/feed",
                data={
                    "message": message,
                    "attached_media": str(attached_media).replace("'", '"')
                }
            )
            
            return {
                "success": True,
                "platform": "facebook",
                "post_id": result.get("id"),
                "photo_count": len(photo_ids),
                "message": f"Multi-photo post with {len(photo_ids)} images published to Facebook Page"
            }
        
        except FacebookAPIError as e:
            logger.error(f"Facebook multi-photo error: {e.message}")
            return {"success": False, "error": e.message}
    
    async def schedule_post(
        self, 
        message: str, 
        scheduled_time: int,
        photo_url: Optional[str] = None,
        link: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Schedule a post for future publishing.
        
        Args:
            message: Post content
            scheduled_time: Unix timestamp (must be 10 mins to 6 months in future)
            photo_url: Optional photo URL
            link: Optional link URL
        
        Returns:
            Dict with scheduled post_id
        """
        if not self.is_configured():
            return {"success": False, "error": "Facebook Page not configured"}
        
        try:
            data = {
                "message": message,
                "published": False,
                "scheduled_publish_time": scheduled_time
            }
            
            if link:
                data["link"] = link
            
            endpoint = f"{self.page_id}/feed"
            
            # If photo, use photos endpoint
            if photo_url:
                endpoint = f"{self.page_id}/photos"
                data["url"] = photo_url
                data["caption"] = message
                del data["message"]
            
            result = await self._make_request("post", endpoint, data=data)
            
            return {
                "success": True,
                "platform": "facebook",
                "post_id": result.get("id"),
                "scheduled_time": scheduled_time,
                "message": "Post scheduled successfully"
            }
        
        except FacebookAPIError as e:
            logger.error(f"Facebook schedule error: {e.message}")
            return {"success": False, "error": e.message}
    
    async def get_page_posts(self, limit: int = 25) -> Dict[str, Any]:
        """Get recent posts from the Facebook Page"""
        if not self.is_configured():
            return {"success": False, "error": "Facebook Page not configured"}
        
        try:
            data = await self._make_request(
                "get",
                f"{self.page_id}/posts",
                params={
                    "fields": "id,message,created_time,full_picture,permalink_url,shares,reactions.summary(true),comments.summary(true)",
                    "limit": limit
                }
            )
            
            return {
                "success": True,
                "posts": data.get("data", []),
                "paging": data.get("paging", {})
            }
        
        except FacebookAPIError as e:
            return {"success": False, "error": e.message}
    
    async def get_post_insights(self, post_id: str) -> Dict[str, Any]:
        """Get insights for a specific post"""
        if not self.is_configured():
            return {"success": False, "error": "Facebook Page not configured"}
        
        try:
            data = await self._make_request(
                "get",
                f"{post_id}/insights",
                params={
                    "metric": "post_impressions,post_impressions_unique,post_engaged_users,post_clicks,post_reactions_by_type_total"
                }
            )
            
            insights = {}
            for item in data.get("data", []):
                insights[item["name"]] = item["values"][0]["value"] if item.get("values") else 0
            
            return {
                "success": True,
                "post_id": post_id,
                "insights": insights
            }
        
        except FacebookAPIError as e:
            return {"success": False, "error": e.message}
    
    async def get_page_insights(self, period: str = "day") -> Dict[str, Any]:
        """Get page-level insights"""
        if not self.is_configured():
            return {"success": False, "error": "Facebook Page not configured"}
        
        try:
            data = await self._make_request(
                "get",
                f"{self.page_id}/insights",
                params={
                    "metric": "page_impressions,page_engaged_users,page_fans,page_views_total",
                    "period": period
                }
            )
            
            insights = {}
            for item in data.get("data", []):
                values = item.get("values", [])
                insights[item["name"]] = values[-1]["value"] if values else 0
            
            return {
                "success": True,
                "period": period,
                "insights": insights
            }
        
        except FacebookAPIError as e:
            return {"success": False, "error": e.message}
    
    async def get_post_comments(self, post_id: str, limit: int = 50) -> Dict[str, Any]:
        """Get comments on a post"""
        if not self.is_configured():
            return {"success": False, "error": "Facebook Page not configured"}
        
        try:
            data = await self._make_request(
                "get",
                f"{post_id}/comments",
                params={
                    "fields": "id,message,from,created_time,like_count,comment_count",
                    "limit": limit
                }
            )
            
            return {
                "success": True,
                "post_id": post_id,
                "comments": data.get("data", []),
                "paging": data.get("paging", {})
            }
        
        except FacebookAPIError as e:
            return {"success": False, "error": e.message}
    
    async def reply_to_comment(self, comment_id: str, message: str) -> Dict[str, Any]:
        """Reply to a comment"""
        if not self.is_configured():
            return {"success": False, "error": "Facebook Page not configured"}
        
        try:
            data = await self._make_request(
                "post",
                f"{comment_id}/comments",
                data={"message": message}
            )
            
            return {
                "success": True,
                "reply_id": data.get("id"),
                "message": "Reply posted successfully"
            }
        
        except FacebookAPIError as e:
            return {"success": False, "error": e.message}
    
    async def delete_post(self, post_id: str) -> Dict[str, Any]:
        """Delete a post (if permissions allow)"""
        if not self.is_configured():
            return {"success": False, "error": "Facebook Page not configured"}
        
        try:
            data = await self._make_request("delete", post_id)
            
            return {
                "success": data.get("success", True),
                "message": "Post deleted successfully"
            }
        
        except FacebookAPIError as e:
            return {"success": False, "error": e.message}


# Singleton instance
_facebook_service: Optional[FacebookPageService] = None

def get_facebook_service() -> FacebookPageService:
    """Get or create Facebook service instance"""
    global _facebook_service
    if _facebook_service is None:
        _facebook_service = FacebookPageService()
    return _facebook_service


async def test_facebook_connection() -> Dict[str, Any]:
    """Test Facebook Page API connection"""
    async with FacebookPageService() as service:
        return await service.get_page_info()
