"""
Marketing Budget Management API Tests
Tests: Budget CRUD, Budget Items, Expenses, Overview/Analytics
"""

import pytest
import requests
import os
import uuid
from datetime import date, timedelta

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')
BUDGET_API = f"{BASE_URL}/api/marketing/v3/budgets"

# Test data prefix for cleanup
TEST_PREFIX = "TEST_"


class TestBudgetOverview:
    """Test budget overview and analytics endpoints"""
    
    def test_get_budget_overview(self):
        """GET /api/marketing/v3/budgets/overview - Returns overview stats"""
        response = requests.get(f"{BUDGET_API}/overview")
        assert response.status_code == 200
        
        data = response.json()
        assert "total_budgets" in data
        assert "total_allocated" in data
        assert "total_spent" in data
        assert "total_remaining" in data
        assert "overall_utilization" in data
        assert "active_budgets" in data
        assert "overspent_budgets" in data
        print(f"✓ Overview: {data['total_budgets']} budgets, {data['overall_utilization']:.1f}% utilization")
    
    def test_get_budget_analytics(self):
        """GET /api/marketing/v3/budgets/analytics - Returns detailed analytics"""
        response = requests.get(f"{BUDGET_API}/analytics")
        assert response.status_code == 200
        
        data = response.json()
        assert "overview" in data
        assert "by_category" in data
        assert "top_expenses" in data
        assert "spending_trend" in data
        print(f"✓ Analytics: {len(data.get('by_category', []))} categories, {len(data.get('top_expenses', []))} top expenses")


class TestBudgetCRUD:
    """Test budget create, read, update, delete operations"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Store created budget IDs for cleanup"""
        self.created_budget_ids = []
        yield
        # Cleanup: Delete test budgets
        for budget_id in self.created_budget_ids:
            try:
                requests.delete(f"{BUDGET_API}/{budget_id}")
            except:
                pass
    
    def test_list_budgets(self):
        """GET /api/marketing/v3/budgets - Lists all budgets"""
        response = requests.get(BUDGET_API)
        assert response.status_code == 200
        
        data = response.json()
        assert isinstance(data, list)
        if len(data) > 0:
            budget = data[0]
            assert "id" in budget
            assert "name" in budget
            assert "period" in budget
            assert "total_budget" in budget
            assert "spent_amount" in budget
            assert "utilization_percentage" in budget
        print(f"✓ Listed {len(data)} budgets")
    
    def test_create_budget(self):
        """POST /api/marketing/v3/budgets - Creates new budget"""
        budget_data = {
            "name": f"{TEST_PREFIX}Q2 2026 Test Budget",
            "description": "Test budget for automated testing",
            "period": "quarterly",
            "fiscal_year": 2026,
            "quarter": 2,
            "start_date": "2026-04-01",
            "end_date": "2026-06-30",
            "total_budget": 1000000,
            "currency": "INR",
            "status": "draft"
        }
        
        response = requests.post(BUDGET_API, json=budget_data)
        assert response.status_code == 200
        
        data = response.json()
        assert data["name"] == budget_data["name"]
        assert data["total_budget"] == budget_data["total_budget"]
        assert data["period"] == "quarterly"
        assert data["status"] == "draft"
        assert "id" in data
        
        self.created_budget_ids.append(data["id"])
        print(f"✓ Created budget: {data['name']} (ID: {data['id'][:8]}...)")
        
        # Verify GET returns the created budget
        get_response = requests.get(f"{BUDGET_API}/{data['id']}")
        assert get_response.status_code == 200
        get_data = get_response.json()
        assert get_data["name"] == budget_data["name"]
        print(f"✓ Verified budget persisted via GET")
    
    def test_get_budget_by_id(self):
        """GET /api/marketing/v3/budgets/{id} - Returns specific budget"""
        # First create a budget
        budget_data = {
            "name": f"{TEST_PREFIX}Get Test Budget",
            "period": "monthly",
            "fiscal_year": 2026,
            "start_date": "2026-05-01",
            "end_date": "2026-05-31",
            "total_budget": 500000
        }
        
        create_response = requests.post(BUDGET_API, json=budget_data)
        assert create_response.status_code == 200
        budget_id = create_response.json()["id"]
        self.created_budget_ids.append(budget_id)
        
        # Now get the budget
        response = requests.get(f"{BUDGET_API}/{budget_id}")
        assert response.status_code == 200
        
        data = response.json()
        assert data["id"] == budget_id
        assert data["name"] == budget_data["name"]
        assert "allocated_amount" in data
        assert "spent_amount" in data
        assert "remaining_amount" in data
        print(f"✓ Retrieved budget by ID")
    
    def test_update_budget(self):
        """PUT /api/marketing/v3/budgets/{id} - Updates budget"""
        # Create budget
        budget_data = {
            "name": f"{TEST_PREFIX}Update Test Budget",
            "period": "yearly",
            "fiscal_year": 2026,
            "start_date": "2026-01-01",
            "end_date": "2026-12-31",
            "total_budget": 2000000
        }
        
        create_response = requests.post(BUDGET_API, json=budget_data)
        assert create_response.status_code == 200
        budget_id = create_response.json()["id"]
        self.created_budget_ids.append(budget_id)
        
        # Update budget
        update_data = {
            "name": f"{TEST_PREFIX}Updated Budget Name",
            "total_budget": 2500000,
            "notes": "Updated via test"
        }
        
        response = requests.put(f"{BUDGET_API}/{budget_id}", json=update_data)
        assert response.status_code == 200
        
        data = response.json()
        assert data["name"] == update_data["name"]
        assert data["total_budget"] == update_data["total_budget"]
        assert data["notes"] == "Updated via test"
        
        # Verify with GET
        get_response = requests.get(f"{BUDGET_API}/{budget_id}")
        assert get_response.json()["name"] == update_data["name"]
        print(f"✓ Budget updated and verified")
    
    def test_approve_budget(self):
        """POST /api/marketing/v3/budgets/{id}/approve - Approves draft budget"""
        # Create draft budget
        budget_data = {
            "name": f"{TEST_PREFIX}Approve Test Budget",
            "period": "quarterly",
            "fiscal_year": 2026,
            "start_date": "2026-07-01",
            "end_date": "2026-09-30",
            "total_budget": 750000,
            "status": "draft"
        }
        
        create_response = requests.post(BUDGET_API, json=budget_data)
        assert create_response.status_code == 200
        budget_id = create_response.json()["id"]
        self.created_budget_ids.append(budget_id)
        
        # Approve budget
        response = requests.post(f"{BUDGET_API}/{budget_id}/approve")
        assert response.status_code == 200
        
        data = response.json()
        assert data["message"] == "Budget approved"
        
        # Verify status changed
        get_response = requests.get(f"{BUDGET_API}/{budget_id}")
        assert get_response.json()["status"] == "approved"
        print(f"✓ Budget approved successfully")
    
    def test_activate_budget(self):
        """POST /api/marketing/v3/budgets/{id}/activate - Activates approved budget"""
        # Create and approve budget
        budget_data = {
            "name": f"{TEST_PREFIX}Activate Test Budget",
            "period": "monthly",
            "fiscal_year": 2026,
            "start_date": "2026-08-01",
            "end_date": "2026-08-31",
            "total_budget": 300000,
            "status": "draft"
        }
        
        create_response = requests.post(BUDGET_API, json=budget_data)
        budget_id = create_response.json()["id"]
        self.created_budget_ids.append(budget_id)
        
        # Approve first
        requests.post(f"{BUDGET_API}/{budget_id}/approve")
        
        # Then activate
        response = requests.post(f"{BUDGET_API}/{budget_id}/activate")
        assert response.status_code == 200
        
        # Verify status
        get_response = requests.get(f"{BUDGET_API}/{budget_id}")
        assert get_response.json()["status"] == "active"
        print(f"✓ Budget activated successfully")
    
    def test_delete_draft_budget(self):
        """DELETE /api/marketing/v3/budgets/{id} - Deletes draft budget"""
        # Create draft budget
        budget_data = {
            "name": f"{TEST_PREFIX}Delete Test Budget",
            "period": "campaign",
            "fiscal_year": 2026,
            "start_date": "2026-06-01",
            "end_date": "2026-06-30",
            "total_budget": 100000,
            "status": "draft"
        }
        
        create_response = requests.post(BUDGET_API, json=budget_data)
        budget_id = create_response.json()["id"]
        
        # Delete budget
        response = requests.delete(f"{BUDGET_API}/{budget_id}")
        assert response.status_code == 200
        
        # Verify deleted
        get_response = requests.get(f"{BUDGET_API}/{budget_id}")
        assert get_response.status_code == 404
        print(f"✓ Draft budget deleted successfully")


class TestBudgetItems:
    """Test budget line item operations"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Create a test budget for item tests"""
        budget_data = {
            "name": f"{TEST_PREFIX}Items Test Budget",
            "period": "quarterly",
            "fiscal_year": 2026,
            "start_date": "2026-10-01",
            "end_date": "2026-12-31",
            "total_budget": 3000000
        }
        
        response = requests.post(BUDGET_API, json=budget_data)
        self.budget_id = response.json()["id"]
        yield
        # Cleanup
        try:
            requests.delete(f"{BUDGET_API}/{self.budget_id}")
        except:
            pass
    
    def test_create_budget_item(self):
        """POST /api/marketing/v3/budgets/{id}/items - Creates line item"""
        item_data = {
            "budget_id": self.budget_id,
            "name": "Digital Advertising - Meta",
            "category": "digital_ads",
            "allocated_amount": 1000000,
            "platform": "meta"
        }
        
        response = requests.post(f"{BUDGET_API}/{self.budget_id}/items", json=item_data)
        assert response.status_code == 200
        
        data = response.json()
        assert data["name"] == item_data["name"]
        assert data["category"] == "digital_ads"
        assert data["allocated_amount"] == 1000000
        assert "id" in data
        print(f"✓ Created budget item: {data['name']}")
        
        # Verify via GET list
        get_response = requests.get(f"{BUDGET_API}/{self.budget_id}/items")
        assert get_response.status_code == 200
        items = get_response.json()
        assert len(items) >= 1
        print(f"✓ Verified item persisted via GET")
    
    def test_list_budget_items(self):
        """GET /api/marketing/v3/budgets/{id}/items - Lists budget line items"""
        # Create multiple items
        categories = [
            {"name": "Influencer Budget", "category": "influencer", "allocated_amount": 500000},
            {"name": "Content Production", "category": "content_production", "allocated_amount": 300000},
        ]
        
        for item in categories:
            requests.post(f"{BUDGET_API}/{self.budget_id}/items", json={
                "budget_id": self.budget_id,
                **item
            })
        
        response = requests.get(f"{BUDGET_API}/{self.budget_id}/items")
        assert response.status_code == 200
        
        data = response.json()
        assert isinstance(data, list)
        assert len(data) >= 2
        
        # Verify item structure
        for item in data:
            assert "id" in item
            assert "name" in item
            assert "category" in item
            assert "allocated_amount" in item
            assert "spent_amount" in item
        print(f"✓ Listed {len(data)} budget items")


class TestExpenses:
    """Test expense tracking operations"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Create test budget for expense tests"""
        budget_data = {
            "name": f"{TEST_PREFIX}Expenses Test Budget",
            "period": "monthly",
            "fiscal_year": 2026,
            "start_date": "2026-11-01",
            "end_date": "2026-11-30",
            "total_budget": 500000
        }
        
        response = requests.post(BUDGET_API, json=budget_data)
        self.budget_id = response.json()["id"]
        self.created_expense_ids = []
        yield
        # Cleanup
        for exp_id in self.created_expense_ids:
            try:
                requests.delete(f"{BUDGET_API}/expenses/{exp_id}")
            except:
                pass
        try:
            requests.delete(f"{BUDGET_API}/{self.budget_id}")
        except:
            pass
    
    def test_create_expense(self):
        """POST /api/marketing/v3/budgets/expenses - Records new expense"""
        expense_data = {
            "budget_id": self.budget_id,
            "description": f"{TEST_PREFIX}Test Ad Spend",
            "expense_type": "ad_spend",
            "category": "digital_ads",
            "amount": 50000,
            "expense_date": str(date.today()),
            "vendor_name": "Meta Platforms"
        }
        
        response = requests.post(f"{BUDGET_API}/expenses", json=expense_data)
        assert response.status_code == 200
        
        data = response.json()
        assert data["description"] == expense_data["description"]
        assert data["amount"] == 50000
        assert data["status"] == "pending"
        assert "id" in data
        
        self.created_expense_ids.append(data["id"])
        print(f"✓ Created expense: {data['description']} - ₹{data['amount']}")
        
        # Verify via GET
        get_response = requests.get(f"{BUDGET_API}/expenses/{data['id']}")
        assert get_response.status_code == 200
        assert get_response.json()["amount"] == 50000
        print(f"✓ Verified expense persisted")
    
    def test_list_all_expenses(self):
        """GET /api/marketing/v3/budgets/expenses/all - Lists all expenses"""
        response = requests.get(f"{BUDGET_API}/expenses/all")
        assert response.status_code == 200
        
        data = response.json()
        assert isinstance(data, list)
        print(f"✓ Listed {len(data)} expenses")
    
    def test_list_budget_expenses(self):
        """GET /api/marketing/v3/budgets/{id}/expenses - Lists budget-specific expenses"""
        # Create expense
        expense_data = {
            "budget_id": self.budget_id,
            "description": f"{TEST_PREFIX}Budget-specific expense",
            "expense_type": "production_cost",
            "category": "content_production",
            "amount": 25000,
            "expense_date": str(date.today())
        }
        
        requests.post(f"{BUDGET_API}/expenses", json=expense_data)
        
        response = requests.get(f"{BUDGET_API}/{self.budget_id}/expenses")
        assert response.status_code == 200
        
        data = response.json()
        assert isinstance(data, list)
        assert len(data) >= 1
        print(f"✓ Listed {len(data)} expenses for budget")
    
    def test_approve_expense(self):
        """POST /api/marketing/v3/budgets/expenses/{id}/approve - Approves pending expense"""
        # Create pending expense
        expense_data = {
            "budget_id": self.budget_id,
            "description": f"{TEST_PREFIX}Expense to approve",
            "expense_type": "agency_fee",
            "category": "creative_agency",
            "amount": 75000,
            "expense_date": str(date.today())
        }
        
        create_response = requests.post(f"{BUDGET_API}/expenses", json=expense_data)
        expense_id = create_response.json()["id"]
        self.created_expense_ids.append(expense_id)
        
        # Verify initial status is pending
        assert create_response.json()["status"] == "pending"
        
        # Approve expense
        response = requests.post(f"{BUDGET_API}/expenses/{expense_id}/approve")
        assert response.status_code == 200
        
        data = response.json()
        assert data["message"] == "Expense approved"
        
        # Verify status changed
        get_response = requests.get(f"{BUDGET_API}/expenses/{expense_id}")
        assert get_response.json()["status"] == "approved"
        print(f"✓ Expense approved successfully")
    
    def test_reject_expense(self):
        """POST /api/marketing/v3/budgets/expenses/{id}/reject - Rejects expense"""
        expense_data = {
            "budget_id": self.budget_id,
            "description": f"{TEST_PREFIX}Expense to reject",
            "expense_type": "event",
            "category": "events",
            "amount": 100000,
            "expense_date": str(date.today())
        }
        
        create_response = requests.post(f"{BUDGET_API}/expenses", json=expense_data)
        expense_id = create_response.json()["id"]
        self.created_expense_ids.append(expense_id)
        
        # Reject expense
        response = requests.post(f"{BUDGET_API}/expenses/{expense_id}/reject")
        assert response.status_code == 200
        
        # Verify status
        get_response = requests.get(f"{BUDGET_API}/expenses/{expense_id}")
        assert get_response.json()["status"] == "rejected"
        print(f"✓ Expense rejected successfully")
    
    def test_mark_expense_paid(self):
        """POST /api/marketing/v3/budgets/expenses/{id}/mark-paid - Marks approved as paid"""
        expense_data = {
            "budget_id": self.budget_id,
            "description": f"{TEST_PREFIX}Expense to pay",
            "expense_type": "software",
            "category": "software_tools",
            "amount": 15000,
            "expense_date": str(date.today())
        }
        
        create_response = requests.post(f"{BUDGET_API}/expenses", json=expense_data)
        expense_id = create_response.json()["id"]
        self.created_expense_ids.append(expense_id)
        
        # Approve first
        requests.post(f"{BUDGET_API}/expenses/{expense_id}/approve")
        
        # Mark as paid
        response = requests.post(f"{BUDGET_API}/expenses/{expense_id}/mark-paid")
        assert response.status_code == 200
        
        # Verify status
        get_response = requests.get(f"{BUDGET_API}/expenses/{expense_id}")
        assert get_response.json()["status"] == "paid"
        print(f"✓ Expense marked as paid")


class TestBudgetFilters:
    """Test budget filtering options"""
    
    def test_filter_by_status(self):
        """GET /api/marketing/v3/budgets?status=draft - Filters by status"""
        response = requests.get(f"{BUDGET_API}?status=draft")
        assert response.status_code == 200
        
        data = response.json()
        for budget in data:
            assert budget["status"] == "draft"
        print(f"✓ Filtered budgets by status: {len(data)} draft budgets")
    
    def test_filter_by_fiscal_year(self):
        """GET /api/marketing/v3/budgets?fiscal_year=2026 - Filters by year"""
        response = requests.get(f"{BUDGET_API}?fiscal_year=2026")
        assert response.status_code == 200
        
        data = response.json()
        for budget in data:
            assert budget["fiscal_year"] == 2026
        print(f"✓ Filtered budgets by fiscal year: {len(data)} budgets")
    
    def test_filter_expenses_by_status(self):
        """GET /api/marketing/v3/budgets/expenses/all?status=approved - Filters expenses"""
        response = requests.get(f"{BUDGET_API}/expenses/all?status=approved")
        assert response.status_code == 200
        
        data = response.json()
        for expense in data:
            assert expense["status"] == "approved"
        print(f"✓ Filtered expenses by status: {len(data)} approved expenses")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
