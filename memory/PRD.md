# Marketing Operating System - PRD

## Current Status: FULLY OPERATIONAL ✅

All core features working with clean codebase.

## Recent Cleanup (March 8, 2026)
- Deleted 4 deprecated frontend files
- Reduced marketing pages from 25 to 21
- Added redirect from /marketing/pr to /marketing/publications
- Backend `marketing_v2.py` retained (future refactor candidate)

## Architecture
```
/app/
├── backend/
│   └── routes/marketing_v2.py   # 4253 lines (future refactor)
├── frontend/src/pages/marketing/
│   ├── InfluencersListPage.jsx  # Primary influencer list
│   ├── InfluencerDetailPage.jsx # Detail view with YouTube metrics
│   ├── PublicationsListPage.jsx # PR/Publications list
│   ├── PublicationDetailPage.jsx
│   ├── CampaignHubPage.jsx      # Campaign management
│   ├── Budget.jsx               # Payment tracking
│   ├── ContentAssetsPage.jsx    # Assets, Press Kits, Templates
│   ├── EmailPage.jsx            # Gmail-style email
│   └── AIDiscoveryPage.jsx      # AI-powered discovery
```

## Features Completed
- ✅ Full CRUD for Influencers, Publications, Campaigns
- ✅ Payment tracking with campaign budget sync
- ✅ Gmail-style email via Microsoft Graph API
- ✅ YouTube & Instagram API integrations
- ✅ Action dropdown menus on list pages
- ✅ Separated Pipeline & Campaign cards

## API Keys Configured
- ✅ YouTube API Key
- ✅ Instagram Access Token & Business Account ID
- ✅ Microsoft Graph API (Email)

## Prioritized Backlog

### P1 (High)
1. PR Analytics Dashboard
2. Refactor marketing_v2.py into smaller routers

### P2 (Medium)
1. AI pitch writing feature
2. Automated media monitoring
3. Email templates dropdown
4. Scheduled Azure AD Sync

## Test Credentials
- Super Admin: `superadmin@sevora.com` / `superadmin123`
