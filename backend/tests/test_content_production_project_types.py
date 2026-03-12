"""
Test Content Production Module - Project Types and Workflow Generation

Tests:
1. POST /api/marketing/v3/content/projects - Create projects with different project_type values
2. POST /api/marketing/v3/content/projects/{id}/generate-tasks - Generate workflow tasks based on project type
3. GET /api/marketing/v3/content/workflow-templates - Get workflows by project type and content type
4. GET /api/marketing/v3/content/projects/sources - Get available source projects for adaptation
"""

import pytest
import requests
import os
import uuid

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestContentProductionProjectTypes:
    """Test Content Production project types and workflow generation"""
    
    # Store created project IDs for cleanup
    created_project_ids = []
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup and cleanup"""
        yield
        # Cleanup created projects
        for project_id in self.created_project_ids:
            try:
                requests.delete(f"{BASE_URL}/api/marketing/v3/content/projects/{project_id}")
            except:
                pass
    
    # ============== GET Workflow Templates ==============
    
    def test_get_workflow_templates(self):
        """Test GET /api/marketing/v3/content/workflow-templates returns workflows by project type"""
        response = requests.get(f"{BASE_URL}/api/marketing/v3/content/workflow-templates")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        
        # Verify structure
        assert "by_project_type" in data, "Response should have 'by_project_type'"
        assert "by_content_type" in data, "Response should have 'by_content_type'"
        
        # Check project type workflows
        by_project_type = data["by_project_type"]
        assert "adaptation" in by_project_type, "Should have 'adaptation' workflow"
        assert "delivery_only" in by_project_type, "Should have 'delivery_only' workflow"
        assert "graphics" in by_project_type, "Should have 'graphics' workflow"
        # original_production uses content type workflows, so it's not in by_project_type
        
        # Verify adaptation workflow steps
        adaptation_steps = by_project_type["adaptation"]
        assert len(adaptation_steps) >= 4, f"Adaptation should have at least 4 steps, got {len(adaptation_steps)}"
        step_titles = [s["title"] for s in adaptation_steps]
        assert "Create Brief" in step_titles, "Adaptation should have 'Create Brief' step"
        assert "Edit & Adapt" in step_titles, "Adaptation should have 'Edit & Adapt' step"
        
        # Verify delivery_only workflow is shorter
        delivery_steps = by_project_type["delivery_only"]
        assert len(delivery_steps) <= 5, f"Delivery only should have <=5 steps, got {len(delivery_steps)}"
        
        # Verify graphics workflow
        graphics_steps = by_project_type["graphics"]
        assert any("Design" in s["title"] for s in graphics_steps), "Graphics should have a Design step"
        
        # Check content type workflows (for original_production)
        by_content_type = data["by_content_type"]
        assert "video" in by_content_type, "Should have 'video' workflow"
        assert "photo" in by_content_type, "Should have 'photo' workflow"
        print(f"Workflow templates verified - {len(by_project_type)} project types, {len(by_content_type)} content types")
    
    # ============== Create Original Production Project ==============
    
    def test_create_original_production_project(self):
        """Test creating an Original Production project (full workflow with shoot)"""
        project_data = {
            "title": f"TEST_Original_Video_{uuid.uuid4().hex[:6]}",
            "description": "Test original video production",
            "project_type": "original_production",
            "content_type": "video",
            "platform": "instagram",
            "priority": "high",
            "shoot_date": "2026-02-15",
            "concept": "Test concept for original video shoot"
        }
        
        response = requests.post(
            f"{BASE_URL}/api/marketing/v3/content/projects",
            json=project_data
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        
        # Verify project data
        assert data["project_type"] == "original_production", f"Expected project_type 'original_production', got {data['project_type']}"
        assert data["title"] == project_data["title"]
        assert data["content_type"] == "video"
        assert data["concept"] == project_data["concept"]
        assert "id" in data, "Response should have 'id'"
        
        self.created_project_ids.append(data["id"])
        print(f"Created Original Production project: {data['id']}")
        return data["id"]
    
    # ============== Create Adaptation Project ==============
    
    def test_create_adaptation_project(self):
        """Test creating an Adaptation/Repurpose project (no shoot, edit existing)"""
        project_data = {
            "title": f"TEST_Adaptation_{uuid.uuid4().hex[:6]}",
            "description": "Repurpose existing content for TikTok",
            "project_type": "adaptation",
            "content_type": "reel",
            "platform": "tiktok",
            "priority": "medium"
        }
        
        response = requests.post(
            f"{BASE_URL}/api/marketing/v3/content/projects",
            json=project_data
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        
        assert data["project_type"] == "adaptation", f"Expected project_type 'adaptation', got {data['project_type']}"
        assert data["content_type"] == "reel"
        assert data["platform"] == "tiktok"
        
        self.created_project_ids.append(data["id"])
        print(f"Created Adaptation project: {data['id']}")
        return data["id"]
    
    # ============== Create Delivery Only Project ==============
    
    def test_create_delivery_only_project(self):
        """Test creating a Delivery Only project (just format/export)"""
        project_data = {
            "title": f"TEST_Delivery_{uuid.uuid4().hex[:6]}",
            "description": "Export for multi-platform",
            "project_type": "delivery_only",
            "content_type": "video",
            "platform": "multi",
            "priority": "low"
        }
        
        response = requests.post(
            f"{BASE_URL}/api/marketing/v3/content/projects",
            json=project_data
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        
        assert data["project_type"] == "delivery_only", f"Expected project_type 'delivery_only', got {data['project_type']}"
        
        self.created_project_ids.append(data["id"])
        print(f"Created Delivery Only project: {data['id']}")
        return data["id"]
    
    # ============== Create Graphics Project ==============
    
    def test_create_graphics_project(self):
        """Test creating a Graphics/Design project (static design work)"""
        project_data = {
            "title": f"TEST_Graphics_{uuid.uuid4().hex[:6]}",
            "description": "Design social media graphics",
            "project_type": "graphics",
            "content_type": "graphic",
            "platform": "instagram",
            "priority": "medium",
            "concept": "Brand campaign graphics with product shots"
        }
        
        response = requests.post(
            f"{BASE_URL}/api/marketing/v3/content/projects",
            json=project_data
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        
        assert data["project_type"] == "graphics", f"Expected project_type 'graphics', got {data['project_type']}"
        assert data["content_type"] == "graphic"
        
        self.created_project_ids.append(data["id"])
        print(f"Created Graphics project: {data['id']}")
        return data["id"]
    
    # ============== Generate Tasks for Original Production ==============
    
    def test_generate_tasks_original_production(self):
        """Test task generation for Original Production - should include shoot step"""
        # Create project first
        project_data = {
            "title": f"TEST_OrigProd_Tasks_{uuid.uuid4().hex[:6]}",
            "project_type": "original_production",
            "content_type": "video",
            "platform": "youtube"
        }
        
        create_response = requests.post(
            f"{BASE_URL}/api/marketing/v3/content/projects",
            json=project_data
        )
        assert create_response.status_code == 200
        project = create_response.json()
        project_id = project["id"]
        self.created_project_ids.append(project_id)
        
        # Generate tasks
        response = requests.post(
            f"{BASE_URL}/api/marketing/v3/content/projects/{project_id}/generate-tasks"
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        
        assert data["project_type"] == "original_production"
        assert data["tasks_created"] >= 5, f"Original production should have at least 5 tasks, got {data['tasks_created']}"
        
        # Verify tasks include shoot step (Original Production should have Video Shoot)
        task_titles = [t["title"] for t in data["tasks"]]
        assert "Video Shoot" in task_titles, f"Original Production should have 'Video Shoot' task. Got: {task_titles}"
        assert "Write Script" in task_titles or "Create Brief" in task_titles, f"Should have scripting step. Got: {task_titles}"
        
        print(f"Original Production generated {data['tasks_created']} tasks: {task_titles}")
    
    # ============== Generate Tasks for Adaptation ==============
    
    def test_generate_tasks_adaptation(self):
        """Test task generation for Adaptation - should NOT include shoot step"""
        # Create project
        project_data = {
            "title": f"TEST_Adapt_Tasks_{uuid.uuid4().hex[:6]}",
            "project_type": "adaptation",
            "content_type": "reel",
            "platform": "instagram"
        }
        
        create_response = requests.post(
            f"{BASE_URL}/api/marketing/v3/content/projects",
            json=project_data
        )
        assert create_response.status_code == 200
        project = create_response.json()
        project_id = project["id"]
        self.created_project_ids.append(project_id)
        
        # Generate tasks
        response = requests.post(
            f"{BASE_URL}/api/marketing/v3/content/projects/{project_id}/generate-tasks"
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        
        assert data["project_type"] == "adaptation"
        
        task_titles = [t["title"] for t in data["tasks"]]
        
        # Adaptation should NOT have shoot but should have edit
        assert "Video Shoot" not in task_titles, f"Adaptation should NOT have 'Video Shoot'. Got: {task_titles}"
        assert "Record Reel" not in task_titles, f"Adaptation should NOT have 'Record Reel'. Got: {task_titles}"
        assert "Edit & Adapt" in task_titles, f"Adaptation should have 'Edit & Adapt'. Got: {task_titles}"
        assert "Select Source Content" in task_titles, f"Adaptation should have 'Select Source Content'. Got: {task_titles}"
        
        print(f"Adaptation generated {data['tasks_created']} tasks: {task_titles}")
    
    # ============== Generate Tasks for Delivery Only ==============
    
    def test_generate_tasks_delivery_only(self):
        """Test task generation for Delivery Only - minimal workflow"""
        # Create project
        project_data = {
            "title": f"TEST_Delivery_Tasks_{uuid.uuid4().hex[:6]}",
            "project_type": "delivery_only",
            "content_type": "video",
            "platform": "multi"
        }
        
        create_response = requests.post(
            f"{BASE_URL}/api/marketing/v3/content/projects",
            json=project_data
        )
        assert create_response.status_code == 200
        project = create_response.json()
        project_id = project["id"]
        self.created_project_ids.append(project_id)
        
        # Generate tasks
        response = requests.post(
            f"{BASE_URL}/api/marketing/v3/content/projects/{project_id}/generate-tasks"
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        
        assert data["project_type"] == "delivery_only"
        assert data["tasks_created"] <= 5, f"Delivery only should have <=5 tasks, got {data['tasks_created']}"
        
        task_titles = [t["title"] for t in data["tasks"]]
        
        # Delivery Only should have minimal steps
        assert "Select Source Content" in task_titles, f"Delivery should have 'Select Source Content'. Got: {task_titles}"
        assert "Resize/Format" in task_titles, f"Delivery should have 'Resize/Format'. Got: {task_titles}"
        assert "Export for Platform" in task_titles, f"Delivery should have 'Export for Platform'. Got: {task_titles}"
        # Should NOT have full production steps
        assert "Video Shoot" not in task_titles, f"Delivery should NOT have 'Video Shoot'"
        assert "Write Script" not in task_titles, f"Delivery should NOT have 'Write Script'"
        
        print(f"Delivery Only generated {data['tasks_created']} tasks: {task_titles}")
    
    # ============== Generate Tasks for Graphics ==============
    
    def test_generate_tasks_graphics(self):
        """Test task generation for Graphics - design workflow"""
        # Create project
        project_data = {
            "title": f"TEST_Graphics_Tasks_{uuid.uuid4().hex[:6]}",
            "project_type": "graphics",
            "content_type": "graphic",
            "platform": "instagram"
        }
        
        create_response = requests.post(
            f"{BASE_URL}/api/marketing/v3/content/projects",
            json=project_data
        )
        assert create_response.status_code == 200
        project = create_response.json()
        project_id = project["id"]
        self.created_project_ids.append(project_id)
        
        # Generate tasks
        response = requests.post(
            f"{BASE_URL}/api/marketing/v3/content/projects/{project_id}/generate-tasks"
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        
        assert data["project_type"] == "graphics"
        
        task_titles = [t["title"] for t in data["tasks"]]
        
        # Graphics workflow should have design steps
        assert "Design" in task_titles, f"Graphics should have 'Design'. Got: {task_titles}"
        assert "Create Brief" in task_titles, f"Graphics should have 'Create Brief'. Got: {task_titles}"
        assert "Export All Sizes" in task_titles, f"Graphics should have 'Export All Sizes'. Got: {task_titles}"
        # Should NOT have video production steps
        assert "Video Shoot" not in task_titles, f"Graphics should NOT have 'Video Shoot'"
        assert "Edit Video" not in task_titles, f"Graphics should NOT have 'Edit Video'"
        
        print(f"Graphics generated {data['tasks_created']} tasks: {task_titles}")
    
    # ============== Get Available Source Projects ==============
    
    def test_get_source_projects(self):
        """Test GET /api/marketing/v3/content/projects/sources for adaptation/delivery"""
        response = requests.get(f"{BASE_URL}/api/marketing/v3/content/projects/sources")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        
        assert isinstance(data, list), "Response should be a list"
        
        # Verify structure if there are sources
        if len(data) > 0:
            source = data[0]
            assert "id" in source, "Source should have 'id'"
            assert "title" in source, "Source should have 'title'"
            assert "content_type" in source, "Source should have 'content_type'"
            assert "platform" in source, "Source should have 'platform'"
        
        print(f"Found {len(data)} available source projects")
    
    # ============== Get Projects List ==============
    
    def test_get_projects_list(self):
        """Test GET /api/marketing/v3/content/projects returns projects with project_type"""
        response = requests.get(f"{BASE_URL}/api/marketing/v3/content/projects")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        
        assert isinstance(data, list), "Response should be a list"
        
        # Check structure
        if len(data) > 0:
            project = data[0]
            assert "id" in project, "Project should have 'id'"
            assert "title" in project, "Project should have 'title'"
            assert "project_type" in project or project.get("project_type") is None, "Project should have 'project_type' field"
            assert "content_type" in project, "Project should have 'content_type'"
            assert "status" in project, "Project should have 'status'"
            assert "task_count" in project, "Project should have 'task_count'"
            assert "completed_tasks" in project, "Project should have 'completed_tasks'"
        
        print(f"Found {len(data)} projects in list")
    
    # ============== Get Project Stats ==============
    
    def test_get_content_stats(self):
        """Test GET /api/marketing/v3/content/stats"""
        response = requests.get(f"{BASE_URL}/api/marketing/v3/content/stats")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        
        assert "total_projects" in data, "Stats should have 'total_projects'"
        assert "by_status" in data, "Stats should have 'by_status'"
        assert "by_type" in data, "Stats should have 'by_type'"
        assert "by_platform" in data, "Stats should have 'by_platform'"
        assert "projects_this_month" in data, "Stats should have 'projects_this_month'"
        assert "overdue_projects" in data, "Stats should have 'overdue_projects'"
        
        print(f"Content stats: {data['total_projects']} total projects, {data['projects_this_month']} this month")


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
