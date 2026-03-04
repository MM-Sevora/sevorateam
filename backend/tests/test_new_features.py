"""
Backend tests for SEVORA new features:
- Influencer comparison feature
- Scheduled discovery (CRUD, run, toggle)
- Social profile verification endpoints
- SSE streaming for AI discovery
- Existing functionality: Login, influencer CRUD, campaigns
"""
import pytest
import requests
import os
import json
import time

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')
if not BASE_URL:
    BASE_URL = "https://fashion-collab-8.preview.emergentagent.com"

# Test credentials
TEST_EMAIL = "test@sevora.com"
TEST_PASSWORD = "test123456"


class TestAuthentication:
    """Authentication endpoint tests"""
    
    def test_login_success(self):
        """Test login with valid credentials"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD
        })
        print(f"Login response status: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            assert "access_token" in data, "Token not in response"
            assert "user" in data, "User not in response"
            print(f"Login successful for user: {data['user']['email']}")
        elif response.status_code == 401:
            # User might not exist, try registration
            print("User doesn't exist, need to register first")
            pytest.skip("Test user needs to be created")
        else:
            print(f"Login failed: {response.text}")
            assert False, f"Login failed with status {response.status_code}"
    
    def test_register_new_user(self):
        """Test user registration"""
        unique_email = f"test_new_{int(time.time())}@sevora.com"
        response = requests.post(f"{BASE_URL}/api/auth/register", json={
            "email": unique_email,
            "password": TEST_PASSWORD,
            "name": "Test User",
            "role": "influencer_manager"
        })
        print(f"Register response status: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            assert "access_token" in data
            assert data["user"]["email"] == unique_email
            print(f"Registration successful for: {unique_email}")
        elif response.status_code == 400:
            print("User already exists (expected in some cases)")
        else:
            print(f"Registration response: {response.text}")


@pytest.fixture(scope="module")
def auth_token():
    """Get authentication token for protected endpoints"""
    # First try login
    response = requests.post(f"{BASE_URL}/api/auth/login", json={
        "email": TEST_EMAIL,
        "password": TEST_PASSWORD
    })
    
    if response.status_code == 200:
        return response.json()["access_token"]
    
    # If login fails, try register
    response = requests.post(f"{BASE_URL}/api/auth/register", json={
        "email": TEST_EMAIL,
        "password": TEST_PASSWORD,
        "name": "Test User",
        "role": "influencer_manager"
    })
    
    if response.status_code == 200:
        return response.json()["access_token"]
    
    # If both fail, try to find if user exists
    pytest.skip("Could not authenticate - check test credentials")


@pytest.fixture(scope="module")
def auth_headers(auth_token):
    """Return headers with auth token"""
    return {
        "Authorization": f"Bearer {auth_token}",
        "Content-Type": "application/json"
    }


# ============== INFLUENCER CRUD TESTS ==============
class TestInfluencerCRUD:
    """Test influencer CRUD operations"""
    
    created_influencer_ids = []
    
    def test_create_influencer(self, auth_headers):
        """Test creating a new influencer"""
        influencer_data = {
            "name": "TEST_Influencer_Compare",
            "instagram_handle": "test_compare_handle",
            "city": "Mumbai",
            "country": "India",
            "category": "luxury",
            "followers": 50000,
            "engagement_rate": 4.5,
            "email": "test_compare@example.com"
        }
        
        response = requests.post(
            f"{BASE_URL}/api/influencers",
            headers=auth_headers,
            json=influencer_data
        )
        print(f"Create influencer status: {response.status_code}")
        
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        assert data["name"] == influencer_data["name"]
        assert "id" in data
        self.__class__.created_influencer_ids.append(data["id"])
        print(f"Created influencer: {data['id']}")
        return data["id"]
    
    def test_get_all_influencers(self, auth_headers):
        """Test getting all influencers"""
        response = requests.get(
            f"{BASE_URL}/api/influencers",
            headers=auth_headers
        )
        print(f"Get all influencers status: {response.status_code}")
        
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"Total influencers: {len(data)}")
    
    def test_get_influencer_by_id(self, auth_headers):
        """Test getting influencer by ID"""
        if not self.__class__.created_influencer_ids:
            pytest.skip("No influencer created yet")
        
        inf_id = self.__class__.created_influencer_ids[0]
        response = requests.get(
            f"{BASE_URL}/api/influencers/{inf_id}",
            headers=auth_headers
        )
        print(f"Get influencer by ID status: {response.status_code}")
        
        assert response.status_code == 200
        data = response.json()
        assert data["id"] == inf_id
    
    def test_update_influencer(self, auth_headers):
        """Test updating an influencer"""
        if not self.__class__.created_influencer_ids:
            pytest.skip("No influencer created yet")
        
        inf_id = self.__class__.created_influencer_ids[0]
        update_data = {
            "followers": 75000,
            "engagement_rate": 5.2
        }
        
        response = requests.put(
            f"{BASE_URL}/api/influencers/{inf_id}",
            headers=auth_headers,
            json=update_data
        )
        print(f"Update influencer status: {response.status_code}")
        
        assert response.status_code == 200
        data = response.json()
        assert data["followers"] == 75000


# ============== INFLUENCER COMPARISON TESTS ==============
class TestInfluencerComparison:
    """Test the new influencer comparison feature"""
    
    def test_compare_requires_at_least_2(self, auth_headers):
        """Test that comparison requires at least 2 influencers"""
        response = requests.post(
            f"{BASE_URL}/api/influencers/compare",
            headers=auth_headers,
            json={"influencer_ids": ["single-id"]}
        )
        print(f"Compare with 1 ID status: {response.status_code}")
        assert response.status_code == 400, "Should reject single influencer"
    
    def test_compare_max_5_influencers(self, auth_headers):
        """Test that comparison allows max 5 influencers"""
        fake_ids = [f"fake-id-{i}" for i in range(6)]
        response = requests.post(
            f"{BASE_URL}/api/influencers/compare",
            headers=auth_headers,
            json={"influencer_ids": fake_ids}
        )
        print(f"Compare with 6 IDs status: {response.status_code}")
        assert response.status_code == 400, "Should reject more than 5 influencers"
    
    def test_compare_valid_influencers(self, auth_headers):
        """Test comparing valid influencers"""
        # First get existing influencers
        response = requests.get(
            f"{BASE_URL}/api/influencers",
            headers=auth_headers
        )
        influencers = response.json()
        
        if len(influencers) < 2:
            # Create 2 influencers for comparison
            for i in range(2):
                requests.post(
                    f"{BASE_URL}/api/influencers",
                    headers=auth_headers,
                    json={
                        "name": f"TEST_Compare_Inf_{i}",
                        "instagram_handle": f"test_cmp_{i}",
                        "city": "Mumbai",
                        "country": "India",
                        "category": "luxury",
                        "followers": 50000 + i * 10000,
                        "engagement_rate": 4.0 + i
                    }
                )
            response = requests.get(f"{BASE_URL}/api/influencers", headers=auth_headers)
            influencers = response.json()
        
        # Get 2 influencer IDs
        ids_to_compare = [inf["id"] for inf in influencers[:2]]
        print(f"Comparing influencers: {ids_to_compare}")
        
        response = requests.post(
            f"{BASE_URL}/api/influencers/compare",
            headers=auth_headers,
            json={"influencer_ids": ids_to_compare}
        )
        print(f"Compare status: {response.status_code}")
        
        assert response.status_code == 200, f"Compare failed: {response.text}"
        data = response.json()
        
        # Validate comparison response structure
        assert "influencers" in data, "Missing influencers in comparison"
        assert "metrics" in data, "Missing metrics in comparison"
        assert len(data["influencers"]) == 2, "Should have 2 influencers"
        
        # Validate metrics structure
        metrics = data["metrics"]
        assert "followers" in metrics
        assert "engagement_rate" in metrics
        assert "score" in metrics
        
        # Check metric details
        for metric_name in ["followers", "engagement_rate", "score"]:
            metric = metrics[metric_name]
            assert "values" in metric
            assert "max" in metric
            assert "min" in metric
            assert "avg" in metric
            print(f"{metric_name}: {metric}")
        
        # Check AI recommendation (may be fallback if AI unavailable)
        assert "recommendation" in data
        print(f"AI Recommendation: {data['recommendation'][:100]}...")


# ============== SCHEDULED DISCOVERY TESTS ==============
class TestScheduledDiscovery:
    """Test scheduled discovery CRUD and run operations"""
    
    created_search_id = None
    
    def test_create_scheduled_search(self, auth_headers):
        """Test creating a new scheduled search"""
        search_data = {
            "name": "TEST_Daily_Luxury_Search",
            "campaign_brief": "Find luxury fashion influencers for brand campaign",
            "category": "luxury",
            "location": "India",
            "follower_range": "10K-500K",
            "frequency": "daily",
            "num_suggestions": 5
        }
        
        response = requests.post(
            f"{BASE_URL}/api/scheduled/searches",
            headers=auth_headers,
            json=search_data
        )
        print(f"Create scheduled search status: {response.status_code}")
        
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        
        assert data["name"] == search_data["name"]
        assert data["campaign_brief"] == search_data["campaign_brief"]
        assert data["is_active"] == True
        assert "id" in data
        assert "next_run" in data
        
        self.__class__.created_search_id = data["id"]
        print(f"Created scheduled search: {data['id']}")
    
    def test_get_scheduled_searches(self, auth_headers):
        """Test getting all scheduled searches"""
        response = requests.get(
            f"{BASE_URL}/api/scheduled/searches",
            headers=auth_headers
        )
        print(f"Get scheduled searches status: {response.status_code}")
        
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"Total scheduled searches: {len(data)}")
    
    def test_get_scheduled_search_by_id(self, auth_headers):
        """Test getting a specific scheduled search"""
        if not self.__class__.created_search_id:
            pytest.skip("No search created yet")
        
        response = requests.get(
            f"{BASE_URL}/api/scheduled/searches/{self.__class__.created_search_id}",
            headers=auth_headers
        )
        print(f"Get search by ID status: {response.status_code}")
        
        assert response.status_code == 200
        data = response.json()
        assert data["id"] == self.__class__.created_search_id
    
    def test_update_scheduled_search(self, auth_headers):
        """Test updating a scheduled search"""
        if not self.__class__.created_search_id:
            pytest.skip("No search created yet")
        
        update_data = {
            "name": "TEST_Updated_Search_Name",
            "frequency": "weekly"
        }
        
        response = requests.put(
            f"{BASE_URL}/api/scheduled/searches/{self.__class__.created_search_id}",
            headers=auth_headers,
            json=update_data
        )
        print(f"Update search status: {response.status_code}")
        
        assert response.status_code == 200
        data = response.json()
        assert data["name"] == update_data["name"]
        assert data["frequency"] == update_data["frequency"]
    
    def test_toggle_scheduled_search(self, auth_headers):
        """Test toggling active/inactive status"""
        if not self.__class__.created_search_id:
            pytest.skip("No search created yet")
        
        # Deactivate
        response = requests.put(
            f"{BASE_URL}/api/scheduled/searches/{self.__class__.created_search_id}",
            headers=auth_headers,
            json={"is_active": False}
        )
        assert response.status_code == 200
        assert response.json()["is_active"] == False
        print("Deactivated search")
        
        # Reactivate
        response = requests.put(
            f"{BASE_URL}/api/scheduled/searches/{self.__class__.created_search_id}",
            headers=auth_headers,
            json={"is_active": True}
        )
        assert response.status_code == 200
        assert response.json()["is_active"] == True
        print("Reactivated search")
    
    def test_run_scheduled_search_manually(self, auth_headers):
        """Test manually running a scheduled search"""
        if not self.__class__.created_search_id:
            pytest.skip("No search created yet")
        
        response = requests.post(
            f"{BASE_URL}/api/scheduled/searches/{self.__class__.created_search_id}/run",
            headers=auth_headers
        )
        print(f"Run search manually status: {response.status_code}")
        
        assert response.status_code == 200, f"Run failed: {response.text}"
        data = response.json()
        
        # The response should indicate success/failure
        assert "success" in data
        if data["success"]:
            assert "discovered_count" in data
            print(f"Discovered {data['discovered_count']} influencers")
        else:
            print(f"Run completed with error: {data.get('error', 'unknown')}")
    
    def test_get_discovery_results(self, auth_headers):
        """Test getting discovery results"""
        response = requests.get(
            f"{BASE_URL}/api/scheduled/results",
            headers=auth_headers,
            params={"limit": 10}
        )
        print(f"Get results status: {response.status_code}")
        
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"Discovery results count: {len(data)}")


# ============== SOCIAL PROFILE VERIFICATION TESTS ==============
class TestSocialVerification:
    """Test social profile verification endpoints"""
    
    def test_verify_instagram_not_configured(self, auth_headers):
        """Test Instagram verification when API not configured"""
        response = requests.post(
            f"{BASE_URL}/api/social/verify",
            headers=auth_headers,
            json={"platform": "instagram", "handle": "test_handle"}
        )
        print(f"Instagram verify status: {response.status_code}")
        
        # Should return 404 when API not configured
        # This is expected behavior per the problem statement
        assert response.status_code in [404, 500], f"Unexpected status: {response.status_code}"
        print("Instagram API not configured (expected)")
    
    def test_verify_youtube_not_configured(self, auth_headers):
        """Test YouTube verification when API not configured"""
        response = requests.post(
            f"{BASE_URL}/api/social/verify",
            headers=auth_headers,
            json={"platform": "youtube", "handle": "@test_channel"}
        )
        print(f"YouTube verify status: {response.status_code}")
        
        # Should return 404 when API not configured
        assert response.status_code in [404, 500], f"Unexpected status: {response.status_code}"
        print("YouTube API not configured (expected)")
    
    def test_verify_unsupported_platform(self, auth_headers):
        """Test verification with unsupported platform"""
        response = requests.post(
            f"{BASE_URL}/api/social/verify",
            headers=auth_headers,
            json={"platform": "tiktok", "handle": "test"}
        )
        print(f"Unsupported platform status: {response.status_code}")
        
        assert response.status_code == 400, "Should reject unsupported platform"
    
    def test_verify_influencer_profiles(self, auth_headers):
        """Test verifying all profiles for an influencer"""
        # Get an influencer
        response = requests.get(f"{BASE_URL}/api/influencers", headers=auth_headers)
        influencers = response.json()
        
        if not influencers:
            pytest.skip("No influencers to test")
        
        inf_id = influencers[0]["id"]
        response = requests.post(
            f"{BASE_URL}/api/social/verify-influencer/{inf_id}",
            headers=auth_headers
        )
        print(f"Verify influencer profiles status: {response.status_code}")
        
        # Should work but may return empty verified results if no APIs configured
        assert response.status_code == 200
        data = response.json()
        assert "verified" in data or "message" in data
        print(f"Verification result: {data}")


# ============== SSE STREAMING TESTS ==============
class TestSSEStreaming:
    """Test SSE streaming for AI discovery"""
    
    def test_auto_discover_stream_endpoint(self, auth_headers):
        """Test the SSE streaming endpoint for AI discovery"""
        params = {
            "campaign_brief": "Test luxury fashion campaign",
            "category": "luxury",
            "location": "India",
            "follower_range": "10K-500K",
            "num_suggestions": 3
        }
        
        # SSE endpoint requires auth via query param workaround or fetch
        query_string = "&".join([f"{k}={v}" for k, v in params.items()])
        url = f"{BASE_URL}/api/ai/auto-discover-stream?{query_string}"
        
        response = requests.get(
            url,
            headers=auth_headers,
            stream=True,
            timeout=60
        )
        print(f"SSE stream status: {response.status_code}")
        
        assert response.status_code == 200, f"SSE failed: {response.status_code}"
        
        # Read the stream and parse events
        events = []
        progress_updates = []
        final_result = None
        
        for line in response.iter_lines(decode_unicode=True):
            if line and line.startswith("data: "):
                try:
                    data = json.loads(line[6:])
                    events.append(data)
                    
                    if data.get("type") == "progress":
                        progress_updates.append(data)
                        print(f"Progress: {data.get('progress')}% - {data.get('message')}")
                    elif data.get("type") == "complete":
                        final_result = data
                        print(f"Complete: Found {data.get('total_discovered', 0)} influencers")
                        break
                    elif data.get("type") == "error":
                        print(f"Error in stream: {data.get('message')}")
                        break
                except json.JSONDecodeError:
                    pass
        
        # Validate we got progress updates
        assert len(progress_updates) > 0, "No progress updates received"
        
        # Validate final result
        if final_result:
            assert final_result.get("success") == True
            assert "discovered_influencers" in final_result
            print(f"SSE streaming test passed - received {len(events)} events")
        else:
            print("No complete result received (AI may have timed out)")


# ============== CAMPAIGN TESTS ==============
class TestCampaigns:
    """Test campaign endpoints"""
    
    created_campaign_id = None
    
    def test_create_campaign(self, auth_headers):
        """Test creating a campaign"""
        campaign_data = {
            "name": "TEST_Spring_Collection_2026",
            "objective": "branding",
            "budget": 500000,
            "start_date": "2026-03-01",
            "end_date": "2026-04-30",
            "target_market": "India",
            "description": "Spring collection campaign for luxury fashion"
        }
        
        response = requests.post(
            f"{BASE_URL}/api/campaigns",
            headers=auth_headers,
            json=campaign_data
        )
        print(f"Create campaign status: {response.status_code}")
        
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        assert data["name"] == campaign_data["name"]
        assert "id" in data
        
        self.__class__.created_campaign_id = data["id"]
        print(f"Created campaign: {data['id']}")
    
    def test_get_campaigns(self, auth_headers):
        """Test getting all campaigns"""
        response = requests.get(
            f"{BASE_URL}/api/campaigns",
            headers=auth_headers
        )
        print(f"Get campaigns status: {response.status_code}")
        
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"Total campaigns: {len(data)}")
    
    def test_update_campaign_status(self, auth_headers):
        """Test updating campaign status"""
        if not self.__class__.created_campaign_id:
            pytest.skip("No campaign created")
        
        response = requests.put(
            f"{BASE_URL}/api/campaigns/{self.__class__.created_campaign_id}/status?status=active",
            headers=auth_headers
        )
        print(f"Update campaign status: {response.status_code}")
        assert response.status_code == 200


# ============== AI TOOLS TESTS ==============
class TestAITools:
    """Test AI tools endpoints"""
    
    def test_auto_discover_post(self, auth_headers):
        """Test non-streaming AI auto-discover"""
        response = requests.post(
            f"{BASE_URL}/api/ai/auto-discover",
            headers=auth_headers,
            json={
                "campaign_brief": "Find micro influencers for streetwear campaign",
                "category": "streetwear",
                "location": "Mumbai",
                "follower_range": "10K-50K",
                "num_suggestions": 3
            },
            timeout=120
        )
        print(f"Auto discover status: {response.status_code}")
        
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        
        assert "success" in data
        if data["success"]:
            assert "discovered_influencers" in data
            print(f"Discovered: {data.get('total_discovered', 0)} influencers")
    
    def test_generate_caption(self, auth_headers):
        """Test AI caption generation"""
        response = requests.post(
            f"{BASE_URL}/api/ai/generate-caption",
            headers=auth_headers,
            json={
                "brand": "SEVORA",
                "product": "Silk Evening Gown",
                "tone": "luxury",
                "hashtags": True
            },
            timeout=60
        )
        print(f"Generate caption status: {response.status_code}")
        
        assert response.status_code == 200
        data = response.json()
        assert "caption" in data
        print(f"Caption: {data['caption'][:100]}...")
    
    def test_campaign_ideas(self, auth_headers):
        """Test AI campaign ideas generation"""
        response = requests.post(
            f"{BASE_URL}/api/ai/campaign-ideas",
            headers=auth_headers,
            json={
                "season": "summer",
                "category": "menswear",
                "budget": 300000
            },
            timeout=60
        )
        print(f"Campaign ideas status: {response.status_code}")
        
        assert response.status_code == 200
        data = response.json()
        assert "ideas" in data
        print(f"Ideas preview: {data['ideas'][:100]}...")


# ============== CLEANUP ==============
class TestCleanup:
    """Cleanup test data"""
    
    def test_cleanup_test_data(self, auth_headers):
        """Delete test-created data"""
        # Get all influencers and delete TEST_ prefixed ones
        response = requests.get(f"{BASE_URL}/api/influencers", headers=auth_headers)
        if response.status_code == 200:
            for inf in response.json():
                if inf.get("name", "").startswith("TEST_"):
                    requests.delete(f"{BASE_URL}/api/influencers/{inf['id']}", headers=auth_headers)
                    print(f"Deleted test influencer: {inf['name']}")
        
        # Get all scheduled searches and delete TEST_ prefixed ones
        response = requests.get(f"{BASE_URL}/api/scheduled/searches", headers=auth_headers)
        if response.status_code == 200:
            for search in response.json():
                if search.get("name", "").startswith("TEST_"):
                    requests.delete(f"{BASE_URL}/api/scheduled/searches/{search['id']}", headers=auth_headers)
                    print(f"Deleted test search: {search['name']}")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
