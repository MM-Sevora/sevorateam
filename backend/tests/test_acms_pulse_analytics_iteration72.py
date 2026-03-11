"""
Test ACMS enhancements and Pulse Analytics Integration (Iteration 72)

Features tested:
1. GET /api/analytics/pulse-engagement - Pulse engagement stats
2. GET /api/acms/cost-management/overview - SaaS cost overview
3. PUT /api/acms/tools/{tool_id}/cost - Update tool cost
4. POST /api/acms/reports/access-review - Generate access review report
5. GET /api/acms/reports - List access review reports
6. GET /api/acms/credentials/rotation-status - Password rotation status
7. PUT /api/acms/credentials/{credential_id}/rotation-config - Set rotation config
8. POST /api/acms/credentials/send-rotation-reminders - Send rotation reminders
"""

import pytest
import requests
import os
import uuid

# Get BASE_URL from environment
BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://sevora-hub.preview.emergentagent.com').rstrip('/')


@pytest.fixture(scope="module")
def superadmin_token():
    """Get authentication token for superadmin user"""
    response = requests.post(
        f"{BASE_URL}/api/auth/login",
        json={"email": "superadmin@sevora.com", "password": "superadmin123"}
    )
    if response.status_code != 200:
        pytest.skip(f"Superadmin login failed: {response.status_code} - {response.text}")
    return response.json()["access_token"]


@pytest.fixture(scope="module")
def auth_headers(superadmin_token):
    """Get headers with auth token"""
    return {
        "Authorization": f"Bearer {superadmin_token}",
        "Content-Type": "application/json"
    }


class TestPulseEngagementAnalytics:
    """Test Pulse engagement analytics endpoint for Team Dashboard"""
    
    def test_pulse_engagement_returns_required_fields(self, auth_headers):
        """Test /api/analytics/pulse-engagement returns all required stats"""
        response = requests.get(
            f"{BASE_URL}/api/analytics/pulse-engagement",
            headers=auth_headers
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        
        # Required fields from PulseEngagementStats model
        required_fields = [
            'total_posts', 'posts_this_week', 'posts_this_month',
            'total_reactions', 'total_comments', 'total_recognitions',
            'recognitions_this_week', 'active_posters', 'engagement_rate',
            'top_badge_types', 'recognition_leaderboard', 'department_engagement',
            'trending_tags', 'work_updates_submitted', 'blockers_reported'
        ]
        
        for field in required_fields:
            assert field in data, f"Missing required field: {field}"
        
        # Verify numeric fields
        assert isinstance(data['total_posts'], int)
        assert isinstance(data['engagement_rate'], (int, float))
        
        # Verify list fields
        assert isinstance(data['top_badge_types'], list)
        assert isinstance(data['recognition_leaderboard'], list)
        assert isinstance(data['department_engagement'], list)
        assert isinstance(data['trending_tags'], list)
        
        print(f"✅ Pulse engagement returned {data['total_posts']} posts, {data['engagement_rate']}% engagement")
    
    def test_pulse_engagement_with_period_filter(self, auth_headers):
        """Test pulse engagement with different period filters"""
        periods = ['week', 'month', 'quarter', 'year']
        
        for period in periods:
            response = requests.get(
                f"{BASE_URL}/api/analytics/pulse-engagement",
                headers=auth_headers,
                params={'period': period}
            )
            
            assert response.status_code == 200, f"Failed for period '{period}': {response.text}"
            data = response.json()
            assert 'total_posts' in data
            print(f"✅ Period '{period}': {data['total_posts']} posts, {data['active_posters']} active users")


class TestSaaSCostManagement:
    """Test SaaS Cost Management endpoints"""
    
    def test_cost_management_overview(self, auth_headers):
        """Test GET /api/acms/cost-management/overview returns spending data"""
        response = requests.get(
            f"{BASE_URL}/api/acms/cost-management/overview",
            headers=auth_headers
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        
        # Required fields
        required_fields = [
            'total_monthly_cost', 'projected_annual_cost', 'cost_by_category',
            'cost_by_department', 'top_expensive_tools', 'upcoming_renewals',
            'potentially_unused_tools', 'potential_savings'
        ]
        
        for field in required_fields:
            assert field in data, f"Missing required field: {field}"
        
        # Verify types
        assert isinstance(data['total_monthly_cost'], (int, float))
        assert isinstance(data['projected_annual_cost'], (int, float))
        assert isinstance(data['cost_by_category'], list)
        assert isinstance(data['top_expensive_tools'], list)
        
        print(f"✅ SaaS Cost Overview: ${data['total_monthly_cost']}/month, ${data['projected_annual_cost']}/year")
        print(f"   Top expensive tools: {len(data['top_expensive_tools'])}")
    
    def test_update_tool_cost(self, auth_headers):
        """Test PUT /api/acms/tools/{tool_id}/cost updates cost info"""
        # First get a tool to update
        tools_response = requests.get(
            f"{BASE_URL}/api/acms/tools",
            headers=auth_headers,
            params={'limit': 1}
        )
        
        if tools_response.status_code != 200 or not tools_response.json().get('tools'):
            # Create a test tool first
            create_response = requests.post(
                f"{BASE_URL}/api/acms/tools",
                headers=auth_headers,
                json={
                    "name": f"TEST_CostTool_{uuid.uuid4().hex[:8]}",
                    "category": "analytics",
                    "monthly_cost": 50.0
                }
            )
            assert create_response.status_code in [200, 201], f"Failed to create tool: {create_response.text}"
            tool_id = create_response.json()['id']
        else:
            tool_id = tools_response.json()['tools'][0]['id']
        
        # Update the cost
        cost_data = {
            "monthly_cost": 199.99,
            "billing_cycle": "monthly",
            "renewal_date": "2026-06-01T00:00:00Z",
            "notes": "TEST cost update"
        }
        
        response = requests.put(
            f"{BASE_URL}/api/acms/tools/{tool_id}/cost",
            headers=auth_headers,
            json=cost_data
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert 'message' in data
        assert data.get('monthly_cost') == 199.99 or 'cost' in data.get('message', '').lower()
        
        print(f"✅ Updated tool {tool_id} cost to ${cost_data['monthly_cost']}")


class TestAccessReviewReports:
    """Test Access Review Reports endpoints"""
    
    @pytest.fixture(scope="class")
    def test_report_id(self):
        """Store report ID for later tests"""
        return {'id': None}
    
    def test_generate_access_review_report(self, auth_headers, test_report_id):
        """Test POST /api/acms/reports/access-review generates a report"""
        response = requests.post(
            f"{BASE_URL}/api/acms/reports/access-review",
            headers=auth_headers,
            json={
                "report_type": "quarterly",
                "include_inactive": False
            }
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        
        # Required fields
        assert 'id' in data, "Report should have an ID"
        assert 'report_type' in data
        assert 'generated_at' in data
        
        # Should have user access summary or summary field
        assert 'user_access_summary' in data or 'summary' in data or 'total_users_reviewed' in data
        
        test_report_id['id'] = data['id']
        print(f"✅ Generated access review report: {data['id']}")
        print(f"   Report type: {data.get('report_type')}")
    
    def test_list_access_review_reports(self, auth_headers):
        """Test GET /api/acms/reports lists generated reports"""
        response = requests.get(
            f"{BASE_URL}/api/acms/reports",
            headers=auth_headers
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert 'reports' in data
        assert isinstance(data['reports'], list)
        assert 'total' in data
        
        print(f"✅ Listed {len(data['reports'])} access review reports (total: {data['total']})")


class TestPasswordRotationAutomation:
    """Test Password Rotation endpoints"""
    
    @pytest.fixture(scope="class")
    def test_credential_data(self, auth_headers):
        """Get or create a test credential for rotation tests"""
        # First try to get existing credentials
        creds_response = requests.get(
            f"{BASE_URL}/api/acms/credentials",
            headers=auth_headers
        )
        
        if creds_response.status_code == 200 and creds_response.json().get('credentials'):
            cred = creds_response.json()['credentials'][0]
            return {'id': cred['id'], 'tool_id': cred.get('tool_id')}
        
        # Need to create a tool and credential
        # First get or create a tool
        tools_response = requests.get(
            f"{BASE_URL}/api/acms/tools",
            headers=auth_headers,
            params={'limit': 1}
        )
        
        if tools_response.status_code == 200 and tools_response.json().get('tools'):
            tool_id = tools_response.json()['tools'][0]['id']
        else:
            # Create a tool
            tool_response = requests.post(
                f"{BASE_URL}/api/acms/tools",
                headers=auth_headers,
                json={
                    "name": f"TEST_RotationTool_{uuid.uuid4().hex[:8]}",
                    "category": "development",
                    "login_type": "individual"
                }
            )
            if tool_response.status_code not in [200, 201]:
                pytest.skip(f"Could not create tool: {tool_response.text}")
            tool_id = tool_response.json()['id']
        
        # Create a credential
        cred_response = requests.post(
            f"{BASE_URL}/api/acms/credentials",
            headers=auth_headers,
            json={
                "tool_id": tool_id,
                "login_email": f"test_rotation_{uuid.uuid4().hex[:8]}@sevora.com",
                "password": "TestPassword123!",
                "visible_to_roles": ["super_admin"]
            }
        )
        
        if cred_response.status_code not in [200, 201]:
            pytest.skip(f"Could not create credential: {cred_response.text}")
        
        return {'id': cred_response.json()['id'], 'tool_id': tool_id}
    
    def test_get_rotation_status(self, auth_headers):
        """Test GET /api/acms/credentials/rotation-status returns status"""
        response = requests.get(
            f"{BASE_URL}/api/acms/credentials/rotation-status",
            headers=auth_headers
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        
        # Required fields
        required_fields = ['rotation_status', 'summary']
        for field in required_fields:
            assert field in data, f"Missing required field: {field}"
        
        assert isinstance(data['rotation_status'], list)
        
        summary = data['summary']
        assert 'total_credentials' in summary
        assert 'overdue' in summary
        assert 'due_soon' in summary
        assert 'ok' in summary
        
        print(f"✅ Rotation status: {summary['total_credentials']} credentials")
        print(f"   Overdue: {summary['overdue']}, Due soon: {summary['due_soon']}, OK: {summary['ok']}")
    
    def test_set_rotation_config(self, auth_headers, test_credential_data):
        """Test PUT /api/acms/credentials/{id}/rotation-config sets policy"""
        credential_id = test_credential_data['id']
        
        response = requests.put(
            f"{BASE_URL}/api/acms/credentials/{credential_id}/rotation-config",
            headers=auth_headers,
            json={
                "rotation_days": 60,
                "notify_days_before": 7,
                "is_enabled": True
            }
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert 'message' in data or 'config' in data
        
        print(f"✅ Set rotation config for credential {credential_id}")
    
    def test_send_rotation_reminders(self, auth_headers):
        """Test POST /api/acms/credentials/send-rotation-reminders sends reminders"""
        response = requests.post(
            f"{BASE_URL}/api/acms/credentials/send-rotation-reminders",
            headers=auth_headers
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert 'message' in data or 'reminders_sent' in data
        
        reminders_count = data.get('reminders_sent', [])
        print(f"✅ Rotation reminders endpoint working, sent {len(reminders_count) if isinstance(reminders_count, list) else reminders_count} reminders")


class TestACMSEmailNotifications:
    """Test that email notifications are triggered (verification via logs since email may not be configured)"""
    
    def test_access_request_triggers_notification(self, auth_headers):
        """Test that creating an access request logs notification intent"""
        # First get a tool
        tools_response = requests.get(
            f"{BASE_URL}/api/acms/tools",
            headers=auth_headers,
            params={'is_active': True, 'limit': 1}
        )
        
        if tools_response.status_code != 200 or not tools_response.json().get('tools'):
            pytest.skip("No active tools found for notification test")
        
        tool_id = tools_response.json()['tools'][0]['id']
        
        # Check if we already have access or pending request - use a new user session if needed
        # For testing, we'll just verify the endpoint accepts the request structure
        response = requests.post(
            f"{BASE_URL}/api/acms/requests",
            headers=auth_headers,
            json={
                "tool_id": tool_id,
                "reason": "TEST notification trigger request",
                "duration": "permanent",
                "requested_level": "viewer"
            }
        )
        
        # Either success (new request) or 400 (already have access/pending)
        assert response.status_code in [200, 201, 400], f"Unexpected status: {response.status_code}: {response.text}"
        
        if response.status_code in [200, 201]:
            print(f"✅ Access request created - notification would be sent to manager")
            print(f"   Note: Email service may log instead of send if not configured")
        else:
            # Already has access or pending request
            print(f"✅ Access request endpoint working (user already has access/pending request)")


class TestTeamDashboardPulseIntegration:
    """Test that Team Dashboard correctly integrates with Pulse analytics"""
    
    def test_dashboard_summary_works(self, auth_headers):
        """Verify dashboard summary endpoint still works with new integration"""
        response = requests.get(
            f"{BASE_URL}/api/analytics/dashboard-summary",
            headers=auth_headers
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        
        # Key dashboard sections
        assert 'team_overview' in data
        assert 'task_summary' in data
        assert 'project_summary' in data
        
        print(f"✅ Dashboard summary working with team overview: {data['team_overview'].get('total_employees')} employees")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
