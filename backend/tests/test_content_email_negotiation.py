"""
Tests for Content Library, Email Service, and Negotiation Deliverables Bucket
Testing backlog items 1, 2, 3 from iteration 8
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestContentLibrary:
    """Content Library CRUD tests"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Get authentication token"""
        login_response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@sevora.com",
            "password": "admin123"
        })
        assert login_response.status_code == 200, f"Login failed: {login_response.text}"
        token = login_response.json()['access_token']
        self.headers = {
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json"
        }
        
    def test_get_content_library_empty(self):
        """GET /api/content returns list (may be empty initially)"""
        response = requests.get(f"{BASE_URL}/api/content", headers=self.headers)
        assert response.status_code == 200, f"Get content failed: {response.text}"
        data = response.json()
        assert isinstance(data, list), "Response should be a list"
        print(f"GET /api/content: {len(data)} items found")
        
    def test_create_content_item(self):
        """POST /api/content creates new content item"""
        content_data = {
            "title": "TEST_Content_Reel_01",
            "description": "Test reel for fashion campaign",
            "content_type": "reel",
            "platform": "instagram",
            "tags": ["luxury", "fashion", "test"],
            "status": "draft",
            "performance_metrics": {
                "views": 10000,
                "likes": 500,
                "comments": 50,
                "shares": 25
            }
        }
        response = requests.post(f"{BASE_URL}/api/content", headers=self.headers, json=content_data)
        assert response.status_code == 200, f"Create content failed: {response.text}"
        data = response.json()
        
        # Verify response structure and values
        assert "id" in data, "Response should contain id"
        assert data["title"] == content_data["title"], "Title should match"
        assert data["content_type"] == "reel", "Content type should be reel"
        assert data["platform"] == "instagram", "Platform should be instagram"
        assert "tags" in data and "luxury" in data["tags"], "Tags should contain 'luxury'"
        assert data["performance_metrics"]["views"] == 10000, "Views should be 10000"
        
        # Store ID for later tests
        self.__class__.created_content_id = data["id"]
        print(f"POST /api/content: Created content with id {data['id']}")
        
    def test_get_content_by_id(self):
        """GET /api/content/{id} returns specific content"""
        content_id = getattr(self.__class__, 'created_content_id', None)
        if not content_id:
            pytest.skip("No content created to fetch")
            
        response = requests.get(f"{BASE_URL}/api/content/{content_id}", headers=self.headers)
        assert response.status_code == 200, f"Get content by id failed: {response.text}"
        data = response.json()
        
        assert data["id"] == content_id, "ID should match"
        assert data["title"] == "TEST_Content_Reel_01", "Title should match"
        print(f"GET /api/content/{content_id}: Retrieved content successfully")
        
    def test_update_content_item(self):
        """PUT /api/content/{id} updates content"""
        content_id = getattr(self.__class__, 'created_content_id', None)
        if not content_id:
            pytest.skip("No content created to update")
            
        update_data = {
            "title": "TEST_Content_Reel_01_Updated",
            "status": "approved",
            "performance_metrics": {
                "views": 25000,
                "likes": 1500,
                "comments": 150,
                "shares": 75
            }
        }
        response = requests.put(f"{BASE_URL}/api/content/{content_id}", headers=self.headers, json=update_data)
        assert response.status_code == 200, f"Update content failed: {response.text}"
        data = response.json()
        
        assert data["title"] == "TEST_Content_Reel_01_Updated", "Title should be updated"
        assert data["status"] == "approved", "Status should be approved"
        assert data["performance_metrics"]["views"] == 25000, "Views should be updated"
        print(f"PUT /api/content/{content_id}: Updated content successfully")
        
        # Verify persistence via GET
        get_response = requests.get(f"{BASE_URL}/api/content/{content_id}", headers=self.headers)
        assert get_response.status_code == 200
        verify_data = get_response.json()
        assert verify_data["title"] == "TEST_Content_Reel_01_Updated", "Update should persist"
        
    def test_get_content_with_filters(self):
        """GET /api/content with filters works"""
        # Filter by content_type
        response = requests.get(f"{BASE_URL}/api/content?content_type=reel", headers=self.headers)
        assert response.status_code == 200, f"Filter by content_type failed: {response.text}"
        
        # Filter by platform
        response = requests.get(f"{BASE_URL}/api/content?platform=instagram", headers=self.headers)
        assert response.status_code == 200, f"Filter by platform failed: {response.text}"
        
        # Filter by status
        response = requests.get(f"{BASE_URL}/api/content?status=approved", headers=self.headers)
        assert response.status_code == 200, f"Filter by status failed: {response.text}"
        print("GET /api/content with filters: All filter endpoints working")
        
    def test_get_influencer_content_stats(self):
        """GET /api/content/influencer/{id}/stats returns aggregated stats"""
        # First, get an influencer ID
        inf_response = requests.get(f"{BASE_URL}/api/influencers", headers=self.headers)
        assert inf_response.status_code == 200
        influencers = inf_response.json()
        
        if not influencers:
            pytest.skip("No influencers to test stats for")
            
        influencer_id = influencers[0]['id']
        response = requests.get(f"{BASE_URL}/api/content/influencer/{influencer_id}/stats", headers=self.headers)
        assert response.status_code == 200, f"Get influencer stats failed: {response.text}"
        data = response.json()
        
        # Verify structure
        assert "influencer_id" in data, "Response should contain influencer_id"
        assert "total_content" in data, "Response should contain total_content"
        assert "by_type" in data, "Response should contain by_type"
        print(f"GET /api/content/influencer/{influencer_id}/stats: Total content = {data['total_content']}")
        
    def test_delete_content_item(self):
        """DELETE /api/content/{id} removes content"""
        content_id = getattr(self.__class__, 'created_content_id', None)
        if not content_id:
            pytest.skip("No content created to delete")
            
        response = requests.delete(f"{BASE_URL}/api/content/{content_id}", headers=self.headers)
        assert response.status_code == 200, f"Delete content failed: {response.text}"
        data = response.json()
        assert data["success"] == True, "Delete should return success=True"
        print(f"DELETE /api/content/{content_id}: Content deleted successfully")
        
        # Verify deletion via GET
        get_response = requests.get(f"{BASE_URL}/api/content/{content_id}", headers=self.headers)
        assert get_response.status_code == 404, "Deleted content should return 404"


class TestEmailService:
    """Email Service tests"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Get authentication token"""
        login_response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@sevora.com",
            "password": "admin123"
        })
        assert login_response.status_code == 200, f"Login failed: {login_response.text}"
        token = login_response.json()['access_token']
        self.headers = {
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json"
        }
        
    def test_email_status(self):
        """GET /api/email/status returns configuration status"""
        response = requests.get(f"{BASE_URL}/api/email/status", headers=self.headers)
        assert response.status_code == 200, f"Get email status failed: {response.text}"
        data = response.json()
        
        # Verify structure
        assert "configured" in data, "Response should contain 'configured' field"
        assert "has_api_key" in data, "Response should contain 'has_api_key' field"
        
        # Without SENDGRID_API_KEY, should show not configured
        print(f"GET /api/email/status: configured={data['configured']}, has_api_key={data['has_api_key']}")
        
    def test_send_outreach_without_config(self):
        """POST /api/email/send-outreach returns error when not configured"""
        # First get an influencer with an email
        inf_response = requests.get(f"{BASE_URL}/api/influencers", headers=self.headers)
        assert inf_response.status_code == 200
        influencers = inf_response.json()
        
        # Find influencer with email
        influencer_with_email = next((i for i in influencers if i.get('email')), None)
        
        if not influencer_with_email:
            # Try sending anyway to test error handling
            if influencers:
                influencer_id = influencers[0]['id']
                response = requests.post(
                    f"{BASE_URL}/api/email/send-outreach",
                    headers=self.headers,
                    params={"influencer_id": influencer_id}
                )
                # Should return 400 (no email) or error about SendGrid config
                assert response.status_code in [400, 500], f"Expected 400 or 500, got {response.status_code}"
                print(f"POST /api/email/send-outreach: Correctly returns error - {response.json().get('detail', 'Error')}")
            else:
                pytest.skip("No influencers available")
        else:
            # Has email, should fail due to SendGrid not configured
            influencer_id = influencer_with_email['id']
            response = requests.post(
                f"{BASE_URL}/api/email/send-outreach",
                headers=self.headers,
                params={"influencer_id": influencer_id}
            )
            # Should return 400 (SendGrid not configured)
            assert response.status_code == 400, f"Expected 400 (not configured), got {response.status_code}"
            data = response.json()
            assert "not configured" in data.get('detail', '').lower(), "Should mention not configured"
            print(f"POST /api/email/send-outreach: Correctly returns 'not configured' error")


class TestNegotiationDeliverablesBucket:
    """Test negotiation deliverables bucket display"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Get authentication token"""
        login_response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@sevora.com",
            "password": "admin123"
        })
        assert login_response.status_code == 200, f"Login failed: {login_response.text}"
        token = login_response.json()['access_token']
        self.headers = {
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json"
        }
        
    def test_create_negotiation_with_deliverables_bucket(self):
        """POST /api/negotiations creates negotiation with deliverables bucket"""
        # First get an influencer
        inf_response = requests.get(f"{BASE_URL}/api/influencers", headers=self.headers)
        assert inf_response.status_code == 200
        influencers = inf_response.json()
        
        if not influencers:
            pytest.skip("No influencers available")
            
        influencer_id = influencers[0]['id']
        
        negotiation_data = {
            "influencer_id": influencer_id,
            "initial_quote": 100000,
            "our_budget": 75000,
            "deliverables": "See deliverables bucket",
            "deliverables_bucket": [
                {
                    "type": "reel",
                    "quantity": 2,
                    "rate": 25000,
                    "platform": "instagram"
                },
                {
                    "type": "story",
                    "quantity": 5,
                    "rate": 5000,
                    "platform": "instagram"
                },
                {
                    "type": "youtube_video",
                    "quantity": 1,
                    "rate": 25000,
                    "platform": "youtube"
                }
            ],
            "deadline": "2026-04-15",
            "notes": "TEST negotiation with structured deliverables"
        }
        
        response = requests.post(f"{BASE_URL}/api/negotiations", headers=self.headers, json=negotiation_data)
        assert response.status_code == 200, f"Create negotiation failed: {response.text}"
        data = response.json()
        
        # Verify response structure
        assert "id" in data, "Response should contain id"
        assert "deliverables_bucket" in data, "Response should contain deliverables_bucket"
        assert len(data["deliverables_bucket"]) == 3, "Should have 3 deliverable items"
        
        # Verify bucket items have calculated totals
        bucket = data["deliverables_bucket"]
        assert bucket[0]["total"] == 50000, "First item total should be 2 * 25000 = 50000"
        assert bucket[1]["total"] == 25000, "Second item total should be 5 * 5000 = 25000"
        assert bucket[2]["total"] == 25000, "Third item total should be 1 * 25000 = 25000"
        
        # Verify bucket_total
        assert data.get("bucket_total") == 100000, "Bucket total should be 100000"
        
        self.__class__.created_negotiation_id = data["id"]
        print(f"POST /api/negotiations: Created with deliverables_bucket, total = {data.get('bucket_total')}")
        
    def test_get_negotiation_with_bucket(self):
        """GET /api/negotiations/{id} returns negotiation with deliverables bucket"""
        neg_id = getattr(self.__class__, 'created_negotiation_id', None)
        if not neg_id:
            pytest.skip("No negotiation created to fetch")
            
        response = requests.get(f"{BASE_URL}/api/negotiations/{neg_id}", headers=self.headers)
        assert response.status_code == 200, f"Get negotiation failed: {response.text}"
        data = response.json()
        
        # Verify deliverables bucket is returned
        assert "deliverables_bucket" in data, "Should have deliverables_bucket"
        assert len(data["deliverables_bucket"]) == 3, "Should have 3 items in bucket"
        
        # Verify item structure
        for item in data["deliverables_bucket"]:
            assert "type" in item, "Item should have type"
            assert "quantity" in item, "Item should have quantity"
            assert "rate" in item, "Item should have rate"
            assert "total" in item, "Item should have total"
            
        print(f"GET /api/negotiations/{neg_id}: Deliverables bucket displayed correctly")
        
    def test_update_negotiation_with_new_bucket(self):
        """PUT /api/negotiations/{id} can update deliverables bucket"""
        neg_id = getattr(self.__class__, 'created_negotiation_id', None)
        if not neg_id:
            pytest.skip("No negotiation created to update")
            
        update_data = {
            "deliverables_bucket": [
                {
                    "type": "reel",
                    "quantity": 3,
                    "rate": 20000,
                    "platform": "instagram"
                },
                {
                    "type": "post",
                    "quantity": 2,
                    "rate": 15000,
                    "platform": "instagram"
                }
            ],
            "notes": "Updated deliverables package"
        }
        
        response = requests.put(f"{BASE_URL}/api/negotiations/{neg_id}", headers=self.headers, json=update_data)
        assert response.status_code == 200, f"Update negotiation failed: {response.text}"
        data = response.json()
        
        # Verify update
        assert len(data["deliverables_bucket"]) == 2, "Should now have 2 items"
        print(f"PUT /api/negotiations/{neg_id}: Deliverables bucket updated")
        
    def test_negotiation_list_includes_bucket_info(self):
        """GET /api/negotiations returns negotiations with bucket info"""
        response = requests.get(f"{BASE_URL}/api/negotiations", headers=self.headers)
        assert response.status_code == 200, f"Get negotiations failed: {response.text}"
        data = response.json()
        
        assert isinstance(data, list), "Should return list"
        
        # Find our test negotiation
        neg_id = getattr(self.__class__, 'created_negotiation_id', None)
        if neg_id:
            test_neg = next((n for n in data if n['id'] == neg_id), None)
            if test_neg:
                assert "deliverables_bucket" in test_neg, "List item should include bucket"
                
        print(f"GET /api/negotiations: List includes deliverables_bucket info")


class TestContentLibraryWithInfluencer:
    """Test Content Library with influencer association"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Get authentication token"""
        login_response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@sevora.com",
            "password": "admin123"
        })
        assert login_response.status_code == 200, f"Login failed: {login_response.text}"
        token = login_response.json()['access_token']
        self.headers = {
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json"
        }
        
    def test_create_content_with_influencer(self):
        """Create content linked to an influencer"""
        # Get an influencer
        inf_response = requests.get(f"{BASE_URL}/api/influencers", headers=self.headers)
        assert inf_response.status_code == 200
        influencers = inf_response.json()
        
        if not influencers:
            pytest.skip("No influencers available")
            
        influencer_id = influencers[0]['id']
        influencer_name = influencers[0]['name']
        
        content_data = {
            "title": "TEST_Influencer_Content_01",
            "description": "Content from influencer",
            "content_type": "reel",
            "platform": "instagram",
            "influencer_id": influencer_id,
            "tags": ["campaign", "collab"],
            "status": "published",
            "performance_metrics": {
                "views": 50000,
                "likes": 3000,
                "comments": 200
            }
        }
        
        response = requests.post(f"{BASE_URL}/api/content", headers=self.headers, json=content_data)
        assert response.status_code == 200, f"Create content failed: {response.text}"
        data = response.json()
        
        # Verify influencer association
        assert data["influencer_id"] == influencer_id, "Influencer ID should match"
        assert data["influencer_name"] == influencer_name, "Influencer name should be populated"
        
        self.__class__.test_content_id = data["id"]
        self.__class__.test_influencer_id = influencer_id
        print(f"Created content linked to influencer: {influencer_name}")
        
    def test_filter_content_by_influencer(self):
        """Filter content by influencer_id"""
        influencer_id = getattr(self.__class__, 'test_influencer_id', None)
        if not influencer_id:
            pytest.skip("No influencer content created")
            
        response = requests.get(f"{BASE_URL}/api/content?influencer_id={influencer_id}", headers=self.headers)
        assert response.status_code == 200, f"Filter failed: {response.text}"
        data = response.json()
        
        # All results should be for this influencer
        for item in data:
            assert item["influencer_id"] == influencer_id, "All items should be for the same influencer"
            
        print(f"Filtered content by influencer: {len(data)} items found")
        
    def test_cleanup_test_content(self):
        """Delete test content"""
        content_id = getattr(self.__class__, 'test_content_id', None)
        if content_id:
            response = requests.delete(f"{BASE_URL}/api/content/{content_id}", headers=self.headers)
            assert response.status_code == 200, f"Delete failed: {response.text}"
            print(f"Cleaned up test content: {content_id}")


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
