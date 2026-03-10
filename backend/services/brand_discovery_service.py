"""
AI Brand Discovery Service for Buying & Sourcing Module
Uses Google Custom Search API + OpenAI GPT-4o for intelligent brand discovery
"""
import os
import httpx
import json
import logging
from typing import List, Dict, Optional
from datetime import datetime, timezone
from emergentintegrations.llm.chat import LlmChat, UserMessage

logger = logging.getLogger(__name__)


class BrandDiscoveryService:
    """AI-powered brand discovery using Google Search + OpenAI analysis"""
    
    def __init__(self):
        self.google_api_key = os.environ.get('GOOGLE_SEARCH_API_KEY')
        self.google_cx = os.environ.get('GOOGLE_SEARCH_ENGINE_ID')
        self.llm_key = os.environ.get('EMERGENT_LLM_KEY')
    
    def is_configured(self) -> bool:
        """Check if AI service is configured (only needs LLM key for AI-only mode)"""
        return bool(self.llm_key)
    
    def google_search_configured(self) -> bool:
        """Check if Google Search is configured"""
        return bool(self.google_api_key and self.google_cx)
    
    async def search_brands(
        self,
        category: str,
        subcategories: List[str],
        segment: str,
        city: Optional[str] = None,
        count: int = 10
    ) -> List[Dict]:
        """
        Search for brands using Google Custom Search API
        """
        if not self.google_api_key or not self.google_cx:
            logger.warning("Google Search API not configured, skipping search")
            return []
        
        # Build search query
        query_parts = [category]
        if subcategories:
            query_parts.append(" OR ".join(subcategories[:3]))  # Limit subcategories
        if city:
            query_parts.append(city)
        query_parts.extend(["brand", "fashion", "designer", "India"])
        
        # Add segment-specific terms
        if segment == "Affordable Luxury":
            query_parts.append("premium")
        elif segment == "Luxury":
            query_parts.append("luxury high-end")
        elif segment == "Bridge to Luxury":
            query_parts.append("mid-premium")
        
        search_query = " ".join(query_parts)
        logger.info(f"Searching Google for: {search_query}")
        
        try:
            async with httpx.AsyncClient() as client:
                response = await client.get(
                    "https://www.googleapis.com/customsearch/v1",
                    params={
                        "key": self.google_api_key,
                        "cx": self.google_cx,
                        "q": search_query,
                        "num": min(count, 10),  # Google allows max 10 per request
                    },
                    timeout=30.0
                )
                
                if response.status_code != 200:
                    logger.error(f"Google Search API error: {response.status_code} - {response.text[:200]}")
                    return []
                
                data = response.json()
                items = data.get("items", [])
                
                # Extract basic brand info from search results
                brands = []
                for item in items:
                    brands.append({
                        "title": item.get("title", ""),
                        "link": item.get("link", ""),
                        "snippet": item.get("snippet", ""),
                        "display_link": item.get("displayLink", ""),
                        "image": item.get("pagemap", {}).get("cse_thumbnail", [{}])[0].get("src", "") if item.get("pagemap") else ""
                    })
                
                return brands
        
        except Exception as e:
            logger.error(f"Google Search error: {str(e)}")
            return []
    
    async def discover_brands_ai_only(
        self,
        category: str,
        subcategories: List[str],
        segment: str,
        city: Optional[str] = None,
        count: int = 10
    ) -> List[Dict]:
        """
        Use AI to generate brand suggestions based on knowledge
        This is a fallback when Google Search is not available
        """
        if not self.llm_key:
            logger.error("EMERGENT_LLM_KEY not configured")
            return []
        
        try:
            chat = LlmChat(
                api_key=self.llm_key,
                session_id=f"brand-discovery-{datetime.now(timezone.utc).strftime('%Y%m%d%H%M%S')}",
                system_message="""You are an expert fashion brand analyst with deep knowledge of Indian fashion brands. 
Your task is to suggest real fashion brands that match the given criteria.
Focus on identifying legitimate, established fashion brands in India.
Be accurate and only suggest brands you are confident exist."""
            ).with_model("openai", "gpt-4o")
            
            subcats_str = ", ".join(subcategories) if subcategories else "all types"
            city_str = f" from {city}" if city else " in India"
            
            prompt = f"""Suggest {count} real fashion brands for the following criteria:
- Category: {category}
- Subcategories: {subcats_str}
- Price Segment: {segment}
- Location: {city_str}

For each brand, provide:
1. Brand Name
2. Website URL (if known)
3. City/Location
4. Main Product Categories
5. Price Segment (Mass, Mass Premium, Bridge to Luxury, Affordable Luxury, Premium, Luxury)
6. Fit Score (0-100) based on how well they match the criteria
7. Brief Description (1-2 sentences)

Return ONLY valid JSON array format like:
[
  {{
    "name": "Brand Name",
    "website": "https://...",
    "city": "Mumbai",
    "categories": ["Womenswear", "Ethnic"],
    "segment": "Affordable Luxury",
    "fit_score": 75,
    "description": "Brief description"
  }}
]

Return ONLY the JSON array, no other text. If you're not sure about a brand, don't include it."""

            user_message = UserMessage(text=prompt)
            response = await chat.send_message(user_message)
            
            # Parse AI response
            response_text = response.strip()
            
            # Try to extract JSON from response
            if response_text.startswith("```"):
                response_text = response_text.replace("```json", "").replace("```", "").strip()
            
            try:
                brands = json.loads(response_text)
                if isinstance(brands, list):
                    for brand in brands:
                        brand["discovered_at"] = datetime.now(timezone.utc).isoformat()
                        brand["discovery_method"] = "ai_knowledge"
                        brand["search_category"] = category
                        brand["search_segment"] = segment
                    return brands
            except json.JSONDecodeError as e:
                logger.error(f"Failed to parse AI response as JSON: {e}")
                return []
        
        except Exception as e:
            logger.error(f"AI discovery error: {str(e)}")
            return []
    
    async def analyze_brands_with_ai(
        self,
        search_results: List[Dict],
        category: str,
        segment: str,
        city: Optional[str] = None
    ) -> List[Dict]:
        """
        Use AI to analyze and enrich brand information from search results
        """
        if not search_results:
            return []
        
        if not self.llm_key:
            logger.error("EMERGENT_LLM_KEY not configured")
            return []
        
        try:
            chat = LlmChat(
                api_key=self.llm_key,
                session_id=f"brand-analysis-{datetime.now(timezone.utc).strftime('%Y%m%d%H%M%S')}",
                system_message="""You are an expert fashion brand analyst for an Indian retail sourcing company. 
Your task is to analyze search results about fashion brands and extract structured information.
Focus on identifying legitimate fashion brands, their positioning, and contact potential.
Be concise and accurate. If information is not available, say "Unknown"."""
            ).with_model("openai", "gpt-4o")
            
            results_text = "\n\n".join([
                f"Result {i+1}:\nTitle: {r['title']}\nURL: {r['link']}\nDescription: {r['snippet']}"
                for i, r in enumerate(search_results)
            ])
            
            prompt = f"""Analyze these search results for {category} fashion brands in the {segment} segment{' from ' + city if city else ' in India'}.

SEARCH RESULTS:
{results_text}

For each result that appears to be a legitimate fashion brand (not a marketplace, news article, or retailer), extract:
1. Brand Name
2. Website URL
3. City/Location (if identifiable)
4. Product Categories
5. Price Segment Estimate
6. Fit Score (0-100)
7. Brief Description

Return ONLY valid JSON array format. If no legitimate brands found, return: []"""

            user_message = UserMessage(text=prompt)
            response = await chat.send_message(user_message)
            
            response_text = response.strip()
            if response_text.startswith("```"):
                response_text = response_text.replace("```json", "").replace("```", "").strip()
            
            try:
                brands = json.loads(response_text)
                if isinstance(brands, list):
                    for brand in brands:
                        brand["discovered_at"] = datetime.now(timezone.utc).isoformat()
                        brand["discovery_method"] = "ai_search"
                        brand["search_category"] = category
                        brand["search_segment"] = segment
                    return brands
            except json.JSONDecodeError as e:
                logger.error(f"Failed to parse AI response as JSON: {e}")
                return []
        
        except Exception as e:
            logger.error(f"AI analysis error: {str(e)}")
            return []
    
    async def discover_brands(
        self,
        category: str,
        subcategories: List[str],
        segment: str,
        city: Optional[str] = None,
        count: int = 10
    ) -> Dict:
        """
        Full brand discovery pipeline: Search -> AI Analysis -> Results
        Falls back to AI-only mode if Google Search is not configured
        """
        if not self.is_configured():
            return {
                "success": False,
                "error": "AI service not configured. Check EMERGENT_LLM_KEY.",
                "brands": []
            }
        
        # Try Google Search first
        search_results = []
        if self.google_search_configured():
            search_results = await self.search_brands(category, subcategories, segment, city, count)
        
        # If we have search results, analyze them with AI
        if search_results:
            analyzed_brands = await self.analyze_brands_with_ai(search_results, category, segment, city)
            return {
                "success": True,
                "mode": "search_and_analyze",
                "search_results_count": len(search_results),
                "analyzed_brands_count": len(analyzed_brands),
                "brands": analyzed_brands,
                "search_criteria": {
                    "category": category,
                    "subcategories": subcategories,
                    "segment": segment,
                    "city": city
                }
            }
        
        # Fallback to AI-only mode
        logger.info("Falling back to AI-only brand discovery")
        ai_brands = await self.discover_brands_ai_only(category, subcategories, segment, city, count)
        
        return {
            "success": True,
            "mode": "ai_knowledge",
            "search_results_count": 0,
            "analyzed_brands_count": len(ai_brands),
            "brands": ai_brands,
            "search_criteria": {
                "category": category,
                "subcategories": subcategories,
                "segment": segment,
                "city": city
            },
            "note": "Results generated from AI knowledge. Google Search not available."
        }


# Singleton instance
brand_discovery_service = BrandDiscoveryService()
