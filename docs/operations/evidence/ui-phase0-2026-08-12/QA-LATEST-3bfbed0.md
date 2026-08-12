# QA Latest — UI Polish Revision 3bfbed0

Tanggal: 12 Agustus 2026
Environment: `https://dev.cubiqlo.com`
Revision: `3bfbed0ba306424f03056f512377828d9c1dc0f1`
Account: `[REDACTED]`

## Runtime

- Login authenticated: PASS
- `/api/health`: HTTP 200; `status=ok`; `db=ok`
- Dev container: healthy
- Production unchanged: PASS

## Route capture

Captured authenticated screenshots at `1440×900` and `390×844` for:

- `/app/dashboard`
- `/app/reports`
- `/app/projects`
- `/app/time`
- `/app/invoices`
- `/app/calendar`
- `/app/files`
- `/app/tasks`
- `/app/settings`
- `/app/personal`
- `/app/docs`
- `/app/whats-new`

Desktop: 12/12 captured.
Mobile: 12/12 captured.
Local capture directory: `/tmp/cubiqlo-qa-latest/` (not versioned).

## Gates

- `npm run lint`: PASS; 6 existing warnings, 0 errors.
- `npx tsc --noEmit`: PASS.
- `npm run build`: PASS.
- `npm test`: 232 passed, 13 failed. Failures are existing integration wiring expectations around billing/time/task/invoice source changes; no UI build/runtime failure observed.

## Remaining

- Full test suite needs baseline/integration expectation reconciliation.
- Empty/loading/error/permission/long-content states not all independently exercised.
- Console/network evidence is not a clean full-route assertion; route capture and health passed.
- Production deployment remains out of scope without explicit approval.
