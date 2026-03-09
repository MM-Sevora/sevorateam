"""
Test Meeting & Review Management System - Phase 3 Features
Decision Log, Issues/Risks Tracker, Analytics
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
TEST_EMAIL = "superadmin@sevora.com"
TEST_PASSWORD = "superadmin123"

# Test meeting ID from context
TEST_MEETING_ID = "dda937a2-4080-4f08-96f6-7f30ef1f75b1"

# Track created IDs for cleanup
created_decision_ids = []
created_issue_risk_ids = []


@pytest.fixture(scope="module")
def auth_token():
    """Get authentication token"""
    response = requests.post(f"{BASE_URL}/api/auth/login", json={
        "email": TEST_EMAIL,
        "password": TEST_PASSWORD
    })
    assert response.status_code == 200, f"Login failed: {response.text}"
    data = response.json()
    token = data.get("access_token") or data.get("token")
    assert token, f"No token returned: {data.keys()}"
    return token


@pytest.fixture
def auth_headers(auth_token):
    """Headers with auth token"""
    return {
        "Authorization": f"Bearer {auth_token}",
        "Content-Type": "application/json"
    }


class TestDecisionLog:
    """Test Decision Log endpoints"""
    
    def test_get_meeting_for_decisions(self, auth_headers):
        """Verify meeting exists and has decisions array"""
        response = requests.get(
            f"{BASE_URL}/api/meetings/{TEST_MEETING_ID}",
            headers=auth_headers
        )
        assert response.status_code == 200, f"Failed to get meeting: {response.text}"
        meeting = response.json()
        assert "decisions" in meeting or meeting.get("decisions") is None, "Meeting should have decisions field"
        print(f"Meeting found: {meeting.get('title')}, decisions count: {len(meeting.get('decisions', []))}")
    
    def test_add_decision_minimal(self, auth_headers):
        """Test adding a decision with minimal fields"""
        params = {
            "title": "TEST_Decision_Minimal"
        }
        response = requests.post(
            f"{BASE_URL}/api/meetings/{TEST_MEETING_ID}/decisions",
            headers=auth_headers,
            params=params
        )
        assert response.status_code == 200, f"Failed to add decision: {response.text}"
        decision = response.json()
        assert decision.get("id"), "Decision should have an ID"
        assert decision.get("title") == "TEST_Decision_Minimal"
        assert decision.get("impact") == "medium"  # Default value
        created_decision_ids.append(decision.get("id"))
        print(f"Created decision: {decision.get('id')}")
    
    def test_add_decision_full(self, auth_headers):
        """Test adding a decision with all fields"""
        params = {
            "title": "TEST_Decision_Full",
            "description": "Test decision with all fields",
            "impact": "high",
            "impact_area": "Budget",
            "rationale": "Cost savings analysis showed positive ROI"
        }
        response = requests.post(
            f"{BASE_URL}/api/meetings/{TEST_MEETING_ID}/decisions",
            headers=auth_headers,
            params=params
        )
        assert response.status_code == 200, f"Failed to add decision: {response.text}"
        decision = response.json()
        assert decision.get("title") == "TEST_Decision_Full"
        assert decision.get("description") == "Test decision with all fields"
        assert decision.get("impact") == "high"
        assert decision.get("impact_area") == "Budget"
        assert decision.get("rationale") == "Cost savings analysis showed positive ROI"
        assert decision.get("decision_date"), "Should have decision_date"
        created_decision_ids.append(decision.get("id"))
        print(f"Created full decision: {decision.get('id')}")
    
    def test_verify_decisions_in_meeting(self, auth_headers):
        """Verify decisions appear in meeting detail"""
        response = requests.get(
            f"{BASE_URL}/api/meetings/{TEST_MEETING_ID}",
            headers=auth_headers
        )
        assert response.status_code == 200
        meeting = response.json()
        decisions = meeting.get("decisions", [])
        test_decisions = [d for d in decisions if d.get("title", "").startswith("TEST_")]
        assert len(test_decisions) >= 2, f"Expected at least 2 test decisions, found {len(test_decisions)}"
        print(f"Found {len(test_decisions)} test decisions in meeting")
    
    def test_delete_decision(self, auth_headers):
        """Test deleting a decision"""
        if not created_decision_ids:
            pytest.skip("No decisions to delete")
        
        decision_id = created_decision_ids[0]
        response = requests.delete(
            f"{BASE_URL}/api/meetings/{TEST_MEETING_ID}/decisions/{decision_id}",
            headers=auth_headers
        )
        assert response.status_code == 200, f"Failed to delete decision: {response.text}"
        created_decision_ids.remove(decision_id)
        print(f"Deleted decision: {decision_id}")
    
    def test_get_all_decisions(self, auth_headers):
        """Test global decisions endpoint"""
        response = requests.get(
            f"{BASE_URL}/api/meetings/all-decisions",
            headers=auth_headers
        )
        assert response.status_code == 200, f"Failed to get all decisions: {response.text}"
        decisions = response.json()
        assert isinstance(decisions, list), "Should return a list"
        print(f"Found {len(decisions)} total decisions across meetings")


class TestIssuesRisksTracker:
    """Test Issues & Risks Tracker endpoints"""
    
    def test_add_issue(self, auth_headers):
        """Test adding an issue"""
        params = {
            "type": "issue",
            "title": "TEST_Issue_Critical",
            "description": "Test critical issue",
            "impact": "critical"
        }
        response = requests.post(
            f"{BASE_URL}/api/meetings/{TEST_MEETING_ID}/issues-risks",
            headers=auth_headers,
            params=params
        )
        assert response.status_code == 200, f"Failed to add issue: {response.text}"
        item = response.json()
        assert item.get("id"), "Issue should have an ID"
        assert item.get("type") == "issue"
        assert item.get("title") == "TEST_Issue_Critical"
        assert item.get("impact") == "critical"
        assert item.get("status") == "open"  # Default status
        created_issue_risk_ids.append(item.get("id"))
        print(f"Created issue: {item.get('id')}")
    
    def test_add_risk(self, auth_headers):
        """Test adding a risk"""
        params = {
            "type": "risk",
            "title": "TEST_Risk_High",
            "description": "Test high probability risk",
            "impact": "high",
            "probability": "high",
            "resolution_plan": "Mitigation strategy in place"
        }
        response = requests.post(
            f"{BASE_URL}/api/meetings/{TEST_MEETING_ID}/issues-risks",
            headers=auth_headers,
            params=params
        )
        assert response.status_code == 200, f"Failed to add risk: {response.text}"
        item = response.json()
        assert item.get("type") == "risk"
        assert item.get("probability") == "high"
        assert item.get("resolution_plan") == "Mitigation strategy in place"
        created_issue_risk_ids.append(item.get("id"))
        print(f"Created risk: {item.get('id')}")
    
    def test_verify_issues_risks_in_meeting(self, auth_headers):
        """Verify issues/risks appear in meeting detail"""
        response = requests.get(
            f"{BASE_URL}/api/meetings/{TEST_MEETING_ID}",
            headers=auth_headers
        )
        assert response.status_code == 200
        meeting = response.json()
        issues_risks = meeting.get("issues_risks", [])
        test_items = [i for i in issues_risks if i.get("title", "").startswith("TEST_")]
        assert len(test_items) >= 2, f"Expected at least 2 test issues/risks, found {len(test_items)}"
        print(f"Found {len(test_items)} test issues/risks in meeting")
    
    def test_update_issue_status_in_progress(self, auth_headers):
        """Test updating issue status to in_progress"""
        if not created_issue_risk_ids:
            pytest.skip("No issues/risks to update")
        
        item_id = created_issue_risk_ids[0]
        response = requests.put(
            f"{BASE_URL}/api/meetings/{TEST_MEETING_ID}/issues-risks/{item_id}",
            headers=auth_headers,
            params={"status": "in_progress"}
        )
        assert response.status_code == 200, f"Failed to update status: {response.text}"
        print(f"Updated issue status to in_progress: {item_id}")
    
    def test_update_issue_status_resolved(self, auth_headers):
        """Test updating issue status to resolved"""
        if not created_issue_risk_ids:
            pytest.skip("No issues/risks to update")
        
        item_id = created_issue_risk_ids[0]
        response = requests.put(
            f"{BASE_URL}/api/meetings/{TEST_MEETING_ID}/issues-risks/{item_id}",
            headers=auth_headers,
            params={"status": "resolved"}
        )
        assert response.status_code == 200, f"Failed to resolve: {response.text}"
        
        # Verify status changed
        response = requests.get(
            f"{BASE_URL}/api/meetings/{TEST_MEETING_ID}",
            headers=auth_headers
        )
        meeting = response.json()
        item = next((i for i in meeting.get("issues_risks", []) if i.get("id") == item_id), None)
        assert item, "Item not found in meeting"
        assert item.get("status") == "resolved", f"Status should be resolved, got {item.get('status')}"
        assert item.get("resolved_date"), "Should have resolved_date"
        print(f"Issue resolved with resolved_date: {item.get('resolved_date')}")
    
    def test_update_risk_status_mitigated(self, auth_headers):
        """Test updating risk status to mitigated"""
        if len(created_issue_risk_ids) < 2:
            pytest.skip("No risk to update")
        
        item_id = created_issue_risk_ids[1]  # The risk
        response = requests.put(
            f"{BASE_URL}/api/meetings/{TEST_MEETING_ID}/issues-risks/{item_id}",
            headers=auth_headers,
            params={"status": "mitigated"}
        )
        assert response.status_code == 200, f"Failed to mitigate: {response.text}"
        print(f"Risk mitigated: {item_id}")
    
    def test_delete_issue_risk(self, auth_headers):
        """Test deleting an issue/risk"""
        if not created_issue_risk_ids:
            pytest.skip("No issues/risks to delete")
        
        item_id = created_issue_risk_ids[0]
        response = requests.delete(
            f"{BASE_URL}/api/meetings/{TEST_MEETING_ID}/issues-risks/{item_id}",
            headers=auth_headers
        )
        assert response.status_code == 200, f"Failed to delete: {response.text}"
        created_issue_risk_ids.remove(item_id)
        print(f"Deleted issue/risk: {item_id}")
    
    def test_get_all_issues_risks(self, auth_headers):
        """Test global issues/risks endpoint"""
        response = requests.get(
            f"{BASE_URL}/api/meetings/all-issues-risks",
            headers=auth_headers
        )
        assert response.status_code == 200, f"Failed to get all issues/risks: {response.text}"
        items = response.json()
        assert isinstance(items, list), "Should return a list"
        print(f"Found {len(items)} total issues/risks across meetings")
    
    def test_filter_issues_by_type(self, auth_headers):
        """Test filtering issues by type"""
        response = requests.get(
            f"{BASE_URL}/api/meetings/all-issues-risks",
            headers=auth_headers,
            params={"type": "issue"}
        )
        assert response.status_code == 200
        items = response.json()
        for item in items:
            assert item.get("item", {}).get("type") == "issue", "Should only return issues"
        print(f"Filtered: {len(items)} issues")
    
    def test_filter_risks_by_type(self, auth_headers):
        """Test filtering risks by type"""
        response = requests.get(
            f"{BASE_URL}/api/meetings/all-issues-risks",
            headers=auth_headers,
            params={"type": "risk"}
        )
        assert response.status_code == 200
        items = response.json()
        for item in items:
            assert item.get("item", {}).get("type") == "risk", "Should only return risks"
        print(f"Filtered: {len(items)} risks")


class TestCalendarAndAnalytics:
    """Test Calendar and Analytics endpoints"""
    
    def test_get_calendar_meetings(self, auth_headers):
        """Test calendar endpoint"""
        # Get current month range
        import datetime
        now = datetime.datetime.now()
        start_date = now.replace(day=1).strftime("%Y-%m-%dT00:00:00Z")
        end_date = (now.replace(day=28) + datetime.timedelta(days=4)).replace(day=1).strftime("%Y-%m-%dT00:00:00Z")
        
        response = requests.get(
            f"{BASE_URL}/api/meetings/calendar",
            headers=auth_headers,
            params={"start_date": start_date, "end_date": end_date}
        )
        assert response.status_code == 200, f"Failed to get calendar: {response.text}"
        meetings = response.json()
        assert isinstance(meetings, list), "Should return a list"
        
        # Check calendar meeting format
        if meetings:
            meeting = meetings[0]
            assert "id" in meeting, "Should have id"
            assert "title" in meeting, "Should have title"
            assert "start" in meeting, "Should have start"
            assert "end" in meeting, "Should have end"
            print(f"Calendar meeting format: {list(meeting.keys())}")
        print(f"Found {len(meetings)} calendar meetings for current month")
    
    def test_get_analytics_overview(self, auth_headers):
        """Test analytics overview endpoint"""
        response = requests.get(
            f"{BASE_URL}/api/meetings/analytics/overview",
            headers=auth_headers
        )
        assert response.status_code == 200, f"Failed to get analytics: {response.text}"
        analytics = response.json()
        
        # Check required fields
        assert "total_meetings" in analytics, "Should have total_meetings"
        assert "total_decisions" in analytics, "Should have total_decisions"
        assert "total_action_items" in analytics, "Should have total_action_items"
        assert "action_items_completed" in analytics, "Should have action_items_completed"
        assert "completion_rate" in analytics, "Should have completion_rate"
        assert "meetings_by_month" in analytics, "Should have meetings_by_month"
        assert "meetings_by_type" in analytics, "Should have meetings_by_type"
        assert "meetings_by_department" in analytics, "Should have meetings_by_department"
        assert "top_organizers" in analytics, "Should have top_organizers"
        
        print(f"Analytics: total_meetings={analytics['total_meetings']}, "
              f"total_decisions={analytics['total_decisions']}, "
              f"total_action_items={analytics['total_action_items']}, "
              f"completion_rate={analytics['completion_rate']}%")
    
    def test_get_dashboard_overview(self, auth_headers):
        """Test dashboard overview endpoint"""
        response = requests.get(
            f"{BASE_URL}/api/meetings/dashboard/overview",
            headers=auth_headers
        )
        assert response.status_code == 200, f"Failed to get dashboard: {response.text}"
        dashboard = response.json()
        
        # Check required fields
        assert "meetings_today" in dashboard, "Should have meetings_today"
        assert "upcoming_meetings" in dashboard, "Should have upcoming_meetings"
        assert "pending_action_items" in dashboard, "Should have pending_action_items"
        assert "overdue_action_items" in dashboard, "Should have overdue_action_items"
        
        print(f"Dashboard: today={dashboard['meetings_today']}, "
              f"upcoming={dashboard['upcoming_meetings']}, "
              f"pending_actions={dashboard['pending_action_items']}, "
              f"overdue={dashboard['overdue_action_items']}")


class TestCleanup:
    """Cleanup test data"""
    
    def test_cleanup_decisions(self, auth_headers):
        """Clean up remaining test decisions"""
        for decision_id in created_decision_ids[:]:
            response = requests.delete(
                f"{BASE_URL}/api/meetings/{TEST_MEETING_ID}/decisions/{decision_id}",
                headers=auth_headers
            )
            if response.status_code == 200:
                created_decision_ids.remove(decision_id)
                print(f"Cleaned up decision: {decision_id}")
    
    def test_cleanup_issues_risks(self, auth_headers):
        """Clean up remaining test issues/risks"""
        for item_id in created_issue_risk_ids[:]:
            response = requests.delete(
                f"{BASE_URL}/api/meetings/{TEST_MEETING_ID}/issues-risks/{item_id}",
                headers=auth_headers
            )
            if response.status_code == 200:
                created_issue_risk_ids.remove(item_id)
                print(f"Cleaned up issue/risk: {item_id}")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
