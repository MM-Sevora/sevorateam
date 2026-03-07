"""
Marketing V2 API Tests - Contacts Hub, Digital PR, Events, Content & Assets
Tests for the complete restructure of Marketing module for Sevora Team
"""
import pytest
import requests
import os
import uuid

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test data prefix for easy cleanup
TEST_PREFIX = "TEST_MARKETING_V2_"

class TestMarketingV2Setup:
    """Setup and authentication tests"""
    
    @pytest.fixture(scope="class")
    def auth_token(self):
        """Get authentication token for admin user"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": "admin@sevora.com", "password": "admin123"}
        )
        assert response.status_code == 200, f"Login failed: {response.text}"
        return response.json()["access_token"]
    
    @pytest.fixture(scope="class")
    def headers(self, auth_token):
        """Get headers with auth token"""
        return {
            "Authorization": f"Bearer {auth_token}",
            "Content-Type": "application/json"
        }
    
    def test_auth_login(self):
        """Test admin login works"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": "admin@sevora.com", "password": "admin123"}
        )
        assert response.status_code == 200
        data = response.json()
        assert "access_token" in data
        assert data["user"]["role"] == "admin"


class TestContactsHub:
    """Tests for Contacts Hub - unified influencers, journalists, bloggers"""
    
    @pytest.fixture(scope="class")
    def auth_token(self):
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": "admin@sevora.com", "password": "admin123"}
        )
        return response.json()["access_token"]
    
    @pytest.fixture(scope="class")
    def headers(self, auth_token):
        return {
            "Authorization": f"Bearer {auth_token}",
            "Content-Type": "application/json"
        }
    
    def test_get_contacts(self, headers):
        """GET /api/marketing/v2/contacts returns contacts list"""
        response = requests.get(f"{BASE_URL}/api/marketing/v2/contacts", headers=headers)
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"Found {len(data)} contacts")
    
    def test_get_contacts_with_filters(self, headers):
        """GET /api/marketing/v2/contacts supports filtering"""
        # Filter by contact_type
        response = requests.get(
            f"{BASE_URL}/api/marketing/v2/contacts?contact_type=influencer",
            headers=headers
        )
        assert response.status_code == 200
        data = response.json()
        for contact in data:
            assert contact["contact_type"] == "influencer"
    
    def test_create_contact_influencer(self, headers):
        """POST /api/marketing/v2/contacts creates influencer"""
        contact_data = {
            "name": f"{TEST_PREFIX}Influencer_{uuid.uuid4().hex[:8]}",
            "contact_type": "influencer",
            "email": f"test_influencer_{uuid.uuid4().hex[:8]}@test.com",
            "city": "Mumbai",
            "country": "India",
            "industry": "fashion",
            "tier": "macro",
            "followers": 500000,
            "engagement_rate": 4.2
        }
        response = requests.post(
            f"{BASE_URL}/api/marketing/v2/contacts",
            headers=headers,
            json=contact_data
        )
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        assert data["name"] == contact_data["name"]
        assert data["contact_type"] == "influencer"
        assert "id" in data
        assert data["score"] > 0  # Score should be calculated
        print(f"Created influencer contact with score: {data['score']}")
    
    def test_create_contact_journalist(self, headers):
        """POST /api/marketing/v2/contacts creates journalist"""
        contact_data = {
            "name": f"{TEST_PREFIX}Journalist_{uuid.uuid4().hex[:8]}",
            "contact_type": "journalist",
            "email": f"test_journalist_{uuid.uuid4().hex[:8]}@test.com",
            "city": "Delhi",
            "country": "India",
            "industry": "fashion",
            "publication": "Vogue India",
            "beat": "fashion",
            "editor_level": "editor"
        }
        response = requests.post(
            f"{BASE_URL}/api/marketing/v2/contacts",
            headers=headers,
            json=contact_data
        )
        assert response.status_code == 200
        data = response.json()
        assert data["contact_type"] == "journalist"
        assert data["publication"] == "Vogue India"
    
    def test_get_single_contact(self, headers):
        """GET /api/marketing/v2/contacts/{id} returns single contact"""
        # First create a contact
        contact_data = {
            "name": f"{TEST_PREFIX}Single_{uuid.uuid4().hex[:8]}",
            "contact_type": "blogger",
            "email": f"single_{uuid.uuid4().hex[:8]}@test.com",
            "city": "Bangalore",
            "industry": "lifestyle"
        }
        create_response = requests.post(
            f"{BASE_URL}/api/marketing/v2/contacts",
            headers=headers,
            json=contact_data
        )
        contact_id = create_response.json()["id"]
        
        # Then fetch it
        response = requests.get(
            f"{BASE_URL}/api/marketing/v2/contacts/{contact_id}",
            headers=headers
        )
        assert response.status_code == 200
        data = response.json()
        assert data["id"] == contact_id
        assert data["name"] == contact_data["name"]
    
    def test_contact_stats(self, headers):
        """GET /api/marketing/v2/contacts/{id}/stats returns statistics"""
        # Get first contact
        contacts_response = requests.get(
            f"{BASE_URL}/api/marketing/v2/contacts?limit=1",
            headers=headers
        )
        if contacts_response.json():
            contact_id = contacts_response.json()[0]["id"]
            response = requests.get(
                f"{BASE_URL}/api/marketing/v2/contacts/{contact_id}/stats",
                headers=headers
            )
            assert response.status_code == 200
            data = response.json()
            assert "contact_id" in data
            assert "communications" in data
            assert "deals" in data
            assert "total_paid" in data


class TestDeals:
    """Tests for Deals & Contracts functionality"""
    
    @pytest.fixture(scope="class")
    def headers(self):
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": "admin@sevora.com", "password": "admin123"}
        )
        return {
            "Authorization": f"Bearer {response.json()['access_token']}",
            "Content-Type": "application/json"
        }
    
    @pytest.fixture(scope="class")
    def test_contact_id(self, headers):
        """Create a test contact for deals"""
        contact_data = {
            "name": f"{TEST_PREFIX}DealContact_{uuid.uuid4().hex[:8]}",
            "contact_type": "influencer",
            "email": f"deal_contact_{uuid.uuid4().hex[:8]}@test.com",
            "industry": "fashion"
        }
        response = requests.post(
            f"{BASE_URL}/api/marketing/v2/contacts",
            headers=headers,
            json=contact_data
        )
        return response.json()["id"]
    
    def test_create_deal(self, headers, test_contact_id):
        """POST /api/marketing/v2/deals creates a deal"""
        deal_data = {
            "contact_id": test_contact_id,
            "initial_quote": 75000,
            "our_budget": 60000,
            "notes": f"{TEST_PREFIX}Test deal notes",
            "deliverables": []
        }
        response = requests.post(
            f"{BASE_URL}/api/marketing/v2/deals",
            headers=headers,
            json=deal_data
        )
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        assert data["initial_quote"] == 75000
        assert data["our_budget"] == 60000
        assert data["status"] == "pending"
        assert len(data["timeline"]) > 0
        print(f"Created deal with ID: {data['id']}")
    
    def test_get_contact_deals(self, headers, test_contact_id):
        """GET /api/marketing/v2/contacts/{id}/deals returns contact deals"""
        response = requests.get(
            f"{BASE_URL}/api/marketing/v2/contacts/{test_contact_id}/deals",
            headers=headers
        )
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)


class TestCommunications:
    """Tests for Communications logging"""
    
    @pytest.fixture(scope="class")
    def headers(self):
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": "admin@sevora.com", "password": "admin123"}
        )
        return {
            "Authorization": f"Bearer {response.json()['access_token']}",
            "Content-Type": "application/json"
        }
    
    @pytest.fixture(scope="class")
    def test_contact_id(self, headers):
        contact_data = {
            "name": f"{TEST_PREFIX}CommContact_{uuid.uuid4().hex[:8]}",
            "contact_type": "influencer",
            "email": f"comm_contact_{uuid.uuid4().hex[:8]}@test.com",
            "industry": "beauty"
        }
        response = requests.post(
            f"{BASE_URL}/api/marketing/v2/contacts",
            headers=headers,
            json=contact_data
        )
        return response.json()["id"]
    
    def test_log_communication(self, headers, test_contact_id):
        """POST /api/marketing/v2/communications logs communication"""
        comm_data = {
            "contact_id": test_contact_id,
            "comm_type": "email",
            "subject": f"{TEST_PREFIX}Test subject",
            "message": "Test communication message"
        }
        response = requests.post(
            f"{BASE_URL}/api/marketing/v2/communications",
            headers=headers,
            json=comm_data
        )
        assert response.status_code == 200
        data = response.json()
        assert data["comm_type"] == "email"
        assert data["subject"] == comm_data["subject"]
        assert data["status"] == "sent"
    
    def test_get_contact_communications(self, headers, test_contact_id):
        """GET /api/marketing/v2/contacts/{id}/communications returns communications"""
        response = requests.get(
            f"{BASE_URL}/api/marketing/v2/contacts/{test_contact_id}/communications",
            headers=headers
        )
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)


class TestPayments:
    """Tests for Payment recording"""
    
    @pytest.fixture(scope="class")
    def headers(self):
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": "admin@sevora.com", "password": "admin123"}
        )
        return {
            "Authorization": f"Bearer {response.json()['access_token']}",
            "Content-Type": "application/json"
        }
    
    @pytest.fixture(scope="class")
    def test_contact_id(self, headers):
        contact_data = {
            "name": f"{TEST_PREFIX}PaymentContact_{uuid.uuid4().hex[:8]}",
            "contact_type": "influencer",
            "email": f"payment_contact_{uuid.uuid4().hex[:8]}@test.com",
            "industry": "fashion"
        }
        response = requests.post(
            f"{BASE_URL}/api/marketing/v2/contacts",
            headers=headers,
            json=contact_data
        )
        return response.json()["id"]
    
    def test_record_payment(self, headers, test_contact_id):
        """POST /api/marketing/v2/payments records payment"""
        payment_data = {
            "contact_id": test_contact_id,
            "amount": 25000,
            "description": f"{TEST_PREFIX}Campaign payment",
            "payment_method": "bank_transfer"
        }
        response = requests.post(
            f"{BASE_URL}/api/marketing/v2/payments",
            headers=headers,
            json=payment_data
        )
        assert response.status_code == 200
        data = response.json()
        assert data["amount"] == 25000
        assert data["status"] == "pending"
        assert "invoice_number" in data
        print(f"Created payment with invoice: {data['invoice_number']}")
    
    def test_get_contact_payments(self, headers, test_contact_id):
        """GET /api/marketing/v2/contacts/{id}/payments returns payments"""
        response = requests.get(
            f"{BASE_URL}/api/marketing/v2/contacts/{test_contact_id}/payments",
            headers=headers
        )
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)


class TestDigitalPR:
    """Tests for Digital PR - Press Releases, Media Coverage, Pitches"""
    
    @pytest.fixture(scope="class")
    def headers(self):
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": "admin@sevora.com", "password": "admin123"}
        )
        return {
            "Authorization": f"Bearer {response.json()['access_token']}",
            "Content-Type": "application/json"
        }
    
    def test_get_press_releases(self, headers):
        """GET /api/marketing/v2/pr/releases returns press releases"""
        response = requests.get(
            f"{BASE_URL}/api/marketing/v2/pr/releases",
            headers=headers
        )
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"Found {len(data)} press releases")
    
    def test_create_press_release(self, headers):
        """POST /api/marketing/v2/pr/releases creates press release"""
        pr_data = {
            "title": f"{TEST_PREFIX}Press Release Title",
            "subtitle": "Test subtitle for press release",
            "body": "This is the body content of the press release for testing purposes.",
            "target_publications": ["Vogue India", "Elle India"]
        }
        response = requests.post(
            f"{BASE_URL}/api/marketing/v2/pr/releases",
            headers=headers,
            json=pr_data
        )
        assert response.status_code == 200
        data = response.json()
        assert data["title"] == pr_data["title"]
        assert data["status"] == "draft"
        assert len(data["target_publications"]) == 2
    
    def test_get_media_coverage(self, headers):
        """GET /api/marketing/v2/pr/coverage returns media coverage"""
        response = requests.get(
            f"{BASE_URL}/api/marketing/v2/pr/coverage",
            headers=headers
        )
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
    
    def test_record_media_coverage(self, headers):
        """POST /api/marketing/v2/pr/coverage records media coverage"""
        coverage_data = {
            "title": f"{TEST_PREFIX}Media Coverage Article",
            "publication": "Fashion Weekly",
            "url": "https://example.com/article",
            "coverage_type": "article",
            "sentiment": "positive",
            "published_date": "2026-03-07",
            "reach": 500000
        }
        response = requests.post(
            f"{BASE_URL}/api/marketing/v2/pr/coverage",
            headers=headers,
            json=coverage_data
        )
        assert response.status_code == 200
        data = response.json()
        assert data["publication"] == "Fashion Weekly"
        assert data["sentiment"] == "positive"
    
    def test_get_pr_pitches(self, headers):
        """GET /api/marketing/v2/pr/pitches returns pitches"""
        response = requests.get(
            f"{BASE_URL}/api/marketing/v2/pr/pitches",
            headers=headers
        )
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)


class TestEvents:
    """Tests for Events module"""
    
    @pytest.fixture(scope="class")
    def headers(self):
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": "admin@sevora.com", "password": "admin123"}
        )
        return {
            "Authorization": f"Bearer {response.json()['access_token']}",
            "Content-Type": "application/json"
        }
    
    def test_get_events(self, headers):
        """GET /api/marketing/v2/events returns events"""
        response = requests.get(
            f"{BASE_URL}/api/marketing/v2/events",
            headers=headers
        )
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"Found {len(data)} events")
    
    def test_create_event(self, headers):
        """POST /api/marketing/v2/events creates event"""
        event_data = {
            "name": f"{TEST_PREFIX}Fashion Show Event",
            "event_type": "fashion_show",
            "description": "Test fashion show event",
            "venue": "Fashion Hub",
            "city": "Mumbai",
            "start_date": "2026-05-15",
            "budget": 300000,
            "max_attendees": 200
        }
        response = requests.post(
            f"{BASE_URL}/api/marketing/v2/events",
            headers=headers,
            json=event_data
        )
        assert response.status_code == 200
        data = response.json()
        assert data["name"] == event_data["name"]
        assert data["event_type"] == "fashion_show"
        assert data["status"] == "planning"
        assert data["confirmed_attendees"] == 0
    
    def test_get_event_by_id(self, headers):
        """GET /api/marketing/v2/events/{id} returns single event"""
        # Create an event first
        event_data = {
            "name": f"{TEST_PREFIX}Single Event",
            "event_type": "brand_launch",
            "start_date": "2026-06-01",
            "city": "Delhi"
        }
        create_response = requests.post(
            f"{BASE_URL}/api/marketing/v2/events",
            headers=headers,
            json=event_data
        )
        event_id = create_response.json()["id"]
        
        response = requests.get(
            f"{BASE_URL}/api/marketing/v2/events/{event_id}",
            headers=headers
        )
        assert response.status_code == 200
        data = response.json()
        assert data["id"] == event_id


class TestContentAssets:
    """Tests for Content & Assets module"""
    
    @pytest.fixture(scope="class")
    def headers(self):
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": "admin@sevora.com", "password": "admin123"}
        )
        return {
            "Authorization": f"Bearer {response.json()['access_token']}",
            "Content-Type": "application/json"
        }
    
    def test_get_assets(self, headers):
        """GET /api/marketing/v2/assets returns assets"""
        response = requests.get(
            f"{BASE_URL}/api/marketing/v2/assets",
            headers=headers
        )
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
    
    def test_upload_asset(self, headers):
        """POST /api/marketing/v2/assets uploads asset"""
        asset_data = {
            "name": f"{TEST_PREFIX}Logo Asset",
            "asset_type": "logo",
            "category": "brand_assets",
            "description": "Test logo asset",
            "file_url": "https://example.com/logo.png",
            "tags": ["logo", "brand", "2026"]
        }
        response = requests.post(
            f"{BASE_URL}/api/marketing/v2/assets",
            headers=headers,
            json=asset_data
        )
        assert response.status_code == 200
        data = response.json()
        assert data["name"] == asset_data["name"]
        assert data["category"] == "brand_assets"
        assert data["downloads"] == 0
    
    def test_get_ugc(self, headers):
        """GET /api/marketing/v2/ugc returns UGC"""
        response = requests.get(
            f"{BASE_URL}/api/marketing/v2/ugc",
            headers=headers
        )
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
    
    def test_get_approvals(self, headers):
        """GET /api/marketing/v2/approvals returns approval queue"""
        response = requests.get(
            f"{BASE_URL}/api/marketing/v2/approvals",
            headers=headers
        )
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)


class TestDashboardStats:
    """Tests for Dashboard Statistics"""
    
    @pytest.fixture(scope="class")
    def headers(self):
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": "admin@sevora.com", "password": "admin123"}
        )
        return {
            "Authorization": f"Bearer {response.json()['access_token']}",
            "Content-Type": "application/json"
        }
    
    def test_get_dashboard_stats(self, headers):
        """GET /api/marketing/v2/dashboard/stats returns all stats"""
        response = requests.get(
            f"{BASE_URL}/api/marketing/v2/dashboard/stats",
            headers=headers
        )
        assert response.status_code == 200
        data = response.json()
        
        # Verify structure
        assert "contacts" in data
        assert "deals" in data
        assert "pr" in data
        assert "events" in data
        assert "approvals" in data
        
        # Verify contacts breakdown
        assert "total" in data["contacts"]
        assert "influencers" in data["contacts"]
        assert "journalists" in data["contacts"]
        assert "bloggers" in data["contacts"]
        
        print(f"Dashboard stats: {data}")


class TestCalendar:
    """Tests for Marketing Calendar"""
    
    @pytest.fixture(scope="class")
    def headers(self):
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": "admin@sevora.com", "password": "admin123"}
        )
        return {
            "Authorization": f"Bearer {response.json()['access_token']}",
            "Content-Type": "application/json"
        }
    
    def test_get_calendar_items(self, headers):
        """GET /api/marketing/v2/calendar returns calendar items"""
        response = requests.get(
            f"{BASE_URL}/api/marketing/v2/calendar",
            headers=headers
        )
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
    
    def test_create_calendar_item(self, headers):
        """POST /api/marketing/v2/calendar creates calendar item"""
        item_data = {
            "title": f"{TEST_PREFIX}Calendar Event",
            "item_type": "deadline",
            "start_date": "2026-04-20",
            "description": "Test deadline item"
        }
        response = requests.post(
            f"{BASE_URL}/api/marketing/v2/calendar",
            headers=headers,
            json=item_data
        )
        assert response.status_code == 200
        data = response.json()
        assert data["title"] == item_data["title"]
        assert data["item_type"] == "deadline"


# Cleanup fixture for test data
@pytest.fixture(scope="session", autouse=True)
def cleanup_test_data():
    """Cleanup test data after all tests complete"""
    yield
    # Cleanup could be added here if needed
    print(f"\nTest data with prefix '{TEST_PREFIX}' may remain in database for manual inspection")
