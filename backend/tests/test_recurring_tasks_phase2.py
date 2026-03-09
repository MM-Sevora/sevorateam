"""
Test Recurring Tasks Phase 2 Features:
- Dashboard with enhanced metrics (completion_rate, overdue, by_project, by_assignee, weekly_trend, top_templates)
- Project filter for recurring templates
- Quick Recurring feature templates (Daily Standup, Weekly Report, Monthly Review)
"""

import pytest
import requests
import os
from datetime import datetime

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
TEST_EMAIL = "superadmin@sevora.com"
TEST_PASSWORD = "superadmin123"

@pytest.fixture(scope="module")
def auth_token():
    """Get authentication token"""
    response = requests.post(f"{BASE_URL}/api/auth/login", json={
        "email": TEST_EMAIL,
        "password": TEST_PASSWORD
    })
    if response.status_code == 200:
        return response.json().get("access_token")
    pytest.skip("Authentication failed - skipping tests")

@pytest.fixture(scope="module")
def api_client(auth_token):
    """Create authenticated session"""
    session = requests.Session()
    session.headers.update({
        "Authorization": f"Bearer {auth_token}",
        "Content-Type": "application/json"
    })
    return session

# ============== DASHBOARD METRICS TESTS ==============

class TestRecurringDashboardMetrics:
    """Test the new dashboard metrics for Phase 2"""
    
    def test_dashboard_returns_new_metrics(self, api_client):
        """GET /api/projects/recurring-dashboard should return all new Phase 2 metrics"""
        response = api_client.get(f"{BASE_URL}/api/projects/recurring-dashboard")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        data = response.json()
        
        # Verify Phase 2 metrics exist
        assert "completion_rate" in data, "Missing completion_rate metric"
        assert "overdue_recurring" in data, "Missing overdue_recurring metric"
        assert "in_progress_recurring" in data, "Missing in_progress_recurring metric"
        assert "by_project" in data, "Missing by_project metric"
        assert "by_assignee" in data, "Missing by_assignee metric"
        assert "weekly_trend" in data, "Missing weekly_trend metric"
        assert "top_templates" in data, "Missing top_templates metric"
        
        # Also verify existing Phase 1 metrics still work
        assert "total_templates" in data
        assert "active_templates" in data
        assert "paused_templates" in data
        assert "by_frequency" in data
        
        print(f"✓ Dashboard returned all Phase 2 metrics")
        print(f"  - completion_rate: {data['completion_rate']}%")
        print(f"  - overdue_recurring: {data['overdue_recurring']}")
        print(f"  - in_progress_recurring: {data['in_progress_recurring']}")
        print(f"  - by_project count: {len(data['by_project'])}")
        print(f"  - by_assignee count: {len(data['by_assignee'])}")
        print(f"  - weekly_trend entries: {len(data['weekly_trend'])}")
        print(f"  - top_templates: {len(data['top_templates'])}")
    
    def test_completion_rate_is_percentage(self, api_client):
        """completion_rate should be a valid percentage value"""
        response = api_client.get(f"{BASE_URL}/api/projects/recurring-dashboard")
        assert response.status_code == 200
        data = response.json()
        
        completion_rate = data.get("completion_rate", 0)
        assert isinstance(completion_rate, (int, float)), "completion_rate should be numeric"
        assert 0 <= completion_rate <= 100, "completion_rate should be between 0 and 100"
        print(f"✓ completion_rate is valid percentage: {completion_rate}%")
    
    def test_weekly_trend_structure(self, api_client):
        """weekly_trend should have 4 weeks of data with correct structure"""
        response = api_client.get(f"{BASE_URL}/api/projects/recurring-dashboard")
        assert response.status_code == 200
        data = response.json()
        
        weekly_trend = data.get("weekly_trend", [])
        assert isinstance(weekly_trend, list), "weekly_trend should be a list"
        assert len(weekly_trend) == 4, f"Expected 4 weeks, got {len(weekly_trend)}"
        
        for entry in weekly_trend:
            assert "week_start" in entry, "Each entry should have week_start"
            assert "count" in entry, "Each entry should have count"
        
        print(f"✓ weekly_trend has correct structure with {len(weekly_trend)} weeks")
    
    def test_by_project_structure(self, api_client):
        """by_project should have correct structure"""
        response = api_client.get(f"{BASE_URL}/api/projects/recurring-dashboard")
        assert response.status_code == 200
        data = response.json()
        
        by_project = data.get("by_project", [])
        assert isinstance(by_project, list), "by_project should be a list"
        
        for entry in by_project:
            assert "project_id" in entry, "Each entry should have project_id"
            assert "project_name" in entry, "Each entry should have project_name"
            assert "template_count" in entry, "Each entry should have template_count"
        
        print(f"✓ by_project has correct structure with {len(by_project)} entries")
    
    def test_by_assignee_structure(self, api_client):
        """by_assignee should have correct structure"""
        response = api_client.get(f"{BASE_URL}/api/projects/recurring-dashboard")
        assert response.status_code == 200
        data = response.json()
        
        by_assignee = data.get("by_assignee", [])
        assert isinstance(by_assignee, list), "by_assignee should be a list"
        
        for entry in by_assignee:
            assert "user_id" in entry, "Each entry should have user_id"
            assert "user_name" in entry, "Each entry should have user_name"
            assert "template_count" in entry, "Each entry should have template_count"
        
        print(f"✓ by_assignee has correct structure with {len(by_assignee)} entries")
    
    def test_top_templates_structure(self, api_client):
        """top_templates should have correct structure"""
        response = api_client.get(f"{BASE_URL}/api/projects/recurring-dashboard")
        assert response.status_code == 200
        data = response.json()
        
        top_templates = data.get("top_templates", [])
        assert isinstance(top_templates, list), "top_templates should be a list"
        
        for entry in top_templates:
            assert "id" in entry, "Each entry should have id"
            assert "name" in entry, "Each entry should have name"
            assert "occurrences_generated" in entry, "Each entry should have occurrences_generated"
        
        print(f"✓ top_templates has correct structure with {len(top_templates)} entries")

# ============== PROJECT FILTER TESTS ==============

class TestProjectFilterForTemplates:
    """Test project filter for recurring templates"""
    
    def test_templates_filter_by_project(self, api_client):
        """GET /api/projects/recurring-templates with project_id filter"""
        # First get a project list to find a valid project_id
        projects_response = api_client.get(f"{BASE_URL}/api/projects/list")
        if projects_response.status_code == 200:
            projects = projects_response.json()
            if projects:
                project_id = projects[0].get("id")
                
                # Test filter
                response = api_client.get(f"{BASE_URL}/api/projects/recurring-templates?project_id={project_id}")
                assert response.status_code == 200, f"Expected 200, got {response.status_code}"
                
                templates = response.json()
                assert isinstance(templates, list), "Response should be a list"
                
                # Verify filtering works
                for t in templates:
                    if t.get("project_id"):
                        assert t["project_id"] == project_id, "Filter should return matching project"
                
                print(f"✓ Project filter works - returned {len(templates)} templates for project {project_id[:8]}...")
            else:
                print("⚠ No projects found - skipping project filter test")
        else:
            print("⚠ Could not fetch projects - skipping filter test")

# ============== QUICK RECURRING TEMPLATES TESTS ==============

class TestQuickRecurringTemplates:
    """Test Quick Recurring feature - Daily Standup, Weekly Report, Monthly Review"""
    
    def test_create_daily_standup_template(self, api_client):
        """Create Daily Standup recurring template (Mon-Fri)"""
        today = datetime.now().strftime("%Y-%m-%d")
        
        template_data = {
            "name": "TEST_Daily Standup",
            "description": "Daily team sync to discuss progress and blockers",
            "recurrence_type": "daily",
            "frequency": 1,
            "repeat_on_days": [0, 1, 2, 3, 4],  # Monday to Friday
            "start_date": today,
            "task_due_offset_days": 0,
            "priority": "medium"
        }
        
        response = api_client.post(
            f"{BASE_URL}/api/projects/recurring-templates",
            json=template_data
        )
        
        assert response.status_code in [200, 201], f"Expected 200/201, got {response.status_code}: {response.text}"
        data = response.json()
        
        # Verify template was created correctly
        assert data.get("name") == "TEST_Daily Standup"
        assert data.get("recurrence_type") == "daily"
        assert data.get("frequency") == 1
        assert set(data.get("repeat_on_days", [])) == {0, 1, 2, 3, 4}, "Should be Mon-Fri"
        
        print(f"✓ Daily Standup template created successfully")
        print(f"  - ID: {data.get('id')[:8]}...")
        print(f"  - Repeat days: Mon-Fri")
        
        # Store template_id for cleanup
        self.daily_standup_id = data.get("id")
        return data.get("id")
    
    def test_create_weekly_report_template(self, api_client):
        """Create Weekly Report recurring template (Fridays)"""
        today = datetime.now().strftime("%Y-%m-%d")
        
        template_data = {
            "name": "TEST_Weekly Report",
            "description": "Prepare and submit weekly status report",
            "recurrence_type": "weekly",
            "frequency": 1,
            "repeat_on_days": [4],  # Friday
            "start_date": today,
            "task_due_offset_days": 0,
            "priority": "medium"
        }
        
        response = api_client.post(
            f"{BASE_URL}/api/projects/recurring-templates",
            json=template_data
        )
        
        assert response.status_code in [200, 201], f"Expected 200/201, got {response.status_code}: {response.text}"
        data = response.json()
        
        # Verify template was created correctly
        assert data.get("name") == "TEST_Weekly Report"
        assert data.get("recurrence_type") == "weekly"
        assert data.get("frequency") == 1
        assert data.get("repeat_on_days") == [4], "Should be Friday only"
        
        print(f"✓ Weekly Report template created successfully")
        print(f"  - ID: {data.get('id')[:8]}...")
        print(f"  - Repeat day: Friday")
        
        self.weekly_report_id = data.get("id")
        return data.get("id")
    
    def test_create_monthly_review_template(self, api_client):
        """Create Monthly Review recurring template (Last Friday of month)"""
        today = datetime.now().strftime("%Y-%m-%d")
        
        template_data = {
            "name": "TEST_Monthly Review",
            "description": "Monthly performance and goals review",
            "recurrence_type": "monthly",
            "frequency": 1,
            "monthly_repeat_type": "weekday_of_month",
            "week_of_month": -1,  # Last week
            "weekday_of_month": 4,  # Friday
            "start_date": today,
            "task_due_offset_days": 0,
            "priority": "high"
        }
        
        response = api_client.post(
            f"{BASE_URL}/api/projects/recurring-templates",
            json=template_data
        )
        
        assert response.status_code in [200, 201], f"Expected 200/201, got {response.status_code}: {response.text}"
        data = response.json()
        
        # Verify template was created correctly
        assert data.get("name") == "TEST_Monthly Review"
        assert data.get("recurrence_type") == "monthly"
        assert data.get("frequency") == 1
        assert data.get("monthly_repeat_type") == "weekday_of_month"
        assert data.get("week_of_month") == -1, "Should be last week"
        assert data.get("weekday_of_month") == 4, "Should be Friday"
        
        print(f"✓ Monthly Review template created successfully")
        print(f"  - ID: {data.get('id')[:8]}...")
        print(f"  - Repeat: Last Friday of month")
        
        self.monthly_review_id = data.get("id")
        return data.get("id")

# ============== CLEANUP ==============

class TestCleanup:
    """Cleanup TEST_ prefixed data"""
    
    def test_cleanup_test_templates(self, api_client):
        """Delete TEST_ prefixed recurring templates"""
        # Get all templates
        response = api_client.get(f"{BASE_URL}/api/projects/recurring-templates")
        if response.status_code == 200:
            templates = response.json()
            test_templates = [t for t in templates if t.get("name", "").startswith("TEST_")]
            
            deleted_count = 0
            for template in test_templates:
                del_response = api_client.delete(
                    f"{BASE_URL}/api/projects/recurring-templates/{template['id']}"
                )
                if del_response.status_code in [200, 204]:
                    deleted_count += 1
            
            print(f"✓ Cleaned up {deleted_count} test templates")
        else:
            print("⚠ Could not fetch templates for cleanup")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
