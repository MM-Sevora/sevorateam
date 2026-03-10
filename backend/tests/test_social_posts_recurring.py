"""
Test Social Media Posts with Recurring Scheduling Feature
Tests for iteration 62 - Phase 1: Recurring Post Scheduling
"""
import pytest
import requests
import os
import uuid
from datetime import datetime, timedelta

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
TEST_EMAIL = "superadmin@sevora.com"
TEST_PASSWORD = "superadmin123"


class TestSocialPostsAPI:
    """Tests for /api/social/posts endpoints with recurrence options"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup test fixtures - login and get token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD
        })
        if response.status_code != 200:
            pytest.skip(f"Auth failed: {response.status_code} - {response.text}")
        
        data = response.json()
        self.token = data.get("access_token")
        self.headers = {
            "Authorization": f"Bearer {self.token}",
            "Content-Type": "application/json"
        }
        self.created_post_ids = []
    
    def teardown_method(self, method):
        """Cleanup created posts after each test"""
        for post_id in self.created_post_ids:
            try:
                requests.delete(
                    f"{BASE_URL}/api/social/posts/{post_id}",
                    headers=self.headers
                )
            except:
                pass

    # ==========================================================
    # GET /api/social/posts - List posts
    # ==========================================================
    def test_get_social_posts_returns_list(self):
        """Test GET /api/social/posts returns list of posts"""
        response = requests.get(
            f"{BASE_URL}/api/social/posts",
            headers=self.headers
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert isinstance(data, list), "Response should be a list"
        print(f"✓ GET /api/social/posts returned {len(data)} posts")

    def test_get_social_posts_with_platform_filter(self):
        """Test GET /api/social/posts with platform filter"""
        response = requests.get(
            f"{BASE_URL}/api/social/posts?platform=linkedin",
            headers=self.headers
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        data = response.json()
        assert isinstance(data, list)
        # All returned posts should have linkedin platform or be empty
        for post in data:
            assert post.get("platform") == "linkedin", f"Expected linkedin, got {post.get('platform')}"
        print(f"✓ GET /api/social/posts?platform=linkedin returned {len(data)} linkedin posts")

    def test_get_social_posts_with_status_filter(self):
        """Test GET /api/social/posts with status filter"""
        response = requests.get(
            f"{BASE_URL}/api/social/posts?status=scheduled",
            headers=self.headers
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        data = response.json()
        assert isinstance(data, list)
        for post in data:
            assert post.get("status") == "scheduled"
        print(f"✓ GET /api/social/posts?status=scheduled returned {len(data)} scheduled posts")

    # ==========================================================
    # POST /api/social/posts - Create post
    # ==========================================================
    def test_create_social_post_basic(self):
        """Test POST /api/social/posts - basic post creation"""
        scheduled_time = (datetime.now() + timedelta(days=1)).isoformat()
        
        payload = {
            "platform": "linkedin",
            "content": f"TEST_POST_{uuid.uuid4().hex[:8]} - Basic test post",
            "scheduled_at": scheduled_time,
            "status": "draft"
        }
        
        response = requests.post(
            f"{BASE_URL}/api/social/posts",
            json=payload,
            headers=self.headers
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        
        # Validate response structure
        assert "id" in data or "post_id" in data, "Response should contain id or post_id"
        assert data.get("platform") == "linkedin"
        assert "content" in data
        
        post_id = data.get("post_id") or data.get("id")
        self.created_post_ids.append(post_id)
        print(f"✓ POST /api/social/posts created post: {post_id}")

    def test_create_recurring_post_daily(self):
        """Test POST /api/social/posts - recurring daily post"""
        scheduled_time = (datetime.now() + timedelta(days=1)).strftime("%Y-%m-%dT10:00:00")
        
        payload = {
            "platform": "facebook",
            "content": f"TEST_RECURRING_DAILY_{uuid.uuid4().hex[:8]} - Daily recurring test",
            "scheduled_at": scheduled_time,
            "status": "scheduled",
            "is_recurring": True,
            "recurrence_pattern": "daily",
            "recurrence_count": 4
        }
        
        response = requests.post(
            f"{BASE_URL}/api/social/posts",
            json=payload,
            headers=self.headers
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        
        assert data.get("is_recurring") == True, "is_recurring should be True"
        assert data.get("recurrence_pattern") == "daily", "recurrence_pattern should be daily"
        
        post_id = data.get("post_id") or data.get("id")
        self.created_post_ids.append(post_id)
        print(f"✓ POST /api/social/posts created daily recurring post: {post_id}")
        
        # Verify instances were generated - check for child posts
        response_list = requests.get(
            f"{BASE_URL}/api/social/posts",
            headers=self.headers
        )
        all_posts = response_list.json()
        child_posts = [p for p in all_posts if p.get("parent_recurring_id") == post_id]
        print(f"  → Generated {len(child_posts)} recurring instances")

    def test_create_recurring_post_weekly(self):
        """Test POST /api/social/posts - recurring weekly post"""
        scheduled_time = (datetime.now() + timedelta(days=1)).strftime("%Y-%m-%dT10:00:00")
        
        payload = {
            "platform": "twitter",
            "content": f"TEST_RECURRING_WEEKLY_{uuid.uuid4().hex[:8]} - Weekly recurring test",
            "scheduled_at": scheduled_time,
            "status": "scheduled",
            "is_recurring": True,
            "recurrence_pattern": "weekly",
            "recurrence_count": 4
        }
        
        response = requests.post(
            f"{BASE_URL}/api/social/posts",
            json=payload,
            headers=self.headers
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        
        assert data.get("is_recurring") == True
        assert data.get("recurrence_pattern") == "weekly"
        
        post_id = data.get("post_id") or data.get("id")
        self.created_post_ids.append(post_id)
        print(f"✓ POST /api/social/posts created weekly recurring post: {post_id}")

    def test_create_recurring_post_biweekly(self):
        """Test POST /api/social/posts - recurring every 2 weeks"""
        scheduled_time = (datetime.now() + timedelta(days=1)).strftime("%Y-%m-%dT10:00:00")
        
        payload = {
            "platform": "instagram",
            "content": f"TEST_RECURRING_BIWEEKLY_{uuid.uuid4().hex[:8]} - Biweekly recurring test",
            "scheduled_at": scheduled_time,
            "status": "scheduled",
            "is_recurring": True,
            "recurrence_pattern": "biweekly",
            "recurrence_count": 4
        }
        
        response = requests.post(
            f"{BASE_URL}/api/social/posts",
            json=payload,
            headers=self.headers
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        
        assert data.get("is_recurring") == True
        assert data.get("recurrence_pattern") == "biweekly"
        
        post_id = data.get("post_id") or data.get("id")
        self.created_post_ids.append(post_id)
        print(f"✓ POST /api/social/posts created biweekly recurring post: {post_id}")

    def test_create_recurring_post_monthly(self):
        """Test POST /api/social/posts - recurring monthly"""
        scheduled_time = (datetime.now() + timedelta(days=1)).strftime("%Y-%m-%dT10:00:00")
        
        payload = {
            "platform": "linkedin",
            "content": f"TEST_RECURRING_MONTHLY_{uuid.uuid4().hex[:8]} - Monthly recurring test",
            "scheduled_at": scheduled_time,
            "status": "scheduled",
            "is_recurring": True,
            "recurrence_pattern": "monthly",
            "recurrence_count": 4
        }
        
        response = requests.post(
            f"{BASE_URL}/api/social/posts",
            json=payload,
            headers=self.headers
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        
        assert data.get("is_recurring") == True
        assert data.get("recurrence_pattern") == "monthly"
        
        post_id = data.get("post_id") or data.get("id")
        self.created_post_ids.append(post_id)
        print(f"✓ POST /api/social/posts created monthly recurring post: {post_id}")

    def test_create_recurring_post_custom_days(self):
        """Test POST /api/social/posts - recurring on custom days"""
        scheduled_time = (datetime.now() + timedelta(days=1)).strftime("%Y-%m-%dT10:00:00")
        
        payload = {
            "platform": "linkedin",
            "content": f"TEST_RECURRING_CUSTOM_{uuid.uuid4().hex[:8]} - Custom days recurring test",
            "scheduled_at": scheduled_time,
            "status": "scheduled",
            "is_recurring": True,
            "recurrence_pattern": "custom",
            "recurrence_days": [1, 3, 5],  # Mon, Wed, Fri
            "recurrence_count": 4
        }
        
        response = requests.post(
            f"{BASE_URL}/api/social/posts",
            json=payload,
            headers=self.headers
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        
        assert data.get("is_recurring") == True
        assert data.get("recurrence_pattern") == "custom"
        assert data.get("recurrence_days") == [1, 3, 5]
        
        post_id = data.get("post_id") or data.get("id")
        self.created_post_ids.append(post_id)
        print(f"✓ POST /api/social/posts created custom days recurring post: {post_id}")

    # ==========================================================
    # PUT /api/social/posts/{post_id} - Update post
    # ==========================================================
    def test_update_social_post(self):
        """Test PUT /api/social/posts/{post_id} - update a post"""
        # First create a post
        scheduled_time = (datetime.now() + timedelta(days=1)).isoformat()
        
        create_payload = {
            "platform": "linkedin",
            "content": f"TEST_UPDATE_{uuid.uuid4().hex[:8]} - Original content",
            "scheduled_at": scheduled_time,
            "status": "draft"
        }
        
        create_response = requests.post(
            f"{BASE_URL}/api/social/posts",
            json=create_payload,
            headers=self.headers
        )
        
        assert create_response.status_code == 200
        created_post = create_response.json()
        post_id = created_post.get("post_id") or created_post.get("id")
        self.created_post_ids.append(post_id)
        
        # Now update the post
        update_payload = {
            "content": f"TEST_UPDATE_{uuid.uuid4().hex[:8]} - UPDATED content",
            "status": "scheduled"
        }
        
        update_response = requests.put(
            f"{BASE_URL}/api/social/posts/{post_id}",
            json=update_payload,
            headers=self.headers
        )
        
        assert update_response.status_code == 200, f"Expected 200, got {update_response.status_code}: {update_response.text}"
        updated_post = update_response.json()
        
        assert updated_post.get("status") == "scheduled"
        assert "UPDATED" in updated_post.get("content", "")
        print(f"✓ PUT /api/social/posts/{post_id} updated successfully")

    def test_update_nonexistent_post(self):
        """Test PUT /api/social/posts/{post_id} - update non-existent post returns 404"""
        fake_id = str(uuid.uuid4())
        
        update_payload = {
            "content": "This should fail"
        }
        
        response = requests.put(
            f"{BASE_URL}/api/social/posts/{fake_id}",
            json=update_payload,
            headers=self.headers
        )
        
        assert response.status_code == 404, f"Expected 404, got {response.status_code}"
        print(f"✓ PUT /api/social/posts/{fake_id} correctly returned 404 for non-existent post")

    # ==========================================================
    # DELETE /api/social/posts/{post_id} - Delete post
    # ==========================================================
    def test_delete_social_post(self):
        """Test DELETE /api/social/posts/{post_id} - delete a post"""
        # First create a post
        scheduled_time = (datetime.now() + timedelta(days=1)).isoformat()
        
        create_payload = {
            "platform": "linkedin",
            "content": f"TEST_DELETE_{uuid.uuid4().hex[:8]} - To be deleted",
            "scheduled_at": scheduled_time,
            "status": "draft"
        }
        
        create_response = requests.post(
            f"{BASE_URL}/api/social/posts",
            json=create_payload,
            headers=self.headers
        )
        
        assert create_response.status_code == 200
        created_post = create_response.json()
        post_id = created_post.get("post_id") or created_post.get("id")
        
        # Now delete the post
        delete_response = requests.delete(
            f"{BASE_URL}/api/social/posts/{post_id}",
            headers=self.headers
        )
        
        assert delete_response.status_code == 200, f"Expected 200, got {delete_response.status_code}: {delete_response.text}"
        print(f"✓ DELETE /api/social/posts/{post_id} deleted successfully")
        
        # Verify post is deleted - GET should not find it
        verify_response = requests.get(
            f"{BASE_URL}/api/social/posts",
            headers=self.headers
        )
        posts = verify_response.json()
        post_ids = [p.get("post_id") or p.get("id") for p in posts]
        assert post_id not in post_ids, "Deleted post should not appear in list"
        print(f"  → Verified post {post_id} no longer in list")

    def test_delete_nonexistent_post(self):
        """Test DELETE /api/social/posts/{post_id} - delete non-existent returns 404"""
        fake_id = str(uuid.uuid4())
        
        response = requests.delete(
            f"{BASE_URL}/api/social/posts/{fake_id}",
            headers=self.headers
        )
        
        assert response.status_code == 404, f"Expected 404, got {response.status_code}"
        print(f"✓ DELETE /api/social/posts/{fake_id} correctly returned 404 for non-existent post")


class TestSocialPostsRecurringEndpoints:
    """Tests for recurring post management endpoints"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup test fixtures - login and get token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD
        })
        if response.status_code != 200:
            pytest.skip(f"Auth failed: {response.status_code} - {response.text}")
        
        data = response.json()
        self.token = data.get("access_token")
        self.headers = {
            "Authorization": f"Bearer {self.token}",
            "Content-Type": "application/json"
        }

    def test_get_recurring_posts(self):
        """Test GET /api/social/posts/recurring - get all recurring post templates"""
        response = requests.get(
            f"{BASE_URL}/api/social/posts/recurring",
            headers=self.headers
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert isinstance(data, list)
        
        # All returned posts should have is_recurring=True
        for post in data:
            assert post.get("is_recurring") == True
        print(f"✓ GET /api/social/posts/recurring returned {len(data)} recurring templates")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
