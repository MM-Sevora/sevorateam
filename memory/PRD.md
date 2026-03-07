# SEVORA TEAM - Unified Operations Platform PRD

## Project Overview
Consolidated platform combining 3 Sevora applications under a single unified system with role-based access control and Microsoft Azure AD authentication.

## Original Problem Statement
Consolidate multiple Sevora applications (Influencer Operations from 'main' branch, Sales CRM from 'Leads' branch, Social Media Manager from 'social' branch) under a single tool called "Sevora Team" with Department/Function structure.

## Architecture

### Authentication
- **Microsoft Azure AD SSO** for enterprise single sign-on
- **Email/Password login** for non-Azure users
- **JWT tokens** for session management

### Department Structure
| Department | Modules |
|------------|---------|
| Marketing Ops | Dashboard, Influencers, Campaigns, Outreach, Negotiations, Budget, AI Tools, Analytics |
| Sales | Dashboard, Leads, Customers, Pipeline, Wedding Planner, QR Codes, Partners, Analytics |
| Social | Dashboard, Content Studio, AI Tools, Autopilot, Posts & Schedule, Content Library, YouTube, Avatar, Analytics |

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

### Marketing Ops ✅
- [x] Marketing Dashboard with stats
- [x] Influencers page with add/list functionality
- [x] Campaigns page with create campaign modal
- [x] Outreach page
- [x] Negotiations page
- [x] Budget page
- [x] AI Tools page
- [x] Analytics page

### Sales ✅
- [x] Sales Dashboard with stats
- [x] Leads page with add/list functionality
- [x] Customers page
- [x] Pipeline page (Kanban view)
- [x] Wedding Planner page
- [x] QR Codes page
- [x] Partners page
- [x] Analytics page

### Social ✅
- [x] Social Dashboard with stats
- [x] Content Studio with AI idea generation
- [x] AI Tools page
- [x] Autopilot settings page
- [x] Posts & Schedule page
- [x] Content Library page
- [x] YouTube explorer page
- [x] Avatar page
- [x] Analytics page

### Azure AD Configuration
- Client ID: ec50e216-1abe-4c0f-af5c-1f4d50d51234
- Tenant ID: bbe9ab04-36a1-4b03-833b-a798ddb2f232
- Redirect URI: https://sevora-hub.preview.emergentagent.com

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
- GET/POST /api/marketing/payments - Payment tracking
- GET /api/marketing/analytics - Marketing analytics
- GET /api/marketing/dashboard - Marketing stats

### Sales
- GET/POST /api/sales/leads - Lead management
- GET/POST /api/sales/customers - Customer management
- GET/POST /api/sales/qrcodes - QR code generation
- GET/POST /api/sales/partners - Partner management
- GET/POST /api/sales/wedding-plans - Wedding plan management
- GET /api/sales/pipeline - Pipeline view
- GET /api/sales/dashboard - Sales stats

### Social
- GET/POST /api/social/content - Content management
- GET/POST /api/social/posts - Post management
- GET/PUT /api/social/autopilot/settings - Autopilot settings
- POST /api/social/ai/caption - AI caption generation
- POST /api/social/ai/image - AI image generation
- GET /api/social/library - Content library
- GET /api/social/youtube - YouTube data
- GET/PUT /api/social/avatar - Avatar settings
- GET /api/social/analytics - Social analytics
- GET /api/social/dashboard - Social stats

## Test Credentials
- Email: admin@sevora.com
- Password: admin123
- Role: Admin (access to all departments)

## Prioritized Backlog

### P0 - Critical (Done)
- [x] Authentication (Azure AD + Email/Password)
- [x] Role-based access control
- [x] Unified dashboard
- [x] All department pages imported

### P1 - High Priority
- [ ] Full AI integration for content generation
- [ ] Real-time notifications
- [ ] Email/WhatsApp outreach integration

### P2 - Medium Priority
- [ ] Advanced analytics with charts
- [ ] Export/Import functionality
- [ ] Mobile responsive optimization

### P3 - Future
- [ ] AI influencer discovery
- [ ] Automated posting to social platforms
- [ ] Revenue tracking and ROI calculations

## User Personas

1. **Admin** - Full access to all departments, manages users and roles
2. **Marketing Manager** - Manages influencer campaigns and negotiations
3. **Sales Manager** - Handles leads, customers, and pipeline
4. **Social Manager** - Creates and schedules social content
5. **Stylist** - Works with sales leads for styling sessions

## Next Tasks
1. Test Microsoft Azure AD login flow
2. Add more seed data for demos
3. Implement real AI integrations for content generation
4. Add email notifications for lead updates
