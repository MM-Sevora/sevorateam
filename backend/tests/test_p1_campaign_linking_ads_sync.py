"""
P1 Tasks Tests: Campaign Linking UI and Live Ad Platform Integration

Tests for:
1. Campaign Details Page - Link Content, Ads, Publications buttons
2. Digital Ads Page - Live Data Sync Panel with Meta/Google sync
3. Sync status endpoint
"""

import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')


class TestSetup:
    """Setup fixtures for all tests"""
    
    @pytest.fixture(scope="class")
    def auth_token(self):
        """Get authentication token"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": "admin@sevora.com", "password": "admin123"}
        )
        assert response.status_code == 200, f"Login failed: {response.text}"
        return response.json().get("access_token")
    
    @pytest.fixture(scope="class")
    def auth_headers(self, auth_token):
        """Get auth headers"""
        return {"Authorization": f"Bearer {auth_token}"}


class TestAdsSyncStatus(TestSetup):
    """Test GET /api/marketing/v3/ads/sync/status endpoint"""
    
    def test_sync_status_returns_200(self):
        """Sync status endpoint should return 200"""
        response = requests.get(f"{BASE_URL}/api/marketing/v3/ads/sync/status")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
    
    def test_sync_status_has_meta_key(self):
        """Sync status should have meta platform info"""
        response = requests.get(f"{BASE_URL}/api/marketing/v3/ads/sync/status")
        data = response.json()
        
        assert "meta" in data, "Response missing 'meta' key"
        assert "last_sync" in data["meta"], "Meta missing 'last_sync'"
        assert "campaigns_count" in data["meta"], "Meta missing 'campaigns_count'"
    
    def test_sync_status_has_google_key(self):
        """Sync status should have google platform info"""
        response = requests.get(f"{BASE_URL}/api/marketing/v3/ads/sync/status")
        data = response.json()
        
        assert "google" in data, "Response missing 'google' key"
        assert "last_sync" in data["google"], "Google missing 'last_sync'"
        assert "campaigns_count" in data["google"], "Google missing 'campaigns_count'"


class TestAdsSyncMeta(TestSetup):
    """Test POST /api/marketing/v3/ads/sync/meta endpoint"""
    
    def test_meta_sync_without_credentials_returns_400(self):
        """Meta sync should return 400 when no credentials configured"""
        response = requests.post(f"{BASE_URL}/api/marketing/v3/ads/sync/meta")
        
        # Expected to fail without credentials
        assert response.status_code == 400, f"Expected 400, got {response.status_code}"
    
    def test_meta_sync_error_message_is_helpful(self):
        """Meta sync error should mention Settings > Ad Platforms"""
        response = requests.post(f"{BASE_URL}/api/marketing/v3/ads/sync/meta")
        data = response.json()
        
        assert "detail" in data, "Response should have 'detail' error message"
        assert "Settings" in data["detail"] or "configured" in data["detail"], \
            f"Error message should guide user: {data['detail']}"


class TestAdsSyncGoogle(TestSetup):
    """Test POST /api/marketing/v3/ads/sync/google endpoint"""
    
    def test_google_sync_without_credentials_returns_400(self):
        """Google sync should return 400 when no credentials configured"""
        response = requests.post(f"{BASE_URL}/api/marketing/v3/ads/sync/google")
        
        # Expected to fail without credentials
        assert response.status_code == 400, f"Expected 400, got {response.status_code}"
    
    def test_google_sync_error_message_is_helpful(self):
        """Google sync error should mention Settings > Ad Platforms"""
        response = requests.post(f"{BASE_URL}/api/marketing/v3/ads/sync/google")
        data = response.json()
        
        assert "detail" in data, "Response should have 'detail' error message"
        assert "Settings" in data["detail"] or "configured" in data["detail"], \
            f"Error message should guide user: {data['detail']}"


class TestAdsOverviewStats(TestSetup):
    """Test GET /api/marketing/v3/ads/overview/stats endpoint"""
    
    def test_overview_stats_returns_200(self):
        """Overview stats should return 200"""
        response = requests.get(f"{BASE_URL}/api/marketing/v3/ads/overview/stats")
        assert response.status_code == 200
    
    def test_overview_stats_has_required_fields(self):
        """Overview stats should have all required fields"""
        response = requests.get(f"{BASE_URL}/api/marketing/v3/ads/overview/stats")
        data = response.json()
        
        required_fields = [
            "total_accounts", "total_campaigns", "active_campaigns",
            "total_spend", "total_impressions", "total_clicks"
        ]
        
        for field in required_fields:
            assert field in data, f"Missing required field: {field}"


class TestAdsCampaigns(TestSetup):
    """Test GET /api/marketing/v3/ads/campaigns endpoint"""
    
    def test_ads_campaigns_returns_200(self):
        """Ads campaigns list should return 200"""
        response = requests.get(f"{BASE_URL}/api/marketing/v3/ads/campaigns")
        assert response.status_code == 200
    
    def test_ads_campaigns_returns_list(self):
        """Ads campaigns should return a list"""
        response = requests.get(f"{BASE_URL}/api/marketing/v3/ads/campaigns")
        data = response.json()
        
        assert isinstance(data, list), "Expected list of campaigns"


class TestContentProjectsForLinking(TestSetup):
    """Test GET /api/marketing/v3/content/projects for linking modal"""
    
    def test_content_projects_returns_200(self, auth_headers):
        """Content projects should return 200"""
        response = requests.get(
            f"{BASE_URL}/api/marketing/v3/content/projects",
            headers=auth_headers
        )
        assert response.status_code == 200
    
    def test_content_projects_returns_list(self, auth_headers):
        """Content projects should return a list"""
        response = requests.get(
            f"{BASE_URL}/api/marketing/v3/content/projects",
            headers=auth_headers
        )
        data = response.json()
        
        assert isinstance(data, list), "Expected list of content projects"


class TestPublicationsForLinking(TestSetup):
    """Test GET /api/marketing/v2/publications for linking modal"""
    
    def test_publications_returns_200(self, auth_headers):
        """Publications should return 200"""
        response = requests.get(
            f"{BASE_URL}/api/marketing/v2/publications",
            headers=auth_headers
        )
        assert response.status_code == 200
    
    def test_publications_returns_list(self, auth_headers):
        """Publications should return a list"""
        response = requests.get(
            f"{BASE_URL}/api/marketing/v2/publications",
            headers=auth_headers
        )
        data = response.json()
        
        assert isinstance(data, list), "Expected list of publications"


class TestCampaignDetails(TestSetup):
    """Test campaign details endpoint used by Campaign Details Page"""
    
    CAMPAIGN_ID = "c5c6645c-6d42-4234-9a0f-6f46f3020365"
    
    def test_campaign_details_returns_200(self, auth_headers):
        """Campaign details should return 200"""
        response = requests.get(
            f"{BASE_URL}/api/marketing/campaigns/{self.CAMPAIGN_ID}",
            headers=auth_headers
        )
        assert response.status_code == 200
    
    def test_campaign_details_has_required_fields(self, auth_headers):
        """Campaign details should have essential fields"""
        response = requests.get(
            f"{BASE_URL}/api/marketing/campaigns/{self.CAMPAIGN_ID}",
            headers=auth_headers
        )
        data = response.json()
        
        required_fields = ["id", "name", "status", "budget"]
        for field in required_fields:
            assert field in data, f"Missing field: {field}"


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
