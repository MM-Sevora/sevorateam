# Marketing Operating System - PRD

## Original Problem Statement
Build a comprehensive Marketing Operating System that unifies Influencer and PR modules with full CRUD operations, budget management, content/asset management, email integration via Microsoft Graph API, and AI-powered tools.

## User Personas
- **Super Admin**: Full system access, user management
- **Marketing Manager**: Campaign management, influencer/PR outreach
- **Sales Manager**: Budget oversight, payment tracking
- **Viewer**: Read-only access to dashboards

## Core Requirements
1. **Marketing Modules**: Unified Influencer and PR management
2. **Campaign Hub**: Full CRUD with sorting/filtering
3. **Budget & Payments**: Create, edit, delete payments with campaign sync
4. **Content & Assets**: Brand assets, press kits, templates, UGC library, deliveries tracker
5. **Email Module**: Gmail-style UI/UX via Microsoft Graph API
6. **User Management**: Role-based access control, Azure AD sync

## Architecture
```
/app/
├── backend/
│   ├── models/marketing.py          # Data models (Templates, Deliveries, Assets)
│   ├── routes/marketing_v2.py       # Main API routes (NEEDS REFACTORING - 4000+ lines)
│   └── services/
│       ├── microsoft_email.py       # Email service
│       └── microsoft_service.py     # Graph API wrapper
├── frontend/src/
│   ├── components/
│   │   ├── Layout.jsx               # Settings modal for email config
│   │   └── ui/                      # ShadCN components
│   └── pages/marketing/
│       ├── EmailPage.jsx            # Gmail-style UI ✅ COMPLETE
│       ├── ContentAssetsPage.jsx    # Rebuilt with tabs
│       ├── Budget.jsx               # Payment CRUD
│       └── CampaignHubPage.jsx      # Campaign CRUD
```

## What's Been Implemented

### Completed (March 2026)
- [x] UI/UX Enhancements: Campaign CRUD, table sorting, back buttons
- [x] Budget & Payment Module: Full CRUD with campaign budget sync
- [x] Content & Assets Module: Brand Assets, Press Kit, Templates, UGC, Deliveries tabs
- [x] Microsoft Graph API Integration: Email sending via user's Outlook
- [x] User Settings Modal: Save personal Outlook email for outreach
- [x] Comprehensive UAC Testing: Full test plan executed
- [x] **Bug Fix**: Select dropdown z-index in modals (z-50 → z-100)
- [x] **Gmail-style Email Module**: Complete with all features tested (95% pass rate)
  - Sidebar with folders (Inbox, Starred, Snoozed, Sent, Drafts, All Mail, Trash)
  - Compose modal with To/Cc/Subject/Body/Send
  - Email list with sender, subject, date, stars, checkboxes
  - Email detail with full content, sender avatar, Reply/Forward
  - Star/unstar, Archive, Delete, Mark read/unread
  - Connected status badge
  - Fixed empty state display names

## Prioritized Backlog

### P0 (Critical)
1. Refactor `marketing_v2.py` into smaller routers (payments.py, assets.py, templates.py)

### P1 (High)
1. Delete unused files: `DigitalPRPage.jsx`, `InfluencerDetailPageV2.jsx`
2. PR Analytics Dashboard

### P2 (Medium)
1. AI pitch writing feature
2. Automated media monitoring
3. Email templates dropdown in outreach modal
4. Scheduled Azure AD Sync
5. Session management (timeout, forced logout)

## Known Issues
- WebSocket Notifications: Platform-level ingress issue (recurring)
- Twilio WhatsApp: Blocked pending user sandbox setup
- Email Search: Microsoft Graph $search parameter has API limitations

## 3rd Party Integrations
- OpenAI GPT-4o (via emergentintegrations)
- Microsoft Azure AD / Graph API (ACTIVE)
- Twilio WhatsApp (BLOCKED)
- Instagram Graph API (configured)
- YouTube Data API (configured)

## Test Credentials
- Super Admin: `superadmin@sevora.com` / `superadmin123`
- Marketing: `marketing@sevora.com` / `admin123`

## Database
- MongoDB: `test_database` (via MONGO_URL in backend/.env)
- Key collections: users, campaigns, payments, contacts, templates, deliveries

## Routes
- Email Module: `/mail/inbox` (primary), `/marketing/email` (alias)
