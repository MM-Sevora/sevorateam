# SocialFlow AI - Product Requirements Document

## Original Problem Statement
Create a social media management tool that tracks pages with metrics, suggests content ideas, uses AI to create content, and posts it. Added: Platform OAuth integration, AI Avatar with chat, Content Performance Predictor.

## Architecture
- **Frontend**: React 19 + Tailwind CSS + Recharts + Lucide React + React Icons
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
- Platform OAuth connection management with insights
- AI Avatar with brand voice and chat interface
- Content Performance Predictor

## What's Been Implemented

### Phase 1 - MVP (March 2026)
- JWT authentication (register/login/me)
- Dashboard with metrics, charts, platform breakdown
- AI content ideas generation (GPT-5.2)
- AI content creation (GPT-5.2 for text, Gemini Nano Banana for images)
- Post CRUD with publish workflow
- Content calendar/scheduler
- Platform connection management
- Responsive dark-theme UI with sidebar layout

### Phase 2 - Advanced Features (March 2026)
- **OAuth Platform Integration**: Simulated OAuth flows for Facebook, Instagram, Twitter/X, LinkedIn, YouTube with scopes, permissions, and insights panels showing audience demographics, engagement metrics, best posting times, and top posts
- **AI Avatar System**: Create/configure AI brand avatar with name, brand voice, tone, industry, target audience, and style keywords. Generate visual avatar images via Gemini Nano Banana. Conversational chat interface where the avatar creates content matching brand voice, with persistent chat history
- **Content Performance Predictor**: AI-powered engagement prediction with engagement score, content quality score, hashtag effectiveness, virality potential, predicted metrics (likes, comments, shares, reach), improvement suggestions, competitor benchmarks, and best posting time heatmap analysis
- **Platform Insights**: Detailed analytics per connected platform including audience demographics, age groups, gender split, top countries, and best posting times

## Testing Status
- Backend: 100% pass (all 22 endpoints tested)
- Frontend: 100% pass (all pages and navigation verified)

## Prioritized Backlog

### P0 (Critical - Not Yet Done)
- None - All requested features are functional

### P1 (High Priority - Next Phase)
- Real OAuth integration with actual API keys (Facebook Graph API, Twitter API v2, LinkedIn API, YouTube Data API)
- Cron-based auto-publishing for scheduled posts
- Analytics export (CSV/PDF reports)
- Webhook notifications for post performance milestones

### P2 (Medium Priority)
- Content approval workflow (team collaboration)
- A/B testing for posts
- Competitor analysis integration
- Hashtag research tool with trending data
- Bulk content scheduling
- Multi-account support per platform

### P3 (Nice to Have)
- Custom reporting templates
- White-label options
- Webhook integrations for external tools
- Multi-language content generation
- Video content creation support
- RSS feed to social post automation

## Next Tasks
1. Add real OAuth credentials for social media platforms
2. Implement cron-based auto-publishing
3. Add team collaboration features
4. Build analytics export functionality
5. Add notification system for post milestones
