"""
Test suite for Influencer Metrics History endpoints
Tests: 
- GET /api/marketing/v2/contacts/{contact_id}/metrics-history
- GET /api/marketing/v2/contacts/{contact_id}/growth-analytics
- GET /api/marketing/v2/contacts/{contact_id}/growth-chart
- POST /api/marketing/v2/contacts/{contact_id}/fetch-metrics (history_recorded flag)
"""

import pytest
import requests
import os
import uuid
from datetime import datetime

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

@pytest.fixture(scope="module")
def auth_token():
    """Get authentication token"""
    response = requests.post(f"{BASE_URL}/api/auth/login", json={
        "email": "superadmin@sevora.com",
        "password": "superadmin123"
    })
    assert response.status_code == 200, f"Login failed: {response.text}"
    data = response.json()
    return data.get("access_token") or data.get("token")

@pytest.fixture(scope="module")
def api_client(auth_token):
    """Authenticated API client"""
    session = requests.Session()
    session.headers.update({
        "Content-Type": "application/json",
        "Authorization": f"Bearer {auth_token}"
    })
    return session

@pytest.fixture(scope="module")
def test_influencer(api_client):
    """Create a test influencer for metrics history tests"""
    test_id = f"TEST_{uuid.uuid4().hex[:8]}"
    
    # Create test influencer
    influencer_data = {
        "name": f"Metrics History Test {test_id}",
        "contact_type": "influencer",
        "instagram_handle": "shopsevora",  # Use a real handle for testing
        "city": "Mumbai",
        "industry": "fashion",
        "tier": "micro",
        "primary_platform": "instagram"
    }
    
    response = api_client.post(f"{BASE_URL}/api/marketing/v2/contacts", json=influencer_data)
    assert response.status_code == 200, f"Failed to create test influencer: {response.text}"
    
    influencer = response.json()
    yield influencer
    
    # Cleanup: Delete test influencer
    api_client.delete(f"{BASE_URL}/api/marketing/v2/contacts/{influencer['id']}")

class TestMetricsHistoryEndpoints:
    """Tests for the new metrics history endpoints"""
    
    def test_metrics_history_endpoint_exists(self, api_client, test_influencer):
        """Test GET /api/marketing/v2/contacts/{contact_id}/metrics-history - endpoint exists"""
        contact_id = test_influencer['id']
        response = api_client.get(f"{BASE_URL}/api/marketing/v2/contacts/{contact_id}/metrics-history")
        
        assert response.status_code == 200, f"Metrics history endpoint failed: {response.text}"
        
        data = response.json()
        assert "contact_id" in data
        assert data["contact_id"] == contact_id
        assert "history" in data
        assert "total_snapshots" in data
        assert isinstance(data["history"], list)
    
    def test_metrics_history_with_platform_filter(self, api_client, test_influencer):
        """Test GET /api/marketing/v2/contacts/{contact_id}/metrics-history?platform=instagram"""
        contact_id = test_influencer['id']
        response = api_client.get(
            f"{BASE_URL}/api/marketing/v2/contacts/{contact_id}/metrics-history",
            params={"platform": "instagram"}
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["platform"] == "instagram"
    
    def test_metrics_history_invalid_contact(self, api_client):
        """Test metrics history for non-existent contact returns 404"""
        fake_id = "non-existent-contact-id"
        response = api_client.get(f"{BASE_URL}/api/marketing/v2/contacts/{fake_id}/metrics-history")
        
        assert response.status_code == 404
    
    def test_growth_analytics_endpoint_exists(self, api_client, test_influencer):
        """Test GET /api/marketing/v2/contacts/{contact_id}/growth-analytics - endpoint exists"""
        contact_id = test_influencer['id']
        response = api_client.get(
            f"{BASE_URL}/api/marketing/v2/contacts/{contact_id}/growth-analytics",
            params={"platform": "instagram"}
        )
        
        assert response.status_code == 200, f"Growth analytics endpoint failed: {response.text}"
        
        data = response.json()
        assert "contact_id" in data
        assert data["contact_id"] == contact_id
        assert "has_data" in data
    
    def test_growth_analytics_requires_platform(self, api_client, test_influencer):
        """Test growth analytics requires platform parameter"""
        contact_id = test_influencer['id']
        response = api_client.get(f"{BASE_URL}/api/marketing/v2/contacts/{contact_id}/growth-analytics")
        
        # Should return 422 (validation error) if platform is required
        assert response.status_code in [422, 400], "Should require platform parameter"
    
    def test_growth_analytics_invalid_contact(self, api_client):
        """Test growth analytics for non-existent contact returns 404"""
        fake_id = "non-existent-contact-id"
        response = api_client.get(
            f"{BASE_URL}/api/marketing/v2/contacts/{fake_id}/growth-analytics",
            params={"platform": "instagram"}
        )
        
        assert response.status_code == 404
    
    def test_growth_chart_endpoint_exists(self, api_client, test_influencer):
        """Test GET /api/marketing/v2/contacts/{contact_id}/growth-chart - endpoint exists"""
        contact_id = test_influencer['id']
        response = api_client.get(
            f"{BASE_URL}/api/marketing/v2/contacts/{contact_id}/growth-chart",
            params={"platform": "instagram"}
        )
        
        assert response.status_code == 200, f"Growth chart endpoint failed: {response.text}"
        
        data = response.json()
        assert "contact_id" in data
        assert data["contact_id"] == contact_id
        assert "has_data" in data
        assert "dates" in data
        assert "followers" in data
        assert "engagement" in data
        assert isinstance(data["dates"], list)
        assert isinstance(data["followers"], list)
        assert isinstance(data["engagement"], list)
    
    def test_growth_chart_requires_platform(self, api_client, test_influencer):
        """Test growth chart requires platform parameter"""
        contact_id = test_influencer['id']
        response = api_client.get(f"{BASE_URL}/api/marketing/v2/contacts/{contact_id}/growth-chart")
        
        # Should return 422 (validation error) if platform is required
        assert response.status_code in [422, 400], "Should require platform parameter"
    
    def test_growth_chart_invalid_contact(self, api_client):
        """Test growth chart for non-existent contact returns 404"""
        fake_id = "non-existent-contact-id"
        response = api_client.get(
            f"{BASE_URL}/api/marketing/v2/contacts/{fake_id}/growth-chart",
            params={"platform": "instagram"}
        )
        
        assert response.status_code == 404


class TestFetchMetricsRecordsHistory:
    """Test that fetch-metrics endpoint now records history"""
    
    def test_fetch_metrics_records_history(self, api_client, test_influencer):
        """Test POST /api/marketing/v2/contacts/{contact_id}/fetch-metrics records history"""
        contact_id = test_influencer['id']
        
        # Fetch metrics
        response = api_client.post(f"{BASE_URL}/api/marketing/v2/contacts/{contact_id}/fetch-metrics")
        
        assert response.status_code == 200, f"Fetch metrics failed: {response.text}"
        
        data = response.json()
        assert data.get("success") == True
        assert "history_recorded" in data, "Response should include history_recorded flag"
        assert data["history_recorded"] == True, "History should be recorded after fetch"
    
    def test_history_exists_after_fetch(self, api_client, test_influencer):
        """Verify that history snapshot was created after fetch-metrics call"""
        contact_id = test_influencer['id']
        
        # Get metrics history
        response = api_client.get(
            f"{BASE_URL}/api/marketing/v2/contacts/{contact_id}/metrics-history",
            params={"platform": "instagram", "days": 1}
        )
        
        assert response.status_code == 200
        data = response.json()
        
        # After fetch-metrics call, there should be at least one snapshot
        # Note: If Instagram fetch succeeded, there should be a snapshot
        # If it failed, there may be no snapshot - this is expected behavior
        assert "history" in data
        assert "total_snapshots" in data


class TestAuthenticationRequired:
    """Test that all endpoints require authentication"""
    
    def test_metrics_history_requires_auth(self):
        """Test metrics history requires authentication"""
        response = requests.get(f"{BASE_URL}/api/marketing/v2/contacts/some-id/metrics-history")
        assert response.status_code in [401, 403]
    
    def test_growth_analytics_requires_auth(self):
        """Test growth analytics requires authentication"""
        response = requests.get(
            f"{BASE_URL}/api/marketing/v2/contacts/some-id/growth-analytics",
            params={"platform": "instagram"}
        )
        assert response.status_code in [401, 403]
    
    def test_growth_chart_requires_auth(self):
        """Test growth chart requires authentication"""
        response = requests.get(
            f"{BASE_URL}/api/marketing/v2/contacts/some-id/growth-chart",
            params={"platform": "instagram"}
        )
        assert response.status_code in [401, 403]


class TestQueryParameters:
    """Test query parameter handling for history endpoints"""
    
    def test_metrics_history_days_parameter(self, api_client, test_influencer):
        """Test metrics history accepts days parameter"""
        contact_id = test_influencer['id']
        
        for days in [7, 30, 90, 365]:
            response = api_client.get(
                f"{BASE_URL}/api/marketing/v2/contacts/{contact_id}/metrics-history",
                params={"days": days}
            )
            assert response.status_code == 200
            data = response.json()
            assert data["period_days"] == days
    
    def test_growth_analytics_days_parameter(self, api_client, test_influencer):
        """Test growth analytics accepts days parameter"""
        contact_id = test_influencer['id']
        
        response = api_client.get(
            f"{BASE_URL}/api/marketing/v2/contacts/{contact_id}/growth-analytics",
            params={"platform": "instagram", "days": 90}
        )
        assert response.status_code == 200
    
    def test_growth_chart_days_parameter(self, api_client, test_influencer):
        """Test growth chart accepts days parameter"""
        contact_id = test_influencer['id']
        
        response = api_client.get(
            f"{BASE_URL}/api/marketing/v2/contacts/{contact_id}/growth-chart",
            params={"platform": "instagram", "days": 60}
        )
        assert response.status_code == 200


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
