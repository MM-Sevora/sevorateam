"""
Test Social Webhooks - Engagement Tracking
Tests webhook receiver endpoints for real-time engagement tracking:
- GET /api/social/webhooks/config - webhook URLs and setup instructions
- GET /api/social/webhooks/verify/{platform} - verification endpoints
- POST /api/social/webhooks/events/{platform} - event receivers
- POST /api/social/webhooks/test/{platform} - simulate events
- GET /api/social/webhooks/events - list received events
- GET /api/social/webhooks/engagement/summary - aggregated stats
- GET /api/social/webhooks/engagement/{platform_post_id} - post engagement
"""
import pytest
import requests
import os
import json

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')


class TestSocialWebhooksAuth:
    """Test authentication for protected endpoints"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Get auth token"""
        login_response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "superadmin@sevora.com",
            "password": "superadmin123"
        })
        assert login_response.status_code == 200, f"Login failed: {login_response.text}"
        self.token = login_response.json()["access_token"]
        self.headers = {"Authorization": f"Bearer {self.token}"}
    
    def test_get_webhook_config(self):
        """GET /api/social/webhooks/config - returns webhook URLs and setup instructions"""
        response = requests.get(f"{BASE_URL}/api/social/webhooks/config", headers=self.headers)
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        
        # Should have configs array
        assert "configs" in data, "Missing 'configs' key"
        configs = data["configs"]
        assert len(configs) == 5, f"Expected 5 platform configs, got {len(configs)}"
        
        # Verify all 5 platforms are present
        platforms = [c["platform"] for c in configs]
        expected_platforms = ["linkedin", "twitter", "instagram", "facebook", "youtube"]
        for platform in expected_platforms:
            assert platform in platforms, f"Missing platform: {platform}"
        
        # Verify each config has required fields
        for config in configs:
            assert "verify_url" in config, f"Missing verify_url for {config['platform']}"
            assert "events_url" in config, f"Missing events_url for {config['platform']}"
            assert "events_subscribed" in config, f"Missing events_subscribed for {config['platform']}"
            assert "setup_instructions" in config, f"Missing setup_instructions for {config['platform']}"
            
            # Check setup_instructions structure
            setup = config["setup_instructions"]
            assert "steps" in setup, f"Missing steps in setup_instructions for {config['platform']}"
            assert "docs_url" in setup, f"Missing docs_url in setup_instructions for {config['platform']}"
        
        print(f"PASS: Webhook config returned 5 platforms with URLs and setup instructions")
    
    def test_get_webhook_events_list(self):
        """GET /api/social/webhooks/events - returns list of received events"""
        response = requests.get(f"{BASE_URL}/api/social/webhooks/events", headers=self.headers)
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        
        assert "events" in data, "Missing 'events' key"
        assert "total" in data, "Missing 'total' key"
        assert isinstance(data["events"], list), "events should be a list"
        
        print(f"PASS: Events list returned {data['total']} total events")
    
    def test_get_engagement_summary(self):
        """GET /api/social/webhooks/engagement/summary - returns aggregated stats"""
        response = requests.get(f"{BASE_URL}/api/social/webhooks/engagement/summary", headers=self.headers)
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        
        # Check required fields
        assert "period" in data, "Missing 'period' key"
        assert "total_events" in data, "Missing 'total_events' key"
        assert "by_type" in data, "Missing 'by_type' key"
        assert "by_platform" in data, "Missing 'by_platform' key"
        
        print(f"PASS: Engagement summary returned for period {data['period']} with {data['total_events']} events")
    
    def test_get_engagement_summary_with_period(self):
        """GET /api/social/webhooks/engagement/summary?period=30d - test period filter"""
        response = requests.get(f"{BASE_URL}/api/social/webhooks/engagement/summary?period=30d", headers=self.headers)
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        
        assert data["period"] == "30d", f"Expected period=30d, got {data['period']}"
        print(f"PASS: Engagement summary with 30d period filter works")
    
    def test_get_engagement_summary_with_platform_filter(self):
        """GET /api/social/webhooks/engagement/summary?platform=linkedin - test platform filter"""
        response = requests.get(f"{BASE_URL}/api/social/webhooks/engagement/summary?platform=linkedin", headers=self.headers)
        assert response.status_code == 200, f"Failed: {response.text}"
        print(f"PASS: Engagement summary with platform filter works")
    
    def test_get_post_engagement(self):
        """GET /api/social/webhooks/engagement/{platform_post_id} - returns engagement for specific post"""
        # Test with a non-existent post ID (should return default values)
        response = requests.get(f"{BASE_URL}/api/social/webhooks/engagement/test_post_123", headers=self.headers)
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        
        # Should have engagement stats
        assert "platform_post_id" in data, "Missing platform_post_id"
        assert "likes" in data, "Missing likes"
        assert "comments" in data, "Missing comments"
        assert "shares" in data, "Missing shares"
        
        print(f"PASS: Post engagement endpoint returns data")


class TestWebhookVerification:
    """Test webhook verification endpoints (no auth required - called by platforms)"""
    
    def test_verify_linkedin_webhook(self):
        """GET /api/social/webhooks/verify/linkedin - challenge-response verification"""
        challenge = "test_challenge_123"
        response = requests.get(f"{BASE_URL}/api/social/webhooks/verify/linkedin?challenge={challenge}")
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        
        assert "challenge" in data, "Missing challenge in response"
        assert data["challenge"] == challenge, "Challenge value mismatch"
        
        print(f"PASS: LinkedIn webhook verification returns challenge")
    
    def test_verify_twitter_webhook(self):
        """GET /api/social/webhooks/verify/twitter - CRC verification"""
        crc_token = "test_crc_token_456"
        response = requests.get(f"{BASE_URL}/api/social/webhooks/verify/twitter?crc_token={crc_token}")
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        
        assert "response_token" in data, "Missing response_token"
        assert data["response_token"].startswith("sha256="), "Invalid response_token format"
        
        print(f"PASS: Twitter webhook CRC verification works")
    
    def test_verify_instagram_webhook(self):
        """GET /api/social/webhooks/verify/instagram - Meta hub verification"""
        response = requests.get(
            f"{BASE_URL}/api/social/webhooks/verify/instagram",
            params={
                "hub.mode": "subscribe",
                "hub.challenge": "12345",
                "hub.verify_token": "sevora_webhook_verify"
            }
        )
        assert response.status_code == 200, f"Failed: {response.text}"
        # Instagram returns the challenge as int
        assert response.text == "12345", f"Expected 12345, got {response.text}"
        
        print(f"PASS: Instagram webhook verification works")
    
    def test_verify_facebook_webhook(self):
        """GET /api/social/webhooks/verify/facebook - Meta hub verification"""
        response = requests.get(
            f"{BASE_URL}/api/social/webhooks/verify/facebook",
            params={
                "hub.mode": "subscribe",
                "hub.challenge": "67890",
                "hub.verify_token": "sevora_webhook_verify"
            }
        )
        assert response.status_code == 200, f"Failed: {response.text}"
        assert response.text == "67890", f"Expected 67890, got {response.text}"
        
        print(f"PASS: Facebook webhook verification works")
    
    def test_verify_youtube_webhook(self):
        """GET /api/social/webhooks/verify/youtube - PubSubHubbub verification"""
        challenge = "youtube_challenge_abc"
        response = requests.get(
            f"{BASE_URL}/api/social/webhooks/verify/youtube",
            params={"hub.challenge": challenge}
        )
        assert response.status_code == 200, f"Failed: {response.text}"
        # YouTube returns the challenge as string
        assert challenge in response.text, f"Expected challenge in response"
        
        print(f"PASS: YouTube webhook verification works")
    
    def test_verify_instagram_invalid_token(self):
        """Test Instagram webhook verification with invalid token should fail"""
        response = requests.get(
            f"{BASE_URL}/api/social/webhooks/verify/instagram",
            params={
                "hub.mode": "subscribe",
                "hub.challenge": "12345",
                "hub.verify_token": "wrong_token"
            }
        )
        assert response.status_code == 403, f"Expected 403, got {response.status_code}"
        
        print(f"PASS: Instagram webhook rejects invalid verify token")


class TestWebhookEventReceivers:
    """Test webhook event receiver endpoints (simulating platform POSTs)"""
    
    def test_receive_linkedin_event(self):
        """POST /api/social/webhooks/events/linkedin - receive LinkedIn event"""
        event_payload = {
            "type": "LIKE",
            "object": {"id": "linkedin_post_001"},
            "actor": "urn:li:person:abc123",
            "actorName": "Test User"
        }
        response = requests.post(
            f"{BASE_URL}/api/social/webhooks/events/linkedin",
            json=event_payload,
            headers={"Content-Type": "application/json"}
        )
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        
        assert data["status"] == "received", "Expected status=received"
        assert "processed" in data, "Missing processed count"
        
        print(f"PASS: LinkedIn event received, processed {data['processed']} events")
    
    def test_receive_twitter_event(self):
        """POST /api/social/webhooks/events/twitter - receive Twitter event"""
        event_payload = {
            "favorite": [{
                "id_str": "twitter_post_001",
                "user": {
                    "id_str": "user_123",
                    "screen_name": "testuser",
                    "name": "Test User"
                }
            }]
        }
        response = requests.post(
            f"{BASE_URL}/api/social/webhooks/events/twitter",
            json=event_payload,
            headers={"Content-Type": "application/json"}
        )
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        
        assert data["status"] == "received", "Expected status=received"
        
        print(f"PASS: Twitter event received, processed {data['processed']} events")
    
    def test_receive_instagram_event(self):
        """POST /api/social/webhooks/events/instagram - receive Instagram event"""
        event_payload = {
            "entry": [{
                "id": "ig_page_123",
                "time": 1640000000,
                "changes": [{
                    "field": "comments",
                    "value": {
                        "media_id": "ig_media_001",
                        "from": {"id": "ig_user_456", "username": "instagramuser"},
                        "text": "Great post!"
                    }
                }]
            }]
        }
        response = requests.post(
            f"{BASE_URL}/api/social/webhooks/events/instagram",
            json=event_payload,
            headers={"Content-Type": "application/json"}
        )
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        
        assert data["status"] == "received", "Expected status=received"
        
        print(f"PASS: Instagram event received, processed {data['processed']} events")
    
    def test_receive_facebook_event(self):
        """POST /api/social/webhooks/events/facebook - receive Facebook event"""
        event_payload = {
            "entry": [{
                "id": "fb_page_123",
                "time": 1640000000,
                "changes": [{
                    "field": "feed",
                    "value": {
                        "post_id": "fb_post_001",
                        "from": {"id": "fb_user_789", "name": "Facebook User"},
                        "item": "comment",
                        "message": "Nice!"
                    }
                }]
            }]
        }
        response = requests.post(
            f"{BASE_URL}/api/social/webhooks/events/facebook",
            json=event_payload,
            headers={"Content-Type": "application/json"}
        )
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        
        assert data["status"] == "received", "Expected status=received"
        
        print(f"PASS: Facebook event received, processed {data['processed']} events")
    
    def test_receive_youtube_event(self):
        """POST /api/social/webhooks/events/youtube - receive YouTube event"""
        event_payload = {
            "video_id": "yt_video_001",
            "channel_id": "yt_channel_123",
            "channel_title": "Test Channel",
            "video.liked": True,
            "like_count_delta": 1
        }
        response = requests.post(
            f"{BASE_URL}/api/social/webhooks/events/youtube",
            json=event_payload,
            headers={"Content-Type": "application/json"}
        )
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        
        assert data["status"] == "received", "Expected status=received"
        
        print(f"PASS: YouTube event received")


class TestSimulateWebhookEvents:
    """Test event simulation endpoints (requires auth)"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Get auth token"""
        login_response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "superadmin@sevora.com",
            "password": "superadmin123"
        })
        assert login_response.status_code == 200, f"Login failed: {login_response.text}"
        self.token = login_response.json()["access_token"]
        self.headers = {"Authorization": f"Bearer {self.token}"}
    
    def test_simulate_linkedin_like(self):
        """POST /api/social/webhooks/test/linkedin - simulate LinkedIn event"""
        response = requests.post(
            f"{BASE_URL}/api/social/webhooks/test/linkedin?event_type=post_like",
            headers=self.headers
        )
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        
        assert data["success"] is True, "Expected success=True"
        assert "event_id" in data, "Missing event_id"
        assert "event" in data, "Missing event details"
        assert data["event"]["type"] == "post_like", "Wrong event type"
        
        print(f"PASS: Simulated LinkedIn post_like event, ID: {data['event_id']}")
    
    def test_simulate_twitter_comment(self):
        """POST /api/social/webhooks/test/twitter - simulate Twitter comment"""
        response = requests.post(
            f"{BASE_URL}/api/social/webhooks/test/twitter?event_type=post_comment",
            headers=self.headers
        )
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        
        assert data["success"] is True, "Expected success=True"
        assert data["event"]["type"] == "post_comment", "Wrong event type"
        
        print(f"PASS: Simulated Twitter post_comment event")
    
    def test_simulate_instagram_share(self):
        """POST /api/social/webhooks/test/instagram - simulate Instagram share"""
        response = requests.post(
            f"{BASE_URL}/api/social/webhooks/test/instagram?event_type=post_share",
            headers=self.headers
        )
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        
        assert data["success"] is True, "Expected success=True"
        
        print(f"PASS: Simulated Instagram post_share event")
    
    def test_simulate_facebook_follower(self):
        """POST /api/social/webhooks/test/facebook - simulate new follower"""
        response = requests.post(
            f"{BASE_URL}/api/social/webhooks/test/facebook?event_type=new_follower",
            headers=self.headers
        )
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        
        assert data["success"] is True, "Expected success=True"
        
        print(f"PASS: Simulated Facebook new_follower event")
    
    def test_simulate_youtube_mention(self):
        """POST /api/social/webhooks/test/youtube - simulate YouTube mention"""
        response = requests.post(
            f"{BASE_URL}/api/social/webhooks/test/youtube?event_type=mention",
            headers=self.headers
        )
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        
        assert data["success"] is True, "Expected success=True"
        
        print(f"PASS: Simulated YouTube mention event")
    
    def test_simulate_invalid_platform(self):
        """POST /api/social/webhooks/test/invalid_platform - should fail"""
        response = requests.post(
            f"{BASE_URL}/api/social/webhooks/test/invalid_platform?event_type=post_like",
            headers=self.headers
        )
        assert response.status_code == 400, f"Expected 400, got {response.status_code}"
        
        print(f"PASS: Invalid platform correctly rejected with 400")


class TestWebhookEventsListFilters:
    """Test events list with various filters"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Get auth token"""
        login_response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "superadmin@sevora.com",
            "password": "superadmin123"
        })
        assert login_response.status_code == 200, f"Login failed: {login_response.text}"
        self.token = login_response.json()["access_token"]
        self.headers = {"Authorization": f"Bearer {self.token}"}
    
    def test_get_events_with_platform_filter(self):
        """GET /api/social/webhooks/events?platform=linkedin"""
        response = requests.get(
            f"{BASE_URL}/api/social/webhooks/events?platform=linkedin",
            headers=self.headers
        )
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        
        # If there are events, they should all be from linkedin
        for event in data["events"]:
            assert event["platform"] == "linkedin", f"Expected linkedin, got {event['platform']}"
        
        print(f"PASS: Events filtered by platform=linkedin, got {len(data['events'])} events")
    
    def test_get_events_with_event_type_filter(self):
        """GET /api/social/webhooks/events?event_type=post_like"""
        response = requests.get(
            f"{BASE_URL}/api/social/webhooks/events?event_type=post_like",
            headers=self.headers
        )
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        
        # If there are events, they should all be post_like
        for event in data["events"]:
            assert event["event_type"] == "post_like", f"Expected post_like, got {event['event_type']}"
        
        print(f"PASS: Events filtered by event_type=post_like, got {len(data['events'])} events")
    
    def test_get_events_with_limit(self):
        """GET /api/social/webhooks/events?limit=5"""
        response = requests.get(
            f"{BASE_URL}/api/social/webhooks/events?limit=5",
            headers=self.headers
        )
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        
        assert len(data["events"]) <= 5, f"Expected max 5 events, got {len(data['events'])}"
        
        print(f"PASS: Events limited to 5, got {len(data['events'])} events")


class TestAuthenticationRequired:
    """Test that protected endpoints require authentication"""
    
    def test_config_requires_auth(self):
        """GET /api/social/webhooks/config without auth should fail"""
        response = requests.get(f"{BASE_URL}/api/social/webhooks/config")
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
        print(f"PASS: Config endpoint requires authentication")
    
    def test_events_list_requires_auth(self):
        """GET /api/social/webhooks/events without auth should fail"""
        response = requests.get(f"{BASE_URL}/api/social/webhooks/events")
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
        print(f"PASS: Events list endpoint requires authentication")
    
    def test_engagement_summary_requires_auth(self):
        """GET /api/social/webhooks/engagement/summary without auth should fail"""
        response = requests.get(f"{BASE_URL}/api/social/webhooks/engagement/summary")
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
        print(f"PASS: Engagement summary endpoint requires authentication")
    
    def test_simulate_event_requires_auth(self):
        """POST /api/social/webhooks/test/linkedin without auth should fail"""
        response = requests.post(f"{BASE_URL}/api/social/webhooks/test/linkedin?event_type=post_like")
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
        print(f"PASS: Simulate event endpoint requires authentication")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
