"""
Expense & Reimbursement Module Tests
Tests for expense claim submission, approval, rejection, and file upload
"""

import pytest
import requests
import os
import uuid
from datetime import datetime

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
SUPER_ADMIN_EMAIL = "superadmin@sevora.com"
SUPER_ADMIN_PASSWORD = "superadmin123"


class TestExpenseModuleBasics:
    """Basic health and authentication tests"""

    @pytest.fixture(scope="class")
    def auth_token(self):
        """Get authentication token for super admin"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": SUPER_ADMIN_EMAIL, "password": SUPER_ADMIN_PASSWORD}
        )
        assert response.status_code == 200, f"Login failed: {response.text}"
        data = response.json()
        # API returns access_token, not token
        token = data.get("access_token") or data.get("token")
        assert token, "No token in login response"
        return token

    @pytest.fixture(scope="class")
    def headers(self, auth_token):
        """Get authenticated headers"""
        return {
            "Authorization": f"Bearer {auth_token}",
            "Content-Type": "application/json"
        }

    def test_login_success(self):
        """Test super admin can login"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": SUPER_ADMIN_EMAIL, "password": SUPER_ADMIN_PASSWORD}
        )
        assert response.status_code == 200
        data = response.json()
        # API returns access_token, not token
        assert "access_token" in data or "token" in data
        assert "user" in data
        print(f"Login successful for user: {data['user'].get('name')}")


class TestExpenseClaimSubmission:
    """Tests for expense claim submission (Employee actions)"""

    @pytest.fixture(scope="class")
    def auth_token(self):
        """Get authentication token"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": SUPER_ADMIN_EMAIL, "password": SUPER_ADMIN_PASSWORD}
        )
        assert response.status_code == 200
        data = response.json()
        return data.get("access_token") or data.get("token")

    @pytest.fixture(scope="class")
    def headers(self, auth_token):
        """Get authenticated headers"""
        return {
            "Authorization": f"Bearer {auth_token}",
            "Content-Type": "application/json"
        }

    def test_get_my_claims_empty_or_list(self, headers):
        """Test GET /api/expense/claims/my - Returns user's claims"""
        response = requests.get(f"{BASE_URL}/api/expense/claims/my", headers=headers)
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"Found {len(data)} existing claims for user")

    def test_get_my_stats(self, headers):
        """Test GET /api/expense/claims/my/stats - Returns user statistics"""
        response = requests.get(f"{BASE_URL}/api/expense/claims/my/stats", headers=headers)
        assert response.status_code == 200
        data = response.json()
        assert "total_claims" in data
        assert "pending" in data
        assert "approved" in data
        assert "rejected" in data
        assert "total_claimed" in data
        assert "total_approved" in data
        print(f"User stats: {data}")

    def test_submit_claim_without_declaration_fails(self, headers):
        """Test claim submission fails without declaration"""
        payload = {
            "entries": [{
                "expense_date_from": "2026-03-01",
                "expense_date_to": "2026-03-01",
                "category": "travel",
                "description": "Test expense",
                "amount": 500
            }],
            "declaration_accepted": False,
            "notes": "Test claim"
        }
        response = requests.post(f"{BASE_URL}/api/expense/claims", headers=headers, json=payload)
        assert response.status_code == 400
        assert "declaration" in response.json().get("detail", "").lower()
        print("Correctly rejected claim without declaration")

    def test_submit_claim_without_entries_fails(self, headers):
        """Test claim submission fails without entries"""
        payload = {
            "entries": [],
            "declaration_accepted": True,
            "notes": "Test claim"
        }
        response = requests.post(f"{BASE_URL}/api/expense/claims", headers=headers, json=payload)
        assert response.status_code == 400
        print("Correctly rejected claim without entries")

    def test_submit_valid_claim_single_entry(self, headers):
        """Test submitting a valid claim with single entry"""
        unique_desc = f"TEST_Travel_expense_{uuid.uuid4().hex[:8]}"
        payload = {
            "entries": [{
                "expense_date_from": "2026-03-01",
                "expense_date_to": "2026-03-01",
                "category": "travel",
                "description": unique_desc,
                "amount": 1500.50
            }],
            "declaration_accepted": True,
            "notes": "Single entry test claim"
        }
        response = requests.post(f"{BASE_URL}/api/expense/claims", headers=headers, json=payload)
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        
        # Verify response structure
        assert "id" in data
        assert "claim_id" in data
        assert data["claim_id"].startswith("SEVRC"), f"Claim ID should be in SEVRC format, got: {data['claim_id']}"
        assert data["status"] == "pending"
        assert data["total_amount"] == 1500.50
        assert len(data["entries"]) == 1
        
        print(f"Created claim: {data['claim_id']} with amount: {data['total_amount']}")
        return data

    def test_submit_valid_claim_multiple_entries(self, headers):
        """Test submitting a valid claim with multiple line items"""
        unique_suffix = uuid.uuid4().hex[:8]
        payload = {
            "entries": [
                {
                    "expense_date_from": "2026-03-01",
                    "expense_date_to": "2026-03-02",
                    "category": "travel",
                    "description": f"TEST_Flight_tickets_{unique_suffix}",
                    "amount": 15000
                },
                {
                    "expense_date_from": "2026-03-01",
                    "expense_date_to": "2026-03-03",
                    "category": "accommodation",
                    "description": f"TEST_Hotel_stay_{unique_suffix}",
                    "amount": 8000
                },
                {
                    "expense_date_from": "2026-03-02",
                    "expense_date_to": "2026-03-02",
                    "category": "food",
                    "description": f"TEST_Meals_{unique_suffix}",
                    "amount": 2500
                }
            ],
            "declaration_accepted": True,
            "notes": "Multiple entries test claim for business trip"
        }
        response = requests.post(f"{BASE_URL}/api/expense/claims", headers=headers, json=payload)
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        
        # Verify all entries
        assert len(data["entries"]) == 3
        assert data["total_amount"] == 25500  # 15000 + 8000 + 2500
        assert data["claim_id"].startswith("SEVRC")
        
        print(f"Created multi-entry claim: {data['claim_id']} with 3 entries, total: {data['total_amount']}")
        return data

    def test_claim_id_increments_correctly(self, headers):
        """Test that claim IDs increment in SEVRC format"""
        # Submit first claim
        payload = {
            "entries": [{
                "expense_date_from": "2026-03-05",
                "expense_date_to": "2026-03-05",
                "category": "office_supplies",
                "description": f"TEST_Office_supplies_{uuid.uuid4().hex[:6]}",
                "amount": 200
            }],
            "declaration_accepted": True
        }
        response1 = requests.post(f"{BASE_URL}/api/expense/claims", headers=headers, json=payload)
        assert response1.status_code == 200
        claim1_id = response1.json()["claim_id"]
        
        # Submit second claim
        payload["entries"][0]["description"] = f"TEST_More_supplies_{uuid.uuid4().hex[:6]}"
        response2 = requests.post(f"{BASE_URL}/api/expense/claims", headers=headers, json=payload)
        assert response2.status_code == 200
        claim2_id = response2.json()["claim_id"]
        
        # Verify increment
        num1 = int(claim1_id.replace("SEVRC", ""))
        num2 = int(claim2_id.replace("SEVRC", ""))
        assert num2 == num1 + 1, f"IDs should increment: {claim1_id} -> {claim2_id}"
        print(f"Claim IDs incremented correctly: {claim1_id} -> {claim2_id}")


class TestExpenseClaimFilters:
    """Tests for filtering claims"""

    @pytest.fixture(scope="class")
    def auth_token(self):
        """Get authentication token"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": SUPER_ADMIN_EMAIL, "password": SUPER_ADMIN_PASSWORD}
        )
        assert response.status_code == 200
        data = response.json()
        return data.get("access_token") or data.get("token")

    @pytest.fixture(scope="class")
    def headers(self, auth_token):
        """Get authenticated headers"""
        return {
            "Authorization": f"Bearer {auth_token}",
            "Content-Type": "application/json"
        }

    def test_filter_my_claims_by_status_pending(self, headers):
        """Test filtering my claims by pending status"""
        response = requests.get(f"{BASE_URL}/api/expense/claims/my?status=pending", headers=headers)
        assert response.status_code == 200
        claims = response.json()
        assert isinstance(claims, list)
        for claim in claims:
            assert claim["status"] == "pending"
        print(f"Found {len(claims)} pending claims")

    def test_filter_my_claims_by_status_approved(self, headers):
        """Test filtering my claims by approved status"""
        response = requests.get(f"{BASE_URL}/api/expense/claims/my?status=approved", headers=headers)
        assert response.status_code == 200
        claims = response.json()
        assert isinstance(claims, list)
        for claim in claims:
            assert claim["status"] == "approved"
        print(f"Found {len(claims)} approved claims")


class TestHRApprovalActions:
    """Tests for HR approval/rejection (HR Panel actions)"""

    @pytest.fixture(scope="class")
    def auth_token(self):
        """Get authentication token"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": SUPER_ADMIN_EMAIL, "password": SUPER_ADMIN_PASSWORD}
        )
        assert response.status_code == 200
        data = response.json()
        return data.get("access_token") or data.get("token")

    @pytest.fixture(scope="class")
    def headers(self, auth_token):
        """Get authenticated headers"""
        return {
            "Authorization": f"Bearer {auth_token}",
            "Content-Type": "application/json"
        }

    @pytest.fixture(scope="class")
    def pending_claim(self, headers):
        """Create a pending claim for testing approval/rejection"""
        payload = {
            "entries": [{
                "expense_date_from": "2026-03-06",
                "expense_date_to": "2026-03-06",
                "category": "travel",
                "description": f"TEST_HR_review_claim_{uuid.uuid4().hex[:8]}",
                "amount": 5000
            }],
            "declaration_accepted": True,
            "notes": "Claim for HR approval testing"
        }
        response = requests.post(f"{BASE_URL}/api/expense/claims", headers=headers, json=payload)
        assert response.status_code == 200
        return response.json()

    def test_get_all_claims_hr(self, headers):
        """Test GET /api/expense/claims - HR can see all claims"""
        response = requests.get(f"{BASE_URL}/api/expense/claims", headers=headers)
        assert response.status_code == 200
        claims = response.json()
        assert isinstance(claims, list)
        print(f"HR can see {len(claims)} total claims")
        
        # Verify claim structure
        if claims:
            claim = claims[0]
            assert "claim_id" in claim
            assert "employee_name" in claim
            assert "employee_email" in claim
            assert "total_amount" in claim
            assert "status" in claim

    def test_get_hr_stats(self, headers):
        """Test GET /api/expense/claims/stats - HR statistics"""
        response = requests.get(f"{BASE_URL}/api/expense/claims/stats", headers=headers)
        assert response.status_code == 200
        data = response.json()
        
        assert "total_claims" in data
        assert "pending" in data
        assert "approved" in data
        assert "rejected" in data
        assert "this_month" in data
        assert "by_category" in data
        
        print(f"HR Stats: Total={data['total_claims']}, Pending={data['pending']}, Approved={data['approved']}")

    def test_filter_all_claims_by_status(self, headers):
        """Test filtering all claims by status (HR)"""
        response = requests.get(f"{BASE_URL}/api/expense/claims?status=pending", headers=headers)
        assert response.status_code == 200
        claims = response.json()
        for claim in claims:
            assert claim["status"] == "pending"
        print(f"Found {len(claims)} pending claims (HR view)")

    def test_approve_claim(self, headers, pending_claim):
        """Test approving an expense claim"""
        claim_id = pending_claim["id"]
        
        response = requests.put(
            f"{BASE_URL}/api/expense/claims/{claim_id}/approve",
            headers=headers,
            params={"hr_notes": "Approved for testing purposes"}
        )
        assert response.status_code == 200, f"Approve failed: {response.text}"
        data = response.json()
        
        assert data["success"] == True
        assert "claim_id" in data
        print(f"Approved claim: {data['claim_id']}")
        
        # Verify claim is now approved via GET
        get_response = requests.get(f"{BASE_URL}/api/expense/claims/{claim_id}", headers=headers)
        assert get_response.status_code == 200
        approved_claim = get_response.json()
        assert approved_claim["status"] == "approved"
        assert approved_claim["approved_amount"] == pending_claim["total_amount"]

    def test_reject_claim_without_reason_fails(self, headers):
        """Test rejection fails without reason"""
        # Create a claim to reject
        payload = {
            "entries": [{
                "expense_date_from": "2026-03-07",
                "expense_date_to": "2026-03-07",
                "category": "others",
                "description": f"TEST_Reject_test_{uuid.uuid4().hex[:8]}",
                "amount": 3000
            }],
            "declaration_accepted": True
        }
        create_response = requests.post(f"{BASE_URL}/api/expense/claims", headers=headers, json=payload)
        assert create_response.status_code == 200
        claim_id = create_response.json()["id"]
        
        # Try to reject without reason
        response = requests.put(
            f"{BASE_URL}/api/expense/claims/{claim_id}/reject",
            headers=headers,
            params={}  # No rejection_reason
        )
        assert response.status_code == 400 or response.status_code == 422
        print("Correctly rejected rejection without reason")

    def test_reject_claim_with_reason(self, headers):
        """Test rejecting an expense claim with reason"""
        # Create a claim to reject
        payload = {
            "entries": [{
                "expense_date_from": "2026-03-07",
                "expense_date_to": "2026-03-07",
                "category": "others",
                "description": f"TEST_Reject_with_reason_{uuid.uuid4().hex[:8]}",
                "amount": 4000
            }],
            "declaration_accepted": True
        }
        create_response = requests.post(f"{BASE_URL}/api/expense/claims", headers=headers, json=payload)
        assert create_response.status_code == 200
        claim_id = create_response.json()["id"]
        claim_ref = create_response.json()["claim_id"]
        
        # Reject with reason
        response = requests.put(
            f"{BASE_URL}/api/expense/claims/{claim_id}/reject",
            headers=headers,
            params={
                "rejection_reason": "Missing receipt for expense",
                "hr_notes": "Please resubmit with valid receipts"
            }
        )
        assert response.status_code == 200, f"Reject failed: {response.text}"
        data = response.json()
        
        assert data["success"] == True
        print(f"Rejected claim: {claim_ref}")
        
        # Verify claim is rejected via GET
        get_response = requests.get(f"{BASE_URL}/api/expense/claims/{claim_id}", headers=headers)
        assert get_response.status_code == 200
        rejected_claim = get_response.json()
        assert rejected_claim["status"] == "rejected"
        assert rejected_claim["rejection_reason"] == "Missing receipt for expense"

    def test_cannot_approve_already_approved(self, headers):
        """Test cannot approve already approved claim"""
        # Create and approve a claim
        payload = {
            "entries": [{
                "expense_date_from": "2026-03-08",
                "expense_date_to": "2026-03-08",
                "category": "travel",
                "description": f"TEST_Double_approve_{uuid.uuid4().hex[:8]}",
                "amount": 2000
            }],
            "declaration_accepted": True
        }
        create_response = requests.post(f"{BASE_URL}/api/expense/claims", headers=headers, json=payload)
        assert create_response.status_code == 200
        claim_id = create_response.json()["id"]
        
        # Approve first time
        approve_response1 = requests.put(
            f"{BASE_URL}/api/expense/claims/{claim_id}/approve",
            headers=headers
        )
        assert approve_response1.status_code == 200
        
        # Try to approve again
        approve_response2 = requests.put(
            f"{BASE_URL}/api/expense/claims/{claim_id}/approve",
            headers=headers
        )
        assert approve_response2.status_code == 400
        assert "pending" in approve_response2.json().get("detail", "").lower()
        print("Correctly prevented double approval")


class TestFileUpload:
    """Tests for receipt file upload"""

    @pytest.fixture(scope="class")
    def auth_token(self):
        """Get authentication token"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": SUPER_ADMIN_EMAIL, "password": SUPER_ADMIN_PASSWORD}
        )
        assert response.status_code == 200
        data = response.json()
        return data.get("access_token") or data.get("token")

    @pytest.fixture(scope="class")
    def headers(self, auth_token):
        """Get authenticated headers"""
        return {
            "Authorization": f"Bearer {auth_token}"
        }

    def test_upload_image_receipt(self, headers):
        """Test uploading an image file as receipt"""
        # Create a simple test image (1x1 pixel PNG)
        import base64
        png_data = base64.b64decode(
            "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=="
        )
        
        files = {
            "file": ("test_receipt.png", png_data, "image/png")
        }
        
        response = requests.post(
            f"{BASE_URL}/api/expense/upload-receipt",
            headers=headers,
            files=files
        )
        assert response.status_code == 200, f"Upload failed: {response.text}"
        data = response.json()
        
        assert data["success"] == True
        assert "url" in data
        assert data["url"].startswith("/api/expense/receipts/")
        assert "stored_filename" in data
        
        print(f"Uploaded receipt: {data['url']}")
        return data

    def test_upload_invalid_file_type_fails(self, headers):
        """Test uploading invalid file type is rejected"""
        files = {
            "file": ("test.exe", b"fake executable content", "application/x-msdownload")
        }
        
        response = requests.post(
            f"{BASE_URL}/api/expense/upload-receipt",
            headers=headers,
            files=files
        )
        assert response.status_code == 400
        assert "allowed" in response.json().get("detail", "").lower()
        print("Correctly rejected invalid file type")


class TestClaimDetailAccess:
    """Tests for claim detail access"""

    @pytest.fixture(scope="class")
    def auth_token(self):
        """Get authentication token"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": SUPER_ADMIN_EMAIL, "password": SUPER_ADMIN_PASSWORD}
        )
        assert response.status_code == 200
        data = response.json()
        return data.get("access_token") or data.get("token")

    @pytest.fixture(scope="class")
    def headers(self, auth_token):
        """Get authenticated headers"""
        return {
            "Authorization": f"Bearer {auth_token}",
            "Content-Type": "application/json"
        }

    def test_get_claim_by_id(self, headers):
        """Test getting claim by UUID"""
        # Create a claim first
        payload = {
            "entries": [{
                "expense_date_from": "2026-03-09",
                "expense_date_to": "2026-03-09",
                "category": "food",
                "description": f"TEST_Get_by_id_{uuid.uuid4().hex[:8]}",
                "amount": 1000
            }],
            "declaration_accepted": True
        }
        create_response = requests.post(f"{BASE_URL}/api/expense/claims", headers=headers, json=payload)
        assert create_response.status_code == 200
        claim = create_response.json()
        
        # Get by UUID
        response = requests.get(f"{BASE_URL}/api/expense/claims/{claim['id']}", headers=headers)
        assert response.status_code == 200
        data = response.json()
        assert data["id"] == claim["id"]
        assert data["claim_id"] == claim["claim_id"]
        print(f"Retrieved claim by UUID: {data['claim_id']}")

    def test_get_claim_by_sevrc_id(self, headers):
        """Test getting claim by SEVRC ID"""
        # Create a claim first
        payload = {
            "entries": [{
                "expense_date_from": "2026-03-09",
                "expense_date_to": "2026-03-09",
                "category": "accommodation",
                "description": f"TEST_Get_by_sevrc_{uuid.uuid4().hex[:8]}",
                "amount": 6000
            }],
            "declaration_accepted": True
        }
        create_response = requests.post(f"{BASE_URL}/api/expense/claims", headers=headers, json=payload)
        assert create_response.status_code == 200
        claim = create_response.json()
        
        # Get by SEVRC ID
        response = requests.get(f"{BASE_URL}/api/expense/claims/{claim['claim_id']}", headers=headers)
        assert response.status_code == 200
        data = response.json()
        assert data["claim_id"] == claim["claim_id"]
        print(f"Retrieved claim by SEVRC ID: {data['claim_id']}")

    def test_get_nonexistent_claim_404(self, headers):
        """Test getting non-existent claim returns 404"""
        response = requests.get(f"{BASE_URL}/api/expense/claims/nonexistent-id", headers=headers)
        assert response.status_code == 404
        print("Correctly returned 404 for non-existent claim")


class TestStatisticsUpdates:
    """Tests to verify statistics update correctly after claim actions"""

    @pytest.fixture(scope="class")
    def auth_token(self):
        """Get authentication token"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": SUPER_ADMIN_EMAIL, "password": SUPER_ADMIN_PASSWORD}
        )
        assert response.status_code == 200
        data = response.json()
        return data.get("access_token") or data.get("token")

    @pytest.fixture(scope="class")
    def headers(self, auth_token):
        """Get authenticated headers"""
        return {
            "Authorization": f"Bearer {auth_token}",
            "Content-Type": "application/json"
        }

    def test_stats_update_after_submission(self, headers):
        """Test statistics update after claim submission"""
        # Get initial stats
        stats_before = requests.get(f"{BASE_URL}/api/expense/claims/my/stats", headers=headers).json()
        
        # Submit a claim
        payload = {
            "entries": [{
                "expense_date_from": "2026-03-09",
                "expense_date_to": "2026-03-09",
                "category": "travel",
                "description": f"TEST_Stats_check_{uuid.uuid4().hex[:8]}",
                "amount": 1234.56
            }],
            "declaration_accepted": True
        }
        submit_response = requests.post(f"{BASE_URL}/api/expense/claims", headers=headers, json=payload)
        assert submit_response.status_code == 200
        
        # Get updated stats
        stats_after = requests.get(f"{BASE_URL}/api/expense/claims/my/stats", headers=headers).json()
        
        assert stats_after["total_claims"] == stats_before["total_claims"] + 1
        assert stats_after["pending"] == stats_before["pending"] + 1
        assert stats_after["total_claimed"] >= stats_before["total_claimed"] + 1234.56
        print(f"Stats updated correctly: Total claims {stats_before['total_claims']} -> {stats_after['total_claims']}")

    def test_hr_stats_update_after_approval(self, headers):
        """Test HR statistics update after approval"""
        # Get initial HR stats
        hr_stats_before = requests.get(f"{BASE_URL}/api/expense/claims/stats", headers=headers).json()
        
        # Create and approve a claim
        payload = {
            "entries": [{
                "expense_date_from": "2026-03-09",
                "expense_date_to": "2026-03-09",
                "category": "food",
                "description": f"TEST_HR_stats_check_{uuid.uuid4().hex[:8]}",
                "amount": 500
            }],
            "declaration_accepted": True
        }
        create_response = requests.post(f"{BASE_URL}/api/expense/claims", headers=headers, json=payload)
        assert create_response.status_code == 200
        claim_id = create_response.json()["id"]
        
        # Approve the claim
        approve_response = requests.put(f"{BASE_URL}/api/expense/claims/{claim_id}/approve", headers=headers)
        assert approve_response.status_code == 200
        
        # Get updated HR stats
        hr_stats_after = requests.get(f"{BASE_URL}/api/expense/claims/stats", headers=headers).json()
        
        assert hr_stats_after["approved"] == hr_stats_before["approved"] + 1
        print(f"HR stats updated: Approved {hr_stats_before['approved']} -> {hr_stats_after['approved']}")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
