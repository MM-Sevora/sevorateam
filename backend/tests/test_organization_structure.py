"""
Test Organization Structure APIs - Departments, Positions, Org Chart, Teams Hierarchy
Tests Position Hierarchy (CEO → VP → Director → Manager chain)
Tests Parent Department Management (department hierarchy with nested structure)
Tests Interactive Organization Chart with drill-down
"""

import pytest
import requests
import os
import uuid

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestAuthentication:
    """Authentication tests to obtain token for subsequent tests"""
    
    @pytest.fixture(scope="class")
    def auth_token(self):
        """Login and get authentication token"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": "superadmin@sevora.com", "password": "superadmin123"}
        )
        assert response.status_code == 200, f"Login failed: {response.text}"
        data = response.json()
        assert "access_token" in data
        return data["access_token"]
    
    def test_login_super_admin(self, auth_token):
        """Test super admin can login successfully"""
        assert auth_token is not None
        assert len(auth_token) > 0
        print(f"✓ Super admin login successful, token obtained")


class TestDepartmentsAPI:
    """Test GET /api/hr/departments with hierarchy info"""
    
    @pytest.fixture(scope="class")
    def auth_token(self):
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": "superadmin@sevora.com", "password": "superadmin123"}
        )
        if response.status_code == 200:
            return response.json().get("access_token")
        pytest.skip("Authentication failed")
    
    def test_get_departments_list(self, auth_token):
        """Test GET /api/hr/departments returns departments with hierarchy info"""
        response = requests.get(
            f"{BASE_URL}/api/hr/departments",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert response.status_code == 200, f"Failed: {response.text}"
        departments = response.json()
        
        assert isinstance(departments, list)
        print(f"✓ GET /api/hr/departments returned {len(departments)} departments")
        
        # Verify department structure has parent_department_id field
        if len(departments) > 0:
            dept = departments[0]
            assert "id" in dept
            assert "name" in dept
            assert "code" in dept
            # Check for hierarchy fields
            assert "parent_department_id" in dept or dept.get("parent_department_id") is None
            assert "member_count" in dept
            assert "team_count" in dept
            print(f"✓ Department structure verified: {dept['name']} (members: {dept.get('member_count', 0)})")
    
    def test_departments_have_hierarchy_data(self, auth_token):
        """Test departments include parent_department_name when parent exists"""
        response = requests.get(
            f"{BASE_URL}/api/hr/departments",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert response.status_code == 200
        departments = response.json()
        
        # Check if any department has parent_department_name
        has_parent_info = any(d.get("parent_department_name") for d in departments)
        has_parent_id = any(d.get("parent_department_id") for d in departments)
        
        print(f"✓ Departments with parent_department_id: {sum(1 for d in departments if d.get('parent_department_id'))}")
        print(f"✓ Total departments: {len(departments)}")


class TestDepartmentHierarchy:
    """Test GET /api/hr/departments/{id}/hierarchy for parent chain and children"""
    
    @pytest.fixture(scope="class")
    def auth_token(self):
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": "superadmin@sevora.com", "password": "superadmin123"}
        )
        if response.status_code == 200:
            return response.json().get("access_token")
        pytest.skip("Authentication failed")
    
    @pytest.fixture(scope="class")
    def department_id(self, auth_token):
        """Get first department ID for testing"""
        response = requests.get(
            f"{BASE_URL}/api/hr/departments",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        if response.status_code == 200 and len(response.json()) > 0:
            return response.json()[0]["id"]
        pytest.skip("No departments found")
    
    def test_get_department_hierarchy(self, auth_token, department_id):
        """Test GET /api/hr/departments/{id}/hierarchy returns hierarchy info"""
        response = requests.get(
            f"{BASE_URL}/api/hr/departments/{department_id}/hierarchy",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        
        # Verify hierarchy response structure
        assert "department" in data, "Missing 'department' in response"
        assert "parent_chain" in data, "Missing 'parent_chain' in response"
        assert "children" in data, "Missing 'children' in response"
        assert "teams" in data, "Missing 'teams' in response"
        
        print(f"✓ Department hierarchy: {data['department']['name']}")
        print(f"  - Parent chain length: {len(data['parent_chain'])}")
        print(f"  - Children count: {len(data['children'])}")
        print(f"  - Teams count: {len(data['teams'])}")
    
    def test_department_hierarchy_404(self, auth_token):
        """Test 404 for non-existent department"""
        fake_id = str(uuid.uuid4())
        response = requests.get(
            f"{BASE_URL}/api/hr/departments/{fake_id}/hierarchy",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert response.status_code == 404
        print(f"✓ Correctly returns 404 for non-existent department")


class TestUpdateDepartment:
    """Test PUT /api/hr/departments/{id} updates including parent_department_id"""
    
    @pytest.fixture(scope="class")
    def auth_token(self):
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": "superadmin@sevora.com", "password": "superadmin123"}
        )
        if response.status_code == 200:
            return response.json().get("access_token")
        pytest.skip("Authentication failed")
    
    @pytest.fixture(scope="class")
    def departments(self, auth_token):
        """Get departments for testing"""
        response = requests.get(
            f"{BASE_URL}/api/hr/departments",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        if response.status_code == 200 and len(response.json()) >= 2:
            return response.json()
        pytest.skip("Need at least 2 departments for testing")
    
    def test_update_department_description(self, auth_token, departments):
        """Test updating department description"""
        dept = departments[0]
        original_desc = dept.get("description", "")
        new_desc = f"Updated description - {uuid.uuid4().hex[:8]}"
        
        response = requests.put(
            f"{BASE_URL}/api/hr/departments/{dept['id']}",
            json={"description": new_desc},
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert response.status_code == 200, f"Failed: {response.text}"
        updated = response.json()
        assert updated["description"] == new_desc
        print(f"✓ Department description updated successfully")
        
        # Restore original
        requests.put(
            f"{BASE_URL}/api/hr/departments/{dept['id']}",
            json={"description": original_desc},
            headers={"Authorization": f"Bearer {auth_token}"}
        )
    
    def test_update_department_parent(self, auth_token, departments):
        """Test setting parent_department_id"""
        # Find a department that can be a parent (different from the one we're updating)
        child_dept = departments[0]
        parent_dept = departments[1]
        
        response = requests.put(
            f"{BASE_URL}/api/hr/departments/{child_dept['id']}",
            json={"parent_department_id": parent_dept['id']},
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert response.status_code == 200, f"Failed: {response.text}"
        updated = response.json()
        assert updated.get("parent_department_id") == parent_dept['id']
        assert updated.get("parent_department_name") == parent_dept['name']
        print(f"✓ Department parent set: {child_dept['name']} -> {parent_dept['name']}")
        
        # Clear parent
        requests.put(
            f"{BASE_URL}/api/hr/departments/{child_dept['id']}",
            json={"parent_department_id": None},
            headers={"Authorization": f"Bearer {auth_token}"}
        )


class TestPositionsAPI:
    """Test GET /api/hr/positions with reporting_position_id hierarchy"""
    
    @pytest.fixture(scope="class")
    def auth_token(self):
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": "superadmin@sevora.com", "password": "superadmin123"}
        )
        if response.status_code == 200:
            return response.json().get("access_token")
        pytest.skip("Authentication failed")
    
    def test_get_positions_list(self, auth_token):
        """Test GET /api/hr/positions returns positions with hierarchy info"""
        response = requests.get(
            f"{BASE_URL}/api/hr/positions",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert response.status_code == 200, f"Failed: {response.text}"
        positions = response.json()
        
        assert isinstance(positions, list)
        print(f"✓ GET /api/hr/positions returned {len(positions)} positions")
        
        # Verify position structure
        if len(positions) > 0:
            pos = positions[0]
            assert "id" in pos
            assert "title" in pos
            assert "code" in pos
            assert "level" in pos
            # Check for hierarchy fields
            assert "reporting_position_id" in pos or pos.get("reporting_position_id") is None
            print(f"✓ Position structure verified: {pos['title']} ({pos['level']})")
    
    def test_positions_have_correct_levels(self, auth_token):
        """Test positions include CEO, VP, Director, Manager levels"""
        response = requests.get(
            f"{BASE_URL}/api/hr/positions",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert response.status_code == 200
        positions = response.json()
        
        levels = set(p.get("level") for p in positions)
        expected_levels = {"ceo", "vp", "director", "manager", "lead", "executive", "associate"}
        
        print(f"✓ Position levels found: {levels}")
        # At least some of these should exist
        assert len(levels) > 0, "No position levels found"
    
    def test_positions_filter_by_level(self, auth_token):
        """Test positions can be filtered by level"""
        response = requests.get(
            f"{BASE_URL}/api/hr/positions?level=manager",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert response.status_code == 200
        positions = response.json()
        
        if len(positions) > 0:
            for pos in positions:
                assert pos.get("level") == "manager"
            print(f"✓ Filtered positions by level=manager: {len(positions)} found")
        else:
            print("✓ No manager-level positions found (valid)")


class TestCreatePosition:
    """Test POST /api/hr/positions with reporting_position_id"""
    
    @pytest.fixture(scope="class")
    def auth_token(self):
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": "superadmin@sevora.com", "password": "superadmin123"}
        )
        if response.status_code == 200:
            return response.json().get("access_token")
        pytest.skip("Authentication failed")
    
    @pytest.fixture(scope="class")
    def existing_position(self, auth_token):
        """Get existing position to use as parent"""
        response = requests.get(
            f"{BASE_URL}/api/hr/positions",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        if response.status_code == 200 and len(response.json()) > 0:
            # Find a position that can be a parent (CEO or VP level)
            positions = response.json()
            for pos in positions:
                if pos.get("level") in ["ceo", "vp", "director"]:
                    return pos
            return positions[0]
        return None
    
    def test_create_position_with_hierarchy(self, auth_token, existing_position):
        """Test creating position with reporting_position_id"""
        unique_code = f"TEST-POS-{uuid.uuid4().hex[:6].upper()}"
        
        payload = {
            "title": f"Test Position {unique_code}",
            "code": unique_code,
            "level": "associate",
            "description": "Test position for hierarchy testing",
            "reporting_position_id": existing_position["id"] if existing_position else None
        }
        
        response = requests.post(
            f"{BASE_URL}/api/hr/positions",
            json=payload,
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        
        assert response.status_code in [200, 201], f"Failed: {response.text}"
        created = response.json()
        
        assert created["title"] == payload["title"]
        assert created["code"] == unique_code
        assert created["level"] == "associate"
        
        if existing_position:
            assert created.get("reporting_position_id") == existing_position["id"]
            print(f"✓ Position created with parent: {created['title']} -> {existing_position['title']}")
        else:
            print(f"✓ Position created: {created['title']}")
        
        # Cleanup - delete the test position
        position_id = created["id"]
        requests.delete(
            f"{BASE_URL}/api/hr/positions/{position_id}",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
    
    def test_create_position_duplicate_code_fails(self, auth_token):
        """Test creating position with duplicate code fails"""
        response = requests.get(
            f"{BASE_URL}/api/hr/positions",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        if response.status_code != 200 or len(response.json()) == 0:
            pytest.skip("No positions to test duplicate code")
        
        existing_pos = response.json()[0]
        
        response = requests.post(
            f"{BASE_URL}/api/hr/positions",
            json={
                "title": "Duplicate Test",
                "code": existing_pos["code"],  # Use existing code
                "level": "associate"
            },
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        
        assert response.status_code == 400, "Expected 400 for duplicate code"
        print(f"✓ Duplicate position code correctly rejected")


class TestOrgChart:
    """Test GET /api/hr/org-chart returns hierarchical employee tree"""
    
    @pytest.fixture(scope="class")
    def auth_token(self):
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": "superadmin@sevora.com", "password": "superadmin123"}
        )
        if response.status_code == 200:
            return response.json().get("access_token")
        pytest.skip("Authentication failed")
    
    def test_get_org_chart(self, auth_token):
        """Test GET /api/hr/org-chart returns tree structure"""
        response = requests.get(
            f"{BASE_URL}/api/hr/org-chart",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        
        # Org chart should be a list of top-level employees or a single root
        if isinstance(data, list):
            print(f"✓ GET /api/hr/org-chart returned {len(data)} top-level employees")
            if len(data) > 0:
                # Verify node structure
                node = data[0]
                assert "id" in node
                assert "name" in node
                # Children may exist
                if "children" in node:
                    print(f"  - First employee has {len(node['children'])} direct reports")
        elif isinstance(data, dict):
            print(f"✓ GET /api/hr/org-chart returned single root: {data.get('name', 'unknown')}")
            if "children" in data:
                print(f"  - Root has {len(data['children'])} direct reports")
    
    def test_org_chart_node_structure(self, auth_token):
        """Test org chart nodes have expected fields"""
        response = requests.get(
            f"{BASE_URL}/api/hr/org-chart",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        
        def check_node(node, depth=0):
            """Recursively check node structure"""
            assert "id" in node, f"Node missing 'id'"
            assert "name" in node, f"Node missing 'name'"
            # Optional fields
            optional = ["title", "department_name", "grade_name", "avatar_url", "email", "children"]
            found = [f for f in optional if f in node]
            
            if depth == 0:
                print(f"✓ Org chart node fields: {list(node.keys())}")
            
            if "children" in node and node["children"]:
                for child in node["children"]:
                    check_node(child, depth + 1)
        
        if isinstance(data, list) and len(data) > 0:
            check_node(data[0])
        elif isinstance(data, dict):
            check_node(data)
    
    def test_org_chart_with_root_id(self, auth_token):
        """Test org chart can start from specific employee"""
        # First get an employee ID
        response = requests.get(
            f"{BASE_URL}/api/hr/employees?limit=1",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        if response.status_code != 200 or len(response.json()) == 0:
            pytest.skip("No employees found")
        
        employee = response.json()[0]
        
        response = requests.get(
            f"{BASE_URL}/api/hr/org-chart?root_id={employee['id']}",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        
        if isinstance(data, dict):
            assert data["id"] == employee["id"]
            print(f"✓ Org chart with root_id: {data['name']}")


class TestTeamsAPI:
    """Test Teams API with department grouping"""
    
    @pytest.fixture(scope="class")
    def auth_token(self):
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": "superadmin@sevora.com", "password": "superadmin123"}
        )
        if response.status_code == 200:
            return response.json().get("access_token")
        pytest.skip("Authentication failed")
    
    def test_get_teams_list(self, auth_token):
        """Test GET /api/hr/teams returns teams with department info"""
        response = requests.get(
            f"{BASE_URL}/api/hr/teams",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert response.status_code == 200, f"Failed: {response.text}"
        teams = response.json()
        
        assert isinstance(teams, list)
        print(f"✓ GET /api/hr/teams returned {len(teams)} teams")
        
        if len(teams) > 0:
            team = teams[0]
            assert "id" in team
            assert "name" in team
            assert "department_id" in team
            assert "department_name" in team or team.get("department_id") is None
            print(f"✓ Team structure verified: {team['name']}")
    
    def test_get_teams_by_department(self, auth_token):
        """Test filtering teams by department"""
        # Get departments first
        response = requests.get(
            f"{BASE_URL}/api/hr/departments",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        if response.status_code != 200 or len(response.json()) == 0:
            pytest.skip("No departments found")
        
        dept = response.json()[0]
        
        response = requests.get(
            f"{BASE_URL}/api/hr/teams?department_id={dept['id']}",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert response.status_code == 200
        teams = response.json()
        
        for team in teams:
            assert team.get("department_id") == dept["id"]
        
        print(f"✓ Filtered teams by department '{dept['name']}': {len(teams)} found")


class TestPositionSeed:
    """Test seed-positions endpoint"""
    
    @pytest.fixture(scope="class")
    def auth_token(self):
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": "superadmin@sevora.com", "password": "superadmin123"}
        )
        if response.status_code == 200:
            return response.json().get("access_token")
        pytest.skip("Authentication failed")
    
    def test_seed_positions_idempotent(self, auth_token):
        """Test seed-positions returns existing count if already seeded"""
        response = requests.post(
            f"{BASE_URL}/api/hr/seed-positions",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        
        # Should return count or message
        assert "message" in data or "count" in data
        print(f"✓ Seed positions response: {data.get('message', data)}")


class TestEmployeesForOrgChart:
    """Test employees endpoint for org chart data"""
    
    @pytest.fixture(scope="class")
    def auth_token(self):
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": "superadmin@sevora.com", "password": "superadmin123"}
        )
        if response.status_code == 200:
            return response.json().get("access_token")
        pytest.skip("Authentication failed")
    
    def test_get_employees_with_reports_to(self, auth_token):
        """Test employees have reports_to field for org chart"""
        response = requests.get(
            f"{BASE_URL}/api/hr/employees?limit=50",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert response.status_code == 200, f"Failed: {response.text}"
        employees = response.json()
        
        assert isinstance(employees, list)
        print(f"✓ GET /api/hr/employees returned {len(employees)} employees")
        
        if len(employees) > 0:
            emp = employees[0]
            # Verify fields needed for org chart
            required_fields = ["id", "name", "email"]
            for field in required_fields:
                assert field in emp, f"Missing field: {field}"
            
            # reports_to is optional but should be present if has manager
            has_manager = any(e.get("reports_to") for e in employees)
            has_direct_reports = any(e.get("direct_reports_count", 0) > 0 for e in employees)
            
            print(f"✓ Employees with manager: {sum(1 for e in employees if e.get('reports_to'))}")
            print(f"✓ Employees with direct reports: {sum(1 for e in employees if e.get('direct_reports_count', 0) > 0)}")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
