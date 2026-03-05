# SEVORA Influencer Operations Tool - PRD

## Product Overview
An internal tool for a luxury fashion brand (SEVORA) to manage its entire influencer marketing lifecycle. Built as a full-stack application with React frontend, FastAPI backend, and MongoDB database.

## Core Requirements
- **Influencer Discovery:** Find relevant fashion influencers using AI-powered search
- **Influencer CRM:** Store detailed profiles with metrics, rates, and collaboration history
- **Campaign Management:** Create campaigns, assign influencers, track content
- **Budget & Payments:** Control campaign spending and track payments
- **Analytics Dashboard:** Measure ROI and performance metrics
- **AI Features:** Influencer matching, caption generation, campaign ideas

## User Personas
- **Marketing Manager:** Primary user - manages influencer relationships and campaigns
- **Founder:** Oversees budget and high-level analytics
- **Finance Team:** Tracks payments and budget utilization

## Tech Stack
- **Frontend:** React, Tailwind CSS, Shadcn/UI, Recharts
- **Backend:** FastAPI (Python), Pydantic
- **Database:** MongoDB
- **Authentication:** JWT
- **AI Integration:** OpenAI GPT-5.2 via Emergent LLM Key

---

## Implemented Features (December 2025)

### Phase 1 - Core MVP ✅
- [x] User authentication (JWT-based login/register)
- [x] Dashboard with KPI cards and charts
- [x] Influencer CRUD operations
- [x] Campaign management
- [x] Budget tracking
- [x] Analytics dashboard
- [x] Outreach tracking

### Phase 2 - AI Features ✅
- [x] AI-powered influencer discovery (GPT-5.2)
- [x] Caption generator
- [x] Campaign ideas generator
- [x] Influencer matching algorithm
- [x] Import AI-discovered influencers to database

### Phase 3 - Advanced Features ✅ (March 4-5, 2026)
- [x] **Influencer Comparison:** Select 2-5 influencers, compare metrics side-by-side with AI recommendation
- [x] **Scheduled Auto-Discovery:** Create daily/weekly automated discovery searches
- [x] **Social API Integration Framework:** Instagram Graph API and YouTube Data API ready (requires API keys)
- [x] **Real-time Progress Updates:** SSE streaming for AI discovery progress
- [x] **Profile Verification Endpoints:** Verify influencer social profiles via APIs
- [x] **Primary Platform Feature:** Each influencer can have a primary platform (Instagram, YouTube, LinkedIn, TikTok, Twitter)
- [x] **Clickable Social Links:** All social handles now open in new tabs with proper URLs
- [x] **Negotiation Tracker Module:** Complete negotiation management with timeline, events, stats, and deal tracking
- [x] **Enhanced Influencer Table:** New columns (Followers, Engagement %, Industry, Tier, Gender, Updated), column sorting, advanced filters panel
- [x] **Live Instagram API Integration:** Business Discovery API configured with user credentials
- [x] **Live YouTube API Integration:** Data API v3 configured with user credentials
- [x] **Auto-Fetch Social Data:** Automatically fetches Instagram/YouTube metrics when adding new influencers
- [x] **Refresh Data Feature:** Single influencer refresh and batch refresh all influencers
- [x] **Verification Status Display:** Shows checkmark badge and last verified date on influencer profiles
- [x] **Enhanced Add Influencer Form:** Quick Add section with Fetch buttons to pull live data from Instagram/YouTube APIs

---

## API Endpoints

### Authentication
- `POST /api/auth/register` - Create new user
- `POST /api/auth/login` - Login and get token

### Influencers
- `GET/POST /api/influencers` - List/Create influencers
- `GET/PUT/DELETE /api/influencers/{id}` - CRUD operations
- `POST /api/influencers/compare` - Compare 2-5 influencers

### Campaigns
- `GET/POST /api/campaigns` - List/Create campaigns
- `PUT /api/campaigns/{id}/status` - Update campaign status
- `POST /api/campaigns/{id}/assign` - Assign influencer to campaign

### AI Tools
- `POST /api/ai/auto-discover` - AI-powered influencer discovery
- `GET /api/ai/auto-discover-stream` - SSE streaming discovery
- `POST /api/ai/generate-caption` - Generate social captions
- `POST /api/ai/campaign-ideas` - Generate campaign ideas
- `POST /api/ai/import-discovered` - Import AI-discovered influencer

### Scheduled Discovery
- `GET/POST /api/scheduled/searches` - Manage scheduled searches
- `PUT/DELETE /api/scheduled/searches/{id}` - Update/Delete search
- `POST /api/scheduled/searches/{id}/run` - Run search manually
- `GET /api/scheduled/results` - Get discovery results

### Social Verification
- `POST /api/social/configure` - Configure API credentials
- `POST /api/social/verify` - Verify a social profile
- `POST /api/social/verify-influencer/{id}` - Verify influencer's profiles

### Analytics
- `GET /api/analytics/dashboard` - Dashboard metrics
- `GET /api/analytics/campaign/{id}` - Campaign analytics

---

## Data Models

### Influencer
```python
{
    "id": "uuid",
    "name": "string",
    "instagram_handle": "string",
    "youtube_handle": "string",
    "tiktok_handle": "string",
    "email": "string",
    "phone": "string",
    "city": "string",
    "category": "luxury|menswear|womenswear|streetwear|ethnic|minimal",
    "industry": "fashion|beauty|lifestyle|fitness|tech|food|travel",
    "tier": "nano|micro|macro|mega|celebrity",
    "gender": "male|female|non-binary|other",
    "followers": "int",
    "engagement_rate": "float",
    "style_tags": ["string"],
    "rate_per_reel": "int",
    "status": "identified|contacted|interested|negotiation|confirmed|completed",
    "score": "float (calculated)",
    "created_at": "datetime"
}
```

### Campaign
```python
{
    "id": "uuid",
    "name": "string",
    "objective": "string",
    "budget": "int",
    "start_date": "date",
    "end_date": "date",
    "status": "planning|active|completed|cancelled",
    "influencers": [{"influencer_id", "rate", "content_status"}],
    "created_at": "datetime"
}
```

### Scheduled Search
```python
{
    "id": "uuid",
    "name": "string",
    "campaign_brief": "string",
    "category": "string",
    "location": "string",
    "follower_range": "string",
    "frequency": "daily|weekly",
    "is_active": "bool",
    "next_run": "datetime",
    "total_discovered": "int"
}
```

---

## Upcoming Tasks (Backlog)

### P0 - High Priority
- [ ] Refactor server.py into smaller router files (1800+ lines now)
- [ ] Implement actual scheduling logic for Auto-Discovery (using apscheduler)

### P1 - Medium Priority
- [ ] Content Library module
- [ ] Display Deliverables Bucket in negotiation detail view
- [ ] WhatsApp Business API integration
- [ ] Email outreach via SendGrid (integrated but needs testing)

### P2 - Future
- [ ] User roles and permissions
- [ ] Mobile app for influencers
- [ ] Advanced analytics and reporting
- [ ] AI stylist influencers

---

## Known Issues
1. SSE streaming returns 403 when called directly (works via fetch with auth header)
2. Recharts console warnings (cosmetic only)
3. server.py is over 1800 lines - needs refactoring into routers
4. Some older influencers without social handles show 0 followers (need to add handles and refresh)

## Test Credentials
- Register a new account on the login page to test

---

*Last Updated: March 4, 2026*
