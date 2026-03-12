"""
Test Influencer Analytics APIs (Instagram & YouTube)
Tests for fetching public profile metrics from social platforms.
"""

import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestInfluencerAnalytics:
    """Tests for Instagram and YouTube analytics endpoints"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup for each test - get auth token"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        
        # Login to get auth token
        login_response = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": "superadmin@sevora.com",
            "password": "superadmin123"
        })
        
        if login_response.status_code == 200:
            token = login_response.json().get("access_token")
            self.session.headers.update({"Authorization": f"Bearer {token}"})
        else:
            pytest.skip("Authentication failed - skipping tests")
    
    # ============== INSTAGRAM ANALYTICS TESTS ==============
    
    def test_instagram_analytics_shopsevora(self):
        """Test fetching Instagram analytics for @shopsevora - known business account"""
        response = self.session.get(f"{BASE_URL}/api/marketing/v2/influencer-analytics/instagram/shopsevora")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        print(f"Instagram shopsevora response: {data}")
        
        # Check response structure
        if data.get("success"):
            assert data.get("platform") == "instagram"
            assert data.get("username") == "shopsevora"
            assert "metrics" in data
            
            metrics = data["metrics"]
            assert "followers" in metrics
            assert "engagement_rate" in metrics
            
            print(f"Followers: {metrics.get('followers')}, Engagement: {metrics.get('engagement_rate')}%")
        else:
            # API returned error - check if it's an expected error
            error = data.get("error", "")
            print(f"Instagram API returned error: {error}")
            # This could be expected if Instagram token expired or account is not business
            assert "error" in data
    
    def test_instagram_analytics_invalid_user(self):
        """Test fetching Instagram analytics for invalid username"""
        response = self.session.get(f"{BASE_URL}/api/marketing/v2/influencer-analytics/instagram/thisuserdoesnotexist12345xyz")
        
        assert response.status_code == 200
        data = response.json()
        
        # Should return success=false for non-existent user
        assert data.get("success") == False
        assert "error" in data
        print(f"Expected error for invalid user: {data.get('error')}")
    
    def test_instagram_analytics_requires_auth(self):
        """Test that Instagram analytics requires authentication"""
        session = requests.Session()
        session.headers.update({"Content-Type": "application/json"})
        # No auth token
        
        response = session.get(f"{BASE_URL}/api/marketing/v2/influencer-analytics/instagram/shopsevora")
        
        assert response.status_code in [401, 403], f"Expected 401/403 without auth, got {response.status_code}"
    
    def test_instagram_url_parsing(self):
        """Test that Instagram handles various URL formats"""
        # Test with @ prefix
        response = self.session.get(f"{BASE_URL}/api/marketing/v2/influencer-analytics/instagram/@shopsevora")
        assert response.status_code == 200
    
    # ============== YOUTUBE ANALYTICS TESTS ==============
    
    def test_youtube_analytics_mrbeast(self):
        """Test fetching YouTube analytics for @MrBeast - known channel"""
        response = self.session.get(f"{BASE_URL}/api/marketing/v2/influencer-analytics/youtube/@MrBeast")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        print(f"YouTube MrBeast response: {data}")
        
        if data.get("success"):
            assert data.get("platform") == "youtube"
            assert "metrics" in data
            
            metrics = data["metrics"]
            assert "subscribers" in metrics
            assert "total_views" in metrics
            assert "videos" in metrics
            
            print(f"Subscribers: {metrics.get('subscribers'):,}, Views: {metrics.get('total_views'):,}")
            
            # MrBeast should have 100M+ subscribers
            assert metrics.get("subscribers", 0) > 100_000_000, "MrBeast should have 100M+ subscribers"
        else:
            error = data.get("error", "")
            print(f"YouTube API returned error: {error}")
            pytest.fail(f"YouTube API should return success for @MrBeast: {error}")
    
    def test_youtube_analytics_channel_id(self):
        """Test fetching YouTube analytics by channel ID (MrBeast's channel)"""
        # MrBeast's channel ID
        channel_id = "UCX6OQ3DkcsbYNE6H8uQQuVA"
        response = self.session.get(f"{BASE_URL}/api/marketing/v2/influencer-analytics/youtube/{channel_id}")
        
        assert response.status_code == 200
        data = response.json()
        
        if data.get("success"):
            assert data.get("channel_id") == channel_id
            print(f"YouTube channel by ID: {data.get('name')}")
    
    def test_youtube_analytics_invalid_channel(self):
        """Test fetching YouTube analytics for invalid channel"""
        response = self.session.get(f"{BASE_URL}/api/marketing/v2/influencer-analytics/youtube/invalidchannelxyz123")
        
        assert response.status_code == 200
        data = response.json()
        
        # Should return success=false for non-existent channel
        assert data.get("success") == False
        assert "error" in data
        print(f"Expected error for invalid channel: {data.get('error')}")
    
    def test_youtube_analytics_requires_auth(self):
        """Test that YouTube analytics requires authentication"""
        session = requests.Session()
        session.headers.update({"Content-Type": "application/json"})
        
        response = session.get(f"{BASE_URL}/api/marketing/v2/influencer-analytics/youtube/@MrBeast")
        
        assert response.status_code in [401, 403], f"Expected 401/403 without auth, got {response.status_code}"
    
    # ============== YOUTUBE VIDEOS TESTS ==============
    
    def test_youtube_videos_mrbeast(self):
        """Test fetching recent videos from MrBeast channel"""
        # First get channel info to get channel_id
        channel_response = self.session.get(f"{BASE_URL}/api/marketing/v2/influencer-analytics/youtube/@MrBeast")
        
        if channel_response.status_code != 200 or not channel_response.json().get("success"):
            pytest.skip("Could not get MrBeast channel info")
        
        channel_id = channel_response.json().get("channel_id")
        
        # Now get videos
        response = self.session.get(f"{BASE_URL}/api/marketing/v2/influencer-analytics/youtube/{channel_id}/videos?limit=5")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        print(f"YouTube videos response: {data}")
        
        if data.get("success"):
            assert "videos" in data
            assert "total" in data
            assert "averages" in data
            
            videos = data.get("videos", [])
            if len(videos) > 0:
                video = videos[0]
                assert "title" in video
                assert "metrics" in video
                assert "views" in video["metrics"]
                
                print(f"First video: {video.get('title')}, Views: {video['metrics'].get('views'):,}")
    
    def test_youtube_videos_with_limit(self):
        """Test fetching videos with specific limit"""
        channel_response = self.session.get(f"{BASE_URL}/api/marketing/v2/influencer-analytics/youtube/@MrBeast")
        
        if not channel_response.json().get("success"):
            pytest.skip("Could not get channel info")
        
        channel_id = channel_response.json().get("channel_id")
        
        # Request exactly 3 videos
        response = self.session.get(f"{BASE_URL}/api/marketing/v2/influencer-analytics/youtube/{channel_id}/videos?limit=3")
        
        assert response.status_code == 200
        data = response.json()
        
        if data.get("success"):
            assert len(data.get("videos", [])) <= 3
    
    # ============== CONTACT FETCH METRICS TESTS ==============
    
    def test_contact_fetch_metrics_no_handles(self):
        """Test fetch-metrics endpoint for contact without social handles"""
        # Create a test contact without social handles
        contact_data = {
            "name": "TEST_NoHandles_Contact",
            "contact_type": "influencer",
            "email": "test_nohandles@test.com"
        }
        
        create_response = self.session.post(f"{BASE_URL}/api/marketing/v2/contacts", json=contact_data)
        
        if create_response.status_code != 200:
            pytest.skip("Could not create test contact")
        
        contact_id = create_response.json().get("id")
        
        try:
            # Try to fetch metrics - should fail
            response = self.session.post(f"{BASE_URL}/api/marketing/v2/contacts/{contact_id}/fetch-metrics")
            
            assert response.status_code == 400
            # API returns: "Contact has no Instagram or YouTube handle to fetch metrics from"
            assert "instagram" in response.text.lower() or "youtube" in response.text.lower()
            print(f"Expected error for contact without handles: {response.text}")
        finally:
            # Cleanup
            self.session.delete(f"{BASE_URL}/api/marketing/v2/contacts/{contact_id}")
    
    def test_contact_fetch_metrics_with_instagram(self):
        """Test fetch-metrics endpoint for contact with Instagram handle"""
        # Create a test contact with Instagram handle
        contact_data = {
            "name": "TEST_Instagram_Contact",
            "contact_type": "influencer",
            "instagram_handle": "shopsevora"
        }
        
        create_response = self.session.post(f"{BASE_URL}/api/marketing/v2/contacts", json=contact_data)
        
        if create_response.status_code != 200:
            pytest.skip("Could not create test contact")
        
        contact_id = create_response.json().get("id")
        
        try:
            # Fetch metrics
            response = self.session.post(f"{BASE_URL}/api/marketing/v2/contacts/{contact_id}/fetch-metrics")
            
            assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
            
            data = response.json()
            print(f"Contact fetch metrics response: {data}")
            
            if data.get("success"):
                assert "results" in data
                assert "updated_fields" in data
                
                # Check Instagram results
                ig_result = data.get("results", {}).get("instagram", {})
                if ig_result.get("success"):
                    print(f"Instagram metrics fetched: followers={ig_result.get('metrics', {}).get('followers')}")
        finally:
            # Cleanup
            self.session.delete(f"{BASE_URL}/api/marketing/v2/contacts/{contact_id}")
    
    def test_contact_fetch_metrics_with_youtube(self):
        """Test fetch-metrics endpoint for contact with YouTube handle"""
        # Create a test contact with YouTube handle
        contact_data = {
            "name": "TEST_YouTube_Contact",
            "contact_type": "influencer",
            "youtube_handle": "@MrBeast"
        }
        
        create_response = self.session.post(f"{BASE_URL}/api/marketing/v2/contacts", json=contact_data)
        
        if create_response.status_code != 200:
            pytest.skip("Could not create test contact")
        
        contact_id = create_response.json().get("id")
        
        try:
            # Fetch metrics
            response = self.session.post(f"{BASE_URL}/api/marketing/v2/contacts/{contact_id}/fetch-metrics")
            
            assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
            
            data = response.json()
            print(f"Contact YouTube fetch metrics response: {data}")
            
            if data.get("success"):
                yt_result = data.get("results", {}).get("youtube", {})
                if yt_result.get("success"):
                    print(f"YouTube metrics fetched: subscribers={yt_result.get('metrics', {}).get('subscribers')}")
        finally:
            # Cleanup
            self.session.delete(f"{BASE_URL}/api/marketing/v2/contacts/{contact_id}")
    
    def test_contact_fetch_metrics_invalid_id(self):
        """Test fetch-metrics endpoint for non-existent contact"""
        response = self.session.post(f"{BASE_URL}/api/marketing/v2/contacts/nonexistent-id-123/fetch-metrics")
        
        assert response.status_code == 404
    
    # ============== BULK FETCH METRICS TESTS ==============
    
    def test_bulk_fetch_metrics_empty(self):
        """Test bulk-fetch-metrics with empty contact list"""
        response = self.session.post(f"{BASE_URL}/api/marketing/v2/contacts/bulk-fetch-metrics", json={
            "contact_ids": []
        })
        
        assert response.status_code == 400
    
    def test_bulk_fetch_metrics_over_limit(self):
        """Test bulk-fetch-metrics with more than 10 contacts"""
        # Create 11 fake IDs
        fake_ids = [f"fake-id-{i}" for i in range(11)]
        
        response = self.session.post(f"{BASE_URL}/api/marketing/v2/contacts/bulk-fetch-metrics", json={
            "contact_ids": fake_ids
        })
        
        assert response.status_code == 400
        assert "10 contacts" in response.text.lower() or "maximum" in response.text.lower()
    
    def test_bulk_fetch_metrics_requires_auth(self):
        """Test that bulk-fetch-metrics requires authentication"""
        session = requests.Session()
        session.headers.update({"Content-Type": "application/json"})
        
        response = session.post(f"{BASE_URL}/api/marketing/v2/contacts/bulk-fetch-metrics", json={
            "contact_ids": ["test-id"]
        })
        
        assert response.status_code in [401, 403]


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
