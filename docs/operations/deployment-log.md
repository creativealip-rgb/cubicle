# Deployment Log

## 16 August 2026 — Sidebar chevron toggle + document editor scroll/back polish

- Source: `release/cubiqlo-20260816-2`, merge commit `105593b` from `dev/integration` into `main`.
- Scope:
  - Sidebar collapse/expand changed to a single circular chevron button at the sidebar edge (`ChevronLeft` expanded, `ChevronRight` collapsed).
  - Document editor (proposal + contract) scroll now confined to Structure / Canvas / Insert panels; page no longer scrolls with empty bottom space.
  - Proposal and contract editor headers gained a back button to their detail pages.
  - Proposal/contract edit routes are full-bleed (`md:p-0 md:pb-0`) without forcing sidebar collapse.
- Dev proof: `dev.cubiqlo.com` deployed at `7731145d55383173ca52afbed59fc7feffa35fc8`; health app/DB ok; production unchanged during dev QA.
- Release gate before production deploy:
  - `git diff --check` passed.
  - Targeted Vitest passed: document editor layout wiring, global shell accessibility, autosave revision wiring.
  - `npx tsc --noEmit` passed.
  - `npm run build` passed.
- Migration: none.

## 16 August 2026 — Production release prep: Cubiqlo document workflow polish

- Source: `release/cubiqlo-20260816`, merge commit `9ca9f7e` from `dev/integration` into `main`.
- Scope:
  - Billing-aware Time selector gating: Fixed Price/legacy Package excluded from Timer/Timesheet selectors.
  - Timer UX: navbar timer control removed, Time page Start Timer retained, browser tab active timer indicator restored.
  - Proposal/Contract send dialog: editable email message with `{{proposal_link}}` / `{{contract_link}}` replacement.
  - Proposal/Contract table actions: `Send`/`Resend` buttons aligned right.
  - Proposal/Contract detail layouts: action buttons and editable detail fields matched production-approved layout, including preview routes.
  - Timesheet work-date fallback now derives timestamp dates in `Asia/Jakarta`.
- Dev proof: `dev.cubiqlo.com` deployed at `7eaddbbf75cc137140631a1a2e34b6a5dec0c3f6`; health app/DB ok; production unchanged during dev QA.
- Release gate before production deploy:
  - `git diff --check` passed.
  - Targeted Vitest passed: send document wiring, timer tab/action wiring, time report date wiring, billing-aware selector gating.
  - `npx tsc --noEmit` passed.
  - `npm run build` passed.
- Production baseline before deploy:
  - Container: `cubiqlo-new-app-next`.
  - Previous image: `sha256:533c4509dc25aca94346f360acfaba2f5abc4a2f7f80bea69e2b6ac5303b9af6`.
  - Health: `https://app.cubiqlo.com/api/health` app/DB ok.
  - Smoke: `https://app.cubiqlo.com/login` HTTP 200; `https://cubiqlo.com/` HTTP 200.
- Production deployment:
  - New image: `sha256:8b00f813684ed3481fcfded27d0155ff7add34b2a27b49bc91927309b9b19e9b`.
  - Image tag: `cubiqlo-prod:sha-f6aef587c1a49f611516a3929a8320680ef1a711`.
  - Runtime revision: `f6aef587c1a49f611516a3929a8320680ef1a711`.
  - Container recreated: `cubiqlo-new-app-next`; restart policy `unless-stopped`.
  - Health: `https://app.cubiqlo.com/api/health` app/DB ok.
  - Smoke: `https://app.cubiqlo.com/login` HTTP 200; `https://cubiqlo.com/` HTTP 200.
  - Asset revision proof: `dpl=f6aef587c1a49f611516a3929a8320680ef1a711`.
  - Proxy safety: `dokploy-traefik` remains sole public 80/443 owner.
- Migration: none.

## 12 August 2026 — Dev integration sync and deploy retry

- `dev/integration` synchronized with latest `main` revision `03883ac`.
- Preserved Prompt Studio improvements: inline validation, bilingual option labels, mobile preview, sticky generate action, and template-change confirmation.
- Main billing/storage implementation retained as source of truth; older duplicate dev billing/storage commits were not reapplied.
- Deploy retry did not reach build: GitHub fetch timed out connecting to `github.com:443`.
- Production unchanged. Pre-deploy collision check passed: `dokploy-traefik` remains sole public 80/443 owner.
- Current deploy status: **BLOCKED — network**, not source/build failure.


## 12 August 2026 — Main/dev UI and i18n follow-up

- Source: `main`; latest site-builder canvas i18n follow-up: `374bf67`; landing secondary copy: `8052924`.
- Dev target: `cubicle-dev` / `https://dev.cubiqlo.com`.
- Scope: landing/site-builder EN/ID, Reports labels, Calendar/Files/sidebar polish, timer/date handling, and active-tab rendering.
- Verification: targeted ESLint and TypeScript checks passed; deployment workflow checks app/DB health.
- Production: not deployed; production container remains unchanged.

## 8 August 2026 — Production release: dev integration, billing hardening, questionnaire, AI quota and invoice lifecycle

- Source: `dev/integration` merged into `main` as `8248dcf`; pushed to `origin/main`.
- Scope:
  - Questionnaire create/edit workflow with runtime JSONB schema validation and writable-route authorization.
  - Atomic monthly AI quota reservation plus best-effort release when provider execution fails before success.
  - Effective-plan enforcement across visual prompts, Prompt Studio, and Personal Site AI.
  - Server-side invoice status transition guard for terminal and backward states.
  - Legacy package-project fallback as fixed billing source.
  - Prompt catalog bilingual metadata, legacy duration compatibility, manual-time accessibility, loading skeletons, and docs/config synchronization.
- Dev verification:
  - `https://dev.cubiqlo.com` app/DB health `ok`.
  - Authenticated dashboard, client, project, and invoice flows verified.
  - Invoice status selector and billing source rendered correctly.
  - Desktop runtime viewport had no horizontal overflow.
- Release gate:
  - 215 test files / 1,018 tests passed.
  - ESLint, TypeScript, and Next.js production build passed.
  - Pre-deploy collision check passed: `dokploy-traefik` sole public 80/443 owner.
- Production backup:
  - `/root/backups/cubiqlo/cubicle_prod_20260808T143858Z.dump`
  - SHA-256: `166a7d290a5ad207bee51d37eb426af7ed10281884b7d8764282bc4d18520511`
  - Database verified: `cubicle`.
- Production deployment:
  - Container: `cubiqlo-new-app`.
  - Image: `sha256:bc39cd61b4a787ea6e8c79f2a95009f4ba6d4ff774979e988c25841a0ea80347`.
  - `https://app.cubiqlo.com/api/health`: `{"status":"ok","db":"ok"}`.
  - `https://app.cubiqlo.com/login`: HTTP 200.
  - `https://cubiqlo.com/`: HTTP 200.
  - Production container running; no fresh runtime errors.
  - `dokploy-traefik` remains sole public 80/443 owner.
- Follow-up: mobile runtime QA remains separate; production release gate passed.

## 5 August 2026 — Approved time entries editability, Asia/Jakarta UTC+7 timezone fix, and Global Stale Server Action Auto-Reload Interceptor

- Source revision: `8f884b2` / `main`
- Containers deployed:
  - Dev: `cubicle-dev` (`dev.cubiqlo.com`)
  - Prod: `cubiqlo-new-app` (`app.cubiqlo.com`)
- Features & Fixes:
  - Time Entries Edit Lock: Allowed editing approved time entries by removing restrictive status locks in `updateTimeEntry` server action (`src/lib/actions/time.ts`).
  - Timezone Fix (UTC+7): Preserved Asia/Jakarta timezone (`T12:00:00+07:00`) during time entry creation and editing (`timesheet.tsx`), preventing date shifts to the previous day in UTC.
  - Global Stale Server Action Auto-Reload Interceptor: Integrated global window error and unhandled rejection listeners in `AppShell` (`src/components/app-shell.tsx`) to catch `isStaleServerActionError` after deployments and automatically trigger `window.location.reload()` with user notification.
  - Form Level Stale Error Catching: Added stale action detection to `CurrencyRatesForm` (`currency-rates-form.tsx`) for instant auto-reloads.

## 5 August 2026 — Project start/finish date fields, portal password fix, and bilingual error handling

- Source revision: `main` (updated)
- Containers deployed:
  - Dev: `cubicle-dev` (`dev.cubiqlo.com`)
  - Prod: `cubiqlo-new-app` (`app.cubiqlo.com`)
- Features & Fixes:
  - Project form: Added `startDate` (Tanggal Mulai) & `finishDate` (Tanggal Selesai / Target Finish Date) input fields to Create & Edit Project dialogs.
  - Portal Password Encryption: Added missing `PORTAL_PASSWORD_ENCRYPTION_KEY` environment variable to `.env.production` & `.env.development.local` and restarted both dev & prod containers to fix decryption/encryption crashes on "Tampilkan password" & "Ganti password".
  - Client Portal Slug Collision: Added friendly bilingual error message (`getT()`) for unique constraint violations (`clients_portal_slug_unique`) when creating/editing clients.
  - Bilingual Server Action Errors: Converted server action error messages in `clients.ts`, `invoices.ts`, `expenses.ts`, and `tasks.ts` to use `getT()` for dynamic ID/EN locale support.
  - Boundary Error Cleanups: Replaced unhandled `throw new Error("Workspace not found")` in contract-templates & proposals page routes with `notFound()`, preventing raw Next.js production error screens.
  - Global Error Boundary: Added i18n support (`useT()`) to `global-error.tsx`.

## 5 August 2026 — Dev deploy with Business sidebar navigation & i18n dialogs

- Source revision: `fea68df` (with local i18n + form polish)
- Dev container: `cubicle-dev` (`dev.cubiqlo.com`)
- Features in Dev:
  - Business sidebar group (Services, Proposals, Contracts sub-menus)
  - English translations `t()` added to all pop-up New/Edit dialogs (Client edit/status, Client invoice create, Project status edit, Contract create, Proposal decline, Task template import/workspace, Reusable task workspace)
  - Client New/Edit form cleanup: removed redundant "Catatan" label while preserving internal notes textarea
- Production container: `cubiqlo-new-app` (`app.cubiqlo.com`)
  - Running clean main commit without experimental features
  - Full env file verified & rate-limiter connected; login status verified HTTP 200.

## 2 August 2026 — Site builder, Prompt Studio i18n, calendar picker, auth i18n fix

- Source revision: `ff531bd`
- Image: `cubicle:latest` (`sha256:efba7d18affc`)
- Container: `cubiqlo-new-app` (`ad1f80b4ba6a`)
- Features deployed:
  - Site builder: 6 new section types (gallery, embed, social, cta, divider, collapsible)
  - Prompt Studio: English translations, Face Card + Logo prompt types, compact selector redesign, text→dropdown conversion
  - Time navigation: calendar date picker
  - Auth pages: LangProvider root layout fix for i18n
- Deploy method: `docker compose build --no-cache`, tag `cubicle:latest`, `docker run` with production env
- Health check: `{"status":"ok","db":"ok"}` at `https://app.cubiqlo.com/api/health`
- Smoke: login page HTTP 200, landing page accessible
- Proxy safety: `dokploy-traefik` remains sole public 80/443 owner
- Note: old `cubiqlo-new-app` container accidentally removed during verification testing; recreated from backup env (`/root/backups/cubiqlo-task17-20260731T172019Z/production-app.env`)

## 26 July 2026 — Full-feature QA fixes and production schema recovery

- Source revision: `d953e0f05da19244f879d992cedd0b543b9be5ce`
- Release image: `cubicle-cubicle:latest`
- Image ID: `sha256:4422277ac2e7e3d6071a223a4ada0b4c55b705eb1adb13c35734c9fef0bfd678`
- Database recovery: applied ledger migrations `0043_persist_portal_token_encrypted.sql`, `0044_portal_password.sql`, and `0045_meeting_request_workflow.sql`; restored client creation, portal credential fields, invoice client lookup, and meeting workflow schema parity.
- QA scope: inventoried 62 pages, 46 API routes, and 37 server-action modules; smoked 37 authenticated routes, anonymous auth boundaries, public invalid-token states, read-only authenticated APIs, desktop UI, and representative 390 px mobile routes.
- Mutation proof: created a disposable verified QA account/workspace, client with portal enabled, and invoice with one `Rp125.000` line item through production UI; verified persisted DB state, then deleted the QA user and confirmed zero remaining QA users, workspaces, clients, invoices, and items.
- Fixes: corrected 4 px AI Brain mobile overflow, updated five stale portal/CSP regression assertions, and removed the unused AI welcome-screen lint warning.
- Release gate: 57/57 Vitest files and 292/292 tests, ESLint, TypeScript, Next.js production build, `git diff --check`, pre-deploy collision scan, Docker rebuild, and app-only container recreation.
- Deploy result: container `cubicle-cubicle-1` running and healthy; app/DB health `ok`; protected app route redirects to login; unrelated 9Router route remains correct; runtime logs contain no new application errors.
- Proxy safety: `dokploy-traefik` remains the only container publishing public ports 80/443; Cubiqlo remains internal on port 3000 through `dokploy-network`.
- Side-effect exclusions: no real payment, external email, Google OAuth, paid AI generation, external upload, cron, or webhook execution during this pass.

## 25 July 2026 — Dependency security patch

- Source revision: `df2b69cd4b22807c31802920f1cd32443b7439ca`
- Release image: `cubicle:sha-df2b69cd4b22807c31802920f1cd32443b7439ca`
- Image ID: `sha256:c41918764e7874db077a50576e6a36fc180823846148a0abe2eed40d9b55f2d0`
- Previous image ID: `sha256:0ab033365cab1302d910e577d606c727ab84b16ed516c254043496b276666842`
- Release manifest: `/root/releases/cubiqlo/2026-07-25T19-33-50Z-df2b69cd4b22.env`
- Scope: upgrade Better Auth to `1.6.22` and PostCSS to `8.5.18`.
- Release gate: locked install, ESLint, TypeScript, 205 tests, Next.js production build, critical dependency audit, immutable Docker build.
- Deploy result: `DEPLOY_OK` through health-gated release script.
- Post-deploy checks: container healthy; app and DB health `ok`; landing and login HTTP 200; anonymous protected API HTTP 401; no recent fatal/network errors; only `dokploy-traefik` owns public ports 80/443.
- Rollback artifact: previous image retained and recorded by deployment script.
- Excluded workspace change: uncommitted `src/app/page.tsx` was not included in this image or commit.

## Related documentation

- `docs/security/dependency-audit-2026-07.md`
- `docs/architecture-security-hardening-plan.md`
- `docs/operations/monitoring-slo.md`
- `docs/operations/backup-recovery-observability.md`
- `docs/operations/staging-contract.md`
