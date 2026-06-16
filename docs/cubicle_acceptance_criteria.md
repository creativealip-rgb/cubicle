# Cubicle / Kubikel — MVP Acceptance Criteria

This doc defines done criteria for MVP. If every section passes, Cubicle is beta-ready.

## 1. Product Acceptance

MVP proves:
1. user can manage client work in one workspace.
2. client can see selected progress through portal.
3. team can track time against client/project/task.
4. invoice can be created from billable time.
5. prompt generator helps creative/service work.

## 2. Sprint 1 Done — Foundation

Done when:
- Next.js App Router app runs locally.
- TypeScript strict enough for app code.
- Tailwind + shadcn/ui configured.
- Neon connection works.
- Drizzle schema/migration created from `cubicle_schema.sql`.
- Better-Auth signup/login/logout/forgot password works.
- Cloudflare R2 client helper can generate signed URL in dev.
- app shell exists with sidebar/topbar.
- `/app/*` protected by auth.
- unauthenticated access redirects to login.
- first login without workspace redirects to onboarding.

## 3. Sprint 2 Done — Core Work Management

Done when:
- user can create workspace.
- creator becomes owner.
- owner can invite member/viewer via invite link.
- workspace switcher works.
- owner/member can create/update/archive clients.
- owner/member can create/update/archive projects.
- owner/member can create/update/delete tasks.
- member can update assigned work.
- viewer can read allowed data but cannot mutate.
- task assignment only allows workspace members.
- project progress calculates from done tasks.
- URL/id tampering cannot cross workspace boundary.

## 4. Sprint 3 Done — Daily Ops

Done when:
- comments work on project/task/file/invoice entities.
- comment visibility internal/client enforced.
- file upload stores object in private R2 bucket.
- file download uses guarded signed URL.
- file visibility internal/client enforced.
- manual time entry works.
- start/stop timer works.
- one running timer per user/workspace enforced.
- timesheet shows duration, billable flag, status.
- CSV export works and stays workspace-scoped.
- dashboard active timer card works.

## 5. Sprint 4 Done — Money + Portal

Done when:
- invoice CRUD works.
- invoice number unique per workspace and generated transactionally.
- invoice item add/update/delete recalculates totals.
- billable time can be imported into invoice.
- duplicate time import blocked.
- imported time entries marked `invoiced`.
- payment record can mark invoice paid.
- PDF invoice generated server-side.
- invoice shared link works with hashed token.
- client portal token works with hashed token.
- token expiry/revoke works.
- portal access logs written.
- portal shows only shared projects/tasks/files/comments.
- portal hides internal notes/files/comments and hidden projects/tasks.

## 6. Sprint 5 Done — Booking + AI + Polish

Done when:
- availability rules can be configured.
- public booking page shows available slots.
- booking creates appointment in UTC.
- double booking blocked by app validation and DB exclusion constraint.
- appointment booked email sent if provider configured.
- prompt templates exist.
- prompt generator calls OpenAI-compatible API.
- model/tokens/cost tracked.
- monthly workspace AI cap enforced.
- prompt output can be saved to project.
- dashboard metrics work.
- loading/error/empty states implemented.
- mobile responsive layout works for core pages.
- app deployed to Vercel or target host.

## 7. Security Acceptance

Must pass:
- no internal workspace data exposed across tenant boundary.
- every internal query has workspace membership guard.
- every mutation has writable/owner guard.
- viewer role read-only.
- portal/invoice raw tokens never stored.
- token routes rate-limited.
- R2 bucket private.
- signed URLs short-lived.
- no bucket listing exposed.
- no server secret exposed to client bundle.
- all server actions validate input with Zod.

## 8. Data Acceptance

Must pass:
- `workspace_id` exists on tenant-scoped tables.
- Better-Auth user id type matches all references.
- invoice totals correct after all item mutations.
- time duration generated correctly.
- appointment overlap blocked at DB level.
- important actions write `activity_logs`.
- portal/invoice views write `portal_access_logs`.

## 9. UX Acceptance

Must pass:
- navigation clear: Dashboard, Clients, Projects, Tasks, Files, Time, Invoices, Calendar, Prompts, Settings.
- client-centric hierarchy clear: Client → Project → Task/Files/Time/Invoice.
- dashboard answers “what needs attention today?”
- tables turn into cards on mobile.
- action buttons show loading state.
- empty states guide user to next action.
- errors show clear recovery path.

## 10. Beta Release Gate

Beta can ship when:
- all sprint acceptance sections pass.
- test checklist passes critical security cases.
- seed data demo runs clean.
- production deploy smoke test passes.
- owner can run full workflow:

```text
signup → create workspace → add client → add project → add task → upload file → track time → create invoice → share portal/invoice link
```

- client can run portal workflow:

```text
open portal → review visible project/task/file/comment → comment → open invoice link → book appointment
```
