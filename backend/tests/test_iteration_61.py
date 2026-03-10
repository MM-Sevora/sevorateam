"""
Iteration 61 Test Suite
Testing key features after technical debt cleanup and TaskStatus enum fix:
- Login flow
- Sourcing module (Brands, Suppliers, Manufacturers)
- Marketing module (Campaigns)
- Sales module (Leads, Customers)
- Project Tasks
- Team Performance Dashboard
- Operational Tasks
"""

import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
TEST_EMAIL = "superadmin@sevora.com"
TEST_PASSWORD = "superadmin123"

class TestAuthenticationFlow:
    """Test login flow with superadmin credentials"""
    
    def test_health_check(self):
        """Verify API is healthy"""
        response = requests.get(f"{BASE_URL}/api/health")
        assert response.status_code == 200
        data = response.json()
        assert data.get("status") == "healthy"
        print("✓ Health check passed")
    
    def test_login_success(self):
        """Test login with superadmin credentials"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": TEST_EMAIL, "password": TEST_PASSWORD}
        )
        assert response.status_code == 200
        data = response.json()
        assert "access_token" in data
        assert "user" in data
        assert data["user"]["email"] == TEST_EMAIL
        assert data["user"]["role"] == "super_admin"
        print(f"✓ Login successful for {TEST_EMAIL}")


@pytest.fixture(scope="module")
def auth_token():
    """Get authentication token for all tests"""
    response = requests.post(
        f"{BASE_URL}/api/auth/login",
        json={"email": TEST_EMAIL, "password": TEST_PASSWORD}
    )
    if response.status_code == 200:
        return response.json().get("access_token")
    pytest.skip("Authentication failed")


@pytest.fixture(scope="module")
def auth_headers(auth_token):
    """Get headers with authorization"""
    return {
        "Authorization": f"Bearer {auth_token}",
        "Content-Type": "application/json"
    }


class TestSourcingModule:
    """Test Sourcing module - Brands, Suppliers, Manufacturers"""
    
    def test_brands_list(self, auth_headers):
        """Test Brands list loads"""
        response = requests.get(
            f"{BASE_URL}/api/sourcing/brands",
            headers=auth_headers
        )
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"✓ Brands list loaded ({len(data)} brands)")
    
    def test_suppliers_list(self, auth_headers):
        """Test Suppliers list loads"""
        response = requests.get(
            f"{BASE_URL}/api/sourcing/suppliers",
            headers=auth_headers
        )
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"✓ Suppliers list loaded ({len(data)} suppliers)")
    
    def test_manufacturers_list(self, auth_headers):
        """Test Manufacturers list loads"""
        response = requests.get(
            f"{BASE_URL}/api/sourcing/manufacturers",
            headers=auth_headers
        )
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"✓ Manufacturers list loaded ({len(data)} manufacturers)")


class TestMarketingModule:
    """Test Marketing module - Campaigns"""
    
    def test_campaigns_list(self, auth_headers):
        """Test Campaigns list loads"""
        response = requests.get(
            f"{BASE_URL}/api/marketing/campaigns",
            headers=auth_headers
        )
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"✓ Campaigns list loaded ({len(data)} campaigns)")


class TestSalesModule:
    """Test Sales module - Leads, Customers"""
    
    def test_leads_list(self, auth_headers):
        """Test Leads list loads"""
        response = requests.get(
            f"{BASE_URL}/api/sales/leads",
            headers=auth_headers
        )
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"✓ Leads list loaded ({len(data)} leads)")
    
    def test_customers_list(self, auth_headers):
        """Test Customers list loads"""
        response = requests.get(
            f"{BASE_URL}/api/sales/customers",
            headers=auth_headers
        )
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"✓ Customers list loaded ({len(data)} customers)")


class TestProjectTasks:
    """Test Project Tasks - this was returning 500 due to TaskStatus enum issue"""
    
    def test_project_tasks_all_list(self, auth_headers):
        """Test project tasks /all endpoint loads without 500 error"""
        response = requests.get(
            f"{BASE_URL}/api/projects/tasks/all",
            headers=auth_headers
        )
        # Should NOT be 500
        assert response.status_code != 500, f"Got 500 error: {response.text}"
        assert response.status_code == 200
        data = response.json()
        # Response should be a list
        assert isinstance(data, list)
        print(f"✓ Project tasks/all loaded ({len(data)} tasks)")
        
        # Verify 'todo' status tasks are returned correctly (TaskStatus enum fix)
        todo_tasks = [t for t in data if t.get('status') == 'todo']
        print(f"✓ Found {len(todo_tasks)} tasks with 'todo' status")
    
    def test_my_tasks(self, auth_headers):
        """Test my tasks endpoint"""
        response = requests.get(
            f"{BASE_URL}/api/projects/tasks/my-tasks",
            headers=auth_headers
        )
        # This should work without 500 error
        assert response.status_code != 500, f"Got 500 error: {response.text}"
        print(f"✓ My tasks endpoint status: {response.status_code}")


class TestTeamPerformanceDashboard:
    """Test Team Performance Dashboard - /analytics"""
    
    def test_team_performance(self, auth_headers):
        """Test team performance endpoint loads"""
        response = requests.get(
            f"{BASE_URL}/api/tasks/team-performance",
            headers=auth_headers
        )
        assert response.status_code == 200
        data = response.json()
        assert "period" in data or "team_members" in data
        print(f"✓ Team performance loaded")
    
    def test_dashboard_stats(self, auth_headers):
        """Test dashboard stats endpoint"""
        response = requests.get(
            f"{BASE_URL}/api/tasks/dashboard-stats",
            headers=auth_headers
        )
        assert response.status_code == 200
        data = response.json()
        assert "by_status" in data or "total" in data
        print(f"✓ Dashboard stats loaded")


class TestOperationalTasks:
    """Test Operational Tasks - /tasks"""
    
    def test_tasks_list(self, auth_headers):
        """Test unified tasks list loads"""
        response = requests.get(
            f"{BASE_URL}/api/tasks",
            headers=auth_headers
        )
        assert response.status_code == 200
        data = response.json()
        assert "tasks" in data or isinstance(data, list)
        print(f"✓ Operational tasks loaded")
    
    def test_tasks_my_tasks(self, auth_headers):
        """Test my operational tasks endpoint"""
        response = requests.get(
            f"{BASE_URL}/api/tasks/my-tasks",
            headers=auth_headers
        )
        assert response.status_code == 200
        print(f"✓ My operational tasks loaded")


class TestEntityIntegrations:
    """Test Entity Integration Check API"""
    
    def test_integration_check_endpoint(self, auth_headers):
        """Test integration check endpoint works"""
        response = requests.post(
            f"{BASE_URL}/api/integrations/check-entity",
            headers=auth_headers,
            json={
                "module": "sourcing",
                "entity_type": "brand",
                "entity_id": "test-123",
                "entity_name": "Test Brand"
            }
        )
        assert response.status_code == 200
        data = response.json()
        assert "entity_module" in data
        assert "entity_type" in data
        print(f"✓ Integration check endpoint works")
    
    def test_available_integrations(self, auth_headers):
        """Test available integrations endpoint"""
        response = requests.get(
            f"{BASE_URL}/api/integrations/available/sourcing/brand",
            headers=auth_headers
        )
        assert response.status_code == 200
        data = response.json()
        assert "module" in data or "integrations" in data
        print(f"✓ Available integrations endpoint works")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
