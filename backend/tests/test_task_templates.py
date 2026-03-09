"""
Task Templates Feature Tests
Tests for template CRUD operations and creating tasks from templates
"""

import pytest
import requests
import os
import uuid

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')
PROJECT_ID = "3313669c-fe06-4948-9668-014ed9e46a67"  # Website Redesign project
EXISTING_TEMPLATE_ID = "593a2ab7-38e6-48f2-b54c-3adcfdd65313"  # Weekly Team Standup


@pytest.fixture(scope="module")
def auth_token():
    """Get authentication token"""
    response = requests.post(f"{BASE_URL}/api/auth/login", json={
        "email": "superadmin@sevora.com",
        "password": "superadmin123"
    })
    if response.status_code == 200:
        return response.json().get("access_token")
    pytest.skip("Authentication failed - skipping authenticated tests")


@pytest.fixture(scope="module")
def api_client(auth_token):
    """Shared requests session with auth"""
    session = requests.Session()
    session.headers.update({
        "Content-Type": "application/json",
        "Authorization": f"Bearer {auth_token}"
    })
    return session


@pytest.fixture
def test_template_id(api_client):
    """Create a test template and clean up after test"""
    template_data = {
        "name": f"TEST_Template_{uuid.uuid4().hex[:8]}",
        "description": "Test template for automated testing",
        "project_id": None,  # Global template
        "default_priority": "high",
        "estimated_hours": 4.0,
        "checklist_items": [
            {"text": "Test item 1", "assigned_to": None},
            {"text": "Test item 2", "assigned_to": None}
        ],
        "is_recurring": False
    }
    
    response = api_client.post(f"{BASE_URL}/api/projects/templates", json=template_data)
    assert response.status_code == 200, f"Failed to create test template: {response.text}"
    template = response.json()
    template_id = template["id"]
    
    yield template_id
    
    # Cleanup
    api_client.delete(f"{BASE_URL}/api/projects/templates/{template_id}")


class TestTemplateList:
    """Tests for GET /api/projects/templates"""
    
    def test_list_templates_success(self, api_client):
        """Test listing templates returns 200 and list"""
        response = api_client.get(f"{BASE_URL}/api/projects/templates")
        assert response.status_code == 200
        
        data = response.json()
        assert isinstance(data, list)
        print(f"Found {len(data)} templates")
    
    def test_list_templates_with_project_filter(self, api_client):
        """Test listing templates with project_id filter returns global + project templates"""
        response = api_client.get(f"{BASE_URL}/api/projects/templates?project_id={PROJECT_ID}")
        assert response.status_code == 200
        
        data = response.json()
        assert isinstance(data, list)
        
        # Should include global templates (project_id=None)
        has_global = any(t.get("project_id") is None for t in data)
        assert has_global, "Should include global templates when filtering by project"
        print(f"Found {len(data)} templates for project {PROJECT_ID}")
    
    def test_existing_template_has_required_fields(self, api_client):
        """Test that existing template has all required response fields"""
        response = api_client.get(f"{BASE_URL}/api/projects/templates/{EXISTING_TEMPLATE_ID}")
        assert response.status_code == 200
        
        template = response.json()
        
        # Required fields
        required_fields = [
            "id", "name", "description", "project_id", "project_name",
            "default_priority", "default_assignee", "default_assignee_name",
            "estimated_hours", "default_labels", "default_label_names",
            "default_tags", "checklist_items", "is_recurring",
            "recurrence_pattern", "recurrence_interval", "usage_count",
            "created_by", "created_by_name", "created_at", "updated_at"
        ]
        
        for field in required_fields:
            assert field in template, f"Missing required field: {field}"
        
        # Verify data types
        assert isinstance(template["checklist_items"], list)
        assert isinstance(template["default_labels"], list)
        assert isinstance(template["usage_count"], int)
        
        print(f"Template '{template['name']}' has all required fields")


class TestTemplateCreate:
    """Tests for POST /api/projects/templates"""
    
    def test_create_global_template(self, api_client):
        """Test creating a global template (project_id=None)"""
        template_data = {
            "name": f"TEST_GlobalTemplate_{uuid.uuid4().hex[:8]}",
            "description": "Test global template",
            "project_id": None,
            "default_priority": "medium",
            "estimated_hours": 2.0,
            "checklist_items": [
                {"text": "Setup meeting", "assigned_to": None}
            ],
            "is_recurring": False
        }
        
        response = api_client.post(f"{BASE_URL}/api/projects/templates", json=template_data)
        assert response.status_code == 200
        
        template = response.json()
        assert template["name"] == template_data["name"]
        assert template["project_id"] is None
        assert template["project_name"] == "Global"
        assert template["default_priority"] == "medium"
        assert template["usage_count"] == 0
        assert len(template["checklist_items"]) == 1
        
        # Cleanup
        api_client.delete(f"{BASE_URL}/api/projects/templates/{template['id']}")
        print(f"Created and cleaned up global template: {template['name']}")
    
    def test_create_project_specific_template(self, api_client):
        """Test creating a project-specific template"""
        template_data = {
            "name": f"TEST_ProjectTemplate_{uuid.uuid4().hex[:8]}",
            "description": "Test project-specific template",
            "project_id": PROJECT_ID,
            "default_priority": "high",
            "estimated_hours": 3.0,
            "checklist_items": [],
            "is_recurring": True,
            "recurrence_pattern": "weekly",
            "recurrence_interval": 1
        }
        
        response = api_client.post(f"{BASE_URL}/api/projects/templates", json=template_data)
        assert response.status_code == 200
        
        template = response.json()
        assert template["project_id"] == PROJECT_ID
        assert template["project_name"] != "Global"
        assert template["is_recurring"] == True
        assert template["recurrence_pattern"] == "weekly"
        
        # Cleanup
        api_client.delete(f"{BASE_URL}/api/projects/templates/{template['id']}")
        print(f"Created and cleaned up project template: {template['name']}")
    
    def test_create_template_with_checklist_items(self, api_client):
        """Test creating template with multiple checklist items"""
        template_data = {
            "name": f"TEST_ChecklistTemplate_{uuid.uuid4().hex[:8]}",
            "description": "Template with checklist",
            "project_id": None,
            "default_priority": "urgent",
            "checklist_items": [
                {"text": "Item 1", "assigned_to": None},
                {"text": "Item 2", "assigned_to": None},
                {"text": "Item 3", "assigned_to": None}
            ]
        }
        
        response = api_client.post(f"{BASE_URL}/api/projects/templates", json=template_data)
        assert response.status_code == 200
        
        template = response.json()
        assert len(template["checklist_items"]) == 3
        assert template["checklist_items"][0]["text"] == "Item 1"
        
        # Cleanup
        api_client.delete(f"{BASE_URL}/api/projects/templates/{template['id']}")
        print(f"Created template with {len(template['checklist_items'])} checklist items")
    
    def test_create_template_name_required(self, api_client):
        """Test that template name is required"""
        template_data = {
            "description": "Template without name",
            "default_priority": "low"
        }
        
        response = api_client.post(f"{BASE_URL}/api/projects/templates", json=template_data)
        assert response.status_code == 422, "Should fail without name"
        print("Correctly rejected template without name")


class TestTemplateGet:
    """Tests for GET /api/projects/templates/{template_id}"""
    
    def test_get_existing_template(self, api_client):
        """Test getting an existing template by ID"""
        response = api_client.get(f"{BASE_URL}/api/projects/templates/{EXISTING_TEMPLATE_ID}")
        assert response.status_code == 200
        
        template = response.json()
        assert template["id"] == EXISTING_TEMPLATE_ID
        assert template["name"] == "Weekly Team Standup"
        print(f"Successfully retrieved template: {template['name']}")
    
    def test_get_nonexistent_template(self, api_client):
        """Test getting a non-existent template returns 404"""
        fake_id = str(uuid.uuid4())
        response = api_client.get(f"{BASE_URL}/api/projects/templates/{fake_id}")
        assert response.status_code == 404
        print("Correctly returned 404 for non-existent template")


class TestTemplateUpdate:
    """Tests for PUT /api/projects/templates/{template_id}"""
    
    def test_update_template_name(self, api_client, test_template_id):
        """Test updating template name"""
        new_name = f"TEST_Updated_{uuid.uuid4().hex[:6]}"
        
        response = api_client.put(
            f"{BASE_URL}/api/projects/templates/{test_template_id}",
            json={"name": new_name}
        )
        assert response.status_code == 200
        
        template = response.json()
        assert template["name"] == new_name
        
        # Verify with GET
        get_response = api_client.get(f"{BASE_URL}/api/projects/templates/{test_template_id}")
        assert get_response.status_code == 200
        assert get_response.json()["name"] == new_name
        print(f"Successfully updated template name to: {new_name}")
    
    def test_update_template_priority(self, api_client, test_template_id):
        """Test updating template priority"""
        response = api_client.put(
            f"{BASE_URL}/api/projects/templates/{test_template_id}",
            json={"default_priority": "urgent"}
        )
        assert response.status_code == 200
        
        template = response.json()
        assert template["default_priority"] == "urgent"
        print("Successfully updated template priority to urgent")
    
    def test_update_template_recurring(self, api_client, test_template_id):
        """Test updating template recurring settings"""
        response = api_client.put(
            f"{BASE_URL}/api/projects/templates/{test_template_id}",
            json={
                "is_recurring": True,
                "recurrence_pattern": "daily",
                "recurrence_interval": 2
            }
        )
        assert response.status_code == 200
        
        template = response.json()
        assert template["is_recurring"] == True
        assert template["recurrence_pattern"] == "daily"
        assert template["recurrence_interval"] == 2
        print("Successfully updated template recurring settings")
    
    def test_update_nonexistent_template(self, api_client):
        """Test updating non-existent template returns 404"""
        fake_id = str(uuid.uuid4())
        response = api_client.put(
            f"{BASE_URL}/api/projects/templates/{fake_id}",
            json={"name": "Should Fail"}
        )
        assert response.status_code == 404
        print("Correctly returned 404 for non-existent template update")


class TestTemplateDelete:
    """Tests for DELETE /api/projects/templates/{template_id}"""
    
    def test_delete_template(self, api_client):
        """Test deleting a template"""
        # First create a template to delete
        create_response = api_client.post(
            f"{BASE_URL}/api/projects/templates",
            json={
                "name": f"TEST_ToDelete_{uuid.uuid4().hex[:8]}",
                "default_priority": "low"
            }
        )
        assert create_response.status_code == 200
        template_id = create_response.json()["id"]
        
        # Delete it
        delete_response = api_client.delete(f"{BASE_URL}/api/projects/templates/{template_id}")
        assert delete_response.status_code == 200
        
        # Verify it's gone
        get_response = api_client.get(f"{BASE_URL}/api/projects/templates/{template_id}")
        assert get_response.status_code == 404
        print("Successfully deleted template and verified removal")
    
    def test_delete_nonexistent_template(self, api_client):
        """Test deleting non-existent template returns 404"""
        fake_id = str(uuid.uuid4())
        response = api_client.delete(f"{BASE_URL}/api/projects/templates/{fake_id}")
        assert response.status_code == 404
        print("Correctly returned 404 for non-existent template delete")


class TestCreateTaskFromTemplate:
    """Tests for POST /api/projects/templates/{template_id}/create-task"""
    
    def test_create_task_from_template_basic(self, api_client, test_template_id):
        """Test creating a task from template with default values"""
        response = api_client.post(
            f"{BASE_URL}/api/projects/templates/{test_template_id}/create-task?project_id={PROJECT_ID}"
        )
        assert response.status_code == 200
        
        task = response.json()
        assert "id" in task
        assert task["project_id"] == PROJECT_ID
        
        # Cleanup task
        api_client.delete(f"{BASE_URL}/api/projects/tasks/{task['id']}")
        print(f"Created task from template: {task['name']}")
    
    def test_create_task_from_template_with_overrides(self, api_client, test_template_id):
        """Test creating task with custom name, due date, and assignee overrides"""
        custom_name = f"TEST_CustomTask_{uuid.uuid4().hex[:8]}"
        due_date = "2026-04-15"
        
        response = api_client.post(
            f"{BASE_URL}/api/projects/templates/{test_template_id}/create-task",
            params={
                "project_id": PROJECT_ID,
                "task_name": custom_name,
                "due_date": due_date
            }
        )
        assert response.status_code == 200
        
        task = response.json()
        assert task["name"] == custom_name
        assert task["due_date"] == due_date
        
        # Cleanup task
        api_client.delete(f"{BASE_URL}/api/projects/tasks/{task['id']}")
        print(f"Created task with overrides: {task['name']}, due: {task['due_date']}")
    
    def test_create_task_from_template_creates_checklist(self, api_client):
        """Test that creating task from template also creates checklist items"""
        # First create template with checklist items
        template_response = api_client.post(
            f"{BASE_URL}/api/projects/templates",
            json={
                "name": f"TEST_ChecklistTemplate_{uuid.uuid4().hex[:8]}",
                "description": "Template with checklist for testing",
                "default_priority": "medium",
                "checklist_items": [
                    {"text": "Checklist item 1", "assigned_to": None},
                    {"text": "Checklist item 2", "assigned_to": None}
                ]
            }
        )
        assert template_response.status_code == 200
        template = template_response.json()
        
        # Create task from template
        task_response = api_client.post(
            f"{BASE_URL}/api/projects/templates/{template['id']}/create-task?project_id={PROJECT_ID}"
        )
        assert task_response.status_code == 200
        task = task_response.json()
        
        # Verify checklist items were created
        checklist_response = api_client.get(f"{BASE_URL}/api/projects/tasks/{task['id']}/checklists")
        assert checklist_response.status_code == 200
        checklists = checklist_response.json()
        
        assert len(checklists) == 2, f"Expected 2 checklist items, got {len(checklists)}"
        assert checklists[0]["text"] == "Checklist item 1"
        assert checklists[1]["text"] == "Checklist item 2"
        assert checklists[0]["is_completed"] == False
        
        # Cleanup
        api_client.delete(f"{BASE_URL}/api/projects/tasks/{task['id']}")
        api_client.delete(f"{BASE_URL}/api/projects/templates/{template['id']}")
        print(f"Verified task created with {len(checklists)} checklist items from template")
    
    def test_create_task_increments_usage_count(self, api_client):
        """Test that creating task from template increments usage_count"""
        # Create a fresh template
        template_response = api_client.post(
            f"{BASE_URL}/api/projects/templates",
            json={
                "name": f"TEST_UsageCount_{uuid.uuid4().hex[:8]}",
                "default_priority": "low"
            }
        )
        assert template_response.status_code == 200
        template = template_response.json()
        initial_usage = template["usage_count"]
        assert initial_usage == 0
        
        # Create task from template
        task_response = api_client.post(
            f"{BASE_URL}/api/projects/templates/{template['id']}/create-task?project_id={PROJECT_ID}"
        )
        assert task_response.status_code == 200
        task = task_response.json()
        
        # Check usage count increased
        template_get_response = api_client.get(f"{BASE_URL}/api/projects/templates/{template['id']}")
        assert template_get_response.status_code == 200
        updated_template = template_get_response.json()
        
        assert updated_template["usage_count"] == 1, f"Expected usage_count=1, got {updated_template['usage_count']}"
        
        # Cleanup
        api_client.delete(f"{BASE_URL}/api/projects/tasks/{task['id']}")
        api_client.delete(f"{BASE_URL}/api/projects/templates/{template['id']}")
        print(f"Verified usage_count incremented from {initial_usage} to {updated_template['usage_count']}")
    
    def test_create_task_from_nonexistent_template(self, api_client):
        """Test creating task from non-existent template returns 404"""
        fake_id = str(uuid.uuid4())
        response = api_client.post(
            f"{BASE_URL}/api/projects/templates/{fake_id}/create-task?project_id={PROJECT_ID}"
        )
        assert response.status_code == 404
        print("Correctly returned 404 for non-existent template")
    
    def test_create_task_with_invalid_project(self, api_client, test_template_id):
        """Test creating task with invalid project_id returns 404"""
        fake_project = str(uuid.uuid4())
        response = api_client.post(
            f"{BASE_URL}/api/projects/templates/{test_template_id}/create-task?project_id={fake_project}"
        )
        assert response.status_code == 404
        print("Correctly returned 404 for invalid project_id")


class TestExistingTemplateIntegration:
    """Integration tests using the existing 'Weekly Team Standup' template"""
    
    def test_existing_template_structure(self, api_client):
        """Verify the existing template has expected structure"""
        response = api_client.get(f"{BASE_URL}/api/projects/templates/{EXISTING_TEMPLATE_ID}")
        assert response.status_code == 200
        
        template = response.json()
        
        # Verify expected values for 'Weekly Team Standup'
        assert template["name"] == "Weekly Team Standup"
        assert template["description"] == "Regular weekly standup meeting"
        assert template["project_id"] is None  # Global
        assert template["project_name"] == "Global"
        assert template["default_priority"] == "medium"
        assert template["estimated_hours"] == 0.5
        assert template["is_recurring"] == True
        assert template["recurrence_pattern"] == "weekly"
        
        # Should have 3 checklist items
        assert len(template["checklist_items"]) == 3
        checklist_texts = [item["text"] for item in template["checklist_items"]]
        assert "Review previous week tasks" in checklist_texts
        assert "Discuss blockers" in checklist_texts
        assert "Plan upcoming week" in checklist_texts
        
        print(f"Existing template '{template['name']}' structure verified")
    
    def test_create_task_from_existing_template(self, api_client):
        """Create a task from the existing template and verify all data copied"""
        response = api_client.post(
            f"{BASE_URL}/api/projects/templates/{EXISTING_TEMPLATE_ID}/create-task?project_id={PROJECT_ID}"
        )
        assert response.status_code == 200
        
        task = response.json()
        
        # Verify task inherited template properties
        assert task["name"] == "Weekly Team Standup"
        assert task["description"] == "Regular weekly standup meeting"
        assert task["priority"] == "medium"
        assert task["estimated_hours"] == 0.5
        assert task["is_recurring"] == True
        assert task["recurrence_pattern"] == "weekly"
        
        # Verify checklist items
        checklist_response = api_client.get(f"{BASE_URL}/api/projects/tasks/{task['id']}/checklists")
        assert checklist_response.status_code == 200
        checklists = checklist_response.json()
        assert len(checklists) == 3
        
        # Cleanup
        api_client.delete(f"{BASE_URL}/api/projects/tasks/{task['id']}")
        print(f"Task created from existing template with {len(checklists)} checklist items")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
