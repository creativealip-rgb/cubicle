# Changelog

Versi aplikasi mengikuti `package.json` (`version`) dan otomatis tampil di sidebar
lewat `NEXT_PUBLIC_APP_VERSION`. Naikkan versi di `package.json` setiap rilis,
lalu tambahkan entri di sini.

## v0.1.22 — 2026-07-14 — Currency-aware timesheet + ekspor PDF sadar billing-type

- **Fix currency timesheet:** `formatRate` di `timesheet.tsx` dulu hardcode `IDR`; sekarang pakai `currency` dari project (query `time/page.tsx` load field `currency`). Rate USD tampil `$13.00`, IDR tampil `Rp 25` sesuai project — sebelumnya semua dipaksa `Rp`.
- **Timer widget:** dropdown proyek difilter per klien terpilih, task difilter per proyek terpilih (mencegah salah assign lintas klien). Rate otomatis diwarisi dari `project.rate` bila kolom tarif dikosongkan saat start timer.
- **Ekspor PDF billing-type-aware** (`/api/time/export/pdf/va-timesheet`): query join `packages` + load `billing_type`, `rate`, `currency`, `hours`. Helper baru `formatMoney` (currency-aware, IDR tanpa desimal), `entryAmount`, `sumByCurrency`, `renderMoneyMap` (multi-currency `$X + RpY`).
  - `hours`/`package`: amount = jam × rate efektif (entry rate override project rate).
  - `project` (flat fee): entry tampil tag `biaya tetap`, fee dihitung sekali per project di level klien/total (bukan per entry).
  - `package`: badge tipe + catatan kuota `(terpakai Xh / Yh)`.
  - Dashboard report: tambah kolom `JUMLAH TAGIHAN` per project + badge billing-type.
- Verified live di cubiqlo.com (tsc 0 error, container healthy, HTTP 200, browser test ketiga billing type). Commit `2f63d28`.

## v0.1.21 — 2026-07-14 — Lokalisasi ID + versioning otomatis

- Lokalisasi UI app ke Bahasa Indonesia di 29 file: halaman Proyek, Tugas (board kanban + tabel), Waktu (timer, entri manual, timesheet, ekspor PDF/CSV), Workspace Pribadi, Kuesioner, plus komponen tersebar (expenses, proposals, files, comments, calendar, portal, prompts, invoice templates).
- Terpusatkan label status/prioritas di `src/lib/status-badge.tsx` (task, project, invoice, priority) supaya konsisten lintas halaman.
- Tanggal jatuh tempo proyek pakai locale `id-ID`.
- Versioning: `package.json` jadi sumber versi tunggal, di-inject ke bundle lewat `next.config.ts` (`env.NEXT_PUBLIC_APP_VERSION`); sidebar baca env, bukan hardcode lagi. Sebelumnya sidebar hardcode `v0.1.21` sementara `package.json` masih `0.1.0` (tidak sinkron).

## 2026-07-08 — Package billing + portal redesign

- Added "By Package" billing type: packages table, admin CRUD per project, custom pricing (custom_price, min/max hours, allow_custom).
- Custom package request flow: client requests custom hours via portal slider, auto-estimates price, saves to custom_package_requests table.
- Package order flow: "Take This Package" button with confirm modal, saves to package_orders table.
- Admin-assigned packages: admin selects package in project form, portal shows "by hours" style with package total/used/remaining hours + progress bar.
- Portal redesign: hero summary (4 cards with icons), quick actions bar, activity feed (8 recent events), accordion projects (one-at-a-time expand), unified invoices table split IDR/USD with PDF buttons, single "Message Your Team" contact form.
- Migrations: 0023 (package_custom_pricing), 0024 (custom_package_requests), 0025 (package_orders), 0026 (project_selected_package).
- Latest commit: `67aed7f feat: portal redesign — activity feed, compact accordion, unified invoices, quick actions`.

## 2026-07-07 — Cubiqlo meeting P1 execution

- Added client PDF exports: single client and bulk combined PDF.
- Added project billing type (`by project` / `by hours`) plus start and finish dates.
- Added time entry tags and expanded PDF reporting options.
- Simplified sidebar/navigation: moved billing and support to avatar menu, hid email, removed nodes, renamed personal area toward Notes.
- Added navbar timer quick actions.
- Fixed task modal close after save and generalized form close-before-refresh behavior for client/project/invoice/task forms.
- Latest deployed commit after this batch: `2babd61 fix: close forms before refresh`.

## 2026-07-07 — P0 dashboard fixes from meeting plan

- Completed P0 dashboard reorder: `REMINDER` → `KERJA` → `KEUANGAN`.
- Removed client health card and restored invoice card as `Invoice Jatuh Tempo` per follow-up request.
- Fixed `Tugas Jatuh Tempo` and `Invoice Jatuh Tempo` counts to use due-date based queries.
- Compacted `Aktivitas Terbaru` to latest 5 rows.
- Added client-side Jakarta-time dashboard greeting that updates every 60 seconds.
- Refined dashboard greeting spacing.
- Fixed global select/modal close bug by preventing Dialog outside-close on Radix Select portal interactions.
- Updated `docs/meeting-2026-07-06-cubiqlo-plan.md` with P0 progress status.

## 2026-07-05 — Docs sync + personal landing page publishing

- Added `docs/feature-status.md` with full feature inventory, current status, shipped scope, partial/process items, and next build order.
- Added public personal landing pages via `/site/[slug]`; default live URL verified at `/site/alip`.
- Added private full-page preview route `/site/preview`.
- Expanded `/app/personal-site` builder with slug, publish toggle, editable sections, links, theme label, accent color, dashboard preview, and `Open live page` action.
- Verified live health: `/api/health` returns `{"status":"ok","db":"ok"}` and `/site/alip` returns `HTTP/2 200`.

## 2026-06-29 — Phase 4B templates + personal note edit/search

- Added `email_templates` table and migration `drizzle/0014_p4b_email_templates_note_edit.sql`.
- Added email template create/update/delete actions and template section on `/app/email`.
- Added personal note edit action and inline edit UI on `/app/personal`.
- Added personal note search via `/app/personal?q=...`.
- Updated Phase 4 docs with shipped/remaining scope.

## 2026-06-29 — Phase 4 email suite + personal workspace v0

- Added `/app/email` with compose, save draft, send now via existing Resend helper, optional client/project linking, and recent email log.
- Added `email_messages` table and activity logs for draft/send/failure/delete.
- Added `/app/personal` with user-scoped private notes, pin/unpin, done/open, archive, and delete.
- Added `personal_notes` table.
- Added sidebar entries for `Komunikasi → Email` and `Personal → Personal`.
- Added `docs/phase-4-email-personal-workspace.md` with strict P4 MVP scope and deferred items.
- Verified migration applied to production Docker DB, `npm run lint`, and `npm run build` pass.

## 2026-06-29 — Phase 3N viewer mutation guards

- Guarded `/api/settings/reply-to` with authenticated workspace-owner authorization before mutating workspace reply-to email.
- Guarded `/api/ai/action` task-status updates and invoice-reminder sends with owner/member workspace write checks.
- Verified fresh TRST viewer account receives 403 for reply-to update, AI task status update, and AI invoice reminder direct requests.
- Verified `npm run lint`, `npm run build`, Docker rebuild, `/api/health`, and production smoke pass.

## 2026-06-29 — Phase 3L final launch QA

- Fixed native invoice share route auth by reading session from route request headers and updating invoice token hash directly.
- Verified production public invoice link for `TRST-P3L-1782725600` returned 200 and marked invoice viewed.
- Verified R2 upload/download/delete against production bucket with disposable QA object.
- Verified client portal visibility allowlist: visible project/task shown, internal project/task sentinels hidden.
- Verified monitor script healthy on production host.
- Updated launch QA decision to technical launch QA pass with remaining paid-launch caveats for Pakasir live payment and real external alert delivery.

## 2026-06-29 — Phase 3M client creation native fallback

- Moved client creation from flaky modal/hydration flow to dedicated `/app/clients/new` page.
- Added classic POST route `/api/clients/create` so core client creation works without client-side JS.
- Verified production DB row for `TRST Phase3M2 Native Client 1782725507`.
- Verified lint, build, Docker health, `/api/health`, and production smoke after deploy.

## 2026-06-29 — Phase 3K workspace bootstrap hardening

- Made workspace auto-bootstrap idempotent: reuse existing owner workspace, recover existing slug, and insert membership with conflict ignore.
- Fixed fresh-account workspace race that could raise duplicate `workspaces_slug_unique` and break first client/project actions after signup.
- Verified `npm run lint`, `npm run build`, Docker rebuild, `/api/health`, and production smoke pass.
- Production QA: fresh signup/login works; client creation succeeds when form submit fires; project creation select and invoice share flow remained usable from Phase 3J retest.

## 2026-06-29 — Phase 3I project form + invoice share action fixes

- Replaced project creation client ID text field with workspace client select when creating projects from `/app/projects`.
- Set invoice share-link generate/revoke buttons to `type="button"` to prevent accidental form-submit behavior in nested/interactive layouts.
- Verified `npm run lint`, `npm run build`, Docker rebuild, `/api/health`, and production smoke pass.

## 2026-06-29 — Phase 3H deeper product QA pass

- Created `TRST Deep QA Client` through production UI.
- Verified client detail, project detail with task count, and invoice detail page using TRST QA account.
- Seeded QA project/task/invoice records for page verification after browser automation could not complete project select cleanly.
- Noted invoice share-link click did not create token in this browser run; kept as manual follow-up.
- Updated `docs/launch_qa_result.md` with Phase 3H status.

## 2026-06-29 — Phase 3G test account + credentialed QA smoke

- Created new `TRST QA` production test account via signup and marked email verified for QA.
- Verified login, dashboard, clients page, billing owner buttons, and reports quick actions on production.
- Updated `docs/launch_qa_result.md` with credentialed QA smoke status and remaining deeper manual checks.

## 2026-06-29 — Phase 3F launch QA execution

