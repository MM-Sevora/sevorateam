# SEVORA TEAM - Unified Operations Platform PRD

## Project Overview
Consolidated platform combining 3 Sevora applications under a single unified system with role-based access control and Microsoft Azure AD authentication.

## Original Problem Statement
Consolidate multiple Sevora applications (Influencer Operations, Sales CRM, Social Media Manager) under a single tool called "Sevora Team" with Department/Function structure.

## Architecture

### Authentication
- **Microsoft Azure AD SSO** for enterprise single sign-on
- **Email/Password login** for non-Azure users
- **JWT tokens** for session management

### Department Structure
| Department | Modules |
|------------|---------|
| Marketing Ops | Influencers, Campaigns, Negotiations, Outreach, AI Discovery, Analytics |
| Sales | Leads, Customers, Wedding Planner, Pipeline, QR Codes, Partners |
| Social | Content Studio, AI Tools, Autopilot, Posts, Analytics, YouTube |

### Role-Based Access Control
| Role | Access |
|------|--------|
| admin | All departments |
| marketing_manager | Marketing Ops only |
| sales_manager | Sales only |
| social_manager | Social only |
| stylist | Sales only |
| viewer | Read-only |

## Tech Stack
- **Frontend**: React.js, TailwindCSS, @azure/msal-react
- **Backend**: FastAPI (Python), Motor (MongoDB async driver)
- **Database**: MongoDB
- **Auth**: Microsoft Azure AD, JWT

## What's Been Implemented (Jan 2026)

### Core Features ✅
- [x] Unified login page with Microsoft SSO and email/password
- [x] Role-based access control with department mapping
- [x] Unified dashboard showing stats from all accessible departments
- [x] Department-specific navigation in sidebar
- [x] Marketing dashboard with influencer stats
- [x] Sales dashboard with lead stats
- [x] Social dashboard with content stats
- [x] Add Influencer functionality
- [x] Add Lead functionality
- [x] Protected routes with authorization checks

### Azure AD Configuration
- Client ID: ec50e216-1abe-4c0f-af5c-1f4d50d51234
- Tenant ID: bbe9ab04-36a1-4b03-833b-a798ddb2f232

## API Endpoints

### Auth
- POST /api/auth/register - Register new user
- POST /api/auth/login - Email/password login
- POST /api/auth/azure - Azure AD token login
- GET /api/auth/me - Get current user

### Marketing
- GET/POST /api/marketing/influencers - List/Create influencers
- GET/PUT/DELETE /api/marketing/influencers/{id} - CRUD operations
- GET/POST /api/marketing/campaigns - Campaign management
- GET/POST /api/marketing/outreach - Outreach management
- GET/POST /api/marketing/negotiations - Negotiation tracking
- GET /api/marketing/dashboard - Marketing stats

### Sales
- GET/POST /api/sales/leads - Lead management
- GET/POST /api/sales/customers - Customer management
- GET/POST /api/sales/qrcodes - QR code generation
- GET /api/sales/pipeline - Pipeline view
- GET /api/sales/dashboard - Sales stats

### Social
- GET/POST /api/social/content - Content management
- GET/PUT /api/social/autopilot/settings - Autopilot settings
- GET /api/social/dashboard - Social stats

## Prioritized Backlog

### P0 - Critical
- [x] Authentication (Azure AD + Email/Password)
- [x] Role-based access control
- [x] Unified dashboard

### P1 - High Priority
- [ ] Complete Campaigns page with full CRUD
- [ ] Complete Pipeline view with Kanban board
- [ ] QR Code generator with visual output
- [ ] Outreach email/WhatsApp integration

### P2 - Medium Priority
- [ ] Wedding Planner module
- [ ] Content Studio with AI generation
- [ ] Autopilot scheduling system
- [ ] Partners management

### P3 - Future
- [ ] Advanced analytics with charts
- [ ] Export/Import functionality
- [ ] Notification system
- [ ] Mobile responsive optimization

## User Personas

1. **Admin** - Full access to all departments, manages users and roles
2. **Marketing Manager** - Manages influencer campaigns and negotiations
3. **Sales Manager** - Handles leads, customers, and pipeline
4. **Social Manager** - Creates and schedules social content
5. **Stylist** - Works with sales leads for styling sessions

## Next Tasks
1. Implement Campaigns page with campaign-influencer linking
2. Build Pipeline Kanban board for lead stage management
3. Add QR Code generator with download functionality
4. Integrate email/WhatsApp for outreach
