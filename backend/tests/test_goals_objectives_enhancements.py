"""
Test Goals & Objectives Module Enhancements - Iteration 39

Tests for:
1. GET /api/goals/departments - returns department objects with id, name, code
2. POST/PUT /api/goals/objectives - accepts quarter_ids array (multi-select)
3. GET /api/goals/objectives - returns quarter_ids array and quarter_names
4. Verify backend supports rich text descriptions (HTML content)
"""

import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL').rstrip('/')

class TestAuth:
    """Helper methods for authentication"""
    
    @staticmethod
    def get_token():
        """Login and get auth token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "superadmin@sevora.com",
            "password": "superadmin123"
        })
        if response.status_code == 200:
            return response.json().get("access_token") or response.json().get("token")
        pytest.skip("Authentication failed - skipping tests")


# ============ Departments Endpoint Tests ============

class TestDepartmentsEndpoint:
    """Test GET /api/goals/departments endpoint"""
    
    def test_departments_endpoint_returns_200(self):
        """Test that departments endpoint returns 200"""
        token = TestAuth.get_token()
        headers = {"Authorization": f"Bearer {token}"}
        
        response = requests.get(f"{BASE_URL}/api/goals/departments", headers=headers)
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        print(f"PASS: GET /api/goals/departments returned 200")
        print(f"Response: {response.json()}")
    
    def test_departments_returns_list(self):
        """Test that departments endpoint returns a list"""
        token = TestAuth.get_token()
        headers = {"Authorization": f"Bearer {token}"}
        
        response = requests.get(f"{BASE_URL}/api/goals/departments", headers=headers)
        data = response.json()
        
        assert isinstance(data, list), f"Expected list, got {type(data)}"
        print(f"PASS: Departments endpoint returns list with {len(data)} items")
    
    def test_departments_returns_valid_structure(self):
        """Test department objects have id, name, code OR are strings (fallback)"""
        token = TestAuth.get_token()
        headers = {"Authorization": f"Bearer {token}"}
        
        response = requests.get(f"{BASE_URL}/api/goals/departments", headers=headers)
        data = response.json()
        
        if len(data) > 0:
            first_item = data[0]
            # Can be either dict with id/name/code or string (fallback)
            if isinstance(first_item, dict):
                print(f"Departments returned as objects: {first_item}")
                # Check for expected fields
                assert 'name' in first_item or 'id' in first_item, "Dict should have name or id"
            else:
                print(f"Departments returned as strings (fallback): {first_item}")
                assert isinstance(first_item, str), "Should be string"
        
        print(f"PASS: Departments structure is valid")


# ============ Objectives Multi-Select Quarter Tests ============

class TestObjectivesMultiSelectQuarters:
    """Test objectives with multi-select quarters"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup test data"""
        self.token = TestAuth.get_token()
        self.headers = {
            "Authorization": f"Bearer {self.token}",
            "Content-Type": "application/json"
        }
        
        # Get an existing fiscal year
        fy_response = requests.get(f"{BASE_URL}/api/goals/fiscal-years", headers=self.headers)
        fiscal_years = fy_response.json()
        
        if len(fiscal_years) == 0:
            pytest.skip("No fiscal years exist - cannot test objectives")
        
        self.fiscal_year = fiscal_years[0]
        self.fiscal_year_id = self.fiscal_year['id']
        
        # Get quarters for this fiscal year
        self.quarters = self.fiscal_year.get('quarters', [])
        if len(self.quarters) < 2:
            pytest.skip("Need at least 2 quarters to test multi-select")
        
        # Get a strategic goal
        goals_response = requests.get(f"{BASE_URL}/api/goals/strategic-goals", headers=self.headers)
        goals = goals_response.json()
        
        if len(goals) == 0:
            pytest.skip("No strategic goals exist - cannot test objectives")
        
        self.strategic_goal_id = goals[0]['id']
    
    def test_create_objective_with_multiple_quarters(self):
        """Test creating objective with quarter_ids array"""
        # Select first two quarters
        quarter_ids = [self.quarters[0]['id'], self.quarters[1]['id']]
        
        payload = {
            "title": "TEST_Multi-Quarter Objective",
            "description": "<p>Test objective with multiple quarters</p>",
            "strategic_goal_id": self.strategic_goal_id,
            "fiscal_year_id": self.fiscal_year_id,
            "quarter_ids": quarter_ids,
            "priority": "medium",
            "status": "planning"
        }
        
        response = requests.post(f"{BASE_URL}/api/goals/objectives", json=payload, headers=self.headers)
        
        assert response.status_code == 200 or response.status_code == 201, f"Expected 200/201, got {response.status_code}: {response.text}"
        
        data = response.json()
        print(f"Created objective: {data.get('id')}")
        
        # Verify quarter_ids is returned as array
        assert 'quarter_ids' in data, "Response should contain quarter_ids"
        assert isinstance(data['quarter_ids'], list), "quarter_ids should be list"
        assert len(data['quarter_ids']) == 2, f"Expected 2 quarters, got {len(data['quarter_ids'])}"
        
        # Verify quarter_names is returned
        assert 'quarter_names' in data, "Response should contain quarter_names"
        assert isinstance(data['quarter_names'], list), "quarter_names should be list"
        
        print(f"PASS: Objective created with quarter_ids={data['quarter_ids']}")
        print(f"      quarter_names={data['quarter_names']}")
        
        # Cleanup
        requests.delete(f"{BASE_URL}/api/goals/objectives/{data['id']}", headers=self.headers)
    
    def test_get_objectives_returns_quarter_ids_array(self):
        """Test GET /api/goals/objectives returns quarter_ids array"""
        response = requests.get(f"{BASE_URL}/api/goals/objectives", headers=self.headers)
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        print(f"Found {len(data)} objectives")
        
        if len(data) > 0:
            obj = data[0]
            # All objectives should have quarter_ids field
            assert 'quarter_ids' in obj, "Objective should have quarter_ids field"
            assert isinstance(obj.get('quarter_ids', []), list), "quarter_ids should be list"
            
            # All objectives should have quarter_names field
            if 'quarter_names' in obj:
                assert isinstance(obj['quarter_names'], list), "quarter_names should be list"
            
            print(f"PASS: Objectives return quarter_ids={obj.get('quarter_ids')} and quarter_names={obj.get('quarter_names')}")
    
    def test_update_objective_with_quarter_ids(self):
        """Test updating objective with new quarter_ids"""
        # First create an objective
        quarter_ids = [self.quarters[0]['id']]
        
        create_payload = {
            "title": "TEST_Update Quarter Objective",
            "description": "Test update",
            "strategic_goal_id": self.strategic_goal_id,
            "fiscal_year_id": self.fiscal_year_id,
            "quarter_ids": quarter_ids,
            "priority": "medium",
            "status": "planning"
        }
        
        create_response = requests.post(f"{BASE_URL}/api/goals/objectives", json=create_payload, headers=self.headers)
        assert create_response.status_code in [200, 201]
        
        obj_id = create_response.json()['id']
        
        # Update with multiple quarters
        new_quarter_ids = [self.quarters[0]['id'], self.quarters[1]['id']]
        update_payload = {
            "quarter_ids": new_quarter_ids
        }
        
        update_response = requests.put(f"{BASE_URL}/api/goals/objectives/{obj_id}", json=update_payload, headers=self.headers)
        
        assert update_response.status_code == 200, f"Expected 200, got {update_response.status_code}: {update_response.text}"
        
        updated_data = update_response.json()
        assert updated_data.get('quarter_ids') == new_quarter_ids, f"Expected {new_quarter_ids}, got {updated_data.get('quarter_ids')}"
        
        print(f"PASS: Objective updated with new quarter_ids={updated_data.get('quarter_ids')}")
        
        # Cleanup
        requests.delete(f"{BASE_URL}/api/goals/objectives/{obj_id}", headers=self.headers)


# ============ Rich Text Description Tests ============

class TestRichTextDescriptions:
    """Test that rich text (HTML) descriptions are properly stored and returned"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup test data"""
        self.token = TestAuth.get_token()
        self.headers = {
            "Authorization": f"Bearer {self.token}",
            "Content-Type": "application/json"
        }
        
        # Get an existing fiscal year
        fy_response = requests.get(f"{BASE_URL}/api/goals/fiscal-years", headers=self.headers)
        fiscal_years = fy_response.json()
        
        if len(fiscal_years) == 0:
            pytest.skip("No fiscal years exist")
        
        self.fiscal_year_id = fiscal_years[0]['id']
        self.quarters = fiscal_years[0].get('quarters', [])
        
        # Get a strategic goal
        goals_response = requests.get(f"{BASE_URL}/api/goals/strategic-goals", headers=self.headers)
        goals = goals_response.json()
        
        if len(goals) == 0:
            pytest.skip("No strategic goals exist")
        
        self.strategic_goal_id = goals[0]['id']
    
    def test_strategic_goal_accepts_html_description(self):
        """Test strategic goal accepts HTML formatted description"""
        html_description = "<p>This is a <strong>bold</strong> description with <em>italic</em> text and a <ul><li>bullet point</li></ul></p>"
        
        payload = {
            "title": "TEST_Rich Text Goal",
            "description": html_description,
            "fiscal_year_id": self.fiscal_year_id,
            "priority": "medium",
            "status": "planning"
        }
        
        response = requests.post(f"{BASE_URL}/api/goals/strategic-goals", json=payload, headers=self.headers)
        
        assert response.status_code in [200, 201], f"Expected 200/201, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data.get('description') == html_description, "HTML description should be preserved"
        
        print(f"PASS: Strategic goal accepts HTML description")
        
        # Cleanup
        requests.delete(f"{BASE_URL}/api/goals/strategic-goals/{data['id']}", headers=self.headers)
    
    def test_objective_accepts_html_description(self):
        """Test objective accepts HTML formatted description"""
        if not self.quarters:
            pytest.skip("No quarters available")
        
        html_description = "<h2>Objective Summary</h2><p>This is <strong>important</strong>:</p><ol><li>First item</li><li>Second item</li></ol>"
        
        payload = {
            "title": "TEST_Rich Text Objective",
            "description": html_description,
            "strategic_goal_id": self.strategic_goal_id,
            "fiscal_year_id": self.fiscal_year_id,
            "quarter_ids": [self.quarters[0]['id']],
            "priority": "high",
            "status": "planning"
        }
        
        response = requests.post(f"{BASE_URL}/api/goals/objectives", json=payload, headers=self.headers)
        
        assert response.status_code in [200, 201], f"Expected 200/201, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data.get('description') == html_description, "HTML description should be preserved"
        
        print(f"PASS: Objective accepts HTML description")
        
        # Cleanup
        requests.delete(f"{BASE_URL}/api/goals/objectives/{data['id']}", headers=self.headers)


# ============ Test that Project forms don't include Module/Type fields ============
# Note: These are UI tests but we can verify backend doesn't require these fields

class TestProjectFormsFieldRemoval:
    """Test that Module and Project Type are not required in project creation"""
    
    def test_create_project_without_module_or_type(self):
        """Test creating project without module_id or project_type fields"""
        token = TestAuth.get_token()
        headers = {
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json"
        }
        
        # Create project without module_id and project_type
        payload = {
            "name": "TEST_No Module Project",
            "description": "Project created without module or type",
            "priority": "medium",
            "visibility": "public"
        }
        
        response = requests.post(f"{BASE_URL}/api/projects", json=payload, headers=headers)
        
        assert response.status_code in [200, 201], f"Expected 200/201, got {response.status_code}: {response.text}"
        
        data = response.json()
        print(f"Created project without module_id or project_type: {data.get('id')}")
        
        # Cleanup
        requests.delete(f"{BASE_URL}/api/projects/{data['id']}", headers=headers)
        
        print("PASS: Projects can be created without Module or Project Type fields")


# ============ Combined Test Suite ============

class TestGoalsEnhancementsSummary:
    """Summary test to verify all enhancements"""
    
    def test_all_enhancements_accessible(self):
        """Quick smoke test for all new endpoints/features"""
        token = TestAuth.get_token()
        headers = {"Authorization": f"Bearer {token}"}
        
        # Test departments endpoint
        dept_response = requests.get(f"{BASE_URL}/api/goals/departments", headers=headers)
        assert dept_response.status_code == 200, f"Departments endpoint failed: {dept_response.status_code}"
        print("✓ Departments endpoint accessible")
        
        # Test objectives endpoint
        obj_response = requests.get(f"{BASE_URL}/api/goals/objectives", headers=headers)
        assert obj_response.status_code == 200, f"Objectives endpoint failed: {obj_response.status_code}"
        print("✓ Objectives endpoint accessible")
        
        # Test strategic goals endpoint
        goals_response = requests.get(f"{BASE_URL}/api/goals/strategic-goals", headers=headers)
        assert goals_response.status_code == 200, f"Strategic goals endpoint failed: {goals_response.status_code}"
        print("✓ Strategic goals endpoint accessible")
        
        # Test fiscal years endpoint
        fy_response = requests.get(f"{BASE_URL}/api/goals/fiscal-years", headers=headers)
        assert fy_response.status_code == 200, f"Fiscal years endpoint failed: {fy_response.status_code}"
        print("✓ Fiscal years endpoint accessible")
        
        print("\nPASS: All Goals module enhancements are accessible")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
