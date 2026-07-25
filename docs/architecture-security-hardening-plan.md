# Cubiqlo — Architecture, Security, Database & Operations Hardening Plan

**Tanggal:** 25 Juli 2026  
**Status:** In progress; Sprint 0, development lane, dan Phase 2 audit/clone proof selesai
**Canonical environment flow:** `docs/dev-production-workflow-plan.md`  
**Tujuan:** Membawa Cubiqlo dari operational MVP menjadi production-disciplined SaaS tanpa rewrite.

## 1. Baseline Audit

Hasil verifikasi langsung pada repo dan runtime production:

- App container healthy; `/api/health` mengembalikan app + DB `ok`.
- PostgreSQL container healthy dan port `5432` tidak dipublish ke host.
- App dan PostgreSQL restart policy `unless-stopped`.
- Live DB: 51 tabel, sekitar 15 MB.
- Repo: 41 migration SQL termasuk cleanup candidate `0040`; Drizzle journal hanya 5 entry.
- Live DB tidak punya authoritative `drizzle.__drizzle_migrations` ledger.
- Live DB memiliki 35 relasi foreign key identik yang terpasang ganda.
- PostgreSQL RLS aktif pada 0 tabel.
- Runtime DB memakai role login `postgres` superuser.
- Full lint bersih; TypeScript, production build, dan 119 tests lulus pada gate terakhir.
- Backup harian dan weekly restore test terjadwal; backup masih satu host dengan production.
- Header keamanan, hashed public tokens, workspace access helpers, Docker hardening dasar, health check, resource limits, dan backup checksum sudah tersedia.

## 2. Target Akhir

Cubiqlo dianggap matang untuk paid launch setelah:

1. Quality gate hijau dan otomatis.
2. App pulih otomatis setelah crash/reboot.
3. Dev dan production benar-benar terisolasi.
4. Migration production deterministik, terlacak, dan fail-fast.
5. Runtime aplikasi tidak memakai DB superuser.
6. FK duplicate bersih dan FK penting terindeks.
7. Workflow finansial multi-write atomik dan idempotent.
8. Public mutation/upload memiliki rate limit dan kuota.
9. Secret production fail-fast dan tidak masuk Docker build args.
10. Backup tersedia off-host dan restore procedure teruji.
11. Release memakai image immutable, health gate, dan rollback teruji.
12. Error/uptime/backup failure menghasilkan alert eksternal.

## 3. Guardrails

1. Jangan rewrite aplikasi.
2. Jangan memakai production sebagai preview.
3. Backup dan schema snapshot sebelum perubahan DB.
4. Perubahan DB selalu melalui migration baru; jangan edit migration yang pernah dipakai.
5. Jangan menghapus FK duplicate sebelum memetakan nama constraint, delete action, dan dependent indexes.
6. Jangan mengaktifkan RLS sekaligus pada seluruh schema. Pilot pada tabel sensitif setelah runtime role terpisah.
7. Jangan mencampur schema hardening dengan UI polish dalam satu release.
8. Satu phase harus lolos acceptance criteria sebelum phase berikutnya.
9. Production deploy mengikuti `docs/dev-production-workflow-plan.md`.
10. Staging tidak diaktifkan tanpa approval Alip; desainnya tetap disiapkan.

---

# PHASE 0 — Stabilize Baseline

**Prioritas:** P0  
**Estimasi:** 0,5–1 hari  
**Tujuan:** Hilangkan blocker release paling dasar sebelum menyentuh schema besar.

## 0.1 App restart policy

**Masalah:** App runtime memakai `restart=no`; DB memakai `unless-stopped`.

**File:**
- `docker-compose.yml`

**Aksi:**
1. Tambahkan `restart: unless-stopped` pada service `cubicle`.
2. Terapkan pada runtime aktif.
3. Verifikasi policy setelah recreate.
4. Lakukan controlled restart test; jangan reboot VPS sebelum service-level test lolos.

**Acceptance:**
- App dan DB sama-sama `unless-stopped`.
- App kembali healthy setelah controlled stop/start daemon/container test.

## 0.2 Quality gate hijau

**Masalah:** Full lint gagal 13 error + 3 warning.

**Area awal:**
- `src/app/(app)/app/contracts/page.tsx`
- `src/app/(app)/app/tasks/page.tsx`
- `src/components/app-sidebar.tsx`
- `src/components/portal/portal-language-switch.tsx`
- `src/components/portal/project-accordion.tsx`
- `src/lib/actions/expenses.ts`
- `src/lib/actions/time.ts`

**Aksi:**
1. Hapus unused imports/variables.
2. Perbaiki language cookie mutation dengan pola yang lolos React lint tanpa mengubah behavior.
3. Jalankan `npm run lint`.
4. Jalankan `npx tsc --noEmit`.
5. Jalankan `npm test`.
6. Jalankan `npm run build`.

**Acceptance:** lint, TypeScript, test, dan build exit 0.

## 0.3 Release baseline record

**Aksi:**
1. Catat commit, image ID aktif, schema snapshot, backup checksum, dan health result.
2. Simpan release checklist reusable di `docs/operations/release-checklist.md`.

**Acceptance:** Satu baseline rollback point terdokumentasi dan bisa ditemukan agent lain.

---

# PHASE 1 — Environment & Secret Isolation

**Prioritas:** P0  
**Estimasi:** 1–2 hari  
**Dependency:** Phase 0

## 1.1 Production secret fail-fast

**Masalah:** Better Auth memiliki fallback development secret.

**File:**
- `src/lib/auth.ts`
- `src/lib/env-validation.ts`

**Aksi:**
1. Development boleh memakai explicit dev-only secret.
2. Production wajib gagal start bila `BETTER_AUTH_SECRET` kosong/lemah.
3. Tambahkan startup validation sebelum server menerima traffic.
4. Test production-mode missing secret harus gagal.

**Acceptance:** production tidak pernah berjalan dengan fallback secret publik.

## 1.2 Cookie isolation per environment

**Masalah:** Cookie `.cubiqlo.com` dapat bertabrakan dengan `dev.cubiqlo.com`.

**File:**
- `src/lib/auth.ts`
- env development/production

**Aksi:**
1. Production mempertahankan cross-subdomain cookie bila dibutuhkan untuk apex → app.
2. Development memakai host-only cookie atau nama cookie berbeda.
3. Jangan set `.cubiqlo.com` pada dev.
4. Test login dev dan production pada browser/profile sama.

**Acceptance:** login/logout di dev tidak mengubah session production, dan sebaliknya.

## 1.3 Dev lane terisolasi

Ikuti `docs/dev-production-workflow-plan.md`:

- DB `cubicle_dev`.
- `dev.cubiqlo.com` + HMR.
- Payment nonaktif/test.
- Email QA-only.
- R2 bucket/prefix dev.
- AI limit rendah.
- Access control untuk dev.

**Acceptance:** data/integrasi dev tidak menyentuh production.

## 1.4 Hapus secret dari Docker build args

**Masalah:** Docker build menerima DB/auth/R2/AI/Resend secret sebagai ARG/ENV builder.

**File:**
- `Dockerfile`
- `docker-compose.yml`

**Aksi:**
1. Audit mana env benar-benar dibutuhkan saat `next build`.
2. Ubah constructor/config agar build tidak butuh secret runtime.
3. Inject secret hanya di runtime.
4. Jika satu build step benar-benar butuh secret, pakai BuildKit secret mount, bukan ARG.
5. Verifikasi image history dan runtime env keys tanpa mencetak value.

**Acceptance:** secret sensitif tidak hadir sebagai Docker build arg/layer metadata.

---

# PHASE 2 — Database Migration Governance

**Prioritas:** P0  
**Estimasi:** 2–4 hari  
**Dependency:** Phase 0; backup wajib

## 2.1 Freeze dan inventory schema

**Status:** Completed 25 Juli 2026. Evidence: `docs/database/schema-baseline-2026-07.md` dan `docs/operations/evidence/`.

**Aksi:**
1. Hentikan migration baru selama audit baseline.
2. Export schema-only dump live.
3. Inventaris semua 40 file SQL, journal tags, checksum, dan urutan dependency.
4. Identifikasi nomor duplicate/missing dan migration non-idempotent.
5. Bandingkan `src/db/schema.ts` dengan `information_schema` live.

**Output:**
- `docs/database/schema-baseline-2026-07.md`
- checksum migration manifest

**Acceptance:** live schema dan repo schema punya daftar drift eksplisit.

## 2.2 Authoritative migration ledger

**Status:** Completed 25 Juli 2026. Baseline ledger, checksum enforcement, advisory lock, transactional runner, no-op rerun, drift rejection, dan rollback proof terverifikasi.

**Aksi:**
1. Pilih satu mekanisme migration production.
2. Baseline live DB tanpa mengulang migration historis.
3. Buat ledger migration dengan checksum dan applied timestamp.
4. Production migration berjalan transaction + fail-fast.
5. Hapus penggunaan `drizzle-kit push` untuk production.
6. Hentikan script yang menganggap string `already exists` sebagai sukses umum.
7. Tambah CI check untuk migration number/tag/checksum unik.

**Acceptance:** command migration kedua kali menjadi no-op terkontrol; partial error menghasilkan non-zero dan transaction rollback.

## 2.3 Cleanup 35 FK duplicate

**Status:** Completed 25 Juli 2026. `0040` applied production; duplicate groups `35 → 0`, FK `161 → 126`, invalid FK `0`, app health tetap `ok`.

**Aksi:**
1. Generate daftar constraint duplicate lengkap.
2. Cocokkan `ON DELETE`, validation, dan index setiap pasangan.
3. Pilih constraint canonical.
4. Buat migration drop duplicate, bukan manual SQL tanpa file.
5. Apply ke clone/restore DB dulu.
6. Jalankan integrity query dan CRUD regression.
7. Apply production pada maintenance window kecil.

**Acceptance:** duplicate FK relation count 0; FK valid; CRUD utama tetap lolos.

## 2.4 FK index coverage

**Aksi:**
1. Review FK tanpa leading index.
2. Tambahkan index pada kolom yang dibutuhkan, terutama membership/user references.
3. Gunakan `CREATE INDEX CONCURRENTLY` bila ukuran tabel sudah besar; saat ini DB kecil, tetap dokumentasikan lock behavior.

**Acceptance:** seluruh FK penting punya index yang sesuai dan tidak ada invalid index.

---

# PHASE 3 — Least-Privilege Database & Tenant Defense

**Prioritas:** P0/P1  
**Estimasi:** 2–3 hari  
**Dependency:** Phase 2

## 3.1 Pisahkan DB roles

**Target roles:**

- `cubiqlo_owner`: pemilik schema, tidak dipakai app.
- `cubiqlo_migrator`: DDL/migration.
- `cubiqlo_app`: runtime DML minimum.
- `cubiqlo_backup`: read/backup sesuai kebutuhan.

**Aksi:**
1. Buat role dengan password kuat dari credential store.
2. Reassign ownership sesuai desain.
3. Grant hanya schema usage dan DML yang diperlukan ke runtime.
4. Cabut `CREATEDB`, `CREATEROLE`, superuser dari runtime.
5. Ubah runtime `DATABASE_URL` ke `cubiqlo_app`.
6. Test seluruh fitur penting.

**Acceptance:** koneksi app bukan superuser; app tidak dapat membuat role/database/drop schema; fungsi normal tetap bekerja.

## 3.2 Tenant isolation regression suite

**Aksi:**
1. Buat dua workspace + owner/member/viewer fixtures.
2. Test direct mutation lintas workspace untuk seluruh API/action utama.
3. Viewer mutation harus 403/blocked.
4. Token publik client A tidak boleh membaca resource client B.
5. Tambah test untuk file, invoice, project, task, proposal, contract, portal request, expense.

**Acceptance:** automated cross-tenant suite hijau.

## 3.3 RLS pilot

**Scope awal:** pilih 1–2 tabel sensitif, bukan seluruh schema sekaligus.

Kandidat:
- `files`
- `invoices`
- `clients`

**Aksi:**
1. Desain session context untuk workspace/user.
2. Terapkan pada clone/staging/test DB.
3. Ukur kompatibilitas Drizzle, server actions, background jobs, dan public token routes.
4. Lanjutkan hanya bila overhead dan kompleksitas masuk akal.

**Acceptance:** keputusan tertulis: expand, hold, atau reject dengan bukti. RLS bukan blocker launch bila application-level tests kuat dan runtime role least-privilege sudah aktif.

---

# PHASE 4 — Transaction & Financial Integrity

**Prioritas:** P0  
**Estimasi:** 2–4 hari  
**Dependency:** Phase 2–3

## 4.1 Proposal acceptance atomicity

**File utama:**
- `src/lib/actions/proposals.ts`

**Aksi:**
1. Bungkus proposal state transition, project creation, invoice creation, items, dan counter update dalam satu DB transaction.
2. Gunakan conditional update/lock agar hanya satu request dapat accept.
3. Tambah unique/idempotency key yang sesuai.
4. Simulasikan dua concurrent accept request.
5. Pastikan gagal di tengah tidak meninggalkan project/invoice parsial.

**Acceptance:** dua request paralel menghasilkan tepat satu acceptance/project/invoice.

## 4.2 Payment webhook atomicity

**File utama:**
- `src/app/api/webhooks/pakasir/route.ts`

**Aksi:**
1. Pertahankan provider re-verification.
2. Bungkus plan activation + payment completion dalam transaction.
3. Gunakan conditional transition dari pending → completed.
4. Simpan provider reference dan processed timestamp.
5. Tambah replay/concurrent webhook tests.
6. Pastikan amount/project/order mismatch tidak mengubah entitlement.

**Acceptance:** replay aman; concurrent webhook tidak menduplikasi side effect; partial state tidak mungkin.

## 4.3 Public token lifecycle consistency

**Area:** proposal, contract, portal, invoice, file download.

**Aksi:**
1. Buat resolver/policy bersama: enabled, hash/slug resolution, revoked, expiry, allowed status.
2. Apply konsisten ke accept/decline/sign/download/upload.
3. Test expired, revoked, disabled, already-processed, dan wrong-resource token.

**Acceptance:** semua public mutation memakai policy lifecycle sama.

---

# PHASE 5 — Public Surface Abuse Protection

**Prioritas:** P1  
**Estimasi:** 2–3 hari  
**Dependency:** Phase 1, 4

## 5.1 Distributed rate limiting

**Target:** Redis-backed atau persistent shared limiter.

**Coverage:**
- Auth
- Portal resolver
- Portal upload
- Proposal accept/decline
- Contract sign/decline
- Questionnaire submit
- Public PDF/download
- Payment webhook
- AI endpoints

**Aksi:**
1. Gunakan trusted proxy configuration untuk source IP.
2. Key rate berdasarkan route + IP + token/user/workspace sesuai konteks.
3. Tambah limit per plan untuk API/AI.
4. Return `429` + `Retry-After`.
5. Test restart dan multi-instance consistency.

**Acceptance:** counter tidak hilang saat app restart; abuse test rendah menghasilkan 429 tanpa mengganggu user normal.

## 5.2 Upload quotas dan safe storage lifecycle

**Aksi:**
1. Kuota bytes/file count per workspace/client.
2. Rate limit upload.
3. Hindari buffer seluruh file bila flow bisa streaming.
4. Jika object upload sukses tetapi DB insert gagal, hapus object atau masukkan cleanup queue.
5. Jangan kembalikan internal error mentah.
6. Validasi signature image format, decoded size, dan payload length.

**Acceptance:** request over-limit ditolak sebelum biaya storage; tidak ada orphan object pada simulated DB failure.

## 5.3 Friendly slug bukan secret utama

**Aksi:**
1. Pertahankan high-entropy secret/token sebagai authorization credential.
2. Friendly slug hanya identifier; kombinasikan dengan secret atau authenticated session.
3. Jika slug-only tetap dipakai, enforce entropy minimum, uniqueness, rate limit, dan rotation.
4. Hindari token permanen pada query string untuk download; pertimbangkan short-lived ticket.

**Acceptance:** enumeration slug tidak membuka portal/resource.

## 5.4 CSP hardening

**Aksi:**
1. Tambahkan `object-src 'none'`, `base-uri 'self'`, dan `form-action` sesuai kebutuhan.
2. Evaluasi hapus `'unsafe-eval'` production.
3. Rancang nonce untuk inline scripts bila feasible.
4. Test Radix/Next hydration, dialog, select, upload, dan analytics.

**Acceptance:** CSP lebih ketat tanpa merusak UI interaktif.

---

# PHASE 6 — Backup, Recovery & Database Observability

**Prioritas:** P1  
**Estimasi:** 1–3 hari  
**Dependency:** Phase 2

## 6.1 Off-host encrypted backup

**Aksi:**
1. Pertahankan backup lokal cepat.
2. Upload salinan terenkripsi ke R2/S3/object storage terpisah.
3. Retention: daily + weekly + monthly.
4. Verifikasi checksum setelah upload/download.
5. Alert jika backup stale, checksum gagal, upload gagal, atau restore test gagal.

**Acceptance:** kehilangan VPS tidak menghilangkan seluruh backup.

## 6.2 Recovery objectives

Tetapkan target awal:

- RPO: maksimal 24 jam sekarang; target 1–6 jam jika user/revenue naik.
- RTO: target awal 2 jam.

**Aksi:**
1. Jalankan full disaster restore ke environment terpisah.
2. Ukur waktu restore DB, app, env, domain, storage linkage.
3. Verifikasi login dan lima flow bisnis utama setelah restore.
4. Dokumentasikan runbook.

**Acceptance:** recovery drill selesai dalam target RTO dan menghasilkan bukti.

## 6.3 PostgreSQL observability dan tuning

**Aksi:**
1. Aktifkan `pg_stat_statements` setelah review.
2. Catat top slow/expensive queries.
3. Review index dari workload nyata, bukan asumsi.
4. Sesuaikan `effective_cache_size`, `max_connections`, dan memory dengan limit container 1 GB.
5. Evaluasi PgBouncer saat concurrency meningkat.
6. Monitor dead tuples, vacuum, DB size, connection count, lock wait.

**Acceptance:** dashboard/report bulanan untuk query dan capacity tersedia.

## 6.4 PITR trigger

WAL/PITR belum wajib untuk DB 15 MB dan user awal. Aktifkan saat salah satu trigger tercapai:

- transaksi/revenue penting,
- RPO 24 jam tidak diterima,
- data mutation per hari tinggi,
- user aktif tumbuh signifikan.

---

# PHASE 7 — Release Engineering & Observability

**Prioritas:** P1  
**Estimasi:** 2–4 hari  
**Dependency:** Phase 0–2

## 7.1 Deterministic Docker build

**File:**
- `Dockerfile`
- `docker-compose.yml`

**Aksi:**
1. Gunakan satu lockfile/package manager canonical.
2. Ganti `npm install` menjadi `npm ci`.
3. Tambahkan npm cache mount.
4. Tambahkan `.next/cache` BuildKit mount.
5. Pin base image lebih ketat; evaluasi digest.
6. Label image dengan Git SHA dan build timestamp.

**Acceptance:** dua build commit sama menghasilkan dependency graph sama; warm build lebih cepat.

## 7.2 CI artifact build

**Aksi:**
1. GitHub Actions menjalankan lint, typecheck, test, build, dependency/security scan.
2. Push image ke GHCR dengan tag Git SHA.
3. Jangan deploy `latest` tanpa SHA record.
4. Build failure tidak menyentuh production.

**Acceptance:** production menarik image yang sudah lulus CI.

## 7.3 Health-gated deployment dan rollback

**Aksi:**
1. Simpan current + previous image SHA.
2. Pull/start image baru.
3. Tunggu health + DB readiness.
4. Jalankan smoke test route kritis.
5. Jika gagal, otomatis/manual switch kembali ke previous SHA.
6. Jangan rollback schema secara buta; migration wajib backward-compatible untuk satu release window.

**Acceptance:** rollback drill berhasil dan terdokumentasi.

## 7.4 External monitoring

**Aksi:**
1. Uptime check eksternal untuk landing, login, health, dan satu synthetic auth flow.
2. Sentry/error tracking untuk server/client.
3. Telegram alert untuk outage, 5xx spike, backup stale/fail, disk, DB connection saturation.
4. Central log retention minimal sesuai kebutuhan investigasi.
5. Tetapkan SLO awal, misalnya 99,5% selama beta.

**Acceptance:** controlled failure menghasilkan alert ke channel yang benar.

---

# PHASE 8 — Staging & High Availability Triggers

**Prioritas:** P2  
**Estimasi:** 2–5 hari  
**Status:** desain siap, aktivasi perlu approval Alip

## 8.1 Staging

Aktifkan `staging.cubiqlo.com` bila:

- user aktif bertambah,
- ada tester eksternal,
- release rutin menyentuh auth/payment/migration,
- tim developer bertambah,
- butuh approval sebelum production.

Staging wajib:

- build production mode,
- DB terpisah,
- email/payment/storage sandbox,
- access control,
- image yang sama dipromosikan ke production, bukan rebuild ulang.

## 8.2 Blue-green/rolling deployment

Belum wajib untuk trafik kecil. Aktifkan bila downtime deploy tidak diterima atau SLA meningkat.

## 8.3 Database HA

Belum wajib untuk DB 15 MB. Trigger:

- paid customer/revenue kritis,
- single-host outage tidak dapat diterima,
- kebutuhan RTO rendah,
- concurrency dan data growth meningkat.

Pilihan: managed PostgreSQL dengan automated backup/PITR/failover atau replica terkelola.

---

# 4. Execution Order

## Sprint A — Paid-launch blockers

1. Phase 0: restart policy + quality gate.
2. Phase 1.1–1.2: secret fail-fast + cookie isolation.
3. Phase 2: migration baseline/ledger + FK cleanup.
4. Phase 3.1: least-privilege DB role.
5. Phase 4: transaction/payment integrity.
6. Phase 6.1: off-host backup.

**Outcome:** fondasi layak untuk paid soft launch.

## Sprint B — Public launch hardening

1. Phase 5: distributed rate limit, upload quota, token policy, CSP.
2. Phase 3.2: cross-tenant regression suite.
3. Phase 6.2–6.3: recovery drill + DB observability.
4. Phase 7.1–7.3: deterministic build, CI image, rollback.

**Outcome:** layak untuk public launch terkontrol.

## Sprint C — Growth readiness

1. Phase 7.4: monitoring/SLO.
2. Phase 8 staging ketika trigger tercapai.
3. RLS pilot/PITR/HA berdasarkan data dan risiko nyata.

**Outcome:** siap tumbuh tanpa premature complexity.

---

# 5. Release Gates per Phase

Setiap phase harus menjalankan sesuai scope:

```bash
npm run lint
npx tsc --noEmit
npm test
npm run build
```

Untuk perubahan DB:

1. Backup + checksum.
2. Restore clone.
3. Apply migration pada clone.
4. Integrity queries.
5. Targeted E2E.
6. Production migration.
7. Post-migration schema verification.
8. App deploy + health + smoke.

Untuk perubahan auth/security:

- Guest denied.
- Owner allowed.
- Member allowed sesuai role.
- Viewer mutation denied.
- Cross-workspace denied.
- Expired/revoked token denied.
- Normal user flow tetap bekerja.

---

# 6. Success Scorecard

Cubiqlo dapat dinilai matang bila:

- **Application architecture:** 8/10
- **Security:** ≥8/10
- **Database governance:** ≥8/10
- **Backup/recovery:** ≥8/10
- **Release engineering:** ≥8/10
- **Observability:** ≥7/10

Hard launch gate:

- P0 semua selesai.
- Tidak ada known critical/high security issue yang belum dimitigasi.
- Migration ledger sehat.
- Runtime DB non-superuser.
- Transaction integrity tests hijau.
- Off-host backup + restore drill hijau.
- CI artifact + rollback terbukti.

---

# 7. File Index

- Agent rules: `AGENTS.md`
- Environment/release workflow: `docs/dev-production-workflow-plan.md`
- Hardening plan ini: `docs/architecture-security-hardening-plan.md`
- Runtime: `Dockerfile`, `docker-compose.yml`
- Framework/security headers: `next.config.ts`
- Auth: `src/lib/auth.ts`, `src/lib/env-validation.ts`
- Access control: `src/lib/access.ts`, `src/lib/require-workspace-owner.ts`
- Rate limit: `src/lib/rate-limit.ts`, `src/proxy.ts`
- Database schema: `src/db/schema.ts`
- Migrations: `drizzle/*.sql`, `drizzle/meta/_journal.json`, `migrate.sh`
- Proposal transaction: `src/lib/actions/proposals.ts`
- Contract token flow: `src/lib/actions/contracts.ts`
- Portal access/upload: `src/lib/actions/portal.ts`, `src/app/api/client-portal/files/upload/route.ts`
- Payment webhook: `src/app/api/webhooks/pakasir/route.ts`
- Health: `src/app/api/health/route.ts`, `src/app/api/health/env/route.ts`
- Monitoring/backup: `scripts/monitor.sh`, `/root/scripts/cubicle_pg_backup.sh`, `/root/scripts/cubicle_pg_restore_test.sh`

---

**Keputusan:** Jangan tambah fitur besar sebelum Sprint A selesai. UI polish boleh berjalan di dev lane, tetapi schema/payment/auth/deploy production mengikuti plan ini secara phase-based.
