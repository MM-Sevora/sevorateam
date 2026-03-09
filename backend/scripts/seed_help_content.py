#!/usr/bin/env python3
"""
Seed Help Center Content for Goals & Objectives and Project Management modules
Run: python3 /app/backend/scripts/seed_help_content.py
"""
import os
import sys
import asyncio
from datetime import datetime, timezone
import uuid

# Add backend to path
sys.path.insert(0, '/app/backend')

from motor.motor_asyncio import AsyncIOMotorClient

MONGO_URL = os.environ.get('MONGO_URL', 'mongodb://localhost:27017')
DB_NAME = os.environ.get('DB_NAME', 'test_database')


# ============== GOALS & OBJECTIVES MODULE CONTENT ==============

GOALS_OBJECTIVES_ARTICLES = [
    {
        "section": "overview",
        "title": "Goals & Objectives - Overview",
        "order": 0,
        "content": """# Goals & Objectives Module Overview

The **Goals & Objectives** module is a strategic execution platform that connects your company's high-level strategy directly to day-to-day work. It provides a clear framework for setting, tracking, and achieving organizational goals using the OKR (Objectives and Key Results) methodology.

## What is the Goals & Objectives Module?

This module helps organizations:

- **Define Strategic Direction**: Set company-wide goals that align with your mission and vision
- **Break Down Strategy**: Convert high-level goals into actionable objectives
- **Measure Progress**: Track key results and metrics that indicate success
- **Connect Work to Strategy**: Link projects and tasks directly to objectives

## Key Concepts

### 1. Strategic Goals
High-level organizational goals that define what the company wants to achieve over a fiscal year. These are broad, aspirational statements that guide the entire organization.

**Example**: "Expand Market Presence in Southeast Asia"

### 2. Objectives
Specific, measurable targets that contribute to achieving a strategic goal. Objectives are typically set for a quarter and have clear owners and deadlines.

**Example**: "Launch MVP Marketplace Platform by Q2"

### 3. Key Results
Quantifiable metrics that measure progress toward an objective. Key Results answer the question: "How do we know we've achieved this objective?"

**Example**: "Acquire 500 new marketplace vendors" or "Achieve 85% customer satisfaction score"

### 4. Fiscal Years & Quarters
Time-based organization that helps structure goal-setting and tracking cycles.

## Module Navigation

Access the Goals & Objectives module from the main sidebar:

- **Dashboard**: Overview of all goals, objectives, and progress metrics
- **Strategic Goals**: Create and manage high-level company goals
- **Objectives**: Define specific targets with key results
- **Fiscal Years**: Configure fiscal year periods and quarters

## Benefits

1. **Alignment**: Ensures all teams work toward common objectives
2. **Transparency**: Everyone can see how their work contributes to company goals
3. **Accountability**: Clear ownership and deadlines for each objective
4. **Focus**: Prioritizes work that drives strategic outcomes
5. **Measurement**: Track progress with quantifiable key results
"""
    },
    {
        "section": "how_it_works",
        "title": "How Goals & Objectives Works",
        "order": 1,
        "content": """# How the Goals & Objectives Module Works

This guide explains the workflow and hierarchy of the Goals & Objectives system.

## The Strategy Execution Hierarchy

The module follows a top-down hierarchy:

```
Company Vision
      ↓
Strategic Goals (Annual)
      ↓
Objectives (Quarterly)
      ↓
Key Results (Metrics)
      ↓
Projects (Linked Work)
      ↓
Tasks (Day-to-day execution)
```

## Step-by-Step Workflow

### Step 1: Set Up Fiscal Year

Before creating goals, configure your fiscal year:

1. Navigate to **Goals & Objectives** → **Fiscal Years**
2. Click **Create Fiscal Year**
3. Enter the fiscal year name (e.g., "FY 2025-26")
4. Set start and end dates
5. The system automatically generates 4 quarters (Q1, Q2, Q3, Q4)

### Step 2: Create Strategic Goals

Define your company's annual strategic priorities:

1. Go to **Strategic Goals** page
2. Click **New Goal**
3. Fill in:
   - **Title**: Clear, concise goal statement
   - **Description**: Detailed explanation (supports rich text)
   - **Fiscal Year**: Select the relevant FY
   - **Owner**: Person responsible for this goal
   - **Priority**: High, Medium, or Low
4. Click **Save**

### Step 3: Create Objectives

Break down strategic goals into quarterly objectives:

1. Navigate to **Objectives** page
2. Click **New Objective**
3. Fill in:
   - **Title**: Specific, actionable objective
   - **Description**: Context and details
   - **Strategic Goal**: Link to parent goal
   - **Fiscal Year**: Select FY
   - **Quarter(s)**: Select one or multiple quarters
   - **Department**: Responsible department
   - **Owner**: Person accountable
   - **Target Date**: Deadline
4. Click **Create**

### Step 4: Add Key Results

Define measurable outcomes for each objective:

1. Open an objective's detail page
2. Go to **Key Results** tab
3. Click **Add Key Result**
4. Enter:
   - **Title**: What you're measuring
   - **Target Value**: Goal number
   - **Current Value**: Starting point
   - **Unit Type**: (Number, Percentage, Currency)
5. Key Results automatically calculate progress percentage

### Step 5: Link Projects

Connect projects to objectives to track execution:

1. When creating/editing a project, use the **Link to Objective** dropdown
2. Select the relevant objective
3. Project progress automatically rolls up to the objective

## Progress Calculation

The system automatically calculates progress at each level:

- **Key Results**: `(Current Value / Target Value) × 100`
- **Objectives**: Average of all linked Key Results + linked Project progress
- **Strategic Goals**: Average of all linked Objectives

## Status Workflow

### Objective Statuses:
- **Planning**: Initial setup phase
- **Active**: Currently being worked on
- **On Track**: Progress is as expected
- **At Risk**: May not meet deadline
- **Completed**: Successfully achieved
- **Archived**: No longer active

## Notifications

The system sends automatic notifications for:
- Objectives due within 7 days
- Objectives due within 3 days
- Overdue objectives (daily reminders)

Notifications go to the objective owner and can be viewed in the notification bell.
"""
    },
    {
        "section": "features",
        "title": "Goals & Objectives - Key Features",
        "order": 2,
        "content": """# Key Features of Goals & Objectives Module

## 1. Strategic Goal Management

### Creating Goals
- Rich text editor for detailed descriptions
- Priority levels (High, Medium, Low)
- Fiscal year association
- Owner assignment with user lookup
- Progress tracking

### Goal Dashboard
- Visual cards showing all strategic goals
- Filter by fiscal year, status, or owner
- Quick status badges
- Progress indicators

## 2. Objective Management

### Multi-Quarter Support
Objectives can span multiple quarters, perfect for larger initiatives:
- Select multiple quarters when creating
- System tracks quarters as tags
- Filter objectives by quarter

### Rich Text Descriptions
Full formatting support including:
- Headers (H1, H2, H3)
- Bold, Italic, Underline
- Bullet and numbered lists
- Code blocks
- Tables
- Links and images

### Dynamic Department Selection
Department dropdown automatically populates from your Organization Management module, ensuring consistency across the platform.

## 3. Key Results Tracking

### Progress Visualization
- Automatic percentage calculation
- Progress bars with color coding
- Target vs. Current value display

### Multiple Unit Types
- **Number**: Count-based metrics (users, sales)
- **Percentage**: Completion rates, satisfaction scores
- **Currency**: Revenue, budget metrics

### Key Result Examples
| Metric | Target | Current | Progress |
|--------|--------|---------|----------|
| New Customers | 500 | 325 | 65% |
| Revenue ($) | 1,000,000 | 750,000 | 75% |
| Satisfaction % | 90% | 87% | 97% |

## 4. Project Integration

### Linking Projects
- Projects can be linked to objectives
- Dropdown shows active objectives with context
- Visual indicator on project cards

### Automatic Progress Roll-up
When tasks in a linked project are completed:
1. Task status changes
2. Project progress recalculates
3. Objective progress updates automatically

This creates a seamless connection between daily work and strategic goals.

## 5. Objective Detail Page

Comprehensive view including:

### Overview Tab
- Full objective details
- Status and priority badges
- Owner and sponsor information
- Target date and progress

### Key Results Tab
- List of all key results
- Add/Edit/Delete key results
- Progress bars for each metric

### Linked Projects Tab
- All projects contributing to this objective
- Project status and progress
- Quick navigation to project details

### Updates Tab
- Activity log
- Comments and notes
- Historical changes

## 6. Deadline Notifications

### Automatic Alerts
The system monitors objective target dates and sends notifications:

| Timeline | Priority | Frequency |
|----------|----------|-----------|
| 7 days before | Medium | Once |
| 3 days before | High | Once |
| Overdue | Urgent | Daily |

### Notification Content
- Objective title and deadline
- Current progress percentage
- Direct link to objective page

## 7. Fiscal Year & Quarter Management

### Automatic Quarter Generation
When creating a fiscal year:
- 4 quarters auto-generated
- Dates calculated automatically
- Quarters named Q1, Q2, Q3, Q4

### Status Tracking
- Active fiscal year highlighted
- Historical years archived
- Easy year-over-year comparison

## 8. Filtering & Search

### Filter Options
- By Fiscal Year
- By Quarter
- By Strategic Goal
- By Department
- By Owner
- By Status
- By Priority

### Search
- Full-text search across objectives
- Search by title or description
- Tag-based filtering
"""
    },
    {
        "section": "troubleshooting",
        "title": "Goals & Objectives - Troubleshooting",
        "order": 3,
        "content": """# Troubleshooting Goals & Objectives

## Common Issues and Solutions

### Issue: Cannot Create Objective

**Problem**: "Please select strategic goal, fiscal year, and at least one quarter" error appears.

**Solution**:
1. Ensure you have created at least one Strategic Goal
2. Verify a Fiscal Year exists with active quarters
3. Select all required fields before saving

### Issue: Department Dropdown is Empty

**Problem**: No departments appear in the dropdown.

**Solution**:
1. Check if departments are configured in Organization Management
2. Contact your administrator to add departments
3. The system falls back to common department names if none exist

### Issue: Objective Progress Not Updating

**Problem**: Progress percentage stays at 0% even after adding key results.

**Solution**:
1. Ensure Key Results have both target and current values
2. Verify linked projects have tasks with updated statuses
3. Progress recalculates when:
   - Key Results are updated
   - Linked project tasks change status

### Issue: Quarter Selection Not Working

**Problem**: Cannot select quarters for an objective.

**Solution**:
1. First select a Fiscal Year
2. Wait for quarters to load
3. Then select one or more quarters
4. If quarters don't appear, verify the Fiscal Year has generated quarters

### Issue: Key Results Progress Shows Wrong Percentage

**Problem**: Progress percentage doesn't match expected calculation.

**Solution**:
The formula is: `(Current Value / Target Value) × 100`

If current > target, progress caps at 100%. Verify:
- Target value is set correctly
- Current value is accurate
- Unit type is appropriate for the metric

### Issue: Linked Projects Not Showing

**Problem**: Objective's "Linked Projects" tab is empty despite linking projects.

**Solution**:
1. Verify the project has the objective selected in "Link to Objective"
2. Save the project after linking
3. Refresh the objective detail page
4. Check that the project is not archived/deleted

### Issue: Cannot Delete Objective

**Problem**: Delete button doesn't work or shows error.

**Solution**:
- Ensure no Key Results are attached (delete them first)
- Verify no projects are linked (unlink them first)
- You must have admin or owner permissions

### Issue: Rich Text Not Saving

**Problem**: Formatting in description is lost after saving.

**Solution**:
1. Use the toolbar for formatting (not markdown syntax)
2. Wait for autosave indicator before closing
3. If issue persists, try a different browser
4. Clear browser cache and retry

### Issue: Notifications Not Received

**Problem**: Not receiving deadline notifications.

**Solution**:
1. Verify you are the objective owner
2. Check notification settings in your profile
3. Notifications run at 9 AM UTC daily
4. Check the notification bell in the header

## Best Practices

### Goal Setting
- Keep strategic goals broad and inspirational
- Limit to 3-5 strategic goals per year
- Review and adjust quarterly

### Objective Creation
- Use SMART criteria (Specific, Measurable, Achievable, Relevant, Time-bound)
- Assign clear ownership
- Set realistic target dates

### Key Results
- Aim for 3-5 key results per objective
- Make metrics objective and quantifiable
- Update current values regularly

### Progress Tracking
- Review progress weekly
- Update key results bi-weekly at minimum
- Address "at risk" objectives immediately

## Getting Help

If you continue to experience issues:
1. Check this Help Center for more articles
2. Submit a support ticket via Help & Support
3. Contact your system administrator
"""
    },
    {
        "section": "definitions",
        "title": "Goals & Objectives - Definitions & Glossary",
        "order": 4,
        "content": """# Goals & Objectives Definitions & Glossary

This article provides clear definitions of all terms used in the Goals & Objectives module.

## Core Concepts

### Strategic Goal
A high-level, organizational objective that defines what the company aims to achieve over a fiscal year. Strategic goals are:
- **Aspirational**: Represent significant achievements
- **Directional**: Guide all company efforts
- **Annual**: Typically span a full fiscal year
- **Broad**: Cover major business areas

**Example Strategic Goals:**
- "Become the #1 marketplace platform in our category"
- "Achieve operational excellence across all departments"
- "Expand international presence to 10 new markets"

### Objective
A specific, measurable target that contributes to achieving a strategic goal. Objectives are:
- **Specific**: Clearly defined outcomes
- **Measurable**: Quantifiable success criteria
- **Achievable**: Realistic given resources
- **Relevant**: Aligned with strategic goals
- **Time-bound**: Have clear deadlines

**Example Objectives:**
- "Launch MVP marketplace by end of Q2"
- "Reduce customer support response time to under 2 hours"
- "Increase monthly active users by 50%"

### Key Result
A quantifiable metric that measures progress toward an objective. Key Results:
- Define what success looks like in numbers
- Are objectively verifiable
- Create accountability for outcomes

**Example Key Results:**
| Objective | Key Result |
|-----------|------------|
| Launch MVP Marketplace | 500 vendors onboarded |
| Improve Customer Experience | NPS score of 60+ |
| Increase Revenue | $2M quarterly revenue |

### Fiscal Year
A one-year accounting period used for financial reporting and goal planning. In Sevora:
- Can start any month (typically April or January)
- Automatically generates 4 quarters
- Provides time-based structure for goals

### Quarter
A three-month period within a fiscal year:
- **Q1**: First 3 months of fiscal year
- **Q2**: Months 4-6
- **Q3**: Months 7-9
- **Q4**: Final 3 months

Objectives are typically set per quarter or span multiple quarters.

## Status Definitions

### Objective Statuses

| Status | Meaning | When to Use |
|--------|---------|-------------|
| **Planning** | Initial setup phase | When first created, gathering details |
| **Active** | Work in progress | Team is actively working on it |
| **On Track** | Meeting expectations | Progress matches or exceeds plan |
| **At Risk** | May miss deadline | Progress behind schedule |
| **Completed** | Successfully achieved | All key results met |
| **Archived** | No longer active | Cancelled or historical |

### Goal Statuses

| Status | Meaning |
|--------|---------|
| **Draft** | Still being defined |
| **Active** | Current focus area |
| **Completed** | Achieved all objectives |
| **Archived** | Previous year or cancelled |

## Priority Levels

| Priority | Meaning | Typical Use |
|----------|---------|-------------|
| **Urgent** | Immediate attention required | Critical business needs |
| **High** | Important, significant impact | Key strategic initiatives |
| **Medium** | Standard priority | Regular business objectives |
| **Low** | Nice to have | Stretch goals, improvements |

## Metrics & Measurements

### Progress Percentage
Calculated automatically:
- **Key Results**: (Current Value ÷ Target Value) × 100
- **Objectives**: Average of all key results + linked projects
- **Goals**: Average of all linked objectives

### Unit Types for Key Results

| Type | Description | Example |
|------|-------------|---------|
| **Number** | Count of items | 500 customers |
| **Percentage** | Rate or ratio | 85% satisfaction |
| **Currency** | Monetary value | $1,000,000 revenue |

## Organizational Terms

### Owner
The person primarily responsible for achieving an objective or goal. The owner:
- Receives deadline notifications
- Is accountable for progress
- Can update status and key results

### Sponsor
An executive or senior leader who champions the objective:
- Provides resources and support
- Removes blockers
- Not responsible for day-to-day execution

### Department
The organizational unit responsible for the objective. Examples:
- Engineering
- Marketing
- Sales
- Operations
- Product

## Related Concepts

### OKR (Objectives and Key Results)
A goal-setting framework used by the module:
- **O** = What you want to achieve (Objective)
- **KR** = How you measure success (Key Results)

### Roll-up
The automatic aggregation of progress:
- Task completion → Project progress
- Project progress → Objective progress
- Objective progress → Goal progress

### Linked Project
A project associated with an objective:
- Work contributes to objective completion
- Progress automatically rolls up
- Creates traceability from tasks to strategy
"""
    },
    {
        "section": "best_practices",
        "title": "Goals & Objectives - Best Practices Guide",
        "order": 5,
        "content": """# Best Practices for Goals & Objectives

Follow these proven strategies to get the most from the Goals & Objectives module.

## Strategic Goal Best Practices

### 1. Limit the Number of Goals
- **Recommended**: 3-5 strategic goals per year
- **Why**: Focus drives results; too many goals dilutes effort
- **Tip**: If you have more than 5, prioritize ruthlessly

### 2. Make Goals Inspiring
Good strategic goals should:
- Motivate the entire organization
- Be memorable and easy to communicate
- Connect to company mission and values

**Example Transformation:**
- Weak: "Increase revenue"
- Strong: "Become the trusted partner for 10,000 businesses"

### 3. Ensure Measurability
Even broad goals need measurable outcomes:
- Define what success looks like
- Include target metrics or milestones
- Review quarterly with stakeholders

## Objective Best Practices

### 1. Use the SMART Framework

| Criteria | Question | Example |
|----------|----------|---------|
| **S**pecific | What exactly will be accomplished? | Launch mobile app |
| **M**easurable | How will we know it's done? | 10,000 downloads |
| **A**chievable | Is this realistic? | Based on current resources |
| **R**elevant | Does it support our goals? | Supports "Digital Transformation" goal |
| **T**ime-bound | When is the deadline? | By end of Q2 |

### 2. Quarterly Planning Cycle

**Beginning of Quarter:**
- Review strategic goals
- Create/update objectives for the quarter
- Define key results with targets
- Assign owners and link projects

**During Quarter:**
- Update key result values weekly
- Review progress in team meetings
- Identify and address blockers

**End of Quarter:**
- Score objective completion
- Document lessons learned
- Set up next quarter's objectives

### 3. Assign Clear Ownership
Every objective should have:
- **One owner** (not a team or committee)
- **Authority** to make decisions
- **Accountability** for outcomes

### 4. Span Multiple Quarters Strategically
Use multi-quarter objectives for:
- Large initiatives with phases
- Continuous improvement goals
- Long-term capability building

## Key Results Best Practices

### 1. The 3-5 Rule
- **Minimum**: 3 key results per objective
- **Maximum**: 5 key results per objective
- **Why**: Enough to measure, not overwhelming

### 2. Mix Leading and Lagging Indicators

| Type | Definition | Example |
|------|------------|---------|
| **Leading** | Predictive, controllable | Weekly demos scheduled |
| **Lagging** | Results-based, outcomes | Revenue generated |

**Balanced Set:**
- 2 leading indicators (activities)
- 2 lagging indicators (outcomes)

### 3. Set Stretch Targets
- **Baseline**: What we'll achieve with normal effort (70% confidence)
- **Target**: Ambitious but achievable (50% confidence)
- **Stretch**: Exceptional performance (30% confidence)

**Tip**: Set targets where 70% achievement = success

### 4. Update Regularly
- Update current values at least weekly
- Don't wait until quarter end
- Celebrate progress milestones

## Progress Tracking Best Practices

### 1. Weekly Check-ins
Hold brief (15-30 min) weekly reviews:
- Current progress vs. target
- Blockers and support needed
- Next week's priorities

### 2. Visual Management
Use the dashboard to:
- Identify at-risk objectives early
- Celebrate completed objectives
- Share progress organization-wide

### 3. Link Everything
- Link projects to objectives
- Link objectives to goals
- Create complete traceability

## Common Anti-Patterns to Avoid

### 1. Setting and Forgetting
**Problem**: Creating objectives but never updating them
**Solution**: Schedule weekly update time

### 2. Too Many Objectives
**Problem**: Team overwhelmed, nothing gets done well
**Solution**: Prioritize ruthlessly, limit to 3-5 per team per quarter

### 3. Vanity Metrics
**Problem**: Key results that look good but don't matter
**Solution**: Ask "If we hit this, does it actually help?"

### 4. No Owner Accountability
**Problem**: "Everyone" owns it (meaning no one does)
**Solution**: Single owner with clear authority

### 5. Sandbagging Targets
**Problem**: Setting easy targets to guarantee success
**Solution**: Aim for 70% completion = success

## Team Alignment

### Cascade Goals Effectively
```
Company Goal
    ↓ breaks into
Department Objectives
    ↓ breaks into
Team Key Results
    ↓ executed via
Individual Projects/Tasks
```

### Cross-Functional Collaboration
When objectives span teams:
1. Identify all stakeholders early
2. Clarify roles and handoffs
3. Create shared key results
4. Hold joint review sessions

## Continuous Improvement

### Quarterly Retrospective Questions
1. Which objectives did we complete?
2. Where did we fall short and why?
3. What would we do differently?
4. What capabilities do we need to build?

### Annual Review
- Overall goal completion rate
- Patterns in missed objectives
- Process improvements needed
- Resource allocation changes
"""
    }
]

GOALS_OBJECTIVES_FAQS = [
    {
        "question": "What is the difference between a Goal and an Objective?",
        "answer": """**Strategic Goals** are high-level, annual aspirations that define what the company wants to achieve. They are broad and inspirational.

**Objectives** are specific, measurable targets that contribute to achieving a goal. They typically span 1-3 quarters and have clear deadlines.

**Example:**
- **Goal**: "Become the leading marketplace platform"
- **Objective**: "Launch MVP marketplace with 500 vendors by Q2"

Think of goals as the destination and objectives as the milestones along the way.""",
        "order": 0
    },
    {
        "question": "What are Key Results and how do I use them?",
        "answer": """**Key Results** are quantifiable metrics that measure whether you've achieved an objective. They answer: "How do we know we succeeded?"

**How to create good Key Results:**
1. Make them measurable with specific numbers
2. Set realistic but ambitious targets
3. Include 3-5 key results per objective
4. Mix outcome metrics (results) with activity metrics (leading indicators)

**Example Key Results for "Launch MVP Marketplace":**
- 500 vendors onboarded (outcome)
- 50 demos conducted per week (activity)
- 90% vendor satisfaction score (quality)
- $100K in transaction volume (financial)""",
        "order": 1
    },
    {
        "question": "How does progress get calculated?",
        "answer": """Progress is calculated automatically at each level:

**Key Results**: (Current Value ÷ Target Value) × 100
- If current = 250 and target = 500, progress = 50%

**Objectives**: Average of:
- All Key Results progress
- All linked Project progress

**Strategic Goals**: Average of all linked Objectives

Progress updates automatically when you:
- Update Key Result values
- Complete tasks in linked projects
- Change project progress""",
        "order": 2
    },
    {
        "question": "Can I select multiple quarters for an objective?",
        "answer": """Yes! Objectives can span multiple quarters for larger initiatives.

**To select multiple quarters:**
1. Open the objective create/edit form
2. First select a Fiscal Year
3. In the Quarters field, click to add quarters
4. Selected quarters appear as badges
5. Click the X on a badge to remove it

**When to use multi-quarter objectives:**
- Large product launches
- Long-term capability building
- Continuous improvement initiatives
- Annual recurring goals""",
        "order": 3
    },
    {
        "question": "How do I link a project to an objective?",
        "answer": """Linking projects creates automatic progress tracking from day-to-day work to strategic objectives.

**To link a project:**
1. Go to Project Management → Projects
2. Create or edit a project
3. Find "Link to Objective" dropdown
4. Select the relevant objective
5. Save the project

**What happens when linked:**
- Project appears in Objective's "Linked Projects" tab
- Project progress contributes to Objective progress
- Project card shows linked objective badge""",
        "order": 4
    },
    {
        "question": "How do I set up a fiscal year?",
        "answer": """Fiscal years provide the time structure for goal planning.

**To create a fiscal year:**
1. Navigate to Goals & Objectives → Fiscal Years
2. Click "Create Fiscal Year"
3. Enter a name (e.g., "FY 2025-26")
4. Set start and end dates
5. Save - quarters are generated automatically

**Tips:**
- Only one fiscal year should be "Active"
- Previous years can be archived
- Quarters (Q1-Q4) are auto-generated based on dates""",
        "order": 5
    },
    {
        "question": "Why am I not receiving deadline notifications?",
        "answer": """Deadline notifications are sent to objective owners automatically. Check the following:

**Verify you're the owner:**
- Open the objective
- Check the "Owner" field matches your account

**Check notification settings:**
- Click the bell icon in the header
- Verify notifications are enabled in settings

**Understand the schedule:**
- Notifications run daily at 9 AM UTC
- 7 days before: Medium priority
- 3 days before: High priority  
- Overdue: Urgent priority (daily)

**Note:** Completed or archived objectives don't send notifications.""",
        "order": 6
    },
    {
        "question": "How many objectives should we have?",
        "answer": """**Recommended limits:**
- **Per Team**: 3-5 objectives per quarter
- **Per Person**: 1-3 objectives as owner
- **Organization**: 10-15 active objectives total

**Why limit objectives:**
- Focus drives better results
- Too many = nothing gets done well
- Quality over quantity

**If you have too many:**
1. Prioritize by strategic impact
2. Defer less critical items
3. Combine related objectives
4. Archive completed items""",
        "order": 7
    },
    {
        "question": "What does 'At Risk' status mean?",
        "answer": """**At Risk** indicates an objective may not meet its deadline.

**When to use At Risk:**
- Progress is significantly behind schedule
- Blockers exist that threaten completion
- Resources are insufficient
- Dependencies are delayed

**What to do when At Risk:**
1. Identify the specific blocker
2. Escalate to sponsor if needed
3. Adjust scope or timeline
4. Add resources if possible
5. Document the risk in updates

**Tip:** Mark objectives At Risk early - it's better to raise concerns than miss quietly.""",
        "order": 8
    },
    {
        "question": "Can I delete an objective or goal?",
        "answer": """Yes, but with some prerequisites:

**To delete an Objective:**
1. Remove all Key Results first
2. Unlink all Projects
3. Then delete the objective

**To delete a Strategic Goal:**
1. Archive or delete all linked Objectives
2. Then delete the goal

**Alternative to deletion:**
- Use "Archive" status to preserve history
- Archived items don't appear in active views
- Can be restored if needed later

**Note:** Only admins and owners can delete objectives/goals.""",
        "order": 9
    }
]


# ============== PROJECT MANAGEMENT MODULE CONTENT ==============

PROJECT_MANAGEMENT_ARTICLES = [
    {
        "section": "overview",
        "title": "Project Management - Overview",
        "order": 0,
        "content": """# Project Management Module Overview

The **Project Management** module is the central hub for planning, executing, and tracking all your projects and tasks. It provides a comprehensive toolkit for managing work from inception to completion.

## What is Project Management in Sevora?

This module enables teams to:

- **Plan Projects**: Define scope, timelines, and deliverables
- **Manage Tasks**: Create, assign, and track individual work items
- **Collaborate**: Work together with team members in real-time
- **Track Progress**: Monitor completion status and identify blockers
- **Report**: Generate insights on project health and team productivity

## Module Components

### 1. Projects
Container for related work items with:
- Name, description, and ownership
- Start and end dates
- Team members and roles
- Status and priority tracking
- Progress visualization

### 2. Tasks
Individual work items within projects:
- Assignees and due dates
- Checklists and subtasks
- Time tracking
- Comments and attachments
- Status workflow

### 3. My Tasks
Personal task dashboard showing:
- All tasks assigned to you
- Overdue and upcoming items
- Tasks by status
- Quick status updates

## Key Features

### Multiple Views
- **Card View**: Visual grid of project cards
- **List View**: Table format with sortable columns
- **Task Board**: Kanban-style task management

### Project Types
- **Standard Projects**: Regular project workflows
- **Personal Projects**: Individual task collections
- **Linked Projects**: Connected to strategic objectives

### Team Collaboration
- Add/remove team members
- Assign tasks to members
- Comments and updates
- File attachments

## Navigation

Access Project Management from:
- **Sidebar** → Project Management
- **Projects**: View and manage all projects
- **My Tasks**: Your personal task dashboard

## Integration with Goals & Objectives

Projects can be linked to Objectives from the Goals & Objectives module:
- Progress automatically rolls up to objectives
- Creates traceability from daily work to strategy
- Visual indicators show linked objectives
"""
    },
    {
        "section": "how_it_works",
        "title": "How Project Management Works",
        "order": 1,
        "content": """# How the Project Management Module Works

This guide walks you through the complete project lifecycle in Sevora.

## Project Lifecycle

```
Project Creation → Planning → Execution → Monitoring → Completion
```

## Step-by-Step Workflow

### Step 1: Create a Project

1. Navigate to **Projects** page
2. Click **New Project** button
3. Fill in the **Details** tab:
   - **Project Name**: Clear, descriptive title
   - **Description**: Rich text with formatting
   - **Department**: Select from organization structure
   - **Priority**: Urgent, High, Medium, or Low
   - **Status**: Draft, Active, On Hold
   - **Visibility**: Public or Private
   - **Project Manager**: Assign PM
   - **Dates**: Start and End dates
   - **Link to Objective**: (Optional) Connect to Goals & Objectives

4. Switch to **Team** tab:
   - Select team members from dropdown
   - Add as many members as needed
   - Members can be added/removed later

5. Click **Create Project**

### Step 2: Add Tasks

Once the project is created:

1. Open the project detail page
2. Navigate to **Tasks** tab
3. Click **Add Task**
4. Fill in task details:
   - **Name**: Clear task description
   - **Assignee**: Who will do this work
   - **Due Date**: When it needs to be done
   - **Priority**: Task priority level
   - **Description**: Additional details

### Step 3: Manage Task Details

Each task can have:

**Checklists**
- Add checklist items for subtasks
- Check off as completed
- Progress shows as X/Y completed

**Subtasks**
- Create nested tasks
- Track independently
- Roll up to parent task

**Time Tracking**
- Log time spent
- Add notes with time entries
- Track against estimates

**Comments**
- Add updates and notes
- Tag team members
- Attach files

### Step 4: Update Task Status

Tasks follow a workflow:

```
To Do → In Progress → Pending Review → Completed/Approved
```

**Status Options:**
| Status | Meaning |
|--------|---------|
| To Do | Not started |
| In Progress | Being worked on |
| Pending Review | Awaiting approval |
| Blocked | Cannot proceed |
| Completed | Done |
| Approved | Verified complete |

### Step 5: Monitor Progress

**Project Progress** auto-calculates based on:
- Completed tasks / Total tasks
- Weighted by task priority

**Dashboard Views:**
- Project cards show progress bars
- List view shows progress column
- My Tasks groups by status

### Step 6: Complete the Project

1. Verify all tasks are completed
2. Update project status to **Completed**
3. Document final notes
4. Archive if needed

## My Tasks Workflow

Access your personal task dashboard:

1. Click **My Tasks** in sidebar or header
2. View tasks grouped by:
   - **Overdue**: Past due date
   - **Pending Review**: Awaiting approval
   - **In Progress**: Currently working
   - **All Assigned**: Everything assigned to you

3. Quick actions:
   - Update status via dropdown
   - Click task to view details
   - Collapse/expand sections

## Views Explained

### Grid View (Default)
- Visual cards for each project
- Quick overview of status
- Progress bars
- Click to open project

### List View
Toggle to table format showing:
- Project name and ID
- Status badge
- Priority flag
- Progress bar
- Task count
- Due date
- Actions menu

**To switch views:**
1. Look for Grid/List toggle buttons
2. Click List icon for table view
3. Click Grid icon for card view

## Filtering

Filter projects and tasks by:
- **Search**: Text in name/description
- **Status**: Draft, Active, Completed, etc.
- **Priority**: Urgent, High, Medium, Low
- **Module**: Linked system module

## Linking to Objectives

Create strategic alignment:

1. Open project create/edit modal
2. Find "Link to Objective" dropdown
3. Select an active objective
4. Save the project

**Benefits of linking:**
- Progress rolls up to objectives
- Visual badge on project card
- Appears in objective's linked projects
- Creates work-to-strategy traceability
"""
    },
    {
        "section": "features",
        "title": "Project Management - Key Features",
        "order": 2,
        "content": """# Key Features of Project Management

## 1. Project Creation & Configuration

### Tabbed Modal Interface
The Create/Edit project modal includes:
- **Details Tab**: All project information
- **Team Tab**: Member management
- **Attachments Tab**: File uploads (Edit only)

### Rich Text Descriptions
Full formatting support:
- Headers, bold, italic, underline
- Bullet and numbered lists
- Code blocks and quotes
- Links and images
- Tables

### Project Settings
- **Visibility**: Public (all users) or Private (team only)
- **Status**: Draft, Active, On Hold, Completed, Cancelled
- **Priority**: Urgent, High, Medium, Low
- **Dates**: Start and end date tracking

## 2. View Options

### Grid View
Visual card-based layout:
- Project icon and name
- Project ID badge
- Status and priority badges
- Linked objective indicator
- Progress bar
- Task count and team size
- Quick action menu

### List View
Table format with columns:
| Column | Description |
|--------|-------------|
| Project | Name + ID + objective link |
| Status | Current status badge |
| Priority | Priority flag |
| Progress | Visual progress bar |
| Tasks | Completed/Total count |
| Due Date | End date |
| Actions | Edit, Delete, View |

**Toggle between views** using the Grid/List buttons in the filter bar.

## 3. Task Management

### Task Properties
- **Name**: Task title
- **Description**: Rich text details
- **Assignee**: Single user assignment
- **Due Date**: Deadline
- **Priority**: Task-level priority
- **Status**: Workflow status

### Checklists
Add subtasks as checklist items:
1. Open task details
2. Go to Checklist section
3. Add items
4. Check off as completed
5. Progress shows as fraction (e.g., 3/5)

### Subtasks
Create hierarchical task structures:
- Parent-child relationships
- Independent tracking
- Nested views

### Time Tracking
Log work hours:
- Add time entries
- Include notes
- Track against estimates
- View time summaries

### Comments
Collaborate on tasks:
- Add comments with rich text
- Attach files
- Mention team members
- View activity history

## 4. My Tasks Dashboard

### Enhanced UI Design
Modern task cards featuring:
- **Status Indicator**: Color-coded icon showing task state
- **Priority Badge**: Flag with priority level
- **Project Badge**: Shows parent project name
- **Due Date Pill**: Highlights overdue items in red
- **Hover Effects**: Subtle animations for interactivity

### Task Sections
Collapsible sections for:
- **Overdue**: Past deadline, red highlight
- **Pending Review**: Awaiting approval
- **In Progress**: Currently working
- **All Assigned Tasks**: Complete list

### Quick Status Update
Change status without opening task:
1. Click status dropdown on card
2. Select new status
3. Automatically saves

## 5. Team Management

### Adding Team Members
1. Open project modal
2. Go to Team tab
3. Select user from dropdown
4. Click Add button
5. Member appears in list

### Member Cards
Shows for each member:
- Avatar with initials
- Name and email
- Remove button

### Permissions
Team members can:
- View project details
- Be assigned tasks
- Add comments
- Update their tasks

## 6. File Attachments

### Upload Files
1. Open project edit modal
2. Go to Attachments tab
3. Click upload area or drag files
4. Files upload and display

### Attachment Features
- Multiple file types supported
- Preview available files
- Download option
- Delete attachments

## 7. Progress Tracking

### Automatic Calculation
Progress = (Completed Tasks ÷ Total Tasks) × 100

### Visual Indicators
- Progress bars on cards and rows
- Percentage display
- Color coding (green = good, red = behind)

### Status Workflow
Progress updates when tasks move through statuses:
```
To Do (0%) → In Progress → Pending Review → Completed (100%)
```

## 8. Filtering & Search

### Available Filters
| Filter | Options |
|--------|---------|
| Search | Free text search |
| Status | Draft, Active, On Hold, Completed, Cancelled |
| Priority | Urgent, High, Medium, Low |
| Module | System modules |

### Search Capabilities
- Searches project name
- Searches description
- Real-time filtering

## 9. Strategic Alignment

### Objective Linking
Connect projects to company objectives:
- Dropdown shows active objectives
- Includes quarter and fiscal year context
- Project progress rolls up to objective

### Visual Indicators
Linked projects show:
- Objective name badge on card
- Target icon indicator
- Link visible in list view

## 10. Notifications

### Project Notifications
- Task assignments
- Due date reminders
- Status changes
- Comment mentions

### My Tasks Indicators
- Overdue count in header
- Red highlighting for overdue
- Badge counts on sections
"""
    },
    {
        "section": "troubleshooting",
        "title": "Project Management - Troubleshooting",
        "order": 3,
        "content": """# Troubleshooting Project Management

## Common Issues and Solutions

### Issue: Cannot Create Project

**Problem**: Create Project button doesn't work or shows error.

**Solution**:
1. Ensure you have project creation permissions
2. Fill in required field: Project Name
3. Check for valid date format (if provided)
4. Clear browser cache and retry
5. Contact admin if issue persists

### Issue: Project Not Visible

**Problem**: A project exists but doesn't appear in the list.

**Solution**:
1. Check filters - reset all filters
2. Verify project is not archived
3. For private projects, confirm you're on the team
4. Use search to find by name
5. Check if project is in a different module

### Issue: Tasks Not Updating

**Problem**: Task status changes don't save.

**Solution**:
1. Wait for autosave indicator
2. Check network connection
3. Refresh the page
4. Try a different browser
5. Clear browser cache

### Issue: Team Members Can't Be Added

**Problem**: User dropdown is empty or user doesn't appear.

**Solution**:
1. Verify user account exists in system
2. User must have appropriate role
3. Check if user is already on team
4. Ensure project is saved first
5. Contact admin for user permissions

### Issue: Progress Shows 0%

**Problem**: Progress stays at 0% despite completed tasks.

**Solution**:
Progress requires:
1. Tasks to be created in the project
2. Tasks to have "Completed" or "Approved" status
3. Refresh the page to recalculate
4. Check if tasks are properly linked to project

### Issue: Cannot Delete Project

**Problem**: Delete option doesn't work.

**Solution**:
1. You must be project owner or admin
2. Consider archiving instead of deleting
3. Check for linked dependencies
4. Deleting removes all tasks permanently

### Issue: Attachments Won't Upload

**Problem**: File upload fails or hangs.

**Solution**:
1. Check file size (max 10MB recommended)
2. Try a different file format
3. Ensure stable internet connection
4. Clear browser cache
5. Try smaller files first

### Issue: List View Columns Missing

**Problem**: Some columns don't show in list view.

**Solution**:
1. Increase browser window width
2. Some columns hide on narrow screens
3. Try scrolling horizontally
4. Refresh the page

### Issue: Can't Link to Objective

**Problem**: Objective dropdown is empty.

**Solution**:
1. Create objectives first in Goals & Objectives module
2. Objectives must be in Active status
3. Check you have access to view objectives
4. Refresh to reload objective list

### Issue: My Tasks Not Loading

**Problem**: My Tasks page shows empty or loading.

**Solution**:
1. Ensure you're logged in
2. Check if you have any assigned tasks
3. Reset filters if applied
4. Clear browser cache
5. Check console for errors

## Performance Tips

### Large Project Lists
If page loads slowly:
1. Use filters to reduce results
2. Archive completed projects
3. Limit teams to necessary members
4. Clear browser history regularly

### Task Performance
For projects with many tasks:
1. Use status filters
2. Close completed tasks
3. Break large projects into phases
4. Archive old projects

## Best Practices

### Project Organization
- Use consistent naming conventions
- Set realistic due dates
- Update status regularly
- Archive completed projects

### Task Management
- Break work into small tasks
- Assign single owner per task
- Set due dates for everything
- Update status daily

### Team Collaboration
- Add only necessary team members
- Use comments for updates
- Attach relevant files
- Keep descriptions current

## Getting Help

If issues persist:
1. Check Help Center articles
2. Submit support ticket
3. Contact system administrator
4. Include screenshots with reports
"""
    },
    {
        "section": "best_practices",
        "title": "Project Management - Best Practices Guide",
        "order": 4,
        "content": """# Best Practices for Project Management

## Project Planning

### 1. Clear Project Definition

Before creating a project, define:
- **Objective**: What will this project accomplish?
- **Scope**: What's included and excluded?
- **Success Criteria**: How do we know it's done?
- **Timeline**: Realistic start and end dates

### 2. Naming Conventions

Use consistent, descriptive names:

**Good Examples:**
- "Q2 Marketing Campaign - Product Launch"
- "Website Redesign - Phase 2"
- "2025 Annual Report Preparation"

**Avoid:**
- "Project 1"
- "Stuff to do"
- "Misc tasks"

### 3. Link to Strategy

Always consider linking to objectives:
- Creates accountability
- Shows strategic alignment
- Enables progress roll-up
- Improves prioritization

## Task Creation

### 1. Task Granularity

Ideal task characteristics:
- **Duration**: 1-8 hours of work
- **Clarity**: Clear definition of "done"
- **Single Owner**: One person responsible
- **Actionable**: Starts with a verb

**Example Task Breakdown:**
```
Large: "Launch new website"
    ↓
Medium: "Design homepage"
    ↓
Small: "Create homepage wireframe"
       "Design header component"
       "Build responsive nav menu"
```

### 2. Due Date Setting

Set realistic due dates:
- Include buffer time
- Account for dependencies
- Consider team workload
- Align with project milestones

### 3. Priority Assignment

Use priorities consistently:

| Priority | Use When | Example |
|----------|----------|---------|
| **Urgent** | Blocking others, deadline today | Critical bug fix |
| **High** | Important this week | Sprint deliverable |
| **Medium** | Important this month | Regular feature |
| **Low** | Nice to have | Documentation |

## Team Management

### 1. Right-Size Teams

Team size guidelines:
- **Small projects**: 2-5 members
- **Medium projects**: 5-10 members
- **Large projects**: 10+ (consider breaking up)

### 2. Clear Roles

Define roles clearly:
- **Project Manager**: Overall coordination
- **Contributors**: Execute tasks
- **Reviewers**: Approve deliverables
- **Stakeholders**: Provide input

### 3. Communication

Establish norms:
- Use comments for task updates
- Tag people when needed
- Update status promptly
- Keep descriptions current

## Progress Tracking

### 1. Daily Updates

Team members should:
- Update task status when changed
- Log time if tracking
- Add comments on blockers
- Check due dates

### 2. Weekly Reviews

Project managers should:
- Review overall progress
- Identify at-risk tasks
- Adjust assignments
- Update stakeholders

### 3. Status Discipline

Update status accurately:

| Situation | Correct Status |
|-----------|---------------|
| Haven't started | To Do |
| Working on it | In Progress |
| Done, needs review | Pending Review |
| Can't proceed | Blocked |
| Verified complete | Approved |

## Using Views Effectively

### Grid View Best For:
- Quick status overview
- Visual progress check
- Project browsing
- Dashboard display

### List View Best For:
- Detailed comparison
- Sorting and filtering
- Bulk review
- Data export prep

## My Tasks Efficiency

### 1. Daily Routine

Start each day:
1. Check Overdue section first
2. Review Pending Review items
3. Plan In Progress work
4. Update statuses

### 2. Section Management

Use collapsible sections:
- Collapse completed areas
- Focus on active work
- Expand when reviewing

### 3. Quick Actions

Use status dropdowns:
- Update without opening task
- Faster workflow
- Keeps focus on list

## Avoiding Common Mistakes

### 1. Scope Creep
- Define scope clearly upfront
- Document change requests
- Reassess timeline when scope changes
- Communicate impact

### 2. Task Overload
- Don't assign too many tasks
- Consider capacity
- Spread work evenly
- Allow buffer time

### 3. Status Neglect
- Update status immediately
- Don't let tasks go stale
- Review weekly minimum
- Close completed items

### 4. Poor Communication
- Add context in descriptions
- Use comments for updates
- Tag relevant people
- Keep attachments current

## Project Closure

### 1. Completion Checklist
- [ ] All tasks completed or cancelled
- [ ] Final deliverables documented
- [ ] Lessons learned recorded
- [ ] Stakeholders informed
- [ ] Project status set to Completed

### 2. Archive Strategy
- Archive completed projects monthly
- Keep recent history accessible
- Document key outcomes
- Save important attachments
"""
    }
]

PROJECT_MANAGEMENT_FAQS = [
    {
        "question": "How do I create a new project?",
        "answer": """**To create a project:**

1. Go to **Projects** page
2. Click the **New Project** button (top right)
3. Fill in the **Details** tab:
   - Project Name (required)
   - Description
   - Department, Priority, Status
   - Project Manager
   - Start/End Dates
   - Link to Objective (optional)
4. Switch to **Team** tab to add members
5. Click **Create Project**

**Tip:** You can also link projects to objectives from the Goals & Objectives module for strategic alignment.""",
        "order": 0
    },
    {
        "question": "How do I switch between Grid and List view?",
        "answer": """**To change the view:**

1. Go to the Projects page
2. Look for the toggle buttons in the filter bar (next to Module filter)
3. Click the **Grid icon** for card view
4. Click the **List icon** for table view

**Grid View** shows visual cards with progress bars
**List View** shows a detailed table with all columns

The view preference is remembered for your next visit.""",
        "order": 1
    },
    {
        "question": "How do I add team members to a project?",
        "answer": """**To add team members:**

1. Open the project (Create or Edit)
2. Go to the **Team** tab
3. Click the dropdown to select a user
4. Click the **Add** button (person+ icon)
5. Repeat for additional members
6. Save the project

**To remove a member:**
Click the remove button (person- icon) next to their name

**Note:** Team members can view the project and be assigned tasks.""",
        "order": 2
    },
    {
        "question": "How do I change a task's status?",
        "answer": """**Method 1 - From My Tasks:**
1. Go to My Tasks
2. Find the task
3. Click the status dropdown on the card
4. Select new status

**Method 2 - From Task Detail:**
1. Open the task
2. Change status in the detail view
3. Save changes

**Available statuses:**
- To Do → In Progress → Pending Review → Completed/Approved
- Blocked (for tasks that can't proceed)

Status changes automatically update project progress.""",
        "order": 3
    },
    {
        "question": "Why is my project progress stuck at 0%?",
        "answer": """Project progress is calculated from task completion. Check:

1. **Tasks exist**: The project needs tasks to track progress
2. **Tasks are completed**: Status must be "Completed" or "Approved"
3. **Refresh the page**: Progress updates after page refresh

**Calculation:** Progress = (Completed Tasks ÷ Total Tasks) × 100

**Example:** 3 completed out of 10 tasks = 30% progress

**Note:** Draft tasks and tasks in "To Do" status count toward total but not completion.""",
        "order": 4
    },
    {
        "question": "How do I link a project to a strategic objective?",
        "answer": """**To link during creation:**
1. Open Create Project modal
2. Find "Link to Objective" dropdown
3. Select an objective
4. The dropdown shows: Objective title (Quarter - Fiscal Year)
5. Create the project

**To link an existing project:**
1. Edit the project
2. Go to Details tab
3. Select an objective from dropdown
4. Save

**Benefits of linking:**
- Progress automatically rolls up to objective
- Creates work-to-strategy alignment
- Project card shows objective badge
- Appears in Objective's Linked Projects tab""",
        "order": 5
    },
    {
        "question": "What's the difference between Grid and List view?",
        "answer": """**Grid View (Cards):**
- Visual, card-based layout
- Shows key info at a glance
- Progress bar on each card
- Good for quick overview
- Best for browsing projects

**List View (Table):**
- Detailed table format
- All projects in rows
- Sortable columns
- Shows: Project, Status, Priority, Progress, Tasks, Due Date
- Best for detailed analysis

**Choose Grid** when you want visual overview
**Choose List** when you need to compare details or sort data""",
        "order": 6
    },
    {
        "question": "How do I find my tasks quickly?",
        "answer": """**My Tasks Dashboard:**
1. Click **My Tasks** button on Projects page
2. Or navigate to /projects/my-tasks

**Dashboard features:**
- **Overdue**: Red section for past-due tasks
- **Pending Review**: Tasks awaiting approval
- **In Progress**: Currently working on
- **All Tasks**: Complete assigned list

**Quick tips:**
- Sections are collapsible (click header)
- Change status directly from card
- Click task to see details
- Use filters to narrow down""",
        "order": 7
    },
    {
        "question": "Can I add files to a project?",
        "answer": """**Yes! To add attachments:**

1. Open the project for editing
2. Go to the **Attachments** tab
3. Drag and drop files or click to browse
4. Wait for upload to complete
5. Save the project

**Supported features:**
- Multiple file uploads
- Preview attached files
- Download files
- Delete attachments

**Tips:**
- Keep files under 10MB for best performance
- Use descriptive file names
- Remove outdated attachments""",
        "order": 8
    },
    {
        "question": "How do I delete a project?",
        "answer": """**To delete a project:**

1. Go to Projects list
2. Find the project
3. Click the **three dots** menu (⋮)
4. Select **Delete**
5. Confirm deletion

**Important warnings:**
- Deleting removes ALL tasks in the project
- This action cannot be undone
- Only project owners/admins can delete

**Alternative - Archive:**
Instead of deleting, change status to "Cancelled" or "Completed" to preserve history while removing from active view.""",
        "order": 9
    },
    {
        "question": "What do the project status colors mean?",
        "answer": """**Status color coding:**

| Status | Color | Meaning |
|--------|-------|---------|
| **Draft** | Gray | Not yet started |
| **Active** | Green | Currently working |
| **On Hold** | Yellow | Temporarily paused |
| **Completed** | Blue | Successfully finished |
| **Cancelled** | Red | No longer proceeding |

**Priority colors:**
| Priority | Color |
|----------|-------|
| **Urgent** | Red |
| **High** | Orange |
| **Medium** | Yellow |
| **Low** | Gray |

Colors help quickly identify project state at a glance.""",
        "order": 10
    }
]


async def seed_help_content():
    """Main function to seed help content"""
    client = AsyncIOMotorClient(MONGO_URL)
    db = client[DB_NAME]
    
    now = datetime.now(timezone.utc).isoformat()
    
    print("🚀 Starting Help Center Content Seeding...")
    
    # ============== Create/Update Goals & Objectives Module ==============
    print("\n📌 Setting up Goals & Objectives module...")
    
    goals_module = await db.help_modules.find_one({"module_key": "goals_objectives"})
    if not goals_module:
        await db.help_modules.insert_one({
            "id": str(uuid.uuid4()),
            "module_key": "goals_objectives",
            "module_name": "Goals & Objectives",
            "description": "Strategic goal setting and OKR tracking for organizational alignment",
            "icon": "target",
            "parent_module_key": None,
            "order": 2,  # After overview and project_management
            "is_active": True,
            "created_at": now,
            "updated_at": now
        })
        print("  ✅ Created Goals & Objectives module")
    else:
        print("  ℹ️  Goals & Objectives module already exists")
    
    # Clear existing articles and FAQs for goals_objectives
    await db.help_articles.delete_many({"module_key": "goals_objectives"})
    await db.help_faqs.delete_many({"module_key": "goals_objectives"})
    print("  🗑️  Cleared old content")
    
    # Insert articles
    for article in GOALS_OBJECTIVES_ARTICLES:
        article_doc = {
            "id": str(uuid.uuid4()),
            "module_key": "goals_objectives",
            "title": article["title"],
            "slug": f"goals-objectives-{article['section']}",
            "content": article["content"],
            "section": article["section"],
            "tags": ["goals", "objectives", "okr", "strategy", article["section"]],
            "order": article["order"],
            "status": "published",
            "views": 0,
            "helpful_count": 0,
            "not_helpful_count": 0,
            "created_at": now,
            "updated_at": now
        }
        await db.help_articles.insert_one(article_doc)
    print(f"  ✅ Created {len(GOALS_OBJECTIVES_ARTICLES)} articles")
    
    # Insert FAQs
    for faq in GOALS_OBJECTIVES_FAQS:
        faq_doc = {
            "id": str(uuid.uuid4()),
            "module_key": "goals_objectives",
            "question": faq["question"],
            "answer": faq["answer"],
            "tags": ["goals", "objectives", "okr"],
            "order": faq["order"],
            "is_active": True,
            "helpful_count": 0,
            "created_at": now,
            "updated_at": now
        }
        await db.help_faqs.insert_one(faq_doc)
    print(f"  ✅ Created {len(GOALS_OBJECTIVES_FAQS)} FAQs")
    
    # ============== Update Project Management Module ==============
    print("\n📌 Updating Project Management module...")
    
    # Clear existing articles and FAQs for project_management
    await db.help_articles.delete_many({"module_key": "project_management"})
    await db.help_faqs.delete_many({"module_key": "project_management"})
    print("  🗑️  Cleared old content")
    
    # Insert articles
    for article in PROJECT_MANAGEMENT_ARTICLES:
        article_doc = {
            "id": str(uuid.uuid4()),
            "module_key": "project_management",
            "title": article["title"],
            "slug": f"project-management-{article['section']}",
            "content": article["content"],
            "section": article["section"],
            "tags": ["projects", "tasks", "management", article["section"]],
            "order": article["order"],
            "status": "published",
            "views": 0,
            "helpful_count": 0,
            "not_helpful_count": 0,
            "created_at": now,
            "updated_at": now
        }
        await db.help_articles.insert_one(article_doc)
    print(f"  ✅ Created {len(PROJECT_MANAGEMENT_ARTICLES)} articles")
    
    # Insert FAQs
    for faq in PROJECT_MANAGEMENT_FAQS:
        faq_doc = {
            "id": str(uuid.uuid4()),
            "module_key": "project_management",
            "question": faq["question"],
            "answer": faq["answer"],
            "tags": ["projects", "tasks"],
            "order": faq["order"],
            "is_active": True,
            "helpful_count": 0,
            "created_at": now,
            "updated_at": now
        }
        await db.help_faqs.insert_one(faq_doc)
    print(f"  ✅ Created {len(PROJECT_MANAGEMENT_FAQS)} FAQs")
    
    # ============== Summary ==============
    print("\n" + "="*50)
    print("📊 SEEDING COMPLETE!")
    print("="*50)
    
    # Count totals
    goals_articles = await db.help_articles.count_documents({"module_key": "goals_objectives", "status": "published"})
    goals_faqs = await db.help_faqs.count_documents({"module_key": "goals_objectives", "is_active": True})
    pm_articles = await db.help_articles.count_documents({"module_key": "project_management", "status": "published"})
    pm_faqs = await db.help_faqs.count_documents({"module_key": "project_management", "is_active": True})
    
    print(f"\n📌 Goals & Objectives:")
    print(f"   - Articles: {goals_articles}")
    print(f"   - FAQs: {goals_faqs}")
    
    print(f"\n📌 Project Management:")
    print(f"   - Articles: {pm_articles}")
    print(f"   - FAQs: {pm_faqs}")
    
    print(f"\n📈 TOTAL: {goals_articles + pm_articles} articles, {goals_faqs + pm_faqs} FAQs")
    
    client.close()
    print("\n✨ Done!")


if __name__ == "__main__":
    asyncio.run(seed_help_content())
