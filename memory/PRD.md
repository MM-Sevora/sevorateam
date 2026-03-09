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
- **Status**: NOT STARTED (Recurring platform issue)
- **Description**: Real-time notifications not working

---

## Backlog / Future Tasks

### P1 - Backend Refactoring
- Migrate remaining routes from `/app/backend/routes/marketing_v2.py`
- Move to modular structure under `/app/backend/routes/marketing/`

### P2 - WorkOS User Management UI
- Create frontend UI for admins
- Manage users, assign departments/roles
- Set up reporting hierarchy

### P3 - Additional Features
- PR Analytics Dashboard
- AI pitch writing feature
- Session Management
- Scheduled Azure AD Sync
- Twilio WhatsApp production approval
- Calendar views for projects
- Approval workflows based on hierarchy

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

### Key API Endpoints
- `GET /api/projects/manager-dashboard` - Aggregated dashboard data
- `GET, POST /api/projects/modules` - CRUD for modules
- `GET, POST /api/projects` - List and create projects
- `GET /api/projects/{project_id}` - Single project details
- `GET /api/projects/my-tasks` - User's assigned tasks

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
