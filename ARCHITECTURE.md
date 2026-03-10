# Sevora Team Platform - Architecture Documentation

## 1. Architecture Overview

### Architecture Type: **Modular Monolith**

The application follows a **Modular Monolithic Architecture** with clear separation of concerns:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              CLIENT LAYER                                    │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                     React.js SPA (Frontend)                          │   │
│  │  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐  │   │
│  │  │  Goals   │ │ Projects │ │ Meetings │ │  Comms   │ │  Admin   │  │   │
│  │  │  Module  │ │  Module  │ │  Module  │ │   Hub    │ │  Module  │  │   │
│  │  └──────────┘ └──────────┘ └──────────┘ └──────────┘ └──────────┘  │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────────┘
                                     │
                                     │ HTTPS (REST API)
                                     ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                              API GATEWAY                                     │
│                         (Nginx Reverse Proxy)                                │
│                    /api/* → Backend:8001                                     │
│                    /*     → Frontend:3000                                    │
└─────────────────────────────────────────────────────────────────────────────┘
                                     │
                                     ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                            SERVER LAYER                                      │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                   FastAPI Backend (Python)                           │   │
│  │  ┌────────────────────────────────────────────────────────────────┐ │   │
│  │  │                        ROUTES                                   │ │   │
│  │  │  ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐ ┌────────────┐   │ │   │
│  │  │  │  Auth  │ │ Goals  │ │Projects│ │Meetings│ │ Marketing  │   │ │   │
│  │  │  └────────┘ └────────┘ └────────┘ └────────┘ └────────────┘   │ │   │
│  │  └────────────────────────────────────────────────────────────────┘ │   │
│  │  ┌────────────────────────────────────────────────────────────────┐ │   │
│  │  │                       SERVICES                                  │ │   │
│  │  │  ┌────────────┐ ┌────────────┐ ┌────────────────────────────┐ │ │   │
│  │  │  │ Automation │ │ Scheduler  │ │ Email Notification Service │ │ │   │
│  │  │  └────────────┘ └────────────┘ └────────────────────────────┘ │ │   │
│  │  └────────────────────────────────────────────────────────────────┘ │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────────┘
                                     │
                                     ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                            DATA LAYER                                        │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                      MongoDB (NoSQL Database)                        │   │
│  │  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐  │   │
│  │  │  users   │ │ projects │ │ meetings │ │  goals   │ │  tasks   │  │   │
│  │  └──────────┘ └──────────┘ └──────────┘ └──────────┘ └──────────┘  │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────────┘
                                     │
                                     ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                        EXTERNAL INTEGRATIONS                                 │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐ ┌──────────────┐       │
│  │  Microsoft   │ │  Microsoft   │ │  Microsoft   │ │   APScheduler │       │
│  │  Graph API   │ │  Teams Chat  │ │   Calendar   │ │   (Cron Jobs) │       │
│  │  (Mail)      │ │              │ │              │ │               │       │
│  └──────────────┘ └──────────────┘ └──────────────┘ └──────────────┘       │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Technology Stack

### Frontend Stack

| Technology | Version | Purpose |
|------------|---------|---------|
| **React.js** | 18.x | UI Framework |
| **React Router** | 6.x | Client-side routing |
| **Tailwind CSS** | 3.x | Utility-first CSS framework |
| **Shadcn/UI** | Latest | Pre-built UI components |
| **Lucide React** | Latest | Icon library |
| **MSAL React** | 2.x | Microsoft authentication |
| **date-fns** | 3.x | Date manipulation |
| **Tiptap** | 2.x | Rich text editor |
| **Tippy.js** | 6.x | Tooltips and popovers |
| **Sonner** | Latest | Toast notifications |
| **Recharts** | 2.x | Data visualization |

### Backend Stack

| Technology | Version | Purpose |
|------------|---------|---------|
| **Python** | 3.11+ | Programming language |
| **FastAPI** | 0.100+ | Web framework |
| **Uvicorn** | 0.23+ | ASGI server |
| **Motor** | 3.x | Async MongoDB driver |
| **PyMongo** | 4.x | MongoDB driver |
| **Pydantic** | 2.x | Data validation |
| **python-jose** | 3.x | JWT handling |
| **passlib** | 1.7+ | Password hashing |
| **APScheduler** | 3.x | Task scheduling |
| **httpx** | 0.24+ | Async HTTP client |

### Database

| Technology | Version | Purpose |
|------------|---------|---------|
| **MongoDB** | 6.x | Primary database |

### Infrastructure

| Technology | Purpose |
|------------|---------|
| **Nginx** | Reverse proxy & load balancer |
| **Supervisor** | Process management |
| **Kubernetes** | Container orchestration (Production) |

### External Services

| Service | Purpose |
|---------|---------|
| **Microsoft Graph API** | Email, Calendar, Teams integration |
| **Azure AD** | Enterprise authentication |

---

## 3. Directory Structure

```
/app/
├── backend/
│   ├── server.py              # Main FastAPI application entry point
│   ├── requirements.txt       # Python dependencies
│   ├── .env                   # Environment variables
│   │
│   ├── routes/                # API route handlers (modular)
│   │   ├── auth.py            # Authentication routes
│   │   ├── goals.py           # Goals & Objectives API
│   │   ├── projects.py        # Project Management API
│   │   ├── meetings.py        # Meetings & Reviews API
│   │   ├── marketing.py       # Marketing module API
│   │   └── ...
│   │
│   ├── services/              # Business logic services
│   │   ├── automation_service.py    # Automated workflows
│   │   ├── scheduler_service.py     # Scheduled tasks
│   │   └── email_notification_service.py
│   │
│   ├── models/                # Pydantic models
│   │   └── ...
│   │
│   └── tests/                 # Backend tests
│       └── ...
│
├── frontend/
│   ├── src/
│   │   ├── App.js             # Main React application
│   │   ├── index.js           # Entry point
│   │   ├── authConfig.js      # Microsoft auth configuration
│   │   │
│   │   ├── components/        # Reusable UI components
│   │   │   ├── ui/            # Shadcn/UI components
│   │   │   ├── Layout.jsx     # Main layout with navigation
│   │   │   ├── Notifications.jsx
│   │   │   └── ...
│   │   │
│   │   ├── pages/             # Page components (by module)
│   │   │   ├── goals/         # Goals & Objectives pages
│   │   │   ├── projects/      # Project Management pages
│   │   │   ├── meetings/      # Meetings & Reviews pages
│   │   │   ├── teams/         # Teams Chat & Calendar
│   │   │   ├── marketing/     # Marketing module (incl. Email)
│   │   │   ├── admin/         # Admin pages
│   │   │   └── ...
│   │   │
│   │   ├── context/           # React Context providers
│   │   │   ├── AuthContext.js
│   │   │   └── PermissionContext.js
│   │   │
│   │   └── hooks/             # Custom React hooks
│   │
│   ├── public/                # Static assets
│   ├── package.json           # Node.js dependencies
│   └── .env                   # Frontend environment variables
│
├── memory/                    # Documentation
│   ├── PRD.md                 # Product Requirements
│   ├── CHANGELOG.md           # Change history
│   └── ROADMAP.md             # Future plans
│
└── test_reports/              # Test results
    └── iteration_*.json
```

---

## 4. Module Architecture

### 4.1 Goals & Objectives Module

```
┌─────────────────────────────────────────────────────────────┐
│                    GOALS MODULE                              │
├─────────────────────────────────────────────────────────────┤
│  Frontend Pages:                                             │
│  • GoalsDashboard.jsx    - Overview & KPIs                  │
│  • StrategicGoals.jsx    - Company-level goals              │
│  • Objectives.jsx        - Department objectives            │
│  • ObjectiveDetail.jsx   - Individual objective view        │
│  • FiscalYears.jsx       - Fiscal year management           │
├─────────────────────────────────────────────────────────────┤
│  Backend Routes: /api/goals/*                                │
│  • GET  /strategic-goals      - List strategic goals        │
│  • POST /strategic-goals      - Create goal                 │
│  • GET  /objectives           - List objectives             │
│  • POST /objectives           - Create objective            │
│  • PATCH /objectives/:id      - Update progress             │
├─────────────────────────────────────────────────────────────┤
│  Collections: goals, objectives, fiscal_years               │
└─────────────────────────────────────────────────────────────┘
```

### 4.2 Project Management Module

```
┌─────────────────────────────────────────────────────────────┐
│                  PROJECTS MODULE                             │
├─────────────────────────────────────────────────────────────┤
│  Frontend Pages:                                             │
│  • ProjectsList.jsx      - All projects list                │
│  • ProjectDetail.jsx     - Project board (Kanban)           │
│  • MyTasks.jsx           - Personal task list               │
│  • ManagerDashboard.jsx  - Team overview                    │
│  • RecurringTasks.jsx    - Recurring task templates         │
├─────────────────────────────────────────────────────────────┤
│  Backend Routes: /api/projects/*                             │
│  • GET  /list                 - List all projects           │
│  • POST /                     - Create project              │
│  • GET  /:id                  - Project details             │
│  • GET  /tasks                - All tasks                   │
│  • POST /tasks                - Create task                 │
│  • PATCH /tasks/:id           - Update task                 │
│  • GET  /my-tasks             - Current user's tasks        │
├─────────────────────────────────────────────────────────────┤
│  Collections: pm_projects, pm_tasks, recurring_tasks        │
└─────────────────────────────────────────────────────────────┘
```

### 4.3 Communication Hub Module

```
┌─────────────────────────────────────────────────────────────┐
│               COMMUNICATION HUB MODULE                       │
├─────────────────────────────────────────────────────────────┤
│  Sub-Modules:                                                │
│  ┌─────────────────────────────────────────────────────┐    │
│  │ MEETINGS (Internal)                                  │    │
│  │ • MeetingList.jsx       - Meeting calendar           │    │
│  │ • CreateMeeting.jsx     - New meeting form           │    │
│  │ • MeetingDetail.jsx     - Meeting view/edit          │    │
│  │ • MeetingTemplates.jsx  - Reusable templates         │    │
│  │ Routes: /api/meetings/*                              │    │
│  │ Collection: meetings                                 │    │
│  └─────────────────────────────────────────────────────┘    │
│  ┌─────────────────────────────────────────────────────┐    │
│  │ TEAMS CALENDAR (Microsoft Integration)               │    │
│  │ • TeamsCalendar.jsx     - Outlook calendar view      │    │
│  │ • TeamsEventDetail.jsx  - Event details              │    │
│  │ API: Microsoft Graph /me/events                      │    │
│  └─────────────────────────────────────────────────────┘    │
│  ┌─────────────────────────────────────────────────────┐    │
│  │ TEAMS CHAT (Microsoft Integration)                   │    │
│  │ • TeamsChat.jsx         - Chat interface             │    │
│  │ API: Microsoft Graph /me/chats                       │    │
│  └─────────────────────────────────────────────────────┘    │
│  ┌─────────────────────────────────────────────────────┐    │
│  │ EMAIL/INBOX (Microsoft Integration)                  │    │
│  │ • EmailPage.jsx         - Outlook mail client        │    │
│  │ API: Microsoft Graph /me/messages                    │    │
│  └─────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────┘
```

---

## 5. Authentication Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                  AUTHENTICATION FLOW                         │
└─────────────────────────────────────────────────────────────┘

┌─────────────┐      ┌─────────────┐      ┌─────────────────┐
│   Client    │      │   Backend   │      │   MongoDB       │
└──────┬──────┘      └──────┬──────┘      └────────┬────────┘
       │                    │                      │
       │  1. Login Request  │                      │
       │  (email/password)  │                      │
       │───────────────────>│                      │
       │                    │  2. Verify User      │
       │                    │─────────────────────>│
       │                    │                      │
       │                    │  3. User Data        │
       │                    │<─────────────────────│
       │                    │                      │
       │  4. JWT Token      │                      │
       │<───────────────────│                      │
       │                    │                      │
       │  5. Store Token    │                      │
       │  (localStorage)    │                      │
       │                    │                      │
       │  6. API Request    │                      │
       │  (Bearer Token)    │                      │
       │───────────────────>│                      │
       │                    │                      │

### Authentication Methods:

1. **JWT (Primary)**
   - Email/Password login
   - Token stored in localStorage
   - 24-hour expiration

2. **Microsoft Azure AD (SSO)**
   - MSAL.js for frontend auth
   - Redirect flow for enterprise login
   - Separate consent for Mail, Calendar, Teams

### Token Structure:
{
  "sub": "user_id",
  "email": "user@company.com",
  "role": "admin|manager|employee",
  "department": "marketing|sales|...",
  "exp": 1234567890
}
```

---

## 6. Database Schema

### Core Collections

```javascript
// users
{
  "_id": ObjectId,
  "id": "uuid",
  "email": "string",
  "password_hash": "string",
  "name": "string",
  "role": "super_admin|admin|manager|employee",
  "department": "string",
  "status": "active|inactive",
  "created_at": ISODate,
  "updated_at": ISODate
}

// pm_projects
{
  "_id": ObjectId,
  "id": "uuid",
  "name": "string",
  "description": "string",
  "status": "planning|active|on_hold|completed",
  "owner_id": "uuid",
  "department": "string",
  "linked_goal_id": "uuid",
  "start_date": ISODate,
  "end_date": ISODate,
  "created_at": ISODate
}

// pm_tasks
{
  "_id": ObjectId,
  "id": "uuid",
  "name": "string",
  "description": "string",
  "project_id": "uuid",
  "assigned_to": "uuid",
  "status": "todo|in_progress|review|done",
  "priority": "low|medium|high|urgent",
  "due_date": ISODate,
  "created_at": ISODate
}

// meetings
{
  "_id": ObjectId,
  "id": "uuid",
  "title": "string",
  "meeting_type": "string",
  "description": "string",
  "start_time": ISODate,
  "end_time": ISODate,
  "organizer_id": "uuid",
  "participants": ["uuid"],
  "linked_project_id": "uuid",
  "linked_goal_id": "uuid",
  "action_items": [{ ... }],
  "decisions": [{ ... }],
  "created_at": ISODate
}

// goals
{
  "_id": ObjectId,
  "id": "uuid",
  "title": "string",
  "description": "string",
  "goal_type": "strategic|department|team",
  "status": "draft|active|completed",
  "progress": Number,
  "fiscal_year_id": "uuid",
  "owner_id": "uuid",
  "created_at": ISODate
}
```

---

## 7. API Design

### RESTful Conventions

```
GET    /api/resource          - List resources
POST   /api/resource          - Create resource
GET    /api/resource/:id      - Get single resource
PUT    /api/resource/:id      - Full update
PATCH  /api/resource/:id      - Partial update
DELETE /api/resource/:id      - Delete resource
```

### Response Format

```json
// Success Response
{
  "id": "uuid",
  "data": { ... },
  "message": "Success"
}

// Error Response
{
  "detail": "Error message",
  "status_code": 400
}

// List Response
{
  "items": [...],
  "total": 100,
  "page": 1,
  "per_page": 20
}
```

---

## 8. Automation System

```
┌─────────────────────────────────────────────────────────────┐
│                   AUTOMATION ENGINE                          │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌──────────────────┐    ┌──────────────────────────────┐  │
│  │   APScheduler    │───>│  Scheduled Jobs               │  │
│  │   (Background)   │    │  • Daily overdue task check   │  │
│  │                  │    │  • Weekly progress reports    │  │
│  │                  │    │  • Meeting reminders          │  │
│  │                  │    │  • Goal at-risk alerts        │  │
│  └──────────────────┘    └──────────────────────────────┘  │
│                                                              │
│  ┌──────────────────┐    ┌──────────────────────────────┐  │
│  │  Event Triggers  │───>│  Real-time Automations        │  │
│  │  (API Hooks)     │    │  • Progress cascade           │  │
│  │                  │    │  • Action item → Task         │  │
│  │                  │    │  • Status change alerts       │  │
│  └──────────────────┘    └──────────────────────────────┘  │
│                                                              │
│  Settings: /api/settings/automations                        │
│  UI: /app/frontend/src/pages/settings/AutomationSettings    │
└─────────────────────────────────────────────────────────────┘
```

---

## 9. Microsoft Integration Architecture

```
┌─────────────────────────────────────────────────────────────┐
│              MICROSOFT GRAPH INTEGRATION                     │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  Authentication: MSAL.js (Frontend)                         │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  authConfig.js                                       │   │
│  │  • loginRequest    - Basic user profile              │   │
│  │  • mailRequest     - Mail.Read, Mail.ReadWrite       │   │
│  │  • calendarRequest - Calendars.ReadWrite             │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                              │
│  API Endpoints Used:                                         │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  EMAIL                                               │   │
│  │  • GET  /me/messages         - List emails           │   │
│  │  • GET  /me/messages/:id     - Get email             │   │
│  │  • POST /me/sendMail         - Send email            │   │
│  └─────────────────────────────────────────────────────┘   │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  CALENDAR                                            │   │
│  │  • GET  /me/calendarView     - List events           │   │
│  │  • GET  /me/events/:id       - Get event             │   │
│  │  • POST /me/events           - Create event          │   │
│  │  • PATCH /me/events/:id      - Update event          │   │
│  │  • DELETE /me/events/:id     - Delete event          │   │
│  └─────────────────────────────────────────────────────┘   │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  TEAMS CHAT                                          │   │
│  │  • GET  /me/chats            - List chats            │   │
│  │  • GET  /me/chats/:id/messages - Get messages        │   │
│  │  • POST /me/chats/:id/messages - Send message        │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

---

## 10. Deployment Architecture

### Current (Preview/Development)

```
┌────────────────────────────────────────────────────────────┐
│                    KUBERNETES POD                           │
├────────────────────────────────────────────────────────────┤
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │
│  │   Nginx      │  │   Frontend   │  │   Backend    │     │
│  │   (Proxy)    │  │   (Port 3000)│  │   (Port 8001)│     │
│  └──────────────┘  └──────────────┘  └──────────────┘     │
│         │                  │                  │            │
│         └──────────────────┴──────────────────┘            │
│                          │                                  │
│  ┌──────────────┐        │                                 │
│  │   MongoDB    │<───────┘                                 │
│  │   (Local)    │                                          │
│  └──────────────┘                                          │
│                                                             │
│  Process Manager: Supervisor                                │
│  Hot Reload: Enabled for both frontend/backend              │
└────────────────────────────────────────────────────────────┘
```

### Production (Recommended)

```
┌─────────────────────────────────────────────────────────────┐
│                     PRODUCTION SETUP                         │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌─────────────┐                                            │
│  │   CDN       │ ─── Static assets (JS, CSS, images)        │
│  │  (Optional) │                                            │
│  └─────────────┘                                            │
│         │                                                    │
│         ▼                                                    │
│  ┌─────────────┐      ┌─────────────┐                       │
│  │   Load      │ ───> │   Frontend  │ (Multiple replicas)   │
│  │   Balancer  │      │   Pods      │                       │
│  └─────────────┘      └─────────────┘                       │
│         │                                                    │
│         ▼                                                    │
│  ┌─────────────┐      ┌─────────────┐                       │
│  │   API       │ ───> │   Backend   │ (Multiple replicas)   │
│  │   Gateway   │      │   Pods      │                       │
│  └─────────────┘      └─────────────┘                       │
│         │                                                    │
│         ▼                                                    │
│  ┌─────────────┐                                            │
│  │  MongoDB    │ (Replica Set / Atlas)                      │
│  │  Cluster    │                                            │
│  └─────────────┘                                            │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

---

## 11. Security Considerations

| Layer | Security Measure |
|-------|-----------------|
| **Transport** | HTTPS/TLS encryption |
| **Authentication** | JWT tokens with expiration |
| **Authorization** | Role-based access control (RBAC) |
| **Password** | bcrypt hashing with salt |
| **API** | Rate limiting, input validation |
| **Database** | Connection string in env vars |
| **Microsoft** | OAuth 2.0 / MSAL with scoped permissions |

---

## 12. Scalability Path

### Current State: Monolith
- Single deployable unit
- Shared database
- Simple deployment

### Future: Microservices (If Needed)
```
Potential Service Boundaries:
├── auth-service        (Authentication & User Management)
├── goals-service       (Goals & Objectives)
├── projects-service    (Project & Task Management)
├── meetings-service    (Meetings & Calendar)
├── notifications-svc   (Email, Push, In-app)
└── integrations-svc    (Microsoft Graph, etc.)
```

**Migration triggers:**
- Team size > 10 developers
- Independent scaling needs
- Different deployment frequencies
- Technology diversity requirements

---

## 13. Summary

| Aspect | Current Implementation |
|--------|----------------------|
| **Architecture** | Modular Monolith |
| **Frontend** | React SPA with Shadcn/UI |
| **Backend** | FastAPI (Python) |
| **Database** | MongoDB |
| **Auth** | JWT + Microsoft Azure AD |
| **Integrations** | Microsoft Graph API |
| **Scheduling** | APScheduler |
| **Deployment** | Kubernetes |

The architecture is designed to be:
- ✅ **Maintainable** - Clear module boundaries
- ✅ **Scalable** - Can evolve to microservices
- ✅ **Extensible** - Easy to add new modules
- ✅ **Integrable** - Ready for enterprise integrations
