# Marketing Operating System - PRD

## Current Status: FULLY OPERATIONAL ✅

All core features working with enhanced UX.

## WorkOS Architecture (March 8, 2026)

### Core Internal Platform Architecture - IMPLEMENTED ✅
**Backend (`/api/workos/*`):**
- `models/workos.py` - Pydantic models for Departments, Roles, Users, Organization
- `routes/workos.py` - Full CRUD APIs for:
  - Departments (create, read, update, delete, get members)
  - Roles (create, read, update, delete, with permissions matrix)
  - Users (enhanced with department, role, hierarchy)
  - Organization settings
  - Permission modules and templates
  - User migration endpoint

**Frontend (`/admin/organization`):**
- Organization Management page with 3 tabs:
  - Departments: Cards with member counts, edit/delete
  - Roles & Permissions: List with permission counts, levels, system badges
  - Team Members: Table with department, role, manager columns
- Modals for creating/editing departments, roles, users

**Seeded Data:**
- 5 Default Departments: Marketing, Sales, Social Media, PR, Administration
- 8 Default Roles: Super Admin (L100), Admin (L80), Marketing Manager (L50), Marketing Exec (L30), Sales Manager (L50), Sales Exec (L30), Social Manager (L50), Viewer (L10)

### Dynamic Permissions Integration - IMPLEMENTED ✅
- Replaced hardcoded `ROLE_DEPARTMENTS` with database-driven permissions
- `get_current_user()` now fetches WorkOS role and permissions dynamically
- `require_department()` checks against dynamic user departments
- Users migrated: 54 users linked to WorkOS roles
- Tested: Marketing user only sees Marketing Ops and Mail modules

### Frontend Permission Checks - IMPLEMENTED ✅
- Created `PermissionContext.jsx` with hooks and components:
  - `usePermissions()` - Access permissions, departments, role level
  - `hasPermission(dept, module, action)` - Check specific permission
  - `<CanEdit>`, `<CanDelete>`, `<CanCreate>` - Permission gates
- Wrapped App with `<PermissionProvider>`
- Example usage in InfluencerDetailPage: "Add Deliverable" wrapped with CanEdit

### Team Dashboard - IMPLEMENTED ✅
- Backend API (`/api/workos/team/*`):
  - `GET /dashboard` - Team stats, member list with pipeline data
  - `GET /member/{id}/pipeline` - Detailed member pipeline
- Frontend (`/admin/team`):
  - Stats cards: Team Size, Total Contacts, Pipeline Value, Avg per Member
  - Pipeline stage breakdown for entire team
  - Team member list with contact counts and deals value
  - Member details panel with recent activity
  - "View Full Pipeline" link for each member

## Backend Refactoring Status (March 8, 2026)

### Phase 1: Directory Structure ✅
Created `/app/backend/routes/marketing/` package with modular structure:
- `base.py` - Shared utilities, auth helpers, model re-exports
- `contacts.py` - FULLY MIGRATED (~350 lines)
- `publications.py` - FULLY MIGRATED (~220 lines)
- `campaigns.py` - FULLY MIGRATED (~120 lines)
- `deals.py` - FULLY MIGRATED (~250 lines)
- Stub files for: pipeline, pr, outreach, assets, ai, monitoring, calendar, activity, relationships, deliveries, microsoft

### Migration Strategy
- Original `marketing_v2.py` remains functional (backward compatibility)
- New modular routes available at `/api/marketing/v3/*` for testing
- Progressive migration: move routes module by module
- Final step: Update frontend to use v3, deprecate v2

## Recent Enhancements (March 8, 2026)

### 15. Automation Engine & Settings ✅ (NEW - March 8)
- **Backend**: Created automation API endpoints at `/api/automations/*`
  - GET/PUT `/settings` - Manage automation rules
  - GET `/pending-actions` - Get actionable items
  - GET `/logs` - Activity history
  - POST `/execute/{action}` - Execute actions manually
- **Background Scheduler**: APScheduler runs every 5 minutes for:
  - Auto-publishing scheduled social posts
  - Checking for stuck deals
  - Follow-up reminders
- **Settings Page**: `/settings/automations` with:
  - Pipeline Automations (auto-advance, stuck alerts, auto-archive)
  - Email Automations (follow-up reminders, sequences [coming soon])
  - Social Automations (auto-publish, daily limits)
  - Pending Actions tab
  - Activity Log tab
- **Sidebar**: Added "Automations" link with Zap icon
- **LIVE TRIGGERS IMPLEMENTED**:
  - Email sent (Microsoft Graph) → Auto-advance contact to "contacted"
  - WhatsApp sent (Twilio) → Auto-advance contact to "contacted"
  - Communication logged to contact history
  - All actions logged in Activity Log

### 14. Social Media Post Upload Fix ✅ (NEW - March 8)
- **Bug Fixed**: Image upload failing with "Upload failed" error
- **Root Cause**: Wrong localStorage token key (`sf_token` instead of `sevora_token`)
- **Fixed Files**: `PostsAndSchedule.jsx`, `ContentLibrary.jsx`
- **Cleanup**: Deleted unused files: AITools.jsx, Analytics.jsx, Autopilot.jsx, Avatar.jsx, YouTube.jsx

### 13. Social Sub-Modules UI/UX Improvements ✅
- **Content Studio**: Breadcrumb header, refresh button, platform labels, engaging empty state
- **Posts & Schedule**: Platform filter labels, rose-colored buttons, "Plan Your First Post" empty state
- **Content Library**: Breadcrumb header, refresh button, "No Media Assets Yet" empty state with CTA

### 12. Social Module Restructured ✅
- **Merged Dashboard & Analytics** into single "Social Media Hub" with tabs
- **Removed from sidebar**: AI Tools, Autopilot, YouTube, Avatar
- **New sidebar**: Dashboard & Analytics, Content Studio, Posts & Schedule, Content Library
- Old routes redirect to `/social`

### 11. Email Module - Full Feature Set ✅ (NEW)
- **BCC Support**: Added Bcc field in compose modal
- **Rich Text Editor**: Bold, Italic, Underline, Links, Bullet/Numbered Lists
- **Email Signatures**: Create, save, auto-append signatures (persisted in localStorage)
- **Scheduled Send**: Pick date/time, saves as draft with scheduled notation
- **Contact Integration**: "Quick Email" button on Influencer & Publication pages
  - Pre-fills recipient email and subject
  - Navigates to Email page with compose modal open
- **Attachment Upload**: Attach files up to 3MB each
- **Email Templates**: 5 pre-built templates (Collaboration, Follow Up, Campaign Invite, PR Pitch, Thank You)
- **Attachment Download**: Click attachments in received emails to download

### 10. WhatsApp Integration via Twilio ✅
- **Backend**: WhatsApp messaging via Twilio API (`/api/communication/whatsapp/send`)
- **Influencer Detail Page**: Outreach modal now sends actual WhatsApp messages
- **Unified Pipeline**: Send Message modal supports WhatsApp channel
- **Features**:
  - Channel selection (Email/WhatsApp) in outreach modals
  - Sandbox info banner with join instructions
  - Communication history logging
  - Auto-stage update on first contact
- **Sandbox Setup**: Recipients send "join kill-ranch" to +1 415 523 8886
- **Test Number**: +918967719301 (active)

### 9. Unified Pipeline ✅ (MAJOR)
- **Merged**: Outreach Dashboard + Deal Pipeline into single Kanban board
- **Stages**: Identified → Contacted → Replied → Negotiating → Agreed → Delivering → Completed → Lost
- **Features**:
  - Drag-and-drop cards between stages
  - Contact cards show: name, social handles, followers, engagement rate
  - Collapsible communication history per contact
  - Deal info (quote/budget) visible from Negotiating stage onwards
  - Send Message modal with channel selection
  - Filters: search, contact type, campaign
  - Bulk delete functionality
- **Route**: `/marketing/pipeline` (old routes redirect automatically)
- **Sidebar**: Single "Pipeline" link replaces "Outreach" + "Deal Pipeline"

### 7. Campaign - Add Influencer with Deliverable & Fee ✅
- When adding influencer to campaign: select rate card, enter agreed fee
- Data stored: campaign_deliverable_id, campaign_deliverable_name, campaign_agreed_fee

### 6. Deliveries Module Enhancement ✅
- Bug Fix: Influencer names now show correctly (was showing "Unknown")
- Rate Card selection in "Record Delivery" modal

### 5. Bulk Delete Functionality ✅
- Implemented across Influencers, Publications, Campaigns, Pipeline pages

### Bug Fixes
- Fixed "Failed to save changes" - ContactUpdate model
- Fixed "Failed to discover media contacts" - AI endpoint fixes
- Fixed YouTube metrics mismatch
- Fixed action button dropdown on Influencers list
- Separated Pipeline & Campaign cards
- Fixed Select dropdown z-index in modals
- **Fixed**: Deliveries showing "Unknown" for influencer names
- **Fixed**: Deal Pipeline "Failed to load deals" error (wrong campaigns endpoint)

## Architecture
```
/app/frontend/src/pages/marketing/
├── AIDiscoveryPage.jsx        # Modern wizard UI
├── InfluencersListPage.jsx    # Bulk delete, filters
├── InfluencerDetailPage.jsx   # History timeline, Deliverables & Rates
├── PublicationDetailPage.jsx  # History tab
├── PublicationsListPage.jsx   # Bulk delete, filters
├── CampaignHubPage.jsx        # Multi-select objectives, bulk delete
├── OutreachDashboard.jsx      # Response tracking
├── DealPipeline.jsx           # Kanban pipeline (fixed campaigns endpoint)
├── Budget.jsx
├── ContentAssetsPage.jsx      # Rate card selection in Record Delivery
├── EmailPage.jsx              # Gmail-style UI
```

## API Keys Configured
- ✅ YouTube API - Working with full data
- ✅ Instagram API - Profile lookup working
- ✅ Microsoft Graph API - Email sending
- ✅ Twilio WhatsApp API - Messaging working (sandbox mode)

## Completed Phases

### Phase 1: Core Infrastructure ✅
- User authentication and authorization
- Contact management (Influencers/Publications/Journalists)
- Campaign management
- Budget tracking

### Phase 2: Outreach & Communication ✅
- Gmail-style Email Module
- Microsoft Graph integration for email sending
- Communication tracking

### Phase 3: Analytics & Discovery ✅
- AI-powered influencer discovery
- Instagram/YouTube social API integration
- PR coverage tracking

### Phase 4: History & Timeline ✅
- Communication History Timeline (Influencers)
- Activity Timeline (Publications)

### Phase 5: Advanced Management ✅
- Outreach Dashboard with response tracking
- Deal Pipeline with Kanban UI
- Bulk delete across all list pages
- **Deliveries with Rate Card selection**

## Prioritized Backlog

### P0 (Critical) - Deferred
1. Refactor marketing_v2.py (4500+ lines) - Technical debt

### P1 (High)
1. PR Analytics Dashboard
2. Manager Dashboard (team workload, resource allocation)
3. Calendar view for tasks

### P2 (Medium)
1. AI pitch writing feature
2. Automated media monitoring
3. Time tracking reports (by project, by user)

### P3 (Low)
1. WebSocket notifications (platform-level issue)

## Project Management System (Enhanced) - IMPLEMENTED ✅ (March 9, 2026)

### Enhanced Project Fields
- **Auto-generated Project ID**: PRJ-XXXX format (e.g., PRJ-1001) auto-incremented
- **Project Type**: Marketing, Development, PR, Design, Operations, Other
- **Department**: Links to WorkOS departments with name enrichment
- **Project Manager**: Separate from Owner, user selector with name display
- **Stakeholders**: View-only access users (multi-select)

### Project-Level RBAC (Planned)
- Owner: Full control
- Manager: Manage tasks & members
- Team Member: Work on tasks
- Stakeholder: View only

### Task Dependencies ✅
- **"Blocked By"**: Tasks that must complete first
- **"Blocks"**: Tasks waiting on this task
- **Visual Indicators**: Red border + warning icon on blocked Kanban cards
- **Drag Prevention**: Blocked tasks cannot be dragged on Kanban
- **Backend Validation**: Returns 400 error when attempting invalid status changes
- **Auto Reverse Relationships**: Adding A blocks B automatically adds B blocked-by A

## Project Management System (Phase 3) - IMPLEMENTED ✅ (March 9, 2026)

### Task Detail Modal
- Opens when clicking any task card on Kanban board
- Full task info display: status, priority, assignee, due date, description
- **Edit Mode**: Inline editing of all task fields with Save/Cancel
- **Subtasks Tab**: Add, complete (toggle), delete subtasks with count badge
- **Checklist Tab**: Add items, toggle completion, delete; progress bar with completion percentage
- **Comments Tab**: Add/delete comments with author avatar, name, timestamp
- **Time Tab**: Summary cards (Estimated/Logged/Remaining hours), Log Time form, time log history

### Simple Time Tracking
- Log hours with description
- Time summary per task
- Time log entries with user, hours, description, date

## Project Management System (Phase 2) - IMPLEMENTED ✅ (March 9, 2026)

### Projects List Page (`/projects`)
- Stats cards: Total Projects, Active, Completed, On Hold
- Search and filter by status, priority, module
- Project cards with priority badges, progress bar, task counts
- Create Project modal with validation (name, module required)

### Project Detail Page (`/projects/:projectId`)
- Project info header with priority, module, owner, dates
- Progress bar showing completion percentage
- **Kanban Board**: 5 columns (Draft, Assigned, In Progress, Review, Completed)
- Drag-and-drop task management with status updates
- Task cards showing priority, due date, assignee, checklist/comment counts
- Create Task modal with assignee dropdown

### Sidebar Updates
- "Projects" link to browse all projects
- "My Tasks" link for personal dashboard

## Project Management System (Phase 1) - IMPLEMENTED ✅ (March 8, 2026)

### Backend APIs (`/api/projects/*`)
- **Modules**: Full CRUD for PM modules (create, list, get, update, delete)
- **Projects**: Full CRUD with team member management and progress tracking
- **Tasks**: Full CRUD with status transitions, enrichment with project/module info
- **Subtasks**: Create, list, update, delete subtasks linked to parent tasks
- **Checklists**: Checklist items with completion tracking (completed_by, completed_at)
- **Comments**: Task comments with mentions support and author enrichment
- **Time Logs**: Time tracking with hours accumulation on tasks
- **Activity Logs**: Full audit trail with entity filtering

### My Tasks Dashboard (`/projects/my-tasks`)
- Stats cards: Total Assigned, Due Today, Overdue, Completed
- Task categorization: Assigned, Due Today, Overdue, In Progress, Pending Review, Recently Completed
- Tab navigation for filtering
- Task cards with priority badges, module/project info, due dates
- Quick status change dropdown on task cards
- Sidebar link with "My Tasks" entry

### Data Models (`/app/backend/models/projects.py`)
- PMModule, Project, Task, Subtask, ChecklistItem, TaskComment, ActivityLog, TimeLog
- Response models with enriched data (names, counts, progress)
- Dashboard models: MyTasksResponse, ProjectDashboardResponse

### Test Data
- Module: Marketing Projects (ID: 78e96d2f-ef0d-46d2-bd65-1bb625a37914)
- Project: Q1 Campaign Launch
- Task: Create campaign brief (assigned to superadmin)

## Twilio WhatsApp Sandbox
- **Sandbox Number**: +1 415 523 8886
- **Join Keyword**: `join kill-ranch`
- **Active Test Numbers**: +918967719301
- **To add new recipients**: Send "join kill-ranch" to +1 415 523 8886 on WhatsApp
- **Production Approval**: Apply via Twilio Console when ready

## Test Credentials
- Super Admin: `superadmin@sevora.com` / `superadmin123`
- Marketing: `marketing@sevora.com` / `admin123`

## Test Data
- **Influencer**: Nivrity Das (ID: f4c76400-f85c-465b-bdce-c1bd941912a9)
  - 4 Rate Cards: Static Post (₹25,000), Reel/Short (₹50,000), Story Set (₹15,000), YouTube Integration (₹75,000)

## Known Issues
- WebSocket notifications not working (platform ingress config)
- Instagram follower count API limitation (permissions)
- Orphan delivery records show "Unknown" for deleted contacts (expected behavior)
- Email attachment sending: User verification pending (fix deployed)
