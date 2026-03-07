"""
Test Admin User Management Endpoints
Tests: GET/POST/PUT admin users, activate/deactivate, stats, filters
"""
import pytest
import requests
import os
import uuid

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://sevora-hub.preview.emergentagent.com').rstrip('/')

# Admin credentials
ADMIN_EMAIL = "admin@sevora.com"
ADMIN_PASSWORD = "admin123"


class TestAdminUserManagement:
    """Admin User Management endpoint tests"""
    
    @pytest.fixture(scope="class")
    def admin_token(self):
        """Get admin authentication token"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD}
        )
        assert response.status_code == 200, f"Admin login failed: {response.text}"
        data = response.json()
        assert "access_token" in data
        return data["access_token"]
    
    @pytest.fixture
    def auth_headers(self, admin_token):
        """Auth headers with admin token"""
        return {"Authorization": f"Bearer {admin_token}", "Content-Type": "application/json"}
    
    # === STATS ENDPOINT ===
    def test_get_admin_stats(self, auth_headers):
        """Test GET /api/admin/stats returns user statistics"""
        response = requests.get(f"{BASE_URL}/api/admin/stats", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        
        # Verify all required stat fields
        assert "total_users" in data
        assert "active_users" in data
        assert "inactive_users" in data
        assert "pending_users" in data
        assert "recent_logins" in data
        assert "by_role" in data
        assert "by_department" in data
        
        # Verify counts are non-negative integers
        assert isinstance(data["total_users"], int) and data["total_users"] >= 0
        assert isinstance(data["active_users"], int) and data["active_users"] >= 0
        print(f"Stats: {data['total_users']} total users, {data['active_users']} active, {data['pending_users']} pending")
    
    # === GET USERS ===
    def test_get_all_users(self, auth_headers):
        """Test GET /api/admin/users returns list of users"""
        response = requests.get(f"{BASE_URL}/api/admin/users", headers=auth_headers)
        assert response.status_code == 200
        users = response.json()
        
        # Should return a list
        assert isinstance(users, list)
        assert len(users) > 0, "Should have at least one user"
        
        # Verify user structure
        first_user = users[0]
        required_fields = ["id", "email", "name", "department", "role", "status"]
        for field in required_fields:
            assert field in first_user, f"User missing field: {field}"
        
        print(f"Found {len(users)} users")
    
    def test_filter_users_by_status(self, auth_headers):
        """Test filtering users by status (active/inactive/pending)"""
        # Filter active users
        response = requests.get(f"{BASE_URL}/api/admin/users?status=active", headers=auth_headers)
        assert response.status_code == 200
        active_users = response.json()
        
        # Verify all returned users have active status
        for user in active_users:
            assert user.get("status") == "active", f"User {user['email']} status is not active"
        
        print(f"Found {len(active_users)} active users")
    
    def test_filter_users_by_role(self, auth_headers):
        """Test filtering users by role"""
        response = requests.get(f"{BASE_URL}/api/admin/users?role=admin", headers=auth_headers)
        assert response.status_code == 200
        admin_users = response.json()
        
        # Verify all returned users have admin role
        for user in admin_users:
            assert user.get("role") == "admin", f"User {user['email']} is not admin"
        
        print(f"Found {len(admin_users)} admin users")
    
    def test_search_users(self, auth_headers):
        """Test searching users by name/email"""
        response = requests.get(f"{BASE_URL}/api/admin/users?search=admin", headers=auth_headers)
        assert response.status_code == 200
        results = response.json()
        
        # Should find users matching 'admin'
        assert isinstance(results, list)
        print(f"Search 'admin' returned {len(results)} users")
    
    # === CREATE USER ===
    def test_create_user(self, auth_headers):
        """Test POST /api/admin/users creates a new user"""
        unique_id = str(uuid.uuid4())[:8]
        new_user = {
            "email": f"TEST_{unique_id}@sevora.com",
            "password": "testpass123",
            "name": f"Test User {unique_id}",
            "department": "sales",
            "role": "viewer",
            "status": "pending"
        }
        
        response = requests.post(f"{BASE_URL}/api/admin/users", json=new_user, headers=auth_headers)
        assert response.status_code == 200, f"Create user failed: {response.text}"
        created_user = response.json()
        
        # Verify created user data
        assert created_user["email"] == new_user["email"]
        assert created_user["name"] == new_user["name"]
        assert created_user["department"] == new_user["department"]
        assert created_user["role"] == new_user["role"]
        assert "id" in created_user
        
        # Verify user can be fetched
        user_id = created_user["id"]
        get_response = requests.get(f"{BASE_URL}/api/admin/users/{user_id}", headers=auth_headers)
        assert get_response.status_code == 200
        fetched_user = get_response.json()
        assert fetched_user["email"] == new_user["email"]
        
        print(f"Created user: {created_user['email']} with ID: {user_id}")
        return user_id
    
    def test_create_duplicate_user_fails(self, auth_headers):
        """Test creating user with existing email fails"""
        duplicate_user = {
            "email": ADMIN_EMAIL,  # Already exists
            "password": "testpass123",
            "name": "Duplicate Admin",
            "department": "admin",
            "role": "admin",
            "status": "active"
        }
        
        response = requests.post(f"{BASE_URL}/api/admin/users", json=duplicate_user, headers=auth_headers)
        assert response.status_code == 400, "Should fail with duplicate email"
        error = response.json()
        assert "already registered" in error.get("detail", "").lower()
        print("Duplicate user creation correctly rejected")
    
    # === UPDATE USER ===
    def test_update_user(self, auth_headers):
        """Test PUT /api/admin/users/{id} updates user"""
        # First create a test user
        unique_id = str(uuid.uuid4())[:8]
        new_user = {
            "email": f"TEST_update_{unique_id}@sevora.com",
            "password": "testpass123",
            "name": f"Original Name {unique_id}",
            "department": "sales",
            "role": "viewer",
            "status": "pending"
        }
        
        create_response = requests.post(f"{BASE_URL}/api/admin/users", json=new_user, headers=auth_headers)
        assert create_response.status_code == 200
        user_id = create_response.json()["id"]
        
        # Update the user
        update_data = {
            "name": "Updated Name",
            "role": "sales_manager",
            "department": "sales"
        }
        
        update_response = requests.put(f"{BASE_URL}/api/admin/users/{user_id}", json=update_data, headers=auth_headers)
        assert update_response.status_code == 200, f"Update failed: {update_response.text}"
        
        # Verify update via GET
        get_response = requests.get(f"{BASE_URL}/api/admin/users/{user_id}", headers=auth_headers)
        assert get_response.status_code == 200
        updated_user = get_response.json()
        assert updated_user["name"] == "Updated Name"
        assert updated_user["role"] == "sales_manager"
        
        print(f"User {user_id} updated successfully")
    
    # === ACTIVATE/DEACTIVATE ===
    def test_activate_user(self, auth_headers):
        """Test PUT /api/admin/users/{id}/activate"""
        # Create an inactive user first
        unique_id = str(uuid.uuid4())[:8]
        new_user = {
            "email": f"TEST_activate_{unique_id}@sevora.com",
            "password": "testpass123",
            "name": f"Activate Test {unique_id}",
            "department": "sales",
            "role": "viewer",
            "status": "inactive"
        }
        
        create_response = requests.post(f"{BASE_URL}/api/admin/users", json=new_user, headers=auth_headers)
        assert create_response.status_code == 200
        user_id = create_response.json()["id"]
        
        # Activate the user
        activate_response = requests.put(f"{BASE_URL}/api/admin/users/{user_id}/activate", headers=auth_headers)
        assert activate_response.status_code == 200
        
        # Verify status changed
        get_response = requests.get(f"{BASE_URL}/api/admin/users/{user_id}", headers=auth_headers)
        assert get_response.status_code == 200
        assert get_response.json()["status"] == "active"
        
        print(f"User {user_id} activated successfully")
    
    def test_deactivate_user(self, auth_headers):
        """Test PUT /api/admin/users/{id}/deactivate"""
        # Create an active user first
        unique_id = str(uuid.uuid4())[:8]
        new_user = {
            "email": f"TEST_deactivate_{unique_id}@sevora.com",
            "password": "testpass123",
            "name": f"Deactivate Test {unique_id}",
            "department": "sales",
            "role": "viewer",
            "status": "active"
        }
        
        create_response = requests.post(f"{BASE_URL}/api/admin/users", json=new_user, headers=auth_headers)
        assert create_response.status_code == 200
        user_id = create_response.json()["id"]
        
        # Deactivate the user
        deactivate_response = requests.put(f"{BASE_URL}/api/admin/users/{user_id}/deactivate", headers=auth_headers)
        assert deactivate_response.status_code == 200
        
        # Verify status changed
        get_response = requests.get(f"{BASE_URL}/api/admin/users/{user_id}", headers=auth_headers)
        assert get_response.status_code == 200
        assert get_response.json()["status"] == "inactive"
        
        print(f"User {user_id} deactivated successfully")
    
    # === AUTHORIZATION TESTS ===
    def test_admin_endpoints_require_auth(self):
        """Test that admin endpoints require authentication"""
        # No auth header
        response = requests.get(f"{BASE_URL}/api/admin/users")
        assert response.status_code == 401, "Should require authentication"
        
        response = requests.get(f"{BASE_URL}/api/admin/stats")
        assert response.status_code == 401, "Should require authentication"
        
        print("Authorization checks passed")
    
    def test_non_admin_cannot_access(self):
        """Test that non-admin users cannot access admin endpoints"""
        # Login as viewer user (if exists)
        viewer_response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": "viewer@sevora.com", "password": "admin123"}
        )
        
        if viewer_response.status_code == 200:
            viewer_token = viewer_response.json()["access_token"]
            headers = {"Authorization": f"Bearer {viewer_token}"}
            
            # Try to access admin endpoint
            response = requests.get(f"{BASE_URL}/api/admin/users", headers=headers)
            assert response.status_code == 403, "Viewer should not access admin endpoints"
            print("Non-admin access correctly denied")
        else:
            pytest.skip("Viewer user not available for test")


class TestCleanup:
    """Cleanup test users created during testing"""
    
    @pytest.fixture(scope="class")
    def admin_token(self):
        """Get admin authentication token"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD}
        )
        if response.status_code == 200:
            return response.json()["access_token"]
        return None
    
    def test_cleanup_test_users(self, admin_token):
        """Clean up TEST_ prefixed users after tests"""
        if not admin_token:
            pytest.skip("Admin token not available")
        
        headers = {"Authorization": f"Bearer {admin_token}"}
        
        # Get all users
        response = requests.get(f"{BASE_URL}/api/admin/users", headers=headers)
        if response.status_code != 200:
            pytest.skip("Could not fetch users for cleanup")
        
        users = response.json()
        test_users = [u for u in users if u.get("email", "").startswith("TEST_")]
        
        print(f"Found {len(test_users)} test users to clean up")
        
        # Note: Delete endpoint requires super_admin, so we'll just report
        for user in test_users:
            print(f"  - {user['email']} (ID: {user['id']})")
