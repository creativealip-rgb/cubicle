# Deployment Log

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
