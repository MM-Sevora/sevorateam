# Sevora Platform - Architecture Review & Recommendations

## Executive Summary

This document provides a comprehensive architecture review of the Sevora internal workspace platform, covering database design, module boundaries, and recommendations for scalability.

---

## 1. DATABASE ARCHITECTURE

### 1.1 Current State Analysis

**Total Collections: 75+**

The current MongoDB schema has grown organically with some structural inconsistencies:

| Category | Collections | Issues Identified |
|----------|-------------|-------------------|
| **Core Identity** | users, employees, departments, teams, positions, grade_types | ⚠️ User/Employee separation incomplete |
| **Access Control** | custom_roles, roles | ⚠️ Duplicate role systems |
| **Project Management** | pm_modules, pm_projects, pm_tasks, pm_subtasks, pm_checklists, pm_comments, pm_time_logs, pm_attachments, pm_labels, pm_task_templates, pm_activity_logs | ✅ Well-structured with prefix |
| **Marketing** | contacts, influencers, campaigns, deals, negotiations, outreach, communications | ⚠️ Overlapping contact models |
| **Sales** | leads, customers, partners, qrcodes | ✅ Clean separation |
| **Social** | content, social_posts, content_submissions | ⚠️ Content split across collections |
| **Help & Support** | support_tickets, help_articles, help_faqs, help_modules | ✅ Well-organized |
| **Notifications** | notifications, notification_preferences, monitoring_alerts, alert_triggers | ✅ Good structure |

### 1.2 Critical Issues

#### Issue 1: Duplicate Contact/Influencer Models
```
contacts (17 docs) vs influencers (25 docs)
- Both store: name, email, phone, instagram_handle, youtube_handle
- Redundant data, inconsistent updates
```

#### Issue 2: Incomplete User/Employee Separation
```
users (55 docs) - Contains auth + HR data mixed
employees (1 doc) - New clean model, but not fully migrated
```

#### Issue 3: Duplicate Role Systems
```
roles (8 docs) - Legacy role definitions
custom_roles (15 docs) - New RBAC system
```

### 1.3 Recommended Schema Design

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           CORE IDENTITY DOMAIN                               │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌──────────────┐    1:1     ┌──────────────┐                               │
│  │    users     │◄──────────►│  employees   │                               │
│  │  (Auth Only) │            │  (HR Data)   │                               │
│  └──────┬───────┘            └──────┬───────┘                               │
│         │                           │                                        │
│         │ has_many                  │ belongs_to                            │
│         ▼                           ▼                                        │
│  ┌──────────────┐            ┌──────────────┐     ┌──────────────┐         │
│  │ user_roles   │            │ departments  │◄────│    teams     │         │
│  │ (Junction)   │            └──────────────┘     └──────────────┘         │
│  └──────┬───────┘                   │                    │                  │
│         │                           │                    │                  │
│         ▼                           ▼                    ▼                  │
│  ┌──────────────┐            ┌──────────────┐     ┌──────────────┐         │
│  │    roles     │            │  positions   │     │ grade_types  │         │
│  │ (Unified)    │            └──────────────┘     └──────────────┘         │
│  └──────────────┘                                                           │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────┐
│                          CONTACT MANAGEMENT DOMAIN                           │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌──────────────────────────────────────────────────────────────────┐       │
│  │                     contacts (UNIFIED)                            │       │
│  │  - contact_type: 'influencer' | 'publication' | 'partner' | 'lead'│      │
│  │  - Replaces: contacts, influencers, publications                  │       │
│  └────────────────────────────┬─────────────────────────────────────┘       │
│                               │                                              │
│         ┌─────────────────────┼─────────────────────┐                       │
│         ▼                     ▼                     ▼                       │
│  ┌──────────────┐      ┌──────────────┐      ┌──────────────┐              │
│  │  campaigns   │      │    deals     │      │communications│              │
│  └──────────────┘      └──────────────┘      └──────────────┘              │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────┐
│                        PROJECT MANAGEMENT DOMAIN                             │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  pm_modules ──► pm_projects ──► pm_tasks ──► pm_subtasks                    │
│                      │              │             │                          │
│                      │              ├──► pm_checklists                      │
│                      │              ├──► pm_comments                        │
│                      │              ├──► pm_time_logs                       │
│                      │              └──► pm_attachments                     │
│                      │                                                       │
│                      └──► pm_labels                                         │
│                      └──► pm_task_templates                                 │
│                                                                              │
│  ✅ This domain is well-structured - keep as-is                             │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 1.4 Proposed Collection Consolidation

| Current | Proposed | Action |
|---------|----------|--------|
| `contacts` + `influencers` + `publications` | `contacts` | Merge with `contact_type` discriminator |
| `roles` + `custom_roles` | `roles` | Merge, deprecate legacy |
| `users` (HR fields) | `employees` | Complete migration |
| `content` + `social_posts` | `content` | Merge with `content_source` field |

---

## 2. MODULE BOUNDARIES

### 2.1 Current Module Structure

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              FRONTEND MODULES                                │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  /pages/                                                                     │
│  ├── admin/           # User Mgmt, Employee DB, Access Control, Org Mgmt   │
│  ├── marketing/       # Campaigns, Influencers, Publications, Pipeline     │
│  ├── sales/           # Leads, Customers, Partners, QR Codes               │
│  ├── social/          # Dashboard, Studio, Posts, Library                  │
│  ├── projects/        # Tasks, Projects, Manager Dashboard                 │
│  ├── help/            # Help Center, Tickets, Articles                     │
│  └── notifications/   # Notification Center                                │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────┐
│                              BACKEND ROUTES                                  │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  /api/                                                                       │
│  ├── auth/            # Login, Register, Azure SSO                         │
│  ├── marketing/       # Legacy marketing routes                            │
│  ├── marketing/v2/    # New marketing routes                               │
│  ├── sales/           # Sales CRUD                                         │
│  ├── social/          # Social content management                          │
│  ├── social-api/      # Instagram/YouTube integrations                     │
│  ├── hr/              # Legacy HR (uses users collection)                  │
│  ├── hr/v2/           # New HR (uses employees collection)                 │
│  ├── access-control/  # RBAC, Roles, Onboarding                           │
│  ├── projects/        # Project management                                 │
│  ├── notifications/   # Alert system                                       │
│  └── help-support/    # Ticketing system                                   │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 2.2 Module Boundary Issues

#### Issue 1: Marketing Route Fragmentation
```
/api/marketing/          # In server.py (monolithic)
/api/marketing/v2/       # In routes/marketing_v2.py
/api/marketing-extended/ # In routes/marketing_extended.py
/api/social-api/         # In routes/social_api.py (marketing-related)

Problem: Related functionality spread across 4 different route groups
```

#### Issue 2: HR Route Duplication
```
/api/hr/     # Legacy routes operating on 'users' collection
/api/hr/v2/  # New routes operating on 'employees' collection

Problem: Two active versions, frontend may call wrong one
```

#### Issue 3: Monolithic server.py
```
server.py: 4500+ lines containing:
- Authentication logic
- Marketing routes
- Sales routes  
- Social routes
- WebSocket handlers
- Background jobs

Problem: Hard to maintain, test, and scale
```

### 2.3 Recommended Module Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                     RECOMMENDED BACKEND STRUCTURE                            │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  /app/backend/                                                               │
│  │                                                                           │
│  ├── core/                    # Shared infrastructure                       │
│  │   ├── auth.py              # Authentication & authorization              │
│  │   ├── database.py          # MongoDB connection & helpers                │
│  │   ├── permissions.py       # RBAC middleware                             │
│  │   ├── exceptions.py        # Custom exceptions                           │
│  │   └── events.py            # Event bus for inter-module communication   │
│  │                                                                           │
│  ├── modules/                 # Domain modules (self-contained)             │
│  │   │                                                                       │
│  │   ├── identity/            # User & Employee management                  │
│  │   │   ├── models.py                                                      │
│  │   │   ├── routes.py                                                      │
│  │   │   ├── services.py                                                    │
│  │   │   └── events.py        # Emits: user.created, employee.onboarded    │
│  │   │                                                                       │
│  │   ├── organization/        # Departments, Teams, Positions, Grades       │
│  │   │   ├── models.py                                                      │
│  │   │   ├── routes.py                                                      │
│  │   │   └── services.py                                                    │
│  │   │                                                                       │
│  │   ├── contacts/            # Unified contact management                  │
│  │   │   ├── models.py        # Contact with type discriminator            │
│  │   │   ├── routes.py                                                      │
│  │   │   ├── services.py                                                    │
│  │   │   └── events.py        # Emits: contact.created, contact.updated    │
│  │   │                                                                       │
│  │   ├── campaigns/           # Marketing campaigns                         │
│  │   │   ├── models.py                                                      │
│  │   │   ├── routes.py                                                      │
│  │   │   ├── services.py                                                    │
│  │   │   └── events.py        # Listens: contact.updated                   │
│  │   │                                                                       │
│  │   ├── projects/            # Project management (already well-structured)│
│  │   │   └── ...                                                            │
│  │   │                                                                       │
│  │   ├── sales/               # Sales pipeline                              │
│  │   │   └── ...                                                            │
│  │   │                                                                       │
│  │   ├── social/              # Social media management                     │
│  │   │   └── ...                                                            │
│  │   │                                                                       │
│  │   ├── notifications/       # Alert & notification system                 │
│  │   │   └── ...                                                            │
│  │   │                                                                       │
│  │   └── support/             # Help & ticketing                            │
│  │       └── ...                                                            │
│  │                                                                           │
│  ├── integrations/            # External service integrations               │
│  │   ├── azure/               # Azure AD SSO                                │
│  │   ├── instagram/           # Instagram Graph API                         │
│  │   ├── youtube/             # YouTube Data API                            │
│  │   └── email/               # Microsoft Graph / SMTP                      │
│  │                                                                           │
│  └── server.py                # App factory, router registration only       │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 2.4 Inter-Module Communication Pattern

```python
# Recommended: Event-Driven Architecture

# core/events.py
class EventBus:
    _handlers = {}
    
    @classmethod
    def emit(cls, event: str, data: dict):
        for handler in cls._handlers.get(event, []):
            asyncio.create_task(handler(data))
    
    @classmethod
    def on(cls, event: str):
        def decorator(func):
            cls._handlers.setdefault(event, []).append(func)
            return func
        return decorator

# modules/contacts/services.py
async def update_contact(contact_id: str, data: dict):
    # Update in database
    await db.contacts.update_one(...)
    
    # Emit event for other modules
    EventBus.emit("contact.updated", {
        "contact_id": contact_id,
        "changes": data
    })

# modules/campaigns/events.py
@EventBus.on("contact.updated")
async def sync_campaign_contacts(data: dict):
    # Update denormalized contact data in campaigns
    await db.campaigns.update_many(
        {"contacts.id": data["contact_id"]},
        {"$set": {"contacts.$.name": data["changes"].get("name")}}
    )
```

---

## 3. PERMISSION ARCHITECTURE

### 3.1 Current RBAC Model

```
custom_roles:
  - id, name, code
  - module_access: {
      "marketing_ops": ["view", "create", "edit", "delete"],
      "projects": ["view", "create"],
      ...
    }
  - can_manage_users, can_manage_employees, can_manage_roles
```

### 3.2 Recommended Permission Model

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         PERMISSION HIERARCHY                                 │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  LEVEL 1: System Permissions (Platform-wide)                                │
│  ├── system.admin           # Full system access                            │
│  ├── system.audit           # View all audit logs                           │
│  └── system.settings        # Modify system settings                        │
│                                                                              │
│  LEVEL 2: Module Permissions (Feature access)                               │
│  ├── marketing.*            # All marketing features                        │
│  │   ├── marketing.contacts.view                                            │
│  │   ├── marketing.contacts.create                                          │
│  │   ├── marketing.contacts.edit                                            │
│  │   ├── marketing.contacts.delete                                          │
│  │   ├── marketing.campaigns.*                                              │
│  │   └── marketing.budget.approve                                           │
│  │                                                                           │
│  ├── projects.*                                                              │
│  │   ├── projects.view                                                       │
│  │   ├── projects.create                                                     │
│  │   ├── projects.manage_team                                                │
│  │   └── projects.close                                                      │
│  │                                                                           │
│  └── hr.*                                                                    │
│      ├── hr.employees.view                                                   │
│      ├── hr.employees.edit                                                   │
│      ├── hr.salary.view       # Sensitive                                   │
│      └── hr.terminate         # Critical action                             │
│                                                                              │
│  LEVEL 3: Data Permissions (Row-level security)                             │
│  ├── own_data                 # User's own records only                     │
│  ├── team_data                # Team members' data                          │
│  ├── department_data          # Department-wide access                      │
│  └── all_data                 # Organization-wide access                    │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 3.3 Permission Check Implementation

```python
# Recommended middleware pattern

from functools import wraps

def require_permission(*permissions: str, data_scope: str = "own_data"):
    def decorator(func):
        @wraps(func)
        async def wrapper(*args, user: dict = Depends(get_current_user), **kwargs):
            # Check module permission
            for perm in permissions:
                if not has_permission(user, perm):
                    raise HTTPException(403, f"Missing permission: {perm}")
            
            # Apply data scope filter
            kwargs["data_filter"] = get_data_filter(user, data_scope)
            return await func(*args, user=user, **kwargs)
        return wrapper
    return decorator

# Usage
@router.get("/employees")
@require_permission("hr.employees.view", data_scope="department_data")
async def list_employees(data_filter: dict, user: dict):
    return await db.employees.find(data_filter).to_list(100)
```

---

## 4. MIGRATION STRATEGY

### Phase 1: Database Consolidation (Week 1-2)

```bash
# Step 1: Merge contacts/influencers/publications
1. Add contact_type field to contacts collection
2. Migrate influencers → contacts (contact_type: "influencer")
3. Migrate publications → contacts (contact_type: "publication")
4. Update all references
5. Deprecate old collections

# Step 2: Complete User/Employee separation
1. Run migration script for remaining users
2. Update frontend to use /api/hr/v2/ endpoints
3. Deprecate /api/hr/ v1 endpoints
```

### Phase 2: Route Refactoring (Week 2-3)

```bash
# Step 1: Extract marketing routes from server.py
1. Create /modules/contacts/ with unified contact routes
2. Create /modules/campaigns/ for campaign management
3. Deprecate /api/marketing/v2/ routes

# Step 2: Clean up server.py
1. Move remaining inline routes to modules
2. Keep only app factory and router registration
3. Target: server.py < 500 lines
```

### Phase 3: Permission System Upgrade (Week 3-4)

```bash
# Step 1: Implement granular permissions
1. Add permission definitions to roles collection
2. Update permission check middleware
3. Add data scope filtering

# Step 2: Audit & rollout
1. Generate permission report for existing users
2. Map old roles to new permission sets
3. Enable new system with fallback
```

---

## 5. KEY RECOMMENDATIONS SUMMARY

| Priority | Recommendation | Impact | Effort |
|----------|---------------|--------|--------|
| 🔴 HIGH | Merge contacts/influencers | Data integrity | Medium |
| 🔴 HIGH | Complete User/Employee migration | Clean architecture | Low |
| 🟡 MED | Extract routes from server.py | Maintainability | High |
| 🟡 MED | Implement event bus | Scalability | Medium |
| 🟢 LOW | Granular permissions | Security | Medium |
| 🟢 LOW | Add indexes for common queries | Performance | Low |

---

## 6. RECOMMENDED INDEXES

```javascript
// High-priority indexes to add
db.employees.createIndex({ "department_id": 1, "status": 1 })
db.employees.createIndex({ "reports_to": 1 })
db.employees.createIndex({ "user_id": 1 }, { unique: true })

db.contacts.createIndex({ "contact_type": 1, "status": 1 })
db.contacts.createIndex({ "email": 1 })
db.contacts.createIndex({ "name": "text", "email": "text" })

db.pm_tasks.createIndex({ "project_id": 1, "status": 1 })
db.pm_tasks.createIndex({ "assigned_to": 1, "status": 1 })
db.pm_tasks.createIndex({ "due_date": 1 })

db.notifications.createIndex({ "user_id": 1, "read": 1, "created_at": -1 })
```

---

*Document Version: 1.0*
*Last Updated: March 9, 2026*
*Author: Architecture Review*
