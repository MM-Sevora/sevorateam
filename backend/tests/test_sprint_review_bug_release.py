"""
Test Sprint Review Module (Priority 4) and Bug + Release Integration (Priority 5)

Sprint Review Features:
- Create sprint review with demo items and stakeholders
- List/Get sprint reviews
- Update sprint review
- Submit stakeholder feedback with rating and approval
- Delete sprint review

Bug + Release Integration Features:
- Link bug to release and optionally to sprint
- Update bug status through workflow
- Get all bugs linked to a release
- Verify bug in release
- Mark release as released
- Get bug workflow overview
"""

import pytest
import requests
import os
from datetime import datetime

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestSprintReviewAndBugRelease:
    """Test Sprint Review and Bug+Release Integration APIs"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup test fixtures - login and get auth token"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        
        # Login
        login_response = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@sevora.com",
            "password": "admin123"
        })
        assert login_response.status_code == 200, f"Login failed: {login_response.text}"
        
        token = login_response.json().get("access_token")
        assert token, "No access token received"
        self.session.headers.update({"Authorization": f"Bearer {token}"})
        
        # Get a project and sprint for testing
        projects_res = self.session.get(f"{BASE_URL}/api/projects/list")
        assert projects_res.status_code == 200
        projects = projects_res.json()
        assert len(projects) > 0, "No projects found for testing"
        self.project_id = projects[0]["id"]
        self.project_name = projects[0]["name"]
        
        # Get sprints for the project - endpoint is /{project_id}/sprints
        sprints_res = self.session.get(f"{BASE_URL}/api/projects/{self.project_id}/sprints")
        if sprints_res.status_code == 200:
            sprints = sprints_res.json()
            if len(sprints) > 0:
                self.sprint_id = sprints[0]["id"]
                self.sprint_name = sprints[0]["name"]
            else:
                # Create a sprint if none exists
                sprint_data = {
                    "project_id": self.project_id,
                    "name": "TEST_Sprint_For_Review",
                    "goal": "Test sprint for review testing",
                    "start_date": "2026-01-01",
                    "end_date": "2026-01-14"
                }
                create_sprint_res = self.session.post(f"{BASE_URL}/api/projects/{self.project_id}/sprints", json=sprint_data)
                assert create_sprint_res.status_code in [200, 201], f"Failed to create sprint: {create_sprint_res.text}"
                sprint = create_sprint_res.json()
                self.sprint_id = sprint["id"]
                self.sprint_name = sprint["name"]
        else:
            # Create a sprint if endpoint fails
            sprint_data = {
                "project_id": self.project_id,
                "name": "TEST_Sprint_For_Review",
                "goal": "Test sprint for review testing",
                "start_date": "2026-01-01",
                "end_date": "2026-01-14"
            }
            create_sprint_res = self.session.post(f"{BASE_URL}/api/projects/{self.project_id}/sprints", json=sprint_data)
            if create_sprint_res.status_code in [200, 201]:
                sprint = create_sprint_res.json()
                self.sprint_id = sprint["id"]
                self.sprint_name = sprint["name"]
            else:
                # Use a placeholder sprint ID for testing
                self.sprint_id = "test-sprint-placeholder"
                self.sprint_name = "Test Sprint"
        
        # Get users for stakeholder testing - use workos/users endpoint
        users_res = self.session.get(f"{BASE_URL}/api/workos/users")
        if users_res.status_code == 200:
            self.users = users_res.json()
            self.stakeholder_ids = [u["id"] for u in self.users[:2]] if len(self.users) >= 2 else []
        else:
            # Fallback - use empty stakeholder list
            self.users = []
            self.stakeholder_ids = []
        
        # Get releases for bug+release testing
        releases_res = self.session.get(f"{BASE_URL}/api/projects/releases")
        assert releases_res.status_code == 200
        releases = releases_res.json()
        if len(releases) > 0:
            self.release_id = releases[0]["id"]
            self.release_name = releases[0]["name"]
        else:
            self.release_id = None
            self.release_name = None
        
        yield
        
        # Cleanup - delete test sprint reviews
        reviews_res = self.session.get(f"{BASE_URL}/api/engineering/sprint-reviews")
        if reviews_res.status_code == 200:
            for review in reviews_res.json():
                if "TEST_" in (review.get("title") or ""):
                    self.session.delete(f"{BASE_URL}/api/engineering/sprint-reviews/{review['id']}")

    # ============== SPRINT REVIEW TESTS ==============
    
    def test_create_sprint_review(self):
        """Test creating a sprint review with demo items and stakeholders"""
        review_data = {
            "sprint_id": self.sprint_id,
            "project_id": self.project_id,
            "title": "TEST_Sprint Review - Authentication Features",
            "summary": "Completed user authentication and authorization features",
            "demo_items": [
                {"task_name": "Login Page", "demo_notes": "Implemented login with email/password"},
                {"task_name": "OAuth Integration", "demo_notes": "Added Google and Microsoft OAuth"}
            ],
            "stakeholder_ids": self.stakeholder_ids
        }
        
        response = self.session.post(f"{BASE_URL}/api/engineering/sprint-reviews", json=review_data)
        assert response.status_code in [200, 201], f"Failed to create sprint review: {response.text}"
        
        review = response.json()
        assert review["id"], "Review ID not returned"
        assert review["sprint_id"] == self.sprint_id
        assert review["project_id"] == self.project_id
        assert "TEST_Sprint Review" in review["title"]
        assert review["status"] == "draft"
        assert len(review["demo_items"]) == 2
        assert review["stakeholder_ids"] == self.stakeholder_ids
        
        # Store for later tests
        self.created_review_id = review["id"]
        print(f"✓ Created sprint review: {review['id']}")
        return review["id"]
    
    def test_list_sprint_reviews(self):
        """Test listing sprint reviews with optional filters"""
        # First create a review
        review_id = self.test_create_sprint_review()
        
        # List all reviews
        response = self.session.get(f"{BASE_URL}/api/engineering/sprint-reviews")
        assert response.status_code == 200, f"Failed to list reviews: {response.text}"
        
        reviews = response.json()
        assert isinstance(reviews, list)
        assert len(reviews) > 0, "No reviews returned"
        
        # Verify our created review is in the list
        review_ids = [r["id"] for r in reviews]
        assert review_id in review_ids, "Created review not found in list"
        
        # Test filtering by project
        response = self.session.get(f"{BASE_URL}/api/engineering/sprint-reviews?project_id={self.project_id}")
        assert response.status_code == 200
        filtered_reviews = response.json()
        for r in filtered_reviews:
            assert r["project_id"] == self.project_id
        
        print(f"✓ Listed {len(reviews)} sprint reviews")
    
    def test_get_sprint_review_by_id(self):
        """Test getting a specific sprint review"""
        review_id = self.test_create_sprint_review()
        
        response = self.session.get(f"{BASE_URL}/api/engineering/sprint-reviews/{review_id}")
        assert response.status_code == 200, f"Failed to get review: {response.text}"
        
        review = response.json()
        assert review["id"] == review_id
        assert review["sprint_id"] == self.sprint_id
        assert review["project_id"] == self.project_id
        assert "demo_items" in review
        assert "stakeholder_feedback" in review
        
        print(f"✓ Retrieved sprint review: {review_id}")
    
    def test_update_sprint_review(self):
        """Test updating a sprint review"""
        review_id = self.test_create_sprint_review()
        
        update_data = {
            "title": "TEST_Updated Sprint Review Title",
            "summary": "Updated summary with more details",
            "scheduled_date": "2026-01-20",
            "meeting_link": "https://meet.example.com/sprint-review"
        }
        
        response = self.session.put(f"{BASE_URL}/api/engineering/sprint-reviews/{review_id}", json=update_data)
        assert response.status_code == 200, f"Failed to update review: {response.text}"
        
        review = response.json()
        assert review["title"] == "TEST_Updated Sprint Review Title"
        assert review["summary"] == "Updated summary with more details"
        assert review["scheduled_date"] == "2026-01-20"
        assert review["meeting_link"] == "https://meet.example.com/sprint-review"
        
        print(f"✓ Updated sprint review: {review_id}")
    
    def test_submit_stakeholder_feedback_approved(self):
        """Test submitting stakeholder feedback with approval"""
        review_id = self.test_create_sprint_review()
        
        # Submit feedback with approval
        response = self.session.post(
            f"{BASE_URL}/api/engineering/sprint-reviews/{review_id}/feedback",
            params={
                "rating": 5,
                "feedback": "Great work on the authentication features!",
                "approval_status": "approved"
            }
        )
        assert response.status_code == 200, f"Failed to submit feedback: {response.text}"
        
        result = response.json()
        assert result["approval_count"] >= 1
        assert result["overall_rating"] is not None
        assert result["status"] in ["in_review", "approved"]
        
        print(f"✓ Submitted approved feedback for review: {review_id}")
    
    def test_submit_stakeholder_feedback_rejected(self):
        """Test submitting stakeholder feedback with rejection"""
        review_id = self.test_create_sprint_review()
        
        # Submit feedback with rejection
        response = self.session.post(
            f"{BASE_URL}/api/engineering/sprint-reviews/{review_id}/feedback",
            params={
                "rating": 2,
                "feedback": "Needs more work on error handling",
                "approval_status": "rejected"
            }
        )
        assert response.status_code == 200, f"Failed to submit feedback: {response.text}"
        
        result = response.json()
        assert result["rejection_count"] >= 1
        assert result["status"] == "rejected"
        
        print(f"✓ Submitted rejected feedback for review: {review_id}")
    
    def test_submit_stakeholder_feedback_needs_changes(self):
        """Test submitting stakeholder feedback requesting changes"""
        review_id = self.test_create_sprint_review()
        
        response = self.session.post(
            f"{BASE_URL}/api/engineering/sprint-reviews/{review_id}/feedback",
            params={
                "rating": 3,
                "feedback": "Please add more unit tests",
                "approval_status": "needs_changes"
            }
        )
        assert response.status_code == 200, f"Failed to submit feedback: {response.text}"
        
        result = response.json()
        assert result["status"] == "needs_changes"
        
        print(f"✓ Submitted needs_changes feedback for review: {review_id}")
    
    def test_delete_sprint_review(self):
        """Test deleting a sprint review"""
        review_id = self.test_create_sprint_review()
        
        response = self.session.delete(f"{BASE_URL}/api/engineering/sprint-reviews/{review_id}")
        assert response.status_code == 200, f"Failed to delete review: {response.text}"
        
        # Verify deletion
        get_response = self.session.get(f"{BASE_URL}/api/engineering/sprint-reviews/{review_id}")
        assert get_response.status_code == 404, "Review should not exist after deletion"
        
        print(f"✓ Deleted sprint review: {review_id}")
    
    # ============== BUG + RELEASE INTEGRATION TESTS ==============
    
    def test_get_bug_workflow_status(self):
        """Test getting bug workflow status overview"""
        response = self.session.get(f"{BASE_URL}/api/engineering/bugs/workflow-status")
        assert response.status_code == 200, f"Failed to get workflow status: {response.text}"
        
        data = response.json()
        assert "workflow" in data
        assert "counts" in data
        assert "total" in data
        
        # Verify workflow stages exist
        expected_stages = ["reported", "triaged", "in_sprint", "in_progress", "fixed", "verified", "released"]
        for stage in expected_stages:
            assert stage in data["workflow"], f"Missing workflow stage: {stage}"
            assert stage in data["counts"], f"Missing count for stage: {stage}"
        
        print(f"✓ Got bug workflow status - Total bugs: {data['total']}")
    
    def test_get_bug_workflow_status_filtered_by_project(self):
        """Test getting bug workflow status filtered by project"""
        response = self.session.get(f"{BASE_URL}/api/engineering/bugs/workflow-status?project_id={self.project_id}")
        assert response.status_code == 200, f"Failed to get filtered workflow status: {response.text}"
        
        data = response.json()
        assert "workflow" in data
        assert "counts" in data
        
        print(f"✓ Got filtered bug workflow status for project: {self.project_id}")
    
    def test_link_bug_to_release(self):
        """Test linking a bug to a release"""
        if not self.release_id:
            pytest.skip("No release available for testing")
        
        # First, create a bug task
        bug_data = {
            "name": "TEST_Bug_For_Release_Link",
            "project_id": self.project_id,
            "issue_type": "bug",
            "description": "Test bug for release linking",
            "priority": "high"
        }
        
        create_bug_res = self.session.post(f"{BASE_URL}/api/projects/tasks", json=bug_data)
        assert create_bug_res.status_code in [200, 201], f"Failed to create bug: {create_bug_res.text}"
        bug = create_bug_res.json()
        bug_id = bug["id"]
        
        # Link bug to release
        link_data = {
            "bug_task_id": bug_id,
            "release_id": self.release_id,
            "sprint_id": self.sprint_id  # Optional sprint
        }
        
        response = self.session.post(f"{BASE_URL}/api/engineering/bugs/link-to-release", json=link_data)
        assert response.status_code == 200, f"Failed to link bug to release: {response.text}"
        
        result = response.json()
        assert result["bug_id"] == bug_id
        assert result["release_id"] == self.release_id
        assert result["sprint_id"] == self.sprint_id
        
        # Cleanup
        self.session.delete(f"{BASE_URL}/api/projects/tasks/{bug_id}")
        
        print(f"✓ Linked bug {bug_id} to release {self.release_id}")
    
    def test_link_bug_to_release_without_sprint(self):
        """Test linking a bug to a release without specifying a sprint"""
        if not self.release_id:
            pytest.skip("No release available for testing")
        
        # Create a bug task
        bug_data = {
            "name": "TEST_Bug_No_Sprint",
            "project_id": self.project_id,
            "issue_type": "bug",
            "description": "Test bug without sprint"
        }
        
        create_bug_res = self.session.post(f"{BASE_URL}/api/projects/tasks", json=bug_data)
        assert create_bug_res.status_code in [200, 201]
        bug_id = create_bug_res.json()["id"]
        
        # Link bug to release without sprint
        link_data = {
            "bug_task_id": bug_id,
            "release_id": self.release_id
        }
        
        response = self.session.post(f"{BASE_URL}/api/engineering/bugs/link-to-release", json=link_data)
        assert response.status_code == 200, f"Failed to link bug: {response.text}"
        
        # Cleanup
        self.session.delete(f"{BASE_URL}/api/projects/tasks/{bug_id}")
        
        print(f"✓ Linked bug to release without sprint")
    
    def test_update_bug_status(self):
        """Test updating bug status through workflow stages"""
        # Create a bug task
        bug_data = {
            "name": "TEST_Bug_Status_Update",
            "project_id": self.project_id,
            "issue_type": "bug"
        }
        
        create_bug_res = self.session.post(f"{BASE_URL}/api/projects/tasks", json=bug_data)
        assert create_bug_res.status_code in [200, 201]
        bug_id = create_bug_res.json()["id"]
        
        # Test status transitions
        statuses = ["triaged", "in_sprint", "in_progress", "fixed"]
        for status in statuses:
            response = self.session.put(f"{BASE_URL}/api/engineering/bugs/{bug_id}/status?status={status}")
            assert response.status_code == 200, f"Failed to update status to {status}: {response.text}"
            
            result = response.json()
            assert result["status"] == status
        
        # Cleanup
        self.session.delete(f"{BASE_URL}/api/projects/tasks/{bug_id}")
        
        print(f"✓ Updated bug status through workflow stages")
    
    def test_update_bug_status_with_commit(self):
        """Test updating bug status with fixed_in_commit"""
        bug_data = {
            "name": "TEST_Bug_With_Commit",
            "project_id": self.project_id,
            "issue_type": "bug"
        }
        
        create_bug_res = self.session.post(f"{BASE_URL}/api/projects/tasks", json=bug_data)
        assert create_bug_res.status_code in [200, 201]
        bug_id = create_bug_res.json()["id"]
        
        # Update to fixed with commit hash
        response = self.session.put(
            f"{BASE_URL}/api/engineering/bugs/{bug_id}/status",
            params={"status": "fixed", "fixed_in_commit": "abc123def456"}
        )
        assert response.status_code == 200, f"Failed to update status: {response.text}"
        
        # Cleanup
        self.session.delete(f"{BASE_URL}/api/projects/tasks/{bug_id}")
        
        print(f"✓ Updated bug status with commit hash")
    
    def test_get_release_bugs(self):
        """Test getting all bugs linked to a release"""
        if not self.release_id:
            pytest.skip("No release available for testing")
        
        response = self.session.get(f"{BASE_URL}/api/engineering/releases/{self.release_id}/bugs")
        assert response.status_code == 200, f"Failed to get release bugs: {response.text}"
        
        data = response.json()
        assert "release_id" in data
        assert "release_name" in data
        assert "bugs" in data
        assert "bugs_total" in data
        assert "bugs_fixed" in data
        assert "bugs_verified" in data
        assert "bugs_pending" in data
        
        print(f"✓ Got release bugs - Total: {data['bugs_total']}, Fixed: {data['bugs_fixed']}, Verified: {data['bugs_verified']}")
    
    def test_verify_bug_in_release(self):
        """Test verifying a bug in a release"""
        if not self.release_id:
            pytest.skip("No release available for testing")
        
        # Create and link a bug
        bug_data = {
            "name": "TEST_Bug_For_Verification",
            "project_id": self.project_id,
            "issue_type": "bug"
        }
        
        create_bug_res = self.session.post(f"{BASE_URL}/api/projects/tasks", json=bug_data)
        assert create_bug_res.status_code in [200, 201]
        bug_id = create_bug_res.json()["id"]
        
        # Link to release
        link_data = {"bug_task_id": bug_id, "release_id": self.release_id}
        self.session.post(f"{BASE_URL}/api/engineering/bugs/link-to-release", json=link_data)
        
        # Update to fixed status first
        self.session.put(f"{BASE_URL}/api/engineering/bugs/{bug_id}/status?status=fixed")
        
        # Verify the bug
        response = self.session.post(
            f"{BASE_URL}/api/engineering/releases/{self.release_id}/verify-bug/{bug_id}",
            params={"verified": True, "notes": "Verified in QA environment"}
        )
        assert response.status_code == 200, f"Failed to verify bug: {response.text}"
        
        result = response.json()
        assert result["verified"] == True
        
        # Cleanup
        self.session.delete(f"{BASE_URL}/api/projects/tasks/{bug_id}")
        
        print(f"✓ Verified bug in release")
    
    def test_unverify_bug_in_release(self):
        """Test removing verification from a bug"""
        if not self.release_id:
            pytest.skip("No release available for testing")
        
        # Create, link, and verify a bug
        bug_data = {
            "name": "TEST_Bug_Unverify",
            "project_id": self.project_id,
            "issue_type": "bug"
        }
        
        create_bug_res = self.session.post(f"{BASE_URL}/api/projects/tasks", json=bug_data)
        bug_id = create_bug_res.json()["id"]
        
        link_data = {"bug_task_id": bug_id, "release_id": self.release_id}
        self.session.post(f"{BASE_URL}/api/engineering/bugs/link-to-release", json=link_data)
        self.session.put(f"{BASE_URL}/api/engineering/bugs/{bug_id}/status?status=fixed")
        self.session.post(f"{BASE_URL}/api/engineering/releases/{self.release_id}/verify-bug/{bug_id}?verified=true")
        
        # Unverify
        response = self.session.post(
            f"{BASE_URL}/api/engineering/releases/{self.release_id}/verify-bug/{bug_id}",
            params={"verified": False}
        )
        assert response.status_code == 200
        assert response.json()["verified"] == False
        
        # Cleanup
        self.session.delete(f"{BASE_URL}/api/projects/tasks/{bug_id}")
        
        print(f"✓ Unverified bug in release")
    
    def test_invalid_bug_status(self):
        """Test updating bug with invalid status"""
        bug_data = {
            "name": "TEST_Bug_Invalid_Status",
            "project_id": self.project_id,
            "issue_type": "bug"
        }
        
        create_bug_res = self.session.post(f"{BASE_URL}/api/projects/tasks", json=bug_data)
        bug_id = create_bug_res.json()["id"]
        
        # Try invalid status
        response = self.session.put(f"{BASE_URL}/api/engineering/bugs/{bug_id}/status?status=invalid_status")
        assert response.status_code == 400, "Should reject invalid status"
        
        # Cleanup
        self.session.delete(f"{BASE_URL}/api/projects/tasks/{bug_id}")
        
        print(f"✓ Correctly rejected invalid bug status")
    
    def test_link_non_bug_task_to_release(self):
        """Test that linking a non-bug task to release fails"""
        if not self.release_id:
            pytest.skip("No release available for testing")
        
        # Create a regular task (not a bug)
        task_data = {
            "name": "TEST_Regular_Task",
            "project_id": self.project_id,
            "issue_type": "task"  # Not a bug
        }
        
        create_task_res = self.session.post(f"{BASE_URL}/api/projects/tasks", json=task_data)
        task_id = create_task_res.json()["id"]
        
        # Try to link to release
        link_data = {"bug_task_id": task_id, "release_id": self.release_id}
        response = self.session.post(f"{BASE_URL}/api/engineering/bugs/link-to-release", json=link_data)
        assert response.status_code == 400, "Should reject non-bug task"
        
        # Cleanup
        self.session.delete(f"{BASE_URL}/api/projects/tasks/{task_id}")
        
        print(f"✓ Correctly rejected linking non-bug task to release")
    
    def test_sprint_review_not_found(self):
        """Test getting non-existent sprint review"""
        response = self.session.get(f"{BASE_URL}/api/engineering/sprint-reviews/non-existent-id")
        assert response.status_code == 404
        print(f"✓ Correctly returned 404 for non-existent review")
    
    def test_release_bugs_not_found(self):
        """Test getting bugs for non-existent release"""
        response = self.session.get(f"{BASE_URL}/api/engineering/releases/non-existent-id/bugs")
        assert response.status_code == 404
        print(f"✓ Correctly returned 404 for non-existent release")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
