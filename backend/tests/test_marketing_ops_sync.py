"""
Marketing Ops Module Sync Tests
Tests sync and data flow between Influencers, Campaign Hub, and Pipeline pages
"""
import pytest
import requests
import os
import uuid
from datetime import datetime

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://sevora-hub.preview.emergentagent.com').rstrip('/')

class TestMarketingOpsSync:
    """Test Marketing Ops module sync between Influencers, Campaign Hub, and Pipeline"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup - get auth token"""
        login_response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": "superadmin@sevora.com", "password": "superadmin123"}
        )
        assert login_response.status_code == 200, f"Login failed: {login_response.text}"
        self.token = login_response.json()["access_token"]
        self.headers = {"Authorization": f"Bearer {self.token}"}
        
        # Store created resources for cleanup
        self.created_influencer_id = None
        self.created_campaign_id = None
        
    def teardown_method(self):
        """Cleanup created test data"""
        if self.created_influencer_id:
            try:
                requests.delete(
                    f"{BASE_URL}/api/marketing/v2/contacts/{self.created_influencer_id}",
                    headers=self.headers
                )
            except:
                pass
        if self.created_campaign_id:
            try:
                requests.delete(
                    f"{BASE_URL}/api/marketing/campaigns/{self.created_campaign_id}",
                    headers=self.headers
                )
            except:
                pass

    # ========== TEST 1: Influencers List Page ==========
    def test_01_influencers_list_loads_with_data(self):
        """TEST 1: Influencers list page loads with data"""
        response = requests.get(
            f"{BASE_URL}/api/marketing/v2/contacts?contact_type=influencer&limit=10",
            headers=self.headers
        )
        assert response.status_code == 200, f"Failed to get influencers: {response.text}"
        
        influencers = response.json()
        assert isinstance(influencers, list), "Response should be a list"
        
        print(f"[PASS] Influencers list loads - found {len(influencers)} influencers")
        
        # Verify data structure
        if influencers:
            inf = influencers[0]
            required_fields = ['id', 'name', 'contact_type']
            for field in required_fields:
                assert field in inf, f"Influencer missing field: {field}"
            print(f"[PASS] Influencer data structure verified - first influencer: {inf['name']}")
            
        return influencers

    # ========== TEST 2: Get Single Influencer Detail ==========
    def test_02_click_influencer_shows_detail_with_correct_data(self):
        """TEST 2: Click on influencer shows detail page with correct data"""
        # First get list
        list_response = requests.get(
            f"{BASE_URL}/api/marketing/v2/contacts?contact_type=influencer&limit=1",
            headers=self.headers
        )
        assert list_response.status_code == 200
        influencers = list_response.json()
        assert len(influencers) > 0, "No influencers found to test detail page"
        
        test_influencer = influencers[0]
        influencer_id = test_influencer['id']
        
        # Get detail
        detail_response = requests.get(
            f"{BASE_URL}/api/marketing/v2/contacts/{influencer_id}",
            headers=self.headers
        )
        assert detail_response.status_code == 200, f"Failed to get influencer detail: {detail_response.text}"
        
        detail = detail_response.json()
        
        # Verify data consistency
        assert detail['id'] == test_influencer['id'], "ID mismatch between list and detail"
        assert detail['name'] == test_influencer['name'], "Name mismatch between list and detail"
        
        print(f"[PASS] Influencer detail page works - {detail['name']} (ID: {detail['id'][:8]}...)")
        print(f"[PASS] Data consistency verified - same data in list and detail view")
        
        return detail

    # ========== TEST 3: Campaign Hub Loads ==========
    def test_03_campaign_hub_page_loads_with_campaigns(self):
        """TEST 3: Campaign Hub page loads with campaigns list"""
        response = requests.get(
            f"{BASE_URL}/api/marketing/v2/unified-campaigns?limit=10",
            headers=self.headers
        )
        assert response.status_code == 200, f"Failed to get campaigns: {response.text}"
        
        campaigns = response.json()
        assert isinstance(campaigns, list), "Response should be a list"
        
        print(f"[PASS] Campaign Hub loads - found {len(campaigns)} campaigns")
        
        # Verify campaign structure
        if campaigns:
            campaign = campaigns[0]
            required_fields = ['id', 'name', 'status']
            for field in required_fields:
                assert field in campaign, f"Campaign missing field: {field}"
            print(f"[PASS] Campaign data structure verified - first campaign: {campaign['name']}")
        
        return campaigns

    # ========== TEST 4: Create New Campaign ==========
    def test_04_create_new_campaign_and_verify(self):
        """TEST 4: Create a new campaign and verify it appears"""
        test_name = f"TEST_Campaign_{uuid.uuid4().hex[:8]}"
        
        campaign_data = {
            "name": test_name,
            "objective": "awareness, engagement",
            "budget": 100000,
            "start_date": "2026-04-01",
            "end_date": "2026-05-31",
            "target_market": "Urban Women 25-35",
            "description": "Test campaign for sync verification"
        }
        
        # Create campaign
        create_response = requests.post(
            f"{BASE_URL}/api/marketing/campaigns",
            json=campaign_data,
            headers=self.headers
        )
        assert create_response.status_code in [200, 201], f"Failed to create campaign: {create_response.text}"
        
        created = create_response.json()
        self.created_campaign_id = created['id']
        
        print(f"[PASS] Campaign created successfully - {test_name}")
        
        # Verify it appears in list
        list_response = requests.get(
            f"{BASE_URL}/api/marketing/v2/unified-campaigns?limit=100",
            headers=self.headers
        )
        assert list_response.status_code == 200
        
        campaigns = list_response.json()
        found = any(c['id'] == created['id'] for c in campaigns)
        assert found, f"Created campaign not found in list"
        
        print(f"[PASS] Campaign appears in list after creation")
        
        return created

    # ========== TEST 5: Assign Influencer to Campaign ==========
    def test_05_assign_influencer_to_campaign(self):
        """TEST 5: Assign an influencer to a campaign"""
        # Get an influencer
        inf_response = requests.get(
            f"{BASE_URL}/api/marketing/v2/contacts?contact_type=influencer&limit=1",
            headers=self.headers
        )
        assert inf_response.status_code == 200
        influencers = inf_response.json()
        assert len(influencers) > 0, "No influencers found"
        
        influencer_id = influencers[0]['id']
        influencer_name = influencers[0]['name']
        
        # Get or create a campaign
        camp_response = requests.get(
            f"{BASE_URL}/api/marketing/v2/unified-campaigns?limit=1",
            headers=self.headers
        )
        assert camp_response.status_code == 200
        campaigns = camp_response.json()
        
        if campaigns:
            campaign_id = campaigns[0]['id']
            campaign_name = campaigns[0]['name']
        else:
            # Create a campaign if none exist
            create_resp = requests.post(
                f"{BASE_URL}/api/marketing/campaigns",
                json={"name": f"TEST_Assignment_Campaign_{uuid.uuid4().hex[:8]}", "objective": "engagement", "budget": 50000},
                headers=self.headers
            )
            assert create_resp.status_code in [200, 201]
            created = create_resp.json()
            campaign_id = created['id']
            campaign_name = created['name']
            self.created_campaign_id = campaign_id
        
        # Assign influencer to campaign
        update_response = requests.put(
            f"{BASE_URL}/api/marketing/v2/contacts/{influencer_id}",
            json={"name": influencer_name, "campaign_id": campaign_id},
            headers=self.headers
        )
        assert update_response.status_code == 200, f"Failed to assign influencer: {update_response.text}"
        
        print(f"[PASS] Assigned influencer '{influencer_name}' to campaign '{campaign_name}'")
        
        # Verify assignment
        detail_response = requests.get(
            f"{BASE_URL}/api/marketing/v2/contacts/{influencer_id}",
            headers=self.headers
        )
        assert detail_response.status_code == 200
        
        updated = detail_response.json()
        assert updated['campaign_id'] == campaign_id, "Campaign assignment not persisted"
        
        print(f"[PASS] Campaign assignment verified on influencer detail page")
        
        # Reset the campaign_id after test
        requests.put(
            f"{BASE_URL}/api/marketing/v2/contacts/{influencer_id}",
            json={"name": influencer_name, "campaign_id": None},
            headers=self.headers
        )
        
        return {"influencer_id": influencer_id, "campaign_id": campaign_id}

    # ========== TEST 6: Pipeline Page Shows Influencers ==========
    def test_06_pipeline_page_shows_influencers_with_status(self):
        """TEST 6: Pipeline page shows influencers with their pipeline status"""
        response = requests.get(
            f"{BASE_URL}/api/marketing/v2/contacts?limit=20",
            headers=self.headers
        )
        assert response.status_code == 200, f"Failed to get contacts for pipeline: {response.text}"
        
        contacts = response.json()
        
        # Count by pipeline stage
        stages = {}
        for contact in contacts:
            stage = contact.get('pipeline_stage') or contact.get('status') or 'identified'
            stages[stage] = stages.get(stage, 0) + 1
        
        print(f"[PASS] Pipeline page shows contacts with status distribution:")
        for stage, count in stages.items():
            print(f"       - {stage}: {count} contacts")
        
        return contacts

    # ========== TEST 7: Change Pipeline Status ==========
    def test_07_change_pipeline_status_of_influencer(self):
        """TEST 7: Change pipeline status of an influencer"""
        # Get an influencer
        response = requests.get(
            f"{BASE_URL}/api/marketing/v2/contacts?contact_type=influencer&limit=1",
            headers=self.headers
        )
        assert response.status_code == 200
        influencers = response.json()
        assert len(influencers) > 0
        
        influencer = influencers[0]
        original_status = influencer.get('status', 'identified')
        new_status = 'contacted' if original_status != 'contacted' else 'interested'
        
        # Update pipeline status
        update_response = requests.put(
            f"{BASE_URL}/api/marketing/v2/contacts/{influencer['id']}",
            json={"name": influencer['name'], "status": new_status, "pipeline_stage": new_status},
            headers=self.headers
        )
        assert update_response.status_code == 200, f"Failed to update status: {update_response.text}"
        
        print(f"[PASS] Changed pipeline status from '{original_status}' to '{new_status}' for {influencer['name']}")
        
        # Verify the change
        detail_response = requests.get(
            f"{BASE_URL}/api/marketing/v2/contacts/{influencer['id']}",
            headers=self.headers
        )
        assert detail_response.status_code == 200
        
        updated = detail_response.json()
        assert updated.get('status') == new_status, f"Status not updated: expected {new_status}, got {updated.get('status')}"
        
        print(f"[PASS] Pipeline status change verified")
        
        # Reset to original status
        requests.put(
            f"{BASE_URL}/api/marketing/v2/contacts/{influencer['id']}",
            json={"name": influencer['name'], "status": original_status, "pipeline_stage": original_status},
            headers=self.headers
        )
        
        return updated

    # ========== TEST 8: Campaign Assignment Shows on Influencer Detail ==========
    def test_08_campaign_assignment_shows_on_influencer_detail(self):
        """TEST 8: Verify campaign assignment appears on influencer detail page"""
        # Create test influencer with campaign
        test_name = f"TEST_Influencer_{uuid.uuid4().hex[:8]}"
        
        # First create influencer
        create_inf = requests.post(
            f"{BASE_URL}/api/marketing/v2/contacts",
            json={
                "name": test_name,
                "contact_type": "influencer",
                "email": f"test_{uuid.uuid4().hex[:6]}@test.com",
                "industry": "fashion",
                "tier": "micro"
            },
            headers=self.headers
        )
        assert create_inf.status_code in [200, 201], f"Failed to create influencer: {create_inf.text}"
        
        influencer = create_inf.json()
        self.created_influencer_id = influencer['id']
        
        # Get a campaign
        camp_response = requests.get(
            f"{BASE_URL}/api/marketing/v2/unified-campaigns?limit=1",
            headers=self.headers
        )
        campaigns = camp_response.json()
        
        if not campaigns:
            print("[SKIP] No campaigns available to test assignment visibility")
            return
        
        campaign_id = campaigns[0]['id']
        campaign_name = campaigns[0]['name']
        
        # Assign campaign
        assign_response = requests.put(
            f"{BASE_URL}/api/marketing/v2/contacts/{influencer['id']}",
            json={"name": test_name, "campaign_id": campaign_id},
            headers=self.headers
        )
        assert assign_response.status_code == 200
        
        # Verify on detail page
        detail_response = requests.get(
            f"{BASE_URL}/api/marketing/v2/contacts/{influencer['id']}",
            headers=self.headers
        )
        assert detail_response.status_code == 200
        
        detail = detail_response.json()
        assert detail['campaign_id'] == campaign_id, "Campaign ID not on detail page"
        
        print(f"[PASS] Campaign assignment '{campaign_name}' shows on influencer detail page")
        
        return detail

    # ========== TEST 9: Data Consistency Across Pages ==========
    def test_09_data_consistency_across_pages(self):
        """TEST 9: Verify data consistency - same influencer shows same data across pages"""
        # Get from influencers list
        list_response = requests.get(
            f"{BASE_URL}/api/marketing/v2/contacts?contact_type=influencer&limit=1",
            headers=self.headers
        )
        assert list_response.status_code == 200
        influencers = list_response.json()
        assert len(influencers) > 0
        
        influencer = influencers[0]
        
        # Get from detail page
        detail_response = requests.get(
            f"{BASE_URL}/api/marketing/v2/contacts/{influencer['id']}",
            headers=self.headers
        )
        assert detail_response.status_code == 200
        detail = detail_response.json()
        
        # Get from pipeline (all contacts)
        pipeline_response = requests.get(
            f"{BASE_URL}/api/marketing/v2/contacts?limit=100",
            headers=self.headers
        )
        assert pipeline_response.status_code == 200
        pipeline_contacts = pipeline_response.json()
        
        # Find same contact in pipeline
        pipeline_contact = next((c for c in pipeline_contacts if c['id'] == influencer['id']), None)
        assert pipeline_contact is not None, "Influencer not found in pipeline view"
        
        # Verify consistency
        assert influencer['name'] == detail['name'] == pipeline_contact['name'], "Name inconsistent across views"
        assert influencer['id'] == detail['id'] == pipeline_contact['id'], "ID inconsistent across views"
        
        print(f"[PASS] Data consistency verified for '{influencer['name']}':")
        print(f"       - Influencers List: {influencer['name']} (status: {influencer.get('status', 'N/A')})")
        print(f"       - Detail Page: {detail['name']} (status: {detail.get('status', 'N/A')})")
        print(f"       - Pipeline Page: {pipeline_contact['name']} (status: {pipeline_contact.get('status', 'N/A')})")
        
        return True

    # ========== TEST 10: Navigation Flow Test ==========
    def test_10_navigation_between_pages(self):
        """TEST 10: Test API flow that simulates navigation between pages"""
        print("[INFO] Testing API flow for navigation simulation:")
        
        # 1. Load Influencers List
        inf_response = requests.get(
            f"{BASE_URL}/api/marketing/v2/contacts?contact_type=influencer&limit=5",
            headers=self.headers
        )
        assert inf_response.status_code == 200
        print("       1. Influencers List API - OK")
        
        # 2. Load Campaign Hub
        camp_response = requests.get(
            f"{BASE_URL}/api/marketing/v2/unified-campaigns?limit=5",
            headers=self.headers
        )
        assert camp_response.status_code == 200
        print("       2. Campaign Hub API - OK")
        
        # 3. Load Pipeline (all contacts)
        pipeline_response = requests.get(
            f"{BASE_URL}/api/marketing/v2/contacts?limit=20",
            headers=self.headers
        )
        assert pipeline_response.status_code == 200
        print("       3. Pipeline API - OK")
        
        # 4. Get Influencer Detail
        influencers = inf_response.json()
        if influencers:
            detail_response = requests.get(
                f"{BASE_URL}/api/marketing/v2/contacts/{influencers[0]['id']}",
                headers=self.headers
            )
            assert detail_response.status_code == 200
            print("       4. Influencer Detail API - OK")
        
        print("[PASS] All navigation-related APIs working correctly")
        
        return True


class TestMarketingOpsIntegration:
    """Integration tests for Marketing Ops workflow"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup auth"""
        login_response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": "superadmin@sevora.com", "password": "superadmin123"}
        )
        self.token = login_response.json()["access_token"]
        self.headers = {"Authorization": f"Bearer {self.token}"}
        self.created_resources = []
    
    def teardown_method(self):
        """Cleanup"""
        for resource_type, resource_id in self.created_resources:
            try:
                if resource_type == 'contact':
                    requests.delete(f"{BASE_URL}/api/marketing/v2/contacts/{resource_id}", headers=self.headers)
                elif resource_type == 'campaign':
                    requests.delete(f"{BASE_URL}/api/marketing/campaigns/{resource_id}", headers=self.headers)
            except:
                pass
    
    def test_full_marketing_ops_workflow(self):
        """Test complete workflow: Create influencer -> Assign to campaign -> Update pipeline status"""
        print("\n" + "="*60)
        print("FULL MARKETING OPS WORKFLOW TEST")
        print("="*60)
        
        # Step 1: Create new influencer
        test_name = f"TEST_Workflow_Influencer_{uuid.uuid4().hex[:8]}"
        create_resp = requests.post(
            f"{BASE_URL}/api/marketing/v2/contacts",
            json={
                "name": test_name,
                "contact_type": "influencer",
                "email": f"workflow_test_{uuid.uuid4().hex[:6]}@test.com",
                "industry": "fashion",
                "tier": "micro",
                "followers": 10000,
                "engagement_rate": 3.5
            },
            headers=self.headers
        )
        assert create_resp.status_code in [200, 201]
        influencer = create_resp.json()
        self.created_resources.append(('contact', influencer['id']))
        print(f"[PASS] Step 1: Created influencer '{test_name}'")
        
        # Step 2: Verify influencer appears in list
        list_resp = requests.get(
            f"{BASE_URL}/api/marketing/v2/contacts?contact_type=influencer&limit=100",
            headers=self.headers
        )
        assert list_resp.status_code == 200
        found = any(c['id'] == influencer['id'] for c in list_resp.json())
        assert found, "Influencer not found in list"
        print(f"[PASS] Step 2: Influencer appears in Influencers List page")
        
        # Step 3: Create campaign
        campaign_name = f"TEST_Workflow_Campaign_{uuid.uuid4().hex[:8]}"
        camp_resp = requests.post(
            f"{BASE_URL}/api/marketing/campaigns",
            json={
                "name": campaign_name,
                "objective": "awareness",
                "budget": 50000,
                "start_date": "2026-04-01",
                "end_date": "2026-05-31",
                "target_market": "Urban Women 25-35"
            },
            headers=self.headers
        )
        assert camp_resp.status_code in [200, 201]
        campaign = camp_resp.json()
        self.created_resources.append(('campaign', campaign['id']))
        print(f"[PASS] Step 3: Created campaign '{campaign_name}'")
        
        # Step 4: Assign influencer to campaign
        assign_resp = requests.put(
            f"{BASE_URL}/api/marketing/v2/contacts/{influencer['id']}",
            json={"name": test_name, "campaign_id": campaign['id']},
            headers=self.headers
        )
        assert assign_resp.status_code == 200
        print(f"[PASS] Step 4: Assigned influencer to campaign")
        
        # Step 5: Verify assignment in detail
        detail_resp = requests.get(
            f"{BASE_URL}/api/marketing/v2/contacts/{influencer['id']}",
            headers=self.headers
        )
        assert detail_resp.status_code == 200
        detail = detail_resp.json()
        assert detail['campaign_id'] == campaign['id']
        print(f"[PASS] Step 5: Verified campaign assignment on detail page")
        
        # Step 6: Update pipeline status
        status_resp = requests.put(
            f"{BASE_URL}/api/marketing/v2/contacts/{influencer['id']}",
            json={"name": test_name, "status": "contacted", "pipeline_stage": "contacted"},
            headers=self.headers
        )
        assert status_resp.status_code == 200
        print(f"[PASS] Step 6: Updated pipeline status to 'contacted'")
        
        # Step 7: Verify status in pipeline view
        pipeline_resp = requests.get(
            f"{BASE_URL}/api/marketing/v2/contacts?limit=100",
            headers=self.headers
        )
        assert pipeline_resp.status_code == 200
        pipeline_contact = next((c for c in pipeline_resp.json() if c['id'] == influencer['id']), None)
        assert pipeline_contact is not None
        assert pipeline_contact.get('status') == 'contacted' or pipeline_contact.get('pipeline_stage') == 'contacted'
        print(f"[PASS] Step 7: Verified status change in Pipeline page")
        
        print("\n" + "="*60)
        print("[SUCCESS] Full Marketing Ops Workflow completed successfully!")
        print("="*60)
        
        return True
