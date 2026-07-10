# Laporan Audit — Cubicle (cubiqlo.com)

**Repo:** `creativealip-rgb/cubicle`
**Stack:** Next.js 16.2.9 (App Router), React 19, TypeScript strict, Drizzle ORM + PostgreSQL 16, Better-Auth, Cloudflare R2, Resend, Pakasir (QRIS). Deploy via Docker + Dokploy + Traefik.
**Tanggal audit:** 9 Juli 2026

## Ringkasan

Ini projek SaaS "client operations hub" yang matang dan tergarap serius. Arsitekturnya bersih, otorisasi konsisten, dan hardening deployment-nya di atas rata-rata. TypeScript lolos tanpa error, semua test lolos, dan `npm audit` bersih. Isu utama ada di **lint yang gagal** dan beberapa **pola keamanan yang rapuh** (belum tentu bug sekarang, tapi berisiko ke depan).

Verifikasi yang dijalankan:

| Cek | Hasil |
|-----|-------|
| `tsc --noEmit` | ✅ lolos (0 error) |
| `vitest run` | ✅ lolos (17 test, 2 file) |
| `npm audit` | ✅ 0 kerentanan |
| `eslint` | ❌ gagal (14 error, 11 warning) |

## Yang sudah bagus

- **Otorisasi berlapis & konsisten.** `lib/access.ts` jadi satu chokepoint (`assertWorkspaceMember/Writable/Owner` + cek entity-in-workspace). Server action selalu validasi sesi lalu keanggotaan workspace sebelum query.
- **Multi-tenancy aman di AI tools.** Semua tool (`tools.ts`) memfilter query dengan `ws.id` dari sesi, bukan dari argumen model. Tidak ada kebocoran antar-workspace.
- **Akses publik berbasis token yang benar.** Portal/invoice/file pakai token 32-byte, disimpan sebagai **hash SHA-256**, dengan cek `revoked`/`expired`/`visibility`. Route download file memvalidasi keanggotaan sesi ATAU token portal dengan benar.
- **Webhook Pakasir tidak sekadar percaya payload** — ia re-fetch detail transaksi ke API Pakasir dan cek `status=completed`, plus idempoten (skip kalau sudah `completed`) dan cek kecocokan amount.
- **Header keamanan lengkap** di `next.config.ts` (HSTS, X-Frame DENY, nosniff, Referrer-Policy, Permissions-Policy, CSP).
- **Docker hardened**: user non-root, `no-new-privileges`, `cap_drop: ALL`, resource limit, healthcheck, log rotation, Postgres `scram-sha-256` dan tidak di-expose ke publik.
- **Tidak ada secret ter-commit** (`.env` di-gitignore, hanya `.env.example` berisi placeholder). Tidak ada `dangerouslySetInnerHTML` maupun `eval()`.

## Temuan & rekomendasi

### 🔴 Prioritas tinggi

1. **Lint gagal (14 error) — blokir CI.**
   - 3 error `react-hooks/purity` di `src/app/client-portal/[token]/page.tsx` (baris 639, 647, 690): memanggil `Date.now()` saat render. Ini bisa bikin output tidak stabil antar-render. Perbaiki dengan menghitung tanggal di luar render atau pakai fallback non-`Date.now()`.
   - 11 error sisanya adalah **unused imports** (auto-fixable): jalankan `npm run lint -- --fix`.
   - Rekomendasi: tambahkan `lint` + `tsc --noEmit` ke pipeline CI supaya tidak lolos ke main.

2. **`sql.raw()` dengan string interpolation di `lib/plan.ts` (`checkEntityLimit`).**
   ```
   `SELECT count(*)... WHERE workspace_id = '${workspaceId}'`
   ```
   Saat ini `tableName` hardcoded dan `workspaceId` datang dari `getWorkspaceForCurrentUser()` (UUID dari DB, bukan input user), jadi **belum bisa diinjeksi sekarang**. Tapi polanya rapuh — begitu ada pemanggil yang mengoper input user, ini jadi SQL injection. Ganti ke query terparameter: `sql\`SELECT count(*)::int as cnt FROM clients WHERE workspace_id = ${workspaceId}\`` dan pilih tabel lewat switch yang sudah ada, bukan interpolasi string.

### 🟡 Prioritas menengah

3. **Fallback secret auth.** Di `lib/auth.ts`, `secret` jatuh ke `"dev-build-placeholder-secret-change-me"` kalau `BETTER_AUTH_SECRET` kosong. Aman untuk build, tapi kalau container prod jalan tanpa env, sesi ditandatangani pakai secret publik. Sebaiknya throw/fail-fast saat `NODE_ENV=production` dan secret tidak ada.

4. **Webhook Pakasir tanpa verifikasi signature/HMAC.** Sudah dimitigasi dengan re-fetch status, tapi endpoint bisa dipanggil siapa saja. Kalau Pakasir menyediakan signature, verifikasi. Minimal, batasi rate dan pastikan re-fetch selalu jadi sumber kebenaran (sudah demikian).

5. **Rate limiter in-memory** (`lib/rate-limit.ts`). Pakai `Map` per-proses: reset saat restart dan tidak berbagi antar-instance/replica. Untuk skala >1 container, pindah ke Redis/Upstash. Ini juga sudah dicatat di komentar kode & README.

6. **Secret sebagai Docker build ARG.** `Dockerfile` menerima `BETTER_AUTH_SECRET`, kunci R2, `RESEND_API_KEY` sebagai `ARG`→`ENV` di stage builder — bisa tertinggal di layer/cache image. Runtime sudah benar (via `environment:` compose). Saran: jangan pass secret runtime sebagai build ARG kecuali benar-benar diperlukan saat build.

7. **Upload portal tanpa whitelist MIME** (`client-portal/requests/upload`). Ada batas 25MB dan nama file di-sanitasi, tapi tipe konten apa pun diterima. Pertimbangkan whitelist MIME/ekstensi untuk file yang diunggah klien.

### 🟢 Kecil / kebersihan

- **Lockfile ganda**: ada `package-lock.json` DAN `pnpm-lock.yaml`. README + Dockerfile pakai npm. Hapus salah satu (kemungkinan `pnpm-lock.yaml`) agar tidak drift.
- **Perbandingan token non-constant-time** pada cron (`authHeader !== \`Bearer ${secret}\``) — risiko timing kecil; pakai `crypto.timingSafeEqual` kalau mau rapi.
- **Dead code**: variabel `_workspaceIdCache` di `tools.ts` tidak terpakai.
- **CSP** mengizinkan `'unsafe-inline'` + `'unsafe-eval'` di `script-src`. Sering dibutuhkan Next.js, tapi melemahkan proteksi XSS; pertimbangkan nonce-based CSP kalau memungkinkan.

## Kesimpulan

Kualitas kode dan postur keamanannya solid untuk MVP yang mau dijual — otorisasi, token publik, dan hardening deployment sudah dipikirkan matang. Sebelum rilis produksi, disarankan tiga hal dulu:

1. Benerin lint + pasang CI gate
2. Parameterkan query di `plan.ts`
3. Fail-fast kalau `BETTER_AUTH_SECRET` kosong di prod

Sisanya peningkatan bertahap.

---

## Status Perbaikan (update 9 Jul 2026)

Verifikasi setelah perbaikan: `tsc --noEmit` ✅ · `vitest` 17/17 ✅ · `eslint` exit 0 (0 error, 8 warning non-blocking).

### ✅ Sudah diperbaiki

- [x] **Lint errors 14 → 0** — unused imports dibersihkan; 3 error `react-hooks/purity` di `client-portal/[token]/page.tsx` diganti ternary `new Date()`.
- [x] **SQL injection laten di `lib/plan.ts`** — `sql.raw()` + string interpolation diganti query builder Drizzle yang terparameter penuh.
- [x] **Fail-fast `BETTER_AUTH_SECRET`** — `resolveAuthSecret()` melempar error di produksi bila secret kosong (placeholder hanya untuk build/dev).
- [x] **Constant-time compare cron secret** — helper baru `src/lib/cron-auth.ts` (`verifyCronRequest` + `timingSafeEqual`); 4 route cron memakainya, menghapus duplikasi.
- [x] **Hapus dead code** `_workspaceIdCache` di `lib/ai/tools.ts`.
- [x] **Hapus lockfile ganda** `pnpm-lock.yaml`.
- [x] **MIME/extension whitelist** di upload portal (`client-portal/requests/upload`) — tolak executable/script.
- [x] **CI gate** — `.github/workflows/ci.yml` menjalankan lint + tsc + test di push/PR ke `main`.
- [x] **`.npmrc`** (`legacy-peer-deps=true`) — `npm ci` reproducible untuk CI.
- [x] **Bersihkan binding `user` tak terpakai** di `contract-templates`, `invoice-templates`, `support` — pemanggilan `requireUser()` tetap dipertahankan (efek samping auth).

### ⬜ Belum dikerjakan / butuh keputusan

- [ ] **Rate limiter → Redis/Upstash** — masih in-memory (tidak jalan lintas instance). Butuh infra.
- [ ] **Signature/HMAC webhook Pakasir** — perlu cek dukungan di dokumentasi Pakasir. (Sudah dimitigasi via re-fetch status transaksi.)
- [ ] **Secret Docker build ARG → BuildKit secret mount** — menyentuh pipeline Dokploy, perlu koordinasi. (Risiko rendah: image runtime final tidak memuat secret build stage.)
- [ ] **CSP nonce-based** — `script-src` masih izinkan `'unsafe-inline'`/`'unsafe-eval'`. Perlu pengujian karena bisa memutus inline script Next.
- [ ] **8 warning lint sisa** (`unused-vars`/`exhaustive-deps`) — menempel pada fitur WIP (mis. `unpaidAmount`, `hasUSD` di dashboard). Non-blocking; ditunda agar tidak membuang fungsionalitas yang disengaja.
