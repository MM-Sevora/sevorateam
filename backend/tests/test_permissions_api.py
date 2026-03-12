"""
Test cases for ownership-based permission system.
Verifies that _permissions object is correctly returned by:
- /api/sales/leads
- /api/sales/customers  
- /api/projects/list
"""

import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
TEST_EMAIL = "superadmin@sevora.com"
TEST_PASSWORD = "superadmin123"


@pytest.fixture(scope="module")
def auth_token():
    """Get authentication token"""
    response = requests.post(
        f"{BASE_URL}/api/auth/login",
        json={"email": TEST_EMAIL, "password": TEST_PASSWORD},
        headers={"Content-Type": "application/json"}
    )
    assert response.status_code == 200, f"Login failed: {response.text}"
    data = response.json()
    assert "access_token" in data, "No access_token in login response"
    return data["access_token"]


@pytest.fixture(scope="module")
def auth_headers(auth_token):
    """Get headers with auth token"""
    return {
        "Authorization": f"Bearer {auth_token}",
        "Content-Type": "application/json"
    }


class TestLeadsPermissions:
    """Test _permissions object in /api/sales/leads"""
    
    def test_leads_endpoint_returns_data(self, auth_headers):
        """Test that leads endpoint returns data"""
        response = requests.get(
            f"{BASE_URL}/api/sales/leads",
            headers=auth_headers
        )
        assert response.status_code == 200, f"Failed to get leads: {response.text}"
        leads = response.json()
        assert isinstance(leads, list), "Leads response should be a list"
        print(f"✓ Leads endpoint returned {len(leads)} leads")
    
    def test_leads_have_permissions_object(self, auth_headers):
        """Test that each lead has _permissions object"""
        response = requests.get(
            f"{BASE_URL}/api/sales/leads",
            headers=auth_headers
        )
        assert response.status_code == 200
        leads = response.json()
        
        if len(leads) == 0:
            pytest.skip("No leads to test")
        
        for lead in leads[:5]:  # Test first 5 leads
            assert "_permissions" in lead, f"Lead {lead.get('id')} missing _permissions object"
            perms = lead["_permissions"]
            
            # Check required permission fields
            assert "can_view" in perms, "Missing can_view in _permissions"
            assert "can_edit" in perms, "Missing can_edit in _permissions"
            assert "can_delete" in perms, "Missing can_delete in _permissions"
            assert "is_owner" in perms, "Missing is_owner in _permissions"
            assert "is_assigned" in perms, "Missing is_assigned in _permissions"
            
            # For super_admin, all permissions should be True
            assert perms["can_view"] == True, "can_view should be True for super_admin"
            assert perms["can_edit"] == True, "can_edit should be True for super_admin"
            assert perms["can_delete"] == True, "can_delete should be True for super_admin"
            
            print(f"✓ Lead {lead.get('id')[:8]}... has valid _permissions: {perms}")
        
        print(f"✓ All tested leads have correct _permissions object")


class TestCustomersPermissions:
    """Test _permissions object in /api/sales/customers"""
    
    def test_customers_endpoint_returns_data(self, auth_headers):
        """Test that customers endpoint returns data"""
        response = requests.get(
            f"{BASE_URL}/api/sales/customers",
            headers=auth_headers
        )
        assert response.status_code == 200, f"Failed to get customers: {response.text}"
        customers = response.json()
        assert isinstance(customers, list), "Customers response should be a list"
        print(f"✓ Customers endpoint returned {len(customers)} customers")
    
    def test_customers_have_permissions_object(self, auth_headers):
        """Test that each customer has _permissions object"""
        response = requests.get(
            f"{BASE_URL}/api/sales/customers",
            headers=auth_headers
        )
        assert response.status_code == 200
        customers = response.json()
        
        if len(customers) == 0:
            pytest.skip("No customers to test")
        
        for customer in customers[:5]:  # Test first 5 customers
            assert "_permissions" in customer, f"Customer {customer.get('id')} missing _permissions object"
            perms = customer["_permissions"]
            
            # Check required permission fields
            assert "can_view" in perms, "Missing can_view in _permissions"
            assert "can_edit" in perms, "Missing can_edit in _permissions"
            assert "can_delete" in perms, "Missing can_delete in _permissions"
            assert "is_owner" in perms, "Missing is_owner in _permissions"
            assert "is_assigned" in perms, "Missing is_assigned in _permissions"
            
            # For super_admin, all permissions should be True
            assert perms["can_view"] == True, "can_view should be True for super_admin"
            assert perms["can_edit"] == True, "can_edit should be True for super_admin"
            assert perms["can_delete"] == True, "can_delete should be True for super_admin"
            
            print(f"✓ Customer {customer.get('id')[:8]}... has valid _permissions: {perms}")
        
        print(f"✓ All tested customers have correct _permissions object")


class TestProjectsPermissions:
    """Test _permissions object in /api/projects/list"""
    
    def test_projects_endpoint_returns_data(self, auth_headers):
        """Test that projects endpoint returns data"""
        response = requests.get(
            f"{BASE_URL}/api/projects/list",
            headers=auth_headers
        )
        assert response.status_code == 200, f"Failed to get projects: {response.text}"
        projects = response.json()
        assert isinstance(projects, list), "Projects response should be a list"
        print(f"✓ Projects endpoint returned {len(projects)} projects")
    
    def test_projects_have_permissions_object(self, auth_headers):
        """Test that each project has _permissions object"""
        response = requests.get(
            f"{BASE_URL}/api/projects/list",
            headers=auth_headers
        )
        assert response.status_code == 200
        projects = response.json()
        
        if len(projects) == 0:
            pytest.skip("No projects to test")
        
        for project in projects[:5]:  # Test first 5 projects
            assert "_permissions" in project, f"Project {project.get('id')} missing _permissions object"
            perms = project["_permissions"]
            
            # Check required permission fields
            assert "can_view" in perms, "Missing can_view in _permissions"
            assert "can_edit" in perms, "Missing can_edit in _permissions"
            assert "can_delete" in perms, "Missing can_delete in _permissions"
            assert "is_owner" in perms, "Missing is_owner in _permissions"
            
            # Projects also have is_pm and is_team_member
            assert "is_pm" in perms, "Missing is_pm in _permissions"
            assert "is_team_member" in perms, "Missing is_team_member in _permissions"
            
            # For super_admin, all permissions should be True
            assert perms["can_view"] == True, "can_view should be True for super_admin"
            assert perms["can_edit"] == True, "can_edit should be True for super_admin"
            assert perms["can_delete"] == True, "can_delete should be True for super_admin"
            
            print(f"✓ Project {project.get('name', project.get('id')[:8])} has valid _permissions: {perms}")
        
        print(f"✓ All tested projects have correct _permissions object")


class TestPermissionsIntegration:
    """Integration tests for permission system"""
    
    def test_all_three_apis_return_permissions(self, auth_headers):
        """Verify all three APIs return _permissions object"""
        apis_tested = 0
        
        # Test Leads
        response = requests.get(f"{BASE_URL}/api/sales/leads", headers=auth_headers)
        assert response.status_code == 200, "Leads API failed"
        leads = response.json()
        if leads:
            assert "_permissions" in leads[0], "Leads missing _permissions"
            apis_tested += 1
            print("✓ Leads API returns _permissions")
        else:
            print("⚠ No leads data to verify")
        
        # Test Customers
        response = requests.get(f"{BASE_URL}/api/sales/customers", headers=auth_headers)
        assert response.status_code == 200, "Customers API failed"
        customers = response.json()
        if customers:
            assert "_permissions" in customers[0], "Customers missing _permissions"
            apis_tested += 1
            print("✓ Customers API returns _permissions")
        else:
            print("⚠ No customers data to verify")
        
        # Test Projects
        response = requests.get(f"{BASE_URL}/api/projects/list", headers=auth_headers)
        assert response.status_code == 200, "Projects API failed"
        projects = response.json()
        if projects:
            assert "_permissions" in projects[0], "Projects missing _permissions"
            apis_tested += 1
            print("✓ Projects API returns _permissions")
        else:
            print("⚠ No projects data to verify")
        
        print(f"\n✓ {apis_tested}/3 APIs verified with _permissions object")
        assert apis_tested >= 1, "At least one API should have data to test"


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
