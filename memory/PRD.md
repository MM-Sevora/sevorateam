# Sevora Marketing Operations Platform - PRD

## Original Problem Statement
Build a comprehensive Marketing Operations Platform that integrates marketing, sales, HR, and administrative operations into a unified system.

## Core Modules

### 1. Authentication & User Management
- JWT-based authentication
- Role-based access control (super_admin, admin, department_manager, team_lead, employee)
- User CRUD operations

### 2. Marketing Operations
- Campaign management
- Content calendar
- Social media integration (Meta Graph API)
- Influencer discovery (AI-powered)

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

### December 2025 (Latest Session)

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

3. **Security Settings Admin Page**
   - Password policies
   - Session timeouts
   - 2FA configuration

4. **Background Job for Scheduled Emails**
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
- **Email**: superadmin@sevora.com
- **Password**: admin123
- **DB Name**: sevora_production
