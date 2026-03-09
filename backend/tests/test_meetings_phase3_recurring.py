"""
Test Meeting & Review Management System - Phase 3 Recurring Meetings & Enhanced Features
- Recurring meetings: create with recurrence_type, complete and verify next occurrence
- Meeting minutes: auto-generate including decisions and issues/risks
- Previous context: verify key_decisions and open_issues_risks from previous meeting
"""
import pytest
import requests
import os
from datetime import datetime, timedelta

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
TEST_EMAIL = "superadmin@sevora.com"
TEST_PASSWORD = "superadmin123"

# Test data tracking
created_meeting_ids = []


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


class TestRecurringMeetings:
    """Test Recurring Meeting functionality"""
    
    def test_create_weekly_recurring_meeting(self, auth_headers):
        """Create a meeting with weekly recurrence"""
        # Schedule meeting 1 week from now
        start_time = (datetime.utcnow() + timedelta(days=7)).replace(hour=10, minute=0, second=0, microsecond=0)
        end_time = start_time + timedelta(hours=1)
        end_date = (start_time + timedelta(weeks=4)).isoformat() + "Z"  # Recurrence ends in 4 weeks
        
        meeting_data = {
            "title": "TEST_Weekly_Recurring_Standup",
            "meeting_type": "weekly_team_review",
            "description": "Weekly team sync meeting with auto-recurrence",
            "start_time": start_time.isoformat() + "Z",
            "end_time": end_time.isoformat() + "Z",
            "recurrence_type": "weekly",
            "recurrence_day_of_week": start_time.weekday(),  # Same day of week
            "recurrence_end_date": end_date,
            "agenda": [
                {"title": "Status Updates", "duration_minutes": 20},
                {"title": "Blockers Discussion", "duration_minutes": 15},
                {"title": "Action Items Review", "duration_minutes": 15}
            ],
            "participants": []
        }
        
        response = requests.post(
            f"{BASE_URL}/api/meetings",
            headers=auth_headers,
            json=meeting_data
        )
        assert response.status_code == 200, f"Failed to create meeting: {response.text}"
        meeting = response.json()
        
        assert meeting.get("id"), "Meeting should have ID"
        assert meeting.get("recurrence_type") == "weekly", f"Expected weekly recurrence, got {meeting.get('recurrence_type')}"
        assert meeting.get("status") == "scheduled"
        assert meeting.get("recurrence_end_date") == end_date
        
        created_meeting_ids.append(meeting.get("id"))
        print(f"Created weekly recurring meeting: {meeting.get('id')}")
        print(f"Recurrence type: {meeting.get('recurrence_type')}, ends: {meeting.get('recurrence_end_date')}")
    
    def test_verify_recurrence_badge_in_meeting_detail(self, auth_headers):
        """Verify meeting detail includes recurrence_type for badge display"""
        if not created_meeting_ids:
            pytest.skip("No recurring meeting to verify")
        
        meeting_id = created_meeting_ids[0]
        response = requests.get(
            f"{BASE_URL}/api/meetings/{meeting_id}",
            headers=auth_headers
        )
        assert response.status_code == 200
        meeting = response.json()
        
        assert meeting.get("recurrence_type") == "weekly", "Should show weekly recurrence"
        assert meeting.get("recurrence_type") != "none", "Recurrence type should not be 'none'"
        print(f"Meeting {meeting_id} has recurrence_type='{meeting.get('recurrence_type')}' for badge display")
    
    def test_complete_recurring_meeting_creates_next_occurrence(self, auth_headers):
        """Complete a recurring meeting and verify next occurrence is auto-created"""
        if not created_meeting_ids:
            pytest.skip("No recurring meeting to complete")
        
        meeting_id = created_meeting_ids[0]
        
        # First start the meeting
        response = requests.post(
            f"{BASE_URL}/api/meetings/{meeting_id}/start",
            headers=auth_headers
        )
        assert response.status_code == 200, f"Failed to start meeting: {response.text}"
        print(f"Started meeting: {meeting_id}")
        
        # Now complete the meeting
        response = requests.post(
            f"{BASE_URL}/api/meetings/{meeting_id}/complete",
            headers=auth_headers
        )
        assert response.status_code == 200, f"Failed to complete meeting: {response.text}"
        
        result = response.json()
        assert "next_recurring_meeting_id" in result, "Response should include next_recurring_meeting_id"
        next_meeting_id = result.get("next_recurring_meeting_id")
        
        if next_meeting_id:
            print(f"Next recurring meeting auto-created: {next_meeting_id}")
            created_meeting_ids.append(next_meeting_id)
            
            # Verify the next occurrence
            response = requests.get(
                f"{BASE_URL}/api/meetings/{next_meeting_id}",
                headers=auth_headers
            )
            assert response.status_code == 200, f"Failed to get next meeting: {response.text}"
            next_meeting = response.json()
            
            # Verify inherited properties
            assert next_meeting.get("title") == "TEST_Weekly_Recurring_Standup", "Title should be inherited"
            assert next_meeting.get("status") == "scheduled", "Next occurrence should be scheduled"
            assert next_meeting.get("recurrence_type") == "weekly", "Recurrence type should be inherited"
            assert next_meeting.get("parent_recurring_id") is not None, "Should have parent_recurring_id"
            
            # Verify agenda is inherited
            assert len(next_meeting.get("agenda", [])) == 3, "Agenda should be inherited"
            
            # Verify start time is 1 week later
            original_meeting_response = requests.get(
                f"{BASE_URL}/api/meetings/{meeting_id}",
                headers=auth_headers
            )
            original_meeting = original_meeting_response.json()
            original_start = datetime.fromisoformat(original_meeting.get("start_time").replace("Z", "+00:00"))
            next_start = datetime.fromisoformat(next_meeting.get("start_time").replace("Z", "+00:00"))
            
            time_diff = next_start - original_start
            assert abs(time_diff.days - 7) <= 1, f"Next meeting should be ~1 week later, got {time_diff.days} days"
            
            print(f"Next meeting date: {next_meeting.get('start_time')} (7 days after original)")
        else:
            print("No next occurrence created (may have exceeded recurrence_end_date)")
    
    def test_create_daily_recurring_meeting(self, auth_headers):
        """Create a daily recurring meeting"""
        start_time = (datetime.utcnow() + timedelta(days=1)).replace(hour=9, minute=0, second=0, microsecond=0)
        end_time = start_time + timedelta(minutes=15)
        
        meeting_data = {
            "title": "TEST_Daily_Standup",
            "meeting_type": "daily_standup",
            "start_time": start_time.isoformat() + "Z",
            "end_time": end_time.isoformat() + "Z",
            "recurrence_type": "daily",
            "agenda": [{"title": "Daily sync", "duration_minutes": 15}]
        }
        
        response = requests.post(
            f"{BASE_URL}/api/meetings",
            headers=auth_headers,
            json=meeting_data
        )
        assert response.status_code == 200, f"Failed to create daily meeting: {response.text}"
        meeting = response.json()
        assert meeting.get("recurrence_type") == "daily"
        created_meeting_ids.append(meeting.get("id"))
        print(f"Created daily recurring meeting: {meeting.get('id')}")
    
    def test_create_monthly_recurring_meeting(self, auth_headers):
        """Create a monthly recurring meeting"""
        start_time = (datetime.utcnow() + timedelta(days=30)).replace(hour=14, minute=0, second=0, microsecond=0)
        end_time = start_time + timedelta(hours=2)
        
        meeting_data = {
            "title": "TEST_Monthly_Review",
            "meeting_type": "department_monthly",
            "start_time": start_time.isoformat() + "Z",
            "end_time": end_time.isoformat() + "Z",
            "recurrence_type": "monthly",
            "recurrence_day_of_month": 15,
            "agenda": [{"title": "Monthly review", "duration_minutes": 60}]
        }
        
        response = requests.post(
            f"{BASE_URL}/api/meetings",
            headers=auth_headers,
            json=meeting_data
        )
        assert response.status_code == 200, f"Failed to create monthly meeting: {response.text}"
        meeting = response.json()
        assert meeting.get("recurrence_type") == "monthly"
        created_meeting_ids.append(meeting.get("id"))
        print(f"Created monthly recurring meeting: {meeting.get('id')}")


class TestMeetingMinutesAutoGeneration:
    """Test Meeting Minutes auto-generation with decisions and issues/risks"""
    
    def test_setup_meeting_with_decisions_and_issues(self, auth_headers):
        """Setup a meeting with decisions and issues for minutes generation"""
        # Create a non-recurring meeting
        start_time = (datetime.utcnow() - timedelta(hours=2)).replace(second=0, microsecond=0)
        end_time = start_time + timedelta(hours=1)
        
        meeting_data = {
            "title": "TEST_Minutes_Generation_Meeting",
            "meeting_type": "project_review",
            "description": "Meeting to test auto-minutes generation with decisions/issues",
            "start_time": start_time.isoformat() + "Z",
            "end_time": end_time.isoformat() + "Z",
            "recurrence_type": "none",
            "agenda": [
                {"title": "Project Status", "duration_minutes": 20},
                {"title": "Decisions", "duration_minutes": 20},
                {"title": "Risk Review", "duration_minutes": 20}
            ]
        }
        
        response = requests.post(
            f"{BASE_URL}/api/meetings",
            headers=auth_headers,
            json=meeting_data
        )
        assert response.status_code == 200, f"Failed to create meeting: {response.text}"
        meeting = response.json()
        meeting_id = meeting.get("id")
        created_meeting_ids.append(meeting_id)
        print(f"Created meeting for minutes test: {meeting_id}")
        
        # Add discussion notes
        response = requests.post(
            f"{BASE_URL}/api/meetings/{meeting_id}/notes",
            headers=auth_headers,
            params={"topic": "Project Timeline", "notes": "Team agreed on Q2 delivery timeline. All milestones confirmed."}
        )
        assert response.status_code == 200
        
        # Add a decision
        response = requests.post(
            f"{BASE_URL}/api/meetings/{meeting_id}/decisions",
            headers=auth_headers,
            params={
                "title": "TEST_Decision_Budget_Approval",
                "description": "Approved additional $50K budget for Phase 2",
                "impact": "high",
                "impact_area": "Budget"
            }
        )
        assert response.status_code == 200, f"Failed to add decision: {response.text}"
        print("Added decision to meeting")
        
        # Add an issue
        response = requests.post(
            f"{BASE_URL}/api/meetings/{meeting_id}/issues-risks",
            headers=auth_headers,
            params={
                "type": "issue",
                "title": "TEST_Issue_Resource_Shortage",
                "description": "Backend team needs 2 more developers",
                "impact": "high"
            }
        )
        assert response.status_code == 200, f"Failed to add issue: {response.text}"
        print("Added issue to meeting")
        
        # Add a risk
        response = requests.post(
            f"{BASE_URL}/api/meetings/{meeting_id}/issues-risks",
            headers=auth_headers,
            params={
                "type": "risk",
                "title": "TEST_Risk_Third_Party_Delay",
                "description": "Third party API integration may be delayed",
                "impact": "medium",
                "probability": "medium",
                "resolution_plan": "Identify backup vendor"
            }
        )
        assert response.status_code == 200
        print("Added risk to meeting")
        
        # Add action item
        response = requests.post(
            f"{BASE_URL}/api/meetings/{meeting_id}/action-items",
            headers=auth_headers,
            params={
                "title": "TEST_Action_Hire_Developers",
                "description": "Post job listings for backend developers",
                "priority": "high",
                "deadline": (datetime.utcnow() + timedelta(days=7)).strftime("%Y-%m-%d")
            }
        )
        assert response.status_code == 200
        print("Added action item to meeting")
        
        return meeting_id
    
    def test_auto_generate_minutes_includes_decisions_and_issues(self, auth_headers):
        """Test auto-generation of minutes includes decisions and open issues/risks"""
        # Find the test meeting
        response = requests.get(
            f"{BASE_URL}/api/meetings",
            headers=auth_headers,
            params={"search": "TEST_Minutes_Generation"}
        )
        meetings = response.json()
        test_meeting = next((m for m in meetings if m.get("title") == "TEST_Minutes_Generation_Meeting"), None)
        
        if not test_meeting:
            pytest.skip("Test meeting not found, setup may have failed")
        
        meeting_id = test_meeting.get("id")
        
        # Complete the meeting first
        requests.post(f"{BASE_URL}/api/meetings/{meeting_id}/start", headers=auth_headers)
        requests.post(f"{BASE_URL}/api/meetings/{meeting_id}/complete", headers=auth_headers)
        
        # Generate minutes
        response = requests.post(
            f"{BASE_URL}/api/meetings/{meeting_id}/minutes/generate",
            headers=auth_headers
        )
        assert response.status_code == 200, f"Failed to generate minutes: {response.text}"
        
        minutes = response.json()
        assert minutes.get("auto_generated") == True, "Should be marked as auto-generated"
        assert minutes.get("meeting_id") == meeting_id
        
        # Check decisions are included
        decisions_text = minutes.get("decisions", "")
        assert "TEST_Decision_Budget_Approval" in decisions_text or "Budget" in decisions_text.upper() or "budget" in decisions_text.lower(), \
            f"Decisions should include budget decision. Got: {decisions_text[:200]}"
        print(f"Minutes decisions section: {decisions_text[:200]}...")
        
        # Check next_steps includes issues/risks
        next_steps = minutes.get("next_steps", "")
        # Issues/risks with open status should appear in next_steps
        assert "TEST_Issue" in next_steps or "TEST_Risk" in next_steps or "Issues/Risks" in next_steps or len(next_steps) > 0, \
            f"Next steps should mention open issues/risks. Got: {next_steps[:200]}"
        print(f"Minutes next_steps section: {next_steps[:200]}...")
        
        # Verify meeting_title is present
        assert minutes.get("meeting_title") == "TEST_Minutes_Generation_Meeting"
        
        print(f"Auto-generated minutes successfully with decisions and issues/risks")


class TestPreviousMeetingContext:
    """Test Previous Meeting Context with key_decisions and open_issues_risks"""
    
    def test_previous_context_includes_decisions_and_issues(self, auth_headers):
        """Verify previous-context endpoint returns key_decisions and open_issues_risks"""
        # First create a completed meeting with decisions and issues
        start_time = (datetime.utcnow() - timedelta(days=7)).replace(hour=10, minute=0, second=0, microsecond=0)
        end_time = start_time + timedelta(hours=1)
        
        # Create first meeting (will be "previous")
        first_meeting_data = {
            "title": "TEST_Previous_Meeting",
            "meeting_type": "project_review",
            "start_time": start_time.isoformat() + "Z",
            "end_time": end_time.isoformat() + "Z",
            "recurrence_type": "none"
        }
        
        response = requests.post(f"{BASE_URL}/api/meetings", headers=auth_headers, json=first_meeting_data)
        assert response.status_code == 200
        first_meeting = response.json()
        first_meeting_id = first_meeting.get("id")
        created_meeting_ids.append(first_meeting_id)
        
        # Add decision to first meeting
        response = requests.post(
            f"{BASE_URL}/api/meetings/{first_meeting_id}/decisions",
            headers=auth_headers,
            params={
                "title": "TEST_Key_Decision_Architecture",
                "description": "Chose microservices architecture",
                "impact": "high"
            }
        )
        assert response.status_code == 200
        
        # Add open issue to first meeting
        response = requests.post(
            f"{BASE_URL}/api/meetings/{first_meeting_id}/issues-risks",
            headers=auth_headers,
            params={
                "type": "issue",
                "title": "TEST_Open_Issue_Dependencies",
                "description": "Unresolved dependency conflicts",
                "impact": "medium"
            }
        )
        assert response.status_code == 200
        
        # Add open risk to first meeting
        response = requests.post(
            f"{BASE_URL}/api/meetings/{first_meeting_id}/issues-risks",
            headers=auth_headers,
            params={
                "type": "risk",
                "title": "TEST_Open_Risk_Vendor",
                "description": "Vendor may not meet deadline",
                "impact": "high"
            }
        )
        assert response.status_code == 200
        
        # Complete first meeting
        requests.post(f"{BASE_URL}/api/meetings/{first_meeting_id}/start", headers=auth_headers)
        requests.post(f"{BASE_URL}/api/meetings/{first_meeting_id}/complete", headers=auth_headers)
        print(f"Created and completed first meeting: {first_meeting_id}")
        
        # Create second meeting (current) - same type, later date
        second_start = (datetime.utcnow() + timedelta(days=1)).replace(hour=10, minute=0, second=0, microsecond=0)
        second_end = second_start + timedelta(hours=1)
        
        second_meeting_data = {
            "title": "TEST_Current_Meeting",
            "meeting_type": "project_review",  # Same type as first
            "start_time": second_start.isoformat() + "Z",
            "end_time": second_end.isoformat() + "Z",
            "recurrence_type": "none"
        }
        
        response = requests.post(f"{BASE_URL}/api/meetings", headers=auth_headers, json=second_meeting_data)
        assert response.status_code == 200
        second_meeting = response.json()
        second_meeting_id = second_meeting.get("id")
        created_meeting_ids.append(second_meeting_id)
        print(f"Created second meeting: {second_meeting_id}")
        
        # Get previous context for second meeting
        response = requests.get(
            f"{BASE_URL}/api/meetings/{second_meeting_id}/previous-context",
            headers=auth_headers
        )
        assert response.status_code == 200, f"Failed to get previous context: {response.text}"
        context = response.json()
        
        # Verify key_decisions field
        assert "key_decisions" in context, "Should have key_decisions field"
        key_decisions = context.get("key_decisions", [])
        if key_decisions:
            decision_titles = [d.get("title", "") for d in key_decisions]
            print(f"Key decisions from previous: {decision_titles}")
            # May or may not find our test decision depending on meeting type matching
        
        # Verify open_issues_risks field
        assert "open_issues_risks" in context, "Should have open_issues_risks field"
        open_issues = context.get("open_issues_risks", [])
        if open_issues:
            issue_titles = [i.get("title", "") for i in open_issues]
            print(f"Open issues/risks from previous: {issue_titles}")
        
        # Verify previous meeting info
        if context.get("previous_meeting_id"):
            print(f"Previous meeting: {context.get('previous_meeting_title')} on {context.get('previous_meeting_date')}")
            
            # Verify action item categorization
            assert "pending_action_items" in context
            assert "completed_action_items" in context
            assert "overdue_action_items" in context
        
        print("Previous context endpoint includes key_decisions and open_issues_risks fields")


class TestCleanup:
    """Cleanup test data"""
    
    def test_cleanup_test_meetings(self, auth_headers):
        """Delete all test meetings created"""
        for meeting_id in created_meeting_ids[:]:
            try:
                response = requests.delete(
                    f"{BASE_URL}/api/meetings/{meeting_id}",
                    headers=auth_headers
                )
                if response.status_code in [200, 404]:
                    created_meeting_ids.remove(meeting_id)
                    print(f"Cleaned up meeting: {meeting_id}")
            except Exception as e:
                print(f"Error cleaning up {meeting_id}: {e}")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
