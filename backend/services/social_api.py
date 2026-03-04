"""
Social Media API Service for profile verification
Supports Instagram Graph API and YouTube Data API v3
"""
import os
import httpx
import logging
from typing import Optional, Dict, Any, List
from datetime import datetime, timezone
from pydantic import BaseModel

logger = logging.getLogger(__name__)

class SocialProfile(BaseModel):
    platform: str
    username: str
    display_name: Optional[str] = None
    bio: Optional[str] = None
    followers: int = 0
    following: int = 0
    posts_count: int = 0
    engagement_rate: float = 0.0
    is_verified: bool = False
    profile_url: Optional[str] = None
    avatar_url: Optional[str] = None
    last_verified: Optional[str] = None
    raw_data: Optional[Dict] = None


class InstagramAPIClient:
    """Client for Instagram Graph API with Business Discovery"""
    
    def __init__(self, access_token: str, business_account_id: str):
        self.access_token = access_token
        self.business_account_id = business_account_id
        self.base_url = "https://graph.instagram.com"
        self.api_version = "v18.0"
    
    async def verify_profile(self, username: str) -> Optional[SocialProfile]:
        """Verify an Instagram profile using Business Discovery API"""
        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                # Business Discovery endpoint
                url = f"{self.base_url}/{self.api_version}/{self.business_account_id}"
                params = {
                    "fields": f"business_discovery.username({username}){{id,username,name,biography,website,followers_count,follows_count,media_count,profile_picture_url,ig_verified}}",
                    "access_token": self.access_token
                }
                
                response = await client.get(url, params=params)
                
                if response.status_code != 200:
                    logger.error(f"Instagram API error: {response.status_code} - {response.text}")
                    return None
                
                data = response.json()
                
                if "business_discovery" not in data:
                    logger.warning(f"Instagram profile not found: {username}")
                    return None
                
                discovery = data["business_discovery"]
                
                # Calculate engagement rate from recent media
                engagement_rate = await self._calculate_engagement(username, discovery.get("followers_count", 0))
                
                return SocialProfile(
                    platform="instagram",
                    username=discovery.get("username", username),
                    display_name=discovery.get("name"),
                    bio=discovery.get("biography"),
                    followers=discovery.get("followers_count", 0),
                    following=discovery.get("follows_count", 0),
                    posts_count=discovery.get("media_count", 0),
                    engagement_rate=engagement_rate,
                    is_verified=discovery.get("ig_verified", False),
                    profile_url=f"https://instagram.com/{username}",
                    avatar_url=discovery.get("profile_picture_url"),
                    last_verified=datetime.now(timezone.utc).isoformat(),
                    raw_data=discovery
                )
                
        except Exception as e:
            logger.error(f"Instagram verification error for {username}: {e}")
            return None
    
    async def _calculate_engagement(self, username: str, followers: int) -> float:
        """Calculate engagement rate from recent posts"""
        if followers == 0:
            return 0.0
        
        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                url = f"{self.base_url}/{self.api_version}/{self.business_account_id}"
                params = {
                    "fields": f"business_discovery.username({username}){{media.limit(10){{like_count,comments_count}}}}",
                    "access_token": self.access_token
                }
                
                response = await client.get(url, params=params)
                
                if response.status_code != 200:
                    return 0.0
                
                data = response.json()
                media = data.get("business_discovery", {}).get("media", {}).get("data", [])
                
                if not media:
                    return 0.0
                
                total_engagement = sum(
                    (m.get("like_count", 0) + m.get("comments_count", 0))
                    for m in media
                )
                
                avg_engagement = total_engagement / len(media)
                engagement_rate = (avg_engagement / followers) * 100
                
                return round(engagement_rate, 2)
                
        except Exception as e:
            logger.error(f"Engagement calculation error: {e}")
            return 0.0


class YouTubeAPIClient:
    """Client for YouTube Data API v3"""
    
    def __init__(self, api_key: str):
        self.api_key = api_key
        self.base_url = "https://www.googleapis.com/youtube/v3"
    
    async def verify_channel_by_handle(self, handle: str) -> Optional[SocialProfile]:
        """Verify YouTube channel by handle (@username)"""
        try:
            # First, search for the channel by handle
            channel_id = await self._get_channel_id_by_handle(handle)
            
            if not channel_id:
                return None
            
            return await self.verify_channel_by_id(channel_id)
            
        except Exception as e:
            logger.error(f"YouTube verification error for {handle}: {e}")
            return None
    
    async def _get_channel_id_by_handle(self, handle: str) -> Optional[str]:
        """Get channel ID from handle"""
        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                # Try forHandle parameter first (newer API)
                clean_handle = handle.lstrip("@")
                url = f"{self.base_url}/channels"
                params = {
                    "part": "id",
                    "forHandle": clean_handle,
                    "key": self.api_key
                }
                
                response = await client.get(url, params=params)
                
                if response.status_code == 200:
                    data = response.json()
                    items = data.get("items", [])
                    if items:
                        return items[0]["id"]
                
                # Fallback: search by query
                search_url = f"{self.base_url}/search"
                search_params = {
                    "part": "snippet",
                    "q": clean_handle,
                    "type": "channel",
                    "maxResults": 1,
                    "key": self.api_key
                }
                
                response = await client.get(search_url, params=search_params)
                
                if response.status_code == 200:
                    data = response.json()
                    items = data.get("items", [])
                    if items:
                        return items[0]["id"]["channelId"]
                
                return None
                
        except Exception as e:
            logger.error(f"Error getting channel ID: {e}")
            return None
    
    async def verify_channel_by_id(self, channel_id: str) -> Optional[SocialProfile]:
        """Verify YouTube channel by ID"""
        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                url = f"{self.base_url}/channels"
                params = {
                    "part": "snippet,statistics,brandingSettings",
                    "id": channel_id,
                    "key": self.api_key
                }
                
                response = await client.get(url, params=params)
                
                if response.status_code != 200:
                    logger.error(f"YouTube API error: {response.status_code} - {response.text}")
                    return None
                
                data = response.json()
                items = data.get("items", [])
                
                if not items:
                    return None
                
                channel = items[0]
                snippet = channel.get("snippet", {})
                stats = channel.get("statistics", {})
                
                # Calculate engagement rate
                engagement_rate = await self._calculate_engagement(channel_id, int(stats.get("subscriberCount", 0)))
                
                return SocialProfile(
                    platform="youtube",
                    username=snippet.get("customUrl", "").lstrip("@") or channel_id,
                    display_name=snippet.get("title"),
                    bio=snippet.get("description", "")[:500],
                    followers=int(stats.get("subscriberCount", 0)),
                    following=0,
                    posts_count=int(stats.get("videoCount", 0)),
                    engagement_rate=engagement_rate,
                    is_verified=False,  # YouTube API doesn't expose this easily
                    profile_url=f"https://youtube.com/channel/{channel_id}",
                    avatar_url=snippet.get("thumbnails", {}).get("default", {}).get("url"),
                    last_verified=datetime.now(timezone.utc).isoformat(),
                    raw_data=channel
                )
                
        except Exception as e:
            logger.error(f"YouTube channel verification error: {e}")
            return None
    
    async def _calculate_engagement(self, channel_id: str, subscribers: int) -> float:
        """Calculate engagement rate from recent videos"""
        if subscribers == 0:
            return 0.0
        
        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                # Get recent videos
                url = f"{self.base_url}/search"
                params = {
                    "part": "id",
                    "channelId": channel_id,
                    "type": "video",
                    "order": "date",
                    "maxResults": 10,
                    "key": self.api_key
                }
                
                response = await client.get(url, params=params)
                
                if response.status_code != 200:
                    return 0.0
                
                data = response.json()
                video_ids = [item["id"]["videoId"] for item in data.get("items", [])]
                
                if not video_ids:
                    return 0.0
                
                # Get video statistics
                videos_url = f"{self.base_url}/videos"
                videos_params = {
                    "part": "statistics",
                    "id": ",".join(video_ids),
                    "key": self.api_key
                }
                
                response = await client.get(videos_url, params=videos_params)
                
                if response.status_code != 200:
                    return 0.0
                
                videos_data = response.json()
                
                total_engagement = 0
                for video in videos_data.get("items", []):
                    stats = video.get("statistics", {})
                    total_engagement += (
                        int(stats.get("likeCount", 0)) +
                        int(stats.get("commentCount", 0))
                    )
                
                avg_engagement = total_engagement / len(video_ids)
                engagement_rate = (avg_engagement / subscribers) * 100
                
                return round(engagement_rate, 2)
                
        except Exception as e:
            logger.error(f"YouTube engagement calculation error: {e}")
            return 0.0


class SocialAPIService:
    """Main service for social media API integrations"""
    
    def __init__(self):
        self.instagram_client: Optional[InstagramAPIClient] = None
        self.youtube_client: Optional[YouTubeAPIClient] = None
    
    def configure_instagram(self, access_token: str, business_account_id: str):
        """Configure Instagram API client"""
        self.instagram_client = InstagramAPIClient(access_token, business_account_id)
    
    def configure_youtube(self, api_key: str):
        """Configure YouTube API client"""
        self.youtube_client = YouTubeAPIClient(api_key)
    
    async def verify_instagram(self, username: str) -> Optional[SocialProfile]:
        """Verify Instagram profile"""
        if not self.instagram_client:
            logger.warning("Instagram API not configured")
            return None
        return await self.instagram_client.verify_profile(username)
    
    async def verify_youtube(self, handle_or_id: str) -> Optional[SocialProfile]:
        """Verify YouTube channel"""
        if not self.youtube_client:
            logger.warning("YouTube API not configured")
            return None
        
        if handle_or_id.startswith("@") or not handle_or_id.startswith("UC"):
            return await self.youtube_client.verify_channel_by_handle(handle_or_id)
        return await self.youtube_client.verify_channel_by_id(handle_or_id)
    
    async def verify_all_platforms(self, handles: Dict[str, str]) -> Dict[str, Optional[SocialProfile]]:
        """Verify profiles across multiple platforms"""
        results = {}
        
        if "instagram" in handles and handles["instagram"]:
            results["instagram"] = await self.verify_instagram(handles["instagram"])
        
        if "youtube" in handles and handles["youtube"]:
            results["youtube"] = await self.verify_youtube(handles["youtube"])
        
        return results


# Singleton instance
social_api_service = SocialAPIService()
