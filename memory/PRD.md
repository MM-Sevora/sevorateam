# Marketing Operating System - PRD

## Current Status: FULLY OPERATIONAL ✅

All core features working with enhanced UX.

## Recent Enhancements (March 8, 2026)

### 12. Social Module Restructured ✅ (NEW)
- **Merged Dashboard & Analytics** into single "Social Media Hub" with tabs
- **Removed from sidebar**: AI Tools, Autopilot, YouTube, Avatar
- **New sidebar**: Dashboard & Analytics, Content Studio, Posts & Schedule, Content Library
- Old routes redirect to `/social`

### 11. Email Module - Full Feature Set ✅ (NEW)
- **BCC Support**: Added Bcc field in compose modal
- **Rich Text Editor**: Bold, Italic, Underline, Links, Bullet/Numbered Lists
- **Email Signatures**: Create, save, auto-append signatures (persisted in localStorage)
- **Scheduled Send**: Pick date/time, saves as draft with scheduled notation
- **Contact Integration**: "Quick Email" button on Influencer & Publication pages
  - Pre-fills recipient email and subject
  - Navigates to Email page with compose modal open
- **Attachment Upload**: Attach files up to 3MB each
- **Email Templates**: 5 pre-built templates (Collaboration, Follow Up, Campaign Invite, PR Pitch, Thank You)
- **Attachment Download**: Click attachments in received emails to download

### 10. WhatsApp Integration via Twilio ✅
- **Backend**: WhatsApp messaging via Twilio API (`/api/communication/whatsapp/send`)
- **Influencer Detail Page**: Outreach modal now sends actual WhatsApp messages
- **Unified Pipeline**: Send Message modal supports WhatsApp channel
- **Features**:
  - Channel selection (Email/WhatsApp) in outreach modals
  - Sandbox info banner with join instructions
  - Communication history logging
  - Auto-stage update on first contact
- **Sandbox Setup**: Recipients send "join kill-ranch" to +1 415 523 8886
- **Test Number**: +918967719301 (active)

### 9. Unified Pipeline ✅ (MAJOR)
- **Merged**: Outreach Dashboard + Deal Pipeline into single Kanban board
- **Stages**: Identified → Contacted → Replied → Negotiating → Agreed → Delivering → Completed → Lost
- **Features**:
  - Drag-and-drop cards between stages
  - Contact cards show: name, social handles, followers, engagement rate
  - Collapsible communication history per contact
  - Deal info (quote/budget) visible from Negotiating stage onwards
  - Send Message modal with channel selection
  - Filters: search, contact type, campaign
  - Bulk delete functionality
- **Route**: `/marketing/pipeline` (old routes redirect automatically)
- **Sidebar**: Single "Pipeline" link replaces "Outreach" + "Deal Pipeline"

### 7. Campaign - Add Influencer with Deliverable & Fee ✅
- When adding influencer to campaign: select rate card, enter agreed fee
- Data stored: campaign_deliverable_id, campaign_deliverable_name, campaign_agreed_fee

### 6. Deliveries Module Enhancement ✅
- Bug Fix: Influencer names now show correctly (was showing "Unknown")
- Rate Card selection in "Record Delivery" modal

### 5. Bulk Delete Functionality ✅
- Implemented across Influencers, Publications, Campaigns, Pipeline pages

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
- ✅ Twilio WhatsApp API - Messaging working (sandbox mode)

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

## Twilio WhatsApp Sandbox
- **Sandbox Number**: +1 415 523 8886
- **Join Keyword**: `join kill-ranch`
- **Active Test Numbers**: +918967719301
- **To add new recipients**: Send "join kill-ranch" to +1 415 523 8886 on WhatsApp
- **Production Approval**: Apply via Twilio Console when ready

## Test Credentials
- Super Admin: `superadmin@sevora.com` / `superadmin123`
- Marketing: `marketing@sevora.com` / `admin123`

## Test Data
- **Influencer**: Nivrity Das (ID: f4c76400-f85c-465b-bdce-c1bd941912a9)
  - 4 Rate Cards: Static Post (₹25,000), Reel/Short (₹50,000), Story Set (₹15,000), YouTube Integration (₹75,000)

## Known Issues
- WebSocket notifications not working (platform ingress config)
- Instagram follower count API limitation (permissions)
- Orphan delivery records show "Unknown" for deleted contacts (expected behavior)
