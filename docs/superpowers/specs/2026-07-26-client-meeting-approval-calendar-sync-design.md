# Client Meeting Approval and Calendar Sync Design

## Goal

Turn client meeting requests into an explicit approval workflow. A client submits required date, start time, duration, timezone, and agenda. Workspace user can approve, reject, or counter-propose. An approved time creates exactly one Cubiqlo appointment visible in user calendar and client portal, then syncs best-effort to both connected Google Calendars.

## Scope

Included:

- Required meeting date, start time, duration, and timezone in client portal request form.
- User actions: Approve, Reject, Propose new time.
- Client acceptance or re-proposal after user proposes a new time.
- Exactly one appointment per approved request.
- Appointment visibility in Cubiqlo user calendar and client portal.
- Best-effort sync to connected user and client Google Calendars.
- Explicit workflow and Google sync statuses.
- Conflict validation, authorization, notifications, and retry-safe mutations.

Excluded:

- Video-call provider API creation (Google Meet/Zoom).
- Recurring meetings.
- Multi-attendee scheduling.
- External calendar availability lookup before submission.
- Automatic timezone inference beyond the browser-selected/default timezone.

## Current System

- Client meeting requests are stored in `portal_requests` with title `Request Meeting`, type `other`, and metadata embedded in `description`.
- Current form only captures an optional preferred date.
- User can only mark a request done, cancel it, or reopen it.
- `appointments` already powers Cubiqlo calendar and supports client association.
- User and client Google Calendar connections already exist separately.
- User Google Calendar sync is implemented for appointments; client calendar sync helpers also exist.

## UX Flow

### Client submits request

Required fields:

- Date
- Start time
- Duration: 30, 45, 60, 90, or 120 minutes
- Timezone
- Agenda/message

Optional field:

- Related project

The form sends an ISO start time derived from the selected local date/time and timezone plus duration minutes. Server validates that start is in the future and duration is allowed.

Initial state: `requested` (`Menunggu konfirmasi`).

### User reviews request

Meeting request cards in client detail show structured time, duration, timezone, agenda, and three actions:

- **Setujui**: approve submitted time.
- **Tolak**: require rejection reason.
- **Ubah jadwal**: require alternative date, start time, duration, timezone, and optional note.

Approval checks interval conflicts against scheduled appointments. On success it creates one appointment and links it to the request.

### Client handles counter-proposal

A counter-proposal changes state to `counter_proposed`. Portal card shows original request and proposed replacement with:

- **Setujui jadwal**: approve proposed time and create appointment.
- **Ajukan ulang**: submit another required date/time/duration/timezone and optional note, returning state to `requested`.

A counter-proposal does not create an appointment until the client accepts it.

### Rejection

User must provide a reason. State becomes `rejected`; no appointment is created. Client sees reason and may create a new request.

### Approved meeting

State becomes `approved`. Portal and user dashboard show final schedule, duration, timezone, sync status, and appointment status. Meeting moves from active request queue to scheduled meeting presentation, while remaining available in request history.

## Data Model

Add nullable structured fields to `portal_requests`:

- `meeting_start_time timestamptz`
- `meeting_duration_minutes integer`
- `meeting_timezone text`
- `meeting_status text` constrained to `requested | counter_proposed | approved | rejected`
- `meeting_response_note text`
- `appointment_id uuid` referencing `appointments(id)` with `ON DELETE SET NULL`

Add a unique partial index on non-null `appointment_id`. This prevents one appointment from being linked to multiple requests but does not alone prevent duplicate appointments during concurrent approval. Approval must lock/re-read the request inside a transaction and only insert when `appointment_id IS NULL` and status is actionable.

Keep generic `portal_requests.status` for existing request partitioning:

- `pending` while meeting status is `requested` or `counter_proposed`.
- `completed` when meeting status is `approved` or `rejected`.

Existing meeting descriptions remain readable as legacy records. New writes use structured columns; description stores only human agenda text. Legacy pending requests without a start time cannot be approved directly; user must use **Ubah jadwal** to supply complete schedule data.

## Appointment Creation

Create a focused service used by user approval and client counter-proposal acceptance.

Inputs:

- Request ID
- Expected meeting workflow state
- Authenticated actor context

Transaction responsibilities:

1. Load request scoped to workspace/client access.
2. Verify meeting request and expected workflow state.
3. Return existing linked appointment for an already-approved idempotent retry.
4. Validate structured schedule and future time.
5. Calculate end time from duration.
6. Reject overlap with scheduled workspace appointments using half-open intervals `[start, end)`.
7. Insert appointment with workspace, client, assigned user, attendee data, agenda, start, and end.
8. Update request to `approved`, generic status `completed`, and set `appointment_id`.
9. Commit.

Appointment title format: `Meeting — {client name}` with project name appended when available.

The approving workspace user becomes `appointments.userId`. For client acceptance of a user counter-proposal, preserve the user ID that created the counter-proposal in a new nullable `meeting_proposed_by_user_id` field on `portal_requests`; fall back to workspace owner only for legacy/inconsistent data.

## Calendar Visibility and Sync

### Cubiqlo calendars

One `appointments` row is source of truth.

- User calendar already queries workspace appointments.
- Client portal gets a query scoped by portal token/client ID and renders upcoming and past appointments.
- Do not duplicate appointment rows for user and client views.

### Google Calendar

After DB commit:

1. Sync appointment to approving user's connected Google Calendar.
2. Sync appointment to client's connected Google Calendar.
3. Run independently; one failure must not block the other.
4. DB appointment remains valid if either external sync fails.

Add a dedicated `appointment_calendar_syncs` table for per-target sync state:

- `appointment_id`
- `target_type`: `user | client`
- `target_id`
- `provider`: `google`
- `external_event_id`
- `external_calendar_id`
- `status`: `pending | synced | failed | skipped`
- `last_error`
- timestamps

Unique key: `(appointment_id, target_type, provider)`. This avoids overloading the current user-only Google fields and supports independent retry/status.

If a target has no connected Google Calendar, record or derive `skipped` and show `Belum terhubung`. Failed sync exposes **Coba lagi** to an authorized user. Client cannot trigger privileged user-calendar sync.

## Actions and Authorization

Server actions/services:

- `approveMeetingRequest(requestId)` — workspace member with write access.
- `rejectMeetingRequest(requestId, reason)` — workspace member with write access.
- `counterProposeMeetingRequest(requestId, schedule, note)` — workspace member with write access.
- `acceptMeetingCounterProposal(token, requestId)` — authenticated portal session/token scoped to request client.
- `resubmitMeetingRequest(token, requestId, schedule, note)` — authenticated portal session/token scoped to request client.
- `retryMeetingCalendarSync(appointmentId, targetType)` — workspace member with write access.

All actions validate workspace/client scope server-side. Client-supplied workspace, client, appointment, and user IDs are never trusted.

## Notifications

- New request: notify workspace members, existing behavior retained.
- User approval: notify client through configured email and show portal status.
- Rejection: notify client with reason.
- Counter-proposal: notify client with proposed schedule and portal CTA.
- Client accepts/resubmits: notify workspace members.
- Google sync failure: notify user in-app without changing meeting approval status.

Notification failures are non-critical and must not roll back committed workflow changes.

## Date, Time, and Timezone Rules

- Store appointment timestamps as timezone-aware UTC values.
- Store IANA timezone used during negotiation, e.g. `Asia/Jakarta`.
- Render in stored meeting timezone in request cards and portal schedule.
- Browser defaults timezone using `Intl.DateTimeFormat().resolvedOptions().timeZone`.
- Reject invalid IANA timezone, past starts, unsupported durations, and end-before-start.
- DST conversion must use timezone-aware conversion, not manual string concatenation with a fixed offset.

## Error Handling

- Conflict: show `Jadwal bentrok dengan agenda lain` and keep request actionable.
- Duplicate click/retry: return linked appointment, do not insert another.
- Stale state: show that request changed and refresh card.
- Google failure: appointment remains approved; show per-target failed state.
- Disconnected calendar: show skipped/not connected, not failure.
- Legacy incomplete request: require user to propose complete schedule.

## Migration and Compatibility

- Add nullable columns and indexes in a new Drizzle migration.
- Do not backfill inferred times from date-only legacy requests.
- Map legacy pending meeting records to presentation state `requested` but disable direct approval until complete schedule exists.
- Existing approved/completed generic requests remain history and are not converted into appointments.
- No destructive migration.

## Testing

Unit tests:

- Schedule schema validation and timezone conversion.
- State transition rules.
- Appointment interval overlap semantics.
- Legacy request presentation.

Database/service tests:

- Approval creates exactly one appointment.
- Concurrent/idempotent approval does not duplicate.
- Rejection creates no appointment.
- Counter-proposal creates no appointment.
- Client acceptance creates appointment with proposing user.
- Workspace and portal cross-tenant access is rejected.

UI wiring tests:

- User sees Approve, Reject, Reschedule only for actionable meeting requests.
- Rejection requires reason.
- Counter-proposal requires complete schedule.
- Client sees accept/resubmit actions only for counter-proposal.
- Approved appointment renders in both user calendar and client portal.

Browser verification:

1. Submit meeting from mobile portal.
2. Approve from user dashboard.
3. Verify one DB appointment.
4. Verify appointment in user calendar.
5. Verify appointment in client portal.
6. Verify both Google sync outcomes with connected test calendars, or explicit skipped status if unavailable.
7. Repeat approve request and verify no duplicate.
8. Exercise reject and counter-proposal flows.
9. Check mobile layout and console errors.

## Acceptance Criteria

- Client cannot submit meeting without date, start time, duration, timezone, and agenda.
- User sees Setujui, Tolak, and Ubah jadwal.
- Approval creates exactly one appointment and closes the request.
- Appointment appears in Cubiqlo user calendar and client portal.
- Connected user and client Google Calendars receive independent event sync attempts.
- Counter-proposal requires client acceptance before appointment creation.
- Rejection reason is visible to client and creates no appointment.
- Conflicts, duplicate requests, stale actions, legacy data, and external sync failure have explicit safe behavior.
- Existing non-meeting portal requests keep current behavior.
