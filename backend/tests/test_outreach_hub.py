"""
Outreach Hub API Tests
Tests unified email and WhatsApp messaging features in MOCK mode
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
TEST_EMAIL = "outreach-test@sevora.com"
TEST_PASSWORD = "Test123!"
TEST_INFLUENCER_ID = "6fae0a69-eb96-4ebf-9921-18b3b49a5740"


class TestOutreachHubAuthentication:
    """Authentication tests for outreach testing"""
    
    def test_login_for_outreach_tests(self):
        """Login with test credentials"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD
        })
        
        if response.status_code == 200:
            data = response.json()
            assert "access_token" in data
            pytest.auth_token = data["access_token"]
            print(f"✓ Login successful for {TEST_EMAIL}")
        else:
            # Try registering the user first
            reg_response = requests.post(f"{BASE_URL}/api/auth/register", json={
                "email": TEST_EMAIL,
                "password": TEST_PASSWORD,
                "name": "Outreach Test User",
                "role": "marketing_manager"
            })
            
            if reg_response.status_code in [200, 201]:
                login_response = requests.post(f"{BASE_URL}/api/auth/login", json={
                    "email": TEST_EMAIL,
                    "password": TEST_PASSWORD
                })
                assert login_response.status_code == 200
                pytest.auth_token = login_response.json()["access_token"]
                print(f"✓ Registered and logged in as {TEST_EMAIL}")
            else:
                pytest.skip(f"Could not authenticate: {response.text}")


class TestOutreachHubStatus:
    """Tests for /api/outreach-hub/status endpoint"""
    
    def test_get_outreach_status_shows_mock_mode(self):
        """Outreach status should show mock mode enabled for both channels"""
        headers = {"Authorization": f"Bearer {pytest.auth_token}"}
        response = requests.get(f"{BASE_URL}/api/outreach-hub/status", headers=headers)
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        
        # Verify email channel status
        assert "email" in data, "Response should have email channel"
        assert data["email"]["configured"] == True, "Email should be configured (mock mode)"
        assert data["email"]["mock_mode"] == True, "Email should be in mock mode"
        print(f"✓ Email status: configured={data['email']['configured']}, mock_mode={data['email']['mock_mode']}")
        
        # Verify WhatsApp channel status
        assert "whatsapp" in data, "Response should have whatsapp channel"
        assert data["whatsapp"]["configured"] == True, "WhatsApp should be configured (mock mode)"
        assert data["whatsapp"]["mock_mode"] == True, "WhatsApp should be in mock mode"
        print(f"✓ WhatsApp status: configured={data['whatsapp']['configured']}, mock_mode={data['whatsapp']['mock_mode']}")


class TestOutreachHubSendEmail:
    """Tests for sending Email via unified outreach - MOCK mode"""
    
    def test_get_or_create_test_influencer(self):
        """Ensure test influencer exists for outreach tests"""
        headers = {"Authorization": f"Bearer {pytest.auth_token}"}
        
        # First try to get the influencer
        response = requests.get(f"{BASE_URL}/api/influencers/{TEST_INFLUENCER_ID}", headers=headers)
        
        if response.status_code == 200:
            pytest.test_influencer = response.json()
            print(f"✓ Found test influencer: {pytest.test_influencer.get('name')}")
        else:
            # Create a test influencer
            create_response = requests.post(f"{BASE_URL}/api/influencers", headers=headers, json={
                "id": TEST_INFLUENCER_ID,
                "name": "Test Outreach Influencer",
                "email": "test-influencer@example.com",
                "phone": "+919876543210",
                "instagram_handle": "test_outreach_influencer",
                "category": "fashion",
                "tier": "mid",
                "followers": 50000
            })
            
            if create_response.status_code in [200, 201]:
                pytest.test_influencer = create_response.json()
                print(f"✓ Created test influencer: {pytest.test_influencer.get('name')}")
            else:
                # Try to find any influencer
                all_influencers = requests.get(f"{BASE_URL}/api/influencers", headers=headers)
                if all_influencers.status_code == 200 and len(all_influencers.json()) > 0:
                    pytest.test_influencer = all_influencers.json()[0]
                    print(f"✓ Using existing influencer: {pytest.test_influencer.get('name')}")
                else:
                    pytest.skip("No influencer available for testing")
    
    def test_send_email_mock_mode(self):
        """Send email in mock mode should succeed"""
        headers = {"Authorization": f"Bearer {pytest.auth_token}"}
        influencer_id = pytest.test_influencer.get('id')
        
        response = requests.post(f"{BASE_URL}/api/outreach-hub/send", headers=headers, json={
            "influencer_id": influencer_id,
            "channel": "email",
            "subject": "Test Email Subject - Collaboration Opportunity",
            "message": "Hi {{influencer_name}}, this is a test email from SEVORA for our {{campaign_name}}.",
            "campaign_name": "Summer Collection 2026"
        })
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data.get("success") == True, "Email send should succeed in mock mode"
        assert data.get("channel") == "email", "Channel should be email"
        assert "message_id" in data, "Should have a message_id"
        print(f"✓ Email sent successfully (mock): message_id={data.get('message_id')}")


class TestOutreachHubSendWhatsApp:
    """Tests for sending WhatsApp via unified outreach - MOCK mode"""
    
    def test_send_whatsapp_mock_mode(self):
        """Send WhatsApp in mock mode should succeed"""
        headers = {"Authorization": f"Bearer {pytest.auth_token}"}
        influencer_id = pytest.test_influencer.get('id')
        
        response = requests.post(f"{BASE_URL}/api/outreach-hub/send", headers=headers, json={
            "influencer_id": influencer_id,
            "channel": "whatsapp",
            "message": "Hi {{influencer_name}}! This is a test WhatsApp message from SEVORA. We'd love to collaborate with you on {{campaign_name}}! 🌟",
            "campaign_name": "Summer Collection 2026"
        })
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data.get("success") == True, "WhatsApp send should succeed in mock mode"
        assert data.get("channel") == "whatsapp", "Channel should be whatsapp"
        assert "message_id" in data, "Should have a message_id"
        print(f"✓ WhatsApp sent successfully (mock): message_id={data.get('message_id')}")


class TestOutreachHistory:
    """Tests for /api/outreach-hub/history endpoint"""
    
    def test_get_outreach_history(self):
        """Get outreach history should return sent messages"""
        headers = {"Authorization": f"Bearer {pytest.auth_token}"}
        
        response = requests.get(f"{BASE_URL}/api/outreach-hub/history", headers=headers)
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert isinstance(data, list), "History should be a list"
        
        print(f"✓ Found {len(data)} outreach messages in history")
        
        # Verify we have recent messages from our tests
        if len(data) > 0:
            latest = data[0]
            assert "id" in latest, "Outreach item should have id"
            assert "type" in latest or "channel" in latest, "Should have type/channel"
            assert "sent_at" in latest, "Should have sent_at timestamp"
            print(f"✓ Latest outreach: type={latest.get('type')}, to={latest.get('influencer_name')}")
    
    def test_get_outreach_history_with_channel_filter(self):
        """Get outreach history filtered by channel"""
        headers = {"Authorization": f"Bearer {pytest.auth_token}"}
        
        # Test email filter
        email_response = requests.get(f"{BASE_URL}/api/outreach-hub/history?channel=email", headers=headers)
        assert email_response.status_code == 200
        
        email_data = email_response.json()
        for item in email_data:
            assert item.get("type") == "email" or item.get("channel") == "email", \
                f"All items should be email type, got {item.get('type')}"
        
        print(f"✓ Email-only history: {len(email_data)} items")
        
        # Test whatsapp filter
        wa_response = requests.get(f"{BASE_URL}/api/outreach-hub/history?channel=whatsapp", headers=headers)
        assert wa_response.status_code == 200
        
        wa_data = wa_response.json()
        for item in wa_data:
            assert item.get("type") == "whatsapp" or item.get("channel") == "whatsapp", \
                f"All items should be whatsapp type"
        
        print(f"✓ WhatsApp-only history: {len(wa_data)} items")


class TestOutreachTemplates:
    """Tests for message templates CRUD"""
    
    def test_get_templates(self):
        """Get all templates"""
        headers = {"Authorization": f"Bearer {pytest.auth_token}"}
        
        response = requests.get(f"{BASE_URL}/api/outreach-hub/templates", headers=headers)
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert isinstance(data, list), "Templates should be a list"
        print(f"✓ Found {len(data)} templates")
    
    def test_create_and_use_template(self):
        """Create a template and verify it can be used"""
        headers = {"Authorization": f"Bearer {pytest.auth_token}"}
        
        # Create template
        template_data = {
            "name": "Test Outreach Template",
            "channel": "email",
            "subject": "Test Template Subject - {{campaign_name}}",
            "body": "Hi {{influencer_name}}, this is a test template message from {{brand_name}}.",
            "variables": ["influencer_name", "campaign_name", "brand_name"]
        }
        
        create_response = requests.post(f"{BASE_URL}/api/outreach-hub/templates", 
                                        headers=headers, json=template_data)
        
        assert create_response.status_code in [200, 201], f"Expected 200/201, got {create_response.status_code}: {create_response.text}"
        
        created = create_response.json()
        assert "id" in created, "Created template should have id"
        pytest.test_template_id = created["id"]
        print(f"✓ Created template: {created['name']} (id={created['id']})")
        
        # Get template by ID
        get_response = requests.get(f"{BASE_URL}/api/outreach-hub/templates/{pytest.test_template_id}", headers=headers)
        assert get_response.status_code == 200
        print(f"✓ Retrieved template by ID")
        
        # Delete template (cleanup)
        delete_response = requests.delete(f"{BASE_URL}/api/outreach-hub/templates/{pytest.test_template_id}", headers=headers)
        assert delete_response.status_code == 200
        print(f"✓ Deleted template")


class TestInfluencerContactInfo:
    """Tests for influencer contact info endpoint"""
    
    def test_get_influencer_contact_info(self):
        """Get influencer contact info for outreach"""
        headers = {"Authorization": f"Bearer {pytest.auth_token}"}
        influencer_id = pytest.test_influencer.get('id')
        
        response = requests.get(f"{BASE_URL}/api/outreach-hub/influencer/{influencer_id}/contact-info", headers=headers)
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "influencer_id" in data or "id" in data, "Should have influencer_id"
        print(f"✓ Got contact info for influencer: email={data.get('email')}, phone={data.get('phone')}")


class TestOutreachErrorHandling:
    """Tests for error handling"""
    
    def test_send_to_nonexistent_influencer(self):
        """Send to non-existent influencer should fail gracefully"""
        headers = {"Authorization": f"Bearer {pytest.auth_token}"}
        
        response = requests.post(f"{BASE_URL}/api/outreach-hub/send", headers=headers, json={
            "influencer_id": "nonexistent-influencer-id-12345",
            "channel": "email",
            "subject": "Test",
            "message": "Test message"
        })
        
        assert response.status_code == 400 or response.status_code == 404, \
            f"Expected 400/404 for non-existent influencer, got {response.status_code}"
        print(f"✓ Correctly rejected send to non-existent influencer")
    
    def test_send_without_auth(self):
        """Send without authentication should fail"""
        response = requests.post(f"{BASE_URL}/api/outreach-hub/send", json={
            "influencer_id": "test",
            "channel": "email",
            "message": "Test"
        })
        
        assert response.status_code == 401 or response.status_code == 403, \
            f"Expected 401/403 for unauthenticated request, got {response.status_code}"
        print(f"✓ Correctly rejected unauthenticated send")


# Fixtures
@pytest.fixture(scope="session", autouse=True)
def setup_auth():
    """Setup authentication for all tests"""
    response = requests.post(f"{BASE_URL}/api/auth/login", json={
        "email": TEST_EMAIL,
        "password": TEST_PASSWORD
    })
    
    if response.status_code == 200:
        pytest.auth_token = response.json()["access_token"]
    else:
        # Try admin credentials
        admin_response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@sevora.com",
            "password": "admin123"
        })
        if admin_response.status_code == 200:
            pytest.auth_token = admin_response.json()["access_token"]
        else:
            pytest.auth_token = None
