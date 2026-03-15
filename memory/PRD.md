# Sevora Marketing Operations Platform - PRD

## Original Problem Statement
Build a comprehensive Marketing Operations Platform that integrates marketing, sales, HR, and administrative operations into a unified system.

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

1. **Add Linking UI in Campaign Details**
   - Add UI buttons to link Ads/Content Projects/Publications to campaigns based on type
   - Backend APIs already exist (`/api/marketing/campaigns/{id}/link-ad`, etc.)
   - Frontend file: `/app/frontend/src/pages/marketing/CampaignDetailsPage.jsx`

2. **Connect Admin Tasks to HR/Finance Modules**
   - Integrate approval workflow with Leave Request and Expense forms
   
3. **Resolve Approval & Smart Trigger Gaps**
   - Add approval workflow triggers
   - Condition builder UI
   - Dynamic assignment support

4. **Live Ad Platform Integration**
   - Use credentials from Settings page to fetch live data from Meta/Google Ads APIs
   - Display on `/marketing/ads` page (currently shows mocked data)

5. **Security Settings Admin Page**
   - Password policies
   - Session timeouts
   - 2FA configuration

6. **Background Job for Scheduled Emails**
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

### Key Files Modified This Session
- `/app/frontend/src/pages/sourcing/EmailCampaignsPage.jsx` - Enhanced with Outlook status, Brands/Suppliers toggle, search, filters

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
