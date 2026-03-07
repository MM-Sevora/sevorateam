"""
Test suite for Granular CRUD Permissions feature (Phase 3)
Tests: 
- GET /api/admin/modules - Returns all modules grouped by department
- GET /api/admin/users/{id}/permissions - Returns user permissions
- PUT /api/admin/users/{id}/permissions - Saves custom permissions  
- DELETE /api/admin/users/{id}/permissions - Resets to role defaults
- GET /api/auth/me - Returns permissions in user object
"""

import pytest
import requests
import os
import uuid

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
ADMIN_EMAIL = "admin@sevora.com"
ADMIN_PASSWORD = "admin123"
MARKETING_EMAIL = "marketing@sevora.com"
MARKETING_PASSWORD = "admin123"


class TestAuthSetup:
    """Authentication setup and verification"""
    
    def test_admin_login(self):
        """Test admin can login successfully"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        assert response.status_code == 200, f"Admin login failed: {response.text}"
        data = response.json()
        assert "access_token" in data
        assert "user" in data
        assert data["user"]["role"] in ["admin", "super_admin"]
        print(f"Admin login successful - Role: {data['user']['role']}")

    def test_marketing_login(self):
        """Test marketing user can login"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": MARKETING_EMAIL,
            "password": MARKETING_PASSWORD
        })
        assert response.status_code == 200, f"Marketing login failed: {response.text}"
        data = response.json()
        assert "access_token" in data
        print(f"Marketing login successful - Role: {data['user']['role']}")


@pytest.fixture(scope="module")
def admin_token():
    """Get admin authentication token"""
    response = requests.post(f"{BASE_URL}/api/auth/login", json={
        "email": ADMIN_EMAIL,
        "password": ADMIN_PASSWORD
    })
    if response.status_code == 200:
        return response.json().get("access_token")
    pytest.skip("Admin authentication failed")


@pytest.fixture(scope="module")
def marketing_token():
    """Get marketing user token"""
    response = requests.post(f"{BASE_URL}/api/auth/login", json={
        "email": MARKETING_EMAIL,
        "password": MARKETING_PASSWORD
    })
    if response.status_code == 200:
        return response.json().get("access_token")
    pytest.skip("Marketing authentication failed")


@pytest.fixture(scope="module")
def admin_headers(admin_token):
    """Admin request headers"""
    return {"Authorization": f"Bearer {admin_token}", "Content-Type": "application/json"}


@pytest.fixture(scope="module")
def marketing_headers(marketing_token):
    """Marketing user request headers"""
    return {"Authorization": f"Bearer {marketing_token}", "Content-Type": "application/json"}


@pytest.fixture(scope="module")
def active_users(admin_headers):
    """Fetch active users for testing"""
    response = requests.get(f"{BASE_URL}/api/admin/users?status=active", headers=admin_headers)
    if response.status_code == 200:
        users = response.json()
        # Get a non-admin user for permission testing
        non_admin_users = [u for u in users if u.get('role') not in ['super_admin', 'admin']]
        return non_admin_users
    return []


class TestModulesAPI:
    """Tests for GET /api/admin/modules endpoint"""
    
    def test_get_all_modules(self, admin_headers):
        """Test that modules endpoint returns all modules grouped by department"""
        response = requests.get(f"{BASE_URL}/api/admin/modules", headers=admin_headers)
        assert response.status_code == 200, f"Failed to get modules: {response.text}"
        
        modules = response.json()
        
        # Verify all departments are present
        expected_departments = ["marketing", "sales", "social", "mail", "admin"]
        for dept in expected_departments:
            assert dept in modules, f"Missing department: {dept}"
            assert isinstance(modules[dept], list), f"Department {dept} should be a list"
            assert len(modules[dept]) > 0, f"Department {dept} should have modules"
            
        print(f"Modules by department: {[f'{k}: {len(v)} modules' for k, v in modules.items()]}")
        
    def test_modules_have_required_fields(self, admin_headers):
        """Test that each module has required fields (id, name, description)"""
        response = requests.get(f"{BASE_URL}/api/admin/modules", headers=admin_headers)
        assert response.status_code == 200
        
        modules = response.json()
        
        for dept, dept_modules in modules.items():
            for module in dept_modules:
                assert "id" in module, f"Module in {dept} missing 'id'"
                assert "name" in module, f"Module in {dept} missing 'name'"
                assert "description" in module, f"Module in {dept} missing 'description'"
        
        print("All modules have required fields: id, name, description")
        
    def test_modules_requires_admin(self):
        """Test that modules endpoint requires admin authentication"""
        response = requests.get(f"{BASE_URL}/api/admin/modules")
        assert response.status_code == 401, "Should require authentication"
        
    def test_non_admin_cannot_access_modules(self, marketing_headers):
        """Test that non-admin cannot access modules endpoint"""
        response = requests.get(f"{BASE_URL}/api/admin/modules", headers=marketing_headers)
        assert response.status_code == 403, f"Non-admin should be denied: {response.status_code}"


class TestUserPermissionsAPI:
    """Tests for user permissions endpoints"""
    
    def test_get_user_permissions(self, admin_headers, active_users):
        """Test GET /api/admin/users/{id}/permissions returns user permissions"""
        if not active_users:
            pytest.skip("No active non-admin users found")
        
        user = active_users[0]
        user_id = user["id"]
        
        response = requests.get(f"{BASE_URL}/api/admin/users/{user_id}/permissions", headers=admin_headers)
        assert response.status_code == 200, f"Failed to get permissions: {response.text}"
        
        data = response.json()
        assert "user_id" in data, "Response should have user_id"
        assert "role" in data, "Response should have role"
        assert "has_custom_permissions" in data, "Response should have has_custom_permissions"
        assert "permissions" in data, "Response should have permissions"
        assert isinstance(data["permissions"], dict), "Permissions should be a dict"
        
        print(f"User {user['name']} ({user['role']}) - Custom: {data['has_custom_permissions']}")
    
    def test_get_permissions_for_nonexistent_user(self, admin_headers):
        """Test GET permissions for non-existent user returns 404"""
        fake_id = str(uuid.uuid4())
        response = requests.get(f"{BASE_URL}/api/admin/users/{fake_id}/permissions", headers=admin_headers)
        assert response.status_code == 404, f"Should return 404 for non-existent user"
    
    def test_save_custom_permissions(self, admin_headers, active_users):
        """Test PUT /api/admin/users/{id}/permissions saves custom permissions"""
        if not active_users:
            pytest.skip("No active non-admin users found")
        
        user = active_users[0]
        user_id = user["id"]
        
        # Create custom permissions
        custom_permissions = {
            "marketing": {
                "influencers": ["view", "create", "edit"],
                "campaigns": ["view"]
            },
            "sales": {
                "leads": ["view"]
            }
        }
        
        response = requests.put(
            f"{BASE_URL}/api/admin/users/{user_id}/permissions",
            headers=admin_headers,
            json={"permissions": custom_permissions, "use_custom": True}
        )
        assert response.status_code == 200, f"Failed to save permissions: {response.text}"
        
        data = response.json()
        assert data.get("success") == True, "Save should return success"
        
        # Verify permissions were saved
        verify_response = requests.get(
            f"{BASE_URL}/api/admin/users/{user_id}/permissions", 
            headers=admin_headers
        )
        assert verify_response.status_code == 200
        verify_data = verify_response.json()
        assert verify_data.get("has_custom_permissions") == True, "User should have custom permissions"
        
        print(f"Custom permissions saved for {user['name']}")

    def test_reset_permissions_to_defaults(self, admin_headers, active_users):
        """Test DELETE /api/admin/users/{id}/permissions resets to role defaults"""
        if not active_users:
            pytest.skip("No active non-admin users found")
        
        user = active_users[0]
        user_id = user["id"]
        
        # First set custom permissions
        custom_permissions = {"marketing": {"influencers": ["view"]}}
        requests.put(
            f"{BASE_URL}/api/admin/users/{user_id}/permissions",
            headers=admin_headers,
            json={"permissions": custom_permissions, "use_custom": True}
        )
        
        # Now reset to defaults
        response = requests.delete(
            f"{BASE_URL}/api/admin/users/{user_id}/permissions",
            headers=admin_headers
        )
        assert response.status_code == 200, f"Failed to reset permissions: {response.text}"
        
        data = response.json()
        assert data.get("success") == True, "Reset should return success"
        
        # Verify permissions were reset
        verify_response = requests.get(
            f"{BASE_URL}/api/admin/users/{user_id}/permissions",
            headers=admin_headers
        )
        verify_data = verify_response.json()
        assert verify_data.get("has_custom_permissions") == False, "User should not have custom permissions after reset"
        
        print(f"Permissions reset to defaults for {user['name']}")


class TestAuthMePermissions:
    """Tests for permissions in /api/auth/me endpoint"""
    
    def test_me_returns_permissions(self, admin_headers):
        """Test that /api/auth/me returns permissions in user object"""
        response = requests.get(f"{BASE_URL}/api/auth/me", headers=admin_headers)
        assert response.status_code == 200, f"Failed to get me: {response.text}"
        
        user = response.json()
        assert "permissions" in user, "/api/auth/me should include permissions"
        assert isinstance(user["permissions"], dict), "Permissions should be a dict"
        
        # Verify permissions structure
        permissions = user["permissions"]
        assert len(permissions) > 0, "Admin should have permissions"
        
        print(f"User has permissions for departments: {list(permissions.keys())}")

    def test_me_includes_custom_permissions_flag(self, admin_headers):
        """Test that /api/auth/me includes has_custom_permissions flag"""
        response = requests.get(f"{BASE_URL}/api/auth/me", headers=admin_headers)
        assert response.status_code == 200
        
        user = response.json()
        assert "has_custom_permissions" in user, "/api/auth/me should include has_custom_permissions flag"
        assert isinstance(user["has_custom_permissions"], bool), "has_custom_permissions should be boolean"


class TestPermissionChecks:
    """Tests for permission check endpoint"""
    
    def test_check_admin_has_permissions(self, admin_headers):
        """Test that admin has full permissions"""
        response = requests.post(
            f"{BASE_URL}/api/admin/permissions/check?department=marketing&module=influencers&action=create",
            headers=admin_headers
        )
        assert response.status_code == 200
        
        data = response.json()
        assert data.get("has_permission") == True, "Admin should have permission"
        
    def test_check_permission_structure(self, admin_headers):
        """Test permission check returns proper structure"""
        response = requests.post(
            f"{BASE_URL}/api/admin/permissions/check?department=sales&module=leads&action=view",
            headers=admin_headers
        )
        assert response.status_code == 200
        
        data = response.json()
        assert "has_permission" in data
        assert "department" in data
        assert "module" in data
        assert "action" in data


class TestDefaultRolePermissions:
    """Tests for default role permissions endpoint"""
    
    def test_get_viewer_default_permissions(self, admin_headers):
        """Test getting default permissions for viewer role"""
        response = requests.get(
            f"{BASE_URL}/api/admin/permissions/default/viewer",
            headers=admin_headers
        )
        assert response.status_code == 200, f"Failed to get viewer permissions: {response.text}"
        
        data = response.json()
        assert "role" in data
        assert "permissions" in data
        assert data["role"] == "viewer"
        
        # Viewer should only have view permissions
        perms = data["permissions"]
        for dept, dept_perms in perms.items():
            for module, actions in dept_perms.items():
                # Most viewer actions should be view only
                assert "view" in actions, f"Viewer should have view for {dept}.{module}"
                
        print(f"Viewer has permissions for: {list(perms.keys())}")
        
    def test_get_marketing_manager_default_permissions(self, admin_headers):
        """Test getting default permissions for marketing_manager role"""
        response = requests.get(
            f"{BASE_URL}/api/admin/permissions/default/marketing_manager",
            headers=admin_headers
        )
        assert response.status_code == 200
        
        data = response.json()
        assert "marketing" in data["permissions"], "Marketing manager should have marketing permissions"
        
    def test_invalid_role_returns_404(self, admin_headers):
        """Test that invalid role returns 404"""
        response = requests.get(
            f"{BASE_URL}/api/admin/permissions/default/invalid_role",
            headers=admin_headers
        )
        assert response.status_code == 404


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
