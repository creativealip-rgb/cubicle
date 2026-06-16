# Cubicle / Kubikel — Server Actions & Route Contract

Rule umum:
1. all mutation inputs use Zod.
2. internal routes/actions require Better-Auth session.
3. workspace data must pass `assertWorkspaceMember` before read.
4. mutations must pass `assertWorkspaceWritable` or `assertWorkspaceOwner`.
5. never trust `workspaceId`, `clientId`, `projectId`, `taskId`, `invoiceId` from form without loading parent scoped by `workspace_id`.
6. important mutations write `activity_logs`.
7. public token routes hash raw token server-side before DB query.

## 1. Auth / Workspace

| Action | Input | Guard | Notes |
|---|---|---|---|
| `createWorkspace` | `name`, `slug` | auth | creates workspace + owner membership |
| `updateWorkspace` | `workspaceId`, billing fields | owner | billing/default settings only owner |
| `switchWorkspace` | `workspaceId` | member | store current workspace in cookie/session preference |
| `createInviteLink` | `workspaceId`, `role` | owner | role preset: member/viewer |
| `acceptInvite` | `inviteToken` | auth | hash token, join workspace |
| `removeMember` | `workspaceId`, `memberId` | owner | owner cannot remove self if last owner |
| `changeMemberRole` | `workspaceId`, `memberId`, `role` | owner | must keep at least one owner |

## 2. Clients

| Action | Input | Guard | Activity |
|---|---|---|---|
| `createClient` | `workspaceId`, client fields | writable | yes |
| `updateClient` | `workspaceId`, `clientId`, fields | writable + client in workspace | yes |
| `archiveClient` | `workspaceId`, `clientId` | writable + client in workspace | yes |
| `generateClientPortalToken` | `workspaceId`, `clientId`, expiry | writable | yes |
| `revokeClientPortalToken` | `workspaceId`, `clientId` | writable | yes |

Client rules:
- archive default, not hard delete.
- raw portal token shown once.
- DB stores SHA-256 hash only.

## 3. Projects

| Action | Input | Guard | Activity |
|---|---|---|---|
| `createProject` | `workspaceId`, `clientId`, fields | writable + client in workspace | yes |
| `updateProject` | `workspaceId`, `projectId`, fields | writable + project in workspace | yes |
| `archiveProject` | `workspaceId`, `projectId` | writable + project in workspace | yes |
| `setProjectClientVisible` | `workspaceId`, `projectId`, visible | writable | yes |
| `addProjectMember` | `workspaceId`, `projectId`, userId | writable | yes |
| `removeProjectMember` | `workspaceId`, `projectId`, userId | writable | yes |

Project progress:
- `done_tasks / total_tasks * 100`.
- if no tasks, progress = 0.

## 4. Tasks

| Action | Input | Guard | Activity |
|---|---|---|---|
| `createTask` | `workspaceId`, `projectId`, fields | writable + project in workspace | yes |
| `updateTask` | `workspaceId`, `taskId`, fields | writable + task in workspace | yes |
| `updateTaskStatus` | `workspaceId`, `taskId`, status | writable | yes |
| `reorderTask` | `workspaceId`, `taskId`, status, position | writable | no/optional |
| `assignTask` | `workspaceId`, `taskId`, userId | writable + assignee member | yes |
| `deleteTask` | `workspaceId`, `taskId` | writable | yes |

Rules:
- assignee must be workspace member.
- Kanban DnD updates status + position.
- client can only see tasks with `client_visible = true` under visible project.

## 5. Comments

| Action | Input | Guard | Activity |
|---|---|---|---|
| `createInternalComment` | `workspaceId`, entity, body, visibility | writable + entity in workspace | yes |
| `deleteComment` | `workspaceId`, commentId | writable + comment in workspace | yes |
| `createPortalComment` | token, entity, body, author name/email | valid portal token + visible entity | yes |

Rules:
- internal comments default `visibility = internal`.
- portal comments always `source = portal`, `visibility = client`.
- portal comment requires `author_name` and `author_email`.

## 6. Files

| Action/Route | Input | Guard | Notes |
|---|---|---|---|
| `createUploadUrl` | `workspaceId`, client/project/folder, filename, mime, size | writable + parent in workspace | pre-signed PUT or server upload |
| `completeUpload` | file metadata | writable | creates file row |
| `updateFileVisibility` | `workspaceId`, fileId, visibility | writable + file in workspace | activity |
| `deleteFile` | `workspaceId`, fileId | writable + file in workspace | delete DB row + R2 object |
| `GET /api/files/[fileId]/download` | fileId | member or valid portal | returns short-lived signed URL |

Rules:
- max 25 MB MVP.
- allowlist mime types.
- no bucket listing.
- `files.storage_key` only stores R2 key.

## 7. Time Tracking

| Action | Input | Guard | Notes |
|---|---|---|---|
| `startTimer` | `workspaceId`, clientId, projectId, taskId?, description? | writable + parents in workspace | auto-stop previous running timer after UI warning |
| `stopTimer` | `workspaceId`, timeEntryId | writable + own/open timer | sets `end_time` |
| `createManualTimeEntry` | fields + `manual_minutes` | writable | status draft |
| `updateTimeEntry` | fields | writable | blocked if status `invoiced` unless owner unlock policy |
| `deleteTimeEntry` | id | writable | blocked if invoiced |
| `exportTimeCsv` | filters | member | filtered by workspace |

Rules:
- DB enforces one running timer per user/workspace.
- `duration_minutes` generated by DB.
- invoiced time entry cannot be double imported.

## 8. Invoices

| Action | Input | Guard | Notes |
|---|---|---|---|
| `createInvoice` | `workspaceId`, clientId, dates, terms | writable | invoice number via transaction + row lock |
| `updateInvoice` | fields | writable + invoice in workspace | no edit paid total unless owner |
| `addInvoiceItem` | invoiceId, item | writable | calls `recalculateInvoice` |
| `updateInvoiceItem` | item fields | writable | calls `recalculateInvoice` |
| `deleteInvoiceItem` | itemId | writable | calls `recalculateInvoice` |
| `importTimeEntriesToInvoice` | invoiceId, timeEntryIds | writable | prevents duplicate source_id |
| `recordPayment` | invoiceId, amount, date | writable | updates status paid/partial if added later |
| `generateInvoiceShareToken` | invoiceId, expiry | writable | hash only in DB |
| `revokeInvoiceShareToken` | invoiceId | writable | sets revoked_at |
| `generateInvoicePdf` | invoiceId | member | server-side PDF |

Rules:
- invoice totals recalculated after every item mutation.
- sent/paid invoices should not be hard deleted; use cancelled.
- shared token raw value shown once only.

## 9. Client Portal Public Routes

| Route | Guard | Output |
|---|---|---|
| `GET /client-portal/[token]` | hash token, enabled, not expired, not revoked | client visible projects/tasks/files/comments |
| `POST /client-portal/[token]/comments` | valid token + visible entity | create portal comment |
| `GET /invoice/[token]` | hash token, not expired, not revoked | invoice view |
| `GET /booking/[slug]` | public booking slug | availability + booking form |
| `POST /booking/[slug]` | slot validation + exclusion constraint | appointment created |

Rules:
- rate limit by IP + token hash prefix.
- log access in `portal_access_logs`.
- never expose internal notes, internal files, internal comments, hidden tasks/projects.

## 10. Prompt Generator

| Action | Input | Guard | Notes |
|---|---|---|---|
| `generatePromptOutput` | workspaceId, template, fields, model | writable | checks monthly cap |
| `savePromptGeneration` | workspaceId, projectId?, output | writable | stores result |
| `listPromptGenerations` | workspaceId, filters | member | workspace scoped |

Rules:
- API key server-side only.
- allowed models controlled server-side.
- store model/tokens/cost.
- cap enforced per workspace/month.
- working default model: `notion/haiku-4.5` via 9router (3.8s, ~$0.0002 per call). Other 9router providers (`openai/*`, `kr/*`, `cx/*`) hit auth/rate issues at the time of testing.

## 11. Appointments (Booking)

| Action | Input | Guard | Notes |
|---|---|---|---|
| `createAppointment` | workspaceId, clientId, startAt, durationMin, source | writable | server-side double-booking check + Postgres exclusion constraint |
| `cancelAppointment` | appointmentId, reason? | writable | sets status to `cancelled` |
| `listAppointments` | workspaceId, filters | member | workspace scoped |

Source file: `src/lib/actions/appointments.ts`

Rules:
- double-booking blocked at two layers: app-level slot validation + Postgres `tstzrange` exclusion constraint on `appointments` table.
- `notifyAppointmentBooked` + `notifyAppointmentCancelled` wired to `sendNotification` (Resend) — email delivery gated on `RESEND_API_KEY` + sender domain (HOLD, see P2.2).
- appointments created from public booking route (`/booking/[slug]`) set `source = "booking_page"`.
- new appointments surface in `/app/calendar` without manual refresh.
