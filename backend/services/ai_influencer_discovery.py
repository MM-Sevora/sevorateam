"""
AI-Powered Influencer Discovery Service
Uses GPT-4o to suggest influencers, then verifies with real Instagram/YouTube APIs
"""

import os
import json
import logging
import aiohttp
import uuid
from typing import List, Dict, Any, Optional

logger = logging.getLogger(__name__)


class AIInfluencerDiscoveryService:
    """Service for AI-powered influencer discovery with real API verification"""
    
    def __init__(self):
        self.instagram_token = os.environ.get('INSTAGRAM_ACCESS_TOKEN')
        self.youtube_api_key = os.environ.get('YOUTUBE_API_KEY')
        
    async def discover_influencers(
        self,
        industry: str,
        platform: str = "instagram",
        objective: str = "brand_awareness",
        city: Optional[str] = None,
        follower_range: Optional[Dict] = None,
        additional_requirements: str = "",
        limit: int = 10
    ) -> Dict[str, Any]:
        """
        Main discovery flow:
        1. Use AI to suggest influencer handles
        2. Verify each handle with real APIs
        3. Return only verified influencers with real metrics
        """
        
        # Step 1: Get AI suggestions
        ai_suggestions = await self._get_ai_suggestions(
            industry=industry,
            platform=platform,
            objective=objective,
            city=city,
            follower_range=follower_range,
            additional_requirements=additional_requirements,
            count=limit * 3  # Request more since some may not verify
        )
        
        if not ai_suggestions:
            return {
                "success": False,
                "message": "AI could not generate suggestions",
                "influencers": []
            }
        
        # Step 2: Verify each suggestion with real APIs IN PARALLEL
        import asyncio
        
        async def verify_single(suggestion, platform_type):
            """Verify a single suggestion"""
            handle = suggestion.get("handle", "").replace("@", "").strip()
            if not handle:
                return None
                
            verified = None
            if platform_type == "instagram":
                verified = await self._verify_instagram_handle(handle)
            elif platform_type == "youtube":
                verified = await self._verify_youtube_channel(handle)
            
            if verified:
                verified["ai_reason"] = suggestion.get("reason", "")
                verified["match_score"] = suggestion.get("match_score", 75)
            return verified
        
        # Create verification tasks for all suggestions in parallel
        tasks = []
        for suggestion in ai_suggestions:
            if platform.lower() in ["instagram", "both"]:
                tasks.append(verify_single(suggestion, "instagram"))
            if platform.lower() in ["youtube", "both"]:
                tasks.append(verify_single(suggestion, "youtube"))
        
        # Run all verifications in parallel (limit concurrency to avoid rate limits)
        verified_influencers = []
        if tasks:
            # Process in batches of 5 to avoid overwhelming APIs
            batch_size = 5
            for i in range(0, len(tasks), batch_size):
                batch = tasks[i:i + batch_size]
                results = await asyncio.gather(*batch, return_exceptions=True)
                for result in results:
                    if result and not isinstance(result, Exception):
                        verified_influencers.append(result)
                    if len(verified_influencers) >= limit:
                        break
                if len(verified_influencers) >= limit:
                    break
        
        return {
            "success": True,
            "message": f"Found {len(verified_influencers)} verified influencers",
            "ai_suggestions_count": len(ai_suggestions),
            "verified_count": len(verified_influencers),
            "influencers": verified_influencers
        }
    
    async def _get_ai_suggestions(
        self,
        industry: str,
        platform: str,
        objective: str,
        city: Optional[str],
        follower_range: Optional[Dict],
        additional_requirements: str,
        count: int
    ) -> List[Dict]:
        """Use GPT-4o to suggest influencer handles"""
        
        try:
            try:
                from emergentintegrations.llm.chat import LlmChat, UserMessage
            except ImportError:
                return []
            
            follower_desc = ""
            if follower_range:
                min_f = follower_range.get("min", 10000)
                max_f = follower_range.get("max", 1000000)
                follower_desc = f"with {min_f:,} to {max_f:,} followers"
            
            location_desc = f"based in {city}" if city and city != "All Cities" else "based in India"
            
            prompt = f"""You are an influencer marketing expert. Suggest {count} real {platform} influencer handles for a {objective} campaign.

Requirements:
- Industry/Niche: {industry}
- Location: {location_desc}
- Follower Range: {follower_desc}
- Additional: {additional_requirements}

IMPORTANT: 
- Only suggest REAL influencers with active public accounts
- Focus on Indian influencers for {industry} niche
- Include a mix of micro, mid-tier, and macro influencers
- Provide their EXACT handle (username) as it appears on {platform}

Return JSON array with this format:
[
  {{
    "handle": "exact_username_without_@",
    "name": "Full Name",
    "reason": "Why they're a good fit (1 sentence)",
    "match_score": 85,
    "estimated_followers": "100K-500K",
    "content_style": "lifestyle, fashion, etc"
  }}
]

Only return the JSON array, no other text."""

            llm = LlmChat(
                api_key=os.environ.get("EMERGENT_LLM_KEY") or os.environ.get("EMERGENT_API_KEY") or os.environ.get("OPENAI_API_KEY"),
                session_id=f"influencer_discovery_{uuid.uuid4()}",
                system_message="You are an influencer marketing expert who helps brands discover relevant influencers."
            ).with_model("openai", "gpt-4o")
            
            response = await llm.send_message(UserMessage(text=prompt))
            
            # Parse JSON from response (response is a string directly)
            content = response.strip() if isinstance(response, str) else str(response).strip()
            # Handle markdown code blocks
            if "```json" in content:
                content = content.split("```json")[1].split("```")[0]
            elif "```" in content:
                content = content.split("```")[1].split("```")[0]
            
            suggestions = json.loads(content)
            return suggestions if isinstance(suggestions, list) else []
            
        except Exception as e:
            logger.error(f"AI suggestion error: {e}")
            return []
    
    async def _verify_instagram_handle(self, handle: str) -> Optional[Dict]:
        """Verify Instagram handle and get real metrics"""
        
        if not self.instagram_token:
            logger.warning("No Instagram token configured")
            return None
            
        try:
            async with aiohttp.ClientSession() as session:
                # Search for business account by username
                # Note: Instagram Graph API requires business discovery
                url = f"https://graph.facebook.com/v21.0/ig_hashtag_search"
                
                # Try to get user info via business discovery
                # This requires the ig_business_account_id
                
                # Alternative: Use the basic display API or scraping service
                # For now, we'll use a different approach - searching by username
                
                # Get our IG account ID first
                me_url = f"https://graph.facebook.com/v21.0/me/accounts"
                params = {"access_token": self.instagram_token}
                
                async with session.get(me_url, params=params) as response:
                    if response.status != 200:
                        return None
                    data = await response.json()
                    
                    if not data.get("data"):
                        return None
                    
                    page_id = data["data"][0].get("id")
                    
                # Get Instagram business account
                ig_url = f"https://graph.facebook.com/v21.0/{page_id}"
                params = {
                    "fields": "instagram_business_account",
                    "access_token": self.instagram_token
                }
                
                async with session.get(ig_url, params=params) as response:
                    if response.status != 200:
                        return None
                    data = await response.json()
                    ig_account_id = data.get("instagram_business_account", {}).get("id")
                    
                if not ig_account_id:
                    return None
                
                # Use business discovery to search for the handle
                discovery_url = f"https://graph.facebook.com/v21.0/{ig_account_id}"
                params = {
                    "fields": f"business_discovery.username({handle}){{username,name,biography,followers_count,follows_count,media_count,profile_picture_url,media.limit(12){{like_count,comments_count}}}}",
                    "access_token": self.instagram_token
                }
                
                async with session.get(discovery_url, params=params) as response:
                    if response.status != 200:
                        error_data = await response.json()
                        logger.debug(f"Instagram discovery failed for {handle}: {error_data}")
                        return None
                    
                    data = await response.json()
                    discovery = data.get("business_discovery")
                    
                    if not discovery:
                        return None
                    
                    # Calculate engagement rate from recent posts
                    engagement_rate = 0
                    media = discovery.get("media", {}).get("data", [])
                    if media and discovery.get("followers_count", 0) > 0:
                        total_engagement = sum(
                            (m.get("like_count", 0) + m.get("comments_count", 0)) 
                            for m in media
                        )
                        engagement_rate = (total_engagement / len(media) / discovery["followers_count"]) * 100
                    
                    return {
                        "platform": "instagram",
                        "handle": discovery.get("username"),
                        "name": discovery.get("name") or discovery.get("username"),
                        "bio": discovery.get("biography", ""),
                        "followers": discovery.get("followers_count", 0),
                        "following": discovery.get("follows_count", 0),
                        "posts": discovery.get("media_count", 0),
                        "engagement_rate": round(engagement_rate, 2),
                        "profile_picture": discovery.get("profile_picture_url"),
                        "verified": True,
                        "data_source": "instagram_api"
                    }
                    
        except Exception as e:
            logger.error(f"Instagram verification error for {handle}: {e}")
            return None
    
    async def _verify_youtube_channel(self, handle: str) -> Optional[Dict]:
        """Verify YouTube channel and get real metrics"""
        
        if not self.youtube_api_key:
            logger.warning("No YouTube API key configured")
            return None
            
        try:
            async with aiohttp.ClientSession() as session:
                # Search for channel by handle/username
                search_url = "https://www.googleapis.com/youtube/v3/search"
                params = {
                    "part": "snippet",
                    "q": handle,
                    "type": "channel",
                    "maxResults": 1,
                    "key": self.youtube_api_key
                }
                
                async with session.get(search_url, params=params) as response:
                    if response.status != 200:
                        return None
                    data = await response.json()
                    
                    if not data.get("items"):
                        return None
                    
                    channel_id = data["items"][0]["id"]["channelId"]
                    snippet = data["items"][0]["snippet"]
                
                # Get detailed channel stats
                channel_url = "https://www.googleapis.com/youtube/v3/channels"
                params = {
                    "part": "statistics,snippet,brandingSettings",
                    "id": channel_id,
                    "key": self.youtube_api_key
                }
                
                async with session.get(channel_url, params=params) as response:
                    if response.status != 200:
                        return None
                    data = await response.json()
                    
                    if not data.get("items"):
                        return None
                    
                    channel = data["items"][0]
                    stats = channel.get("statistics", {})
                    snippet = channel.get("snippet", {})
                    
                    return {
                        "platform": "youtube",
                        "handle": snippet.get("customUrl", "").replace("@", "") or handle,
                        "name": snippet.get("title"),
                        "bio": snippet.get("description", "")[:200],
                        "followers": int(stats.get("subscriberCount", 0)),
                        "total_views": int(stats.get("viewCount", 0)),
                        "videos": int(stats.get("videoCount", 0)),
                        "engagement_rate": 0,  # Would need video stats to calculate
                        "profile_picture": snippet.get("thumbnails", {}).get("high", {}).get("url"),
                        "channel_id": channel_id,
                        "verified": True,
                        "data_source": "youtube_api"
                    }
                    
        except Exception as e:
            logger.error(f"YouTube verification error for {handle}: {e}")
            return None


# Singleton instance
_discovery_service = None

def get_discovery_service() -> AIInfluencerDiscoveryService:
    global _discovery_service
    if _discovery_service is None:
        _discovery_service = AIInfluencerDiscoveryService()
    return _discovery_service
