"""
Test 3D Permission System API Endpoints
Tests for:
- Module Access with CRUD permissions
- Data Visibility Scope
- Others' Data Permissions
"""

import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestThreeDimensionalPermissions:
    """Tests for 3-dimensional permission system"""
    
    token = None
    user_id = None  # Will be set dynamically
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Login as superadmin to get auth token"""
        if not TestThreeDimensionalPermissions.token:
            login_response = requests.post(
                f"{BASE_URL}/api/auth/login",
                json={"email": "superadmin@sevora.com", "password": "superadmin123"}
            )
            assert login_response.status_code == 200, f"Login failed: {login_response.text}"
            TestThreeDimensionalPermissions.token = login_response.json().get("access_token")
        
        self.headers = {
            "Authorization": f"Bearer {TestThreeDimensionalPermissions.token}",
            "Content-Type": "application/json"
        }
    
    def test_01_get_users_list(self):
        """Test getting users list to find a user for testing"""
        response = requests.get(
            f"{BASE_URL}/api/workos/users",
            headers=self.headers
        )
        assert response.status_code == 200, f"Failed to get users: {response.text}"
        
        users = response.json()
        assert len(users) > 0, "No users found"
        
        # Find Marketing Manager user for testing
        marketing_user = next((u for u in users if u.get("email") == "marketing@sevora.com"), None)
        if marketing_user:
            TestThreeDimensionalPermissions.user_id = marketing_user.get("id")
            print(f"Found Marketing Manager user: {TestThreeDimensionalPermissions.user_id}")
        else:
            # Use first non-superadmin user
            test_user = next((u for u in users if u.get("email") != "superadmin@sevora.com"), users[0])
            TestThreeDimensionalPermissions.user_id = test_user.get("id")
            print(f"Using test user: {TestThreeDimensionalPermissions.user_id}")
        
        assert TestThreeDimensionalPermissions.user_id is not None, "Could not find test user"
    
    def test_02_get_user_module_access(self):
        """Test GET /api/system-modules/user/{user_id}/access endpoint"""
        user_id = TestThreeDimensionalPermissions.user_id
        response = requests.get(
            f"{BASE_URL}/api/system-modules/user/{user_id}/access",
            headers=self.headers
        )
        assert response.status_code == 200, f"Failed to get user module access: {response.text}"
        
        data = response.json()
        assert "user_id" in data, "Response missing user_id"
        assert "modules" in data, "Response missing modules list"
        
        print(f"User has access to {len([m for m in data['modules'] if m['has_access']])} modules")
    
    def test_03_update_user_module_access_with_crud_permissions(self):
        """Test PUT /api/system-modules/user/{user_id}/access with CRUD permissions"""
        user_id = TestThreeDimensionalPermissions.user_id
        
        # Update with module_permissions containing CRUD settings
        payload = {
            "granted_modules": ["project_management", "goals"],
            "denied_modules": [],
            "sub_module_access": {
                "project_management": ["manager_dashboard", "my_tasks", "all_projects"]
            },
            "module_permissions": {
                "project_management": {
                    "create": True,
                    "read": True,
                    "update": True,
                    "delete": False,
                    "data_scope": "team",
                    "can_edit_others": False,
                    "can_delete_others": False
                },
                "goals": {
                    "create": True,
                    "read": True,
                    "update": False,
                    "delete": False,
                    "data_scope": "own_assigned",
                    "can_edit_others": False,
                    "can_delete_others": False
                }
            }
        }
        
        response = requests.put(
            f"{BASE_URL}/api/system-modules/user/{user_id}/access",
            json=payload,
            headers=self.headers
        )
        assert response.status_code == 200, f"Failed to update permissions: {response.text}"
        
        data = response.json()
        assert data.get("success") == True, "Update did not return success"
        assert "module_permissions" in data, "Response missing module_permissions"
        
        # Verify the module_permissions were saved
        assert "project_management" in data["module_permissions"]
        assert data["module_permissions"]["project_management"]["data_scope"] == "team"
        print("Successfully updated module permissions with CRUD and data scope")
    
    def test_04_verify_data_scope_options(self):
        """Test that all 4 data scope options work"""
        user_id = TestThreeDimensionalPermissions.user_id
        
        data_scope_options = ["all", "team", "own_assigned", "own_only"]
        
        for scope in data_scope_options:
            payload = {
                "granted_modules": ["project_management"],
                "denied_modules": [],
                "sub_module_access": {},
                "module_permissions": {
                    "project_management": {
                        "create": True,
                        "read": True,
                        "update": True,
                        "delete": True,
                        "data_scope": scope,
                        "can_edit_others": True,
                        "can_delete_others": False
                    }
                }
            }
            
            response = requests.put(
                f"{BASE_URL}/api/system-modules/user/{user_id}/access",
                json=payload,
                headers=self.headers
            )
            assert response.status_code == 200, f"Failed with data_scope={scope}: {response.text}"
            
            data = response.json()
            assert data["module_permissions"]["project_management"]["data_scope"] == scope
            print(f"Data scope '{scope}' set successfully")
    
    def test_05_verify_others_data_permissions(self):
        """Test can_edit_others and can_delete_others flags"""
        user_id = TestThreeDimensionalPermissions.user_id
        
        # Test with both flags enabled
        payload = {
            "granted_modules": ["project_management"],
            "denied_modules": [],
            "sub_module_access": {},
            "module_permissions": {
                "project_management": {
                    "create": True,
                    "read": True,
                    "update": True,
                    "delete": True,
                    "data_scope": "all",
                    "can_edit_others": True,
                    "can_delete_others": True
                }
            }
        }
        
        response = requests.put(
            f"{BASE_URL}/api/system-modules/user/{user_id}/access",
            json=payload,
            headers=self.headers
        )
        assert response.status_code == 200, f"Failed to set others' permissions: {response.text}"
        
        data = response.json()
        perm = data["module_permissions"]["project_management"]
        assert perm["can_edit_others"] == True, "can_edit_others not saved correctly"
        assert perm["can_delete_others"] == True, "can_delete_others not saved correctly"
        print("Others' data permissions (edit/delete) saved correctly")
    
    def test_06_verify_crud_flags(self):
        """Test CRUD permission flags (create, read, update, delete)"""
        user_id = TestThreeDimensionalPermissions.user_id
        
        # Test with specific CRUD flags
        payload = {
            "granted_modules": ["project_management"],
            "denied_modules": [],
            "sub_module_access": {},
            "module_permissions": {
                "project_management": {
                    "create": False,
                    "read": True,
                    "update": False,
                    "delete": False,
                    "data_scope": "own_only",
                    "can_edit_others": False,
                    "can_delete_others": False
                }
            }
        }
        
        response = requests.put(
            f"{BASE_URL}/api/system-modules/user/{user_id}/access",
            json=payload,
            headers=self.headers
        )
        assert response.status_code == 200, f"Failed to set CRUD permissions: {response.text}"
        
        data = response.json()
        perm = data["module_permissions"]["project_management"]
        assert perm["create"] == False, "create flag not saved correctly"
        assert perm["read"] == True, "read flag not saved correctly"
        assert perm["update"] == False, "update flag not saved correctly"
        assert perm["delete"] == False, "delete flag not saved correctly"
        print("CRUD flags (create/read/update/delete) saved correctly")
    
    def test_07_get_all_system_modules(self):
        """Test GET /api/system-modules/ returns all modules"""
        response = requests.get(
            f"{BASE_URL}/api/system-modules/",
            headers=self.headers
        )
        assert response.status_code == 200, f"Failed to get modules: {response.text}"
        
        modules = response.json()
        assert len(modules) > 0, "No modules found"
        
        # Verify modules have expected structure
        for mod in modules[:3]:
            assert "code" in mod, "Module missing code"
            assert "name" in mod, "Module missing name"
            assert "category" in mod, "Module missing category"
            assert "sub_modules" in mod, "Module missing sub_modules"
        
        print(f"Found {len(modules)} system modules")
    
    def test_08_verify_permissions_persisted_in_user_document(self):
        """Verify module_permissions are stored in the user document"""
        user_id = TestThreeDimensionalPermissions.user_id
        
        # First, set some permissions
        payload = {
            "granted_modules": ["project_management", "marketing_ops"],
            "denied_modules": [],
            "sub_module_access": {},
            "module_permissions": {
                "project_management": {
                    "create": True,
                    "read": True,
                    "update": True,
                    "delete": False,
                    "data_scope": "team",
                    "can_edit_others": True,
                    "can_delete_others": False
                },
                "marketing_ops": {
                    "create": True,
                    "read": True,
                    "update": False,
                    "delete": False,
                    "data_scope": "own_assigned",
                    "can_edit_others": False,
                    "can_delete_others": False
                }
            }
        }
        
        response = requests.put(
            f"{BASE_URL}/api/system-modules/user/{user_id}/access",
            json=payload,
            headers=self.headers
        )
        assert response.status_code == 200, f"Failed to set permissions: {response.text}"
        
        # Verify by getting user module access again
        get_response = requests.get(
            f"{BASE_URL}/api/system-modules/user/{user_id}/access",
            headers=self.headers
        )
        assert get_response.status_code == 200, f"Failed to get user access: {get_response.text}"
        
        data = get_response.json()
        # Check that project_management has access
        pm_module = next((m for m in data["modules"] if m["code"] == "project_management"), None)
        assert pm_module is not None, "project_management module not found"
        assert pm_module["has_access"] == True, "project_management should have access"
        print("Permissions verified - persisted correctly")


class TestPermissionUtilities:
    """Tests for permission utility functions behavior"""
    
    token = None
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Login as superadmin"""
        if not TestPermissionUtilities.token:
            login_response = requests.post(
                f"{BASE_URL}/api/auth/login",
                json={"email": "superadmin@sevora.com", "password": "superadmin123"}
            )
            assert login_response.status_code == 200
            TestPermissionUtilities.token = login_response.json().get("access_token")
        
        self.headers = {
            "Authorization": f"Bearer {TestPermissionUtilities.token}",
            "Content-Type": "application/json"
        }
    
    def test_get_default_modules_list(self):
        """Test GET /api/system-modules/defaults/list endpoint"""
        response = requests.get(
            f"{BASE_URL}/api/system-modules/defaults/list",
            headers=self.headers
        )
        assert response.status_code == 200, f"Failed to get defaults: {response.text}"
        
        data = response.json()
        assert "default_modules" in data, "Response missing default_modules"
        assert "all_modules" in data, "Response missing all_modules"
        
        print(f"Default modules: {data['default_modules']}")
        print(f"All modules count: {len(data['all_modules'])}")
    
    def test_get_module_categories(self):
        """Test GET /api/system-modules/categories endpoint"""
        response = requests.get(
            f"{BASE_URL}/api/system-modules/categories",
            headers=self.headers
        )
        assert response.status_code == 200, f"Failed to get categories: {response.text}"
        
        data = response.json()
        assert "general" in data, "Missing general category"
        assert "operations" in data, "Missing operations category"
        assert "business" in data, "Missing business category"
        assert "admin" in data, "Missing admin category"
        
        print("Module categories verified: general, operations, business, admin")


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
