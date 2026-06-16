# Cubicle / Kubikel — Product Plan

## 1. Product Summary

Cubicle adalah client operation hub buat freelancer, agency kecil, konsultan, dan small team.

Produk bantu user manage:
- client
- project
- task
- file
- time tracking
- invoice
- appointment
- prompt AI
- client portal

Core promise:
> Semua kerjaan client dari task sampai invoice dalam satu workspace.

## 2. Target User

Primary:
- freelancer
- design agency
- marketing agency
- social media manager
- copywriter
- consultant
- virtual assistant
- small service business

Secondary:
- startup internal team
- creator team
- project-based business

## 3. Problem

User sekarang pakai banyak tool:
- ClickUp/Asana buat project
- Google Drive buat file
- Clockify buat time
- invoice-generator buat invoice
- Google Calendar/Appointlet buat booking
- Notion/Todoist buat notes
- Chat/WA/email buat client communication
- ChatGPT buat prompt/content

Masalah:
- data kepisah
- client bingung harus buka banyak link
- invoice tidak nyambung ke time tracking
- file/task tidak rapi per client
- progress sulit dishare
- team kecil butuh tool simpel, bukan enterprise PM berat

## 4. Solution

Cubicle gabungkan semua fungsi inti dalam satu app:
- internal workspace buat team
- client portal buat client
- project/task/files/time/invoice dalam relasi sama
- AI prompt generator terhubung ke project/client

## 5. MVP Objective

MVP harus membuktikan:
1. user bisa manage client work
2. client bisa lihat progress via portal
3. time bisa ditrack
4. invoice bisa dibuat dari billable time
5. prompt AI bisa bantu kerja kreatif

## 6. MVP Scope Locked

### Must Have
- Auth
- Workspace
- Team member basic
- Client CRUD
- Project CRUD
- Task CRUD
- Task comments
- File upload
- Time tracking
- Invoice
- PDF invoice
- Client portal token
- Appointment booking basic
- Prompt generator basic
- Dashboard metrics

### Should Have
- Email invite
- Activity log
- Export CSV time
- Invoice shared link
- Prompt save to project

### Not MVP
- full SMM publisher
- forms builder advanced
- payment gateway
- Google Calendar sync
- WhatsApp integration
- e-sign legal
- automation builder
- realtime chat full
- mobile app

## 7. User Stories

### Owner
- As owner, gue bisa bikin workspace.
- As owner, gue bisa invite team.
- As owner, gue bisa bikin client.
- As owner, gue bisa bikin project untuk client.
- As owner, gue bisa share project ke client.
- As owner, gue bisa bikin invoice dari tracked time.
- As owner, gue bisa lihat unpaid invoice.

### Member
- As member, gue bisa lihat project assigned.
- As member, gue bisa update task.
- As member, gue bisa track time.
- As member, gue bisa upload file.
- As member, gue bisa comment di task.

### Client
- As client, gue bisa buka portal dari link.
- As client, gue bisa lihat project yang dishare.
- As client, gue bisa lihat task visible.
- As client, gue bisa download/upload file shared.
- As client, gue bisa comment.
- As client, gue bisa lihat invoice.
- As client, gue bisa booking appointment.

## 8. Core Flow

### Internal Workflow
1. User login
2. Create workspace
3. Add client
4. Create project
5. Create tasks
6. Assign team
7. Track time
8. Upload deliverables
9. Share selected items to client portal
10. Generate invoice
11. Send invoice link

### Client Workflow
1. Client buka portal link
2. Lihat project progress
3. Review tasks/files
4. Comment/approve
5. Book meeting
6. View invoice

## 9. Page Map

```text
/
/login
/signup
/forgot-password
/booking/[slug]
/client-portal/[token]

/app/dashboard
/app/clients
/app/clients/[clientId]
/app/clients/[clientId]/projects
/app/clients/[clientId]/files
/app/projects
/app/projects/[projectId]
/app/projects/[projectId]/tasks
/app/projects/[projectId]/files
/app/projects/[projectId]/time
/app/tasks
/app/files
/app/time
/app/invoices
/app/invoices/[invoiceId]
/app/calendar
/app/prompts
/app/settings
/app/settings/team
/app/settings/workspace
```

## 10. Data Schema Draft

Canonical schema sekarang ada di:
- `/root/projek/cubicle/docs/cubicle_schema.sql`

Target stack:
- Neon Postgres
- Drizzle ORM
- Better-Auth
- Cloudflare R2

Key schema decisions:
- Better-Auth owns `users`, `sessions`, `accounts`, `verifications`.
- Cubicle tables reference `users(id)` as `text`.
- `workspace_id` remains tenant boundary.
- roles MVP: `owner`, `member`, `viewer`.
- client/invoice tokens stored as SHA-256 hash only.
- `time_entries.duration_minutes` is generated from `start_time`/`end_time`, or `manual_minutes` fallback for manual entries.
- invoice number generation uses `workspace_invoice_counters` with transaction row lock.
- appointments use Postgres exclusion constraint to prevent double booking.
- prompt generations track `model`, `input_tokens`, `output_tokens`, `cost_usd`.
- file records store R2 `storage_key`, not Supabase storage path.
- portal access logging lives in `portal_access_logs`.

## 11. Access Control Plan

Canonical security/access docs:
- `/root/projek/cubicle/docs/cubicle_security.md`
- `/root/projek/cubicle/docs/cubicle_rls.ts`

Supporting engineering docs:
- `/root/projek/cubicle/docs/cubicle_env.md`
- `/root/projek/cubicle/docs/cubicle_api_actions.md`
- `/root/projek/cubicle/docs/cubicle_acceptance_criteria.md`
- `/root/projek/cubicle/docs/cubicle_test_checklist.md`
- `/root/projek/cubicle/docs/cubicle_seed.md`
- `/root/projek/cubicle/docs/cubicle_decisions.md`

No Supabase RLS. Access control is app-layer through shared guards.

Internal rules:
- every internal route requires Better-Auth session
- every query must assert workspace membership
- every mutation must assert writable role
- every query/mutation must include `workspace_id`
- parent-child IDs must be validated in same workspace

Portal rules:
- raw token from URL only
- store token hash only
- token can expire/revoke
- log every access
- portal sees only:
  - `projects.client_visible = true`
  - `tasks.client_visible = true`
  - `files.visibility = 'client'`
  - `comments.visibility = 'client'`
  - invoice via valid shared token

R2 file rules:
- private bucket only
- short-lived signed URLs only
- no bucket listing
- object key format: `workspaces/{workspaceId}/files/{fileId}/{safeFilename}`

## 12. Wireframe Basic

### Dashboard

```text
[Topbar: Workspace | Search | User]

Cards:
[Active Clients] [Active Projects] [Due Tasks] [Unpaid Invoices]

Today:
- Tasks due today
- Upcoming appointments
- Active timer

Recent Activity:
- Client comments
- Uploaded files
- Invoice status
```

### Client Detail

```text
Client Header:
Name, status, portal toggle, invite/share button

Tabs:
Overview | Projects | Files | Invoices | Appointments | Notes

Overview:
- contact info
- active projects
- unpaid invoices
- recent activity
```

### Project Detail

```text
Project Header:
Name, client, status, due date, progress, share toggle

Tabs:
Overview | Tasks | Files | Time | Comments

Tasks:
Kanban: Todo | In Progress | Review | Done
```

### Time Page

```text
Timer card:
Client select | Project select | Task select | Start/Stop

Timesheet table:
Date | User | Client | Project | Description | Duration | Billable | Status
```

### Invoice Page

```text
Invoice header:
Client | Invoice number | Issue date | Due date | Status

Line items:
Description | Qty | Rate | Amount

Actions:
Add item | Import time | Generate PDF | Share | Mark paid
```

### Prompt Generator

```text
Template select:
Social caption | Copywriting | Email | Design brief | Video script | Presentation

Form:
Goal, audience, tone, platform, key points, CTA, language

Output:
Generated prompt
Generated content
Save to project
Copy
```

## 13. Dev Task Breakdown

Canonical sprint tasks sekarang ada di:
- `/root/projek/cubicle/docs/cubicle_dev_tasks.md`

Acceptance and QA docs:
- `/root/projek/cubicle/docs/cubicle_acceptance_criteria.md`
- `/root/projek/cubicle/docs/cubicle_test_checklist.md`
- `/root/projek/cubicle/docs/cubicle_seed.md`

### Sprint 1 — Setup
- create Next.js app
- setup Tailwind/shadcn
- setup Neon + Drizzle
- setup Better-Auth
- setup R2 private bucket
- setup app-layer access guards
- auth pages
- app layout
- sidebar
- protected routes

### Sprint 2 — Workspace/Client/Project/Task
- workspace create
- workspace member check
- enforce workspace-scoped guards
- client CRUD
- project CRUD
- task CRUD
- task status update
- project progress calc

### Sprint 3 — Comments/Files/Time
- comments polymorphic
- R2 upload + signed download
- file visibility
- time entry manual
- timer start/stop
- timesheet summary

### Sprint 4 — Invoice/Portal
- invoice CRUD
- invoice number counter
- invoice item recalc
- import billable time
- PDF export
- hashed shared invoice link
- hashed client portal token view
- portal access logs

### Sprint 5 — Appointment/Prompt/Polish
- availability rules
- booking page
- DB-level double-booking prevention
- appointments
- prompt templates
- OpenAI-compatible API integration
- AI usage/cost tracking
- dashboard metrics
- deploy

## 14. Cursor / Claude Code Prompt

Canonical build prompt sekarang ada di:
- `/root/projek/cubicle/docs/cubicle_cursor_prompt.md`

Canonical UI/UX direction:
- `/root/projek/cubicle/docs/cubicle_uiux.md`

Key guardrails:
- Do NOT use Supabase.
- Use Neon Postgres + Drizzle + Better-Auth + Cloudflare R2.
- Use `/root/projek/cubicle/docs/cubicle_schema.sql`.
- Use `/root/projek/cubicle/docs/cubicle_rls.ts`.
- Use `/root/projek/cubicle/docs/cubicle_security.md`.
- Every internal query must be workspace-scoped.
- Portal/invoice tokens must be hashed in DB.
- R2 bucket private, download via signed URLs only.
- Invoice totals recalc after every item mutation.
- Appointment double-booking blocked at DB level.

## 15. Design & Engineering Decisions

### Workspace Onboarding
- after signup, redirect to `/app/onboarding`
- user creates workspace (name + slug)
- system auto-adds user as `owner` in `workspace_members`
- if user already invited to workspace, show option to skip creation and enter existing workspace
- workspace switcher: dropdown in topbar

### Team Invite
- MVP includes invite via shareable link
- owner generates invite link with role preset
- link opens signup/login flow, auto-joins workspace
- email invite is Should Have (not blocking MVP)

### Timer Collision
- only one running timer per user per workspace (enforced by partial unique index)
- starting new timer auto-stops previous running timer
- UI shows warning before auto-stop

### PDF Invoice Library
- use `@react-pdf/renderer` — React components to PDF, no headless browser needed
- lightweight, server-side compatible, good shadcn/ui integration pattern

### Notifications (MVP minimal)
- no realtime push in MVP
- email notifications for critical events only:
  - portal comment received
  - appointment booked
  - invoice viewed (via portal access log)
- use simple email via Resend or nodemailer
- in-app notification feed: phase 2

### Search Scope
- MVP: per-page filter only (search input filters current list client-side)
- global search (cmd+k): phase 2
- no full-text search index needed for MVP

### Kanban DnD
- use `@dnd-kit/core` + `@dnd-kit/sortable`
- modern, accessible, maintained
- MVP: drag task between status columns only
- reorder within column updates `position` field

### Dark Mode
- MVP: light only
- Tailwind dark mode classes can be added phase 2
- no dark palette needed now

### Bulk Actions
- not MVP
- phase 2: select multiple tasks/time entries/files for batch operations

### Currency Formatting
- use `Intl.NumberFormat` with workspace `default_currency`
- invoice uses its own `currency` field (can differ from workspace default)
- no multi-currency conversion — just formatting

### Responsive Cards
- tables switch to card layout below `md` breakpoint (768px)
- card shows: primary info bold, secondary info muted, action menu
- pattern: use `<TableCard>` wrapper that renders table on desktop, cards on mobile

### Loading Pattern
- use shadcn `Skeleton` shimmer for page loads
- use spinner for action buttons (submit/save)
- progressive: show shell immediately, skeleton for data areas

## 16. Original Excel Source

Source file:
`/root/projek/cubicle/docs/doc_06e305a08a7d_Cubicle Plan_2026.xlsx`

Extracted feature list:

| No | Module | Reference | Notes | Sharing |
|---:|---|---|---|---|
| 1 | Project/Client Management | ClickUp/Asana | Folders, Client Spaces, chat, ttd | Able to share with client/team |
| 2 | Time Tracking | Clockify/MyHours |  | Able to share with client/team |
| 3 | Appointment Scheduling | Appointlet | Calendar | Share client/team |
| 4 | Personal Management | Todoist/Notion | Notes/Journal | Share client/team |
| 5 | Invoicing | https://invoice-generator.com/?locale=en | Ledger |  |
| 6 | Forms |  |  |  |
| 7 | Prompt Generator | Design | Socmed, Copywriting, Email marketing design, Video, presentasi |  |
| 8 | Social Media Management |  | Calendar SMM |  |

Notes from sheet:
- `ai`
- `emai` kemungkinan typo `email`
