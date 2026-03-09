"""
Recurring Task Templates API Tests
Tests for CRUD operations on recurring task templates
"""

import pytest
import requests
import os
from datetime import datetime, timedelta

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
TEST_EMAIL = "superadmin@sevora.com"
TEST_PASSWORD = "superadmin123"


class TestRecurringTaskTemplates:
    """Tests for Recurring Task Template CRUD operations"""
    
    token = None
    test_template_id = None
    test_project_id = None
    generated_task_id = None
    
    @pytest.fixture(autouse=True)
    def setup_auth(self):
        """Authenticate before each test class"""
        if not TestRecurringTaskTemplates.token:
            response = requests.post(
                f"{BASE_URL}/api/auth/login",
                json={"email": TEST_EMAIL, "password": TEST_PASSWORD}
            )
            if response.status_code == 200:
                data = response.json()
                # API returns access_token, not token
                TestRecurringTaskTemplates.token = data.get("access_token") or data.get("token")
            else:
                pytest.skip("Authentication failed")
    
    def get_headers(self):
        return {"Authorization": f"Bearer {TestRecurringTaskTemplates.token}"}
    
    # ============== GET DASHBOARD ==============
    
    def test_01_recurring_dashboard(self):
        """Test GET /api/projects/recurring-dashboard returns dashboard stats"""
        response = requests.get(
            f"{BASE_URL}/api/projects/recurring-dashboard",
            headers=self.get_headers()
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        # Verify expected fields exist
        assert "total_templates" in data
        assert "active_templates" in data
        assert "paused_templates" in data
        assert "tasks_generated_today" in data
        assert "tasks_generated_this_week" in data
        print(f"Dashboard: {data['active_templates']} active, {data['paused_templates']} paused")
    
    # ============== LIST TEMPLATES ==============
    
    def test_02_list_templates_empty_or_existing(self):
        """Test GET /api/projects/recurring-templates returns list"""
        response = requests.get(
            f"{BASE_URL}/api/projects/recurring-templates",
            headers=self.get_headers()
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert isinstance(data, list), "Response should be a list"
        print(f"Found {len(data)} recurring templates")
    
    # ============== CREATE TEMPLATE ==============
    
    def test_03_create_recurring_template(self):
        """Test POST /api/projects/recurring-templates creates template"""
        # First get a project to link to (optional)
        projects_res = requests.get(
            f"{BASE_URL}/api/projects/list",
            headers=self.get_headers()
        )
        if projects_res.status_code == 200 and projects_res.json():
            TestRecurringTaskTemplates.test_project_id = projects_res.json()[0].get("id")
        
        tomorrow = (datetime.now() + timedelta(days=1)).strftime("%Y-%m-%d")
        
        payload = {
            "name": "TEST_Weekly Team Standup",
            "description": "Weekly standup meeting recurring task",
            "project_id": TestRecurringTaskTemplates.test_project_id,
            "priority": "medium",
            "tags": ["meeting", "recurring"],
            "recurrence_type": "weekly",
            "frequency": 1,
            "repeat_on_days": [0, 2, 4],  # Mon, Wed, Fri
            "recurrence_end_type": "never",
            "start_date": tomorrow,
            "task_due_offset_days": 0
        }
        
        response = requests.post(
            f"{BASE_URL}/api/projects/recurring-templates",
            headers=self.get_headers(),
            json=payload
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        TestRecurringTaskTemplates.test_template_id = data.get("id")
        
        # Verify response structure
        assert data["name"] == "TEST_Weekly Team Standup"
        assert data["recurrence_type"] == "weekly"
        assert data["frequency"] == 1
        assert data["is_active"] == True
        assert data["is_paused"] == False
        assert "recurrence_description" in data
        assert data["repeat_on_days"] == [0, 2, 4]
        
        print(f"Created template: {data['id']} - {data['recurrence_description']}")
    
    # ============== GET TEMPLATE BY ID ==============
    
    def test_04_get_recurring_template_by_id(self):
        """Test GET /api/projects/recurring-templates/{id} returns template"""
        if not TestRecurringTaskTemplates.test_template_id:
            pytest.skip("No template created")
        
        response = requests.get(
            f"{BASE_URL}/api/projects/recurring-templates/{TestRecurringTaskTemplates.test_template_id}",
            headers=self.get_headers()
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data["id"] == TestRecurringTaskTemplates.test_template_id
        assert data["name"] == "TEST_Weekly Team Standup"
        print(f"Retrieved template: {data['name']}")
    
    # ============== UPDATE TEMPLATE ==============
    
    def test_05_update_recurring_template(self):
        """Test PUT /api/projects/recurring-templates/{id} updates template"""
        if not TestRecurringTaskTemplates.test_template_id:
            pytest.skip("No template created")
        
        payload = {
            "name": "TEST_Daily Team Standup Updated",
            "description": "Updated description for testing",
            "priority": "high",
            "recurrence_type": "daily",
            "frequency": 1
        }
        
        response = requests.put(
            f"{BASE_URL}/api/projects/recurring-templates/{TestRecurringTaskTemplates.test_template_id}",
            headers=self.get_headers(),
            json=payload
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data["name"] == "TEST_Daily Team Standup Updated"
        assert data["priority"] == "high"
        assert data["recurrence_type"] == "daily"
        print(f"Updated template to: {data['name']} ({data['recurrence_type']})")
    
    # ============== PAUSE TEMPLATE ==============
    
    def test_06_pause_recurring_template(self):
        """Test POST /api/projects/recurring-templates/{id}/pause pauses template"""
        if not TestRecurringTaskTemplates.test_template_id:
            pytest.skip("No template created")
        
        response = requests.post(
            f"{BASE_URL}/api/projects/recurring-templates/{TestRecurringTaskTemplates.test_template_id}/pause",
            headers=self.get_headers()
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        # Verify template is paused
        get_response = requests.get(
            f"{BASE_URL}/api/projects/recurring-templates/{TestRecurringTaskTemplates.test_template_id}",
            headers=self.get_headers()
        )
        assert get_response.status_code == 200
        assert get_response.json()["is_paused"] == True
        print("Template paused successfully")
    
    # ============== RESUME TEMPLATE ==============
    
    def test_07_resume_recurring_template(self):
        """Test POST /api/projects/recurring-templates/{id}/resume resumes template"""
        if not TestRecurringTaskTemplates.test_template_id:
            pytest.skip("No template created")
        
        response = requests.post(
            f"{BASE_URL}/api/projects/recurring-templates/{TestRecurringTaskTemplates.test_template_id}/resume",
            headers=self.get_headers()
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        # Verify template is resumed
        get_response = requests.get(
            f"{BASE_URL}/api/projects/recurring-templates/{TestRecurringTaskTemplates.test_template_id}",
            headers=self.get_headers()
        )
        assert get_response.status_code == 200
        assert get_response.json()["is_paused"] == False
        print("Template resumed successfully")
    
    # ============== GENERATE TASK NOW ==============
    
    def test_08_generate_task_now(self):
        """Test POST /api/projects/recurring-templates/{id}/generate-now creates task"""
        if not TestRecurringTaskTemplates.test_template_id:
            pytest.skip("No template created")
        
        # Get current occurrences count
        get_before = requests.get(
            f"{BASE_URL}/api/projects/recurring-templates/{TestRecurringTaskTemplates.test_template_id}",
            headers=self.get_headers()
        )
        before_count = get_before.json().get("occurrences_generated", 0)
        
        response = requests.post(
            f"{BASE_URL}/api/projects/recurring-templates/{TestRecurringTaskTemplates.test_template_id}/generate-now",
            headers=self.get_headers()
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "task_id" in data
        TestRecurringTaskTemplates.generated_task_id = data["task_id"]
        
        # Verify occurrences count increased
        get_after = requests.get(
            f"{BASE_URL}/api/projects/recurring-templates/{TestRecurringTaskTemplates.test_template_id}",
            headers=self.get_headers()
        )
        after_count = get_after.json().get("occurrences_generated", 0)
        assert after_count == before_count + 1
        
        print(f"Generated task: {data['task_id']}")
    
    # ============== GET GENERATED TASKS ==============
    
    def test_09_get_generated_tasks(self):
        """Test GET /api/projects/recurring-templates/{id}/generated-tasks"""
        if not TestRecurringTaskTemplates.test_template_id:
            pytest.skip("No template created")
        
        response = requests.get(
            f"{BASE_URL}/api/projects/recurring-templates/{TestRecurringTaskTemplates.test_template_id}/generated-tasks",
            headers=self.get_headers()
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert isinstance(data, list)
        
        if len(data) > 0:
            task = data[0]
            assert "id" in task
            assert "name" in task
            assert "status" in task
            print(f"Found {len(data)} generated tasks")
        else:
            print("No generated tasks found yet")
    
    # ============== VERIFY GENERATED TASK HAS PARENT_RECURRING_ID ==============
    
    def test_10_verify_generated_task_has_parent_recurring_id(self):
        """Verify generated task has parent_recurring_id field set"""
        if not TestRecurringTaskTemplates.generated_task_id:
            pytest.skip("No task generated")
        
        response = requests.get(
            f"{BASE_URL}/api/projects/tasks/{TestRecurringTaskTemplates.generated_task_id}",
            headers=self.get_headers()
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        task = response.json()
        assert task.get("parent_recurring_id") == TestRecurringTaskTemplates.test_template_id
        print(f"Task has parent_recurring_id: {task.get('parent_recurring_id')}")
    
    # ============== FILTER TEMPLATES ==============
    
    def test_11_filter_templates_by_status(self):
        """Test filtering templates by active/paused status"""
        # Filter for active templates
        response = requests.get(
            f"{BASE_URL}/api/projects/recurring-templates",
            params={"is_active": True, "is_paused": False},
            headers=self.get_headers()
        )
        
        assert response.status_code == 200
        data = response.json()
        for template in data:
            assert template.get("is_active") == True
            assert template.get("is_paused") == False
        
        print(f"Found {len(data)} active (non-paused) templates")
    
    def test_12_filter_templates_by_recurrence_type(self):
        """Test filtering templates by recurrence type"""
        response = requests.get(
            f"{BASE_URL}/api/projects/recurring-templates",
            params={"recurrence_type": "daily"},
            headers=self.get_headers()
        )
        
        assert response.status_code == 200
        data = response.json()
        for template in data:
            assert template.get("recurrence_type") == "daily"
        
        print(f"Found {len(data)} daily templates")
    
    def test_13_search_templates(self):
        """Test searching templates by name"""
        response = requests.get(
            f"{BASE_URL}/api/projects/recurring-templates",
            params={"search": "TEST_"},
            headers=self.get_headers()
        )
        
        assert response.status_code == 200
        data = response.json()
        for template in data:
            assert "TEST_" in template.get("name", "").upper()
        
        print(f"Found {len(data)} templates matching 'TEST_'")
    
    # ============== DELETE TEMPLATE ==============
    
    def test_14_delete_recurring_template(self):
        """Test DELETE /api/projects/recurring-templates/{id} deletes template"""
        if not TestRecurringTaskTemplates.test_template_id:
            pytest.skip("No template created")
        
        response = requests.delete(
            f"{BASE_URL}/api/projects/recurring-templates/{TestRecurringTaskTemplates.test_template_id}",
            headers=self.get_headers()
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        # Verify deletion
        get_response = requests.get(
            f"{BASE_URL}/api/projects/recurring-templates/{TestRecurringTaskTemplates.test_template_id}",
            headers=self.get_headers()
        )
        assert get_response.status_code == 404
        print("Template deleted successfully")
    
    # ============== ERROR CASES ==============
    
    def test_15_get_nonexistent_template(self):
        """Test GET /api/projects/recurring-templates/{invalid_id} returns 404"""
        response = requests.get(
            f"{BASE_URL}/api/projects/recurring-templates/nonexistent-id-12345",
            headers=self.get_headers()
        )
        
        assert response.status_code == 404
        print("Correctly returned 404 for nonexistent template")
    
    def test_16_create_template_monthly_weekday_type(self):
        """Test creating a monthly template with weekday_of_month setting"""
        tomorrow = (datetime.now() + timedelta(days=1)).strftime("%Y-%m-%d")
        
        payload = {
            "name": "TEST_Monthly First Monday Meeting",
            "description": "Monthly meeting on first Monday",
            "priority": "medium",
            "recurrence_type": "monthly",
            "frequency": 1,
            "monthly_repeat_type": "weekday_of_month",
            "week_of_month": 1,  # First
            "weekday_of_month": 0,  # Monday
            "recurrence_end_type": "after_occurrences",
            "max_occurrences": 12,
            "start_date": tomorrow,
            "task_due_offset_days": 1
        }
        
        response = requests.post(
            f"{BASE_URL}/api/projects/recurring-templates",
            headers=self.get_headers(),
            json=payload
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data["monthly_repeat_type"] == "weekday_of_month"
        assert data["week_of_month"] == 1
        assert data["weekday_of_month"] == 0
        assert "First Monday" in data.get("recurrence_description", "")
        
        # Clean up
        delete_response = requests.delete(
            f"{BASE_URL}/api/projects/recurring-templates/{data['id']}",
            headers=self.get_headers()
        )
        assert delete_response.status_code == 200
        
        print(f"Created and deleted monthly template: {data['recurrence_description']}")
    
    def test_17_create_template_with_end_date(self):
        """Test creating template with end_date recurrence end type"""
        tomorrow = (datetime.now() + timedelta(days=1)).strftime("%Y-%m-%d")
        end_date = (datetime.now() + timedelta(days=90)).strftime("%Y-%m-%d")
        
        payload = {
            "name": "TEST_Quarterly Report (3 months)",
            "description": "Quarterly report recurring for 3 months",
            "priority": "high",
            "recurrence_type": "weekly",
            "frequency": 1,
            "repeat_on_days": [4],  # Friday
            "recurrence_end_type": "end_date",
            "end_date": end_date,
            "start_date": tomorrow,
            "task_due_offset_days": 2
        }
        
        response = requests.post(
            f"{BASE_URL}/api/projects/recurring-templates",
            headers=self.get_headers(),
            json=payload
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data["recurrence_end_type"] == "end_date"
        assert data["end_date"] == end_date
        
        # Clean up
        delete_response = requests.delete(
            f"{BASE_URL}/api/projects/recurring-templates/{data['id']}",
            headers=self.get_headers()
        )
        
        print(f"Created template with end_date: {data['end_date']}")


# ============== RUN TESTS ==============

if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
