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
- `/app/backend/tests/test_manager_dashboard.py`
