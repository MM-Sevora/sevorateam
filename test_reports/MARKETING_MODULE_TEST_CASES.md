# Marketing Module - Comprehensive Test Cases
## User Acceptance Criteria (UAC) & End-to-End Testing

---

## 1. DATABASE TABLES & DATA INTEGRITY

### 1.1 Collections/Tables
| Collection | Purpose | Key Fields |
|------------|---------|------------|
| `contacts` | Influencers & Journalists | id, name, contact_type, email, status, campaign_id, publication_id |
| `publications` | Media outlets | id, name, tier, domain_authority, journalist_count, coverage_count |
| `campaigns` | Influencer campaigns | id, name, budget, spent, status, start_date, end_date |
| `pr_campaigns` | PR campaigns | id, name, budget, spent, status, journalist_ids |
| `payments` | Financial transactions | id, contact_id, campaign_id, amount, status, payment_type |
| `deals` | Negotiations | id, contact_id, campaign_id, initial_quote, final_amount, status |
| `communications` | Outreach history | id, contact_id, comm_type, message, direction, status |
| `media_coverage` | PR coverage | id, publication, title, url, coverage_type, sentiment |
| `pr_pitches` | Pitch tracking | id, contact_id, subject, message, status |
| `ugc` | User-generated content | id, contact_id, campaign_id, content_type, status |
| `assets` | Content assets | id, name, asset_type, category, file_url |
| `events` | Marketing events | id, name, event_type, start_date, budget |

### 1.2 Data Integrity Tests
| Test ID | Test Case | Expected Result |
|---------|-----------|-----------------|
| DB-001 | Create contact with required fields only | Contact created with defaults |
| DB-002 | Create contact with invalid email format | Validation error |
| DB-003 | Update payment status to 'paid' | Campaign spent auto-updated |
| DB-004 | Delete payment that was 'paid' | Campaign spent decremented |
| DB-005 | Add journalist to publication | publication.journalist_count incremented |
| DB-006 | Remove journalist from publication | publication.journalist_count decremented |
| DB-007 | Create coverage linked to publication | publication.coverage_count incremented |
| DB-008 | Foreign key: Contact with invalid campaign_id | Should handle gracefully |

---

## 2. CRUD OPERATIONS

### 2.1 Contacts (Influencers & Journalists)
| Test ID | Operation | Test Case | Expected Result |
|---------|-----------|-----------|-----------------|
| CR-001 | CREATE | Add new influencer with all fields | Contact created, ID returned |
| CR-002 | CREATE | Add journalist linked to publication | Contact created, publication.journalist_count updated |
| CR-003 | READ | Get single contact by ID | Full contact details returned |
| CR-004 | READ | List contacts with filters (type, status) | Filtered results returned |
| CR-005 | UPDATE | Update contact status | Status changed, updated_at set |
| CR-006 | UPDATE | Assign contact to campaign | campaign_id linked |
| CR-007 | DELETE | Delete contact | Contact removed, publication counts updated |

### 2.2 Publications
| Test ID | Operation | Test Case | Expected Result |
|---------|-----------|-----------|-----------------|
| PUB-001 | CREATE | Add new publication | Publication created |
| PUB-002 | READ | Get publication with journalist count | Correct count returned |
| PUB-003 | READ | List publications with tier filter | Filtered results |
| PUB-004 | UPDATE | Update publication rates | Rates updated |
| PUB-005 | DELETE | Delete publication with linked journalists | Journalists unlinked |

### 2.3 Campaigns
| Test ID | Operation | Test Case | Expected Result |
|---------|-----------|-----------|-----------------|
| CAM-001 | CREATE | Create influencer campaign | Campaign created with planning status |
| CAM-002 | CREATE | Create PR campaign | PR campaign created |
| CAM-003 | READ | Get unified campaigns (both types) | Combined list returned |
| CAM-004 | UPDATE | Change campaign status to 'paused' | Status updated |
| CAM-005 | UPDATE | Update campaign budget | Budget changed |
| CAM-006 | DELETE | Delete campaign | Campaign removed |

### 2.4 Payments
| Test ID | Operation | Test Case | Expected Result |
|---------|-----------|-----------|-----------------|
| PAY-001 | CREATE | Create payment for influencer | Payment created, pending status |
| PAY-002 | CREATE | Create payment linked to campaign | campaign_id set |
| PAY-003 | READ | List payments with filters | Filtered results |
| PAY-004 | UPDATE | Mark payment as 'paid' | Status changed, campaign.spent increased |
| PAY-005 | UPDATE | Edit payment amount | Amount updated |
| PAY-006 | DELETE | Delete paid payment | campaign.spent decreased |

### 2.5 Deals & Negotiations
| Test ID | Operation | Test Case | Expected Result |
|---------|-----------|-----------|-----------------|
| DEL-001 | CREATE | Create deal for contact | Deal created, contact status to 'negotiating' |
| DEL-002 | UPDATE | Update deal status to 'agreed' | Status changed, timeline updated |
| DEL-003 | UPDATE | Set final amount | final_amount set |
| DEL-004 | READ | Get deals for contact | Deal history returned |

---

## 3. USER FLOWS (End-to-End)

### 3.1 Influencer Onboarding Flow
| Step | Action | Verification |
|------|--------|--------------|
| 1 | Navigate to Influencers List | Page loads with table |
| 2 | Click "Add Influencer" | Modal opens |
| 3 | Fill required fields (name, platform) | Fields accept input |
| 4 | Fetch Instagram/YouTube data | Metrics populated |
| 5 | Save influencer | Redirects to detail page |
| 6 | Verify in list | New influencer appears |

### 3.2 Campaign Creation & Assignment Flow
| Step | Action | Verification |
|------|--------|--------------|
| 1 | Navigate to Campaign Hub | Page loads with campaigns |
| 2 | Click "New Campaign" | Modal opens |
| 3 | Select campaign type (Influencer/PR) | Type-specific fields shown |
| 4 | Fill campaign details | Fields validated |
| 5 | Save campaign | Campaign in list |
| 6 | Open campaign | Detail page loads |
| 7 | Assign influencer/journalist | Contact linked |

### 3.3 Payment Recording Flow
| Step | Action | Verification |
|------|--------|--------------|
| 1 | Navigate to Budget page | Stats cards show totals |
| 2 | Click "New Payment" | Modal opens |
| 3 | Select contact | Dropdown shows contacts |
| 4 | Link to campaign (optional) | Campaign dropdown works |
| 5 | Enter amount and type | Validation works |
| 6 | Save payment | Payment in table |
| 7 | Change status to 'paid' | Campaign spent updated |

### 3.4 PR Outreach Flow
| Step | Action | Verification |
|------|--------|--------------|
| 1 | Navigate to Publications | List loads |
| 2 | Click publication | Detail page opens |
| 3 | Add journalist | Journalist added to publication |
| 4 | Create pitch | Pitch created |
| 5 | Send pitch | Status changes to 'sent' |
| 6 | Record coverage | Coverage linked |

### 3.5 Deal Negotiation Flow
| Step | Action | Verification |
|------|--------|--------------|
| 1 | Open influencer detail | Page loads |
| 2 | Go to Deals tab | Deal history shown |
| 3 | Create new deal | Deal form works |
| 4 | Update negotiation | Timeline updated |
| 5 | Finalize deal | Status to 'agreed' |
| 6 | Create payment from deal | Payment linked |

---

## 4. MODULE NAVIGATION

| Test ID | Test Case | Expected Result |
|---------|-----------|-----------------|
| NAV-001 | Click each sidebar menu item | Correct page loads |
| NAV-002 | Back button from detail pages | Returns to list |
| NAV-003 | Breadcrumb navigation | Works correctly |
| NAV-004 | Deep link to specific entity | Direct access works |
| NAV-005 | Tab navigation within detail pages | Tabs switch content |

---

## 5. DATA SYNC ACROSS MODULES

| Test ID | Test Case | Expected Result |
|---------|-----------|-----------------|
| SYNC-001 | Payment marked paid → Campaign budget | spent field updated |
| SYNC-002 | Journalist added → Publication count | journalist_count +1 |
| SYNC-003 | Coverage recorded → Publication count | coverage_count +1 |
| SYNC-004 | Contact deleted → Campaign assignment | Handled gracefully |
| SYNC-005 | Campaign deleted → Contact assignments | Contacts unlinked |
| SYNC-006 | Budget page totals match campaign sums | Totals consistent |

---

## 6. PERMISSIONS & ROLES

| Test ID | Role | Test Case | Expected Result |
|---------|------|-----------|-----------------|
| PERM-001 | marketing_manager | Access Marketing Ops | Full access |
| PERM-002 | sales_manager | Access Marketing Ops | Denied |
| PERM-003 | admin | Access all modules | Full access |
| PERM-004 | viewer | Edit operations | Read-only |
| PERM-005 | marketing_manager | Delete campaign | Allowed |

---

## 7. SEARCH & FILTERS

| Test ID | Page | Test Case | Expected Result |
|---------|------|-----------|-----------------|
| FIL-001 | Influencers | Search by name | Matching results |
| FIL-002 | Influencers | Filter by platform | Correct filter |
| FIL-003 | Influencers | Sort by followers | Sorted correctly |
| FIL-004 | Publications | Filter by tier | Tier-specific results |
| FIL-005 | Publications | Sort by DA | Sorted by domain authority |
| FIL-006 | Campaign Hub | Filter by type (Influencer/PR) | Type-specific campaigns |
| FIL-007 | Campaign Hub | Filter by status | Status-specific campaigns |
| FIL-008 | Campaign Hub | Sort by budget | Sorted correctly |
| FIL-009 | Budget | Filter by payment type | Type-specific payments |
| FIL-010 | Budget | Filter by campaign | Campaign-specific payments |
| FIL-011 | Budget | Search payments | Matching results |

---

## 8. FILE/ASSET HANDLING

| Test ID | Test Case | Expected Result |
|---------|-----------|-----------------|
| AST-001 | Upload brand asset | File uploaded, URL stored |
| AST-002 | View asset preview | Image/doc previews |
| AST-003 | Download asset | File downloads |
| AST-004 | Delete asset | Asset removed |
| AST-005 | Link asset to campaign | Association created |
| AST-006 | Content library filtering | Filter by type works |

---

## 9. CAMPAIGN LINKING

| Test ID | Test Case | Expected Result |
|---------|-----------|-----------------|
| LINK-001 | Assign influencer to campaign | influencer_count updated |
| LINK-002 | Assign journalist to PR campaign | journalist_ids updated |
| LINK-003 | Link payment to campaign | campaign_id set, budget affected |
| LINK-004 | Link coverage to campaign | campaign reference set |
| LINK-005 | Link deal to campaign | Deal shows campaign name |
| LINK-006 | Campaign stats show linked counts | Accurate counts |

---

## 10. PERFORMANCE

| Test ID | Test Case | Expected Result |
|---------|-----------|-----------------|
| PERF-001 | Load Influencers list (100+ records) | < 2 seconds |
| PERF-002 | Load Publications list (50+ records) | < 2 seconds |
| PERF-003 | Load Campaign Hub | < 2 seconds |
| PERF-004 | Load Budget page with charts | < 3 seconds |
| PERF-005 | Search with 1000+ records | < 1 second |
| PERF-006 | Detail page with all tabs | < 2 seconds |

---

## 11. ERROR HANDLING

| Test ID | Test Case | Expected Result |
|---------|-----------|-----------------|
| ERR-001 | Submit form without required fields | Validation error shown |
| ERR-002 | Invalid email format | Field-level error |
| ERR-003 | Negative amount in payment | Validation error |
| ERR-004 | API timeout | Loading indicator, retry option |
| ERR-005 | 404 - Entity not found | Graceful redirect |
| ERR-006 | Network error | Toast notification |
| ERR-007 | Session expired | Redirect to login |

---

## 12. INTEGRATIONS

| Test ID | Integration | Test Case | Expected Result |
|---------|-------------|-----------|-----------------|
| INT-001 | Instagram API | Fetch influencer metrics | Data populated |
| INT-002 | YouTube API | Fetch channel stats | Data populated |
| INT-003 | Email (Microsoft Graph) | Send outreach email | Email sent |
| INT-004 | WhatsApp (Twilio) | Send message | Message delivered (sandbox) |
| INT-005 | AI (GPT-5.2) | Generate pitch content | Content generated |
| INT-006 | AI Discovery | Recommend influencers | Recommendations returned |

---

## TEST EXECUTION SUMMARY

### Priority Levels
- **P0 (Critical)**: CRUD operations, Data sync, Permissions
- **P1 (High)**: User flows, Search/Filters, Error handling
- **P2 (Medium)**: Performance, Navigation, Integrations
- **P3 (Low)**: Edge cases, UI polish

### Test Environment
- **URL**: https://sevora-hub.preview.emergentagent.com
- **Test Users**:
  - Admin: `superadmin@sevora.com` / `superadmin123`
  - Marketing: `marketing@sevora.com` / `admin123`
  - Sales: `sales@sevora.com` / `admin123`

### Acceptance Criteria
1. All P0 tests must pass (100%)
2. P1 tests must have 95%+ pass rate
3. P2 tests must have 90%+ pass rate
4. No critical bugs in production flow
