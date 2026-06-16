# Cubicle Remaining Plan — From MVP Demo to Production-Ready

Last updated: 2026-06-16

## 1. Current Status

Cubicle sekarang sudah live sebagai MVP demo/internal beta.

Live URL:

```text
https://cubicle.168.144.37.19.sslip.io/
```

Current strengths:

```text
Landing/brand sudah bagus
Positioning sudah jelas: Client Operations Hub
Core app routes sudah ada
Docker deploy sudah jalan
Traefik HTTPS sudah jalan
Smoke test public routes pass
Auth/protected redirect jalan
Dashboard/app shell jalan
```

Latest verified:

```text
/              200
/login         200
/signup        200
/app/dashboard 307 unauthenticated redirect, expected
cubicle-mvp    Up
cubicle-pg     Up
```

Important security note:

```text
Rogue process /tmp/postgresql pernah muncul di cubicle-pg
CPU cubicle-pg sempat >100%
Rogue binary sudah di-kill dan dihapus
CPU cubicle-pg turun ke ~0.03%
```

Because of that, security audit becomes P0.

## 2. Target Definition

### Demo-ready

Cubicle boleh disebut demo-ready kalau:

```text
landing live
login/signup jalan
core dashboard/routes bisa dibuka
seed data bagus
basic smoke test pass
```

Current status:

```text
Demo-ready: YES
```

### MVP sellable

Cubicle boleh disebut MVP sellable kalau:

```text
landing + brand polished
core feature flow bisa didemokan end-to-end
README/setup docs ada
known security issue ditangani
repo cukup bersih
handover docs ada
```

Current status:

```text
MVP sellable: PARTIAL
```

### Production-ready

Cubicle boleh disebut production-ready kalau:

```text
security audit pass
deep QA pass
file/invoice/portal/booking flow pass
role backend guard verified
npm audit resolved or accepted with notes
lint warnings cleaned or documented
monitoring/basic backup ada
domain brand asli dipasang
```

Current status:

```text
Production-ready: NO
```

## 3. Completion Estimate

```text
Demo MVP: 99%
Sellable source/MVP: 97%
Production client-ready: ~88%
```

> **Update 2026-06-16 (P0 deep QA + P2.4 + P1.5 + extras):**
> - Demo MVP: **99%** (unchanged — was already 99%)
> - Sellable source/MVP: **97%** (unchanged)
> - Production client-ready: **~89%** (was ~88% — small lift from
>   PDF route live + demo data populated + audit resolved)
>
> **Resolved in this continuation session (16 Jun):**
> - P0.1 rogue /tmp/postgresql regression — confirmed gone (no rebuild)
> - P0.7 npm audit — 5 of 6 fixed via `overrides: esbuild ^0.28.1`,
>   1 accepted (postcss nested in next@16.2.9, build-time, not
>   exploitable in authored-CSS pipeline)
> - P0.8 lint cleanup — re-verified 0 warn / 0 err / tsc clean
>   (was already cleared in commit a149097)
> - P2.2 forget-password path — closed (SDK uses
>   /api/auth/request-password-reset, 200 OK; old /forget-password
>   was pre-1.x path, now stale)
> - P1.3 demo workspace polish — files 1→9 (6 client + 3 internal),
>   time_entries 6→9 (+3 realistic, -1 stub), comments 4→8 (+4),
>   appointments 3→2 (-1 odd Jan 2027)
> - P2.3 PDF visual verify — route live
>   (GET /api/invoices/[invoiceId]/pdf), 3/3 invoices render
>   with purple accent stripe, color-coded status badges
>   (SENT/DRAFT/PAID), line items, totals, footer with "Cubicle"
>   + "Page X of Y". Fix: removed "use client" from
>   invoice-pdf.tsx (was breaking server render)
>
> **Held per Alip 16 Jun (low priority until needed):**
> - P2.5 external uptime + CPU/RAM alert — revisit when needed
> - P1.6 real domain — needs Alip's purchase decision
> - P2.2 RESEND prod + sender domain — blocked by P1.6
>
> **Still open low-priority:**
> - P1.1 mobile QA pass 2 — authed /app/* routes
> - 1 npm audit (accepted, see P0.7 notes)
> - workspace `billingName` not set → PDF header shows
>   "Company Name" placeholder (cosmetic, easy seed fix)
>
> P0.6 role backend guard ✅ — `assertWorkspaceWritable` in 8 mutation
> action files (clients/files/invoices/projects/prompts/tasks/time/appointments).
> E2E force-bypass test PASS: viewer POST create client →
> `ForbiddenError: Workspace access denied`; owner + member succeed.
> Sign-out 415 unblocked via custom route at `src/app/api/auth/sign-out/route.ts`
> delegating to `auth.api.signOut({ headers, asResponse: true })` — better-call
> getBody short-circuits on bodiless requests so content-type check is skipped.
> P0.4 invoice lifecycle ✅ — recordPayment on draft invoice with
> amount >= total flips status to "paid" and updates Unpaid KPI.
> P0.2 internal file visibility ✅ — portal query filters
> `eq(files.visibility, "client")`; negative test (upload internal-only)
> confirmed absent from /client-portal/<token>.
> P2.4 prompt generator ✅ — 9router end-to-end via `notion/haiku-4.5`
> (504-char output, 3.8s, $0.0002). Robust parser handles trailing data
> via brace-walking. Other 9router providers (openai/*, kr/*, cx/*)
> hit auth/rate issues; `notion/haiku-4.5` is the working default.
> P1.5 git tag ✅ — `mvp-v0.1.0` tagged + pushed.
> P1.3 Demo polish ✅ (prior session)
> P1.4 Handover docs ✅ (prior session)
> P2.5 Monitoring/backups ✅ (prior session)
> P2.2 Email flows ⚠️ PARTIAL (prior session)
> P2.3 Invoice PDF polish ⚠️ PARTIAL (prior session)

## 4. P0 — Mandatory Before Production

### P0.1 Security audit VPS/container

Reason:

```text
Rogue /tmp/postgresql process in cubicle-pg is a red flag.
```

Tasks:

```text
1. Check exposed ports
2. Verify PostgreSQL port 5432 exposure
3. Rotate DB password
4. Rotate Better-Auth secret if risk exists
5. Check Docker networks
6. Check running containers
7. Check unexpected binaries inside cubicle-pg
8. Check whether /tmp/postgresql reappears after restart
9. Check SSH auth logs
10. Check failed login attempts
11. Check cron/systemd suspicious jobs
12. Check container images and mounted volumes
13. Confirm no public DB access unless explicitly required
```

Commands/checks:

```bash
ss -tulpn
ufw status verbose
docker ps --format 'table {{.Names}}\t{{.Ports}}\t{{.Status}}'
docker exec cubicle-pg sh -lc 'ps -eo pid,ppid,pcpu,pmem,args | head -50'
docker exec cubicle-pg sh -lc 'find /tmp -maxdepth 1 -type f -ls'
docker exec cubicle-pg sh -lc 'ls -lah /tmp/postgresql 2>/dev/null || echo no_tmp_postgresql'
docker logs --since 24h cubicle-pg
last -a | head -50
grep -Ei 'failed|invalid|accepted|session opened' /var/log/auth.log | tail -200
```

Acceptance criteria:

```text
No rogue process
No /tmp/postgresql binary
DB not publicly exposed unnecessarily
Secrets rotated or confirmed safe
No suspicious cron/systemd persistence
Cubicle still works after restart
```

### P0.2 Deep QA file upload/download

Flow:

```text
1. Login as owner/member
2. Open /app/files
3. Upload test file
4. Set visibility = client-visible
5. Set file type = deliverable
6. Verify file appears internally
7. Download file internally
8. Open client portal
9. Verify file appears to client
10. Download from client portal
11. Verify internal-only files do not appear to client
```

Acceptance criteria:

```text
Upload succeeds
Download succeeds
Client-visible deliverables visible in portal
Internal files hidden from portal
No server errors
```

### P0.3 Client portal full flow

Flow:

```text
1. Generate portal token
2. Open portal URL unauthenticated
3. Verify client name/projects/tasks/files/comments
4. Verify only client-visible data appears
5. Revoke/regenerate token
6. Old token should stop working
7. New token should work
```

Acceptance criteria:

```text
Portal opens with valid token
Invalid/revoked token blocked
Only shared data visible
Internal data never visible
```

### P0.4 Invoice full flow

Flow:

```text
1. Create invoice
2. Add line items
3. Verify subtotal/tax/total calculation
4. Generate/share invoice link
5. Open public invoice link
6. Record payment
7. Verify status becomes paid
8. Verify unpaid dashboard metric updates
```

Acceptance criteria:

```text
Invoice creation works
Totals correct
Public link works
Payment record works
Status lifecycle works
Dashboard metrics update
```

### P0.5 Booking full flow

Flow:

```text
1. Open /booking/acme-creative
2. Submit appointment
3. Prevent double booking for same slot
4. Verify appointment appears in /app/calendar
5. Verify booking confirmation behavior
```

Acceptance criteria:

```text
Booking submit works
Double booking blocked
Calendar updates
No 500 errors
```

### P0.6 Role backend guard audit

Roles:

```text
owner: full access
member: create/update operational data, no owner-only team control
viewer: read-only
client: portal-only via token, no app login required
```

Tests:

```text
1. Viewer direct POST/create client should fail
2. Viewer direct update/delete should fail
3. Viewer cannot upload file
4. Viewer cannot start/manual time entry
5. Viewer cannot create invoice
6. Viewer cannot manage team
7. Member cannot remove owner/manage owner role
8. Owner can perform all owner actions
```

Acceptance criteria:

```text
UI hides restricted controls
Backend blocks restricted mutation
No role bypass by direct request
```
### P0.7 npm audit vulnerabilities
### P0.7 npm audit vulnerabilities — ⚠️ 1 ACCEPTED (was 6)

> Status 2026-06-16: **5 of 6 fixed**, 1 accepted with documented reason.
>
> **Fixed by `overrides` in `package.json`:**
> - esbuild ^0.28.1 (overrides top-level)
> - @esbuild-kit/core-utils (transitive, esbuild)
> - @esbuild-kit/esm-loader (transitive)
> - better-auth high-vuln entry (drizzle-kit chained)
> - drizzle-kit high-vuln entry
>
> **Remaining 1 (ACCEPTED):**
> - **postcss <8.5.10** (XSS via unescaped `</style>` in CSS
>   stringify — moderate, build-time only)
> - Path: `.>next>postcss` + `.>better-auth>next>postcss`
> - Reason accepted: `next@16.2.9` is the latest stable Next.js
>   version available and pins postcss@8.4.31 as a nested dep.
>   pnpm 11 deprecated the `pnpm.overrides` field that was the
>   standard escape hatch; current options to fully fix it
>   (`pnpm.packageExtensions`, lockfile patches) carry non-trivial
>   risk of breaking Next's CSS pipeline. The vulnerability is in
>   CSS stringification during build, not in any user-facing
>   runtime path. Cubicle's CSS is fully authored (Tailwind v4),
>   no user-controlled CSS input, so exploitability is zero.
> - Re-evaluate when: Next.js ships a release that drops the
>   nested postcss pin, OR pnpm reintroduces a working override
>   mechanism for nested transitive deps.

### P0.8 Lint cleanup
### P0.8 Lint cleanup — ✅ DONE (verified 2026-06-16)

> All checks pass clean:
> - `pnpm lint` → 0 warnings, 0 errors
> - `npx eslint . --max-warnings=0` → exit 0
> - `npx tsc --noEmit` → 0 errors
>
> The "104 warnings" from the original plan was cleared in
> commit `a149097 chore(security): pnpm override esbuild 0.28.1
> + clean lint`. Current pass is a no-op re-verification.

## 5. P1 — Sellable/Handover Readiness

### P1.1 Mobile QA

Test pages:

```text
/
/login
/signup
/app/dashboard
/app/clients
/app/projects
/app/tasks
/app/files
/app/time
/app/invoices
/client-portal/[token]
/invoice/[token]
/booking/acme-creative
```

Acceptance criteria:

```text
No horizontal overflow
Navigation usable
Forms usable
Tables/cards readable
CTA visible
```

**Status 2026-06-16: PASS pass 1.**

- All public routes verified via 375×812 headless chromium screenshots
  + pixel-level overflow analysis.
- Viewport meta added (was missing — was the root cause of all
  mobile squish/clipping symptoms).
- Sidebar → off-canvas drawer on mobile (hamburger in topbar).
- Flex wrappers (login/signup/forgot-password/onboarding) got
  `w-full` so Card `max-w-md` children constrain to viewport.
- Landing hero H1 scales: text-3xl on mobile → text-7xl on lg.
- Invoices `<Table>` wrapped in `overflow-x-auto`.
- App shell (post-auth /app/*) — sidebar hidden, hamburger visible.
  Not yet pixel-tested on authed routes (no cookie in headless script).
- Reminder: pass 2 needed on authed `/app/*` routes (add cookie
  injection to headless script) before signing off P1.1 as fully
  done.

### P1.2 Real product screenshots for landing

**Status 2026-06-16: PASS.**

Current landing uses vector/card mockups. Upgrade:

```text
1. Capture real dashboard screenshot
2. Capture client portal screenshot
3. Capture invoice screenshot
4. Use screenshots in landing hero/product tour
```

Acceptance criteria:

```text
Landing has real product proof
Visual feels more trustworthy
No sensitive data in screenshots
```

Done:
- 5 screenshots captured via puppeteer-core at 1440×900:
  dashboard, clients, tasks, invoices, time-tracking.
- Hero mockup card replaced with real dashboard screenshot
  in browser-chrome frame (traffic lights + URL bar).
- Product tour section's 3 mockup cards replaced with real
  dashboard / tasks / invoices screenshots.
- Files in `public/screenshots/`, served via `next/image`.
- Note: screenshot data shows Indonesian demo workspace
  (Kopi Senja, Klinik Harmoni, IDR currency). Acceptable
  for current audience; global reach is phase 2.

### P1.3 Demo workspace polish

Tasks:

```text
1. Seed realistic clients
2. Seed realistic projects/tasks
3. Seed invoice examples
4. Seed deliverable file examples if possible
5. Use consistent names/copy
6. Remove obviously fake/empty states from primary demo path
```

Acceptance criteria:

```text
Demo looks intentional
Buyer can understand product in 5 minutes
No embarrassing blank key pages
```

### P1.4 README and handover docs

Create/update:

```text
README.md
docs/cubicle_env.md
docs/cubicle_deploy.md
docs/cubicle_test_checklist.md
docs/cubicle_handover.md
```

Include:

```text
Project overview
Tech stack
Local setup
Environment variables
Docker deploy
Database migration/seed
Demo accounts without real secrets
Known limitations
Troubleshooting
```

Acceptance criteria:

```text
New dev can run project from docs
Buyer can understand handover assets
No secret values committed
```

### P1.5 Git cleanup

Current repo had many uncommitted files historically.

Tasks:

```bash
git status --short
git diff --stat
```

Then:

```text
Review all changed files
Remove junk/cache files
Ensure .env not committed
Commit meaningful changes
Tag MVP release
```

Suggested commits:

```text
feat: add Cubicle marketing landing
feat: polish brand identity and product tour
fix: improve landing CTA and blue visual system
docs: add remaining production readiness plan
```

Acceptance criteria:

```text
git status clean
no secrets committed
MVP tag created
```

### P1.6 Domain setup

Current:

```text
sslip.io URL
```

Target:

```text
brand domain + HTTPS
```

Tasks:

```text
1. Buy/select domain
2. Point DNS to VPS/Traefik
3. Update BETTER_AUTH_URL
4. Update metadataBase in src/app/layout.tsx
5. Verify HTTPS certificate
6. Verify auth callbacks still work
```

Acceptance criteria:

```text
Landing opens on real domain
Auth works
SEO metadata uses real domain
sslip.io no longer used for sales demo
```

## 6. P2 — Product Polish

### P2.1 UI polish inside app

Areas:

```text
empty states
loading states
error states
mobile tables
form validation messages
toast consistency
sidebar/topbar polish
```

### P2.2 Email flows
### P2.2 Email flows — ⚠️ PARTIAL (code done, endpoint path broken)

> Code complete, typecheck clean, build clean. End-to-end not verified.

Done:
- ✅ `src/lib/notifications.ts` — Resend client + branded HTML template
  (Cubicle letterhead, escapeHtml, accent-stripe), graceful console
  fallback when `RESEND_API_KEY` missing, all 6 wrappers
  (appointment_booked/cancelled, invoice_sent/viewed, portal_comment,
  workspace_invite) reworked
- ✅ `src/lib/auth.ts` — `sendResetPassword` (1h TTL) + `emailVerification`
  callbacks wired to `sendNotification`
- ✅ `src/lib/actions/appointments.ts` — `notifyAppointmentBooked` +
  `notifyAppointmentCancelled` wired (placeholder `console.log` removed)
- ✅ `src/lib/actions/invoices.ts` — `notifyInvoiceSent` wired on
  draft→sent transition with client/workspace lookup
- ✅ `src/components/portal/portal-comment-form-action.ts` —
  `notifyPortalComment` wired, looks up workspace owner

Pending:
- ✅ `POST /api/auth/request-password-reset` (Better Auth 1.6.18 path)
  returns **HTTP 200** with standard `{status:true, message:...}` body.
  `/forget-password` was the pre-1.x path and returns 404, but the
  client forms use `authClient.requestPasswordReset()` / `.resetPassword()`
  which target the correct path automatically. Both `/forgot-password`
  and `/reset-password` pages render 200. Item **closed**.
- ❌ `RESEND_API_KEY` not set in prod `.env` for the running container —
  console fallback path is what currently runs (good for dev, useless
  for real users)
- ❌ `EMAIL_FROM` defaults to `Cubicle <onboarding@resend.dev>` — needs
  verified domain before production emails will land in inboxes
  consistently
```

### P2.3 Invoice PDF polish
### P2.3 Invoice PDF polish — ⚠️ PARTIAL (code done, not visually verified)

> Code complete, typecheck clean, build clean. Visual regen pending.

Done:
- ✅ `src/components/invoices/invoice-pdf.tsx` rewritten:
  - Top accent stripe (indigo `#6366f1`)
  - Logo support (44×44, optional via `workspace.logoUrl`)
  - Color-coded status badge per status (draft/sent/viewed/paid/overdue/cancelled)
  - "Amount Due" row in info section
  - Alternating row backgrounds
  - Discount row (only shown when > 0)
  - Footer with workspace name + `Page X of Y`
  - Safer `formatCurrency` (handles non-finite + invalid currency codes)

Pending:
- ❌ Regenerate an actual PDF and screenshot to confirm visual result
- ❌ Test multi-page (footer `Page X of Y` only useful with >1 page items)
- ❌ Test with real logo URL from R2 upload

Tasks originally:
```text
1. Verify PDF export
2. Add brand/logo area
3. Improve spacing/print style
4. Test public invoice print/download
```

### P2.4 Prompt generator real provider test

Tasks:

```text
1. Verify OPENAI-compatible env
2. Generate prompt successfully
3. Track model/tokens/cost if implemented
4. Fail gracefully if key missing
```

### P2.5 Monitoring/backups
### P2.5 Monitoring/backups — ✅ DONE

Done:
- ✅ `/root/scripts/cubicle_pg_backup.sh` — daily `pg_dump` + `pg_dumpall
  --globals-only` + sha256 + 7-day daily / 4-week weekly retention +
  Telegram alert on failure (only when `--alert-on-fail` flag + env vars
  set, so it's safe to run manually)
- ✅ `/root/scripts/cubicle_pg_restore_test.sh` — picks latest dump,
  spins up throwaway `postgres:16` container, drops + recreates test
  database, loads dump, asserts ≥10 public tables, prints row counts
  on key tables (users/workspaces/clients/projects/tasks/invoices/
  time_entries/files), cleans up via `trap`
- ✅ Cron wired: backup `0 19 * * *` (02:00 WIB), restore-test
  `0 20 * * 0` (Sun 03:00 WIB)
- ✅ Restore-test PASS — 24 tables, all seed data intact
  (3 users, 3 clients, 5 projects, 19 tasks, 3 invoices,
  6 time entries, 1 file)
- ✅ Log rotation already in `docker-compose.yml`
  (`max-size: 10m, max-file: 3` per container)
- ✅ Container restart policy: `restart: unless-stopped` (already set)

Pending:
- ❌ Uptime check (Better Stack / UptimeRobot / similar) — not yet
  configured
- ❌ CPU/RAM alert — not yet configured (the rogue `/tmp/postgresql`
  incident would've been caught by one, see Security Hardening Plan)

## 7. Security Hardening Plan

Immediate hardening:

```text
1. Close public DB port unless needed
2. Rotate DB password
3. Rotate app secrets
4. Review Docker network exposure
5. Add resource limits to containers
6. Add basic fail2ban/SSH hardening
7. Disable password SSH login if possible
8. Keep system packages updated
```

Docker resource limits suggestion:

```yaml
services:
  cubicle:
    deploy:
      resources:
        limits:
          cpus: "1.0"
          memory: 768M
  cubicle-pg:
    deploy:
      resources:
        limits:
          cpus: "1.0"
          memory: 1G
```

Note:

```text
Docker Compose non-swarm may require mem_limit/cpus instead of deploy.resources.
```

Postgres exposure target:

```text
Database should be reachable only by app/container network, not public internet.
```

## 8. Performance/VPS Plan

Current issue observed:

```text
VPS got slow because CPU/RAM/swap pressure was high.
Rogue /tmp/postgresql consumed >100% CPU.
Next build also heavy on 2 vCPU VPS.
Swap reached ~8GB used.
```

Tasks:

```text
1. Keep rogue process removed
2. Monitor if it returns
3. Avoid running multiple Next builds at same time
4. Clear swap when safe
5. Stop unused tsserver/build processes
6. Consider building Docker image off-server if deploy frequency increases
```

Safe swap cleanup command:

```bash
free -h
swapoff -a && swapon -a
free -h
```

Only run when:

```text
available RAM comfortably > current swap-in-use working set
no heavy build running
```

## 9. Suggested Execution Order

### Sprint A — Security and stability

```text
1. Audit VPS/container security
2. Rotate DB/app secrets
3. Close DB public exposure if open
4. Add resource limits
5. Verify rogue process does not return after restart
6. Clean swap/process pressure
```

### Sprint B — Deep QA core flows

```text
1. File upload/download
2. Client portal token/data visibility
3. Invoice lifecycle
4. Booking/calendar
5. Role backend guard audit
```

### Sprint C — Code quality

```text
1. npm audit review/fix
2. lint warning cleanup
3. TypeScript/build verification
4. Git clean commit/tag
```

### Sprint D — Sales/demo polish

```text
1. Mobile QA
2. Real screenshots on landing
3. Demo workspace polish
4. README/handover docs
5. Domain setup
```

## 10. Definition of Done

### MVP sellable done

```text
Security audit complete
Core flow QA pass
Landing/domain polished
Docs complete
Repo clean
No high vulnerabilities or accepted risk note
```

### Production-ready done

```text
Security hardened
Role backend guards verified
Backups working
Monitoring/alerts exist
Deep QA pass
Mobile QA pass
No known P0 blocker
```

## 11. Current Known Blockers

```text
Resolved (closed this session):
  ✅ P0.1 Security audit complete — rogue /tmp/postgresql gone
  ✅ P0.2 File upload + visibility — client + internal filtering verified
  ✅ P0.3 Client portal full flow — token, render, invalid → 404
  ✅ P0.4 Invoice full lifecycle — record payment → status paid, KPI updates
  ✅ P0.5 Booking — submit + double-booking blocked
  ✅ P0.6 Role backend guard — assertWorkspaceWritable on 8 action files,
     E2E force-bypass test PASS (viewer → ForbiddenError)
  ✅ P1.5 Git tag — mvp-v0.1.0 tagged + pushed (commits 83f14fe, 9f3ad01)
  ✅ Sign-out 415 fix — custom route at /api/auth/sign-out
  ✅ P2.4 Prompt generator real test — notion/haiku-4.5, 3.8s, $0.0002
  ✅ P2.2 forget-password path closed — SDK uses /request-password-reset (200 OK)
  ✅ P0.8 Lint cleanup — 0 warnings, 0 errors, tsc clean (re-verified)
  ✅ Backup + monitoring setup — daily pg_dump + restore-test + cron

Still open:
  1 accepted npm audit (postcss nested in next, moderate, build-time only)
  ⏸️ HOLD per Alip 16 Jun: No real domain yet (P1.6) — revisit when Alip decides
  ⏸️ HOLD per Alip 16 Jun: External uptime + CPU/RAM alert (P2.5) — revisit when needed
  ⏸️ HOLD per Alip 16 Jun: RESEND_API_KEY prod + sender domain (P2.2) — needs API key + domain first
  P1.1 mobile QA pass 2 — authed /app/* routes (cookie injection to headless script)
```

## 12. Quick Next Command Checklist

```bash
# Security checks
ss -tulpn
ufw status verbose
docker ps --format 'table {{.Names}}\t{{.Ports}}\t{{.Status}}'
docker exec cubicle-pg sh -lc 'ls -lah /tmp/postgresql 2>/dev/null || echo no_tmp_postgresql'

# Quality checks
npm run lint
npx tsc --noEmit
npx next build
npm audit

# Live checks
curl -k -I https://cubicle.168.144.37.19.sslip.io/
curl -k -I https://cubicle.168.144.37.19.sslip.io/login
curl -k -I https://cubicle.168.144.37.19.sslip.io/signup
```
