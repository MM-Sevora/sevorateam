"""
Test Organization Hierarchy and Approval Workflow APIs
- Phase 1: Reporting Chain Enforcement (org context, reportees)
- Phase 2-4: Unified Approval Workflow Engine (workflows, dashboard, pending approvals)
"""

import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
ADMIN_EMAIL = "admin@sevora.com"
ADMIN_PASSWORD = "admin123"


class TestAuthSetup:
    """Authentication setup for tests"""
    
    @pytest.fixture(scope="class")
    def auth_token(self):
        """Get authentication token for admin user"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD}
        )
        assert response.status_code == 200, f"Login failed: {response.text}"
        data = response.json()
        # API returns access_token, not token
        token = data.get("access_token") or data.get("token")
        assert token, "No token in response"
        return token
    
    @pytest.fixture(scope="class")
    def auth_headers(self, auth_token):
        """Get headers with auth token"""
        return {
            "Authorization": f"Bearer {auth_token}",
            "Content-Type": "application/json"
        }


class TestOrgHierarchyEndpoints(TestAuthSetup):
    """Test Organization Hierarchy endpoints"""
    
    def test_get_my_org_context(self, auth_headers):
        """GET /api/org/my-context - returns user's org context"""
        response = requests.get(
            f"{BASE_URL}/api/org/my-context",
            headers=auth_headers
        )
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        
        # Verify response structure
        assert "user_id" in data, "Missing user_id in response"
        assert "direct_reportees" in data, "Missing direct_reportees"
        assert "all_reportees" in data, "Missing all_reportees"
        assert "is_department_head" in data, "Missing is_department_head"
        assert "is_manager" in data, "Missing is_manager"
        assert "reports_to" in data, "Missing reports_to"
        assert "reporting_chain" in data, "Missing reporting_chain"
        
        # Verify data types
        assert isinstance(data["direct_reportees"], list), "direct_reportees should be a list"
        assert isinstance(data["all_reportees"], list), "all_reportees should be a list"
        assert isinstance(data["is_department_head"], bool), "is_department_head should be bool"
        assert isinstance(data["is_manager"], bool), "is_manager should be bool"
        
        print(f"✓ Org context retrieved: user_id={data['user_id']}, is_manager={data['is_manager']}, reportees_count={len(data['direct_reportees'])}")
    
    def test_get_my_reportees(self, auth_headers):
        """GET /api/org/my-reportees - returns list of user's reportees"""
        response = requests.get(
            f"{BASE_URL}/api/org/my-reportees",
            headers=auth_headers
        )
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        
        # Verify response structure
        assert "reportees" in data, "Missing reportees in response"
        assert "total" in data, "Missing total count"
        assert "include_indirect" in data, "Missing include_indirect flag"
        
        # Verify data types
        assert isinstance(data["reportees"], list), "reportees should be a list"
        assert isinstance(data["total"], int), "total should be int"
        
        print(f"✓ Reportees retrieved: total={data['total']}, include_indirect={data['include_indirect']}")
    
    def test_get_my_reportees_with_indirect(self, auth_headers):
        """GET /api/org/my-reportees?include_indirect=true - returns all reportees"""
        response = requests.get(
            f"{BASE_URL}/api/org/my-reportees?include_indirect=true",
            headers=auth_headers
        )
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        
        assert data["include_indirect"] == True, "include_indirect should be True"
        print(f"✓ All reportees (indirect) retrieved: total={data['total']}")
    
    def test_get_approval_chain_for_user(self, auth_headers):
        """GET /api/org/approval-chain/{user_id} - returns approval chain"""
        # First get current user's ID from org context
        context_response = requests.get(
            f"{BASE_URL}/api/org/my-context",
            headers=auth_headers
        )
        assert context_response.status_code == 200
        user_id = context_response.json()["user_id"]
        
        # Get approval chain
        response = requests.get(
            f"{BASE_URL}/api/org/approval-chain/{user_id}",
            headers=auth_headers
        )
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        
        # Verify response structure
        assert "user_id" in data, "Missing user_id"
        assert "approval_type" in data, "Missing approval_type"
        assert "approval_chain" in data, "Missing approval_chain"
        assert "total_levels" in data, "Missing total_levels"
        
        # Verify data types
        assert isinstance(data["approval_chain"], list), "approval_chain should be a list"
        assert isinstance(data["total_levels"], int), "total_levels should be int"
        
        print(f"✓ Approval chain retrieved: user_id={data['user_id']}, total_levels={data['total_levels']}")
    
    def test_get_department_heads(self, auth_headers):
        """GET /api/org/department-heads - returns all department heads"""
        response = requests.get(
            f"{BASE_URL}/api/org/department-heads",
            headers=auth_headers
        )
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        
        # Verify response structure
        assert "departments" in data, "Missing departments"
        assert "total" in data, "Missing total"
        
        print(f"✓ Department heads retrieved: total={data['total']}")


class TestApprovalWorkflowEndpoints(TestAuthSetup):
    """Test Approval Workflow endpoints"""
    
    def test_get_approval_dashboard(self, auth_headers):
        """GET /api/approvals/dashboard - returns approval metrics"""
        response = requests.get(
            f"{BASE_URL}/api/approvals/dashboard",
            headers=auth_headers
        )
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        
        # Verify response structure
        assert "pending_my_approval" in data, "Missing pending_my_approval"
        assert "my_requests" in data, "Missing my_requests"
        
        # Verify my_requests structure
        my_requests = data["my_requests"]
        assert "pending" in my_requests, "Missing pending in my_requests"
        assert "approved" in my_requests, "Missing approved in my_requests"
        assert "rejected" in my_requests, "Missing rejected in my_requests"
        
        # Admin should have admin_stats
        if data.get("admin_stats"):
            admin_stats = data["admin_stats"]
            assert "total_pending" in admin_stats, "Missing total_pending in admin_stats"
            assert "total_approved" in admin_stats, "Missing total_approved in admin_stats"
            assert "total_rejected" in admin_stats, "Missing total_rejected in admin_stats"
            print(f"✓ Admin stats: pending={admin_stats['total_pending']}, approved={admin_stats['total_approved']}")
        
        print(f"✓ Dashboard retrieved: pending_my_approval={data['pending_my_approval']}, my_pending={my_requests['pending']}")
    
    def test_get_approval_workflows(self, auth_headers):
        """GET /api/approvals/workflows - returns configured approval workflows"""
        # Use approval_type filter to get the new approval workflows
        response = requests.get(
            f"{BASE_URL}/api/approvals/workflows?approval_type=expense_claim",
            headers=auth_headers
        )
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        
        # Verify response structure
        assert "workflows" in data, "Missing workflows"
        assert "total" in data, "Missing total"
        
        # Verify data types
        assert isinstance(data["workflows"], list), "workflows should be a list"
        
        # If workflows exist, verify structure
        if data["workflows"]:
            workflow = data["workflows"][0]
            assert "id" in workflow, "Missing id in workflow"
            assert "name" in workflow, "Missing name in workflow"
            assert "approval_type" in workflow, "Missing approval_type in workflow"
            assert "levels" in workflow, "Missing levels in workflow"
            print(f"✓ First workflow: {workflow['name']} ({workflow['approval_type']})")
        
        print(f"✓ Workflows retrieved: total={data['total']}")
    
    def test_seed_default_workflows(self, auth_headers):
        """POST /api/approvals/workflows/seed-defaults - seeds default workflows"""
        response = requests.post(
            f"{BASE_URL}/api/approvals/workflows/seed-defaults",
            headers=auth_headers
        )
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        
        # Verify response structure
        assert "success" in data, "Missing success flag"
        assert data["success"] == True, "Seeding should succeed"
        assert "created" in data, "Missing created list"
        assert "skipped" in data, "Missing skipped list"
        assert "message" in data, "Missing message"
        
        print(f"✓ Seed defaults: created={len(data['created'])}, skipped={len(data['skipped'])}")
        print(f"  Message: {data['message']}")
    
    def test_get_pending_my_approval(self, auth_headers):
        """GET /api/approvals/pending-my-approval - returns pending approvals for current user"""
        response = requests.get(
            f"{BASE_URL}/api/approvals/pending-my-approval",
            headers=auth_headers
        )
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        
        # Verify response structure
        assert "requests" in data, "Missing requests"
        assert "total" in data, "Missing total"
        
        # Verify data types
        assert isinstance(data["requests"], list), "requests should be a list"
        assert isinstance(data["total"], int), "total should be int"
        
        print(f"✓ Pending my approval: total={data['total']}")
    
    def test_get_my_requests(self, auth_headers):
        """GET /api/approvals/my-requests - returns user's submitted requests"""
        response = requests.get(
            f"{BASE_URL}/api/approvals/my-requests",
            headers=auth_headers
        )
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        
        # Verify response structure
        assert "requests" in data, "Missing requests"
        assert "total" in data, "Missing total"
        
        # Verify data types
        assert isinstance(data["requests"], list), "requests should be a list"
        
        print(f"✓ My requests: total={data['total']}")
    
    def test_get_all_approval_requests(self, auth_headers):
        """GET /api/approvals/requests - returns all approval requests (admin)"""
        response = requests.get(
            f"{BASE_URL}/api/approvals/requests",
            headers=auth_headers
        )
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        
        # Verify response structure
        assert "requests" in data, "Missing requests"
        assert "total" in data, "Missing total"
        assert "skip" in data, "Missing skip"
        assert "limit" in data, "Missing limit"
        
        print(f"✓ All requests: total={data['total']}")


class TestRBACCleanup(TestAuthSetup):
    """Test RBAC cleanup endpoint"""
    
    def test_cleanup_duplicates(self, auth_headers):
        """POST /api/rbac/cleanup-duplicates - removes duplicate roles"""
        response = requests.post(
            f"{BASE_URL}/api/rbac/cleanup-duplicates",
            headers=auth_headers
        )
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        
        # Verify response structure - API returns 'status' instead of 'success'
        assert "status" in data or "success" in data, "Missing status/success flag"
        if "status" in data:
            assert data["status"] == "success", "Cleanup should succeed"
        
        print(f"✓ RBAC cleanup completed: {data}")


class TestApprovalWorkflowCRUD(TestAuthSetup):
    """Test Approval Workflow CRUD operations"""
    
    def test_create_and_delete_workflow(self, auth_headers):
        """Test creating and deleting a custom workflow"""
        # Create a test workflow
        workflow_data = {
            "name": "TEST_Custom Approval Workflow",
            "description": "Test workflow for automated testing",
            "approval_type": "custom",
            "is_active": True,
            "is_default": False,
            "levels": [
                {
                    "level": 1,
                    "name": "Manager Approval",
                    "approver_type": "reporting_manager",
                    "is_required": True
                }
            ],
            "require_all_levels": True,
            "notify_on_action": True
        }
        
        # Create workflow
        create_response = requests.post(
            f"{BASE_URL}/api/approvals/workflows",
            headers=auth_headers,
            json=workflow_data
        )
        assert create_response.status_code == 200, f"Create failed: {create_response.text}"
        created = create_response.json()
        
        assert "id" in created, "Missing id in created workflow"
        assert created["name"] == workflow_data["name"], "Name mismatch"
        workflow_id = created["id"]
        print(f"✓ Created workflow: {workflow_id}")
        
        # Verify it exists in list (use approval_type filter)
        list_response = requests.get(
            f"{BASE_URL}/api/approvals/workflows?approval_type=custom",
            headers=auth_headers
        )
        assert list_response.status_code == 200
        workflows = list_response.json()["workflows"]
        assert any(w.get("id") == workflow_id for w in workflows), "Created workflow not in list"
        
        # Delete the workflow
        delete_response = requests.delete(
            f"{BASE_URL}/api/approvals/workflows/{workflow_id}",
            headers=auth_headers
        )
        assert delete_response.status_code == 200, f"Delete failed: {delete_response.text}"
        
        # Verify it's deleted (use approval_type filter)
        list_response2 = requests.get(
            f"{BASE_URL}/api/approvals/workflows?approval_type=custom",
            headers=auth_headers
        )
        workflows2 = list_response2.json()["workflows"]
        assert not any(w.get("id") == workflow_id for w in workflows2), "Workflow still exists after delete"
        
        print(f"✓ Deleted workflow: {workflow_id}")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
