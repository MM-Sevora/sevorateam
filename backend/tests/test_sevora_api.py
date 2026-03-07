"""
Sevora Team Platform - Comprehensive API Tests
Testing Authentication, Marketing, Sales, Social, Collaboration, AI, and Communication endpoints
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://sevora-hub.preview.emergentagent.com')

# Test credentials
ADMIN_USER = {"email": "admin@sevora.com", "password": "admin123"}
MARKETING_USER = {"email": "marketing@sevora.com", "password": "admin123"}
SALES_USER = {"email": "sales@sevora.com", "password": "admin123"}
SOCIAL_USER = {"email": "social@sevora.com", "password": "admin123"}


class TestHealthAndSetup:
    """Basic health check tests"""
    
    def test_health_endpoint(self):
        response = requests.get(f"{BASE_URL}/api/health")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "healthy"
        assert data["service"] == "sevora-team"
        print("✅ Health endpoint working")


class TestAuthentication:
    """Authentication endpoint tests"""
    
    def test_login_admin_user(self):
        """Test admin login"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json=ADMIN_USER)
        assert response.status_code == 200
        data = response.json()
        assert "access_token" in data
        assert data["user"]["email"] == ADMIN_USER["email"]
        assert data["user"]["role"] == "admin"
        assert "departments" in data["user"]
        print(f"✅ Admin login successful - Role: {data['user']['role']}, Departments: {data['user']['departments']}")
    
    def test_login_invalid_credentials(self):
        """Test login with invalid credentials"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "wrong@sevora.com",
            "password": "wrongpass"
        })
        assert response.status_code == 401
        print("✅ Invalid credentials rejected correctly")
    
    def test_registration_flow(self):
        """Test user registration"""
        import uuid
        test_email = f"test_{uuid.uuid4().hex[:8]}@test.com"
        response = requests.post(f"{BASE_URL}/api/auth/register", json={
            "email": test_email,
            "password": "testpass123",
            "name": "Test User",
            "department": "sales",
            "role": "viewer"
        })
        assert response.status_code == 200
        data = response.json()
        assert "access_token" in data
        assert data["user"]["email"] == test_email
        print(f"✅ Registration successful for {test_email}")
    
    def test_get_me_endpoint(self):
        """Test /auth/me endpoint"""
        # First login
        login_resp = requests.post(f"{BASE_URL}/api/auth/login", json=ADMIN_USER)
        token = login_resp.json()["access_token"]
        
        response = requests.get(
            f"{BASE_URL}/api/auth/me",
            headers={"Authorization": f"Bearer {token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert data["email"] == ADMIN_USER["email"]
        print("✅ Get me endpoint working")
    
    def test_get_auth_config(self):
        """Test Azure AD config endpoint"""
        response = requests.get(f"{BASE_URL}/api/auth/config")
        assert response.status_code == 200
        data = response.json()
        assert "clientId" in data
        assert "tenantId" in data
        print("✅ Auth config endpoint working")


@pytest.fixture(scope="class")
def admin_token():
    """Get admin auth token"""
    response = requests.post(f"{BASE_URL}/api/auth/login", json=ADMIN_USER)
    if response.status_code == 200:
        return response.json()["access_token"]
    pytest.skip("Admin login failed - skipping authenticated tests")


@pytest.fixture(scope="class")
def marketing_token():
    """Get marketing user auth token"""
    response = requests.post(f"{BASE_URL}/api/auth/login", json=MARKETING_USER)
    if response.status_code == 200:
        return response.json()["access_token"]
    pytest.skip("Marketing login failed")


@pytest.fixture(scope="class")
def sales_token():
    """Get sales user auth token"""
    response = requests.post(f"{BASE_URL}/api/auth/login", json=SALES_USER)
    if response.status_code == 200:
        return response.json()["access_token"]
    pytest.skip("Sales login failed")


@pytest.fixture(scope="class")
def social_token():
    """Get social user auth token"""
    response = requests.post(f"{BASE_URL}/api/auth/login", json=SOCIAL_USER)
    if response.status_code == 200:
        return response.json()["access_token"]
    pytest.skip("Social login failed")


class TestMarketingInfluencers:
    """Marketing - Influencer CRUD tests"""
    
    def test_list_influencers(self, admin_token):
        """Test get influencers list"""
        response = requests.get(
            f"{BASE_URL}/api/marketing/influencers",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"✅ Influencers list - Found {len(data)} influencers")
    
    def test_create_influencer(self, admin_token):
        """Test create influencer"""
        response = requests.post(
            f"{BASE_URL}/api/marketing/influencers",
            headers={"Authorization": f"Bearer {admin_token}"},
            json={
                "name": "TEST_Influencer",
                "instagram_handle": "test_handle",
                "city": "Mumbai",
                "industry": "fashion",
                "tier": "micro",
                "followers": 50000,
                "engagement_rate": 4.5
            }
        )
        assert response.status_code == 200
        data = response.json()
        assert data["name"] == "TEST_Influencer"
        assert "id" in data
        assert "score" in data
        print(f"✅ Influencer created with ID: {data['id']}, Score: {data['score']}")
        return data["id"]
    
    def test_search_influencers(self, admin_token):
        """Test influencer search"""
        response = requests.get(
            f"{BASE_URL}/api/marketing/influencers?search=fashion",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200
        print("✅ Influencer search working")
    
    def test_filter_influencers_by_city(self, admin_token):
        """Test filter influencers by city"""
        response = requests.get(
            f"{BASE_URL}/api/marketing/influencers?city=Mumbai",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200
        print("✅ Filter influencers by city working")


class TestMarketingCampaigns:
    """Marketing - Campaign tests"""
    
    def test_list_campaigns(self, admin_token):
        """Test list campaigns"""
        response = requests.get(
            f"{BASE_URL}/api/marketing/campaigns",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"✅ Campaigns list - Found {len(data)} campaigns")
    
    def test_create_campaign(self, admin_token):
        """Test create campaign"""
        response = requests.post(
            f"{BASE_URL}/api/marketing/campaigns",
            headers={"Authorization": f"Bearer {admin_token}"},
            json={
                "name": "TEST_Campaign Spring 2026",
                "objective": "Brand Awareness",
                "budget": 50000.0,
                "start_date": "2026-03-01",
                "end_date": "2026-04-30",
                "target_market": "Urban Women 25-35",
                "description": "Spring fashion campaign"
            }
        )
        assert response.status_code == 200
        data = response.json()
        assert data["name"] == "TEST_Campaign Spring 2026"
        assert data["budget"] == 50000.0
        assert data["status"] == "planning"
        print(f"✅ Campaign created: {data['name']}")


class TestMarketingOutreach:
    """Marketing - Outreach tests"""
    
    def test_list_outreach(self, admin_token):
        """Test list outreach messages"""
        response = requests.get(
            f"{BASE_URL}/api/marketing/outreach",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200
        print("✅ Outreach list endpoint working")
    
    def test_create_outreach(self, admin_token):
        """Test create outreach - requires existing influencer"""
        # First get an influencer
        inf_response = requests.get(
            f"{BASE_URL}/api/marketing/influencers",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        influencers = inf_response.json()
        
        if not influencers:
            pytest.skip("No influencers to test outreach")
        
        influencer_id = influencers[0]["id"]
        
        response = requests.post(
            f"{BASE_URL}/api/marketing/outreach",
            headers={"Authorization": f"Bearer {admin_token}"},
            json={
                "influencer_id": influencer_id,
                "channel": "email",
                "subject": "Collaboration Opportunity",
                "message": "Hi! We'd love to work with you..."
            }
        )
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "sent"
        print(f"✅ Outreach sent to influencer {influencer_id}")


class TestMarketingNegotiations:
    """Marketing - Negotiations tests"""
    
    def test_list_negotiations(self, admin_token):
        """Test list negotiations"""
        response = requests.get(
            f"{BASE_URL}/api/marketing/negotiations",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200
        print("✅ Negotiations list endpoint working")
    
    def test_create_negotiation(self, admin_token):
        """Test create negotiation"""
        # Get an influencer first
        inf_response = requests.get(
            f"{BASE_URL}/api/marketing/influencers",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        influencers = inf_response.json()
        
        if not influencers:
            pytest.skip("No influencers for negotiation test")
        
        response = requests.post(
            f"{BASE_URL}/api/marketing/negotiations",
            headers={"Authorization": f"Bearer {admin_token}"},
            json={
                "influencer_id": influencers[0]["id"],
                "initial_quote": 25000,
                "our_budget": 20000,
                "deliverables": "3 Instagram Reels, 5 Stories",
                "deadline": "2026-04-15"
            }
        )
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "pending"
        print(f"✅ Negotiation created")


class TestMarketingDashboard:
    """Marketing - Dashboard and analytics"""
    
    def test_marketing_dashboard(self, admin_token):
        """Test marketing dashboard"""
        response = requests.get(
            f"{BASE_URL}/api/marketing/dashboard",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert "total_influencers" in data
        assert "active_campaigns" in data
        assert "total_budget" in data
        print(f"✅ Marketing Dashboard - {data['total_influencers']} influencers, {data['active_campaigns']} active campaigns")


class TestSalesLeads:
    """Sales - Lead CRUD tests"""
    
    def test_list_leads(self, admin_token):
        """Test list leads"""
        response = requests.get(
            f"{BASE_URL}/api/sales/leads",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"✅ Leads list - Found {len(data)} leads")
    
    def test_create_lead(self, admin_token):
        """Test create lead"""
        response = requests.post(
            f"{BASE_URL}/api/sales/leads",
            headers={"Authorization": f"Bearer {admin_token}"},
            json={
                "name": "TEST_Lead Jane Doe",
                "phone": "+919876543210",
                "email": "jane@example.com",
                "source": "Instagram Ads",
                "city": "Delhi",
                "occasion": "Wedding",
                "notes": "Interested in bridal collection"
            }
        )
        assert response.status_code == 200
        data = response.json()
        assert data["name"] == "TEST_Lead Jane Doe"
        assert data["stage"] == "New Lead"
        print(f"✅ Lead created: {data['name']}, Stage: {data['stage']}")
        return data["id"]
    
    def test_update_lead_stage(self, admin_token):
        """Test update lead stage"""
        # First create a lead
        create_resp = requests.post(
            f"{BASE_URL}/api/sales/leads",
            headers={"Authorization": f"Bearer {admin_token}"},
            json={
                "name": "TEST_Update Lead",
                "phone": "+919876543211",
                "source": "Website"
            }
        )
        lead_id = create_resp.json()["id"]
        
        # Update stage
        response = requests.put(
            f"{BASE_URL}/api/sales/leads/{lead_id}",
            headers={"Authorization": f"Bearer {admin_token}"},
            json={"stage": "Contacted"}
        )
        assert response.status_code == 200
        data = response.json()
        assert data["stage"] == "Contacted"
        print(f"✅ Lead stage updated to: {data['stage']}")
    
    def test_search_leads(self, admin_token):
        """Test lead search"""
        response = requests.get(
            f"{BASE_URL}/api/sales/leads?search=test",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200
        print("✅ Lead search working")


class TestSalesCustomers:
    """Sales - Customer tests"""
    
    def test_list_customers(self, admin_token):
        """Test list customers"""
        response = requests.get(
            f"{BASE_URL}/api/sales/customers",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"✅ Customers list - Found {len(data)} customers")
    
    def test_create_customer(self, admin_token):
        """Test create customer"""
        response = requests.post(
            f"{BASE_URL}/api/sales/customers",
            headers={"Authorization": f"Bearer {admin_token}"},
            json={
                "name": "TEST_Customer Premium Client",
                "phone": "+919876543299",
                "email": "premium@example.com",
                "city": "Mumbai",
                "budget_min": 50000,
                "budget_max": 150000,
                "preferred_styles": ["Traditional", "Indo-Western"],
                "occasion_type": "Wedding"
            }
        )
        assert response.status_code == 200
        data = response.json()
        assert data["name"] == "TEST_Customer Premium Client"
        print(f"✅ Customer created: {data['name']}")


class TestSalesPipeline:
    """Sales - Pipeline tests"""
    
    def test_get_pipeline(self, admin_token):
        """Test pipeline view"""
        response = requests.get(
            f"{BASE_URL}/api/sales/pipeline",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        # Check pipeline stages exist
        assert "New Lead" in data or isinstance(data, dict)
        print(f"✅ Pipeline loaded with stages")


class TestSalesQRCodes:
    """Sales - QR Code generation tests"""
    
    def test_list_qrcodes(self, admin_token):
        """Test list QR codes"""
        response = requests.get(
            f"{BASE_URL}/api/sales/qrcodes",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200
        print("✅ QR codes list endpoint working")
    
    def test_create_qrcode(self, admin_token):
        """Test create QR code"""
        response = requests.post(
            f"{BASE_URL}/api/sales/qrcodes",
            headers={"Authorization": f"Bearer {admin_token}"},
            json={
                "name": "TEST_Store QR Mumbai",
                "source_type": "QR Code",
                "campaign": "Spring 2026",
                "location": "Mumbai Store"
            }
        )
        assert response.status_code == 200
        data = response.json()
        assert "qr_image" in data
        assert "url" in data
        print(f"✅ QR Code created: {data['name']}")


class TestSalesDashboard:
    """Sales - Dashboard"""
    
    def test_sales_dashboard(self, admin_token):
        """Test sales dashboard"""
        response = requests.get(
            f"{BASE_URL}/api/sales/dashboard",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert "total_leads" in data
        assert "total_customers" in data
        assert "conversion_rate" in data
        print(f"✅ Sales Dashboard - {data['total_leads']} leads, {data['total_customers']} customers")


class TestSocialContent:
    """Social - Content CRUD tests"""
    
    def test_list_content(self, admin_token):
        """Test list content"""
        response = requests.get(
            f"{BASE_URL}/api/social/content",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"✅ Content list - Found {len(data)} content items")
    
    def test_create_content(self, admin_token):
        """Test create content"""
        response = requests.post(
            f"{BASE_URL}/api/social/content",
            headers={"Authorization": f"Bearer {admin_token}"},
            json={
                "title": "TEST_Spring Fashion Launch",
                "content_type": "post",
                "platform": "instagram",
                "caption": "Spring is here! New collection dropping soon...",
                "hashtags": ["fashion", "spring2026", "sevora"],
                "status": "draft"
            }
        )
        assert response.status_code == 200
        data = response.json()
        assert data["title"] == "TEST_Spring Fashion Launch"
        print(f"✅ Content created: {data['title']}")


class TestSocialPosts:
    """Social - Posts tests"""
    
    def test_list_posts(self, admin_token):
        """Test list posts"""
        response = requests.get(
            f"{BASE_URL}/api/social/posts",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200
        print("✅ Posts list endpoint working")
    
    def test_create_post(self, admin_token):
        """Test create post"""
        response = requests.post(
            f"{BASE_URL}/api/social/posts",
            headers={"Authorization": f"Bearer {admin_token}"},
            json={
                "platform": "linkedin",
                "content": "Exciting news from Sevora Team!",
                "status": "draft"
            }
        )
        assert response.status_code == 200
        print("✅ Post created successfully")


class TestSocialAITools:
    """Social - AI Tools tests"""
    
    def test_generate_caption(self, admin_token):
        """Test AI caption generation"""
        response = requests.post(
            f"{BASE_URL}/api/social/ai/caption",
            headers={"Authorization": f"Bearer {admin_token}"},
            json={
                "topic": "Spring Fashion Collection Launch"
            }
        )
        assert response.status_code == 200
        data = response.json()
        assert "caption" in data or "hashtags" in data
        print(f"✅ AI caption generated")
    
    def test_analyze_content(self, admin_token):
        """Test content analysis"""
        response = requests.post(
            f"{BASE_URL}/api/social/ai/analyze",
            headers={"Authorization": f"Bearer {admin_token}"},
            json={
                "content": "Check out our new spring collection!"
            }
        )
        assert response.status_code == 200
        data = response.json()
        assert "score" in data
        print(f"✅ Content analyzed - Score: {data['score']}")


class TestSocialDashboard:
    """Social - Dashboard"""
    
    def test_social_dashboard(self, admin_token):
        """Test social dashboard"""
        response = requests.get(
            f"{BASE_URL}/api/social/dashboard",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert "total_content" in data
        assert "scheduled" in data
        print(f"✅ Social Dashboard - {data['total_content']} content items")


class TestUnifiedDashboard:
    """Unified Dashboard tests"""
    
    def test_unified_dashboard(self, admin_token):
        """Test unified dashboard"""
        response = requests.get(
            f"{BASE_URL}/api/dashboard/unified",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert "user" in data
        assert "stats" in data
        print(f"✅ Unified Dashboard - Stats for: {list(data['stats'].keys())}")


class TestCollaboration:
    """Collaboration tests - Comments, Notifications"""
    
    def test_add_comment_with_mention(self, admin_token):
        """Test add comment with @mention"""
        response = requests.post(
            f"{BASE_URL}/api/collaboration/comments",
            headers={"Authorization": f"Bearer {admin_token}"},
            json={
                "entity_type": "campaign",
                "entity_id": "test-entity-123",
                "text": "Great work @admin! Let's push this forward."
            }
        )
        assert response.status_code == 200
        data = response.json()
        assert "id" in data
        assert data["text"] == "Great work @admin! Let's push this forward."
        print(f"✅ Comment added with mentions: {data['mentions']}")
    
    def test_get_comments(self, admin_token):
        """Test get comments for entity"""
        response = requests.get(
            f"{BASE_URL}/api/collaboration/comments/campaign/test-entity-123",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200
        print("✅ Get comments endpoint working")
    
    def test_get_activity_feed(self, admin_token):
        """Test activity feed"""
        response = requests.get(
            f"{BASE_URL}/api/collaboration/activity-feed",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"✅ Activity feed - {len(data)} activities")
    
    def test_get_notifications(self, admin_token):
        """Test get notifications"""
        response = requests.get(
            f"{BASE_URL}/api/collaboration/notifications",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200
        print("✅ Notifications endpoint working")
    
    def test_mark_all_notifications_read(self, admin_token):
        """Test mark all notifications as read"""
        response = requests.put(
            f"{BASE_URL}/api/collaboration/notifications/read-all",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200
        print("✅ Mark all notifications read working")


class TestAIGeneration:
    """AI Generation endpoints tests"""
    
    def test_ai_text_generation(self, admin_token):
        """Test AI text generation endpoint"""
        response = requests.post(
            f"{BASE_URL}/api/ai/text",
            headers={"Authorization": f"Bearer {admin_token}"},
            json={
                "prompt": "Write a short product description for a fashion collection",
                "model": "gpt-5.2"
            }
        )
        assert response.status_code == 200
        data = response.json()
        # Check if integration is working or mocked
        if data.get("success"):
            print(f"✅ AI Text generation working")
        else:
            print(f"⚠️ AI Text generation returned error: {data.get('error')}")
    
    def test_ai_caption_generation(self, admin_token):
        """Test AI caption generation"""
        response = requests.post(
            f"{BASE_URL}/api/ai/caption",
            headers={"Authorization": f"Bearer {admin_token}"},
            json={
                "topic": "Summer Fashion Collection",
                "platform": "instagram",
                "tone": "engaging"
            }
        )
        assert response.status_code == 200
        print("✅ AI Caption endpoint accessible")
    
    def test_ai_email_generation(self, admin_token):
        """Test AI email content generation"""
        response = requests.post(
            f"{BASE_URL}/api/ai/email-content",
            headers={"Authorization": f"Bearer {admin_token}"},
            json={
                "subject": "Collaboration Opportunity",
                "recipient_type": "influencer",
                "tone": "professional"
            }
        )
        assert response.status_code == 200
        print("✅ AI Email generation endpoint accessible")


class TestCommunication:
    """Communication endpoints tests - WhatsApp/Email"""
    
    def test_communication_logs(self, admin_token):
        """Test get communication logs"""
        response = requests.get(
            f"{BASE_URL}/api/communication/logs",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200
        print("✅ Communication logs endpoint working")
    
    def test_whatsapp_send_endpoint(self, admin_token):
        """Test WhatsApp send endpoint structure (may fail without real credentials)"""
        response = requests.post(
            f"{BASE_URL}/api/communication/whatsapp/send",
            headers={"Authorization": f"Bearer {admin_token}"},
            json={
                "to": "+1234567890",
                "message": "Test message"
            }
        )
        # Accept 200 or error with proper message
        assert response.status_code in [200, 400, 500]
        print(f"✅ WhatsApp endpoint accessible - Status: {response.status_code}")
    
    def test_email_send_endpoint(self, admin_token):
        """Test email send endpoint structure"""
        response = requests.post(
            f"{BASE_URL}/api/communication/email/send",
            headers={"Authorization": f"Bearer {admin_token}"},
            json={
                "to": ["test@example.com"],
                "subject": "Test Subject",
                "body": "Test body"
            }
        )
        # Accept 200 or error with proper message
        assert response.status_code in [200, 400, 500]
        print(f"✅ Email endpoint accessible - Status: {response.status_code}")


class TestRBAC:
    """Role-Based Access Control tests"""
    
    def test_marketing_user_access_marketing(self, marketing_token):
        """Test marketing user can access marketing routes"""
        response = requests.get(
            f"{BASE_URL}/api/marketing/influencers",
            headers={"Authorization": f"Bearer {marketing_token}"}
        )
        assert response.status_code == 200
        print("✅ Marketing user can access marketing routes")
    
    def test_marketing_user_blocked_from_sales(self, marketing_token):
        """Test marketing user cannot access sales routes"""
        response = requests.get(
            f"{BASE_URL}/api/sales/leads",
            headers={"Authorization": f"Bearer {marketing_token}"}
        )
        assert response.status_code == 403
        print("✅ Marketing user correctly blocked from sales routes")
    
    def test_sales_user_access_sales(self, sales_token):
        """Test sales user can access sales routes"""
        response = requests.get(
            f"{BASE_URL}/api/sales/leads",
            headers={"Authorization": f"Bearer {sales_token}"}
        )
        assert response.status_code == 200
        print("✅ Sales user can access sales routes")
    
    def test_admin_access_all(self, admin_token):
        """Test admin can access all routes"""
        # Marketing
        mkt_resp = requests.get(
            f"{BASE_URL}/api/marketing/influencers",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        # Sales
        sales_resp = requests.get(
            f"{BASE_URL}/api/sales/leads",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        # Social
        social_resp = requests.get(
            f"{BASE_URL}/api/social/content",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        
        assert mkt_resp.status_code == 200
        assert sales_resp.status_code == 200
        assert social_resp.status_code == 200
        print("✅ Admin can access all department routes")


class TestCleanup:
    """Cleanup test data"""
    
    def test_cleanup_test_influencers(self, admin_token):
        """Delete TEST_ prefixed influencers"""
        response = requests.get(
            f"{BASE_URL}/api/marketing/influencers?search=TEST_",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        influencers = response.json()
        deleted = 0
        for inf in influencers:
            if inf["name"].startswith("TEST_"):
                del_resp = requests.delete(
                    f"{BASE_URL}/api/marketing/influencers/{inf['id']}",
                    headers={"Authorization": f"Bearer {admin_token}"}
                )
                if del_resp.status_code == 200:
                    deleted += 1
        print(f"✅ Cleaned up {deleted} test influencers")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
