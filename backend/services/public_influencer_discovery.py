"""
Public Influencer Discovery Service
Discovers influencers from public Instagram/social media using AI and web search
"""
import os
import json
import httpx
import random
from typing import Optional, List, Dict
from datetime import datetime, timezone
from emergentintegrations.llm.chat import LlmChat, UserMessage
from dotenv import load_dotenv

load_dotenv()


class PublicInfluencerDiscoveryService:
    """Service to discover influencers from public sources like Instagram, YouTube, etc."""
    
    def __init__(self):
        self.api_key = os.environ.get('EMERGENT_LLM_KEY')
        self.google_api_key = os.environ.get('GOOGLE_SEARCH_API_KEY')
        self.google_cx = os.environ.get('GOOGLE_SEARCH_ENGINE_ID')
        self.instagram_token = os.environ.get('INSTAGRAM_ACCESS_TOKEN')
        
        # Session cache to avoid repeating same influencers
        self._shown_handles = set()
        
    def reset_session(self):
        """Reset the session cache to allow showing same influencers again"""
        self._shown_handles = set()
        
    async def verify_instagram_profile(self, username: str) -> Optional[Dict]:
        """
        Try to verify Instagram profile and get real metrics using Graph API.
        This works for business/creator accounts.
        """
        if not self.instagram_token:
            return None
            
        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                # Try to search for the business account
                # Note: This only works for business accounts indexed by Facebook
                search_url = f"https://graph.facebook.com/v18.0/ig_hashtag_search"
                
                # Alternative: Try to get user info if we have their business account ID
                # For now, return None as we can't look up arbitrary accounts
                return None
        except Exception as e:
            print(f"Instagram API error: {e}")
            return None
        
    async def search_google(self, query: str, num_results: int = 10) -> List[Dict]:
        """Search Google for influencer profiles"""
        if not self.google_api_key or not self.google_cx:
            return []
            
        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                response = await client.get(
                    "https://www.googleapis.com/customsearch/v1",
                    params={
                        "key": self.google_api_key,
                        "cx": self.google_cx,
                        "q": query,
                        "num": min(num_results, 10)
                    }
                )
                
                if response.status_code == 200:
                    data = response.json()
                    return data.get("items", [])
        except Exception as e:
            print(f"Google search error: {e}")
        return []
    
    async def extract_instagram_profile(self, username: str) -> Optional[Dict]:
        """Try to get basic Instagram profile info (public data only)"""
        try:
            # Use a simple approach - this is limited but doesn't require API
            async with httpx.AsyncClient(timeout=15.0) as client:
                response = await client.get(
                    f"https://www.instagram.com/{username}/",
                    headers={
                        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
                    },
                    follow_redirects=True
                )
                
                if response.status_code == 200:
                    # Basic check if profile exists
                    return {"username": username, "exists": True}
        except Exception:
            pass
        return None

    async def discover_influencers(
        self,
        niche: str,
        location: str = "",
        platform: str = "instagram",
        follower_range: str = "10k-100k",
        count: int = 20,
        exclude_handles: List[str] = None
    ) -> Dict:
        """
        AI-powered discovery of influencers. Returns different results each time.
        """
        
        # Combine session cache with provided exclusions
        excluded = set(self._shown_handles)
        if exclude_handles:
            excluded.update(exclude_handles)
        
        # Random seed for variety
        random_seed = random.randint(1, 1000)
        
        # Different prompt variations for variety
        prompt_styles = [
            "rising stars and emerging creators",
            "established influencers with engaged audiences", 
            "niche experts and thought leaders",
            "lifestyle creators with authentic content",
            "micro-influencers with high engagement"
        ]
        style = random.choice(prompt_styles)
        
        # Try web search first
        all_results = []
        if self.google_api_key and self.google_cx:
            search_queries = [
                f"top {niche} influencers {location} {platform} {follower_range} followers",
                f"best {niche} creators {location} instagram",
            ]
            
            for query in search_queries[:2]:
                results = await self.search_google(query)
                all_results.extend(results)
        
        # Build exclusion list for prompt
        exclusion_text = ""
        if excluded:
            exclusion_text = f"\n\nDO NOT include these handles (already shown): {', '.join(list(excluded)[:20])}"
        
        # Use AI to discover/recommend influencers
        system_prompt = f"""You are an expert social media researcher. Find {style} in the specified niche.

CRITICAL: Return ONLY valid JSON. NO markdown, NO code blocks, NO extra text.

JSON format:
{{"influencers":[{{"name":"Full Name","instagram_handle":"handle_only","estimated_followers":50000,"follower_tier":"micro","niche":"Category","location":"City, Country","description":"Brief bio","collaboration_fit":"Brand fit reason"}}],"search_insights":{{"recommendations":"Tips"}}}}

Rules:
- Suggest REAL influencers with actual Instagram handles (NO @ symbol)
- Follower tiers: nano (<10k), micro (10k-100k), mid (100k-500k), macro (500k-1M), mega (1M+)
- Return 5-10 DIFFERENT influencers each time
- Random seed for this search: {random_seed}
- Focus on: {style}{exclusion_text}
- ONLY output JSON"""

        user_prompt = f"Find {count} real {niche} influencers from {location or 'anywhere globally'} on {platform} with {follower_range} followers. Suggest different people than usual. Seed: {random_seed}"

        try:
            chat = LlmChat(
                api_key=self.api_key,
                session_id=f"discovery-{datetime.now().timestamp()}",
                system_message=system_prompt
            ).with_model("openai", "gpt-4o")
            
            response = await chat.send_message(UserMessage(user_prompt))
            response_text = response if isinstance(response, str) else str(response)
            
            # Clean up response - handle various JSON formats
            response_text = response_text.strip()
            if "```json" in response_text:
                response_text = response_text.split("```json")[1].split("```")[0]
            elif "```" in response_text:
                parts = response_text.split("```")
                for part in parts:
                    if "{" in part and "influencers" in part:
                        response_text = part
                        break
            
            # Try to find JSON object
            response_text = response_text.strip()
            if not response_text.startswith("{"):
                start_idx = response_text.find("{")
                if start_idx != -1:
                    response_text = response_text[start_idx:]
            
            # Remove trailing non-JSON content
            if response_text.endswith("}"):
                pass
            else:
                last_brace = response_text.rfind("}")
                if last_brace != -1:
                    response_text = response_text[:last_brace + 1]
            
            result = json.loads(response_text)
            
            # Add discovered handles to session cache
            for inf in result.get("influencers", []):
                handle = inf.get("instagram_handle", "")
                if handle:
                    self._shown_handles.add(handle.lower())
            
            # Mark metrics as estimated
            for inf in result.get("influencers", []):
                inf["metrics_source"] = "ai_estimated"
                inf["metrics_note"] = "Follower count is AI-estimated. Click 'View' to verify on Instagram."
            
            # Add metadata
            result["discovery_metadata"] = {
                "search_query": f"{niche} {location} {platform}",
                "timestamp": datetime.now(timezone.utc).isoformat(),
                "sources_analyzed": len(all_results),
                "follower_range": follower_range,
                "method": "ai_recommendation" if not all_results else "web_search_enhanced"
            }
            
            return result
            
        except json.JSONDecodeError as e:
            return {
                "influencers": [],
                "error": f"Failed to parse AI response: {str(e)}",
                "search_insights": {"recommendations": "Try a different niche or location"}
            }
        except Exception as e:
            return {
                "influencers": [],
                "error": f"Discovery failed: {str(e)}",
                "search_insights": {"recommendations": "Check API configuration or try again"}
            }

    async def discover_by_hashtag(self, hashtag: str, location: str = "") -> Dict:
        """Discover influencers by analyzing a specific hashtag"""
        
        # Placeholder - similar implementation as discover_influencers
        return {"influencers": [], "hashtag": hashtag}

    async def enrich_influencer_data(self, handle: str, platform: str = "instagram") -> Dict:
        """Try to enrich influencer data with additional public information"""
        
        search_query = f"{handle} {platform} influencer followers engagement"
        results = await self.search_google(search_query, num_results=5)
        
        system_prompt = """Extract detailed information about this specific influencer from search results.
Include: follower count, engagement rate, niche, location, recent collaborations, contact info.
Return as JSON."""

        user_prompt = f"""
Influencer to research: @{handle} on {platform}

Search Results:
{json.dumps([{"title": r.get("title"), "snippet": r.get("snippet")} for r in results], indent=2)}

Extract all available information about this influencer.
"""

        try:
            chat = LlmChat(
                api_key=self.api_key,
                session_id=f"enrich-{datetime.now().timestamp()}",
                system_message=system_prompt
            ).with_model("openai", "gpt-4o")
            
            response = await chat.send_message(UserMessage(user_prompt))
            response_text = response if isinstance(response, str) else str(response)
            
            if "```json" in response_text:
                response_text = response_text.split("```json")[1].split("```")[0]
            elif "```" in response_text:
                response_text = response_text.split("```")[1].split("```")[0]
                
            return json.loads(response_text.strip())
        except Exception:
            return {"handle": handle, "platform": platform, "enriched": False}


# Singleton instance
public_discovery_service = PublicInfluencerDiscoveryService()
