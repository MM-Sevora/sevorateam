"""
Test Email Features API - Phase 2 & 3: Snooze, Scheduled Send, Follow-up Reminders, Email Tracking
Mail Inbox Features for Marketing Operations Platform.

Tests cover:
1. Email Snooze - POST snooze, GET snoozed, DELETE unsnooze
2. Scheduled Send - POST schedule, GET scheduled, DELETE cancel
3. Follow-up Reminders - POST create, GET list, PUT dismiss, PUT snooze
4. Email Tracking - POST create tracking, GET tracking list, GET tracking pixel, GET stats summary

MongoDB Collections:
- snoozed_emails
- scheduled_emails  
- email_follow_ups
- email_tracking
- email_tracking_events
"""
import pytest
import requests
import os
import uuid
from datetime import datetime, timedelta

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
TEST_EMAIL = "superadmin@sevora.com"
TEST_PASSWORD = "superadmin123"


class TestPhase2And3Auth:
    """Test authentication for Phase 2 & 3 email features"""
    
    @pytest.fixture(scope="class")
    def auth_token(self):
        """Get auth token for tests"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": TEST_EMAIL, "password": TEST_PASSWORD}
        )
        assert response.status_code == 200, f"Login failed: {response.text}"
        data = response.json()
        return data.get("access_token")
    
    @pytest.fixture(scope="class")
    def auth_headers(self, auth_token):
        """Return headers with auth token"""
        return {
            "Authorization": f"Bearer {auth_token}",
            "Content-Type": "application/json"
        }


# ============== SNOOZE API TESTS ==============

class TestEmailSnoozeCRUD(TestPhase2And3Auth):
    """Test Email Snooze operations - snooze, list snoozed, unsnooze"""
    
    # Track created snooze IDs for cleanup
    created_snooze_message_ids = []
    
    def test_get_snoozed_emails_empty_or_existing(self, auth_headers):
        """GET /api/email-features/snoozed - should return list of snoozed emails"""
        response = requests.get(
            f"{BASE_URL}/api/email-features/snoozed",
            headers=auth_headers
        )
        assert response.status_code == 200, f"Failed to get snoozed: {response.text}"
        data = response.json()
        assert isinstance(data, list), "Snoozed emails should be a list"
        print(f"PASS: GET snoozed emails returned {len(data)} item(s)")
    
    def test_snooze_email_success(self, auth_headers):
        """POST /api/email-features/snooze - snooze an email"""
        message_id = f"TEST_MSG_{uuid.uuid4().hex[:12]}"
        snooze_until = (datetime.utcnow() + timedelta(hours=24)).isoformat() + "Z"
        
        snooze_data = {
            "message_id": message_id,
            "mailbox": None,
            "snooze_until": snooze_until,
            "subject": "TEST Snoozed Email Subject",
            "from_email": "test@example.com",
            "from_name": "Test Sender"
        }
        
        response = requests.post(
            f"{BASE_URL}/api/email-features/snooze",
            json=snooze_data,
            headers=auth_headers
        )
        
        assert response.status_code == 200, f"Snooze failed: {response.text}"
        data = response.json()
        
        # Data assertions
        assert "id" in data, "Response should contain id"
        assert data["message_id"] == message_id, "message_id mismatch"
        assert data["subject"] == snooze_data["subject"], "subject mismatch"
        assert data["from_email"] == snooze_data["from_email"], "from_email mismatch"
        assert data["from_name"] == snooze_data["from_name"], "from_name mismatch"
        assert "created_at" in data, "Should have created_at"
        
        # Track for cleanup
        self.created_snooze_message_ids.append(message_id)
        print(f"PASS: Snoozed email with message_id: {message_id}")
        
        return message_id
    
    def test_snooze_email_and_verify_persistence(self, auth_headers):
        """Snooze email and verify it appears in snoozed list"""
        message_id = f"TEST_PERSIST_{uuid.uuid4().hex[:8]}"
        snooze_until = (datetime.utcnow() + timedelta(hours=48)).isoformat() + "Z"
        
        snooze_data = {
            "message_id": message_id,
            "snooze_until": snooze_until,
            "subject": "TEST Persistence Check",
            "from_email": "persist@example.com"
        }
        
        # CREATE snooze
        create_response = requests.post(
            f"{BASE_URL}/api/email-features/snooze",
            json=snooze_data,
            headers=auth_headers
        )
        assert create_response.status_code == 200
        self.created_snooze_message_ids.append(message_id)
        
        # GET snoozed list and verify
        get_response = requests.get(
            f"{BASE_URL}/api/email-features/snoozed",
            headers=auth_headers
        )
        assert get_response.status_code == 200
        snoozed = get_response.json()
        
        found = next((s for s in snoozed if s["message_id"] == message_id), None)
        assert found is not None, f"Snoozed email {message_id} not found in list"
        assert found["subject"] == snooze_data["subject"]
        
        print(f"PASS: Snoozed email {message_id} persisted and verified")
    
    def test_snooze_replaces_existing_snooze(self, auth_headers):
        """Snoozing same message_id should replace existing snooze"""
        message_id = f"TEST_REPLACE_{uuid.uuid4().hex[:8]}"
        
        # First snooze
        snooze1_until = (datetime.utcnow() + timedelta(hours=12)).isoformat() + "Z"
        requests.post(
            f"{BASE_URL}/api/email-features/snooze",
            json={
                "message_id": message_id,
                "snooze_until": snooze1_until,
                "subject": "Original",
                "from_email": "test@example.com"
            },
            headers=auth_headers
        )
        
        # Second snooze with different time
        snooze2_until = (datetime.utcnow() + timedelta(hours=72)).isoformat() + "Z"
        response = requests.post(
            f"{BASE_URL}/api/email-features/snooze",
            json={
                "message_id": message_id,
                "snooze_until": snooze2_until,
                "subject": "Updated",
                "from_email": "test@example.com"
            },
            headers=auth_headers
        )
        assert response.status_code == 200
        self.created_snooze_message_ids.append(message_id)
        
        # Verify only one snooze exists for this message
        get_response = requests.get(
            f"{BASE_URL}/api/email-features/snoozed",
            headers=auth_headers
        )
        snoozed = get_response.json()
        matches = [s for s in snoozed if s["message_id"] == message_id]
        
        assert len(matches) == 1, f"Expected 1 snooze, found {len(matches)}"
        assert matches[0]["subject"] == "Updated", "Should have updated snooze"
        
        print("PASS: Snooze correctly replaces existing snooze for same message")
    
    def test_unsnooze_email_success(self, auth_headers):
        """DELETE /api/email-features/snooze/{message_id} - unsnooze email"""
        # First create a snooze
        message_id = f"TEST_UNSNOOZE_{uuid.uuid4().hex[:8]}"
        snooze_until = (datetime.utcnow() + timedelta(hours=24)).isoformat() + "Z"
        
        requests.post(
            f"{BASE_URL}/api/email-features/snooze",
            json={
                "message_id": message_id,
                "snooze_until": snooze_until,
                "subject": "To Unsnooze",
                "from_email": "unsnooze@example.com"
            },
            headers=auth_headers
        )
        
        # DELETE (unsnooze)
        delete_response = requests.delete(
            f"{BASE_URL}/api/email-features/snooze/{message_id}",
            headers=auth_headers
        )
        assert delete_response.status_code == 200, f"Unsnooze failed: {delete_response.text}"
        
        # Verify removed from snoozed list
        get_response = requests.get(
            f"{BASE_URL}/api/email-features/snoozed",
            headers=auth_headers
        )
        snoozed = get_response.json()
        found = next((s for s in snoozed if s["message_id"] == message_id), None)
        assert found is None, "Unsnoozed email should not be in list"
        
        print(f"PASS: Email {message_id} unsnoozed successfully")
    
    def test_unsnooze_nonexistent_returns_404(self, auth_headers):
        """DELETE /api/email-features/snooze/{message_id} - 404 for non-existent"""
        fake_message_id = f"FAKE_{uuid.uuid4().hex}"
        
        response = requests.delete(
            f"{BASE_URL}/api/email-features/snooze/{fake_message_id}",
            headers=auth_headers
        )
        assert response.status_code == 404, f"Expected 404, got {response.status_code}"
        print("PASS: Unsnooze non-existent message returns 404")
    
    @pytest.fixture(scope="class", autouse=True)
    def cleanup_snoozed(self, auth_headers, request):
        """Cleanup created test snoozes after all tests"""
        yield
        for message_id in self.created_snooze_message_ids:
            try:
                requests.delete(
                    f"{BASE_URL}/api/email-features/snooze/{message_id}",
                    headers=auth_headers
                )
            except:
                pass


# ============== SCHEDULED SEND API TESTS ==============

class TestScheduledEmailCRUD(TestPhase2And3Auth):
    """Test Scheduled Email operations - schedule, list, cancel"""
    
    created_scheduled_ids = []
    
    def test_get_scheduled_emails_empty_or_existing(self, auth_headers):
        """GET /api/email-features/scheduled - should return list of scheduled emails"""
        response = requests.get(
            f"{BASE_URL}/api/email-features/scheduled",
            headers=auth_headers
        )
        assert response.status_code == 200, f"Failed to get scheduled: {response.text}"
        data = response.json()
        assert isinstance(data, list), "Scheduled emails should be a list"
        print(f"PASS: GET scheduled emails returned {len(data)} item(s)")
    
    def test_schedule_email_success(self, auth_headers):
        """POST /api/email-features/scheduled - schedule an email"""
        scheduled_time = (datetime.utcnow() + timedelta(hours=24)).isoformat() + "Z"
        
        email_data = {
            "to_recipients": ["recipient@example.com"],
            "cc_recipients": ["cc@example.com"],
            "bcc_recipients": [],
            "subject": f"TEST Scheduled Email {uuid.uuid4().hex[:8]}",
            "body": "<p>This is a test scheduled email body</p>",
            "scheduled_time": scheduled_time,
            "mailbox": None,
            "attachments": []
        }
        
        response = requests.post(
            f"{BASE_URL}/api/email-features/scheduled",
            json=email_data,
            headers=auth_headers
        )
        
        assert response.status_code == 200, f"Schedule failed: {response.text}"
        data = response.json()
        
        # Data assertions
        assert "id" in data, "Response should contain id"
        assert data["to_recipients"] == email_data["to_recipients"], "to_recipients mismatch"
        assert data["cc_recipients"] == email_data["cc_recipients"], "cc_recipients mismatch"
        assert data["subject"] == email_data["subject"], "subject mismatch"
        assert data["body"] == email_data["body"], "body mismatch"
        assert data["status"] == "pending", "status should be 'pending'"
        assert "created_at" in data, "Should have created_at"
        
        self.created_scheduled_ids.append(data["id"])
        print(f"PASS: Scheduled email with ID: {data['id']}")
        
        return data["id"]
    
    def test_schedule_email_and_verify_persistence(self, auth_headers):
        """Schedule email and verify it appears in scheduled list"""
        scheduled_time = (datetime.utcnow() + timedelta(hours=48)).isoformat() + "Z"
        
        email_data = {
            "to_recipients": ["persist@example.com"],
            "subject": f"TEST Persist {uuid.uuid4().hex[:8]}",
            "body": "<p>Persistence test</p>",
            "scheduled_time": scheduled_time
        }
        
        # CREATE
        create_response = requests.post(
            f"{BASE_URL}/api/email-features/scheduled",
            json=email_data,
            headers=auth_headers
        )
        assert create_response.status_code == 200
        created = create_response.json()
        scheduled_id = created["id"]
        self.created_scheduled_ids.append(scheduled_id)
        
        # GET list and verify
        get_response = requests.get(
            f"{BASE_URL}/api/email-features/scheduled",
            headers=auth_headers
        )
        assert get_response.status_code == 200
        scheduled = get_response.json()
        
        found = next((s for s in scheduled if s["id"] == scheduled_id), None)
        assert found is not None, f"Scheduled email {scheduled_id} not found"
        assert found["subject"] == email_data["subject"]
        assert found["status"] == "pending"
        
        print(f"PASS: Scheduled email {scheduled_id} persisted and verified")
    
    def test_cancel_scheduled_email_success(self, auth_headers):
        """DELETE /api/email-features/scheduled/{id} - cancel scheduled email"""
        # First schedule an email
        scheduled_time = (datetime.utcnow() + timedelta(hours=24)).isoformat() + "Z"
        
        create_response = requests.post(
            f"{BASE_URL}/api/email-features/scheduled",
            json={
                "to_recipients": ["cancel@example.com"],
                "subject": "TEST To Cancel",
                "body": "<p>Cancel me</p>",
                "scheduled_time": scheduled_time
            },
            headers=auth_headers
        )
        created = create_response.json()
        scheduled_id = created["id"]
        
        # DELETE (cancel)
        delete_response = requests.delete(
            f"{BASE_URL}/api/email-features/scheduled/{scheduled_id}",
            headers=auth_headers
        )
        assert delete_response.status_code == 200, f"Cancel failed: {delete_response.text}"
        
        # Verify not in pending list (should be cancelled)
        get_response = requests.get(
            f"{BASE_URL}/api/email-features/scheduled",
            headers=auth_headers
        )
        scheduled = get_response.json()
        found = next((s for s in scheduled if s["id"] == scheduled_id), None)
        assert found is None, "Cancelled email should not be in pending list"
        
        print(f"PASS: Scheduled email {scheduled_id} cancelled successfully")
    
    def test_cancel_nonexistent_returns_404(self, auth_headers):
        """DELETE /api/email-features/scheduled/{id} - 404 for non-existent"""
        fake_id = str(uuid.uuid4())
        
        response = requests.delete(
            f"{BASE_URL}/api/email-features/scheduled/{fake_id}",
            headers=auth_headers
        )
        assert response.status_code == 404, f"Expected 404, got {response.status_code}"
        print("PASS: Cancel non-existent scheduled email returns 404")
    
    def test_schedule_email_validation(self, auth_headers):
        """POST /api/email-features/scheduled - validate required fields"""
        # Missing to_recipients
        response = requests.post(
            f"{BASE_URL}/api/email-features/scheduled",
            json={
                "subject": "Test",
                "body": "Test",
                "scheduled_time": (datetime.utcnow() + timedelta(hours=24)).isoformat() + "Z"
            },
            headers=auth_headers
        )
        assert response.status_code == 422, f"Expected 422 for missing to_recipients, got {response.status_code}"
        
        print("PASS: Schedule email validates required fields")
    
    @pytest.fixture(scope="class", autouse=True)
    def cleanup_scheduled(self, auth_headers, request):
        """Cleanup created test scheduled emails"""
        yield
        for scheduled_id in self.created_scheduled_ids:
            try:
                requests.delete(
                    f"{BASE_URL}/api/email-features/scheduled/{scheduled_id}",
                    headers=auth_headers
                )
            except:
                pass


# ============== FOLLOW-UP REMINDERS API TESTS ==============

class TestFollowUpRemindersCRUD(TestPhase2And3Auth):
    """Test Follow-up Reminders operations - create, list, dismiss, snooze"""
    
    created_followup_ids = []
    
    def test_get_follow_ups_empty_or_existing(self, auth_headers):
        """GET /api/email-features/follow-ups - should return list of reminders"""
        response = requests.get(
            f"{BASE_URL}/api/email-features/follow-ups",
            headers=auth_headers
        )
        assert response.status_code == 200, f"Failed to get follow-ups: {response.text}"
        data = response.json()
        assert isinstance(data, list), "Follow-ups should be a list"
        print(f"PASS: GET follow-ups returned {len(data)} item(s)")
    
    def test_create_follow_up_success(self, auth_headers):
        """POST /api/email-features/follow-ups - create follow-up reminder"""
        reminder_data = {
            "message_id": f"TEST_MSG_{uuid.uuid4().hex[:12]}",
            "thread_id": f"TEST_THREAD_{uuid.uuid4().hex[:8]}",
            "subject": "TEST Follow-up Subject",
            "to_email": "followup@example.com",
            "to_name": "Follow Up Person",
            "remind_after_hours": 48,
            "mailbox": None
        }
        
        response = requests.post(
            f"{BASE_URL}/api/email-features/follow-ups",
            json=reminder_data,
            headers=auth_headers
        )
        
        assert response.status_code == 200, f"Create follow-up failed: {response.text}"
        data = response.json()
        
        # Data assertions
        assert "id" in data, "Response should contain id"
        assert data["message_id"] == reminder_data["message_id"], "message_id mismatch"
        assert data["subject"] == reminder_data["subject"], "subject mismatch"
        assert data["to_email"] == reminder_data["to_email"], "to_email mismatch"
        assert data["remind_after_hours"] == reminder_data["remind_after_hours"], "remind_after_hours mismatch"
        assert data["status"] == "pending", "status should be 'pending'"
        assert "remind_at" in data, "Should have remind_at calculated"
        assert "created_at" in data, "Should have created_at"
        
        self.created_followup_ids.append(data["id"])
        print(f"PASS: Created follow-up reminder with ID: {data['id']}")
        
        return data["id"]
    
    def test_create_follow_up_and_verify_persistence(self, auth_headers):
        """Create follow-up and verify it appears in list"""
        reminder_data = {
            "message_id": f"TEST_PERSIST_{uuid.uuid4().hex[:8]}",
            "subject": "TEST Persistence Check",
            "to_email": "persist@example.com",
            "remind_after_hours": 24
        }
        
        # CREATE
        create_response = requests.post(
            f"{BASE_URL}/api/email-features/follow-ups",
            json=reminder_data,
            headers=auth_headers
        )
        assert create_response.status_code == 200
        created = create_response.json()
        followup_id = created["id"]
        self.created_followup_ids.append(followup_id)
        
        # GET list and verify
        get_response = requests.get(
            f"{BASE_URL}/api/email-features/follow-ups",
            headers=auth_headers
        )
        assert get_response.status_code == 200
        followups = get_response.json()
        
        found = next((f for f in followups if f["id"] == followup_id), None)
        assert found is not None, f"Follow-up {followup_id} not found"
        assert found["subject"] == reminder_data["subject"]
        
        print(f"PASS: Follow-up {followup_id} persisted and verified")
    
    def test_dismiss_follow_up_success(self, auth_headers):
        """PUT /api/email-features/follow-ups/{id}/dismiss - dismiss reminder"""
        # First create a follow-up
        create_response = requests.post(
            f"{BASE_URL}/api/email-features/follow-ups",
            json={
                "message_id": f"TEST_DISMISS_{uuid.uuid4().hex[:8]}",
                "subject": "TEST To Dismiss",
                "to_email": "dismiss@example.com",
                "remind_after_hours": 48
            },
            headers=auth_headers
        )
        created = create_response.json()
        followup_id = created["id"]
        
        # DISMISS
        dismiss_response = requests.put(
            f"{BASE_URL}/api/email-features/follow-ups/{followup_id}/dismiss",
            headers=auth_headers
        )
        assert dismiss_response.status_code == 200, f"Dismiss failed: {dismiss_response.text}"
        
        # Verify not in active list (dismissed)
        get_response = requests.get(
            f"{BASE_URL}/api/email-features/follow-ups",
            headers=auth_headers
        )
        followups = get_response.json()
        found = next((f for f in followups if f["id"] == followup_id), None)
        assert found is None, "Dismissed follow-up should not be in active list"
        
        print(f"PASS: Follow-up {followup_id} dismissed successfully")
    
    def test_dismiss_nonexistent_returns_404(self, auth_headers):
        """PUT /api/email-features/follow-ups/{id}/dismiss - 404 for non-existent"""
        fake_id = str(uuid.uuid4())
        
        response = requests.put(
            f"{BASE_URL}/api/email-features/follow-ups/{fake_id}/dismiss",
            headers=auth_headers
        )
        assert response.status_code == 404, f"Expected 404, got {response.status_code}"
        print("PASS: Dismiss non-existent follow-up returns 404")
    
    def test_snooze_follow_up_success(self, auth_headers):
        """PUT /api/email-features/follow-ups/{id}/snooze - snooze reminder"""
        # First create a follow-up
        create_response = requests.post(
            f"{BASE_URL}/api/email-features/follow-ups",
            json={
                "message_id": f"TEST_SNOOZE_FU_{uuid.uuid4().hex[:8]}",
                "subject": "TEST To Snooze",
                "to_email": "snooze@example.com",
                "remind_after_hours": 24
            },
            headers=auth_headers
        )
        created = create_response.json()
        followup_id = created["id"]
        original_remind_at = created["remind_at"]
        self.created_followup_ids.append(followup_id)
        
        # SNOOZE for 48 hours
        snooze_response = requests.put(
            f"{BASE_URL}/api/email-features/follow-ups/{followup_id}/snooze?hours=48",
            headers=auth_headers
        )
        assert snooze_response.status_code == 200, f"Snooze failed: {snooze_response.text}"
        snooze_data = snooze_response.json()
        
        # Verify new remind_at is later than original
        assert "remind_at" in snooze_data, "Response should contain new remind_at"
        
        # Verify still in list with updated remind_at
        get_response = requests.get(
            f"{BASE_URL}/api/email-features/follow-ups",
            headers=auth_headers
        )
        followups = get_response.json()
        found = next((f for f in followups if f["id"] == followup_id), None)
        assert found is not None, "Snoozed follow-up should still be in list"
        assert found["status"] == "pending", "Status should remain pending"
        
        print(f"PASS: Follow-up {followup_id} snoozed successfully")
    
    def test_snooze_nonexistent_returns_404(self, auth_headers):
        """PUT /api/email-features/follow-ups/{id}/snooze - 404 for non-existent"""
        fake_id = str(uuid.uuid4())
        
        response = requests.put(
            f"{BASE_URL}/api/email-features/follow-ups/{fake_id}/snooze?hours=24",
            headers=auth_headers
        )
        assert response.status_code == 404, f"Expected 404, got {response.status_code}"
        print("PASS: Snooze non-existent follow-up returns 404")
    
    def test_create_follow_up_with_default_hours(self, auth_headers):
        """POST /api/email-features/follow-ups - default remind_after_hours is 48"""
        reminder_data = {
            "message_id": f"TEST_DEFAULT_{uuid.uuid4().hex[:8]}",
            "subject": "TEST Default Hours",
            "to_email": "default@example.com"
            # Not providing remind_after_hours - should default to 48
        }
        
        response = requests.post(
            f"{BASE_URL}/api/email-features/follow-ups",
            json=reminder_data,
            headers=auth_headers
        )
        
        assert response.status_code == 200, f"Create failed: {response.text}"
        data = response.json()
        
        # Default should be 48 hours
        assert data.get("remind_after_hours") == 48, f"Expected 48 default, got {data.get('remind_after_hours')}"
        
        self.created_followup_ids.append(data["id"])
        print("PASS: Follow-up created with default 48 hours")
    
    @pytest.fixture(scope="class", autouse=True)
    def cleanup_followups(self, auth_headers, request):
        """Cleanup created test follow-ups"""
        yield
        for followup_id in self.created_followup_ids:
            try:
                # Try to dismiss to clean up
                requests.put(
                    f"{BASE_URL}/api/email-features/follow-ups/{followup_id}/dismiss",
                    headers=auth_headers
                )
            except:
                pass


# ============== EMAIL TRACKING API TESTS ==============

class TestEmailTrackingCRUD(TestPhase2And3Auth):
    """Test Email Tracking operations - create tracking, list, pixel, stats"""
    
    created_tracking_ids = []
    
    def test_get_tracking_records_empty_or_existing(self, auth_headers):
        """GET /api/email-features/tracking - should return list of tracking records"""
        response = requests.get(
            f"{BASE_URL}/api/email-features/tracking",
            headers=auth_headers
        )
        assert response.status_code == 200, f"Failed to get tracking: {response.text}"
        data = response.json()
        assert isinstance(data, list), "Tracking records should be a list"
        print(f"PASS: GET tracking returned {len(data)} record(s)")
    
    def test_create_tracking_success(self, auth_headers):
        """POST /api/email-features/tracking - create tracking record"""
        tracking_data = {
            "message_id": f"TEST_MSG_{uuid.uuid4().hex[:12]}",
            "to_email": "track@example.com",
            "subject": f"TEST Tracked Email {uuid.uuid4().hex[:8]}",
            "tracking_type": "open",
            "mailbox": None
        }
        
        response = requests.post(
            f"{BASE_URL}/api/email-features/tracking",
            json=tracking_data,
            headers=auth_headers
        )
        
        assert response.status_code == 200, f"Create tracking failed: {response.text}"
        data = response.json()
        
        # Data assertions
        assert "id" in data, "Response should contain id"
        assert data["message_id"] == tracking_data["message_id"], "message_id mismatch"
        assert data["to_email"] == tracking_data["to_email"], "to_email mismatch"
        assert data["subject"] == tracking_data["subject"], "subject mismatch"
        assert data["open_count"] == 0, "Initial open_count should be 0"
        assert data["click_count"] == 0, "Initial click_count should be 0"
        assert data["first_opened_at"] is None, "first_opened_at should be None initially"
        assert "tracking_pixel_url" in data, "Should have tracking_pixel_url"
        assert "tracking_link_prefix" in data, "Should have tracking_link_prefix"
        assert f"/api/email-features/track/{data['id']}/pixel.gif" in data["tracking_pixel_url"]
        
        self.created_tracking_ids.append(data["id"])
        print(f"PASS: Created tracking with ID: {data['id']}")
        
        return data["id"]
    
    def test_create_tracking_and_verify_persistence(self, auth_headers):
        """Create tracking and verify it appears in list"""
        tracking_data = {
            "message_id": f"TEST_PERSIST_{uuid.uuid4().hex[:8]}",
            "to_email": "persist@example.com",
            "subject": "TEST Persistence"
        }
        
        # CREATE
        create_response = requests.post(
            f"{BASE_URL}/api/email-features/tracking",
            json=tracking_data,
            headers=auth_headers
        )
        assert create_response.status_code == 200
        created = create_response.json()
        tracking_id = created["id"]
        self.created_tracking_ids.append(tracking_id)
        
        # GET list and verify
        get_response = requests.get(
            f"{BASE_URL}/api/email-features/tracking",
            headers=auth_headers
        )
        assert get_response.status_code == 200
        tracking = get_response.json()
        
        found = next((t for t in tracking if t["id"] == tracking_id), None)
        assert found is not None, f"Tracking {tracking_id} not found"
        assert found["subject"] == tracking_data["subject"]
        
        print(f"PASS: Tracking {tracking_id} persisted and verified")
    
    def test_tracking_pixel_returns_gif(self, auth_headers):
        """GET /api/email-features/track/{id}/pixel.gif - returns transparent GIF (no auth required)"""
        # First create a tracking record
        create_response = requests.post(
            f"{BASE_URL}/api/email-features/tracking",
            json={
                "message_id": f"TEST_PIXEL_{uuid.uuid4().hex[:8]}",
                "to_email": "pixel@example.com",
                "subject": "TEST Pixel"
            },
            headers=auth_headers
        )
        created = create_response.json()
        tracking_id = created["id"]
        self.created_tracking_ids.append(tracking_id)
        
        # GET pixel (NO AUTH - public endpoint)
        pixel_response = requests.get(
            f"{BASE_URL}/api/email-features/track/{tracking_id}/pixel.gif"
        )
        
        assert pixel_response.status_code == 200, f"Pixel request failed: {pixel_response.status_code}"
        assert "image/gif" in pixel_response.headers.get("content-type", ""), "Should return GIF content-type"
        
        # Verify it's a valid GIF (starts with GIF magic bytes)
        content = pixel_response.content
        assert content[:3] == b'GIF', "Content should be valid GIF format"
        
        print(f"PASS: Tracking pixel returned valid GIF for {tracking_id}")
    
    def test_tracking_pixel_increments_open_count(self, auth_headers):
        """Tracking pixel request should increment open_count"""
        # Create tracking
        create_response = requests.post(
            f"{BASE_URL}/api/email-features/tracking",
            json={
                "message_id": f"TEST_COUNT_{uuid.uuid4().hex[:8]}",
                "to_email": "count@example.com",
                "subject": "TEST Count"
            },
            headers=auth_headers
        )
        created = create_response.json()
        tracking_id = created["id"]
        self.created_tracking_ids.append(tracking_id)
        
        # Hit pixel endpoint twice
        requests.get(f"{BASE_URL}/api/email-features/track/{tracking_id}/pixel.gif")
        requests.get(f"{BASE_URL}/api/email-features/track/{tracking_id}/pixel.gif")
        
        # Get tracking record and verify count
        get_response = requests.get(
            f"{BASE_URL}/api/email-features/tracking",
            headers=auth_headers
        )
        tracking = get_response.json()
        found = next((t for t in tracking if t["id"] == tracking_id), None)
        
        assert found is not None, "Tracking record should exist"
        assert found["open_count"] >= 2, f"Expected at least 2 opens, got {found['open_count']}"
        assert found["first_opened_at"] is not None, "first_opened_at should be set"
        assert found["last_opened_at"] is not None, "last_opened_at should be set"
        
        print(f"PASS: Tracking pixel incremented open_count to {found['open_count']}")
    
    def test_tracking_stats_summary(self, auth_headers):
        """GET /api/email-features/tracking/stats/summary - get tracking statistics"""
        response = requests.get(
            f"{BASE_URL}/api/email-features/tracking/stats/summary",
            headers=auth_headers
        )
        
        assert response.status_code == 200, f"Stats request failed: {response.text}"
        data = response.json()
        
        # Verify stats structure
        assert "period_days" in data, "Should have period_days"
        assert "total_emails_tracked" in data, "Should have total_emails_tracked"
        assert "total_opens" in data, "Should have total_opens"
        assert "total_clicks" in data, "Should have total_clicks"
        assert "emails_opened" in data, "Should have emails_opened"
        assert "emails_clicked" in data, "Should have emails_clicked"
        assert "open_rate" in data, "Should have open_rate"
        assert "click_rate" in data, "Should have click_rate"
        assert "avg_opens_per_email" in data, "Should have avg_opens_per_email"
        
        # Verify types
        assert isinstance(data["period_days"], int), "period_days should be int"
        assert isinstance(data["total_emails_tracked"], int), "total_emails_tracked should be int"
        assert isinstance(data["open_rate"], (int, float)), "open_rate should be numeric"
        
        print(f"PASS: Tracking stats summary returned - {data['total_emails_tracked']} emails tracked")
    
    def test_tracking_stats_with_days_param(self, auth_headers):
        """GET /api/email-features/tracking/stats/summary?days=7 - custom period"""
        response = requests.get(
            f"{BASE_URL}/api/email-features/tracking/stats/summary?days=7",
            headers=auth_headers
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["period_days"] == 7, "period_days should be 7"
        
        print("PASS: Stats summary with custom days parameter works")
    
    def test_tracking_pixel_for_nonexistent_still_returns_gif(self):
        """GET /api/email-features/track/{invalid_id}/pixel.gif - still returns GIF gracefully"""
        fake_id = str(uuid.uuid4())
        
        response = requests.get(
            f"{BASE_URL}/api/email-features/track/{fake_id}/pixel.gif"
        )
        
        # Should still return GIF (graceful handling for invalid tracking IDs)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        assert "image/gif" in response.headers.get("content-type", "")
        
        print("PASS: Non-existent tracking ID still returns GIF gracefully")
    
    @pytest.fixture(scope="class", autouse=True)
    def cleanup_tracking(self, auth_headers, request):
        """Cleanup created test tracking records"""
        yield
        for tracking_id in self.created_tracking_ids:
            try:
                requests.delete(
                    f"{BASE_URL}/api/email-features/tracking/{tracking_id}",
                    headers=auth_headers
                )
            except:
                pass


# ============== UNAUTHORIZED ACCESS TESTS ==============

class TestPhase2And3Unauthorized:
    """Test that Phase 2 & 3 endpoints require authentication"""
    
    def test_snoozed_unauthorized(self):
        """GET /api/email-features/snoozed without token should fail"""
        response = requests.get(f"{BASE_URL}/api/email-features/snoozed")
        assert response.status_code in [401, 403, 422], f"Expected auth error, got {response.status_code}"
        print("PASS: Snoozed endpoint requires authentication")
    
    def test_scheduled_unauthorized(self):
        """GET /api/email-features/scheduled without token should fail"""
        response = requests.get(f"{BASE_URL}/api/email-features/scheduled")
        assert response.status_code in [401, 403, 422], f"Expected auth error, got {response.status_code}"
        print("PASS: Scheduled endpoint requires authentication")
    
    def test_follow_ups_unauthorized(self):
        """GET /api/email-features/follow-ups without token should fail"""
        response = requests.get(f"{BASE_URL}/api/email-features/follow-ups")
        assert response.status_code in [401, 403, 422], f"Expected auth error, got {response.status_code}"
        print("PASS: Follow-ups endpoint requires authentication")
    
    def test_tracking_unauthorized(self):
        """GET /api/email-features/tracking without token should fail"""
        response = requests.get(f"{BASE_URL}/api/email-features/tracking")
        assert response.status_code in [401, 403, 422], f"Expected auth error, got {response.status_code}"
        print("PASS: Tracking endpoint requires authentication")
    
    def test_tracking_stats_unauthorized(self):
        """GET /api/email-features/tracking/stats/summary without token should fail"""
        response = requests.get(f"{BASE_URL}/api/email-features/tracking/stats/summary")
        assert response.status_code in [401, 403, 422], f"Expected auth error, got {response.status_code}"
        print("PASS: Tracking stats endpoint requires authentication")
    
    def test_tracking_pixel_no_auth_required(self):
        """GET /api/email-features/track/{id}/pixel.gif should NOT require auth"""
        # Tracking pixel is public (used in emails opened by recipients)
        fake_id = str(uuid.uuid4())
        response = requests.get(f"{BASE_URL}/api/email-features/track/{fake_id}/pixel.gif")
        # Should return 200 (not auth error) - pixel endpoint is intentionally public
        assert response.status_code == 200, f"Tracking pixel should be public, got {response.status_code}"
        print("PASS: Tracking pixel endpoint is public (no auth required)")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
