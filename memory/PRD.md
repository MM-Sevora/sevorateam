# Marketing Operating System - PRD

## Original Problem Statement
Build a comprehensive Marketing Operating System that unifies Influencer and PR modules with full CRUD operations, budget management, content/asset management, email integration via Microsoft Graph API, and AI-powered tools.

## Current Status: FULLY OPERATIONAL ✅

All core integrations are working:
- ✅ Microsoft Graph API (Email)
- ✅ YouTube Data API  
- ✅ Instagram Graph API

## Architecture
```
/app/
├── backend/
│   ├── models/marketing.py          # Data models
│   ├── routes/marketing_v2.py       # Main routes (NEEDS REFACTORING - 4000+ lines)
│   └── services/
│       ├── microsoft_email.py       # Email service
│       ├── microsoft_service.py     # Graph API wrapper
│       └── social_api.py            # Instagram/YouTube API
├── frontend/src/pages/marketing/
│   ├── EmailPage.jsx                # Gmail-style UI ✅
│   ├── ContentAssetsPage.jsx        # Content management ✅
│   ├── Budget.jsx                   # Payment CRUD ✅
│   ├── InfluencersListPage.jsx      # Influencer management ✅
│   ├── AIDiscoveryPage.jsx          # AI-powered discovery ✅
│   └── CampaignHubPage.jsx          # Campaign CRUD ✅
```

## Completed Features (March 2026)
- [x] Campaign Hub with full CRUD and sorting
- [x] Budget & Payment Module with campaign sync
- [x] Content & Assets Module (Brand Assets, Press Kit, Templates, UGC, Deliveries)
- [x] Gmail-style Email Module via Microsoft Graph
- [x] User Settings Modal for email configuration
- [x] AI Tools & Discovery with platform selection
- [x] YouTube API Integration - WORKING
- [x] Instagram API Integration - WORKING (fixed Account ID)
- [x] Bug fixes: Select z-index, Add Influencer validation

## API Keys Configured (backend/.env)
- ✅ YouTube API Key
- ✅ Instagram Access Token
- ✅ Instagram Business Account ID: `17841478242590925` (shopsevora)

## Prioritized Backlog

### P0 (Critical)
1. Refactor `marketing_v2.py` into smaller routers

### P1 (High)  
1. Delete deprecated files: `DigitalPRPage.jsx`, `InfluencerDetailPageV2.jsx`
2. PR Analytics Dashboard

### P2 (Medium)
1. AI pitch writing feature
2. Automated media monitoring
3. Email templates dropdown
4. Scheduled Azure AD Sync

## Known Issues
- WebSocket Notifications: Platform ingress issue
- Twilio WhatsApp: Blocked (user sandbox setup required)

## Test Credentials
- Super Admin: `superadmin@sevora.com` / `superadmin123`
