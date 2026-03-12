"""
Test VMS Work Request Workflow:
- Create Work Request (no vendor)
- Add Proposals with vendor selection
- Select a proposal (sets vendor)
- Submit for approval
- Convert to Work Order
"""

import pytest
import requests
import os
import uuid

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

@pytest.fixture(scope="module")
def auth_token():
    """Get authentication token"""
    response = requests.post(f"{BASE_URL}/api/auth/login", json={
        "email": "superadmin@sevora.com",
        "password": "superadmin123"
    })
    assert response.status_code == 200, f"Login failed: {response.text}"
    return response.json().get("access_token")


@pytest.fixture(scope="module")
def api_client(auth_token):
    """Create authenticated API client"""
    session = requests.Session()
    session.headers.update({
        "Content-Type": "application/json",
        "Authorization": f"Bearer {auth_token}"
    })
    return session


@pytest.fixture(scope="module")
def test_vendor(api_client):
    """Get or create a test vendor for proposals"""
    # List existing vendors
    response = api_client.get(f"{BASE_URL}/api/vendors")
    assert response.status_code == 200
    vendors = response.json().get("vendors", [])
    
    # Find an active vendor
    active_vendor = next((v for v in vendors if v.get("status") == "active"), None)
    if active_vendor:
        return active_vendor
    
    # Create a new vendor if none exists
    vendor_data = {
        "name": f"TEST_Vendor_{uuid.uuid4().hex[:6]}",
        "category": "Packaging",
        "vendor_type": "vendor",
        "services": ["Packaging", "Printing"],
        "contact_person": "Test Contact",
        "phone": "+919876543210",
        "email": "test@vendor.com"
    }
    response = api_client.post(f"{BASE_URL}/api/vendors", json=vendor_data)
    assert response.status_code == 200
    return response.json()


class TestWorkRequestWorkflow:
    """Test the complete Work Request workflow"""
    
    # Store IDs across tests
    work_request_id = None
    proposal_id = None
    
    def test_01_create_work_request_without_vendor(self, api_client):
        """Step 1: Create a work request without vendor selection"""
        request_data = {
            "title": f"TEST_Work_Request_{uuid.uuid4().hex[:6]}",
            "description": "This is a test work request for workflow testing",
            "department": "Marketing",
            "expected_completion_date": "2026-02-15"
        }
        
        response = api_client.post(f"{BASE_URL}/api/vendors/requirements", json=request_data)
        assert response.status_code == 200, f"Create request failed: {response.text}"
        
        data = response.json()
        assert "id" in data
        assert data["title"] == request_data["title"]
        assert data["department"] == "Marketing"
        assert data["status"] == "draft"
        assert data.get("selected_vendor_id") is None  # No vendor at creation
        
        # Store for next tests
        TestWorkRequestWorkflow.work_request_id = data["id"]
        print(f"Created work request: {data['requirement_id']}")
    
    def test_02_add_proposal_with_vendor(self, api_client, test_vendor):
        """Step 2: Add a proposal from a vendor"""
        req_id = TestWorkRequestWorkflow.work_request_id
        assert req_id, "Work request ID not set from previous test"
        
        proposal_data = {
            "requirement_id": req_id,
            "vendor_id": test_vendor["id"],
            "amount": 50000,
            "currency": "INR",
            "delivery_days": 7,
            "notes": "Test proposal for workflow"
        }
        
        response = api_client.post(
            f"{BASE_URL}/api/vendors/requirements/{req_id}/proposals",
            json=proposal_data
        )
        assert response.status_code == 200, f"Add proposal failed: {response.text}"
        
        data = response.json()
        assert "id" in data
        assert data["vendor_id"] == test_vendor["id"]
        assert data["amount"] == 50000
        assert data["status"] == "submitted"
        
        TestWorkRequestWorkflow.proposal_id = data["id"]
        print(f"Added proposal from vendor: {test_vendor['name']}")
    
    def test_03_verify_proposals_endpoint(self, api_client):
        """Verify proposals are retrievable and comparison data available"""
        req_id = TestWorkRequestWorkflow.work_request_id
        
        response = api_client.get(f"{BASE_URL}/api/vendors/requirements/{req_id}/proposals")
        assert response.status_code == 200, f"Get proposals failed: {response.text}"
        
        data = response.json()
        assert "proposals" in data
        assert len(data["proposals"]) >= 1
        assert "lowest_amount" in data
        assert "highest_amount" in data
        assert "proposal_count" in data
        print(f"Proposal count: {data['proposal_count']}, Lowest: {data['lowest_amount']}")
    
    def test_04_select_proposal_sets_vendor(self, api_client, test_vendor):
        """Step 3: Select a proposal (this sets the vendor)"""
        req_id = TestWorkRequestWorkflow.work_request_id
        proposal_id = TestWorkRequestWorkflow.proposal_id
        
        response = api_client.post(
            f"{BASE_URL}/api/vendors/requirements/{req_id}/proposals/{proposal_id}/select"
        )
        assert response.status_code == 200, f"Select proposal failed: {response.text}"
        
        # Verify vendor is now selected on the request
        verify_response = api_client.get(f"{BASE_URL}/api/vendors/requirements/{req_id}")
        assert verify_response.status_code == 200
        req_data = verify_response.json()
        
        assert req_data["selected_vendor_id"] == test_vendor["id"]
        assert req_data["status"] == "vendor_selected"
        print(f"Proposal selected, vendor set to: {test_vendor['name']}")
    
    def test_05_submit_for_approval(self, api_client):
        """Step 4: Submit the request for approval"""
        req_id = TestWorkRequestWorkflow.work_request_id
        
        response = api_client.post(f"{BASE_URL}/api/vendors/requirements/{req_id}/submit-for-approval")
        assert response.status_code == 200, f"Submit for approval failed: {response.text}"
        
        data = response.json()
        assert "id" in data  # Approval record created
        assert data["entity_type"] == "requirement"
        assert data["overall_status"] == "pending"
        
        # Verify approval status on request
        verify_response = api_client.get(f"{BASE_URL}/api/vendors/requirements/{req_id}")
        req_data = verify_response.json()
        assert req_data["approval_status"] == "pending"
        print("Request submitted for approval")
    
    def test_06_approve_request(self, api_client):
        """Approve the request through all levels (fast-track for testing)"""
        req_id = TestWorkRequestWorkflow.work_request_id
        
        # Get the approval ID
        verify_response = api_client.get(f"{BASE_URL}/api/vendors/requirements/{req_id}")
        approval_id = verify_response.json().get("approval_id")
        assert approval_id, "Approval ID not found"
        
        # Approve at all levels - approval progresses automatically to next level
        for level in ["team_lead", "manager", "finance"]:
            response = api_client.post(
                f"{BASE_URL}/api/vendors/approvals/{approval_id}/action",
                json={"action": "approve", "comments": f"Approved at {level}"}
            )
            # May get 400 if already past that level
            if response.status_code == 400:
                continue
            assert response.status_code == 200, f"Approval at {level} failed: {response.text}"
        
        # Verify approval completed
        verify_response = api_client.get(f"{BASE_URL}/api/vendors/requirements/{req_id}")
        req_data = verify_response.json()
        assert req_data["approval_status"] == "approved"
        print("Request fully approved")
    
    def test_07_convert_to_work_order(self, api_client):
        """Step 5: Convert approved request to work order"""
        req_id = TestWorkRequestWorkflow.work_request_id
        
        response = api_client.post(f"{BASE_URL}/api/vendors/requirements/{req_id}/convert-to-order")
        assert response.status_code == 200, f"Convert to order failed: {response.text}"
        
        data = response.json()
        assert "work_order" in data
        work_order = data["work_order"]
        
        assert "work_order_id" in work_order
        assert work_order["requirement_id"] == req_id
        assert work_order["status"] == "assigned"
        assert work_order.get("agreed_amount") is not None  # From proposal
        
        print(f"Work order created: {work_order['work_order_id']}")
        
        # Verify work order ID linked to request
        verify_response = api_client.get(f"{BASE_URL}/api/vendors/requirements/{req_id}")
        req_data = verify_response.json()
        assert req_data["work_order_id"] == work_order["id"]
        assert req_data["status"] == "work_in_progress"
    
    def test_08_cannot_convert_again(self, api_client):
        """Verify cannot convert same request twice"""
        req_id = TestWorkRequestWorkflow.work_request_id
        
        response = api_client.post(f"{BASE_URL}/api/vendors/requirements/{req_id}/convert-to-order")
        assert response.status_code == 400
        assert "already converted" in response.json().get("detail", "").lower()
        print("Correctly prevented duplicate conversion")


class TestConvertToOrderValidation:
    """Test validation rules for convert-to-order endpoint"""
    
    def test_cannot_convert_without_vendor(self, api_client):
        """Cannot convert if no vendor selected"""
        # Create a request without selecting vendor
        request_data = {
            "title": f"TEST_NoVendor_{uuid.uuid4().hex[:6]}",
            "description": "Test request without vendor",
            "department": "Engineering"
        }
        
        response = api_client.post(f"{BASE_URL}/api/vendors/requirements", json=request_data)
        assert response.status_code == 200
        req_id = response.json()["id"]
        
        # Try to convert without vendor selection
        convert_response = api_client.post(f"{BASE_URL}/api/vendors/requirements/{req_id}/convert-to-order")
        assert convert_response.status_code == 400
        assert "approved" in convert_response.json().get("detail", "").lower() or \
               "vendor" in convert_response.json().get("detail", "").lower()
    
    def test_cannot_convert_unapproved_request(self, api_client, test_vendor):
        """Cannot convert if not approved"""
        # Create request
        request_data = {
            "title": f"TEST_Unapproved_{uuid.uuid4().hex[:6]}",
            "description": "Test unapproved request",
            "department": "Sales"
        }
        
        response = api_client.post(f"{BASE_URL}/api/vendors/requirements", json=request_data)
        assert response.status_code == 200
        req_id = response.json()["id"]
        
        # Add proposal
        proposal_data = {
            "requirement_id": req_id,
            "vendor_id": test_vendor["id"],
            "amount": 25000,
            "currency": "INR"
        }
        api_client.post(f"{BASE_URL}/api/vendors/requirements/{req_id}/proposals", json=proposal_data)
        
        # Get proposal ID and select it
        proposals_response = api_client.get(f"{BASE_URL}/api/vendors/requirements/{req_id}/proposals")
        proposal_id = proposals_response.json()["proposals"][0]["id"]
        api_client.post(f"{BASE_URL}/api/vendors/requirements/{req_id}/proposals/{proposal_id}/select")
        
        # Try to convert without approval
        convert_response = api_client.post(f"{BASE_URL}/api/vendors/requirements/{req_id}/convert-to-order")
        assert convert_response.status_code == 400
        assert "approved" in convert_response.json().get("detail", "").lower()


class TestListWorkRequests:
    """Test listing work requests endpoint"""
    
    def test_list_all_requests(self, api_client):
        """List all work requests"""
        response = api_client.get(f"{BASE_URL}/api/vendors/requirements")
        assert response.status_code == 200
        
        data = response.json()
        assert "requirements" in data
        assert "total" in data
        print(f"Total work requests: {data['total']}")
    
    def test_filter_by_status(self, api_client):
        """Filter requests by status"""
        response = api_client.get(f"{BASE_URL}/api/vendors/requirements", params={"status": "draft"})
        assert response.status_code == 200
        
        data = response.json()
        for req in data.get("requirements", []):
            assert req["status"] == "draft"
    
    def test_filter_by_department(self, api_client):
        """Filter requests by department"""
        response = api_client.get(f"{BASE_URL}/api/vendors/requirements", params={"department": "Marketing"})
        assert response.status_code == 200
        data = response.json()
        # All returned should be Marketing department
        for req in data.get("requirements", []):
            assert req["department"] == "Marketing"


class TestWorkOrdersEndpoint:
    """Test work orders listing and retrieval"""
    
    def test_list_work_orders(self, api_client):
        """List all work orders"""
        response = api_client.get(f"{BASE_URL}/api/vendors/work-orders")
        assert response.status_code == 200
        
        data = response.json()
        assert "work_orders" in data
        assert "total" in data
        print(f"Total work orders: {data['total']}")


# Cleanup fixture
@pytest.fixture(scope="module", autouse=True)
def cleanup(api_client):
    """Cleanup test data after all tests complete"""
    yield
    # Note: Test data prefixed with TEST_ for identification
    # Cleanup logic can be added here if needed
