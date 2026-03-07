"""
Social Media API Services - Instagram Graph API & YouTube Data API
For influencer discovery, profile fetching, and engagement metrics
"""
import os
import logging
import requests
from typing import Dict, Any, Optional, List
from datetime import datetime, timezone

logger = logging.getLogger(__name__)


# ============== INSTAGRAM GRAPH API ==============
class InstagramAPIService:
    """
    Instagram Graph API for Business Discovery
    Requires: Instagram Business/Creator account connected to Facebook Page
    """
    
    def __init__(self):
        self.access_token = os.environ.get('INSTAGRAM_ACCESS_TOKEN')
        self.account_id = os.environ.get('INSTAGRAM_ACCOUNT_ID')
        self.base_url = "https://graph.facebook.com/v21.0"
        self._configured = bool(self.access_token and self.account_id)
    
    @property
    def is_configured(self) -> bool:
        return self._configured
    
    def get_connection_status(self) -> Dict[str, Any]:
        """Check Instagram API connection status"""
        if not self._configured:
            return {
                "connected": False,
                "reason": "Missing INSTAGRAM_ACCESS_TOKEN or INSTAGRAM_ACCOUNT_ID"
            }
        
        try:
            url = f"{self.base_url}/{self.account_id}"
            params = {
                "fields": "id,username",
                "access_token": self.access_token
            }
            response = requests.get(url, params=params, timeout=10)
            if response.status_code == 200:
                data = response.json()
                return {
                    "connected": True,
                    "account_id": data.get("id"),
                    "username": data.get("username")
                }
            else:
                return {
                    "connected": False,
                    "reason": f"API error: {response.status_code}",
                    "details": response.json()
                }
        except Exception as e:
            return {
                "connected": False,
                "reason": str(e)
            }
    
    def get_business_discovery(self, username: str) -> Optional[Dict[str, Any]]:
        """
        Fetch public profile data for any Instagram business/creator account.
        Uses Business Discovery API.
        
        Args:
            username: Instagram handle (with or without @)
        
        Returns:
            Profile data with engagement metrics or None if not found
        """
        if not self._configured:
            logger.warning("Instagram API not configured")
            return None
        
        # Remove @ if present
        username = username.lstrip('@')
        
        fields = "username,name,biography,followers_count,follows_count,media_count,profile_picture_url,website"
        media_fields = "media.limit(12){id,caption,like_count,comments_count,media_type,permalink,timestamp,media_url}"
        
        url = f"{self.base_url}/{self.account_id}"
        params = {
            "fields": f"business_discovery.username({username}){{{fields},{media_fields}}}",
            "access_token": self.access_token
        }
        
        try:
            response = requests.get(url, params=params, timeout=30)
            
            if response.status_code != 200:
                logger.error(f"Instagram API error: {response.text}")
                return None
            
            data = response.json().get('business_discovery', {})
            
            if not data:
                return None
            
            # Calculate engagement rate
            followers = data.get('followers_count', 0)
            media = data.get('media', {}).get('data', [])
            
            if followers > 0 and media:
                total_engagement = sum(
                    (m.get('like_count', 0) + m.get('comments_count', 0)) 
                    for m in media
                )
                avg_engagement = total_engagement / len(media)
                engagement_rate = (avg_engagement / followers) * 100
            else:
                engagement_rate = 0
            
            avg_likes = sum(m.get('like_count', 0) for m in media) / len(media) if media else 0
            avg_comments = sum(m.get('comments_count', 0) for m in media) / len(media) if media else 0
            
            return {
                "platform": "instagram",
                "username": data.get('username'),
                "name": data.get('name'),
                "bio": data.get('biography'),
                "followers": data.get('followers_count', 0),
                "following": data.get('follows_count', 0),
                "posts_count": data.get('media_count', 0),
                "profile_picture": data.get('profile_picture_url'),
                "website": data.get('website'),
                "engagement_rate": round(engagement_rate, 2),
                "avg_likes": round(avg_likes),
                "avg_comments": round(avg_comments),
                "recent_media": media,
                "fetched_at": datetime.now(timezone.utc).isoformat()
            }
        except Exception as e:
            logger.error(f"Instagram API exception: {str(e)}")
            return None
    
    def search_hashtag(self, hashtag: str, limit: int = 20) -> Optional[Dict[str, Any]]:
        """
        Search for recent media with a specific hashtag
        Note: Requires hashtag_search permission
        """
        if not self._configured:
            return None
        
        hashtag = hashtag.lstrip('#')
        
        try:
            # First, get hashtag ID
            search_url = f"{self.base_url}/ig_hashtag_search"
            search_params = {
                "user_id": self.account_id,
                "q": hashtag,
                "access_token": self.access_token
            }
            
            response = requests.get(search_url, params=search_params, timeout=30)
            if response.status_code != 200:
                return None
            
            hashtag_data = response.json().get('data', [])
            if not hashtag_data:
                return None
            
            hashtag_id = hashtag_data[0].get('id')
            
            # Get recent media for hashtag
            media_url = f"{self.base_url}/{hashtag_id}/recent_media"
            media_params = {
                "user_id": self.account_id,
                "fields": "id,caption,like_count,comments_count,media_type,permalink",
                "limit": limit,
                "access_token": self.access_token
            }
            
            media_response = requests.get(media_url, params=media_params, timeout=30)
            if media_response.status_code != 200:
                return None
            
            return {
                "hashtag": hashtag,
                "media": media_response.json().get('data', [])
            }
        except Exception as e:
            logger.error(f"Instagram hashtag search error: {str(e)}")
            return None


# ============== YOUTUBE DATA API ==============
class YouTubeAPIService:
    """
    YouTube Data API v3 for channel discovery and analytics
    """
    
    def __init__(self):
        self.api_key = os.environ.get('YOUTUBE_API_KEY')
        self.base_url = "https://www.googleapis.com/youtube/v3"
        self._configured = bool(self.api_key)
    
    @property
    def is_configured(self) -> bool:
        return self._configured
    
    def get_connection_status(self) -> Dict[str, Any]:
        """Check YouTube API connection status"""
        if not self._configured:
            return {
                "connected": False,
                "reason": "Missing YOUTUBE_API_KEY"
            }
        
        try:
            # Test with a simple API call
            url = f"{self.base_url}/videos"
            params = {
                "part": "snippet",
                "chart": "mostPopular",
                "maxResults": 1,
                "key": self.api_key
            }
            response = requests.get(url, params=params, timeout=10)
            if response.status_code == 200:
                return {"connected": True}
            else:
                return {
                    "connected": False,
                    "reason": f"API error: {response.status_code}",
                    "details": response.json()
                }
        except Exception as e:
            return {
                "connected": False,
                "reason": str(e)
            }
    
    def get_channel_by_handle(self, handle: str) -> Optional[Dict[str, Any]]:
        """
        Fetch YouTube channel data by handle or custom URL
        
        Args:
            handle: YouTube handle (with or without @)
        
        Returns:
            Channel data with statistics or None if not found
        """
        if not self._configured:
            logger.warning("YouTube API not configured")
            return None
        
        # Remove @ if present
        handle = handle.lstrip('@')
        
        url = f"{self.base_url}/channels"
        
        # Try forHandle first (new YouTube handles)
        params = {
            "part": "snippet,statistics,contentDetails,brandingSettings",
            "forHandle": handle,
            "key": self.api_key
        }
        
        try:
            response = requests.get(url, params=params, timeout=30)
            data = response.json()
            
            # If no results, try forUsername (legacy usernames)
            if not data.get('items'):
                params = {
                    "part": "snippet,statistics,contentDetails,brandingSettings",
                    "forUsername": handle,
                    "key": self.api_key
                }
                response = requests.get(url, params=params, timeout=30)
                data = response.json()
            
            if not data.get('items'):
                return None
            
            channel = data['items'][0]
            snippet = channel.get('snippet', {})
            stats = channel.get('statistics', {})
            branding = channel.get('brandingSettings', {}).get('channel', {})
            
            # Get recent videos for engagement calculation
            videos = self._get_recent_videos(channel['id'])
            
            subscribers = int(stats.get('subscriberCount', 0))
            avg_views = sum(v.get('views', 0) for v in videos) / len(videos) if videos else 0
            engagement_rate = (avg_views / subscribers * 100) if subscribers > 0 else 0
            
            return {
                "platform": "youtube",
                "channel_id": channel['id'],
                "title": snippet.get('title'),
                "name": snippet.get('title'),
                "description": snippet.get('description'),
                "custom_url": snippet.get('customUrl'),
                "thumbnail": snippet.get('thumbnails', {}).get('high', {}).get('url'),
                "profile_picture": snippet.get('thumbnails', {}).get('high', {}).get('url'),
                "banner": branding.get('bannerExternalUrl'),
                "country": snippet.get('country'),
                "subscribers": subscribers,
                "followers": subscribers,  # Alias for consistency
                "total_views": int(stats.get('viewCount', 0)),
                "video_count": int(stats.get('videoCount', 0)),
                "avg_views": round(avg_views),
                "engagement_rate": round(engagement_rate, 2),
                "recent_videos": videos,
                "fetched_at": datetime.now(timezone.utc).isoformat()
            }
        except Exception as e:
            logger.error(f"YouTube API exception: {str(e)}")
            return None
    
    def get_channel_by_id(self, channel_id: str) -> Optional[Dict[str, Any]]:
        """Fetch YouTube channel data by channel ID"""
        if not self._configured:
            return None
        
        url = f"{self.base_url}/channels"
        params = {
            "part": "snippet,statistics,contentDetails",
            "id": channel_id,
            "key": self.api_key
        }
        
        try:
            response = requests.get(url, params=params, timeout=30)
            data = response.json()
            
            if not data.get('items'):
                return None
            
            channel = data['items'][0]
            snippet = channel.get('snippet', {})
            stats = channel.get('statistics', {})
            
            return {
                "platform": "youtube",
                "channel_id": channel['id'],
                "title": snippet.get('title'),
                "description": snippet.get('description'),
                "thumbnail": snippet.get('thumbnails', {}).get('high', {}).get('url'),
                "subscribers": int(stats.get('subscriberCount', 0)),
                "total_views": int(stats.get('viewCount', 0)),
                "video_count": int(stats.get('videoCount', 0))
            }
        except Exception as e:
            logger.error(f"YouTube channel fetch error: {str(e)}")
            return None
    
    def _get_recent_videos(self, channel_id: str, max_results: int = 10) -> List[Dict[str, Any]]:
        """Get recent videos for a channel with statistics"""
        url = f"{self.base_url}/search"
        params = {
            "part": "snippet",
            "channelId": channel_id,
            "order": "date",
            "maxResults": max_results,
            "type": "video",
            "key": self.api_key
        }
        
        try:
            response = requests.get(url, params=params, timeout=30)
            data = response.json()
            
            video_ids = [item['id']['videoId'] for item in data.get('items', []) if item.get('id', {}).get('videoId')]
            
            if not video_ids:
                return []
            
            # Get video statistics
            stats_url = f"{self.base_url}/videos"
            stats_params = {
                "part": "statistics,snippet",
                "id": ",".join(video_ids),
                "key": self.api_key
            }
            
            stats_response = requests.get(stats_url, params=stats_params, timeout=30)
            stats_data = stats_response.json()
            
            videos = []
            for item in stats_data.get('items', []):
                stats = item.get('statistics', {})
                snippet = item.get('snippet', {})
                videos.append({
                    "id": item['id'],
                    "title": snippet.get('title'),
                    "published_at": snippet.get('publishedAt'),
                    "thumbnail": snippet.get('thumbnails', {}).get('medium', {}).get('url'),
                    "views": int(stats.get('viewCount', 0)),
                    "likes": int(stats.get('likeCount', 0)),
                    "comments": int(stats.get('commentCount', 0))
                })
            
            return videos
        except Exception as e:
            logger.error(f"YouTube videos fetch error: {str(e)}")
            return []
    
    def search_channels(self, query: str, max_results: int = 10) -> List[Dict[str, Any]]:
        """Search for YouTube channels by keyword"""
        if not self._configured:
            return []
        
        url = f"{self.base_url}/search"
        params = {
            "part": "snippet",
            "q": query,
            "type": "channel",
            "maxResults": max_results,
            "key": self.api_key
        }
        
        try:
            response = requests.get(url, params=params, timeout=30)
            data = response.json()
            
            channels = []
            for item in data.get('items', []):
                snippet = item.get('snippet', {})
                channels.append({
                    "channel_id": item['id']['channelId'],
                    "title": snippet.get('title'),
                    "description": snippet.get('description'),
                    "thumbnail": snippet.get('thumbnails', {}).get('high', {}).get('url')
                })
            
            return channels
        except Exception as e:
            logger.error(f"YouTube search error: {str(e)}")
            return []


# ============== UNIFIED SOCIAL PROFILE FETCHER ==============
class SocialProfileService:
    """
    Unified service to fetch social media profiles from multiple platforms
    """
    
    def __init__(self):
        self.instagram = InstagramAPIService()
        self.youtube = YouTubeAPIService()
    
    def get_status(self) -> Dict[str, Any]:
        """Get connection status for all platforms"""
        return {
            "instagram": self.instagram.get_connection_status(),
            "youtube": self.youtube.get_connection_status()
        }
    
    def fetch_profile(self, platform: str, handle: str) -> Optional[Dict[str, Any]]:
        """
        Fetch profile from specified platform
        
        Args:
            platform: 'instagram' or 'youtube'
            handle: Username/handle for the platform
        
        Returns:
            Profile data or None
        """
        if platform.lower() == 'instagram':
            return self.instagram.get_business_discovery(handle)
        elif platform.lower() == 'youtube':
            return self.youtube.get_channel_by_handle(handle)
        else:
            logger.warning(f"Unknown platform: {platform}")
            return None
    
    def fetch_all_profiles(self, handles: Dict[str, str]) -> Dict[str, Any]:
        """
        Fetch profiles from multiple platforms
        
        Args:
            handles: Dict with platform as key and handle as value
                     e.g., {"instagram": "@fashionista", "youtube": "@fashionvlog"}
        
        Returns:
            Dict with platform as key and profile data as value
        """
        results = {}
        
        for platform, handle in handles.items():
            if handle:
                profile = self.fetch_profile(platform, handle)
                if profile:
                    results[platform] = profile
        
        return results


# ============== SINGLETONS ==============
_instagram_service = None
_youtube_service = None
_social_profile_service = None


def get_instagram_service() -> InstagramAPIService:
    global _instagram_service
    if _instagram_service is None:
        _instagram_service = InstagramAPIService()
    return _instagram_service


def get_youtube_service() -> YouTubeAPIService:
    global _youtube_service
    if _youtube_service is None:
        _youtube_service = YouTubeAPIService()
    return _youtube_service


def get_social_profile_service() -> SocialProfileService:
    global _social_profile_service
    if _social_profile_service is None:
        _social_profile_service = SocialProfileService()
    return _social_profile_service
