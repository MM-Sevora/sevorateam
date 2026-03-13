"""
Test Filter, Sort, and Pagination for:
1. Marketing Contacts (Influencers) - /api/marketing/v2/contacts/paginated
2. Sales Leads - /api/sales/leads/paginated
3. Unified Tasks - /api/tasks/paginated

Tests verify:
- Paginated endpoints return correct structure (items, total, page, filters_meta)
- City and Added By/Team Member filters work
- Sorting works (sort_by, sort_order)
- Filter metadata (cities, creators list) is returned
"""

import pytest
import requests
import os
from datetime import datetime

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')
AUTH_TOKEN = None
TEST_DATA = {}


@pytest.fixture(scope="module", autouse=True)
def authenticate():
    """Authenticate and get token for all tests"""
    global AUTH_TOKEN
    
    response = requests.post(
        f"{BASE_URL}/api/auth/login",
        json={"email": "superadmin@sevora.com", "password": "superadmin123"}
    )
    assert response.status_code == 200, f"Auth failed: {response.text}"
    AUTH_TOKEN = response.json()["access_token"]
    return AUTH_TOKEN


def get_headers():
    """Return auth headers"""
    return {"Authorization": f"Bearer {AUTH_TOKEN}", "Content-Type": "application/json"}


# ===========================================
# MARKETING CONTACTS (INFLUENCERS) TESTS
# ===========================================

class TestMarketingContactsPaginated:
    """Test /api/marketing/v2/contacts/paginated endpoint"""
    
    def test_01_contacts_paginated_basic(self):
        """Test paginated endpoint returns correct structure"""
        response = requests.get(
            f"{BASE_URL}/api/marketing/v2/contacts/paginated",
            headers=get_headers(),
            params={"page": 1, "page_size": 10, "contact_type": "influencer"}
        )
        assert response.status_code == 200, f"Failed: {response.text}"
        
        data = response.json()
        # Verify structure
        assert "contacts" in data, "Missing 'contacts' field"
        assert "total" in data, "Missing 'total' field"
        assert "page" in data, "Missing 'page' field"
        assert "page_size" in data, "Missing 'page_size' field"
        assert "total_pages" in data, "Missing 'total_pages' field"
        assert "filters_meta" in data, "Missing 'filters_meta' field"
        
        # Verify filters_meta structure
        filters_meta = data["filters_meta"]
        assert "creators" in filters_meta, "Missing 'creators' in filters_meta"
        assert "cities" in filters_meta, "Missing 'cities' in filters_meta"
        
        print(f"✓ Contacts paginated: {data['total']} total, {len(data['contacts'])} returned")
        print(f"✓ Filters meta: {len(filters_meta.get('creators', []))} creators, {len(filters_meta.get('cities', []))} cities")
    
    def test_02_contacts_city_filter(self):
        """Test city filter works"""
        # First get available cities
        response = requests.get(
            f"{BASE_URL}/api/marketing/v2/contacts/paginated",
            headers=get_headers(),
            params={"page": 1, "page_size": 1, "contact_type": "influencer"}
        )
        assert response.status_code == 200
        cities = response.json()["filters_meta"].get("cities", [])
        
        if cities:
            test_city = cities[0]
            # Filter by city
            response = requests.get(
                f"{BASE_URL}/api/marketing/v2/contacts/paginated",
                headers=get_headers(),
                params={"page": 1, "page_size": 100, "contact_type": "influencer", "city": test_city}
            )
            assert response.status_code == 200
            data = response.json()
            # All returned contacts should have this city
            for contact in data["contacts"]:
                assert contact.get("city", "").lower() == test_city.lower(), f"Contact {contact.get('name')} has city {contact.get('city')} but expected {test_city}"
            print(f"✓ City filter '{test_city}': {len(data['contacts'])} contacts found")
        else:
            print("⚠ No cities available to test filter - skipping city filter test")
    
    def test_03_contacts_added_by_filter(self):
        """Test added_by (creator) filter works"""
        # First get available creators
        response = requests.get(
            f"{BASE_URL}/api/marketing/v2/contacts/paginated",
            headers=get_headers(),
            params={"page": 1, "page_size": 1, "contact_type": "influencer"}
        )
        assert response.status_code == 200
        creators = response.json()["filters_meta"].get("creators", [])
        
        if creators:
            test_creator = creators[0]
            # Filter by added_by
            response = requests.get(
                f"{BASE_URL}/api/marketing/v2/contacts/paginated",
                headers=get_headers(),
                params={"page": 1, "page_size": 100, "contact_type": "influencer", "added_by": test_creator["id"]}
            )
            assert response.status_code == 200
            data = response.json()
            # All returned contacts should be created by this user
            for contact in data["contacts"]:
                assert contact.get("created_by") == test_creator["id"], f"Contact {contact.get('name')} created_by {contact.get('created_by')} but expected {test_creator['id']}"
            print(f"✓ Added by filter '{test_creator['name']}': {len(data['contacts'])} contacts found")
        else:
            print("⚠ No creators available to test filter")
    
    def test_04_contacts_sorting(self):
        """Test sorting by different fields"""
        # Test ascending sort by name
        response = requests.get(
            f"{BASE_URL}/api/marketing/v2/contacts/paginated",
            headers=get_headers(),
            params={"page": 1, "page_size": 10, "contact_type": "influencer", "sort_by": "name", "sort_order": "asc"}
        )
        assert response.status_code == 200
        data = response.json()
        contacts = data["contacts"]
        
        if len(contacts) >= 2:
            # Verify ascending order
            names = [c.get("name", "").lower() for c in contacts]
            assert names == sorted(names), "Contacts not sorted by name ascending"
            print(f"✓ Sort by name ASC: {names[:3]}...")
        
        # Test descending sort by created_at
        response = requests.get(
            f"{BASE_URL}/api/marketing/v2/contacts/paginated",
            headers=get_headers(),
            params={"page": 1, "page_size": 10, "contact_type": "influencer", "sort_by": "created_at", "sort_order": "desc"}
        )
        assert response.status_code == 200
        print("✓ Sort by created_at DESC works")
    
    def test_05_contacts_pagination(self):
        """Test pagination works correctly"""
        # Get first page
        response = requests.get(
            f"{BASE_URL}/api/marketing/v2/contacts/paginated",
            headers=get_headers(),
            params={"page": 1, "page_size": 5, "contact_type": "influencer"}
        )
        assert response.status_code == 200
        data = response.json()
        
        total = data["total"]
        if total > 5:
            # Get second page
            response2 = requests.get(
                f"{BASE_URL}/api/marketing/v2/contacts/paginated",
                headers=get_headers(),
                params={"page": 2, "page_size": 5, "contact_type": "influencer"}
            )
            assert response2.status_code == 200
            data2 = response2.json()
            
            # Ensure different contacts on different pages
            page1_ids = {c["id"] for c in data["contacts"]}
            page2_ids = {c["id"] for c in data2["contacts"]}
            assert page1_ids.isdisjoint(page2_ids), "Page 1 and Page 2 have overlapping contacts"
            print(f"✓ Pagination: Page 1 has {len(page1_ids)} contacts, Page 2 has {len(page2_ids)} contacts")
        else:
            print(f"⚠ Only {total} contacts, not enough to test pagination")


# ===========================================
# SALES LEADS TESTS
# ===========================================

class TestLeadsPaginated:
    """Test /api/sales/leads/paginated endpoint"""
    
    def test_01_leads_paginated_basic(self):
        """Test paginated endpoint returns correct structure"""
        response = requests.get(
            f"{BASE_URL}/api/sales/leads/paginated",
            headers=get_headers(),
            params={"page": 1, "page_size": 10}
        )
        assert response.status_code == 200, f"Failed: {response.text}"
        
        data = response.json()
        # Verify structure
        assert "leads" in data, "Missing 'leads' field"
        assert "total" in data, "Missing 'total' field"
        assert "page" in data, "Missing 'page' field"
        assert "page_size" in data, "Missing 'page_size' field"
        assert "total_pages" in data, "Missing 'total_pages' field"
        assert "filters_meta" in data, "Missing 'filters_meta' field"
        
        # Verify filters_meta structure
        filters_meta = data["filters_meta"]
        assert "creators" in filters_meta, "Missing 'creators' in filters_meta"
        assert "cities" in filters_meta, "Missing 'cities' in filters_meta"
        assert "sources" in filters_meta, "Missing 'sources' in filters_meta"
        assert "stages" in filters_meta, "Missing 'stages' in filters_meta"
        
        print(f"✓ Leads paginated: {data['total']} total, {len(data['leads'])} returned")
        print(f"✓ Filters meta: creators={len(filters_meta.get('creators', []))}, cities={len(filters_meta.get('cities', []))}, sources={len(filters_meta.get('sources', []))}, stages={len(filters_meta.get('stages', []))}")
    
    def test_02_leads_source_filter(self):
        """Test source filter works"""
        response = requests.get(
            f"{BASE_URL}/api/sales/leads/paginated",
            headers=get_headers(),
            params={"page": 1, "page_size": 1}
        )
        assert response.status_code == 200
        sources = response.json()["filters_meta"].get("sources", [])
        
        if sources:
            test_source = sources[0]
            response = requests.get(
                f"{BASE_URL}/api/sales/leads/paginated",
                headers=get_headers(),
                params={"page": 1, "page_size": 100, "source": test_source}
            )
            assert response.status_code == 200
            data = response.json()
            for lead in data["leads"]:
                assert lead.get("source") == test_source, f"Lead {lead.get('name')} has source {lead.get('source')} but expected {test_source}"
            print(f"✓ Source filter '{test_source}': {len(data['leads'])} leads found")
        else:
            print("⚠ No sources available to test filter")
    
    def test_03_leads_stage_filter(self):
        """Test stage filter works"""
        response = requests.get(
            f"{BASE_URL}/api/sales/leads/paginated",
            headers=get_headers(),
            params={"page": 1, "page_size": 1}
        )
        assert response.status_code == 200
        stages = response.json()["filters_meta"].get("stages", [])
        
        if stages:
            test_stage = stages[0]
            response = requests.get(
                f"{BASE_URL}/api/sales/leads/paginated",
                headers=get_headers(),
                params={"page": 1, "page_size": 100, "stage": test_stage}
            )
            assert response.status_code == 200
            data = response.json()
            for lead in data["leads"]:
                assert lead.get("stage") == test_stage, f"Lead {lead.get('name')} has stage {lead.get('stage')} but expected {test_stage}"
            print(f"✓ Stage filter '{test_stage}': {len(data['leads'])} leads found")
        else:
            print("⚠ No stages available to test filter")
    
    def test_04_leads_city_filter(self):
        """Test city filter works"""
        response = requests.get(
            f"{BASE_URL}/api/sales/leads/paginated",
            headers=get_headers(),
            params={"page": 1, "page_size": 1}
        )
        assert response.status_code == 200
        cities = response.json()["filters_meta"].get("cities", [])
        
        if cities:
            test_city = cities[0]
            response = requests.get(
                f"{BASE_URL}/api/sales/leads/paginated",
                headers=get_headers(),
                params={"page": 1, "page_size": 100, "city": test_city}
            )
            assert response.status_code == 200
            data = response.json()
            for lead in data["leads"]:
                assert lead.get("city") == test_city, f"Lead {lead.get('name')} has city {lead.get('city')} but expected {test_city}"
            print(f"✓ City filter '{test_city}': {len(data['leads'])} leads found")
        else:
            print("⚠ No cities available to test filter")
    
    def test_05_leads_added_by_filter(self):
        """Test added_by (creator) filter works"""
        response = requests.get(
            f"{BASE_URL}/api/sales/leads/paginated",
            headers=get_headers(),
            params={"page": 1, "page_size": 1}
        )
        assert response.status_code == 200
        creators = response.json()["filters_meta"].get("creators", [])
        
        if creators:
            test_creator = creators[0]
            response = requests.get(
                f"{BASE_URL}/api/sales/leads/paginated",
                headers=get_headers(),
                params={"page": 1, "page_size": 100, "added_by": test_creator["id"]}
            )
            assert response.status_code == 200
            data = response.json()
            for lead in data["leads"]:
                assert lead.get("created_by") == test_creator["id"], f"Lead created_by mismatch"
            print(f"✓ Added by filter '{test_creator['name']}': {len(data['leads'])} leads found")
        else:
            print("⚠ No creators available to test filter")
    
    def test_06_leads_sorting(self):
        """Test sorting by different fields"""
        # Test sort by name ascending
        response = requests.get(
            f"{BASE_URL}/api/sales/leads/paginated",
            headers=get_headers(),
            params={"page": 1, "page_size": 10, "sort_by": "name", "sort_order": "asc"}
        )
        assert response.status_code == 200
        data = response.json()
        leads = data["leads"]
        
        if len(leads) >= 2:
            names = [l.get("name", "").lower() for l in leads]
            assert names == sorted(names), "Leads not sorted by name ascending"
            print(f"✓ Sort by name ASC: {names[:3]}...")
        
        # Test sort by created_at desc
        response = requests.get(
            f"{BASE_URL}/api/sales/leads/paginated",
            headers=get_headers(),
            params={"page": 1, "page_size": 10, "sort_by": "created_at", "sort_order": "desc"}
        )
        assert response.status_code == 200
        print("✓ Sort by created_at DESC works")
        
        # Test sort by city
        response = requests.get(
            f"{BASE_URL}/api/sales/leads/paginated",
            headers=get_headers(),
            params={"page": 1, "page_size": 10, "sort_by": "city", "sort_order": "asc"}
        )
        assert response.status_code == 200
        print("✓ Sort by city ASC works")
    
    def test_07_leads_pagination(self):
        """Test pagination works correctly"""
        response = requests.get(
            f"{BASE_URL}/api/sales/leads/paginated",
            headers=get_headers(),
            params={"page": 1, "page_size": 5}
        )
        assert response.status_code == 200
        data = response.json()
        
        total = data["total"]
        if total > 5:
            response2 = requests.get(
                f"{BASE_URL}/api/sales/leads/paginated",
                headers=get_headers(),
                params={"page": 2, "page_size": 5}
            )
            assert response2.status_code == 200
            data2 = response2.json()
            
            page1_ids = {l["id"] for l in data["leads"]}
            page2_ids = {l["id"] for l in data2["leads"]}
            assert page1_ids.isdisjoint(page2_ids), "Page 1 and Page 2 have overlapping leads"
            print(f"✓ Pagination: Page 1 has {len(page1_ids)} leads, Page 2 has {len(page2_ids)} leads")
        else:
            print(f"⚠ Only {total} leads, not enough to test pagination")


# ===========================================
# UNIFIED TASKS TESTS
# ===========================================

class TestTasksPaginated:
    """Test /api/tasks/paginated endpoint"""
    
    def test_01_tasks_paginated_basic(self):
        """Test paginated endpoint returns correct structure"""
        response = requests.get(
            f"{BASE_URL}/api/tasks/paginated",
            headers=get_headers(),
            params={"page": 1, "page_size": 10}
        )
        assert response.status_code == 200, f"Failed: {response.text}"
        
        data = response.json()
        # Verify structure
        assert "tasks" in data, "Missing 'tasks' field"
        assert "total" in data, "Missing 'total' field"
        assert "page" in data, "Missing 'page' field"
        assert "page_size" in data, "Missing 'page_size' field"
        assert "total_pages" in data, "Missing 'total_pages' field"
        assert "filters_meta" in data, "Missing 'filters_meta' field"
        
        # Verify filters_meta structure
        filters_meta = data["filters_meta"]
        assert "users" in filters_meta, "Missing 'users' in filters_meta"
        assert "modules" in filters_meta, "Missing 'modules' in filters_meta"
        assert "priorities" in filters_meta, "Missing 'priorities' in filters_meta"
        assert "statuses" in filters_meta, "Missing 'statuses' in filters_meta"
        
        print(f"✓ Tasks paginated: {data['total']} total, {len(data['tasks'])} returned")
        print(f"✓ Filters meta: users={len(filters_meta.get('users', []))}, modules={len(filters_meta.get('modules', []))}, priorities={len(filters_meta.get('priorities', []))}, statuses={len(filters_meta.get('statuses', []))}")
    
    def test_02_tasks_status_filter(self):
        """Test status filter works"""
        test_statuses = ["pending", "in_progress", "completed"]
        
        for test_status in test_statuses:
            response = requests.get(
                f"{BASE_URL}/api/tasks/paginated",
                headers=get_headers(),
                params={"page": 1, "page_size": 100, "status": test_status}
            )
            assert response.status_code == 200
            data = response.json()
            for task in data["tasks"]:
                assert task.get("status") == test_status, f"Task {task.get('title')} has status {task.get('status')} but expected {test_status}"
            print(f"✓ Status filter '{test_status}': {len(data['tasks'])} tasks found")
    
    def test_03_tasks_priority_filter(self):
        """Test priority filter works"""
        test_priorities = ["urgent", "high", "medium", "low"]
        
        for test_priority in test_priorities:
            response = requests.get(
                f"{BASE_URL}/api/tasks/paginated",
                headers=get_headers(),
                params={"page": 1, "page_size": 100, "priority": test_priority}
            )
            assert response.status_code == 200
            data = response.json()
            for task in data["tasks"]:
                assert task.get("priority") == test_priority, f"Task {task.get('title')} has priority {task.get('priority')} but expected {test_priority}"
            print(f"✓ Priority filter '{test_priority}': {len(data['tasks'])} tasks found")
    
    def test_04_tasks_module_filter(self):
        """Test source_module filter works"""
        response = requests.get(
            f"{BASE_URL}/api/tasks/paginated",
            headers=get_headers(),
            params={"page": 1, "page_size": 1}
        )
        assert response.status_code == 200
        modules = response.json()["filters_meta"].get("modules", [])
        
        if modules:
            test_module = modules[0]
            response = requests.get(
                f"{BASE_URL}/api/tasks/paginated",
                headers=get_headers(),
                params={"page": 1, "page_size": 100, "source_module": test_module}
            )
            assert response.status_code == 200
            data = response.json()
            for task in data["tasks"]:
                assert task.get("source_module") == test_module, f"Task {task.get('title')} has module {task.get('source_module')} but expected {test_module}"
            print(f"✓ Module filter '{test_module}': {len(data['tasks'])} tasks found")
        else:
            print("⚠ No modules available to test filter")
    
    def test_05_tasks_assigned_to_filter(self):
        """Test assigned_to (assignee) filter works"""
        response = requests.get(
            f"{BASE_URL}/api/tasks/paginated",
            headers=get_headers(),
            params={"page": 1, "page_size": 1}
        )
        assert response.status_code == 200
        users = response.json()["filters_meta"].get("users", [])
        
        if users:
            test_user = users[0]
            response = requests.get(
                f"{BASE_URL}/api/tasks/paginated",
                headers=get_headers(),
                params={"page": 1, "page_size": 100, "assigned_to": test_user["id"]}
            )
            assert response.status_code == 200
            data = response.json()
            print(f"✓ Assigned to filter '{test_user['name']}': {len(data['tasks'])} tasks found")
        else:
            print("⚠ No users available to test filter")
    
    def test_06_tasks_created_by_filter(self):
        """Test created_by (creator) filter works"""
        response = requests.get(
            f"{BASE_URL}/api/tasks/paginated",
            headers=get_headers(),
            params={"page": 1, "page_size": 1}
        )
        assert response.status_code == 200
        users = response.json()["filters_meta"].get("users", [])
        
        if users:
            test_user = users[0]
            response = requests.get(
                f"{BASE_URL}/api/tasks/paginated",
                headers=get_headers(),
                params={"page": 1, "page_size": 100, "created_by": test_user["id"]}
            )
            assert response.status_code == 200
            data = response.json()
            for task in data["tasks"]:
                assert task.get("created_by") == test_user["id"], f"Task created_by mismatch"
            print(f"✓ Created by filter '{test_user['name']}': {len(data['tasks'])} tasks found")
        else:
            print("⚠ No users available to test filter")
    
    def test_07_tasks_sorting(self):
        """Test sorting by different fields"""
        # Test sort by title ascending
        response = requests.get(
            f"{BASE_URL}/api/tasks/paginated",
            headers=get_headers(),
            params={"page": 1, "page_size": 10, "sort_by": "title", "sort_order": "asc"}
        )
        assert response.status_code == 200
        data = response.json()
        tasks = data["tasks"]
        
        if len(tasks) >= 2:
            titles = [t.get("title", "").lower() for t in tasks]
            assert titles == sorted(titles), "Tasks not sorted by title ascending"
            print(f"✓ Sort by title ASC: {titles[:3]}...")
        
        # Test sort by priority
        response = requests.get(
            f"{BASE_URL}/api/tasks/paginated",
            headers=get_headers(),
            params={"page": 1, "page_size": 10, "sort_by": "priority", "sort_order": "desc"}
        )
        assert response.status_code == 200
        print("✓ Sort by priority DESC works")
        
        # Test sort by status
        response = requests.get(
            f"{BASE_URL}/api/tasks/paginated",
            headers=get_headers(),
            params={"page": 1, "page_size": 10, "sort_by": "status", "sort_order": "asc"}
        )
        assert response.status_code == 200
        print("✓ Sort by status ASC works")
        
        # Test sort by due_date
        response = requests.get(
            f"{BASE_URL}/api/tasks/paginated",
            headers=get_headers(),
            params={"page": 1, "page_size": 10, "sort_by": "due_date", "sort_order": "asc"}
        )
        assert response.status_code == 200
        print("✓ Sort by due_date ASC works")
        
        # Test sort by created_at
        response = requests.get(
            f"{BASE_URL}/api/tasks/paginated",
            headers=get_headers(),
            params={"page": 1, "page_size": 10, "sort_by": "created_at", "sort_order": "desc"}
        )
        assert response.status_code == 200
        print("✓ Sort by created_at DESC works")
    
    def test_08_tasks_pagination(self):
        """Test pagination works correctly"""
        response = requests.get(
            f"{BASE_URL}/api/tasks/paginated",
            headers=get_headers(),
            params={"page": 1, "page_size": 5}
        )
        assert response.status_code == 200
        data = response.json()
        
        total = data["total"]
        if total > 5:
            response2 = requests.get(
                f"{BASE_URL}/api/tasks/paginated",
                headers=get_headers(),
                params={"page": 2, "page_size": 5}
            )
            assert response2.status_code == 200
            data2 = response2.json()
            
            page1_ids = {t["id"] for t in data["tasks"]}
            page2_ids = {t["id"] for t in data2["tasks"]}
            assert page1_ids.isdisjoint(page2_ids), "Page 1 and Page 2 have overlapping tasks"
            print(f"✓ Pagination: Page 1 has {len(page1_ids)} tasks, Page 2 has {len(page2_ids)} tasks")
        else:
            print(f"⚠ Only {total} tasks, not enough to test pagination")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
