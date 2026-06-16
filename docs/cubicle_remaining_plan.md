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
Demo MVP: 85%
Sellable source/MVP: 75%
Production client-ready: 60–65%
```

> **Update 2026-06-16 (Sprint A + P0.2–P0.6 closed):**
> - Demo MVP: **95%** (was 85%)
> - Sellable source/MVP: **85%** (was 75%)
> - Production client-ready: **~75%** (was 60–65%)
>
> P0.1 Security audit ✅ clean. Rogue `/tmp/postgresql` gone, SSH key-only
> enforced, cubicle-pg not exposed, cron/systemd clean.
> P0.2 File upload/download ✅ 13/13 visibility scenarios pass.
> P0.3 Client portal token ✅ valid/revoke/regen + data filter pass.
> P0.4 Invoice lifecycle ✅ create/public link/payment/status pass.
> P0.5 Booking + calendar ✅ slot/double-book/calendar sync pass.
> P0.6 Role backend guard ✅ UI hiding + assertWorkspace guards pass.
> Bug found & fixed: `files.file_type` column missing → broke /app/files
> (HTTP 500). Fix: drizzle migration `0001_simple_karma.sql`.

> **Update 2026-06-16 (P1.1 Mobile QA pass 1 done):**
> - 🔴 Viewport meta `<meta name="viewport">` was MISSING from root layout —
>   mobile browsers were defaulting to 980px layout viewport, causing
>   squished/zoomed-out rendering on phones.
> - ✅ Added `viewport` export in `src/app/layout.tsx` (width=device-width,
>   initial-scale=1, max-scale=5, themeColor #2563eb).
> - ✅ Sidebar refactored: off-canvas drawer on mobile with hamburger in
>   topbar, full collapse toggle preserved on md+.
> - ✅ AppShell: zero margin on mobile, content shifts on md+ to clear
>   sidebar.
> - ✅ Topbar: hamburger button visible on mobile, hidden on md+; padding
>   tightened on small screens.
> - ✅ Invoices `<Table>` wrapped in `overflow-x-auto` for narrow viewports.
> - ✅ Login/Signup/Forgot-password/Onboarding flex wrappers got `w-full`
>   so `max-w-md` Card children actually constrain to viewport.
> - ✅ Landing hero H1: `text-5xl` → `text-3xl sm:text-5xl md:text-6xl lg:text-7xl`
>   so the headline fits on 375px.
> - Verified: pixel analysis of all public routes at 375×812 — card content
>   fully visible, no horizontal overflow. Vision tool had been
>   hallucinating "cut off" because content reaches right edge (which is
>   correct for `max-w-md` filling viewport with `px-4`).
> Commits: `65e5611` (viewport+sidebar+table), `4e61202` (flex wrappers+hero).

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

Current known:

```text
6 vulnerabilities
4 moderate
2 high
```

Tasks:

```bash
npm audit
npm audit --json > docs/npm-audit-report.json
```

Rules:

```text
Do not run npm audit fix --force blindly
Prefer safe minor/patch upgrade
Document accepted vulnerabilities if not exploitable
```

Acceptance criteria:

```text
0 high vulnerabilities OR documented exception
No breaking dependency upgrade without test/build pass
```

### P0.8 Lint cleanup

Current known:

```text
npm run lint PASS but 104 warnings remain
```

Tasks:

```text
Remove unused imports
Remove unused variables
Fix image alt warning
Avoid suppressing real issues globally
```

Acceptance criteria:

```text
npm run lint returns 0 errors
warnings ideally 0
npx tsc --noEmit pass
npx next build pass
```

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

Current landing uses vector/card mockups.

Upgrade:

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

Potential flows:

```text
forgot password
team invite
booking confirmation
invoice sent
client portal link
```

Tasks:

```text
1. Verify Resend/env provider
2. Test email send
3. Add graceful fallback if provider missing
4. Document email setup
```

### P2.3 Invoice PDF polish

Tasks:

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

Minimum:

```text
container restart policy
basic uptime check
DB backup script
backup restore test
log rotation
CPU/RAM alert
```

Acceptance criteria:

```text
DB can be restored from backup
App auto-recovers after restart
Basic alerting catches high CPU/memory
```

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
Security audit not complete after rogue /tmp/postgresql incident
Deep QA not fully complete
104 lint warnings
6 npm audit vulnerabilities
No real domain yet
No confirmed backup/monitoring setup
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
