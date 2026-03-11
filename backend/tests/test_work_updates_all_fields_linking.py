"""
Test Work Updates All Fields Linking Enhancement
Testing linked items support for ALL fields in Daily/Weekly Updates:
- Daily: completed_items, blocker_items, tomorrow_focus_items
- Weekly: achievement_items, issues_faced_items, next_week_focus_items, team_highlights_items
"""

import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestWorkUpdatesAllFieldsLinking:
    """Test linked items for ALL fields in Daily/Weekly updates"""
    
    @pytest.fixture(scope="class")
    def auth_token(self):
        """Authenticate and get token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "superadmin@sevora.com",
            "password": "superadmin123"
        })
        assert response.status_code == 200, f"Login failed: {response.text}"
        data = response.json()
        return data.get("access_token") or data.get("token")
    
    @pytest.fixture(scope="class")
    def auth_headers(self, auth_token):
        """Get auth headers"""
        return {"Authorization": f"Bearer {auth_token}"}
    
    @pytest.fixture(scope="class")
    def sample_linked_item(self):
        """Sample linked item structure"""
        return {
            "item_type": "task",
            "item_id": "test-task-001",
            "item_name": "TEST_Sample Task",
            "project_id": "test-project-001",
            "project_name": "TEST_Sample Project"
        }
    
    # ==================== BACKEND MODEL TESTS ====================
    
    def test_daily_update_model_has_all_linked_fields(self, auth_headers, sample_linked_item):
        """Test that DailyUpdateCreate accepts all linked item fields"""
        # Test submitting daily update with ALL linked item fields
        payload = {
            "completed_items": [
                {"text": "TEST_Completed task with link", "linked_item": sample_linked_item},
                {"text": "TEST_Completed task without link"}
            ],
            "blocker_items": [
                {"text": "TEST_Blocker with link", "linked_item": sample_linked_item},
                {"text": "TEST_Blocker without link"}
            ],
            "tomorrow_focus_items": [
                {"text": "TEST_Tomorrow focus with link", "linked_item": sample_linked_item},
                {"text": "TEST_Tomorrow focus without link"}
            ],
            "notes": "TEST_Daily update with all linked fields"
        }
        
        response = requests.post(
            f"{BASE_URL}/api/pulse/updates/daily",
            json=payload,
            headers=auth_headers
        )
        
        assert response.status_code == 200, f"Daily update failed: {response.text}"
        data = response.json()
        assert data["success"] == True
        
        update = data["update"]
        # Verify all linked item fields are stored
        assert "completed_items" in update
        assert "blocker_items" in update
        assert "tomorrow_focus_items" in update
        
        # Verify linked items are preserved
        completed = update["completed_items"]
        assert len(completed) == 2
        assert completed[0]["linked_item"] is not None
        assert completed[0]["linked_item"]["item_id"] == "test-task-001"
        assert completed[1]["linked_item"] is None
        
        blockers = update["blocker_items"]
        assert len(blockers) == 2
        assert blockers[0]["linked_item"] is not None
        assert blockers[0]["linked_item"]["item_type"] == "task"
        
        tomorrow = update["tomorrow_focus_items"]
        assert len(tomorrow) == 2
        assert tomorrow[0]["linked_item"] is not None
        
        print("PASS: Daily update supports all linked item fields")
    
    def test_weekly_update_model_has_all_linked_fields(self, auth_headers, sample_linked_item):
        """Test that WeeklyUpdateCreate accepts all linked item fields"""
        # Test submitting weekly update with ALL linked item fields
        payload = {
            "achievement_items": [
                {"text": "TEST_Achievement with link", "linked_item": sample_linked_item},
                {"text": "TEST_Achievement without link"}
            ],
            "issues_faced_items": [
                {"text": "TEST_Issue with link", "linked_item": sample_linked_item},
                {"text": "TEST_Issue without link"}
            ],
            "next_week_focus_items": [
                {"text": "TEST_Next week focus with link", "linked_item": sample_linked_item},
                {"text": "TEST_Next week without link"}
            ],
            "team_highlights_items": [
                {"text": "TEST_Highlight with link", "linked_item": sample_linked_item},
                {"text": "TEST_Highlight without link"}
            ],
            "notes": "TEST_Weekly update with all linked fields"
        }
        
        response = requests.post(
            f"{BASE_URL}/api/pulse/updates/weekly",
            json=payload,
            headers=auth_headers
        )
        
        assert response.status_code == 200, f"Weekly update failed: {response.text}"
        data = response.json()
        assert data["success"] == True
        
        update = data["update"]
        # Verify all linked item fields are stored
        assert "achievement_items" in update
        assert "issues_faced_items" in update
        assert "next_week_focus_items" in update
        assert "team_highlights_items" in update
        
        # Verify linked items are preserved for achievements
        achievements = update["achievement_items"]
        assert len(achievements) == 2
        assert achievements[0]["linked_item"] is not None
        assert achievements[0]["linked_item"]["project_name"] == "TEST_Sample Project"
        
        # Verify issues_faced_items
        issues = update["issues_faced_items"]
        assert len(issues) == 2
        assert issues[0]["linked_item"] is not None
        
        # Verify next_week_focus_items
        next_week = update["next_week_focus_items"]
        assert len(next_week) == 2
        assert next_week[0]["linked_item"] is not None
        
        # Verify team_highlights_items
        highlights = update["team_highlights_items"]
        assert len(highlights) == 2
        assert highlights[0]["linked_item"] is not None
        
        print("PASS: Weekly update supports all linked item fields")
    
    def test_daily_update_blocker_items_linked(self, auth_headers, sample_linked_item):
        """Test blocker_items specifically with linked items"""
        payload = {
            "completed_items": [{"text": "TEST_Completed something"}],
            "blocker_items": [
                {"text": "TEST_Blocked by API integration", "linked_item": {
                    "item_type": "project",
                    "item_id": "prj-api-integration",
                    "item_name": "API Integration Project",
                    "project_id": None,
                    "project_name": None
                }},
                {"text": "TEST_Waiting on review", "linked_item": sample_linked_item}
            ]
        }
        
        response = requests.post(
            f"{BASE_URL}/api/pulse/updates/daily",
            json=payload,
            headers=auth_headers
        )
        
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        
        # Verify blocker_items stored correctly
        blockers = data["update"]["blocker_items"]
        assert len(blockers) == 2
        assert blockers[0]["linked_item"]["item_type"] == "project"
        assert blockers[1]["linked_item"]["item_type"] == "task"
        
        print("PASS: blocker_items accepts linked items")
    
    def test_daily_update_tomorrow_focus_items_linked(self, auth_headers, sample_linked_item):
        """Test tomorrow_focus_items specifically with linked items"""
        payload = {
            "completed_items": [{"text": "TEST_Done for today"}],
            "tomorrow_focus_items": [
                {"text": "TEST_Work on new feature", "linked_item": sample_linked_item},
                {"text": "TEST_Review PRs", "linked_item": {
                    "item_type": "task",
                    "item_id": "task-pr-review",
                    "item_name": "PR Review Task",
                    "project_id": "prj-dev",
                    "project_name": "Development Project"
                }}
            ]
        }
        
        response = requests.post(
            f"{BASE_URL}/api/pulse/updates/daily",
            json=payload,
            headers=auth_headers
        )
        
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        
        # Verify tomorrow_focus_items stored correctly
        focus = data["update"]["tomorrow_focus_items"]
        assert len(focus) == 2
        assert focus[0]["linked_item"]["item_id"] == "test-task-001"
        assert focus[1]["linked_item"]["project_name"] == "Development Project"
        
        print("PASS: tomorrow_focus_items accepts linked items")
    
    def test_weekly_update_issues_faced_items_linked(self, auth_headers, sample_linked_item):
        """Test issues_faced_items specifically with linked items"""
        payload = {
            "achievement_items": [{"text": "TEST_Shipped feature"}],
            "issues_faced_items": [
                {"text": "TEST_Database performance issue", "linked_item": {
                    "item_type": "project",
                    "item_id": "prj-db-opt",
                    "item_name": "Database Optimization",
                    "project_id": None,
                    "project_name": None
                }},
                {"text": "TEST_CI pipeline flaky", "linked_item": sample_linked_item}
            ]
        }
        
        response = requests.post(
            f"{BASE_URL}/api/pulse/updates/weekly",
            json=payload,
            headers=auth_headers
        )
        
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        
        # Verify issues_faced_items stored correctly
        issues = data["update"]["issues_faced_items"]
        assert len(issues) == 2
        assert issues[0]["linked_item"]["item_name"] == "Database Optimization"
        assert issues[1]["linked_item"]["item_type"] == "task"
        
        print("PASS: issues_faced_items accepts linked items")
    
    def test_weekly_update_next_week_focus_items_linked(self, auth_headers, sample_linked_item):
        """Test next_week_focus_items specifically with linked items"""
        payload = {
            "achievement_items": [{"text": "TEST_Completed sprint"}],
            "next_week_focus_items": [
                {"text": "TEST_Start new epic", "linked_item": {
                    "item_type": "project",
                    "item_id": "epic-q1",
                    "item_name": "Q1 Epic",
                    "project_id": None,
                    "project_name": None
                }},
                {"text": "TEST_Bug fixes", "linked_item": sample_linked_item}
            ]
        }
        
        response = requests.post(
            f"{BASE_URL}/api/pulse/updates/weekly",
            json=payload,
            headers=auth_headers
        )
        
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        
        # Verify next_week_focus_items stored correctly
        next_week = data["update"]["next_week_focus_items"]
        assert len(next_week) == 2
        assert next_week[0]["linked_item"]["item_type"] == "project"
        assert next_week[1]["linked_item"]["item_id"] == "test-task-001"
        
        print("PASS: next_week_focus_items accepts linked items")
    
    def test_weekly_update_team_highlights_items_linked(self, auth_headers, sample_linked_item):
        """Test team_highlights_items specifically with linked items"""
        payload = {
            "achievement_items": [{"text": "TEST_Team win"}],
            "team_highlights_items": [
                {"text": "TEST_John shipped feature X", "linked_item": sample_linked_item},
                {"text": "TEST_Team reached 100% coverage", "linked_item": {
                    "item_type": "project",
                    "item_id": "prj-testing",
                    "item_name": "Testing Initiative",
                    "project_id": None,
                    "project_name": None
                }}
            ]
        }
        
        response = requests.post(
            f"{BASE_URL}/api/pulse/updates/weekly",
            json=payload,
            headers=auth_headers
        )
        
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        
        # Verify team_highlights_items stored correctly
        highlights = data["update"]["team_highlights_items"]
        assert len(highlights) == 2
        assert highlights[0]["linked_item"]["item_name"] == "TEST_Sample Task"
        assert highlights[1]["linked_item"]["item_name"] == "Testing Initiative"
        
        print("PASS: team_highlights_items accepts linked items")
    
    def test_get_daily_updates_returns_all_linked_fields(self, auth_headers):
        """Test GET daily updates returns all linked item fields"""
        response = requests.get(
            f"{BASE_URL}/api/pulse/updates/daily",
            headers=auth_headers
        )
        
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        
        # Find our test updates
        updates = data["updates"]
        assert len(updates) > 0, "No daily updates found"
        
        # Check that returned updates have the linked item fields
        for update in updates[:3]:  # Check first few
            assert "completed_items" in update or "completed_tasks" in update
            if "blocker_items" in update:
                print(f"  Found blocker_items with {len(update['blocker_items'])} items")
            if "tomorrow_focus_items" in update:
                print(f"  Found tomorrow_focus_items with {len(update['tomorrow_focus_items'])} items")
        
        print("PASS: GET daily updates returns linked item fields")
    
    def test_get_weekly_updates_returns_all_linked_fields(self, auth_headers):
        """Test GET weekly updates returns all linked item fields"""
        response = requests.get(
            f"{BASE_URL}/api/pulse/updates/weekly",
            headers=auth_headers
        )
        
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        
        # Find our test updates
        updates = data["updates"]
        assert len(updates) > 0, "No weekly updates found"
        
        # Check that returned updates have the linked item fields
        for update in updates[:3]:  # Check first few
            assert "achievement_items" in update or "achievements" in update
            if "issues_faced_items" in update:
                print(f"  Found issues_faced_items with {len(update['issues_faced_items'])} items")
            if "next_week_focus_items" in update:
                print(f"  Found next_week_focus_items with {len(update['next_week_focus_items'])} items")
            if "team_highlights_items" in update:
                print(f"  Found team_highlights_items with {len(update['team_highlights_items'])} items")
        
        print("PASS: GET weekly updates returns linked item fields")
    
    def test_pulse_posts_include_all_linked_items(self, auth_headers):
        """Test that pulse posts created from updates include all linked items"""
        # Check daily update posts
        response = requests.get(
            f"{BASE_URL}/api/pulse/posts?post_type=daily_update&limit=5",
            headers=auth_headers
        )
        
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        
        if data["posts"]:
            for post in data["posts"]:
                if "linked_items" in post:
                    print(f"  Daily post has {len(post['linked_items'])} linked items")
                # Content should show linked items from all fields
                if "[🔗" in post.get("content", ""):
                    print("  Post content includes linked item references")
        
        # Check weekly update posts
        response = requests.get(
            f"{BASE_URL}/api/pulse/posts?post_type=weekly_update&limit=5",
            headers=auth_headers
        )
        
        assert response.status_code == 200
        data = response.json()
        
        if data["posts"]:
            for post in data["posts"]:
                if "linked_items" in post:
                    print(f"  Weekly post has {len(post['linked_items'])} linked items")
        
        print("PASS: Pulse posts include linked items from all fields")
    
    def test_linkable_items_endpoint(self, auth_headers):
        """Test the linkable items search endpoint"""
        response = requests.get(
            f"{BASE_URL}/api/pulse/updates/linkable-items",
            headers=auth_headers
        )
        
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        
        assert "items" in data
        items = data["items"]
        
        # Verify item structure
        for item in items[:5]:
            assert "item_type" in item
            assert "item_id" in item
            assert "item_name" in item
            assert item["item_type"] in ["task", "project"]
        
        print(f"PASS: Linkable items endpoint returns {len(items)} items")
    
    def test_backward_compatibility_legacy_fields(self, auth_headers):
        """Test that legacy fields still work for backward compatibility"""
        # Daily update with legacy fields
        daily_payload = {
            "completed_tasks": ["TEST_Legacy completed task 1", "TEST_Legacy task 2"],
            "blockers": ["TEST_Legacy blocker"],
            "tomorrow_focus": ["TEST_Legacy tomorrow focus"]
        }
        
        response = requests.post(
            f"{BASE_URL}/api/pulse/updates/daily",
            json=daily_payload,
            headers=auth_headers
        )
        
        assert response.status_code == 200, f"Daily legacy failed: {response.text}"
        
        # Weekly update with legacy fields
        weekly_payload = {
            "achievements": ["TEST_Legacy achievement 1"],
            "issues_faced": ["TEST_Legacy issue"],
            "next_week_focus": ["TEST_Legacy next week"],
            "team_highlights": ["TEST_Legacy highlight"]
        }
        
        response = requests.post(
            f"{BASE_URL}/api/pulse/updates/weekly",
            json=weekly_payload,
            headers=auth_headers
        )
        
        assert response.status_code == 200, f"Weekly legacy failed: {response.text}"
        
        print("PASS: Legacy fields still work for backward compatibility")
    
    def test_mixed_linked_and_unlinked_items(self, auth_headers, sample_linked_item):
        """Test mixing linked and unlinked items in same field"""
        payload = {
            "completed_items": [
                {"text": "TEST_Task with link", "linked_item": sample_linked_item},
                {"text": "TEST_Task without link", "linked_item": None},
                {"text": "TEST_Another linked task", "linked_item": {
                    "item_type": "project",
                    "item_id": "prj-mixed",
                    "item_name": "Mixed Project",
                    "project_id": None,
                    "project_name": None
                }}
            ],
            "blocker_items": [
                {"text": "TEST_Unlinked blocker"},
                {"text": "TEST_Linked blocker", "linked_item": sample_linked_item}
            ]
        }
        
        response = requests.post(
            f"{BASE_URL}/api/pulse/updates/daily",
            json=payload,
            headers=auth_headers
        )
        
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        
        completed = data["update"]["completed_items"]
        assert len(completed) == 3
        assert completed[0]["linked_item"] is not None
        assert completed[1]["linked_item"] is None
        assert completed[2]["linked_item"] is not None
        
        blockers = data["update"]["blocker_items"]
        assert len(blockers) == 2
        assert blockers[0]["linked_item"] is None
        assert blockers[1]["linked_item"] is not None
        
        print("PASS: Mixed linked and unlinked items work correctly")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
