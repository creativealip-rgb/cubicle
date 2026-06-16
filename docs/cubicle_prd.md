# Cubicle / Kubikel — PRD

## Product Summary

Cubicle adalah client operation hub buat freelancer, agency kecil, konsultan, dan small team.

Core promise:
> Semua kerjaan client dari task sampai invoice dalam satu workspace.

## Target User

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

## Problem

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

## Solution

Cubicle gabungkan semua fungsi inti dalam satu app:
- internal workspace buat team
- client portal buat client
- project/task/files/time/invoice dalam relasi sama
- AI prompt generator terhubung ke project/client

## Tech Stack Decision

MVP tidak pakai Supabase.

Stack final:
- Next.js App Router
- TypeScript
- Tailwind CSS
- shadcn/ui
- Neon Postgres
- Drizzle ORM
- Better-Auth
- Cloudflare R2
- Server Actions
- Zod validation

Reason:
- Postgres schema tetap reusable
- Neon murah dan punya branching
- Drizzle type-safe dan portable
- Better-Auth handle auth tanpa vendor lock-in
- R2 cocok buat private file storage + signed URL

## MVP Objective

MVP harus membuktikan:
1. user bisa manage client work
2. client bisa lihat progress via portal
3. time bisa ditrack
4. invoice bisa dibuat dari billable time
5. prompt AI bisa bantu kerja kreatif

## MVP Scope Locked

### Must Have
- Auth
- Workspace
- Team member basic
- Client CRUD
- Project CRUD
- Task CRUD
- Task comments
- File upload via R2
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
- advanced role matrix
- white-label portal

## User Stories

### Owner
- As owner, gue bisa bikin workspace.
- As owner, gue bisa invite team.
- As owner, gue bisa bikin client.
- As owner, gue bisa bikin project untuk client.
- As owner, gue bisa share project ke client.
- As owner, gue bisa bikin invoice dari tracked time.
- As owner, gue bisa lihat unpaid invoice.
- As owner, gue bisa revoke portal/invoice token.

### Member
- As member, gue bisa lihat project assigned.
- As member, gue bisa update task.
- As member, gue bisa track time.
- As member, gue bisa upload file.
- As member, gue bisa comment di task.

### Viewer
- As viewer, gue bisa lihat workspace data yang boleh dibaca.
- As viewer, gue tidak bisa create/update/delete data.

### Client
- As client, gue bisa buka portal dari link.
- As client, gue bisa lihat project yang dishare.
- As client, gue bisa lihat task visible.
- As client, gue bisa download/upload file shared.
- As client, gue bisa comment dengan nama dan email.
- As client, gue bisa lihat invoice via shared link.
- As client, gue bisa booking appointment.

## Core Flow

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

## Security Model

Security detail ada di:
- `/root/projek/cubicle/docs/cubicle_security.md`
- `/root/projek/cubicle/docs/cubicle_rls.ts`

Engineering support docs:
- `/root/projek/cubicle/docs/cubicle_env.md`
- `/root/projek/cubicle/docs/cubicle_api_actions.md`
- `/root/projek/cubicle/docs/cubicle_acceptance_criteria.md`
- `/root/projek/cubicle/docs/cubicle_test_checklist.md`
- `/root/projek/cubicle/docs/cubicle_seed.md`

Core rules:
- tenant boundary = `workspace_id`
- every internal query must assert workspace membership
- every mutation must assert writable role
- owner/member can write
- viewer read-only
- portal/invoice tokens stored as SHA-256 hash only
- raw token shown once
- portal access logged
- R2 bucket private
- file downloads use short-lived signed URLs
- portal only sees visible/shared data
- internal notes/files/comments never visible in portal

## Non-Functional Requirements

Performance:
- dashboard should load under 2s for beta-size workspace
- common list pages should paginate after 50 rows

Security:
- token links rate-limited
- auth routes rate-limited
- file uploads size-limited
- all server actions validate input with Zod

Storage:
- max 25 MB per file in MVP
- private R2 bucket only
- signed download URL max 5 minutes
- soft workspace storage cap 5 GB

Timezone:
- store appointments in UTC
- render in viewer timezone
- availability rules store timezone explicitly

AI Usage:
- track model/tokens/cost per generation
- monthly workspace cap via env/config
- API key server-side only

Retention:
- activity logs kept 90 days
- portal access logs kept 90 days

## Success Metrics

Product:
- user creates 1 client
- user creates 1 project
- user tracks time
- user sends invoice
- client opens portal

Business:
- 5 beta users
- 3 active weekly
- 1 paid user
- 10 invoices generated
- 20 tasks completed

## Risks

### Scope terlalu besar
Mitigation:
- lock MVP ke client/project/task/time/invoice
- SMM/forms phase 2

### Permission rumit
Mitigation:
- role MVP cuma owner/member/viewer
- boolean visibility sederhana dulu
- role matrix advanced nanti

### App-layer RLS bug
Mitigation:
- centralize access guards in `cubicle_rls.ts`
- every query scoped by `workspace_id`
- add URL/id tampering tests

### Invoice legal/tax beda negara
Mitigation:
- generic invoice
- tax optional
- no accounting compliance claim

### Calendar integration makan waktu
Mitigation:
- booking internal dulu
- Google Calendar phase 2
- DB exclusion constraint prevents double booking

### AI cost
Mitigation:
- credit limit
- track token/cost
- prompt generator dulu
- content generator optional
