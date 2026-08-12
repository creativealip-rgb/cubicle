# Cubiqlo Authenticated App UI Improvement Plan

**Tanggal:** 12 Agustus 2026  
**Status:** Phase 0 passed with documented state-coverage constraints; Batch A global foundation ready after clean-worktree preflight  
**Phase 0 evidence:** `docs/operations/evidence/ui-phase0-2026-08-12/BASELINE.md` and `docs/operations/evidence/ui-phase0-2026-08-12/MANIFEST.md`  
**Integration update:** `dev/integration` synced with `main`; dev deploy remains blocked by GitHub network timeout before build.  
**Scope:** `dev.cubiqlo.com` authenticated app UI  
**Reference:** `cubiqlo.com` landing visual language  
**Owner:** Wowo / integration owner  
**Production:** Out of scope sampai approval release eksplisit

## 1. Goal

Bawa identitas visual Cubiqlo ke authenticated app tanpa mengubah alur bisnis, authorization, data model, financial semantics, atau public-client lifecycle.

App harus terasa satu produk dengan landing page, tetapi tetap task-first dan lebih tenang daripada marketing surface.

## 2. Non-goals

- Tidak membuat fitur backend baru dalam UI-polish batch.
- Tidak membuat migration DB.
- Tidak mengubah auth, role, permission, payment, invoice math, email, PDF, export, storage lifecycle, atau public token behavior.
- Tidak memasang dependency baru untuk card, shadow, tab, icon, calendar, atau chart jika CSS dan dependency existing cukup.
- Tidak mengganti tabel padat menjadi card hanya demi visual.
- Tidak deploy production dari plan ini.
- Tidak mengerjakan langsung di `dev/integration` kecuali fix integrasi kecil oleh integration owner.

Target yang ternyata membutuhkan query, persistence, permission, backend, migration, atau dependency baru wajib dipindah ke backlog produk terpisah.

## 3. Canonical Workflow and Safety

Ikuti:

- `docs/dev-production-workflow-plan.md`
- `docs/architecture-security-hardening-plan.md`
- `docs/migration-registry.md` jika scope tak sengaja menyentuh schema; default plan ini melarang migration.

Aturan kerja:

1. Feature work memakai `polish/app-ui-foundation-august` atau branch batch turunannya.
2. Shared dev hanya dideploy dari `dev/integration` oleh integration owner.
3. Deploy memakai `scripts/operations/deploy-dev-integration.sh` dan host lock yang tersedia.
4. Development memakai `cubicle_dev`, akun QA, data dummy, payment test/off, email QA-only, dan storage dev.
5. Production DB, image, container, dan data tidak disentuh.
6. Handoff mencatat branch, commit, gates, route terdampak, shared primitive terdampak, dan status deploy.
7. Satu batch harus bisa di-rollback sebagai satu unit Git/image tanpa rollback schema.

## 4. Product and Visual Thesis

**Brand:** precise, energetic, approachable; restrained inside app.  
**Visual world:** Cubiqlo purple + dark slate + orange urgency, applied as operational hierarchy rather than marketing decoration.  
**Signature move:** satu featured operational surface per page, bukan gradient/card pada semua bagian.

Guardrails:

- Marketing gradient hanya untuk hero/featured operational surface atau primary conversion CTA.
- Default data surfaces tetap tenang dan readable.
- Gunakan semantic tokens, bukan hardcoded page-by-page colors.
- Raised/featured surfaces hanya untuk hierarchy penting.
- Preserve existing font family dan app information density kecuali baseline membuktikan masalah.
- Preserve keyboard flow, semantic HTML, visible focus, touch targets, reduced motion, and WCAG AA contrast.
- Jangan menambah animation sebelum hierarchy, spacing, state, dan accessibility selesai.

## 5. Baseline Audit Summary

### Strengths

- Struktur navigasi luas dan usable.
- Hierarki dasar dashboard jelas.
- Banyak data state dan fitur utama sudah tersedia.
- Landing punya brand language kuat: purple, dark slate, orange accent, layered surfaces, strong CTA.

### Observed Global Problems — Must Re-prove in Phase 0

1. App terlalu flat dan memakai surface/card pattern berulang.
2. Visual language landing belum terbawa konsisten ke app.
3. Mixed locale terlihat pada beberapa route.
4. Sidebar bawah terlihat clipped pada beberapa viewport.
5. Parent dan child navigation dapat terlihat active bersamaan.
6. Button/tab styles tidak konsisten.
7. Helper text dan empty states terlalu pucat.
8. Nested borders berlebihan, terutama Settings dan Reports.
9. Empty pages kurang context dan next action.

Temuan di atas bukan acceptance proof. Phase 0 wajib merekam route, role, locale, viewport, state, revision, dan screenshot.

## 6. Route Scope

### 6.1 Redesign Routes

Route yang boleh mendapat page-specific redesign dalam plan ini:

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

Detail/new routes hanya masuk bila shared primitive berubah atau batch route tersebut secara eksplisit memasukkannya.

### 6.2 Mandatory Regression Routes

Shared shell/component changes wajib diuji minimal pada:

- `/app/clients`
- `/app/projects/[projectId]`
- `/app/invoices/new`
- `/app/invoices/[invoiceId]`
- `/app/expenses`
- `/app/proposals`
- `/app/contracts`
- `/app/questionnaires`
- `/app/billing`
- `/app/email`
- `/app/templates`
- `/app/search`
- `/app/support`

Phase 0 route inventory harus menambahkan route authenticated lain yang memakai shared primitives terdampak.

### 6.3 Critical Transaction Regression

Perubahan shared Button, Dialog, Tabs, Input, Select, Card, Table, sidebar, layout, atau locale wajib membuktikan flow berikut tetap bekerja:

- Login dan workspace selection.
- Create/edit invoice tanpa mengubah calculation.
- Create/edit project dan task.
- Settings form save.
- Filters, tabs, pagination, export yang tersentuh.
- Destructive action confirmation yang tersentuh.

### 6.4 Explicitly Out of Scope

- Public invoice, proposal, contract, questionnaire, intake, booking, site, dan client portal redesign.
- Login/signup/forgot/reset visual redesign.
- Landing-page redesign.
- Billing model migration aktif di branch lain.

Public/auth surfaces tetap mendapat smoke regression jika shared primitives yang dipakai ikut berubah.

## 7. Phase 0 — Baseline, Inventory, and Capability Gate

Phase 0 read-only. Jangan patch UI sebelum evidence lengkap.

### 7.1 Repository and Runtime Record

- [x] Catat branch, commit SHA, dirty worktree, deployed dev revision/image.
- [x] Konfirmasi tidak coding pada `dev/integration` untuk feature work.
- [x] Catat akun QA, role, workspace, selected locale, dan feature flags. (Secrets redacted.)
- [x] Konfirmasi `cubicle_dev` dan integration isolation aktif.
- [x] Catat existing lint/test/build baseline.
- [x] Catat branch lain yang menyentuh schema, navigation, shared components, atau routes plan ini.

**Current discovery:** repo `/root/projects/cubicle` berada di `main`; `plan-ui-improvement.md` untracked. ACTIVE_BOARD mencatat billing-aware schema work sedang aktif pada `feat/billing-aware-phase1`. Karena itu UI batch tidak boleh mengubah schema/domain semantics dan tidak boleh refactor route/sidebar besar sebelum integration handoff bersih.

### 7.2 Baseline Evidence Manifest

Buat manifest:

```md
| Route | Role | Locale | Viewport | State | Revision | Screenshot | Console | Issue |
|---|---|---|---|---|---|---|---|---|
```

Viewport minimum:

- Desktop: `1440×900`
- Narrow desktop/tablet: `1024×768`
- Mobile: `390×844`
- Short mobile/sidebar clipping probe: height `667px`

State minimum per applicable route:

- populated
- empty
- loading
- error
- permission/disabled
- long content

Tidak perlu memalsukan state. Jika tidak dapat dipicu aman, tandai `Not exercised` beserta alasan.

### 7.3 Route and Shared Primitive Inventory

Buat component impact matrix:

```md
| Primitive | Existing implementation | Current callers | Planned change | Regression routes |
|---|---|---|---|---|
| Button | | | | |
| Tabs | | | | |
| Card/surface | | | | |
| Sidebar item | | | | |
| Empty state | | | | |
| Form field | | | | |
| Table | | | | |
```

### 7.4 Capability and Data-source Gate

Sebelum menerima KPI, chart, preview, search, kanban, read-state, atau calendar behavior baru, isi:

```md
| UI target | Existing source/query | Existing capability | Backend/state needed | Decision |
|---|---|---|---|---|
```

Decision hanya:

- `RESTYLE_EXISTING`
- `RECOMPOSE_EXISTING_DATA`
- `DEFER_PRODUCT_WORK`

`RECOMPOSE_EXISTING_DATA` hanya boleh lanjut bila tidak mengubah semantics, permission, mutation, atau performance secara material.

### Phase 0 Gate

Phase 1 boleh mulai hanya bila:

- Evidence manifest lengkap untuk redesign routes.
- Route inventory dan component impact matrix lengkap.
- Capability/data-source matrix memutuskan semua target non-trivial.
- Konflik dengan billing-aware branch selesai atau file ownership dipisah jelas.
- Baseline revision dan rollback point tercatat.

**Completed evidence:** `docs/operations/evidence/ui-phase0-2026-08-12/BASELINE.md`, `MANIFEST.md`, `runtime.json`, dan 48 screenshot. Empty/loading/error/permission/long-content coverage yang tidak aman dipicu saat read-only baseline tercatat sebagai `Not exercised` dan menjadi acceptance obligation batch pemilik route/shared primitive.

**Clean-worktree preflight:** worktree audit utama dan `dev/integration` memiliki perubahan paralel setelah capture. Jangan membuat branch Batch A dari dirty worktree tersebut. Integration owner wajib lebih dulu mengidentifikasi/mengamankan perubahan aktif, refresh remote + overlap, lalu membuat worktree feature bersih dari revision integration terbaru.

## 8. Phase 1 — Semantic Visual System

Definisikan sistem sebelum mengubah shared primitives.

- [ ] Audit token landing dan app saat ini via source + computed styles.
- [ ] Tentukan semantic color tokens: primary, foreground, muted, border, ring, warning, danger, success.
- [ ] Tentukan surface levels: flat, raised, featured, warning.
- [ ] Tentukan shadow/radius/spacing levels yang existing stack dapat hasilkan.
- [ ] Tentukan typography hierarchy tanpa mengganti font secara spekulatif.
- [ ] Tentukan patterns: KPI, progress, status pill, empty state, tabs, toolbar.
- [ ] Verifikasi contrast pasangan warna dan focus states.
- [ ] Dokumentasikan mapping landing token ke app token.

**Acceptance:** token/pattern spec selesai; tidak ada dependency baru; warna tidak bergantung pada page-level ad-hoc classes; WCAG AA untuk body/helper text dan minimum 3:1 untuk UI components/focus indicators.

## 9. Phase 2 — Global Foundation Batch

Scope Batch A:

- [ ] Fix sidebar height/overflow memakai `100dvh` dan internal scroll hanya setelah ancestor overflow audit.
- [x] Fix active navigation: tepat satu leaf route active; parent hanya expanded.
- [ ] Standardize existing button variants: primary, secondary, ghost, destructive. (Partial: tidak semua route diaudit.)
- [x] Standardize tabs dan active indicators.
- [x] Apply semantic surface/card patterns.
- [x] Darken low-contrast helper/empty-state text.
- [x] Remove unnecessary nested borders.
- [ ] Audit locale strings dan formatters pada redesign routes. (Partial: Projects/changed routes only.)
- [ ] Preserve keyboard, focus, responsive, touch, and screen-reader behavior. (Partial: targeted proof only.)

### Mechanical Acceptance

- Tepat satu leaf navigation item memiliki `aria-current="page"` pada nested route.
- Parent navigation expanded tetapi tidak simultaneously styled as current page.
- Sidebar footer/control reachable pada viewport height `667px`.
- Tidak ada horizontal page overflow pada width `390px`.
- `document.documentElement.scrollWidth === document.documentElement.clientWidth` pada tested routes.
- Semua interactive controls keyboard reachable dan focus indicator terlihat.
- Button/tab states mencakup default, hover, focus, active/selected, disabled, loading where applicable.
- Helper text memenuhi WCAG AA.
- Locale ID dan EN tidak memiliki visible mixed-language copy pada tested surface, kecuali proper noun atau domain term yang tercatat.
- Date, number, money, duration, and percentage formatter mengikuti selected locale.
- Regression routes tidak mengalami layout/function break.

## 10. Phase 3 — High-value Page Batch

Kerjakan sebagai batch terpisah, bukan satu branch besar.

### Batch B1 — Dashboard and Reports

#### Dashboard

Existing findings to re-prove:

- Onboarding checklist datar.
- Reminder cards terlalu seragam.
- Tidak ada focal operational summary.

Allowed target:

- [x] Recompose existing workspace summary.
- [x] Existing-data KPI only.
- [ ] Onboarding progress pattern. (Existing checklist retained; no structural rewrite.)
- [x] Reminder command surface.

#### Reports

Existing findings to re-prove:

- KPI/chart hierarchy lemah.
- Tabs terlihat seperti generic buttons.
- Empty states pucat.
- Table alignment tidak konsisten.

Allowed target:

- [x] Recompose existing financial KPIs and charts.
- [x] Clear tabs and table grid.
- [x] Featured net-income surface hanya jika value/query sudah canonical.

**Gate:** KPI/chart dengan source tidak terbukti menjadi `DEFER_PRODUCT_WORK`.

### Batch B2 — Projects and Time

#### Projects

Allowed target:

- [x] Existing progress represented consistently.
- [x] Status pills and due-date urgency treatment.
- [x] Single active nav.
- [x] Locale/formatter consistency.

Tidak boleh mengubah project/billing semantics yang sedang dikerjakan branch billing-aware.

#### Time

Allowed target:

- [ ] Existing primary time action lebih jelas. (Not separately audited.)
- [x] Existing Daily/Weekly or canonical current tabs lebih jelas.
- [ ] Toolbar/date/export alignment. (Not separately audited.)
- [ ] Locale consistency. (Not separately audited.)

Tidak boleh menghidupkan kembali Activity/Package/Service pattern yang sudah superseded oleh billing-aware direction. Struktur Time final menunggu integration truth terbaru.

### Batch B3 — Invoices

Allowed target:

- [x] Existing status summary retained and surfaced.
- [x] Existing empty state + valid create CTA.
- [x] Existing invoice table/preview hierarchy.

Tidak boleh mengubah totals, currency conversion, payment status logic, PDF, public share, or mutation semantics.

### High-value Page Acceptance

- Satu primary action jelas per page; jika user tidak punya permission, disabled/hidden state benar.
- Populated, empty, loading, error, and long-content states tetap usable where applicable.
- Mobile primary action reachable tanpa menutup content/form.
- No clipping/overflow pada tiga viewport minimum.
- Existing data semantics dan actions tidak berubah.
- Screenshot before/after dan console evidence tersedia.

## 11. Phase 4 — Secondary Page Batches

Maksimum 2–3 route per batch.

### Calendar

- [x] Restyle existing calendar/booking/availability capability.
- Calendar grid atau availability panel hanya jika existing component/data ada.
- Tidak membuat scheduling engine baru.

### Files

- Existing storage usage visualization.
- Existing folder/file metadata hierarchy.
- File type/thumbnail treatment.
- Quick preview hanya jika existing preview capability sudah ada; selain itu defer.

### Tasks

- Existing list hierarchy, priority, overdue, quick actions, filters.
- Kanban toggle hanya jika existing functional kanban tersedia; selain itu defer.

### Settings

- Section-based layout.
- Reduce nested cards.
- Reasonable field width.
- Consistent save action and feedback.
- Preserve all validation and mutation behavior.

### Personal

- Compact existing editor/list flow.
- Existing metadata, pin, due, status treatment only.
- Remove/replace QA dummy copy lewat dev seed or QA data, bukan hardcoded production behavior.

### Documentation

- [x] Existing guides organized into clear knowledge-base hierarchy.
- Search/read state hanya jika existing capability persists; selain itu defer.

### What's New

- Existing updates given featured/timeline hierarchy.
- Accent by existing update type; no invented status semantics.

## 12. Locale Contract

- Source of truth tetap existing locale mechanism; jangan membuat parallel i18n layer.
- Test minimal Bahasa Indonesia dan English.
- Audit hardcoded user-facing strings pada changed files.
- Proper nouns, product names, file names, and accepted domain terms boleh tetap English bila tercatat.
- Fallback tidak boleh menampilkan raw translation key.
- Format tanggal, angka, uang, durasi, dan persentase harus mengikuti selected locale.
- Screenshots dan QA matrix harus mencatat locale aktif.

## 13. QA Matrix

### 13.1 Redesign Route Matrix

| Route | Desktop | 1024px | Mobile | Populated | Empty | Loading/Error | Active nav | Locale ID/EN | Console | Status |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---|
| `/app/dashboard` | [ ] | [ ] | [ ] | [ ] | [ ] | [ ] | [ ] | [ ] | [ ] | Pending |
| `/app/reports` | [ ] | [ ] | [ ] | [ ] | [ ] | [ ] | [ ] | [ ] | [ ] | Pending |
| `/app/projects` | [ ] | [ ] | [ ] | [ ] | [ ] | [ ] | [ ] | [ ] | [ ] | Pending |
| `/app/time` | [ ] | [ ] | [ ] | [ ] | [ ] | [ ] | [ ] | [ ] | [ ] | Pending |
| `/app/invoices` | [ ] | [ ] | [ ] | [ ] | [ ] | [ ] | [ ] | [ ] | [ ] | Pending |
| `/app/calendar` | [ ] | [ ] | [ ] | [ ] | [ ] | [ ] | [ ] | [ ] | [ ] | Pending |
| `/app/files` | [ ] | [ ] | [ ] | [ ] | [ ] | [ ] | [ ] | [ ] | [ ] | Pending |
| `/app/tasks` | [ ] | [ ] | [ ] | [ ] | [ ] | [ ] | [ ] | [ ] | [ ] | Pending |
| `/app/settings` | [ ] | [ ] | [ ] | [ ] | [ ] | [ ] | [ ] | [ ] | [ ] | Pending |
| `/app/personal` | [ ] | [ ] | [ ] | [ ] | [ ] | [ ] | [ ] | [ ] | [ ] | Pending |
| `/app/docs` | [ ] | [ ] | [ ] | [ ] | [ ] | [ ] | [ ] | [ ] | [ ] | Pending |
| `/app/whats-new` | [ ] | [ ] | [ ] | [ ] | [ ] | [ ] | [ ] | [ ] | [ ] | Pending |

### 13.2 Regression Matrix

```md
| Route/flow | Shared primitive touched | Desktop | Mobile | Keyboard | Mutation/read | Console | Result |
|---|---|---|---|---|---|---|---|
```

### 13.3 Runtime Probes

Minimum per batch:

- No page/console errors caused by batch.
- No failed network calls caused by changed UI.
- No horizontal overflow.
- Focus order and dialog focus trap work.
- Tabs expose selected state semantically.
- Forms preserve labels, errors, pending state, success feedback, and unsaved-data behavior.
- Primary CTA performs existing intended action.
- Feature-gated/permission-limited account does not show misleading action.

## 14. Quality Gates

Run from clean feature branch/worktree:

```bash
npm run lint
npx tsc --noEmit
npm test
npm run build
```

Tambahkan targeted tests untuk non-trivial shared logic, terutama active-navigation resolver atau locale mapping. Trivial class-only changes tidak perlu test baru, tetapi tetap perlu runtime visual proof.

Sebelum integration:

- [x] Changed-file review selesai.
- [ ] Route regression matrix selesai. (Partial: authenticated desktop/mobile capture; mutation/state matrix belum lengkap.)
- [x] Desktop/mobile screenshots tersedia.
- [ ] Console/network checks bersih. (Partial: health/login/runtime probes pass; per-route clean evidence belum lengkap.)
- [x] No migration/schema file.
- [x] No unapproved dependency.
- [x] Commit + push feature branch.
- [x] Handoff ke integration owner.

Integration owner:

- [x] Merge/cherry-pick ke `dev/integration`.
- [x] Run combined gates. (TSC/build pass; lint/test baseline failures recorded.)
- [x] Deploy via canonical script and lock.
- [x] Verify dev revision and health.
- [x] Repeat affected route/browser QA.
- [x] Record remaining issues and rollback artifact.

## 15. Release and Rollback

### Development

- Shared dev source hanya `dev/integration`.
- Record pre-deploy image/revision.
- Revert failed batch at Git/image unit.
- Jangan memakai schema rollback karena plan ini tidak mengizinkan migration.

### Production

Production release bukan bagian implementasi plan ini. Setelah semua approved batches lolos dev:

1. Bentuk satu approved production batch.
2. Run canonical immutable release gate.
3. Record commit/image ID and previous image.
4. Deploy hanya setelah approval eksplisit Alip.
5. Health, login, critical transaction smoke, dan rollback readiness wajib terbukti.

## 16. Deferred Product Backlog

Item berikut bukan otomatis bagian UI polish:

- New Calendar scheduling behavior/grid jika belum ada capability.
- Files quick preview jika belum ada preview pipeline.
- Tasks kanban jika belum ada persisted/list-compatible implementation.
- Documentation search/read state jika belum ada state/index.
- New Dashboard KPIs jika query canonical belum ada.
- New Reports charts jika data semantics/query belum ada.

Promotion trigger: source data, permission model, product behavior, performance expectation, tests, dan owner approval sudah jelas.

## 17. Definition of Done

Plan selesai hanya bila:

- Phase 0 evidence dan matrices lengkap.
- Global shell bugs fixed dan mechanically verified.
- Shared primitives memakai semantic system, bukan ad-hoc page styles.
- Landing dan app terasa satu brand tanpa membuat app menjadi marketing page.
- Tidak ada visible mixed locale pada tested ID/EN surfaces.
- Tidak ada sidebar clipping, ambiguous active nav, atau horizontal overflow pada tested viewports.
- Dashboard, Reports, Projects, Time, dan Invoices punya hierarchy dan primary action jelas berbasis existing capability.
- Populated/empty/loading/error/permission/long-content states diuji sesuai applicability.
- Mandatory regression routes dan critical flows lolos.
- Lint, typecheck, tests, build, authenticated dev smoke, console, and network checks lulus.
- Dev deployment berasal dari `dev/integration` dan revision tercatat.
- Production tetap tidak disentuh sampai approval eksplisit.

## 18. Next Smallest Step

Mulai Batch A global foundation:

1. Identifikasi dan amankan perubahan paralel pada worktree utama dan `dev/integration`; jangan stash/reset milik lane lain tanpa owner handoff.
2. Fetch/prune lalu refresh overlap schema, navigation, shared primitives, Reports, Time, Settings, dan Personal terhadap semua worktree/branch aktif.
3. Buat worktree bersih `polish/app-ui-foundation-august` dari revision `dev/integration` terbaru yang sudah disetujui integration owner.
4. Implement scope approved di `BASELINE.md` §Batch A Approved Scope; mulai dari sidebar semantics, short-height reachability, dan `/app/personal` tablet overflow.
5. Run targeted tests + lint + typecheck + test + build, lalu authenticated desktop/mobile regression dan state obligations yang applicable.
6. Commit/push feature branch dan handoff. Shared dev hanya dideploy integration owner lewat script canonical + host lock.

Jangan mulai Dashboard/Reports/page-specific redesign sebelum Batch A global foundation lolos combined gates dan runtime QA.

---

**Environment:** `dev.cubiqlo.com` first  
**Integration source:** `dev/integration` only  
**Production:** explicit approval only
