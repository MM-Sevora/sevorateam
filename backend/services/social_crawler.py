"""
Social Listening Crawler Service
Crawls public data from various sources for brand/keyword monitoring.

Sources:
1. Google Custom Search - Web/News mentions
2. YouTube Data API - Video mentions
3. Reddit API - Community discussions
4. RSS/News Feeds - News aggregation (General + Tech + Industry)
5. Hacker News API - Tech community discussions

Sentiment Analysis:
- VADER (Valence Aware Dictionary and sEntiment Reasoner) for social media text
- TextBlob as fallback for general text
"""

import os
import asyncio
import aiohttp
import feedparser
import logging
from datetime import datetime, timezone, timedelta
from typing import List, Dict, Any, Optional
import uuid
import re
from urllib.parse import quote_plus

# ML Sentiment Analysis
try:
    from vaderSentiment.vaderSentiment import SentimentIntensityAnalyzer
    VADER_AVAILABLE = True
except ImportError:
    VADER_AVAILABLE = False

try:
    from textblob import TextBlob
    TEXTBLOB_AVAILABLE = True
except ImportError:
    TEXTBLOB_AVAILABLE = False

logger = logging.getLogger(__name__)

# API Keys from environment
GOOGLE_SEARCH_API_KEY = os.environ.get("GOOGLE_SEARCH_API_KEY")
GOOGLE_SEARCH_ENGINE_ID = os.environ.get("GOOGLE_SEARCH_ENGINE_ID")
YOUTUBE_API_KEY = os.environ.get("YOUTUBE_API_KEY")

# Reddit API (public, no auth needed for read)
REDDIT_USER_AGENT = "SevoraBot/1.0 (Social Listening)"

# ============== EXPANDED NEWS RSS FEEDS ==============

# General News Sources
GENERAL_NEWS_FEEDS = [
    {"name": "Google News", "url": "https://news.google.com/rss/search?q={query}&hl=en-US&gl=US&ceid=US:en", "category": "general"},
    {"name": "Bing News", "url": "https://www.bing.com/news/search?q={query}&format=rss", "category": "general"},
    {"name": "Yahoo News", "url": "https://news.search.yahoo.com/rss?p={query}", "category": "general"},
]

# Tech News & Blogs
TECH_NEWS_FEEDS = [
    {"name": "TechCrunch", "url": "https://techcrunch.com/feed/", "category": "tech", "search_in_content": True},
    {"name": "The Verge", "url": "https://www.theverge.com/rss/index.xml", "category": "tech", "search_in_content": True},
    {"name": "Wired", "url": "https://www.wired.com/feed/rss", "category": "tech", "search_in_content": True},
    {"name": "Ars Technica", "url": "https://feeds.arstechnica.com/arstechnica/index", "category": "tech", "search_in_content": True},
    {"name": "VentureBeat", "url": "https://venturebeat.com/feed/", "category": "tech", "search_in_content": True},
    {"name": "MIT Tech Review", "url": "https://www.technologyreview.com/feed/", "category": "tech", "search_in_content": True},
    {"name": "ZDNet", "url": "https://www.zdnet.com/news/rss.xml", "category": "tech", "search_in_content": True},
    {"name": "Engadget", "url": "https://www.engadget.com/rss.xml", "category": "tech", "search_in_content": True},
    {"name": "Mashable", "url": "https://mashable.com/feeds/rss/all", "category": "tech", "search_in_content": True},
    {"name": "TechRadar", "url": "https://www.techradar.com/rss", "category": "tech", "search_in_content": True},
]

# Business & Industry Publications
BUSINESS_NEWS_FEEDS = [
    {"name": "Reuters Business", "url": "https://www.reutersagency.com/feed/?best-topics=business-finance&post_type=best", "category": "business", "search_in_content": True},
    {"name": "Bloomberg", "url": "https://feeds.bloomberg.com/markets/news.rss", "category": "business", "search_in_content": True},
    {"name": "Forbes", "url": "https://www.forbes.com/innovation/feed/", "category": "business", "search_in_content": True},
    {"name": "Business Insider", "url": "https://www.businessinsider.com/rss", "category": "business", "search_in_content": True},
    {"name": "Fast Company", "url": "https://www.fastcompany.com/latest/rss", "category": "business", "search_in_content": True},
    {"name": "Harvard Business Review", "url": "https://hbr.org/rss/topic/technology", "category": "business", "search_in_content": True},
]

# ============== INDUSTRY-SPECIFIC FEEDS ==============

# Finance & Fintech
FINANCE_FEEDS = [
    {"name": "CNBC", "url": "https://www.cnbc.com/id/100003114/device/rss/rss.html", "category": "finance", "search_in_content": True},
    {"name": "MarketWatch", "url": "https://feeds.marketwatch.com/marketwatch/topstories/", "category": "finance", "search_in_content": True},
    {"name": "Seeking Alpha", "url": "https://seekingalpha.com/feed.xml", "category": "finance", "search_in_content": True},
    {"name": "Finextra", "url": "https://www.finextra.com/rss/headlines.aspx", "category": "finance", "search_in_content": True},
    {"name": "PaymentsSource", "url": "https://www.paymentssource.com/feed", "category": "finance", "search_in_content": True},
    {"name": "The Motley Fool", "url": "https://www.fool.com/feeds/index.aspx", "category": "finance", "search_in_content": True},
]

# Healthcare & Biotech
HEALTHCARE_FEEDS = [
    {"name": "STAT News", "url": "https://www.statnews.com/feed/", "category": "healthcare", "search_in_content": True},
    {"name": "FiercePharma", "url": "https://www.fiercepharma.com/rss/xml", "category": "healthcare", "search_in_content": True},
    {"name": "Healthcare IT News", "url": "https://www.healthcareitnews.com/feed", "category": "healthcare", "search_in_content": True},
    {"name": "MedCity News", "url": "https://medcitynews.com/feed/", "category": "healthcare", "search_in_content": True},
    {"name": "Becker's Health IT", "url": "https://www.beckershospitalreview.com/healthcare-information-technology.feed", "category": "healthcare", "search_in_content": True},
    {"name": "Healthcare Dive", "url": "https://www.healthcaredive.com/feeds/news/", "category": "healthcare", "search_in_content": True},
]

# AI & Machine Learning
AI_ML_FEEDS = [
    {"name": "AI News", "url": "https://www.artificialintelligence-news.com/feed/", "category": "ai", "search_in_content": True},
    {"name": "VentureBeat AI", "url": "https://venturebeat.com/category/ai/feed/", "category": "ai", "search_in_content": True},
    {"name": "The Gradient", "url": "https://thegradient.pub/rss/", "category": "ai", "search_in_content": True},
    {"name": "Import AI", "url": "https://jack-clark.net/feed/", "category": "ai", "search_in_content": True},
    {"name": "Synced AI", "url": "https://syncedreview.com/feed/", "category": "ai", "search_in_content": True},
    {"name": "AI Trends", "url": "https://www.aitrends.com/feed/", "category": "ai", "search_in_content": True},
]

# Cybersecurity
CYBERSECURITY_FEEDS = [
    {"name": "Dark Reading", "url": "https://www.darkreading.com/rss.xml", "category": "cybersecurity", "search_in_content": True},
    {"name": "Krebs on Security", "url": "https://krebsonsecurity.com/feed/", "category": "cybersecurity", "search_in_content": True},
    {"name": "The Hacker News", "url": "https://feeds.feedburner.com/TheHackersNews", "category": "cybersecurity", "search_in_content": True},
    {"name": "Threatpost", "url": "https://threatpost.com/feed/", "category": "cybersecurity", "search_in_content": True},
    {"name": "SC Media", "url": "https://www.scmagazine.com/feed", "category": "cybersecurity", "search_in_content": True},
    {"name": "Security Week", "url": "https://feeds.feedburner.com/securityweek", "category": "cybersecurity", "search_in_content": True},
]

# Startups & Venture Capital
STARTUP_FEEDS = [
    {"name": "Crunchbase News", "url": "https://news.crunchbase.com/feed/", "category": "startups", "search_in_content": True},
    {"name": "TechStartups", "url": "https://techstartups.com/feed/", "category": "startups", "search_in_content": True},
    {"name": "EU-Startups", "url": "https://www.eu-startups.com/feed/", "category": "startups", "search_in_content": True},
    {"name": "SaaStr", "url": "https://www.saastr.com/feed/", "category": "startups", "search_in_content": True},
    {"name": "Both Sides of the Table", "url": "https://bothsidesofthetable.com/feed", "category": "startups", "search_in_content": True},
]

# Marketing & Advertising
MARKETING_FEEDS = [
    {"name": "AdAge", "url": "https://adage.com/rss/all", "category": "marketing", "search_in_content": True},
    {"name": "Marketing Week", "url": "https://www.marketingweek.com/feed/", "category": "marketing", "search_in_content": True},
    {"name": "Digiday", "url": "https://digiday.com/feed/", "category": "marketing", "search_in_content": True},
    {"name": "MarTech", "url": "https://martech.org/feed/", "category": "marketing", "search_in_content": True},
    {"name": "Social Media Today", "url": "https://www.socialmediatoday.com/rss.xml", "category": "marketing", "search_in_content": True},
    {"name": "Content Marketing Institute", "url": "https://contentmarketinginstitute.com/feed/", "category": "marketing", "search_in_content": True},
]

# E-commerce & Retail
ECOMMERCE_FEEDS = [
    {"name": "Retail Dive", "url": "https://www.retaildive.com/feeds/news/", "category": "ecommerce", "search_in_content": True},
    {"name": "Practical Ecommerce", "url": "https://www.practicalecommerce.com/feed", "category": "ecommerce", "search_in_content": True},
    {"name": "eMarketer", "url": "https://www.insiderintelligence.com/rss/", "category": "ecommerce", "search_in_content": True},
    {"name": "Digital Commerce 360", "url": "https://www.digitalcommerce360.com/feed/", "category": "ecommerce", "search_in_content": True},
    {"name": "Modern Retail", "url": "https://www.modernretail.co/feed/", "category": "ecommerce", "search_in_content": True},
]

# Crypto & Blockchain
CRYPTO_FEEDS = [
    {"name": "CoinDesk", "url": "https://www.coindesk.com/arc/outboundfeeds/rss/", "category": "crypto", "search_in_content": True},
    {"name": "The Block", "url": "https://www.theblock.co/rss.xml", "category": "crypto", "search_in_content": True},
    {"name": "Decrypt", "url": "https://decrypt.co/feed", "category": "crypto", "search_in_content": True},
    {"name": "Cointelegraph", "url": "https://cointelegraph.com/rss", "category": "crypto", "search_in_content": True},
    {"name": "Bitcoin Magazine", "url": "https://bitcoinmagazine.com/feed", "category": "crypto", "search_in_content": True},
]

# Enterprise & SaaS
ENTERPRISE_FEEDS = [
    {"name": "Enterprise Times", "url": "https://www.enterprisetimes.co.uk/feed/", "category": "enterprise", "search_in_content": True},
    {"name": "CIO", "url": "https://www.cio.com/index.rss", "category": "enterprise", "search_in_content": True},
    {"name": "InfoWorld", "url": "https://www.infoworld.com/index.rss", "category": "enterprise", "search_in_content": True},
    {"name": "ComputerWorld", "url": "https://www.computerworld.com/index.rss", "category": "enterprise", "search_in_content": True},
    {"name": "TechTarget", "url": "https://www.techtarget.com/rss/", "category": "enterprise", "search_in_content": True},
]

# Legal & Compliance
LEGAL_FEEDS = [
    {"name": "Above the Law", "url": "https://abovethelaw.com/feed/", "category": "legal", "search_in_content": True},
    {"name": "JD Supra", "url": "https://www.jdsupra.com/resources/syndication/", "category": "legal", "search_in_content": True},
    {"name": "Lexology", "url": "https://www.lexology.com/rss/", "category": "legal", "search_in_content": True},
]

# Energy & Sustainability
ENERGY_FEEDS = [
    {"name": "GreenBiz", "url": "https://www.greenbiz.com/rss.xml", "category": "energy", "search_in_content": True},
    {"name": "CleanTechnica", "url": "https://cleantechnica.com/feed/", "category": "energy", "search_in_content": True},
    {"name": "Utility Dive", "url": "https://www.utilitydive.com/feeds/news/", "category": "energy", "search_in_content": True},
    {"name": "Energy Monitor", "url": "https://www.energymonitor.ai/feed/", "category": "energy", "search_in_content": True},
]

# HR & Workforce
HR_FEEDS = [
    {"name": "HR Dive", "url": "https://www.hrdive.com/feeds/news/", "category": "hr", "search_in_content": True},
    {"name": "SHRM", "url": "https://www.shrm.org/rss/pages/rss.aspx", "category": "hr", "search_in_content": True},
    {"name": "HR Executive", "url": "https://hrexecutive.com/feed/", "category": "hr", "search_in_content": True},
    {"name": "People Matters", "url": "https://www.peoplematters.in/rss", "category": "hr", "search_in_content": True},
]

# All feeds combined (60+ sources)
ALL_RSS_FEEDS = (
    GENERAL_NEWS_FEEDS + 
    TECH_NEWS_FEEDS + 
    BUSINESS_NEWS_FEEDS +
    FINANCE_FEEDS +
    HEALTHCARE_FEEDS +
    AI_ML_FEEDS +
    CYBERSECURITY_FEEDS +
    STARTUP_FEEDS +
    MARKETING_FEEDS +
    ECOMMERCE_FEEDS +
    CRYPTO_FEEDS +
    ENTERPRISE_FEEDS +
    LEGAL_FEEDS +
    ENERGY_FEEDS +
    HR_FEEDS
)

# Category metadata for UI
FEED_CATEGORIES = {
    "general": {"label": "General News", "color": "#6B7280", "count": len(GENERAL_NEWS_FEEDS)},
    "tech": {"label": "Tech & Blogs", "color": "#8B5CF6", "count": len(TECH_NEWS_FEEDS)},
    "business": {"label": "Business", "color": "#3B82F6", "count": len(BUSINESS_NEWS_FEEDS)},
    "finance": {"label": "Finance & Fintech", "color": "#10B981", "count": len(FINANCE_FEEDS)},
    "healthcare": {"label": "Healthcare & Biotech", "color": "#EF4444", "count": len(HEALTHCARE_FEEDS)},
    "ai": {"label": "AI & Machine Learning", "color": "#F59E0B", "count": len(AI_ML_FEEDS)},
    "cybersecurity": {"label": "Cybersecurity", "color": "#1F2937", "count": len(CYBERSECURITY_FEEDS)},
    "startups": {"label": "Startups & VC", "color": "#EC4899", "count": len(STARTUP_FEEDS)},
    "marketing": {"label": "Marketing & Ads", "color": "#14B8A6", "count": len(MARKETING_FEEDS)},
    "ecommerce": {"label": "E-commerce & Retail", "color": "#F97316", "count": len(ECOMMERCE_FEEDS)},
    "crypto": {"label": "Crypto & Blockchain", "color": "#6366F1", "count": len(CRYPTO_FEEDS)},
    "enterprise": {"label": "Enterprise & SaaS", "color": "#0EA5E9", "count": len(ENTERPRISE_FEEDS)},
    "legal": {"label": "Legal & Compliance", "color": "#78716C", "count": len(LEGAL_FEEDS)},
    "energy": {"label": "Energy & Sustainability", "color": "#22C55E", "count": len(ENERGY_FEEDS)},
    "hr": {"label": "HR & Workforce", "color": "#A855F7", "count": len(HR_FEEDS)},
}


class MLSentimentAnalyzer:
    """
    ML-powered sentiment analysis using VADER and TextBlob.
    VADER is optimized for social media and news text.
    """
    
    def __init__(self):
        self.vader = SentimentIntensityAnalyzer() if VADER_AVAILABLE else None
        self.use_vader = VADER_AVAILABLE
        self.use_textblob = TEXTBLOB_AVAILABLE
        
        logger.info(f"Sentiment Analysis initialized - VADER: {VADER_AVAILABLE}, TextBlob: {TEXTBLOB_AVAILABLE}")
    
    def analyze(self, text: str) -> Dict[str, Any]:
        """
        Analyze sentiment of text using ML models.
        Returns sentiment label and confidence scores.
        """
        if not text or len(text.strip()) < 3:
            return {"sentiment": "neutral", "confidence": 0.0, "scores": {}}
        
        # Clean text
        text = self._clean_text(text)
        
        # Primary: Use VADER (best for social media/news)
        if self.use_vader and self.vader:
            return self._analyze_vader(text)
        
        # Fallback: Use TextBlob
        if self.use_textblob:
            return self._analyze_textblob(text)
        
        # Final fallback: Simple keyword matching
        return self._analyze_keywords(text)
    
    def _clean_text(self, text: str) -> str:
        """Clean text for analysis"""
        # Remove URLs
        text = re.sub(r'http\S+|www\S+', '', text)
        # Remove special characters but keep punctuation (important for VADER)
        text = re.sub(r'[^\w\s.,!?;:\'\"-]', '', text)
        return text.strip()
    
    def _analyze_vader(self, text: str) -> Dict[str, Any]:
        """
        VADER sentiment analysis.
        Compound score: -1 (most negative) to +1 (most positive)
        """
        scores = self.vader.polarity_scores(text)
        compound = scores['compound']
        
        # VADER recommended thresholds
        if compound >= 0.05:
            sentiment = "positive"
        elif compound <= -0.05:
            sentiment = "negative"
        else:
            sentiment = "neutral"
        
        # Calculate confidence (distance from neutral zone)
        confidence = min(abs(compound) / 0.5, 1.0)  # Normalize to 0-1
        
        return {
            "sentiment": sentiment,
            "confidence": round(confidence, 3),
            "scores": {
                "positive": round(scores['pos'], 3),
                "negative": round(scores['neg'], 3),
                "neutral": round(scores['neu'], 3),
                "compound": round(compound, 3)
            },
            "method": "vader"
        }
    
    def _analyze_textblob(self, text: str) -> Dict[str, Any]:
        """
        TextBlob sentiment analysis.
        Polarity: -1 (negative) to +1 (positive)
        Subjectivity: 0 (objective) to 1 (subjective)
        """
        blob = TextBlob(text)
        polarity = blob.sentiment.polarity
        subjectivity = blob.sentiment.subjectivity
        
        if polarity > 0.1:
            sentiment = "positive"
        elif polarity < -0.1:
            sentiment = "negative"
        else:
            sentiment = "neutral"
        
        confidence = min(abs(polarity) / 0.5, 1.0)
        
        return {
            "sentiment": sentiment,
            "confidence": round(confidence, 3),
            "scores": {
                "polarity": round(polarity, 3),
                "subjectivity": round(subjectivity, 3)
            },
            "method": "textblob"
        }
    
    def _analyze_keywords(self, text: str) -> Dict[str, Any]:
        """Fallback keyword-based sentiment (original method)"""
        POSITIVE_WORDS = {'great', 'amazing', 'excellent', 'love', 'best', 'awesome', 'fantastic', 
                         'wonderful', 'brilliant', 'perfect', 'good', 'happy', 'success', 'innovative'}
        NEGATIVE_WORDS = {'bad', 'terrible', 'awful', 'hate', 'worst', 'horrible', 'poor', 
                         'disappointing', 'fail', 'scam', 'fraud', 'broken', 'useless', 'problem'}
        
        text_lower = text.lower()
        words = set(re.findall(r'\b\w+\b', text_lower))
        
        positive_count = len(words & POSITIVE_WORDS)
        negative_count = len(words & NEGATIVE_WORDS)
        
        if positive_count > negative_count + 1:
            sentiment = "positive"
        elif negative_count > positive_count + 1:
            sentiment = "negative"
        else:
            sentiment = "neutral"
        
        return {
            "sentiment": sentiment,
            "confidence": 0.3,  # Low confidence for keyword method
            "scores": {"positive_keywords": positive_count, "negative_keywords": negative_count},
            "method": "keywords"
        }


# Global sentiment analyzer instance
_sentiment_analyzer = None

def get_sentiment_analyzer() -> MLSentimentAnalyzer:
    """Get or create global sentiment analyzer"""
    global _sentiment_analyzer
    if _sentiment_analyzer is None:
        _sentiment_analyzer = MLSentimentAnalyzer()
    return _sentiment_analyzer


class SocialCrawler:
    """Crawler for social listening data collection"""
    
    def __init__(self, db):
        self.db = db
        self.session: Optional[aiohttp.ClientSession] = None
        self.sentiment_analyzer = get_sentiment_analyzer()
    
    async def __aenter__(self):
        self.session = aiohttp.ClientSession()
        return self
    
    async def __aexit__(self, exc_type, exc_val, exc_tb):
        if self.session:
            await self.session.close()
    
    def analyze_sentiment(self, text: str) -> str:
        """
        Analyze sentiment using ML models (VADER/TextBlob).
        Returns just the sentiment label for backward compatibility.
        """
        result = self.sentiment_analyzer.analyze(text)
        return result["sentiment"]
    
    def analyze_sentiment_detailed(self, text: str) -> Dict[str, Any]:
        """
        Get detailed sentiment analysis with confidence scores.
        """
        return self.sentiment_analyzer.analyze(text)
    
    async def search_google(self, keyword: str, num_results: int = 10) -> List[Dict]:
        """Search Google Custom Search API for web mentions"""
        if not GOOGLE_SEARCH_API_KEY or not GOOGLE_SEARCH_ENGINE_ID:
            logger.warning("Google Search API not configured")
            return []
        
        mentions = []
        try:
            url = "https://www.googleapis.com/customsearch/v1"
            params = {
                "key": GOOGLE_SEARCH_API_KEY,
                "cx": GOOGLE_SEARCH_ENGINE_ID,
                "q": keyword,
                "num": min(num_results, 10),
                "dateRestrict": "d7",  # Last 7 days
                "sort": "date"
            }
            
            async with self.session.get(url, params=params) as resp:
                if resp.status == 200:
                    data = await resp.json()
                    items = data.get("items", [])
                    
                    for item in items:
                        text = item.get("title", "") + " " + item.get("snippet", "")
                        sentiment_result = self.analyze_sentiment_detailed(text)
                        
                        mentions.append({
                            "platform": "web",
                            "source": "google_search",
                            "title": item.get("title", ""),
                            "content": item.get("snippet", ""),
                            "url": item.get("link", ""),
                            "author": {"name": item.get("displayLink", "Unknown")},
                            "published_at": None,
                            "sentiment": sentiment_result["sentiment"],
                            "sentiment_confidence": sentiment_result.get("confidence", 0),
                            "sentiment_scores": sentiment_result.get("scores", {}),
                            "reach": 0,
                            "engagement": 0
                        })
                else:
                    logger.error(f"Google Search API error: {resp.status}")
        except Exception as e:
            logger.error(f"Google Search error: {str(e)}")
        
        return mentions
    
    async def search_youtube(self, keyword: str, max_results: int = 10) -> List[Dict]:
        """Search YouTube for video mentions"""
        if not YOUTUBE_API_KEY:
            logger.warning("YouTube API not configured")
            return []
        
        mentions = []
        try:
            url = "https://www.googleapis.com/youtube/v3/search"
            params = {
                "key": YOUTUBE_API_KEY,
                "q": keyword,
                "part": "snippet",
                "type": "video",
                "maxResults": max_results,
                "order": "date",
                "publishedAfter": (datetime.now(timezone.utc) - timedelta(days=7)).isoformat()
            }
            
            async with self.session.get(url, params=params) as resp:
                if resp.status == 200:
                    data = await resp.json()
                    items = data.get("items", [])
                    
                    for item in items:
                        snippet = item.get("snippet", {})
                        video_id = item.get("id", {}).get("videoId", "")
                        
                        mentions.append({
                            "platform": "youtube",
                            "source": "youtube_api",
                            "title": snippet.get("title", ""),
                            "content": snippet.get("description", ""),
                            "url": f"https://www.youtube.com/watch?v={video_id}" if video_id else "",
                            "thumbnail": snippet.get("thumbnails", {}).get("medium", {}).get("url"),
                            "author": {
                                "name": snippet.get("channelTitle", "Unknown"),
                                "id": snippet.get("channelId", "")
                            },
                            "published_at": snippet.get("publishedAt"),
                            "sentiment": self.analyze_sentiment(snippet.get("title", "") + " " + snippet.get("description", "")),
                            "reach": 0,  # Would need separate API call for view count
                            "engagement": 0
                        })
                else:
                    logger.error(f"YouTube API error: {resp.status}")
        except Exception as e:
            logger.error(f"YouTube search error: {str(e)}")
        
        return mentions
    
    async def search_reddit(self, keyword: str, limit: int = 25) -> List[Dict]:
        """Search Reddit for discussions (public API, no auth needed)"""
        mentions = []
        try:
            # Reddit's public JSON API
            url = "https://www.reddit.com/search.json"
            params = {
                "q": keyword,
                "sort": "new",
                "limit": limit,
                "t": "week"  # Last week
            }
            headers = {"User-Agent": REDDIT_USER_AGENT}
            
            async with self.session.get(url, params=params, headers=headers) as resp:
                if resp.status == 200:
                    data = await resp.json()
                    posts = data.get("data", {}).get("children", [])
                    
                    for post in posts:
                        post_data = post.get("data", {})
                        
                        mentions.append({
                            "platform": "reddit",
                            "source": "reddit_api",
                            "title": post_data.get("title", ""),
                            "content": post_data.get("selftext", "")[:500],  # Limit content
                            "url": f"https://reddit.com{post_data.get('permalink', '')}",
                            "subreddit": post_data.get("subreddit", ""),
                            "author": {
                                "name": post_data.get("author", "Unknown"),
                                "id": post_data.get("author_fullname", "")
                            },
                            "published_at": datetime.fromtimestamp(post_data.get("created_utc", 0), tz=timezone.utc).isoformat() if post_data.get("created_utc") else None,
                            "sentiment": self.analyze_sentiment(post_data.get("title", "") + " " + post_data.get("selftext", "")),
                            "reach": post_data.get("num_comments", 0) + post_data.get("score", 0),
                            "engagement": post_data.get("num_comments", 0),
                            "score": post_data.get("score", 0)
                        })
                elif resp.status == 429:
                    logger.warning("Reddit rate limited, waiting...")
                    await asyncio.sleep(60)
                else:
                    logger.error(f"Reddit API error: {resp.status}")
        except Exception as e:
            logger.error(f"Reddit search error: {str(e)}")
        
        return mentions
    
    async def search_news_rss(self, keyword: str) -> List[Dict]:
        """
        Search news RSS feeds from general, tech, and industry sources.
        Uses both query-based feeds and content filtering for static feeds.
        """
        mentions = []
        keyword_lower = keyword.lower()
        
        for feed_config in ALL_RSS_FEEDS:
            try:
                # For query-based feeds, inject the keyword
                if "{query}" in feed_config["url"]:
                    feed_url = feed_config["url"].format(query=quote_plus(keyword))
                else:
                    # For static feeds, we'll filter content locally
                    feed_url = feed_config["url"]
                
                async with self.session.get(feed_url, timeout=aiohttp.ClientTimeout(total=10)) as resp:
                    if resp.status == 200:
                        content = await resp.text()
                        feed = feedparser.parse(content)
                        
                        entries_processed = 0
                        for entry in feed.entries:
                            if entries_processed >= 5:  # Limit per feed
                                break
                            
                            title = entry.get("title", "")
                            summary = entry.get("summary", "")
                            
                            # For static feeds, filter by keyword presence
                            if feed_config.get("search_in_content"):
                                combined_text = (title + " " + summary).lower()
                                if keyword_lower not in combined_text:
                                    continue
                            
                            published = None
                            if hasattr(entry, 'published_parsed') and entry.published_parsed:
                                try:
                                    published = datetime(*entry.published_parsed[:6], tzinfo=timezone.utc).isoformat()
                                except Exception:
                                    pass
                            
                            text = title + " " + summary
                            sentiment_result = self.analyze_sentiment_detailed(text)
                            
                            mentions.append({
                                "platform": "news",
                                "source": feed_config["name"].lower().replace(" ", "_"),
                                "source_category": feed_config.get("category", "general"),
                                "title": title,
                                "content": summary[:500],
                                "url": entry.get("link", ""),
                                "author": {"name": entry.get("author", feed_config["name"])},
                                "published_at": published,
                                "sentiment": sentiment_result["sentiment"],
                                "sentiment_confidence": sentiment_result.get("confidence", 0),
                                "reach": 0,
                                "engagement": 0
                            })
                            entries_processed += 1
                            
            except asyncio.TimeoutError:
                logger.warning(f"RSS feed timeout: {feed_config['name']}")
            except Exception as e:
                logger.debug(f"RSS feed error ({feed_config['name']}): {str(e)}")
        
        return mentions
    
    async def search_hacker_news(self, keyword: str, limit: int = 15) -> List[Dict]:
        """
        Search Hacker News via Algolia API.
        Great for tech and startup discussions.
        """
        mentions = []
        try:
            url = "https://hn.algolia.com/api/v1/search_by_date"
            params = {
                "query": keyword,
                "tags": "story",
                "hitsPerPage": limit
            }
            
            async with self.session.get(url, params=params, timeout=aiohttp.ClientTimeout(total=10)) as resp:
                if resp.status == 200:
                    data = await resp.json()
                    hits = data.get("hits", [])
                    
                    for hit in hits:
                        title = hit.get("title", "")
                        
                        # Skip if no title
                        if not title:
                            continue
                        
                        sentiment_result = self.analyze_sentiment_detailed(title)
                        
                        mentions.append({
                            "platform": "hackernews",
                            "source": "hacker_news",
                            "source_category": "tech",
                            "title": title,
                            "content": "",
                            "url": hit.get("url") or f"https://news.ycombinator.com/item?id={hit.get('objectID', '')}",
                            "author": {"name": hit.get("author", "Unknown")},
                            "published_at": hit.get("created_at"),
                            "sentiment": sentiment_result["sentiment"],
                            "sentiment_confidence": sentiment_result.get("confidence", 0),
                            "reach": hit.get("points", 0),
                            "engagement": hit.get("num_comments", 0),
                            "hn_points": hit.get("points", 0)
                        })
        except Exception as e:
            logger.error(f"Hacker News error: {str(e)}")
        
        return mentions
    
    async def crawl_keyword(self, keyword_doc: Dict) -> Dict[str, Any]:
        """Crawl all sources for a single keyword"""
        keyword = keyword_doc.get("keyword", "")
        keyword_id = keyword_doc.get("keyword_id", "")
        platforms = keyword_doc.get("platforms", [])
        
        if not keyword:
            return {"keyword_id": keyword_id, "mentions_found": 0, "error": "No keyword"}
        
        all_mentions = []
        sources_searched = []
        
        # Determine which platforms to search
        search_all = not platforms or "all" in platforms
        
        # Google Web Search
        if search_all or "web" in platforms:
            web_mentions = await self.search_google(keyword)
            all_mentions.extend(web_mentions)
            sources_searched.append("google_search")
        
        # YouTube
        if search_all or "youtube" in platforms:
            youtube_mentions = await self.search_youtube(keyword)
            all_mentions.extend(youtube_mentions)
            sources_searched.append("youtube")
        
        # Reddit
        if search_all or "reddit" in platforms:
            reddit_mentions = await self.search_reddit(keyword)
            all_mentions.extend(reddit_mentions)
            sources_searched.append("reddit")
        
        # Hacker News (tech discussions)
        if search_all or "hackernews" in platforms or "tech" in platforms:
            hn_mentions = await self.search_hacker_news(keyword)
            all_mentions.extend(hn_mentions)
            sources_searched.append("hacker_news")
        
        # News RSS (General + Tech + Industry)
        if search_all or "news" in platforms:
            news_mentions = await self.search_news_rss(keyword)
            all_mentions.extend(news_mentions)
            sources_searched.append("news_rss")
        
        # Store mentions in database
        stored_count = 0
        sentiment_counts = {"positive": 0, "negative": 0, "neutral": 0}
        
        for mention in all_mentions:
            # Check for duplicates by URL
            existing = await self.db.listening_mentions.find_one({
                "keyword_id": keyword_id,
                "url": mention.get("url")
            })
            
            if existing:
                continue
            
            mention_doc = {
                "mention_id": str(uuid.uuid4()),
                "keyword_id": keyword_id,
                "keyword": keyword,
                **mention,
                "detected_at": datetime.now(timezone.utc).isoformat(),
                "processed": False
            }
            
            await self.db.listening_mentions.insert_one(mention_doc)
            stored_count += 1
            sentiment_counts[mention.get("sentiment", "neutral")] += 1
        
        # Update keyword stats
        if stored_count > 0:
            await self.db.listening_keywords.update_one(
                {"keyword_id": keyword_id},
                {
                    "$inc": {
                        "stats.total_mentions": stored_count,
                        "stats.positive_mentions": sentiment_counts["positive"],
                        "stats.negative_mentions": sentiment_counts["negative"],
                        "stats.neutral_mentions": sentiment_counts["neutral"]
                    },
                    "$set": {
                        "last_crawled": datetime.now(timezone.utc).isoformat(),
                        "updated_at": datetime.now(timezone.utc).isoformat()
                    }
                }
            )
            
            # Create alert for negative mentions
            if sentiment_counts["negative"] >= 3:
                alert_doc = {
                    "alert_id": str(uuid.uuid4()),
                    "type": "negative_mention",
                    "title": f"Negative mentions detected for '{keyword}'",
                    "message": f"Found {sentiment_counts['negative']} negative mentions in the last crawl.",
                    "keyword_id": keyword_id,
                    "priority": "high" if sentiment_counts["negative"] >= 5 else "medium",
                    "read": False,
                    "actioned": False,
                    "created_at": datetime.now(timezone.utc).isoformat()
                }
                await self.db.listening_alerts.insert_one(alert_doc)
        
        return {
            "keyword_id": keyword_id,
            "keyword": keyword,
            "mentions_found": stored_count,
            "sentiment_breakdown": sentiment_counts,
            "crawled_at": datetime.now(timezone.utc).isoformat()
        }
    
    async def crawl_all_keywords(self) -> Dict[str, Any]:
        """Crawl all active keywords"""
        keywords = await self.db.listening_keywords.find(
            {"status": "active"},
            {"_id": 0}
        ).to_list(100)
        
        if not keywords:
            return {"message": "No active keywords to crawl", "keywords_crawled": 0}
        
        results = []
        total_mentions = 0
        
        for keyword_doc in keywords:
            try:
                result = await self.crawl_keyword(keyword_doc)
                results.append(result)
                total_mentions += result.get("mentions_found", 0)
                
                # Rate limiting between keywords
                await asyncio.sleep(2)
            except Exception as e:
                logger.error(f"Error crawling keyword {keyword_doc.get('keyword')}: {str(e)}")
                results.append({
                    "keyword_id": keyword_doc.get("keyword_id"),
                    "keyword": keyword_doc.get("keyword"),
                    "error": str(e)
                })
        
        # Log crawl summary
        crawl_log = {
            "crawl_id": str(uuid.uuid4()),
            "crawled_at": datetime.now(timezone.utc).isoformat(),
            "keywords_crawled": len(keywords),
            "total_mentions_found": total_mentions,
            "results": results
        }
        await self.db.listening_crawl_logs.insert_one(crawl_log)
        
        return {
            "message": f"Crawled {len(keywords)} keywords",
            "keywords_crawled": len(keywords),
            "total_mentions_found": total_mentions,
            "results": results
        }


async def run_crawler(db) -> Dict[str, Any]:
    """Run the social crawler"""
    async with SocialCrawler(db) as crawler:
        return await crawler.crawl_all_keywords()


async def crawl_single_keyword(db, keyword_id: str) -> Dict[str, Any]:
    """Crawl a single keyword by ID"""
    keyword_doc = await db.listening_keywords.find_one({"keyword_id": keyword_id}, {"_id": 0})
    if not keyword_doc:
        return {"error": "Keyword not found"}
    
    async with SocialCrawler(db) as crawler:
        return await crawler.crawl_keyword(keyword_doc)
