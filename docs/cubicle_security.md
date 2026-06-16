# Cubicle / Kubikel — Security Model

Target stack:
- Next.js App Router
- Neon Postgres
- Drizzle ORM
- Better-Auth
- Cloudflare R2

## 1. Auth

Internal app users authenticate with Better-Auth.

Required flows:
- email/password signup
- login/logout
- forgot password
- session cookie
- protected `/app/*` routes

Better-Auth owns tables:
- `users`
- `sessions`
- `accounts`
- `verifications`

Cubicle tables reference `users(id)` as `text`.

## 2. Tenant Model

Tenant boundary is `workspace_id`.

Rules:
- every internal query must require authenticated user
- every workspace query must assert membership first
- every data query must include `workspace_id` filter
- write actions allowed only for `owner` and `member`
- `viewer` can read only
- `owner` controls billing/settings/team destructive actions

Roles for MVP:
- `owner`
- `member`
- `viewer`

`admin` role removed from MVP to avoid undefined permission matrix.

## 3. App-Layer RLS Replacement

Because stack uses Neon instead of Supabase, access control happens in app layer through shared guard helpers.

Main file:
- `/root/projek/cubicle/docs/cubicle_rls.ts`

Required guards:
- `requireUser(user)`
- `assertWorkspaceMember(db, userId, workspaceId)`
- `assertWorkspaceWritable(db, userId, workspaceId)`
- `assertWorkspaceOwner(db, userId, workspaceId)`
- parent relationship guards for client/project/task/file/invoice

Every server action must follow pattern:
1. parse + validate input with Zod
2. load session with Better-Auth
3. assert workspace membership
4. assert parent object belongs to same workspace
5. run mutation/query scoped by `workspace_id`
6. write activity log for important mutations

## 4. Client Portal Token

Client portal uses bearer token in URL:

```text
/client-portal/[token]
```

Security rules:
- generate cryptographically random token: at least 32 bytes
- show raw token only once when generated
- store only SHA-256 hash in `clients.portal_token_hash`
- support expiry via `portal_token_expires_at`
- support revocation via `portal_token_revoked_at`
- require `portal_enabled = true`
- log every portal access in `portal_access_logs`
- rate limit portal routes by IP + token hash prefix

Portal token grants read access only to:
- projects for same client where `projects.client_visible = true`
- tasks under visible projects where `tasks.client_visible = true`
- files where `files.visibility = 'client'`
- comments where `comments.visibility = 'client'`

Portal comments:
- require `author_name`
- require `author_email`
- save `source = 'portal'`
- save `visibility = 'client'`

Portal must never expose:
- `clients.internal_notes`
- internal comments
- internal files
- non-visible tasks/projects
- workspace member data beyond public display names needed for UI

## 5. Invoice Shared Link

Invoice link uses bearer token:

```text
/invoice/[token]
```

Security rules:
- store only SHA-256 hash in `invoices.shared_token_hash`
- support expiry via `shared_token_expires_at`
- support revocation via `shared_token_revoked_at`
- log every access in `portal_access_logs`
- route only returns matched invoice + line items + workspace billing info
- route does not expose unrelated client/project/task/time data

## 6. File Storage Security

Provider:
- Cloudflare R2 via S3-compatible SDK

Bucket must stay private.

Object key format:

```text
workspaces/{workspaceId}/files/{fileId}/{safeFilename}
```

Upload limits for MVP:
- max 25 MB per file
- allowed mime types:
  - PDF
  - image/png
  - image/jpeg
  - image/webp
  - text/plain
  - application/zip
  - common office docs if needed
- max 5 GB total storage per workspace for MVP soft limit

Download flow:
1. request `/api/files/[fileId]/download`
2. internal user: assert workspace membership
3. portal user: validate token + `files.visibility = 'client'`
4. generate short-lived signed R2 URL, max 5 minutes
5. never expose bucket listing

## 7. Invoice Integrity

Invoice totals are stored for historical accuracy.

Required invariant:
- after every insert/update/delete on `invoice_items`, call `recalculateInvoice(invoiceId)` in same transaction where possible

Calculation:
- `subtotal = sum(invoice_items.amount)`
- `tax = (subtotal - discount) * tax_rate` if tax rate used
- `total = subtotal - discount + tax`

Time import rules:
- only import `time_entries.billable = true`
- only import entries with `status in ('draft','approved')`
- after import, set imported entries to `status = 'invoiced'`
- prevent importing same time entry twice by checking invoice_items `source_type='time_entry'` and `source_id`

Invoice number generation:
- use `workspace_invoice_counters`
- generate in DB transaction
- lock counter row with `for update`
- format: `INV-YYYY-NNNN`

## 8. Appointment Integrity

Double booking must be blocked by DB constraint, not only app code.

Schema uses Postgres exclusion constraint:

```sql
exclude using gist (
  workspace_id with =,
  user_id with =,
  tstzrange(start_time, end_time, '[)') with &&
) where (status = 'scheduled')
```

Booking rules:
- store appointment times in UTC
- render in viewer timezone
- validate selected slot against `availability_rules`
- allow cancel by changing status to `cancelled`

## 9. AI Usage Control

Prompt generator must track usage:
- `model`
- `input_tokens`
- `output_tokens`
- `cost_usd`

MVP limit suggestion:
- per workspace monthly cap: configurable env default `$5`
- block generation when cap reached
- log prompt generations per workspace

API config:
- use OpenAI-compatible base URL
- store API key in server env only
- never expose API key to browser

## 10. Rate Limits

Apply rate limits to:
- login/signup/password reset
- portal token routes
- invoice shared token routes
- file download signed URL route
- prompt generation route

MVP options:
- Upstash Redis if deployed on Vercel
- in-memory dev limiter locally

Suggested limits:
- portal: 60 requests / minute / IP
- invoice link: 60 requests / minute / IP
- prompt generation: 20 requests / hour / workspace
- auth: Better-Auth defaults + middleware

## 11. Retention

Activity logs:
- keep 90 days for MVP unless user exports

Portal access logs:
- keep 90 days

Implement cleanup later via cron job or scheduled route.
