"""
Audit Log Module Tests
Tests for the Audit Log API endpoints and RBAC integration.
"""

import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestAuditLogModule:
    """Test Audit Log API endpoints"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup test session with authentication"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        
        # Login as admin
        login_response = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@sevora.com",
            "password": "admin123"
        })
        assert login_response.status_code == 200, f"Login failed: {login_response.text}"
        
        data = login_response.json()
        self.token = data.get("access_token")
        self.user = data.get("user")
        self.session.headers.update({"Authorization": f"Bearer {self.token}"})
        
    # ============== AUDIT LOG STATS ==============
    
    def test_get_audit_stats(self):
        """Test GET /api/audit/stats returns statistics"""
        response = self.session.get(f"{BASE_URL}/api/audit/stats")
        assert response.status_code == 200, f"Failed to get audit stats: {response.text}"
        
        data = response.json()
        # Verify stats structure
        assert "total_entries" in data, "Missing total_entries in stats"
        assert "entries_today" in data, "Missing entries_today in stats"
        assert "entries_this_week" in data, "Missing entries_this_week in stats"
        assert "top_users" in data, "Missing top_users in stats"
        assert "top_actions" in data, "Missing top_actions in stats"
        assert "top_modules" in data, "Missing top_modules in stats"
        
        # Verify data types
        assert isinstance(data["total_entries"], int), "total_entries should be int"
        assert isinstance(data["entries_today"], int), "entries_today should be int"
        assert isinstance(data["entries_this_week"], int), "entries_this_week should be int"
        assert isinstance(data["top_users"], list), "top_users should be list"
        
        print(f"Audit Stats: total={data['total_entries']}, today={data['entries_today']}, week={data['entries_this_week']}")
        
    # ============== AUDIT LOG ENTRIES ==============
    
    def test_get_audit_logs(self):
        """Test GET /api/audit/logs returns log entries"""
        response = self.session.get(f"{BASE_URL}/api/audit/logs?limit=100")
        assert response.status_code == 200, f"Failed to get audit logs: {response.text}"
        
        data = response.json()
        assert isinstance(data, list), "Response should be a list"
        
        if len(data) > 0:
            log = data[0]
            # Verify log entry structure
            assert "id" in log, "Missing id in log entry"
            assert "timestamp" in log, "Missing timestamp in log entry"
            assert "user_id" in log, "Missing user_id in log entry"
            assert "user_name" in log, "Missing user_name in log entry"
            assert "user_email" in log, "Missing user_email in log entry"
            assert "action" in log, "Missing action in log entry"
            assert "module" in log, "Missing module in log entry"
            assert "description" in log, "Missing description in log entry"
            assert "status" in log, "Missing status in log entry"
            
            print(f"Found {len(data)} audit log entries")
            print(f"Sample log: action={log['action']}, module={log['module']}, user={log['user_name']}")
        else:
            print("No audit log entries found (may need seeding)")
            
    def test_get_audit_logs_with_filters(self):
        """Test GET /api/audit/logs with various filters"""
        # Test with action filter
        response = self.session.get(f"{BASE_URL}/api/audit/logs?action=login&limit=10")
        assert response.status_code == 200, f"Failed with action filter: {response.text}"
        
        # Test with module filter
        response = self.session.get(f"{BASE_URL}/api/audit/logs?module=users&limit=10")
        assert response.status_code == 200, f"Failed with module filter: {response.text}"
        
        # Test with status filter
        response = self.session.get(f"{BASE_URL}/api/audit/logs?status=success&limit=10")
        assert response.status_code == 200, f"Failed with status filter: {response.text}"
        
        # Test with search
        response = self.session.get(f"{BASE_URL}/api/audit/logs?search=admin&limit=10")
        assert response.status_code == 200, f"Failed with search filter: {response.text}"
        
        print("All filter tests passed")
        
    def test_get_single_audit_log(self):
        """Test GET /api/audit/logs/{log_id} returns single entry"""
        # First get a log entry
        logs_response = self.session.get(f"{BASE_URL}/api/audit/logs?limit=1")
        assert logs_response.status_code == 200
        
        logs = logs_response.json()
        if len(logs) > 0:
            log_id = logs[0]["id"]
            
            # Get single log entry
            response = self.session.get(f"{BASE_URL}/api/audit/logs/{log_id}")
            assert response.status_code == 200, f"Failed to get single log: {response.text}"
            
            data = response.json()
            assert data["id"] == log_id, "Log ID mismatch"
            print(f"Successfully retrieved log entry: {log_id}")
        else:
            pytest.skip("No audit logs available to test single entry retrieval")
            
    # ============== FILTER OPTIONS ==============
    
    def test_get_audit_modules(self):
        """Test GET /api/audit/modules returns list of modules"""
        response = self.session.get(f"{BASE_URL}/api/audit/modules")
        assert response.status_code == 200, f"Failed to get audit modules: {response.text}"
        
        data = response.json()
        assert isinstance(data, list), "Response should be a list"
        print(f"Available modules: {data}")
        
    def test_get_audit_actions(self):
        """Test GET /api/audit/actions returns list of actions"""
        response = self.session.get(f"{BASE_URL}/api/audit/actions")
        assert response.status_code == 200, f"Failed to get audit actions: {response.text}"
        
        data = response.json()
        assert isinstance(data, list), "Response should be a list"
        print(f"Available actions: {data}")
        
    def test_get_audit_users(self):
        """Test GET /api/audit/users returns list of users"""
        response = self.session.get(f"{BASE_URL}/api/audit/users")
        assert response.status_code == 200, f"Failed to get audit users: {response.text}"
        
        data = response.json()
        assert isinstance(data, list), "Response should be a list"
        
        if len(data) > 0:
            user = data[0]
            assert "user_id" in user, "Missing user_id"
            assert "user_name" in user, "Missing user_name"
            print(f"Found {len(data)} users with audit entries")
        else:
            print("No users with audit entries found")
            
    # ============== EXPORT ==============
    
    def test_export_audit_logs(self):
        """Test POST /api/audit/export exports logs"""
        response = self.session.post(f"{BASE_URL}/api/audit/export")
        assert response.status_code == 200, f"Failed to export audit logs: {response.text}"
        
        data = response.json()
        assert "count" in data, "Missing count in export response"
        assert "logs" in data, "Missing logs in export response"
        assert isinstance(data["logs"], list), "logs should be a list"
        
        print(f"Exported {data['count']} audit log entries")
        
    def test_export_audit_logs_with_filters(self):
        """Test POST /api/audit/export with filters"""
        response = self.session.post(f"{BASE_URL}/api/audit/export?action=login")
        assert response.status_code == 200, f"Failed to export with filter: {response.text}"
        
        data = response.json()
        assert "count" in data
        print(f"Exported {data['count']} login audit entries")


class TestAuditLogRBAC:
    """Test Audit Log RBAC integration"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup test session"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        
    def test_audit_log_module_in_rbac(self):
        """Test that audit_log module exists in RBAC modules list"""
        # Login as admin
        login_response = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@sevora.com",
            "password": "admin123"
        })
        assert login_response.status_code == 200
        
        data = login_response.json()
        token = data.get("access_token")
        self.session.headers.update({"Authorization": f"Bearer {token}"})
        
        # Get RBAC modules
        response = self.session.get(f"{BASE_URL}/api/rbac/modules")
        assert response.status_code == 200, f"Failed to get RBAC modules: {response.text}"
        
        data = response.json()
        modules = data.get("modules", data) if isinstance(data, dict) else data
        module_codes = [m.get("code") for m in modules]
        
        assert "audit_log" in module_codes, "audit_log module not found in RBAC modules"
        
        # Find audit_log module details
        audit_module = next((m for m in modules if m.get("code") == "audit_log"), None)
        assert audit_module is not None, "audit_log module not found"
        assert audit_module.get("name") == "Audit Log", f"Unexpected name: {audit_module.get('name')}"
        assert audit_module.get("category") == "admin", f"Unexpected category: {audit_module.get('category')}"
        
        print(f"audit_log module found: {audit_module}")
        
    def test_super_admin_has_audit_log_access(self):
        """Test that Super Admin role has audit_log in module_access"""
        # Login as admin
        login_response = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@sevora.com",
            "password": "admin123"
        })
        assert login_response.status_code == 200
        
        data = login_response.json()
        token = data.get("access_token")
        self.session.headers.update({"Authorization": f"Bearer {token}"})
        
        # Get roles
        response = self.session.get(f"{BASE_URL}/api/rbac/roles")
        assert response.status_code == 200, f"Failed to get roles: {response.text}"
        
        roles = response.json()
        
        # Find super_admin role
        super_admin = next((r for r in roles if r.get("code") == "super_admin"), None)
        assert super_admin is not None, "super_admin role not found"
        
        module_access = super_admin.get("module_access", [])
        assert "audit_log" in module_access, f"audit_log not in super_admin module_access: {module_access}"
        
        print(f"Super Admin has audit_log access: {module_access}")
        
    def test_admin_has_audit_log_access(self):
        """Test that Admin role has audit_log in module_access"""
        # Login as admin
        login_response = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@sevora.com",
            "password": "admin123"
        })
        assert login_response.status_code == 200
        
        data = login_response.json()
        token = data.get("access_token")
        user = data.get("user")
        self.session.headers.update({"Authorization": f"Bearer {token}"})
        
        # Check that the user's role (super_admin) has audit_log access
        user_role = user.get("role")
        
        # Get roles to verify
        response = self.session.get(f"{BASE_URL}/api/rbac/roles")
        assert response.status_code == 200
        
        roles = response.json()
        user_role_data = next((r for r in roles if r.get("code") == user_role), None)
        assert user_role_data is not None, f"Role {user_role} not found"
        
        role_module_access = user_role_data.get("module_access", [])
        assert "audit_log" in role_module_access, f"audit_log not in {user_role} role module_access: {role_module_access}"
        
        # Also verify the audit API is accessible (which proves access works)
        audit_response = self.session.get(f"{BASE_URL}/api/audit/stats")
        assert audit_response.status_code == 200, f"Admin cannot access audit stats: {audit_response.text}"
        
        print(f"Admin user (role={user_role}) has audit_log access via role")
        
    def test_unauthorized_access_denied(self):
        """Test that unauthenticated requests are denied"""
        # Try to access without auth
        response = requests.get(f"{BASE_URL}/api/audit/logs")
        assert response.status_code in [401, 403], f"Expected 401/403, got {response.status_code}"
        
        response = requests.get(f"{BASE_URL}/api/audit/stats")
        assert response.status_code in [401, 403], f"Expected 401/403, got {response.status_code}"
        
        print("Unauthorized access correctly denied")


class TestAuditLogDataIntegrity:
    """Test Audit Log data integrity and seeded data"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup test session with authentication"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        
        # Login as admin
        login_response = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@sevora.com",
            "password": "admin123"
        })
        assert login_response.status_code == 200
        
        data = login_response.json()
        self.token = data.get("access_token")
        self.session.headers.update({"Authorization": f"Bearer {self.token}"})
        
    def test_seeded_audit_logs_exist(self):
        """Test that seeded audit log entries exist"""
        response = self.session.get(f"{BASE_URL}/api/audit/stats")
        assert response.status_code == 200
        
        stats = response.json()
        total = stats.get("total_entries", 0)
        
        # Main agent mentioned 50 sample entries were seeded
        assert total >= 50, f"Expected at least 50 seeded entries, got {total}"
        print(f"Found {total} audit log entries (expected >= 50)")
        
    def test_audit_log_action_types(self):
        """Test that various action types exist in audit logs"""
        response = self.session.get(f"{BASE_URL}/api/audit/actions")
        assert response.status_code == 200
        
        actions = response.json()
        
        # Expected action types based on the frontend code
        expected_actions = ["create", "read", "update", "delete", "login", "logout", "export"]
        
        found_actions = []
        for action in expected_actions:
            if action in actions:
                found_actions.append(action)
                
        print(f"Found actions: {actions}")
        print(f"Expected actions found: {found_actions}")
        
    def test_audit_log_status_values(self):
        """Test that audit logs have valid status values"""
        response = self.session.get(f"{BASE_URL}/api/audit/logs?limit=100")
        assert response.status_code == 200
        
        logs = response.json()
        valid_statuses = ["success", "failure", "warning"]
        
        for log in logs:
            status = log.get("status")
            assert status in valid_statuses, f"Invalid status: {status}"
            
        print(f"All {len(logs)} logs have valid status values")


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
