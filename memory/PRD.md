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
- **Social APIs**: Instagram Graph API, YouTube Data API v3
- **Scheduler**: APScheduler with MongoDB job persistence

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
- [x] User & Access Management (Phase 1-3)
- [x] Granular CRUD Permissions
- [x] **Marketing Module Restructure** - All 8 phases complete

### P1 - High Priority
- [x] Real-time WebSocket notifications
- [ ] **Phase 4: Audit Logs UI** - Create frontend page to view admin action logs
- [ ] **EmailHistoryTab Integration** - Add to Influencer/Contact detail pages
- [ ] WhatsApp Business API (production - sandbox setup required)
- [ ] Advanced analytics charts

### P2 - Medium Priority
- [ ] Full CampaignsPage.jsx restoration
- [ ] Export/Import functionality
- [ ] Mobile responsive optimization
- [ ] Automated social posting
- [ ] Refactor server.py into APIRouter modules (currently 3300+ lines)

### P3 - Future
- [ ] Revenue tracking and ROI calculations
- [ ] Multi-tenant support
- [ ] Custom branding per client
- [ ] AI-powered lead scoring
- [ ] Automatic/scheduled Azure AD sync
- [ ] Session management (timeout, forced logout)

## Next Tasks
1. User to verify Azure AD SSO flow in Incognito window
2. User to complete Twilio WhatsApp Sandbox setup
3. Refactor server.py into smaller APIRouter files (2500+ lines currently)

## Latest Updates (March 7, 2026)

### Marketing Module Complete Restructure (March 7, 2026)

**All 8 Phases Implemented:**

1. **Contacts Hub** (NEW - Unified)
   - Merged: Influencers + Journalists + Bloggers
   - Contact types with `contact_type` field: influencer, journalist, blogger, hybrid
   - Contact detail page with 6 tabs: Profile, Communications, Deals & Contracts, Payments, Content (UGC), Performance
   - Scoring system for contact prioritization
   - Routes: `/marketing/contacts`, `/marketing/contacts/:contactId`

2. **Digital PR** (NEW)
   - Press Releases: Create, distribute, track
   - Media Coverage: Record articles, mentions, features with sentiment
   - PR Outreach: Pitch tracking to journalists
   - Route: `/marketing/pr`

3. **Events** (NEW - Separate Module)
   - Event types: Brand Launch, Press Event, Influencer Meetup, Fashion Show, Webinar, Product Launch
   - Attendee management with RSVP tracking
   - Budget tracking per event
   - Route: `/marketing/events`

4. **Marketing Calendar** (NEW - Unified)
   - Single calendar view combining: Campaigns, PR, Events
   - Color-coded items by type
   - Monthly navigation with "Today" button
   - Route: `/marketing/calendar`

5. **Content & Assets** (NEW)
   - Brand Assets: Logos, images, videos
   - Press Kit: Downloadable assets for media
   - UGC Library: Content from influencers
   - Templates: Email, contract, press release templates
   - Approval Queue: Content approval workflow
   - Route: `/marketing/assets`

6. **Budget & Payments** (Enhanced)
   - Payment tracking with invoice numbers
   - Multiple payment methods: Bank Transfer, UPI, Cheque, Cash
   - Payment status tracking
   - Route: `/marketing/budget`

7. **AI Tools** (Enhanced)
   - Content Generator
   - Email Writer
   - Contact Discovery (linked to Contacts Hub)
   - Press Release Generator (linked to Digital PR)
   - Route: `/marketing/ai-tools`

8. **Analytics** (Enhanced)
   - Campaign Performance
   - Contact ROI metrics
   - PR Coverage metrics
   - Route: `/marketing/analytics`

**Backend Implementation:**
- New models: `/app/backend/models/marketing.py`
- New routes: `/app/backend/routes/marketing_v2.py`
- API prefix: `/api/marketing/v2/`
- All endpoints tested: 28/28 passed

**Frontend Implementation:**
- New pages in `/app/frontend/src/pages/marketing/`:
  - ContactsHubPage.jsx
  - ContactDetailPage.jsx
  - DigitalPRPage.jsx
  - EventsPage.jsx
  - MarketingCalendarPage.jsx
  - ContentAssetsPage.jsx
- Updated navigation in Layout.jsx
- Updated routes in App.js

### User & Access Management Module - Phase 3 Complete (March 7, 2026)

**Phase 3: Granular CRUD Permissions** ✅
- Permission Management page (`/admin/permissions`) with full matrix UI
- User selector dropdown showing all active users with roles
- Permission matrix showing all 5 departments (Marketing, Sales, Social, Mail, Admin)
- Each module row has CRUD checkboxes (View, Create, Edit, Delete, Export)
- Unsaved changes detection with visual badge
- Save/Reset to Defaults functionality with success toasts
- Custom Permissions badge for users with modified permissions
- `hasPermission(department, module, action)` helper in AuthContext for frontend permission checks
- User `/api/auth/me` endpoint now returns permissions object

**Backend Endpoints**:
- `GET /api/admin/modules` - List all modules grouped by department
- `GET /api/admin/permissions/default/{role}` - Get default permissions for a role
- `GET /api/admin/users/{id}/permissions` - Get user's effective permissions
- `PUT /api/admin/users/{id}/permissions` - Save custom permissions
- `DELETE /api/admin/users/{id}/permissions` - Reset to role defaults
- `POST /api/admin/permissions/check` - Check specific permission

**Mail Module Separation**:
- Mail is now a separate top-level module in sidebar (between Marketing Ops and Sales)
- Route: `/mail/inbox`

### User & Access Management Module - Step 1 & 2 (Earlier)

**Step 1: Admin User Management Page** (`/admin/users`)
- User list with filters (Search, Status, Role, Department)
- Stats dashboard (Total, Active, Pending, Inactive, Recent Logins)
- Add User dialog with role and status assignment
- Edit User dialog for updating details
- Activate/Deactivate user toggle
- Role-based access control (Super Admin, Admin, Marketing Manager, Sales Manager, Social Manager, Viewer)

**Step 2: Azure AD User Sync** (NEW)
- Azure AD connection status check
- Manual "Sync Users from Azure AD" button
- Sync settings: Create new users, Update existing, Default role/department
- Azure AD Users Preview table
- Sync history tracking
- Single user import functionality

- **Backend Endpoints**:
  - `GET /api/admin/azure-ad/status` - Check Azure AD connection
  - `GET /api/admin/azure-ad/users` - Preview Azure AD users
  - `POST /api/admin/azure-ad/sync` - Bulk sync users from Azure AD
  - `POST /api/admin/azure-ad/sync-user/{azure_id}` - Sync single user
  - `GET /api/admin/azure-ad/sync-history` - Get sync history

- **Azure AD Service** (`/app/backend/services/azure_ad_sync.py`):
  - Full Microsoft Graph API integration
  - User field mapping (Azure → App)
  - Token caching with expiration
  - Connection status monitoring

**Note**: Azure AD sync requires additional API permissions to be configured:
  - `User.Read.All` - To list all users
  - `Directory.Read.All` - To read directory data

### Email Module Implementation
- **Standalone Email Page** (`/marketing/email`): Full Microsoft 365 email integration
  - Folder navigation (Inbox, Sent, Drafts, Archive)
  - Email list with search functionality
  - Email detail view with HTML rendering
  - Compose, Reply, Reply All, Forward capabilities
  - Flag, Archive, Delete operations
  - Real-time sync button
- **EmailHistoryTab Component**: Reusable component for contact-specific email history
  - Can be integrated into any entity detail page (Influencers, Leads, etc.)
- **Backend Endpoints**: 12 new Microsoft Graph API endpoints
  - GET `/api/microsoft/status` - Check connection
  - GET `/api/microsoft/emails` - List emails by folder
  - GET `/api/microsoft/emails-for-contact` - Get emails for specific contact
  - GET `/api/microsoft/message/{id}` - Get full email content
  - GET `/api/microsoft/message/{id}/attachments` - Get attachments
  - POST `/api/microsoft/send` - Send new email or reply
  - POST `/api/microsoft/message/{id}/forward` - Forward email
  - POST `/api/microsoft/message/{id}/read` - Mark read/unread
  - POST `/api/microsoft/message/{id}/flag` - Flag/unflag
  - POST `/api/microsoft/message/{id}/archive` - Archive
  - DELETE `/api/microsoft/message/{id}` - Delete

### Functional Gaps Fixed
- **Sales Pipeline**: Fixed API path from `/api/leads` to `/api/sales/leads` - Now displays 13 leads in kanban columns
- **QR Codes Page**: Verified working - displays QR codes with download and copy functionality  
- **Marketing Campaigns**: Verified working - displays 9 campaigns with status, budget, and dates
- **Content Studio AI**: Fixed double `/api` prefix issue - Generate Ideas returns 5 AI content ideas
- **Content Studio Content Generation**: Fixed and verified - generates full AI content with hashtags and CTAs
- **Outreach Dates**: Fixed "Invalid Date" issue - now shows proper date formatting

### Test Results (iteration_4.json)
- Frontend: 100% - All requested features working
- Backend: 100% endpoints verified via curl
- All major data fetching errors resolved

## Phase 3: Granular CRUD Permissions (COMPLETE - March 2026)
- [x] Backend: `/auth/me` returns user permissions object
- [x] Frontend: `AuthContext` has `hasPermission(module, action)` helper
- [x] Admin UI: `/admin/permissions` page for role-based permission management
- [x] Enforcement: Permissions checked on frontend for button/action visibility
- [x] All tests passed (iteration_6.json)

## Marketing Module V2 Restructure (COMPLETE - March 2026)
- [x] Backend refactored: `routes/marketing_v2.py` and `models/marketing.py`
- [x] Unified "Contacts" model for influencers, journalists, bloggers
- [x] New frontend pages: ContactsHubPage, ContactDetailPage, DigitalPRPage, EventsPage, etc.
- [x] All tests passed (iteration_7.json)

## Advanced Influencer Marketing Features (COMPLETE - March 2026)
Implementation of 11 advanced features for influencer operations:

### Backend (marketing_extended.py)
- [x] **Gifting/Seeding Tracker**: CRUD for product gifting records, status tracking (planned→shipped→delivered→posted)
- [x] **Promo Code Generator**: Auto-generate unique codes based on influencer name, track usage & revenue
- [x] **UTM Link Generator**: Build tracked URLs with utm_source, utm_medium, utm_campaign params
- [x] **Contract Templates**: Create reusable contract templates by category
- [x] **Influencer Contracts**: Send, acknowledge contracts (checkbox acknowledgment)
- [x] **Content Approval Workflow**: Submit content for review, approve/reject/request revision
- [x] **Brand Safety Scanner**: AI-powered influencer safety analysis with fallback mock data
- [x] **Sentiment Analysis**: AI-powered content sentiment analysis with fallback
- [x] **Availability Calendar**: Track influencer availability slots
- [x] **Exclusivity Tracker**: Check active exclusivity agreements by category
- [x] **Relationship Scoring**: Calculate engagement score based on campaigns, revenue, content quality
- [x] **Post-Campaign Reports**: Generate ROI reports with reach, engagement, promo code stats

### Frontend (ContactDetailPage.jsx)
- [x] **Gifting Tab**: View/create gift records with status tracking
- [x] **Tracking Tab**: Promo codes with copy-to-clipboard, UTM links with full URL display
- [x] **Contracts Tab**: List influencer contracts with status badges
- [x] **Performance Tab**: Relationship Score display with tier (ambassador/vip/established/new)

### API Endpoints
- `GET/POST /api/marketing/v2/gifting` - Gifting records
- `PUT /api/marketing/v2/gifting/{id}/status` - Update gift status
- `GET/POST /api/marketing/v2/promo-codes` - Promo codes
- `PUT /api/marketing/v2/promo-codes/{id}/use` - Record promo code use
- `GET/POST /api/marketing/v2/utm-links` - UTM links
- `GET/POST /api/marketing/v2/influencer-contracts` - Influencer contracts
- `PUT /api/marketing/v2/influencer-contracts/{id}/acknowledge` - Acknowledge contract
- `GET/POST /api/marketing/v2/contract-templates` - Contract templates
- `GET/POST /api/marketing/v2/content-approval` - Content submissions
- `PUT /api/marketing/v2/content-approval/{id}/review` - Review content
- `POST /api/marketing/v2/brand-safety/scan` - Run brand safety scan
- `GET /api/marketing/v2/brand-safety/{contact_id}` - Get safety check
- `POST /api/marketing/v2/sentiment/analyze` - Analyze sentiment
- `GET/POST /api/marketing/v2/availability` - Availability slots
- `GET /api/marketing/v2/availability/check/{contact_id}` - Check availability
- `GET /api/marketing/v2/exclusivity/{contact_id}` - Get exclusivity status
- `GET /api/marketing/v2/relationship-score/{contact_id}` - Get relationship score
- `GET /api/marketing/v2/campaign-report/{campaign_id}` - Post-campaign report

### Testing
- All 23 backend tests passed (iteration_8.json)
- All frontend tabs and modals working correctly
- Route conflict fixed: Renamed `/contracts` to `/influencer-contracts` to avoid conflict with deal contracts

## Earlier Updates (March 2026)
- **White/Light Theme Complete**: Applied consistent white background theme across ALL pages
  - Login page: Clean card with purple gradient button

## Live Social Media Integration (COMPLETE - March 2026)
Implementation of Instagram Graph API, YouTube Data API, and APScheduler for background jobs.

### Services Created
- `/app/backend/services/social_api.py` - Instagram & YouTube API integration
- `/app/backend/services/scheduler_service.py` - APScheduler with MongoDB persistence

### API Routes Created
- `/app/backend/routes/social_api.py` - Social media API endpoints
- `/app/backend/routes/scheduler.py` - Background job management endpoints

### Instagram Graph API Features
- `GET /api/social-api/instagram/status` - Connection status check
- `GET /api/social-api/instagram/profile/{username}` - Fetch influencer profile via Business Discovery
- `GET /api/social-api/instagram/hashtag/{hashtag}` - Search hashtag media
- Returns: followers, engagement_rate, avg_likes, avg_comments, recent_media

### YouTube Data API Features
- `GET /api/social-api/youtube/status` - Connection status check
- `GET /api/social-api/youtube/channel/{handle}` - Fetch channel by handle
- `GET /api/social-api/youtube/search?query=` - Search YouTube channels
- Returns: subscribers, total_views, video_count, engagement_rate, recent_videos

### Unified Profile Fetching
- `GET /api/social-api/profile/{platform}/{handle}` - Fetch from any platform
- `POST /api/social-api/profile/bulk` - Fetch from multiple platforms at once
- `POST /api/social-api/sync/influencer/{contact_id}` - Sync social data for contact
- `POST /api/social-api/sync/batch` - Batch sync for multiple contacts

### APScheduler Features
- `GET /api/scheduler/status` - Scheduler status
- `POST /api/scheduler/start` - Start scheduler
- `GET /api/scheduler/jobs` - List all jobs
- `POST /api/scheduler/discovery/schedule` - Schedule recurring influencer discovery
- `POST /api/scheduler/sync/schedule` - Schedule recurring social media sync
- `POST /api/scheduler/run/{job_id}` - Manually trigger a job
- Jobs persist in MongoDB `apscheduler_jobs` collection

### Environment Variables Required
```env
INSTAGRAM_ACCESS_TOKEN=   # From Facebook Developer Console
INSTAGRAM_ACCOUNT_ID=     # Your Instagram Business Account ID
YOUTUBE_API_KEY=          # From Google Cloud Console
```

### How to Get API Keys
**Instagram:**
1. Create Facebook App at developers.facebook.com
2. Add "Instagram Graph API" product
3. Connect Instagram Business/Creator account
4. Generate Page Access Token with: instagram_basic, instagram_manage_insights, pages_read_engagement

**YouTube:**
1. Go to Google Cloud Console
2. Enable "YouTube Data API v3"
3. Create API Key in Credentials
4. Restrict key to YouTube Data API v3


  - Dashboard: White cards with subtle shadows
  - All department dashboards: Marketing, Sales, Social
  - Core pages: Influencers, Leads, Content Studio, etc.
  - Modals/dialogs: Light backgrounds with proper contrast
- Fixed Azure AD SSO authentication flow with better state persistence
- Updated CSS variables for light theme (index.css, App.css)
- Batch-updated all zinc/dark colors to gray-based light theme

## Brand Color Palette
| Color | Hex | Usage |
|-------|-----|-------|
| Crater Brown (Primary) | #4A3728 | Logo, buttons, active states, headings |
| Crater Brown Light | #5D4A3A | Secondary text, hover states |
| Soft Nude | #E8D5C4 | Sidebar background, hover backgrounds |
| Soft Nude Light | #F5EDE5 | Page backgrounds, subtle highlights |
| Soft Nude Dark | #D4BBA6 | Borders, dividers |
| Amber (Marketing) | amber-700/600/500 | Marketing department accent |
| Stone (Sales) | stone-700/600/500 | Sales department accent |
| Rose (Social) | rose-700/600/500 | Social Media department accent |

## Theme Changes Applied
| Component | Before | After |
|-----------|--------|-------|
| Background | gray-50 | white / #F5EDE5 |
| Cards | white + gray borders | white + #E8D5C4 borders |
| Text | gray-900/500 | #4A3728 / #5D4A3A |
| Sidebar | Gray/White | Soft Nude (#F5EDE5) |
| Primary buttons | violet/purple | Crater Brown (#4A3728) |
| Department colors | violet/emerald/pink | amber/stone/rose |
