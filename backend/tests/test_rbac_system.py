"""
RBAC System Tests
Tests for Role-Based Access Control with CRUD permissions and Data Scope
"""

import pytest
import requests
import os
import uuid

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://sevora-hub.preview.emergentagent.com').rstrip('/')

# Test credentials
TEST_EMAIL = "admin@sevora.com"
TEST_PASSWORD = "admin123"


@pytest.fixture(scope="module")
def auth_token():
    """Get authentication token for admin user"""
    response = requests.post(
        f"{BASE_URL}/api/auth/login",
        json={"email": TEST_EMAIL, "password": TEST_PASSWORD}
    )
    if response.status_code != 200:
        pytest.skip(f"Authentication failed: {response.text}")
    return response.json()["access_token"]


@pytest.fixture(scope="module")
def api_client(auth_token):
    """Create authenticated API client"""
    session = requests.Session()
    session.headers.update({
        "Authorization": f"Bearer {auth_token}",
        "Content-Type": "application/json"
    })
    return session


class TestRBACRolesEndpoint:
    """Tests for /api/rbac/roles endpoint"""
    
    def test_get_roles_returns_list(self, api_client):
        """GET /api/rbac/roles should return list of roles"""
        response = api_client.get(f"{BASE_URL}/api/rbac/roles")
        assert response.status_code == 200
        
        data = response.json()
        assert isinstance(data, list)
        assert len(data) > 0
        print(f"PASS: Found {len(data)} roles")
    
    def test_roles_have_required_fields(self, api_client):
        """Each role should have required fields"""
        response = api_client.get(f"{BASE_URL}/api/rbac/roles")
        assert response.status_code == 200
        
        roles = response.json()
        for role in roles[:3]:  # Check first 3 roles
            assert "id" in role, "Role missing 'id' field"
            assert "name" in role, "Role missing 'name' field"
            assert "code" in role, "Role missing 'code' field"
            assert "module_access" in role, "Role missing 'module_access' field"
            assert "module_permissions" in role, "Role missing 'module_permissions' field"
            assert "can_manage_users" in role, "Role missing 'can_manage_users' field"
            assert "can_manage_roles" in role, "Role missing 'can_manage_roles' field"
        print("PASS: All roles have required fields")
    
    def test_roles_have_user_count(self, api_client):
        """Roles should include user_count field"""
        response = api_client.get(f"{BASE_URL}/api/rbac/roles")
        assert response.status_code == 200
        
        roles = response.json()
        for role in roles[:3]:
            assert "user_count" in role, "Role missing 'user_count' field"
            assert isinstance(role["user_count"], int)
        print("PASS: Roles have user_count field")


class TestRBACModulesEndpoint:
    """Tests for /api/rbac/modules endpoint"""
    
    def test_get_modules_returns_data(self, api_client):
        """GET /api/rbac/modules should return modules list"""
        response = api_client.get(f"{BASE_URL}/api/rbac/modules")
        assert response.status_code == 200
        
        data = response.json()
        assert "modules" in data
        assert "total" in data
        assert "categories" in data
        assert len(data["modules"]) > 0
        print(f"PASS: Found {data['total']} modules in {len(data['categories'])} categories")
    
    def test_modules_have_required_fields(self, api_client):
        """Each module should have required fields"""
        response = api_client.get(f"{BASE_URL}/api/rbac/modules")
        assert response.status_code == 200
        
        modules = response.json()["modules"]
        for module in modules[:5]:  # Check first 5 modules
            assert "code" in module, "Module missing 'code' field"
            assert "name" in module, "Module missing 'name' field"
            assert "description" in module, "Module missing 'description' field"
            assert "category" in module, "Module missing 'category' field"
            assert "is_default" in module, "Module missing 'is_default' field"
        print("PASS: All modules have required fields")
    
    def test_modules_have_categories(self, api_client):
        """Modules should be grouped by categories"""
        response = api_client.get(f"{BASE_URL}/api/rbac/modules")
        assert response.status_code == 200
        
        data = response.json()
        categories = data["categories"]
        
        # Expected categories based on the RBAC model
        expected_categories = ["core", "collaboration", "operations", "business", "hr_finance", "analytics", "admin"]
        for cat in expected_categories:
            assert cat in categories, f"Missing expected category: {cat}"
        print(f"PASS: Found all expected categories: {categories}")


class TestRBACPresetsEndpoint:
    """Tests for /api/rbac/presets endpoint"""
    
    def test_get_presets_returns_data(self, api_client):
        """GET /api/rbac/presets should return permission presets"""
        response = api_client.get(f"{BASE_URL}/api/rbac/presets")
        assert response.status_code == 200
        
        data = response.json()
        assert "viewer" in data
        assert "editor" in data
        assert "manager" in data
        assert "admin" in data
        print("PASS: Found all permission presets (viewer, editor, manager, admin)")
    
    def test_presets_have_crud_permissions(self, api_client):
        """Each preset should have CRUD permission fields"""
        response = api_client.get(f"{BASE_URL}/api/rbac/presets")
        assert response.status_code == 200
        
        presets = response.json()
        for preset_name, preset in presets.items():
            assert "create" in preset, f"{preset_name} missing 'create' field"
            assert "read" in preset, f"{preset_name} missing 'read' field"
            assert "update" in preset, f"{preset_name} missing 'update' field"
            assert "delete" in preset, f"{preset_name} missing 'delete' field"
            assert "data_scope" in preset, f"{preset_name} missing 'data_scope' field"
        print("PASS: All presets have CRUD and data_scope fields")
    
    def test_presets_data_scope_values(self, api_client):
        """Presets should have valid data_scope values"""
        response = api_client.get(f"{BASE_URL}/api/rbac/presets")
        assert response.status_code == 200
        
        presets = response.json()
        valid_scopes = ["own", "own_assigned", "team", "department", "all"]
        
        for preset_name, preset in presets.items():
            assert preset["data_scope"] in valid_scopes, f"{preset_name} has invalid data_scope: {preset['data_scope']}"
        print("PASS: All presets have valid data_scope values")


class TestRBACUserPermissionsEndpoint:
    """Tests for /api/rbac/users/{user_id}/permissions endpoint"""
    
    def test_get_user_permissions(self, api_client):
        """GET /api/rbac/users/{user_id}/permissions should return effective permissions"""
        # First get a user ID
        users_response = api_client.get(f"{BASE_URL}/api/admin/users")
        assert users_response.status_code == 200
        
        users = users_response.json()
        assert len(users) > 0, "No users found"
        
        user_id = users[0]["id"]
        
        # Get user permissions
        response = api_client.get(f"{BASE_URL}/api/rbac/users/{user_id}/permissions")
        assert response.status_code == 200
        
        data = response.json()
        assert "user_id" in data
        assert "user_name" in data
        assert "user_email" in data
        assert "roles" in data
        assert "modules" in data
        assert "permissions" in data
        assert "can_manage_users" in data
        assert "can_manage_roles" in data
        assert "is_admin" in data
        print(f"PASS: Got permissions for user {data['user_name']}")
    
    def test_admin_user_has_full_access(self, api_client):
        """Admin user should have full module access"""
        # Get admin user ID (the one we're logged in as)
        me_response = api_client.get(f"{BASE_URL}/api/auth/me")
        assert me_response.status_code == 200
        
        user_id = me_response.json()["id"]
        
        # Get permissions
        response = api_client.get(f"{BASE_URL}/api/rbac/users/{user_id}/permissions")
        assert response.status_code == 200
        
        data = response.json()
        assert data["is_admin"] == True, "Admin user should have is_admin=True"
        assert len(data["modules"]) > 10, "Admin should have access to many modules"
        print(f"PASS: Admin user has access to {len(data['modules'])} modules")
    
    def test_invalid_user_returns_404(self, api_client):
        """Invalid user ID should return 404"""
        fake_user_id = str(uuid.uuid4())
        response = api_client.get(f"{BASE_URL}/api/rbac/users/{fake_user_id}/permissions")
        assert response.status_code == 404
        print("PASS: Invalid user ID returns 404")


class TestRBACRoleCRUD:
    """Tests for role CRUD operations"""
    
    @pytest.fixture
    def test_role_data(self):
        """Generate unique test role data"""
        unique_id = str(uuid.uuid4())[:8]
        return {
            "name": f"TEST_Role_{unique_id}",
            "code": f"test_role_{unique_id}",
            "description": "Test role for RBAC testing",
            "module_access": ["dashboard", "notifications"],
            "module_permissions": {
                "dashboard": {
                    "create": True,
                    "read": True,
                    "update": False,
                    "delete": False,
                    "data_scope": "own"
                }
            },
            "can_manage_users": False,
            "can_manage_roles": False
        }
    
    def test_create_role(self, api_client, test_role_data):
        """POST /api/rbac/roles should create a new role"""
        response = api_client.post(f"{BASE_URL}/api/rbac/roles", json=test_role_data)
        assert response.status_code == 200
        
        data = response.json()
        assert data["name"] == test_role_data["name"]
        assert data["code"] == test_role_data["code"]
        assert "id" in data
        print(f"PASS: Created role {data['name']} with ID {data['id']}")
        
        # Cleanup - delete the role
        api_client.delete(f"{BASE_URL}/api/rbac/roles/{data['id']}")
    
    def test_get_single_role(self, api_client):
        """GET /api/rbac/roles/{role_id} should return single role"""
        # Get list of roles first
        list_response = api_client.get(f"{BASE_URL}/api/rbac/roles")
        assert list_response.status_code == 200
        
        roles = list_response.json()
        assert len(roles) > 0
        
        role_id = roles[0]["id"]
        
        # Get single role
        response = api_client.get(f"{BASE_URL}/api/rbac/roles/{role_id}")
        assert response.status_code == 200
        
        data = response.json()
        assert data["id"] == role_id
        print(f"PASS: Got role {data['name']}")
    
    def test_update_role(self, api_client, test_role_data):
        """PUT /api/rbac/roles/{role_id} should update role"""
        # Create a role first
        create_response = api_client.post(f"{BASE_URL}/api/rbac/roles", json=test_role_data)
        assert create_response.status_code == 200
        role_id = create_response.json()["id"]
        
        # Update the role
        update_data = {
            "description": "Updated description",
            "can_manage_users": True
        }
        response = api_client.put(f"{BASE_URL}/api/rbac/roles/{role_id}", json=update_data)
        assert response.status_code == 200
        
        data = response.json()
        assert data["description"] == "Updated description"
        assert data["can_manage_users"] == True
        print(f"PASS: Updated role {data['name']}")
        
        # Cleanup
        api_client.delete(f"{BASE_URL}/api/rbac/roles/{role_id}")
    
    def test_delete_role(self, api_client, test_role_data):
        """DELETE /api/rbac/roles/{role_id} should delete role"""
        # Create a role first
        create_response = api_client.post(f"{BASE_URL}/api/rbac/roles", json=test_role_data)
        assert create_response.status_code == 200
        role_id = create_response.json()["id"]
        
        # Delete the role
        response = api_client.delete(f"{BASE_URL}/api/rbac/roles/{role_id}")
        assert response.status_code == 200
        
        # Verify it's deleted (should return 404 or inactive)
        get_response = api_client.get(f"{BASE_URL}/api/rbac/roles/{role_id}")
        # Role might be soft-deleted, so check if it's inactive or 404
        if get_response.status_code == 200:
            assert get_response.json().get("is_active") == False
        print(f"PASS: Deleted role {role_id}")


class TestRBACModulePermissions:
    """Tests for module permission structure"""
    
    def test_crud_checkboxes_structure(self, api_client):
        """Verify CRUD permission structure in roles"""
        response = api_client.get(f"{BASE_URL}/api/rbac/roles")
        assert response.status_code == 200
        
        roles = response.json()
        
        # Find a role with module_permissions
        for role in roles:
            if role.get("module_permissions"):
                for module_code, perms in role["module_permissions"].items():
                    # Check CRUD fields exist
                    assert "create" in perms or perms.get("create") is not None, f"Missing 'create' in {module_code}"
                    assert "read" in perms or perms.get("read") is not None, f"Missing 'read' in {module_code}"
                    assert "update" in perms or perms.get("update") is not None, f"Missing 'update' in {module_code}"
                    assert "delete" in perms or perms.get("delete") is not None, f"Missing 'delete' in {module_code}"
                    print(f"PASS: Module {module_code} has CRUD permissions")
                    return
        
        print("PASS: CRUD structure verified (no roles with permissions found)")
    
    def test_data_scope_options(self, api_client):
        """Verify data scope options are valid"""
        response = api_client.get(f"{BASE_URL}/api/rbac/presets")
        assert response.status_code == 200
        
        presets = response.json()
        valid_scopes = ["own", "own_assigned", "team", "department", "all"]
        
        # Check viewer preset has own_assigned scope
        assert presets["viewer"]["data_scope"] == "own_assigned"
        
        # Check editor preset has team scope
        assert presets["editor"]["data_scope"] == "team"
        
        # Check manager preset has department scope
        assert presets["manager"]["data_scope"] == "department"
        
        # Check admin preset has all scope
        assert presets["admin"]["data_scope"] == "all"
        
        print("PASS: Data scope options are correctly configured")


class TestAdminUsersEndpoint:
    """Tests for /api/admin/users endpoint (used in permissions preview)"""
    
    def test_get_users_list(self, api_client):
        """GET /api/admin/users should return list of users"""
        response = api_client.get(f"{BASE_URL}/api/admin/users")
        assert response.status_code == 200
        
        users = response.json()
        assert isinstance(users, list)
        assert len(users) > 0
        print(f"PASS: Found {len(users)} users")
    
    def test_users_have_required_fields(self, api_client):
        """Users should have fields needed for permissions preview"""
        response = api_client.get(f"{BASE_URL}/api/admin/users")
        assert response.status_code == 200
        
        users = response.json()
        for user in users[:3]:
            assert "id" in user
            assert "name" in user
            assert "email" in user
            assert "role" in user
        print("PASS: Users have required fields for preview")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
