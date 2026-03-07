"""
Sevora Full Application Audit Tests
Comprehensive tests for all Marketing module features
Run with: pytest /app/backend/tests/test_full_audit.py -v
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://sevora-hub.preview.emergentagent.com').rstrip('/')
TEST_PREFIX = "TEST_AUDIT_"

# ============== AUTHENTICATION TESTS ==============
class TestAuthentication:
    """Authentication and access control tests"""
    
    def test_marketing_user_login(self):
        """Login with marketing credentials"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": "marketing@sevora.com", "password": "admin123"}
        )
        assert response.status_code == 200, f"Login failed: {response.text}"
        data = response.json()
        assert "access_token" in data
        assert data["user"]["role"] == "marketing_manager"
        assert "marketing" in data["user"]["departments"]
        print(f"Login successful for: {data['user']['email']}")
    
    def test_admin_user_login(self):
        """Login with admin credentials"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": "admin@sevora.com", "password": "admin123"}
        )
        assert response.status_code == 200
        data = response.json()
        assert data["user"]["role"] == "admin"
        print(f"Admin login successful for: {data['user']['email']}")
    
    def test_invalid_credentials_rejected(self):
        """Invalid credentials return 401"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": "fake@sevora.com", "password": "wrongpass"}
        )
        assert response.status_code == 401


# ============== MARKETING CONTACTS API TESTS ==============
class TestMarketingContactsAPI:
    """Tests for /api/marketing/v2/contacts endpoints"""
    
    @pytest.fixture(scope="class")
    def token(self):
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": "marketing@sevora.com", "password": "admin123"}
        )
        return response.json()["access_token"]
    
    @pytest.fixture(scope="class")
    def headers(self, token):
        return {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}
    
    def test_get_influencer_list(self, headers):
        """GET /api/marketing/v2/contacts returns influencers"""
        response = requests.get(
            f"{BASE_URL}/api/marketing/v2/contacts",
            params={"contact_type": "influencer", "limit": 10},
            headers=headers
        )
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"Found {len(data)} influencers")
        
        # Verify response structure
        if data:
            contact = data[0]
            assert "id" in contact
            assert "name" in contact
            assert "contact_type" in contact
    
    def test_get_specific_contact(self, headers):
        """GET /api/marketing/v2/contacts/{id} returns single contact"""
        contact_id = "3519a431-aa8f-427a-80ab-6e5f1db966fb"
        response = requests.get(
            f"{BASE_URL}/api/marketing/v2/contacts/{contact_id}",
            headers=headers
        )
        assert response.status_code == 200
        data = response.json()
        assert data["id"] == contact_id
        print(f"Contact details: {data.get('name')}")
    
    def test_filter_by_status(self, headers):
        """Filter contacts by status"""
        response = requests.get(
            f"{BASE_URL}/api/marketing/v2/contacts",
            params={"status": "identified"},
            headers=headers
        )
        assert response.status_code == 200
    
    def test_search_contacts(self, headers):
        """Search contacts by name"""
        response = requests.get(
            f"{BASE_URL}/api/marketing/v2/contacts",
            params={"search": "Priya"},
            headers=headers
        )
        assert response.status_code == 200


# ============== COMMUNICATIONS API TESTS ==============
class TestCommunicationsAPI:
    """Tests for communication/outreach endpoints"""
    
    @pytest.fixture(scope="class")
    def token(self):
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": "marketing@sevora.com", "password": "admin123"}
        )
        return response.json()["access_token"]
    
    @pytest.fixture(scope="class")
    def headers(self, token):
        return {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}
    
    def test_get_contact_communications(self, headers):
        """GET /api/marketing/v2/contacts/{id}/communications"""
        contact_id = "3519a431-aa8f-427a-80ab-6e5f1db966fb"
        response = requests.get(
            f"{BASE_URL}/api/marketing/v2/contacts/{contact_id}/communications",
            headers=headers
        )
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"Found {len(data)} communications")
    
    def test_create_communication(self, headers):
        """POST /api/marketing/v2/communications creates a record"""
        contact_id = "3519a431-aa8f-427a-80ab-6e5f1db966fb"
        payload = {
            "contact_id": contact_id,
            "comm_type": "email",
            "subject": f"{TEST_PREFIX}Test Email Subject",
            "message": "This is a test message for the audit",
            "recipient_email": "test@example.com"
        }
        response = requests.post(
            f"{BASE_URL}/api/marketing/v2/communications",
            json=payload,
            headers=headers
        )
        assert response.status_code == 200
        data = response.json()
        assert "id" in data
        assert data["subject"] == payload["subject"]
        print(f"Communication created: {data['id']}")


# ============== DEALS API TESTS ==============
class TestDealsAPI:
    """Tests for deals/negotiations endpoints"""
    
    @pytest.fixture(scope="class")
    def token(self):
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": "marketing@sevora.com", "password": "admin123"}
        )
        return response.json()["access_token"]
    
    @pytest.fixture(scope="class")
    def headers(self, token):
        return {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}
    
    def test_get_contact_deals(self, headers):
        """GET /api/marketing/v2/contacts/{id}/deals"""
        contact_id = "3519a431-aa8f-427a-80ab-6e5f1db966fb"
        response = requests.get(
            f"{BASE_URL}/api/marketing/v2/contacts/{contact_id}/deals",
            headers=headers
        )
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"Found {len(data)} deals")


# ============== GIFTING API TESTS ==============
class TestGiftingAPI:
    """Tests for gifting/seeding endpoints"""
    
    @pytest.fixture(scope="class")
    def token(self):
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": "marketing@sevora.com", "password": "admin123"}
        )
        return response.json()["access_token"]
    
    @pytest.fixture(scope="class")
    def headers(self, token):
        return {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}
    
    def test_get_gifts(self, headers):
        """GET /api/marketing/v2/gifting returns gifts"""
        response = requests.get(
            f"{BASE_URL}/api/marketing/v2/gifting",
            headers=headers
        )
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"Found {len(data)} gift records")
    
    def test_get_gifts_for_contact(self, headers):
        """GET /api/marketing/v2/gifting with contact_id filter"""
        contact_id = "3519a431-aa8f-427a-80ab-6e5f1db966fb"
        response = requests.get(
            f"{BASE_URL}/api/marketing/v2/gifting",
            params={"contact_id": contact_id},
            headers=headers
        )
        assert response.status_code == 200
        data = response.json()
        print(f"Found {len(data)} gifts for contact")


# ============== PROMO CODES API TESTS ==============
class TestPromoCodesAPI:
    """Tests for promo code endpoints"""
    
    @pytest.fixture(scope="class")
    def token(self):
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": "marketing@sevora.com", "password": "admin123"}
        )
        return response.json()["access_token"]
    
    @pytest.fixture(scope="class")
    def headers(self, token):
        return {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}
    
    def test_get_promo_codes(self, headers):
        """GET /api/marketing/v2/promo-codes"""
        response = requests.get(
            f"{BASE_URL}/api/marketing/v2/promo-codes",
            headers=headers
        )
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"Found {len(data)} promo codes")


# ============== CAMPAIGNS API TESTS ==============
class TestCampaignsAPI:
    """Tests for campaign endpoints"""
    
    @pytest.fixture(scope="class")
    def token(self):
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": "marketing@sevora.com", "password": "admin123"}
        )
        return response.json()["access_token"]
    
    @pytest.fixture(scope="class")
    def headers(self, token):
        return {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}
    
    def test_get_campaigns(self, headers):
        """GET /api/marketing/campaigns"""
        response = requests.get(
            f"{BASE_URL}/api/marketing/campaigns",
            headers=headers
        )
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"Found {len(data)} campaigns")
        
        # Verify campaign structure
        if data:
            campaign = data[0]
            assert "id" in campaign
            assert "name" in campaign


# ============== DASHBOARD API TESTS ==============
class TestDashboardAPI:
    """Tests for dashboard endpoints"""
    
    @pytest.fixture(scope="class")
    def token(self):
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": "marketing@sevora.com", "password": "admin123"}
        )
        return response.json()["access_token"]
    
    @pytest.fixture(scope="class")
    def headers(self, token):
        return {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}
    
    def test_get_unified_dashboard(self, headers):
        """GET /api/dashboard/unified"""
        response = requests.get(
            f"{BASE_URL}/api/dashboard/unified",
            headers=headers
        )
        assert response.status_code == 200
        data = response.json()
        # Dashboard has stats.marketing structure
        assert "stats" in data or "marketing" in data
        print(f"Dashboard data retrieved successfully")
    
    def test_get_marketing_dashboard_stats(self, headers):
        """GET /api/marketing/v2/dashboard/stats"""
        response = requests.get(
            f"{BASE_URL}/api/marketing/v2/dashboard/stats",
            headers=headers
        )
        assert response.status_code == 200
        data = response.json()
        assert "contacts" in data
        print(f"Dashboard stats: {data.get('contacts', {}).get('total', 0)} contacts")


# ============== CONTACT UPDATE TESTS ==============
class TestContactUpdate:
    """Tests for contact update functionality"""
    
    @pytest.fixture(scope="class")
    def token(self):
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": "marketing@sevora.com", "password": "admin123"}
        )
        return response.json()["access_token"]
    
    @pytest.fixture(scope="class")
    def headers(self, token):
        return {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}
    
    def test_update_contact_bio(self, headers):
        """PUT /api/marketing/v2/contacts/{id} updates contact"""
        contact_id = "3519a431-aa8f-427a-80ab-6e5f1db966fb"
        
        # First get current data
        get_response = requests.get(
            f"{BASE_URL}/api/marketing/v2/contacts/{contact_id}",
            headers=headers
        )
        current_data = get_response.json()
        
        # Update with new bio
        payload = {
            "name": current_data.get("name", "Test"),
            "bio": f"{TEST_PREFIX}Updated bio for testing"
        }
        response = requests.put(
            f"{BASE_URL}/api/marketing/v2/contacts/{contact_id}",
            json=payload,
            headers=headers
        )
        assert response.status_code == 200
        data = response.json()
        assert "bio" in data
        print(f"Contact updated successfully")


# ============== HEALTH CHECK ==============
class TestHealthCheck:
    """Basic health check"""
    
    def test_api_health(self):
        """Health endpoint returns OK"""
        response = requests.get(f"{BASE_URL}/api/health")
        assert response.status_code == 200


# ============== CLEANUP ==============
class TestCleanup:
    """Clean up test data"""
    
    @pytest.fixture(scope="class")
    def token(self):
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": "admin@sevora.com", "password": "admin123"}
        )
        return response.json()["access_token"]
    
    @pytest.fixture(scope="class")
    def headers(self, token):
        return {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}
    
    def test_cleanup_complete(self, headers):
        """Note: Manual cleanup of TEST_AUDIT_ prefixed data may be needed"""
        print(f"Test audit complete. Review any {TEST_PREFIX} prefixed data for cleanup.")
        assert True
