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

*Last Updated: March 28, 2026*

---

## Recent Changes (March 28, 2026)

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
