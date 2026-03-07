"""
Test Digital PR Platform - Phases 5, 8, 9, 10
- Phase 5: Relationship CRM (Interactions, Contact History, Top Contacts)
- Phase 8: Press Kit Management (Assets, Press Kits)
- Phase 9: Alerts & Monitoring (Alerts, Triggers, Stats)
- Phase 10: Pipeline View (Board, Stage Movement, Stats)

Test credentials: marketing@sevora.com / admin123
"""

import pytest
import requests
import os
import uuid
from datetime import datetime

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test data identifiers
TEST_PREFIX = f"TEST_P5810_{datetime.now().strftime('%H%M%S')}"


@pytest.fixture(scope="module")
def auth_token():
    """Get authentication token for marketing user"""
    response = requests.post(
        f"{BASE_URL}/api/auth/login",
        json={"email": "marketing@sevora.com", "password": "admin123"}
    )
    if response.status_code != 200:
        pytest.skip(f"Auth failed: {response.status_code} - {response.text}")
    return response.json().get("access_token")


@pytest.fixture(scope="module")
def headers(auth_token):
    """Request headers with auth token"""
    return {
        "Authorization": f"Bearer {auth_token}",
        "Content-Type": "application/json"
    }


@pytest.fixture(scope="module")
def journalist_contact(headers):
    """Get or create a journalist contact for testing"""
    # First try to get existing journalists
    response = requests.get(
        f"{BASE_URL}/api/marketing/v2/contacts",
        params={"contact_type": "journalist", "limit": 5},
        headers=headers
    )
    if response.status_code == 200 and response.json():
        return response.json()[0]
    pytest.skip("No journalist contacts available for testing")


# ============== PHASE 5: RELATIONSHIP CRM ==============

class TestPhase5RelationshipCRM:
    """Tests for Relationship CRM - Interactions, History, Top Contacts"""
    
    def test_get_interactions_list(self, headers):
        """GET /api/marketing/v2/relationships/interactions - List interactions"""
        response = requests.get(
            f"{BASE_URL}/api/marketing/v2/relationships/interactions",
            headers=headers
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert isinstance(data, list), "Expected list response"
        print(f"PASS: GET interactions - returned {len(data)} interactions")
    
    def test_create_interaction(self, headers, journalist_contact):
        """POST /api/marketing/v2/relationships/interactions - Create interaction"""
        interaction_data = {
            "contact_id": journalist_contact["id"],
            "interaction_type": "email",
            "subject": f"{TEST_PREFIX} Test Email Interaction",
            "notes": "Testing interaction logging functionality",
            "outcome": "positive"
        }
        response = requests.post(
            f"{BASE_URL}/api/marketing/v2/relationships/interactions",
            json=interaction_data,
            headers=headers
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert data.get("id"), "Expected interaction ID"
        assert data.get("contact_id") == journalist_contact["id"]
        assert data.get("interaction_type") == "email"
        assert data.get("outcome") == "positive"
        print(f"PASS: POST interaction created - ID: {data.get('id')}")
        return data
    
    def test_create_interaction_with_call_type(self, headers, journalist_contact):
        """POST interaction with call type and follow-up date"""
        interaction_data = {
            "contact_id": journalist_contact["id"],
            "interaction_type": "call",
            "subject": f"{TEST_PREFIX} Phone call follow-up",
            "notes": "Discussed potential collaboration",
            "outcome": "neutral",
            "follow_up_date": "2026-02-15"
        }
        response = requests.post(
            f"{BASE_URL}/api/marketing/v2/relationships/interactions",
            json=interaction_data,
            headers=headers
        )
        assert response.status_code == 200
        data = response.json()
        assert data.get("interaction_type") == "call"
        print(f"PASS: POST interaction (call) created")
    
    def test_create_interaction_missing_contact(self, headers):
        """POST interaction with invalid contact ID returns 404"""
        interaction_data = {
            "contact_id": "non-existent-contact-id",
            "interaction_type": "email",
            "notes": "Test"
        }
        response = requests.post(
            f"{BASE_URL}/api/marketing/v2/relationships/interactions",
            json=interaction_data,
            headers=headers
        )
        assert response.status_code == 404, f"Expected 404 for non-existent contact, got {response.status_code}"
        print("PASS: POST interaction 404 for non-existent contact")
    
    def test_get_contact_history(self, headers, journalist_contact):
        """GET /api/marketing/v2/relationships/contacts/{id}/history - Get contact history"""
        response = requests.get(
            f"{BASE_URL}/api/marketing/v2/relationships/contacts/{journalist_contact['id']}/history",
            headers=headers
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert "contact" in data, "Expected contact details"
        assert "interactions" in data, "Expected interactions list"
        assert "pitches" in data, "Expected pitches list"
        assert "coverage" in data, "Expected coverage list"
        assert "stats" in data, "Expected stats object"
        print(f"PASS: GET contact history - interactions: {len(data.get('interactions', []))}, pitches: {len(data.get('pitches', []))}")
    
    def test_get_contact_history_not_found(self, headers):
        """GET contact history for non-existent contact returns 404"""
        response = requests.get(
            f"{BASE_URL}/api/marketing/v2/relationships/contacts/non-existent-id/history",
            headers=headers
        )
        assert response.status_code == 404
        print("PASS: GET contact history 404 for non-existent contact")
    
    def test_get_top_contacts(self, headers):
        """GET /api/marketing/v2/relationships/top-contacts - Get top contacts by score"""
        response = requests.get(
            f"{BASE_URL}/api/marketing/v2/relationships/top-contacts",
            params={"limit": 10},
            headers=headers
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert isinstance(data, list), "Expected list of top contacts"
        print(f"PASS: GET top contacts - returned {len(data)} contacts")
    
    def test_interactions_require_auth(self):
        """Verify interactions endpoints require authentication"""
        response = requests.get(f"{BASE_URL}/api/marketing/v2/relationships/interactions")
        assert response.status_code in [401, 403], f"Expected auth error, got {response.status_code}"
        print("PASS: Interactions endpoints require auth")


# ============== PHASE 8: PRESS KIT MANAGEMENT ==============

class TestPhase8PressKitAssets:
    """Tests for Press Kit Assets"""
    
    def test_get_assets_list(self, headers):
        """GET /api/marketing/v2/press-kits/assets - List assets"""
        response = requests.get(
            f"{BASE_URL}/api/marketing/v2/press-kits/assets",
            headers=headers
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert isinstance(data, list), "Expected list of assets"
        print(f"PASS: GET assets - returned {len(data)} assets")
    
    def test_create_asset(self, headers):
        """POST /api/marketing/v2/press-kits/assets - Create asset"""
        asset_data = {
            "name": f"{TEST_PREFIX} Company Logo",
            "asset_type": "logo",
            "description": "Primary company logo for press use",
            "file_url": "https://example.com/logo.png",
            "file_size": 1024000,
            "file_format": "png",
            "is_public": True,
            "tags": ["logo", "branding"],
            "category": "Company"
        }
        response = requests.post(
            f"{BASE_URL}/api/marketing/v2/press-kits/assets",
            json=asset_data,
            headers=headers
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert data.get("id"), "Expected asset ID"
        assert data.get("name") == asset_data["name"]
        assert data.get("asset_type") == "logo"
        assert data.get("is_public") == True
        print(f"PASS: POST asset created - ID: {data.get('id')}")
        return data.get("id")
    
    def test_create_asset_product_image(self, headers):
        """POST asset with product_image type"""
        asset_data = {
            "name": f"{TEST_PREFIX} Product Showcase",
            "asset_type": "product_image",
            "description": "High-res product image",
            "file_url": "https://example.com/product.jpg",
            "is_public": True,
            "category": "Products"
        }
        response = requests.post(
            f"{BASE_URL}/api/marketing/v2/press-kits/assets",
            json=asset_data,
            headers=headers
        )
        assert response.status_code == 200
        data = response.json()
        assert data.get("asset_type") == "product_image"
        print(f"PASS: POST asset (product_image) created")
        return data.get("id")
    
    def test_assets_require_auth(self):
        """Verify assets endpoints require authentication"""
        response = requests.get(f"{BASE_URL}/api/marketing/v2/press-kits/assets")
        assert response.status_code in [401, 403], f"Expected auth error, got {response.status_code}"
        print("PASS: Assets endpoints require auth")


class TestPhase8PressKits:
    """Tests for Press Kits"""
    
    def test_get_press_kits_list(self, headers):
        """GET /api/marketing/v2/press-kits - List press kits"""
        response = requests.get(
            f"{BASE_URL}/api/marketing/v2/press-kits",
            headers=headers
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert isinstance(data, list), "Expected list of press kits"
        print(f"PASS: GET press kits - returned {len(data)} kits")
    
    def test_create_press_kit(self, headers):
        """POST /api/marketing/v2/press-kits - Create press kit"""
        kit_data = {
            "name": f"{TEST_PREFIX} Spring Collection Press Kit",
            "description": "Complete press kit for Spring 2026 collection launch",
            "asset_ids": [],
            "is_active": True,
            "password_protected": False
        }
        response = requests.post(
            f"{BASE_URL}/api/marketing/v2/press-kits",
            json=kit_data,
            headers=headers
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert data.get("id"), "Expected press kit ID"
        assert data.get("name") == kit_data["name"]
        assert data.get("share_url"), "Expected share URL"
        assert data.get("is_active") == True
        print(f"PASS: POST press kit created - ID: {data.get('id')}, share_url: {data.get('share_url')}")
        return data
    
    def test_create_press_kit_with_assets(self, headers):
        """POST press kit with assets"""
        # First create an asset
        asset_response = requests.post(
            f"{BASE_URL}/api/marketing/v2/press-kits/assets",
            json={
                "name": f"{TEST_PREFIX} Press Kit Asset",
                "asset_type": "company_fact_sheet",
                "file_url": "https://example.com/factsheet.pdf",
                "is_public": True
            },
            headers=headers
        )
        asset_id = asset_response.json().get("id")
        
        # Create press kit with that asset
        kit_data = {
            "name": f"{TEST_PREFIX} Kit with Assets",
            "description": "Press kit containing assets",
            "asset_ids": [asset_id] if asset_id else [],
            "is_active": True
        }
        response = requests.post(
            f"{BASE_URL}/api/marketing/v2/press-kits",
            json=kit_data,
            headers=headers
        )
        assert response.status_code == 200
        data = response.json()
        assert data.get("assets") or data.get("asset_ids"), "Expected assets in response"
        print(f"PASS: POST press kit with assets created")
    
    def test_press_kits_require_auth(self):
        """Verify press kits endpoints require authentication"""
        response = requests.get(f"{BASE_URL}/api/marketing/v2/press-kits")
        assert response.status_code in [401, 403], f"Expected auth error, got {response.status_code}"
        print("PASS: Press kits endpoints require auth")


# ============== PHASE 9: ALERTS & MONITORING ==============

class TestPhase9MonitoringAlerts:
    """Tests for Monitoring Alerts"""
    
    def test_get_alerts_list(self, headers):
        """GET /api/marketing/v2/monitoring/alerts - List alerts"""
        response = requests.get(
            f"{BASE_URL}/api/marketing/v2/monitoring/alerts",
            headers=headers
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert isinstance(data, list), "Expected list of alerts"
        print(f"PASS: GET alerts - returned {len(data)} alerts")
    
    def test_create_alert_brand_mention(self, headers):
        """POST /api/marketing/v2/monitoring/alerts - Create brand mention alert"""
        alert_data = {
            "name": f"{TEST_PREFIX} Brand Mention Alert",
            "alert_type": "brand_mention",
            "keywords": ["Sevora", "Sevora Fashion"],
            "sources": ["Vogue", "Elle", "Harper's Bazaar"],
            "is_active": True,
            "notify_email": True,
            "notify_in_app": True,
            "priority": "high"
        }
        response = requests.post(
            f"{BASE_URL}/api/marketing/v2/monitoring/alerts",
            json=alert_data,
            headers=headers
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert data.get("id"), "Expected alert ID"
        assert data.get("name") == alert_data["name"]
        assert data.get("alert_type") == "brand_mention"
        assert data.get("priority") == "high"
        assert data.get("is_active") == True
        print(f"PASS: POST alert (brand_mention) created - ID: {data.get('id')}")
        return data
    
    def test_create_alert_keyword(self, headers):
        """POST alert with keyword type"""
        alert_data = {
            "name": f"{TEST_PREFIX} Keyword Alert",
            "alert_type": "keyword",
            "keywords": ["sustainable fashion", "eco-friendly"],
            "is_active": True,
            "priority": "medium"
        }
        response = requests.post(
            f"{BASE_URL}/api/marketing/v2/monitoring/alerts",
            json=alert_data,
            headers=headers
        )
        assert response.status_code == 200
        data = response.json()
        assert data.get("alert_type") == "keyword"
        print(f"PASS: POST alert (keyword) created")
        return data
    
    def test_create_alert_competitor(self, headers):
        """POST alert with competitor type"""
        alert_data = {
            "name": f"{TEST_PREFIX} Competitor Alert",
            "alert_type": "competitor",
            "keywords": ["Zara", "H&M", "Mango"],
            "is_active": True,
            "priority": "low"
        }
        response = requests.post(
            f"{BASE_URL}/api/marketing/v2/monitoring/alerts",
            json=alert_data,
            headers=headers
        )
        assert response.status_code == 200
        print(f"PASS: POST alert (competitor) created")
    
    def test_get_monitoring_stats(self, headers):
        """GET /api/marketing/v2/monitoring/stats - Get monitoring stats"""
        response = requests.get(
            f"{BASE_URL}/api/marketing/v2/monitoring/stats",
            headers=headers
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert "alerts" in data, "Expected alerts stats"
        assert "triggers" in data, "Expected triggers stats"
        assert "total" in data["alerts"], "Expected total alerts count"
        assert "active" in data["alerts"], "Expected active alerts count"
        print(f"PASS: GET monitoring stats - alerts: {data['alerts']['total']}, active: {data['alerts']['active']}")
    
    def test_alerts_require_auth(self):
        """Verify alerts endpoints require authentication"""
        response = requests.get(f"{BASE_URL}/api/marketing/v2/monitoring/alerts")
        assert response.status_code in [401, 403], f"Expected auth error, got {response.status_code}"
        print("PASS: Alerts endpoints require auth")


class TestPhase9Triggers:
    """Tests for Alert Triggers"""
    
    @pytest.fixture
    def test_alert(self, headers):
        """Create a test alert for trigger tests"""
        alert_data = {
            "name": f"{TEST_PREFIX} Trigger Test Alert",
            "alert_type": "brand_mention",
            "keywords": ["test"],
            "is_active": True,
            "priority": "medium"
        }
        response = requests.post(
            f"{BASE_URL}/api/marketing/v2/monitoring/alerts",
            json=alert_data,
            headers=headers
        )
        if response.status_code == 200:
            return response.json()
        pytest.skip("Could not create test alert")
    
    def test_get_triggers_list(self, headers):
        """GET /api/marketing/v2/monitoring/triggers - List triggers"""
        response = requests.get(
            f"{BASE_URL}/api/marketing/v2/monitoring/triggers",
            params={"limit": 20},
            headers=headers
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert isinstance(data, list), "Expected list of triggers"
        print(f"PASS: GET triggers - returned {len(data)} triggers")
    
    def test_create_trigger(self, headers, test_alert):
        """POST /api/marketing/v2/monitoring/triggers - Create trigger"""
        trigger_data = {
            "alert_id": test_alert["id"],
            "title": f"{TEST_PREFIX} New Brand Coverage",
            "source": "Vogue India",
            "url": "https://vogue.in/article/test-coverage",
            "snippet": "Sevora showcases latest sustainable fashion line...",
            "sentiment": "positive",
            "matched_keywords": ["Sevora", "sustainable"]
        }
        response = requests.post(
            f"{BASE_URL}/api/marketing/v2/monitoring/triggers",
            json=trigger_data,
            headers=headers
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert data.get("id"), "Expected trigger ID"
        assert data.get("alert_id") == test_alert["id"]
        assert data.get("sentiment") == "positive"
        assert data.get("is_read") == False
        print(f"PASS: POST trigger created - ID: {data.get('id')}")
    
    def test_create_trigger_invalid_alert(self, headers):
        """POST trigger with invalid alert ID returns 404"""
        trigger_data = {
            "alert_id": "non-existent-alert-id",
            "title": "Test",
            "source": "Test Source"
        }
        response = requests.post(
            f"{BASE_URL}/api/marketing/v2/monitoring/triggers",
            json=trigger_data,
            headers=headers
        )
        assert response.status_code == 404, f"Expected 404 for non-existent alert, got {response.status_code}"
        print("PASS: POST trigger 404 for non-existent alert")


# ============== PHASE 10: PIPELINE VIEW ==============

class TestPhase10Pipeline:
    """Tests for Pipeline View - Kanban Board, Stage Movement, Stats"""
    
    def test_get_pipeline_board(self, headers):
        """GET /api/marketing/v2/pipeline/board - Get pipeline Kanban board"""
        response = requests.get(
            f"{BASE_URL}/api/marketing/v2/pipeline/board",
            headers=headers
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert isinstance(data, list), "Expected list of stages"
        
        # Verify all 9 stages are present
        stage_ids = [s.get("id") for s in data]
        expected_stages = ["prospect", "researching", "contacted", "replied", "interested", "negotiating", "confirmed", "published", "declined"]
        for stage in expected_stages:
            assert stage in stage_ids, f"Missing stage: {stage}"
        
        # Verify each stage has count and contacts
        for stage in data:
            assert "count" in stage, f"Stage {stage.get('id')} missing count"
            assert "contacts" in stage, f"Stage {stage.get('id')} missing contacts"
        
        total_contacts = sum(s.get("count", 0) for s in data)
        print(f"PASS: GET pipeline board - {len(data)} stages, {total_contacts} total contacts")
    
    def test_get_pipeline_stats(self, headers):
        """GET /api/marketing/v2/pipeline/stats - Get pipeline statistics"""
        response = requests.get(
            f"{BASE_URL}/api/marketing/v2/pipeline/stats",
            headers=headers
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert "total" in data, "Expected total count"
        assert "by_stage" in data, "Expected by_stage breakdown"
        assert "conversion" in data, "Expected conversion rates"
        assert "contact_rate" in data["conversion"]
        assert "response_rate" in data["conversion"]
        assert "publish_rate" in data["conversion"]
        print(f"PASS: GET pipeline stats - total: {data['total']}, contact_rate: {data['conversion']['contact_rate']:.1f}%")
    
    def test_move_contact_stage(self, headers, journalist_contact):
        """PUT /api/marketing/v2/pipeline/contacts/{id}/stage - Move contact stage"""
        # Move to 'researching' stage
        response = requests.put(
            f"{BASE_URL}/api/marketing/v2/pipeline/contacts/{journalist_contact['id']}/stage",
            params={"stage": "researching"},
            headers=headers
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert "message" in data
        print(f"PASS: PUT contact stage - moved to 'researching'")
        
        # Move to 'contacted' stage
        response = requests.put(
            f"{BASE_URL}/api/marketing/v2/pipeline/contacts/{journalist_contact['id']}/stage",
            params={"stage": "contacted"},
            headers=headers
        )
        assert response.status_code == 200
        print(f"PASS: PUT contact stage - moved to 'contacted'")
    
    def test_move_contact_invalid_stage(self, headers, journalist_contact):
        """PUT contact to invalid stage returns 400"""
        response = requests.put(
            f"{BASE_URL}/api/marketing/v2/pipeline/contacts/{journalist_contact['id']}/stage",
            params={"stage": "invalid_stage"},
            headers=headers
        )
        assert response.status_code == 400, f"Expected 400 for invalid stage, got {response.status_code}"
        print("PASS: PUT contact stage 400 for invalid stage")
    
    def test_move_nonexistent_contact(self, headers):
        """PUT non-existent contact returns 404"""
        response = requests.put(
            f"{BASE_URL}/api/marketing/v2/pipeline/contacts/non-existent-id/stage",
            params={"stage": "contacted"},
            headers=headers
        )
        assert response.status_code == 404, f"Expected 404 for non-existent contact, got {response.status_code}"
        print("PASS: PUT contact stage 404 for non-existent contact")
    
    def test_pipeline_require_auth(self):
        """Verify pipeline endpoints require authentication"""
        response = requests.get(f"{BASE_URL}/api/marketing/v2/pipeline/board")
        assert response.status_code in [401, 403], f"Expected auth error, got {response.status_code}"
        print("PASS: Pipeline endpoints require auth")


# ============== VERIFY DATA PERSISTENCE ==============

class TestDataPersistence:
    """Verify CRUD operations persist data correctly"""
    
    def test_interaction_persists_to_history(self, headers, journalist_contact):
        """Create interaction and verify it appears in contact history"""
        # Create interaction
        interaction_data = {
            "contact_id": journalist_contact["id"],
            "interaction_type": "meeting",
            "subject": f"{TEST_PREFIX} Persistence Test Meeting",
            "notes": "Testing data persistence",
            "outcome": "positive"
        }
        create_response = requests.post(
            f"{BASE_URL}/api/marketing/v2/relationships/interactions",
            json=interaction_data,
            headers=headers
        )
        assert create_response.status_code == 200
        created = create_response.json()
        
        # Verify in history
        history_response = requests.get(
            f"{BASE_URL}/api/marketing/v2/relationships/contacts/{journalist_contact['id']}/history",
            headers=headers
        )
        assert history_response.status_code == 200
        history = history_response.json()
        
        # Find our interaction
        found = any(i.get("id") == created["id"] for i in history.get("interactions", []))
        assert found, "Created interaction not found in contact history"
        print("PASS: Interaction persisted to contact history")
    
    def test_press_kit_asset_count(self, headers):
        """Create press kit with assets and verify asset count"""
        # Create asset
        asset_response = requests.post(
            f"{BASE_URL}/api/marketing/v2/press-kits/assets",
            json={
                "name": f"{TEST_PREFIX} Count Test Asset",
                "asset_type": "logo",
                "file_url": "https://example.com/test.png",
                "is_public": True
            },
            headers=headers
        )
        asset_id = asset_response.json().get("id")
        
        # Create kit with asset
        kit_response = requests.post(
            f"{BASE_URL}/api/marketing/v2/press-kits",
            json={
                "name": f"{TEST_PREFIX} Count Test Kit",
                "asset_ids": [asset_id]
            },
            headers=headers
        )
        assert kit_response.status_code == 200
        kit = kit_response.json()
        
        # Verify asset is included
        assert asset_id in kit.get("asset_ids", []) or len(kit.get("assets", [])) > 0
        print("PASS: Press kit asset count verified")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
