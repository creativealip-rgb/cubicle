# Cubicle / Kubikel — Dev Tasks

## Sprint 1 — Setup

Goal: project foundation siap tanpa Supabase.

Tasks:
- create Next.js app
- setup TypeScript
- setup Tailwind CSS
- setup shadcn/ui
- setup Neon Postgres project
- setup Drizzle ORM + migrations
- convert `cubicle_schema.sql` into Drizzle schema
- setup Better-Auth
- setup auth routes/actions
- setup Cloudflare R2 private bucket
- setup R2 client helper
- setup app-layer access guards from `cubicle_rls.ts`
- create app layout
- create sidebar/nav
- create protected route guard
- create login page
- create signup page
- create forgot password page
- create dashboard shell

Acceptance:
- user bisa signup/login/logout
- protected routes redirect kalau belum login
- dashboard layout muncul setelah login
- Neon connection works
- Drizzle migration runs clean
- Better-Auth session works
- R2 signed URL helper works in dev

## Sprint 2 — Workspace, Client, Project, Task

Goal: core PM jalan dengan tenant guard benar.

Tasks:
- create workspace integration
- create workspace onboarding
- create workspace switcher
- create workspace member helper
- enforce `assertWorkspaceMember` on every query
- enforce `assertWorkspaceWritable` on every mutation
- create clients list
- create client detail
- create client form
- create client update/archive
- create projects list
- create project detail
- create project form
- create project status update
- create tasks list
- create task detail/drawer
- create task form
- create task status update
- create task assignment
- create project progress calculation
- create activity log helper

Acceptance:
- user bisa bikin workspace
- user bisa bikin client
- user bisa bikin project dalam client
- user bisa bikin task dalam project
- user bisa update status task
- progress project otomatis dari task done
- user tidak bisa akses workspace lain via URL/id tampering

## Sprint 3 — Comments, Files, Time

Goal: operasi harian jalan.

Tasks:
- create comments integration
- create comment component
- support internal/client visibility
- portal comments require name + email
- setup R2 upload action
- enforce file size limit 25 MB
- enforce allowed mime list
- create files list
- create folder basic with depth <= 1
- support file visibility internal/client
- create file download route with signed R2 URL
- create manual time entry
- create timer start/stop
- use generated `duration_minutes` from DB
- support `manual_minutes` fallback for manual time entries
- create active timer UI
- create timesheet page
- create billable summary
- create CSV export

Acceptance:
- user bisa comment di project/task
- user bisa upload file ke R2 private bucket
- client-shared file ditandai
- download lewat signed URL only
- user bisa track time manual
- timer start/stop jalan
- timesheet summary muncul
- no bucket listing exposed

## Sprint 4 — Invoice + Client Portal

Goal: client sharing + money flow jalan.

Tasks:
- create invoice list
- create invoice detail
- create invoice form
- create invoice item CRUD
- create `workspace_invoice_counters` flow
- generate invoice number in transaction with row lock
- create `recalculateInvoice(invoiceId)`
- call recalculate after every invoice item mutation
- import billable time entries
- prevent duplicate import of same time entry
- mark imported time entries as invoiced
- create payment record
- create ledger summary
- generate invoice shared token hash
- generate client portal token hash
- support token expiry/revoke
- create PDF invoice export
- create public invoice token page
- create client portal page
- portal logs access to `portal_access_logs`
- portal shows shared projects
- portal shows visible tasks
- portal shows shared files
- portal shows shared/client comments
- portal hides internal notes/files/comments

Acceptance:
- invoice bisa dibuat
- invoice number unique per workspace
- invoice total benar after item create/update/delete
- billable time bisa masuk invoice
- same time entry tidak bisa dobel invoice
- invoice bisa di-share pakai token
- client portal cuma lihat shared data
- internal notes/files/comments tidak bocor
- raw token tidak tersimpan di DB

## Sprint 5 — Appointment, Prompt, Polish

Goal: MVP lengkap dan beta ready.

Tasks:
- create availability rules page
- create booking public page
- validate slot against availability rules
- prevent double booking via Postgres exclusion constraint
- create appointments list
- create email notification basic
- create prompt templates seed
- create prompt generator form
- integrate OpenAI-compatible API
- track model/tokens/cost
- enforce workspace AI monthly cap
- save prompt generations
- dashboard metrics
- activity log views
- loading states
- error states
- empty states
- responsive polish
- seed demo data
- deploy to Vercel

Acceptance:
- client bisa booking slot
- double booking rejected at DB level
- prompt generator jalan
- output bisa disimpan
- usage/cost tercatat
- dashboard metrics muncul
- app layak beta test

## Phase 2 Tasks

Do after MVP:
- forms builder
- SMM calendar
- social publishing API
- Google Calendar sync
- payment gateway
- e-sign
- automations
- advanced roles
- white-label client portal
- client_contacts UI
- deeper folder tree
- realtime chat
