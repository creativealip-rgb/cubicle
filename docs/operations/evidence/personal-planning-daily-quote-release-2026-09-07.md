# Personal Planning and Daily Quote Production Release — 2026-09-07

## Release

- Commit: `cfe37f482621c675ddeae1714ae1c50e11151643`
- Image: `cubiqlo-prod:sha-cfe37f4`
- Container: `cubiqlo-new-app-next`
- Migration: `drizzle/0090_personal_daily_quotes.sql`

## Delivered

- New tasks default to Client Visible across manual/server action, Personal Notes conversion, task template import, and AI confirmation execution. Explicit internal/private selection remains supported.
- Fixed Daily Add Habit submission so weekday values are sent only for specific-weekday habits; validation failures render inside the dialog.
- Locked project Billing Model when time entries or invoices exist while preserving edits to other project fields. Expected blocked transitions return human-readable messages instead of raw Server Action/digest errors.
- Added owner-only `/app/planning` with 50/30/20 Planning and Personal Report tabs.
- Moved personal expense/report entry points out of Finance; legacy personal URLs redirect to Planning before business workspace queries.
- Personal navigation order: Notes, Productivity, Planning, Journal.
- Added persisted AI Quote of the Day above Today's Reflection Prompt. One quote is stored per user and timezone-local date; invalid/provider-timeout output uses deterministic local fallback.

## Verification

- Vitest: 359 files, 1,685 tests passed.
- ESLint: passed with zero errors.
- Next.js production build: passed; `/app/planning` included in route manifest.
- Migration applied and replayed idempotently on production PostgreSQL. Table and unique `(user_id, local_date)` index confirmed.
- Internal health: `status=ok`, `db=ok`.
- Public health: `https://app.cubiqlo.com/api/health` returned healthy response.
- Unauthenticated `/app/planning` and `/app/journal` returned expected login redirects.
- Production app runs internally on port 3000 in `dokploy-network`; no public app port binding.
- `dokploy-traefik` remained sole owner of public ports 80/443 before and after deployment.
- Authenticated browser QA was blocked by account passkey/2FA requirement; route, build, DB, container, and public health checks passed.

## Notes

- Existing production user data was preserved.
- Unrelated untracked inspection/seed scripts were not committed.
- 9Router unrelated-domain verification timed out; no routing change was made and proxy ownership remained correct.
