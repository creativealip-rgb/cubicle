# Cubiqlo Full Feature Status

Last updated: 2026-07-05
Live app: https://cubiqlo.com
Latest verified commit: `3101df9 feat: publish personal landing pages`

## Status legend

- `DONE` — shipped, deployed, usable.
- `PARTIAL` — shipped basic version; needs deeper UX/automation/data model.
- `PROCESS` — in progress or planned next.
- `TODO` — not started / not verified.

## Deployment + health

| Area | Status | Notes |
| --- | --- | --- |
| Production domain | DONE | `https://cubiqlo.com` live over HTTPS. |
| Docker deploy | DONE | `cubicle-cubicle-1` rebuild/recreate flow works. |
| Database | DONE | Postgres container healthy. |
| Health endpoint | DONE | `/api/health` returns `{"status":"ok","db":"ok"}`. |
| Protected app routing | DONE | `/app/*` redirects unauthenticated users to `/login?redirect=...`. |
| Git checkpoint | DONE | Latest pushed: `3101df9 feat: publish personal landing pages`. |

## Core app shell

| Feature | Route/File | Status | Notes |
| --- | --- | --- | --- |
| App shell sidebar/topbar | `/app/*` | DONE | Grouped sidebar, workspace dropdown, global search entry, create button, timer, notifications. |
| Auth login/signup/reset | `/login`, `/signup`, `/forgot-password`, `/reset-password` | DONE | Basic auth flow live. |
| Workspace context | `active_workspace_id` cookie + workspace helpers | DONE | Auto-bootstrap and membership checks exist. |
| Dashboard | `/app/dashboard` | DONE | P0 meeting layout done: Reminder → Kerja → Keuangan, due cards accurate, compact activity, Jakarta-time greeting updates every 60s. |
| Notifications | `/api/notifications` | PARTIAL | In-app notifications exist; deeper WA/push automation pending. |

## Client operations

| Feature | Route | Status | Notes |
| --- | --- | --- | --- |
| Clients list | `/app/clients` | DONE | Client management page exists. |
| Client create | `/app/clients/new`, `/api/clients/create` | DONE | Dedicated non-modal fallback created. |
| Client detail | `/app/clients/[clientId]` | DONE | Client profile/detail route exists. |
| Client portal token route | `/client-portal/[token]` | DONE | Public client-facing portal route exists. |
| Short client portal slug UX | Client form / portal fields | DONE | Auto slug generation and cleanup in client form. |
| Portal access audit | `portal_visits` | PARTIAL | Schema exists; deeper analytics/reporting pending. |

## Projects + tasks

| Feature | Route | Status | Notes |
| --- | --- | --- | --- |
| Projects list | `/app/projects` | DONE | Workspace project page exists. |
| Project detail | `/app/projects/[projectId]` | DONE | Detail page with related data. |
| Tasks | `/app/tasks` | DONE | Task board/list exists. |
| Project timeline | Project detail + portal | DONE | Internal timeline and client-safe visibility shipped earlier. |
| Nodes/reminder center | `/app/nodes` | PARTIAL | Central view for reminders/due items exists; true scheduler/recur/snooze pending. |

## Time tracking + reports

| Feature | Route/API | Status | Notes |
| --- | --- | --- | --- |
| Time tracking | `/app/time` | DONE | Time page and active timer endpoint exist. |
| Time CSV export | Existing time export | DONE | Existing export supported. |
| Time PDF export | `/api/time/export/pdf` | DONE | PDF route added; unauthenticated returns `401` instead of `500`. |
| Reports | `/app/reports` | DONE | Collection health and P&L/report basics exist. |

## Finance + invoices

| Feature | Route/API | Status | Notes |
| --- | --- | --- | --- |
| Invoices list | `/app/invoices` | DONE | Invoice management page exists. |
| Invoice create | `/app/invoices/new` | DONE | New invoice route exists. |
| Invoice detail | `/app/invoices/[invoiceId]` | DONE | Detail route exists. |
| Public invoice link | `/invoice/[token]` | DONE | Public invoice page and view marking exists. |
| Invoice PDF | `/api/invoices/[id]/pdf` | DONE | Existing PDF generation route. |
| Invoice overdue reminders | cron/manual/email/activity | DONE | Shipped earlier: auto-overdue, manual remind, email, fresh links, notifications. |
| Invoice Template Manager | `/app/invoice-templates` | PARTIAL | Starter manager/link hub exists; DB-backed template CRUD/apply flow pending. |
| Billing | `/app/billing` | PARTIAL | Checkout/plan flow exists; payment edge-case QA remains. |

## Sales docs

| Feature | Route | Status | Notes |
| --- | --- | --- | --- |
| Proposals list/detail/new | `/app/proposals`, `/app/proposals/new`, `/app/proposals/[proposalId]` | DONE | Proposal workflow exists. |
| Public proposal | `/proposal/[token]` | DONE | Public token page exists. |
| Contracts list/detail | `/app/contracts`, `/app/contracts/[contractId]` | DONE | Contract workflow exists. |
| Public contract | `/contract/[token]` | DONE | Public token page exists. |
| Contract templates | `/app/contract-templates` | DONE | Template routes exist. |
| Questionnaires | `/app/questionnaires` | DONE | Questionnaire routes exist. |
| Intake | `/intake/[token]` | DONE | Public intake route exists. |

## Communication

| Feature | Route | Status | Notes |
| --- | --- | --- | --- |
| Email composer | `/app/email` | DONE | Compose, draft, send via Resend helper, optional client/project links. |
| Email templates | `/app/email` | DONE | Template create/update/delete shipped in Phase 4B. |
| Comment notifications | project/comments actions | DONE | Email notification plumbing confirmed. |
| Support Center | `/app/support` | PARTIAL | Basic support center page exists; ticket DB/assignment/SLA pending. |
| WhatsApp automation | n/a | TODO | Provider integration and message templates pending. |
| Shared inbox / IMAP sync | n/a | TODO | Deferred from Phase 4. |

## Calendar + booking

| Feature | Route/API | Status | Notes |
| --- | --- | --- | --- |
| Calendar | `/app/calendar` | DONE | Calendar page exists. |
| Public booking | `/booking/[slug]` | DONE | Public booking route exists. |
| ICS invite | `/api/calendar/[appointmentId]/ics` | DONE | `.ics` calendar invite route added. |
| Google/Outlook sync | n/a | TODO | Real provider sync pending. |

## Files + storage

| Feature | Route | Status | Notes |
| --- | --- | --- | --- |
| Files | `/app/files` | DONE | File workspace page exists. |
| R2 storage | backend | DONE | Upload/download/delete smoke passed earlier. |
| File permission audit | backend/client portal | PARTIAL | Basic filtering exists; deeper audit tooling pending. |

## AI + templates

| Feature | Route/API | Status | Notes |
| --- | --- | --- | --- |
| AI chat/action | `/api/ai/chat`, `/api/ai/action` | PARTIAL | AI endpoints and conversations exist; role guard hardened. |
| Prompts | `/app/prompts` | DONE | Prompt center exists. |
| Brain | `/app/brain` | PARTIAL | Route exists; knowledge/automation maturity pending. |
| Unified Template Center | `/app/templates` | PARTIAL | Link hub/center exists; full reusable template CRUD by type pending. |

## Personal workspace + landing pages

| Feature | Route | Status | Notes |
| --- | --- | --- | --- |
| Personal notes | `/app/personal` | DONE | User-scoped notes, pin, status, archive/delete, edit/search. |
| Journal | `/app/journal` | PARTIAL | Dedicated journal page exists; tags/calendar/mood/export pending. |
| Personal landing builder | `/app/personal-site` | PARTIAL | Builder controls, sections, links, theme/accent, dashboard preview. |
| Standalone preview | `/site/preview` | DONE | Private full-page preview route exists. |
| Public landing page | `/site/[slug]` | DONE | Public published route exists; default `/site/alip` verified `HTTP/2 200`. |
| Publish controls | `/app/personal-site` | PARTIAL | Slug + published checkbox exist; slug uniqueness/polished validation pending. |
| Section manager UI | n/a | PROCESS | Current sections use `Heading|Content`; next should be add/duplicate/delete/drag UI. |
| Template picker | n/a | TODO | Freelancer/agency/consultant templates pending. |
| Mobile preview | n/a | TODO | Dedicated mobile frame toggle pending. |

## Settings + ops

| Feature | Route/Doc | Status | Notes |
| --- | --- | --- | --- |
| Settings | `/app/settings` | DONE | Workspace/user settings route exists. |
| Team settings | `/app/settings/team` | PARTIAL | Mentioned in docs; verify current UI depth before marking done. |
| Workspace settings | `/app/settings/workspace` | PARTIAL | Mentioned in docs; verify current UI depth before marking done. |
| Env audit | `/api/health/env` | DONE | Guarded and secret-safe from earlier hardening. |
| Smoke tests | `scripts/smoke.mjs` | DONE | Smoke script exists. |
| Backups/monitoring | docs/ops + cron | DONE | Documented active ops jobs from prior phase. |

## Current verified live checks — 2026-07-05

```text
/api/health -> HTTP/2 200 {"status":"ok","db":"ok"}
/app/personal-site -> HTTP/2 307 /login?redirect=%2Fapp%2Fpersonal-site when unauthenticated
/site/alip -> HTTP/2 200
Docker: cubicle-pg Healthy, cubicle-cubicle-1 Started
Logs: Next.js Ready, no new runtime error after latest deploy
```

## Known gaps / next build order

1. Personal landing page builder v2:
   - `+ Add Section` UI
   - section type picker
   - drag reorder
   - duplicate/delete section
   - slug uniqueness check
   - template picker
   - mobile/desktop preview toggle
2. Support Center v2:
   - tickets table
   - status/priority/assignee
   - client/team comments
   - notification emails
3. Nodes/reminders v2:
   - real reminder CRUD
   - recurrence
   - snooze
   - email/WA due alerts
4. Invoice templates v2:
   - DB-backed CRUD
   - variable placeholders
   - preview
   - apply template to invoice
5. Calendar sync:
   - Google Calendar OAuth
   - Outlook sync
   - two-way updates
6. WhatsApp notifications:
   - provider selection
   - approved templates
   - retry/logging
7. Global bilingual polish:
   - extract full app dictionary
   - persist user/workspace language preference
8. QA pass:
   - credentialed browser test for newly added routes
   - public landing publish/unpublish cases
   - slug collision cases
