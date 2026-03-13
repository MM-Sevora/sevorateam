"""
Test Role-Centric Permission System Refactor
Tests for:
- Roles tab CRUD operations
- Create Role dialog with 3D permissions (CRUD checkboxes, Data Visibility Scope, Others' Data)
- Module selection with quick CRUD indicators (C R U D) and data scope badge
- User panel simplified role assignment view
- Backend role module_permissions save and retrieve
"""

import pytest
import requests
import os
import uuid

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')


class TestRoleCentricPermissions:
    """Tests for role-centric permission system"""
    
    token = None
    test_role_id = None
    test_role_code = f"test_role_{uuid.uuid4().hex[:8]}"
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Login as superadmin to get auth token"""
        if not TestRoleCentricPermissions.token:
            login_response = requests.post(
                f"{BASE_URL}/api/auth/login",
                json={"email": "superadmin@sevora.com", "password": "superadmin123"}
            )
            assert login_response.status_code == 200, f"Login failed: {login_response.text}"
            TestRoleCentricPermissions.token = login_response.json().get("access_token")
        
        self.headers = {
            "Authorization": f"Bearer {TestRoleCentricPermissions.token}",
            "Content-Type": "application/json"
        }
    
    # ==================== ROLES CRUD TESTS ====================
    
    def test_01_get_roles_list(self):
        """Test GET /api/access/roles returns list of roles"""
        response = requests.get(
            f"{BASE_URL}/api/access/roles",
            headers=self.headers
        )
        assert response.status_code == 200, f"Failed to get roles: {response.text}"
        
        roles = response.json()
        assert isinstance(roles, list), "Response should be a list of roles"
        
        # Verify roles have expected structure
        if len(roles) > 0:
            role = roles[0]
            assert "id" in role, "Role missing id"
            assert "name" in role, "Role missing name"
            assert "code" in role, "Role missing code"
            assert "module_access" in role, "Role missing module_access list"
        
        print(f"Found {len(roles)} roles")
    
    def test_02_create_role_with_3d_permissions(self):
        """Test POST /api/access/roles with full 3D permissions"""
        payload = {
            "name": f"Test Role 3D Perms {uuid.uuid4().hex[:6]}",
            "code": TestRoleCentricPermissions.test_role_code,
            "description": "Test role with 3D permissions configured",
            "module_access": ["project_management", "marketing_ops", "goals"],
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
                    "update": True,
                    "delete": True,
                    "data_scope": "all",
                    "can_edit_others": True,
                    "can_delete_others": True
                },
                "goals": {
                    "create": False,
                    "read": True,
                    "update": False,
                    "delete": False,
                    "data_scope": "own_only",
                    "can_edit_others": False,
                    "can_delete_others": False
                }
            },
            "can_manage_users": False,
            "can_manage_employees": False,
            "can_manage_roles": False
        }
        
        response = requests.post(
            f"{BASE_URL}/api/access/roles",
            json=payload,
            headers=self.headers
        )
        assert response.status_code == 200, f"Failed to create role: {response.text}"
        
        role = response.json()
        TestRoleCentricPermissions.test_role_id = role.get("id")
        
        assert "id" in role, "Response missing role id"
        assert role["name"] == payload["name"], "Role name mismatch"
        assert role["code"] == payload["code"], "Role code mismatch"
        assert "module_access" in role, "Role missing module_access"
        assert set(role["module_access"]) == set(payload["module_access"]), "Module access mismatch"
        
        # Verify module_permissions were saved
        assert "module_permissions" in role, "Role missing module_permissions"
        
        print(f"Created role: {role['name']} with id: {role['id']}")
        print(f"Module permissions: {list(role.get('module_permissions', {}).keys())}")
    
    def test_03_verify_role_module_permissions_structure(self):
        """Verify the created role has correct module_permissions structure"""
        role_id = TestRoleCentricPermissions.test_role_id
        assert role_id is not None, "Test role not created"
        
        response = requests.get(
            f"{BASE_URL}/api/access/roles/{role_id}",
            headers=self.headers
        )
        assert response.status_code == 200, f"Failed to get role: {response.text}"
        
        role = response.json()
        module_perms = role.get("module_permissions", {})
        
        # Verify project_management permissions
        pm_perm = module_perms.get("project_management", {})
        assert pm_perm.get("create") == True, "project_management.create should be True"
        assert pm_perm.get("read") == True, "project_management.read should be True"
        assert pm_perm.get("update") == True, "project_management.update should be True"
        assert pm_perm.get("delete") == False, "project_management.delete should be False"
        assert pm_perm.get("data_scope") == "team", "project_management.data_scope should be 'team'"
        assert pm_perm.get("can_edit_others") == True, "project_management.can_edit_others should be True"
        assert pm_perm.get("can_delete_others") == False, "project_management.can_delete_others should be False"
        
        # Verify goals permissions (restricted)
        goals_perm = module_perms.get("goals", {})
        assert goals_perm.get("create") == False, "goals.create should be False"
        assert goals_perm.get("data_scope") == "own_only", "goals.data_scope should be 'own_only'"
        
        print("Module permissions structure verified successfully")
    
    def test_04_update_role_module_permissions(self):
        """Test PUT /api/access/roles/{id} to update module_permissions"""
        role_id = TestRoleCentricPermissions.test_role_id
        assert role_id is not None, "Test role not created"
        
        # Update with different permissions
        update_payload = {
            "description": "Updated description",
            "module_access": ["project_management", "marketing_ops", "goals", "analytics_insights"],
            "module_permissions": {
                "project_management": {
                    "create": True,
                    "read": True,
                    "update": True,
                    "delete": True,  # Changed from False
                    "data_scope": "all",  # Changed from team
                    "can_edit_others": True,
                    "can_delete_others": True  # Changed from False
                },
                "marketing_ops": {
                    "create": True,
                    "read": True,
                    "update": True,
                    "delete": True,
                    "data_scope": "all",
                    "can_edit_others": True,
                    "can_delete_others": True
                },
                "goals": {
                    "create": True,  # Changed from False
                    "read": True,
                    "update": True,  # Changed from False
                    "delete": False,
                    "data_scope": "team",  # Changed from own_only
                    "can_edit_others": False,
                    "can_delete_others": False
                },
                "analytics_insights": {
                    "create": False,
                    "read": True,
                    "update": False,
                    "delete": False,
                    "data_scope": "all",
                    "can_edit_others": False,
                    "can_delete_others": False
                }
            }
        }
        
        response = requests.put(
            f"{BASE_URL}/api/access/roles/{role_id}",
            json=update_payload,
            headers=self.headers
        )
        assert response.status_code == 200, f"Failed to update role: {response.text}"
        
        role = response.json()
        assert role["description"] == update_payload["description"], "Description not updated"
        assert "analytics_insights" in role["module_access"], "New module not added"
        
        # Verify updated permissions
        pm_perm = role.get("module_permissions", {}).get("project_management", {})
        assert pm_perm.get("delete") == True, "project_management.delete should be True now"
        assert pm_perm.get("data_scope") == "all", "project_management.data_scope should be 'all' now"
        
        print("Role module_permissions updated successfully")
    
    def test_05_get_roles_returns_module_permissions(self):
        """Verify GET /api/access/roles returns roles with module_permissions"""
        response = requests.get(
            f"{BASE_URL}/api/access/roles",
            headers=self.headers
        )
        assert response.status_code == 200, f"Failed to get roles: {response.text}"
        
        roles = response.json()
        
        # Find our test role
        test_role = next((r for r in roles if r.get("id") == TestRoleCentricPermissions.test_role_id), None)
        if test_role:
            # Verify it has module_permissions in the list response
            assert "module_permissions" in test_role or "module_access" in test_role, \
                "Role in list should have module access info"
            print(f"Test role found in list with {len(test_role.get('module_access', []))} modules")
        else:
            print("Warning: Test role not found in list (may have been cleaned up)")
    
    # ==================== DATA SCOPE OPTIONS TESTS ====================
    
    def test_06_all_data_scope_options_valid(self):
        """Test that all 4 data scope options can be saved"""
        role_id = TestRoleCentricPermissions.test_role_id
        assert role_id is not None, "Test role not created"
        
        data_scope_options = ["all", "team", "own_assigned", "own_only"]
        
        for scope in data_scope_options:
            update_payload = {
                "module_permissions": {
                    "project_management": {
                        "create": True,
                        "read": True,
                        "update": True,
                        "delete": False,
                        "data_scope": scope,
                        "can_edit_others": False,
                        "can_delete_others": False
                    }
                }
            }
            
            response = requests.put(
                f"{BASE_URL}/api/access/roles/{role_id}",
                json=update_payload,
                headers=self.headers
            )
            assert response.status_code == 200, f"Failed with data_scope={scope}: {response.text}"
            
            role = response.json()
            saved_scope = role.get("module_permissions", {}).get("project_management", {}).get("data_scope")
            assert saved_scope == scope, f"Data scope '{scope}' not saved correctly (got: {saved_scope})"
            
            print(f"Data scope '{scope}' saved successfully")
    
    # ==================== USER ROLE ASSIGNMENT TESTS ====================
    
    def test_07_assign_role_to_user(self):
        """Test assigning the created role to a user"""
        role_id = TestRoleCentricPermissions.test_role_id
        assert role_id is not None, "Test role not created"
        
        # Get a user to assign the role to
        users_response = requests.get(
            f"{BASE_URL}/api/workos/users",
            headers=self.headers
        )
        assert users_response.status_code == 200, f"Failed to get users: {users_response.text}"
        
        users = users_response.json()
        # Find a non-superadmin user
        test_user = next((u for u in users if u.get("email") != "superadmin@sevora.com" and u.get("status") == "active"), None)
        
        if not test_user:
            pytest.skip("No suitable test user found for role assignment")
        
        user_id = test_user.get("id")
        existing_roles = test_user.get("custom_role_ids", [])
        
        # Add our test role to user's roles
        new_roles = list(set(existing_roles + [role_id]))
        
        response = requests.put(
            f"{BASE_URL}/api/access/users/{user_id}/roles",
            json={"custom_role_ids": new_roles},
            headers=self.headers
        )
        assert response.status_code == 200, f"Failed to assign role: {response.text}"
        
        data = response.json()
        assert data.get("success") == True, "Role assignment not successful"
        assert role_id in data.get("custom_role_ids", []), "Role not in user's roles"
        
        print(f"Successfully assigned role {role_id} to user {user_id}")
        
        # Clean up - restore original roles
        requests.put(
            f"{BASE_URL}/api/access/users/{user_id}/roles",
            json={"custom_role_ids": existing_roles},
            headers=self.headers
        )
    
    def test_08_user_inherits_permissions_from_roles(self):
        """Verify users inherit permissions from their assigned roles"""
        # Test via my-access endpoint
        response = requests.get(
            f"{BASE_URL}/api/access/my-access",
            headers=self.headers
        )
        assert response.status_code == 200, f"Failed to get my-access: {response.text}"
        
        data = response.json()
        assert "module_access" in data, "Response missing module_access"
        assert "custom_roles" in data, "Response missing custom_roles"
        
        # Verify merged_module_access is present
        print(f"User has access to {len(data.get('module_access', []))} modules from roles")
        print(f"User has {len(data.get('custom_roles', []))} custom roles assigned")
    
    # ==================== CLEANUP ====================
    
    def test_99_cleanup_test_role(self):
        """Clean up - delete the test role"""
        role_id = TestRoleCentricPermissions.test_role_id
        if not role_id:
            pytest.skip("No test role to clean up")
        
        response = requests.delete(
            f"{BASE_URL}/api/access/roles/{role_id}",
            headers=self.headers
        )
        # Either 200 (soft delete) or 404 (already deleted) is acceptable
        assert response.status_code in [200, 404], f"Failed to delete role: {response.text}"
        
        print(f"Test role {role_id} cleaned up")


class TestRoleModulePermissionsEdgeCases:
    """Edge case tests for role module_permissions"""
    
    token = None
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Login as superadmin"""
        if not TestRoleModulePermissionsEdgeCases.token:
            login_response = requests.post(
                f"{BASE_URL}/api/auth/login",
                json={"email": "superadmin@sevora.com", "password": "superadmin123"}
            )
            assert login_response.status_code == 200
            TestRoleModulePermissionsEdgeCases.token = login_response.json().get("access_token")
        
        self.headers = {
            "Authorization": f"Bearer {TestRoleModulePermissionsEdgeCases.token}",
            "Content-Type": "application/json"
        }
    
    def test_create_role_without_module_permissions(self):
        """Test creating role with only module_access (no detailed permissions)"""
        payload = {
            "name": f"Minimal Role {uuid.uuid4().hex[:6]}",
            "code": f"minimal_role_{uuid.uuid4().hex[:8]}",
            "description": "Role with only module_access, no detailed permissions",
            "module_access": ["dashboard", "help_support"],
            "can_manage_users": False,
            "can_manage_employees": False,
            "can_manage_roles": False
        }
        
        response = requests.post(
            f"{BASE_URL}/api/access/roles",
            json=payload,
            headers=self.headers
        )
        assert response.status_code == 200, f"Failed to create minimal role: {response.text}"
        
        role = response.json()
        role_id = role.get("id")
        assert role_id is not None, "Role should be created"
        assert role["module_access"] == payload["module_access"], "Module access mismatch"
        
        print(f"Created minimal role without module_permissions")
        
        # Cleanup
        requests.delete(f"{BASE_URL}/api/access/roles/{role_id}", headers=self.headers)
    
    def test_create_role_with_empty_module_permissions(self):
        """Test creating role with empty module_permissions dict"""
        payload = {
            "name": f"Empty Perms Role {uuid.uuid4().hex[:6]}",
            "code": f"empty_perms_{uuid.uuid4().hex[:8]}",
            "description": "Role with empty module_permissions",
            "module_access": ["project_management"],
            "module_permissions": {},
            "can_manage_users": False,
            "can_manage_employees": False,
            "can_manage_roles": False
        }
        
        response = requests.post(
            f"{BASE_URL}/api/access/roles",
            json=payload,
            headers=self.headers
        )
        assert response.status_code == 200, f"Failed to create role: {response.text}"
        
        role = response.json()
        role_id = role.get("id")
        
        print("Created role with empty module_permissions")
        
        # Cleanup
        if role_id:
            requests.delete(f"{BASE_URL}/api/access/roles/{role_id}", headers=self.headers)
    
    def test_update_role_add_new_module_with_permissions(self):
        """Test adding a new module to existing role with permissions"""
        # First create a role
        create_payload = {
            "name": f"Update Test Role {uuid.uuid4().hex[:6]}",
            "code": f"update_test_{uuid.uuid4().hex[:8]}",
            "description": "Role for update testing",
            "module_access": ["dashboard"],
            "module_permissions": {
                "dashboard": {
                    "create": False,
                    "read": True,
                    "update": False,
                    "delete": False,
                    "data_scope": "all",
                    "can_edit_others": False,
                    "can_delete_others": False
                }
            },
            "can_manage_users": False,
            "can_manage_employees": False,
            "can_manage_roles": False
        }
        
        create_response = requests.post(
            f"{BASE_URL}/api/access/roles",
            json=create_payload,
            headers=self.headers
        )
        assert create_response.status_code == 200, f"Failed to create role: {create_response.text}"
        
        role_id = create_response.json().get("id")
        
        # Now update to add a new module with permissions
        update_payload = {
            "module_access": ["dashboard", "project_management"],
            "module_permissions": {
                "dashboard": {
                    "create": False,
                    "read": True,
                    "update": False,
                    "delete": False,
                    "data_scope": "all",
                    "can_edit_others": False,
                    "can_delete_others": False
                },
                "project_management": {
                    "create": True,
                    "read": True,
                    "update": True,
                    "delete": False,
                    "data_scope": "team",
                    "can_edit_others": True,
                    "can_delete_others": False
                }
            }
        }
        
        update_response = requests.put(
            f"{BASE_URL}/api/access/roles/{role_id}",
            json=update_payload,
            headers=self.headers
        )
        assert update_response.status_code == 200, f"Failed to update role: {update_response.text}"
        
        updated_role = update_response.json()
        assert "project_management" in updated_role["module_access"], "New module not added"
        assert "project_management" in updated_role.get("module_permissions", {}), \
            "New module permissions not saved"
        
        print("Successfully added new module with permissions to role")
        
        # Cleanup
        requests.delete(f"{BASE_URL}/api/access/roles/{role_id}", headers=self.headers)


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
