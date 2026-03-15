"""
Test Work Updates CRUD - All Update Types
Testing Complete CRUD operations for:
- Daily Updates: POST, GET, PUT, DELETE
- Weekly Updates: POST, GET, PUT, DELETE
- Monthly Updates: POST, GET, PUT, DELETE
- Quarterly Updates: POST, GET, PUT, DELETE
"""

import pytest
import requests
import os
import uuid
from datetime import datetime

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestWorkUpdatesCRUD:
    """Test all CRUD operations for work updates (daily, weekly, monthly, quarterly)"""
    
    @pytest.fixture(scope="class")
    def auth_token(self):
        """Get authentication token"""
        # Login as superadmin for testing
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "superadmin@sevora.com",
            "password": "admin123"
        })
        if response.status_code == 200:
            data = response.json()
            return data.get("access_token") or data.get("token")
        pytest.skip("Authentication failed - skipping tests")
    
    @pytest.fixture(scope="class")
    def headers(self, auth_token):
        """Get headers with auth token"""
        return {
            "Authorization": f"Bearer {auth_token}",
            "Content-Type": "application/json"
        }
    
    # ==================== DAILY UPDATES TESTS ====================
    
    def test_01_create_daily_update(self, headers):
        """POST /api/pulse/updates/daily - Create daily update"""
        payload = {
            "completed_tasks": ["TEST_Completed task 1", "TEST_Completed task 2"],
            "blockers": ["TEST_Blocker 1"],
            "tomorrow_focus": ["TEST_Focus item 1"],
            "notes": "TEST_Daily update notes",
            "update_date": datetime.now().strftime("%Y-%m-%d")
        }
        
        response = requests.post(
            f"{BASE_URL}/api/pulse/updates/daily",
            json=payload,
            headers=headers
        )
        
        print(f"Daily Create Response: {response.status_code}")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data.get("success") == True
        assert "update" in data
        assert data["update"].get("completed_tasks") is not None
        
        # Store update ID for later tests
        pytest.daily_update_id = data["update"].get("id")
        print(f"Created daily update ID: {pytest.daily_update_id}")
    
    def test_02_get_daily_updates(self, headers):
        """GET /api/pulse/updates/daily - Get daily updates"""
        response = requests.get(
            f"{BASE_URL}/api/pulse/updates/daily",
            headers=headers
        )
        
        print(f"Daily GET Response: {response.status_code}")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "updates" in data
        assert isinstance(data["updates"], list)
        print(f"Found {len(data['updates'])} daily updates")
    
    def test_03_update_daily_update(self, headers):
        """PUT /api/pulse/updates/daily/{update_id} - Update daily update"""
        if not hasattr(pytest, 'daily_update_id') or not pytest.daily_update_id:
            pytest.skip("No daily update ID from previous test")
        
        payload = {
            "completed_items": [{"text": "TEST_Updated completed task", "linked_item": None}],
            "blocker_items": [{"text": "TEST_Updated blocker", "linked_item": None}],
            "tomorrow_focus_items": [{"text": "TEST_Updated focus item", "linked_item": None}],
            "notes": "TEST_Updated daily notes"
        }
        
        response = requests.put(
            f"{BASE_URL}/api/pulse/updates/daily/{pytest.daily_update_id}",
            json=payload,
            headers=headers
        )
        
        print(f"Daily PUT Response: {response.status_code}")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data.get("success") == True
        assert data.get("message") == "Update modified"
        print("Daily update modified successfully")
    
    def test_04_delete_daily_update(self, headers):
        """DELETE /api/pulse/updates/daily/{update_id} - Delete daily update"""
        if not hasattr(pytest, 'daily_update_id') or not pytest.daily_update_id:
            pytest.skip("No daily update ID from previous test")
        
        response = requests.delete(
            f"{BASE_URL}/api/pulse/updates/daily/{pytest.daily_update_id}",
            headers=headers
        )
        
        print(f"Daily DELETE Response: {response.status_code}")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data.get("success") == True
        assert "deleted" in data.get("message", "").lower()
        print("Daily update deleted successfully")
    
    # ==================== WEEKLY UPDATES TESTS ====================
    
    def test_05_create_weekly_update(self, headers):
        """POST /api/pulse/updates/weekly - Create weekly update"""
        payload = {
            "achievements": ["TEST_Achievement 1", "TEST_Achievement 2"],
            "key_metrics": {"sales": 100, "leads": 50},
            "issues_faced": ["TEST_Issue 1"],
            "next_week_focus": ["TEST_Next week focus 1"],
            "team_highlights": ["TEST_Team highlight 1"],
            "notes": "TEST_Weekly update notes"
        }
        
        response = requests.post(
            f"{BASE_URL}/api/pulse/updates/weekly",
            json=payload,
            headers=headers
        )
        
        print(f"Weekly Create Response: {response.status_code}")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data.get("success") == True
        assert "update" in data
        
        pytest.weekly_update_id = data["update"].get("id")
        print(f"Created weekly update ID: {pytest.weekly_update_id}")
    
    def test_06_get_weekly_updates(self, headers):
        """GET /api/pulse/updates/weekly - Get weekly updates"""
        response = requests.get(
            f"{BASE_URL}/api/pulse/updates/weekly",
            headers=headers
        )
        
        print(f"Weekly GET Response: {response.status_code}")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "updates" in data
        assert isinstance(data["updates"], list)
        print(f"Found {len(data['updates'])} weekly updates")
    
    def test_07_update_weekly_update(self, headers):
        """PUT /api/pulse/updates/weekly/{update_id} - Update weekly update (NEW endpoint)"""
        if not hasattr(pytest, 'weekly_update_id') or not pytest.weekly_update_id:
            pytest.skip("No weekly update ID from previous test")
        
        payload = {
            "achievements": ["TEST_Updated achievement"],
            "achievement_items": [{"text": "TEST_Linked achievement", "linked_item": None}],
            "key_metrics": {"sales": 150, "leads": 75},
            "issues_faced": ["TEST_Updated issue"],
            "next_week_focus": ["TEST_Updated focus"],
            "team_highlights": ["TEST_Updated highlight"],
            "notes": "TEST_Updated weekly notes"
        }
        
        response = requests.put(
            f"{BASE_URL}/api/pulse/updates/weekly/{pytest.weekly_update_id}",
            json=payload,
            headers=headers
        )
        
        print(f"Weekly PUT Response: {response.status_code}")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data.get("success") == True
        assert data.get("message") == "Weekly update modified"
        print("Weekly update modified successfully")
    
    def test_08_delete_weekly_update(self, headers):
        """DELETE /api/pulse/updates/weekly/{update_id} - Delete weekly update"""
        if not hasattr(pytest, 'weekly_update_id') or not pytest.weekly_update_id:
            pytest.skip("No weekly update ID from previous test")
        
        response = requests.delete(
            f"{BASE_URL}/api/pulse/updates/weekly/{pytest.weekly_update_id}",
            headers=headers
        )
        
        print(f"Weekly DELETE Response: {response.status_code}")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data.get("success") == True
        assert "deleted" in data.get("message", "").lower()
        print("Weekly update deleted successfully")
    
    # ==================== MONTHLY UPDATES TESTS ====================
    
    def test_09_create_monthly_update(self, headers):
        """POST /api/pulse/updates/monthly - Create monthly update"""
        payload = {
            "accomplishments": ["TEST_Accomplishment 1", "TEST_Accomplishment 2"],
            "goals_progress": ["TEST_Goal progress 1"],
            "challenges": ["TEST_Challenge 1"],
            "next_month_focus": ["TEST_Next month focus 1"],
            "team_highlights": ["TEST_Team highlight 1"],
            "key_metrics": {"revenue": 10000, "conversion": 5.5},
            "notes": "TEST_Monthly update notes",
            "month": datetime.now().strftime("%Y-%m")
        }
        
        response = requests.post(
            f"{BASE_URL}/api/pulse/updates/monthly",
            json=payload,
            headers=headers
        )
        
        print(f"Monthly Create Response: {response.status_code}")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "update_id" in data
        
        pytest.monthly_update_id = data.get("update_id")
        print(f"Created monthly update ID: {pytest.monthly_update_id}")
    
    def test_10_get_monthly_updates(self, headers):
        """GET /api/pulse/updates/monthly - Get monthly updates"""
        response = requests.get(
            f"{BASE_URL}/api/pulse/updates/monthly",
            headers=headers
        )
        
        print(f"Monthly GET Response: {response.status_code}")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "updates" in data
        assert isinstance(data["updates"], list)
        print(f"Found {len(data['updates'])} monthly updates")
    
    def test_11_update_monthly_update(self, headers):
        """PUT /api/pulse/updates/monthly/{update_id} - Update monthly update (NEW endpoint)"""
        if not hasattr(pytest, 'monthly_update_id') or not pytest.monthly_update_id:
            pytest.skip("No monthly update ID from previous test")
        
        payload = {
            "accomplishments": ["TEST_Updated accomplishment"],
            "accomplishment_items": [{"text": "TEST_Linked accomplishment", "linked_item": None}],
            "goals_progress": ["TEST_Updated goal progress"],
            "challenges": ["TEST_Updated challenge"],
            "next_month_focus": ["TEST_Updated focus"],
            "team_highlights": ["TEST_Updated highlight"],
            "key_metrics": {"revenue": 15000, "conversion": 6.5},
            "notes": "TEST_Updated monthly notes"
        }
        
        response = requests.put(
            f"{BASE_URL}/api/pulse/updates/monthly/{pytest.monthly_update_id}",
            json=payload,
            headers=headers
        )
        
        print(f"Monthly PUT Response: {response.status_code}")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data.get("success") == True
        assert data.get("message") == "Monthly update modified"
        print("Monthly update modified successfully")
    
    def test_12_delete_monthly_update(self, headers):
        """DELETE /api/pulse/updates/monthly/{update_id} - Delete monthly update (NEW endpoint)"""
        if not hasattr(pytest, 'monthly_update_id') or not pytest.monthly_update_id:
            pytest.skip("No monthly update ID from previous test")
        
        response = requests.delete(
            f"{BASE_URL}/api/pulse/updates/monthly/{pytest.monthly_update_id}",
            headers=headers
        )
        
        print(f"Monthly DELETE Response: {response.status_code}")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data.get("success") == True
        assert "deleted" in data.get("message", "").lower()
        print("Monthly update deleted successfully")
    
    # ==================== QUARTERLY UPDATES TESTS ====================
    
    def test_13_create_quarterly_update(self, headers):
        """POST /api/pulse/updates/quarterly - Create quarterly update"""
        # Calculate current quarter
        now = datetime.now()
        q = (now.month - 1) // 3 + 1
        quarter = f"{now.year}-Q{q}"
        
        payload = {
            "achievements": ["TEST_Q Achievement 1", "TEST_Q Achievement 2"],
            "okr_progress": ["TEST_OKR progress 1"],
            "learnings": ["TEST_Learning 1"],
            "challenges": ["TEST_Challenge 1"],
            "next_quarter_focus": ["TEST_Next quarter focus 1"],
            "team_highlights": ["TEST_Team highlight 1"],
            "key_metrics": {"quarterly_revenue": 50000, "growth": 15.5},
            "notes": "TEST_Quarterly update notes",
            "quarter": quarter
        }
        
        response = requests.post(
            f"{BASE_URL}/api/pulse/updates/quarterly",
            json=payload,
            headers=headers
        )
        
        print(f"Quarterly Create Response: {response.status_code}")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "update_id" in data
        
        pytest.quarterly_update_id = data.get("update_id")
        print(f"Created quarterly update ID: {pytest.quarterly_update_id}")
    
    def test_14_get_quarterly_updates(self, headers):
        """GET /api/pulse/updates/quarterly - Get quarterly updates"""
        response = requests.get(
            f"{BASE_URL}/api/pulse/updates/quarterly",
            headers=headers
        )
        
        print(f"Quarterly GET Response: {response.status_code}")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "updates" in data
        assert isinstance(data["updates"], list)
        print(f"Found {len(data['updates'])} quarterly updates")
    
    def test_15_update_quarterly_update(self, headers):
        """PUT /api/pulse/updates/quarterly/{update_id} - Update quarterly update (NEW endpoint)"""
        if not hasattr(pytest, 'quarterly_update_id') or not pytest.quarterly_update_id:
            pytest.skip("No quarterly update ID from previous test")
        
        payload = {
            "achievements": ["TEST_Updated Q achievement"],
            "achievement_items": [{"text": "TEST_Linked Q achievement", "linked_item": None}],
            "okr_progress": ["TEST_Updated OKR progress"],
            "learnings": ["TEST_Updated learning"],
            "challenges": ["TEST_Updated challenge"],
            "next_quarter_focus": ["TEST_Updated next focus"],
            "team_highlights": ["TEST_Updated highlight"],
            "key_metrics": {"quarterly_revenue": 60000, "growth": 20.5},
            "notes": "TEST_Updated quarterly notes"
        }
        
        response = requests.put(
            f"{BASE_URL}/api/pulse/updates/quarterly/{pytest.quarterly_update_id}",
            json=payload,
            headers=headers
        )
        
        print(f"Quarterly PUT Response: {response.status_code}")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data.get("success") == True
        assert data.get("message") == "Quarterly update modified"
        print("Quarterly update modified successfully")
    
    def test_16_delete_quarterly_update(self, headers):
        """DELETE /api/pulse/updates/quarterly/{update_id} - Delete quarterly update (NEW endpoint)"""
        if not hasattr(pytest, 'quarterly_update_id') or not pytest.quarterly_update_id:
            pytest.skip("No quarterly update ID from previous test")
        
        response = requests.delete(
            f"{BASE_URL}/api/pulse/updates/quarterly/{pytest.quarterly_update_id}",
            headers=headers
        )
        
        print(f"Quarterly DELETE Response: {response.status_code}")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data.get("success") == True
        assert "deleted" in data.get("message", "").lower()
        print("Quarterly update deleted successfully")


class TestWorkUpdatesErrorHandling:
    """Test error handling for work updates endpoints"""
    
    @pytest.fixture(scope="class")
    def auth_token(self):
        """Get authentication token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "superadmin@sevora.com",
            "password": "admin123"
        })
        if response.status_code == 200:
            data = response.json()
            return data.get("access_token") or data.get("token")
        pytest.skip("Authentication failed")
    
    @pytest.fixture(scope="class")
    def headers(self, auth_token):
        return {
            "Authorization": f"Bearer {auth_token}",
            "Content-Type": "application/json"
        }
    
    def test_update_nonexistent_daily(self, headers):
        """PUT /api/pulse/updates/daily/{invalid_id} - Should return 404"""
        response = requests.put(
            f"{BASE_URL}/api/pulse/updates/daily/nonexistent-id-12345",
            json={"completed_items": [{"text": "Test", "linked_item": None}]},
            headers=headers
        )
        assert response.status_code == 404
        print("Correctly returns 404 for nonexistent daily update")
    
    def test_delete_nonexistent_weekly(self, headers):
        """DELETE /api/pulse/updates/weekly/{invalid_id} - Should return 404"""
        response = requests.delete(
            f"{BASE_URL}/api/pulse/updates/weekly/nonexistent-id-12345",
            headers=headers
        )
        assert response.status_code == 404
        print("Correctly returns 404 for nonexistent weekly update")
    
    def test_update_nonexistent_monthly(self, headers):
        """PUT /api/pulse/updates/monthly/{invalid_id} - Should return 404"""
        response = requests.put(
            f"{BASE_URL}/api/pulse/updates/monthly/nonexistent-id-12345",
            json={"accomplishments": ["Test"]},
            headers=headers
        )
        assert response.status_code == 404
        print("Correctly returns 404 for nonexistent monthly update")
    
    def test_delete_nonexistent_quarterly(self, headers):
        """DELETE /api/pulse/updates/quarterly/{invalid_id} - Should return 404"""
        response = requests.delete(
            f"{BASE_URL}/api/pulse/updates/quarterly/nonexistent-id-12345",
            headers=headers
        )
        assert response.status_code == 404
        print("Correctly returns 404 for nonexistent quarterly update")
    
    def test_create_daily_without_auth(self):
        """POST /api/pulse/updates/daily without auth - Should return 401"""
        response = requests.post(
            f"{BASE_URL}/api/pulse/updates/daily",
            json={"completed_tasks": ["Test task"]}
        )
        assert response.status_code == 401
        print("Correctly returns 401 for unauthenticated request")
    
    def test_create_daily_empty_tasks(self, headers):
        """POST /api/pulse/updates/daily with empty tasks - Should return 400"""
        response = requests.post(
            f"{BASE_URL}/api/pulse/updates/daily",
            json={"completed_tasks": [], "blockers": []},
            headers=headers
        )
        assert response.status_code == 400
        print("Correctly returns 400 for empty completed tasks")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "-s"])
