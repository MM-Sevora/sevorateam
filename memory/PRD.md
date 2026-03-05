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

### Phase 4 - Industry-Standard Data Fields ✅ (March 5, 2026)
- [x] **Platform-Specific Audience Demographics:** Separate demographics for Instagram and YouTube with multi-select ratios for Age Group (13-17 to 55+), Gender (Male/Female/Other), Top Cities
- [x] **Visual Distinction:** Instagram section uses pink/purple gradient, YouTube uses red/orange gradient
- [x] **Manager/Agent Contact Fields:** Manager name, email, phone for talent agency contacts
- [x] **Commercial Terms:** Exclusivity terms, typical turnaround days, payment terms (advance, 50-50, post-delivery, milestone)
- [x] **Enhanced Add Influencer Form:** Now 5 tabs (Basic, Social, Audience, Manager, Rates)
- [x] **Visual Demographics Display:** Profile page shows demographics as visual progress bars with platform-specific color coding
- [x] **Removed Category Field:** Replaced with Industry throughout the application
- [x] **Removed Legacy Platforms:** Cleaned up LinkedIn, TikTok, Twitter from UI and models (focused on Instagram & YouTube)
- [x] **Legacy Support:** Old demographics format (without platform keys) still supported for backward compatibility

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
    "email": "string",
    "phone": "string",
    "city": "string",
    "industry": "fashion|beauty|lifestyle|fitness|tech|food|travel",
    "tier": "nano|micro|macro|mega|celebrity",
    "gender": "male|female|non-binary|other",
    "gender_focus": "menswear|womenswear|unisex",
    "followers": "int",
    "engagement_rate": "float",
    "instagram_metrics": {"followers", "engagement_rate", "avg_likes", "avg_comments"},
    "youtube_metrics": {"subscribers", "avg_views", "avg_likes", "engagement_rate"},
    # Manager Contact
    "manager_name": "string",
    "manager_email": "string",
    "manager_phone": "string",
    # Platform-Specific Audience Demographics
    "audience_demographics": {
        "instagram": {
            "age_split": [{"group": "18-24", "percentage": 45}, ...],
            "gender_split": [{"gender": "Female", "percentage": 75}, ...],
            "city_split": [{"city": "Mumbai", "percentage": 35}, ...]
        },
        "youtube": {
            "age_split": [{"group": "25-34", "percentage": 40}, ...],
            "gender_split": [{"gender": "Male", "percentage": 55}, ...],
            "city_split": [{"city": "Bangalore", "percentage": 30}, ...]
        }
    },
    # Rate Card
    "rate_per_post": "float",
    "rate_per_reel": "float",
    "rate_per_story": "float",
    "rate_per_video": "float",
    "accepts_barter": "bool",
    # Commercial Terms
    "exclusivity_terms": "string",
    "typical_turnaround_days": "int",
    "payment_terms": "advance|50-50|post-delivery|milestone",
    "style_tags": ["string"],
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
    "industry": "string",  # Changed from category
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
- [ ] Refactor server.py into smaller router files (1900+ lines now)
- [ ] Implement actual scheduling logic for Auto-Discovery (using apscheduler)

### P1 - Medium Priority
- [ ] Content Library module - Store influencer-generated content
- [ ] Display Deliverables Bucket in negotiation detail view
- [ ] WhatsApp Business API integration
- [ ] Email outreach via SendGrid (integrated but needs testing)

### P2 - Future
- [ ] User roles and permissions (Founder, Marketing Manager)
- [ ] Mobile app for influencers
- [ ] Advanced analytics and reporting
- [ ] AI stylist influencers
- [ ] AI discovery timeout fix (background tasks)

---

## Known Issues
1. Recharts console warnings (cosmetic only)
2. server.py is over 1900 lines - needs refactoring into routers
3. Some older influencers without social handles show 0 followers (need to add handles and refresh)
4. AI discovery may timeout under heavy load (SSE helps but not fully async)

## Test Credentials
- Register a new account on the login page to test

---

*Last Updated: March 5, 2026*
