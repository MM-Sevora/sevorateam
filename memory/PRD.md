# Sevora Marketing Operations Platform - PRD

## Original Problem Statement
Build a comprehensive Marketing Operations Platform that integrates marketing, sales, HR, and administrative operations into a unified system.

---

## Latest Updates (March 2026)

### 🔥 Priority 4: Sprint Review Module (Completed ✅)
**Date**: March 26, 2026

**Implementation**:

1. **Sprint Reviews** (`/engineering/sprint-review`)
   - Create sprint reviews for demo presentations
   - Add demo items with notes and video links
   - Invite stakeholders to review
   - Track approval status (Draft, In Review, Approved, Rejected, Needs Changes)

2. **Stakeholder Feedback**:
   - Submit ratings (1-5 stars)
   - Add written feedback
   - Approval workflow: Approve / Needs Changes / Reject
   - Automatic status updates based on feedback

3. **Demo Items**:
   - Link tasks/features to demos
   - Add presenter and notes
   - Reorderable demo sequence

**Backend Routes** (`/app/backend/routes/standups_releases.py`):
- `POST /api/engineering/sprint-reviews` - Create sprint review
- `GET /api/engineering/sprint-reviews` - List reviews
- `PUT /api/engineering/sprint-reviews/{id}` - Update review
- `POST /api/engineering/sprint-reviews/{id}/feedback` - Submit feedback
- `DELETE /api/engineering/sprint-reviews/{id}` - Delete review

---

### 🔥 Priority 5: Bug + Release Integration (Completed ✅)
**Date**: March 26, 2026

**Implementation**:

1. **Bug Workflow Pipeline** (`/engineering/bug-release`)
   - Visual pipeline: Reported → Triaged → In Sprint → In Progress → Fixed → Verified → Released
   - Track bugs through entire lifecycle
   - Link bugs to releases and sprints

2. **Release Bug Tracking**:
   - Link bugs to target releases
   - Track bug fix and verification status
   - Progress indicators per release
   - Mark releases as released (auto-updates all verified bugs)

3. **Bug Verification**:
   - QA can verify fixed bugs in releases
   - Track who verified and when
   - Verification required before release

**Backend Routes** (`/app/backend/routes/standups_releases.py`):
- `POST /api/engineering/bugs/link-to-release` - Link bug to release
- `PUT /api/engineering/bugs/{id}/status` - Update bug status
- `GET /api/engineering/releases/{id}/bugs` - Get release bugs
- `POST /api/engineering/releases/{id}/verify-bug/{bug_id}` - Verify bug
- `POST /api/engineering/releases/{id}/mark-released` - Mark release released
- `GET /api/engineering/bugs/workflow-status` - Get workflow overview

**Models Added** (`/app/backend/models/projects.py`):
- `SprintReviewCreate/Update/Response` - Sprint review models
- `SprintReviewStatus` enum
- `DemoItem`, `StakeholderFeedback` - Review component models
- `BugStatus`, `BugSeverity` enums
- `BugToReleaseRequest`, `ReleaseWithBugsResponse` - Bug+Release models

---

### 🔥 Priority 3: Definition of Done (DoD) Feature (Completed ✅)
**Date**: March 26, 2026

**Implementation**:

1. **DoD Configuration per Project** (`/api/projects/dod/config/{project_id}`)
   - System defaults + project-specific customization
   - Configurable per issue type (Epic, Story, Task, Subtask, Bug)
   - Enable/disable DoD enforcement globally or per type
   - Default enabled for: Task, Bug

2. **System Default DoD Items**:
   - ✅ Code Review Completed (Required)
   - ✅ QA Testing Passed (Required)
   - ☐ Documentation Updated (Optional)
   - ✅ Deployed to Staging (Required)

3. **Task DoD Checklist** (`/api/projects/tasks/{task_id}/dod`)
   - Auto-initialize DoD checklist for tasks based on project config
   - Track completion status per item
   - Timestamp and user tracking for completed items
   - Progress percentage calculation

4. **Kanban Board Enforcement**
   - Block drag-to-Done if DoD incomplete
   - Show friendly error with list of incomplete items
   - Admin override option (`skip_dod_check=true`)

**Backend Routes Added** (`/app/backend/routes/projects.py`):
- `GET /api/projects/dod/config/{project_id}` - Get DoD config (or system defaults)
- `POST /api/projects/dod/config` - Create/update DoD config
- `PUT /api/projects/dod/config/{project_id}` - Update DoD config
- `GET /api/projects/tasks/{task_id}/dod` - Get task DoD status
- `PUT /api/projects/tasks/{task_id}/dod/{item_id}` - Update DoD item
- `POST /api/projects/tasks/{task_id}/dod/initialize` - Initialize task DoD

**Frontend Components Added**:
- `/app/frontend/src/pages/projects/components/DoDSection.jsx` - DoD checklist UI
- `/app/frontend/src/pages/projects/components/DoDConfigModal.jsx` - DoD config modal
- DoD tab added to Task Detail Modal with progress indicator
- Kanban board shows DoD incomplete error on drag-to-Done

**Models Added** (`/app/backend/models/projects.py`):
- `DoDItemStatus` enum
- `DoDItem` - Single checklist item model
- `DoDConfigCreate/Update/Response` - Configuration models
- `TaskDoDStatus` - Task DoD status with completion tracking
- `SYSTEM_DOD_ITEMS` - Default DoD items

---

### Daily Standup & App Releases Features (Completed ✅)
**Date**: March 25, 2026

**Implementation**:

1. **Daily Standup Tracker** (`/engineering/standups`)
   - Track daily team standup updates (Yesterday, Today, Blockers)
   - Mood tracking (Happy, Neutral, Stressed)
   - Date navigator to view historical standups
   - Auto-populate tasks completed and in-progress
   - Team participation metrics and blocker count

2. **App Releases Management** (`/engineering/app-releases`)
   - Track iOS, Android, and Web app releases
   - Version and build number tracking
   - Release status workflow: Draft → Building → Testing → Submitted → In Review → Approved/Rejected → Released
   - Link tasks to releases
   - Store URL tracking for App Store / Play Store
   - Release notes management

**Backend Routes Added** (`/app/backend/routes/standups_releases.py`):
- `POST /engineering/standups/entry` - Create/update standup entry
- `GET /engineering/standups/my-entry` - Get user's standup
- `GET /engineering/standups/team` - Get team standups
- `GET /engineering/standups/history` - Get standup history
- `POST /engineering/app-releases` - Create release
- `GET /engineering/app-releases` - List releases
- `PUT /engineering/app-releases/{id}` - Update release

**Models Added** (`/app/backend/models/projects.py`):
- `StandupEntryCreate/Response` - Standup data models
- `StandupMeetingCreate/Response` - Meeting session models
- `AppReleaseCreate/Update/Response` - App release models
- `TeamRole` enum (Designer, Frontend, Backend, QA, DevOps, Lead)
- `WorkflowStage` enum (Design, Development, Review, Testing, Deployment, Done)

---

### Component Refactoring (Completed ✅)
**Date**: March 25, 2026

**Extracted Reusable Components** (`/app/frontend/src/components/engineering/`):
- `TaskCard.jsx` - TaskCardCompact and TaskCardKanban components
- `SprintComponents.jsx` - SprintSelector, CapacityIndicator, SprintMetricsCards, SprintGoal, SprintStatusBadge
- `SprintModals.jsx` - SprintReviewModal, TeamCapacityModal, CreateSprintModal
- `index.js` - Barrel exports for all components

---

### Sprint Planning Enhancement for Engineering Module (Completed ✅)
**Date**: March 25, 2026

**User Request**: Implement a proper Sprint Planning workflow in the Engineering module with:
1. Sprint Creation Panel (Name, Goal, Dates)
2. Backlog Picker with drag-and-drop
3. Capacity Indicator (Green/Red based on load)
4. Task Breakdown Section with inline editing
5. Final Review Screen before starting sprint

**Implementation**:

1. **New Engineering Sprint Planning Page** (`/app/frontend/src/pages/engineering/SprintPlanningPage.jsx`)
   - Full-featured sprint planning with two-column layout (Backlog | Sprint Scope)
   - Sprint selector dropdown with status indicators
   - Sprint Goal display in highlighted card
   - Capacity metrics cards: Duration, Planned Points, Capacity indicator, Team Hours

2. **Drag-and-Drop Support**
   - Tasks can be dragged from Backlog to Sprint and vice versa
   - Visual feedback: Ring highlight and background color change on drag-over
   - Grip handles visible on each task item

3. **Inline Task Editing**
   - Edit button appears on hover
   - Quick assignment dropdown with team members
   - Story points input field
   - Save/Cancel inline actions

4. **Review & Start Sprint Modal**
   - Sprint summary: Name, Goal, Date range
   - Stats grid: Total Items, Story Points, Team Capacity
   - Item breakdown: Stories, Tasks, Bugs count
   - **Warnings displayed**:
     - Unassigned items (amber)
     - Items without estimates (amber)
     - Over capacity (red with calculation)
   - Cancel and Start Sprint buttons

5. **Bug Fix**: Changed status check from `'planned'` to `'planning'` to match backend

**Routes Added**:
- `/engineering/projects/:projectId/sprint-planning` → EngineeringSprintPlanningPage

**Files Modified**:
- `/app/frontend/src/pages/engineering/SprintPlanningPage.jsx` (NEW)
- `/app/frontend/src/pages/engineering/GlobalSprintPlanningPage.jsx` (navigation links)
- `/app/frontend/src/pages/projects/SprintPlanningPage.jsx` (bug fix)
- `/app/frontend/src/App.js` (route + lazy import)

---

### Project Detail Page UI/UX Enhancements + Auto-Attach Feature (Completed ✅)
**Date**: March 19, 2026

**Enhancements Implemented**:

1. **Task Type Breakdown in Header**
   - Shows visual breakdown by type: Stories, Design, Frontend, Backend, QA
   - Color-coded badges with icons

2. **Task Type Badges on Cards**
   - Added `type` field to `TaskResponse` model in `/app/backend/models/projects.py`
   - TaskCard displays color-coded type badges (📖 Story, 🎨 Design, 💻 Frontend, ⚙️ Backend, 🧪 QA)

3. **Quick Status Change Buttons**
   - One-click "→ Assigned" / "→ In Progress" buttons on task card hover
   - Instant status advancement with optimistic UI update

4. **Epic Grouping in Kanban**
   - Added `/api/projects/{project_id}/epics` endpoint
   - Tasks grouped by Epic with collapsible headers
   - "Group by Epic" toggle button in toolbar

5. **Improved Drag & Drop Visual Feedback**
   - Column highlights when dragging over (rose border + scale effect)
   - Dragged card opacity changes

6. **Auto-Attach DOCX in Feature Parser**
   - New endpoint: `POST /api/engineering/feature-parser/create-artifacts-with-file`
   - Automatically attaches source DOCX file to the created project
   - File stored in `/app/uploads/projects/` with metadata in `project_attachments` collection

**Files Modified**:
- `/app/frontend/src/pages/projects/ProjectDetail.jsx`
- `/app/frontend/src/pages/engineering/FeatureParserPage.jsx`
- `/app/backend/routes/feature_parser.py`
- `/app/backend/routes/projects.py` (added epics endpoint)
- `/app/backend/models/projects.py` (added `type` field)

---

### Feature Parser Task Visibility Bug Fix (Completed ✅)
**Date**: March 19, 2026

**Issue**: Tasks created by the Feature Document Parser (AI-powered project automation) were not visible on the Project Detail page's Kanban board. The page showed "Tasks (30)" in the header but "0" tasks in all Kanban columns.

**Root Cause**: 
- The Feature Parser was creating tasks with `status: "todo"` 
- The frontend Kanban board columns only recognize: `draft`, `assigned`, `in_progress`, `pending_review`, `completed`
- `"todo"` status doesn't match any column, so tasks weren't displayed

**Fix Applied**:
1. Updated `/app/backend/routes/feature_parser.py`:
   - Changed User Story creation to use `status: "draft"` instead of `"todo"`
   - Changed Task creation to use `status: "draft"` instead of `"todo"`
   - Added explicit `parent_task_id: None` for User Stories (top-level items)

2. Database Migration: Updated 38 existing tasks from `status: "todo"` to `status: "draft"`

**Verification**: Screenshot confirmed 30 tasks now visible in Draft column of Kanban board.

---

### Engineering & Knowledge Base Modules Added to Permission System (Completed ✅)
**Date**: March 18, 2026

**Issue**: The Engineering module and Knowledge Base were not showing in the Users & Permissions page for module management. User requested automatic inclusion of new modules in the permission system.

**Changes Made**:
1. **Added Engineering Module** to `SYSTEM_MODULES` in `/app/backend/models/system_modules.py`:
   - Code: `engineering`
   - Category: `operations`
   - 11 sub-modules: Projects, Sprint Board, Backlog, Epics, Sprint Planning, Reports, Roadmap, Releases, Workflows, Automations, Knowledge Base
   
2. **Added Knowledge Base Module** to `SYSTEM_MODULES`:
   - Code: `knowledge_base`
   - Category: `operations`
   - 3 sub-modules: Spaces, Pages, Templates

3. **Fixed Module Category Counts** in `/app/backend/routes/module_categories.py`:
   - Module counts now correctly calculated from both base `SYSTEM_MODULES` definitions and custom database overrides
   - Previously only counted custom configurations, missing base module definitions

4. **Updated Route Protections** in `/app/frontend/src/App.js`:
   - Engineering routes (`/engineering/*`) now require `engineering` module access
   - Knowledge Base routes (`/knowledge/*`) now require `knowledge_base` module access
   - Previously all were protected by `project_management` module

**How New Modules Are Automatically Included**:
- All modules are defined in `SYSTEM_MODULES` dictionary in `/app/backend/models/system_modules.py`
- The `/api/system-modules/` endpoint dynamically loads all modules from this dictionary
- Adding a new module to `SYSTEM_MODULES` automatically makes it available in the permission system
- No database seeding or manual configuration required

**Files Modified**:
- `/app/backend/models/system_modules.py` - Added Engineering and Knowledge Base modules
- `/app/backend/routes/module_categories.py` - Fixed module count calculation
- `/app/frontend/src/App.js` - Updated route protections

**Testing**: Users & Permissions page loads correctly with 17 modules (including new Engineering and Knowledge Base modules). Engineering Projects page accessible.

---

### Influencer List Pagination Fix (Completed ✅)
**Date**: March 17, 2026

**Issue**: The influencer list was capped at showing maximum 100 records because the frontend wasn't implementing pagination, despite the backend already supporting it.

**Root Cause**: 
- Backend `/api/marketing/v2/contacts/paginated` endpoint already supported `page` and `page_size` parameters
- Frontend `InfluencersListPage.jsx` was only fetching first page with `page_size: 100` without any pagination controls

**Changes Made**:
1. Added pagination state variables (`currentPage`, `totalPages`, `totalCount`, `pageSize=25`)
2. Updated `fetchInfluencers()` to pass `page` parameter to API
3. Added `handlePageChange()` function for page navigation
4. Implemented full pagination UI at bottom of table:
   - First/Previous/Next/Last page buttons
   - Numbered page buttons with ellipsis for large datasets
   - "Showing X to Y of Z influencers" info
   - "Page X of Y" indicator
5. Updated header to show "(page X of Y)" when multiple pages exist
6. Updated Total Influencers card to show server-side total count

**Files Modified**:
- `/app/frontend/src/pages/marketing/InfluencersListPage.jsx`

**Testing**: Backend pagination verified via curl. Frontend pagination controls render correctly and navigate between pages.

---

### Employee Database & Dynamic Departments (Completed ✅)
**Date**: March 17, 2026

**Features Implemented**:

1. **Enhanced Employee Database Table** (`/admin/employees`)
   - Added client-side sorting on columns (name, department, status, joining date)
   - Enhanced filter bar with department, grade, and status dropdowns
   - Active filter pills with "Clear all" option
   - Removed Task button from employee table actions
   - Added "View Details" action with employee detail dialog
   - Added row selection with checkboxes
   - Employee count badge in filter bar
   - Tooltips for roles when multiple assigned

2. **Dynamic Department Dropdowns**
   - Created shared `useDepartments` hook (`/app/frontend/src/hooks/useDepartments.js`)
   - Departments now fetched from `GET /api/hr/departments` instead of hardcoded arrays
   - Updated across 5 frontend files:
     - Employee Database page
     - Work Requests page
     - Work Orders page
     - Payment Requests page
     - Budget Planning page

3. **Backend Data Scope Enforcement** (P1)
   - Implemented `apply_data_scope_filter()` in `/app/backend/utils/permissions.py`
   - Reads user's custom_permissions from database
   - Applies data scope filters (own/department/all) to MongoDB queries
   - Applied to Projects list, Tasks list, and Employees list endpoints
   - Admin users bypass all data scope restrictions

**Files Modified**:
- `/app/frontend/src/pages/admin/EmployeeDatabase.jsx` - Enhanced EmployeesTab component
- `/app/frontend/src/hooks/useDepartments.js` - NEW shared hook for departments
- `/app/frontend/src/pages/vendors/WorkRequests.jsx` - Uses dynamic departments
- `/app/frontend/src/pages/vendors/WorkOrders.jsx` - Uses dynamic departments
- `/app/frontend/src/pages/finance/PaymentRequests.jsx` - Uses dynamic departments
- `/app/frontend/src/pages/finance/BudgetPlanning.jsx` - Uses dynamic departments
- `/app/backend/utils/permissions.py` - Added async data scope filtering
- `/app/backend/routes/projects.py` - Applied data scope to projects and tasks
- `/app/backend/routes/hr.py` - Applied data scope to employees

**Testing**: 100% pass rate (iteration_107.json)

---

### Users & Permissions Admin Enhancements (Completed ✅)
**Date**: March 17, 2026

**Features Implemented**:

1. **Create User with Email/Password**
   - Added `POST /api/workos/users` endpoint to create users with email and password
   - Added `UserSimpleCreate` model in `/app/backend/models/workos.py`
   - Users can now be created directly from the admin panel without Azure AD

2. **Predefined Role Templates**
   - Added 5 new role templates: HR Admin, Finance Admin, IT Admin, Project Manager, Employee
   - Updated existing roles with proper permission levels
   - Total 13 system roles now available:
     - Super Admin (Level 100) - Full system access
     - HR Admin (Level 80) - HR and employee management
     - Finance Admin (Level 80) - Finance and accounting
     - IT Admin (Level 80) - IT infrastructure and system
     - Administrator (Level 80) - General admin access
     - Project Manager (Level 60) - Project management
     - Marketing Manager (Level 50) - Marketing department
     - Sales Manager (Level 50) - Sales department
     - Social Media Manager (Level 50) - Social media
     - Marketing Executive (Level 30) - Marketing operations
     - Sales Executive (Level 30) - Sales operations
     - Employee (Level 20) - Basic employee access
     - Viewer (Level 10) - Read-only access

3. **Role Sync Endpoint**
   - Added `POST /api/workos/sync-roles` to sync role templates to database
   - Updates existing roles and creates missing ones

**Files Modified**:
- `/app/backend/models/workos.py` - Added UserSimpleCreate model and expanded DEFAULT_ROLE_TEMPLATES
- `/app/backend/routes/workos.py` - Added create_user and sync-roles endpoints

---

### Task Detail Modal - Labels Tab Removal & UI Enhancement (Completed ✅)
**Date**: March 17, 2026

**Features Implemented**:

1. **Labels Tab Removed**
   - Removed the Labels tab from the Task Detail Modal as per user request
   - Cleaned up unused `labelColors` config and `LabelsSection` component
   - Removed `Tag` icon import

2. **UI/UX Enhancement**
   - Enhanced tabs styling with gradient background and better visual hierarchy
   - Active tabs now have white background with subtle shadow
   - Tab badges have color-coded styling (rose for subtasks, emerald for checklist, blue for comments, purple for files)
   - Tab content area wrapped in bordered container for better visual separation
   - Added smooth hover transitions on tab triggers

3. **Remaining 7 Tabs Verified Working**:
   - **Subtasks**: Add, complete, edit priority/date, assign, delete subtasks
   - **Checklist**: Add, toggle complete, delete checklist items with progress bar
   - **Comments**: Add rich text comments with mentions, delete comments
   - **Dependencies**: Add/remove "Blocked By" and "Blocks" task dependencies
   - **Time**: View estimated/logged/remaining hours, log time entries
   - **Files**: Upload, download, delete file attachments
   - **Follow-ups**: Set reminder dates with optional messages, delete reminders

**Files Modified**:
- `/app/frontend/src/pages/projects/TaskDetailModal.jsx` - Removed Labels tab, LabelsSection component, labelColors config, and enhanced tab styling

**Testing**: 100% pass rate confirmed by testing agent

---

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
