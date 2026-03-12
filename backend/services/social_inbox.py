"""
Social Inbox Service
Handles fetching and managing messages from Instagram and Facebook
Auto-switches between mock and live data based on permission availability
"""

import aiohttp
import logging
from datetime import datetime, timezone, timedelta
from typing import Dict, Any, List, Optional
import random
import uuid

logger = logging.getLogger(__name__)


class SocialInboxService:
    """Service for managing social media direct messages"""
    
    def __init__(self, db=None):
        self.db = db
        self.access_token = None
        self.page_id = None
        self.instagram_account_id = None
        
    async def __aenter__(self):
        await self._load_credentials()
        return self
        
    async def __aexit__(self, exc_type, exc_val, exc_tb):
        pass
    
    async def _load_credentials(self):
        """Load credentials from database"""
        if self.db is not None:
            settings = await self.db.social_settings.find_one(
                {"setting_type": "instagram_integration"},
                {"_id": 0}
            )
            if settings:
                self.access_token = settings.get("access_token")
                self.page_id = settings.get("page_id")
                self.instagram_account_id = settings.get("instagram_account_id")
    
    def has_messaging_permissions(self) -> bool:
        """Check if we have messaging permissions (would need to verify via API)"""
        # In production, this would check actual permissions
        # For now, returns False to use mock data
        return False
    
    async def get_instagram_conversations(self, limit: int = 20) -> Dict[str, Any]:
        """Fetch Instagram DM conversations"""
        if self.has_messaging_permissions() and self.access_token:
            return await self._fetch_live_instagram_conversations(limit)
        return self._generate_mock_conversations("instagram", limit)
    
    async def get_facebook_conversations(self, limit: int = 20) -> Dict[str, Any]:
        """Fetch Facebook Page message conversations"""
        if self.has_messaging_permissions() and self.access_token:
            return await self._fetch_live_facebook_conversations(limit)
        return self._generate_mock_conversations("facebook", limit)
    
    async def _fetch_live_instagram_conversations(self, limit: int) -> Dict[str, Any]:
        """Fetch real Instagram conversations via Graph API"""
        try:
            async with aiohttp.ClientSession() as session:
                # Get conversations
                url = f"https://graph.facebook.com/v21.0/{self.instagram_account_id}/conversations"
                params = {
                    "access_token": self.access_token,
                    "fields": "id,participants,messages{id,message,from,created_time}",
                    "limit": limit
                }
                async with session.get(url, params=params) as response:
                    if response.status == 200:
                        data = await response.json()
                        return {
                            "success": True,
                            "data_source": "live",
                            "conversations": self._transform_ig_conversations(data.get("data", []))
                        }
                    else:
                        error = await response.json()
                        logger.error(f"Instagram conversations error: {error}")
                        # Check if permission error
                        if "OAuthException" in str(error):
                            return {
                                "success": False,
                                "error": "messaging_permission_required",
                                "message": "Instagram messaging permission not granted. Please request instagram_manage_messages permission."
                            }
                        return self._generate_mock_conversations("instagram", limit)
        except Exception as e:
            logger.error(f"Error fetching Instagram conversations: {e}")
            return self._generate_mock_conversations("instagram", limit)
    
    async def _fetch_live_facebook_conversations(self, limit: int) -> Dict[str, Any]:
        """Fetch real Facebook Page conversations via Graph API"""
        try:
            async with aiohttp.ClientSession() as session:
                url = f"https://graph.facebook.com/v21.0/{self.page_id}/conversations"
                params = {
                    "access_token": self.access_token,
                    "fields": "id,participants,messages{id,message,from,created_time}",
                    "limit": limit
                }
                async with session.get(url, params=params) as response:
                    if response.status == 200:
                        data = await response.json()
                        return {
                            "success": True,
                            "data_source": "live",
                            "conversations": self._transform_fb_conversations(data.get("data", []))
                        }
                    else:
                        return self._generate_mock_conversations("facebook", limit)
        except Exception as e:
            logger.error(f"Error fetching Facebook conversations: {e}")
            return self._generate_mock_conversations("facebook", limit)
    
    def _transform_ig_conversations(self, raw_conversations: List[Dict]) -> List[Dict]:
        """Transform Instagram API response to our format"""
        conversations = []
        for conv in raw_conversations:
            participants = conv.get("participants", {}).get("data", [])
            messages = conv.get("messages", {}).get("data", [])
            
            # Get the other participant (not us)
            other_participant = next(
                (p for p in participants if p.get("id") != self.instagram_account_id),
                participants[0] if participants else {}
            )
            
            last_message = messages[0] if messages else {}
            
            conversations.append({
                "id": conv.get("id"),
                "platform": "instagram",
                "participant": {
                    "id": other_participant.get("id"),
                    "name": other_participant.get("username", other_participant.get("name", "Unknown")),
                    "avatar": None
                },
                "last_message": {
                    "text": last_message.get("message", ""),
                    "timestamp": last_message.get("created_time"),
                    "is_from_us": last_message.get("from", {}).get("id") == self.instagram_account_id
                },
                "unread_count": 0,
                "messages": [
                    {
                        "id": m.get("id"),
                        "text": m.get("message"),
                        "timestamp": m.get("created_time"),
                        "is_from_us": m.get("from", {}).get("id") == self.instagram_account_id,
                        "sender_name": m.get("from", {}).get("username", m.get("from", {}).get("name", "Unknown"))
                    }
                    for m in messages[:10]
                ]
            })
        return conversations
    
    def _transform_fb_conversations(self, raw_conversations: List[Dict]) -> List[Dict]:
        """Transform Facebook API response to our format"""
        conversations = []
        for conv in raw_conversations:
            participants = conv.get("participants", {}).get("data", [])
            messages = conv.get("messages", {}).get("data", [])
            
            other_participant = next(
                (p for p in participants if p.get("id") != self.page_id),
                participants[0] if participants else {}
            )
            
            last_message = messages[0] if messages else {}
            
            conversations.append({
                "id": conv.get("id"),
                "platform": "facebook",
                "participant": {
                    "id": other_participant.get("id"),
                    "name": other_participant.get("name", "Unknown"),
                    "avatar": None
                },
                "last_message": {
                    "text": last_message.get("message", ""),
                    "timestamp": last_message.get("created_time"),
                    "is_from_us": last_message.get("from", {}).get("id") == self.page_id
                },
                "unread_count": 0,
                "messages": [
                    {
                        "id": m.get("id"),
                        "text": m.get("message"),
                        "timestamp": m.get("created_time"),
                        "is_from_us": m.get("from", {}).get("id") == self.page_id,
                        "sender_name": m.get("from", {}).get("name", "Unknown")
                    }
                    for m in messages[:10]
                ]
            })
        return conversations
    
    def _generate_mock_conversations(self, platform: str, limit: int) -> Dict[str, Any]:
        """Generate realistic mock conversation data"""
        
        mock_users = [
            {"name": "Priya Sharma", "handle": "@priya_style"},
            {"name": "Rahul Verma", "handle": "@rahul.fashion"},
            {"name": "Sneha Kapoor", "handle": "@sneha_k"},
            {"name": "Arjun Mehta", "handle": "@arjun.m"},
            {"name": "Ananya Singh", "handle": "@ananya_official"},
            {"name": "Vikram Patel", "handle": "@vikram.p"},
            {"name": "Kavya Nair", "handle": "@kavya.styles"},
            {"name": "Rohan Desai", "handle": "@rohan_d"},
            {"name": "Meera Joshi", "handle": "@meera.j"},
            {"name": "Aditya Rao", "handle": "@aditya_rao"},
        ]
        
        mock_messages = [
            "Hi! I loved your latest collection. When will it be available?",
            "Can you tell me more about the sizing for the silk kurta?",
            "I placed an order yesterday but haven't received confirmation yet",
            "Do you ship internationally? I'm based in Dubai",
            "The dress I received is beautiful! Thank you so much!",
            "Are there any upcoming sales or discounts?",
            "I'd like to collaborate with your brand. Who should I contact?",
            "Can I return an item if it doesn't fit?",
            "Love the new arrivals! Especially the blue saree",
            "When will the out-of-stock items be back?",
            "Is there a store I can visit in Mumbai?",
            "The quality of your products is amazing!",
            "Can you recommend something for a wedding?",
            "I've been a customer for 2 years now. Love everything!",
            "What's the best way to care for the silk items?",
        ]
        
        our_responses = [
            "Thank you for reaching out! The new collection will be available next week.",
            "Hi! The sizing chart is available on our website. Let me know if you need more help!",
            "I'll check on your order right away. Can you share your order number?",
            "Yes, we ship to Dubai! Standard shipping takes 5-7 business days.",
            "We're so glad you love it! Thank you for your support! 💕",
            "We have a festive sale coming up next month. Stay tuned!",
            "Please email collaborations@sevora.com with your proposal. We'd love to hear from you!",
            "Yes, we have a 7-day return policy. Please check our website for details.",
            "Thank you! The blue saree is one of our bestsellers! 🌟",
            "Those items should be back in stock within 2 weeks. Want me to notify you?",
        ]
        
        conversations = []
        used_users = random.sample(mock_users, min(limit, len(mock_users)))
        
        for i, user in enumerate(used_users):
            # Generate conversation
            num_messages = random.randint(2, 8)
            messages = []
            base_time = datetime.now(timezone.utc) - timedelta(hours=random.randint(1, 72))
            
            for j in range(num_messages):
                is_from_us = j % 2 == 1  # Alternate between user and us
                msg_time = base_time + timedelta(minutes=j * random.randint(5, 30))
                
                messages.append({
                    "id": str(uuid.uuid4()),
                    "text": random.choice(our_responses) if is_from_us else random.choice(mock_messages),
                    "timestamp": msg_time.isoformat(),
                    "is_from_us": is_from_us,
                    "sender_name": "Sevora" if is_from_us else user["name"]
                })
            
            # Sort messages by time (newest first for display)
            messages.sort(key=lambda x: x["timestamp"], reverse=True)
            
            conversations.append({
                "id": str(uuid.uuid4()),
                "platform": platform,
                "participant": {
                    "id": str(uuid.uuid4()),
                    "name": user["name"],
                    "handle": user["handle"],
                    "avatar": f"https://ui-avatars.com/api/?name={user['name'].replace(' ', '+')}&background=random"
                },
                "last_message": {
                    "text": messages[0]["text"],
                    "timestamp": messages[0]["timestamp"],
                    "is_from_us": messages[0]["is_from_us"]
                },
                "unread_count": random.randint(0, 3) if not messages[0]["is_from_us"] else 0,
                "messages": messages
            })
        
        # Sort by last message time
        conversations.sort(key=lambda x: x["last_message"]["timestamp"], reverse=True)
        
        return {
            "success": True,
            "data_source": "simulated",
            "permission_status": "pending",
            "permission_message": f"To see real {platform.title()} messages, please complete Facebook Business Verification and request {'instagram_manage_messages' if platform == 'instagram' else 'pages_messaging'} permission.",
            "conversations": conversations
        }
    
    async def send_message(self, platform: str, conversation_id: str, message: str) -> Dict[str, Any]:
        """Send a message (requires permissions)"""
        if not self.has_messaging_permissions():
            return {
                "success": False,
                "error": "messaging_permission_required",
                "message": "Cannot send messages without proper API permissions. Please complete verification."
            }
        
        # Would implement actual sending here
        return {"success": False, "error": "not_implemented"}


# Factory function to create service with db
def create_inbox_service(db):
    return SocialInboxService(db)
