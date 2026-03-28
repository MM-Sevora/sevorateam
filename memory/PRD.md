# Sevora Hub - Product Requirements Document

## Original Problem Statement
Build a comprehensive enterprise operations platform (Sevora Hub) that integrates:
- Buying & Sourcing (Brand/Supplier management, campaigns, pipeline tracking)
- Marketing Operations (Influencer management, campaigns, social media)
- Sales Management (Leads, customers, pipeline)
- HR Management (Employees, leave, attendance)
- Engineering/Agile (Sprint planning, Kanban, DoD, Bug tracking, Releases)
- Knowledge Base (Wiki-style documentation with smart links)
- Analytics & Insights (Dashboards, reports)
- Communication Hub (Calendar, Teams Chat, Meetings)

## Tech Stack
- **Frontend**: React 18 + Shadcn/UI + TailwindCSS
- **Backend**: FastAPI (Python)
- **Database**: MongoDB
- **Auth**: JWT + WorkOS SSO + Microsoft MSAL

---

## What's Been Implemented (Completed)

### Core Infrastructure
- [x] Authentication (JWT + SSO + Microsoft)
- [x] Role-based permissions with data scoping
- [x] Unified Task Management system
- [x] Activity logging across modules
- [x] Notification system
- [x] **RBAC Overhaul** - New Role Management UI with CRUD permissions, Data Scope, and Permissions Preview Panel (Mar 28, 2026)

### Sourcing Module
- [x] Brand Database with pipeline stages
- [x] Supplier & Manufacturer management
- [x] AI-powered brand discovery
- [x] Email campaigns with tracking
- [x] Contact management
- [x] Agreement details & onboarding workflows
- [x] **CreateTaskDialog** with Team & Individual assignment (Mar 26, 2026)
- [x] **Brand Detail Tasks Section** - Display and manage tasks linked to brands (Mar 26, 2026)
- [x] **Custom Payout Terms** - Added "Custom" option in Payout Terms dropdown with text input (Mar 26, 2026)
- [x] **Brand Details Page Redesign** - Swiss & High-Contrast design with 4-column Control Room layout (Mar 26, 2026)

### Marketing Module
- [x] Influencer management
- [x] Campaign creation & tracking
- [x] Social media content scheduling
- [x] Performance analytics

### Sales Module
- [x] Lead management with scoring
- [x] Customer database
- [x] Sales pipeline

### HR Module
- [x] Employee directory
- [x] Leave management with approvals
- [x] Attendance tracking
- [x] **Expense Reimbursement** - Employees submit, edit, delete claims; HR/Finance Admin approval (Mar 26, 2026)
- [x] **Employee Self-Service Module** - New default module for all employees with expense claims access (Mar 26, 2026)

### Engineering Module (Completed Mar 2026)
- [x] Project Management with Kanban boards
- [x] Sprint Planning & backlog management
- [x] **Definition of Done (DoD)** - Mandatory checklist validation
- [x] **Sprint Review Module** - Demo notes, stakeholder feedback, ratings
- [x] **Bug-to-Release Integration** - Link bugs to sprints and releases
- [x] App Releases management
- [x] Daily Standups
- [x] Sprint Retrospectives
- [x] Intelligence Dashboards (Burndown, Velocity)
- [x] Keyboard shortcuts (`Cmd+K`, `Cmd+N`, `Cmd+S`)
- [x] Quick Sprint Stats API

### Knowledge Base
- [x] Wiki-style pages with rich editor
- [x] Smart linking (`[[page]]`, `@user`, `#tag`)
- [x] Version history

### Navigation & UX
- [x] Sidebar auto-expansion based on active route
- [x] Breadcrumb navigation on all detail pages
- [x] Global search with keyboard shortcuts

---

## Pending Issues (P1)

### Issue 1: Azure AD Redirect URI Mismatch
- **Status**: Not Started
- **Impact**: Blocks Outlook calendar syncing
- **Fix**: Ensure Azure app registration redirect URI matches production URL

### Issue 2: Calendar View Tasks Not Interactive
- **Status**: Not Started
- **Impact**: UX friction in project management
- **Fix**: Add onClick handlers to calendar task items

### Issue 3: Bulk Status Update for Tasks
- **Status**: Not Started
- **Impact**: Productivity for task management
- **Fix**: Add checkbox selection + bulk action dropdown

### Issue 4: Production Duplicate Data Report
- **Status**: Not Started
- **Impact**: Data integrity
- **Fix**: Investigate and deduplicate

### Issue 5: React Crash "Objects are not valid as a React child"
- **Status**: Not Started
- **Impact**: Recurring frontend crashes
- **Fix**: Audit components for ObjectId/date serialization issues

---

## Upcoming Tasks (P2)

1. **Component Refactoring**
   - Break down `UsersPermissionsPage.jsx` (large file)
   - Break down `InfluencerDetailPage.jsx` (large file)

2. **Knowledge Base Enhancements**
   - Autocomplete dropdown for `[[`, `@`, `#`
   - Hover preview tooltips for smart links

3. **Git Integration**
   - Link commits/PRs to tasks
   - Display git activity in task timeline

---

## Future/Backlog (P3)

1. Legacy route migration from `marketing_v2.py`
2. AI-powered features for Engineering module
3. Advanced analytics dashboards
4. Mobile-responsive improvements

---

## Key API Endpoints

### RBAC (Role-Based Access Control)
- `GET /api/rbac/roles` - List all roles with user counts
- `POST /api/rbac/roles` - Create new role with CRUD permissions
- `PUT /api/rbac/roles/{id}` - Update role permissions
- `DELETE /api/rbac/roles/{id}` - Soft delete role
- `GET /api/rbac/modules` - List system modules (21 modules, 7 categories)
- `GET /api/rbac/presets` - Permission presets (viewer, editor, manager, admin)
- `GET /api/rbac/users/{user_id}/permissions` - Get effective permissions for user

### Tasks
- `POST /api/tasks` - Create task (supports team & individual assignment)
- `GET /api/tasks` - List tasks with filters
- `PUT /api/tasks/{id}` - Update task

### Expense Claims (Employee Self-Service)
- `POST /api/expense/claims` - Submit new expense claim
- `GET /api/expense/claims/my` - Get employee's own claims
- `PUT /api/expense/claims/{id}` - Edit pending claim (employee only)
- `DELETE /api/expense/claims/{id}` - Cancel pending claim (employee only)
- `PUT /api/expense/claims/{id}/approve` - Approve claim (HR/Finance Admin)
- `PUT /api/expense/claims/{id}/reject` - Reject claim (HR/Finance Admin)

### Engineering
- `GET /api/projects/{project_id}/sprints` - Get project sprints
- `PUT /api/projects/kanban/move-task` - Move task with DoD validation
- `GET /api/engineering/sprints/{sprint_id}/quick-stats` - Sprint metrics

### Sourcing
- `GET /api/sourcing/brands` - List brands
- `GET /api/sourcing/brands/{id}` - Brand details

---

## 3rd Party Integrations

| Integration | Status | Key Required |
|-------------|--------|--------------|
| Microsoft Graph (SSO/Calendar) | Active | User Azure Config |
| WorkOS | Active | User API Key |
| Emergent LLM | Active | Universal Key |
| SendGrid | Configured | User API Key |

---

## Test Credentials
- Email: `admin@sevora.com`
- Password: `admin123`

---

*Last Updated: March 28, 2026 (Session 3 - Part 3)*

---

## Recent Changes (March 28, 2026)

### UI Bug Fixes Verified (Session 2)
- **User Details Modal Role Selection**: FIXED & VERIFIED - Role checkbox now correctly pre-selects based on user's legacy `role` field (e.g., `role: "viewer"` → Viewer checkbox checked)
- **Audit Log Date Filters**: FIXED & VERIFIED - Date filtering properly applies, showing only entries within the selected date range
- **Inherited Permissions Preview**: Working correctly - Shows merged modules from selected roles with clear label
- **"Invalid Role" Error on Save**: FIXED - Updated `access_control.py` to check both `roles` collection (new RBAC) and `custom_roles` collection (legacy) when validating role IDs
- **Role Permissions Not Reflecting on Login**: FIXED - Updated `get_current_user()` in `server.py` to:
  1. Always compute `merged_module_access` dynamically (not use stale cached values)
  2. Check `roles` collection first (RBAC system), fallback to `custom_roles`
  3. Include user-level module overrides in the merged access list

### Audit Log Module (NEW)
- **Backend API** (`/api/audit/*`):
  - `GET /api/audit/logs` - List audit logs with filters (search, module, action, user, date range)
  - `GET /api/audit/stats` - Dashboard statistics (total entries, today, this week, active users)
  - `POST /api/audit/export` - Export logs to CSV
- **Frontend UI** (`/admin/audit-log`):
  - Summary cards showing total entries, today's entries, weekly entries, active users
  - Filterable table with Timestamp, User, Action, Module, Description, Status columns
  - Expandable filters panel (Search, Module, Action, Status, User, Date From/To)
  - Export to CSV functionality
  - Detail view modal for individual log entries
- **Integration**: Added `audit_log` as a new system module under Administration category

### User List Role Display Fix
- **Fixed role display in user list**: Users now correctly show their assigned roles in the Roles column
- **Root cause**: `/api/workos/users` endpoint returned `role=None`, switched to `/api/admin/users` which includes the `role` field
- **Updated getUserRoleNames**: Now matches by role_ids, custom_role_ids, AND legacy role field (e.g., `role: "super_admin"` → "Super Admin")

### Role CRUD Permissions Fix & Role-Based Dashboard Widgets
- **CRUD Checkboxes Fix**: Role Edit Sheet now properly shows CRUD checkboxes checked for each module:
  - Super Admin/Administrator: All 4 checkboxes (Create, Read, Update, Delete) checked
  - Updated `openCreateModal` to populate default permissions for modules
  - Updated database with full CRUD permissions for admin roles
- **Role-Based Dashboard Widgets**: Dashboard now shows different sections based on user role:
  - **System Overview** (Admin only): Total Users, Active Users, Roles
  - **Task Overview** (Managers/Admin): Total Tasks, In Progress, Completed
  - **HR & People** (HR/Admin): Total Employees, Active Employees, On Leave
  - **Finance & Expenses** (Finance/Admin): Pending Claims, Approved, Total Amount
  - User's role badge displayed in header

### Bulk Role Assignment & CRUD Permissions Display
- **Bulk Role Assignment**: Already implemented - select multiple users, click "Assign Roles" button to assign roles to all selected users at once
- **CRUD Permissions Column**: Added "Permissions" column to Roles table showing C/R/U/D badges:
  - C (Create): Green badge
  - R (Read): Blue badge
  - U (Update): Yellow badge
  - D (Delete): Red badge
- **Permission Summary**: Roles now show visual summary of their CRUD capabilities at a glance

### RBAC Data Migration Complete
- **Migrated role module_access**: All 16 roles now have proper module_access configured
- **Updated RBAC routes**: Switched from `custom_roles` to `roles` collection for consistency
- **Role permissions populated**:
  - Super Admin: 20 modules (full access)
  - Administrator: 10 modules (admin access)
  - Marketing Manager/Executive: 11/7 modules
  - Sales Manager/Executive: 12/7 modules
  - HR Admin/Employee: 9/6 modules
  - Finance Admin/Employee: 7/6 modules
  - Project Manager: 8 modules
  - IT Admin/Employee: 7/5 modules
  - Social Media Manager: 8 modules
  - Viewer: 4 modules (basic access)
- **User counts now accurate**: Roles show correct user assignments based on `role`, `role_ids`, and `custom_role_ids`

### Role Templates & User Count Enhancement
- **Role Templates**: Added 5 preset role templates for quick setup:
  - Marketing Viewer (5 modules, read-only marketing access)
  - Sales Manager (6 modules, full sales with team management)
  - Project Contributor (5 modules, project and task access)
  - HR Specialist (5 modules, HR ops with user management)
  - Finance Approver (4 modules, expense approval)
- **Clone Role**: Added ability to clone any existing role
- **User Count Fix**: Roles table now shows accurate user counts by checking `role_ids`, `custom_role_ids`, and legacy `role` field
- **Role Users Dialog**: Click user count to see list of users with that role
- **User Permissions Panel**: Now fetches roles from RBAC endpoint with enriched module data

### RBAC Overhaul Complete
- Created new unified RBAC system replacing legacy merge/replace functionality
- **New UI Components**:
  - `RoleManagement.jsx` - Central role management page at `/admin/roles`
  - Role table with stats (Total Roles, System Roles, Modules, Categories)
  - Edit Role Sheet with CRUD checkboxes and Data Scope dropdowns
  - Permissions Preview Panel to view effective user permissions
- **New Backend Routes** (`/api/rbac/*`):
  - `GET/POST/PUT/DELETE /api/rbac/roles` - Role CRUD
  - `GET /api/rbac/modules` - System modules list (21 modules, 7 categories)
  - `GET /api/rbac/presets` - Permission presets (viewer, editor, manager, admin)
  - `GET /api/rbac/users/{user_id}/permissions` - Effective permissions for user
- **Permission Utilities** (`utils/permissions.py`):
  - `can_user_crud()` - Check CRUD permission for module
  - `get_data_scope_query()` - Build MongoDB query with data scope filtering
  - `apply_data_scope_to_query()` - Apply RBAC filtering to existing queries
- **API Enforcement**: Updated expense routes to use RBAC-aware permission checking

### Previous Changes (March 26, 2026)

### Organization Hierarchy & Approval Workflow System (March 28, 2026)

**Phase 1: Reporting Chain Enforcement**
- **New Utility** (`utils/org_hierarchy.py`):
  - `get_direct_reportees()` - Get all users who directly report to a manager
  - `get_all_reportees()` - Get all direct and indirect reportees (entire reporting chain)
  - `get_reporting_chain_up()` - Get upward reporting chain
  - `is_user_reportee_of()` - Check if a user is in reporting chain of a manager
  - `get_department_head()` - Get department head for a department
  - `is_department_head()` - Check if user is a department head
  - `get_user_org_context()` - Get complete organizational context for a user
  - `get_approval_chain()` - Build approval chain based on reporting structure
  - `sync_user_org_flags()` - Sync organizational flags on user records
- **New Data Scope** (`models/rbac.py`):
  - Added `REPORTEES` to `DataScope` enum - Manager sees data of all direct/indirect reports
- **Updated Permission Utils** (`utils/permissions.py`):
  - Updated `apply_data_scope_to_query()` to handle `reportees` scope
  - Updated `get_data_scope_query()` with `reportee_ids` parameter
- **New API Routes** (`routes/org_hierarchy.py`):
  - `GET /api/org/my-context` - Get current user's organizational context
  - `GET /api/org/context/{user_id}` - Get org context for specific user
  - `GET /api/org/my-reportees` - Get list of reportees
  - `GET /api/org/reporting-chain/{user_id}` - Get upward reporting chain
  - `GET /api/org/approval-chain/{user_id}` - Get approval chain for a user
  - `PUT /api/org/reporting/{user_id}` - Update user's reporting structure
  - `PUT /api/org/department/{department_id}/head` - Update department head
  - `POST /api/org/sync-flags` - Sync org flags for all users
  - `GET /api/org/department-heads` - Get all department heads

**Phase 2: Unified Approval Workflow Engine**
- **New Models** (`models/approvals.py`):
  - `ApprovalStatus` - draft, pending, approved, rejected, cancelled, expired
  - `ApprovalAction` - approve, reject, request_changes, delegate, escalate
  - `ApprovalType` - expense_claim, leave_request, purchase_requisition, travel_request, vendor_payment, etc.
  - `ApproverType` - reporting_manager, department_head, specific_user, role, custom
  - `ApprovalWorkflowConfig` - Configurable approval chains
  - `ApprovalRequestCreate/Response` - Approval request models
  - `DEFAULT_APPROVAL_WORKFLOWS` - 5 default workflows (Expense, High Value Expense, Leave, Purchase, Vendor Payment)
- **New API Routes** (`routes/approvals.py`):
  - `GET /api/approvals/workflows` - Get all approval workflow configurations
  - `POST /api/approvals/workflows` - Create new workflow
  - `PUT /api/approvals/workflows/{id}` - Update workflow
  - `DELETE /api/approvals/workflows/{id}` - Delete workflow
  - `POST /api/approvals/workflows/seed-defaults` - Seed default workflows
  - `POST /api/approvals/submit` - Submit approval request
  - `GET /api/approvals/requests` - Get all approval requests
  - `GET /api/approvals/my-requests` - Get current user's requests
  - `GET /api/approvals/pending-my-approval` - Get pending approvals for current user
  - `GET /api/approvals/requests/{id}` - Get specific request
  - `POST /api/approvals/requests/{id}/action` - Approve/Reject/Delegate
  - `POST /api/approvals/requests/{id}/cancel` - Cancel request
  - `GET /api/approvals/dashboard` - Get approval dashboard metrics
- **Approval Integration Helper** (`utils/approval_integration.py`):
  - `submit_for_approval()` - Helper to submit entities for approval from any module
  - `get_entity_approval_status()` - Get approval status for an entity
  - `cancel_entity_approval()` - Cancel approval for an entity
  - `sync_entity_status_from_approval()` - Sync entity status from approval status
  - `get_pending_approvals_for_user()` - Get all pending approvals for user
  - `get_approval_count_for_user()` - Get count for dashboard badges

**Phase 3: Frontend Enhancements**
- **Approval Dashboard** (`pages/approvals/ApprovalDashboard.jsx`):
  - Stats cards: Pending My Approval, My Pending Requests, My Approved, My Rejected
  - Organization Overview section for admins
  - Tabs: "Pending My Approval" and "My Requests"
  - Click to view approval detail
- **Approval Detail Page** (`pages/approvals/ApprovalDetail.jsx`):
  - Request details with requester info, amount, notes
  - Visual approval chain with status indicators
  - Activity history timeline
  - Action buttons: Approve, Reject, Request Changes, Delegate
  - Cancel request option for requester
- **Navigation** (`components/Layout.jsx`):
  - Added "Approvals" link to Self Service sidebar section
- **Routes** (`App.js`):
  - `/approvals` - Approval Dashboard
  - `/approvals/:id` - Approval Detail Page

**Critical Bug Fix: WCC Approval Workflow Submission (March 28, 2026 - Session 3)**
- **Issue**: Users with hierarchy data only in `employees` collection (not `users`) could not submit approval requests
- **Root Cause**: 
  1. The `reports_to` field in `employees` collection contained **employee IDs**, not **user IDs**
  2. The approval engine only queried `users` collection for hierarchy data
  3. When requester is the department head, Level 2 was incorrectly failing instead of being skipped
- **Fix Applied** (`routes/approvals.py`):
  - Updated `get_approver_for_level()` to properly resolve manager from employee ID → user ID
  - Added skip marker `{"skip": True, "reason": "..."}` for self-approval scenarios
  - Updated `build_approval_chain()` to gracefully handle skip markers
  - Department head level is now correctly skipped when requester IS the department head
- **Test Result**: Sutanu Upadhyay (Department Head of Product Development) can now submit WCC workflow requests
  - Level 1 (Reporting Manager): Resolves to Mashum Mollah
  - Level 2 (Department Head): Correctly skipped (requester is dept head)
  - Request submitted successfully with total_levels: 1

**Approval Workflow Enhancements (March 28, 2026 - Session 3 Part 2)**
- **Approver Controls Fixed**: Updated `ApprovalDetail.jsx` to use `useAuth()` hook instead of localStorage for user context
  - Approvers now see "Take Action" card with Approve/Reject/Request Changes/Delegate buttons
  - Admin users can approve any pending level
- **Attachment Support Added**:
  - Workflow Admin (`ApprovalWorkflowsAdmin.jsx`): New "Attachment Settings" section with:
    - Allow attachments toggle
    - Require attachments toggle
    - Max attachments limit (1-10)
  - New Request Form (`NewApprovalRequest.jsx`): 
    - File upload with drag-and-drop
    - File list with remove option
    - File counter showing used/max slots
    - Supported formats: PDF, Word, Excel, Images
  - Request Detail (`ApprovalDetail.jsx`): 
    - Attachments section showing uploaded files with download links
- **Backend Model Update** (`models/approvals.py`):
  - Added `allow_attachments`, `require_attachments`, `max_attachments` fields to workflow config

**Approval Chain Display Fix (March 28, 2026 - Session 3 Part 3)**
- **Issue 1**: Approval Chain showed "lvl1", "lvl2" instead of approver names
- **Fix**: Updated `ApprovalDetail.jsx` to display `approver_name` prominently with `level_name` and email as secondary info
- **Issue 2**: Requester (Sutanu) was seeing Approve/Reject buttons because he's a super_admin
- **Fix**: Updated `isCurrentApprover()` to explicitly exclude the requester from seeing approval actions, regardless of their role

**RBAC Fixes (March 28, 2026)**
- **Duplicate Roles Fix** (`routes/rbac.py`):
  - Added `POST /api/rbac/cleanup-duplicates` endpoint to remove duplicate roles
  - Ensures Super Admin has ALL modules (23 modules)
  - Keeps role with most modules when duplicates exist
- **Improved Startup Sync** (`server.py`):
  - Auto-removes duplicate roles on server startup
  - Always ensures Super Admin has all modules
  - Logs cleanup actions

### Previous Changes (March 26, 2026)

### Employee Self-Service Module
- Added new `employee_self_service` module to `SYSTEM_MODULES` with `is_default: true`
- Created sidebar entry for "Employee Self-Service" with routes:
  - `/employee/expenses` - My Expense Claims
  - `/employee/profile` - My Profile
- Created dedicated `MyExpenses.jsx` page for employees to:
  - Submit new expense claims
  - View their claim history
  - Edit pending claims
  - Cancel/delete pending claims
- Updated `AuthContext.jsx` to include `employee_self_service` in default access modules
- All authenticated users automatically get access to this module
