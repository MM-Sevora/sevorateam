# SocialFlow AI - Product Requirements Document

## Original Problem Statement
Create a social media management tool that tracks pages with metrics, suggests content ideas, uses AI to create content, and posts it. With real social media API integration, AI Avatar, and Content Performance Predictor.

## Architecture
- **Frontend**: React 19 + Tailwind CSS + Recharts + Lucide React + React Icons
- **Backend**: FastAPI (Python) with MongoDB + httpx for API testing
- **AI**: OpenAI GPT-5.2 (text via emergentintegrations), Gemini Nano Banana (images via emergentintegrations)
- **Auth**: JWT-based custom authentication

## What's Been Implemented

### Phase 1 - MVP (March 2026)
- JWT authentication, Dashboard with metrics/charts, AI content ideas (GPT-5.2), AI content creator (text+images), Post CRUD with publish workflow, Content calendar/scheduler, Platform connection management, Responsive dark-theme UI

### Phase 2 - Advanced Features (March 2026)
- AI Avatar system with brand voice, visual avatar generation, conversational chat
- Content Performance Predictor with engagement scores, virality potential, best times
- Platform insights with audience demographics

### Phase 3 - Real API Integration (March 2026)
- **Platform Credential Management**: Per-platform API credential storage with schemas for Facebook (App ID, App Secret, Page Access Token, Page ID), Instagram (Meta App ID, App Secret, Access Token, IG Account ID), Twitter/X (API Key, API Secret, Access Token, Access Token Secret, Bearer Token), LinkedIn (Client ID, Client Secret, Access Token, Organization ID), YouTube (API Key, OAuth Client ID, Client Secret, Refresh Token, Channel ID)
- **Setup Guides**: Step-by-step numbered guides per platform showing exactly how to get API credentials, with links to official documentation and required permissions listed
- **Credential Security**: Credentials stored in dedicated MongoDB collection, masked display (first/last 4 chars), password toggle visibility
- **Connection Testing**: Real-time API validation hitting actual platform endpoints (Facebook Graph API, Instagram Graph API, Twitter v2 API, LinkedIn API, YouTube Data API v3)
- **Credential CRUD**: Save, update, delete credentials with proper cleanup on platform disconnect
- **Split-panel UI**: Credential form on left, setup guide on right, expandable per-platform panels for connected platforms

## Testing Status
- Backend: 100% pass (31 tests)
- Frontend: 100% pass

## Prioritized Backlog

### P1 (High)
- Cron-based auto-publishing for scheduled posts
- Real API posting to connected platforms using stored credentials
- Real metrics fetching from connected platforms
- Analytics export (CSV/PDF)

### P2 (Medium)
- OAuth 2.0 redirect flow for streamlined platform connection
- Team collaboration & content approval workflows
- A/B testing, competitor analysis, hashtag research
- Bulk content scheduling

### P3 (Nice to Have)
- Webhook notifications, multi-language content, video support
- White-label options, custom reporting templates

## Next Tasks
1. Implement real API posting using stored credentials
2. Fetch live metrics from connected platforms
3. Add cron-based auto-publishing
4. Build analytics export
