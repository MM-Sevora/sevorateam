"""
VMS Phase 2 API Tests
Testing: Proposal Management, Approval Workflows, Recurring Work, PO/Invoice tracking, Advance/Upfront Payments

Test Flow:
1. Create vendor(s) for testing
2. Create work request (requirement)
3. Add proposals from multiple vendors
4. Get proposals comparison
5. Select proposal
6. Submit for approval
7. Approval workflow (approve at each level)
8. Create work order
9. Work order payments (advance, partial, milestone, final)
10. Recurring work schedules
11. PO/Invoice records
"""

import pytest
import requests
import os
from datetime import datetime, timedelta
from pathlib import Path
from dotenv import load_dotenv

# Load environment from frontend .env
frontend_env = Path(__file__).parent.parent.parent / 'frontend' / '.env'
load_dotenv(frontend_env)

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://sevora-hub.preview.emergentagent.com').rstrip('/')


class TestVMSPhase2:
    """VMS Phase 2 - Proposal, Approval, Payments, Recurring, PO/Invoice APIs"""
    
    # Shared test data stored as class variables
    auth_token = None
    vendor_1_id = None
    vendor_2_id = None
    vendor_3_id = None
    requirement_id = None
    proposal_1_id = None
    proposal_2_id = None
    proposal_3_id = None
    approval_id = None
    work_order_id = None
    payment_id = None
    recurring_id = None
    po_invoice_id = None
    
    @pytest.fixture(autouse=True)
    def setup(self, api_client):
        """Setup auth token before each test"""
        if not TestVMSPhase2.auth_token:
            response = api_client.post(f"{BASE_URL}/api/auth/login", json={
                "email": "superadmin@sevora.com",
                "password": "superadmin123"
            })
            if response.status_code == 200:
                TestVMSPhase2.auth_token = response.json().get("access_token")
            else:
                pytest.skip(f"Authentication failed: {response.status_code} - {response.text}")
        
        api_client.headers.update({"Authorization": f"Bearer {TestVMSPhase2.auth_token}"})
    
    # ============== PHASE 1: SETUP VENDORS AND REQUIREMENT ==============
    
    def test_01_create_vendor_1(self, api_client):
        """Create first vendor for proposals"""
        response = api_client.post(f"{BASE_URL}/api/vendors", json={
            "name": "TEST_VMS_Vendor_Alpha",
            "category": "Technology",
            "services": ["Web Development", "Mobile Apps"],
            "contact_person": "John Alpha",
            "phone": "+91 9876543210",
            "email": "alpha@testvms.com",
            "address": "Mumbai, India"
        })
        
        assert response.status_code == 200, f"Failed to create vendor: {response.text}"
        data = response.json()
        assert data.get("name") == "TEST_VMS_Vendor_Alpha"
        assert "id" in data
        TestVMSPhase2.vendor_1_id = data["id"]
        print(f"Created Vendor 1: {data['vendor_id']} - {data['name']}")
    
    def test_02_create_vendor_2(self, api_client):
        """Create second vendor for proposals"""
        response = api_client.post(f"{BASE_URL}/api/vendors", json={
            "name": "TEST_VMS_Vendor_Beta",
            "category": "Technology",
            "services": ["Web Development", "Cloud Services"],
            "contact_person": "Jane Beta",
            "phone": "+91 9876543211",
            "email": "beta@testvms.com",
            "address": "Bangalore, India"
        })
        
        assert response.status_code == 200, f"Failed to create vendor: {response.text}"
        data = response.json()
        TestVMSPhase2.vendor_2_id = data["id"]
        print(f"Created Vendor 2: {data['vendor_id']} - {data['name']}")
    
    def test_03_create_vendor_3(self, api_client):
        """Create third vendor for proposals"""
        response = api_client.post(f"{BASE_URL}/api/vendors", json={
            "name": "TEST_VMS_Vendor_Gamma",
            "category": "Technology",
            "services": ["Full Stack Development", "DevOps"],
            "contact_person": "Alex Gamma",
            "phone": "+91 9876543212",
            "email": "gamma@testvms.com",
            "address": "Delhi, India"
        })
        
        assert response.status_code == 200, f"Failed to create vendor: {response.text}"
        data = response.json()
        TestVMSPhase2.vendor_3_id = data["id"]
        print(f"Created Vendor 3: {data['vendor_id']} - {data['name']}")
    
    def test_04_create_work_request(self, api_client):
        """Create work request (requirement) for proposal testing"""
        response = api_client.post(f"{BASE_URL}/api/vendors/requirements", json={
            "title": "TEST_Website Redesign Project",
            "description": "Complete redesign of company website with modern UI/UX",
            "department": "Marketing",
            "expected_completion_date": (datetime.now() + timedelta(days=60)).isoformat()
        })
        
        assert response.status_code == 200, f"Failed to create requirement: {response.text}"
        data = response.json()
        assert data.get("title") == "TEST_Website Redesign Project"
        assert data.get("status") == "draft"
        assert "id" in data
        TestVMSPhase2.requirement_id = data["id"]
        print(f"Created Requirement: {data['requirement_id']} - {data['title']}")
    
    # ============== PROPOSAL MANAGEMENT ==============
    
    def test_05_add_proposal_from_vendor_1(self, api_client):
        """POST /api/vendors/requirements/{requirement_id}/proposals - Add proposal from Vendor 1"""
        assert TestVMSPhase2.requirement_id, "Requirement ID not set"
        assert TestVMSPhase2.vendor_1_id, "Vendor 1 ID not set"
        
        response = api_client.post(
            f"{BASE_URL}/api/vendors/requirements/{TestVMSPhase2.requirement_id}/proposals",
            json={
                "requirement_id": TestVMSPhase2.requirement_id,
                "vendor_id": TestVMSPhase2.vendor_1_id,
                "amount": 150000.00,
                "currency": "INR",
                "delivery_days": 45,
                "notes": "Includes 3 design iterations and 1 month support"
            }
        )
        
        assert response.status_code == 200, f"Failed to add proposal: {response.text}"
        data = response.json()
        assert data.get("vendor_id") == TestVMSPhase2.vendor_1_id
        assert data.get("amount") == 150000.00
        assert data.get("status") == "submitted"
        assert "id" in data
        TestVMSPhase2.proposal_1_id = data["id"]
        print(f"Added Proposal 1 from Vendor Alpha: INR {data['amount']}")
    
    def test_06_add_proposal_from_vendor_2(self, api_client):
        """POST /api/vendors/requirements/{requirement_id}/proposals - Add proposal from Vendor 2"""
        response = api_client.post(
            f"{BASE_URL}/api/vendors/requirements/{TestVMSPhase2.requirement_id}/proposals",
            json={
                "requirement_id": TestVMSPhase2.requirement_id,
                "vendor_id": TestVMSPhase2.vendor_2_id,
                "amount": 125000.00,
                "currency": "INR",
                "delivery_days": 60,
                "notes": "Competitive pricing with extended timeline"
            }
        )
        
        assert response.status_code == 200, f"Failed to add proposal: {response.text}"
        data = response.json()
        assert data.get("amount") == 125000.00
        TestVMSPhase2.proposal_2_id = data["id"]
        print(f"Added Proposal 2 from Vendor Beta: INR {data['amount']}")
    
    def test_07_add_proposal_from_vendor_3(self, api_client):
        """POST /api/vendors/requirements/{requirement_id}/proposals - Add proposal from Vendor 3"""
        response = api_client.post(
            f"{BASE_URL}/api/vendors/requirements/{TestVMSPhase2.requirement_id}/proposals",
            json={
                "requirement_id": TestVMSPhase2.requirement_id,
                "vendor_id": TestVMSPhase2.vendor_3_id,
                "amount": 175000.00,
                "currency": "INR",
                "delivery_days": 30,
                "notes": "Premium service with fastest delivery"
            }
        )
        
        assert response.status_code == 200, f"Failed to add proposal: {response.text}"
        data = response.json()
        assert data.get("amount") == 175000.00
        TestVMSPhase2.proposal_3_id = data["id"]
        print(f"Added Proposal 3 from Vendor Gamma: INR {data['amount']}")
    
    def test_08_get_proposals_comparison(self, api_client):
        """GET /api/vendors/requirements/{requirement_id}/proposals - Get proposals with comparison view"""
        response = api_client.get(
            f"{BASE_URL}/api/vendors/requirements/{TestVMSPhase2.requirement_id}/proposals"
        )
        
        assert response.status_code == 200, f"Failed to get proposals: {response.text}"
        data = response.json()
        
        # Verify comparison view data
        assert "proposals" in data
        assert "lowest_amount" in data
        assert "highest_amount" in data
        assert "proposal_count" in data
        assert "requirement" in data
        
        assert data["proposal_count"] == 3
        assert data["lowest_amount"] == 125000.00  # Vendor Beta
        assert data["highest_amount"] == 175000.00  # Vendor Gamma
        
        # Verify proposals are sorted by amount
        proposals = data["proposals"]
        assert len(proposals) == 3
        assert proposals[0]["amount"] == 125000.00  # Lowest first
        assert proposals[2]["amount"] == 175000.00  # Highest last
        
        print(f"Proposal Comparison: {data['proposal_count']} proposals")
        print(f"  Lowest: INR {data['lowest_amount']}, Highest: INR {data['highest_amount']}")
    
    def test_09_select_proposal(self, api_client):
        """POST /api/vendors/requirements/{requirement_id}/proposals/{proposal_id}/select - Select a proposal"""
        # Select the middle-priced proposal (Vendor Alpha - 150000)
        response = api_client.post(
            f"{BASE_URL}/api/vendors/requirements/{TestVMSPhase2.requirement_id}/proposals/{TestVMSPhase2.proposal_1_id}/select"
        )
        
        assert response.status_code == 200, f"Failed to select proposal: {response.text}"
        data = response.json()
        assert "message" in data
        assert data.get("vendor") == "TEST_VMS_Vendor_Alpha"
        print(f"Selected Proposal: {data['vendor']}")
        
        # Verify requirement status changed
        req_response = api_client.get(
            f"{BASE_URL}/api/vendors/requirements/{TestVMSPhase2.requirement_id}"
        )
        req_data = req_response.json()
        assert req_data.get("status") == "vendor_selected"
        assert req_data.get("selected_vendor_id") == TestVMSPhase2.vendor_1_id
    
    # ============== APPROVAL WORKFLOW ==============
    
    def test_10_submit_for_approval(self, api_client):
        """POST /api/vendors/requirements/{requirement_id}/submit-for-approval - Submit for approval workflow"""
        response = api_client.post(
            f"{BASE_URL}/api/vendors/requirements/{TestVMSPhase2.requirement_id}/submit-for-approval"
        )
        
        assert response.status_code == 200, f"Failed to submit for approval: {response.text}"
        data = response.json()
        
        # Verify approval structure
        assert "id" in data
        assert data.get("entity_type") == "requirement"
        assert data.get("overall_status") == "pending"
        assert data.get("current_level") == "team_lead"
        
        # Verify 3-level approval hierarchy
        levels = data.get("levels", [])
        assert len(levels) == 3
        assert levels[0]["level"] == "team_lead"
        assert levels[1]["level"] == "manager"
        assert levels[2]["level"] == "finance"
        
        TestVMSPhase2.approval_id = data["id"]
        print(f"Submitted for Approval: {data['id']}, Current Level: {data['current_level']}")
    
    def test_11_get_pending_approvals(self, api_client):
        """GET /api/vendors/approvals/pending - Get pending approvals"""
        response = api_client.get(f"{BASE_URL}/api/vendors/approvals/pending")
        
        assert response.status_code == 200, f"Failed to get pending approvals: {response.text}"
        data = response.json()
        
        assert "approvals" in data
        approvals = data["approvals"]
        assert len(approvals) >= 1
        
        # Find our approval
        our_approval = next((a for a in approvals if a["id"] == TestVMSPhase2.approval_id), None)
        assert our_approval is not None, "Our approval not found in pending list"
        assert our_approval["overall_status"] == "pending"
        
        print(f"Pending Approvals: {len(approvals)}")
    
    def test_12_approve_team_lead_level(self, api_client):
        """POST /api/vendors/approvals/{approval_id}/action - Approve at team lead level"""
        response = api_client.post(
            f"{BASE_URL}/api/vendors/approvals/{TestVMSPhase2.approval_id}/action",
            json={
                "action": "approve",
                "comments": "Approved at team lead level - Good vendor selection"
            }
        )
        
        assert response.status_code == 200, f"Failed to approve: {response.text}"
        data = response.json()
        assert "message" in data
        assert "team_lead" in data["message"]
        print(f"Team Lead Approval: {data['message']}")
    
    def test_13_approve_manager_level(self, api_client):
        """POST /api/vendors/approvals/{approval_id}/action - Approve at manager level"""
        response = api_client.post(
            f"{BASE_URL}/api/vendors/approvals/{TestVMSPhase2.approval_id}/action",
            json={
                "action": "approve",
                "comments": "Manager approved - Budget is within limits"
            }
        )
        
        assert response.status_code == 200, f"Failed to approve: {response.text}"
        data = response.json()
        assert "manager" in data["message"]
        print(f"Manager Approval: {data['message']}")
    
    def test_14_approve_finance_level(self, api_client):
        """POST /api/vendors/approvals/{approval_id}/action - Approve at finance level (final)"""
        response = api_client.post(
            f"{BASE_URL}/api/vendors/approvals/{TestVMSPhase2.approval_id}/action",
            json={
                "action": "approve",
                "comments": "Finance approved - Ready to proceed"
            }
        )
        
        assert response.status_code == 200, f"Failed to approve: {response.text}"
        data = response.json()
        assert "finance" in data["message"]
        print(f"Finance Approval: {data['message']}")
        
        # Verify approval is now complete
        pending_response = api_client.get(f"{BASE_URL}/api/vendors/approvals/pending")
        pending_data = pending_response.json()
        our_approval = next((a for a in pending_data["approvals"] if a["id"] == TestVMSPhase2.approval_id), None)
        # Should no longer be in pending list (it's approved)
        assert our_approval is None, "Approval should not be in pending list after full approval"
    
    # ============== WORK ORDER AND PAYMENTS ==============
    
    def test_15_create_work_order(self, api_client):
        """Create work order for payment testing"""
        response = api_client.post(f"{BASE_URL}/api/vendors/work-orders", json={
            "vendor_id": TestVMSPhase2.vendor_1_id,
            "requirement_id": TestVMSPhase2.requirement_id,
            "department": "Marketing",
            "work_description": "TEST_Website Redesign - Implementation Phase",
            "start_date": datetime.now().isoformat(),
            "expected_completion_date": (datetime.now() + timedelta(days=45)).isoformat()
        })
        
        assert response.status_code == 200, f"Failed to create work order: {response.text}"
        data = response.json()
        assert "id" in data
        TestVMSPhase2.work_order_id = data["id"]
        print(f"Created Work Order: {data['work_order_id']}")
    
    def test_16_create_advance_payment(self, api_client):
        """POST /api/vendors/work-orders/{order_id}/payments - Create advance payment"""
        response = api_client.post(
            f"{BASE_URL}/api/vendors/work-orders/{TestVMSPhase2.work_order_id}/payments",
            json={
                "amount": 45000.00,
                "payment_type": "advance",
                "description": "30% advance payment before work starts"
            }
        )
        
        assert response.status_code == 200, f"Failed to create payment: {response.text}"
        data = response.json()
        assert "payment_request" in data
        payment = data["payment_request"]
        assert payment["payment_type"] == "advance"
        assert payment["amount"] == 45000.00
        assert "Advance Payment" in payment["title"]
        TestVMSPhase2.payment_id = payment["id"]
        print(f"Created Advance Payment: INR {payment['amount']}")
    
    def test_17_create_milestone_payment(self, api_client):
        """POST /api/vendors/work-orders/{order_id}/payments - Create milestone payment"""
        response = api_client.post(
            f"{BASE_URL}/api/vendors/work-orders/{TestVMSPhase2.work_order_id}/payments",
            json={
                "amount": 52500.00,
                "payment_type": "milestone",
                "description": "35% milestone payment - Design phase complete"
            }
        )
        
        assert response.status_code == 200, f"Failed to create payment: {response.text}"
        data = response.json()
        payment = data["payment_request"]
        assert payment["payment_type"] == "milestone"
        print(f"Created Milestone Payment: INR {payment['amount']}")
    
    def test_18_create_final_payment(self, api_client):
        """POST /api/vendors/work-orders/{order_id}/payments - Create final payment"""
        response = api_client.post(
            f"{BASE_URL}/api/vendors/work-orders/{TestVMSPhase2.work_order_id}/payments",
            json={
                "amount": 52500.00,
                "payment_type": "final",
                "description": "35% final payment - Project complete",
                "invoice_number": "INV-TEST-001",
                "po_number": "PO-TEST-001"
            }
        )
        
        assert response.status_code == 200, f"Failed to create payment: {response.text}"
        data = response.json()
        payment = data["payment_request"]
        assert payment["payment_type"] == "final"
        assert payment["invoice_number"] == "INV-TEST-001"
        print(f"Created Final Payment: INR {payment['amount']}")
    
    def test_19_get_work_order_payments(self, api_client):
        """GET /api/vendors/work-orders/{order_id}/payments - Get work order payments"""
        response = api_client.get(
            f"{BASE_URL}/api/vendors/work-orders/{TestVMSPhase2.work_order_id}/payments"
        )
        
        assert response.status_code == 200, f"Failed to get payments: {response.text}"
        data = response.json()
        
        assert "payments" in data
        assert "summary" in data
        
        payments = data["payments"]
        summary = data["summary"]
        
        assert len(payments) == 3  # advance, milestone, final
        assert summary["total_requested"] == 150000.00  # 45000 + 52500 + 52500
        
        print(f"Work Order Payments: {len(payments)} payments")
        print(f"  Total Requested: INR {summary['total_requested']}")
        print(f"  Total Paid: INR {summary['total_paid']}")
        print(f"  Pending: INR {summary['pending']}")
    
    # ============== RECURRING WORK ==============
    
    def test_20_create_recurring_work(self, api_client):
        """POST /api/vendors/recurring - Create recurring work schedule"""
        response = api_client.post(f"{BASE_URL}/api/vendors/recurring", json={
            "name": "TEST_Monthly Website Maintenance",
            "vendor_id": TestVMSPhase2.vendor_1_id,
            "department": "Technology",
            "description": "Monthly website maintenance, backups, and security updates",
            "frequency": "monthly",
            "start_date": datetime.now().isoformat(),
            "estimated_amount": 15000.00
        })
        
        assert response.status_code == 200, f"Failed to create recurring: {response.text}"
        data = response.json()
        
        assert data.get("name") == "TEST_Monthly Website Maintenance"
        assert data.get("frequency") == "monthly"
        assert data.get("estimated_amount") == 15000.00
        assert "next_due_date" in data
        assert "id" in data
        
        TestVMSPhase2.recurring_id = data["id"]
        print(f"Created Recurring Work: {data['name']} ({data['frequency']})")
    
    def test_21_list_recurring_work(self, api_client):
        """GET /api/vendors/recurring - List recurring work"""
        response = api_client.get(f"{BASE_URL}/api/vendors/recurring")
        
        assert response.status_code == 200, f"Failed to list recurring: {response.text}"
        data = response.json()
        
        assert "recurring_work" in data
        recurring_list = data["recurring_work"]
        
        # Find our recurring work
        our_recurring = next((r for r in recurring_list if r["id"] == TestVMSPhase2.recurring_id), None)
        assert our_recurring is not None, "Our recurring work not found"
        
        # Verify enriched fields
        assert "days_until_due" in our_recurring
        assert "is_overdue" in our_recurring
        assert "is_due_soon" in our_recurring
        
        print(f"Recurring Work List: {len(recurring_list)} items")
    
    def test_22_create_work_order_from_recurring(self, api_client):
        """POST /api/vendors/recurring/{recurring_id}/create-work-order - Create work order from recurring"""
        response = api_client.post(
            f"{BASE_URL}/api/vendors/recurring/{TestVMSPhase2.recurring_id}/create-work-order"
        )
        
        assert response.status_code == 200, f"Failed to create WO from recurring: {response.text}"
        data = response.json()
        
        assert "work_order" in data
        work_order = data["work_order"]
        assert work_order.get("recurring_id") == TestVMSPhase2.recurring_id
        assert work_order.get("vendor_id") == TestVMSPhase2.vendor_1_id
        
        print(f"Created Work Order from Recurring: {work_order['work_order_id']}")
        
        # Verify recurring was updated with new next_due_date
        recurring_response = api_client.get(f"{BASE_URL}/api/vendors/recurring")
        recurring_data = recurring_response.json()
        our_recurring = next((r for r in recurring_data["recurring_work"] if r["id"] == TestVMSPhase2.recurring_id), None)
        assert len(our_recurring.get("work_orders_created", [])) >= 1
    
    # ============== PO/INVOICE TRACKING ==============
    
    def test_23_create_po_invoice_record(self, api_client):
        """POST /api/vendors/po-invoices - Create PO/Invoice record"""
        response = api_client.post(f"{BASE_URL}/api/vendors/po-invoices", json={
            "work_order_id": TestVMSPhase2.work_order_id,
            "po_number": "PO-2026-TEST-001",
            "invoice_number": "INV-2026-TEST-001",
            "invoice_date": datetime.now().isoformat(),
            "amount": 150000.00,
            "notes": "Website redesign project - full invoice"
        })
        
        assert response.status_code == 200, f"Failed to create PO/Invoice: {response.text}"
        data = response.json()
        
        assert data.get("po_number") == "PO-2026-TEST-001"
        assert data.get("invoice_number") == "INV-2026-TEST-001"
        assert data.get("amount") == 150000.00
        assert "id" in data
        
        TestVMSPhase2.po_invoice_id = data["id"]
        print(f"Created PO/Invoice: PO={data['po_number']}, INV={data['invoice_number']}")
    
    def test_24_list_po_invoices(self, api_client):
        """GET /api/vendors/po-invoices - List PO/Invoice records"""
        response = api_client.get(f"{BASE_URL}/api/vendors/po-invoices")
        
        assert response.status_code == 200, f"Failed to list PO/Invoices: {response.text}"
        data = response.json()
        
        assert "records" in data
        assert "total" in data
        
        records = data["records"]
        our_record = next((r for r in records if r["id"] == TestVMSPhase2.po_invoice_id), None)
        assert our_record is not None, "Our PO/Invoice not found"
        
        print(f"PO/Invoice Records: {data['total']} total")
    
    def test_25_filter_po_invoices_by_work_order(self, api_client):
        """GET /api/vendors/po-invoices - Filter by work_order_id"""
        response = api_client.get(
            f"{BASE_URL}/api/vendors/po-invoices",
            params={"work_order_id": TestVMSPhase2.work_order_id}
        )
        
        assert response.status_code == 200, f"Failed to filter PO/Invoices: {response.text}"
        data = response.json()
        
        # All returned records should be for our work order
        for record in data["records"]:
            assert record["work_order_id"] == TestVMSPhase2.work_order_id
        
        print(f"Filtered PO/Invoices for Work Order: {len(data['records'])} records")
    
    # ============== EDGE CASES AND ERROR HANDLING ==============
    
    def test_26_submit_without_vendor_selection(self, api_client):
        """Test error when submitting for approval without selecting vendor"""
        # Create a new requirement without selecting vendor
        req_response = api_client.post(f"{BASE_URL}/api/vendors/requirements", json={
            "title": "TEST_Unselected Requirement",
            "description": "This requirement has no vendor selected",
            "department": "Sales"
        })
        new_req_id = req_response.json()["id"]
        
        # Try to submit without selecting vendor
        response = api_client.post(
            f"{BASE_URL}/api/vendors/requirements/{new_req_id}/submit-for-approval"
        )
        
        assert response.status_code == 400, f"Should fail without vendor selection: {response.text}"
        assert "select a vendor" in response.json()["detail"].lower()
        print("Correctly rejected submit without vendor selection")
    
    def test_27_add_proposal_to_nonexistent_requirement(self, api_client):
        """Test error when adding proposal to non-existent requirement"""
        response = api_client.post(
            f"{BASE_URL}/api/vendors/requirements/nonexistent-id/proposals",
            json={
                "requirement_id": "nonexistent-id",
                "vendor_id": TestVMSPhase2.vendor_1_id,
                "amount": 100000.00
            }
        )
        
        assert response.status_code == 404, f"Should return 404: {response.text}"
        print("Correctly returned 404 for non-existent requirement")
    
    def test_28_approval_rejection_flow(self, api_client):
        """Test approval rejection workflow"""
        # Create requirement and go through proposal flow
        req_response = api_client.post(f"{BASE_URL}/api/vendors/requirements", json={
            "title": "TEST_Rejection Flow Test",
            "description": "Testing rejection workflow",
            "department": "Finance"
        })
        req_id = req_response.json()["id"]
        
        # Add proposal
        prop_response = api_client.post(
            f"{BASE_URL}/api/vendors/requirements/{req_id}/proposals",
            json={
                "requirement_id": req_id,
                "vendor_id": TestVMSPhase2.vendor_1_id,
                "amount": 500000.00  # High amount
            }
        )
        prop_id = prop_response.json()["id"]
        
        # Select proposal
        api_client.post(f"{BASE_URL}/api/vendors/requirements/{req_id}/proposals/{prop_id}/select")
        
        # Submit for approval
        approval_response = api_client.post(f"{BASE_URL}/api/vendors/requirements/{req_id}/submit-for-approval")
        approval_id = approval_response.json()["id"]
        
        # Reject at team lead level
        reject_response = api_client.post(
            f"{BASE_URL}/api/vendors/approvals/{approval_id}/action",
            json={
                "action": "reject",
                "comments": "Budget too high - please renegotiate"
            }
        )
        
        assert reject_response.status_code == 200
        assert "reject" in reject_response.json()["message"].lower()
        print("Rejection workflow completed successfully")


@pytest.fixture
def api_client():
    """Shared requests session"""
    session = requests.Session()
    session.headers.update({"Content-Type": "application/json"})
    return session
