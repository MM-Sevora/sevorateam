"""
Influencer Analytics Service
Fetches real-time metrics from Instagram and YouTube APIs for influencer profiles.
"""

import os
import re
import asyncio
import aiohttp
import logging
from typing import Dict, Any, Optional, List
from datetime import datetime, timezone

logger = logging.getLogger(__name__)

# API Configuration
INSTAGRAM_GRAPH_API = "https://graph.facebook.com/v21.0"
YOUTUBE_DATA_API = "https://www.googleapis.com/youtube/v3"


class InfluencerAnalyticsService:
    """
    Service for fetching influencer metrics from social platforms.
    Supports: Instagram (via Meta Graph API), YouTube (via Data API)
    """
    
    def __init__(self):
        self.instagram_token = os.environ.get("INSTAGRAM_ACCESS_TOKEN")
        self.youtube_api_key = os.environ.get("YOUTUBE_API_KEY")
        self.session: Optional[aiohttp.ClientSession] = None
    
    async def __aenter__(self):
        self.session = aiohttp.ClientSession()
        return self
    
    async def __aexit__(self, exc_type, exc_val, exc_tb):
        if self.session:
            await self.session.close()
    
    # ============== INSTAGRAM ANALYTICS ==============
    
    def _extract_instagram_username(self, handle_or_url: str) -> str:
        """Extract Instagram username from handle or URL"""
        if not handle_or_url:
            return ""
        
        # Remove @ symbol
        handle = handle_or_url.strip().lstrip("@")
        
        # Extract from URL patterns
        patterns = [
            r"instagram\.com/([^/?]+)",
            r"instagr\.am/([^/?]+)",
        ]
        
        for pattern in patterns:
            match = re.search(pattern, handle)
            if match:
                return match.group(1)
        
        return handle
    
    async def get_instagram_profile(self, username: str) -> Dict[str, Any]:
        """
        Fetch Instagram profile metrics using Instagram Graph API.
        
        Note: Instagram Graph API requires the target account to be a Business/Creator
        account and the app to have proper permissions. For public profiles,
        we use the Instagram Basic Display API or web scraping fallback.
        """
        username = self._extract_instagram_username(username)
        
        if not username:
            return {"success": False, "error": "Invalid username"}
        
        if not self.instagram_token:
            return {"success": False, "error": "Instagram API not configured"}
        
        try:
            # Try to search for the business account using Instagram Graph API
            # This requires instagram_basic permission and business discovery
            url = f"{INSTAGRAM_GRAPH_API}/ig_hashtag_search"
            
            # Use Business Discovery API to get public profile info
            # This requires the requesting account to have business/creator status
            business_account_id = os.environ.get("INSTAGRAM_BUSINESS_ACCOUNT_ID")
            
            if not business_account_id:
                return {"success": False, "error": "Instagram Business Account ID not configured"}
            
            # Business Discovery endpoint
            discovery_url = f"{INSTAGRAM_GRAPH_API}/{business_account_id}"
            params = {
                "fields": f"business_discovery.username({username}){{id,username,name,biography,profile_picture_url,followers_count,follows_count,media_count,media.limit(12){{id,caption,like_count,comments_count,media_type,media_url,thumbnail_url,permalink,timestamp}}}}",
                "access_token": self.instagram_token
            }
            
            async with self.session.get(discovery_url, params=params) as response:
                data = await response.json()
                
                if "error" in data:
                    error_msg = data["error"].get("message", "Unknown error")
                    # Handle specific errors
                    if "user" in error_msg.lower() and "not found" in error_msg.lower():
                        return {
                            "success": False,
                            "error": f"Instagram user @{username} not found or is not a business/creator account",
                            "username": username
                        }
                    return {"success": False, "error": error_msg}
                
                profile_data = data.get("business_discovery", {})
                
                if not profile_data:
                    return {"success": False, "error": "Could not fetch profile data"}
                
                # Calculate engagement rate from recent media
                media_items = profile_data.get("media", {}).get("data", [])
                total_engagement = 0
                media_count = len(media_items)
                
                recent_media = []
                for item in media_items:
                    likes = item.get("like_count", 0)
                    comments = item.get("comments_count", 0)
                    total_engagement += likes + comments
                    
                    recent_media.append({
                        "id": item.get("id"),
                        "type": item.get("media_type"),
                        "likes": likes,
                        "comments": comments,
                        "caption": (item.get("caption") or "")[:100],
                        "url": item.get("permalink"),
                        "thumbnail": item.get("thumbnail_url") or item.get("media_url"),
                        "timestamp": item.get("timestamp")
                    })
                
                followers = profile_data.get("followers_count", 0)
                avg_engagement = total_engagement / media_count if media_count > 0 else 0
                engagement_rate = (avg_engagement / followers * 100) if followers > 0 else 0
                
                # Determine tier based on followers
                tier = self._calculate_tier(followers)
                
                return {
                    "success": True,
                    "platform": "instagram",
                    "username": profile_data.get("username"),
                    "name": profile_data.get("name"),
                    "bio": profile_data.get("biography"),
                    "profile_picture": profile_data.get("profile_picture_url"),
                    "metrics": {
                        "followers": followers,
                        "following": profile_data.get("follows_count", 0),
                        "posts": profile_data.get("media_count", 0),
                        "engagement_rate": round(engagement_rate, 2),
                        "avg_likes": round(sum(m["likes"] for m in recent_media) / len(recent_media)) if recent_media else 0,
                        "avg_comments": round(sum(m["comments"] for m in recent_media) / len(recent_media)) if recent_media else 0,
                    },
                    "tier": tier,
                    "recent_media": recent_media[:6],  # Return top 6 posts
                    "fetched_at": datetime.now(timezone.utc).isoformat(),
                    "verified": True  # Profile exists and is accessible
                }
                
        except aiohttp.ClientError as e:
            logger.error(f"Instagram API error: {e}")
            return {"success": False, "error": f"Network error: {str(e)}"}
        except Exception as e:
            logger.error(f"Instagram fetch error: {e}")
            return {"success": False, "error": str(e)}
    
    # ============== YOUTUBE ANALYTICS ==============
    
    def _extract_youtube_channel_id(self, handle_or_url: str) -> tuple[str, str]:
        """
        Extract YouTube channel identifier from handle or URL.
        Returns (identifier_type, identifier_value)
        identifier_type: 'channel_id', 'username', 'handle', 'custom_url'
        """
        if not handle_or_url:
            return ("", "")
        
        handle = handle_or_url.strip()
        
        # Channel ID pattern (starts with UC)
        if handle.startswith("UC") and len(handle) == 24:
            return ("channel_id", handle)
        
        # URL patterns
        patterns = [
            (r"youtube\.com/channel/([^/?]+)", "channel_id"),
            (r"youtube\.com/@([^/?]+)", "handle"),
            (r"youtube\.com/c/([^/?]+)", "custom_url"),
            (r"youtube\.com/user/([^/?]+)", "username"),
        ]
        
        for pattern, id_type in patterns:
            match = re.search(pattern, handle)
            if match:
                return (id_type, match.group(1))
        
        # Assume it's a handle if starts with @
        if handle.startswith("@"):
            return ("handle", handle[1:])
        
        # Default to treating as custom URL or username
        return ("custom_url", handle)
    
    async def get_youtube_channel(self, channel_identifier: str) -> Dict[str, Any]:
        """
        Fetch YouTube channel metrics using YouTube Data API.
        Supports channel ID, handle (@username), custom URL, or legacy username.
        """
        if not channel_identifier:
            return {"success": False, "error": "Invalid channel identifier"}
        
        if not self.youtube_api_key:
            return {"success": False, "error": "YouTube API not configured"}
        
        try:
            id_type, id_value = self._extract_youtube_channel_id(channel_identifier)
            
            if not id_value:
                return {"success": False, "error": "Could not parse channel identifier"}
            
            # Build API request based on identifier type
            params = {
                "part": "snippet,statistics,brandingSettings",
                "key": self.youtube_api_key
            }
            
            if id_type == "channel_id":
                params["id"] = id_value
            elif id_type == "handle":
                params["forHandle"] = f"@{id_value}"
            elif id_type == "username":
                params["forUsername"] = id_value
            else:
                # For custom URLs, try search first
                search_result = await self._search_youtube_channel(id_value)
                if search_result.get("success"):
                    params["id"] = search_result["channel_id"]
                else:
                    return search_result
            
            url = f"{YOUTUBE_DATA_API}/channels"
            
            async with self.session.get(url, params=params) as response:
                data = await response.json()
                
                if "error" in data:
                    return {"success": False, "error": data["error"].get("message", "Unknown error")}
                
                items = data.get("items", [])
                if not items:
                    return {"success": False, "error": f"YouTube channel not found: {channel_identifier}"}
                
                channel = items[0]
                snippet = channel.get("snippet", {})
                stats = channel.get("statistics", {})
                branding = channel.get("brandingSettings", {}).get("channel", {})
                
                subscribers = int(stats.get("subscriberCount", 0))
                tier = self._calculate_tier(subscribers)
                
                return {
                    "success": True,
                    "platform": "youtube",
                    "channel_id": channel.get("id"),
                    "username": snippet.get("customUrl", "").lstrip("@"),
                    "name": snippet.get("title"),
                    "bio": snippet.get("description", "")[:500],
                    "profile_picture": snippet.get("thumbnails", {}).get("high", {}).get("url"),
                    "country": snippet.get("country"),
                    "metrics": {
                        "subscribers": subscribers,
                        "total_views": int(stats.get("viewCount", 0)),
                        "videos": int(stats.get("videoCount", 0)),
                        "hidden_subscriber_count": stats.get("hiddenSubscriberCount", False)
                    },
                    "tier": tier,
                    "channel_url": f"https://www.youtube.com/channel/{channel.get('id')}",
                    "fetched_at": datetime.now(timezone.utc).isoformat(),
                    "verified": True
                }
                
        except aiohttp.ClientError as e:
            logger.error(f"YouTube API error: {e}")
            return {"success": False, "error": f"Network error: {str(e)}"}
        except Exception as e:
            logger.error(f"YouTube fetch error: {e}")
            return {"success": False, "error": str(e)}
    
    async def _search_youtube_channel(self, query: str) -> Dict[str, Any]:
        """Search for a YouTube channel by name/custom URL"""
        params = {
            "part": "snippet",
            "q": query,
            "type": "channel",
            "maxResults": 1,
            "key": self.youtube_api_key
        }
        
        url = f"{YOUTUBE_DATA_API}/search"
        
        async with self.session.get(url, params=params) as response:
            data = await response.json()
            
            if "error" in data:
                return {"success": False, "error": data["error"].get("message")}
            
            items = data.get("items", [])
            if not items:
                return {"success": False, "error": f"No YouTube channel found for: {query}"}
            
            return {
                "success": True,
                "channel_id": items[0]["snippet"]["channelId"]
            }
    
    async def get_youtube_recent_videos(self, channel_id: str, limit: int = 10) -> Dict[str, Any]:
        """Get recent videos from a YouTube channel with performance metrics"""
        if not self.youtube_api_key:
            return {"success": False, "error": "YouTube API not configured"}
        
        try:
            # First, get the uploads playlist ID
            channel_url = f"{YOUTUBE_DATA_API}/channels"
            channel_params = {
                "part": "contentDetails",
                "id": channel_id,
                "key": self.youtube_api_key
            }
            
            async with self.session.get(channel_url, params=channel_params) as response:
                data = await response.json()
                
                if not data.get("items"):
                    return {"success": False, "error": "Channel not found"}
                
                uploads_playlist = data["items"][0]["contentDetails"]["relatedPlaylists"]["uploads"]
            
            # Get videos from uploads playlist
            playlist_url = f"{YOUTUBE_DATA_API}/playlistItems"
            playlist_params = {
                "part": "snippet,contentDetails",
                "playlistId": uploads_playlist,
                "maxResults": min(limit, 50),
                "key": self.youtube_api_key
            }
            
            async with self.session.get(playlist_url, params=playlist_params) as response:
                playlist_data = await response.json()
            
            video_ids = [item["contentDetails"]["videoId"] for item in playlist_data.get("items", [])]
            
            if not video_ids:
                return {"success": True, "videos": [], "total": 0}
            
            # Get video statistics
            videos_url = f"{YOUTUBE_DATA_API}/videos"
            videos_params = {
                "part": "snippet,statistics,contentDetails",
                "id": ",".join(video_ids),
                "key": self.youtube_api_key
            }
            
            async with self.session.get(videos_url, params=videos_params) as response:
                videos_data = await response.json()
            
            videos = []
            total_views = 0
            total_likes = 0
            total_comments = 0
            
            for video in videos_data.get("items", []):
                stats = video.get("statistics", {})
                views = int(stats.get("viewCount", 0))
                likes = int(stats.get("likeCount", 0))
                comments = int(stats.get("commentCount", 0))
                
                total_views += views
                total_likes += likes
                total_comments += comments
                
                videos.append({
                    "id": video["id"],
                    "title": video["snippet"]["title"],
                    "description": video["snippet"].get("description", "")[:200],
                    "thumbnail": video["snippet"]["thumbnails"].get("medium", {}).get("url"),
                    "published_at": video["snippet"]["publishedAt"],
                    "duration": video["contentDetails"]["duration"],
                    "url": f"https://www.youtube.com/watch?v={video['id']}",
                    "metrics": {
                        "views": views,
                        "likes": likes,
                        "comments": comments
                    }
                })
            
            video_count = len(videos)
            
            return {
                "success": True,
                "videos": videos,
                "total": video_count,
                "averages": {
                    "avg_views": round(total_views / video_count) if video_count > 0 else 0,
                    "avg_likes": round(total_likes / video_count) if video_count > 0 else 0,
                    "avg_comments": round(total_comments / video_count) if video_count > 0 else 0,
                    "engagement_rate": round((total_likes + total_comments) / total_views * 100, 2) if total_views > 0 else 0
                }
            }
            
        except Exception as e:
            logger.error(f"YouTube videos fetch error: {e}")
            return {"success": False, "error": str(e)}
    
    # ============== UNIFIED METHODS ==============
    
    def _calculate_tier(self, followers: int) -> str:
        """Calculate influencer tier based on follower count"""
        if followers >= 10_000_000:
            return "celebrity"
        elif followers >= 1_000_000:
            return "mega"
        elif followers >= 100_000:
            return "macro"
        elif followers >= 10_000:
            return "micro"
        else:
            return "nano"
    
    async def fetch_all_metrics(
        self, 
        instagram_handle: Optional[str] = None,
        youtube_handle: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Fetch metrics from all available platforms for an influencer.
        Returns combined data and calculated overall metrics.
        """
        results = {
            "instagram": None,
            "youtube": None,
            "combined_metrics": {},
            "fetched_at": datetime.now(timezone.utc).isoformat()
        }
        
        tasks = []
        
        if instagram_handle:
            tasks.append(("instagram", self.get_instagram_profile(instagram_handle)))
        
        if youtube_handle:
            tasks.append(("youtube", self.get_youtube_channel(youtube_handle)))
        
        # Fetch all in parallel
        for platform, task in tasks:
            result = await task
            results[platform] = result
        
        # Calculate combined metrics
        total_followers = 0
        total_engagement = 0
        platforms_fetched = 0
        
        if results["instagram"] and results["instagram"].get("success"):
            ig_metrics = results["instagram"]["metrics"]
            total_followers += ig_metrics.get("followers", 0)
            total_engagement += ig_metrics.get("engagement_rate", 0)
            platforms_fetched += 1
        
        if results["youtube"] and results["youtube"].get("success"):
            yt_metrics = results["youtube"]["metrics"]
            total_followers += yt_metrics.get("subscribers", 0)
            platforms_fetched += 1
        
        results["combined_metrics"] = {
            "total_reach": total_followers,
            "platforms_verified": platforms_fetched,
            "overall_tier": self._calculate_tier(total_followers),
            "avg_engagement_rate": round(total_engagement / platforms_fetched, 2) if platforms_fetched > 0 else 0
        }
        
        return results


# Singleton instance
_analytics_service: Optional[InfluencerAnalyticsService] = None

def get_analytics_service() -> InfluencerAnalyticsService:
    """Get or create analytics service instance"""
    global _analytics_service
    if _analytics_service is None:
        _analytics_service = InfluencerAnalyticsService()
    return _analytics_service
