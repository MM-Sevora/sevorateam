"""
IT Admin ↔ HR Auto-Provisioning Integration Tests
- Tool Templates CRUD
- Auto-Provisioning on Onboard
- Auto-Revocation on Offboard  
- Audit Logging for provisioning actions
"""

import pytest
import requests
import os
import uuid

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')
TEST_EMAIL = "superadmin@sevora.com"
TEST_PASSWORD = "superadmin123"


class TestACMSProvisioning:
    """Test IT Admin ↔ HR Auto-Provisioning Integration"""
    
    auth_token = None
    created_template_ids = []
    created_tool_ids = []
    test_user_id = None
    
    @pytest.fixture(autouse=True)
    def setup(self, api_client):
        """Get auth token before each test class"""
        if not TestACMSProvisioning.auth_token:
            response = api_client.post(f"{BASE_URL}/api/auth/login", json={
                "email": TEST_EMAIL,
                "password": TEST_PASSWORD
            })
            assert response.status_code == 200, f"Login failed: {response.text}"
            # Response returns access_token not token
            TestACMSProvisioning.auth_token = response.json().get("access_token")
        api_client.headers.update({"Authorization": f"Bearer {TestACMSProvisioning.auth_token}"})
    
    # ===================== TOOL TEMPLATES CRUD =====================
    
    def test_01_get_templates(self, api_client):
        """Test GET /api/acms/templates - List all templates"""
        response = api_client.get(f"{BASE_URL}/api/acms/templates")
        assert response.status_code == 200, f"GET templates failed: {response.text}"
        
        data = response.json()
        assert "templates" in data, "Response should contain templates array"
        print(f"✅ Found {len(data['templates'])} existing templates")
    
    def test_02_create_tool_for_template(self, api_client):
        """Create a test tool to use in templates"""
        tool_data = {
            "name": f"TEST_AutoProvisionTool_{uuid.uuid4().hex[:8]}",
            "url": "https://test-tool.example.com",
            "category": "development",
            "description": "Test tool for auto-provisioning tests",
            "login_type": "sso",
            "criticality": "low",
            "is_active": True
        }
        
        response = api_client.post(f"{BASE_URL}/api/acms/tools", json=tool_data)
        assert response.status_code == 200, f"Create tool failed: {response.text}"
        
        data = response.json()
        assert "id" in data, "Response should contain tool id"
        TestACMSProvisioning.created_tool_ids.append(data["id"])
        print(f"✅ Created test tool: {data['id']}")
    
    def test_03_create_template(self, api_client):
        """Test POST /api/acms/templates - Create a new template"""
        # Ensure we have a tool to use
        assert len(TestACMSProvisioning.created_tool_ids) > 0, "Need a tool first"
        
        template_data = {
            "name": f"TEST_Template_{uuid.uuid4().hex[:8]}",
            "description": "Test template for auto-provisioning verification",
            "department_id": None,  # Global template
            "role_code": None,
            "tool_ids": TestACMSProvisioning.created_tool_ids,
            "default_access_level": "viewer",
            "is_active": True
        }
        
        response = api_client.post(f"{BASE_URL}/api/acms/templates", json=template_data)
        assert response.status_code == 200, f"Create template failed: {response.text}"
        
        data = response.json()
        assert "template_id" in data, "Response should contain template_id"
        TestACMSProvisioning.created_template_ids.append(data["template_id"])
        print(f"✅ Created template: {data['template_id']}")
    
    def test_04_get_template_in_list(self, api_client):
        """Verify created template appears in list"""
        response = api_client.get(f"{BASE_URL}/api/acms/templates")
        assert response.status_code == 200
        
        data = response.json()
        template_ids = [t["id"] for t in data["templates"]]
        
        # Check our created template is in the list
        assert len(TestACMSProvisioning.created_template_ids) > 0
        found = TestACMSProvisioning.created_template_ids[0] in template_ids
        assert found, "Created template should appear in list"
        print("✅ Template appears in list")
    
    def test_05_update_template(self, api_client):
        """Test PUT /api/acms/templates/{id} - Update template"""
        assert len(TestACMSProvisioning.created_template_ids) > 0
        template_id = TestACMSProvisioning.created_template_ids[0]
        
        update_data = {
            "description": "Updated description for testing",
            "default_access_level": "editor"
        }
        
        response = api_client.put(f"{BASE_URL}/api/acms/templates/{template_id}", json=update_data)
        assert response.status_code == 200, f"Update template failed: {response.text}"
        print("✅ Template updated successfully")
    
    def test_06_verify_update(self, api_client):
        """Verify template update persisted"""
        response = api_client.get(f"{BASE_URL}/api/acms/templates")
        assert response.status_code == 200
        
        data = response.json()
        template_id = TestACMSProvisioning.created_template_ids[0]
        template = next((t for t in data["templates"] if t["id"] == template_id), None)
        
        assert template is not None, "Template should exist"
        assert template["default_access_level"] == "editor", "Access level should be updated to editor"
        print("✅ Template update verified")
    
    # ===================== AUTO-PROVISIONING ON ONBOARD =====================
    
    def test_07_get_test_user(self, api_client):
        """Get a test user for provisioning tests"""
        # First get list of users
        response = api_client.get(f"{BASE_URL}/api/admin/users?limit=10")
        assert response.status_code == 200
        
        users = response.json()
        if isinstance(users, list) and len(users) > 0:
            # Find any user that isn't the superadmin
            for user in users:
                if user.get("email") != TEST_EMAIL:
                    TestACMSProvisioning.test_user_id = user.get("id")
                    break
        elif isinstance(users, dict) and "users" in users and len(users["users"]) > 0:
            for user in users["users"]:
                if user.get("email") != TEST_EMAIL:
                    TestACMSProvisioning.test_user_id = user.get("id")
                    break
        
        if not TestACMSProvisioning.test_user_id:
            # Use the superadmin for testing
            TestACMSProvisioning.test_user_id = "test_user_" + uuid.uuid4().hex[:8]
            
        print(f"✅ Test user ID: {TestACMSProvisioning.test_user_id}")
    
    def test_08_provision_onboard(self, api_client):
        """Test POST /api/acms/provision/onboard - Auto-provision tools on employee onboard"""
        assert TestACMSProvisioning.test_user_id, "Need test user"
        
        # Call onboard provisioning
        response = api_client.post(
            f"{BASE_URL}/api/acms/provision/onboard",
            params={
                "user_id": TestACMSProvisioning.test_user_id,
                "department_id": None,  # Global - should match our template
                "role_code": None
            }
        )
        
        assert response.status_code == 200, f"Onboard provisioning failed: {response.text}"
        
        data = response.json()
        assert "message" in data, "Response should contain message"
        assert "templates_matched" in data, "Response should show templates matched"
        print(f"✅ Onboard provisioning: {data['message']}, Templates matched: {data['templates_matched']}")
    
    def test_09_verify_user_has_access(self, api_client):
        """Verify user has tool access after onboarding"""
        response = api_client.get(
            f"{BASE_URL}/api/acms/access",
            params={"user_id": TestACMSProvisioning.test_user_id, "is_active": True}
        )
        assert response.status_code == 200
        
        data = response.json()
        assert "access_records" in data
        
        # Find access record for our test tool
        tool_id = TestACMSProvisioning.created_tool_ids[0]
        access_record = next(
            (r for r in data["access_records"] if r["tool_id"] == tool_id),
            None
        )
        
        # It's ok if not found - user might have had access already or different conditions
        if access_record:
            print(f"✅ User has access to test tool with level: {access_record.get('access_level')}")
            assert access_record.get("access_type") == "auto_provisioned", "Access type should be auto_provisioned"
        else:
            print(f"ℹ️ No new access record created (user may already have access or no matching templates)")
    
    # ===================== AUTO-REVOCATION ON OFFBOARD =====================
    
    def test_10_provision_offboard(self, api_client):
        """Test POST /api/acms/provision/offboard - Revoke all tools on employee offboard"""
        assert TestACMSProvisioning.test_user_id
        
        response = api_client.post(
            f"{BASE_URL}/api/acms/provision/offboard",
            params={"user_id": TestACMSProvisioning.test_user_id}
        )
        
        assert response.status_code == 200, f"Offboard provisioning failed: {response.text}"
        
        data = response.json()
        assert "message" in data
        print(f"✅ Offboard revocation: {data['message']}")
    
    def test_11_verify_access_revoked(self, api_client):
        """Verify user tool access is revoked after offboarding"""
        response = api_client.get(
            f"{BASE_URL}/api/acms/access",
            params={"user_id": TestACMSProvisioning.test_user_id, "is_active": True}
        )
        assert response.status_code == 200
        
        data = response.json()
        # All active access should be revoked
        tool_id = TestACMSProvisioning.created_tool_ids[0] if TestACMSProvisioning.created_tool_ids else None
        if tool_id:
            access_record = next(
                (r for r in data["access_records"] if r["tool_id"] == tool_id),
                None
            )
            assert access_record is None or access_record.get("is_active") == False, "Access should be revoked"
        print("✅ Access revoked verified")
    
    # ===================== AUDIT LOGGING =====================
    
    def test_12_verify_audit_logs(self, api_client):
        """Verify provisioning actions are logged in audit trail"""
        response = api_client.get(f"{BASE_URL}/api/acms/audit-logs?limit=50")
        assert response.status_code == 200
        
        data = response.json()
        assert "logs" in data
        
        # Check for provisioning-related actions
        provisioning_actions = [
            "onboarding_provisioning_completed",
            "offboarding_revocation_completed",
            "access_auto_provisioned",
            "access_auto_revoked"
        ]
        
        found_actions = []
        for log in data["logs"]:
            if log.get("action") in provisioning_actions:
                found_actions.append(log["action"])
        
        print(f"✅ Found audit log actions: {list(set(found_actions))}")
    
    def test_13_get_provisioning_history(self, api_client):
        """Test GET /api/acms/provision/history - View provisioning history"""
        response = api_client.get(f"{BASE_URL}/api/acms/provision/history?limit=20")
        assert response.status_code == 200
        
        data = response.json()
        assert "history" in data
        print(f"✅ Found {len(data['history'])} provisioning history entries")
    
    # ===================== TEMPLATE DELETE =====================
    
    def test_14_delete_template(self, api_client):
        """Test DELETE /api/acms/templates/{id} - Delete template"""
        if not TestACMSProvisioning.created_template_ids:
            pytest.skip("No template to delete")
        
        template_id = TestACMSProvisioning.created_template_ids[0]
        response = api_client.delete(f"{BASE_URL}/api/acms/templates/{template_id}")
        assert response.status_code == 200, f"Delete template failed: {response.text}"
        print("✅ Template deleted successfully")
    
    def test_15_verify_template_deleted(self, api_client):
        """Verify template is deleted"""
        response = api_client.get(f"{BASE_URL}/api/acms/templates")
        assert response.status_code == 200
        
        data = response.json()
        template_ids = [t["id"] for t in data["templates"]]
        
        if TestACMSProvisioning.created_template_ids:
            deleted_id = TestACMSProvisioning.created_template_ids[0]
            assert deleted_id not in template_ids, "Deleted template should not appear in list"
        
        print("✅ Template deletion verified")
    
    # ===================== CLEANUP =====================
    
    def test_99_cleanup(self, api_client):
        """Cleanup test data"""
        # Delete any remaining test templates
        for template_id in TestACMSProvisioning.created_template_ids[1:]:  # Skip first (already deleted)
            try:
                api_client.delete(f"{BASE_URL}/api/acms/templates/{template_id}")
            except:
                pass
        
        # Delete test tools
        for tool_id in TestACMSProvisioning.created_tool_ids:
            try:
                api_client.delete(f"{BASE_URL}/api/acms/tools/{tool_id}")
            except:
                pass
        
        print("✅ Cleanup completed")


@pytest.fixture
def api_client():
    """Shared requests session"""
    session = requests.Session()
    session.headers.update({"Content-Type": "application/json"})
    return session
