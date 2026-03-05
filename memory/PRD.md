# SocialFlow AI - Product Requirements Document

## Original Problem Statement
Create a social media management tool that tracks pages with metrics, suggests content ideas, uses AI to create content, and posts it.

## Architecture
- **Frontend**: React 19 + Tailwind CSS + Recharts + Framer Motion + Lucide React + React Icons
- **Backend**: FastAPI (Python) with MongoDB
- **AI**: OpenAI GPT-5.2 (text generation via emergentintegrations), Gemini Nano Banana (image generation via emergentintegrations)
- **Auth**: JWT-based custom authentication

## User Personas
1. **Social Media Manager** - Manages multiple brand accounts, needs centralized dashboard
2. **Small Business Owner** - Limited time, relies on AI content suggestions
3. **Content Creator** - Needs quick content generation with images

## Core Requirements
- Dashboard with metrics (followers, engagement, reach) across 5 platforms
- AI content idea generation (GPT-5.2)
- AI content creation (text + images)
- Post scheduling and calendar view
- Platform connection management
- Post CRUD with publishing workflow

## What's Been Implemented (March 2026)

### Backend (server.py)
- JWT authentication (register/login/me)
- Dashboard metrics API with seeded demo data
- Platform management (connect/disconnect)
- AI content ideas generation (GPT-5.2)
- AI content creation (GPT-5.2)
- AI image generation (Gemini Nano Banana)
- Post CRUD with publish workflow
- Health check endpoint

### Frontend (React)
- Login & Register pages
- Dashboard with stats cards, engagement chart, platform breakdown, reach trend, post summary
- Content Ideas page with AI generation
- Content Creator with text + image generation
- Posts page with filters and publish/delete
- Scheduler/Calendar page with date-fns
- Platforms management page
- Responsive sidebar layout with mobile support

## Testing Status
- Backend: 100% pass
- Frontend: 95% pass (minor mobile nav fix applied)

## Prioritized Backlog

### P0 (Critical - Not Yet Done)
- None - MVP is functional

### P1 (High Priority - Next Phase)
- Real social media API integrations (Facebook Graph API, Instagram API, Twitter API, LinkedIn API, YouTube API)
- Post scheduling cron job (auto-publish at scheduled time)
- Analytics export (CSV/PDF)

### P2 (Medium Priority)
- Content approval workflow (team collaboration)
- A/B testing for posts
- Competitor analysis
- Hashtag research tool
- Bulk content scheduling

### P3 (Nice to Have)
- Custom reporting templates
- White-label options
- Webhook integrations
- Multi-language content generation
- AI-powered best posting time recommendations

## Next Tasks
1. Integrate real social media APIs for actual posting
2. Implement cron-based auto-publishing for scheduled posts
3. Add team collaboration features
4. Analytics export functionality
