# Cubicle / Kubikel — Seed & Demo Data Plan

Goal: make dev/testing fast with realistic workspace data.

## 1. Seed Users

Create demo users:

| Email | Role | Notes |
|---|---|---|
| `owner@cubicle.test` | owner | workspace creator |
| `member@cubicle.test` | member | assigned to tasks/time |
| `viewer@cubicle.test` | viewer | read-only test |

Password for local only:

```text
password123
```

Never use seed password in production.

## 2. Workspace

Create one workspace:

```text
Name: Acme Creative Studio
Slug: acme-creative
Default currency: IDR
Default hourly rate: 250000
Default tax rate: 11
Booking slug: acme-creative
```

## 3. Clients

Create clients:

| Client | Status | Tags | Portal |
|---|---|---|---|
| Kopi Senja | active | branding, social | enabled |
| Klinik Harmoni | active | website, seo | enabled |
| PT Awan Digital | inactive | consulting | disabled |

Each client should have:
- email
- phone
- website
- address
- internal notes containing private info for portal leak test

## 4. Projects

Create projects:

| Client | Project | Status | Client Visible |
|---|---|---|---|
| Kopi Senja | Instagram Launch Campaign | active | true |
| Kopi Senja | Brand Guideline Refresh | active | false |
| Klinik Harmoni | Website Redesign | active | true |
| Klinik Harmoni | SEO Monthly Retainer | on_hold | true |
| PT Awan Digital | Internal Ops Consulting | completed | false |

## 5. Tasks

Create 20+ tasks across projects.

Statuses:
- todo
- in_progress
- review
- done

Priorities:
- low
- medium
- high
- urgent

Must include test cases:
- visible task under visible project
- hidden task under visible project
- visible task under hidden project (should not show in portal)
- overdue task
- task assigned to member
- task without assignee
- done task for progress calculation

## 6. Comments

Create comments:

| Entity | Visibility | Source | Expected |
|---|---|---|---|
| visible task | client | internal | portal sees |
| visible task | internal | internal | portal hidden |
| hidden task | client | internal | portal hidden because task hidden |
| visible project | client | portal | portal sees |

Portal comments need:
- `author_name`
- `author_email`

## 7. Files

Create file metadata and optional dummy R2 objects:

| File | Visibility | Expected |
|---|---|---|
| `brand-brief.pdf` | client | portal can download |
| `internal-contract.pdf` | internal | portal hidden |
| `homepage-wireframe.png` | client | portal can download |
| `budget-notes.xlsx` | internal | portal hidden |

Use storage key format:

```text
workspaces/{workspaceId}/files/{fileId}/{safeFilename}
```

## 8. Time Entries

Create time entries:

| Type | Status | Billable | Notes |
|---|---|---|---|
| manual | draft | true | can import to invoice |
| timer | approved | true | can import to invoice |
| manual | draft | false | excluded from billable import |
| manual | invoiced | true | duplicate import blocked |
| running timer | draft | true | active timer card |

Durations:
- 30 minutes
- 60 minutes
- 90 minutes
- 120 minutes

## 9. Invoices

Create invoices:

| Client | Status | Notes |
|---|---|---|
| Kopi Senja | draft | editable |
| Kopi Senja | sent | shared token exists |
| Klinik Harmoni | viewed | portal log exists |
| Klinik Harmoni | paid | payment record exists |
| PT Awan Digital | overdue | dashboard unpaid test |

Invoice items:
- manual item
- imported time item
- tax item via calculation
- discount test

## 10. Portal Tokens

Generate cases:

| Type | State | Expected |
|---|---|---|
| client portal | valid | opens |
| client portal | revoked | forbidden |
| client portal | expired | forbidden |
| invoice | valid | opens |
| invoice | revoked | forbidden |
| invoice | expired | forbidden |

Only hashes stored in DB.
Raw tokens printed once in seed output for local testing.

## 11. Appointments

Create availability:

```text
Monday-Friday: 09:00-17:00
Slot duration: 30 minutes
Timezone: Asia/Jakarta for display
Storage: UTC
```

Create appointments:
- upcoming appointment
- past appointment
- overlapping slot test fixture

## 12. Prompt Generator

Seed templates:
- Social caption
- Copywriting
- Email marketing
- Design brief
- Video script
- Presentation outline

Seed generations:
- one saved to Kopi Senja project
- one unsaved history item
- one high-cost item for cap test

## 13. Seed Script Requirements

Recommended command:

```bash
pnpm db:seed
```

Script should:
1. require `NODE_ENV !== 'production'` unless `--force` passed.
2. delete existing demo workspace by slug before reseed.
3. create users through Better-Auth-compatible path if possible.
4. create workspace/members.
5. insert clients/projects/tasks/comments/files/time/invoices/appointments/prompts.
6. print demo login credentials.
7. print valid local portal/invoice URLs.

## 14. Verification After Seed

- [ ] login as owner/member/viewer works.
- [ ] dashboard has data.
- [ ] portal visible/hidden cases work.
- [ ] invoice import duplicate case exists.
- [ ] active timer exists.
- [ ] appointment double-booking fixture can be tested.
