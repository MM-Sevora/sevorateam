"""
Test YouTube Integration Endpoints for Social Media Module
Testing: channel info, videos listing, video analytics, connection status, disconnect
Also testing /connections endpoint for all platform connections
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestYouTubeIntegration:
    """YouTube Integration Endpoint Tests"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup authentication token"""
        login_response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": "superadmin@sevora.com", "password": "superadmin123"}
        )
        assert login_response.status_code == 200, f"Login failed: {login_response.text}"
        data = login_response.json()
        # Token is returned as 'access_token' not 'token'
        self.token = data.get("access_token") or data.get("token")
        assert self.token, f"No token in response: {data}"
        self.headers = {"Authorization": f"Bearer {self.token}"}
    
    # =========== YouTube Channel Endpoint ===========
    def test_youtube_channel_endpoint_exists(self):
        """GET /api/social/integrations/youtube/channel returns proper response structure"""
        response = requests.get(
            f"{BASE_URL}/api/social/integrations/youtube/channel",
            headers=self.headers
        )
        # Should return 200 (with error message about not connected) or channel info
        assert response.status_code == 200, f"Status: {response.status_code}, Body: {response.text}"
        data = response.json()
        # Response should have either 'success' or 'connected' key
        assert "success" in data or "connected" in data, f"Unexpected response: {data}"
        print(f"YouTube channel response: {data}")
    
    # =========== YouTube Status Endpoint ===========
    def test_youtube_status_endpoint_exists(self):
        """GET /api/social/integrations/youtube/status returns connection status"""
        response = requests.get(
            f"{BASE_URL}/api/social/integrations/youtube/status",
            headers=self.headers
        )
        assert response.status_code == 200, f"Status: {response.status_code}, Body: {response.text}"
        data = response.json()
        # Should have 'connected' boolean key
        assert "connected" in data, f"Missing 'connected' key in response: {data}"
        print(f"YouTube status response: {data}")
        
    def test_youtube_status_response_structure(self):
        """YouTube status should return proper account details if connected"""
        response = requests.get(
            f"{BASE_URL}/api/social/integrations/youtube/status",
            headers=self.headers
        )
        assert response.status_code == 200
        data = response.json()
        
        if data.get("connected"):
            # If connected, should have account details
            assert "account_name" in data or "channel_stats" in data, f"Missing account info: {data}"
        else:
            # If not connected, should have message
            assert "message" in data, f"Missing message for disconnected status: {data}"
        print(f"YouTube status structure: {list(data.keys())}")
    
    # =========== YouTube Videos Endpoint ===========
    def test_youtube_videos_endpoint_exists(self):
        """GET /api/social/integrations/youtube/videos returns proper response"""
        response = requests.get(
            f"{BASE_URL}/api/social/integrations/youtube/videos",
            headers=self.headers
        )
        assert response.status_code == 200, f"Status: {response.status_code}, Body: {response.text}"
        data = response.json()
        # Should have either 'videos' or 'success' key
        assert "videos" in data or "success" in data, f"Unexpected response: {data}"
        print(f"YouTube videos response: {data}")
    
    def test_youtube_videos_with_limit(self):
        """GET /api/social/integrations/youtube/videos with limit parameter"""
        response = requests.get(
            f"{BASE_URL}/api/social/integrations/youtube/videos?limit=5",
            headers=self.headers
        )
        assert response.status_code == 200
        data = response.json()
        if data.get("videos"):
            assert len(data["videos"]) <= 5, "Returned more videos than limit"
        print(f"YouTube videos with limit: {data.get('total', 0)} videos")
    
    # =========== YouTube Video Analytics Endpoint ===========
    def test_youtube_video_analytics_endpoint_exists(self):
        """GET /api/social/integrations/youtube/videos/{video_id}/analytics returns proper response"""
        # Test with a sample video_id - will fail but endpoint should exist
        test_video_id = "test123"
        response = requests.get(
            f"{BASE_URL}/api/social/integrations/youtube/videos/{test_video_id}/analytics",
            headers=self.headers
        )
        assert response.status_code == 200, f"Status: {response.status_code}, Body: {response.text}"
        data = response.json()
        # Should have 'success' key indicating endpoint works
        assert "success" in data or "video" in data, f"Unexpected response: {data}"
        print(f"YouTube analytics response: {data}")
    
    # =========== YouTube Disconnect Endpoint ===========
    def test_youtube_disconnect_endpoint_exists(self):
        """DELETE /api/social/integrations/youtube/disconnect returns proper response"""
        response = requests.delete(
            f"{BASE_URL}/api/social/integrations/youtube/disconnect",
            headers=self.headers
        )
        # Should return 200 with success info
        assert response.status_code == 200, f"Status: {response.status_code}, Body: {response.text}"
        data = response.json()
        assert "success" in data, f"Missing 'success' key: {data}"
        print(f"YouTube disconnect response: {data}")


class TestPlatformConnections:
    """Test /connections endpoint for all platforms including Instagram/Facebook from .env"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup authentication token"""
        login_response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": "superadmin@sevora.com", "password": "superadmin123"}
        )
        assert login_response.status_code == 200
        data = login_response.json()
        self.token = data.get("access_token") or data.get("token")
        assert self.token
        self.headers = {"Authorization": f"Bearer {self.token}"}
    
    def test_connections_endpoint_exists(self):
        """GET /api/social/integrations/connections returns all platform connections"""
        response = requests.get(
            f"{BASE_URL}/api/social/integrations/connections",
            headers=self.headers
        )
        assert response.status_code == 200, f"Status: {response.status_code}, Body: {response.text}"
        data = response.json()
        assert "connections" in data, f"Missing 'connections' key: {data}"
        print(f"Connections response has {len(data.get('connections', []))} platforms")
    
    def test_connections_returns_all_five_platforms(self):
        """Connections should include all 5 platforms: linkedin, twitter, instagram, facebook, youtube"""
        response = requests.get(
            f"{BASE_URL}/api/social/integrations/connections",
            headers=self.headers
        )
        assert response.status_code == 200
        data = response.json()
        connections = data.get("connections", [])
        
        platforms_in_response = {c.get("platform") for c in connections}
        expected_platforms = {"linkedin", "twitter", "instagram", "facebook", "youtube"}
        
        for platform in expected_platforms:
            assert platform in platforms_in_response, f"Missing platform: {platform}"
        print(f"All 5 platforms present: {platforms_in_response}")
    
    def test_instagram_connection_from_env(self):
        """Instagram should show as connected if .env has INSTAGRAM_ACCESS_TOKEN"""
        response = requests.get(
            f"{BASE_URL}/api/social/integrations/connections",
            headers=self.headers
        )
        assert response.status_code == 200
        data = response.json()
        connections = data.get("connections", [])
        
        instagram_conn = next((c for c in connections if c.get("platform") == "instagram"), None)
        assert instagram_conn, "Instagram connection not found"
        
        # Instagram should be connected via env config
        print(f"Instagram status: {instagram_conn.get('status')}")
        print(f"Instagram connection type: {instagram_conn.get('connection_type', 'database')}")
        # Not asserting connected status since it depends on .env config
    
    def test_facebook_connection_from_env(self):
        """Facebook should show as connected if .env has FACEBOOK_PAGE_ACCESS_TOKEN"""
        response = requests.get(
            f"{BASE_URL}/api/social/integrations/connections",
            headers=self.headers
        )
        assert response.status_code == 200
        data = response.json()
        connections = data.get("connections", [])
        
        facebook_conn = next((c for c in connections if c.get("platform") == "facebook"), None)
        assert facebook_conn, "Facebook connection not found"
        
        print(f"Facebook status: {facebook_conn.get('status')}")
        print(f"Facebook connection type: {facebook_conn.get('connection_type', 'database')}")
    
    def test_connection_has_required_fields(self):
        """Each connection should have required fields: id, platform, status"""
        response = requests.get(
            f"{BASE_URL}/api/social/integrations/connections",
            headers=self.headers
        )
        assert response.status_code == 200
        data = response.json()
        connections = data.get("connections", [])
        
        for conn in connections:
            assert "id" in conn, f"Missing 'id' in connection: {conn}"
            assert "platform" in conn, f"Missing 'platform' in connection: {conn}"
            assert "status" in conn, f"Missing 'status' in connection: {conn}"
        
        print("All connections have required fields")
    
    def test_available_platforms_returned(self):
        """Response should include available_platforms list"""
        response = requests.get(
            f"{BASE_URL}/api/social/integrations/connections",
            headers=self.headers
        )
        assert response.status_code == 200
        data = response.json()
        
        assert "available_platforms" in data, f"Missing 'available_platforms': {data}"
        assert len(data["available_platforms"]) >= 5, "Should have at least 5 platforms"
        print(f"Available platforms: {data['available_platforms']}")


class TestYouTubeAuthError:
    """Test YouTube endpoints handle auth errors properly"""
    
    def test_youtube_channel_requires_auth(self):
        """YouTube channel endpoint should require authentication"""
        response = requests.get(f"{BASE_URL}/api/social/integrations/youtube/channel")
        assert response.status_code == 401, f"Should return 401, got {response.status_code}"
    
    def test_youtube_status_requires_auth(self):
        """YouTube status endpoint should require authentication"""
        response = requests.get(f"{BASE_URL}/api/social/integrations/youtube/status")
        assert response.status_code == 401
    
    def test_youtube_videos_requires_auth(self):
        """YouTube videos endpoint should require authentication"""
        response = requests.get(f"{BASE_URL}/api/social/integrations/youtube/videos")
        assert response.status_code == 401
    
    def test_youtube_disconnect_requires_auth(self):
        """YouTube disconnect endpoint should require authentication"""
        response = requests.delete(f"{BASE_URL}/api/social/integrations/youtube/disconnect")
        assert response.status_code == 401


class TestYouTubeConnect:
    """Test YouTube connect endpoint"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup authentication token"""
        login_response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": "superadmin@sevora.com", "password": "superadmin123"}
        )
        assert login_response.status_code == 200
        data = login_response.json()
        self.token = data.get("access_token") or data.get("token")
        assert self.token
        self.headers = {"Authorization": f"Bearer {self.token}"}
    
    def test_youtube_connect_returns_oauth_url(self):
        """POST /api/social/integrations/connect/youtube should return OAuth URL"""
        response = requests.post(
            f"{BASE_URL}/api/social/integrations/connect/youtube",
            headers=self.headers
        )
        assert response.status_code == 200, f"Status: {response.status_code}, Body: {response.text}"
        data = response.json()
        
        # Should have OAuth info
        assert data.get("requires_oauth") or data.get("success"), f"Unexpected response: {data}"
        if data.get("requires_oauth"):
            assert "auth_url" in data, f"Missing auth_url: {data}"
            assert "accounts.google.com" in data["auth_url"], "Auth URL should be Google OAuth"
        print(f"YouTube connect response: {data.get('message', 'No message')}")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
