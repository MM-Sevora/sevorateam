# Marketing Operating System - PRD

## Current Status: FULLY OPERATIONAL ✅

All core features working with enhanced UX.

## Recent Enhancements (March 8, 2026)

### 6. Deliveries Module Enhancement ✅ (NEW)
- **Bug Fix**: Influencer names now show correctly in Deliveries list (was showing "Unknown")
- **New Feature**: Rate Card selection in "Record Delivery" modal
  - When selecting an influencer, their rate cards/deliverables are fetched
  - User can select which rate card applies to this delivery
  - Rate amount is auto-populated from selected rate card
- **Backend**: New endpoint `GET /api/marketing/v2/contacts/{contact_id}/deliverables`
- **Models Updated**: ContactUpdate and ContactResponse now include `deliverables` field

### 5. Bulk Delete Functionality ✅
- **Influencers Page**: Checkbox selection, Select All, Delete (X) button, confirmation dialog
- **Publications Page**: Checkbox selection, Select All, Delete (X) button, confirmation dialog  
- **Campaigns Page**: Checkbox selection, Select All, Delete (X) button, confirmation dialog
- **Outreach Dashboard**: Checkbox on each communication, bulk delete with confirmation
- **Deal Pipeline**: Checkbox on each deal card, bulk delete with confirmation
- Backend endpoints:
  - `POST /api/marketing/v2/contacts/bulk-delete`
  - `POST /api/marketing/v2/publications/bulk-delete`
  - `POST /api/marketing/v2/campaigns/bulk-delete`
  - `POST /api/marketing/v2/deals/bulk-delete`
  - `POST /api/marketing/v2/communications/bulk-delete`

### 4. Campaign Form Enhancements ✅
- Multi-select Objectives using checkboxes
- Campaign Type dropdown in Edit modal
- Fixed unified-campaigns API collection name

### 3. Campaign Delete Fix ✅
- Added DELETE endpoints for both influencer and PR campaigns

### 2. Outreach Dashboard & Deal Pipeline ✅
- Response tracking with status indicators
- Follow-up management with scheduling
- Kanban-style deal pipeline with drag-and-drop
- Routes: `/marketing/outreach-dashboard`, `/marketing/deals`
- **Fix**: Deal Pipeline now uses `/unified-campaigns` endpoint (was failing before)

### 1. Communication History Timeline ✅
- Vertical timeline on Influencer and Publication detail pages

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

### P2 (Medium)
1. AI pitch writing feature
2. Automated media monitoring
3. Email templates dropdown

### P3 (Low)
1. WebSocket notifications (platform-level issue)
2. Twilio WhatsApp sandbox setup

## Test Credentials
- Super Admin: `superadmin@sevora.com` / `superadmin123`
- Marketing: `marketing@sevora.com` / `admin123`

## Test Data
- **Influencer**: Nivrity Das (ID: f4c76400-f85c-465b-bdce-c1bd941912a9)
  - 4 Rate Cards: Static Post (₹25,000), Reel/Short (₹50,000), Story Set (₹15,000), YouTube Integration (₹75,000)

## Known Issues
- WebSocket notifications not working (platform ingress config)
- Twilio WhatsApp blocked on user sandbox setup
- Instagram follower count API limitation (permissions)
- Orphan delivery records show "Unknown" for deleted contacts (expected behavior)
