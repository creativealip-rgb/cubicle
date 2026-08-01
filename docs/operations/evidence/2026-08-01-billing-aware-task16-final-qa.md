# Billing-Aware Tasks — Task 16 QA Evidence

Date: 2026-08-01
Source HEAD: `e5c06ee`
QA image: `cubiqlo-task16-qa:e5c06ee`
QA URL: `http://127.0.0.1:3199`
Database: isolated disposable Task 16 database; production database not touched

## Runtime preparation

- Read VPS deployment guardrails and ran `/root/.hermes/shared-workspace/PRE_DEPLOY_CHECK.sh`.
- Confirmed `dokploy-traefik` remained sole public owner of ports 80/443.
- Built immutable local QA image from `e5c06ee`.
- Recreated only `cubiqlo-task16-qa`, preserving its runtime environment.
- Bound QA app to loopback `127.0.0.1:3199`; no public route added.
- `/api/health` returned `{"status":"ok","db":"ok"}`.
- Seeded isolated owner/member/viewer workspace with Fixed Price, Hourly, legacy package, Tasks, Time entries, and invoices.

## Fresh automated gates

Commands ran in `node:22.23.1-bookworm-slim` because VPS host has no `npm` binary.

| Gate | Result |
|---|---|
| `npm run lint` | PASS, exit 0 |
| `npm run test` | PASS, 164/164 files and 691/691 tests |
| `npm run build` | PASS, Next.js 16.2.11 compile + TypeScript + 78/78 static pages |
| `git diff --check` | PASS |

Expected test-only stderr included explicit unavailable-Redis cases and Better Auth missing optional test env warnings. No test failed.

## Authenticated browser route/responsive QA

Runner: Playwright 1.61.1 Chromium.

Viewports:

- Desktop: 1440×1000
- Mobile: 390×844

Authenticated routes checked in both viewports:

| Route/flow | Result |
|---|---|
| `/app/tasks` | 200; `Tugas Proyek` and `Template Tugas` present |
| Fixed Price project detail | 200; no error card/overflow |
| Hourly project detail | 200; no error card/overflow |
| Legacy package project detail | 200; read-only state visible |
| `/app/time` | 200; no error card/overflow |
| `/app/reports` | 200; no error card/overflow |
| `/app/services` | browser-safe redirect to `/app/tasks` |
| `/app/time/activities` | browser-safe redirect to `/app/time` |

Results across 16 route/viewport checks:

- HTTP/error failures: 0
- Horizontal overflow: 0
- Application error cards: 0
- Browser console/page errors: 0
- QA container log scan for `42P01`, `42703`, `Application error`, and `Error:`: no matches

Machine-readable result during execution: `/tmp/cubiqlo-task16-final/browser-results.json`.
Screenshots during execution: `/tmp/cubiqlo-task16-final/screenshots/`.

## Scope boundary

This pass closes fresh automated verification and authenticated route/responsive regression coverage after commits `6b71c77`, `4f03719`, and `e5c06ee`.

Detailed browser mutation flows (create/edit/archive/restore/reorder, template duplicate decisions, timer stop selection, and non-assignee writes) remain covered by Vitest/wiring and real PostgreSQL integration evidence, but were not all manually mutated again in this final browser smoke. Production deployment remains a separate Task 17 gate requiring explicit approval, backup/restore proof, reviewed `0064` application, push, immutable production image, and live authenticated QA.
