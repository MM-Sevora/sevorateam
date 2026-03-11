"""
Social Media Platform Integrations Tests - Phase 5
Tests for direct API connections for auto-publishing to social platforms.

Endpoints tested:
- GET /api/social/integrations/platforms - Get available platforms with configs
- GET /api/social/integrations/connections - Get user's platform connections
- POST /api/social/integrations/connect/{platform} - Connect to a platform (mock OAuth)
- DELETE /api/social/integrations/disconnect/{platform} - Disconnect a platform
- POST /api/social/integrations/publish - Publish to single platform
- POST /api/social/integrations/publish/multi - Publish to multiple platforms
- GET /api/social/integrations/history - Get publishing history
- GET /api/social/integrations/stats - Get integration statistics
- POST /api/social/integrations/test/{platform} - Test platform connection
"""

import pytest
import requests
import os
import uuid
from datetime import datetime

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')


class TestSocialIntegrations:
    """Tests for Social Media Platform Integrations - Phase 5"""
    
    @pytest.fixture(scope="class")
    def auth_token(self):
        """Get authentication token for superadmin user"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": "superadmin@sevora.com", "password": "superadmin123"}
        )
        assert response.status_code == 200, f"Auth failed: {response.text}"
        return response.json()["access_token"]
    
    @pytest.fixture(scope="class")
    def auth_headers(self, auth_token):
        """Get auth headers"""
        return {"Authorization": f"Bearer {auth_token}", "Content-Type": "application/json"}
    
    # ==================== PLATFORMS TESTS ====================
    
    def test_get_platforms(self, auth_headers):
        """Test GET /api/social/integrations/platforms - Get available platforms"""
        response = requests.get(f"{BASE_URL}/api/social/integrations/platforms", headers=auth_headers)
        
        assert response.status_code == 200
        data = response.json()
        
        # Verify 5 platforms returned
        assert "platforms" in data
        platforms = data["platforms"]
        assert len(platforms) == 5
        
        # Verify platform IDs
        platform_ids = [p["id"] for p in platforms]
        expected_platforms = ["linkedin", "twitter", "instagram", "facebook", "youtube"]
        for expected in expected_platforms:
            assert expected in platform_ids, f"Missing platform: {expected}"
        
        # Verify platform structure
        for platform in platforms:
            assert "id" in platform
            assert "name" in platform
            assert "icon" in platform
            assert "color" in platform
            assert "post_types" in platform
            assert "max_chars" in platform
            assert "supports_scheduling" in platform
            assert "supports_analytics" in platform
            assert "scopes" in platform
            
        print(f"PASS: GET /platforms - Returns {len(platforms)} platforms")
    
    def test_platforms_have_correct_configs(self, auth_headers):
        """Test platforms have correct configurations"""
        response = requests.get(f"{BASE_URL}/api/social/integrations/platforms", headers=auth_headers)
        data = response.json()
        platforms = {p["id"]: p for p in data["platforms"]}
        
        # Verify LinkedIn config
        linkedin = platforms["linkedin"]
        assert linkedin["name"] == "LinkedIn"
        assert linkedin["max_chars"] == 3000
        assert "text" in linkedin["post_types"]
        
        # Verify Twitter config
        twitter = platforms["twitter"]
        assert twitter["name"] == "Twitter/X"
        assert twitter["max_chars"] == 280
        
        # Verify Instagram config
        instagram = platforms["instagram"]
        assert instagram["name"] == "Instagram"
        assert "carousel" in instagram["post_types"]
        
        # Verify Facebook config
        facebook = platforms["facebook"]
        assert facebook["name"] == "Facebook"
        assert facebook["max_chars"] == 63206
        
        # Verify YouTube config
        youtube = platforms["youtube"]
        assert youtube["name"] == "YouTube"
        assert "video" in youtube["post_types"]
        
        print("PASS: All platforms have correct configurations")
    
    # ==================== CONNECTIONS TESTS ====================
    
    def test_get_connections(self, auth_headers):
        """Test GET /api/social/integrations/connections - Get user connections"""
        response = requests.get(f"{BASE_URL}/api/social/integrations/connections", headers=auth_headers)
        
        assert response.status_code == 200
        data = response.json()
        
        assert "connections" in data
        assert "available_platforms" in data
        
        # All 5 platforms should be available
        assert len(data["available_platforms"]) == 5
        
        print(f"PASS: GET /connections - Returns {len(data['connections'])} connections")
    
    def test_connect_platform_linkedin(self, auth_headers):
        """Test POST /api/social/integrations/connect/linkedin - Connect to LinkedIn"""
        response = requests.post(
            f"{BASE_URL}/api/social/integrations/connect/linkedin",
            headers=auth_headers
        )
        
        assert response.status_code == 200
        data = response.json()
        
        assert data["success"] == True
        assert "connection" in data
        assert data["connection"]["platform"] == "linkedin"
        assert data["connection"]["status"] == "connected"
        assert data["connection"]["account_name"] is not None
        
        # Verify note about mock connection
        assert "note" in data
        assert "simulated" in data["note"].lower()
        
        print("PASS: POST /connect/linkedin - Successfully connected (mock)")
    
    def test_connect_platform_twitter(self, auth_headers):
        """Test POST /api/social/integrations/connect/twitter - Connect to Twitter"""
        response = requests.post(
            f"{BASE_URL}/api/social/integrations/connect/twitter",
            headers=auth_headers
        )
        
        assert response.status_code == 200
        data = response.json()
        
        assert data["success"] == True
        assert data["connection"]["platform"] == "twitter"
        assert data["connection"]["status"] == "connected"
        
        print("PASS: POST /connect/twitter - Successfully connected (mock)")
    
    def test_connect_platform_instagram(self, auth_headers):
        """Test POST /api/social/integrations/connect/instagram - Connect to Instagram"""
        response = requests.post(
            f"{BASE_URL}/api/social/integrations/connect/instagram",
            headers=auth_headers
        )
        
        assert response.status_code == 200
        data = response.json()
        
        assert data["success"] == True
        assert data["connection"]["platform"] == "instagram"
        
        print("PASS: POST /connect/instagram - Successfully connected (mock)")
    
    def test_connect_invalid_platform(self, auth_headers):
        """Test POST /api/social/integrations/connect/invalid - Should fail"""
        response = requests.post(
            f"{BASE_URL}/api/social/integrations/connect/invalid_platform",
            headers=auth_headers
        )
        
        assert response.status_code == 400
        assert "unknown platform" in response.json()["detail"].lower()
        
        print("PASS: POST /connect/invalid - Returns 400 for unknown platform")
    
    def test_disconnect_platform(self, auth_headers):
        """Test DELETE /api/social/integrations/disconnect/instagram - Disconnect"""
        response = requests.delete(
            f"{BASE_URL}/api/social/integrations/disconnect/instagram",
            headers=auth_headers
        )
        
        assert response.status_code == 200
        data = response.json()
        
        assert data["success"] == True
        assert data["platform"] == "instagram"
        assert "disconnected" in data["message"].lower()
        
        print("PASS: DELETE /disconnect/instagram - Successfully disconnected")
    
    # ==================== PUBLISH TESTS ====================
    
    def test_publish_to_single_platform(self, auth_headers):
        """Test POST /api/social/integrations/publish - Publish to single platform"""
        # First ensure LinkedIn is connected
        requests.post(f"{BASE_URL}/api/social/integrations/connect/linkedin", headers=auth_headers)
        
        response = requests.post(
            f"{BASE_URL}/api/social/integrations/publish",
            headers=auth_headers,
            json={
                "platform": "linkedin",
                "content": f"Test post from Sevora Platform Integration test - {datetime.now().isoformat()}",
                "media_urls": [],
                "post_type": "text"
            }
        )
        
        assert response.status_code == 200
        data = response.json()
        
        assert "success" in data
        assert data["platform"] == "linkedin"
        assert "message" in data
        
        # If successful, verify platform_post_id and platform_url
        if data["success"]:
            assert data["platform_post_id"] is not None
            assert data["platform_url"] is not None
            assert "linkedin.com" in data["platform_url"]
            
        print(f"PASS: POST /publish - Published to LinkedIn (success={data['success']})")
    
    def test_publish_content_exceeds_limit(self, auth_headers):
        """Test POST /api/social/integrations/publish - Content exceeds Twitter limit"""
        # Connect Twitter
        requests.post(f"{BASE_URL}/api/social/integrations/connect/twitter", headers=auth_headers)
        
        # Twitter has 280 char limit
        long_content = "A" * 300
        response = requests.post(
            f"{BASE_URL}/api/social/integrations/publish",
            headers=auth_headers,
            json={
                "platform": "twitter",
                "content": long_content,
                "media_urls": [],
                "post_type": "text"
            }
        )
        
        assert response.status_code == 400
        assert "exceeds" in response.json()["detail"].lower() or "character" in response.json()["detail"].lower()
        
        print("PASS: POST /publish - Returns 400 for content exceeding limit")
    
    def test_publish_invalid_post_type(self, auth_headers):
        """Test POST /api/social/integrations/publish - Invalid post type for platform"""
        # YouTube only supports video, short
        requests.post(f"{BASE_URL}/api/social/integrations/connect/youtube", headers=auth_headers)
        
        response = requests.post(
            f"{BASE_URL}/api/social/integrations/publish",
            headers=auth_headers,
            json={
                "platform": "youtube",
                "content": "This is a text post",
                "media_urls": [],
                "post_type": "text"  # YouTube doesn't support text posts
            }
        )
        
        assert response.status_code == 400
        assert "not supported" in response.json()["detail"].lower()
        
        print("PASS: POST /publish - Returns 400 for unsupported post type")
    
    def test_publish_to_multiple_platforms(self, auth_headers):
        """Test POST /api/social/integrations/publish/multi - Multi-platform publish"""
        # Connect multiple platforms
        requests.post(f"{BASE_URL}/api/social/integrations/connect/linkedin", headers=auth_headers)
        requests.post(f"{BASE_URL}/api/social/integrations/connect/twitter", headers=auth_headers)
        requests.post(f"{BASE_URL}/api/social/integrations/connect/facebook", headers=auth_headers)
        
        response = requests.post(
            f"{BASE_URL}/api/social/integrations/publish/multi",
            headers=auth_headers,
            json={
                "platforms": ["linkedin", "twitter", "facebook"],
                "content": f"Multi-platform test post - {datetime.now().isoformat()}",
                "media_urls": [],
                "post_type": "text"
            }
        )
        
        assert response.status_code == 200
        data = response.json()
        
        assert "total" in data
        assert "successful" in data
        assert "failed" in data
        assert "results" in data
        
        assert data["total"] == 3
        assert len(data["results"]) == 3
        
        # Verify each result has required fields
        for result in data["results"]:
            assert "platform" in result
            assert "success" in result
            assert "message" in result
        
        print(f"PASS: POST /publish/multi - Published to {data['successful']}/{data['total']} platforms")
    
    # ==================== HISTORY TESTS ====================
    
    def test_get_history(self, auth_headers):
        """Test GET /api/social/integrations/history - Get publishing history"""
        response = requests.get(
            f"{BASE_URL}/api/social/integrations/history",
            headers=auth_headers
        )
        
        assert response.status_code == 200
        data = response.json()
        
        assert "history" in data
        assert "total" in data
        
        # History should have entries from previous publish tests
        if data["total"] > 0:
            history_item = data["history"][0]
            assert "id" in history_item
            assert "platform" in history_item
            assert "status" in history_item
            assert "content_preview" in history_item
        
        print(f"PASS: GET /history - Returns {data['total']} history items")
    
    def test_get_history_filtered_by_platform(self, auth_headers):
        """Test GET /api/social/integrations/history - Filter by platform"""
        response = requests.get(
            f"{BASE_URL}/api/social/integrations/history?platform=linkedin",
            headers=auth_headers
        )
        
        assert response.status_code == 200
        data = response.json()
        
        # All returned items should be for linkedin
        for item in data["history"]:
            assert item["platform"] == "linkedin"
        
        print(f"PASS: GET /history?platform=linkedin - Filtered results")
    
    def test_get_history_filtered_by_status(self, auth_headers):
        """Test GET /api/social/integrations/history - Filter by status"""
        response = requests.get(
            f"{BASE_URL}/api/social/integrations/history?status=published",
            headers=auth_headers
        )
        
        assert response.status_code == 200
        data = response.json()
        
        # All returned items should have published status
        for item in data["history"]:
            assert item["status"] == "published"
        
        print(f"PASS: GET /history?status=published - Filtered results")
    
    # ==================== STATS TESTS ====================
    
    def test_get_stats(self, auth_headers):
        """Test GET /api/social/integrations/stats - Get integration statistics"""
        response = requests.get(
            f"{BASE_URL}/api/social/integrations/stats",
            headers=auth_headers
        )
        
        assert response.status_code == 200
        data = response.json()
        
        assert "connected_platforms" in data
        assert "total_posts" in data
        assert "by_platform" in data
        assert "by_status" in data
        
        print(f"PASS: GET /stats - {data['connected_platforms']} platforms, {data['total_posts']} total posts")
    
    # ==================== TEST CONNECTION ====================
    
    def test_test_platform_connection(self, auth_headers):
        """Test POST /api/social/integrations/test/{platform} - Test connection"""
        # Ensure LinkedIn is connected
        requests.post(f"{BASE_URL}/api/social/integrations/connect/linkedin", headers=auth_headers)
        
        response = requests.post(
            f"{BASE_URL}/api/social/integrations/test/linkedin",
            headers=auth_headers
        )
        
        assert response.status_code == 200
        data = response.json()
        
        assert data["platform"] == "linkedin"
        assert data["platform_name"] == "LinkedIn"
        assert "test_successful" in data
        assert "message" in data
        assert "note" in data  # Should mention it's simulated
        
        print(f"PASS: POST /test/linkedin - Test successful={data['test_successful']}")
    
    def test_test_invalid_platform_connection(self, auth_headers):
        """Test POST /api/social/integrations/test/invalid - Should fail"""
        response = requests.post(
            f"{BASE_URL}/api/social/integrations/test/invalid_platform",
            headers=auth_headers
        )
        
        assert response.status_code == 400
        assert "unknown platform" in response.json()["detail"].lower()
        
        print("PASS: POST /test/invalid - Returns 400 for unknown platform")
    
    # ==================== AUTH TESTS ====================
    
    def test_connections_requires_auth(self):
        """Test that connections endpoint requires authentication"""
        response = requests.get(f"{BASE_URL}/api/social/integrations/connections")
        
        assert response.status_code == 401
        
        print("PASS: GET /connections - Returns 401 without auth")
    
    def test_publish_requires_auth(self):
        """Test that publish endpoint requires authentication"""
        response = requests.post(
            f"{BASE_URL}/api/social/integrations/publish",
            json={"platform": "linkedin", "content": "Test", "post_type": "text"}
        )
        
        assert response.status_code == 401
        
        print("PASS: POST /publish - Returns 401 without auth")
    
    # ==================== CLEANUP ====================
    
    def test_cleanup_disconnect_all(self, auth_headers):
        """Cleanup: Disconnect all platforms after tests"""
        platforms = ["linkedin", "twitter", "instagram", "facebook", "youtube"]
        
        for platform in platforms:
            requests.delete(
                f"{BASE_URL}/api/social/integrations/disconnect/{platform}",
                headers=auth_headers
            )
        
        print("CLEANUP: Disconnected all platforms")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
