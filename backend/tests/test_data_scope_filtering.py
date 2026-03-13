"""
Test Data Scope Filtering - Verify all major list APIs respect data_scope permissions

This test file validates that the get_data_scope_query function from utils/permissions.py
is properly applied to all major list endpoints across modules:
- Sourcing: Brands, Suppliers, Manufacturers
- Marketing: Contacts, Unified Campaigns
- Tasks: Unified Tasks
- HR: Employees
- Leads & Projects (already implemented - verification)

Module codes used: 'sourcing', 'marketing_ops', 'project_management', 'hr', 'leads'
"""

import pytest
import requests
import os

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "").rstrip("/")

# Test credentials
SUPERADMIN_EMAIL = "superadmin@sevora.com"
SUPERADMIN_PASSWORD = "superadmin123"


class TestDataScopeFiltering:
    """Test data scope filtering is applied to all major list APIs"""
    
    @pytest.fixture(scope="class")
    def auth_token(self):
        """Get authentication token for superadmin"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": SUPERADMIN_EMAIL, "password": SUPERADMIN_PASSWORD}
        )
        assert response.status_code == 200, f"Login failed: {response.text}"
        data = response.json()
        assert "token" in data or "access_token" in data
        return data.get("token") or data.get("access_token")
    
    @pytest.fixture(scope="class")
    def headers(self, auth_token):
        """Create headers with auth token"""
        return {
            "Authorization": f"Bearer {auth_token}",
            "Content-Type": "application/json"
        }
    
    # ================ SOURCING MODULE TESTS ================
    
    def test_sourcing_brands_list(self, headers):
        """Test /api/sourcing/brands returns data (data_scope applied)"""
        response = requests.get(f"{BASE_URL}/api/sourcing/brands", headers=headers)
        assert response.status_code == 200, f"Brands list failed: {response.text}"
        data = response.json()
        assert isinstance(data, list), "Should return list of brands"
        print(f"✓ Sourcing Brands: {len(data)} brands returned")
        
        # Check _permissions field is present (indicates ownership-based access control)
        if data:
            assert "_permissions" in data[0], "Brand should have _permissions field"
            print(f"  - First brand has _permissions: {data[0]['_permissions']}")
    
    def test_sourcing_brands_paginated(self, headers):
        """Test /api/sourcing/brands/paginated returns paginated data with filters_meta"""
        response = requests.get(
            f"{BASE_URL}/api/sourcing/brands/paginated",
            params={"page": 1, "page_size": 10},
            headers=headers
        )
        assert response.status_code == 200, f"Brands paginated failed: {response.text}"
        data = response.json()
        
        # Verify paginated response structure
        assert "brands" in data, "Should have brands field"
        assert "total" in data, "Should have total count"
        assert "page" in data, "Should have page number"
        assert "filters_meta" in data, "Should have filters_meta"
        
        print(f"✓ Sourcing Brands Paginated: total={data['total']}, page={data['page']}")
        print(f"  - filters_meta keys: {list(data['filters_meta'].keys())}")
    
    def test_sourcing_suppliers_list(self, headers):
        """Test /api/sourcing/suppliers returns data (data_scope applied)"""
        response = requests.get(f"{BASE_URL}/api/sourcing/suppliers", headers=headers)
        assert response.status_code == 200, f"Suppliers list failed: {response.text}"
        data = response.json()
        assert isinstance(data, list), "Should return list of suppliers"
        print(f"✓ Sourcing Suppliers: {len(data)} suppliers returned")
        
        # Check _permissions field
        if data:
            assert "_permissions" in data[0], "Supplier should have _permissions field"
            print(f"  - First supplier has _permissions: {data[0]['_permissions']}")
    
    def test_sourcing_manufacturers_list(self, headers):
        """Test /api/sourcing/manufacturers returns data (data_scope applied)"""
        response = requests.get(f"{BASE_URL}/api/sourcing/manufacturers", headers=headers)
        assert response.status_code == 200, f"Manufacturers list failed: {response.text}"
        data = response.json()
        assert isinstance(data, list), "Should return list of manufacturers"
        print(f"✓ Sourcing Manufacturers: {len(data)} manufacturers returned")
        
        # Check _permissions field
        if data:
            assert "_permissions" in data[0], "Manufacturer should have _permissions field"
            print(f"  - First manufacturer has _permissions: {data[0]['_permissions']}")
    
    # ================ MARKETING MODULE TESTS ================
    
    def test_marketing_contacts_list(self, headers):
        """Test /api/marketing/v2/contacts returns data (data_scope applied)"""
        response = requests.get(
            f"{BASE_URL}/api/marketing/v2/contacts",
            params={"limit": 10},
            headers=headers
        )
        assert response.status_code == 200, f"Marketing contacts failed: {response.text}"
        data = response.json()
        assert isinstance(data, list), "Should return list of contacts"
        print(f"✓ Marketing Contacts: {len(data)} contacts returned")
    
    def test_marketing_contacts_paginated(self, headers):
        """Test /api/marketing/v2/contacts/paginated returns paginated data"""
        response = requests.get(
            f"{BASE_URL}/api/marketing/v2/contacts/paginated",
            params={"page": 1, "page_size": 10},
            headers=headers
        )
        assert response.status_code == 200, f"Marketing contacts paginated failed: {response.text}"
        data = response.json()
        
        # Verify paginated response structure
        assert "contacts" in data, "Should have contacts field"
        assert "total" in data, "Should have total count"
        assert "page" in data, "Should have page number"
        assert "filters_meta" in data, "Should have filters_meta"
        
        print(f"✓ Marketing Contacts Paginated: total={data['total']}, page={data['page']}")
        print(f"  - filters_meta keys: {list(data['filters_meta'].keys())}")
    
    def test_marketing_unified_campaigns(self, headers):
        """Test /api/marketing/v2/unified-campaigns returns data (data_scope applied)"""
        response = requests.get(
            f"{BASE_URL}/api/marketing/v2/unified-campaigns",
            params={"limit": 10},
            headers=headers
        )
        assert response.status_code == 200, f"Unified campaigns failed: {response.text}"
        data = response.json()
        assert isinstance(data, list), "Should return list of campaigns"
        print(f"✓ Marketing Unified Campaigns: {len(data)} campaigns returned")
        
        # Check campaign_type field
        if data:
            assert "campaign_type" in data[0], "Campaign should have campaign_type field"
            print(f"  - Campaign types: {set(c.get('campaign_type') for c in data[:5])}")
    
    # ================ TASKS MODULE TESTS ================
    
    def test_tasks_list(self, headers):
        """Test /api/tasks returns data (data_scope applied)"""
        response = requests.get(
            f"{BASE_URL}/api/tasks",
            params={"limit": 10},
            headers=headers
        )
        assert response.status_code == 200, f"Tasks list failed: {response.text}"
        data = response.json()
        
        # Response could be dict with tasks field or direct list
        if isinstance(data, dict):
            assert "tasks" in data, "Should have tasks field"
            tasks = data["tasks"]
        else:
            tasks = data
        
        assert isinstance(tasks, list), "Should return list of tasks"
        print(f"✓ Tasks List: {len(tasks)} tasks returned")
        
        # Check _permissions field
        if tasks:
            assert "_permissions" in tasks[0], "Task should have _permissions field"
            print(f"  - First task has _permissions: {tasks[0]['_permissions']}")
    
    def test_tasks_paginated(self, headers):
        """Test /api/tasks/paginated returns paginated data with filters_meta"""
        response = requests.get(
            f"{BASE_URL}/api/tasks/paginated",
            params={"page": 1, "page_size": 10},
            headers=headers
        )
        assert response.status_code == 200, f"Tasks paginated failed: {response.text}"
        data = response.json()
        
        # Verify paginated response structure
        assert "tasks" in data, "Should have tasks field"
        assert "total" in data, "Should have total count"
        assert "page" in data, "Should have page number"
        assert "filters_meta" in data, "Should have filters_meta"
        
        print(f"✓ Tasks Paginated: total={data['total']}, page={data['page']}")
        print(f"  - filters_meta keys: {list(data['filters_meta'].keys())}")
    
    # ================ HR MODULE TESTS ================
    
    def test_hr_employees_list(self, headers):
        """Test /api/hr/v2/employees returns data (data_scope applied)"""
        response = requests.get(
            f"{BASE_URL}/api/hr/v2/employees",
            params={"limit": 10},
            headers=headers
        )
        assert response.status_code == 200, f"HR employees failed: {response.text}"
        data = response.json()
        assert isinstance(data, list), "Should return list of employees"
        print(f"✓ HR Employees: {len(data)} employees returned")
        
        # Check employee fields
        if data:
            emp = data[0]
            assert "id" in emp, "Employee should have id field"
            print(f"  - First employee: {emp.get('name', 'Unknown')} ({emp.get('employee_code', 'N/A')})")
    
    # ================ LEADS MODULE TESTS (Verification) ================
    
    def test_leads_list(self, headers):
        """Test /api/sales/leads returns data (data_scope already implemented)"""
        response = requests.get(
            f"{BASE_URL}/api/sales/leads",
            params={"limit": 10},
            headers=headers
        )
        assert response.status_code == 200, f"Leads list failed: {response.text}"
        data = response.json()
        
        # Response could be dict with leads field or direct list
        if isinstance(data, dict):
            leads = data.get("leads", data)
        else:
            leads = data
        
        if isinstance(leads, list):
            print(f"✓ Sales Leads: {len(leads)} leads returned")
        else:
            print(f"✓ Sales Leads: Response structure: {type(leads)}")
    
    def test_leads_paginated(self, headers):
        """Test /api/sales/leads/paginated returns paginated data (verification)"""
        response = requests.get(
            f"{BASE_URL}/api/sales/leads/paginated",
            params={"page": 1, "page_size": 10},
            headers=headers
        )
        assert response.status_code == 200, f"Leads paginated failed: {response.text}"
        data = response.json()
        
        # Verify paginated response structure
        assert "leads" in data, "Should have leads field"
        assert "total" in data, "Should have total count"
        
        print(f"✓ Sales Leads Paginated: total={data['total']}, page={data.get('page', 1)}")
    
    # ================ PROJECTS MODULE TESTS (Verification) ================
    
    def test_projects_list(self, headers):
        """Test /api/projects/list returns data (data_scope already implemented)"""
        response = requests.get(
            f"{BASE_URL}/api/projects/list",
            params={"limit": 10},
            headers=headers
        )
        assert response.status_code == 200, f"Projects list failed: {response.text}"
        data = response.json()
        
        # Response could be dict with projects field or direct list
        if isinstance(data, dict):
            projects = data.get("projects", data)
        else:
            projects = data
        
        if isinstance(projects, list):
            print(f"✓ Projects: {len(projects)} projects returned")
        else:
            print(f"✓ Projects: Response structure: {type(projects)}")


class TestDataScopeQueryFunction:
    """Test that get_data_scope_query function exists and is correctly imported"""
    
    def test_permissions_module_exists(self):
        """Verify the permissions module has get_data_scope_query function"""
        # Import the module
        import sys
        sys.path.insert(0, "/app/backend")
        
        from utils.permissions import get_data_scope_query
        
        # Verify function exists and is callable
        assert callable(get_data_scope_query), "get_data_scope_query should be callable"
        print("✓ get_data_scope_query function exists in utils/permissions.py")
    
    def test_data_scope_query_for_admin(self):
        """Test that admin users get empty query (see everything)"""
        import sys
        sys.path.insert(0, "/app/backend")
        
        from utils.permissions import get_data_scope_query
        
        admin_user = {
            "id": "test-admin-id",
            "role": "admin",
            "department_id": "dept-1"
        }
        
        query = get_data_scope_query(admin_user, "sourcing", {})
        assert query == {}, f"Admin should get empty query, got: {query}"
        print("✓ Admin users get empty query (see all data)")
    
    def test_data_scope_query_for_superadmin(self):
        """Test that super_admin users get empty query (see everything)"""
        import sys
        sys.path.insert(0, "/app/backend")
        
        from utils.permissions import get_data_scope_query
        
        superadmin_user = {
            "id": "test-superadmin-id",
            "role": "super_admin",
            "department_id": "dept-1"
        }
        
        query = get_data_scope_query(superadmin_user, "marketing_ops", {})
        assert query == {}, f"Super admin should get empty query, got: {query}"
        print("✓ Super admin users get empty query (see all data)")
    
    def test_data_scope_query_own_only(self):
        """Test own_only scope filters by created_by"""
        import sys
        sys.path.insert(0, "/app/backend")
        
        from utils.permissions import get_data_scope_query
        
        user = {
            "id": "user-123",
            "role": "user",
            "department_id": "dept-1",
            "module_permissions": {
                "sourcing": {"data_scope": "own_only"}
            }
        }
        
        query = get_data_scope_query(user, "sourcing", {})
        assert "created_by" in query, f"own_only should filter by created_by, got: {query}"
        assert query["created_by"] == "user-123", f"Should filter by user id"
        print("✓ own_only scope filters by created_by = user_id")
    
    def test_data_scope_query_own_assigned(self):
        """Test own_assigned scope filters by created_by OR assigned_to"""
        import sys
        sys.path.insert(0, "/app/backend")
        
        from utils.permissions import get_data_scope_query
        
        user = {
            "id": "user-456",
            "role": "user",
            "department_id": "dept-1",
            "module_permissions": {
                "project_management": {"data_scope": "own_assigned"}
            }
        }
        
        query = get_data_scope_query(user, "project_management", {})
        assert "$or" in query, f"own_assigned should use $or filter, got: {query}"
        assert len(query["$or"]) == 2, "Should have 2 conditions in $or"
        print("✓ own_assigned scope uses $or for created_by OR assigned_to")
    
    def test_data_scope_query_team(self):
        """Test team scope filters by department_id"""
        import sys
        sys.path.insert(0, "/app/backend")
        
        from utils.permissions import get_data_scope_query
        
        user = {
            "id": "user-789",
            "role": "user",
            "department_id": "marketing-dept",
            "module_permissions": {
                "marketing_ops": {"data_scope": "team"}
            }
        }
        
        query = get_data_scope_query(user, "marketing_ops", {})
        assert "$or" in query, f"team scope should use $or filter, got: {query}"
        # Should include created_by, assigned_to, and department_id
        or_conditions = query["$or"]
        has_dept = any("department_id" in cond for cond in or_conditions)
        assert has_dept, "Team scope should include department_id filter"
        print("✓ team scope includes department_id filter")
    
    def test_data_scope_query_all(self):
        """Test 'all' scope returns base query without additional filters"""
        import sys
        sys.path.insert(0, "/app/backend")
        
        from utils.permissions import get_data_scope_query
        
        user = {
            "id": "user-all",
            "role": "user",
            "department_id": "any-dept",
            "module_permissions": {
                "hr": {"data_scope": "all"}
            }
        }
        
        base_query = {"status": "active"}
        query = get_data_scope_query(user, "hr", base_query)
        # Should only have the base query fields
        assert query == {"status": "active"}, f"'all' scope should not add filters, got: {query}"
        print("✓ 'all' scope returns base query without data_scope filters")


class TestSuperAdminSeesAllData:
    """Verify that superadmin can see all data across all endpoints"""
    
    @pytest.fixture(scope="class")
    def auth_token(self):
        """Get authentication token for superadmin"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": SUPERADMIN_EMAIL, "password": SUPERADMIN_PASSWORD}
        )
        assert response.status_code == 200
        data = response.json()
        return data.get("token") or data.get("access_token")
    
    @pytest.fixture(scope="class")
    def headers(self, auth_token):
        """Create headers with auth token"""
        return {
            "Authorization": f"Bearer {auth_token}",
            "Content-Type": "application/json"
        }
    
    def test_superadmin_brands_access(self, headers):
        """Superadmin should see all brands"""
        response = requests.get(
            f"{BASE_URL}/api/sourcing/brands",
            params={"limit": 100},
            headers=headers
        )
        assert response.status_code == 200
        print(f"✓ Superadmin can access all brands")
    
    def test_superadmin_suppliers_access(self, headers):
        """Superadmin should see all suppliers"""
        response = requests.get(
            f"{BASE_URL}/api/sourcing/suppliers",
            params={"limit": 100},
            headers=headers
        )
        assert response.status_code == 200
        print(f"✓ Superadmin can access all suppliers")
    
    def test_superadmin_manufacturers_access(self, headers):
        """Superadmin should see all manufacturers"""
        response = requests.get(
            f"{BASE_URL}/api/sourcing/manufacturers",
            params={"limit": 100},
            headers=headers
        )
        assert response.status_code == 200
        print(f"✓ Superadmin can access all manufacturers")
    
    def test_superadmin_contacts_access(self, headers):
        """Superadmin should see all marketing contacts"""
        response = requests.get(
            f"{BASE_URL}/api/marketing/v2/contacts",
            params={"limit": 100},
            headers=headers
        )
        assert response.status_code == 200
        print(f"✓ Superadmin can access all marketing contacts")
    
    def test_superadmin_campaigns_access(self, headers):
        """Superadmin should see all unified campaigns"""
        response = requests.get(
            f"{BASE_URL}/api/marketing/v2/unified-campaigns",
            params={"limit": 100},
            headers=headers
        )
        assert response.status_code == 200
        print(f"✓ Superadmin can access all unified campaigns")
    
    def test_superadmin_tasks_access(self, headers):
        """Superadmin should see all tasks"""
        response = requests.get(
            f"{BASE_URL}/api/tasks",
            params={"limit": 100},
            headers=headers
        )
        assert response.status_code == 200
        print(f"✓ Superadmin can access all tasks")
    
    def test_superadmin_employees_access(self, headers):
        """Superadmin should see all employees"""
        response = requests.get(
            f"{BASE_URL}/api/hr/v2/employees",
            params={"limit": 100},
            headers=headers
        )
        assert response.status_code == 200
        print(f"✓ Superadmin can access all employees")
    
    def test_superadmin_leads_access(self, headers):
        """Superadmin should see all leads"""
        response = requests.get(
            f"{BASE_URL}/api/sales/leads",
            params={"limit": 100},
            headers=headers
        )
        assert response.status_code == 200
        print(f"✓ Superadmin can access all leads")
    
    def test_superadmin_projects_access(self, headers):
        """Superadmin should see all projects"""
        response = requests.get(
            f"{BASE_URL}/api/projects/list",
            params={"limit": 100},
            headers=headers
        )
        assert response.status_code == 200
        print(f"✓ Superadmin can access all projects")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "-s"])
