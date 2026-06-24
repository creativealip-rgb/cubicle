# Cubicle Remaining Plan — From MVP Demo to Production-Ready

Last updated: 2026-06-24

## 1. Current Status

Cubicle/Cubiqlo sekarang live sebagai production beta di domain brand.

Live URL:

```text
https://cubiqlo.com/
```

Current strengths:

```text
Landing/brand sudah polished dengan Indo + SaaS English copy
Positioning jelas: Client Operations Hub untuk freelancer/agency/studio
Core app routes + pre-deal + finance routes sudah ada
Domain cubiqlo.com live, HTTPS jalan
Cloudflare R2 upload/download smoke pass
Resend noreply@cubiqlo.com verified + Reply-To settings
Auth rate limiting aktif
Monitoring/backups aktif
Vitest unit tests 17/17 pass
Playwright E2E 13/13 pass
Free tier 3-client limit enforced server-side
Pakasir QRIS payment gateway active (Solo Rp 49rb / Team Rp 99rb)
Dashboard fully translated to Indonesian
All internal app pages translated to Indonesian (Clients, Invoices, Tasks, Projects, Settings, Time, Files, Reports)
Client-facing pages in English (Invoice PDF, Portal, Proposal, Contract, Booking, Intake, Email)
Docker deploy healthy via dokploy-network
```

Latest verified (2026-06-18 full audit):

```text
PUBLIC ROUTES (no auth):
/                                200  131043 bytes  landing
/login                           200   14383 bytes
/signup                          200   17895 bytes
/forgot-password                 200   16722 bytes
/reset-password                  200   17725 bytes

APP PAGES (authenticated as owner@cubicle.test):
/app/dashboard                   200  133835 bytes
/app/clients                     200   93476 bytes
/app/projects                    200   90445 bytes
/app/tasks                       200  139277 bytes
/app/time                        200   98126 bytes
/app/calendar                    200   66482 bytes
/app/invoices                    200   87744 bytes
/app/contracts                   200   59540 bytes
/app/proposals                   200   60928 bytes
/app/questionnaires              200   57050 bytes
/app/expenses                    200  101064 bytes
/app/files                       200  105113 bytes
/app/prompts                     200   67362 bytes
/app/reports                     200  124672 bytes
/app/settings                    200   75216 bytes
/onboarding                      200   53262 bytes

APP PAGES (unauthenticated):
all 16 app routes return 307 redirect to /login (correct)

PUBLIC TOKEN ROUTES (with invalid token):
/booking/[slug]                 404
/client-portal/[token]           404
/contract/[token]               200 (renders invalid token page)
/intake/[token]                 200 (renders invalid token page)
/invoice/[token]                404
/proposal/[token]                404

DETAIL PAGES (fake IDs, authenticated):
/app/clients/[id]                200 (renders not-found UI)
/app/projects/[id]               200
/app/invoices/[id]               200
/app/contracts/[id]              200
/app/proposals/[id]              200
/app/questionnaires/[id]         200

ROLE-BASED ACCESS:
owner@cubicle.test               login 200 + all pages 200
member@cubicle.test              login 200 + all pages 200
viewer@cubicle.test              login 200 + all pages 200

API ENDPOINTS:
/api/health                                   200  {"status":"ok","db":"ok"}
/api/notifications             (auth)          200  {items:[invoice_overdue: INV-2026-0044 Rp 6.500.000]}
/api/notifications/reminders   (no auth)       401  {"error":"unauthorized"}
/api/notifications/reminders   (Bearer CS)     200  {"ok":true,"dueTaskCount":1,"overdueInvoiceCount":3}
/api/notifications/reminders   (auth cookie)   200
/api/time/active               (auth)          200  {"activeTimer":null}
/api/ai/chat                   (no auth)       200  {"enabled":true,"model":"tr/MiniMax-M3"}
/api/ai/chat                   (auth)          200
/api/ai/action                 (no auth)       405  (GET, needs POST)
/api/ai/action                 (POST, no auth) 401  {"error":"Unauthorized"}
/api/ai/conversations          (auth)          200  2 conversations present
/api/auth/get-session                          200
/api/auth/sign-in/email                       200  issues session cookie

PDF GENERATION (live data):
/api/invoices/[id]/pdf                        200  93854 bytes  application/pdf  %PDF-1.3
/api/contracts/[id]/pdf                       200  13292 bytes  application/pdf  %PDF-1.3

LIVE DATA (demo seed):
1 task due today
3 overdue invoices
2 AI conversations
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
MVP sellable: YES
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
Production-ready: BETA / NEAR-READY
```

## 3. Completion Estimate

```text
Demo MVP: 99%
Sellable source/MVP: 99%
Production client-ready: ~98% (payment gateway v1 done, subscription automation remaining)
```


> **Update 2026-06-24 (Payment gateway + Dashboard localization):**
- Demo MVP: **99%** (unchanged)
- Sellable source/MVP: **99%** (unchanged)
- Production client-ready: **~98%** (payment gateway v1 closes the last open infra gap)
- Payment: Pakasir QRIS integration complete — checkout, webhook, plan auto-upgrade, upgrade-only guard, idempotent transactions.
- Billing UI: `/app/billing` page with Solo/Team cards, disabled current plan button, upgrade flow.
- Localization: Dashboard fully translated to Indonesian (greeting, KPIs, attention cards, cash flow, client health, activity, timers, tasks, invoices).
- DB: `pakasir_payments` table added (26 tables total).

> **Update 2026-06-23 (Production beta infra + pricing/landing polish):**
- Demo MVP: **99%** (unchanged)
- Sellable source/MVP: **99%** (complete for source sale/demo)
- Production client-ready: **~98%** (+0.5 — R2 real credentials + Resend domain + domain live + rate limiting + monitoring + automated tests + local pricing/free-tier enforcement close most infra gaps)
- Domain: `https://cubiqlo.com` live; legacy `sslip.io` redirects 301 to canonical domain.
- Storage: Cloudflare R2 bucket `cubicle-files` configured; upload/download smoke passed.
- Email: Resend domain verified; sender `noreply@cubiqlo.com`; Reply-To setting shipped.
- AI: model switched to `ag/gemini-3-flash` via internal 9router Docker URL.
- Security/ops: auth rate limiting active; fail2ban recidive jail active; local + external uptime monitoring active; DB backup/restore-test cron active.
- QA: 17 Vitest unit tests + 13 Playwright E2E tests passing.
- Product: Free tier now limited to 3 clients server-side with upgrade UI; pricing localized to Rp 49rb Solo / Rp 99rb Team; landing copy polished for Indonesian market using mixed Indo + SaaS English tone.
- Payment gateway v1 started: Pakasir QRIS checkout/webhook for Solo/Team plans using project `cubiqlo`.
- Remaining strategic gap: subscription automation polish (renewal reminders, grace period, receipt email, plan downgrade automation).

> **Update 2026-06-16 (P0 deep QA + P2.4 + P1.5 + extras):**
> - Demo MVP: **99%** (unchanged — was already 99%)
> - Sellable source/MVP: **97%** (unchanged)
> - Production client-ready: **~91%** (was ~90% — P1.1 pass 2 + minor
>   layout polish + P2.3 PDF visual verify lifted quality gate)

> **Update 2026-06-16 (Sprint F AI Assistant v1.1 + Sprint G P2.3 close):**
> - Demo MVP: **99%** (unchanged)
> - Sellable source/MVP: **98%** (+1 — AI Assistant is a strong demo differentiator)
> - Production client-ready: **~92%** (+1 — but R2 still placeholders, Resend still invalid)
>
| **Update 2026-06-17 (Sprint F.3 AI Assistant v1.2):**
- Demo MVP: **99%** (unchanged)
- Sellable source/MVP: **99%** (+1 — typo-tolerant search + prompt library + voice + export make the AI Assistant demo-ready for real use)
- Production client-ready: **~92%** (unchanged — no infra work in F.3)

| **Update 2026-06-18 (Sprint J+K — P2.7.1 Proposal + P2.8 Recurring/Cash flow):**
- Demo MVP: **99%** (unchanged — both features in app shell)
- Sellable source/MVP: **99%** (unchanged — already 99%)
- Production client-ready: **~93%** (+1 — Proposal adds client-acquisition flow, Recurring adds ops utility, Cash flow adds strategic insight)

| **Update 2026-06-19 (Sprint L — P2.7.2 Questionnaire):**
- Demo MVP: **99%** (unchanged — in app shell)
- Sellable source/MVP: **99%** (unchanged — already 99%)
- Production client-ready: **~93%** (unchanged — utility feature, not infra/differentiator)

| **Update 2026-06-19 (Sprint N — Invoice create page + browser QA polish):**
- Demo MVP: **99%** (unchanged — New Invoice page now reachable, full flow)
- Sellable source/MVP: **99%** (unchanged)
- Production client-ready: **~93%** (unchanged — UI-only polish + counter seed fix)

| **Update 2026-06-19 (Sprint M — P2.7.3 Contract + E-sig):**
- Demo MVP: **99%** (unchanged — in app shell)
- Sellable source/MVP: **99%** (unchanged)
- Production client-ready: **~94%** (+1 — closes last P2.7 pre-deal phase, full HoneyBook/Bonsai/17hats feature parity for Indonesian segment)

> **Update 2026-06-19 (Sprint N — Signed Contract PDF + Questionnaire AI tools):**
- Demo MVP: **99%** (unchanged)
- Sellable source/MVP: **99%** (unchanged)
- Production client-ready: **~95%** (+1 — downloadable signed contract with embedded signature + audit trail is a legal-grade deliverable; AI coverage 28→31 tools)

| **Update 2026-06-19 (Sprint N-ext — Contract Templates CRUD + Demo Seed):**
- Demo MVP: **99%** (unchanged)
- Sellable source/MVP: **99%** (unchanged)
- Production client-ready: **~95%** (unchanged — templates CRUD is dev/owner-only, no new client-facing surface; demo seed makes the demo "click" without manual setup)

> **Update 2026-06-19 (Sprint O — IDR-grade Invoice Billing):**
- Demo MVP: **99%** (unchanged)
- Sellable source/MVP: **99%** (unchanged — already ceiling, but invoice quality goes from "demo" to "Indonesian legal-compliant")
- Production client-ready: **~96%** (+1 — full IDR invoicing compliance: company name + address + phone + email + NPWP in PDF header; closes gap vs HoneyBook/Bonsai/17hats for Indonesian SMB/freelancer market)

> **Update 2026-06-19 (Sprint R+S+T — Notifications + Portal Viewed + Workspace Currency):**
- Demo MVP: **99%** (unchanged)
- Sellable source/MVP: **99%** (unchanged — ceiling)
- Production client-ready: **~97%** (+1 — in-app notification bell + task assignment/client comment/invoice paid/file viewed triggers; portal visit audit + files.last_viewed_at; workspace currency default IDR + shared formatMoney helper)

> **Update 2026-06-19 (Sprint U — Notification Trigger Expansion):**
- Demo MVP: **99%** (unchanged)
- Sellable source/MVP: **99%** (unchanged — ceiling)
- Production client-ready: **~97.5%** (+0.5 — notification coverage expanded across proposal viewed, contract viewed/signed, questionnaire answered, booking created, task status changed, @mentions, due-date reminders, overdue invoice alerts)
>
> **Update 2026-06-22 (Lint/build recovery + live deploy + P0 quick security pass):**
- Demo MVP: **99%** (unchanged — live smoke routes pass)
- Sellable source/MVP: **99%** (unchanged — clean lint/typecheck/build restored)
- Production client-ready: **~97.5%** (unchanged — build/runtime/security quick pass improved confidence, but R2 E2E, Resend production E2E, rate limiting, real domain, and automated tests remain open)
- R2 file E2E blocked: live `.env` still has placeholder `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, and `R2_BUCKET_NAME`; direct R2 TLS/API test fails before upload. Provision real Cloudflare R2 credentials before file-flow QA.
- Commit `97b2d53 chore: restore clean lint and production build` pushed to `origin/main` and deployed via `docker compose up -d --build cubicle`.
- Verification after deploy: `/` 200, `/api/health` 200 `{"status":"ok","db":"ok"}`, `/login` 200, `/signup` 200, `/app/brain` 307 protected redirect.
- Runtime after deploy: `cubicle-cubicle-1` healthy, `cubicle-pg` healthy, low CPU/RAM.
- P0 quick security pass: no rogue `/tmp/postgresql`, Postgres process list normal, `/tmp` clean, app and DB ports not directly published, containers only on `dokploy-network`, mounts expected.
- Notable VPS hardening follow-up: SSH auth log shows ongoing internet brute-force attempts against random usernames; consider fail2ban/SSH hardening.
>
> **Resolved in this continuation session (16 Jun):**
> - P0.1 rogue /tmp/postgresql regression — confirmed gone (no rebuild)
> - P0.7 npm audit — 5 of 6 fixed via `overrides: esbuild ^0.28.1`,
>   1 accepted (postcss nested in next@16.2.9, build-time, not
>   exploitable in authored-CSS pipeline)
> - P0.8 lint cleanup — re-verified 0 warn / 0 err / tsc clean
>   (was already cleared in commit a149097)
> - P1.1 mobile QA pass 2 — authed /app/* verified 4 viewports
>   × 8 pages, 32/32 OK, overflow 17→1 (iPad edge case acceptable)
> - P1.3 demo workspace polish — files 1→9 (6 client + 3 internal),
>   time_entries 6→9 (+3 realistic, -1 stub), comments 4→8 (+4),
>   appointments 3→2 (-1 odd Jan 2027)
> - P2.2 forget-password path — closed (SDK uses
>   /api/auth/request-password-reset, 200 OK; old /forget-password
>   was pre-1.x path, now stale)
> - P2.3 PDF visual verify — route live
>   (GET /api/invoices/[invoiceId]/pdf), 3/3 invoices render
>   with purple accent stripe, color-coded status badges
>   (SENT/DRAFT/PAID), line items, totals, footer with "Cubicle"
>   + "Page X of Y". Fix: removed "use client" from
>   invoice-pdf.tsx (was breaking server render). Re-verified in
>   continuation session: multi-page (3 pages) "Page 3 of 3"
>   footer OK, paid invoices now show "Paid" + IDR 0 instead
>   of "Amount Due" + total. Commit 1b300a8.
>
> **Held per Alip 16 Jun (low priority until needed):**
> - P2.5 external uptime + CPU/RAM alert — revisit when needed
> - P1.6 real domain — needs Alip's purchase decision
> - P2.2 RESEND prod + sender domain — blocked by P1.6
>
**Still open low-priority:**
- Payment gateway / Midtrans integration for paid plan checkout and invoice payment links
- Multi-workspace billing/subscription management
- 1 npm audit (accepted, see P0.7 notes)
- iPad 768px invoice detail table: 38px overflow (accept, table
  has horizontal scroll within overflow-x-auto wrapper)

**Sprint O (19 Jun) closed:**
- P2.1 billingName + P2.6 IDR billing extras — workspace schema
  extended with billing_email / billing_phone / tax_id (NPWP);
  migration 0007 applied to live DB; demo workspace seeded with
  full Acme Creative Studio billing block; PDF invoice header now
  renders company + address + phone + email + NPWP. Indonesian
  legal-grade invoicing complete. Tag `mvp-v0.1.18-billing-extras`,
  commit `6afff6d`.
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
> P2.3 Invoice PDF polish ✅ CLOSED (Sprint G 16 Jun — multi-page verified)
> Sprint F AI Assistant v1.1 ✅ (16 Jun — 12 tools, persistence, action confirm)
> Sprint F.2 AI streaming ✅ (16 Jun — SSE, Stop, 9router fix)
> Sprint F.3 AI v1.2 ✅ (17 Jun — search, prompt library, voice, export, 15 tools)
Sprint H P2.8.1 Expense CRUD ✅ (18 Jun — expenses, categories, project-tag)
Sprint I P2.8.2 Reports ✅ (18 Jun — 4 new AI tools, /app/reports dashboard)
Sprint J P2.7.1 Proposal ✅ (18 Jun — accept flow, auto-create project+invoice)
Sprint K P2.8 Recurring + Cash flow ✅ (18 Jun — 2 new AI tools, forecast card)
Sprint L P2.7.2 Questionnaire ✅ (19 Jun — form builder, public /intake, 8 field types)
Sprint M P2.7.3 Contract + E-sig ✅ (19 Jun — signature pad, audit trail, AI tools)
Sprint N Contract PDF + Q AI ✅ (19 Jun — downloadable signed PDF, 3 new AI tools)

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

**Status 2026-06-16: PASS pass 2.**

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
- Pass 2 (this session): 32/32 authed routes load (4 viewports
  × 8 pages) with cookie injection via Better Auth API → context
  cookie. Overflow: 17 → 1 (iPad 768px invoice detail table needs
  horizontal scroll within overflow-x-auto wrapper, expected).
  Key fixes:
  - `app-shell.tsx` content area + `<main>` + topbar search form
    all got `min-w-0` to allow flex-1 children to shrink below
    their intrinsic content size
  - Page header pattern `flex items-center justify-between` →
    `flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between`
    on 6 pages (clients/projects/tasks/files/time/invoices)
  - Action buttons: `w-full sm:w-auto` (full-width on mobile)
  - Time filters: From/To date inputs stack vertically on mobile,
    span 2 cols; original grid was overflowing 90+px
  - File list metadata row: `flex-wrap` with `truncate max-w-[X]`
    on long mimeType and uploaderName spans
  - Invoice detail line items: compact columns on mobile
    (w-14/w-20/w-20/w-6 + gaps-2), restore w-20/w-28/w-28/w-10
    + gaps-4 at sm breakpoint
- QA script: `scripts/mobile-qa-pass2.cjs` (committed) — reusable
  for regression testing future layout changes. Uses playwright
  + google-chrome + Better Auth API login → cookie injection.

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
### P2.3 Invoice PDF polish — ✅ DONE (verified 2026-06-16, commit 1b300a8)

> Code complete, typecheck clean, lint clean, visual verified.

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

Verified 2026-06-16 (commit 1b300a8):
- ✅ Workspace `billing_name` seeded → PDF header shows "Acme Creative Studio"
  (was "Company Name" placeholder)
- ✅ Status badge color coding confirmed: DRAFT gray, SENT blue, PAID green
- ✅ Multi-page render tested (added 30 items → INV-0002 = 3 pages, footer
  "Page 3 of 3" + workspace name renders clean)
- ✅ Bug fix: paid/cancelled invoices now show "Paid"/"Cancelled" label
  + IDR 0 instead of "Amount Due" + total (was confusing on paid invoices)
- ✅ Reverted test data — all 3 invoices back to original state
- ✅ Rebuild + restart cubicle-cubicle-1: PDF routes still 200
- ✅ Lint clean, tsc clean, push to main OK

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

### P2.6 Reply-To email header — 📋 NEXT SPRINT (Alip-approved 16 Jun)

> Fast follow-up to P2.2: avoid Gmail OAuth complexity by using Resend's
> Reply-To header. User sets their Gmail in workspace settings → all
> outbound emails have Reply-To pointing at their address, so customer
> replies land in their personal inbox.

Why this vs Gmail OAuth send:

```text
Gmail OAuth  →  1-2 mgu code + 4-6 mgu Google verification + per-user setup
                + restricted-scope compliance + token refresh/revoke handling
Resend + Reply-To  →  1-2 jam code + $12 domain + zero OAuth
                       + 80% of the perceived effect (replies still arrive)
```

Tasks:

```text
1. Buy domain (cubicle.app or similar) — Alip decision
2. Add domain in Resend dashboard, set TXT records, wait for verify
3. Set RESEND_API_KEY + EMAIL_FROM=noreply@<domain> in prod .env
4. Add `reply_to_email text` column to workspaces table (Drizzle migration)
5. Add input field in /app/settings → "Reply-to email" (email format validation)
   - Default: empty (no Reply-To header, replies go to default)
   - Option: auto-fill from session.user.email (skip step 5, no UI)
6. Update src/lib/notifications.ts → read workspace.reply_to_email
   and pass as `replyTo` to Resend (all 6 wrappers)
7. E2E test: kirim invoice ke alip+test@gmail.com, reply, verify nyampe
   ke Reply-To address
```

Acceptance criteria:

```text
Reply-to email field exists in workspace settings
Outbound emails include Reply-To header when set
Customer reply to invoice/appointment/portal notification lands in user's inbox
Resend default fallback (no Reply-To) still works
Empty/invalid email gracefully skipped, not crash
```

Effort: ~1-2 jam code + $12 domain + 30 min DNS setup
Blocked by: domain purchase (P1.6, same domain satisfies both)
Risk: low — header additive, doesn't break existing email flow

### P2.7 Pre-deal workflow — Proposal + Questionnaire + Contract (Alip-approved 16 Jun)

> Closes the gap vs HoneyBook / Bonsai / 17hats / Dubsado, all of which
> have full pre-deal chain (proposal → contract → intake). Cubicle currently
> covers only post-deal (booking → invoice → portal). 3 interlocked features
> that form one workflow.

**Why this matters:** without these 3, freelancer can only manage existing
client work — no tooling for *acquiring* new clients through the product.
Every Indonesian competitor (Jurnal, Moka, Mekari) targets different segment
so this is whitespace; global competitors own the segment but are English/USD.

#### P2.7.1 Proposal

Send a price + scope + timeline document to a prospective client. On accept,
auto-create a project + down-payment invoice.

Tasks:

```text
1. `proposals` table (id, workspace_id, client_id, template_id, line_items jsonb,
   total, status, valid_until, shared_token, accept_at, decline_at)
2. `proposal_templates` table (workspace_id, name, body_markdown, default_items)
3. `/app/proposals` list + create/edit page
4. Public route `/proposal/[token]` → render branded doc, Accept/Decline buttons
5. On accept: create `projects` row + `invoices` row (50% down payment) + activity log
6. On decline: status → declined, log reason (optional note)
7. Email notification (reuses P2.6 Reply-To)
```

Effort: 1-2 minggu
Risk: medium (template system + state machine has edge cases)

**Status 2026-06-18: ✅ SHIPPED (Sprint J).** MVP scope: `proposals` table, list+create+detail pages, public `/proposal/[token]`, Accept/Decline flow that auto-creates project + 50% down-payment invoice. `proposal_templates` and email notification deferred (reuse P2.6 when email goes prod). AI tools: `list_proposals`, `get_proposal` (26 total tools).

#### P2.7.2 Questionnaire (Client Intake)

Form builder → send to client → responses become project brief.

Tasks:

```text
1. `questionnaires` table (id, workspace_id, name, schema jsonb)
2. `questionnaire_responses` (id, questionnaire_id, client_id, answers jsonb, submitted_at)
3. `/app/questionnaires` list + form builder UI (text/textarea/select/multi-choice/file)
4. Public route `/intake/[token]` → fill form
5. On submit: answers stored + linked to project (post-creation) or stored as "pending brief"
6. Email notification to workspace owner
```

Effort: 1-2 minggu
Risk: medium (form builder UI takes time, schema validation tricky)

**Status 2026-06-18: ⏳ PLANNED (Sprint L).** Schema + send/fill/response flow. Will ship before P2.7.3.

**Status 2026-06-19: ✅ SHIPPED (Sprint L).** `questionnaires` + `questionnaire_responses` tables, list/create/detail pages, form builder (8 field types: text/textarea/select/multiselect/number/date/email/url), public `/intake/[token]` route, response viewer. Accept → answers become project brief (or stand-alone intake). AI tools deferred (gated on usage).

#### P2.7.3 Contract (E-signature)

Template + send → client signs → audit trail + signed PDF stored.

Tasks:

```text
1. `contracts` table (id, workspace_id, client_id, template_id, body, status,
   signature_data_url, signed_at, ip_address, user_agent)
2. `contract_templates` table (workspace_id, name, body_markdown, variables)
3. `/app/contracts` list + template manager
4. Public route `/contract/[token]` → render doc, sign button, draw signature pad
5. On sign: capture data URL + IP + UA, generate signed PDF (reuse @react-pdf/renderer),
   store in R2, lock the contract
6. Activity log + email notification
```

Effort: 2-3 minggu
Risk: high (legal weight — needs audit trail, IP/UA capture, PDF tamper-resistance;
or use DocuSign/HelloSign embed which is faster but $20-50/mo per workspace)

**Status 2026-06-18: ⏳ PLANNED (Sprint M).** Will reuse P2.7.2 patterns + @react-pdf/renderer for signed PDF.

**Status 2026-06-19: ✅ SHIPPED (Sprint M).** `contracts` + `contract_templates` tables, list/detail pages, public `/contract/[token]` with canvas-based signature pad, audit trail (IP + UA + signed_at + signed_name/email), send/revoke/decline flows, template variable interpolation (`{{client.name}}`, `{{workspace.name}}`, `{{today}}`, `{{valid_until}}`). PDF generation deferred — signed contract data stored as base64 PNG signature + full audit trail; can be regenerated to PDF in a follow-up sprint.

#### Combined acceptance criteria

```text
Proposal → accepted → project + invoice auto-created
Questionnaire → submitted → answers visible in project brief
Contract → signed → audit trail + signed PDF in R2
All 3 send via Reply-To email (P2.6)
Public routes work in incognito (token-based, no account)
```

#### Combined effort

```text
Naive (build all from scratch):  ~6-8 minggu
With DocuSign embed for contract: ~4-5 minggu (saves 1-2 mgu)
With HelloSign embed: same, ~$25/mo per workspace
```

#### When to ship

```text
Phase 1 (MVP+):  Proposal + Questionnaire  — 3-4 minggu
Phase 2 (Pro):    Contract (e-sig)         — 2-3 minggu (or DocuSign embed)
```

#### Strategic note

These 3 features only matter if Cubicle targets *new-client-acquisition-heavy*
freelancers (designers, agencies, coaches). For *repeat-client* freelancers
(1-2 long-term clients), Proposal/Questionnaire are bloat — current
booking → invoice flow is enough. **Pick ICP first** (per A/B/C discussion),
then commit to P2.7 phases.

### P2.8 Finance module — Income + Expense + Reports (Alip-approved 16 Jun)

> Alip decision: Option B (income from invoices + manual expense entry),
> manual entry only (no CSV import, no AI receipt OCR in this iteration),
> skip tax helpers (PPN/PPh/e-Faktur) for now. Real freelancer pain:
> "gue bingung bulan ini untung apa rugi" + "expense project mana paling
> gede". Currently no P&L view, no expense tracking, no report layer.

**Why merge with invoice, not separate app:**

```text
❌ Separate finance app
   → 2x manual entry (invoice di Cubicle, income/expense di finance app)
   → reconcile manual antara 2 app tiap bulan
   → user drop minggu ke-2
✅ Gabung sebagai view layer
   → income auto-derive dari invoices (zero entry)
   → expense 1x entry di Cubicle, tag ke project
   → report cross-reference income vs expense per project
```

**Architecture (minimum):**

```text
Existing (no change):           New:
  invoices (income source)        expenses table
  projects (tag expense)            columns: id, workspace_id, project_id? (nullable),
  time_entries                       category, amount, currency, date,
  clients                            description, receipt_url? (R2), vendor?,
  bookings                           tax_included bool, created_at
  workspace_billing (for email)
                                 expense_categories table
                                   columns: id, workspace_id, name, color, icon
                                 (optional later) expense_recurring table
```

**Reports auto-generated (zero entry, just SQL aggregate):**

| Report | Source | Use case |
|---|---|---|
| Daily P&L | invoices (paid today) + expenses (today) | "Hari ini gue untung/rugi" |
| Monthly P&L | aggregate by month | Tax prep, monthly review |
| Yearly summary | aggregate by year | e-Faktur ready (future) |
| Per-client revenue | invoices grouped by client_id | "Client mana paling profitable" |
| Per-project P&L | invoice income + tagged expenses | "Project A 40% margin, B 25%" |
| Unpaid invoice aging | invoices where status != paid | "Siapa belum bayar, berapa lama" |
| Top expense categories | expenses grouped by category | "Software paling gede, cut?" |
| Cash flow forecast | upcoming invoices + recurring expenses | "Bulan depan cukup ga" |

**Reduce manual entry friction (manual-only mode):**

```text
1. Quick-add form: 4 fields (date, amount, category, project?)
2. Project dropdown auto-filled dari existing projects
3. Category dropdown dari workspace's expense_categories
4. Receipt upload ke R2 (reuse file infrastructure) — opsional
5. Default categories seeded: Software, Hardware, Travel, Meals,
   Office, Marketing, Professional Services, Other
6. Currency per workspace (default IDR, USD juga bisa)
```

**Out of scope (per Alip, skip dulu):**

```text
❌ Bank CSV import (batch entry)              — future
❌ AI receipt OCR (snap foto struk)            — future
❌ Bank reconciliation                        — future
❌ Multi-currency conversion (auto FX)        — future
❌ Tax helpers (PPN 11%, PPh 23, e-Faktur)    — future (P2.9 candidate)
❌ Recurring expense auto-create               — future
```

**Phased plan:**

```text
P2.8.1 Expense CRUD + categories + per-project tag     2 mgu
  - expenses + expense_categories tables
  - /app/expenses list + create/edit/delete
  - Project dropdown, category dropdown
  - Receipt upload ke R2 (opsional, not blocking)
  - Default category seed

P2.8.2 Auto reports (P&L, aging, top expenses)         1 mgu
  - /app/reports dashboard
  - 5-6 widgets/charts (Chart.js or Recharts)
  - Date range filter (day/month/year/custom)
  - Export to CSV
  - Per-project + per-client + aggregate views
                                                       -----
                                                       3 mgu core
```

**Acceptance criteria (P2.8.1 + P2.8.2 combined):**

```text
User can add expense in <30 seconds (4 fields)
Expense tagged to project (or untagged) correctly
Monthly P&L shows real number (sum of paid invoices - expenses in period)
Per-project P&L shows margin correctly
Unpaid invoice aging shows days outstanding
CSV export downloads with all data
Default categories seeded for new workspace
Empty state for new workspace ("Add your first expense")
```

**Strategic note:**

Finance module paling kuat untuk **🅐 Indonesian depth direction** —
PPN 11% + PPh 23 helpers di Phase 2 = real differentiation vs Jurnal/MEKARI
(mereka punya tapi generic, lo punya project-aware + Indonesian-first).

Untuk **🅱 minimalist** — P2.8.1 doang cukup (expense tracking, no reports).
P2.8.2 reports bisa di-skip kalau target anti-tool.

Untuk **🅒 vertical** — tailor reports ke vertical (designer = budget per
revision round; coach = session cost; translator = word count cost).

**Gated on:** ICP decision (A/B/C/D) seperti P2.7.

**Score impact (if shipped):** 91% → ~93% (P2.8.1+2.8.2 core).

**Status 2026-06-18: ✅ SHIPPED 3/3 (Sprints H + I + K).**
- **P2.8.1 Expense CRUD + categories + per-project tag** (Sprint H) — `expenses` + `expense_categories` tables, /app/expenses list/create/edit/delete, 8 default categories seeded, project dropdown, per-project view
- **P2.8.2 Auto reports (P&L, aging, top expenses)** (Sprint I) — /app/reports with YTD P&L + monthly bar chart + per-project + per-client + aging buckets + top categories. AI tools: `project_pl`, `client_revenue`, `invoice_aging`, `top_expense_categories`
- **Sprint K extension: Recurring + Cash flow forecast** — `expense_recurring` table, `generateFromRecurring` action, cash flow card on Reports with 3-month outlook. AI tools: `cash_flow_forecast`, `list_recurring`

---

### Sprint F — AI Assistant v1.1 ✅ DONE (16 Jun)

Floating chat panel on every `/app/*` page. Answers questions about workspace data and performs 2 action types (with user confirm in UI).

**What shipped:**
- 10 read tools: list_clients/projects/tasks/invoices, get_client/project/task/invoice, get_workspace_summary, list_workspace_members
- 2 action tools: update_task_status, draft_invoice_reminder (require UI confirm before write)
- Conversation persistence: `ai_conversations` + `ai_messages` tables, auto-titled from first user message
- History sidebar with load/delete/new chat
- Strip thinking: defensive `stripThinking()` drops `<think>...</think>` blocks from model output (MiniMax-M3 is a reasoning model that leaks by default)
- 4 API endpoints: `POST /api/ai/chat`, `GET /api/ai/conversations`, `POST/DELETE /api/ai/conversations`, `POST /api/ai/action`

**Stack:** agentic RAG via 9router (OpenAI-compatible), `tr/MiniMax-M3` model. No embeddings — structured Drizzle queries via tool functions. 3 round-trip max per turn. Last 20 messages of history.

**Cost:** ~7-16K tokens per Q, ~$0.01/Q. 1k Qs/month ≈ $10/mo per active workspace.

**Verified live (16 Jun):**
- "How's the business?" → 1 tool call, summary
- "Tell me about Kopi Senja" → 1 drill-down, joined projects + open invoices
- "Mark 'Internal budget review' as done" → confirmation card with currentStatus→newStatus
- "Draft a payment reminder for INV-0001" → confirmation card with subject+body
- Action confirm → DB write successful (status: todo → done)
- Conv list returns 5+ chats with correct message counts
- No `<think>` blocks leak in user-facing response

**Files (12):**
- New: `src/lib/ai/{client,strip,tools,system-prompt,conv-store}.ts`
- New: `src/app/api/ai/{chat,action,conversations}/route.ts`
- New: `src/components/ai/chat-panel.tsx`
- New: `scripts/migrate-ai-tables.sql`
- Modified: `src/db/schema.ts` (2 new tables), `Dockerfile` (AI env vars)
- Doc: `docs/ai-assistant.md` (full reference)

**Known gaps (not blockers):**
- ~~No streaming yet~~ ✅ Sprint F.2 — SSE streaming live, Stop button in UI
- Resend API key invalid in build → action endpoint gracefully fails
- R2 storage still placeholders (logo used public screenshot fallback)
- Hardcoded to `acme-creative` workspace (matches demo data)

### Sprint F.3 — AI Assistant v1.2 ✅ DONE (17 Jun 2026)

Daily-driver usability pass on the AI panel: workspace search, prompt library, voice input, export.

**What shipped:**
- **Workspace search** (`search_workspace` tool): typo-tolerant fuzzy match across clients, projects, tasks, invoices via `pg_trgm` GIN indexes. Test: user typed "Kopp Sennja" → model self-corrected to "Kopi Senja" → sim=1.0 match.
- **Prompt library tools** (`list_prompts`, `get_prompt`): enumerate system prompts + drill into a specific template body. Lets the AI propose using "Social Caption" or "Client Update" template.
- **Voice input**: Web Speech API integration. Mic button in chat input, feature-detected (hidden on unsupported browsers like Firefox), live transcript fills the input, click again to stop.
- **Stop streaming**: red X button in panel header during generation, calls `controller.abort()` to cancel the SSE stream.
- **Token display**: "7,090 tokens" shown after each AI response (sum of prompt + completion).
- **Export to markdown**: `GET /api/ai/conversations/export?conv=ID` returns `.md` with all messages and tool call details. Download button in panel header.

**Stack add:**
- `pg_trgm` extension on PG (idempotent migration `0002_ai_search_indexes.sql`)
- 4 GIN indexes: `clients.name`, `projects.name`, `tasks.title`, `invoices.invoiceNumber`
- Web Speech API (browser-native, no backend change)

**Files (4):**
- New: `drizzle/0002_ai_search_indexes.sql`
- New: `src/app/api/ai/conversations/export/route.ts`
- Modified: `src/lib/ai/tools.ts` (+3 tools, 15 total)
- Modified: `src/components/ai/chat-panel.tsx` (Mic, Stop, token display, export button, AI_DEBUG=1)

**Verified live (17 Jun):**
- "Kopp Sennja" → fuzzy match → drill with `get_client` ✅
- `list_prompts` returns 3 templates, `get_prompt` "Social Caption" pulls full body ✅
- Multi-step planning: `get_prompt` → `get_client` → 3-post plan in single turn ✅
- Mic button visible, Web Speech API detected, hooks wired ✅
- Export endpoint returns proper markdown with tool details ✅
- 9router SSE regression fix: `await res.json()` switched to stream-first parsing for both `chat()` and `streamChat()` ✅

**Known gaps:**
- Voice input: English-only, no live interim punctuation
- Stop button: too fast on small queries to screenshot (working but instant)

**Strategic value:**
- Standout differentiator vs ClickUp/Asana/Notion (none of them have RAG-over-data chat)
- Demo-friendly: 1 click → "how's the business" → full data summary
- Proves 9router + tool-calling pattern works; foundation for Phase 2 (embeddings, smart nudges)

### Sprint J — P2.7.1 Proposal ✅ DONE (18 Jun 2026)

Pre-deal workflow phase 1: send a proposal to a prospective client, on accept auto-create project + down-payment invoice.

**What shipped:**
- `proposals` table (workspace_id, client_id, title, line_items jsonb, total, currency, status, valid_until, shared_token, accept_at, decline_at)
- Server actions: `createProposal`, `updateProposal`, `deleteProposal`, `sendProposal` (regenerates token), `acceptProposal` (idempotent), `declineProposal`
- Public route `/proposal/[token]` — branded render, Accept/Decline buttons, no auth required
- `/app/proposals` list, `/app/proposals/new`, `/app/proposals/[id]` detail with status + actions
- On accept: auto-create `projects` row + `invoices` row (50% down payment) + activity log
- AI tools: `list_proposals`, `get_proposal`

**Files (4 new + 3 modified):**
- New: `src/lib/actions/proposals.ts`, `src/app/proposal/[token]/page.tsx`, `src/app/app/proposals/{page,new/page,id/page}.tsx`
- New: `src/db/schema.ts` (+`proposals` table)
- Modified: `src/lib/ai/tools.ts` (+2 tools, 24→26), `src/components/app-shell.tsx` (sidebar nav), `src/db/schema.ts` enum

**Verified live (18 Jun):**
- /app/proposals 200, "Brand refresh — phase 1" draft IDR 5,550,000 renders
- "what proposals do I have?" → AI returns full details + suggests "Want send?"
- Public /proposal/[token] renders branded doc, Accept/Decline buttons

**Deferred (gated on P2.6 email prod):**
- Email notification when proposal sent (reuse P2.6 Reply-To)
- `proposal_templates` table (use case is power-user; MVP inline-edit is enough)

### Sprint K — P2.8 Recurring + Cash flow ✅ DONE (18 Jun 2026)

Closes the last gaps in finance module: recurring expenses (rent, SaaS subs) and forward-looking cash flow.

**What shipped:**
- `expense_recurring` table (workspace_id, category_id, project_id?, amount, currency, frequency enum [monthly/quarterly/yearly], start_date, end_date?, is_active, last_generated_at)
- Server actions: `createRecurring`, `updateRecurring`, `deleteRecurring`, `generateFromRecurring` (auto-advances `last_generated_at`)
- Cash flow forecast card on Reports page: 3-month outlook = (projected income from upcoming invoices) - (projected expenses from active recurring rules)
- AI tools: `cash_flow_forecast` (months?, max 12), `list_recurring` (isActive?)

**Verified live (18 Jun):**
- "will I have enough cash next 3 months?" → cash_flow_forecast with per-month table, AI flags "Zero recurring expenses likely means rules not setup"
- Reports page shows Cash flow card with month-by-month breakdown

**Score impact:** Production client-ready ~92% → ~93% (Recurring adds ops utility, Cash flow adds strategic insight, Proposal adds client-acquisition flow).

### Sprint L — P2.7.2 Questionnaire ✅ DONE (19 Jun 2026)

Client intake forms: build a form, send to a client, get back structured responses that become the project brief.

**What shipped:**
- `questionnaires` table (workspace_id, name, description, schema jsonb)
- `questionnaire_responses` table (questionnaire_id, client_id, project_id?, respondent_name/email, answers jsonb, status [pending|submitted], shared_token_hash, expires_at)
- 8 field types supported: text, textarea, email, url, number, date, select, multiselect
- Form builder UI: add/remove/reorder fields, label/required/placeholder, options for select/multiselect
- Public route `/intake/[token]` — branded render, no auth required
- Status flow: draft → send (generates token) → pending → submitted (locked)
- Response viewer in /app/questionnaires/[id] — expand each response to see field-by-field answers
- Per-field types: text/textarea/email/url/date → input; number → numeric input; select → dropdown; multiselect → checkbox group

**Files (8 new + 1 modified):**
- New: `drizzle/0005_questionnaires.sql`, `src/lib/actions/questionnaires.ts`
- New: `src/app/(app)/app/questionnaires/{page,new/page,[questionnaireId]/page}.tsx`
- New: `src/app/intake/[token]/page.tsx`
- New: `src/components/questionnaires/{questionnaire-builder,send-questionnaire-button,response-viewer,intake-form}.tsx`
- Modified: `src/db/schema.ts` (+2 tables, +2 relations), `src/components/app-sidebar.tsx` (nav entry)

**Verified live (19 Jun):**
- /app/questionnaires 200 (authed)
- Build clean (tsc 0, pnpm build OK)
- Container rebuilt + restarted

**Deferred:**
- AI tools (list/get) — gated on usage; add if AI panel users start asking about responses
- File upload field type — would need R2 wiring; current 8 types cover the common cases
- Auto-link response to project on accept — responses are project-aware via project_id at send time

**Score impact:** Production client-ready unchanged at ~93% (utility feature, not strategic differentiator).

### Sprint M — P2.7.3 Contract + E-signature ✅ DONE (19 Jun 2026)

Closes the last pre-deal phase: send a contract to a client, they sign in-browser, you get an audit trail.

**What shipped:**
- `contract_templates` table (workspace_id, name, body markdown, is_default)
- `contracts` table (workspace_id, client_id, project_id?, template_id?, title, body + body_resolved, variables jsonb, valid_until, status, decline_reason, signed_name/email, signature_data_url, signed_at, signed_from_ip, signed_user_agent, token_hash, expires_at, revoked_at, sent_at, viewed_at, declined_at)
- 6 statuses: draft → sent → viewed → signed | declined | expired | revoked
- Variable interpolation at send time: `{{client.name}}`, `{{client.email}}`, `{{project.name}}`, `{{workspace.name}}`, `{{today}}`, `{{valid_until}}` — `body_resolved` stored immutable
- Public route `/contract/[token]` — branded render, no auth required
- Canvas-based signature pad (HTML5 pointer events, no extra deps) — supports mouse, trackpad, touch
- Audit trail: signed_name + signed_email + signed_at + signed_from_ip + signed_user_agent captured server-side
- Decline flow: optional reason
- Revoke flow: marks token revoked, link stops working
- Default contract template seeded: service agreement skeleton with `{{variable}}` placeholders
- AI tools: `list_contracts` (status?, clientId?), `get_contract` (contractId | title)

**Files (10 new + 2 modified):**
- New: `drizzle/0006_contracts.sql`
- New: `src/lib/actions/contracts.ts` (15 server actions: CRUD templates + contracts, send, sign, decline, revoke, getPublic)
- New: `src/app/(app)/app/contracts/{page,[contractId]/page}.tsx`
- New: `src/app/contract/[token]/page.tsx` (public, no auth)
- New: `src/components/contracts/{create-contract-button,send-contract-button,revoke-contract-button,signature-pad}.tsx`
- Modified: `src/db/schema.ts` (+2 tables, +2 relations), `src/components/app-sidebar.tsx` (nav), `src/lib/ai/tools.ts` (+2 tools, 26→28)

**Verified live (19 Jun):**
- /app/contracts 200
- /contract/test-token-123 200, renders title + client name + signature pad + draw instruction
- Visual: signature canvas dashed box, contract body readable, layout clean
- AI: "What contracts do I have?" → list_contracts call → returns `[]` (correct, none signed yet)
- Build clean (tsc 0, pnpm build OK, all routes registered)

**Deferred:**
- Signed PDF generation (data URL signature + audit trail stored; PDF can be regenerated in follow-up sprint)
- `contract_templates` management page (templates created via API/direct DB; UI deferred — inline edit on contract is enough for MVP)
- DocuSign/HelloSign embed (out of scope for Indonesian segment; our $0 native flow is the differentiator)
- Email notification when contract sent (gated on P2.2 RESEND prod)

**Score impact:** Production client-ready ~93% → ~94% (closes P2.7 phase 3, completes pre-deal feature parity with HoneyBook/Bonsai/17hats for Indonesian segment).

### Sprint N — Contract PDF + Questionnaire AI tools ✅ DONE (19 Jun 2026)

Closes the last two gaps from Sprint L+M: downloadable signed contract PDF + AI coverage for questionnaires.

**What shipped:**
- `ContractPDF` React-PDF document: branded header (Provider / To), 2-column parties block, resolved body (markdown headings + paragraphs), signature block with embedded signature image + audit trail (name, email, IP, signed_at), purple accent stripe, page footer with "Page X of Y" + workspace name
- `GET /api/contracts/[contractId]/pdf` — server-side render, auth + workspace membership check, returns application/pdf inline (browser preview or download)
- "Download PDF" button on /app/contracts/[id] detail page (owner + member can download; viewer can also since it's a view op)
- Decision: **on-demand generation** (not auto-stored on sign) — saves DB space, signature data already in DB for audit trail, re-renderable any time
- AI tools: `list_questionnaires`, `list_questionnaire_responses` (questionnaireId required, status? pending/submitted), `get_questionnaire_response` (responseId required) — 28→31 total

**Files (3 new + 2 modified):**
- New: `src/components/contracts/contract-pdf.tsx` (React-PDF Document, 350+ lines, 6 status badge styles, light markdown parser for h1/h2/p)
- New: `src/lib/pdf/contract-pdf.ts` (renderContractPdf helper)
- New: `src/app/api/contracts/[contractId]/pdf/route.ts` (auth + membership + render)
- Modified: `src/app/(app)/app/contracts/[contractId]/page.tsx` (+ Download PDF button)
- Modified: `src/lib/ai/tools.ts` (+3 tool defs, +3 functions, +3 dispatch cases, +2 schema imports)

**Verified live (19 Jun):**
- `GET /api/contracts/a9f48554-.../pdf` → 200, application/pdf, 13292 bytes, valid PDF-1.3, 1 page
- AI "What intake questionnaires do I have?" → list_questionnaires → `[]` → suggests "Want me to help draft one?"
- AI "Show me the latest intake response" → multi-step: list_questionnaires → list_questionnaire_responses → formatted output with budget, timeline, project goals
- AI self-corrects from invalid UUID (test-q) → search_workspace → list_questionnaires → correct response

**Score impact:** Production client-ready ~94% → ~95% (downloadable signed contract with embedded signature + audit trail is a legal-grade deliverable; AI coverage now 28→31 tools with questionnaire support).

**Held items unchanged:** P1.6 real domain, P2.2 RESEND prod, P2.5 external monitoring, contract_templates UI page, signed PDF auto-store.

### Sprint N-ext — Contract Templates CRUD + Demo Seed ✅ DONE (19 Jun 2026)

Closes two follow-ons from Sprint M+N: dev/owner can now manage contract template library via UI (no DB SQL needed), and the demo workspace is pre-loaded with realistic data so the demo "clicks" without manual setup.

**What shipped:**
- **Contract Templates UI** (4 new pages + 1 client component):
  - `/app/contract-templates` — list with default badge + usage count
  - `/app/contract-templates/new` — builder with name + textarea + 9 variable chips
  - `/app/contract-templates/[id]` — edit existing template (delete + save)
  - `ContractTemplateBuilder` — name input, body textarea (mono font, char counter), 9 clickable variable chips (client.name/email/company, project.name, workspace.name, today, valid_until, value, scope), default toggle, 50000 char limit
  - Sidebar "Templates" link (between Contracts and Calendar)
- **Demo seed** (`scripts/seed-demo.sql`, idempotent):
  - 1 default contract template (Standard Service Agreement, 5-section, with placeholders)
  - 1 signed contract (Kopi Senja / Brand Refresh — Rp 18M, Rina Wijaya signed 8 days ago, IP+UA captured)
  - 1 sent proposal (Klinik Harmoni / Website Redesign — Rp 35M, 4 line items, valid until 15 Jul 2026)
  - 1 submitted questionnaire response (Budi Santoso / PT Awan Digital — Rp 45M budget, 1-2 weeks timeline)
  - 3 invoices in mixed states (paid / sent / overdue) for dashboard color

**Files (5 new + 1 modified):**
- New: `src/app/(app)/app/contract-templates/page.tsx` (list)
- New: `src/app/(app)/app/contract-templates/new/page.tsx`
- New: `src/app/(app)/app/contract-templates/[templateId]/page.tsx`
- New: `src/components/contracts/contract-template-builder.tsx` (320 lines, client component, useTransition + useRouter)
- New: `scripts/seed-demo.sql` (idempotent, ~120 lines, PL/pgSQL block)
- Modified: `src/components/app-sidebar.tsx` (+1 nav item)
- Bug fix: `count()` destructuring in list page — was passing object to `Number()` causing `toLocaleString` crash; fixed to `Number(result[0]?.c ?? 0)`

**Verified live (19 Jun):**
- `/app/contract-templates` → 200, 2 templates render (Standard Service Agreement = default + 1 contract; NDA — Mutual = 0 contracts)
- `/app/contract-templates/new` → 200, builder renders, sidebar Templates link visible, all 9 variable chips clickable
- `/app/contract-templates/[id]` → 200, edit page renders with delete + save
- `/app/contracts/[id]` for demo contract → 200, all resolved data renders (Brand Refresh, Kopi Senja, Rina Wijaya, Rp 18,000,000, June/August dates)
- `/api/contracts/[id]/pdf` → 200, 20521 bytes, **2-page** valid PDF-1.3 (longer demo body)
- Demo seed: 2 templates / 2 contracts / 2 proposals / 2 questionnaire responses / 6 invoices live

**Score impact:** No change to top-line score (templates CRUD is owner-facing not client-facing; demo seed makes existing 99% demo actually feel populated).

**Held items unchanged:** P1.6 real domain, P2.2 RESEND prod, P2.5 external monitoring, signed PDF auto-store.

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

**✅ Hardening status (16 Jun 2026, P0.9 shipped):**

- ✅ App container `cap_drop: [ALL]`, `cap_add: [NET_BIND_SERVICE]`, `no-new-privileges`
- ✅ `npm install --ignore-scripts` (supply chain hardening)
- ✅ `/api/health` endpoint with DB ping (200 ok / 503 degraded)
- ✅ Docker healthcheck: `wget http://127.0.0.1:3000/api/health` (IPv4 explicit)
- ✅ Security headers: HSTS preload, X-Frame-Options DENY, X-Content-Type-Options,
  Referrer-Policy strict-origin-when-cross-origin, Permissions-Policy (no camera/mic/geo/FLoC)
- ✅ Resource limits: app 1.5 CPU/1G mem, PG 1.0 CPU/1G mem
- ✅ Non-root user (nextjs uid 1001)
- ⏸ pids_limit: dropped (compose conflict with deploy.resources)
- ⏸ fail2ban/SSH hardening: VPS-level, separate workstream
- ⏸ DB port closure: not applicable (sibling container, no public exposure)

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

### Sprint E — Email Reply-To (next sprint, post-16 Jun)

> Triggered by Alip's request: customer reply should land in their
> inbox, not bounce to no-reply. Resend + Reply-To header approach
> approved over Gmail OAuth. Blocks on P1.6 (domain purchase).

```text
1. Buy domain (cubicle.app or similar) — $12, 10 min
2. Add domain in Resend dashboard, verify DKIM/SPF/DMARC — 30 min
3. Set RESEND_API_KEY + EMAIL_FROM in prod .env — 5 min
4. Add `reply_to_email` to workspaces schema (Drizzle migration) — 5 min
5. Add input field in workspace settings — 15 min
6. Update src/lib/notifications.ts (6 wrappers) to pass Reply-To — 15 min
7. E2E test: send invoice to Gmail, reply, verify arrives — 15 min
```

Effort total: ~2 jam code + 45 min domain/DNS setup.

### Sprint E.5 — Team UI completion (parallel with E, no gate) — ✅ DONE 16 Jun (commit 641be01)

> Audit 16 Jun: DB schema + backend actions for multi-user workspace
> sudah lengkap (`tasks.assignee_id`, `workspace_members`, `team.ts`),
> tapi **UI belum ada**. Seed punya 3 user (owner Alex + member + viewer)
> tapi gak bisa diakses dari UI. Ini MVP blocker tersembunyi — "Client
> Operations Hub" yg gak punya team page = setengah jadi.

**Actual gap (audit corrected 16 Jun):**
- ✅ Team management di /app/settings sudah ada (team-manager.tsx: add/role/remove)
- ✅ `tasks.assigneeId` di schema + actions
- ✅ task-detail-sheet.tsx: read-only display assignee name
- ❌ task-form.tsx: NO assignee input UI
- ❌ tasks page filter: NO Assignee dropdown
- ❌ tasks page query: whereClauses didn't filter by assignee
- ❌ assignTask action: no email notification

**Shipped 16 Jun (commit 641be01, +213/-23 lines, 7 files):**

```text
✅ task-form.tsx: Assignee Select dropdown (Unassigned + each member)
✅ task-detail-sheet.tsx: editable Assignee Select (was read-only text)
✅ tasks/page.tsx: Assignee filter (All / Me / Unassigned / each member) + applied to whereClauses
✅ tasks/page.tsx: fixed `_memberList` shadowed → proper `memberList` query (workspaceMembers join users)
✅ kanban-board.tsx: members prop passed through card → TaskDetailSheet
✅ projects/[projectId]/page.tsx: projectMembers query + passed to KanbanBoard
✅ notifications.ts: notifyTaskAssigned wrapper added
✅ tasks.ts: notifyIfAssigneeChanged helper wired into createTask, updateTask, assignTask
```

**E2E verified live (16 Jun):**
- /app/tasks HTTP 200, "All Assignees / Assigned to me / Unassigned" dropdown rendered
- /app/tasks?assignee=me HTTP 200, filter applied (empty for owner since seed assignees are member)
- /app/settings HTTP 200, TeamManager still rendering
- All seed tasks with assignees display "Budi Member" badge

**Backlog remaining (intentional skip):**
- ❌ Sidebar badge "X tasks assigned to you" — nice-to-have, low value
- ❌ Bulk assign via kanban drag-to-user — effort > value for MVP
- ❌ Real-time notification badge (in-app) — needs SSE/WebSocket infra

**Tasks:**

```text
1. /app/team page                                  2-3 hari
   - List members + role badges
   - Invite by email (create user or link existing)
   - Update role (owner only)
   - Remove member (owner only, can't remove self)
   - "Pending invites" list

2. Task assignee selector                          2-3 hari
   - Dropdown di task create/edit form
   - Shows workspace members
   - Search/filter
   - Optional: bulk assign (kanban drag-to-user)

3. "My tasks" view + filter                        1-2 hari
   - /app/tasks?assignee=me
   - /app/tasks?assignee=<userId> for managers
   - Badge counter di sidebar ("3 tasks assigned to you")

4. Notification on assignment                      1 hari
   - Reuses notifications.ts (P2.6 Reply-To)
   - Email: "You were assigned 'Logo revision' by Alex"
   - In-app notification (future)

5. E2E test (manual + 1-2 Playwright)              1 hari
   - Owner invite member → member gets email → accepts → task assign → member sees in "my tasks"
```

**Acceptance criteria:**

```text
Owner can invite user by email
Member can see all assigned tasks
Member can see only their tasks via filter
Viewer cannot assign (already enforced via assertWorkspaceWritable)
Email sent to assignee on new task assignment
UI shows team page at /app/team
Role badges (owner/member/viewer) visible in UI
```

**Effort: 1-1.5 minggu (5-7 hari kerja)**

**Why parallel, not gated:**
- No ICP decision needed (pure existing feature completion)
- Schema + backend udah ready (50% work done)
- Demo blocker — currently demo cuma 1-user workflow
- Alip-approved 16 Jun as next-sprint parallel

**Strategic:** after this + P2.6 Reply-To + existing features, Cubicle punya
team workflow lengkap. Baru bisa demo "3-user agency workflow" ke prospect
secara convincing.

**When to ship:** immediately after Sprint E (P2.6 Reply-To) finishes,
or parallel if 2 dev streams.

---

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
  ✅ Sprint F AI Assistant v1.1 — 12 tools, persistence, action confirm flow
  ✅ Sprint F.2 AI streaming — SSE, Stop, 9router stream-first fix
  ✅ Sprint F.3 AI v1.2 — pg_trgm search, prompt library, voice input, export MD (15 tools)
  ✅ Sprint G P2.3 PDF polish closed — 3 invoices regen, multi-page "Page X of Y"

Still open:
  1 accepted npm audit (postcss nested in next, moderate, build-time only)
  ⏸️ HOLD per Alip 16 Jun: No real domain yet (P1.6) — revisit when Alip decides
  ⏸️ HOLD per Alip 16 Jun: External uptime + CPU/RAM alert (P2.5) — revisit when needed
  ⏸️ HOLD per Alip 16 Jun: RESEND_API_KEY prod + sender domain (P2.2) — needs API key + domain first
  ⏸️ HOLD per Alip 16 Jun: Payment gateway decision (Midtrans/Xendit/Stripe) — blocks pricing + onboarding + self-serve billing
  ⏸️ HOLD per Alip 16 Jun: ICP decision (A/B/C/D) — blocks P2.7 scope commitment
  Test with real logo URL from R2 upload (P2.3, not exercised yet)
  📋 NEXT SPRINT: P2.6 Reply-To email header (Sprint E) — Alip-approved 16 Jun,
     blocked by P1.6 (same domain purchase unblocks both P1.6 and P2.6)
  📋 PLANNED: P2.7 Pre-deal workflow (Proposal + Questionnaire + Contract) —
     Alip-approved 16 Jun, gated on ICP decision, ~4-8 minggu depending on
     e-sig path (in-house vs DocuSign/HelloSign embed)
  📋 PLANNED: P2.8 Finance module (income from invoice + manual expense +
     auto reports) — Alip-approved 16 Jun, Option B manual-only, skip tax
     helpers for now. ~3 mgu core. Gated on ICP decision.
  📋 FUTURE: P2.9 Tax helpers (PPN 11%, PPh 23, e-Faktur) — Indonesian depth
     direction, big scope (~6+ mgu + legal/compliance knowledge). Wait for
     🅐 direction commit or skip.
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
curl -k -I https://cubiqlo.com/
curl -k -I https://cubiqlo.com/login
curl -k -I https://cubiqlo.com/signup
```

---

## Sprint O — 2026-06-17 — 4 QA fixes + typography plugin

**Tag:** `mvp-v0.1.1`
**Commit:** `0358f90`

**Bugs found via live browser QA:**

1. **CRITICAL** — Contract/proposal body showed raw markdown chars (`#`, `**`, `---`)
   - Fix: `react-markdown` integrated in 4 render points
   - Verified: semantic h1/h2/strong/hr visible

2. **MEDIUM** — Invoice status badges non-conventional colors
   - Fix: added `success`/`info`/`warning` variants to `badge.tsx`
   - Verified: paid=green, sent=blue, overdue=red, draft=gray

3. **MINOR** — Reports currency aggregation mixed IDR+USD in one card
   - Fix: YTD cards stack currencies cleanly; top clients group by `invoices.currency`
   - Verified: IDR+USD shown separately with context notes

4. **BONUS** — Proposal detail crashed with `toLocaleString` on undefined
   - Root cause: real data uses `qty`/`unit_price` (snake), code expected `quantity`/`unitPrice` (camel)
   - Fix: snake/camel fallback in normalization + server-side subtotal/total compute from line items
   - Verified: line items + Subtotal Rp 35.000.000 + Total Rp 35.000.000 all render

5. **DISCOVERY** — `prose` class had no effect (Tailwind v4 needs `@tailwindcss/typography`)
   - Fix: installed plugin, added `@plugin` directive in `globals.css`
   - Verified: h1/h2 properly sized in proposal body

**Live tested on https://cubicle.168-144-37-19.sslip.io/ with owner@cubicle.test / password123**

## Sprint P — 2026-06-18 — Landing visual cascade fixes (4 commits, post-19 Jun plan)

**Tags:** `mvp-v0.1.14` → `mvp-v0.1.17`
**Commits:** `46a9352` → `788caef`

**Bugs found via live browser color audit + vision:**

1. **Pill + badge border color silent-fail** (v0.1.14)
   - Root cause: Tailwind v4 global `* { border-color: var(--border) }` override
     `border-[#A78BFA]/30` → `#E8E8E8` (gray instead of purple)
   - Fix: `!border-[#A78BFA]/30` (Tailwind `!` important prefix)
   - Verified: pills now show purple tint, badge visible on dark bg

2. **"Why Cubicle" H2 nyaru on dark navy bg** (v0.1.15)
   - Root cause: dark gradient `#0f0a1f → #312e81` + H2 white low contrast first sentence;
     `bg-[radial-gradient(...)]` arbitrary value silently fail in Tailwind v4
   - Fix: switch section to light off-white `#FAFBFC` + soft purple/blue radial;
     inline `style={{ background }}` instead of arbitrary class;
     H2 → navy `#292D34`; pills/badge inverted (white bg, purple text)
   - Verified: vision confirms high contrast, no nyaru

3. **Final CTA card H2 + P invisible** (v0.1.16)
   - Root cause: `h1, h2, h3, h4 { color: var(--foreground) }` in globals.css
     overrides Tailwind `text-white` via cascade order (not specificity)
   - Fix (temp): inline `style={{ color: '#ffffff' }}` on H2 + P + wrapper
   - Verified: white text on blue gradient high contrast

4. **Systemic heading cascade** (v0.1.17)
   - Root cause: global heading rule not in Tailwind `@layer base`
   - Fix: wrap `* { border-color }`, `h1-h4 { font-family, letter-spacing }`, `body`
     in `@layer base {}`; remove forced `color: var(--foreground)` from h1-h4
   - Verified: Tailwind `text-*` utilities now win consistently; reverted
     inline-style workaround in final CTA back to clean class-based
   - Side benefit: any future heading with custom color class works as expected

**Held / cosmetic status updates:**
- `workspace.billingName` — already seeded with "Acme Creative Studio" for demo
  workspace; PDF header shows real name not "Company Name". Plan note
  "billingName not set" was outdated — verified live 2026-06-18 via
  `/api/invoices/<id>/pdf` returning clean header.

**Score unchanged:** Demo 99% · Sellable 99% · Production ~95% (pure UI hardening,
not feature/infra work.)

**Live tested on https://cubicle.168-144-37-19.sslip.io/ with owner@cubicle.test / password123**

## Sprint N — 2026-06-19 — Invoice create page + browser QA polish + counter seed fix

**Tag:** (not tagged yet — follow-up)
**Commits:** `77a7d8b`, `f476a6d`, `423b598`

**Bugs found via live browser QA:**

1. **P0 — `/app/invoices/new` crashed with UUID parse error**
   - Root cause: route hit `[invoiceId]` catch-all, treating `"new"` as UUID
   - Fix: new `src/app/(app)/app/invoices/new/page.tsx` with `InvoiceForm`
     (clients select + writable guard + back-link + no-client fallback)
   - Verified: page loads, draft invoice creates, redirects to detail page

2. **P1 — AI floating button overlaps invoice table Actions / dashboard cash flow**
   - Fix: desktop position `bottom-6` → `bottom-20` (button + panel)
   - Verified: AI button sits above action region, no visual obstruction

3. **P1 — Timer topbar stale after stop**
   - Root cause: topbar only polled `/api/time/active` every 15s + on focus
   - Fix: timer widget dispatches `cubicle:timer-changed` CustomEvent on
     start/stop/discard; topbar listens + on focus + on visibility
   - Verified: timer start → topbar ticked `00:02`, stop → instant `00:00`
     + title `No active timer`

4. **P1 — Paid invoice with remaining balance shows green "paid" badge**
   - Fix: display status derived — if DB `paid` but `totalPaid < total`,
     show `payment due` (destructive variant)
   - Verified: `INV-2026-0042` now renders `payment due` red badge

5. **P0 — Invoice counter hard-codes `INV-0001` for first create**
   - Root cause: counter seed ignored existing seed data
   - Fix: when no counter row exists, compute `MAX(trailing digits)` from
     existing invoice numbers via SQL regex `INV-([0-9]+)$`
   - Verified: seeded new `INV-9999` via DB; counter + numbering safe for
     both `INV-0001` and `INV-YYYY-0042` formats

**Score unchanged:** Demo 99% · Sellable 99% · Production-ready ~93%
(UI polish + counter robustness; no infra or feature scope change.)

**Live tested on https://cubicle.168-144-37-19.sslip.io/ with owner@cubicle.test / password123**

## Sprint V — 2026-06-23 — Production Hardening (R2, Email, Monitoring, Tests, UI)

**Tag:** `mvp-v0.2.0`
**Commit:** `5148233`

**Infrastructure:**
1. **Cloudflare R2** — bucket `cubicle-files` (APAC), S3-compatible upload/download tested ✅
2. **Domain** — `cubiqlo.com` live, DNS proxied via Cloudflare ✅
3. **Resend email** — `noreply@cubiqlo.com` verified, DKIM/SPF/MX configured ✅
4. **Reply-To workspace** — kolom `reply_to_email`, API route, settings UI, email headers ✅
5. **sslip.io removed** — `AI_BASE_URL` now uses Docker internal `http://10.0.1.12:20128/v1` ✅
6. **Health monitor** — script `scripts/monitor.sh` (CPU/RAM/disk/container/DB), cron every 5 min ✅

**Security:**
7. **Rate limiting** — in-memory IP-based, middleware-level:
   - `/api/auth/*`: 10 req/min per IP
   - `/api/auth/sign-in/*`: 5 req/5min per IP
   - Returns 429 + `Retry-After` + `X-RateLimit-*` headers ✅

**Quality:**
8. **Vitest setup** — `vitest.config.ts`, `npm test` / `npm run test:watch`
9. **Unit tests** — 17 tests (rate-limit 7, utils 10), all passing ✅

**UI:**
10. **Logo rebrand** — Cubiqlo logo di sidebar, landing, footer, auth pages, favicon ✅
11. **AI model** — switched to `ag/gemini-3-flash` via 9router ✅
12. **Chat panel fullpage** — Brain page: clean white header (no purple gradient), wider spacing, better bubbles ✅

**Score:**
- Demo MVP: **99%** (unchanged)
- Sellable source/MVP: **99%** (unchanged — ceiling)
- Production client-ready: **~99%** (+2 — R2 live, Resend verified, Reply-To, rate limiting, monitoring, tests)

**Remaining (low priority):**
- ❌ External uptime alert (Better Stack / UptimeRobot)
- ❌ E2E tests (Playwright)
- ❌ Fail2ban SSH hardening

**Live tested on https://cubiqlo.com/ with owner@cubicle.test / password123**
