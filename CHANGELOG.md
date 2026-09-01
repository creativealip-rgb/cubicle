# Changelog

## 2026-09-01 — Personal productivity Phase 0A contract lock

- Locked user-level Goals, Habits, personal transactions, receipts, and 50/30/20 budget contracts without changing existing business Expense semantics.
- Added deterministic user-timezone backfill, named DB-object ledger, ownership/role negative matrix, bounded unified-list cursor rules, and advisory-lock budget-copy semantics.
- Added reconciliation contracts for row/domain violations, missing and unexpected DB objects, plus read-only object-storage reconciliation backed by required receipt MIME, size, and checksum metadata.
- Phase remains NO-GO for feature coding until migration `0083` is re-confirmed and reserved, Drizzle parity exists, disposable-DB reconciliation passes through a fail-closed runner, and behavioral tests are green.

## 2026-08-29 — Dashboard approvals and first-workspace setup

- Expanded the Dashboard Approval card from client-visible task reviews to pending tasks, proposals, and contracts, with a category popover instead of a new page.
- Restored first-login workspace setup as a locked three-step modal over `/app/dashboard`: Workspace, optional Team, and Ready.
- Prevented layout/dashboard workspace lookups from auto-creating a workspace before the user confirms its name.
- Kept team invitations in Settings after workspace creation; the onboarding Team step is optional and does not pretend to send invitations.
- Production commits: `fce8eb8`, `488ffa2`, `23f17d7`; running image `cubiqlo-prod:sha-23f17d73a739a97649d313da2c74b061648e1146`.
- Evidence: `docs/operations/evidence/dashboard-approvals-first-workspace-2026-08-29.md`.

## 2026-08-29 — Personal Site new-user publish and optional CTA

- Fixed new-user Personal Site defaults so an empty CTA no longer blocks initial save or publish.
- Made CTA fully optional in readiness and server validation; incomplete CTA data does not render a public button.
- Added exact public URL, Copy link, and Open site actions to the publish dialog while keeping Preview separate.
- Verified dedicated production fixture publish persistence, public HTTP 200, clipboard parity, and zero horizontal overflow at 390×844.
- Production commit: `278f7de`; running image `cubiqlo-prod:sha-278f7deb9819f5fd5ffc32144ead148a2716329a`; health and DB `ok`.
- Evidence: `docs/operations/evidence/personal-site-new-user-publish-2026-08-29.md`.

## 2026-08-28 — August meeting revisions completed

- Completed region-aware EN/ID and IDR/USD defaults with persistent overrides while keeping Pakasir checkout amounts authoritative in IDR.
- Reorganized Settings, onboarding, sidebar navigation, Calendar booking slug placement, Forms/Landing Page labels, and AI menu order.
- Added tenant-safe custom invoice and contract numbering, invoice detail preview, recurring invoice rules/generation/scheduler, and duplicate-safe user errors.
- Enforced plan-aware Personal Site slugs, completed Personal Site editor/tab localization, and changed all new Personal Site defaults/templates to English without modifying existing user content.
- Completed landing pricing localization and moved Booking slug directly above Calendar Availability Rules.
- Clean release gate: 302/302 test files and 1,530/1,530 tests passed; TypeScript passed; ESLint had zero errors; production build passed.
- Production application commit: `81af150`; running image `cubiqlo-prod:sha-81af15065cfc3680a585e3d35d7898fbe0c44f28`; health and DB `ok`.
- Completion evidence: `docs/operations/evidence/meeting-revisions-2026-08-28.md` (`7d21536`).
- Known runtime limits: destructive live Team→Free→Team Personal Site matrix requires a disposable entitlement fixture; real Pakasir webhook lifecycle requires explicit paid-transaction approval; dependency findings are tracked separately.

## 2026-08-24 — Booking email date format

- Booking confirmation email now formats appointment time for `Asia/Jakarta` as readable date/time with `GMT+7`.
- Google Calendar add-event link remains included in email.
- Production commit: `81847cd`.


## 2026-08-24 — Proposal acceptance fixes

- Accept proposal now resolves or creates workspace Client from recipient email when no `clientId` exists.
- Proposal acceptance persists generated `projects.id` and `invoices.id` before creating dependent records, preventing foreign-key failures.
- Replaced native browser `confirm()` with localized Radix confirmation dialog.
- Production commit: `7ca8c97`.


## 2026-08-22 — Manual release QA checkpoint

- Added `docs/qa-report-2026-08-22-cubiqlo-release.md` with live browser evidence and final PASS/PARTIAL/BLOCKED status.
- Verified auth/session, workspace isolation, invoice share-link lifecycle, client portal, reports Excel export, booking create/cancel, proposal preview/send/public render, and contract metadata correction.
- Recorded remaining gaps: payment recording, file picker upload/download, exact 390px viewport, second-account team lifecycle, and untested recovery/auth-provider flows.
- Confirmed read-only DB prefix audit found zero `QA-BROWSER-*` clients, projects, tasks, expenses, appointments, proposals, and contracts.


## 2026-08-16 — Loading state audit: route skeletons + transition-aware refresh

- Added `loading.tsx` skeletons to 20 server-fetch routes previously missing them (billing, expenses, packages, reports, settings, email, personal, templates, search, support, journal, personal-site, contract/proposal preview+edit, contract/questionnaire/template detail+edit). Route coverage now 39 loading.tsx; remaining routes without one are client-redirect / instant-form / static-docs / time-passthrough and need no skeleton.
- Refactored `useAppTransition` to fall back to a local transition when rendered outside `<TransitionProvider>` (login/onboarding), keeping a single `const { refresh } = useAppTransition()` call-site safe everywhere.
- Migrated 76 components from bare `router.refresh()` → `useAppTransition().refresh()`, so every mutation surfaces the global top progress bar instead of refreshing silently in the background.
- Fixed Template Center tab counters flashing `(0)` during fetch — counters now render without a number while loading, then `(N)` once data is ready; replaced the plain "Loading..." text with a card skeleton grid.
- Updated 3 wiring tests to assert the new `refresh()` pattern (was `router.refresh()` / `useRouter`).

**Verification:** `npx tsc --noEmit` clean; production build clean; Vitest 1389 pass / 9 pre-existing failures (EN contract starter block, legacy invoice tab, timer event contract — not caused by this change). Production deployed `4f93750` (image `cubiqlo-prod:sha-4f93750…`), health/DB ok, `dpl=4f93750…`, live browser QA confirmed counter shows "Proposals (5)"/"Contracts (5)" with no `(0)` flash.

## 2026-08-16 — Contract editor starter template + proposal pricing single-source

- Added `buildContractStarterBlocks()`: 18-block contract starter (Perjanjian Kerja → Para Pihak → Latar Belakang → Ruang Lingkup → Nilai Kontrak table → Jangka Waktu → Ketentuan Lain → signature).
- Contract editor "Mulai dari template" now available for both proposal and contract; `applyStarterTemplate` branches by kind; contract placeholder chips (`{{contract_number}}`, `{{contract_date}}`, `{{workspace_address}}`) branch by kind.
- Proposal pricing single-source: removed manual "Investasi" table from the proposal starter and the "+ Pricing Table" preset; proposal pricing now comes solely from the detail form `lineItems` (rendered in PDF and public view).
- No migration changes.

## 2026-08-12 — Proposal and contract authoring foundation

- Decoupled proposal/contract drafts from required Client rows with recipient snapshots and nullable `clientId` links.
- Added block-based editors with autosave, explicit Save, content revision stale-write protection, protected contract signature blocks, and legacy body fallback.
- Added automatic `PROP-YYYY-####` / `CONT-YYYY-####` numbering and shared placeholder value helpers.
- Added public/detail/PDF block rendering for contracts and public/PDF block rendering for proposals.
- Added signed-contract `Tambah client` / `Nanti` flow with workspace-scoped, writable, idempotent server action.
- Added additive migrations `0074_document_authoring.sql` and `0075_autosave_revision_guard.sql`.

- Wired real proposal image/attachment uploads through existing workspace storage and quota paths, with safe media blocks, preview/download, rollback, delete, and reorder.

**Verification:** focused authoring and media/storage tests pass; full suite 251/251 files and 1,277/1,277 tests pass; `npx tsc --noEmit`, production build, ESLint with zero errors, and `git diff --check` pass. Browser acceptance remains open.

## 2026-08-12 — Dev integration sync and deployment retry

- Synchronized `dev/integration` with latest `main` billing/settings/i18n changes while preserving Prompt Studio validation and mobile UX improvements.
- Kept main billing/storage hardening as source of truth; skipped duplicate older dev billing/storage changes.
- Dev deployment retry blocked before build because GitHub fetch timed out on port 443.
- Production unchanged; `dokploy-traefik` remains sole public 80/443 owner.

## 2026-08-12 — i18n and UI polish follow-up

- Localized secondary landing-page marketing labels and pricing/capability copy through existing EN/ID translator.
- Localized site-builder canvas tabs, starter-block categories/labels, theme controls, colors, fonts, and starter-block names.
- Moved Files storage usage card below workspace folder navigation in left rail.
- Fixed Calendar action placement/style and vertically centered empty availability state.
- Kept empty-state create actions out of duplicate cards while retaining page-header actions.
- Localized Reports time-performance labels, timer controls/toasts, auth/client surfaces, and calendar/invoice tabs.
- Fixed time-entry work-date derivation for `Asia/Jakarta` and reduced inactive project-tab mounting.

**Verification:** targeted ESLint and TypeScript checks passed for each follow-up batch; dev deploys use clean `main` clones with production container unchanged.

## 2026-08-11 — Final billing/storage hardening and dev QA checkpoint

**Billing and storage:**
- Added owner-only and same-origin guards to plan, storage add-on, and extra-workspace checkout routes.
- Added bilingual storage add-on and extra-workspace purchase controls with monthly/yearly pricing.
- Added scoped billing checkout status UI for pending, completed, failed, and expired payment states.
- Added idempotent Pakasir missed-webhook recovery sync with protected cron route.
- Made client-portal uploads use transaction-scoped quota reservation and consume.
- Added age-gated storage reservation reconciliation command, cron route, and scheduler wrapper.
- Added workspace-scoped Files usage display and bilingual quota-block errors.

**Documents and QA:**
- Added preview-confirm send dialogs with recipient and subject for proposals, contracts, and questionnaires.
- Added contract signing row lock and best-effort post-commit audit logging.
- Dev browser QA passed document preview-confirm matrix 18/18; disposable fixtures cleaned and verified zero in `cubicle_dev`.

**Verification:**
- Focused source gates passed: tests, ESLint, TypeScript, diff check, and production build.
- Dev container `cubicle-dev` healthy; `/api/health` returned `status=ok`, `db=ok`; routed HTTP 200.
- Authenticated reconciliation dry-run scanned 32 workspaces with 0 active and 0 stale reservations.
- Dev Pakasir project/API key configured after removing empty Compose overrides; provider sync safely isolated stale order 404.
- Production container/image unchanged; production deploy remains blocked.

**Still open:** authorized real Pakasir payment/webhook lifecycle, real email delivery/token QA, concurrent quota stress, real reconciliation apply evidence, and explicit production approval.


## 2026-08-09 — UI/UX consistency release and Prompt Studio production verification

**UI/UX:**
- Completed the 47+ page consistency audit execution: headers, empty states, i18n, list cards/tables, action sizing, dialogs, skeletons, report tabs, and semantic finance colors.
- Added keyboard navigation to shared `StatusFilterTabs`.
- Added shared Select for invoice project-source items.

**Prompt Studio:**
- Added client-side validation for required core brief fields so empty submissions do not reach the Server Action or consume AI quota.
- Verified invalid submit no longer returns HTTP 500.
- Verified authenticated valid generation on dev and production.

**Release verification:**
- Full latest suite: 220 test files / 1,070 tests passed.
- Next.js production build passed.
- Production image: `sha256:54fcdd48e058d2298b9cd43d06a94ffc60b7c9446377a0aeeb035dadf7858a56`.
- Production health: `status=ok`, `db=ok`; public route HTTP 200.
- `dokploy-traefik` remains sole owner of public ports 80/443.
- Production Prompt Studio mobile smoke: result returned, no app console errors, no horizontal overflow.
- Hydration #418 remains a separate intermittent investigation; no speculative patch included.

## 2026-08-09 — Documentation redesign, questionnaire UI alignment, portal/project refresh fixes

**Documentation UI:**
- Redesigned `/app/docs` index and all documentation routes with shared hero, breadcrumb, table of contents, numbered sections, callouts, responsive layout, and consistent cards.
- Removed stale Package/Paket billing copy from user-facing documentation UI; active project billing models are Fixed Price, Hourly, and Retainer.

**Questionnaires:**
- Standardized list, create, detail, and edit pages with shared app spacing, responsive headers, localized breadcrumbs, consistent actions, cards, and empty states.

**Client/project UX:**
- Persisted client portal slug state when a slug is provided during client creation.
- Revalidated client detail, project list, and dashboard after project creation so linked projects update without stale server-rendered data.

**Verification:**
- Focused wiring tests passed: docs shell 23 tests, questionnaire pages 4 tests, client/project fixes 4 tests.
- Full Vitest suite passed: 218 files / 1,049 tests.
- ESLint and TypeScript checks passed; production build passed.
- Production deployed to `cubiqlo-new-app`; `/api/health` returned `status=ok`, `db=ok`.

## 2026-08-09 — Prompt Studio UX polish, AI dev verification, and dev deployment

**Prompt Studio:**
- Added inline validation for required, range, NaN, and invalid select values.
- Added bilingual option labels without exposing internal values such as `face`, `no-face`, `short`, `medium`, `long`, `yes`, and `no`.
- Standardized testimonial rating to optional 1–5 selection.
- Clarified ad placement/channel labels while preserving payload keys.
- Added stable sections 1–4, including an explicit no-extra-details state for templates without detail fields.
- Added mobile sticky Generate CTA and expanded mobile preview summary.
- Localized visible core labels for Indonesian mode.

**AI and QA:**
- Fixed dev Compose environment precedence so `AI_API_KEY` from `.env.development.local` reaches `cubicle-dev`.
- Authenticated QA verified Feed and Carousel flows at `https://dev.cubiqlo.com/app/prompts`.
- Real Carousel generation passed: structured output, cards, terminal view, quota increment `0/1000 → 1/1000`, and zero browser console errors.
- Removed dev-only Traefik Basic Auth middleware; production routing unchanged.

**Commits and release state:**
- `9731d42` — Prompt Studio validation and option UX.
- `29efda7` — Prompt Studio sections and mobile preview polish.
- `39726b0` — Preserve dev AI provider key.
- All commits pushed to `origin/dev/integration`.
- Integrated and deployed to `dev.cubiqlo.com`.
- Latest dev revision: `39726b0`.
- Production: not merged or deployed; explicit approval still required.

**Verification:**
- Prompt tests: 37 passed.
- ESLint: passed.
- TypeScript: passed.
- Next.js production build: passed.
- Dev health: `status=ok`, `db=ok`.
- Production container/image: unchanged

## 2026-08-08 — Questionnaire editing, AI quota integrity, invoice lifecycle hardening, billing integration, docs and UX cleanup

**Questionnaire workflow:**
- Added questionnaire create dialog, owner/editor edit route, shared runtime field schema, corrupt JSONB fallback, and validation for 1–50 fields.
- Added focused action, schema, authorization, and wiring regression coverage.

**AI quota and provider integrity:**
- Replaced read-then-write monthly usage accounting with an atomic PostgreSQL upsert guarded by the plan limit.
- Added best-effort quota release when the upstream provider never succeeds; successful provider responses remain charged even if later parsing or persistence fails.
- Applied effective-plan checks to Prompt Studio, visual prompts, and Personal Site AI.
- Removed fixed internal 9Router IP handling; endpoint resolution now uses environment configuration or Docker service DNS.

**Invoice, plan, and navigation hardening:**
- Added server-side invoice status transition rules so paid, cancelled, and archived invoices cannot be reopened through the generic edit action.
- Added legacy package-project fallback as fixed billing source while preserving billing-aware invoice behavior.
- Removed dead Project/Task quick-create links and synchronized Free-plan Client Portal/AI copy with actual entitlement constants.
- Added accessible IDs and labels to manual time Project/Task search controls.

**Dev integration and production release:**
- Merged `dev/integration` into `main` as `8248dcf` after resolving billing-aware integration conflicts without removing integration-only behavior.
- Dev verified at `https://dev.cubiqlo.com`: app/DB health `ok`, authenticated dashboard, client/project/invoice flows, invoice status options, and no horizontal overflow at desktop QA viewport.
- Production deployed to `cubiqlo-new-app` from image `sha256:bc39cd61b4a787ea6e8c79f2a95009f4ba6d4ff774979e988c25841a0ea80347`.
- Production verification: `https://app.cubiqlo.com/api/health` returned `{"status":"ok","db":"ok"}`, login and landing HTTP 200, and `dokploy-traefik` remained sole public 80/443 owner.
- Production DB backup: `/root/backups/cubiqlo/cubicle_prod_20260808T143858Z.dump`; SHA-256 `166a7d290a5ad207bee51d37eb426af7ed10281884b7d8764282bc4d18520511`.
- Release gate: 215 test files / 1,018 tests passed, ESLint, TypeScript, and Next.js production build passed.
- Production deployment is complete; follow-up mobile runtime QA remains separate from release gate.

**Prompt Studio, docs, and UI:**
- Added bilingual catalog names/descriptions, compact duration values with backward compatibility for legacy Indonesian values, loading skeletons, and updated docs/config examples.
- Synchronized R2 public URL aliases, OpenAI-compatible environment names, and default AI model configuration.

**Verification:**
- Superseded by final release gate below: 215 test files / 1,018 tests passed.
- ESLint, TypeScript, Next.js production build, Compose config validation, and `git diff --check` passed.
- Dev and production deployment completed; see release section above.

## 2026-08-06 — Searchable Client/Project/Task combobox, multi-line description textarea, and compact Indonesian calendar popover

**Searchable Combobox for Time Logs & Edit Dialog:**
- Combined `Client` and `Project` into a single searchable `Klien & Proyek *` input in both `AddTimeLogDialog` (+ Catat Waktu) and `Timesheet` (Edit Entri Waktu).
- Filters client name and project name in real-time as the user types.
- Popover dropdown only appears when user inputs a search keyword (prevents popup clutter on empty focus).
- Made `Tugas (Opsional)` searchable as well in both modal dialogs.

**Multi-Line Description Textarea:**
- Replaced single-line `Input` for `Deskripsi` with multi-line `Textarea` (`rows={3}`, `min-h-[80px]`) in both `AddTimeLogDialog` and `Timesheet` edit modal for more comfortable work description editing.

**Compact Indonesian Calendar Popover:**
- Updated datepicker `Calendar` popover to use Indonesian locale (`id` from `react-day-picker/locale`): Month name in Indonesian (e.g. `Agustus 2026`) and weekdays in Indonesian (`Sen, Sel, Rab, Kam, Jum, Sab, Min`).
- Made grid layout compact with clean borders below month caption and weekday headers.
- Fixed month navigation arrow positioning to sit cleanly at top-left and top-right with spacious padding (`px-8` caption, `px-2` nav buttons), preventing cramped/overlapping numbers.

**Production Deploy:**
- Rebuilt production image `cubicle-cubicle:latest` and recreated container `cubiqlo-new-app`. Verified live on `app.cubiqlo.com`.

## 2026-08-06 — Project hourly billing UX, edit dialog polish, retainer actions & live timer browser tab title

**Project Hourly & Invoice Form Fixes:**
- Fixed `ProjectForm` fallback for `billingModel`: correctly resolves `hourly` when `billingType` is `"hours"` or `"hourly"`.
- Removed `Client` selector from project edit dialog (scoped to active project's client).
- Removed `Budget Disepakati` field from project creation/editing when `billingModel === "hourly"`.
- Added `hourly_deposit` (Deposit / Down Payment) and `hourly_timesheet` (Log Jam Kerja) source mode options in `InvoiceForm` for hourly projects.
- Fixed subtotal calculation for `hourly_deposit` in draft invoice preview.

**Project Workspace UI Alignment:**
- Aligned `+ Tambah Tugas` button in `ProjectTaskWorkspace` with `+ Buat Invoice` in `ProjectBillingTab` (`size="sm"`, `variant="default"`, `gap-1`).
- Aligned header layout in `ProjectTaskWorkspace`: `flex items-center justify-between` with `Tugas Berulang` / `Tugas Workflow` heading on the left and button on the right.
- Aligned `Buat Invoice` button in retainer project actions (`+ Buat Invoice` `size="sm"` at top-right of `ProjectBillingTab`).

**Live Timer Browser Tab Title:**
- Live active timer updates document title dynamically: `⏱️ [00:01:13] Cubiqlo — Client Operations Hub`.
- Handled clean title stripping and `useRef` base title retention to prevent duplicate emoji/timer text accumulation on tab hover/update.
- Auto-resets document title when timer is paused or stopped.

**Production Deploy:**
- Rebuilt production image `cubicle-cubicle:latest` and recreated container `cubiqlo-new-app`. Verified live on `app.cubiqlo.com`.

## 2026-08-04 — Landing builder v2 complete: drag, structure, mobile, publish, contact

**Phase 1 — Drag from Sidebar:**
- Moved DndContext from `canvas-renderer` to `canvas-editor` (single context for template drag + section reorder).
- Created `DraggableTemplateButton` with `useDraggable` — section templates in Insert tab are now draggable.
- `handleDragEnd`: templates insert at drop position (before target section), section reorder via SortableContext.
- `DragOverlay`: floating chip with template label while dragging.
- Click-to-add preserved as fallback.

**Phase 2 — Structure Panel:**
- Created `src/components/site/canvas/structure-panel.tsx` — 7th sidebar tab.
- Shows compact section list with type icons + heading preview.
- Drag-to-reorder via SortableContext (shared DndContext).
- Click row → select section + `scrollIntoView` in canvas.
- Empty state: "Belum ada section. Tambah dari tab Insert."

**Phase 3 — Mobile Step Editor:**
- Created `src/components/site/canvas/mobile-step-editor.tsx` — 4-step wizard.
- Steps: Pages (list/add/set home) → Sections (add template/delete/reorder) → Theme (8 presets + color picker) → Publish (slug + SEO + publish toggle).
- Conditional render at CanvasEditor: `md:hidden` → MobileStepEditor, `hidden md:block` → desktop DnD layout.
- Auto-save, Back/Next navigation, step indicator.

**Phase 4 — Publish Toggle:**
- Desktop: toggle button in bottom bar (Live/Draft badge), confirm dialog for publish/unpublish.
- Gates on `isReadyToPublish` — disabled when site not ready.
- Mobile: same toggle in PublishStep of mobile editor.
- Calls `updateSite({ published: true/false })` — auto-saved.

**Phase 5 — Public Contact Form:**
- Created `src/app/site/[slug]/contact/route.ts` — POST endpoint with:
  - Honeypot field (`_hp`) for bot detection
  - In-memory rate limit (3/hour per IP)
  - DB join to find workspace owner email
  - Sends notification via Resend
- Created `src/components/site/contact-form.tsx` — client component with honeypot, loading/success/error states.
- Wired into `personal-site-renderer.tsx` — appears at bottom of every public landing page.

**Phase 7 — Dev Deploy:**
- `docker compose -f docker-compose.dev.yml up -d --build cubicle-dev`
- Dev server verified HTTP 200 at `localhost:3000`.
- Prod untouched.

**Files:** 7 files (+1168/-177), commit `79a5155`.

## 2026-08-03 — Landing builder Phase 4 AI copy + Phase 7 SEO/share + prod deploy

**Phase 7 SEO/share settings:**
- Model: added `seoMetadataSchema` (title max 80, description max 180, ogImage max 2000 with safe URL refine) to `personalSiteInputSchema`; `normalizeStoredPersonalSite` handles null/absent `seo`.
- DB: additive migration `0067_personal_site_seo.sql` — `ALTER TABLE ADD COLUMN IF NOT EXISTS seo jsonb`.
- Created `src/lib/personal-site/metadata.ts` with `generatePersonalSiteMetadata()` and `generatePersonalSiteSubPageMetadata()` — OG + Twitter cards with title/description fallback and dynamic `og:image`.
- Created `src/app/api/og/personal-site/[slug]/route.tsx` — dynamic Open Graph image with theme colors.
- Created `src/components/site/canvas/seo-panel.tsx` — editable SEO title/description/OG image, WhatsApp share preview card, copy public link.
- Wired SEO tab into canvas sidebar alongside Insert/Pages/Templates/Theme.

**Phase 4 AI copy generator:**
- Created `src/lib/actions/personal-site-ai.ts` — server action with auth + workspace writable guard, Zod strict input/output, 9Router OpenAI-compatible fallback (Gemini), supported types: services/faq/cta, exact counts (services 3, FAQ 5), clean error messages.
- Created `src/lib/ai/copy.ts` — schemas, prompt builder, JSON parser (raw/fenced/prose), SSE extractor, section patch builder with fresh IDs.
- Created `src/lib/ai/copy.test.ts` — 16 focused tests covering schema, parsing, SSE, and error cases.
- Updated `src/components/site/canvas/properties-panel.tsx` — Generate Copy UI with businessName/niche/targetAudience/offer/tone fields, loading state, preview-before-apply with explicit Apply/Discard.

**Fixes:**
- `seo-panel.tsx`: added `Partial<SeoMetadata>` type annotation to fix TSC type inference (site.seo resolved as `{}`).
- `canvas-editor.tsx`: wired real `publicUrl` (computed from `publicSiteBaseUrl` + slug) to SEOPanel instead of `previewUrl`.
- `OG route`: removed unused `isEnglish` variable.
- `readiness-badge.tsx`: replaced all `t("readiness.*", ...)` keys with actual Indonesian text (\"Siap publikasi\", \"perlu diperbaiki\", etc.) matching the i18n-client pattern where `t(id, en)` returns `id` for Indonesian.
- `personal-site.ts`: replaced `personalSiteInputSchema.parse()` with `normalizeStoredPersonalSite()` in `getPersonalSiteForCurrentOwner()` to gracefully handle null columns (pages, themeConfig, heroImage) from new migrations.

**Prod deploy:**
- Migration 0067 + missing columns (pages, theme_config, hero_image) applied to production DB.
- Container rebuilt with commit `c0f6bbc`, deployed to `cubiqlo-new-app`.
- Verified: `/site/alip` HTTP 200 with full OG metadata including `og:image`, landing builder loads without ZodError.

**Commits:** `5f0ebc3` → `c8bfd9c` → `c0f6bbc` pushed to `main`.
**Verification:** 113 focused tests pass, TSC clean, ESLint clean, Docker build passes, zero browser console errors.

## 2026-08-03 — Landing page builder multi-page checkpoint + usability plan

**Phase 6 Readiness UI** (closes `docs/plans/2026-08-03-landing-page-builder-usability-improvements.md` Phase 6):
- Added `src/lib/personal-site/readiness.ts` with `getPersonalSiteReadiness()`, `isReadyToPublish()`, and `countReadinessIssues()` helpers to evaluate landing pages for publish readiness. Checks: slug validity, title/hero filled, CTA paired when published, contact link exists, content sections present, themeConfig set.
- Created `src/components/site/readiness-badge.tsx` as a live-updating badge/component showing "Ready to publish" or "<N> things to fix". Clicking toggles an accessible issue list/popover with severity labels (errors first, then warnings). Never dirties site state; reads directly from live site form state on every render.
- Integrated into canvas editor (`src/components/site/canvas/canvas-editor.tsx`) near bottom bar next to device switcher; respects existing layout and does not conflict with properties panel or mobile controls.
- Focused unit tests added: `src/components/site/readiness-badge.test.tsx` (pure function tests) + `src/lib/personal-site/readiness.test.ts` (25 tests). All green.
- No prod deployment; dev-only work pending explicit approval.

**Prompt Studio duplicate-field fix**:
- Implemented overlap-key resolution to eliminate duplicate inputs between global form fields (platform, ratio, tone, offer) and type-specific fields in catalog entries. New utilities in `src/lib/prompts/catalog.ts`: `OVERLAP_KEYS`, `isOverlapKey()`, `nonOverlapFields()`, `resolveOverlapValue()`, `splitOverlapDefaults()`.
- Updated `prompt-studio.tsx` to use global form state as source of truth for overlap keys and only show non-overlap fields in detail section. Validation now resolves values correctly and prevents missing required fields due to duplication.
- Fixed validation path errors in prompt schema checks using resolved values instead of direct lookups in options.

**Dev AI model config**:
- Added `AI_MODEL: ${AI_MODEL:-ag/gemini-3.6-flash-low}` environment variable in `docker-compose.dev.yml` to support local development AI model selection alongside the existing API key configuration.

**Other uncommitted work preserved**:
- Canvas editor multi-page editing, page operations, undo/redo, device preview switcher (Phase 5), and all template files continue in worktree.
- Starter block templates (`section-templates.ts`, `page-templates.ts`) and their tests are fully wired to the canvas Insert/Templates tabs.

- Builder: current worktree checkpoint adds multi-page editing in canvas, active-page section sync, page add/rename/reorder/home controls, undo/redo preservation across pages, and mobile sidebar support for page operations.
- Public site: adds nested public route `/site/[slug]/[pageSlug]`, renderer page navigation, and active-page rendering while preserving the home route `/site/[slug]`.
- Theme: keeps `themeConfig` nullish-safe and applies header style, button style, hero image, font config, and accent color consistently in public renderer.
- Plan: adds `docs/plans/2026-08-03-landing-page-builder-usability-improvements.md` for next usability pass: starter blocks, page templates, properties panel, device preview, publish readiness, SEO/share settings, and AI copy generation.
- Verification: targeted ESLint passed with 0 errors and accepted existing warnings (`canvas-page-client.tsx` unused arg and renderer `<img>`), TypeScript passed, and `git diff --check` passed. Production untouched.

## 2026-08-02 — Site Builder: 6 new section types (Google Sites parity)

- New section types: `gallery` (image grid), `embed` (YouTube/maps/iframe), `social` (social media links with platform selector), `cta` (call-to-action block), `divider` (separator), `collapsible` (accordion/expandable group).
- Total section types: 8 → 14.
- Editor: each type has dedicated form (gallery: URL + alt, embed: URL + height, social: platform dropdown + URL, cta: text + button, collapsible: title + content rows).
- Renderer: all 6 types render on public page with theme-consistent styling.
- Commit: `1f71062` pushed to `main`. Deployed to dev.

## 2026-08-02 — Prompt Studio i18n: full English translation

- Catalog: `labelEn` added to 30+ Indonesian field labels (e.g. "Jumlah slide" → "Slide count", "Sudut kamera" → "Camera angle", "Gaya logo" → "Logo style").
- prompt-studio.tsx: `useT()` added for full i18n. All UI strings translated: category labels, section headers, placeholders, button text, dialog text, style/lighting refs (bilingual), preview panel labels.
- Categories: "Iklan & Promosi" → "Ads & Promotion", "Produk" → "Product".
- Commit: `850abc0` pushed to `main`. Deployed to dev.

## 2026-08-02 — Face Card & Logo prompt types

- New prompt type: **Face Card** — portrait analysis & styling recommendations. Dropdowns: Tipe analisis (Face Features, Spectacles, Style, Color, Makeup), Aesthetic (6), Background Tone (6), Typography (5), Color Mood (6).
- New prompt type: **Logo** — brand logo design & mockup. Dropdowns: Gaya logo (7), Skema warna (6), Tipe mockup (7), Industri (text).
- Both in "Brand & Copy" category. Total catalog: 16 → 18 types.
- Commit: `8e181fb` pushed to `main`.

## 2026-08-02 — Prompt Studio redesign: compact selector, section labels, preview

- Prompt Studio: rename "Feed Instagram" → "Feed" (universal, platform-agnostic). Remove Instagram-specific defaults.
- Shared dropdown options: `field-options.ts` with tone (10), style (10), platform (10), ratio (5), scene (10), camera angle (7), lighting (8), background (7), orientation (3), voice language (3), duration (6), cadence (4).
- Catalog: convert 15+ text fields to dropdowns across product-photography, product-try-on, fnb-menu, short-video-script, video-storyboard, ugc-ad, marketing-copy, content-series, product-ad.
- Advanced options: tone, style, platform, ratio now dropdowns instead of free text inputs.
- Commit: `d2c6696` pushed to `main`.

## 2026-08-02 — Calendar date picker for time navigation

- Time page navigation: date label is now clickable, opens a calendar dropdown (react-day-picker v10). Users can pick any date directly instead of clicking `<` / `>` arrows one by one. Week starts on Monday (Senin). Arrows and "Hari ini" button preserved.
- New deps: `react-day-picker@10.0.1`, `date-fns@4.4.0`.
- New UI components: `calendar.tsx` (react-day-picker v10 wrapper), `popover.tsx` (radix popover).
- Commit: `729f72f` pushed to `main`. Deployed to dev (`dev.cubiqlo.com`).

## 2026-08-02 — UI polish: empty state buttons, unified invoice

- Empty state: remove "Tambah Klien" button from client list empty state (2 instances). Remove "Buat Invoice" action from invoice list empty state (2 instances). Match tasks page pattern — empty state shows message only, users create from header "+ Baru" button.
- Unified invoice creation: source selector (full/DP/milestone/final) and preview card now appear for ALL billing types (fixed, hourly, retainer). Hourly project form adds "Budget Disepakati" field. Retainer uses fee as agreedAmount.
- Commits: `5b74187`, `af865d8` pushed to `main`. Deployed via image `cubicle:sha-af865d8`.

## 2026-08-02 — Retainer progress, task seeding, project currency selector

- Retainer progress: project detail header, project list, and client detail page all show approved hours / included hours (e.g. "40/40 jam") instead of task count for retainer projects. `getProjectProgress` handles retainer billingType. Added `retainerIncludedMinutes` + `trackedMinutes` to queries.
- Retainer dummy data: seeded 4 tasks + 8 approved time entries (300 min each = 40 jam) for "Contoh Retainer" project (Sep 01–Oct 01 periode).
- Project currency selector: added dropdown (IDR/USD/EUR/SGD/AUD/GBP/MYR/JPY) to project form. Labels update dynamically.
- Commits: `dd335e2`, `87ea61b`, `6c6c6d8` pushed to `main`. Deployed via image `cubicle:sha-6c6c6d8`.

## 2026-08-02 — Invoice hourly deposit, retainer simplification, input fixes

- Hourly deposit subtotal: `projectItems` now handles `hourly_deposit` mode → `previewAmount = source.amount`. Previously skipped (originalAmount=0 for hourly), subtotal showed Rp 0.
- Hourly deposit field name: form input changed from `source.value` → `source.amount` to match `ProjectInvoiceSourceSchema` (`.strict()` would reject on submit). `InvoiceSourceDraft` type and `sourceDraftComplete` updated accordingly.
- Hourly deposit input step: `min="0.01" step="0.01"` → `min="1" step="1"` for IDR. Browser HTML5 validation was rejecting whole numbers like 7250000.
- Retainer manual deposit removed: retainer project billing tab no longer shows "Buat Deposit/Item Manual" dialog. Retainer has single invoice flow via "Buat Invoice Periode Retainer" (auto-generate from fee + overage). Manual deposit was redundant and confusing.
- Retainer projectItems filter: retainer projects no longer render non-editable "Rp 0" item row in invoice form. Retainer billingType filtered out of `projectItems` computation.
- Commits: `2c3bab0`, `5110bc0`, `53168ea`, `d718f00` pushed to `main`. Deployed via image `cubicle:sha-d718f00`.

## 2026-08-02 — Invoice badge, delete, task, report, and fixed-price preview fixes

- Invoice detail badge: `displayStatus` no longer downgrades DB `status="paid"` to `"payment due"` when payment rows are empty. DB status is the source of truth; payment rows only upgrade upward to `paid`. Invoice marked paid manually now shows "Lunas".
- Delete invoice: add `DeleteInvoiceButton` + `deleteInvoice` server action (draft/cancelled only; cascades items + payments in transaction). Dialog closes before redirect; redirect uses origin-aware `backUrl` (project/client/global) instead of hardcoded `/app/invoices`, preventing 404 after delete.
- Task edit: `description` field in `taskSchema` and `updateTaskSchema` now `z.string().nullable().optional()` — form sends `null` when description cleared, previously ZodError.
- Report income: `updateInvoice` auto-creates a payment row for the remaining amount when status is set to `paid` and no payment covers the total. Reports aggregate from `payments` table, so marked-paid invoices without payment rows previously showed 0 income. Backfilled 7 existing paid invoices with missing payments.
- Fixed-price invoice preview: `projectItems` computation in `InvoiceForm` now falls back to `defaultInvoiceSource` when `projectSources` state is empty (initial render). `fixed_final` mode correctly shows `agreedAmount - priorActiveFixedBilledAmount` immediately without needing to switch modes first.
- Fixed-price source skip: `createInvoice` action skips service rows when an explicit fixed source (DP/milestone/full/final) is provided — the source amount IS the invoice line.
- Commits: `3542b7a`, `e670f09`, `ee5761d`, `664fa8f` pushed to `main`. Migrations 0064–0066 applied to production. Deployed via immutable image `cubicle:sha-664fa8f` (container `cubiqlo-new-app`).

## Unreleased — Explicit invoice entry sources

- Invoice entry: add explicit Fixed full/DP/milestone/final, Hourly timesheet/deposit, manual adjustment, and Retainer base/overage source intent.
- Scope: global creation remains workspace-wide; Client Invoice tab adds client-locked create; Project Invoice entry remains project-locked; multi-project invoices retain item-level project linkage.
- Integrity: add migration `0066` for `invoice_items.source_mode/source_metadata`, retain unique Time Entry linkage, validate Hourly eligibility/period/rate, transition selected entries conditionally, and restore sources atomically on draft cancellation.
- Fixed Price: calculate active progress only from Fixed source modes, require milestone names, reject overbilling/empty invoices, and serialize per-project creation before locked remaining recalculation.
- Timezone: Hourly fallback dates now use workspace timezone when `workDate` is absent.
- Verification: focused invoice suite passed 24/24 before concurrency hardening; latest targeted invoice suite, ESLint, production build, and disposable PostgreSQL migration apply/replay are release gates. Full suite still contains four unrelated stale Task ordering assertions expecting English labels.
- Commits: `d3d4438`, `0c96988` pushed to `main`. Production migration/deployment not applied.
- Pending plan work: Fixed progress preview/default from history, in-form eligible timesheet picker, Retainer project entry/usage summary, behavioral DB concurrency matrix, desktop/mobile browser QA, reconciliation, and production release evidence.

## v0.1.124-dev — 2026-08-01 — Portal visibility and permanent deletion

- Project create/edit: add **Tampilkan di Portal Klien** with persisted visibility; projects created from Client detail default visible while the known Client field remains hidden.
- Permanent deletion: add typed-name confirmation dialogs for Client, Project, and Task. These actions delete related operational, time, finance, portal, request, comment, and notification rows transactionally instead of archiving.
- Tenant safety: every destructive action checks writable workspace access and scopes manual deletes by `workspace_id`.
- Task deletion: removes linked Time Logs, comments, and notifications before deleting the Task.
- Verification: focused regression tests, ESLint, TypeScript, Next.js production build, and diff checks passed before deployment.
- Known limitation: DB file rows are removed, but physical R2 objects still require durable post-commit cleanup.

## v0.1.123-dev — 2026-08-01 — Live QA polish and template import stability

- Task Template import: refresh preview fingerprint from final selected items and duplicate decisions before atomic submit, fixing production `STALE_PREVIEW` Server Component errors while retaining stale-payload protection.
- Client detail: use one portal-active rule in summary and Portal tab so incomplete/revoked portal access no longer shows conflicting status.
- Client project UX: localize `Calendar` to `Kalender` and raw project states such as `on_hold` to human labels.
- Reusable Tasks: localize lifecycle/order controls and widen desktop table with safe horizontal scrolling so Task, Project/Client, and actions do not overlap.
- Verification: focused import/portal/live-QA suites passed 22/22 tests; ESLint, TypeScript, and Next.js production build passed.
- Scope: source, docs, tests, commit, and push only; production not deployed.

## Unreleased — Billing-aware Tasks, Templates, and Time cutover

- Tasks: add billing-aware workflow/reusable modes, flat Task Templates, atomic import, complete global/project editors, and mobile/keyboard ordering controls.
- Project detail: replace standalone Tasks/Layanan tabs with `Pekerjaan` and consolidated Billing; preserve Service compatibility storage.
- Time: require eligible active reusable Tasks for new Hourly/Retainer manual, weekly, and timer-completion writes while keeping empty timer start and historical taskless reads.
- Reports: aggregate current Time by client, project, Task, and member; historical rows without Tasks remain under `Tanpa tugas`.
- Activity/Service: retire active catalog routes via redirects; migration `0062` remains retired and unauthorized.
- Production: not deployed; additive migration `0064` remains behind backup, restore, rehearsal, and explicit approval gates.
- Verification checkpoint: disposable PostgreSQL 16 integration matrix passed; full ESLint passed; Vitest passed 162/162 files and 689/689 tests; production build passed. Authenticated desktop/mobile browser QA remains in progress.
- Local commits through `9e98997`; branch remains unpushed and production remains unchanged.

## v0.1.122-dev — 2026-07-31 — Repo safety docs and guard restoration

- Project detail: restored the **Layanan** tab and `ProjectServiceSettings` so per-project service snapshots stay editable outside the simplified Project form.
- Invoices: restored final-status financial guards for `sent`, `viewed`, and `overdue` after the temporary edit hotfix; financial line-item mutations are now locked for `sent`, `viewed`, `paid`, `overdue`, `cancelled`, and `archived`, while `draft` remains editable.
- Waktu mobile actions: restored 44 px mobile height for `Catat Waktu` while preserving compact desktop sizing.
- Repo hygiene: moved the local dummy-client manual note into ignored `.hermes/tmp/` so the Git worktree is clean.
- Documentation: clarified Project Services, invoice editability, current production image, feature status, schema snapshot, and email status.
- Verification: ESLint passed, 145/145 Vitest files passed with 599/599 tests, and Next.js production build compiled successfully.
- Commit: `9381be5`
- Deployment: Live app container `cubiqlo-new-app` updated to `cubiqlo-prod:sha-9381be5-repo-safe-fix-20260731202341`; `dokploy-traefik` remains the only public 80/443 owner.

## v0.1.121-dev — 2026-07-31 — Invoice editing fix for sent, viewed, and overdue statuses

- Invoices: Allow editing, adding, and deleting line items for invoices that are in `sent`, `viewed`, or `overdue` status. Only `paid`, `cancelled`, and `archived` statuses are now locked as final.
- Error prevention: Fixed generic "Server Components render" errors caused by `addProjectInvoiceItem` action throwing on `sent/viewed/overdue` checks.
- Commits: `f4f703a`
- Deployment: Live app container `cubiqlo-new-app` updated to `cubiqlo-prod:sha-f4f703a-invoice-fix-20260731104731` with DB health `ok`.

## v0.1.120-dev — 2026-07-30 — Navigation, compact filters, billing QA, and portal polish

- Sidebar navigation: replace covering desktop flyouts with route-active inline child menus for Pekerjaan, Keuangan, Personal, and AI; keep mobile accordions and collapsed desktop behavior compact
- Project/Task lists: move status, client, billing model, project, assignee, and priority filters into their table headers; remove redundant filter rows while preserving Task behavior tabs and List/Board controls
- Active-filter UX: align Task behavior tabs with List/Board controls, show active filters as labeled chips, and add one-click Hapus filter without clearing behavior or view state
- Task detail: remove the duplicate Mulai timer dari task action; timer remains available from the dedicated Waktu/topbar flow
- Billing project QA: create isolated Hourly and Retainer projects through browser UI, persist Retainer fee/included minutes/reset configuration correctly, and log five manual time entries per project
- Client Portal: replace legacy Per proyek/Per jam/Per paket labels with Fixed Price/Hourly/Retainer, rename Invoice ke to Invoice, localize Request to Permintaan, add a lock icon to Akses aman, make Ajukan Pertemuan primary, and improve the no-shared-project guidance
- Verification: focused Vitest wiring suites, TypeScript, and Next.js Docker production builds passed; authenticated desktop/mobile browser QA reported zero console errors and zero horizontal overflow
- Commits: `ebd1523`, `33ca5ac`, `e1900af`, `a5520a2`, `cb02d39`, `6b861c1`, `12812c8`
- Dev deployment: `dev.cubiqlo.com` runs revision `12812c8a3d2a5048eaf2e7f988983174be193bee`, image `sha256:b08e3e181a6fbf13e9f3c1925550b50427907fe401fd42387658c3397f08876c`, app/DB health `ok`, and production container was unchanged

## v0.1.119-dev — 2026-07-30 — Dev UI/UX audit hardening

- App shell accessibility: label global desktop/mobile search inputs and enlarge menu, sidebar, language, and onboarding controls to 44 px touch targets
- Dashboard mobile: show at most three incomplete onboarding actions by default, add expand/collapse for remaining steps, and preserve the five fixed Reminder cards
- Reports mobile: compact financial KPIs into a two-column layout, keep Net full-width, neutralize zero-value color, and hide empty prior-period comparison noise
- Personal Site: split the long builder into Identity, Content, Links, and Appearance stages while preserving sticky preview, save/publish actions, and URL/slug behavior
- Settings mobile: replace the crowded horizontal tab strip with an accessible section selector; retain URL-synced state and full 44 px desktop tabs
- Prompt Studio mobile: replace dense category/type card lists with compact accessible selectors, preserve visual cards on desktop, and tighten mobile form spacing
- Per-page accessibility: label task status/priority/project/assignee filters, expense month/category/search/reset controls, and workspace search; keep all five Search tabs readable at 390 px
- Workspace-owned detail fixtures: make the reusable QA seed collision-safe, populate client/project/invoice/proposal/contract/questionnaire/template details, and harden Project/Template mobile tabs
- Authenticated interaction QA: verify client create/search/keyboard-open/edit/reload persistence, Tasks/Expenses filters, and Expenses/Invoices pagination; harden client-list invalidation and add visible fade affordances to both Invoice tab rows
- Existing-invoice project items: add Manual / Dari Proyek Klien source selection, same-client Fixed Price eligibility, remaining-value calculation, currency conversion, duplicate prevention, and mobile-safe dialog behavior
- Final route sweep: verify all 44 app routes at desktop and mobile, connect visible form labels on Clients, Personal Notes, Journal, Questionnaire Builder, and Invoice metadata, and distinguish hidden Radix selects from visible controls
- Waktu mobile actions: balance Catat Waktu / Mulai Timer into a two-column 44 px mobile row, move Ekspor PDF to a full-width 44 px secondary row, and preserve compact desktop sizing
- Empty-user E2E: verify signup → email verification → empty dashboard → client → project → task → manual time → draft invoice through real browser forms, with reload persistence and desktop/mobile checks
- Project billing transition: normalize empty due dates to `NULL` and synchronize Fixed Price/Hourly/Retainer transitions with canonical time-tracking modes
- Manual time history: render duration-only entries with `manual_minutes` even when `end_time` is null, and associate all Catat Waktu labels with their controls
- TDD evidence: each batch was implemented through focused RED → GREEN wiring tests; latest tracked suite passed 126/126 test files and 547/547 tests
- Quality: ESLint reported 0 errors and one pre-existing timer dependency warning; TypeScript/Next.js production builds passed for every batch
- Git/PR ledger: PR #6 `93a0660` global accessibility, #7 `1114753` dashboard, #8 `6166679` reports, #9 `c4ecee9` Personal Site, #10 `fef1927` Settings, #12 `f1366e4` Prompt Studio
- Per-page accessibility PR: #13 / `ba01d56`; Search mobile follow-up `d5985b9`
- Detail fixtures PR: #14 / `413cfe9`
- Interaction QA PR: #15 / `5768cde`; create-navigation follow-up `7b1ce55`; Invoice tab affordance follow-up `2e49a7c`
- Invoice project-item PR: #16 / `ca8b9c3`
- Final route accessibility commit: `2e25e77`
- Waktu mobile action commit: `1eb316d`; billing transition commit: `ee69b6d`; manual-time visibility commit: `3a543a0`
- Dev deployment: `dev.cubiqlo.com` runs revision `3a543a08ce56e4d4c7c6bc0fafb2f1d1515a1a9b`, image `sha256:c0b79bfc6e6181a977e2b753f6261f93944661773c1747815565bb94c47e9e10`, app/DB health `ok`, restart count `0`, and `dokploy-traefik` remains sole owner of public ports 80/443
- Authenticated mobile QA: Prompt Studio selectors visible and operable at 390×844, category switch updated type options, no horizontal overflow, no browser-console errors, and desktop card controls remained hidden on mobile
- Final authenticated sweep: 88/88 renders, 0 navigation failures, 0 error boundaries, 0 console-error pages, 0 horizontal-overflow pages, 0 broken-image pages, and 0 visible unlabeled controls; scanner-only residuals are hidden Radix selects (`aria-hidden`, `tabindex=-1`, 1×1)
- Empty-user E2E evidence: isolated dev workspace contains exactly one client, project, task, 120-minute time entry, and draft `INV-0001`; invoice item persisted at 2 × IDR 250,000 = IDR 500,000; final desktop/mobile routes had HTTP 200, no overflow, no error boundary, and no console errors
- Detailed evidence: `docs/e2e-empty-user-client-to-invoice-2026-07-30.md`
- Scope: production application/container was not changed; UI/UX dev audit is complete

## v0.1.118-dev — 2026-07-30 — Dev integration recovery, Waktu UX, and route-aware sidebar

- Waktu Harian: restore the complete editable Timesheet instead of the read-only history component; keep row click/keyboard editing, deletion, empty-row guidance, filtering internals, and max 10 entries per page
- Waktu compact UX: hide legacy summary/filter cards on the daily route, restore the compact weekly wrapper, and move weekly add-row controls below the grid
- Active timer: show live elapsed time, safe no-project/no-task fallbacks, pause/resume/stop controls, and synchronize timer changes without rendering the broken `null · null` label
- Sidebar: automatically open the Pekerjaan, Keuangan, Personal, or AI flyout for active child routes; preserve temporary hover previews, manual close/open overrides, collapsed flyouts, mobile accordion behavior, badges, and keyboard navigation
- Task workflow: preserve separate Semua/Sekali selesai/Aktivitas berulang views with task behavior independent from billing model
- Invoice sharing: restore persisted shared-invoice links across refresh and retain the editable daily-time integration baseline
- Cron security: centralize four cron-route authorization checks with constant-time bearer-token comparison while preserving recurring-note rollover, 7/3/1-day reminder windows, deduplication, and system-note exclusion
- Recovery discipline: move previously container-only Waktu hotpatch behavior into Git-backed source and regression tests so future clean image rebuilds no longer overwrite it
- Verification: 112/112 Vitest files and 507/507 tests passed; ESLint reported 0 errors and one pre-existing timer dependency warning; Next.js production build passed
- Dev deployment: `dev/integration` revision `bccc2d7bc1856560cd5c0389c671cb1176dfb9df`, image `sha256:338e12d312f42a5dcd88f36e6529e00aecd83396a2923367ff013b836efe1e86`, app/DB health `ok`, and `dokploy-traefik` remained sole owner of public ports 80/443
- Scope: deployed to `dev.cubiqlo.com`; production application/container was not changed

## Unreleased — 2026-07-26 — Production full-feature QA and schema recovery

- Production database: apply ledger migrations `0043_persist_portal_token_encrypted.sql`, `0044_portal_password.sql`, and `0045_meeting_request_workflow.sql` after client and invoice creation exposed schema drift
- Client and invoice flows: verify authenticated UI creation end to end, including portal-enabled client creation, invoice number generation, line-item persistence, and correct `Rp125.000` total; remove all disposable QA records afterward
- Full-product smoke: inventory 62 pages, 46 API routes, and 37 server-action modules; confirm 37 authenticated app routes render HTTP 200 without application errors and protected routes redirect anonymous users to login
- Mobile: remove a 4 px horizontal overflow on AI Brain at 390 px by matching the full-page wrapper margin to the mobile app-shell padding
- Regression suite: update stale portal/CSP source assertions for the current slug-plus-password portal flow and centralized security-header helper; keep production CSP free of `unsafe-eval`
- Code quality: remove the unused-component lint warning from the legacy AI welcome screen
- Verified: 57/57 test files and 292/292 tests, ESLint, `npx tsc --noEmit`, Next.js production build, app/DB health `ok`, container healthy, clean runtime logs, and `dokploy-traefik` remains the sole public 80/443 owner
- Deployment: source revision `d953e0f05da19244f879d992cedd0b543b9be5ce`, image ID `sha256:4422277ac2e7e3d6071a223a4ada0b4c55b705eb1adb13c35734c9fef0bfd678`

## Unreleased — 2026-07-25 — Client Portal audit hardening

- I18n: add a persistent `ID | EN` switch using the existing `cubiqlo_lang` cookie; localize portal headers, summaries, tabs, requests, projects, tasks, packages, files, invoices, contacts, statuses, dates, dialogs, toasts, and empty states while preserving user-entered database content
- I18n reliability: reload after portal language changes so server-rendered and client-rendered copy switch atomically; verify ID → EN → reload → ID on the live 390 px portal without page-level overflow
- Security: validate portal request client/project ownership by workspace; preserve token and visibility scoping on file/invoice access
- Analytics: stop false file/invoice views on portal page load; record file views only after valid download, invoice first-view only on PDF open, and general visits as `portal_open`
- Performance: replace per-project task, file, timeline, time-summary, and package queries with batched queries plus linear project grouping
- Ringkasan/Proyek: separate active request history, hide internal metadata, clarify 100% project status, and make dense task/file sections collapsible
- File/Invoice/Kontak: localize labels, clarify upload context, harden accessible download/PDF actions, improve mobile invoice layout, and add useful official contact guidance without online payment actions
- Tabs/mobile: remove inactive `forceMount`, auto-scroll the active tab, add edge fades, keep touch targets at least 44 px, and preserve a 390 px page width without horizontal overflow
- Documentation: add `docs/client-portal-audit-2026-07-25.md` with scope, decisions, files, and verification evidence
- Verified: 88 Vitest tests, `npx tsc --noEmit`, Next.js production build, Docker rebuild/deploy, `/api/health` database OK, portal HTTP 200, mobile QA at 390 px, and `dokploy-traefik` remains sole public 80/443 owner

## v0.1.117 — 2026-07-24 — Multi-project invoice, file directory, and shared headers

- Invoice creation: support multiple project line items, snapshot project values/currencies, automatic FX conversion, report-detail URLs, and safer payment/status calculations
- Invoice communication: improve send/reminder message defaults, report options, invoice metadata, list presentation, PDF timesheet output, and item deletion behavior
- File manager: separate **Semua Berkas**, **Folder Workspace**, and **Klien**; add independent multi-expand navigation for clients, projects, and nested folders with consistent animated chevrons
- Folder safety: return readable deletion blockers for non-empty folders instead of masked Next.js Server Action errors; keep custom-folder rename/delete controls scoped to workspace, client, and project folders
- App consistency: normalize 29 internal page titles through shared `app-page-title` styling and add reusable `PageHeader` primitives for responsive title, subtitle, and action layout
- Documentation: add multi-project invoice design/implementation plans and update release notes
- Verified: 18/18 focused file-manager tests, `npx tsc --noEmit`, `git diff --check`, Docker production build/deploy, container healthy, `/api/health` database OK, and public proxy ownership unchanged (`dokploy-traefik` only on ports 80/443)

## v0.1.116 — 2026-07-24 — File manager safety and responsive UX

- File deletion: require explicit confirmation and delete the matching Cloudflare R2 object before removing its database record
- Folder integrity: reject nested folders whose client/project scope differs from the parent folder
- File manager UX: use denser rows and separators, improve empty-state guidance, hide irrelevant search/filter controls when empty, and keep folder actions visible
- Mobile/accessibility: improve responsive header/dialog layouts, enlarge touch targets, add folder-action labels, tooltips for truncated names, localized dates, and clearer Indonesian file-type labels
- Upload flow: show the 25 MB limit and clarify drag-and-drop guidance
- Verified: 4/4 file-manager rule tests, `npx tsc --noEmit`, `git diff --check`, Docker build/deploy, container healthy, `/api/health` OK, browser QA with no resource errors or horizontal overflow

## v0.1.115 — 2026-07-24 — Calendar and public booking hardening

- Calendar: add confirmation dialogs before deleting availability rules or cancelling appointments
- Calendar actions: enlarge touch targets and replace ambiguous `.ics` action with **Unduh .ics**
- Availability form: localize copy, improve mobile layout, and validate end time after start time
- Public booking: localize Indonesian copy, show booking timezone, improve date controls, and use responsive 2/3-column slot grid
- Slot engine: convert availability windows from each rule's IANA timezone to UTC before conflict checks and persistence
- Verified: `npx tsc --noEmit`, `git diff --check`, Docker build/deploy, container healthy, `/api/health` OK, booking route HTTP 200, browser QA with no resource errors or horizontal overflow

## v0.1.114 — 2026-07-24 — App UX polish, shared list density, timer page

- Client detail: keep Portal flow, remove redundant Ringkasan surface, default detail tab to Proyek, add compact portal action where useful
- Clients: Excel export endpoints hardened with workspace resolve; edit dialog made compact/scrollable with grouped fields
- Shared list UI: normalize Clients, Projects, Tasks, Invoices, Proposals, Contracts, Expenses, Questionnaires, and Time entries with compact `p-3` rows, visible separators, and zebra backgrounds
- Projects/Tasks: add Review status styling, clearer deadline/tenggat context, compact task filters, project/client links, and cleaner progress display
- Navigation/content: hide Penjualan, rename Paket to Service, keep topbar create less noisy on dense pages
- Settings/Auth: add account settings form for profile name/password and route/domain handling for `app.cubiqlo.com`
- Time page: clarify Tasks vs Timer split, compact timer card, improve manual-entry dialog on mobile, and make timesheet list match other dense lists
- Verified: `npx tsc --noEmit`, Docker build, deploy, `/api/health` 200, container healthy

## v0.1.113 — 2026-07-23 — Dashboard action queue + event-only notifications

- Renamed dashboard **Reminder** section to **Perlu ditangani** with cleaner product copy
- Grouped dashboard action queue into **Urgent**, **Menunggu aksi**, and **Terjadwal** so due items, approvals, contracts, appointments, and personal reminders do not feel mixed
- Clarified notification bell as an event inbox for recent client/team updates
- Kept recurring/state urgency (`invoice_overdue`, `task_due_soon`) out of notification bell list and unread counts; those now belong to dashboard action queue only
- Verified live with `testing@cubiqlo.com`: dashboard shows grouped action queue, notification API returns no dashboard-only reminders in bell

## v0.1.112 — 2026-07-22 — Branded noreply email logo

- Added Cubiqlo icon to default transactional email wrapper so client/user emails from `noreply@cubiqlo.com` show branded header inside the email body
- Added public BIMI-style SVG asset at `/bimi.svg` for future inbox-avatar DNS setup
- Created `noreply@cubiqlo.com` mailbox in Stalwart and added credentials to `/root/.secrets/cubiqlo-mailbox-credentials.txt`
- Verified smoke email from `Cubiqlo <noreply@cubiqlo.com>` to Gmail through Resend with `delivered`

## v0.1.111 — 2026-07-22 — Cubiqlo full webmail + business mailboxes

- `mail.cubiqlo.com` cutover to full Stalwart + SnappyMail webmail on VPS
- Root MX `cubiqlo.com` points to `mail.cubiqlo.com`; SPF allows VPS MX + Resend/Amazon SES
- Stalwart outbound delivery routes external mail through Resend relay on port `2587` (VPS blocks `587`/`465` outbound)
- Verified fresh outbound smoke test from `admin@cubiqlo.com` to Gmail with Resend `delivered`
- Added business mailboxes: `marketing@`, `cs@`, `sales@`, `billing@`, `finance@cubiqlo.com`
- Credential summary stored outside repo at `/root/.secrets/cubiqlo-mailbox-credentials.txt`

## v0.1.110 — 2026-07-22 — Invoice email: link PDF + template UX

- Email kirim invoice / reminder pakai link **PDF share** (`/api/invoices/share/:token/pdf`) — tampilan sama Unduh PDF
- Endpoint public PDF via share token
- Share link UI di detail invoice → PDF, bukan halaman HTML
- Template email branding: penjelasan awam, chip placeholder, pratinjau live

## v0.1.109 — 2026-07-22 — Invoice: auto line item dari project

- Buat invoice + pilih project → rincian item auto: **nama project** + **nominal**
  - Per proyek: `budget`
  - Package: harga package terpilih
  - Hours: nama project, nominal 0 (isi timesheet/manual)
- Total invoice dihitung ulang setelah seed

## v0.1.108 — 2026-07-22 — Portal: loading skeleton + micro-animations

- `loading.tsx` skeleton full portal page
- Suspense tabs pakai skeleton card (bukan teks “Loading…”)
- Fade-in ganti tab, expand project/task entry, chevron rotate

## v0.1.107 — 2026-07-22 — Portal: time entries under tasks, no tags

- Hapus tag time-entry di detail project (Package Hours / Hours Summary)
- Hapus block **Recent Time Entries** level project
- Time entry dikelompokkan per task: total jam di kanan + expand list entry

## v0.1.106 — 2026-07-22 — Portal: stable tab height + multi-expand projects

- Tab switch soft URL (`history.replaceState`) — no full remount / height jump
- Tabs `forceMount` + min-height panel biar layout antar tab lebih stabil
- Project accordion multi-expand (buka banyak project bersamaan)
- Portal file manager: folder nav soft + local state

## v0.1.105 — 2026-07-22 — Files: soft folder nav, no full-page flash

- Folder tree + header di **layout** (tetap mounted saat ganti query)
- Link tree/breadcrumb pakai `next/link` + `scroll={false}` (bukan hard `<a>`)
- `loading.tsx` cuma skeleton panel list kanan

## v0.1.104 — 2026-07-22 — Client portal: multi-currency asli, no ≈ base

- Portal client **tidak** pakai `≈ base` / kurs workspace (client bayar currency invoice)
- Hapus dead summary hardcode IDR/USD di portal page
- Invoice tab: stack per-currency + outstanding include `partial`
- Hide draft dari daftar portal; package/project money tetap currency asli

## v0.1.103 — 2026-07-22 — ≈ base toggle + expense/package list FX

- Settings Workspace → **Kurs finance**: toggle **Tampilkan ≈ base di list** (default ON)
- Expense list + recurring: amount asli + secondary `≈ base` (ikut toggle + kurs)
- Package catalog: harga asli + secondary `≈ base` (ikut toggle)
- Invoice list secondary `≈` ikut toggle (KPI base tetap)
- Migration `0037_workspace_show_base_currency_approx`

## v0.1.102 — 2026-07-22 — Invoice list FX secondary + KPI base

- List invoice: total asli + secondary `≈ base` (kurs manual) bila currency beda
- KPI atas list: Outstanding / Dibayar / Ditagihkan setara base currency (ikut filter status/klien)
- Draft/cancelled/archived tidak masuk KPI; missing rate di-skip + warning Settings
- Detail invoice + PDF tetap currency asli

## v0.1.101 — 2026-07-22 — Reports + expenses ke base currency

- Halaman **Laporan** convert aggregate (P&L, aging, top client/expense, cashflow, project expense) ke base currency via kurs manual
- Halaman **Pengeluaran** KPI + breakdown kategori convert ke base currency
- Detail baris invoice/expense tetap currency asli; missing rate di-skip + warning Settings
- Copy Settings **Kurs dashboard** update cakup reports/expenses

## v0.1.100 — 2026-07-22 — Notif dedupe + kurs ke tab Workspace

- Bell spam fix: `invoice_overdue` / `task_due_soon` dedupe (skip jika unread sama, cooldown 24h)
- Cron `cron-reminders.sh` tidak double-hit probe+POST lagi
- Cleanup notif duplikat lama di DB
- Kurs dashboard pindah Settings **tab Workspace** (bukan Branding)

## v0.1.99 — 2026-07-22 — Dashboard base currency (manual FX)

- Table `workspace_currency_rates` + Settings **Kurs dashboard** (tab Workspace)
- Rate manual: `1 USD = X IDR` (base = `defaultCurrency` workspace)
- Dashboard finance (revenue 30d, sparkline, pie) convert ke base currency
- Currency tanpa rate **di-skip**, warning + link Settings (tidak tebak kurs)
- Amount asli invoice/payment **tidak** diubah di DB

## v0.1.98 — 2026-07-22 — Dashboard declutter

- Greeting: cuma tanggal, hapus “X proyek aktif · Y tugas jatuh tempo”
- Kerja: hapus card **Tugas Jatuh Tempo** + **Invoice Jatuh Tempo** (sudah di Reminder)
- Hapus card **Timer Aktif** di dashboard (sudah di navbar)

## v0.1.97 — 2026-07-21 — Portal branding + client folder upload

- Header portal: logo workspace (fallback monogram), billing name/address/kontak
- Tab Folders: **Upload file** + drag-drop (max 25MB, validate extension/magic bytes)
- Endpoint `POST /api/client-portal/files/upload` (token auth, visibility=client)
- Download portal dukung file client-level (tanpa project)
- Notif in-app `client_file_uploaded` ke workspace members

## v0.1.96 — 2026-07-21 — Portal tabs + file manager

- Hapus card **Active** di portal (chip active projects tetap)
- Portal dipecah tab: Overview / Projects / Folders / Invoices / Contact
- Deep-link `?tab=projects|files|invoices|contact`
- Tab **Folders**: file manager (project → folder → file, breadcrumb, download)
- Folders/files scoped visibility client; `?projectId=&folderId=`

## v0.1.95 — 2026-07-21 — Branding Reply-To + owner fallback

- Reply-To pindah ke tab **Branding & Invoice** (bukan Integrasi)
- Helper `resolveWorkspaceReplyTo`: `replyToEmail` → `billingEmail` → email owner
- Outbound email (invoice, booking, team invite, email suite) pakai helper
- Portal contact email ikut fallback yang sama
- From tetap `noreply@cubiqlo.com` (SPF/DKIM aman); balasan klien lewat Reply-To

## v0.1.94 — 2026-07-21 — Settings tab groups

- Settings page dipecah ke tab: Workspace / Tim / Branding & Invoice / Integrasi / Lainnya
- Deep-link `?tab=team|branding|integrations|more`
- Google Calendar OAuth return land di tab Integrasi

## v0.1.93 — 2026-07-21 — Timer ↔ task link + bell/reminder separation

- **Start timer dari task**: tombol di task detail sheet → auto-link client/project/task + deskripsi = judul task
- **Auto-map deskripsi**: pilih task di timer widget / timesheet edit / manual entry → deskripsi isi judul (bisa diedit)
- **Bell ≠ Reminder**: copy UI bedakan inbox event (bell) vs active to-do dashboard (reminder)
- Project tasks query: ikut `projectId` + `projectName` biar start timer dari project tab aman

## v0.1.92 — 2026-07-21 — Portal request report/meeting + top summary

- **Request Report / Request Meeting** di client portal: dialog form + simpan ke `portal_requests` + notifikasi in-app ke workspace members
- Admin client tab Portal: badge **From client** untuk request dari portal
- Portal top summary: Active / By project / By hours / By package / Due invoice / Reminder
- List Requests & Reminders tampil di portal (approve/upload/mark done)

## v0.1.91 — 2026-07-21 — Stop timer no dialog

- Klik stop = hentikan langsung, tanpa form/dialog
- Navbar + halaman timer sama: simpan entri apa adanya, lengkapi nanti di timesheet

## v0.1.90 — 2026-07-21 — Stop timer optional + client export/DB fix

- **Stop form optional**: client/project/task/deskripsi boleh kosong; batal dialog = timer tetap jalan; lengkapi nanti di timesheet
- **DB live**: apply `clients.client_number` + backfill `CLI-######` + trigger assign
- **Export client xlsx** (single + bulk): Nama, Custom ID, Contact Person, Perusahaan, Email, Nomor Telepon, Alamat, Website, Status
- Docker build: `NODE_OPTIONS=--max-old-space-size=2048` anti OOM thrash

## v0.1.89 — 2026-07-21 — Weekly product revision: timer, dashboard, portal, invoice

- **Navbar timer quick-start**: klik mulai langsung (tanpa redirect ke /app/time); deskripsi + klien/proyek diisi saat stop
- Timer running: opsi **Stop** + **Pause/Resume**; batal dialog stop tidak matikan timer
- **Dashboard**: buang quick-action redundant (timer/invoice/klien); gabung reminder; finance 30-hari di sidebar kanan; ringkas active projects + overdue tasks di greeting
- **Client**: export Excel (satuan + bulk) kolom nama/custom ID/contact/status/telepon; email+phone di bawah header; auto `CLI-000001`
- **Task**: kolom nama assignee
- **Client portal**: by project + pie progress; hours per task; badge **NEW** invoice (belum dilihat klien); status invoice di kanan dekat download PDF
- **Mail invoicing**: workspace template body custom + placeholder `{{client_name}}` `{{invoice_number}}` `{{project_name}}` `{{amount}}` `{{due_date}}` `{{invoice_link}}`
- DB: `invoices.client_first_viewed_at`, `workspaces.invoice_email_body`

## v0.1.88 — 2026-07-19 — Invoice payment currency + timesheet range

- Section **Pembayaran**: format uang pakai currency invoice (bukan hardcode Rp)
- **Ekspor Timesheet** di edit invoice: dialog pilih range tanggal (bulan ini/lalu/custom)

## v0.1.87 — 2026-07-19 — Restore clean homepage

- Revert Google OAuth branding homepage patches
- Landing page back to clean marketing copy (pre-branding attempt)

## v0.1.86 — 2026-07-19 — Stronger Google OAuth branding homepage

- Header text **Cubiqlo** + Privacy/Terms links visible
- About section: purpose EN/ID + why Google Calendar access
- Explicit app name match statement for consent screen reviewers

## v0.1.85 — 2026-07-19 — Homepage branding for Google OAuth

- Homepage H1 exact **Cubiqlo** (match OAuth consent app name)
- Purpose block EN + ID above the fold for Google branding verification

## v0.1.84 — 2026-07-19 — Time list pagination

- Menu **Waktu**: list max **10 entri/halaman** + prev/next
- Total/filter summary tetap hitung semua hasil filter

## v0.1.83 — 2026-07-19 — Client Google Calendar CRUD + pagination

- Tab client Calendar: **buat / edit / hapus** event langsung ke Google Calendar klien
- List event max **10 per halaman** (prev/next)
- Form: judul, mulai–selesai, lokasi, catatan

## v0.1.82 — 2026-07-19 — Client Google Calendar (per-client)

- Clients → detail → tab **Calendar / Meetings**
- Connect Google Calendar **klien** via invite link (tanpa login Cubiqlo)
- Status connect/disconnect + list event Google klien (terpisah dari calendar user)
- Tabel `client_google_calendar_connections`
- Routes: `/api/integrations/google-calendar/client-invite/[token]`, result page `/client-gcal`

## v0.1.81 — 2026-07-19 — Google Calendar sync

- Settings → **Google Calendar**: connect/disconnect OAuth.
- Token disimpan terenkripsi AES-256-GCM di `google_calendar_connections`.
- Public booking auto-create Google event; cancel appointment hapus event (best-effort).
- Env: `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, optional `GOOGLE_REDIRECT_URI` / `GOOGLE_TOKEN_ENCRYPTION_KEY`.
- Redirect URI default: `https://cubiqlo.com/api/integrations/google-calendar/callback`.

## v0.1.79 — 2026-07-19 — Sortable table headers

- Reusable `SortableHeader` + `useTableSort` (3-state: ASC → DESC → default).
- Sortable columns on Tasks, Projects, Clients, Invoices, Proposals, Contracts, Expenses, Questionnaires.
- Project tasks list view: same 3-state column sort.

## v0.1.78 — 2026-07-19 — Project status: archived

- Project status enum + form + tabs: tambah **archived** / Diarsipkan.
- `archiveProject` sekarang set `status=archived` (bukan `cancelled`).
- Portal: project archived ikut bucket arsip (bersama completed/cancelled).
- Badge/status color untuk archived sudah ready.

## v0.1.77 — 2026-07-19 — Projects status tabs + client/package filters

- Projects list: status tabs (All / Active / Draft / On Hold / Completed / Cancelled) with counts.
- Filter by client and package (`selected_package_id`).
- Empty state adapts when filters return no rows.

## v0.1.76 — 2026-07-19 — Prompt Studio regroup tabs

- Prompt Studio: 2-level tabs — group by output type (Visual Iklan / Feed Series / Produk / Copy & Video), then mode di dalam group.
- Ganti grouping lama Design/Feed/Produk/Konten yang gak cocok isi.

## v0.1.75 — 2026-07-19 — Workspace rename + Prompt Studio cleanup

- Settings: owner-only **edit nama workspace**.
- Prompt Studio: hapus banner "Brief → prompt", flat tabs (Design Grafis, Typography Ads, dll) styling seperti invoice tabs.
- Cost/token visual prompt: hitung dari usage API + estimateCost (bukan hardcode $0.0000), revalidate setelah generate.

## v0.1.74 — 2026-07-19 — Hide PERSONAL for invited members

- Sidebar **PERSONAL** (Catatan / Landing Page / Jurnal) hanya tampil untuk **owner** workspace.
- Direct URL non-owner → redirect `/app/dashboard` (no error card).
- Access rule tetap owner-only di `personal-notes` actions.

## v0.1.73 — 2026-07-19 — Prompt Studio cleanup + tabs

- Hapus section **Generate** (template form) dari `/app/prompts`.
- Redesign AutoFeedsStudio: group tab (Design/Feed/Produk/Konten) + pill mode.
- Layout rapi: brief kiri, output kanan, history full-width, stats di header.
- Hapus `prompt-form.tsx` unused.

## v0.1.72 — 2026-07-19 — Invoice PDF: no paid fallback

- `Paid`/`Dibayar` hanya sum **Catatan Pembayaran** — no fallback ke total invoice.
- Belum ada payment row → `Paid = 0` (sama seperti section Pembayaran di edit invoice).
- Header **Paid** hanya jika sum payment >= total; status `paid` saja tidak cukup.

## v0.1.71 — 2026-07-18 — Invoice PDF: paid amount from payments

- PDF ambil total dibayar dari **Catatan Pembayaran** (`payments`).
- Header: **Paid** = sum payment; **Amount Due** = total − paid (bukan hardcode 0).
- Blok totals: baris Paid + Amount Due.

## v0.1.70 — 2026-07-18 — Invoice PDF: full white background

- Page background force `#ffffff`.
- Box thank-you/payment netral putih (hapus soft ungu).

## v0.1.69 — 2026-07-18 — Invoice PDF: header full white

- Hapus stripe ungu + hero box ungu soft di atas PDF invoice.
- Border header netral abu; background header full putih seragam.

## v0.1.68 — 2026-07-18 — Invoice PDF: detail report under description

- Pindah blok **Detail report** ke langsung di bawah tabel Description (sebelum totals).

## v0.1.67 — 2026-07-18 — Invoice PDF: detail report link

- PDF invoice (`/api/invoices/[id]/pdf`) tampil blok **Detail report** + URL full timesheet.
- URL: `/api/time/export/pdf/va-timesheet?report=full&clientId=…(&projectId=…)`.
- Portal client PDF tetap tanpa link (timesheet butuh login workspace).

## v0.1.66 — 2026-07-18 — Invoice: link ekspor timesheet full

- Detail invoice: tombol **Ekspor Timesheet** → `/api/time/export/pdf/va-timesheet?report=full` (sama full export di menu Waktu).
- Prefill filter `clientId` (+ `projectId` kalau invoice punya proyek).

## v0.1.65 — 2026-07-18 — Global search + docs completeness

- Halaman `/app/search` (topbar search sekarang land ke hasil nyata).
- Search klien/proyek/tugas/invoice via ILIKE + filter kind.
- USER_GUIDE: form field list (sec 20) + permission matrix role×aksi (sec 21).

## v0.1.64 — 2026-07-18 — Invoice list toolbar polish

- Tab status pakai `TabsList`/`TabsTrigger` (sama styling Clients/Projects).
- Filter klien + jenis proyek sejajar baris tab (kanan di desktop).

## v0.1.63 — 2026-07-18 — Invoice list: filter client + jenis proyek

- Filter dropdown klien + jenis billing (Per Jam / Per Paket / Per Proyek / Tanpa proyek).
- URL query `?clientId=&billing=` tetap hidup bareng tab status + pagination.
- Kolom Proyek + Jenis di tabel list.

## v0.1.62 — 2026-07-18 — Invoice archive tab

- Status baru `archived` (Arsip) di schema + Edit Invoice + badge.
- Tab **Arsip** di list invoice; tab **Semua** exclude arsip biar list utama bersih.
- Portal klien: arsip disembunyikan + gak masuk outstanding.

## v0.1.61 — 2026-07-18 — Invoice list: status tabs + pagination

- Tab status: Semua / Draf / Terkirim / Dilihat / Terlambat / Lunas / Dibatalkan (count badge).
- Pagination 10 invoice/halaman (`?status=&page=`), prev/next + "Menampilkan X–Y dari Z".
- Tab kosong (non-core) disembunyikan biar gak ramai.

## v0.1.60 — 2026-07-18 — Import time: Select All lebih jelas

- Tombol `Pilih Semua (N)` outline + master checkbox sticky di atas list.
- Indeterminate state saat sebagian dipilih; clear selection; fix double-toggle checkbox.

## v0.1.59 — 2026-07-18 — Client projects: package progress by hours

- Tab Proyek di client detail: progress bar package pakai % jam billable terpakai / kuota paket (bukan task done).
- Label: `X.Y/40 jam terpakai` + nama paket. Warna bar: hijau <80%, oranye ≥80%, amber ≥100%.
- Hours billing: tampil jam tercatat (tanpa progress task). Project billing: tetap task progress.

## v0.1.58 — 2026-07-18 — Invoice detail: project + billing type

- Header invoice: tampil nama proyek + label billing (Per Jam / Per Paket / Per Proyek).
- Package: tampil nama paket + jam (mis. Starter 40 Jam (40 jam)).
- Form Edit Invoice: blok read-only konteks proyek (bukan field editable).

## v0.1.57 — 2026-07-18 — Import time by project + line desc project name

- Import time list: filter by `invoice.projectId` (bukan semua time klien). Invoice tanpa project tetap client-wide.
- Server `importTimeEntries`: reject time beda project/client dari invoice.
- Line item desc import: `Project — deskripsi` (PDF/client-facing).
- UI list import: tampil nama project di subtitle.
- Backfill deskripsi item time_entry yang belum ada prefix project.

## v0.1.56 — 2026-07-18 — Import time rate preview + create rate fallback

- List import time: rate preview pakai entry → project → workspace default (project package gak kelihatan 0).
- Create timer/manual entry: fallback rate sama (bukan cuma project hourly).
- Repair unbilled time entries rate kosong di Alip Testing → 250k.

## v0.1.55 — 2026-07-18 — Invoice create UX + time import restore

- **Buat invoice**: tombol loading `Membuat invoice…`, hard redirect ke detail invoice baru (mobile gak stuck di form).
- **Hapus item time**: restore time entry status `approved` (bisa di-import ulang, gak hilang).
- **Import time rate 0**: fallback project rate (semua billing type) + workspace default; persist rate ke time entry.
- Data repair Alip Testing: orphaned invoiced times restored, zero-rate line items + totals INV-0001/INV-0008, default hourly rate 250k.

## v0.1.54 — 2026-07-18 — Fix invoice number collision

- Create invoice gagal (`INV-0002 already exists`) karena counter stale setelah seed.
- Generator nomor: selalu `max(counter, MAX(existing INV-####)+1)` di dalam transaction.
- Sync counter workspace Alip Testing ke next `INV-0008`.
- Error duplicate → pesan user-friendly (bukan opaque RSC digest).

## v0.1.53 — 2026-07-18 — Contextual back client → project

- Client tab Proyek → project pakai `?from=client`.
- Project detail: back **Kembali ke [Client]** + buka client di `?tab=projects` (bukan always All Projects).
- Dari list All Projects: back tetap **Kembali ke Proyek**.

## v0.1.52 — 2026-07-18 — Templates Soon gate + project billing labels

- **Templates**: badge **Soon** di sidebar. User non-preview cuma liat halaman Soon (gak buka center). `alipdevcom@gmail.com` tetap bisa buka full UI, badge Soon tetap ada.
- **Project detail**: tampil jenis billing **Per Jam / Per Proyek / Per Paket** + hint + rate/budget.
- **Client → tab Proyek**: badge billing type + ringkas rate/budget/paket.

## v0.1.51 — 2026-07-18 — Mobile/tablet nav + header polish

- **Topbar compact**: phone max ~4 controls (menu, search icon, New, notif, avatar). Search expand full-width; timer idle hide on phone; AI + workspace switcher pindah ke avatar menu di mobile.
- **Sidebar**: overlay sampai **lg** (tablet gak nge-squeeze content). Width `min(280px, 85vw)`.
- **Page headers**: clients/calendar/tasks/projects/time/invoices stack di mobile, title `text-xl→2xl`, label tombol pendek.
- Loading skeleton match breakpoint baru.

## v0.1.50 — 2026-07-18 — Portal task approve / revisi

- Client portal: task status `review` + client-visible → tombol **Setujui** / **Minta revisi** + note opsional.
- Approve → task `done`. Revisi → task `in_progress`, note append di description.
- Notif workspace + activity log (`client_approved_task` / `client_requested_task_revision`).
- Badge “Menunggu review kamu” sekarang punya aksi beneran.

## v0.1.49 — 2026-07-18 — Portal contact copy clean

- Hapus teks “Portal gak menerima komentar…”. Card “Hubungi Tim” cuma judul + tombol WA/Email.

## v0.1.48 — 2026-07-18 — Portal Recent Activity compact

- Default tampil **3** item, tombol “Lihat N lainnya” (max pool **5**).
- Group spam task: `Task added` sejenis se-project se-hari → `3 tasks added in …`.
- Time entry: **1** terbaru per project (bukan 5).
- Project created: cuma kalau ≤ 30 hari.

## v0.1.47 — 2026-07-18 — Portal: no comments, WA/email only

- Hapus form + thread komentar di client portal (project accordion + bottom “Message Your Team”).
- Ganti tombol **WhatsApp** + **Email** (`billingPhone`, `replyToEmail`/`billingEmail`).
- Hapus server action `createPortalComment` + komponen portal comment form.
- Comment internal app (team) tetap ada.

## v0.1.46 — 2026-07-18 — P3 polish

- **Stale Server Action**: `isStaleServerActionError` helper; auto-reload di client/project form + app `error.tsx` recovery UI.
- **Error shape**: `createClient` soft-fail `{ok:false, PLAN_LIMIT}` (sama pola project); toast limit plan.
- **Portal approval loop**: type `approval` → Approve / Request changes + note; admin lihat badge decision.
- **Questionnaire mobile**: card list di mobile, table desktop; i18n via `cubiqlo_lang`.
- **Dashboard money clarity**: label USD terpisah; note multi-currency tidak dijumlah.
- **Journal**: filter mood + tag/search tetap; export ikut filter.

## v0.1.45 — 2026-07-18 — P2 product polish

- **PROD-004 task vs time**: helper banner di Tasks + Time Tracking (tugas = checklist, timer = jam billable).
- **PROD-005 time tags**: tag opsional di timer + manual entry; chip preset; gak hardcode default "Research".
- **PROD-006 files daily driver**: filter All/Internal/Client/Deliverable; toggle visibility + tipe per file; deliverable auto client-visible.
- **PROD-007 team invite**: plan gate UX + link upgrade; email undangan via Resend; pending-signup path kalau user belum daftar.
- **PROD-008 portal activation**: checklist cara pakai; full shareable link + open; copy token sekali.
- **PROD-009 onboarding first-win**: step "Aktifkan portal klien" di dashboard checklist.

## v0.1.44 — 2026-07-18 — Logo invoice: upload file (bukan cuma URL)

- Settings → Branding: **Upload logo** (PNG/JPG/WebP/GIF/SVG, max 2MB) via same-origin `POST /api/workspace/logo` → R2.
- Serve public: `GET /api/public/workspace-logo/[workspaceId]` (PDF + preview klien + cache bust `?v=`).
- Hapus logo: `DELETE /api/workspace/logo`.
- URL manual tetap ada (toggle “Atau pakai URL”) buat CDN eksternal.

## v0.1.43 — 2026-07-18 — P1: client dialog, package currency, notes, invoice, branding

- **BUG-013/014 client edit**: `ClientEditDialog` controlled + `max-h-[90vh] overflow-y-auto` + close on success.
- **BUG-015 package currency**: form default dari workspace `defaultCurrency` (bukan hardcode IDR).
- **BUG-016 expense tabs**: `Link` tab pakai `scroll={false}` + prefetch (kurang jump).
- **BUG-017 notes collapse**: card default compact (body preview 160 chars); Expand buka edit/convert.
- **BUG-018 notes tab**: revalidatePath sudah cover personal; list reset expand saat tab/query ganti.
- **BUG-009/010 invoice**: loading skeleton `/invoices/new`; form create label “Membuat invoice…”; **Edit Invoice** card + tombol **Simpan invoice** (meta status/tax/notes/terms).
- **BUG-011/012 branding**: Settings → **Branding & Invoice** (logo URL + billing fields); public `/invoice/[token]` render logo; PDF sudah pakai `logoUrl`.
- **BUG-019 toast delete**: “Item dihapus” / “Generation dihapus” (bukan English generic).
- **BUG-020 sidebar PERSONAL**: label `Catatan`/`Jurnal` map i18n benar.
- **PROD-002 time→invoice rate**: fallback entry → project hours rate → workspace `defaultHourlyRate`.
- **PROD-001 reports**: sudah group per currency (no cross-currency sum) — keep as-is.

## v0.1.42 — 2026-07-18 — P0: plan limit, portal, timer, sheet, upload

- **BUG-001/003 plan limit UX**: banner + upgrade link di `/app/projects` (mirror clients); tombol Upgrade clients → `/app/billing`; `createProject` soft-return `{ok:false, error}` + toast (bukan throw → Next digest).
- **BUG-002 portal create**: form client punya checkbox **Aktifkan portal sekarang** (default ON create); insert set `portalEnabled` + generate token.
- **BUG-006 timer loncat jam**: manual entry set `startTime`+`endTime` (bukan end null); active-timer query exclude `manual_minutes`; legacy open manual rows closed in DB.
- **BUG-007 cascade time**: manual entry + timer widget filter client→project→task ketat (no fallback all).
- **BUG-008 sheet auto-close**: shared `portaled-popper-guard` dipakai Dialog + Sheet (task sidebar Select aman).
- **BUG-004/005 upload**: CSP `connect-src` allow `*.r2.cloudflarestorage.com`; same-origin proxy `/api/files/upload` + `/api/expenses/receipt` (hindari CORS/CSP block browser).

## v0.1.41 — 2026-07-18 — Fix: klik Currency trigger (bukan opsi) nutupin dialog

- Bug real: saat dropdown Currency **sudah terbuka**, klik lagi pada **SelectTrigger** (kotak IDR) → dialog New Package nutup + form hilang. Klik opsi list (IDR/USD/…) aman.
- Root cause: Select Content pakai `disableOutsidePointerEvents` → body `pointer-events:none`. Trigger kelihatan, hit-test jatuh ke **Dialog Overlay** → Dialog dismiss. Flag capture-phase v0.1.40 cuma nge-track klik di listbox/option, bukan klik overlay saat layer open.
- Fix `DialogContent`: selama portaled Select/Popover open, **semua** pointer event di-capture sebagai "nested interaction" (flag 200ms) + treat `role=combobox` sebagai select. Select tutup dulu; dialog tetap buka. Klik luar kedua kali baru tutup dialog.
- Select v2.3.0 **tidak** punya prop `modal` — jangan andalkan itu.

## v0.1.40 — 2026-07-18 — Dialog tetap buka saat reselect opsi Select sama

- Bug: di modal (contoh **New Package**), klik opsi Select yang sudah terpilih (IDR → IDR) menutup dialog + input hilang.
- Root cause: Radix Select unmount item sebelum deferred `pointerDownOutside`/`interactOutside` Dialog; `composedPath()` sering kosong → guard lama miss.
- Fix: `DialogContent` track interaksi portaled popper di capture phase (`pointerdown`/`click`) + guard `onFocusOutside`; selector cover Select/Dropdown/Popover/Combobox.
- Scope global: semua dialog yang pakai Select ikut aman (project, expense, package, availability, dll).
- Bonus: `/app/packages` crash `JSON.parse` features non-JSON (legacy plain text seed) → parse aman (JSON array ATAU multiline text).

## v0.1.39 — 2026-07-17 — Fix public proposal 500 (formatMoney Client Component)

- Root cause: server page pass function `formatMoney` ke client component `ProposalPublicView` → Next.js 500 (`Functions cannot be passed directly to Client Components`).
- Fix: import `formatMoney` dari `@/lib/utils` di dalam client component; hapus prop function dari public page.
- QA seed non-destructive: `scripts/seed-qa-manual.mjs` + docs `QA_TEST_READY.md` / `MANUAL_TEST_CHECKLIST.md`.

## v0.1.38 — 2026-07-15 — Sidebar: auto-open group aktif (Sales/Template)

- Group **Penjualan/Sales** auto expand saat route di dalamnya (`/app/templates`, proposal, kontrak, editor template).
- Accordion tetap: buka section aktif, Kerja tetap terbuka.
- Fix item active ke-hide karena default `Penjualan: false`.

## v0.1.37 — 2026-07-15 — Template Center: tab Proposal + tabs kiri

- **Tab Proposal**: table `proposal_templates` + actions CRUD/duplikat/set-default; dialog scope + currency + PPN + DP.
- **TabsList kiri**: `justify-start` + `w-auto` (bukan full-width center).
- URL: `?tab=proposal` sync; header quick-link **Buat proposal**.
- Migration: `drizzle/0027_proposal_templates.sql` (sudah push live).
- Verified: health 200 · healthy · bundle `0.1.37` (`listProposalTemplates` / `setDefaultProposalTemplate` di chunks).

## v0.1.36 — 2026-07-15 — Template Center UX: tab URL sync, duplikat, set default

- **Tab ↔ URL**: ganti tab update `?tab=invoice|contract|prompt` (`router.replace`, no scroll jump); Suspense boundary untuk `useSearchParams`.
- **Card actions**: Edit · Duplikat · Hapus; kontrak + **Penuh** (editor) + **Default** (set default 1-klik).
- **Actions**: `duplicateInvoiceTemplate`, `duplicateContractTemplate`, `setDefaultContractTemplate`.
- **Entry points**: Invoice list Template → `/app/templates?tab=invoice`; `/app/invoices/templates` redirect ke center.
- Verified live: health 200, container healthy, bundle `0.1.36` (Duplikat / setDefaultContractTemplate di chunks). Login QA browser skip (credential 401).

## v0.1.31 — 2026-07-15 — Jurnal polish: tabs arsip, edit, i18n mood

- **Tabs Aktif / Arsip** on `/app/journal` (status filter via `listPersonalNotes`).
- **Edit inline** entri (title/tags/mood/body) + **restore** dari arsip + **hapus permanen**.
- **i18n mood/placeholder**: label Suasana ID (Senang/Biasa/…), placeholder tag & isi bilingual.
- Empty state jelas per tab; export disabled saat kosong.
- Verified live: create “QA Journal Day” 🔥 + tags; arsip list 2 entri + Pulihkan; bundle `0.1.31` health 200.

Versi aplikasi mengikuti `package.json` (`version`) dan otomatis tampil di sidebar
lewat `NEXT_PUBLIC_APP_VERSION`. Naikkan versi di `package.json` setiap rilis,
lalu tambahkan entri di sini.

## v0.1.35 — 2026-07-15 — Hapus menu Template Kontrak (redundant)

- Sidebar: buang **Template Kontrak** (dobel dengan **Template**/Pusat Template).
- `/app/contract-templates` list → redirect ke `/app/templates?tab=contract`.
- Keep editor: `/app/contract-templates/new` + `/app/contract-templates/[id]`.
- Builder back/save/delete → Pusat Template tab kontrak.
- Verified live: redirect OK, sidebar cuma Template, health 200 bundle `0.1.35`.

## v0.1.34 — 2026-07-15 — Template Center + Template Kontrak polish

- **Pusat Template (`/app/templates`)**: title/tabs/actions ID; invoice form adds currency+PPN; contract form default body + correct `{{client.name}}` vars + default flag; links to invoice/contract tools.
- **Template Kontrak list**: full i18n (no "New template"/"contracts"), usage count query batched, link back to Template Center.
- **Builder**: ID labels, default body ID, variable helper ID, toast, delete confirm ID.
- **Actions**: auth list/create/update/delete; unique default template; workspace-scoped delete/update; revalidatePath.
- **`/app/invoice-templates`**: redirect to `/app/templates?tab=invoice`.
- Verified live: Pusat Template Invoice(1)/Kontrak(0); contract-templates empty state ID; health 200 bundle `0.1.34`.

## v0.1.33 — 2026-07-15 — Kontrak polish: status tabs, activity date fix, detail i18n

- **List**: status filter tabs + counts; activity follows real status (no false "Draf"); valid-until under title; resend for sent/viewed.
- **Detail**: full i18n (status badge, Back→Semua kontrak, Download PDF→Unduh PDF, Signed/Declined/body labels); meta Status/Valid/Created; send/resend+copy; revoke; delete guard (block signed).
- **Body**: normalize literal `\n`; create dialog default body ID + toast.
- **Actions**: revalidatePath create/update/send/revoke/delete; delete scoped to workspace.
- Verified live: tabs Semua 3 / Terkirim 1 / Ditandatangani 2; detail Mimi Amilia Terkirim + Kirim ulang/Cabut/Hapus; health 200 bundle `0.1.33`.

## v0.1.32 — 2026-07-15 — Proposal polish: status tabs, activity date fix, detail i18n

- **List**: status filter tabs + counts; activity label follows real status (no more "Draf" on sent/accepted seed data); valid-until under title; resend action for sent/viewed.
- **Detail**: full i18n (status badge, All proposals, Line items, Tax→Pajak, Scope→Cakupan); meta cards Total/DP/Valid until; send/resend + copy link; delete (blocked if accepted); scope `\n` normalize.
- **Actions**: `revalidatePath` on create/update/send/delete; delete guard for accepted proposals.
- New page: empty-client guard + back link.
- Verified live: list tabs 3 total; detail Mobile App Terkirim + DP 25% + Kirim ulang/Hapus; health 200 bundle `0.1.32`.

## v0.1.30 — 2026-07-15 — Catatan optional: priority convert, reverse link, infinite scroll

- **Priority picker** on convert note→task (low/medium/high/urgent).
- **Reverse link task↔note**: `tasks.source_note_id` + `personal_notes.converted_task_id`; note shows "Buka task terkait"; task list "Dari catatan" + sheet "Buka di Catatan"; `?focus=` opens task sheet.
- **Infinite scroll / load-more**: client list loads 25, IntersectionObserver + "Muat lebih banyak", `loadMorePersonalNotes` server action.
- Guard: note already converted cannot convert again.

## v0.1.29 — 2026-07-15 — Catatan: recurrence auto-roll, convert→task, pagination

- **Recurrence auto-roll**: mark done on recurring note advances due (daily/weekly/monthly/yearly) and stays open; cron `/api/cron/personal-note-reminders` rolls past-due open recurring notes first (`rolled` in response).
- **Convert note → task**: pick project → creates todo task (assignee=self, due from note) + archives note; redirects `/app/tasks?focus=`.
- **Pagination**: 25/page with prev/next + count ranges; status counts via SQL `GROUP BY`.
- Verified live: cron rolled weekly due past→future; browser convert “QA convert note” → task on project Test; health 200 bundle `0.1.29`.

## v0.1.28 — 2026-07-15 — Harden Catatan/Jurnal: status, reminder cron, tabs, hide system notes

- **P0 status normalize**: live `personal_notes.status='active'` (6 rows) → `open`. Schema + UI + cron + dashboard konsisten `open|done|archived`.
- **P0 reminder cron**: `/api/cron/personal-note-reminders` + columns `last_reminded_{7,3,1}d` (dedupe 20h). `scripts/cron-reminders.sh` load hanya `CRON_SECRET`/`CUBICLE_URL` (hindari parse `.env` rusak), hit generic reminders **dan** personal-note cron. Smoke: sent 1 then 0 (dedupe).
- **P0 label**: remind = **hari** (7d/3d/1d), bukan “jam”.
- **Catatan UI** (`/app/personal`): tabs Aktif/Selesai/Arsip/Semua, recurrence **select** (label-only, no fake free-text engine), overdue badge, restore arsip, confirm delete, i18n `t()`, hide system titles `[journal]`/`[site]`.
- **Jurnal**: filter non-archived, archive button + confirm, empty state jujur, i18n search/export.
- **Callers** personal-site/preview: `includeSystem: true` supaya `[site]` tetap kebaca.
- **Dashboard** upcoming reminders: status `open` + hide system titles.
- Verified live v0.1.28 healthy; browser Catatan tabs + Arsip restore; Journal 0/0 (archived Day 1 hidden).

## v0.1.27 — 2026-07-15 — Harden halaman Reports: multi-currency integrity, AR, cashflow

- **P0 multi-currency integrity** (`app/reports/page.tsx`): collection health / overdue / outstanding **tidak lagi sum lintas currency** (bug `Rp 3.886.200` = 3.885.000 IDR + 1.200 USD). Semua KPI money multi-line via shared `formatMoney` (`$` glyph, bukan `USD …`).
- **AR aging**: exclude `draft`/`paid`/`cancelled` — hanya `sent`/`viewed`/`overdue`. Remaining = total − partial payments. Draft Rp 24.420.000 tidak lagi inflate Current.
- **Project expenses**: group by project+currency; **tidak** hardcode IDR (fix Website Redesign `Rp 270.010` palsu → `Rp 270.000` + `$10.00`). Claim income palsu di description dihapus.
- **Label jujur**: KPI window = **6 bulan** (bukan YTD dusta). Top clients / top expenses tetap calendar YTD.
- **Cashflow**: bucket **Sudah terlambat** + 3 bulan ke depan; remaining partial-payment aware; hide empty month noise di P&L.
- **Top clients unpaid**: partial-payment aware (sum payments per invoice).
- **i18n**: string utama lewat `t()`; empty months disembunyikan.
- Verified live: `tsc --noEmit` 0, docker build + deploy healthy, health 200, browser `/app/reports` collection `45% IDR · 52% USD`, overdue `Rp 3.885.000 · $1,200`, project expenses multi-line. Commit `3580332`.

## v0.1.26 — 2026-07-15 — Overhaul halaman Expenses: multi-currency, edit, filter, kategori, rutin, struk, CSV

- **P0 multi-currency KPI** (`app/expenses/page.tsx`): income & net dihitung per currency (join `payments` × `invoices.currency`). Tidak ada lagi sum USD+IDR jadi satu angka IDR palsu. Spent/income/net tampil multi-line (`formatMoney` per currency). Breakdown kategori bar-scale pilih currency dominan (prefer IDR).
- **List ops**: month picker, search deskripsi/vendor, filter kategori, pagination 25/page, kolom klien, amount `whitespace-nowrap` via `formatMoney`.
- **Edit expense UI** (`edit-expense-button.tsx` + form mode edit) — pakai `updateExpense` yang sudah ada.
- **i18n penuh** form + delete dialog + semua string baru lewat `useT()` / `createT()`.
- **Quick-add compact**: amount + description + category default; advanced expand (vendor/project/client/currency/tax/receipt).
- **Category manager** tab: create/edit/delete kategori (warna preset).
- **Recurring manager** tab: CRUD rutin, pause/resume, generate-now (`createRecurring`/`updateRecurring`/`deleteRecurring`/`generateFromRecurring`).
- **Receipt upload** R2 presigned PUT (`getExpenseReceiptUploadUrl` / `getExpenseReceiptDownloadUrl`); tax optional di form.
- **Export CSV** (`exportExpensesCsv` + tombol client) filter-aware (month/category/q).
- Verified live: `tsc --noEmit` 0 error, docker build + deploy `cubicle-cubicle-1` healthy, health 200, browser test multi-currency KPI + tabs Rutin/Kategori. Commit `e84411a`.

## v0.1.25 — 2026-07-14 — Katalog paket workspace reusable + input waktu & PDF sadar billing-type

- **Katalog paket level workspace** (`app/packages/page.tsx` + `components/packages/package-catalog.tsx` baru): paket (mis. 40/60/100 jam) kini dibuat sekali sebagai template reusable, bukan diketik ulang per proyek. Skema `packages.projectId` diubah jadi nullable (migrasi `ALTER TABLE packages ALTER COLUMN project_id DROP NOT NULL`); `projectId = NULL` menandai paket katalog workspace. Action baru `getWorkspacePackages`, `createWorkspacePackage`, `assignPackageToProject` (assign paket ke proyek + set `billingType = "package"`). Menu "Paket" ditambah di grup Keuangan sidebar.
- **Field tarif kondisional di input waktu** (`components/time/timer-widget.tsx` + `manual-entry-form.tsx`): input "Tarif per jam" hanya muncul kalau proyek terpilih bertipe by-hours (`billingType === "hours"`). Untuk proyek flat-fee/package, tarif diwarisi otomatis dari proyek — field disembunyikan supaya tidak membingungkan. Query `time/page.tsx` kini ikut load `billingType` + `rate` per proyek. Manual-entry dapat hint "Kosongkan untuk pakai tarif proyek".
- **Fix perhitungan paket di ekspor PDF** (`/api/time/export/pdf/va-timesheet`): sebelumnya proyek tipe `package` salah dihitung `(menit/60) × rate` → hasil Rp 0 karena paket tidak punya hourly rate, dan harga paket tidak masuk total. Sekarang harga paket diperlakukan sebagai **fixed fee sekali per proyek** (seperti flat fee), konsisten di grand total, subtotal per-klien, sel per-entry (tag "paket"), dan amount level-proyek di dashboard report.
- Verified: `tsc --noEmit` 0 error, build + deploy container `cubicle-cubicle-1` healthy (BUILD_ID `INuR-rYiSxEtAx3iWHzcd`), create paket workspace terverifikasi live di browser (paket "Paket Hemat" tampil di katalog). Commit `b47ca84`.

## v0.1.24 — 2026-07-14 — Fix bug mata uang timesheet + lokalisasi penuh Waktu + polish list Proyek & badge portal Klien

- **Fix bug ikon mata uang ganda di timesheet** (`components/time/timesheet.tsx`): badge tarif dulu render `<DollarSign>` hardcode DI DEPAN hasil `formatRate` yang sudah punya simbol sendiri → USD tampil "$ $13.00", IDR tampil "$ Rp 25". Buang ikon hardcode; sekarang bersih "$13.00 / jam" & "Rp 25 / jam" sesuai currency proyek.
- **Lokalisasi penuh timesheet:** durasi `h/m` → `j/mnt` (ikut bahasa), tanggal entri pakai `locale` (DD/MM/YYYY untuk ID, sebelumnya `toLocaleDateString()` tanpa arg → MM/DD/YYYY). Card summary (Total Waktu/Bisa Ditagih/Entri), semua label & item filter (Klien/Proyek/Bisa Ditagih/Tag/Dari/Sampai), empty state, "Tanpa judul"/"Tidak diketahui" — semua lewat `t()`.
- **Polish visual list Proyek** (`app/projects/page.tsx`): badge status dulu polos abu-abu → tambah dot berwarna (`statusColors`: hijau=aktif, biru=selesai, dst) di badge desktop & mobile. Rebalance grid kolom (Jatuh Tempo 1→2, Aksi 2→1) supaya header "Jatuh Tempo" tidak pecah dua baris & alignment lurus.
- **Badge portal Klien** (`app/clients/page.tsx`): teks badge kolom Portal "Aktif" → "Nyala"/"On" supaya tidak dobel-baca dengan badge kolom Status "Aktif".
- Verified live di cubiqlo.com (tsc 0 error, container healthy v0.1.24, browser test: timesheet bersih tanpa dollar ganda + tanggal DD/MM + durasi j/mnt, list proyek badge berwarna + header satu baris). Commit `26b516d`.

## v0.1.23 — 2026-07-14 — Lokalisasi detail proyek + UX Tugas (auto-filter, board view, fix Kanban)

- **Lokalisasi penuh halaman detail proyek** (`app/projects/[projectId]/page.tsx`): header (Kembali ke Proyek, Klien, Ubah), badge status pakai `projectStatusVariant` (variant + label ID), semua tab (Tugas/Berkas/Waktu/Komentar/Linimasa), `actionLabels` timeline, empty state (Tanpa judul/Tidak diketahui/Sistem). Tanggal & waktu pakai `locale`.
- **Fix warna card Kanban bentrok** (`components/tasks/kanban-board.tsx`): buang `border-l-4` + `priorityColors` warna prioritas di kiri card yang tabrakan visual dengan dot status kolom. Card sekarang border netral (`border-border`), warna hanya di badge prioritas.
- **Filter Tugas auto-apply** (`components/tasks/task-filters.tsx` baru): konversi form filter ke client component; pilih dropdown langsung `router.push` (buang tombol Filter manual). Label dropdown ke-4 diperjelas jadi "Semua Petugas / Ditugaskan ke".
- **Toggle List/Board di halaman Tugas global** (`task-view-toggle.tsx` + `tasks-board-view.tsx` baru): mode Papan read-only grouped by status (4 kolom), card tampil judul/proyek/prioritas/assignee, klik buka detail sheet. State via `?view=board`.
- **Toggle Papan/Daftar di tab Tugas detail proyek** (`project-tasks-tab.tsx` baru): wrapper client dengan state lokal — Papan pakai `KanbanBoard` (drag-and-drop tetap fungsional), Daftar pakai tampilan tabel (Judul/Ditugaskan/Jatuh Tempo/Prioritas/Status) dengan detail sheet on click.
- **Progress bar proyek compact:** `p-4 h-3` → `p-3 h-2`, due date dipindah ke header inline (hemat ruang vertikal).
- Verified live di cubiqlo.com (tsc 0 error, container healthy, HTTP 200, browser test login test user: lokalisasi + Kanban + auto-filter + toggle board dua arah). Commit `66ccfc2` + `87fd7e5`.

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

