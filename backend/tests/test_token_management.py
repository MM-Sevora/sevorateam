"""
Token Management API Tests
Tests for token expiry tracking and refresh functionality in the Social Media module.
Features tested:
- GET /api/social/integrations/tokens/status - all platforms token status
- GET /api/social/integrations/tokens/{platform}/status - specific platform token status
- POST /api/social/integrations/tokens/{platform}/refresh - token refresh
- POST /api/social/integrations/tokens/{platform}/validate - token validation
"""

import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')


@pytest.fixture(scope="module")
def auth_token():
    """Get authentication token"""
    response = requests.post(
        f"{BASE_URL}/api/auth/login",
        json={
            "email": "superadmin@sevora.com",
            "password": "superadmin123"
        },
        headers={"Content-Type": "application/json"}
    )
    assert response.status_code == 200, f"Login failed: {response.text}"
    data = response.json()
    return data.get("access_token")


@pytest.fixture
def api_client(auth_token):
    """Create authenticated requests session"""
    session = requests.Session()
    session.headers.update({
        "Content-Type": "application/json",
        "Authorization": f"Bearer {auth_token}"
    })
    return session


class TestGetAllTokensStatus:
    """Tests for GET /api/social/integrations/tokens/status endpoint"""
    
    def test_get_all_tokens_status_returns_200(self, api_client):
        """Verify endpoint returns 200 OK"""
        response = api_client.get(f"{BASE_URL}/api/social/integrations/tokens/status")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
    
    def test_get_all_tokens_status_has_platforms(self, api_client):
        """Verify response contains platforms object"""
        response = api_client.get(f"{BASE_URL}/api/social/integrations/tokens/status")
        data = response.json()
        assert "platforms" in data, "Response should contain 'platforms'"
        assert isinstance(data["platforms"], dict), "'platforms' should be a dictionary"
    
    def test_get_all_tokens_status_has_summary(self, api_client):
        """Verify response contains summary with counts"""
        response = api_client.get(f"{BASE_URL}/api/social/integrations/tokens/status")
        data = response.json()
        assert "summary" in data, "Response should contain 'summary'"
        summary = data["summary"]
        assert "total_connected" in summary
        assert "critical_expiry" in summary
        assert "warning_expiry" in summary
        assert "needs_attention" in summary
    
    def test_linkedin_has_token_expiry_info(self, api_client):
        """Verify LinkedIn shows token expiry info (has expires_at set)"""
        response = api_client.get(f"{BASE_URL}/api/social/integrations/tokens/status")
        data = response.json()
        linkedin = data["platforms"].get("linkedin")
        
        if linkedin:
            # LinkedIn should have expiry info
            assert "has_expiry" in linkedin
            assert "is_expired" in linkedin
            assert "days_remaining" in linkedin
            assert "warning_level" in linkedin
            assert "message" in linkedin
            
            # If has expiry, should show days remaining
            if linkedin["has_expiry"]:
                assert linkedin["days_remaining"] is not None
                assert linkedin["warning_level"] in ["critical", "warning", "caution", "ok"]
    
    def test_meta_platforms_can_refresh(self, api_client):
        """Verify Instagram and Facebook show can_refresh=true"""
        response = api_client.get(f"{BASE_URL}/api/social/integrations/tokens/status")
        data = response.json()
        
        for platform_id in ["instagram", "facebook"]:
            platform_data = data["platforms"].get(platform_id)
            if platform_data:
                assert platform_data.get("can_refresh") == True, f"{platform_id} should have can_refresh=true"
                assert platform_data.get("refresh_endpoint") is not None, f"{platform_id} should have refresh_endpoint"
    
    def test_non_meta_platforms_cannot_refresh(self, api_client):
        """Verify LinkedIn, Twitter, YouTube show can_refresh=false"""
        response = api_client.get(f"{BASE_URL}/api/social/integrations/tokens/status")
        data = response.json()
        
        for platform_id in ["linkedin", "twitter", "youtube"]:
            platform_data = data["platforms"].get(platform_id)
            if platform_data:
                assert platform_data.get("can_refresh") == False, f"{platform_id} should have can_refresh=false"


class TestGetPlatformTokenStatus:
    """Tests for GET /api/social/integrations/tokens/{platform}/status endpoint"""
    
    def test_linkedin_token_status(self, api_client):
        """Verify LinkedIn token status endpoint returns correct structure"""
        response = api_client.get(f"{BASE_URL}/api/social/integrations/tokens/linkedin/status")
        assert response.status_code == 200
        data = response.json()
        
        assert data["platform"] == "linkedin"
        assert "connected" in data
        
        if data["connected"]:
            assert "has_expiry" in data
            assert "days_remaining" in data
            assert "warning_level" in data
            assert "message" in data
    
    def test_instagram_token_status(self, api_client):
        """Verify Instagram token status endpoint"""
        response = api_client.get(f"{BASE_URL}/api/social/integrations/tokens/instagram/status")
        assert response.status_code == 200
        data = response.json()
        
        assert data["platform"] == "instagram"
        assert "connected" in data
        
        if data["connected"]:
            assert "can_refresh" in data
            assert data["can_refresh"] == True
    
    def test_disconnected_platform_status(self, api_client):
        """Test token status for a platform that might not be connected"""
        # Use a generic platform that may or may not be connected
        response = api_client.get(f"{BASE_URL}/api/social/integrations/tokens/twitter/status")
        assert response.status_code == 200
        data = response.json()
        
        assert data["platform"] == "twitter"
        assert "connected" in data


class TestTokenRefresh:
    """Tests for POST /api/social/integrations/tokens/{platform}/refresh endpoint"""
    
    def test_instagram_refresh_fails_gracefully_without_credentials(self, api_client):
        """Verify Instagram token refresh fails gracefully without META_APP_ID"""
        response = api_client.post(f"{BASE_URL}/api/social/integrations/tokens/instagram/refresh")
        
        # Should return 400 with meaningful error about missing credentials
        assert response.status_code == 400
        data = response.json()
        assert "detail" in data
        assert "META_APP_ID" in data["detail"] or "credentials" in data["detail"].lower()
    
    def test_facebook_refresh_fails_gracefully_without_credentials(self, api_client):
        """Verify Facebook token refresh fails gracefully without META_APP_ID"""
        response = api_client.post(f"{BASE_URL}/api/social/integrations/tokens/facebook/refresh")
        
        assert response.status_code == 400
        data = response.json()
        assert "detail" in data
    
    def test_twitter_refresh_not_supported(self, api_client):
        """Verify Twitter token refresh returns proper error"""
        response = api_client.post(f"{BASE_URL}/api/social/integrations/tokens/twitter/refresh")
        
        # Should return 400 - not supported
        assert response.status_code == 400
        data = response.json()
        assert "not supported" in data["detail"].lower()
    
    def test_linkedin_refresh_not_supported(self, api_client):
        """Verify LinkedIn token refresh returns proper error"""
        response = api_client.post(f"{BASE_URL}/api/social/integrations/tokens/linkedin/refresh")
        
        # Should return 400 - not supported
        assert response.status_code == 400
        data = response.json()
        assert "not supported" in data["detail"].lower()
    
    def test_youtube_refresh_not_supported(self, api_client):
        """Verify YouTube token refresh returns proper error"""
        response = api_client.post(f"{BASE_URL}/api/social/integrations/tokens/youtube/refresh")
        
        assert response.status_code == 400
        data = response.json()
        assert "not supported" in data["detail"].lower()


class TestTokenValidate:
    """Tests for POST /api/social/integrations/tokens/{platform}/validate endpoint"""
    
    def test_instagram_validate_returns_response(self, api_client):
        """Verify Instagram token validate endpoint works"""
        response = api_client.post(f"{BASE_URL}/api/social/integrations/tokens/instagram/validate")
        
        # Should return 200 with validation result
        assert response.status_code == 200
        data = response.json()
        assert data["platform"] == "instagram"
        assert "valid" in data
    
    def test_linkedin_validate_returns_response(self, api_client):
        """Verify LinkedIn token validate endpoint works"""
        response = api_client.post(f"{BASE_URL}/api/social/integrations/tokens/linkedin/validate")
        
        assert response.status_code == 200
        data = response.json()
        assert data["platform"] == "linkedin"
        # LinkedIn token validate may return valid=false since it uses Meta's debug_token endpoint
        assert "valid" in data
    
    def test_twitter_validate_no_token_error(self, api_client):
        """Verify Twitter validate returns proper message when no token in db"""
        response = api_client.post(f"{BASE_URL}/api/social/integrations/tokens/twitter/validate")
        
        # Twitter tokens from db - check response structure
        assert response.status_code == 200
        data = response.json()
        assert data["platform"] == "twitter"


class TestAuthRequired:
    """Tests to verify authentication is required for all token endpoints"""
    
    def test_tokens_status_requires_auth(self):
        """Verify /tokens/status requires authentication"""
        response = requests.get(f"{BASE_URL}/api/social/integrations/tokens/status")
        assert response.status_code == 401
    
    def test_platform_token_status_requires_auth(self):
        """Verify /tokens/{platform}/status requires authentication"""
        response = requests.get(f"{BASE_URL}/api/social/integrations/tokens/linkedin/status")
        assert response.status_code == 401
    
    def test_token_refresh_requires_auth(self):
        """Verify /tokens/{platform}/refresh requires authentication"""
        response = requests.post(f"{BASE_URL}/api/social/integrations/tokens/instagram/refresh")
        assert response.status_code == 401
    
    def test_token_validate_requires_auth(self):
        """Verify /tokens/{platform}/validate requires authentication"""
        response = requests.post(f"{BASE_URL}/api/social/integrations/tokens/linkedin/validate")
        assert response.status_code == 401


class TestWarningLevels:
    """Tests for token warning level calculation"""
    
    def test_linkedin_warning_level_ok(self, api_client):
        """Verify LinkedIn with 58 days remaining has warning_level=ok"""
        response = api_client.get(f"{BASE_URL}/api/social/integrations/tokens/linkedin/status")
        data = response.json()
        
        if data.get("connected") and data.get("has_expiry"):
            days_remaining = data.get("days_remaining")
            warning_level = data.get("warning_level")
            
            if days_remaining is not None and days_remaining > 14:
                assert warning_level == "ok", f"Token with {days_remaining} days remaining should have warning_level=ok"
            elif days_remaining is not None and days_remaining > 7:
                assert warning_level == "caution"
            elif days_remaining is not None and days_remaining > 3:
                assert warning_level == "warning"
            elif days_remaining is not None:
                assert warning_level == "critical"
