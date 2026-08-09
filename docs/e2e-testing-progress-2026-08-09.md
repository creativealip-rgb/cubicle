# Cubiqlo Production E2E Testing Progress

Tanggal: 2026-08-09  
Target: `https://app.cubiqlo.com`  
QA account: `qa.coder.20260809134943@cubiqlo.test`  
Plan QA: Solo  
Browser: Playwright + system Chromium `/usr/local/bin/chromium`  
Workers: `1`  

## Aturan eksekusi

Setiap mutation utama diuji lewat browser:

1. Create lewat UI.
2. Pastikan muncul di UI.
3. Reload.
4. Edit lewat UI.
5. Reload.
6. Delete/archive lewat UI jika diizinkan aturan status.
7. Cek DB/log untuk uang, auth, tenant, storage, cascade, dan quota.
8. Hapus fixture QA lewat UI.

## Status ringkas

| Area | Status | Catatan |
|---|---|---|
| Auth production | PASS | Signup/login QA berhasil; email verification QA diaktifkan terbatas lewat DB karena email production tidak terkirim. |
| Production smoke | PASS | Health, public routes, protected redirects, guarded env/cron. |
| Client CRUD | PASS | Create, reload, edit, reload, archive/delete, DB cleanup. |
| Project Hourly | PASS | Create, rate `180000`, persistence, cleanup. |
| Project Fixed Price | PASS | Create, budget `2500000`, persistence, cleanup. |
| Project Retainer | PASS | Fee, included minutes, reset day, overage policy/rate, persistence, cleanup. |
| Workflow Task CRUD | PASS | Create, reload, edit, reload, permanent delete. |
| Reusable Task CRUD | PASS | Create, reload, edit, archive, permanent delete. |
| Manual Time create | PASS | Project/task selection, 60 menit, billable, description, reload. |
| Manual Time edit | PASS | Existing entry edit persisted after reload after production fix. |
| Timer start/pause/resume/stop | PASS | Timer entry tercatat; short run menghasilkan 0 menit karena durasi < 1 menit. |
| Weekly time page | PASS | `/app/time?view=weekly` render. |
| Hourly invoice | PASS | Invoice create/detail/reload UI pass; billing source flow verified. |
| Fixed-price invoice | PASS | Dedicated E2E DP `400000` lalu pelunasan sisa `600000`; fixture cleanup lewat UI. |
| Retainer invoice | PASS | Dedicated E2E full invoice `1000000`; invoice kedua ditolak saat tidak ada sisa; fixture cleanup lewat UI. |
| Payments | PASS | Partial payment UI pass; paid/partial status and remaining balance verified. Full-payment flow verified separately; paid invoice retained/voided, not deleted. |
| Reports | PASS | Reports render and period filter UI pass. |
| Expense | NOT STARTED | Belum dites. |
| Client portal/files | NOT STARTED | Belum dites dalam pass ini. |
| Calendar/booking | NOT STARTED | Belum dites dalam pass ini. |
| Email | NOT STARTED | Belum dites dalam pass ini. |
| AI/plan quota | PARTIAL | Solo plan diaktifkan; full quota/concurrency belum dites. |
| Mobile 390px | NOT STARTED | Belum ada fresh production E2E pass. |
| Full route sweep | NOT STARTED | Belum ada fresh authenticated sweep. |

## Evidence test terbaru

### Production smoke

```bash
SMOKE_BASE_URL=https://app.cubiqlo.com npm run smoke
```

Hasil: PASS.

### Workflow Task

```bash
BASE_URL=https://app.cubiqlo.com \
PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/usr/local/bin/chromium \
E2E_EMAIL=qa.coder.20260809134943@cubiqlo.test \
E2E_PASSWORD='***' \
npx playwright test e2e/production-qa-task.spec.ts --project=chromium --workers=1 --retries=0
```

Hasil terakhir: `1 passed`.

Flow: create client/project/task, reload, edit task melalui Task Detail Sheet, reload, delete permanen.

### Reusable Task

File:

```text
e2e/production-qa-reusable-task.spec.ts
```

Hasil terakhir: `1 passed`.

Flow: create reusable task, reload, edit, archive, delete permanen.

### Manual Time

File:

```text
e2e/production-qa-time.spec.ts
```

Hasil terakhir sebelum source fix: create + reload pass.  
Hasil setelah source fix production: create + reload pass; existing manual entry edit diverifikasi terpisah lewat browser dan DB.

DB evidence existing edited entry:

```text
status: approved
billable: true
duration_minutes: 60
description: QA manual time edited
```

### Timer

Browser flow pass:

```text
Mulai Timer → Jeda → Lanjutkan → Hentikan
```

Weekly page pass:

```text
/app/time?view=weekly
```

## Source fix yang sudah dibuat dan dideploy

File:

```text
src/components/time/timesheet.tsx
```

Fix: edit time entry mempertahankan project/client dari entry history ketika parent tidak masuk list options utama. Ini mencegah form edit menampilkan:

```text
Klien atau proyek tidak ditemukan
```

Focused wiring tests:

```text
7 tests passed
```

Production image:

```text
cubicle-cubicle:invoice-void-slug-fix
```

Included production fixes:

- `src/app/(app)/app/time/page.tsx`: default date uses `Asia/Jakarta`, avoiding UTC/server date drift.
- `src/lib/actions/invoices.ts` + `void-invoice-button.tsx`: paid/partial invoice void flow with required reason, retained payments/items, and audit log.
- `src/lib/actions/clients.ts` + `src/components/forms/client-form.tsx` + `src/lib/portal-slug.ts`: unique portal slug generation and clear duplicate errors.

Post-deploy evidence:

```text
Health: {"status":"ok","db":"ok"}
Focused time E2E: 1 passed
PRE_DEPLOY_CHECK before/after: PASS
```

Container:

```text
cubiqlo-new-app-next-timesheet-fix
```

Health setelah deploy:

```json
{"status":"ok","db":"ok"}
```

Deploy guardrail: `dokploy-traefik` tetap satu-satunya owner public ports 80/443. Tidak ada project-level proxy yang bind 80/443.

## Fixture dan cleanup

Fixture workflow/reusable lama berhasil dibersihkan lewat UI dan diverifikasi DB.

Manual time punya beberapa historical QA entries karena status `approved`; delete control dapat disabled sesuai aturan billing/time. Jangan hapus approved money-related entries langsung dari DB tanpa aturan/approval.

State terakhir yang perlu dibereskan sebelum financial QA:

- Audit dan cleanup approved QA time entries sesuai aturan product.
- Pastikan tidak ada entry timer kosong `duration_minutes=0` yang tidak diinginkan.
- Verifikasi project/client parent QA yang masih dipakai oleh time entries.

## Blocker dan risiko

### 1. Disk VPS

Disk sempat 100% penuh dan menyebabkan PostgreSQL recovery panic:

```text
No space left on device
```

Build cache dibersihkan tanpa menyentuh volume database. PostgreSQL kembali healthy. State terakhir saat dokumen ini dibuat sekitar 86% used dan harus dimonitor sebelum full invoice QA.

### 2. Production auth rate limit

Login E2E berulang sempat menghasilkan:

```text
429 Too many requests
```

Gunakan satu persistent context, `workers=1`, dan hindari menjalankan suite login berulang rapat di production.

### 3. Existing generic E2E suite stale

`e2e/cubicle.spec.ts` masih hardcode akun lama:

```text
owner@cubicle.test / password123
```

Jangan gunakan suite itu sebagai production authenticated gate sebelum credential/fixture diperbarui. Public route dan smoke test tetap valid.

### 4. E2E spec files masih untracked

File QA baru belum di-commit:

```text
e2e/production-qa-client-project.spec.ts
e2e/production-qa-project-billing.spec.ts
e2e/production-qa-task.spec.ts
e2e/production-qa-reusable-task.spec.ts
e2e/production-qa-time.spec.ts
```

Review dan cleanup spec sebelum commit. Beberapa spec masih hanya smoke CRUD dan belum mencakup seluruh matrix.

## Urutan lanjutan

1. Stabilkan cleanup approved QA time entries.
2. Tambahkan timer DB assertions: one active timer, pause/resume, no duration jump.
3. Hourly invoice: eligibility, period, rate fallback, duplicate source, DB proof.
4. Fixed-price invoice: milestone, remaining budget, status lock.
5. Retainer invoice: quota/overage/period/double invoice.
6. Payments + reports + currency integrity.
7. Expense CRUD + receipt/R2.
8. Portal + files/R2 ownership.
9. Calendar/booking.
10. Email.
11. AI quota and plan concurrency.
12. Mobile 390px.
13. Authenticated route/console/network sweep.
14. Final fixture cleanup and release gate.

## Release decision sementara

```text
NOT READY FOR FULL RELEASE GATE
```

Alasan:

- Expense, portal, files, calendar, email, AI quota belum complete.
- Mobile and full route sweep belum complete.
- Approved QA time cleanup masih perlu keputusan product rule.
- Generic E2E suite masih memakai credential lama.

Yang sudah terbukti: core client/project/task/time flows, hourly/partial-payment/report invoice, Fixed Price DP/final, Retainer full/duplicate lock, source fix time edit, production health, dan cleanup fixture lewat UI.

## Working tree note

Dokumen ini merekam hasil E2E production sampai checkpoint sekarang. Source change `src/components/time/timesheet.tsx` dan spec E2E baru masih perlu review, `git diff --check`, dan keputusan commit sebelum dianggap final.
