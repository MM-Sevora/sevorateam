# Engineering Module - Complete Feature Documentation

## Overview
The Engineering module provides a complete Agile project management solution with sprint planning, backlog management, retrospectives, and release tracking capabilities.

---

## 🏗️ DEVELOPMENT

### 1. Projects (`/engineering/projects`)
**Purpose**: Central hub for all engineering projects filtered by "Development" type.

**Features**:
- View all projects with development focus
- Quick stats: Total tasks, completed, in-progress
- Team member avatars with workload indicators
- Progress bars showing completion percentage
- Quick actions: View Sprint Board, View Backlog

**Flow**:
```
Projects List → Select Project → Project Detail Page
                              → Sprint Board
                              → Backlog View
```

**Key Data**:
- Project name, description
- Team members with avatars
- Task counts by status
- Sprint assignment status

---

### 2. Sprint Board (`/projects/{projectId}/sprint-board`)
**Purpose**: Kanban-style board for tracking sprint work execution.

**Features**:
- **Sprint Selector**: Choose active or any sprint to view
- **Kanban Columns**: 
  - To Do (includes `draft` and `assigned` status)
  - In Progress
  - In Review
  - Done
- **Task Cards** with:
  - Issue type icon (Story, Task, Bug, etc.)
  - Title and description preview
  - Story points badge
  - Assignee avatar
  - Priority indicator
  - Due date warning if overdue
- **Drag & Drop**: Move tasks between columns (updates status)
- **Quick Filters**: By assignee, issue type, priority
- **Sprint Stats**: Total issues, points completed, burndown progress

**Flow**:
```
Select Sprint → View Kanban Board → Drag Task to New Column → Status Auto-Updates
                                  → Click Task → Task Detail Modal
                                  → Update assignee, points, etc.
```

**API Endpoints**:
- `GET /api/projects/sprints/{sprintId}/tasks` - Get sprint tasks
- `PUT /api/projects/tasks/{taskId}` - Update task status

---

### 3. Backlog (`/engineering/backlog` or `/projects/{projectId}/backlog`)
**Purpose**: Manage unprioritized work items not yet assigned to sprints.

**Features**:
- **Backlog Items**: All tasks without sprint assignment
- **Prioritization**: Drag to reorder priority
- **Bulk Actions**: Move multiple items to sprint
- **Filters**: By issue type, assignee, labels
- **Quick Create**: Add new backlog items inline
- **Sprint Assignment**: Click arrow or drag to move item to sprint

**Flow**:
```
View Backlog → Select Items → Move to Sprint → Items appear in Sprint Planning
            → Create New Item → Add to Backlog
            → Prioritize (drag up/down)
```

**API Endpoints**:
- `GET /api/engineering/projects/{projectId}/backlog` - Get backlog items
- `POST /api/engineering/tasks/{taskId}/move-to-sprint` - Assign to sprint

---

### 4. Epics (`/engineering/epics`)
**Purpose**: High-level feature containers that group related stories/tasks.

**Features**:
- **Epic List**: All epics across projects
- **Progress Tracking**: 
  - Total stories/tasks linked
  - Completion percentage
  - Story points rolled up
- **Epic Detail View**:
  - Description and acceptance criteria
  - Linked stories breakdown
  - Timeline/roadmap visualization
- **Create Epic**: Name, description, target release, priority

**Flow**:
```
View Epics → Select Epic → See Linked Stories → Track Progress
          → Create Epic → Link Stories → Assign to Release
```

**Data Model**:
```json
{
  "id": "epic-123",
  "name": "User Authentication System",
  "description": "Complete auth implementation",
  "status": "in_progress",
  "priority": "high",
  "target_release": "v1.0",
  "story_points_total": 34,
  "story_points_completed": 21,
  "stories": ["story-1", "story-2", ...]
}
```

**API Endpoints**:
- `GET /api/engineering/projects/{projectId}/epics` - List epics
- `POST /api/engineering/projects/{projectId}/epics` - Create epic
- `PUT /api/engineering/epics/{epicId}` - Update epic
- `POST /api/engineering/tasks/{taskId}/link-epic` - Link task to epic

---

## 📅 PLANNING

### 5. Sprints (`/engineering/sprints`)
**Purpose**: Sprint planning and management hub.

#### Global Sprint View (`/engineering/sprints`)
Shows all sprints across projects with status indicators.

#### Project Sprint Planning (`/engineering/projects/{projectId}/sprint-planning`)
**Features**:
- **Sprint Creation Panel**:
  - Sprint Name
  - Sprint Goal (text)
  - Start Date / End Date
  - Velocity target (optional)

- **Backlog Picker** (Left Column):
  - All unassigned backlog items
  - Checkbox for bulk selection
  - Drag & Drop to sprint
  - Click arrow button to move
  - Inline edit: Assign user, set points

- **Sprint Scope** (Right Column):
  - Items committed to sprint
  - Remove items (move back to backlog)
  - Total points calculation

- **Capacity Indicator**:
  - Team Hours configuration
  - Story Points vs Capacity
  - Visual indicator:
    - 🟢 Green = Under capacity
    - 🟡 Amber = Near capacity (>80%)
    - 🔴 Red = Over capacity (>100%)

- **Review & Start Sprint Modal**:
  - Summary: Total Items, Story Points, Team Capacity
  - Breakdown: Stories, Tasks, Bugs count
  - Warnings:
    - Unassigned items
    - Items without estimates
    - Over capacity alert
  - "Start Sprint" button

**Flow**:
```
Create Sprint → Set Name/Goal/Dates
             → Configure Team Capacity
             → Drag Items from Backlog to Sprint
             → Review Summary
             → Start Sprint
             → Sprint becomes "Active"
```

**Sprint Status Lifecycle**:
```
planning → active → completed
```

**API Endpoints**:
- `POST /api/projects/sprints` - Create sprint
- `GET /api/projects/{projectId}/sprints` - List sprints
- `POST /api/projects/sprints/{sprintId}/start` - Start sprint
- `POST /api/engineering/sprints/{sprintId}/complete` - Complete sprint

---

### 6. Retrospectives (`/engineering/retro` or `/engineering/retro/{sprintId}`)
**Purpose**: Capture team feedback and action items after sprint completion.

**Features**:
- **Sprint Selector**: Choose completed/active sprint
- **Three-Column Layout**:
  
  | What Went Well 👍 | What Didn't Go Well 👎 | Action Items 💡 |
  |------------------|----------------------|----------------|
  | Green theme      | Red theme            | Amber theme    |
  | Positive items   | Improvement areas    | Follow-up tasks|

- **Item Features**:
  - Add new items inline
  - Vote on items (prioritization)
  - Delete items
  - Action items: Mark as resolved ✓

- **Stats Dashboard**:
  - Total Items
  - Total Votes
  - Action Items count
  - Resolved action items progress bar

- **Meeting Notes**: Add facilitator notes
- **Complete Retro**: Mark retrospective as done

**Flow**:
```
Select Sprint → Start Retrospective
             → Team adds items to columns
             → Vote on important items
             → Create action items
             → Assign owners to action items
             → Add meeting notes
             → Complete Retrospective
             → Track action items in next sprint
```

**API Endpoints**:
- `POST /api/engineering/retros` - Create retro
- `GET /api/engineering/retros/sprint/{sprintId}` - Get retro for sprint
- `POST /api/engineering/retros/items` - Add item
- `POST /api/engineering/retros/items/{itemId}/vote` - Vote
- `PUT /api/engineering/retros/items/{itemId}` - Update/resolve item
- `POST /api/engineering/retros/{retroId}/complete` - Complete retro

---

### 7. Roadmap (`/engineering/roadmap`)
**Purpose**: Visual timeline of releases and milestones.

**Features**:
- **Timeline View**: Quarter/Month/Week granularity
- **Release Lanes**: Visual bars showing release periods
- **Milestone Markers**: Key dates highlighted
- **Epic Placement**: Epics positioned on timeline
- **Dependency Lines**: Show epic dependencies
- **Drag to Reschedule**: Adjust dates visually

**Flow**:
```
View Roadmap → Select Time Range → See Releases/Epics
            → Drag to adjust dates
            → Click for detail view
```

---

### 8. Daily Standups (`/engineering/standups`)
**Purpose**: Track daily team standup meetings and blockers.

**Features**:
- **Date Navigator**: Browse standup history (prev/next day)
- **Project Filter**: Filter by specific project or view all
- **My Standup Entry**:
  - Yesterday: What was accomplished
  - Today: What's planned
  - Blockers: Any impediments
  - Mood: 😊 Happy | 😐 Neutral | 😟 Stressed

- **Team View**: All team members' entries for selected date
- **Stats Cards**:
  - Participants count
  - Blockers count
  - Mood distribution

- **Auto-Population**:
  - Tasks completed yesterday (from task updates)
  - Tasks currently in progress

**Flow**:
```
Navigate to Date → Check if entry exists
                → Add/Update My Standup
                → View Team Entries
                → Identify Blockers
                → Follow up on blockers
```

**API Endpoints**:
- `POST /api/engineering/standups/entry` - Submit standup
- `GET /api/engineering/standups/my-entry` - Get my entry
- `GET /api/engineering/standups/team` - Get team entries
- `GET /api/engineering/standups/history` - Get historical data

---

### 9. App Releases (`/engineering/app-releases`)
**Purpose**: Track mobile/web app releases to App Store, Play Store, and Web.

**Features**:
- **Platform Support**:
  - 🍎 iOS (App Store)
  - 🤖 Android (Play Store)
  - 🌐 Web

- **Release Information**:
  - Version number (e.g., 1.0.0)
  - Build number (e.g., 123)
  - Target release date
  - Release notes

- **Status Workflow**:
  ```
  Draft → Building → Testing → Submitted → In Review → Approved/Rejected → Released
                                                                        ↓
                                                                   Rolled Back
  ```

- **Task Linking**: Associate tasks with releases
- **Progress Tracking**: Completed vs total linked tasks
- **Store URL**: Link to App Store / Play Store listing

- **Filters**:
  - By project
  - By platform (iOS/Android/Web)
  - By status

**Flow**:
```
Create Release → Set Version/Platform/Date
              → Add Release Notes
              → Link Tasks/Features
              → Update Status as progresses
              → Submit to Store
              → Update with Store URL when live
```

**API Endpoints**:
- `POST /api/engineering/app-releases` - Create release
- `GET /api/engineering/app-releases` - List releases
- `PUT /api/engineering/app-releases/{releaseId}` - Update release
- `POST /api/engineering/app-releases/{releaseId}/link-tasks` - Link tasks

---

## 🔄 COMPLETE AGILE WORKFLOW

### Sprint Cycle Flow
```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           SPRINT PLANNING                                    │
│  1. Create Sprint (name, goal, dates)                                       │
│  2. Set Team Capacity                                                       │
│  3. Pull items from Backlog                                                 │
│  4. Estimate & Assign                                                       │
│  5. Review & Start Sprint                                                   │
└─────────────────────────────────────────────────────────────────────────────┘
                                    ↓
┌─────────────────────────────────────────────────────────────────────────────┐
│                           SPRINT EXECUTION                                   │
│  • Daily Standups (track progress, identify blockers)                       │
│  • Sprint Board (move tasks: To Do → In Progress → Review → Done)           │
│  • Update task status, log time                                             │
└─────────────────────────────────────────────────────────────────────────────┘
                                    ↓
┌─────────────────────────────────────────────────────────────────────────────┐
│                           SPRINT COMPLETION                                  │
│  1. Complete Sprint                                                         │
│  2. Move incomplete items back to backlog                                   │
│  3. Calculate velocity                                                      │
└─────────────────────────────────────────────────────────────────────────────┘
                                    ↓
┌─────────────────────────────────────────────────────────────────────────────┐
│                           RETROSPECTIVE                                      │
│  • What Went Well                                                           │
│  • What Didn't Go Well                                                      │
│  • Action Items for next sprint                                             │
└─────────────────────────────────────────────────────────────────────────────┘
                                    ↓
                          (Cycle repeats)
```

---

## 📊 DATA MODELS

### Task/Issue Types
- `epic` - Large feature container
- `story` - User story
- `task` - Development task
- `bug` - Bug/defect
- `subtask` - Sub-item of a task

### Task Status
- `draft` - Created but not started
- `todo` / `assigned` - Ready to work
- `in_progress` - Being worked on
- `in_review` - Code review
- `completed` - Done
- `approved` - Verified/accepted

### Sprint Status
- `planning` - Being planned
- `active` - In progress
- `completed` - Finished

### Priority Levels
- `critical` - Must fix immediately
- `high` - Important
- `medium` - Normal priority
- `low` - Nice to have

---

## 🎯 ROLE-BASED WORKFLOW (Future Enhancement)

Task assignments by role:
```
Designer → Frontend Dev → Backend Dev → QA
   ↓            ↓              ↓          ↓
 Design    UI/Frontend    API/Backend   Testing
 Review    Development    Development   Review
```

Each task can have:
- `designer_id` - Designer assigned
- `frontend_dev_id` - Frontend developer
- `backend_dev_id` - Backend developer  
- `qa_id` - QA tester
- `workflow_stage` - Current stage (design/development/review/testing/done)

---

## 📱 NAVIGATION STRUCTURE

```
Engineering
├── Development
│   ├── Projects ────────────→ /engineering/projects
│   ├── Sprint Board ────────→ /projects/{id}/sprint-board
│   ├── Backlog ─────────────→ /engineering/backlog
│   └── Epics ───────────────→ /engineering/epics
│
└── Planning
    ├── Sprints ─────────────→ /engineering/sprints
    │   └── Sprint Planning ─→ /engineering/projects/{id}/sprint-planning
    ├── Retrospectives ──────→ /engineering/retro
    │   └── Sprint Retro ────→ /engineering/retro/{sprintId}
    ├── Roadmap ─────────────→ /engineering/roadmap
    ├── Daily Standups ──────→ /engineering/standups
    └── App Releases ────────→ /engineering/app-releases
```

---

## ✅ FEATURE CHECKLIST

| Feature | Status | Route |
|---------|--------|-------|
| Projects List | ✅ | `/engineering/projects` |
| Sprint Board (Kanban) | ✅ | `/projects/{id}/sprint-board` |
| Backlog Management | ✅ | `/engineering/backlog` |
| Epics Management | ✅ | `/engineering/epics` |
| Sprint Planning | ✅ | `/engineering/projects/{id}/sprint-planning` |
| Drag & Drop Planning | ✅ | (in Sprint Planning) |
| Capacity Indicator | ✅ | (in Sprint Planning) |
| Review & Start Sprint | ✅ | (modal in Sprint Planning) |
| Sprint Retrospective | ✅ | `/engineering/retro/{sprintId}` |
| Retro Voting | ✅ | (in Retrospective) |
| Action Item Tracking | ✅ | (in Retrospective) |
| Roadmap View | ✅ | `/engineering/roadmap` |
| Daily Standups | ✅ | `/engineering/standups` |
| Mood Tracking | ✅ | (in Daily Standups) |
| App Releases (iOS/Android/Web) | ✅ | `/engineering/app-releases` |
| Release Status Workflow | ✅ | (in App Releases) |
| Task Linking to Releases | ✅ | (in App Releases) |

---

*Last Updated: March 25, 2026*
