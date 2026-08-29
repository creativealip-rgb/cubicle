# Cubiqlo Release QA Report — 2026-08-22

Target: `https://app.cubiqlo.com`
QA account: `lostyoungsters@gmail.com`
Method: manual browser UI QA; screenshots used to reconcile stale browser snapshots.

## Historical result

**PARTIAL PASS**

Core business flows passed. Payment recording, file upload/download, exact 390px viewport QA, and second-account team lifecycle were unproven or blocked in this run.

## PASS

- Login, logout/session invalidation, private-route guard, session persistence.
- Workspace switch and read-only data isolation.
- Client, task, time-entry, expense, invoice CRUD flows tested.
- Invoice detail navigation and totals.
- Invoice share-link lifecycle: create, public view without login, revoke, cache-busted not-found, replacement link.
- Reports finance summary and Excel export.
- Calendar availability, public booking, confirmation, persistence, `.ics`, cancellation, and reload cleanup.
- Files folder CRUD.
- Client portal activation, password gate, and Projects/Invoices/Files/Requests tabs.
- Proposal preview/send/public render.
- Contract preview and recipient/validity update.
- Zero `QA-BROWSER-*` entity fixtures after cleanup.

## Historical blockers

- Payment recording browser interaction.
- File chooser automation.
- Exact 390px viewport automation.
- Second-account team lifecycle.
- Password reset, email verification, and Google login.
- Contract send-for-signature final action.

## Later verification — 2026-08-29

Superseding evidence from production hardening release:

- Authenticated mobile QA at `390×844`: dashboard, invoices, proposals, contracts, and weekly time PASS; zero overflow/console errors.
- Full business chain via UI: client → hourly project → task → approved time → invoice PASS with reload persistence.
- Invoice `INV-0038`: rate `Rp180.000`, subtotal `Rp180.000`, total `Rp199.800`, Draft.
- All `QA-UI Full*` fixtures removed through UI; read-only DB audit returned zero clients/projects/tasks/time/invoices.
- Hydration matrix `24/24` PASS across `en-US`/`id-ID`, UTC/Jakarta/New York, hard load/navigation reload.
- Production health and DB OK; `dokploy-traefik` remains sole 80/443 owner.
- Portal uploads now enforce declared and streamed aggregate request limits before multipart parsing.
- Contract signing supports draw and typed-name fallback through the same validated PNG/server signing flow.

## Remaining external-provider/account coverage

- Second-account invite/role lifecycle still needs a separate authorized account.
- Password-reset inbox receipt, email verification, and Google OAuth remain provider-dependent QA.

## Cleanup

No known `QA-BROWSER-*` or `QA-UI Full*` fixture remains. Calendar availability rule remains intentional.

## Current release decision

Production hardening core release: **PASS**.
External-provider and second-account flows remain separately tracked, not blockers for core hardening release.
