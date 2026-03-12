"""
Social Listening Crawler Service
Crawls public data from various sources for brand/keyword monitoring.

Sources:
1. Google Custom Search - Web/News mentions
2. YouTube Data API - Video mentions
3. Reddit API - Community discussions
4. RSS/News Feeds - News aggregation
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

logger = logging.getLogger(__name__)

# API Keys from environment
GOOGLE_SEARCH_API_KEY = os.environ.get("GOOGLE_SEARCH_API_KEY")
GOOGLE_SEARCH_ENGINE_ID = os.environ.get("GOOGLE_SEARCH_ENGINE_ID")
YOUTUBE_API_KEY = os.environ.get("YOUTUBE_API_KEY")

# Reddit API (public, no auth needed for read)
REDDIT_USER_AGENT = "SevoraBot/1.0 (Social Listening)"

# News RSS Feeds to monitor
NEWS_RSS_FEEDS = [
    {"name": "Google News", "url": "https://news.google.com/rss/search?q={query}&hl=en-US&gl=US&ceid=US:en"},
    {"name": "Bing News", "url": "https://www.bing.com/news/search?q={query}&format=rss"},
    {"name": "Yahoo News", "url": "https://news.search.yahoo.com/rss?p={query}"},
]

# Simple sentiment analysis keywords
POSITIVE_WORDS = {'great', 'amazing', 'excellent', 'love', 'best', 'awesome', 'fantastic', 'wonderful', 
                  'brilliant', 'perfect', 'good', 'happy', 'positive', 'success', 'recommend', 'innovative'}
NEGATIVE_WORDS = {'bad', 'terrible', 'awful', 'hate', 'worst', 'horrible', 'poor', 'disappointing',
                  'fail', 'scam', 'fraud', 'broken', 'useless', 'waste', 'avoid', 'negative', 'problem'}


class SocialCrawler:
    """Crawler for social listening data collection"""
    
    def __init__(self, db):
        self.db = db
        self.session: Optional[aiohttp.ClientSession] = None
    
    async def __aenter__(self):
        self.session = aiohttp.ClientSession()
        return self
    
    async def __aexit__(self, exc_type, exc_val, exc_tb):
        if self.session:
            await self.session.close()
    
    def analyze_sentiment(self, text: str) -> str:
        """Simple keyword-based sentiment analysis"""
        if not text:
            return "neutral"
        
        text_lower = text.lower()
        words = set(re.findall(r'\b\w+\b', text_lower))
        
        positive_count = len(words & POSITIVE_WORDS)
        negative_count = len(words & NEGATIVE_WORDS)
        
        if positive_count > negative_count + 1:
            return "positive"
        elif negative_count > positive_count + 1:
            return "negative"
        return "neutral"
    
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
                        mentions.append({
                            "platform": "web",
                            "source": "google_search",
                            "title": item.get("title", ""),
                            "content": item.get("snippet", ""),
                            "url": item.get("link", ""),
                            "author": {"name": item.get("displayLink", "Unknown")},
                            "published_at": None,  # Google doesn't provide exact date
                            "sentiment": self.analyze_sentiment(item.get("snippet", "")),
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
        """Search news RSS feeds"""
        mentions = []
        
        for feed_config in NEWS_RSS_FEEDS:
            try:
                feed_url = feed_config["url"].format(query=quote_plus(keyword))
                
                async with self.session.get(feed_url, timeout=aiohttp.ClientTimeout(total=10)) as resp:
                    if resp.status == 200:
                        content = await resp.text()
                        feed = feedparser.parse(content)
                        
                        for entry in feed.entries[:10]:  # Limit per feed
                            published = None
                            if hasattr(entry, 'published_parsed') and entry.published_parsed:
                                published = datetime(*entry.published_parsed[:6], tzinfo=timezone.utc).isoformat()
                            
                            mentions.append({
                                "platform": "news",
                                "source": feed_config["name"].lower().replace(" ", "_"),
                                "title": entry.get("title", ""),
                                "content": entry.get("summary", "")[:500],
                                "url": entry.get("link", ""),
                                "author": {"name": entry.get("author", feed_config["name"])},
                                "published_at": published,
                                "sentiment": self.analyze_sentiment(entry.get("title", "") + " " + entry.get("summary", "")),
                                "reach": 0,
                                "engagement": 0
                            })
            except asyncio.TimeoutError:
                logger.warning(f"RSS feed timeout: {feed_config['name']}")
            except Exception as e:
                logger.error(f"RSS feed error ({feed_config['name']}): {str(e)}")
        
        return mentions
    
    async def crawl_keyword(self, keyword_doc: Dict) -> Dict[str, Any]:
        """Crawl all sources for a single keyword"""
        keyword = keyword_doc.get("keyword", "")
        keyword_id = keyword_doc.get("keyword_id", "")
        platforms = keyword_doc.get("platforms", [])
        
        if not keyword:
            return {"keyword_id": keyword_id, "mentions_found": 0, "error": "No keyword"}
        
        all_mentions = []
        
        # Determine which platforms to search
        search_all = not platforms or "all" in platforms
        
        # Google Web Search
        if search_all or "web" in platforms:
            web_mentions = await self.search_google(keyword)
            all_mentions.extend(web_mentions)
        
        # YouTube
        if search_all or "youtube" in platforms:
            youtube_mentions = await self.search_youtube(keyword)
            all_mentions.extend(youtube_mentions)
        
        # Reddit
        if search_all or "reddit" in platforms:
            reddit_mentions = await self.search_reddit(keyword)
            all_mentions.extend(reddit_mentions)
        
        # News RSS
        if search_all or "news" in platforms:
            news_mentions = await self.search_news_rss(keyword)
            all_mentions.extend(news_mentions)
        
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
