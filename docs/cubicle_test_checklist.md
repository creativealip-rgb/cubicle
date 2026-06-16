# Cubicle / Kubikel — Test & QA Checklist

Use this before beta release and after every big sprint merge.

## 1. Auth

- [ ] user can sign up with email/password.
- [ ] user can login/logout.
- [ ] forgot password flow sends email.
- [ ] unauthenticated user redirected from `/app/*` to login.
- [ ] authenticated user cannot access login/signup without redirect to app.
- [ ] session persists after refresh.
- [ ] session expires correctly.

## 2. Workspace / Tenant Isolation

- [ ] new user can create workspace during onboarding.
- [ ] creator becomes `owner` in `workspace_members`.
- [ ] user can switch workspace.
- [ ] user cannot access another workspace by changing URL params.
- [ ] user cannot mutate another workspace by tampering form payload.
- [ ] every list query only returns current workspace data.
- [ ] owner can invite member/viewer.
- [ ] viewer cannot create/update/delete.
- [ ] last owner cannot be removed/downgraded.

## 3. Clients / Projects / Tasks

- [ ] owner/member can create client.
- [ ] client can be archived.
- [ ] owner/member can create project under client.
- [ ] project must belong to same workspace as client.
- [ ] owner/member can create task under project.
- [ ] task assignee must be workspace member.
- [ ] task status update works.
- [ ] Kanban drag changes status and position.
- [ ] project progress updates from completed tasks.
- [ ] client visibility toggle affects portal output.

## 4. Comments

- [ ] internal comment visible only to internal users.
- [ ] client-visible comment visible in portal.
- [ ] portal comment requires author name/email.
- [ ] portal comment saved as `source = portal`.
- [ ] portal comment saved as `visibility = client`.
- [ ] portal cannot comment on hidden task/project/file.

## 5. Files / R2

- [ ] file upload works for allowed mime type.
- [ ] file larger than 25 MB rejected.
- [ ] blocked mime type rejected.
- [ ] R2 bucket remains private.
- [ ] DB stores `storage_key`, not public URL.
- [ ] download route returns signed URL only after guard.
- [ ] signed URL expires within 5 minutes.
- [ ] user cannot download other workspace file.
- [ ] portal can download only `visibility = client` files.
- [ ] portal cannot list bucket or infer hidden files.

## 6. Time Tracking

- [ ] manual time entry works.
- [ ] timer start creates running entry.
- [ ] timer stop sets `end_time`.
- [ ] DB computes `duration_minutes`.
- [ ] one running timer per user/workspace enforced.
- [ ] starting new timer auto-stops previous only after UI warning/confirmation.
- [ ] time entry can be billable/non-billable.
- [ ] CSV export respects filters and workspace.
- [ ] invoiced time entry cannot be edited/deleted by normal member.

## 7. Invoices

- [ ] invoice can be created for client.
- [ ] invoice number unique per workspace.
- [ ] invoice number generated in transaction with row lock.
- [ ] invoice item create/update/delete recalculates totals.
- [ ] tax/discount/subtotal/total correct.
- [ ] billable time import works.
- [ ] same time entry cannot be imported twice.
- [ ] imported time entries marked `invoiced`.
- [ ] PDF export works server-side.
- [ ] sent/paid invoice cannot be hard deleted.
- [ ] payment record can mark invoice paid.

## 8. Shared Tokens / Portal

- [ ] client portal token raw value shown once.
- [ ] portal token stored as SHA-256 hash only.
- [ ] revoked portal token fails.
- [ ] expired portal token fails.
- [ ] disabled portal fails.
- [ ] portal access logged.
- [ ] portal shows only visible projects.
- [ ] portal shows only visible tasks under visible projects.
- [ ] portal shows only client-visible comments/files.
- [ ] portal never exposes `clients.internal_notes`.
- [ ] invoice shared token raw value shown once.
- [ ] invoice shared token stored as SHA-256 hash only.
- [ ] revoked/expired invoice token fails.
- [ ] token routes rate-limited.

## 9. Appointment Booking

- [ ] booking page opens via workspace `booking_slug`.
- [ ] availability rules generate correct slots.
- [ ] booking outside availability rejected.
- [ ] double booking rejected by app validation.
- [ ] double booking rejected by Postgres exclusion constraint.
- [ ] appointment stored in UTC.
- [ ] confirmation email sent if email provider configured.

## 10. Prompt Generator

- [ ] template list loads.
- [ ] generation works with configured OpenAI-compatible API.
- [ ] API key never reaches client.
- [ ] selected model allowed server-side.
- [ ] model/input_tokens/output_tokens/cost_usd stored.
- [ ] monthly workspace cap enforced.
- [ ] generated output can be saved to project.
- [ ] prompt history workspace scoped.

## 11. Dashboard / UX

- [ ] dashboard loads under 2s for seed dataset.
- [ ] KPI cards correct.
- [ ] upcoming appointments correct.
- [ ] unpaid invoices correct.
- [ ] active timer card correct.
- [ ] loading skeletons show during data load.
- [ ] action buttons show spinner while submitting.
- [ ] empty states clear and useful.
- [ ] error states show retry/back path.
- [ ] mobile layout uses drawer/sidebar and table cards.

## 12. Production Smoke Test

- [ ] deploy succeeds.
- [ ] migrations run clean on production DB.
- [ ] auth callback/session works on production domain.
- [ ] R2 upload/download works.
- [ ] email sends from verified domain.
- [ ] portal link works in incognito.
- [ ] invoice PDF downloads in incognito via shared token.
- [ ] no server secret appears in browser bundle or HTML.
