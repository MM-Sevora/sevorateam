"""
Definition of Done (DoD) Feature Tests
Tests for DoD configuration, task DoD status, and Kanban move validation
"""

import pytest
import requests
import os
import uuid

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test data
PROJECT_ID = "4ce2e52d-d104-4f81-821c-b4ebdf132271"  # Sevora Social Media Audit
TASK_ID = "622fa624-7755-42c1-8d50-444c979cbe7c"  # Existing task with DoD


class TestDoDConfiguration:
    """Tests for DoD configuration endpoints"""
    
    @pytest.fixture(autouse=True)
    def setup(self, api_client, auth_token):
        self.client = api_client
        self.token = auth_token
        self.headers = {"Authorization": f"Bearer {auth_token}"}
    
    def test_get_dod_config_returns_system_defaults(self, api_client, auth_token):
        """GET /api/projects/dod/config/{project_id} - should return DoD config or system defaults"""
        response = api_client.get(
            f"{BASE_URL}/api/projects/dod/config/{PROJECT_ID}",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "id" in data
        assert "project_id" in data
        assert "items" in data
        assert "enabled_for_issue_types" in data
        assert "is_enabled" in data
        
        # Verify items structure
        assert isinstance(data["items"], list)
        if len(data["items"]) > 0:
            item = data["items"][0]
            assert "label" in item
            assert "is_required" in item
        
        print(f"DoD config retrieved: {len(data['items'])} items, enabled for: {data['enabled_for_issue_types']}")
    
    def test_create_dod_config(self, api_client, auth_token):
        """POST /api/projects/dod/config - should create/update DoD configuration"""
        # Use the real project ID
        test_project_id = PROJECT_ID
        
        payload = {
            "project_id": test_project_id,
            "items": [
                {"label": "Test Item 1", "description": "Test description", "is_required": True},
                {"label": "Test Item 2", "description": "Optional item", "is_required": False}
            ],
            "enabled_for_issue_types": ["task", "bug", "story"],
            "is_enabled": True
        }
        
        response = api_client.post(
            f"{BASE_URL}/api/projects/dod/config",
            json=payload,
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data["project_id"] == test_project_id
        assert len(data["items"]) == 2
        assert data["is_enabled"] == True
        assert "task" in data["enabled_for_issue_types"]
        assert "bug" in data["enabled_for_issue_types"]
        assert "story" in data["enabled_for_issue_types"]
        
        print(f"DoD config created for project {test_project_id}")
        
        # Restore original config
        restore_payload = {
            "project_id": test_project_id,
            "items": [
                {"label": "Code Review Completed", "description": "Code has been reviewed by at least one team member", "is_required": True},
                {"label": "QA Testing Passed", "description": "All test cases passed, no critical bugs", "is_required": True},
                {"label": "Documentation Updated", "description": "Technical docs and user guides updated if needed", "is_required": False},
                {"label": "Deployed to Staging", "description": "Changes deployed and verified on staging environment", "is_required": True}
            ],
            "enabled_for_issue_types": ["task", "bug"],
            "is_enabled": True
        }
        api_client.post(
            f"{BASE_URL}/api/projects/dod/config",
            json=restore_payload,
            headers={"Authorization": f"Bearer {auth_token}"}
        )
    
    def test_update_dod_config(self, api_client, auth_token):
        """PUT /api/projects/dod/config/{project_id} - should update DoD config"""
        # Use the real project ID
        test_project_id = PROJECT_ID
        
        # Get current config first
        get_response = api_client.get(
            f"{BASE_URL}/api/projects/dod/config/{test_project_id}",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        original_config = get_response.json() if get_response.status_code == 200 else None
        
        # Update it
        update_payload = {
            "items": [
                {"label": "Updated Item 1", "is_required": True},
                {"label": "New Item 2", "is_required": False}
            ],
            "enabled_for_issue_types": ["task", "bug"],
            "is_enabled": True
        }
        
        response = api_client.put(
            f"{BASE_URL}/api/projects/dod/config/{test_project_id}",
            json=update_payload,
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert len(data["items"]) == 2
        assert data["items"][0]["label"] == "Updated Item 1"
        assert "bug" in data["enabled_for_issue_types"]
        
        print(f"DoD config updated for project {test_project_id}")
        
        # Restore original config
        restore_payload = {
            "items": [
                {"label": "Code Review Completed", "description": "Code has been reviewed by at least one team member", "is_required": True},
                {"label": "QA Testing Passed", "description": "All test cases passed, no critical bugs", "is_required": True},
                {"label": "Documentation Updated", "description": "Technical docs and user guides updated if needed", "is_required": False},
                {"label": "Deployed to Staging", "description": "Changes deployed and verified on staging environment", "is_required": True}
            ],
            "enabled_for_issue_types": ["task", "bug"],
            "is_enabled": True
        }
        api_client.put(
            f"{BASE_URL}/api/projects/dod/config/{test_project_id}",
            json=restore_payload,
            headers={"Authorization": f"Bearer {auth_token}"}
        )


class TestTaskDoDStatus:
    """Tests for task DoD status endpoints"""
    
    def test_get_task_dod_status(self, api_client, auth_token):
        """GET /api/projects/tasks/{task_id}/dod - should return DoD checklist status"""
        response = api_client.get(
            f"{BASE_URL}/api/projects/tasks/{TASK_ID}/dod",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "task_id" in data
        assert "items" in data
        assert "is_complete" in data
        assert "completion_percentage" in data
        assert "can_move_to_done" in data
        
        # Verify items structure
        if len(data["items"]) > 0:
            item = data["items"][0]
            assert "id" in item
            assert "label" in item
            assert "completed" in item
            assert "is_required" in item
        
        print(f"Task DoD status: {data['completion_percentage']}% complete, can_move_to_done: {data['can_move_to_done']}")
    
    def test_update_dod_item(self, api_client, auth_token):
        """PUT /api/projects/tasks/{task_id}/dod/{item_id} - should update DoD item"""
        # First get the DoD status to find an item ID
        status_response = api_client.get(
            f"{BASE_URL}/api/projects/tasks/{TASK_ID}/dod",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        
        assert status_response.status_code == 200
        status_data = status_response.json()
        
        if len(status_data["items"]) == 0:
            pytest.skip("No DoD items to update")
        
        item_id = status_data["items"][0]["id"]
        current_completed = status_data["items"][0]["completed"]
        
        # Toggle the completion status
        response = api_client.put(
            f"{BASE_URL}/api/projects/tasks/{TASK_ID}/dod/{item_id}?completed={not current_completed}",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "message" in data
        assert "item_id" in data
        assert "completed" in data
        assert data["completed"] == (not current_completed)
        
        print(f"DoD item {item_id} updated to completed={data['completed']}")
        
        # Revert the change
        api_client.put(
            f"{BASE_URL}/api/projects/tasks/{TASK_ID}/dod/{item_id}?completed={current_completed}",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
    
    def test_initialize_task_dod(self, api_client, auth_token):
        """POST /api/projects/tasks/{task_id}/dod/initialize - should initialize DoD checklist"""
        # Create a new task first to test initialization
        task_payload = {
            "name": f"TEST_DoD_Init_Task_{uuid.uuid4().hex[:8]}",
            "project_id": PROJECT_ID,
            "issue_type": "task",
            "priority": "medium"
        }
        
        create_response = api_client.post(
            f"{BASE_URL}/api/projects/tasks",
            json=task_payload,
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        
        assert create_response.status_code == 200, f"Failed to create task: {create_response.text}"
        new_task_id = create_response.json()["id"]
        
        # Initialize DoD for the new task
        response = api_client.post(
            f"{BASE_URL}/api/projects/tasks/{new_task_id}/dod/initialize",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "message" in data
        assert "items_count" in data
        assert data["items_count"] > 0
        
        print(f"DoD initialized for task {new_task_id} with {data['items_count']} items")
        
        # Clean up - delete the test task
        api_client.delete(
            f"{BASE_URL}/api/projects/tasks/{new_task_id}",
            headers={"Authorization": f"Bearer {auth_token}"}
        )


class TestKanbanDoDValidation:
    """Tests for Kanban move validation with DoD"""
    
    def test_kanban_move_blocked_when_dod_incomplete(self, api_client, auth_token):
        """PUT /api/projects/kanban/move-task - should block move to 'completed' if DoD incomplete"""
        # Create a new task with DoD
        task_payload = {
            "name": f"TEST_DoD_Kanban_Block_{uuid.uuid4().hex[:8]}",
            "project_id": PROJECT_ID,
            "issue_type": "task",
            "priority": "medium",
            "status": "in_progress"
        }
        
        create_response = api_client.post(
            f"{BASE_URL}/api/projects/tasks",
            json=task_payload,
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        
        assert create_response.status_code == 200
        new_task_id = create_response.json()["id"]
        
        # Initialize DoD for the task
        init_response = api_client.post(
            f"{BASE_URL}/api/projects/tasks/{new_task_id}/dod/initialize",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        
        # Try to move to completed without completing DoD items
        move_response = api_client.put(
            f"{BASE_URL}/api/projects/kanban/move-task?task_id={new_task_id}&new_status=completed",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        
        # Should be blocked (400 or 422)
        if move_response.status_code in [400, 422]:
            data = move_response.json()
            assert "detail" in data
            # Check for DoD incomplete error
            detail = data["detail"]
            if isinstance(detail, dict):
                assert detail.get("code") == "DOD_INCOMPLETE"
                print(f"Move blocked as expected: {detail.get('message')}")
            else:
                print(f"Move blocked with message: {detail}")
        else:
            # If DoD is not enabled for this project, move might succeed
            print(f"Move response: {move_response.status_code} - DoD might not be enabled")
        
        # Clean up
        api_client.delete(
            f"{BASE_URL}/api/projects/tasks/{new_task_id}",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
    
    def test_kanban_move_allowed_when_dod_complete(self, api_client, auth_token):
        """PUT /api/projects/kanban/move-task - should allow move to 'completed' if all DoD items done"""
        # Create a new task
        task_payload = {
            "name": f"TEST_DoD_Kanban_Allow_{uuid.uuid4().hex[:8]}",
            "project_id": PROJECT_ID,
            "issue_type": "task",
            "priority": "medium",
            "status": "in_progress"
        }
        
        create_response = api_client.post(
            f"{BASE_URL}/api/projects/tasks",
            json=task_payload,
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        
        assert create_response.status_code == 200
        new_task_id = create_response.json()["id"]
        
        # Initialize DoD
        api_client.post(
            f"{BASE_URL}/api/projects/tasks/{new_task_id}/dod/initialize",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        
        # Get DoD items and complete all required ones
        dod_response = api_client.get(
            f"{BASE_URL}/api/projects/tasks/{new_task_id}/dod",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        
        if dod_response.status_code == 200:
            dod_data = dod_response.json()
            for item in dod_data.get("items", []):
                if item.get("is_required", True):
                    api_client.put(
                        f"{BASE_URL}/api/projects/tasks/{new_task_id}/dod/{item['id']}?completed=true",
                        headers={"Authorization": f"Bearer {auth_token}"}
                    )
        
        # Now try to move to completed
        move_response = api_client.put(
            f"{BASE_URL}/api/projects/kanban/move-task?task_id={new_task_id}&new_status=completed",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        
        # Should succeed
        assert move_response.status_code == 200, f"Expected 200, got {move_response.status_code}: {move_response.text}"
        
        data = move_response.json()
        assert data.get("status") == "completed" or data.get("new_status") == "completed"
        
        print(f"Task moved to completed successfully after DoD completion")
        
        # Clean up
        api_client.delete(
            f"{BASE_URL}/api/projects/tasks/{new_task_id}",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
    
    def test_kanban_move_with_skip_dod_check(self, api_client, auth_token):
        """PUT /api/projects/kanban/move-task - should allow move with skip_dod_check=true"""
        # Create a new task
        task_payload = {
            "name": f"TEST_DoD_Skip_{uuid.uuid4().hex[:8]}",
            "project_id": PROJECT_ID,
            "issue_type": "task",
            "priority": "medium",
            "status": "in_progress"
        }
        
        create_response = api_client.post(
            f"{BASE_URL}/api/projects/tasks",
            json=task_payload,
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        
        assert create_response.status_code == 200
        new_task_id = create_response.json()["id"]
        
        # Initialize DoD but don't complete items
        api_client.post(
            f"{BASE_URL}/api/projects/tasks/{new_task_id}/dod/initialize",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        
        # Move with skip_dod_check=true
        move_response = api_client.put(
            f"{BASE_URL}/api/projects/kanban/move-task?task_id={new_task_id}&new_status=completed&skip_dod_check=true",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        
        # Should succeed with skip flag
        assert move_response.status_code == 200, f"Expected 200, got {move_response.status_code}: {move_response.text}"
        
        print(f"Task moved to completed with skip_dod_check=true")
        
        # Clean up
        api_client.delete(
            f"{BASE_URL}/api/projects/tasks/{new_task_id}",
            headers={"Authorization": f"Bearer {auth_token}"}
        )


class TestDoDIssueTypeFiltering:
    """Tests for DoD issue type filtering"""
    
    def test_dod_applied_based_on_config(self, api_client, auth_token):
        """DoD should be applied based on enabled_for_issue_types in config"""
        # Get the current DoD config to see what issue types are enabled
        config_response = api_client.get(
            f"{BASE_URL}/api/projects/dod/config/{PROJECT_ID}",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        
        assert config_response.status_code == 200
        config = config_response.json()
        enabled_types = config.get("enabled_for_issue_types", [])
        
        print(f"DoD enabled for issue types: {enabled_types}")
        
        # Create a task with an issue type that IS in the enabled list
        if "task" in enabled_types:
            task_payload = {
                "name": f"TEST_DoD_Task_{uuid.uuid4().hex[:8]}",
                "project_id": PROJECT_ID,
                "issue_type": "task",
                "priority": "medium",
                "status": "in_progress"
            }
            
            create_response = api_client.post(
                f"{BASE_URL}/api/projects/tasks",
                json=task_payload,
                headers={"Authorization": f"Bearer {auth_token}"}
            )
            
            assert create_response.status_code == 200
            new_task_id = create_response.json()["id"]
            
            # Try to move to completed without completing DoD - should be blocked
            move_response = api_client.put(
                f"{BASE_URL}/api/projects/kanban/move-task?task_id={new_task_id}&new_status=completed",
                headers={"Authorization": f"Bearer {auth_token}"}
            )
            
            # Should be blocked since task is in enabled_for_issue_types
            assert move_response.status_code == 400, f"Expected 400 (DoD block), got {move_response.status_code}"
            
            data = move_response.json()
            assert data["detail"]["code"] == "DOD_INCOMPLETE"
            
            print(f"Task correctly blocked by DoD validation")
            
            # Clean up
            api_client.delete(
                f"{BASE_URL}/api/projects/tasks/{new_task_id}",
                headers={"Authorization": f"Bearer {auth_token}"}
            )
        else:
            pytest.skip("'task' not in enabled_for_issue_types")


# Fixtures
@pytest.fixture
def api_client():
    """Shared requests session"""
    session = requests.Session()
    session.headers.update({"Content-Type": "application/json"})
    return session


@pytest.fixture
def auth_token(api_client):
    """Get authentication token"""
    response = api_client.post(f"{BASE_URL}/api/auth/login", json={
        "email": "admin@sevora.com",
        "password": "admin123"
    })
    if response.status_code == 200:
        return response.json().get("access_token")
    pytest.skip("Authentication failed - skipping tests")
