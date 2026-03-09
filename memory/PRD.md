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
