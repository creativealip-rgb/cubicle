# Cubiqlo Full Feature Status

Last updated: 2026-07-24
Live app: https://app.cubiqlo.com
Latest verified branch: `fix/navbar-notification-dashboard-reminders`

## Status legend

- `DONE` — shipped, deployed, usable.
- `PARTIAL` — shipped basic version; needs deeper UX/automation/data model.
- `PROCESS` — in progress or planned next.
- `TODO` — not started / not verified.

## Deployment + health

| Area | Status | Notes |
| --- | --- | --- |
| Production domain | DONE | `https://app.cubiqlo.com` live over HTTPS; apex keeps public/redirect behavior. |
| Docker deploy | DONE | `cubicle-cubicle-1` rebuild/recreate flow works. |
| Database | DONE | Postgres container healthy. |
| Health endpoint | DONE | `/api/health` returns `{"status":"ok","db":"ok"}`. |
| Protected app routing | DONE | `/app/*` redirects unauthenticated users to `/login?redirect=...`. |
| Git checkpoint | DONE | Latest calendar implementation pushed: `7194c74 fix: harden calendar booking experience` on `fix/navbar-notification-dashboard-reminders`. |

## Core app shell

| Feature | Route/File | Status | Notes |
| --- | --- | --- | --- |
| App shell sidebar/topbar | `/app/*` | DONE | Grouped sidebar, workspace dropdown, global search entry, compact create button on dense pages, timer, notifications. Penjualan hidden; Paket labeled Service. |
| Auth login/signup/reset | `/login`, `/signup`, `/forgot-password`, `/reset-password` | DONE | Basic auth flow live. |
| Workspace context | `active_workspace_id` cookie + workspace helpers | DONE | Auto-bootstrap and membership checks exist. |
| Dashboard | `/app/dashboard` | DONE | `Perlu ditangani` action queue groups urgent, waiting-action, and scheduled reminders. Greeting date-only. Due/timer not duplicated (dashboard + topbar). |
| Notifications | `/api/notifications` | PARTIAL | Bell is event inbox only. Dashboard-only recurring urgency (`invoice_overdue`, `task_due_soon`) is excluded from bell list/unread counts; deeper WA/push automation pending. |

## Client operations

| Feature | Route | Status | Notes |
| --- | --- | --- | --- |
| Clients list | `/app/clients` | DONE | v0.1.114: compact zebra list, portal status/action, no redundant row actions, Excel export. |
| Client create | `/app/clients/new`, `/api/clients/create` | DONE | Dedicated non-modal fallback created. |
| Client detail | `/app/clients/[clientId]` | DONE | v0.1.114: Ringkasan removed, Portal kept, default tab Proyek, invoice/project cards actionable. |
| Client Excel export | `/api/clients/[clientId]/export/xlsx`, `/api/clients/export/xlsx` | DONE | v0.1.114: workspace resolve hardened; list/detail export XLSX. PDF buttons hidden from client UI. |
| Client portal token route | `/client-portal/[token]` | DONE | Tabs Overview/Projects/Folders/Invoices/Contact; workspace branding header; Folders upload via `POST /api/client-portal/files/upload`. |
| Short client portal slug UX | Client form / portal fields | DONE | Auto slug generation and cleanup in client form. |
| Portal access audit | `portal_visits` | PARTIAL | Schema exists; deeper analytics/reporting pending. |

## Projects + tasks

| Feature | Route | Status | Notes |
| --- | --- | --- | --- |
| Projects list | `/app/projects` | DONE | v0.1.114: compact zebra list, Review status, due-date context, client link, simplified client-only filter, progress % inside bar. |
| Project billing type + dates | project form/schema | DONE | Supports `by project` / `by hours`, start date, finish date. |
| Project detail | `/app/projects/[projectId]` | DONE | Detail page with related data. |
| Tasks | `/app/tasks` | DONE | v0.1.114: compact list, Review status, tenggat context, status as dropdown, assignee filter uses Saya, list/board toggle retained. |
| Project timeline | Project detail + portal | DONE | Internal timeline and client-safe visibility shipped earlier. |
| Nodes/reminder center | `/app/nodes` | REMOVED | Removed from sidebar and route because meeting clarified this should be Notes/reminders. |

## Time tracking + reports

| Feature | Route/API | Status | Notes |
| --- | --- | --- | --- |
| Time tracking | `/app/time` | DONE | v0.1.114: clarified Tasks vs Timer split, compact timer card, mobile-safe manual-entry dialog, timesheet list matches shared density/zebra pattern. |
| Time tags | time entry forms/table | DONE | Project > Task > Tag detail added with default/custom tag support. |
| Time CSV export | Existing time export | DONE | Existing export supported. |
| Time PDF export | `/api/time/export/pdf` | DONE | PDF dashboard/detailed report options added; unauthenticated returns `401` instead of `500`. |
| Reports | `/app/reports` | DONE | Collection health and P&L/report basics exist. |

## Finance + invoices

| Feature | Route/API | Status | Notes |
| --- | --- | --- | --- |
| Invoices list | `/app/invoices` | DONE | v0.1.114: compact shared list density with visible separators/zebra. |
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
| Proposals list/detail/new | `/app/proposals`, `/app/proposals/new`, `/app/proposals/[proposalId]` | DONE | v0.1.114: compact list density; earlier v0.1.32 status tabs, activity date fix, detail i18n, DP/valid meta, send/resend+copy, delete guard. |
| Public proposal | `/proposal/[token]` | DONE | Public token page exists. |
| Template Center | `/app/templates` (+ editor `/app/contract-templates/new|[id]`) | DONE | v0.1.37: tab Proposal + tabs kiri; invoice/proposal/contract CRUD; prompt tab soon. |
| Contracts list/detail | `/app/contracts`, `/app/contracts/[contractId]` | DONE | v0.1.114: compact list density; earlier v0.1.33 status tabs, activity date fix, detail i18n, send/resend+copy, revoke, delete guard. |
| Public contract | `/contract/[token]` | DONE | Public token page exists. |
| Contract template editor | `/app/contract-templates/new|[id]` | DONE | List page removed (redirect to Template Center). Full editor kept. |
| Questionnaires | `/app/questionnaires` | DONE | v0.1.114: compact shared list density; questionnaire routes exist. |
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
| Calendar | `/app/calendar` | DONE | v0.1.115: localized availability form, end-time validation, destructive-action confirmations, larger touch targets, and explicit **Unduh .ics** action. |
| Public booking | `/booking/[slug]` | DONE | v0.1.115: Indonesian copy, visible IANA timezone, timezone-correct slot display, responsive date controls, and 2/3-column slot grid. |
| Booking slot computation | `getAvailableSlots` | DONE | Availability rule local time is converted from its IANA timezone to UTC before overlap checks; booked-range query uses true rule window. |
| ICS invite | `/api/calendar/[appointmentId]/ics` | DONE | `.ics` calendar invite route works; live download returned valid VCALENDAR content during QA. |
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
| Unified Template Center | `/app/templates` | DONE | Invoice+proposal+contract hub; apply-template on create form still TODO; prompt tab soon. |

## Personal workspace + landing pages

| Feature | Route | Status | Notes |
| --- | --- | --- | --- |
| Personal notes | `/app/personal` | DONE | v0.1.28–0.1.30: tabs open/done/archived/all, pin, overdue, recurrence select + auto-roll, cron 7d/3d/1d dedupe, convert→task (priority), reverse link, infinite load-more, hide `[journal]`/`[site]`. |
| Journal | `/app/journal` | DONE | v0.1.31: tabs Aktif/Arsip, create+edit+archive+restore+delete, mood/tag i18n, search/filter/export; uses `[journal]` prefix notes. |
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
| Settings | `/app/settings` | DONE | Tabbed: Workspace / Tim / Branding & Invoice / Integrasi / Lainnya (`?tab=`). |
| Team settings | `/app/settings?tab=team` | DONE | Invite, role, remove member inside settings Tim tab. |
| Workspace settings | `/app/settings` | DONE | Workspace info on default tab; branding + Reply-To on Branding tab. |
| Reply-To branding | `resolveWorkspaceReplyTo` | DONE | replyTo → billingEmail → owner; used by outbound mail + portal contact. |
| Env audit | `/api/health/env` | DONE | Guarded and secret-safe from earlier hardening. |
| Smoke tests | `scripts/smoke.mjs` | DONE | Smoke script exists. |
| Backups/monitoring | docs/ops + cron | DONE | Documented active ops jobs from prior phase. |

## Current verified live checks — 2026-07-22 (v0.1.98)

```text
Live cubiqlo.com healthy · app v0.1.98
Dashboard: greeting date-only · Kerja = Klien/Proyek · no due KPI cards · no timer card
Settings tabs: ?tab=team|branding|integrations|more · Reply-To on branding
Client portal: branding header · tabs · Folders upload POST /api/client-portal/files/upload
```

## Current verified live checks — 2026-07-15 (notes polish v0.1.30)

```text
/api/health -> 200 healthy · app bundle 0.1.30
/app/personal tabs open/done/archived/all · load-more · convert priority · reverse link
/app/tasks?focus= opens sheet + Dari catatan label
```

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
