# Sevora Marketing Operations Platform - PRD

## Original Problem Statement
Build a comprehensive Marketing Operations Platform that integrates marketing, sales, HR, and administrative operations into a unified system.

---

## Latest Updates (March 2026)

### Role Hierarchy - Custom Manager Assignment (Completed ✅)
**Date**: March 17, 2026

**Features Implemented**:

1. **Custom Manager Assignment**
   - Each employee can have a specific manager assigned via `reports_to` field
   - Managers can be assigned during onboarding or changed later by admins
   - Circular reporting prevention (cannot create loops in hierarchy)

2. **My Team Page** (`/hr/my-team`)
   - **Stats Cards**: Direct Reports count, Total Team Size, Employees with Sub-teams
   - **List View**: Table of direct reports with department, designation, report counts
   - **Org Tree View**: Visual hierarchical tree showing current user as root with expandable branches
   - **Change Manager**: Admin action to reassign an employee's reporting manager
   - **Search**: Filter team members by name, email, designation, department

3. **Backend Endpoints Added**:
   - `GET /api/hr/my-team` - Get current user's direct reports
   - `GET /api/hr/my-team/tree` - Get full reporting tree below current user
   - `PUT /api/hr/employees/{id}/manager` - Update employee's manager
   - `GET /api/hr/managers` - Get all users who have direct reports

**Files Modified**:
- `/app/backend/routes/hr.py` - Added my-team, managers, update manager endpoints
- `/app/frontend/src/pages/hr/MyTeam.jsx` - New "My Team" page with list/tree views
- `/app/frontend/src/App.js` - Added MyTeam route

---

### Work Updates Enhancements (Completed ✅)
**Date**: March 17, 2026

**Features Implemented**:

1. **Share with Entire Organization**
   - Added checkbox in Daily Update dialog to override department-only visibility
   - Updates marked as "Public" show a globe badge on the card
   - Backend supports `share_publicly` flag in `DailyUpdateCreate` model

2. **Edit/Delete Actions on Own Updates**
   - Added action menu (⋯) on update cards for the update owner
   - Edit opens pre-filled dialog with existing data
   - Delete prompts for confirmation before removing
   - CRUD endpoints already existed; now connected to UI

3. **Manager Acknowledge Feature**
   - Managers can acknowledge team member daily updates
   - "Acknowledge" button appears for managers viewing others' updates
   - Acknowledged updates show badge and list of acknowledgers
   - `POST /api/pulse/updates/daily/{id}/acknowledge` endpoint added

4. **Team Compliance Dashboard** (New Page: `/pulse/compliance`)
   - Shows today's compliance rate and submitted/pending counts
   - Lists all employees who submitted vs. pending
   - Weekly Overview tab with department breakdown and progress bars
   - "Send Reminders" button triggers in-app notifications to pending users

5. **Daily Update Reminders**
   - `POST /api/pulse/updates/send-reminders` endpoint for admins
   - Sends in-app notifications to users who haven't submitted today
   - Can be triggered manually or via scheduled job (6 PM EOD)

**API Endpoints Added**:
- `POST /api/pulse/updates/daily/{id}/acknowledge` - Acknowledge an update
- `DELETE /api/pulse/updates/daily/{id}/acknowledge` - Remove acknowledgment
- `GET /api/pulse/updates/compliance` - Today's compliance stats
- `GET /api/pulse/updates/compliance/weekly` - Weekly compliance by department
- `POST /api/pulse/updates/send-reminders` - Trigger reminder notifications

**Files Modified**:
- `/app/backend/routes/pulse.py` - Added compliance endpoints and acknowledge feature
- `/app/frontend/src/pages/pulse/WorkUpdates.jsx` - Share publicly, edit/delete, acknowledge
- `/app/frontend/src/pages/pulse/TeamCompliance.jsx` - New compliance dashboard page
- `/app/frontend/src/App.js` - Added TeamCompliance route

---

### Session Management - Token Refresh (Completed ✅)
**Date**: March 16, 2026

**Problem**: Users experienced frequent session expirations and unexpected logouts. The frontend had token refresh logic calling `/auth/refresh`, but this endpoint didn't exist in the backend.

**Solution Implemented**:
- Added `/auth/me` endpoint to verify tokens and fetch user profile
- Added `/auth/refresh` endpoint with 7-day grace period for expired tokens
- Frontend auto-refreshes tokens every 6 hours
- Frontend also refreshes on tab visibility change (when user returns)

**Files Modified**:
- `/app/backend/routes/auth.py` - Added `/me` and `/refresh` endpoints

---

### Performance Optimization - Code Splitting (Completed ✅)
**Date**: March 16, 2026

**Problem**: The frontend bundle size was 4.9MB causing slow initial page loads.

**Solution Implemented**:
- Converted all page imports in `App.js` to use `React.lazy()` for route-based code splitting
- Created `LazyLoader.jsx` component for consistent loading UI
- Wrapped routes in `<Suspense>` with fallback loader
- Only core pages (Login, Dashboard) are eagerly loaded for fast initial render

**Results**:
- Initial bundle (main.js): **927KB** (down from 4.9MB - ~80% reduction)
- Total code split into **196 chunks** that load on demand
- Total application size: 7.7MB (unchanged, but loaded progressively)

**Key Files Modified**:
- `/app/frontend/src/App.js` - Converted 150+ static imports to lazy imports
- `/app/frontend/src/components/LazyLoader.jsx` - New loading component

---

## Core Modules

### 1. Authentication & User Management
- JWT-based authentication
- Role-based access control (super_admin, admin, department_manager, team_lead, employee)
- User CRUD operations

### 2. Marketing Operations
- Campaign management with **5 Campaign Types** (NEW - Dec 2025):
  - **Influencer Marketing**: Assign influencers to campaigns
  - **UGC Promotion**: Track user-generated content submissions
  - **Paid Ads**: Link to Digital Ads campaigns (Meta/Google)
  - **Content Production**: Link to content production projects
  - **PR/Media**: Link to publications for media coverage
- Content calendar
- Social media integration (Meta Graph API)
- Influencer discovery (AI-powered)
- **Campaign Linking APIs** (NEW):
  - Link/unlink digital ads to campaigns
  - Link/unlink content production projects
  - Link/unlink publications (PR/Media)
  - UGC submission management (add/update status/delete)

### 3. Project Management Suite
- Projects CRUD
- Tasks with assignees, priorities, due dates
- **NEW**: Kanban board view
- **NEW**: Sprints management
- **NEW**: Milestones tracking
- **NEW**: Task watchers
- **NEW**: Bulk operations & task duplication
- **NEW (Mar 2026)**: Engineering Tools Enhancement
  - **Epics**: Container for related stories/tasks with progress tracking
  - **Issue Types**: Epic, Story, Task, Bug, Subtask, Improvement, Spike
  - **Backlog View**: Prioritized list with drag-to-sprint functionality
  - **Bug Tracking Fields**: Severity, reproduction steps, expected/actual behavior
  - **Story Fields**: Acceptance criteria
  - **Burndown Charts**: Sprint progress visualization
  - **Velocity Charts**: Team performance tracking

### 4. Knowledge Base (Confluence-like) - NEW (Mar 2026)
- **Spaces**: Organize documentation by team/project/company
- **Pages**: WYSIWYG rich text editor (TipTap) with formatting toolbar
- **Page Hierarchy**: Parent/child page structure
- **Version History**: Track all changes, restore previous versions

### 5. Engineering Module - Enhanced (Mar 2026)
- **Sidebar Structure**: Engineering > Project Management & Knowledge subgroups
- **Sprint Board**: Dedicated view with burndown chart, sprint stats, task columns
- **Kanban Board Enhancements**:
  - Quick Filters: All, My Issues, Unassigned, Overdue
  - Swimlanes: Group by Assignee, Epic, Priority
- **Roadmap/Timeline View**: Visual timeline of epics across months
  - Week/Month zoom controls
  - Epic bars with status colors
  - Progress tracking
- **Release/Version Management**: Track software releases
  - Create/Edit releases with status, dates, description
  - Link/unlink tasks to releases
  - Progress tracking (issues, story points)
  - Status workflow: Planned → In Progress → Ready → Released → Archived
- **Workflow Validation**: Backend enforcement of valid status transitions
- **Task Detail Modal Enhancements**:
  - Epic selector
  - Release selector
  - Story Points field
  - Issue Type selector (Story, Bug, Task, etc.)
  - Conditional fields (Acceptance Criteria for Stories, Reproduction Steps for Bugs)
- **Comments**: Collaborate on documentation
- **Templates**: Industry-standard templates (RFC, ADR, Design Doc, Runbook, Post-Mortem, Meeting Notes, Onboarding)
- **Search**: Full-text search across all knowledge base content
- **Access Control**: Public/private spaces

### 5. Custom Workflow Configuration - NEW (Mar 2026)
- **Workflow Definition**: Define custom status workflows
- **Status Categories**: todo, in_progress, done
- **Transitions**: Define allowed status transitions
- **Required Fields**: Enforce field completion on transitions
- **Bug Workflow**: Pre-built workflow with triage, fix, verify stages
- **Issue Type Mapping**: Different workflows for different issue types

### 4. Sevora Pulse (Team Communication)
- Daily work updates
- Weekly updates
- **NEW**: Monthly updates
- **NEW**: Quarterly updates
- Task linking from updates
- Create tasks from blockers

### 5. Communication Hub
- Calendar integration (Outlook via Microsoft Graph)
- Meetings management
- Teams Chat integration

### 6. HR & Finance Modules
- Leave requests
- Expense tracking
- Approval workflows

### 7. Admin Settings
- Mail settings
- Notification settings
- Shared mailboxes

---

## What's Been Implemented

### March 2026 (Latest Session)

#### Separate Engineering Module (COMPLETED - Mar 15, 2026)
- **Enhancement**: Created a dedicated "Engineering" sidebar module separate from Project Management
- **New Routes**:
  - `/engineering/backlog` - Global Product Backlog (project selector)
  - `/engineering/epics` - Epics Overview across all projects
  - `/engineering/sprints` - Global Sprint Planning view
  - `/engineering/reports` - Engineering Reports & Charts
  - `/engineering/workflows` - Custom Workflow Management
- **New Pages Created**:
  - `/app/frontend/src/pages/engineering/GlobalEpicsPage.jsx`
  - `/app/frontend/src/pages/engineering/GlobalSprintPlanningPage.jsx`
  - `/app/frontend/src/pages/engineering/WorkflowsPage.jsx`
- **Sidebar Changes**: Engineering module has its own violet/purple theme and icon (Layers)
- **Files Modified**:
  - `/app/frontend/src/components/Layout.jsx` (new module config, removed from PM groups)
  - `/app/frontend/src/App.js` (new routes and imports)
- **Status**: WORKING

#### Engineering Tools & Knowledge Base Bug Fixes (COMPLETED - Mar 15, 2026)
- **Bug Fix 1**: Tiptap WYSIWYG Editor compilation error
  - Updated BubbleMenu import from `@tiptap/react` to `@tiptap/react/menus` (v3 breaking change)
  - Changed `tippyOptions` prop to `options` for Floating UI compatibility
- **Bug Fix 2**: Backlog page runtime error
  - Fixed Select.Item empty string value error (changed `value=""` to `value="backlog"`)
- **Status**: All Engineering Tools and Knowledge Base pages now working:
  - `/projects/{id}/backlog` - Product Backlog with filters, bulk actions
  - `/projects/{id}/epics` - Epic management with progress tracking
  - `/knowledge` - Knowledge Base with spaces, pages, search
- **Files Modified**:
  - `/app/frontend/src/components/ui/tiptap-editor.jsx`
  - `/app/frontend/src/pages/projects/BacklogPage.jsx`

#### API Keys Settings Page (COMPLETED - Mar 15, 2026)
- **Enhancement**: Admin UI to manage third-party API keys directly from the dashboard
- **Changes Applied**:
  - Created `/admin/api-keys` page with tabs for Meta, YouTube, LinkedIn, Google
  - Secure secret masking (shows first 6 + last 4 characters only)
  - Test connection buttons for each platform
  - Auto-update environment variables on save
  - Token expiration status display for Meta
  - Added sidebar link under Administration > General Admin
- **Files Modified**:
  - `/app/frontend/src/pages/admin/APIKeysSettingsPage.jsx` (NEW)
  - `/app/frontend/src/components/Layout.jsx` (sidebar link)
  - `/app/backend/server.py` (admin_keys_router endpoints)
- **Backend Endpoints**:
  - `GET /api/admin/api-keys` - Get all keys (masked)
  - `PUT /api/admin/api-keys` - Update keys
  - `POST /api/admin/api-keys/test/{platform}` - Test connection
- **Testing**: Backend API tested via curl ✓
- **Status**: TESTED & WORKING

#### AI Discovery → Add to Database Flow (COMPLETED - Mar 15, 2026)
- **Enhancement**: Enhanced Public AI Influencer Discovery with real Instagram data verification
- **Changes Applied**:
  - New endpoint `POST /api/marketing/v2/influencers/public-discover/fetch-and-save`
  - Fetches real Instagram metrics via Meta Graph API before saving
  - Falls back to AI-estimated data if API fails
  - Auto-redirects to influencer profile after adding
  - Detects duplicates and offers "View Profile" action
  - Records verification status (`instagram_verified: true/false`)
  - Updated button labels: "Add to DB", "Preview", "Instagram"
- **Files Modified**:
  - `/app/backend/routes/marketing_v2.py` (new fetch-and-save endpoint)
  - `/app/frontend/src/pages/marketing/PublicInfluencerDiscoveryPage.jsx`
- **Testing**: Backend API tested via curl ✓
- **Status**: TESTED & WORKING

#### Sourcing Templates CRUD + Categories (COMPLETED - Mar 2026)
- **Enhancement**: Full CRUD functionality for email templates with category filtering
- **Changes Applied**:
  - **Create**: Modal with name, category dropdown, subject, content fields
  - **Read**: Template cards with preview modal (Eye icon)
  - **Update**: Edit modal with pre-filled data (Edit icon)
  - **Delete**: Confirmation dialog before deletion (Trash icon)
  - **Duplicate**: Copy templates with "(Copy)" suffix
  - **Search**: Filter by name/subject/content
  - **Category Filter**: Dropdown + pill buttons (Email, Introduction, Follow-up, Partnership, Sample Request, WhatsApp)
  - Auto-detection of {{variable_name}} patterns in content
- **Files Modified**:
  - `/app/frontend/src/pages/sourcing/EmailCampaignsPage.jsx`
- **Testing**: 100% pass rate - 16/16 backend tests, all UI features verified
- **Test Report**: `/app/test_reports/iteration_102.json`
- **Status**: TESTED & WORKING

#### P1: Campaign Linking UI (COMPLETED - Mar 2026)
- **Enhancement**: Added UI to link Ads/Content Projects/Publications directly from Campaign Details page
- **Changes Applied**:
  - Content Tab: Added "Link Existing" and "Create New" buttons
  - Ads Tab: Added "Link Existing" and "Create New" buttons with searchable modal
  - Publications Tab: Added "Link Publication" and "New Pitch" buttons
  - All tabs show linked items with unlink capability
  - Searchable modals for selecting items to link
- **Files Modified**:
  - `/app/frontend/src/pages/marketing/CampaignDetailsPage.jsx`
- **Testing**: All 8 UI features and 8 API endpoints verified via testing_agent_v3_fork
- **Test Report**: `/app/test_reports/iteration_101.json`
- **Status**: TESTED & WORKING

#### P1: Live Ad Platform Integration (COMPLETED - Mar 2026)
- **Enhancement**: Added Live Data Sync panel to Digital Ads Management page
- **Changes Applied**:
  - Added "Live Data Sync" panel with Meta and Google sync buttons
  - Created `/api/marketing/v3/ads/sync/meta` endpoint for fetching Meta Ads data
  - Created `/api/marketing/v3/ads/sync/google` endpoint for fetching Google Ads data
  - Created `/api/marketing/v3/ads/sync/status` endpoint for sync status
  - Added "Configure API Keys" link to Settings page
- **Files Modified**:
  - `/app/frontend/src/pages/marketing/DigitalAdsPage.jsx`
  - `/app/backend/routes/marketing/ads/routes.py`
- **Testing**: All backend sync APIs verified (return 400 with helpful message when credentials not configured)
- **Status**: TESTED & WORKING (awaiting user to add Meta/Google API credentials in Settings)

#### Sourcing Campaigns Enhancement (COMPLETED - Mar 2026)
- **Enhancement**: Updated Sourcing Email Campaigns page to use Outlook integration
- **Changes Applied**:
  - Replaced misleading "SendGrid Ready" badge with "Outlook Connected" status showing sender email
  - Added Suppliers count to stats cards (now shows: Campaigns, Sent, Brands, Suppliers, Templates)
  - Enhanced Bulk Campaign modal with Brands/Suppliers toggle
  - Added search functionality to filter recipients
  - Added pipeline stage filter dropdown
  - Added "Select All" button for recipient selection
  - Added sender email info in both Single Email and Bulk Campaign modals
- **Files Modified**:
  - `/app/frontend/src/pages/sourcing/EmailCampaignsPage.jsx`
- **Testing**: All 10 UI features and 7 API endpoints passed via testing_agent_v3_fork
- **Test Report**: `/app/test_reports/iteration_100.json`
- **Status**: TESTED & WORKING

### December 2025

#### Bug Fix: Work Updates Input Fields (COMPLETED)
- **Issue**: Text input fields in Work Updates dialog lost focus after each keystroke
- **Root Cause**: `ItemInput` component was defined inside `WorkUpdates` component, causing React to recreate it on every render
- **Fix Applied**:
  - Moved `ItemInput` component outside `WorkUpdates` (module-level)
  - Wrapped with `React.memo()` for optimization
  - Converted handlers to `useCallback` for stable references
  - All props passed explicitly to external component
- **Status**: TESTED & WORKING

#### Project Management Suite (COMPLETED)
- Backend: Sprints, Milestones, Watchers, Bulk Updates, Task Duplication
- Frontend: KanbanBoard.jsx, SprintsPage.jsx, MilestonesPage.jsx
- Routes and sidebar navigation updated

#### Sevora Pulse Enhancements (COMPLETED)
- Monthly and Quarterly update endpoints
- Redesigned Work Updates UI with dropdown selector
- Unified form for all update types

#### Work Updates Full CRUD (COMPLETED - Dec 2025)
- **Issue**: Only daily updates had PUT/DELETE endpoints; weekly, monthly, quarterly were missing
- **Fix Applied**: Added missing endpoints to `/app/backend/routes/pulse.py`:
  - PUT /api/pulse/updates/weekly/{id}
  - PUT /api/pulse/updates/monthly/{id}
  - DELETE /api/pulse/updates/monthly/{id}
  - PUT /api/pulse/updates/quarterly/{id}
  - DELETE /api/pulse/updates/quarterly/{id}
- **Testing**: All 16 CRUD endpoints (4 operations × 4 update types) passed
- **Test File**: `/app/backend/tests/test_work_updates_crud.py`
- **Status**: TESTED & WORKING

---

## Pending Issues (Blocked)

### P0 - Azure AD Redirect URI Mismatch
- **Status**: BLOCKED on user action in Azure Portal
- **Impact**: Outlook Calendar integration broken in production

### P0 - Intermittent Production Login Failures
- **Status**: BLOCKED on user deployment
- **Impact**: Session expiration issues in production

### P1 - Meta App Review for Messaging
- **Status**: BLOCKED on Meta's review process
- **Impact**: Live Social Inbox/DM features unavailable

---

## Upcoming Tasks (P1)

1. **Connect Admin Tasks to HR/Finance Modules**
   - Integrate approval workflow with Leave Request and Expense forms
   
2. **Resolve Approval & Smart Trigger Gaps**
   - Add approval workflow triggers
   - Condition builder UI
   - Dynamic assignment support

3. **Refactor Monolithic Route Files**
   - Break down `server.py`, `marketing_v2.py`, `projects.py` into smaller modules

4. **Security Settings Admin Page**
   - Password policies
   - Session timeouts
   - 2FA configuration

5. **Background Job for Scheduled Emails**
   - Implement apscheduler for `scheduled_emails` collection

---

## Future Tasks (P2)

1. **Refactor Monolithic Route Files**
   - `server.py` (~3000+ lines)
   - `marketing_v2.py` (~2000+ lines)
   - `projects.py` (~4500+ lines) - NEW technical debt

2. Live Ad Platform API Integration (Meta/Google Ads)
3. Marketing Ops Phase 3: Audience Segmentation
4. Role Hierarchy Implementation
5. Branding/White-label settings

---

## Technical Architecture

### Backend
- FastAPI with MongoDB
- Routes: `/app/backend/routes/`
- Models: `/app/backend/models/`

### Frontend
- React with Shadcn/UI components
- Pages: `/app/frontend/src/pages/`
- Components: `/app/frontend/src/components/`

### Key Files Modified This Session (Mar 16, 2026)
- `/app/frontend/src/pages/engineering/ReleasesPage.jsx` - NEW: Release/Version management page
- `/app/frontend/src/pages/engineering/RoadmapPage.jsx` - Roadmap timeline view with epics
- `/app/frontend/src/pages/projects/KanbanBoard.jsx` - Swimlanes (Group by) and Quick Filters
- `/app/frontend/src/pages/projects/TaskDetailModal.jsx` - Release selector, releases fetch
- `/app/frontend/src/pages/marketing/CampaignDetailsPage.jsx` - **BUG FIX**: Add Influencer now opens modal instead of redirecting to pipeline
- `/app/frontend/src/components/Layout.jsx` - Releases link in sidebar
- `/app/backend/routes/projects.py` - Release API endpoints (CRUD, task linking)
- `/app/backend/models/projects.py` - Release models, release_id in TaskUpdate/TaskResponse

### Key Files Modified Previous Session
- `/app/frontend/src/pages/pulse/WorkUpdates.jsx` - Bug fix for input fields
- `/app/backend/routes/projects.py` - Project management suite
- `/app/frontend/src/pages/projects/KanbanBoard.jsx` - New
- `/app/frontend/src/pages/projects/SprintsPage.jsx` - New
- `/app/frontend/src/pages/projects/MilestonesPage.jsx` - New

### 3rd Party Integrations
- Microsoft Graph API (Azure AD, Email, Teams, Calendar)
- Meta Graph API (Facebook & Instagram)
- Emergent LLM Key (OpenAI GPT-4o)
- SendGrid

---

## Test Credentials
- **Email**: admin@sevora.com (or superadmin@sevora.com)
- **Password**: admin123
- **DB Name**: sevora_production
