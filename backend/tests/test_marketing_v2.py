"""
Marketing V2 API Tests - Deliveries Bug Fix & New Modules
Testing: Deliveries, Contacts with Deliverables, Campaign Hub, Outreach Dashboard, Deal Pipeline
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestAuth:
    """Authentication tests for marketing user"""
    
    @pytest.fixture(scope="class")
    def auth_token(self):
        """Get auth token for marketing user"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": "marketing@sevora.com", "password": "admin123"},
            headers={"Content-Type": "application/json"}
        )
        if response.status_code == 200:
            return response.json().get("access_token")
        pytest.skip("Authentication failed")
    
    def test_login_success(self):
        """Test marketing user can login"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": "marketing@sevora.com", "password": "admin123"},
            headers={"Content-Type": "application/json"}
        )
        assert response.status_code == 200, f"Login failed: {response.text}"
        data = response.json()
        assert "access_token" in data
        assert data["user"]["email"] == "marketing@sevora.com"


class TestContactsWithDeliverables:
    """Test contacts endpoint with deliverables (rate cards)"""
    
    @pytest.fixture(scope="class")
    def auth_token(self):
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": "marketing@sevora.com", "password": "admin123"},
            headers={"Content-Type": "application/json"}
        )
        if response.status_code == 200:
            return response.json().get("access_token")
        pytest.skip("Authentication failed")
    
    @pytest.fixture(scope="class")
    def api_client(self, auth_token):
        session = requests.Session()
        session.headers.update({
            "Content-Type": "application/json",
            "Authorization": f"Bearer {auth_token}"
        })
        return session
    
    def test_get_contact_with_deliverables(self, api_client):
        """Test GET /contacts/{id} returns deliverables field for Nivrity Das"""
        # Test influencer ID with rate cards
        contact_id = "f4c76400-f85c-465b-bdce-c1bd941912a9"
        response = api_client.get(f"{BASE_URL}/api/marketing/v2/contacts/{contact_id}")
        
        assert response.status_code == 200, f"Failed to get contact: {response.text}"
        data = response.json()
        
        # Verify contact name
        assert data.get("name") == "Nivrity Das", "Contact name mismatch"
        
        # Verify deliverables field exists and has rate cards
        assert "deliverables" in data, "Missing 'deliverables' field"
        deliverables = data.get("deliverables", [])
        assert len(deliverables) >= 4, f"Expected at least 4 rate cards, got {len(deliverables)}"
        
        # Verify rate card structure
        rate_card_names = [d.get("name") for d in deliverables]
        assert "Static Post" in rate_card_names, "Missing 'Static Post' rate card"
        assert "Reel / Short" in rate_card_names, "Missing 'Reel / Short' rate card"
    
    def test_get_contact_deliverables_endpoint(self, api_client):
        """Test dedicated GET /contacts/{id}/deliverables endpoint"""
        contact_id = "f4c76400-f85c-465b-bdce-c1bd941912a9"
        response = api_client.get(f"{BASE_URL}/api/marketing/v2/contacts/{contact_id}/deliverables")
        
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        
        assert isinstance(data, list), "Expected list of deliverables"
        assert len(data) >= 4, f"Expected at least 4 deliverables, got {len(data)}"
        
        # Verify each deliverable has required fields
        for d in data:
            assert "id" in d, "Missing 'id' field"
            assert "name" in d, "Missing 'name' field"
            assert "price" in d or "rate" in d, "Missing price/rate field"


class TestDeliveriesModule:
    """Test deliveries (influencer content tracking) module"""
    
    @pytest.fixture(scope="class")
    def auth_token(self):
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": "marketing@sevora.com", "password": "admin123"},
            headers={"Content-Type": "application/json"}
        )
        if response.status_code == 200:
            return response.json().get("access_token")
        pytest.skip("Authentication failed")
    
    @pytest.fixture(scope="class")
    def api_client(self, auth_token):
        session = requests.Session()
        session.headers.update({
            "Content-Type": "application/json",
            "Authorization": f"Bearer {auth_token}"
        })
        return session
    
    def test_get_deliveries_list(self, api_client):
        """Test GET /deliveries/influencer returns list with contact_name"""
        response = api_client.get(f"{BASE_URL}/api/marketing/v2/deliveries/influencer")
        
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        
        assert isinstance(data, list), "Expected list of deliveries"
        
        # Find delivery with known contact (Nivrity Das)
        nivrity_deliveries = [d for d in data if d.get("contact_name") == "Nivrity Das"]
        assert len(nivrity_deliveries) >= 1, "Expected at least 1 delivery for Nivrity Das"
        
        # Verify delivery has required fields
        delivery = nivrity_deliveries[0]
        assert "contact_name" in delivery, "Missing contact_name"
        assert delivery["contact_name"] == "Nivrity Das", "Contact name should be 'Nivrity Das'"


class TestCampaignHub:
    """Test Campaign Hub module"""
    
    @pytest.fixture(scope="class")
    def auth_token(self):
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": "marketing@sevora.com", "password": "admin123"},
            headers={"Content-Type": "application/json"}
        )
        if response.status_code == 200:
            return response.json().get("access_token")
        pytest.skip("Authentication failed")
    
    @pytest.fixture(scope="class")
    def api_client(self, auth_token):
        session = requests.Session()
        session.headers.update({
            "Content-Type": "application/json",
            "Authorization": f"Bearer {auth_token}"
        })
        return session
    
    def test_get_unified_campaigns(self, api_client):
        """Test GET /unified-campaigns returns campaign list"""
        response = api_client.get(f"{BASE_URL}/api/marketing/v2/unified-campaigns")
        
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        
        assert isinstance(data, list), "Expected list of campaigns"
        assert len(data) >= 1, "Expected at least 1 campaign"
        
        # Verify campaign structure
        campaign = data[0]
        assert "name" in campaign, "Missing 'name' field"
        assert "campaign_type" in campaign, "Missing 'campaign_type' field"
        assert "status" in campaign, "Missing 'status' field"


class TestOutreachDashboard:
    """Test Outreach Dashboard module"""
    
    @pytest.fixture(scope="class")
    def auth_token(self):
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": "marketing@sevora.com", "password": "admin123"},
            headers={"Content-Type": "application/json"}
        )
        if response.status_code == 200:
            return response.json().get("access_token")
        pytest.skip("Authentication failed")
    
    @pytest.fixture(scope="class")
    def api_client(self, auth_token):
        session = requests.Session()
        session.headers.update({
            "Content-Type": "application/json",
            "Authorization": f"Bearer {auth_token}"
        })
        return session
    
    def test_get_outreach_list(self, api_client):
        """Test GET /outreach/all returns communications list"""
        response = api_client.get(f"{BASE_URL}/api/marketing/v2/outreach/all")
        
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        
        assert isinstance(data, list), "Expected list of outreach items"
        
        if len(data) > 0:
            item = data[0]
            assert "status" in item, "Missing 'status' field"


class TestDealPipeline:
    """Test Deal Pipeline module"""
    
    @pytest.fixture(scope="class")
    def auth_token(self):
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": "marketing@sevora.com", "password": "admin123"},
            headers={"Content-Type": "application/json"}
        )
        if response.status_code == 200:
            return response.json().get("access_token")
        pytest.skip("Authentication failed")
    
    @pytest.fixture(scope="class")
    def api_client(self, auth_token):
        session = requests.Session()
        session.headers.update({
            "Content-Type": "application/json",
            "Authorization": f"Bearer {auth_token}"
        })
        return session
    
    def test_get_contact_deals(self, api_client):
        """Test GET /contacts/{id}/deals returns deals for contact"""
        contact_id = "f4c76400-f85c-465b-bdce-c1bd941912a9"
        response = api_client.get(f"{BASE_URL}/api/marketing/v2/contacts/{contact_id}/deals")
        
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        
        assert isinstance(data, list), "Expected list of deals"
        # Empty list is valid if no deals exist for this contact


class TestContactsList:
    """Test contacts list endpoint"""
    
    @pytest.fixture(scope="class")
    def auth_token(self):
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": "marketing@sevora.com", "password": "admin123"},
            headers={"Content-Type": "application/json"}
        )
        if response.status_code == 200:
            return response.json().get("access_token")
        pytest.skip("Authentication failed")
    
    @pytest.fixture(scope="class")
    def api_client(self, auth_token):
        session = requests.Session()
        session.headers.update({
            "Content-Type": "application/json",
            "Authorization": f"Bearer {auth_token}"
        })
        return session
    
    def test_get_influencer_contacts(self, api_client):
        """Test GET /contacts with contact_type=influencer filter"""
        response = api_client.get(
            f"{BASE_URL}/api/marketing/v2/contacts",
            params={"contact_type": "influencer"}
        )
        
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        
        assert isinstance(data, list), "Expected list of contacts"
        
        # Verify Nivrity Das is in the list
        names = [c.get("name") for c in data]
        assert "Nivrity Das" in names, "Nivrity Das not found in influencers list"
