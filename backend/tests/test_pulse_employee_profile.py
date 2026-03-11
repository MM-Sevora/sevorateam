"""
Pulse Phase 2 - Employee Profile, @mentions, Permissions, Clickable Authors
Tests for:
- Employee Profile page endpoints
- Activity timeline with tabs filtering
- Permissions endpoint
- Leadership Dashboard access
"""

import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
TEST_EMAIL = "superadmin@sevora.com"
TEST_PASSWORD = "superadmin123"

# Test employee ID from task
TEST_EMPLOYEE_ID = "cba8c104-5e5e-491e-9caa-205c09b38354"


class TestPulseEmployeeProfileEndpoints:
    """Test Employee Profile related endpoints"""
    
    @pytest.fixture(autouse=True)
    def setup(self, api_client, auth_token):
        """Setup for each test"""
        self.client = api_client
        self.token = auth_token
        self.headers = {"Authorization": f"Bearer {auth_token}"}
    
    # ========== Employee Profile ==========
    
    def test_get_employee_profile(self):
        """GET /api/pulse/employees/{employee_id}/profile - should return employee data and stats"""
        response = self.client.get(
            f"{BASE_URL}/api/pulse/employees/{TEST_EMPLOYEE_ID}/profile",
            headers=self.headers
        )
        
        assert response.status_code == 200, f"Failed to get employee profile: {response.text}"
        data = response.json()
        
        # Verify response structure
        assert "employee" in data, "Response should contain employee field"
        assert "stats" in data, "Response should contain stats field"
        
        # Verify employee data
        employee = data["employee"]
        assert "id" in employee, "Employee should have id"
        assert "name" in employee, "Employee should have name"
        assert "email" in employee, "Employee should have email"
        assert "department" in employee, "Employee should have department"
        
        # Verify stats structure
        stats = data["stats"]
        assert "posts_count" in stats, "Stats should have posts_count"
        assert "recognitions_received" in stats, "Stats should have recognitions_received"
        assert "recognitions_given" in stats, "Stats should have recognitions_given"
        assert "daily_updates" in stats, "Stats should have daily_updates"
        assert "weekly_updates" in stats, "Stats should have weekly_updates"
        assert "total_badges" in stats, "Stats should have total_badges"
        
        print(f"Employee Profile: {employee.get('name')}, Department: {employee.get('department')}")
        print(f"Stats: Posts={stats.get('posts_count')}, Badges Received={stats.get('recognitions_received')}")
    
    def test_get_employee_profile_not_found(self):
        """GET /api/pulse/employees/{invalid_id}/profile - should return 404"""
        response = self.client.get(
            f"{BASE_URL}/api/pulse/employees/invalid-employee-id-123/profile",
            headers=self.headers
        )
        
        assert response.status_code == 404, f"Expected 404 for invalid employee: {response.text}"
    
    # ========== Employee Activity Timeline ==========
    
    def test_get_employee_activity_all(self):
        """GET /api/pulse/employees/{employee_id}/activity - all activity"""
        response = self.client.get(
            f"{BASE_URL}/api/pulse/employees/{TEST_EMPLOYEE_ID}/activity",
            headers=self.headers
        )
        
        assert response.status_code == 200, f"Failed to get activity: {response.text}"
        data = response.json()
        
        assert "activities" in data, "Response should contain activities"
        assert "total" in data, "Response should contain total count"
        
        # Activities should be a list
        assert isinstance(data["activities"], list), "Activities should be a list"
        print(f"Total activities: {data['total']}")
    
    def test_get_employee_activity_posts_filter(self):
        """GET /api/pulse/employees/{employee_id}/activity?activity_type=posts"""
        response = self.client.get(
            f"{BASE_URL}/api/pulse/employees/{TEST_EMPLOYEE_ID}/activity?activity_type=posts",
            headers=self.headers
        )
        
        assert response.status_code == 200, f"Failed to get posts activity: {response.text}"
        data = response.json()
        
        assert "activities" in data, "Response should contain activities"
        # If there are activities, verify they are posts
        for activity in data["activities"]:
            assert activity.get("type") == "post", f"Activity type should be 'post', got {activity.get('type')}"
        
        print(f"Posts activities: {len(data['activities'])}")
    
    def test_get_employee_activity_recognitions_filter(self):
        """GET /api/pulse/employees/{employee_id}/activity?activity_type=recognitions"""
        response = self.client.get(
            f"{BASE_URL}/api/pulse/employees/{TEST_EMPLOYEE_ID}/activity?activity_type=recognitions",
            headers=self.headers
        )
        
        assert response.status_code == 200, f"Failed to get recognition activity: {response.text}"
        data = response.json()
        
        assert "activities" in data, "Response should contain activities"
        # If there are activities, verify they are recognitions
        for activity in data["activities"]:
            assert activity.get("type") == "recognition_received", f"Activity type should be 'recognition_received', got {activity.get('type')}"
        
        print(f"Recognitions activities: {len(data['activities'])}")
    
    def test_get_employee_activity_updates_filter(self):
        """GET /api/pulse/employees/{employee_id}/activity?activity_type=updates"""
        response = self.client.get(
            f"{BASE_URL}/api/pulse/employees/{TEST_EMPLOYEE_ID}/activity?activity_type=updates",
            headers=self.headers
        )
        
        assert response.status_code == 200, f"Failed to get updates activity: {response.text}"
        data = response.json()
        
        assert "activities" in data, "Response should contain activities"
        # If there are activities, verify they are updates (daily or weekly)
        for activity in data["activities"]:
            assert activity.get("type") in ["daily_update", "weekly_update"], f"Activity type should be daily or weekly update, got {activity.get('type')}"
        
        print(f"Updates activities: {len(data['activities'])}")
    
    # ========== Permissions Endpoint ==========
    
    def test_get_user_permissions(self):
        """GET /api/pulse/permissions - should return user permissions"""
        response = self.client.get(
            f"{BASE_URL}/api/pulse/permissions",
            headers=self.headers
        )
        
        assert response.status_code == 200, f"Failed to get permissions: {response.text}"
        data = response.json()
        
        # Verify response structure
        assert "role" in data, "Response should contain role"
        assert "permissions" in data, "Response should contain permissions list"
        assert "can_create_announcement" in data, "Should have can_create_announcement flag"
        assert "can_pin_post" in data, "Should have can_pin_post flag"
        assert "can_delete_any_post" in data, "Should have can_delete_any_post flag"
        assert "can_view_leadership_dashboard" in data, "Should have can_view_leadership_dashboard flag"
        
        print(f"User role: {data['role']}")
        print(f"Permissions: {data['permissions']}")
        print(f"Can view leadership dashboard: {data['can_view_leadership_dashboard']}")
    
    # ========== Leadership Dashboard Access ==========
    
    def test_leadership_dashboard_accessible_for_admin(self):
        """GET /api/pulse/leadership/dashboard - should be accessible for admins"""
        response = self.client.get(
            f"{BASE_URL}/api/pulse/leadership/dashboard",
            headers=self.headers
        )
        
        assert response.status_code == 200, f"Leadership dashboard should be accessible: {response.text}"
        data = response.json()
        
        # Verify response structure
        assert "overview" in data, "Response should contain overview"
        assert "departments" in data, "Response should contain departments"
        assert "top_contributors" in data, "Response should contain top_contributors"
        assert "recent_issues" in data, "Response should contain recent_issues"
        assert "recent_achievements" in data, "Response should contain recent_achievements"
        
        print(f"Leadership Dashboard: Posts today={data['overview'].get('posts_today')}, This week={data['overview'].get('posts_this_week')}")
    
    # ========== Employees List (for @mentions) ==========
    
    def test_get_employees_list(self):
        """GET /api/pulse/employees - should return employees for @mentions"""
        response = self.client.get(
            f"{BASE_URL}/api/pulse/employees",
            headers=self.headers
        )
        
        assert response.status_code == 200, f"Failed to get employees list: {response.text}"
        data = response.json()
        
        assert "employees" in data, "Response should contain employees"
        assert isinstance(data["employees"], list), "Employees should be a list"
        
        # Each employee should have required fields
        if len(data["employees"]) > 0:
            employee = data["employees"][0]
            assert "id" in employee, "Employee should have id"
            assert "name" in employee, "Employee should have name"
            # email and department should also be present
        
        print(f"Total employees for @mentions: {len(data['employees'])}")
    
    def test_get_employees_list_with_search(self):
        """GET /api/pulse/employees?search=test - should filter by search term"""
        response = self.client.get(
            f"{BASE_URL}/api/pulse/employees?search=super",
            headers=self.headers
        )
        
        assert response.status_code == 200, f"Failed to search employees: {response.text}"
        data = response.json()
        
        assert "employees" in data, "Response should contain employees"
        print(f"Search results for 'super': {len(data['employees'])}")
    
    # ========== Pulse Feed with Posts ==========
    
    def test_pulse_feed_loads(self):
        """GET /api/pulse/posts - should return posts with author info"""
        response = self.client.get(
            f"{BASE_URL}/api/pulse/posts?limit=10",
            headers=self.headers
        )
        
        assert response.status_code == 200, f"Failed to get posts: {response.text}"
        data = response.json()
        
        assert "posts" in data, "Response should contain posts"
        assert "total" in data, "Response should contain total count"
        
        # If there are posts, verify author info exists
        for post in data["posts"]:
            assert "author_id" in post, "Post should have author_id"
            # author object should be populated
            if "author" in post:
                assert "name" in post["author"], "Author should have name"
        
        print(f"Pulse feed: {len(data['posts'])} posts, total: {data['total']}")
    
    # ========== Create Post (verify structure) ==========
    
    def test_create_post_with_mentions(self):
        """POST /api/pulse/posts - create a post (validates dialog works)"""
        response = self.client.post(
            f"{BASE_URL}/api/pulse/posts",
            headers=self.headers,
            json={
                "title": "TEST_MentionPost Testing @mentions",
                "content": "This is a test post with @mention functionality test",
                "post_type": "update",
                "visibility": "public",
                "department": "technology",
                "tags": ["test", "mentions"]
            }
        )
        
        assert response.status_code == 200, f"Failed to create post: {response.text}"
        data = response.json()
        
        assert "success" in data, "Response should have success field"
        assert data["success"] == True, "Post creation should succeed"
        assert "post" in data, "Response should contain the created post"
        
        print(f"Created test post: {data['post'].get('id')}")
        
        # Clean up - delete the test post
        post_id = data["post"]["id"]
        delete_response = self.client.delete(
            f"{BASE_URL}/api/pulse/posts/{post_id}",
            headers=self.headers
        )
        print(f"Cleanup: Deleted test post, status={delete_response.status_code}")


# ========== Fixtures ==========

@pytest.fixture
def api_client():
    """Shared requests session"""
    session = requests.Session()
    session.headers.update({"Content-Type": "application/json"})
    return session


@pytest.fixture
def auth_token(api_client):
    """Get authentication token"""
    response = api_client.post(
        f"{BASE_URL}/api/auth/login",
        json={"email": TEST_EMAIL, "password": TEST_PASSWORD}
    )
    
    if response.status_code == 200:
        data = response.json()
        token = data.get("token") or data.get("access_token")
        if token:
            return token
    
    pytest.skip(f"Authentication failed - skipping tests: {response.text}")
