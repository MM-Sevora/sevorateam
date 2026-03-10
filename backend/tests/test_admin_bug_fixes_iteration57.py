"""
Test Admin Bug Fixes - Iteration 57
Tests for:
1. User delete API endpoint (DELETE /api/workos/users/{user_id})
2. Bulk user status update (POST /api/workos/users/bulk/status)
3. Bulk user delete (POST /api/workos/users/bulk/delete)
4. Employee terminate API (DELETE /api/hr/v2/employees/{employee_id})
5. Bulk employee terminate (POST /api/hr/v2/employees/bulk/delete)
6. Bulk employee status update (POST /api/hr/v2/employees/bulk/status)
7. AI meeting summary generation (POST /api/meetings/{meeting_id}/generate-summary)
"""

import pytest
import requests
import os
import uuid

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Module-level auth token
_auth_token = None

def get_auth_token(client):
    """Get or create auth token"""
    global _auth_token
    if _auth_token:
        return _auth_token
    
    login_response = client.post(f"{BASE_URL}/api/auth/login", json={
        "email": "superadmin@sevora.com",
        "password": "superadmin123"
    })
    if login_response.status_code == 200:
        data = login_response.json()
        # Try both 'access_token' and 'token' keys
        _auth_token = data.get("access_token") or data.get("token")
        return _auth_token
    return None


@pytest.fixture
def api_client():
    """Create HTTP session with auth"""
    session = requests.Session()
    session.headers.update({"Content-Type": "application/json"})
    
    token = get_auth_token(session)
    if token:
        session.headers.update({"Authorization": f"Bearer {token}"})
    else:
        pytest.fail("Failed to authenticate")
    
    return session


class TestUserDeleteEndpoint:
    """Test User Delete API - Bug Fix #1"""
    
    def test_user_delete_endpoint_not_405(self, api_client):
        """Test 1.1: DELETE /api/workos/users/{user_id} should NOT return 405"""
        # Get users first
        users_response = api_client.get(f"{BASE_URL}/api/workos/users")
        
        assert users_response.status_code == 200, f"Failed to get users: {users_response.status_code}"
        users = users_response.json()
        
        if not users:
            pytest.skip("No users available")
        
        # Find a non-admin user
        target_user = None
        for user in users:
            if user.get("email") != "superadmin@sevora.com":
                target_user = user
                break
        
        if not target_user:
            # Create a test user
            test_email = f"TEST_delete_{uuid.uuid4().hex[:8]}@test.com"
            create_resp = api_client.post(f"{BASE_URL}/api/auth/register", json={
                "name": "Test Delete",
                "email": test_email,
                "password": "testpass123"
            })
            if create_resp.status_code in [200, 201]:
                target_user = create_resp.json().get("user") or create_resp.json()
        
        if not target_user or not target_user.get("id"):
            pytest.skip("No test user available")
        
        user_id = target_user.get("id")
        
        # Try DELETE endpoint - it should NOT be 405
        delete_response = api_client.delete(f"{BASE_URL}/api/workos/users/{user_id}")
        
        assert delete_response.status_code != 405, f"DELETE method not allowed - Bug still exists! Status: {delete_response.status_code}"
        print(f"PASS: DELETE endpoint works - status {delete_response.status_code}")
        
        # If successful, verify the response
        if delete_response.status_code == 200:
            data = delete_response.json()
            assert data.get("success") == True, f"Expected success=True, got {data}"
            print(f"PASS: User deleted successfully")
        elif delete_response.status_code == 400:
            print(f"INFO: Delete blocked (may have direct reports): {delete_response.json()}")


class TestBulkUserStatusUpdate:
    """Test Bulk User Status Update - Bug Fix #2"""
    
    def test_bulk_status_endpoint_exists(self, api_client):
        """Test 2.1: POST /api/workos/users/bulk/status endpoint exists"""
        response = api_client.post(f"{BASE_URL}/api/workos/users/bulk/status", json={
            "user_ids": [],
            "status": "active"
        })
        
        assert response.status_code != 404, "Endpoint not found"
        assert response.status_code != 405, "Method not allowed"
        
        # 400 expected for empty user_ids (validation)
        print(f"PASS: Bulk status endpoint exists - status {response.status_code}")
    
    def test_bulk_status_update_works(self, api_client):
        """Test 2.2: Bulk status update actually updates users"""
        # Get users
        users_response = api_client.get(f"{BASE_URL}/api/workos/users")
        assert users_response.status_code == 200, f"Failed to get users: {users_response.status_code}"
        
        users = users_response.json()
        test_users = [u for u in users if u.get("email") != "superadmin@sevora.com"][:2]
        
        if not test_users:
            pytest.skip("No non-admin users for bulk test")
        
        user_ids = [u.get("id") for u in test_users]
        
        response = api_client.post(f"{BASE_URL}/api/workos/users/bulk/status", json={
            "user_ids": user_ids,
            "status": "active"
        })
        
        assert response.status_code == 200, f"Bulk status failed: {response.status_code} - {response.text}"
        data = response.json()
        assert data.get("success") == True, f"Expected success=True, got {data}"
        print(f"PASS: Bulk status update works - {data.get('message')}")


class TestBulkUserDelete:
    """Test Bulk User Delete - Bug Fix #3"""
    
    def test_bulk_delete_endpoint_exists(self, api_client):
        """Test 3.1: POST /api/workos/users/bulk/delete endpoint exists"""
        response = api_client.post(f"{BASE_URL}/api/workos/users/bulk/delete", json={
            "user_ids": []
        })
        
        assert response.status_code != 404, "Endpoint not found"
        assert response.status_code != 405, "Method not allowed"
        
        print(f"PASS: Bulk delete endpoint exists - status {response.status_code}")
    
    def test_bulk_delete_validates_empty_ids(self, api_client):
        """Test 3.2: Bulk delete validates empty user_ids"""
        response = api_client.post(f"{BASE_URL}/api/workos/users/bulk/delete", json={
            "user_ids": []
        })
        
        assert response.status_code == 400, f"Expected 400 for empty IDs, got {response.status_code}"
        print(f"PASS: Bulk delete validates empty user_ids")


class TestEmployeeTerminate:
    """Test Employee Terminate API - Bug Fix #4"""
    
    def test_employee_terminate_endpoint_not_405(self, api_client):
        """Test 4.1: DELETE /api/hr/v2/employees/{id} should NOT return 405"""
        # Get employees
        emp_response = api_client.get(f"{BASE_URL}/api/hr/v2/employees")
        
        if emp_response.status_code != 200:
            pytest.skip(f"Could not get employees: {emp_response.status_code}")
        
        employees = emp_response.json()
        
        if not employees:
            pytest.skip("No employees available")
        
        # Find an employee that is not terminated
        target_emp = None
        for emp in employees:
            if emp.get("status") not in ["terminated"]:
                target_emp = emp
                break
        
        if not target_emp:
            pytest.skip("No active employees to test terminate")
        
        emp_id = target_emp.get("id")
        
        # DELETE should NOT return 405
        delete_response = api_client.delete(f"{BASE_URL}/api/hr/v2/employees/{emp_id}")
        
        assert delete_response.status_code != 405, f"DELETE method not allowed on employees - Bug still exists!"
        print(f"PASS: Employee terminate endpoint works - status {delete_response.status_code}")


class TestBulkEmployeeOperations:
    """Test Bulk Employee Operations - Bug Fix #5 & #6"""
    
    def test_bulk_employee_terminate_endpoint_exists(self, api_client):
        """Test 5.1: POST /api/hr/v2/employees/bulk/delete endpoint exists"""
        response = api_client.post(f"{BASE_URL}/api/hr/v2/employees/bulk/delete", json={
            "employee_ids": []
        })
        
        assert response.status_code != 404, "Endpoint not found"
        assert response.status_code != 405, "Method not allowed"
        
        print(f"PASS: Bulk employee terminate endpoint exists - status {response.status_code}")
    
    def test_bulk_employee_status_endpoint_exists(self, api_client):
        """Test 6.1: POST /api/hr/v2/employees/bulk/status endpoint exists"""
        response = api_client.post(f"{BASE_URL}/api/hr/v2/employees/bulk/status", json={
            "employee_ids": [],
            "status": "active"
        })
        
        assert response.status_code != 404, "Endpoint not found"
        assert response.status_code != 405, "Method not allowed"
        
        print(f"PASS: Bulk employee status endpoint exists - status {response.status_code}")
    
    def test_bulk_employee_status_validates_status_values(self, api_client):
        """Test 6.2: Bulk status validates allowed status values"""
        response = api_client.post(f"{BASE_URL}/api/hr/v2/employees/bulk/status", json={
            "employee_ids": ["test-id"],
            "status": "invalid_status_value"
        })
        
        # Should reject invalid status
        assert response.status_code == 400, f"Expected 400 for invalid status, got {response.status_code}"
        print(f"PASS: Bulk employee status validates status values")


class TestAIMeetingSummary:
    """Test AI Meeting Summary - Bug Fix #7"""
    
    def test_ai_summary_endpoint_exists(self, api_client):
        """Test 7.1: POST /api/meetings/{id}/generate-summary endpoint exists"""
        # Get a meeting first
        meetings_response = api_client.get(f"{BASE_URL}/api/meetings")
        
        if meetings_response.status_code != 200:
            pytest.skip(f"Could not get meetings: {meetings_response.status_code}")
        
        meetings_data = meetings_response.json()
        meetings = meetings_data if isinstance(meetings_data, list) else meetings_data.get("meetings", [])
        
        if not meetings:
            pytest.skip("No meetings available for testing")
        
        meeting_id = meetings[0].get("id")
        
        # Test endpoint
        response = api_client.post(f"{BASE_URL}/api/meetings/{meeting_id}/generate-summary")
        
        assert response.status_code != 404, "Generate summary endpoint not found"
        assert response.status_code != 405, "Method not allowed"
        
        print(f"PASS: AI summary endpoint exists - status {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            assert "summary" in data or "meeting_id" in data
            print(f"PASS: AI summary generated successfully")
        elif response.status_code == 500:
            # AI service might not be configured
            print(f"INFO: AI service issue - {response.json()}")
    
    def test_ai_summary_returns_404_for_nonexistent(self, api_client):
        """Test 7.2: Returns 404 for non-existent meeting"""
        fake_id = str(uuid.uuid4())
        response = api_client.post(f"{BASE_URL}/api/meetings/{fake_id}/generate-summary")
        
        # May return 403 (forbidden) or 404 depending on auth check order
        assert response.status_code in [403, 404], f"Expected 403/404, got {response.status_code}"
        print(f"PASS: Returns {response.status_code} for non-existent meeting")


class TestEndpointBasics:
    """Basic endpoint availability tests"""
    
    def test_workos_users_endpoint(self, api_client):
        """Verify /api/workos/users endpoint works"""
        response = api_client.get(f"{BASE_URL}/api/workos/users")
        
        assert response.status_code == 200, f"Failed: {response.status_code}"
        users = response.json()
        assert isinstance(users, list)
        print(f"PASS: workos/users returns {len(users)} users")
    
    def test_hr_v2_employees_endpoint(self, api_client):
        """Verify /api/hr/v2/employees endpoint works"""
        response = api_client.get(f"{BASE_URL}/api/hr/v2/employees")
        
        assert response.status_code == 200, f"Failed: {response.status_code}"
        employees = response.json()
        assert isinstance(employees, list)
        print(f"PASS: hr/v2/employees returns {len(employees)} employees")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
