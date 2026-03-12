# Marketing Operations Platform - Scope of Work (SOW)
## Phase 5: Content & Campaign Integration Enhancement

**Document Version**: 1.0  
**Date**: March 12, 2026  
**Status**: Draft - Pending Approval

---

## Executive Summary

This SOW addresses two critical areas of improvement:
1. **Content Production Restructuring** - Separating Project Type (workflow) from Content Type (what) from Medium (where)
2. **Campaign Hub Integration** - Creating cross-module connectivity between campaigns and all related modules

---

## Part A: Content Production Restructuring

### Current State Analysis

**Problem**: The current system conflates "Project Type" with "Content Type":
- `project_type`: original_production, adaptation, delivery_only, graphics
- `content_type`: video, photo, reel, graphic

**Issue**: "Blog" and "Product Content" are not project types - they are **content types**. A blog can be an "Original Production" or "Adaptation".

### Proposed Data Model

```
┌─────────────────────────────────────────────────────────────────────┐
│                        CONTENT PROJECT                               │
├─────────────────────────────────────────────────────────────────────┤
│  PROJECT TYPE (How it's produced)                                   │
│  ├── Original Production (created from scratch)                     │
│  ├── Editing / Post Production (enhance existing content)           │
│  ├── Adaptation / Repurpose (transform for new medium)              │
│  ├── Graphics / Design (static visual design)                       │
│  └── Delivery / Formatting (resize, export only)                    │
├─────────────────────────────────────────────────────────────────────┤
│  CONTENT TYPE (What is being created)                               │
│  ├── Written Content                                                │
│  │   ├── Blog Article                                               │
│  │   ├── Website Page                                               │
│  │   ├── Landing Page                                               │
│  │   ├── Email / Newsletter                                         │
│  │   ├── Case Study                                                 │
│  │   └── Press Release                                              │
│  ├── Product Content                                                │
│  │   ├── Product Description                                        │
│  │   ├── Product Images                                             │
│  │   ├── Product Video                                              │
│  │   ├── Product Lookbook                                           │
│  │   └── Product Styling Guide                                      │
│  ├── Social Content                                                 │
│  │   ├── Instagram Post                                             │
│  │   ├── Reel / Short Video                                         │
│  │   ├── Carousel                                                   │
│  │   ├── Story                                                      │
│  │   └── User Generated Content                                     │
│  ├── Video Content                                                  │
│  │   ├── Brand Film                                                 │
│  │   ├── Product Video                                              │
│  │   ├── Tutorial / How-To                                          │
│  │   ├── Behind The Scenes                                          │
│  │   └── Interview / Testimonial                                    │
│  └── Marketing Content                                              │
│      ├── Ad Creative                                                │
│      ├── Campaign Hero                                              │
│      ├── Banner / Display                                           │
│      └── Brand Story                                                │
├─────────────────────────────────────────────────────────────────────┤
│  MEDIUM / CHANNEL (Where it will be published)                      │
│  ├── Website                                                        │
│  ├── Instagram                                                      │
│  ├── Facebook                                                       │
│  ├── YouTube                                                        │
│  ├── TikTok                                                         │
│  ├── LinkedIn                                                       │
│  ├── Email                                                          │
│  ├── Ads (Meta, Google, etc.)                                       │
│  └── Print / Offline                                                │
└─────────────────────────────────────────────────────────────────────┘
```

### Implementation Tasks

#### A.1 Backend Model Updates

| Task | Description | Files |
|------|-------------|-------|
| A.1.1 | Add `ContentCategory` enum (Written, Product, Social, Video, Marketing) | `marketing_content.py` |
| A.1.2 | Add `ContentSubType` enum with nested options | `marketing_content.py` |
| A.1.3 | Add `Medium` enum for publishing channels | `marketing_content.py` |
| A.1.4 | Update `ContentProject` model with new fields | `marketing_content.py` |
| A.1.5 | Create migration script for existing data | `migrations/` |

**Updated Model Schema:**
```python
class ContentProject:
    id: str
    title: str
    
    # HOW - Production workflow
    project_type: ProjectType  # original_production, editing, adaptation, graphics, delivery
    
    # WHAT - Content classification
    content_category: ContentCategory  # written, product, social, video, marketing
    content_sub_type: str  # blog_article, product_images, instagram_post, etc.
    
    # WHERE - Publishing destination
    medium: Medium  # website, instagram, youtube, etc.
    
    # Links
    campaign_id: Optional[str]
    source_project_id: Optional[str]  # For adaptations
    
    # Dates
    shoot_date: Optional[date]
    due_date: Optional[date]
    publish_date: Optional[date]
    
    # Workflow
    status: ProjectStatus
    tasks: List[ContentTask]
```

#### A.2 Workflow Generation Updates

| Task | Description |
|------|-------------|
| A.2.1 | Update workflow templates to consider both project_type AND content_category |
| A.2.2 | Add specific task templates for written content (Research, Draft, Edit, Review, Publish) |
| A.2.3 | Add specific task templates for product content (Prep, Shoot, Select, Retouch, Export) |
| A.2.4 | Update task generation logic to merge project_type workflow with content-specific tasks |

**Example Workflow Matrix:**

| Project Type | Content Category | Generated Tasks |
|--------------|-----------------|-----------------|
| Original Production | Blog Article | Research → Outline → Draft → Edit → SEO Review → Approval → Publish |
| Original Production | Product Images | Brief → Prep → Shoot → Select → Retouch → Color → Approval → Export |
| Adaptation | Blog → Social | Select Source → Extract Key Points → Design → Copy → Review → Schedule |
| Graphics | Ad Creative | Brief → Concept → Design → Revisions → Approval → Export Sizes |

#### A.3 Frontend Updates

| Task | Description | File |
|------|-------------|------|
| A.3.1 | Add Content Category dropdown (primary) | `ContentProductionPage.jsx` |
| A.3.2 | Add Content Sub-Type dropdown (cascading based on category) | `ContentProductionPage.jsx` |
| A.3.3 | Rename current `content_type` field to `medium` | `ContentProductionPage.jsx` |
| A.3.4 | Update project cards to show all three dimensions | `ContentProductionPage.jsx` |
| A.3.5 | Add filters for each dimension | `ContentProductionPage.jsx` |

**Updated Create Form:**
```
┌────────────────────────────────────────────────────────┐
│  Create Content Project                                │
├────────────────────────────────────────────────────────┤
│  Project Title: [_________________________________]    │
│                                                        │
│  ┌─── HOW (Production Workflow) ───┐                  │
│  │  [Original Production      ▼]   │                  │
│  └─────────────────────────────────┘                  │
│                                                        │
│  ┌─── WHAT (Content Type) ─────────┐                  │
│  │  Category: [Written Content ▼]  │                  │
│  │  Type:     [Blog Article    ▼]  │                  │
│  └─────────────────────────────────┘                  │
│                                                        │
│  ┌─── WHERE (Medium/Channel) ──────┐                  │
│  │  [Website                   ▼]  │                  │
│  └─────────────────────────────────┘                  │
│                                                        │
│  Campaign: [Summer Collection 2026 ▼] (Optional)      │
│                                                        │
│  Due Date: [___________]  Publish Date: [___________] │
│                                                        │
│           [Cancel]  [Create Project]                   │
└────────────────────────────────────────────────────────┘
```

---

## Part B: Campaign Hub Integration

### Current State Analysis

**Gaps Identified:**

| Gap | Severity | Description |
|-----|----------|-------------|
| B.1 | 🔴 Critical | No link to Budget Management - campaign spend tracked separately |
| B.2 | 🔴 Critical | No link to Content Production - can't see content being produced |
| B.3 | 🔴 Critical | No link to Digital Ads - can't see ad campaigns running |
| B.4 | 🟡 Medium | No link to Creative Assets - can't view campaign assets |
| B.5 | 🟡 Medium | No influencer assignment from Campaign Hub |
| B.6 | 🟡 Medium | PR campaigns don't connect to Publications Pipeline |
| B.7 | 🟢 Low | No content calendar integration |

### Proposed Solution: Campaign Details Page

Create a comprehensive Campaign Details page that serves as the **central hub** for all campaign-related activities.

```
┌─────────────────────────────────────────────────────────────────────────┐
│  CAMPAIGN: Summer Collection 2026                                        │
│  Status: Active  |  Type: Mixed  |  Jun 1 - Aug 31, 2026                │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  ┌─── OVERVIEW ─────────────────────────────────────────────────────┐   │
│  │                                                                   │   │
│  │  Budget: ₹50,00,000    Spent: ₹12,50,000    Remaining: ₹37,50,000│   │
│  │  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ 25%                         │   │
│  │                                                                   │   │
│  │  Objectives: Brand Awareness, Sales                               │   │
│  │  Target Market: Women 25-40, Urban India                          │   │
│  │                                                                   │   │
│  └───────────────────────────────────────────────────────────────────┘   │
│                                                                          │
│  ┌─── TABS ─────────────────────────────────────────────────────────┐   │
│  │ [Content] [Ads] [Assets] [Influencers] [PR/Publications] [Budget]│   │
│  └───────────────────────────────────────────────────────────────────┘   │
│                                                                          │
│  ═══════════════════════════════════════════════════════════════════════│
│                                                                          │
│  CONTENT PROJECTS (3)                              [+ Add Content]       │
│  ┌────────────────────────────────────────────────────────────────────┐ │
│  │ □ Summer Lookbook Shoot     | Product Content | In Production      │ │
│  │ □ Summer Collection Blog    | Blog Article    | Draft Ready        │ │
│  │ □ Instagram Launch Carousel | Social Content  | Pending Review     │ │
│  └────────────────────────────────────────────────────────────────────┘ │
│                                                                          │
│  DIGITAL ADS (2)                                   [+ Create Ad]         │
│  ┌────────────────────────────────────────────────────────────────────┐ │
│  │ Meta - Awareness Campaign    | ₹5,00,000 | 1.2M Impressions | Active│ │
│  │ Google - Search Campaign     | ₹2,00,000 | 45K Clicks       | Active│ │
│  └────────────────────────────────────────────────────────────────────┘ │
│                                                                          │
│  CREATIVE ASSETS (12)                              [View All]            │
│  ┌────────────────────────────────────────────────────────────────────┐ │
│  │ [img] [img] [img] [img] [img] [img] [+6 more]                      │ │
│  └────────────────────────────────────────────────────────────────────┘ │
│                                                                          │
│  INFLUENCERS (5)                                   [+ Assign]            │
│  ┌────────────────────────────────────────────────────────────────────┐ │
│  │ @fashionista (500K) | Contracted | ₹1,50,000                       │ │
│  │ @styleguru (250K)   | Negotiating | ₹75,000                        │ │
│  │ @trendsetter (1M)   | Content Delivered | ₹2,00,000                │ │
│  └────────────────────────────────────────────────────────────────────┘ │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

### Implementation Tasks

#### B.1 Campaign Details Page (Frontend)

| Task | Description | Priority |
|------|-------------|----------|
| B.1.1 | Create `CampaignDetailsPage.jsx` component | P0 |
| B.1.2 | Add route `/marketing/campaign/:campaignId` | P0 |
| B.1.3 | Implement Overview section with budget progress | P0 |
| B.1.4 | Implement Content Projects tab | P0 |
| B.1.5 | Implement Digital Ads tab | P0 |
| B.1.6 | Implement Creative Assets tab | P1 |
| B.1.7 | Implement Influencers tab | P1 |
| B.1.8 | Implement PR/Publications tab (for PR campaigns) | P1 |
| B.1.9 | Implement Budget tab with breakdown | P1 |

#### B.2 Campaign API Enhancements (Backend)

| Task | Description | Priority |
|------|-------------|----------|
| B.2.1 | Create `GET /campaigns/{id}/details` - aggregated campaign data | P0 |
| B.2.2 | Create `GET /campaigns/{id}/content-projects` | P0 |
| B.2.3 | Create `GET /campaigns/{id}/ad-campaigns` | P0 |
| B.2.4 | Create `GET /campaigns/{id}/assets` | P1 |
| B.2.5 | Create `GET /campaigns/{id}/influencers` | P1 |
| B.2.6 | Create `GET /campaigns/{id}/pitches` (for PR) | P1 |
| B.2.7 | Create `GET /campaigns/{id}/budget-summary` | P1 |

#### B.3 Cross-Module Linking

| Task | Description | Priority |
|------|-------------|----------|
| B.3.1 | Add "Add to Campaign" action in Content Production list | P0 |
| B.3.2 | Add "Add to Campaign" action in Digital Ads list | P0 |
| B.3.3 | Add "Link Campaign" option in Asset upload | P1 |
| B.3.4 | Add campaign filter to Influencer Pipeline | P1 |
| B.3.5 | Add campaign filter to Publications Pipeline | P1 |

#### B.4 Budget Integration

| Task | Description | Priority |
|------|-------------|----------|
| B.4.1 | Auto-create budget entry when campaign is created | P1 |
| B.4.2 | Sync campaign spend with Budget Management expenses | P1 |
| B.4.3 | Show budget alerts on Campaign Details when overspending | P1 |
| B.4.4 | Add "Create Budget" button on Campaign Details if no budget exists | P2 |

---

## Part C: Content Calendar (Future Enhancement)

### Proposed Feature

A unified editorial calendar showing:
- Content project due dates and publish dates
- Campaign milestones (start/end)
- Social media post schedules
- PR pitch deadlines
- Influencer content delivery dates

```
┌─────────────────────────────────────────────────────────────────────────┐
│  CONTENT CALENDAR - June 2026                                            │
├─────────────────────────────────────────────────────────────────────────┤
│  Mon    Tue    Wed    Thu    Fri    Sat    Sun                          │
├────────┼────────┼────────┼────────┼────────┼────────┼────────┤          │
│   1    │   2    │   3    │   4    │   5    │   6    │   7    │          │
│ ●Camp  │        │ ■Blog  │        │ ▲Infl  │        │        │          │
│ Start  │        │ Due    │        │ Post   │        │        │          │
├────────┼────────┼────────┼────────┼────────┼────────┼────────┤          │
│   8    │   9    │   10   │   11   │   12   │   13   │   14   │          │
│        │        │ ★Blog  │        │ ■Video │        │        │          │
│        │        │Publish │        │ Due    │        │        │          │
└────────┴────────┴────────┴────────┴────────┴────────┴────────┘          │
                                                                          │
Legend: ● Campaign  ■ Content  ▲ Influencer  ★ Publish  ◆ PR Pitch       │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## Implementation Timeline

### Phase 5A: Content Production Restructuring (Week 1-2)

| Week | Tasks |
|------|-------|
| Week 1 | A.1 Backend model updates, A.2 Workflow generation |
| Week 2 | A.3 Frontend updates, Testing & Migration |

### Phase 5B: Campaign Hub Integration (Week 3-4)

| Week | Tasks |
|------|-------|
| Week 3 | B.1 Campaign Details Page, B.2 Campaign APIs |
| Week 4 | B.3 Cross-module linking, B.4 Budget integration |

### Phase 5C: Content Calendar (Week 5 - Future)

| Week | Tasks |
|------|-------|
| Week 5 | C.1 Calendar view, C.2 Event aggregation |

---

## Database Schema Changes

### New Collections

```javascript
// No new collections needed - using existing ones with enhanced fields
```

### Modified Collections

```javascript
// marketing_content_projects - Enhanced fields
{
  id: "string",
  title: "string",
  
  // HOW (Production Workflow)
  project_type: "enum: original_production|editing|adaptation|graphics|delivery",
  
  // WHAT (Content Classification) - NEW
  content_category: "enum: written|product|social|video|marketing",
  content_sub_type: "string",  // e.g., "blog_article", "product_images"
  
  // WHERE (Publishing) - RENAMED from content_type
  medium: "enum: website|instagram|facebook|youtube|tiktok|linkedin|email|ads|print",
  
  // Campaign Link - EMPHASIZED
  campaign_id: "string (reference to marketing_campaigns or pr_campaigns)",
  
  // ... existing fields
}

// marketing_campaigns - Add computed fields
{
  // ... existing fields
  
  // Computed (not stored, calculated in API)
  content_project_count: "number",
  ad_campaign_count: "number", 
  asset_count: "number",
  influencer_count: "number",  // Already exists
  budget_utilization: "number"
}
```

---

## API Endpoints Summary

### New Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/marketing/v3/campaigns/{id}/details` | Full campaign details with all linked items |
| GET | `/marketing/v3/campaigns/{id}/content` | Content projects for campaign |
| GET | `/marketing/v3/campaigns/{id}/ads` | Digital ad campaigns for campaign |
| GET | `/marketing/v3/campaigns/{id}/assets` | Creative assets for campaign |
| GET | `/marketing/v3/campaigns/{id}/budget` | Budget breakdown for campaign |
| POST | `/marketing/v3/content/projects/{id}/link-campaign` | Link project to campaign |
| POST | `/marketing/v3/ads/campaigns/{id}/link-campaign` | Link ad campaign to marketing campaign |

### Modified Endpoints

| Endpoint | Changes |
|----------|---------|
| `POST /marketing/v3/content/projects` | Add `content_category`, `content_sub_type`, rename `platform` to `medium` |
| `GET /marketing/v3/content/workflow-templates` | Return templates by both project_type and content_category |

---

## Success Criteria

### Part A: Content Production

- [ ] User can select Content Category (Written, Product, Social, Video, Marketing)
- [ ] User can select Content Sub-Type based on category
- [ ] User can select Medium/Channel for publishing
- [ ] Workflow tasks are generated based on BOTH project type AND content category
- [ ] Existing data is migrated without loss

### Part B: Campaign Hub

- [ ] User can click on a campaign to see Campaign Details page
- [ ] Campaign Details shows all linked content projects
- [ ] Campaign Details shows all linked digital ad campaigns  
- [ ] Campaign Details shows budget utilization from Budget Management
- [ ] User can add content/ads to campaign from their respective pages
- [ ] PR campaigns show linked publication pitches

---

## Risks & Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| Data migration for existing content projects | Medium | Create backward-compatible defaults; `content_category: "social"`, `medium: platform` |
| Breaking existing workflows | High | Keep `project_type` as primary workflow driver; content_category adds tasks, doesn't replace |
| Performance on Campaign Details page | Medium | Lazy load tabs, cache aggregated counts |

---

## Approval

| Role | Name | Date | Signature |
|------|------|------|-----------|
| Product Owner | | | |
| Technical Lead | | | |
| Stakeholder | | | |

---

*Document prepared by: E1 Agent*  
*Last updated: March 12, 2026*
