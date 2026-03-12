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
    
    # ============== CONTENT PERFORMANCE ANALYSIS ==============
    
    async def analyze_instagram_content(self, username: str) -> Dict[str, Any]:
        """
        Deep content performance analysis for Instagram.
        Returns: best posts, engagement by type, posting frequency, peak times.
        """
        username = self._extract_instagram_username(username)
        
        if not username:
            return {"success": False, "error": "Invalid username"}
        
        if not self.instagram_token:
            return {"success": False, "error": "Instagram API not configured"}
        
        try:
            business_account_id = os.environ.get("INSTAGRAM_BUSINESS_ACCOUNT_ID")
            if not business_account_id:
                return {"success": False, "error": "Instagram Business Account ID not configured"}
            
            # Fetch more posts for better analysis (up to 25)
            discovery_url = f"{INSTAGRAM_GRAPH_API}/{business_account_id}"
            params = {
                "fields": f"business_discovery.username({username}){{id,username,followers_count,media_count,media.limit(25){{id,caption,like_count,comments_count,media_type,timestamp}}}}",
                "access_token": self.instagram_token
            }
            
            async with self.session.get(discovery_url, params=params) as response:
                data = await response.json()
                
                if "error" in data:
                    return {"success": False, "error": data["error"].get("message", "Unknown error")}
                
                profile_data = data.get("business_discovery", {})
                if not profile_data:
                    return {"success": False, "error": "Could not fetch profile data"}
                
                media_items = profile_data.get("media", {}).get("data", [])
                followers = profile_data.get("followers_count", 0)
                
                if not media_items:
                    return {"success": False, "error": "No posts found"}
                
                # Analyze posts
                posts_analysis = []
                engagement_by_type = {"IMAGE": [], "VIDEO": [], "CAROUSEL_ALBUM": []}
                posting_hours = {}
                posting_days = {}
                
                for post in media_items:
                    likes = post.get("like_count", 0)
                    comments = post.get("comments_count", 0)
                    total_engagement = likes + comments
                    engagement_rate = (total_engagement / followers * 100) if followers > 0 else 0
                    media_type = post.get("media_type", "IMAGE")
                    timestamp = post.get("timestamp", "")
                    
                    post_data = {
                        "id": post.get("id"),
                        "type": media_type,
                        "likes": likes,
                        "comments": comments,
                        "engagement": total_engagement,
                        "engagement_rate": round(engagement_rate, 2),
                        "caption_preview": (post.get("caption") or "")[:50],
                        "timestamp": timestamp
                    }
                    posts_analysis.append(post_data)
                    
                    # Group by content type
                    if media_type in engagement_by_type:
                        engagement_by_type[media_type].append(engagement_rate)
                    
                    # Extract posting time patterns
                    if timestamp:
                        try:
                            from datetime import datetime
                            dt = datetime.fromisoformat(timestamp.replace("Z", "+00:00"))
                            hour = dt.hour
                            day = dt.strftime("%A")
                            
                            posting_hours[hour] = posting_hours.get(hour, 0) + 1
                            posting_days[day] = posting_days.get(day, 0) + 1
                        except:
                            pass
                
                # Sort posts by engagement
                posts_analysis.sort(key=lambda x: x["engagement"], reverse=True)
                
                # Calculate engagement by content type
                content_type_stats = {}
                for content_type, rates in engagement_by_type.items():
                    if rates:
                        content_type_stats[content_type.lower()] = {
                            "count": len(rates),
                            "avg_engagement_rate": round(sum(rates) / len(rates), 2),
                            "max_engagement_rate": round(max(rates), 2),
                            "min_engagement_rate": round(min(rates), 2)
                        }
                
                # Calculate posting frequency
                total_posts = len(media_items)
                if total_posts >= 2 and media_items[0].get("timestamp") and media_items[-1].get("timestamp"):
                    try:
                        first_post = datetime.fromisoformat(media_items[-1]["timestamp"].replace("Z", "+00:00"))
                        last_post = datetime.fromisoformat(media_items[0]["timestamp"].replace("Z", "+00:00"))
                        days_span = (last_post - first_post).days or 1
                        posts_per_week = round((total_posts / days_span) * 7, 1)
                    except:
                        posts_per_week = None
                else:
                    posts_per_week = None
                
                # Find peak posting hours (top 3)
                sorted_hours = sorted(posting_hours.items(), key=lambda x: x[1], reverse=True)[:3]
                peak_hours = [f"{h}:00" for h, _ in sorted_hours] if sorted_hours else []
                
                # Find best posting days
                sorted_days = sorted(posting_days.items(), key=lambda x: x[1], reverse=True)[:3]
                best_days = [d for d, _ in sorted_days] if sorted_days else []
                
                # Calculate consistency score (0-100)
                # Based on posting regularity
                if posts_per_week:
                    if posts_per_week >= 5:
                        consistency_score = 95
                    elif posts_per_week >= 3:
                        consistency_score = 80
                    elif posts_per_week >= 1:
                        consistency_score = 60
                    else:
                        consistency_score = 40
                else:
                    consistency_score = None
                
                return {
                    "success": True,
                    "username": username,
                    "followers": followers,
                    "total_posts_analyzed": total_posts,
                    
                    "best_performing_posts": posts_analysis[:5],  # Top 5
                    "worst_performing_posts": posts_analysis[-3:] if len(posts_analysis) > 3 else [],  # Bottom 3
                    
                    "engagement_by_content_type": content_type_stats,
                    
                    "posting_frequency": {
                        "posts_per_week": posts_per_week,
                        "consistency_score": consistency_score,
                        "consistency_rating": (
                            "Excellent" if consistency_score and consistency_score >= 80 else
                            "Good" if consistency_score and consistency_score >= 60 else
                            "Needs Improvement" if consistency_score else "Unknown"
                        )
                    },
                    
                    "peak_engagement_times": {
                        "best_hours": peak_hours,
                        "best_days": best_days,
                        "recommendation": f"Post on {best_days[0] if best_days else 'weekdays'} around {peak_hours[0] if peak_hours else '18:00'}"
                    },
                    
                    "overall_stats": {
                        "avg_likes": round(sum(p["likes"] for p in posts_analysis) / len(posts_analysis)) if posts_analysis else 0,
                        "avg_comments": round(sum(p["comments"] for p in posts_analysis) / len(posts_analysis)) if posts_analysis else 0,
                        "avg_engagement_rate": round(sum(p["engagement_rate"] for p in posts_analysis) / len(posts_analysis), 2) if posts_analysis else 0,
                        "highest_engagement_rate": posts_analysis[0]["engagement_rate"] if posts_analysis else 0,
                        "lowest_engagement_rate": posts_analysis[-1]["engagement_rate"] if posts_analysis else 0
                    },
                    
                    "fetched_at": datetime.now(timezone.utc).isoformat()
                }
                
        except Exception as e:
            logger.error(f"Instagram content analysis error: {e}")
            return {"success": False, "error": str(e)}
    
    async def analyze_youtube_content(self, channel_identifier: str) -> Dict[str, Any]:
        """
        Deep content performance analysis for YouTube.
        Returns: best videos, engagement patterns, upload frequency.
        """
        if not self.youtube_api_key:
            return {"success": False, "error": "YouTube API not configured"}
        
        try:
            # First get channel info
            channel_info = await self.get_youtube_channel(channel_identifier)
            if not channel_info.get("success"):
                return channel_info
            
            channel_id = channel_info.get("channel_id")
            subscribers = channel_info.get("metrics", {}).get("subscribers", 0)
            
            # Get recent videos
            videos_result = await self.get_youtube_recent_videos(channel_id, limit=25)
            if not videos_result.get("success"):
                return videos_result
            
            videos = videos_result.get("videos", [])
            if not videos:
                return {"success": False, "error": "No videos found"}
            
            # Analyze videos
            videos_analysis = []
            upload_hours = {}
            upload_days = {}
            
            for video in videos:
                metrics = video.get("metrics", {})
                views = int(metrics.get("views", 0))
                likes = int(metrics.get("likes", 0))
                comments = int(metrics.get("comments", 0))
                
                # Calculate engagement rate (likes + comments / views)
                engagement_rate = ((likes + comments) / views * 100) if views > 0 else 0
                
                video_data = {
                    "id": video.get("id"),
                    "title": video.get("title"),
                    "views": views,
                    "likes": likes,
                    "comments": comments,
                    "engagement_rate": round(engagement_rate, 2),
                    "published_at": video.get("published_at"),
                    "url": video.get("url")
                }
                videos_analysis.append(video_data)
                
                # Extract upload time patterns
                published = video.get("published_at", "")
                if published:
                    try:
                        dt = datetime.fromisoformat(published.replace("Z", "+00:00"))
                        hour = dt.hour
                        day = dt.strftime("%A")
                        
                        upload_hours[hour] = upload_hours.get(hour, 0) + 1
                        upload_days[day] = upload_days.get(day, 0) + 1
                    except:
                        pass
            
            # Sort by views
            videos_analysis.sort(key=lambda x: x["views"], reverse=True)
            
            # Calculate upload frequency
            total_videos = len(videos)
            if total_videos >= 2:
                try:
                    first_video = datetime.fromisoformat(videos[-1].get("published_at", "").replace("Z", "+00:00"))
                    last_video = datetime.fromisoformat(videos[0].get("published_at", "").replace("Z", "+00:00"))
                    days_span = (last_video - first_video).days or 1
                    videos_per_week = round((total_videos / days_span) * 7, 1)
                except:
                    videos_per_week = None
            else:
                videos_per_week = None
            
            # Peak upload times
            sorted_hours = sorted(upload_hours.items(), key=lambda x: x[1], reverse=True)[:3]
            peak_hours = [f"{h}:00" for h, _ in sorted_hours] if sorted_hours else []
            
            sorted_days = sorted(upload_days.items(), key=lambda x: x[1], reverse=True)[:3]
            best_days = [d for d, _ in sorted_days] if sorted_days else []
            
            # Consistency score
            if videos_per_week:
                if videos_per_week >= 3:
                    consistency_score = 95
                elif videos_per_week >= 1:
                    consistency_score = 75
                elif videos_per_week >= 0.5:
                    consistency_score = 55
                else:
                    consistency_score = 35
            else:
                consistency_score = None
            
            return {
                "success": True,
                "channel_id": channel_id,
                "channel_name": channel_info.get("name"),
                "subscribers": subscribers,
                "total_videos_analyzed": total_videos,
                
                "best_performing_videos": videos_analysis[:5],
                "worst_performing_videos": videos_analysis[-3:] if len(videos_analysis) > 3 else [],
                
                "upload_frequency": {
                    "videos_per_week": videos_per_week,
                    "consistency_score": consistency_score,
                    "consistency_rating": (
                        "Excellent" if consistency_score and consistency_score >= 80 else
                        "Good" if consistency_score and consistency_score >= 55 else
                        "Needs Improvement" if consistency_score else "Unknown"
                    )
                },
                
                "peak_upload_times": {
                    "best_hours": peak_hours,
                    "best_days": best_days,
                    "recommendation": f"Upload on {best_days[0] if best_days else 'weekdays'} around {peak_hours[0] if peak_hours else '17:00'}"
                },
                
                "overall_stats": {
                    "avg_views": round(sum(v["views"] for v in videos_analysis) / len(videos_analysis)) if videos_analysis else 0,
                    "avg_likes": round(sum(v["likes"] for v in videos_analysis) / len(videos_analysis)) if videos_analysis else 0,
                    "avg_comments": round(sum(v["comments"] for v in videos_analysis) / len(videos_analysis)) if videos_analysis else 0,
                    "avg_engagement_rate": round(sum(v["engagement_rate"] for v in videos_analysis) / len(videos_analysis), 2) if videos_analysis else 0,
                    "highest_views": videos_analysis[0]["views"] if videos_analysis else 0,
                    "lowest_views": videos_analysis[-1]["views"] if videos_analysis else 0
                },
                
                "fetched_at": datetime.now(timezone.utc).isoformat()
            }
            
        except Exception as e:
            logger.error(f"YouTube content analysis error: {e}")
            return {"success": False, "error": str(e)}


# Singleton instance
_analytics_service: Optional[InfluencerAnalyticsService] = None

def get_analytics_service() -> InfluencerAnalyticsService:
    """Get or create analytics service instance"""
    global _analytics_service
    if _analytics_service is None:
        _analytics_service = InfluencerAnalyticsService()
    return _analytics_service
