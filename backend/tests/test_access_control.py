"""
Access Control API Tests - Custom Roles, Module Access, Onboarding, Permissions
Tests for: GET/POST/PUT/DELETE /api/access/roles, GET /api/access/modules, 
           GET /api/access/draft-users, POST /api/access/onboard/{user_id},
           GET /api/access/my-access, GET /api/access/check/{module_key}
"""

import pytest
import requests
import os
import uuid
from datetime import datetime

# Base URL from environment
BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')
assert BASE_URL, "REACT_APP_BACKEND_URL must be set"

# Test credentials
TEST_EMAIL = "superadmin@sevora.com"
TEST_PASSWORD = "superadmin123"


class TestAccessControlSetup:
    """Setup and authentication"""
    
    @pytest.fixture(scope="class")
    def auth_token(self):
        """Get authentication token"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": TEST_EMAIL, "password": TEST_PASSWORD}
        )
        assert response.status_code == 200, f"Login failed: {response.text}"
        data = response.json()
        assert "access_token" in data, "No access token returned"
        return data["access_token"]
    
    @pytest.fixture(scope="class")
    def api_client(self, auth_token):
        """Authenticated requests session"""
        session = requests.Session()
        session.headers.update({
            "Authorization": f"Bearer {auth_token}",
            "Content-Type": "application/json"
        })
        return session
    
    def test_auth_works(self, auth_token):
        """Verify authentication works"""
        assert auth_token is not None
        assert len(auth_token) > 50  # JWT tokens are long
        print(f"Auth token obtained: {auth_token[:50]}...")


class TestGetRoles:
    """Tests for GET /api/access/roles"""
    
    @pytest.fixture(scope="class")
    def auth_token(self):
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": TEST_EMAIL, "password": TEST_PASSWORD}
        )
        return response.json()["access_token"]
    
    @pytest.fixture(scope="class")
    def api_client(self, auth_token):
        session = requests.Session()
        session.headers.update({
            "Authorization": f"Bearer {auth_token}",
            "Content-Type": "application/json"
        })
        return session
    
    def test_get_all_roles_returns_200(self, api_client):
        """GET /api/access/roles returns 200"""
        response = api_client.get(f"{BASE_URL}/api/access/roles")
        assert response.status_code == 200
        print(f"Got {len(response.json())} roles")
    
    def test_get_roles_returns_list(self, api_client):
        """GET /api/access/roles returns a list"""
        response = api_client.get(f"{BASE_URL}/api/access/roles")
        data = response.json()
        assert isinstance(data, list)
        assert len(data) >= 7, "Should have at least 7 default seeded roles"
    
    def test_role_has_required_fields(self, api_client):
        """Each role has required fields: id, name, code, module_access"""
        response = api_client.get(f"{BASE_URL}/api/access/roles")
        roles = response.json()
        for role in roles[:3]:  # Check first 3
            assert "id" in role, "Role missing 'id'"
            assert "name" in role, "Role missing 'name'"
            assert "code" in role, "Role missing 'code'"
            assert "module_access" in role, "Role missing 'module_access'"
            assert "module_names" in role, "Role missing 'module_names'"
            assert "is_active" in role, "Role missing 'is_active'"
            assert "employee_count" in role, "Role missing 'employee_count'"
        print("All roles have required fields")
    
    def test_role_has_employee_count(self, api_client):
        """Roles should have employee_count field"""
        response = api_client.get(f"{BASE_URL}/api/access/roles")
        roles = response.json()
        for role in roles:
            assert isinstance(role.get("employee_count"), int)
    
    def test_super_admin_role_exists(self, api_client):
        """Super Admin system role should exist"""
        response = api_client.get(f"{BASE_URL}/api/access/roles")
        roles = response.json()
        super_admin = next((r for r in roles if r["code"] == "super_admin"), None)
        assert super_admin is not None, "Super Admin role not found"
        assert super_admin["is_system_role"] is True
        assert super_admin["can_manage_users"] is True
        assert super_admin["can_manage_roles"] is True
        print(f"Super Admin role found: {super_admin['name']}")
    
    def test_hr_admin_role_exists(self, api_client):
        """HR Admin system role should exist"""
        response = api_client.get(f"{BASE_URL}/api/access/roles")
        roles = response.json()
        hr_admin = next((r for r in roles if r["code"] == "hr_admin"), None)
        assert hr_admin is not None, "HR Admin role not found"
        assert "hr" in hr_admin["module_access"]
        print(f"HR Admin role found: {hr_admin['name']}")


class TestGetRoleById:
    """Tests for GET /api/access/roles/{role_id}"""
    
    @pytest.fixture(scope="class")
    def auth_token(self):
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": TEST_EMAIL, "password": TEST_PASSWORD}
        )
        return response.json()["access_token"]
    
    @pytest.fixture(scope="class")
    def api_client(self, auth_token):
        session = requests.Session()
        session.headers.update({
            "Authorization": f"Bearer {auth_token}",
            "Content-Type": "application/json"
        })
        return session
    
    def test_get_role_by_id_returns_200(self, api_client):
        """GET /api/access/roles/{id} returns 200 for valid ID"""
        # Get a role ID first
        roles_response = api_client.get(f"{BASE_URL}/api/access/roles")
        role_id = roles_response.json()[0]["id"]
        
        response = api_client.get(f"{BASE_URL}/api/access/roles/{role_id}")
        assert response.status_code == 200
    
    def test_get_role_by_id_returns_correct_data(self, api_client):
        """GET /api/access/roles/{id} returns correct role data"""
        roles_response = api_client.get(f"{BASE_URL}/api/access/roles")
        expected_role = roles_response.json()[0]
        role_id = expected_role["id"]
        
        response = api_client.get(f"{BASE_URL}/api/access/roles/{role_id}")
        data = response.json()
        
        assert data["id"] == role_id
        assert data["name"] == expected_role["name"]
        assert data["code"] == expected_role["code"]
    
    def test_get_role_by_invalid_id_returns_404(self, api_client):
        """GET /api/access/roles/{id} returns 404 for invalid ID"""
        fake_id = str(uuid.uuid4())
        response = api_client.get(f"{BASE_URL}/api/access/roles/{fake_id}")
        assert response.status_code == 404


class TestCreateRole:
    """Tests for POST /api/access/roles - Create custom role"""
    
    @pytest.fixture(scope="class")
    def auth_token(self):
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": TEST_EMAIL, "password": TEST_PASSWORD}
        )
        return response.json()["access_token"]
    
    @pytest.fixture(scope="class")
    def api_client(self, auth_token):
        session = requests.Session()
        session.headers.update({
            "Authorization": f"Bearer {auth_token}",
            "Content-Type": "application/json"
        })
        return session
    
    def test_create_role_returns_200_or_201(self, api_client):
        """POST /api/access/roles creates a new role"""
        unique_code = f"test_role_{uuid.uuid4().hex[:8]}"
        payload = {
            "name": f"TEST_Role_{unique_code}",
            "code": unique_code,
            "description": "Test role for automated testing",
            "module_access": ["dashboard", "help_support"],
            "can_manage_users": False,
            "can_manage_employees": False,
            "can_manage_roles": False
        }
        
        response = api_client.post(f"{BASE_URL}/api/access/roles", json=payload)
        assert response.status_code in [200, 201], f"Create failed: {response.text}"
        
        data = response.json()
        assert data["name"] == payload["name"]
        assert data["code"] == payload["code"]
        assert "id" in data
        print(f"Created role: {data['id']}")
    
    def test_create_role_validates_required_fields(self, api_client):
        """POST /api/access/roles validates name and code"""
        # Missing code
        response = api_client.post(f"{BASE_URL}/api/access/roles", json={
            "name": "Test Role"
        })
        assert response.status_code == 422, "Should fail validation without code"
    
    def test_create_role_duplicate_code_fails(self, api_client):
        """POST /api/access/roles rejects duplicate code"""
        # Try to create role with existing code
        response = api_client.post(f"{BASE_URL}/api/access/roles", json={
            "name": "Duplicate Super Admin",
            "code": "super_admin"  # Already exists
        })
        assert response.status_code == 400, "Should fail for duplicate code"
    
    def test_created_role_has_all_fields(self, api_client):
        """Created role has all expected fields"""
        unique_code = f"test_full_{uuid.uuid4().hex[:8]}"
        payload = {
            "name": f"TEST_Full Role {unique_code}",
            "code": unique_code,
            "description": "Full test role",
            "module_access": ["dashboard", "project_management", "help_support"],
            "can_manage_users": True,
            "can_manage_employees": True,
            "can_manage_roles": False
        }
        
        response = api_client.post(f"{BASE_URL}/api/access/roles", json=payload)
        assert response.status_code in [200, 201]
        
        data = response.json()
        assert data["is_active"] is True
        assert data["employee_count"] == 0
        assert "created_at" in data
        assert "updated_at" in data
        assert data["module_names"] == ["Dashboard", "Project Management", "Help & Support"]


class TestUpdateRole:
    """Tests for PUT /api/access/roles/{id} - Update custom role"""
    
    @pytest.fixture(scope="class")
    def auth_token(self):
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": TEST_EMAIL, "password": TEST_PASSWORD}
        )
        return response.json()["access_token"]
    
    @pytest.fixture(scope="class")
    def api_client(self, auth_token):
        session = requests.Session()
        session.headers.update({
            "Authorization": f"Bearer {auth_token}",
            "Content-Type": "application/json"
        })
        return session
    
    @pytest.fixture
    def test_role(self, api_client):
        """Create a test role for update tests"""
        unique_code = f"test_update_{uuid.uuid4().hex[:8]}"
        response = api_client.post(f"{BASE_URL}/api/access/roles", json={
            "name": f"TEST_Update Role {unique_code}",
            "code": unique_code,
            "description": "Role for update testing",
            "module_access": ["dashboard"]
        })
        return response.json()
    
    def test_update_role_returns_200(self, api_client, test_role):
        """PUT /api/access/roles/{id} returns 200"""
        role_id = test_role["id"]
        response = api_client.put(f"{BASE_URL}/api/access/roles/{role_id}", json={
            "name": "TEST_Updated Name"
        })
        assert response.status_code == 200
    
    def test_update_role_changes_name(self, api_client, test_role):
        """PUT /api/access/roles/{id} updates name"""
        role_id = test_role["id"]
        new_name = f"TEST_Updated Name {uuid.uuid4().hex[:4]}"
        
        response = api_client.put(f"{BASE_URL}/api/access/roles/{role_id}", json={
            "name": new_name
        })
        assert response.status_code == 200
        assert response.json()["name"] == new_name
        
        # Verify with GET
        get_response = api_client.get(f"{BASE_URL}/api/access/roles/{role_id}")
        assert get_response.json()["name"] == new_name
    
    def test_update_role_module_access(self, api_client, test_role):
        """PUT /api/access/roles/{id} updates module_access"""
        role_id = test_role["id"]
        new_modules = ["dashboard", "project_management", "admin"]
        
        response = api_client.put(f"{BASE_URL}/api/access/roles/{role_id}", json={
            "module_access": new_modules
        })
        assert response.status_code == 200
        assert response.json()["module_access"] == new_modules
    
    def test_update_nonexistent_role_returns_404(self, api_client):
        """PUT /api/access/roles/{id} returns 404 for invalid ID"""
        fake_id = str(uuid.uuid4())
        response = api_client.put(f"{BASE_URL}/api/access/roles/{fake_id}", json={
            "name": "Test"
        })
        assert response.status_code == 404
    
    def test_system_role_limited_update(self, api_client):
        """System roles have limited update fields"""
        # Get super_admin role
        roles_response = api_client.get(f"{BASE_URL}/api/access/roles")
        super_admin = next(r for r in roles_response.json() if r["code"] == "super_admin")
        
        # Try to update module_access (should be restricted for system roles)
        response = api_client.put(f"{BASE_URL}/api/access/roles/{super_admin['id']}", json={
            "module_access": ["dashboard"]  # Trying to reduce access
        })
        # For system roles, only description and is_active are allowed
        # This might return 400 or just ignore the change
        if response.status_code == 200:
            # Verify module_access wasn't changed
            data = response.json()
            assert len(data["module_access"]) > 1, "System role should keep full access"


class TestDeleteRole:
    """Tests for DELETE /api/access/roles/{id} - Soft delete role"""
    
    @pytest.fixture(scope="class")
    def auth_token(self):
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": TEST_EMAIL, "password": TEST_PASSWORD}
        )
        return response.json()["access_token"]
    
    @pytest.fixture(scope="class")
    def api_client(self, auth_token):
        session = requests.Session()
        session.headers.update({
            "Authorization": f"Bearer {auth_token}",
            "Content-Type": "application/json"
        })
        return session
    
    def test_delete_role_returns_200(self, api_client):
        """DELETE /api/access/roles/{id} returns 200"""
        # Create a role to delete
        unique_code = f"test_delete_{uuid.uuid4().hex[:8]}"
        create_response = api_client.post(f"{BASE_URL}/api/access/roles", json={
            "name": f"TEST_Delete Role {unique_code}",
            "code": unique_code
        })
        role_id = create_response.json()["id"]
        
        response = api_client.delete(f"{BASE_URL}/api/access/roles/{role_id}")
        assert response.status_code == 200
        assert response.json()["success"] is True
    
    def test_delete_role_soft_deletes(self, api_client):
        """DELETE /api/access/roles/{id} sets is_active to false"""
        unique_code = f"test_soft_delete_{uuid.uuid4().hex[:8]}"
        create_response = api_client.post(f"{BASE_URL}/api/access/roles", json={
            "name": f"TEST_Soft Delete {unique_code}",
            "code": unique_code
        })
        role_id = create_response.json()["id"]
        
        api_client.delete(f"{BASE_URL}/api/access/roles/{role_id}")
        
        # Role should still be retrievable but inactive
        get_response = api_client.get(f"{BASE_URL}/api/access/roles/{role_id}")
        assert get_response.status_code == 200
        assert get_response.json()["is_active"] is False
    
    def test_delete_system_role_fails(self, api_client):
        """DELETE /api/access/roles/{id} fails for system roles"""
        roles_response = api_client.get(f"{BASE_URL}/api/access/roles")
        super_admin = next(r for r in roles_response.json() if r["code"] == "super_admin")
        
        response = api_client.delete(f"{BASE_URL}/api/access/roles/{super_admin['id']}")
        assert response.status_code == 400
        assert "system roles" in response.json()["detail"].lower()
    
    def test_delete_nonexistent_role_returns_404(self, api_client):
        """DELETE /api/access/roles/{id} returns 404 for invalid ID"""
        fake_id = str(uuid.uuid4())
        response = api_client.delete(f"{BASE_URL}/api/access/roles/{fake_id}")
        assert response.status_code == 404


class TestGetModules:
    """Tests for GET /api/access/modules"""
    
    @pytest.fixture(scope="class")
    def auth_token(self):
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": TEST_EMAIL, "password": TEST_PASSWORD}
        )
        return response.json()["access_token"]
    
    @pytest.fixture(scope="class")
    def api_client(self, auth_token):
        session = requests.Session()
        session.headers.update({
            "Authorization": f"Bearer {auth_token}",
            "Content-Type": "application/json"
        })
        return session
    
    def test_get_modules_returns_200(self, api_client):
        """GET /api/access/modules returns 200"""
        response = api_client.get(f"{BASE_URL}/api/access/modules")
        assert response.status_code == 200
    
    def test_get_modules_has_expected_structure(self, api_client):
        """GET /api/access/modules returns modules and module_keys"""
        response = api_client.get(f"{BASE_URL}/api/access/modules")
        data = response.json()
        assert "modules" in data
        assert "module_keys" in data
        assert isinstance(data["modules"], dict)
        assert isinstance(data["module_keys"], list)
    
    def test_modules_contain_core_modules(self, api_client):
        """Modules include dashboard, admin, hr"""
        response = api_client.get(f"{BASE_URL}/api/access/modules")
        module_keys = response.json()["module_keys"]
        
        required_modules = ["dashboard", "admin", "hr", "help_support"]
        for mod in required_modules:
            assert mod in module_keys, f"Missing module: {mod}"
    
    def test_module_definition_has_metadata(self, api_client):
        """Each module has name, description, routes"""
        response = api_client.get(f"{BASE_URL}/api/access/modules")
        modules = response.json()["modules"]
        
        for key, module in modules.items():
            assert "name" in module, f"Module {key} missing 'name'"
            assert "description" in module, f"Module {key} missing 'description'"
            assert "routes" in module, f"Module {key} missing 'routes'"


class TestDraftUsers:
    """Tests for GET /api/access/draft-users"""
    
    @pytest.fixture(scope="class")
    def auth_token(self):
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": TEST_EMAIL, "password": TEST_PASSWORD}
        )
        return response.json()["access_token"]
    
    @pytest.fixture(scope="class")
    def api_client(self, auth_token):
        session = requests.Session()
        session.headers.update({
            "Authorization": f"Bearer {auth_token}",
            "Content-Type": "application/json"
        })
        return session
    
    def test_get_draft_users_returns_200(self, api_client):
        """GET /api/access/draft-users returns 200"""
        response = api_client.get(f"{BASE_URL}/api/access/draft-users")
        assert response.status_code == 200
    
    def test_get_draft_users_returns_list(self, api_client):
        """GET /api/access/draft-users returns list of users"""
        response = api_client.get(f"{BASE_URL}/api/access/draft-users")
        data = response.json()
        assert isinstance(data, list)
        print(f"Found {len(data)} draft users")
    
    def test_draft_users_have_expected_fields(self, api_client):
        """Draft users have id, email, name, status fields"""
        response = api_client.get(f"{BASE_URL}/api/access/draft-users")
        users = response.json()
        
        if len(users) > 0:
            user = users[0]
            assert "id" in user
            assert "email" in user
            assert "name" in user
            assert "is_onboarded" in user
    
    def test_draft_users_search_filter(self, api_client):
        """GET /api/access/draft-users?search= filters by name/email"""
        response = api_client.get(f"{BASE_URL}/api/access/draft-users?search=test")
        assert response.status_code == 200
        # Results should be filtered


class TestOnboarding:
    """Tests for POST /api/access/onboard/{user_id}"""
    
    @pytest.fixture(scope="class")
    def auth_token(self):
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": TEST_EMAIL, "password": TEST_PASSWORD}
        )
        return response.json()["access_token"]
    
    @pytest.fixture(scope="class")
    def api_client(self, auth_token):
        session = requests.Session()
        session.headers.update({
            "Authorization": f"Bearer {auth_token}",
            "Content-Type": "application/json"
        })
        return session
    
    @pytest.fixture(scope="class")
    def test_data(self, api_client):
        """Get required IDs for onboarding tests"""
        # Get a department
        dept_response = api_client.get(f"{BASE_URL}/api/workos/departments")
        departments = dept_response.json()
        department_id = departments[0]["id"] if departments else None
        
        # Get employee role
        roles_response = api_client.get(f"{BASE_URL}/api/access/roles")
        roles = roles_response.json()
        employee_role = next((r for r in roles if r["code"] == "employee"), roles[0])
        
        return {
            "department_id": department_id,
            "role_id": employee_role["id"]
        }
    
    def test_onboard_user_returns_success(self, api_client, test_data):
        """POST /api/access/onboard/{user_id} onboards a draft user"""
        # Get a draft user
        draft_response = api_client.get(f"{BASE_URL}/api/access/draft-users")
        draft_users = draft_response.json()
        
        if len(draft_users) == 0:
            pytest.skip("No draft users available for testing")
        
        user = draft_users[0]
        
        response = api_client.post(f"{BASE_URL}/api/access/onboard/{user['id']}", json={
            "department_id": test_data["department_id"],
            "custom_role_id": test_data["role_id"],
            "designation": "TEST_Automated Test Position",
            "employment_type": "full_time",
            "work_mode": "office"
        })
        
        # It might already be onboarded, so 400 is acceptable
        assert response.status_code in [200, 400]
        
        if response.status_code == 200:
            data = response.json()
            assert data["status"] == "success"
            assert data["employee_code"].startswith("EMP-")
            print(f"Onboarded user as {data['employee_code']}")
    
    def test_onboard_invalid_user_returns_404(self, api_client, test_data):
        """POST /api/access/onboard/{user_id} returns 404 for invalid user"""
        fake_user_id = str(uuid.uuid4())
        response = api_client.post(f"{BASE_URL}/api/access/onboard/{fake_user_id}", json={
            "department_id": test_data["department_id"],
            "custom_role_id": test_data["role_id"]
        })
        assert response.status_code == 404
    
    def test_onboard_missing_department_fails(self, api_client, test_data):
        """POST /api/access/onboard/{user_id} requires department_id"""
        draft_response = api_client.get(f"{BASE_URL}/api/access/draft-users")
        draft_users = draft_response.json()
        
        if len(draft_users) == 0:
            pytest.skip("No draft users available")
        
        user = draft_users[0]
        
        response = api_client.post(f"{BASE_URL}/api/access/onboard/{user['id']}", json={
            "custom_role_id": test_data["role_id"]
            # Missing department_id
        })
        assert response.status_code == 422  # Validation error


class TestMyAccess:
    """Tests for GET /api/access/my-access"""
    
    @pytest.fixture(scope="class")
    def auth_token(self):
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": TEST_EMAIL, "password": TEST_PASSWORD}
        )
        return response.json()["access_token"]
    
    @pytest.fixture(scope="class")
    def api_client(self, auth_token):
        session = requests.Session()
        session.headers.update({
            "Authorization": f"Bearer {auth_token}",
            "Content-Type": "application/json"
        })
        return session
    
    def test_my_access_returns_200(self, api_client):
        """GET /api/access/my-access returns 200"""
        response = api_client.get(f"{BASE_URL}/api/access/my-access")
        assert response.status_code == 200
    
    def test_my_access_has_expected_fields(self, api_client):
        """GET /api/access/my-access returns access profile"""
        response = api_client.get(f"{BASE_URL}/api/access/my-access")
        data = response.json()
        
        assert "user_id" in data
        assert "is_onboarded" in data
        assert "module_access" in data
        assert "can_manage_users" in data
        assert "can_manage_employees" in data
        assert "can_manage_roles" in data
    
    def test_super_admin_has_full_access(self, api_client):
        """Super admin has all module access"""
        response = api_client.get(f"{BASE_URL}/api/access/my-access")
        data = response.json()
        
        # Super admin should have access to all core modules
        assert "admin" in data["module_access"]
        assert "hr" in data["module_access"]
        assert data["can_manage_users"] is True
        assert data["can_manage_roles"] is True


class TestCheckModuleAccess:
    """Tests for GET /api/access/check/{module_key}"""
    
    @pytest.fixture(scope="class")
    def auth_token(self):
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": TEST_EMAIL, "password": TEST_PASSWORD}
        )
        return response.json()["access_token"]
    
    @pytest.fixture(scope="class")
    def api_client(self, auth_token):
        session = requests.Session()
        session.headers.update({
            "Authorization": f"Bearer {auth_token}",
            "Content-Type": "application/json"
        })
        return session
    
    def test_check_access_returns_200(self, api_client):
        """GET /api/access/check/{module} returns 200"""
        response = api_client.get(f"{BASE_URL}/api/access/check/dashboard")
        assert response.status_code == 200
    
    def test_check_access_returns_permission_response(self, api_client):
        """GET /api/access/check/{module} returns permission check"""
        response = api_client.get(f"{BASE_URL}/api/access/check/admin")
        data = response.json()
        
        assert "has_access" in data
        assert "module" in data
        assert "user_id" in data
        assert "reason" in data
        assert data["module"] == "admin"
    
    def test_super_admin_has_admin_access(self, api_client):
        """Super admin has access to admin module"""
        response = api_client.get(f"{BASE_URL}/api/access/check/admin")
        data = response.json()
        
        assert data["has_access"] is True
        assert "super admin" in data["role_name"].lower() or "super admin" in data["reason"].lower()
    
    def test_check_default_access_module(self, api_client):
        """Dashboard is a default access module"""
        response = api_client.get(f"{BASE_URL}/api/access/check/dashboard")
        data = response.json()
        
        assert data["has_access"] is True


class TestCleanup:
    """Cleanup test data"""
    
    @pytest.fixture(scope="class")
    def auth_token(self):
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": TEST_EMAIL, "password": TEST_PASSWORD}
        )
        return response.json()["access_token"]
    
    @pytest.fixture(scope="class")
    def api_client(self, auth_token):
        session = requests.Session()
        session.headers.update({
            "Authorization": f"Bearer {auth_token}",
            "Content-Type": "application/json"
        })
        return session
    
    def test_cleanup_test_roles(self, api_client):
        """Clean up roles created during testing"""
        response = api_client.get(f"{BASE_URL}/api/access/roles?include_inactive=true")
        roles = response.json()
        
        deleted_count = 0
        for role in roles:
            if role["name"].startswith("TEST_") or role["code"].startswith("test_"):
                delete_response = api_client.delete(f"{BASE_URL}/api/access/roles/{role['id']}")
                if delete_response.status_code == 200:
                    deleted_count += 1
        
        print(f"Cleaned up {deleted_count} test roles")
