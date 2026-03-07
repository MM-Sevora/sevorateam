# SEVORA TEAM - Unified Operations Platform PRD

## Project Overview
Consolidated platform combining 3 Sevora applications under a single unified system with role-based access control, Microsoft Azure AD authentication, AI content generation, WhatsApp/Email outreach, and team collaboration features.

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
- **AI**: GPT-5.2 (text), GPT Image 1 (images), Sora 2 (video) via Emergent LLM Key
- **Communication**: Twilio (WhatsApp), Microsoft Graph (Email/Outlook)

## What's Been Implemented (Jan 2026)

### Core Features ✅
- [x] Unified login page with Microsoft SSO and email/password
- [x] Role-based access control with department mapping
- [x] Unified dashboard showing stats from all accessible departments
- [x] Department-specific navigation in sidebar
- [x] Seed data for demo purposes

### AI Integration ✅
- [x] GPT-5.2 text generation for captions, emails, content
- [x] GPT Image 1 for AI image generation
- [x] Sora 2 video generation (async with job tracking)
- [x] AI-powered influencer analysis
- [x] Social media caption generator

### Communication ✅
- [x] WhatsApp messaging via Twilio (requires sandbox setup)
- [x] Template messages for lead follow-up, appointments, etc.
- [x] Email via Microsoft Graph API
- [x] Communication logs tracking

### Team Collaboration ✅
- [x] Comments with @mentions on any entity
- [x] Activity feed across departments
- [x] Real-time notifications
- [x] Mark notifications as read

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

## API Endpoints

### Auth
- POST /api/auth/register - Register new user
- POST /api/auth/login - Email/password login
- POST /api/auth/azure - Azure AD token login
- GET /api/auth/me - Get current user

### AI Generation
- POST /api/ai/text - Generate text with GPT-5.2
- POST /api/ai/image - Generate images with GPT Image 1
- POST /api/ai/video - Generate video with Sora 2 (async)
- GET /api/ai/video/{job_id} - Check video job status
- POST /api/ai/caption - Generate social captions
- POST /api/ai/email-content - Generate email content

### Communication
- POST /api/communication/whatsapp/send - Send WhatsApp message
- POST /api/communication/whatsapp/template - Send template message
- POST /api/communication/email/send - Send Outlook email
- GET /api/communication/logs - Get communication logs

### Collaboration
- POST /api/collaboration/comments - Add comment with @mentions
- GET /api/collaboration/comments/{type}/{id} - Get comments for entity
- GET /api/collaboration/activity-feed - Get activity feed
- GET /api/collaboration/notifications - Get user notifications
- PUT /api/collaboration/notifications/{id}/read - Mark as read
- PUT /api/collaboration/notifications/read-all - Mark all as read

### Marketing, Sales, Social
- Full CRUD for all entities (influencers, leads, content, etc.)
- Department-specific dashboards
- Analytics endpoints

## Test Credentials
| User | Email | Password | Access |
|------|-------|----------|--------|
| Admin | admin@sevora.com | admin123 | All departments |
| Marketing | marketing@sevora.com | admin123 | Marketing Ops |
| Sales | sales@sevora.com | admin123 | Sales |
| Social | social@sevora.com | admin123 | Social Media |

## Azure AD Configuration
- Client ID: ec50e216-1abe-4c0f-af5c-1f4d50d51234
- Tenant ID: bbe9ab04-36a1-4b03-833b-a798ddb2f232
- Redirect URI: https://sevora-hub.preview.emergentagent.com

## WhatsApp Setup (Twilio)
1. Join Twilio Sandbox: Send "join <your-sandbox-code>" to +1 415 523 8886
2. Test with template messages first
3. For production: Get WhatsApp Business API approved

## Prioritized Backlog

### P0 - Critical (Done)
- [x] Authentication (Azure AD + Email/Password)
- [x] Role-based access control
- [x] Unified dashboard
- [x] All department pages imported
- [x] AI content generation
- [x] Team collaboration

### P1 - High Priority
- [ ] Real-time WebSocket notifications
- [ ] WhatsApp Business API (production)
- [ ] Advanced analytics charts

### P2 - Medium Priority
- [ ] Export/Import functionality
- [ ] Mobile responsive optimization
- [ ] Automated social posting

### P3 - Future
- [ ] Revenue tracking and ROI calculations
- [ ] Multi-tenant support
- [ ] Custom branding per client

## Next Tasks
1. Set up WhatsApp Business API for production
2. Add real-time WebSocket notifications
3. Create analytics dashboards with charts
4. Add export functionality for reports
