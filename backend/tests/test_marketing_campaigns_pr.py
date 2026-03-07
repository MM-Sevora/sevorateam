"""
Test suite for Marketing Campaign Hub and Digital PR features
Tests the unified campaign system with type filtering and PR journey
"""
import pytest
import requests
import os
from datetime import datetime

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')
if not BASE_URL:
    BASE_URL = "https://sevora-hub.preview.emergentagent.com"

# Test credentials
TEST_EMAIL = "marketing@sevora.com"
TEST_PASSWORD = "admin123"

@pytest.fixture(scope="module")
def auth_token():
    """Get authentication token"""
    response = requests.post(
        f"{BASE_URL}/api/auth/login",
        json={"email": TEST_EMAIL, "password": TEST_PASSWORD}
    )
    assert response.status_code == 200, f"Login failed: {response.text}"
    return response.json()["access_token"]

@pytest.fixture(scope="module")
def auth_headers(auth_token):
    """Get auth headers"""
    return {
        "Authorization": f"Bearer {auth_token}",
        "Content-Type": "application/json"
    }

# ============== CAMPAIGN HUB TESTS ==============

class TestCampaignHub:
    """Campaign Hub API tests"""
    
    def test_get_influencer_campaigns(self, auth_headers):
        """Test GET /api/marketing/campaigns - Influencer campaigns"""
        response = requests.get(
            f"{BASE_URL}/api/marketing/campaigns",
            headers=auth_headers
        )
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        assert isinstance(data, list)
        print(f"Influencer campaigns count: {len(data)}")
        
        # Verify campaign structure
        if data:
            campaign = data[0]
            assert "id" in campaign
            assert "name" in campaign
            assert "status" in campaign
    
    def test_get_pr_campaigns(self, auth_headers):
        """Test GET /api/marketing/v2/pr/campaigns - PR campaigns"""
        response = requests.get(
            f"{BASE_URL}/api/marketing/v2/pr/campaigns",
            headers=auth_headers
        )
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        assert isinstance(data, list)
        print(f"PR campaigns count: {len(data)}")
        
        # Verify PR campaign structure if exists
        if data:
            campaign = data[0]
            assert "id" in campaign
            assert "name" in campaign
    
    def test_create_influencer_campaign(self, auth_headers):
        """Test POST /api/marketing/campaigns - Create Influencer campaign"""
        payload = {
            "name": f"TEST_Influencer_Campaign_{datetime.now().strftime('%H%M%S')}",
            "objective": "awareness",
            "budget": 100000,
            "start_date": "2026-04-01",
            "end_date": "2026-05-01",
            "target_market": "Urban Women 25-35",
            "description": "Test influencer campaign",
            "campaign_type": "influencer"
        }
        response = requests.post(
            f"{BASE_URL}/api/marketing/campaigns",
            json=payload,
            headers=auth_headers
        )
        assert response.status_code in [200, 201], f"Failed: {response.text}"
        data = response.json()
        assert data["name"] == payload["name"]
        print(f"Created influencer campaign: {data['id']}")
        return data["id"]
    
    def test_create_pr_campaign(self, auth_headers):
        """Test POST /api/marketing/v2/pr/campaigns - Create PR campaign"""
        payload = {
            "name": f"TEST_PR_Campaign_{datetime.now().strftime('%H%M%S')}",
            "objective": "media_coverage",
            "description": "Test PR campaign for media outreach",
            "start_date": "2026-04-01",
            "end_date": "2026-05-01",
            "budget": 50000,
            "key_messages": ["Brand innovation", "Sustainability"],
            "target_publications": ["Vogue", "Elle", "Femina"],
            "target_beats": ["Fashion", "Lifestyle"]
        }
        response = requests.post(
            f"{BASE_URL}/api/marketing/v2/pr/campaigns",
            json=payload,
            headers=auth_headers
        )
        assert response.status_code in [200, 201], f"Failed: {response.text}"
        data = response.json()
        assert data["name"] == payload["name"]
        assert "id" in data
        print(f"Created PR campaign: {data['id']}")
        return data["id"]

# ============== DIGITAL PR TESTS ==============

class TestDigitalPRMediaResearch:
    """Digital PR - Media Research tab tests"""
    
    def test_get_journalists(self, auth_headers):
        """Test GET /api/marketing/v2/contacts - Get journalists"""
        response = requests.get(
            f"{BASE_URL}/api/marketing/v2/contacts",
            params={"contact_type": "journalist", "limit": 100},
            headers=auth_headers
        )
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        assert isinstance(data, list)
        print(f"Journalists count: {len(data)}")
        
        # Verify structure
        if data:
            journalist = data[0]
            assert "id" in journalist
            assert "name" in journalist
    
    def test_create_journalist(self, auth_headers):
        """Test POST /api/marketing/v2/contacts - Add journalist"""
        payload = {
            "name": f"TEST_Journalist_{datetime.now().strftime('%H%M%S')}",
            "email": f"test_{datetime.now().strftime('%H%M%S')}@testpub.com",
            "publication": "Test Publication",
            "role": "Senior Editor",
            "beat": "Fashion",
            "location": "Mumbai",
            "contact_type": "journalist",
            "domain_authority": 75,
            "monthly_traffic": 500000
        }
        response = requests.post(
            f"{BASE_URL}/api/marketing/v2/contacts",
            json=payload,
            headers=auth_headers
        )
        assert response.status_code in [200, 201], f"Failed: {response.text}"
        data = response.json()
        assert data["name"] == payload["name"]
        assert "id" in data
        print(f"Created journalist: {data['id']}")
        return data["id"]
    
    def test_filter_journalists_by_beat(self, auth_headers):
        """Test filtering journalists by beat"""
        response = requests.get(
            f"{BASE_URL}/api/marketing/v2/contacts",
            params={"contact_type": "journalist", "beat": "Fashion"},
            headers=auth_headers
        )
        # This might need query param adjustment if beat filter isn't direct
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        print(f"Fashion journalists: {len(data)}")

class TestDigitalPROutreach:
    """Digital PR - Outreach tab tests"""
    
    def test_get_pitches(self, auth_headers):
        """Test GET /api/marketing/v2/pr/pitches - Get pitches"""
        response = requests.get(
            f"{BASE_URL}/api/marketing/v2/pr/pitches",
            headers=auth_headers
        )
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        assert isinstance(data, list)
        print(f"Pitches count: {len(data)}")
    
    def test_create_pitch(self, auth_headers):
        """Test POST /api/marketing/v2/pr/pitches - Create pitch"""
        # First get a journalist
        contacts_response = requests.get(
            f"{BASE_URL}/api/marketing/v2/contacts",
            params={"contact_type": "journalist", "limit": 1},
            headers=auth_headers
        )
        contacts = contacts_response.json()
        if not contacts:
            pytest.skip("No journalists available for pitch test")
        
        contact_id = contacts[0]["id"]
        
        payload = {
            "contact_id": contact_id,
            "subject": f"TEST_Pitch_{datetime.now().strftime('%H%M%S')}",
            "message": "Test pitch message for exclusive story opportunity",
            "pr_campaign_id": ""  # Optional
        }
        response = requests.post(
            f"{BASE_URL}/api/marketing/v2/pr/pitches",
            json=payload,
            headers=auth_headers
        )
        assert response.status_code in [200, 201], f"Failed: {response.text}"
        data = response.json()
        assert "id" in data
        print(f"Created pitch: {data['id']}")
        return data["id"]
    
    def test_update_pitch_status(self, auth_headers):
        """Test PUT /api/marketing/v2/pr/pitches/{id}/status - Update status"""
        # First get a pitch
        pitches_response = requests.get(
            f"{BASE_URL}/api/marketing/v2/pr/pitches",
            headers=auth_headers
        )
        pitches = pitches_response.json()
        if not pitches:
            pytest.skip("No pitches available for status update test")
        
        pitch_id = pitches[0]["id"]
        
        response = requests.put(
            f"{BASE_URL}/api/marketing/v2/pr/pitches/{pitch_id}/status",
            params={"status": "pitch_sent"},
            headers=auth_headers
        )
        assert response.status_code == 200, f"Failed: {response.text}"
        print(f"Updated pitch status: {pitch_id}")

class TestDigitalPRCoverage:
    """Digital PR - Coverage tab tests"""
    
    def test_get_coverage(self, auth_headers):
        """Test GET /api/marketing/v2/pr/coverage - Get coverage"""
        response = requests.get(
            f"{BASE_URL}/api/marketing/v2/pr/coverage",
            headers=auth_headers
        )
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        assert isinstance(data, list)
        print(f"Coverage count: {len(data)}")
    
    def test_record_coverage(self, auth_headers):
        """Test POST /api/marketing/v2/pr/coverage - Record coverage
        Note: Backend expects: article, mention, feature, interview, review
        Frontend uses: earned, paid, sponsored, partnership - MISMATCH BUG
        """
        payload = {
            "title": f"TEST_Coverage_{datetime.now().strftime('%H%M%S')}",
            "publication": "Test Fashion Magazine",
            "url": "https://example.com/article",
            "published_date": "2026-03-07",
            "coverage_type": "article",  # Use valid backend enum
            "sentiment": "positive"
        }
        response = requests.post(
            f"{BASE_URL}/api/marketing/v2/pr/coverage",
            json=payload,
            headers=auth_headers
        )
        assert response.status_code in [200, 201], f"Failed: {response.text}"
        data = response.json()
        assert "id" in data
        print(f"Recorded coverage: {data['id']}")

class TestDigitalPRAIDiscovery:
    """Digital PR - AI Discovery tab tests"""
    
    def test_ai_discover_journalists(self, auth_headers):
        """Test POST /api/marketing/v2/pr/ai-discover - AI journalist discovery"""
        payload = {
            "topic": "Sustainable fashion collection launch",
            "industry": "Fashion",
            "story_type": "news",
            "target_audience": "Fashion-conscious millennials"
        }
        response = requests.post(
            f"{BASE_URL}/api/marketing/v2/pr/ai-discover",
            json=payload,
            headers=auth_headers
        )
        # AI discovery might fail if no journalists in DB, so we check for valid response
        assert response.status_code in [200, 400], f"Unexpected status: {response.status_code}"
        if response.status_code == 200:
            data = response.json()
            assert "success" in data
            print(f"AI Discovery result: success={data.get('success')}")

# ============== CAMPAIGN FILTER TESTS ==============

class TestCampaignFilters:
    """Test campaign filtering functionality"""
    
    def test_events_endpoint(self, auth_headers):
        """Test GET /api/marketing/v2/events - Events endpoint used by Campaign Hub"""
        response = requests.get(
            f"{BASE_URL}/api/marketing/v2/events",
            headers=auth_headers
        )
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        assert isinstance(data, list)
        print(f"Events count: {len(data)}")

# ============== STATS VERIFICATION ==============

class TestDashboardStats:
    """Verify dashboard stats are calculating correctly"""
    
    def test_pr_dashboard_stats(self, auth_headers):
        """Verify Digital PR stats calculation"""
        # Get journalists
        j_response = requests.get(
            f"{BASE_URL}/api/marketing/v2/contacts",
            params={"contact_type": "journalist"},
            headers=auth_headers
        )
        journalists = j_response.json()
        
        # Get pitches
        p_response = requests.get(
            f"{BASE_URL}/api/marketing/v2/pr/pitches",
            headers=auth_headers
        )
        pitches = p_response.json()
        
        # Get coverage
        c_response = requests.get(
            f"{BASE_URL}/api/marketing/v2/pr/coverage",
            headers=auth_headers
        )
        coverage = c_response.json()
        
        print(f"Stats: Journalists={len(journalists)}, Pitches={len(pitches)}, Coverage={len(coverage)}")
        
        # Verify all are valid responses
        assert isinstance(journalists, list)
        assert isinstance(pitches, list)
        assert isinstance(coverage, list)

if __name__ == "__main__":
    pytest.main([__file__, "-v"])
