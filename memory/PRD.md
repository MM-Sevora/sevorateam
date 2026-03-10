# Sevora Team - Project Management Module PRD

## Original Problem Statement
Build a comprehensive, production-grade **Project Management System** as a core part of the internal "Work Operating System" (Marketing Operating System). The system covers system hierarchy, modules, projects, tasks, subtasks, dependencies, time tracking, dashboards, and more.

## User Personas
- **Super Admin**: Full system access (superadmin@sevora.com)
- **Marketing Manager**: Limited access to Marketing & Mail modules (marketing@sevora.com)

## Core Requirements
- Full data models for Projects/Tasks
- Foundational backend CRUD APIs
- "My Tasks" dashboard
- Manager dashboards (Projects List)
- Kanban/Calendar views for projects
- Task Detail slide-over with subtasks, checklists, comments, and time tracking
- Enhanced Project Structure (auto-generated Project ID, team roles)
- Task Dependencies
- Manager's Dashboard with stats and charts
- Consistent UI/UX across all PM module pages

## Design System
- **Theme**: "Organic Productivity" (cream/beige)
- **Source of Truth**: `/app/design_guidelines.json`
- **Colors**: Cream backgrounds, amber/brown accents, status-based color coding

---

## Implementation Status

### Phase 1: Foundation (COMPLETE)
- [x] Data models for Projects/Tasks
- [x] Backend CRUD APIs
- [x] "My Tasks" dashboard

### Phase 2: Views (COMPLETE)
- [x] Manager dashboards (Projects List)
- [x] Kanban board for projects

### Phase 3: Task Details (COMPLETE)
- [x] Task Detail slide-over
- [x] Subtasks management
- [x] Checklists
- [x] Comments
- [x] Time tracking

### Phase 4: Enhancements (COMPLETE)
- [x] Auto-generated Project ID
- [x] Team roles
- [x] Task Dependencies

### Phase 5: Manager Dashboard (COMPLETE)
- [x] Backend API (`GET /api/projects/manager-dashboard`)
- [x] Frontend page with stats cards
- [x] Burndown charts (recharts)

### Phase 6: UI/UX Redesign (COMPLETE - March 9, 2026)
- [x] Created design guidelines (`/app/design_guidelines.json`)
- [x] Redesigned `ProjectDetail.jsx` to cream/beige theme
- [x] Redesigned `TaskDetailModal.jsx` to cream/beige theme
- [x] Verified visual consistency across PM module

### Phase 7: Animations & Polish (COMPLETE - March 9, 2026)
- [x] Modal entrance animation (fade-in + slide-up)
- [x] Tab content transitions (fade/slide)
- [x] Button hover effects (lift + shadow)
- [x] Checkbox pop animation on toggle
- [x] List item hover effects (slide-right + shadow)
- [x] Staggered entrance for list items
- [x] Progress bar smooth animation
- [x] Input focus shadow effects

### Phase 8: File Attachments (COMPLETE - March 9, 2026)
- [x] Backend: AttachmentResponse model in models/projects.py
- [x] Backend: Emergent Object Storage integration (utils/storage.py)
- [x] Backend: Upload/download/delete endpoints in routes/projects.py
- [x] Frontend: AttachmentsSection component with drag-drop
- [x] Frontend: Files tab in TaskDetailModal
- [x] File list with icons, size, date, uploader
- [x] 10MB file size limit validation

### Phase 9: Calendar View (COMPLETE - March 9, 2026)
- [x] New TaskCalendarView.jsx component
- [x] Monthly calendar grid with task indicators
- [x] View toggle (Kanban/Calendar) in ProjectDetail
- [x] Click date to see tasks in right panel
- [x] Click task to open TaskDetailModal
- [x] Today button, month navigation
- [x] Priority color coding on calendar
- [x] Overdue task indicators

### Phase 10: Task Filtering/Search (COMPLETE - March 9, 2026)
- [x] Filter bar in ProjectDetail page
- [x] Search by task name
- [x] Assignee dropdown filter
- [x] Priority multi-select filter (popover with checkboxes)
- [x] Due date filter (Overdue, Today, This Week, No Date)
- [x] Filter count badge
- [x] Clear filters button
- [x] Filters persist across Kanban/Calendar views

### Phase 11: Bulk Task Operations (COMPLETE - March 9, 2026)
- [x] Selection checkboxes on task cards
- [x] Column "select all" checkbox
- [x] Bulk Action Bar (Move to, Priority, Assign, Delete)
- [x] Selection count badge
- [x] Clear selection / Cancel button
- [x] API calls for bulk updates

### Phase 12: TaskDetailModal UI Enhancement (COMPLETE - March 9, 2026)
- [x] Wider modal (max-w-4xl)
- [x] Cream/beige background matching design system
- [x] Horizontal Quick Info Bar (Status, Priority, Assignee, Due Date)
- [x] Cleaner tab layout with rounded active states
- [x] Better visual hierarchy
- [x] Fixed Edit/Close button overlap

### Phase 13: Task Labels/Tags (COMPLETE - March 9, 2026)
- [x] Backend: Label model (name, color, project_id)
- [x] Backend: CRUD endpoints for labels
- [x] Backend: Add/remove labels from tasks endpoints
- [x] Frontend: Labels tab in TaskDetailModal
- [x] Frontend: 8 color options picker
- [x] Frontend: Create/delete labels UI
- [x] Frontend: Labels displayed on Kanban task cards

### Phase 14: List View (COMPLETE - December 2025)
- [x] New TaskListView.jsx component
- [x] Table-based task display
- [x] Sortable columns: Name, Status, Priority, Assignee, Due Date
- [x] View toggle (Kanban/Calendar/List) in ProjectDetail
- [x] Click row to open TaskDetailModal
- [x] Labels and subtask count display
- [x] Selection checkboxes for bulk operations

### Phase 15: Subtask Assignment (COMPLETE - December 2025)
- [x] Backend: assigned_to field on subtasks
- [x] Backend: PUT /api/projects/subtasks/{id} updates assigned_to
- [x] Backend: GET subtasks returns assigned_to_name
- [x] Frontend: Assign dropdown in SubtasksSection
- [x] Frontend: User list populated from project members

### Phase 16: Recurring Tasks (COMPLETE - December 2025)
- [x] Backend: is_recurring, recurrence_pattern, recurrence_interval, recurrence_end_date fields on tasks
- [x] Backend: create_next_recurring_task() function in projects.py
- [x] Backend: Automatic task creation when recurring task marked complete
- [x] Frontend: Recurring toggle in TaskDetailModal Edit mode
- [x] Frontend: Pattern options (Daily/Weekly/Monthly/Yearly)
- [x] Frontend: Interval and end date configuration
- [x] Frontend: Recurring indicator badge in task header

### Phase 17: Task Templates (COMPLETE - December 2025)
- [x] Backend: TaskTemplate model with all settings (name, description, priority, assignee, hours, recurring, checklist)
- [x] Backend: CRUD endpoints for templates (GET, POST, PUT, DELETE)
- [x] Backend: Create task from template endpoint with overrides
- [x] Backend: Template usage count tracking
- [x] Backend: Global vs Project-specific template scoping
- [x] Backend: Template categories (meetings, reports, sprints, checklists, other)
- [x] Frontend: TaskTemplatesPanel.jsx component (right-side sheet)
- [x] Frontend: Templates button on ProjectDetail page
- [x] Frontend: Create/Edit template form dialog with category selector
- [x] Frontend: Use template dialog with overrides (name, due date, assignee)
- [x] Frontend: Templates list with details (priority, hours, recurring, checklist count, usage)
- [x] Frontend: Category filter buttons (All, Meetings, Reports, Sprints, Checklists, Other)
- [x] Frontend: Category badges on template cards with color-coded icons

### Phase 18: Alert & Notification System - Phase 1 (COMPLETE - December 2025)
- [x] Backend: Notification model (id, user_id, type, category, title, message, priority, entity, action_url, metadata)
- [x] Backend: CRUD endpoints for notifications (GET, PUT read, DELETE)
- [x] Backend: Notification preferences model and endpoints
- [x] Backend: Unread count and summary by category endpoints
- [x] Backend: Helper functions for creating notifications (notify_task_assigned, notify_mention, etc.)
- [x] Frontend: Enhanced NotificationsDropdown component with DB + WebSocket merge
- [x] Frontend: Full NotificationCenter page (/notifications route)
- [x] Frontend: Category filter buttons (Tasks, Projects, Marketing, Mail, Social, Mentions, etc.)
- [x] Frontend: Priority filtering and search
- [x] Frontend: Notification preferences settings tab with toggles
- [x] Frontend: Mark read/unread, delete, bulk actions

### Phase 19: Alert & Notification System - Phase 2 Module Integration (COMPLETE - December 2025)
- [x] PM Integration: Task assignment notifications to assignee
- [x] PM Integration: Task reassignment notifications
- [x] PM Integration: Task status change notifications (to assignee)
- [x] PM Integration: Task completion notifications (to creator)
- [x] PM Integration: Task comment notifications (to assignee)
- [x] PM Integration: @mention notifications in comments
- [x] Marketing Integration: Approval granted/rejected notifications
- [x] Marketing Integration: Influencer deal confirmation notifications
- [x] Social Integration: Post scheduled notifications
- [x] Social Integration: Post published notifications
- [x] Mail Integration: Email sent notifications

### Phase 20: Alert & Notification System - P1 Enhancements (COMPLETE - December 2025)
- [x] WebSocket: Enhanced connection manager with timeout handling
- [x] WebSocket: Automatic cleanup of disconnected clients
- [x] Email Service: email_notification_service.py for sending email alerts
- [x] Email Service: Instant email notification sending on high-priority events
- [x] Email Service: Queuing system for digest emails
- [x] Email Service: HTML email templates (single notification + digest)
- [x] Scheduler: Hourly digest job (every hour)
- [x] Scheduler: Daily digest job (8 AM UTC)
- [x] Preferences: Email enabled/disabled toggle per user
- [x] Preferences: Email frequency selection (instant/hourly/daily)

### Phase 21: Alert & Notification System - P2 Smart Features (COMPLETE - December 2025)
- [x] Backend: GET /api/notifications/grouped endpoint
- [x] Backend: Grouping logic for task_assigned, task_comment, task_status_changed, user_mentioned, email_received
- [x] Backend: Smart summary messages (e.g., "You have 3 new tasks assigned", "5 new comments on 'Task X'")
- [x] Backend: Priority preservation (highest priority in group)
- [x] Backend: Notification IDs list for bulk actions
- [x] Frontend: "Smart View" tab in NotificationCenter (default view)
- [x] Frontend: GroupedNotificationsList component with visual grouping
- [x] Frontend: Count badges on grouped items
- [x] Frontend: Separate sections for grouped vs ungrouped notifications
- [x] Email Service: Enhanced digest grouping (group_notifications_for_digest)
- [x] Email Service: Smart digest subject lines

---

## Pending Issues

### P1 - Email Attachment Sending
- **Status**: USER VERIFICATION PENDING
- **Description**: Email with attachment could not be sent
- **Fix Applied**: Updated `EmailPage.jsx` to handle empty `202 Accepted` responses

### P2 - Marketing Ops Health Check
- **Status**: NOT STARTED
- **Description**: Full health check of marketing modules requested

### P3 - WebSocket Notifications
- **Status**: MITIGATED (Infrastructure limitation)
- **Root Cause**: Kubernetes ingress/proxy doesn't properly forward WebSocket upgrade requests
- **Evidence**: WebSocket works locally (direct to backend) but fails through external URL
- **Mitigation**: Implemented polling fallback (15-second interval) with visual indicator
- **Full Fix**: Requires infrastructure team to configure WebSocket support in ingress

---

## Backlog / Future Tasks

### P1 - Backend Refactoring
- Migrate remaining routes from `/app/backend/routes/marketing_v2.py`
- Move to modular structure under `/app/backend/routes/marketing/`

### P2 - WorkOS User Management UI
- Create frontend UI for admins
- Manage users, assign departments/roles
- Set up reporting hierarchy

### P3 - Automated Internal Help & Support Module (IN PROGRESS)
**Objective**: Auto-scaffold help structures when modules are created

**Phase 1: Foundation & Auto-Scaffold (COMPLETE - December 2025)**
- [x] Backend: HelpModule, HelpArticle, SupportTicket, FAQ models
- [x] Backend: CRUD APIs for modules, articles, FAQs, tickets
- [x] Backend: Auto-scaffold logic creates help structure on module creation
- [x] Backend: Search across articles, FAQs, modules
- [x] Backend: Ticket number generation (HELP-0001, etc.)
- [x] Backend: Notification integration for ticket updates
- [x] Backend: Seeded 5 initial modules (Overview, PM, Marketing, Mail, Social)
- [x] Frontend: Help Center page (/help) with module cards
- [x] Frontend: Search bar with live results
- [x] Frontend: My Tickets tab with ticket list
- [x] Frontend: Submit Ticket dialog with module/type/priority selection
- [x] Frontend: Help link in user profile dropdown

**Phase 2: Help Center UI Enhancements (COMPLETE - December 2025)**
- [x] Module detail page (`/help/modules/:moduleKey`) with articles list by section
- [x] Article viewer (`/help/articles/:articleId`) with markdown rendering
- [x] Ticket detail page (`/help/tickets/:ticketId`) with conversation thread
- [x] Breadcrumb navigation across all pages
- [x] Helpful/not helpful feedback on articles
- [x] Comment/reply functionality on tickets
- [x] Admin status update controls on tickets
- [x] Related articles sidebar
- [x] Tags display on articles

**Phase 3: Contextual Help + Guided Walkthroughs (COMPLETE - December 2025)**
- [x] HelpButton component with floating button variant
- [x] Auto-detection of current module from URL
- [x] Slide-out panel with Quick Links, Related Articles, FAQs
- [x] Integration with Layout for global availability
- [x] Guided tour system using react-joyride
- [x] Tour tracking in database (completed tours per user)
- [x] Auto-start on first visit + manual "Take Tour" button
- [x] Platform Overview, Project Management, Help Center tours defined

**Phase 4: Admin Controls + Analytics (COMPLETE - December 2025)**
- [x] Admin Dashboard (`/help/admin`) with overview stats
- [x] Articles management tab (publish/unpublish)
- [x] FAQs management tab (show/hide)
- [x] Tickets management tab with assignment
- [x] Support Staff role integration
- [x] Ticket assignment dialog with staff selection
- [x] Notification on ticket assignment
- [x] Analytics: open/unassigned/resolved counts

**Phase 5: Ticket Email Notifications (COMPLETE - December 2025)**
- [x] Email on ticket creation (confirmation to requester)
- [x] Email on ticket resolution (with resolution notes)
- [x] Email on support staff reply (to requester)
- [x] Email on ticket assignment (to assigned staff)
- [x] HTML email templates with Sevora branding

### P4 - Additional Features (Future)
- Gantt Chart View
- Project Templates
- Export/Reports (CSV/PDF)
- Milestones
- PR Analytics Dashboard
- AI pitch writing feature
- Session Management
- Scheduled Azure AD Sync
- Twilio WhatsApp production approval
- Approval workflows based on hierarchy

---

## Recent Additions (December 2025)

### External Links on Tasks
- [x] Added `external_links` field to task models (URL, title, description, link_type)
- [x] Updated task creation and update endpoints
- [x] Frontend displays link count on task cards

### Personal Project & Standalone Tasks
- [x] Auto-create "My Tasks" personal project for each user
- [x] GET `/api/projects/personal` endpoint
- [x] Quick Add Task dialog in My Tasks page
- [x] Personal tasks have: name, due dates, priority, comments
- [x] Personal tasks appear in My Tasks dashboard

---

## Key Technical Architecture

### Backend
- FastAPI with MongoDB
- Routes: `/app/backend/routes/projects.py`
- Models: `/app/backend/models/projects.py`

### Frontend
- React with Tailwind CSS
- Shadcn/UI components
- Pages: `/app/frontend/src/pages/projects/`
  - `ManagerDashboard.jsx`
  - `MyTasks.jsx`
  - `ProjectsList.jsx`
  - `ProjectDetail.jsx`
  - `TaskDetailModal.jsx`

### Phase 26: HR Employee Database & Grade Types (COMPLETE - December 2025)
- [x] Backend: HR models (GradeType, Employee, ReportingLine) in models/hr.py
- [x] Backend: HR routes in routes/hr.py
- [x] Backend: Grade Types CRUD endpoints
- [x] Backend: Employee management endpoints with enrichment
- [x] Backend: Reporting chain and org chart endpoints
- [x] Backend: HR stats endpoints (by department, by grade, overview)
- [x] Backend: Default grade types seeding (L1-L5, M1-M2, D1, VP)
- [x] Backend: WorkOS user model updated with grade_id field
- [x] Frontend: EmployeeDatabase.jsx page with tabs
- [x] Frontend: Overview tab with summary cards and breakdowns
- [x] Frontend: Employees tab with table, search, filters
- [x] Frontend: Grade Types tab with cards showing benefits
- [x] Frontend: Employee modal for adding/editing employees
- [x] Frontend: Grade modal for managing grade types
- [x] Frontend: OrganizationManagement updated with Grade column and field
- [x] Sidebar: Employee Database link in Administration section

### Phase 27: Enhanced HR Admin System (COMPLETE - December 2025)
- [x] Backend: Team Management (models + CRUD endpoints)
- [x] Backend: Position Hierarchy (CEO → VP → Director → Manager → Lead → Executive → Associate)
- [x] Backend: Enhanced Department (parent_department_id, department_head_id)
- [x] Backend: Work Mode support (Office, Hybrid, Remote)
- [x] Backend: Secondary Manager (dotted line reporting)
- [x] Backend: Employee ID auto-generation (EMP-0001 format)
- [x] Backend: Status tracking (Active, Probation, Confirmed, Notice Period, Resigned, Terminated)
- [x] Frontend: OrganizationStructure.jsx with 3 tabs
- [x] Frontend: Org Chart tab with interactive hierarchy visualization
- [x] Frontend: Teams tab grouped by department
- [x] Frontend: Positions tab with level badges and hierarchy
- [x] Frontend: Enhanced Employee modal with Team, Position, Work Mode, Secondary Manager
- [x] Frontend: Updated sidebar (Departments & Roles, Org Structure, Employee Database)
- [x] Grades updated to company-specific: Grade I through Grade V(D)
- [x] Departments updated to 13 company-specific departments

### Phase 28: Access Control & Onboarding System (COMPLETE - March 9, 2026)
- [x] Backend: Access Control models (CustomRole, SystemModule, RolePermission) in models/access_control.py
- [x] Backend: 7 default custom roles seeded (Super Admin, HR Admin, Marketing Manager, Project Manager, Sales Manager, Content Creator, Employee)
- [x] Backend: 8 system modules defined (dashboard, marketing_ops, project_management, mail, social, admin, hr, help_support)
- [x] Backend: Custom Roles CRUD endpoints (GET, POST, PUT, DELETE)
- [x] Backend: Module definitions endpoint
- [x] Backend: Draft Users endpoint (users pending onboarding - no custom_role_id/department_id)
- [x] Backend: Onboarding endpoint (POST /api/access/onboard/{user_id}) - assigns role, department, generates EMP code
- [x] Backend: Permission check endpoints (/check/{module_key}, /my-access)
- [x] Backend: Role-based module access validation
- [x] Frontend: AccessControlPage.jsx with 2 tabs
- [x] Frontend: Custom Roles tab - table with module access, permissions, employee count
- [x] Frontend: User Onboarding tab - list of draft users with search and Onboard action
- [x] Frontend: Create/Edit Role dialog with module checkboxes and admin permissions
- [x] Frontend: Onboard User dialog with department, team, position, grade, role selection
- [x] Frontend: Stats cards (Custom Roles, Pending Onboarding, System Modules, Active Employees)
- [x] Frontend: Sidebar updated with Access Control link in Administration
- [x] Route: /admin/access-control added to App.js
- [x] Testing: 42/42 backend tests passed, all frontend elements verified

### Phase 29: Enhanced Organization Structure UI (COMPLETE - March 9, 2026)
- [x] Enhanced OrganizationStructure.jsx with 4 tabs
- [x] Org Chart tab: Interactive tree with Expand All/Collapse All, Employee Details panel with email, department, grade
- [x] Departments tab (13): Hierarchy view with parent/child expand/collapse, Cards view toggle, Add Department modal with parent_department_id and department_head_id
- [x] Position Hierarchy tab (9): CEO→VP→Director→Manager→Lead→Executive→Associate chain with color-coded level badges (Red→Purple→Pink→Blue→Indigo→Green→Stone), Hierarchy/Table view toggle
- [x] Teams tab: Grouped by department display with member count and team lead
- [x] Stats cards: Departments, Positions, Teams, Employees counts
- [x] Modals: Add/Edit Position, Add/Edit Department, Add/Edit Team with proper Select components
- [x] Bug fix: SelectItem empty value crash fixed (using 'none' placeholder)
- [x] Testing: 19/19 backend tests passed, all tabs and modals verified

### Phase 30: Administration Module Restructure (COMPLETE - March 9, 2026)
**User Management** - Simplified for platform access only:
- [x] Removed Role and Department fields from User creation
- [x] Fields: User ID, Name, Email, Password, Status (Active/Inactive), Notes
- [x] Active users can access Mail, Projects, and other basic modules
- [x] Info banner explaining purpose and pointing to Employee Database for HR data

**Employee Database** - Central HR module with 3 tabs:
- [x] Employee Overview tab: Stats (Total, Active, Departments, New This Month), Employees by Department breakdown
- [x] All Employees tab: Searchable table with filters for department, grade, status
- [x] Employee Onboarding tab (moved from Access Control): Link platform users to HR records with department, position, grade, reporting manager

**Access Control & Permissions** - Merged and simplified with 2 tabs:
- [x] Custom Roles tab: Manage system roles with module access and admin permissions
- [x] System Modules tab: View available modules (dashboard, marketing_ops, project_management, mail, social, admin, hr, help_support)
- [x] Removed User Onboarding (moved to Employee Database)

**Organization Management** - Consolidated with 3 tabs:
- [x] Departments tab: Hierarchy view with parent/child relationships, Cards view toggle
- [x] Position Hierarchy tab: CEO→VP→Director chain with level badges
- [x] Grade Types tab: Moved from Employee Database, manages organizational grades

**Sidebar Navigation** updated:
- [x] User Management
- [x] Employee Database
- [x] Access Control & Permissions
- [x] Organization Management

### Phase 31: Multi-Role Access Support (COMPLETE - March 9, 2026)
**Backend Changes:**
- [x] Updated OnboardingData model: `custom_role_id` → `custom_role_ids: List[str]`
- [x] Updated EmployeeWithAccess model: `custom_role_id` → `custom_role_ids: List[str]`
- [x] Updated onboard endpoint to validate and store multiple roles
- [x] Merged module access from all assigned roles
- [x] Updated `/my-access` endpoint to return `custom_roles` array
- [x] Backwards compatibility: still stores `custom_role_id` for legacy systems

**Frontend Changes:**
- [x] Replaced single Select with multi-select Popover in onboarding modal
- [x] Checkbox-based role selection with role descriptions
- [x] Selected roles displayed as badges with X remove buttons
- [x] "Selected Roles:" section showing all chosen roles
- [x] Validation: At least one role required
- [x] z-index fix for Popover to display above Dialog

**Data Storage:**
- User record now contains:
  - `custom_role_ids`: Array of role IDs (new)
  - `custom_role_id`: First role ID (backwards compatible)
  - `merged_module_access`: Combined module access from all roles
  - `can_manage_users`, `can_manage_employees`, `can_manage_roles`: Merged from all roles

### Phase 32: Organization Pages Merge (COMPLETE - March 9, 2026)
**Merged Organization Structure into Organization Management:**
- [x] Deleted redundant `/app/frontend/src/pages/admin/OrganizationStructure.jsx`
- [x] Removed import statement from `App.js`
- [x] Changed `/admin/org-structure` route to redirect to `/admin/organization`
- [x] Removed "Org Chart" link from sidebar in `Layout.jsx`
- [x] Consolidated page now has 5 tabs: Org Chart, Departments, Positions, Teams, Grades
- [x] Admin sidebar now has 4 clean items: User Management, Employee Database, Access Control & Permissions, Organization Management

### Phase 33: Social Module Fix (COMPLETE - March 9, 2026)
**Fixed Social Dashboard 404 errors:**
- [x] Fixed incorrect API paths in `Dashboard.jsx`:
  - Changed `api.get('/api/analytics/overview')` → `socialAPI.getAnalytics()`
  - Changed `api.get('/api/posts?limit=10')` → `socialAPI.getPosts({ limit: 10 })`
- [x] Implemented client-side CSV export (was calling non-existent endpoint)
- [x] Implemented mock Social Listening feature (was calling non-existent endpoint)
- [x] Dashboard now displays correctly with stats, charts, and recent activity

### Phase 34: HR Backend Clean Architecture (COMPLETE - March 9, 2026)
**Separated User (Auth) from Employee (HR) data:**
- [x] Created `/app/backend/models/employee.py` with clean Employee models
- [x] Created `/app/backend/routes/hr_v2.py` with new HR v2 routes
- [x] Created `/app/backend/scripts/migrate_employees.py` migration script
- [x] HR v2 API endpoints using separate `employees` collection:
  - `GET /api/hr/v2/employees` - List employees
  - `GET /api/hr/v2/employees/{id}` - Get employee details
  - `GET /api/hr/v2/employees/by-user/{user_id}` - Get employee by user
  - `POST /api/hr/v2/employees` - Create employee (links to user)
  - `PUT /api/hr/v2/employees/{id}` - Update employee HR data
  - `DELETE /api/hr/v2/employees/{id}` - Terminate employee
  - `GET /api/hr/v2/employees/{id}/reporting-chain` - Reporting chain
  - `GET /api/hr/v2/employees/{id}/direct-reports` - Direct reports
  - `GET /api/hr/v2/org-chart` - Organization chart
  - `GET /api/hr/v2/stats/overview` - HR stats overview
  - `GET /api/hr/v2/stats/by-department` - Stats by department
  - `GET /api/hr/v2/stats/by-grade` - Stats by grade
- [x] Backward compatibility: v1 routes (`/api/hr/*`) still work with `users` collection
- [x] Data model: `employees` linked to `users` via `user_id` field

### Phase 35: Complete Architecture Migration (COMPLETE - March 9, 2026)
**1. Employee Migration Complete:**
- [x] Migrated 54 users to `employees` collection (55 total employees)
- [x] Updated `EmployeeDatabase.jsx` to use `/api/hr/v2/` endpoints
- [x] Updated `OrganizationManagement.jsx` to use v2 endpoints
- [x] All employee data now in dedicated `employees` collection
- [x] Users linked via `employee_id_ref` field

**2. Database Indexes Added:**
- [x] Created 22 performance indexes across key collections:
  - `employees`: user_id, employee_code, department+status, reports_to, grade_id
  - `users`: email (unique), employee_id_ref
  - `contacts`: email, contact_type+status, campaign_id, text search (name+email)
  - `pm_tasks`: project+status, assigned_to+status, due_date
  - `notifications`: user_id+read+created_at
  - `influencers`: score, status
  - `marketing_campaigns`: status, created_at
  - `departments`: code (unique)
  - `support_tickets`: user_id+status, priority
- [x] Created `/app/backend/scripts/manage_indexes.py` for index management

**3. Core Module Structure:**
- [x] Created `/app/backend/core/` for shared utilities
- [x] Added `database.py` with `DatabaseMixin` for clean DB access
- [x] Module pattern ready for future route extraction

**4. Modular Routes Created:**
- [x] `/app/backend/modules/marketing/routes.py` - 25 routes extracted
- [x] `/app/backend/modules/sales/routes.py` - 20 routes extracted
- [x] `/app/backend/modules/social/routes.py` - 20 routes extracted
- [x] Total: 65 modular routes ready for migration
- [x] server.py inline routes preserved for backward compatibility

### Phase 36: Guided Walkthrough Feature (COMPLETE - March 9, 2026)
**Replaced react-joyride with intro.js:**
- [x] Installed `intro.js@8.3.2`
- [x] Updated `/app/frontend/src/components/GuidedTour.jsx` to use intro.js
- [x] Created `/app/frontend/src/components/TourTrigger.jsx` - floating tour menu
- [x] Created custom CSS styles matching Sevora theme
- [x] Tour definitions for:
  - Platform Overview (4 steps)
  - Project Management (5 steps)
  - Marketing Operations (5 steps)
  - Admin Panel (5 steps)
  - Employee Onboarding (3 steps)
  - Social Media (3 steps)
  - Notifications Center (3 steps)
- [x] Features: Progress bar, step numbers, keyboard navigation, localStorage persistence
- [x] Floating help button (?) in bottom-right corner for easy access

### Phase 37: Unified Contacts & Route Migration (COMPLETE - March 9, 2026)
**1. Merged Contacts/Influencers/Publications:**
- [x] Migrated 12 influencers + 5 publications → unified `contacts` collection
- [x] Created `/app/backend/modules/contacts/routes.py` with unified API:
  - `GET /api/contacts` - All contacts with filters (type, status, tier)
  - `GET /api/contacts/stats` - Statistics by type, status, tier
  - `GET /api/contacts/{id}` - Single contact with campaign & payment info
  - `POST /api/contacts` - Create contact
  - `PUT /api/contacts/{id}` - Update contact
  - `DELETE /api/contacts/{id}` - Delete contact
  - `POST /api/contacts/bulk/assign-campaign` - Bulk campaign assignment
  - `POST /api/contacts/bulk/update-status` - Bulk status update
  - `GET /api/contacts/type/influencers` - Legacy compatibility
  - `GET /api/contacts/type/publications` - Legacy compatibility
- [x] Updated inline influencer routes in server.py to use unified contacts collection
- [x] Score calculation for ranking contacts by engagement/reach

**2. Updated Marketing Routes:**
- [x] `/api/marketing/influencers` now queries unified `contacts` collection
- [x] Backward compatibility: fallback to old `influencers` collection if needed

**3. Added data-tour Attributes:**
- [x] Layout.jsx: `data-tour="user-menu"` on user dropdown
- [x] EmployeeDatabase.jsx: `data-tour="overview-tab"`, `data-tour="employees-tab"`, `data-tour="onboarding-tab"`
- [x] ContactsHubPage.jsx: `data-tour="marketing-contacts"`, `data-tour="add-influencer"`
- [x] MyTasks.jsx: `data-tour="my-tasks"`, `data-tour="create-task"`

### Phase 38: Human Resource - Expense & Reimbursement Module (COMPLETE - March 9, 2026)
**1. Backend Implementation:**
- [x] Created `/app/backend/routes/expense.py` with full CRUD API:
  - `POST /api/expense/claims` - Submit new expense claim
  - `GET /api/expense/claims/my` - User's claims history
  - `GET /api/expense/claims/my/stats` - User statistics
  - `GET /api/expense/claims` - All claims (HR only)
  - `GET /api/expense/claims/stats` - HR statistics
  - `GET /api/expense/claims/{id}` - Claim detail (by UUID or SEVRC ID)
  - `PUT /api/expense/claims/{id}/approve` - Approve claim with optional notes
  - `PUT /api/expense/claims/{id}/reject` - Reject claim (requires reason)
  - `POST /api/expense/upload-receipt` - File upload for receipts
  - `GET /api/expense/receipts/{filename}` - Serve uploaded files
  - `GET /api/expense/limits` - Get expense limits by grade
  - `POST /api/expense/limits` - Set expense limit for a grade
  - `GET /api/expense/export/csv` - Export claims to CSV
- [x] Created `/app/backend/models/expense.py` with Pydantic models
- [x] Auto-generated claim IDs in SEVRC001 format
- [x] File upload with validation (5MB limit, JPEG/PNG/WebP/PDF only)
- [x] In-app notifications on claim submission and status change

**2. Email Notifications via Microsoft Graph API:**
- [x] Created `/app/backend/services/graph_email_service.py`
- [x] Beautiful HTML email templates for:
  - HR notification on new claim submission
  - Employee notification on claim approval
  - Employee notification on claim rejection
- [x] Background task processing (non-blocking)
- [x] Graceful fallback if Graph API not configured

**3. Frontend Implementation:**
- [x] Created `/app/frontend/src/pages/hr/ExpenseManagement.jsx`
- [x] Three-tab interface: Submit Claim, My Claims, HR Approval
- [x] Submit Claim tab:
  - Employee info auto-populated
  - Multiple expense entries with date range, category, description, amount
  - Receipt upload per entry
  - Total amount calculation
  - Declaration checkbox required
- [x] My Claims tab:
  - Claim history table with status badges
  - Status filter dropdown
  - View claim details modal
- [x] HR Approval tab (for admin/HR users):
  - HR-specific statistics cards
  - All claims table with employee details
  - Review modal with approve/reject actions
  - Rejection reason required for rejection
- [x] Added "Human Resource" module to sidebar in Layout.jsx
- [x] Added route `/hr/expenses` in App.js

**4. Testing:**
- [x] Backend tests: 24/24 passed (`/app/backend/tests/test_expense_module.py`)
- [x] Frontend UI testing: All features verified
- [x] Email notifications confirmed working via backend logs

**Documentation:**
- [x] Created `/app/memory/GRAPH_EMAIL_SETUP.md` - Guide for Azure AD setup

### Key API Endpoints
- `GET /api/projects/manager-dashboard` - Aggregated dashboard data
- `GET, POST /api/projects/modules` - CRUD for modules
- `GET, POST /api/projects` - List and create projects
- `GET /api/projects/{project_id}` - Single project details
- `GET /api/projects/my-tasks` - User's assigned tasks
- `GET /api/hr/grades` - List all grade types
- `POST /api/hr/grades` - Create grade type
- `GET /api/hr/employees` - List employees with filters
- `GET /api/hr/employees/{id}` - Get employee details
- `PUT /api/hr/employees/{id}` - Update employee
- `GET /api/hr/employees/{id}/reporting-chain` - Get reporting chain
- `GET /api/hr/org-chart` - Get organization chart
- `GET /api/hr/stats/overview` - Get HR overview stats
- `GET /api/hr/stats/by-department` - Get stats by department
- `GET /api/hr/stats/by-grade` - Get stats by grade
- `GET /api/access/roles` - List all custom roles
- `POST /api/access/roles` - Create new custom role
- `PUT /api/access/roles/{id}` - Update custom role
- `DELETE /api/access/roles/{id}` - Delete (soft) custom role
- `GET /api/access/modules` - Get system module definitions
- `GET /api/access/draft-users` - List users pending onboarding
- `POST /api/access/onboard/{user_id}` - Onboard a draft user
- `GET /api/access/my-access` - Get current user's access profile
- `GET /api/access/check/{module_key}` - Check module access permission

### Project Management Enhanced Endpoints (New)
- `POST /api/projects` - Create project with visibility field (public/private), creator auto-added to team
- `GET /api/projects/list` - List projects with visibility filtering (admins see all, others see public + team member projects)
- `PUT /api/projects/{id}` - Update project visibility and other fields
- `POST /api/projects/{project_id}/members` - Add team member to project
- `DELETE /api/projects/{project_id}/members/{member_id}` - Remove team member from project
- `POST /api/projects/tasks` - Create task with optional project_id (individual tasks)
- `GET /api/projects/individual-tasks` - Get individual tasks (not linked to any project)

### 3rd Party Integrations
- Microsoft Azure AD / Graph API (SSO, Email)
- OpenAI GPT-4o (via emergentintegrations)
- Twilio (WhatsApp - Sandbox mode)
- Instagram Graph API
- YouTube Data API
- APScheduler (Backend automation)

---

## Test Credentials
- **Super Admin**: superadmin@sevora.com / superadmin123
- **Marketing Manager**: marketing@sevora.com / admin123

## Test Reports
- `/app/test_reports/iteration_29.json`
- `/app/test_reports/iteration_32.json` - Access Control tests (42/42 passed)
- `/app/test_reports/iteration_33.json` - Organization Structure tests (19/19 passed)
- `/app/test_reports/iteration_34.json` - Expense & Reimbursement tests (24/24 passed)
- `/app/test_reports/iteration_35.json` - Project Visibility & Team Management tests (16/16 passed)
- `/app/backend/tests/test_manager_dashboard.py`
- `/app/backend/tests/test_access_control.py` - Access Control backend tests
- `/app/backend/tests/test_organization_structure.py` - Organization Structure backend tests
- `/app/backend/tests/test_expense_module.py` - Expense module backend tests
- `/app/backend/tests/test_project_visibility_team.py` - Project visibility and team management tests

### Phase 31: Enhanced Project Edit Modal (COMPLETE - March 9, 2026)
- [x] **Rich Text Description**: TipTap editor with full formatting (Bold, Italic, H1/H2, Lists, Quote, Code, Links, Images, Tables)
- [x] **Team Management Tab**: Add/remove team members directly in edit modal
- [x] **Project Attachments Tab**: Upload, view, delete project files
- [x] Backend: New project_attachments collection with CRUD endpoints
- [x] Tabbed interface: Details | Team | Files

### Phase 30: Project Management Gap Fixes (COMPLETE - March 9, 2026)
- [x] **Quick Add Task with Assign To**: Can now delegate tasks to others without going into a project
  - Added "Assign To" dropdown with user list in Quick Add modal
  - Button text changes to "Assign Task" when assigning to others
  - Users list filtered to active users only
- [x] **Project Status in Edit Modal**: Can now change project lifecycle status
  - Added Status dropdown: Draft, Active, On Hold, Completed, Cancelled
  - Added Project Manager selection dropdown
- [x] **Task Duplication**: Can now duplicate tasks with one click
  - Added "Duplicate" button in Task Detail modal header
  - Creates copy with "(Copy)" suffix, same properties

### Phase 29: Bug Fixes & UX Improvements (COMPLETE - March 9, 2026)
- [x] Fixed: My Tasks clicking task now opens Task Detail Modal (not navigate away)
- [x] Fixed: Project Edit modal added - can edit name, description, visibility, priority, dates
- [x] Fixed: Add Team Members API - added POST endpoint accepting user_id in body
- [x] Added: TaskDetailModal integration in MyTasks page with proper state management

### Phase 28: Task Assignment Control, Monitoring & Rich Text (COMPLETE - March 9, 2026)
- [x] Backend: New endpoint `GET /api/projects/assigned-by-me` for tasks delegated to others
- [x] Backend: Task Reminders CRUD - POST/GET/DELETE `/api/projects/reminders`
- [x] Backend: Scheduler job for processing due reminders and sending notifications
- [x] Frontend: "Assigned by Me" tab in My Tasks page showing delegated tasks with progress tracking
- [x] Frontend: Follow-ups tab in Task Detail modal with Add Reminder form (datetime + message)
- [x] Frontend: Rich Text Editor component using TipTap with:
  - Bold, Italic, Underline formatting
  - Headings (H1, H2)
  - Bullet and numbered lists
  - Blockquotes and code blocks
  - Links and images
  - Tables
  - Undo/Redo
- [x] Frontend: Comments now support rich text with HTML rendering
- [x] Frontend: Task descriptions display HTML content

### Task Assignment Monitoring Features
- **Assigned by Me Tab**: See all tasks you've delegated with assignee names, status, due dates
- **Follow-up Reminders**: Set scheduled reminders for any task, receive notifications when due
- **Rich Text**: Full formatting support in comments and descriptions

---

## Recent Additions (March 2026)

### Phase 27: Project Visibility & Team Management (COMPLETE - March 9, 2026)
- [x] Backend: Added `visibility` field (public/private) to ProjectCreate, ProjectUpdate, ProjectResponse
- [x] Backend: Creator auto-added to team_members on project creation
- [x] Backend: Visibility-based filtering in list_projects (admins see all, others see public + their team projects)
- [x] Backend: Made `project_id` optional in TaskCreate for individual tasks
- [x] Backend: Added `is_individual` flag to TaskResponse
- [x] Backend: New endpoint `GET /api/projects/individual-tasks` for standalone tasks
- [x] Frontend: Visibility toggle (Public/Private) in CreateProjectModal
- [x] Frontend: Private badge with Lock icon on project cards and detail page
- [x] Frontend: Team button and TeamManagementModal in ProjectDetail for managing team members
- [x] Frontend: Add/remove team members with user selector
- [x] Frontend: Update visibility from modal
- [x] Frontend: Individual badge on tasks without project in MyTasks page
- [x] Frontend: Quick Add Task now supports individual tasks

### Decoupled Task Structure
- Project Tasks: Linked to a specific project, visible to project team
- Individual Tasks: Standalone tasks for daily responsibilities, not linked to any project
- Both task types appear in My Tasks dashboard with appropriate badges

### Phase 39: Global Search Feature (COMPLETE - December 2025)
- [x] Frontend: New GlobalSearch.jsx component with dialog-based search UI
- [x] Frontend: Cmd/Ctrl+K keyboard shortcut to open search anywhere in the app
- [x] Frontend: Search trigger button in header with ⌘K hint
- [x] Frontend: Search results showing Projects section (project_id, status, progress)
- [x] Frontend: Search results showing Tasks section (priority, project, assignee, due date)
- [x] Frontend: Click result navigates to project or task detail
- [x] Frontend: Empty state with helpful instructions
- [x] Frontend: Footer with keyboard hints (↵ to select, esc to close)
- [x] Backend: Projects search via GET /api/projects/list?search=<query>
- [x] Backend: Tasks search via GET /api/projects/tasks/all?search=<query>
- [x] Layout.jsx updated to include GlobalSearch component in header

### Phase 40: Global Search Quick Filters (COMPLETE - December 2025)
- [x] Frontend: Quick filter bar below search input with 5 filter options
- [x] Filter: "All" (default) - Shows both projects and tasks
- [x] Filter: "Projects" - Shows only project results (10 max)
- [x] Filter: "Tasks" - Shows only task results (12 max)
- [x] Filter: "My Tasks" - Shows tasks assigned to current user
- [x] Filter: "Overdue" - Shows overdue tasks and at-risk projects
- [x] Active filter highlighted in rose color with visual feedback
- [x] Filter label shown in footer when active
- [x] Placeholder text updates based on active filter
- [x] Overdue tasks shown with red icon and "Overdue" badge
- [x] At-risk projects shown in Overdue filter

### Phase 41: Goals & Objectives Module - Phase 1 (COMPLETE - December 2025)
**New Module Implementation:**
- [x] Sidebar: "Goals & Objectives" menu added as FIRST item in navigation
- [x] Sub-menus: Dashboard, Strategic Goals, Objectives, Fiscal Years

**Backend (routes/goals.py):**
- [x] Fiscal Years CRUD with auto-generated Q1-Q4 quarters
- [x] Strategic Goals CRUD with progress calculation
- [x] Objectives CRUD with linking to goals, quarters, departments
- [x] Key Results CRUD with progress tracking
- [x] Progress Updates for objectives
- [x] Dashboard endpoint with statistics

**Frontend Pages:**
- [x] GoalsDashboard.jsx - Overview with stats, quarterly progress, dept breakdown
- [x] StrategicGoals.jsx - Grid view with filters, create/edit modal
- [x] FiscalYears.jsx - List with collapsible quarters, create/edit modal
- [x] Objectives.jsx - Grid view with filters, create/edit modal

**Database Collections:**
- [x] fiscal_years - FY name, dates, status
- [x] quarters - Linked to fiscal year, date ranges
- [x] strategic_goals - Title, description, FY, owner, priority, status
- [x] objectives - Title, goal, quarter, dept, owner, dates, progress
- [x] key_results - Target/current values, progress tracking
- [x] objective_updates - Progress history

### Phase 42: Project-Objective Linking (COMPLETE - December 2025)
**Backend:**
- [x] Added `linked_objective_id` field to ProjectCreate/ProjectUpdate models
- [x] Added `linked_objective_title` field to ProjectResponse model
- [x] GET /api/projects/objectives-list - Returns active objectives for dropdown
- [x] Auto-recalculate objective progress when task status changes
- [x] `recalculate_objective_progress()` helper function aggregates linked project progress

**Frontend:**
- [x] "Link to Objective" dropdown in Create Project modal
- [x] "Linked Objective" dropdown in Edit Project modal (Details tab)
- [x] Objective badge on project cards showing linked objective title
- [x] Target icon imported for objective indicators

### Phase 43: Objective Detail Page (COMPLETE - December 2025)
**Full Objective Detail View:**
- [x] ObjectiveDetail.jsx - Comprehensive detail page at /goals/objectives/:objectiveId
- [x] Header with title, status/priority badges, strategic goal, quarter, department
- [x] Stats cards: Overall Progress, Key Results count, Linked Projects count, Target Date
- [x] Tabbed interface: Overview, Key Results, Projects, Updates

**Key Results Feature:**
- [x] Key Results list with progress bars
- [x] Add/Edit/Delete Key Results via modal
- [x] Unit types: Number, Percentage, Currency, Milestone
- [x] Auto-calculate progress (current/target * 100)

**Linked Projects View:**
- [x] Projects tab showing all linked projects
- [x] Project cards with name, ID, status, task count, progress, owner
- [x] Click to navigate to project detail

**Progress Updates:**
- [x] Updates tab with history of progress changes
- [x] Add Update modal with progress %, note, blockers
- [x] Blocker highlighting with red badge
- [x] Timestamp and updated_by tracking

### Manager Dashboard Status (Verified Working - December 2025)
The Manager Dashboard was already functional with:
- [x] Project Stats: Total, Active, Completed, On Hold, At Risk counts
- [x] Task Stats: Total, Completed, Overdue, Unassigned, Blocked counts
- [x] Donut Chart: Projects by Status (Draft/Active/On Hold/Completed/Cancelled)
- [x] Donut Chart: Projects by Priority (Urgent/High/Medium/Low)
- [x] Bar Chart: Weekly Task Completion (last 7 days)
- [x] Team Workload Card: Shows members with task counts and completion %
- [x] At-Risk Projects Card: Projects with overdue tasks or past deadlines
- [x] Upcoming Deadlines Card: Projects ending within 7 days
- [x] Recent Activity Card: Latest activity log entries

### Phase 44: Goals & Objectives Enhancements (COMPLETE - December 2025)
**Rich Text Editors:**
- [x] RichTextEditor component for Strategic Goals description field
- [x] RichTextEditor component for Objectives description field
- [x] Full Tiptap toolbar (bold, italic, underline, headings, lists, code, links, images, tables)
- [x] Backend preserves HTML content in description fields

**Multi-Select Quarters:**
- [x] Objectives can now be linked to multiple quarters
- [x] ObjectiveCreate.quarter_ids: List[str] (backend model)
- [x] UI with badge-based multi-select + "Add more quarters" dropdown
- [x] Backward compatible with old single quarter_id data

**Dynamic Departments:**
- [x] GET /api/goals/departments fetches from Organization Management
- [x] Falls back to user departments if no departments collection
- [x] Department dropdowns in Objectives form dynamically populated

**Project Form Simplification:**
- [x] Removed "Module" field from Create Project modal
- [x] Removed "Project Type" field from Create Project modal
- [x] Removed "Module" field from Edit Project modal
- [x] Removed "Project Type" field from Edit Project modal
- [x] Backend ProjectCreate model updated to make module_id optional

**Objective Deadline Notifications (Scheduler):**
- [x] process_objective_deadline_notifications() in scheduler_service.py
- [x] Runs daily at 9 AM UTC via APScheduler cron job
- [x] Notifies owners of objectives due in 7 days, 3 days, or overdue
- [x] Priority: URGENT for overdue, HIGH for 3 days, MEDIUM for 7 days
- [x] Creates notifications with action_url to objective detail page

### Phase 45: Project Management UI Enhancements (COMPLETE - December 2025)
**Create Project Modal Redesign:**
- [x] Added tabbed interface matching Edit modal (Details, Team tabs)
- [x] Rich Text Editor for project description
- [x] Team tab with user dropdown and add/remove member functionality
- [x] Form reset on modal open

**Projects List View:**
- [x] Added Grid/List view toggle buttons
- [x] ProjectListView component with table layout
- [x] Columns: Project (name + linked objective), Status, Priority, Progress bar, Tasks count, Due Date, Actions
- [x] Alternating row colors, hover states, click to navigate

**My Tasks UI/UX Enhancement:**
- [x] Redesigned TaskCard with status indicator icons
- [x] Color-coded status backgrounds (red=overdue, green=completed, purple=in_progress)
- [x] Project name in pill badges
- [x] Priority, due date, checklist as colored pills
- [x] Hover effects with shadows and lift animation
- [x] Collapsible sections with rotating chevron arrows
- [x] Improved section headers with larger icons and task counts

### Phase 46: Help Center Documentation (COMPLETE - December 2025)
**Goals & Objectives Help Content:**
- [x] Overview article: Module introduction, key concepts, navigation
- [x] How It Works article: Step-by-step workflow, progress calculation, status workflow
- [x] Key Features article: Goal management, objective management, key results, project integration
- [x] Troubleshooting article: Common issues and solutions, best practices
- [x] Definitions & Glossary article: All terms defined (Goals, Objectives, Key Results, OKR, etc.)
- [x] Best Practices Guide article: SMART framework, quarterly planning, team alignment
- [x] 10 FAQs covering: Goal vs Objective difference, Key Results usage, progress calculation, multi-quarter selection, linking projects, fiscal year setup, deadline notifications, etc.

**Project Management Help Content:**
- [x] Overview article: Module introduction, components, key features
- [x] How It Works article: Project lifecycle, task management, My Tasks workflow, views explained
- [x] Key Features article: Project creation, view options, task management, team management
- [x] Troubleshooting article: Common issues and solutions
- [x] Best Practices Guide article: Project planning, task creation, team management, progress tracking
- [x] 11 FAQs covering: Creating projects, Grid vs List view, adding team members, changing task status, progress calculation, linking objectives, deleting projects, status colors, etc.

**Technical Implementation:**
- [x] Created seed script: `/app/backend/scripts/seed_help_content.py`
- [x] Auto-generated help_modules, help_articles, help_faqs in MongoDB
- [x] Articles use Markdown format rendered by Help Center
- [x] FAQs displayed as expandable accordion
- [x] Tags and related articles sidebar

### Phase 47: Recurring Tasks Feature (COMPLETE - December 2025)
**Backend Implementation:**
- [x] Created `RecurringTaskTemplateCreate`, `RecurringTaskTemplateUpdate`, `RecurringTaskTemplateResponse` Pydantic models
- [x] Created `RecurrenceType`, `RecurrenceEndType`, `MonthlyRepeatType` enums
- [x] CRUD endpoints for recurring task templates:
  - `GET /api/projects/recurring-templates` - List with filters (search, recurrence_type, is_active, is_paused)
  - `POST /api/projects/recurring-templates` - Create template
  - `GET /api/projects/recurring-templates/{id}` - Get single template
  - `PUT /api/projects/recurring-templates/{id}` - Update template
  - `DELETE /api/projects/recurring-templates/{id}` - Delete template
  - `POST /api/projects/recurring-templates/{id}/pause` - Pause template
  - `POST /api/projects/recurring-templates/{id}/resume` - Resume template
  - `POST /api/projects/recurring-templates/{id}/generate-now` - Manually generate task
  - `GET /api/projects/recurring-templates/{id}/generated-tasks` - List generated tasks
- [x] Dashboard endpoint: `GET /api/projects/recurring-dashboard` with stats
- [x] Route order fix: Recurring routes registered before `/{project_id}` catch-all
- [x] Scheduler job `process_recurring_tasks()` runs hourly to auto-generate tasks

**Frontend Implementation:**
- [x] `RecurringTasks.jsx` page at `/projects/recurring`
- [x] Dashboard stats cards: Active Templates, Paused, Generated Today, This Week
- [x] Template cards with status badges, recurrence description, next occurrence
- [x] Create/Edit modal with tabbed interface (Task Details, Recurrence)
- [x] Actions dropdown menu (Edit, Generate Now, Pause/Resume, Delete)
- [x] Upcoming Occurrences section (next 7 days)
- [x] Filter bar with search, frequency filter, status filter

**Task Integration:**
- [x] Generated tasks have `parent_recurring_id` field linking to template
- [x] Recurring indicator badge in `MyTasks.jsx` TaskCard component
- [x] Recurring indicator in `TaskDetailModal.jsx` header

**Testing:**
- [x] 17/17 backend tests passed
- [x] All frontend features verified

### Phase 47b: Recurring Tasks Dashboard & Reporting (COMPLETE - December 2025)
**Enhanced Dashboard Metrics:**
- [x] completion_rate - percentage of completed recurring tasks
- [x] overdue_recurring - count of overdue generated tasks
- [x] in_progress_recurring - count of in-progress tasks
- [x] by_project - array with project stats
- [x] by_assignee - array with assignee stats
- [x] weekly_trend - 4 weeks of generation data
- [x] top_templates - top 5 by occurrences_generated

**Dashboard & Reports Tab:**
- [x] 6 key metrics cards (Total, Generated, Completion Rate, Completed, In Progress, Overdue)
- [x] Weekly Generation Trend bar chart
- [x] Templates by Frequency breakdown
- [x] Top Templates ranking
- [x] By Project section
- [x] By Assignee section

**Project Integration:**
- [x] Project filter dropdown in Templates tab
- [x] project_id filter parameter for API

**Quick Recurring Button (My Tasks):**
- [x] Daily Standup - Creates daily template (Mon-Fri)
- [x] Weekly Report - Creates weekly template (Fridays)
- [x] Monthly Review - Creates monthly template (Last Friday)
- [x] Custom Recurring... link to full page

**Testing:**
- [x] 11/11 Phase 2 backend tests passed
- [x] All frontend features verified

---

## Pending Issues

### P1 - Upcoming Tasks
- [ ] Apply consistent Edit/Save/Cancel UX to other pages
- [ ] Complete `server.py` route extraction

### P2 - Future Tasks
- [ ] Bulk Task Operations (checkboxes for bulk actions)
- [ ] Time Tracking Rollup (aggregate to project level)
- [ ] Task Status Change Notifications
- [ ] Complete unification of Contacts frontend
- [ ] Implement `@mentions` in comments (deferred)

### Phase 48: Meeting & Review Management System - Phase 1 (COMPLETE - December 2025)
**Backend Implementation:**
- [x] Created comprehensive Pydantic models in `/app/backend/models/meetings.py`
  - MeetingType enum (14 types: OKR Review, Sprint Planning, Daily Standup, etc.)
  - MeetingStatus, MeetingVisibility, ActionItemStatus enums
  - MeetingCreate, MeetingUpdate, MeetingResponse models
  - AgendaItem, DiscussionNote, ActionItem, MeetingParticipant models
  - MeetingMinutes, MeetingDashboard, MeetingAnalytics models
- [x] Created API routes in `/app/backend/routes/meetings.py`
  - `GET/POST /api/meetings` - List/Create meetings
  - `GET/PUT/DELETE /api/meetings/{id}` - CRUD operations
  - `POST /api/meetings/{id}/start` - Start meeting
  - `POST /api/meetings/{id}/complete` - Complete meeting
  - `POST /api/meetings/{id}/notes` - Add discussion notes
  - `POST /api/meetings/{id}/action-items` - Add action items
  - `POST /api/meetings/{id}/action-items/{id}/convert-to-task` - Convert to task (with confirmation)
  - `POST /api/meetings/{id}/minutes` - Create meeting minutes (manual or auto-generated)
  - `GET /api/meetings/{id}/previous-context` - Get previous meeting context
  - `GET /api/meetings/dashboard/overview` - Dashboard stats
  - `GET /api/meetings/analytics/overview` - Analytics data

**Frontend Implementation:**
- [x] `/app/frontend/src/pages/meetings/MeetingList.jsx`
  - Dashboard stats (Today's Meetings, Upcoming, Action Items, Overdue)
  - Tabs: Upcoming, Past, Calendar (placeholder)
  - Meeting cards with type badges, status, location, participants
  - Linked items display (Project, Goal, Department)
  - Filter by type, search
- [x] `/app/frontend/src/pages/meetings/CreateMeeting.jsx`
  - Four-tab form: Details, Agenda, Participants, Resources
  - Meeting type selection (14 types categorized)
  - Schedule: Date, time, location, meeting link
  - Link to Goals & Projects section
  - Agenda items with presenter and duration
  - Pre-read documents
  - Microsoft Outlook sync option

**Navigation:**
- [x] Added "Meetings & Reviews" module to sidebar
- [x] Routes: /meetings, /meetings/new

### Phase 48b: Meeting & Review Management System - Phase 2 (COMPLETE - December 2025)
**MeetingDetail Page (`/app/frontend/src/pages/meetings/MeetingDetail.jsx`):**
- [x] Header with meeting info, status badge, type badge
- [x] Action buttons: Start Meeting, Complete Meeting, Meeting Minutes, Edit
- [x] Linked items display (Project, Goal, Department)
- [x] Four tabs: Overview, Discussion Notes, Action Items, Previous Context

**Overview Tab:**
- [x] Meeting Agenda with numbered items and durations
- [x] Participants list with avatars and roles
- [x] Description section
- [x] Pre-read Documents with external links

**Discussion Notes Tab:**
- [x] Notes list with topic, notes, related goal/project
- [x] Add Note modal
- [x] Delete note functionality

**Action Items Tab:**
- [x] Action items list with status, priority, assignee, deadline
- [x] Add Action Item modal
- [x] Update status (In Progress, Complete)
- [x] Convert to Task dialog with project selection (requires confirmation)

**Previous Context Tab:**
- [x] Previous meeting info with link
- [x] Completed/Pending/Overdue action items summary

**Meeting Minutes:**
- [x] Meeting Minutes modal with Summary, Key Discussions, Decisions, Next Steps
- [x] Auto-Generate button creates minutes from discussion notes & action items
- [x] Manual entry option

**Backend APIs:**
- [x] `POST /api/meetings/{id}/start` - Start meeting
- [x] `POST /api/meetings/{id}/complete` - Complete meeting
- [x] `POST /api/meetings/{id}/notes` - Add discussion note
- [x] `DELETE /api/meetings/{id}/notes/{id}` - Delete note
- [x] `POST /api/meetings/{id}/action-items` - Add action item
- [x] `PUT /api/meetings/{id}/action-items/{id}` - Update status
- [x] `POST /api/meetings/{id}/action-items/{id}/convert-to-task` - Convert to task
- [x] `GET /api/meetings/{id}/previous-context` - Previous meeting context
- [x] `POST /api/meetings/{id}/minutes` - Create minutes (manual)
- [x] `POST /api/meetings/{id}/minutes/generate` - Auto-generate minutes

**Testing:**
- [x] 22/22 backend tests passed (100%)
- [x] All frontend features verified via Playwright

**Remaining for Phase 3:**
- [x] Microsoft Calendar sync integration (Graph API) - Calendar view implemented with FullCalendar
- [x] Meeting Analytics dashboard with charts
- [x] Decision Log tracking
- [x] Issue/Risk Tracker
- [x] Calendar view with FullCalendar integration

### Phase 48c: Meeting & Review Management System - Phase 3 (COMPLETE - December 2025)
**Decision Log Feature:**
- [x] Backend: Decision model with title, description, decision_owner, impact, impact_area, rationale, linked_project, linked_goal
- [x] Backend: `POST /api/meetings/{id}/decisions` - Add decision
- [x] Backend: `DELETE /api/meetings/{id}/decisions/{id}` - Delete decision
- [x] Backend: `GET /api/meetings/all-decisions` - Get all decisions across meetings
- [x] Frontend: Decisions tab in MeetingDetail with list and badges
- [x] Frontend: Record Decision modal with full form

**Issues & Risks Tracker Feature:**
- [x] Backend: IssueRisk model with type (issue/risk), title, description, impact, probability, owner, resolution_plan, status, due_date
- [x] Backend: `POST /api/meetings/{id}/issues-risks` - Add issue/risk
- [x] Backend: `PUT /api/meetings/{id}/issues-risks/{id}` - Update status (open, in_progress, resolved, mitigated, closed)
- [x] Backend: `DELETE /api/meetings/{id}/issues-risks/{id}` - Delete item
- [x] Backend: `GET /api/meetings/all-issues-risks` - Get all issues/risks across meetings
- [x] Frontend: Issues & Risks tab in MeetingDetail with list and status actions
- [x] Frontend: Add Issue/Risk modal with Issue/Risk toggle

**Calendar View Feature:**
- [x] Installed FullCalendar packages (@fullcalendar/react, core, daygrid, timegrid, interaction)
- [x] Backend: `GET /api/meetings/calendar?start_date=&end_date=` - Calendar events endpoint
- [x] Frontend: Calendar tab in MeetingList with FullCalendar component
- [x] Frontend: Month/Week views with meeting events
- [x] Frontend: Click event to navigate to meeting detail
- [x] Frontend: Custom styling matching cream/beige theme

**Analytics Dashboard Feature:**
- [x] Backend: `GET /api/meetings/analytics/overview` returns:
  - total_meetings, total_decisions, total_action_items, action_items_completed, completion_rate
  - meetings_by_month, meetings_by_type, meetings_by_department, top_organizers
- [x] Frontend: Analytics tab in MeetingList
- [x] Frontend: Key metrics cards (5 stats)
- [x] Frontend: Meetings by Month bar chart
- [x] Frontend: Meetings by Type breakdown
- [x] Frontend: Meetings by Department section
- [x] Frontend: Top Organizers section

**Bug Fixes:**
- [x] Fixed FastAPI route order bug - /all-decisions and /all-issues-risks routes moved before /{meeting_id}

**Testing:**
- [x] 21/21 backend tests passed (100%)
- [x] All frontend features verified via Playwright

### Phase 48d: Meeting & Review Management System - Phase 3 Enhancements (COMPLETE - December 2025)
**Recurring Meetings Feature:**
- [x] Backend: `create_next_recurring_meeting()` helper function in routes/meetings.py
- [x] Backend: Enhanced `POST /api/meetings/{id}/complete` - Auto-creates next occurrence for recurring meetings
- [x] Backend: Returns `next_recurring_meeting_id` in response when recurring
- [x] Backend: Supports daily, weekly, monthly, quarterly recurrence patterns
- [x] Backend: Respects recurrence_end_date to stop auto-creation
- [x] Backend: Next occurrence inherits agenda, participants, linked items
- [x] Frontend: Recurring badge in meeting detail header (blue with RefreshCw icon)

**Enhanced Meeting Minutes:**
- [x] Backend: Auto-generate minutes now includes decisions from Decision Log
- [x] Backend: Auto-generate minutes includes open issues/risks in next_steps section
- [x] Backend: Better formatting with meeting type in summary

**Enhanced Previous Meeting Context:**
- [x] Backend: PreviousMeetingContext model updated with key_decisions (List[Decision])
- [x] Backend: PreviousMeetingContext model updated with open_issues_risks (List[IssueRisk])
- [x] Frontend: "Key Decisions from Previous Meeting" section in Previous Context tab (purple styling)
- [x] Frontend: "Open Issues/Risks Carried Forward" section in Previous Context tab (amber styling)

**Testing:**
- [x] 9/9 backend tests passed (100%)
- [x] All frontend features verified via Playwright

### Phase 48e: Meeting Templates & MS Calendar Infrastructure (COMPLETE - December 2025)
**Meeting Templates Feature:**
- [x] Backend: MeetingTemplate model with name, description, category, meeting_type, duration, default_agenda
- [x] Backend: `GET /api/meetings/templates` - List all templates (user's own + global)
- [x] Backend: `POST /api/meetings/templates` - Create new template
- [x] Backend: `GET/PUT/DELETE /api/meetings/templates/{id}` - CRUD operations
- [x] Backend: `POST /api/meetings/templates/{id}/create-meeting` - Create meeting from template
- [x] Frontend: MeetingTemplates.jsx page at /meetings/templates
- [x] Frontend: Template cards with category badges, duration, agenda count, usage count
- [x] Frontend: Create Template modal with agenda builder
- [x] Frontend: Schedule from Template modal
- [x] Frontend: Templates button in /meetings page header

**Recurring Meeting Badge in List:**
- [x] Backend: MeetingListItem model updated with recurrence_type field
- [x] Backend: meeting_to_list_item() returns recurrence_type
- [x] Frontend: Blue recurring badge with RefreshCw icon in MeetingCard (Upcoming & Past tabs)

**MS Calendar Sync Infrastructure:**
- [x] Backend: MSCalendarConnection model for OAuth state and tokens
- [x] Backend: `GET /api/meetings/ms-calendar/status` - Connection status
- [x] Backend: `POST /api/meetings/ms-calendar/connect` - Returns OAuth authorization URL
- [x] Backend: `GET /api/meetings/ms-calendar/callback` - OAuth callback handler
- [x] Backend: `POST /api/meetings/ms-calendar/disconnect` - Disconnect calendar
- [x] Backend: `POST /api/meetings/{id}/sync-to-outlook` - Sync meeting to Outlook
- [x] Azure AD credentials are pre-configured in environment

**Bug Fixes:**
- [x] Fixed FastAPI route order - /templates and /ms-calendar routes moved BEFORE /{meeting_id}

**Testing:**
- [x] 9/9 backend tests passed (100%)
- [x] All frontend features verified via Playwright

### Phase 48f: MS Calendar Sync UI (COMPLETE - December 2025)
**Connect Outlook UI:**
- [x] Frontend: "Connect Outlook" button in /meetings page header
- [x] Frontend: MS Calendar connection modal with status display
- [x] Frontend: Shows benefits list (sync, calendar invites, keep in sync)
- [x] Frontend: "Connect with Microsoft" button opens OAuth popup
- [x] Frontend: Polls for connection status after OAuth redirect
- [x] Frontend: "Disconnect" option when connected
- [x] Frontend: Shows connected email when authenticated

**Sync to Outlook UI:**
- [x] Frontend: "Sync to Outlook" button on meeting detail page header
- [x] Frontend: Shows "Synced to Outlook" (green checkmark) when synced
- [x] Frontend: Shows error toast when not connected to calendar
- [x] Frontend: Loading state with spinner during sync

**Testing:**
- [x] 5/5 frontend tests passed (100%)
- [x] All UI interactions verified via Playwright

### Phase 48g: Meeting Module Enhancements (COMPLETE - March 9, 2026)
**Project Integration - Schedule Meeting from Project:**
- [x] Backend: Fixed `get_project_name()` function - was querying wrong collection (projects → pm_projects)
- [x] Frontend: "Schedule Meeting" button added to ProjectDetail.jsx header
- [x] Frontend: Navigation to `/meetings/new?project_id={id}&type=project_review`
- [x] Frontend: Fixed API endpoint in ProjectDetail.jsx (linked_project_id → project_id)
- [x] Frontend: CreateMeeting.jsx correctly pre-fills project dropdown from URL params

**Clickable Linked Items:**
- [x] Frontend: Project badge in MeetingDetail.jsx now clickable → navigates to project detail
- [x] Frontend: Goal badge now clickable → navigates to goal detail
- [x] Frontend: Department badge now clickable → navigates to department detail
- [x] Frontend: External link icons added to indicate navigation
- [x] Frontend: Hover effects and cursor pointer for better UX

**Attendance Tracking Feature:**
- [x] Backend: `PUT /api/meetings/{id}/attendance/{user_id}` - Update individual attendance
- [x] Backend: `PUT /api/meetings/{id}/attendance-bulk` - Bulk update attendance
- [x] Backend: Valid statuses: invited, accepted, declined, tentative, present, late, absent, excused
- [x] Frontend: Attendance dropdown in Participants section (for in_progress/completed meetings)
- [x] Frontend: "Attendance Tracking" badge in header when meeting is active
- [x] Frontend: Attendance Summary section showing Present/Late/Absent/Excused counts
- [x] Frontend: Real-time update on status change with toast notification

**Recurring Meeting Visibility:**
- [x] Frontend: Recurrence type dropdown in CreateMeeting form (None, Daily, Weekly, Monthly, Quarterly)
- [x] Frontend: Blue recurring badge on meeting cards in MeetingList
- [x] Backend: `recurrence_type` field exposed in list API

**Testing:**
- [x] 5/5 features verified via testing agent
- [x] All backend endpoints tested with curl
- [x] Frontend interactions verified via Playwright

### Phase 48h: Goals & Objectives Meeting Integration (COMPLETE - March 9, 2026)
**Sidebar Reorganization:**
- [x] Reordered DEPARTMENT_CONFIG in Layout.jsx
- [x] New order: Goals & Objectives → Meetings & Reviews → Project Management → Marketing Ops

**Objective Detail Integration:**
- [x] Added "Schedule Meeting" button in ObjectiveDetail.jsx header
- [x] Added "Meetings" tab in ObjectiveDetail.jsx (between Projects and Updates)
- [x] Added fetchRelatedMeetings() to load meetings linked to objective
- [x] Navigation: `/meetings/new?objective_id={id}&type=okr_review`
- [x] Meetings tab shows list of related meetings with status badges

**Strategic Goals Integration:**
- [x] Added "Schedule Meeting" option in GoalCard dropdown menu in StrategicGoals.jsx
- [x] Navigation: `/meetings/new?goal_id={id}&type=okr_review`

**Backend Enhancements:**
- [x] Added `objective_id` filter parameter to list_meetings endpoint

**Bug Fixes by Testing Agent:**
- [x] Fixed CreateMeeting.jsx API endpoints:
  - `/api/objectives` → `/api/goals/objectives`
  - `/api/strategic-goals` → `/api/goals/strategic-goals`
- [x] Fixed field name mismatch in dropdowns: `name` → `title` for goals and objectives

**Testing:**
- [x] 8/8 tests passed (100%)
- [x] Sidebar order verified
- [x] Schedule Meeting buttons/dropdowns verified
- [x] URL pre-fills for goal_id and objective_id verified

### Phase 48i: Meeting Module Bug Fixes (COMPLETE - March 10, 2026)
**Bug Fix 1: Edit Meeting (Critical)**
- [x] Added `useParams` to get `meetingId` from URL in CreateMeeting.jsx
- [x] Added `isEditMode` detection and `loading` state
- [x] Added `fetchMeetingData()` to load existing meeting when editing
- [x] Form now pre-fills with all existing meeting data (title, date, time, location, type, recurrence, etc.)
- [x] Title changes from "Schedule Meeting" to "Edit Meeting" in edit mode
- [x] Button changes from "Create Meeting" to "Save Changes"
- [x] handleSubmit uses PUT method when editing, POST when creating

**Bug Fix 2: Cancel Meeting**
- [x] Backend: Added `POST /api/meetings/{id}/cancel` endpoint
- [x] Backend: Added `POST /api/meetings/{id}/postpone` endpoint
- [x] Backend: Sets status to 'cancelled', records cancellation reason, cancelled_by, cancelled_at
- [x] Frontend: Added `handleCancelMeeting` in MeetingDetail.jsx
- [x] Frontend: Added Cancel button (red border, XCircle icon) next to Start Meeting for scheduled meetings
- [x] Frontend: Added `handleCancel` in MeetingList.jsx
- [x] Frontend: Added "Cancel Meeting" dropdown option (amber colored) in MeetingCard for scheduled meetings

**Bug Fix 3: Edit Template**
- [x] Added `isEditMode`, `editingTemplateId` state in MeetingTemplates.jsx
- [x] Added `handleEditTemplate()` to populate form with existing template data
- [x] Added `handleSaveTemplate()` that uses PUT for edit, POST for create
- [x] Added `handleCloseModal()` to reset form and edit state
- [x] Added "Edit Template" option in template card dropdown
- [x] Modal title changes to "Edit Meeting Template" in edit mode
- [x] Button changes to "Save Changes" in edit mode

**Testing:**
- [x] 7/7 tests passed (100%)
- [x] Edit Meeting form pre-fill verified
- [x] Cancel Meeting from list and detail verified
- [x] Edit Template dropdown and modal verified
- [x] All backend APIs verified

### Phase 48j: Advanced Recurring Meeting Features (COMPLETE - March 10, 2026)
**View Series Feature:**
- [x] Backend: `GET /api/meetings/series/{series_id}` - Returns series summary with stats
- [x] Backend: Added `series_id` filter parameter to list_meetings for filtering by series
- [x] Frontend: Recurring badge now clickable with "View Series" text
- [x] Frontend: Series Modal showing:
  - Series title and recurrence type
  - Stats grid (Total/Completed/Upcoming/Cancelled)
  - End date display
  - Scrollable list of all occurrences with status badges
  - "Original" and "Current" badges for context
  - Click to navigate to any occurrence

**Edit Series Feature:**
- [x] Backend: `PUT /api/meetings/series/{series_id}` - Updates all future meetings in series
- [x] Backend: Supports `update_scope` parameter ('future' or 'all')
- [x] Frontend: When saving recurring meeting, shows choice modal:
  - "This meeting only" - Updates single occurrence
  - "All future meetings" - Updates all upcoming meetings in series

**Cancel Series Feature:**
- [x] Backend: `POST /api/meetings/series/{series_id}/cancel` - Cancels all future meetings
- [x] Backend: Supports `cancel_scope` parameter ('future' or 'all')
- [x] Frontend: "Cancel All Future" button (red) in Series modal footer

**Skip Occurrence Feature:**
- [x] Backend: Added `SKIPPED` status to MeetingStatus enum
- [x] Backend: `POST /api/meetings/{id}/skip` - Skips meeting and creates next occurrence
- [x] Frontend: "Skip" button (amber) for recurring scheduled meetings
- [x] Frontend: "Skip This Week" dropdown option in MeetingCard
- [x] Frontend: Added purple status color for "skipped" status

**Recurrence Day Selection:**
- [x] Backend: Updated `create_next_recurring_meeting()` to use day selection fields
- [x] Backend: Weekly meetings respect `recurrence_day_of_week` (0=Monday to 6=Sunday)
- [x] Backend: Monthly meetings respect `recurrence_day_of_month` (1-31)
- [x] Frontend: "Repeat On" dropdown for Weekly - select specific day of week
- [x] Frontend: "Repeat On Day" dropdown for Monthly - select day of month (1st-31st)
- [x] Frontend: Recurring badge shows day info: "Weekly (Fri)" or "Monthly (15th)"

**Series Summary in Header:**
- [x] Backend: Added `series_info` to MeetingResponse model
- [x] Backend: Get meeting endpoint calculates occurrence number and total
- [x] Frontend: "#3 of 10" badge (violet) in meeting detail header

**Testing:**
- [x] All API endpoints verified via curl
- [x] Frontend features verified via Playwright screenshots
- [x] Day selection correctly schedules next occurrence

### Phase 48k: Consistent UX & @Mentions (COMPLETE - March 10, 2026)

**Consistent Edit/Save/Cancel UX:**
- [x] Updated Objectives page dropdown with "View Details", "Schedule Meeting", "Edit", "Delete" options
- [x] Added `onScheduleMeeting` handler to ObjectiveCard component
- [x] Updated Projects page dropdown with "View Details", "Schedule Meeting", "Edit", "Delete" options
- [x] Added `onScheduleMeeting` to ProjectCard and ProjectListView components
- [x] Both modules now navigate to `/meetings/new` with pre-linked entity

**@mentions in Comments:**
- [x] Installed `tippy.js` for mention dropdown popover
- [x] Updated `/app/frontend/src/components/ui/rich-text-editor.jsx`:
  - Added Tiptap Mention extension with suggestion configuration
  - Created MentionList component for user suggestion dropdown
  - Added `onMentionsChange` callback prop to track mentioned users
  - Added `.mention` CSS class for styled mention badges
  - Shows user avatar, name, and email in suggestion list
- [x] Updated `/app/frontend/src/pages/projects/TaskDetailModal.jsx`:
  - Added `mentionedUsers` state tracking
  - Updated `addComment()` to send `mentions` array to backend
  - Connected `onMentionsChange` to RichTextEditor
- [x] Backend already supports mentions with notifications (routes/projects.py lines 2596-2614)

**Testing:**
- [x] 12/12 backend API tests passed
- [x] Objectives dropdown verified with all 4 options
- [x] Projects dropdown verified with all 4 options
- [x] @mentions UI tested - typing @ shows user suggestions
- [x] Comment with mentions successfully created via API

### Phase 49: Schedule Meeting from Chat & Email (COMPLETE - March 10, 2026)

**Feature Parity - Convert to Task & Schedule Meeting:**
- [x] Teams Chat: Added "Schedule Meeting" option in message dropdown menu
- [x] Teams Chat: Meeting modal pre-fills title, date (tomorrow), time (10:00-10:30), and description from chat message
- [x] Teams Chat: Meeting type dropdown with valid backend types (general, one_on_one, project_review, weekly_team_review, daily_standup)
- [x] Teams Chat: Optional location and project link fields
- [x] Teams Chat: Form validation (title and date required)
- [x] Teams Chat: Success toast on meeting creation
- [x] Email: Added "Schedule Meeting" button in email detail dropdown menu
- [x] Email: Added "Schedule Meeting" button in email reply actions row
- [x] Email: Meeting modal pre-fills title, date, and description from email subject and sender
- [x] Email: Same form structure and validation as Teams Chat

**Files Modified:**
- `/app/frontend/src/pages/teams/TeamsChat.jsx`:
  - Added meeting state variables and form
  - Added `openMeetingModal()` and `createMeetingFromMessage()` functions
  - Added "Schedule Meeting" dropdown option with CalendarPlus icon
  - Added full meeting creation modal with all form fields
- `/app/frontend/src/pages/marketing/EmailPage.jsx`:
  - Added meeting state variables and form
  - Added `openMeetingModal()` and `createMeetingFromEmail()` functions
  - Added "Schedule Meeting" in dropdown and action buttons
  - Added full meeting creation modal with all form fields

**Testing:**
- [x] 12/12 backend API tests passed (test_schedule_meeting_feature.py)
- [x] Teams Chat UI verified - dropdown menu shows Schedule Meeting option
- [x] Meeting modal opens with pre-filled data
- [x] POST /api/meetings endpoint creates meetings successfully
- [x] Email UI components verified in code (requires MS auth for live testing)

### Phase 50: Teams Calendar Integration (COMPLETE - March 10, 2026)

**Microsoft Calendar Integration under Communication Hub:**
- [x] Created `/app/frontend/src/pages/teams/TeamsCalendar.jsx` with full calendar functionality
- [x] Created `/app/frontend/src/pages/teams/TeamsEventDetail.jsx` for event detail page
- [x] Added `calendarRequest` scopes to authConfig.js (Calendars.ReadWrite, OnlineMeetings.ReadWrite)
- [x] Added routes: `/teams/calendar` and `/teams/calendar/:eventId`
- [x] Added "Teams Calendar" to Communication Hub navigation menu

**Calendar Views Implemented:**
- [x] Monthly view with event dots and event preview
- [x] Weekly view with hourly grid
- [x] Daily agenda view with full event details
- [x] View toggle buttons (Month, Week, Day)
- [x] Today button and prev/next navigation

**CRUD Operations:**
- [x] Create new calendar events with title, date/time, location, description
- [x] Toggle "All day" and "Teams meeting" options
- [x] Edit existing events via modal
- [x] Delete events with confirmation dialog
- [x] Online meeting link generation for Teams meetings

**Event Detail Page:**
- [x] Full event information display (date, time, location, Teams link)
- [x] Organizer and attendees list with response status
- [x] Edit and Delete buttons
- [x] Back to Calendar navigation

**Testing:**
- [x] Frontend testing: 100% pass rate
- [x] Route accessibility verified
- [x] Navigation menu verified
- [x] Microsoft connection prompt verified
- [x] All scopes in authConfig.js verified

### Phase 51: Enhanced Event Creation Form (COMPLETE - March 10, 2026)

**New Event Form Fields Added:**
- [x] **Attendees** - Add/remove attendees by email address
- [x] **Reminder** - Select reminder time (5min, 15min, 30min, 1hr, 1day, or none)
- [x] **Recurrence** - Set event to repeat daily, weekly, or monthly
- [x] **Show As** - Set availability status (Busy, Free, Tentative, Out of Office, Working Elsewhere)
- [x] **Sensitivity** - Set privacy level (Normal, Private, Confidential)
- [x] **Categories** - Color-code events with 6 category options

**UI Improvements:**
- [x] Reorganized form into 3 tabs: Details, Attendees, Options
- [x] Wider modal (max-w-2xl) for better usability
- [x] Scrollable content area for better form navigation
- [x] Visual attendee list with remove buttons
- [x] Color-coded category buttons
- [x] Icons for each option section

**Files Modified:**
- `/app/frontend/src/pages/teams/TeamsCalendar.jsx`:
  - Added `attendeeInput` state and attendee management functions
  - Extended `eventForm` with new fields
  - Updated `handleSaveEvent` to include new fields in Graph API call
  - Added Tabs component for form organization
  - Added helper functions: `addAttendee`, `removeAttendee`, `toggleCategory`
  - Added `CATEGORIES` constant for color options

### Phase 52: AI Meeting Summaries (COMPLETE - March 10, 2026)

**Features Implemented:**
- [x] Backend endpoint `POST /api/meetings/{id}/generate-summary` using GPT-4o
- [x] Backend endpoint `GET /api/meetings/{id}/ai-summary` to retrieve stored summaries
- [x] "AI Summary" button in meeting detail page header
- [x] Summary modal with copy and regenerate functionality
- [x] Summaries stored in meeting document for persistence
- [x] Uses Emergent LLM Key for GPT-4o integration

**Files Modified:**
- `/app/backend/routes/meetings.py`: Added AI summary endpoints
- `/app/frontend/src/pages/meetings/MeetingDetail.jsx`: Added AI summary UI

### Phase 53: @mentions in Meeting Notes (COMPLETE - March 10, 2026)

**Features Implemented:**
- [x] RichTextEditor with @mentions support in meeting discussion notes
- [x] Mention suggestions dropdown showing team members
- [x] Mentions tracked and passed to backend
- [x] "Use @ to mention" hint in note form

**Files Modified:**
- `/app/frontend/src/pages/meetings/MeetingDetail.jsx`: 
  - Replaced Textarea with RichTextEditor for notes
  - Added `noteMentions` state tracking
  - Updated `handleAddNote` to include mentions

### Phase 54: Phase 3 Automations (COMPLETE - March 10, 2026)

**New Automations Implemented:**
- [x] **Daily Task Digest**: Email summary of overdue, due today, and due this week tasks
- [x] **Auto-Archive Completed**: Automatically archive completed tasks/projects after X days
- [x] **Stale Task Reminder**: Notify about tasks not updated in X days

**Files Modified:**
- `/app/backend/services/automation_service.py`:
  - Added `run_daily_task_digest()` function
  - Added `run_auto_archive()` function
  - Added `run_stale_task_reminder()` function
  - Extended DEFAULT_GOALS_PROJECTS_SETTINGS with Phase 3 configs

- `/app/frontend/src/pages/settings/AutomationSettings.jsx`:
  - Added UI controls for Daily Task Digest
  - Added UI controls for Auto-Archive Completed
  - Added UI controls for Stale Task Reminder
  - Phase 3 items marked with cyan "Phase 3" badge

### Phase 56: Access Control & Roles Fixes (COMPLETE - March 10, 2026)

**Issues Fixed:**
- [x] Fixed User Management and Access Control roles display - users now show custom_role_names properly
- [x] Added `custom_role_ids` and `custom_role_names` to UserResponse model
- [x] Updated `/admin/users` API to enrich users with custom_role_names
- [x] Updated AccessControlPage.jsx to display custom_role_names with purple badges
- [x] Migrated 55 users from old `role` field to new `custom_role_ids` system
- [x] Added new modules to MODULE_DEFINITIONS: `automations`, `meetings`, `communication_hub`
- [x] Created **Viewer** role with restricted access (dashboard + help_support ONLY - NO automations)
- [x] Updated all default roles with appropriate module access
- [x] Edit Permissions modal now shows all 11 system modules

**Migration Performed:**
- All users migrated from old `role` field to `custom_role_ids`:
  - viewer → Viewer role
  - admin → Super Admin role
  - marketing_manager → Marketing Manager role
  - etc.

**Files Modified:**
- `/app/backend/server.py`: 
  - Added `custom_role_ids` and `custom_role_names` to UserResponse model
  - Updated `/admin/users` endpoint to enrich with custom_role_names
- `/app/backend/routes/workos.py`: Added custom_role_names enrichment
- `/app/backend/models/access_control.py`: Added new modules and Viewer role
- `/app/frontend/src/pages/admin/UserManagement.jsx`: Fixed roles display
- `/app/frontend/src/pages/admin/AccessControlPage.jsx`: Fixed role display with badges

### Phase 55: Teams Chat MSAL Refactoring (COMPLETE - March 10, 2026)

**Issue Resolved:**
- [x] Fixed Teams Chat authentication to use frontend MSAL flow instead of backend OAuth
- [x] Removed duplicate function definitions (old backend-based code)
- [x] Fixed "Connect" button to use `handleMicrosoftLogin` function
- [x] Fixed "Disconnect" button to use `handleMicrosoftLogout` function
- [x] Unified Microsoft authentication architecture across Mail, Calendar, and Chat modules

**Why this was needed:**
- Azure AD does not allow the same redirect URI to be registered as both `Web` (backend OAuth) and `SPA` (frontend MSAL)
- The production domain required SPA-type URIs for Mail/Calendar to work
- Teams Chat was using the old backend OAuth flow which conflicted

**Files Modified:**
- `/app/frontend/src/pages/teams/TeamsChat.jsx`:
  - Removed duplicate functions (fetchChats, fetchMessages, sendMessage, searchForUsers, startNewChat)
  - Updated "Connect Microsoft Teams" button to use `handleMicrosoftLogin`
  - Updated "Disconnect" button to use `handleMicrosoftLogout`
  - Component now uses MSAL `useMsal`, `useIsAuthenticated` hooks and `callGraphAPI` helper

### P1 - Upcoming Tasks
- [ ] Gantt Chart View for projects
- [ ] Complete `server.py` route extraction
- [ ] Quick Meeting Card Actions (Duplicate, Reschedule)
- [ ] Bulk Actions for Meetings

### P2 - Future Tasks
- [ ] Export/Reports (CSV/PDF)
- [ ] Ticket Trend Chart for Help & Support

### P3 - Backlog
- [ ] Slack/WhatsApp integration
- [ ] AI-powered notification prioritization
- [ ] Unify `roles` and `custom_roles` collections
- [ ] Remove unused `react-joyride` dependency
- [ ] Fix bare `except` clauses in meetings.py

### Blocked Items
- [ ] Social Module - Requires valid Instagram token
- [ ] Help & Support Email Notifications - Blocked pending SMTP credentials
- [ ] Real-time Notifications (WebSockets) - Blocked on infrastructure
