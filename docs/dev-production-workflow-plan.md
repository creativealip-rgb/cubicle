# Cubiqlo — Dev → Production Workflow Plan

**Tanggal:** 25 Juli 2026  
**Status:** Rencana implementasi  
**Tujuan:** Mempercepat proses polish tanpa rebuild production pada setiap perubahan kecil.

## 1. Keputusan Arsitektur

Cubiqlo memakai dua environment untuk sekarang:

1. **Development:** `https://dev.cubiqlo.com`
   - Tempat coding, polish UI, dan QA cepat.
   - Menjalankan `next dev` dengan HMR.
   - Perubahan terlihat beberapa detik setelah file disimpan.
   - Memakai database dan data dummy terpisah.

2. **Production:**
   - Landing: `https://cubiqlo.com`
   - Dashboard: `https://app.cubiqlo.com`
   - Menjalankan hasil `next build` dalam Docker.
   - Hanya diperbarui setelah satu batch perubahan selesai dan lolos pemeriksaan.

**Staging belum dibuat.** Tambahkan `staging.cubiqlo.com` nanti saat pengguna aktif meningkat, ada tester eksternal, atau release sering menyentuh auth, pembayaran, dan migration DB.

## 2. Flow Harian

```text
Buat branch kerja
    ↓
Edit + save
    ↓
dev.cubiqlo.com auto-refresh
    ↓
Cek desktop/mobile dan alur terkait
    ↓
Ulangi sampai satu batch polish selesai
    ↓
Lint/typecheck/test terarah
    ↓
Commit + push
    ↓
Build production satu kali
    ↓
Recreate container app
    ↓
Health check + smoke test app.cubiqlo.com
```

Aturan utama: **commit boleh sering; deploy production tidak harus mengikuti setiap commit.**

## 3. Isolasi Environment Development

Development tidak boleh menggunakan data dan integrasi production secara langsung.

### Database

Buat database terpisah:

```text
Production DB: cubicle
Development DB: cubicle_dev
```

Development DB berisi akun QA dan data dummy. Jangan menyalin data sensitif pengguna production tanpa sanitasi.

### Auth dan Cookie

Development memakai:

```env
BETTER_AUTH_URL=https://dev.cubiqlo.com
NEXT_PUBLIC_APP_URL=https://dev.cubiqlo.com
DATABASE_URL=postgresql://<user>:<password>@cubicle-pg:5432/cubicle_dev
```

Cookie harus host-only atau memakai nama berbeda. Jangan set cookie domain global `.cubiqlo.com`, karena sesi dev dapat bertabrakan dengan `app.cubiqlo.com`.

### Integrasi

- **Pakasir:** nonaktif atau mode test pada development.
- **Resend:** arahkan ke mailbox QA atau gunakan flag yang mencegah email pengguna asli.
- **R2:** gunakan prefix `dev/` atau bucket development terpisah.
- **AI:** boleh memakai provider sama dengan limit rendah dan akun QA.
- **Google Calendar:** gunakan redirect URI development terpisah jika diuji.

## 4. Implementasi `dev.cubiqlo.com`

### Komponen

- Process Next.js development pada port internal, contoh `3100`.
- Process manager: systemd atau Docker Compose service khusus development.
- Reverse proxy: Dokploy Traefik.
- DNS Cloudflare: record `dev` ke VPS.
- Proteksi akses: Cloudflare Access atau Basic Auth agar dev tidak publik.

### Perintah development

```bash
cd /root/projects/cubicle
npm run dev -- --hostname 0.0.0.0 --port 3100
```

Process wajib berjalan sebagai service, bukan terminal sementara. Service harus auto-restart jika crash, tetapi tidak boleh mengambil port 80/443.

### Routing

Traefik menerima:

```text
Host(`dev.cubiqlo.com`)
```

Lalu meneruskan ke service development pada port `3100` melalui network yang sesuai.

## 5. Branch dan Batch Kerja

Gunakan struktur sederhana:

```text
main                         production-ready
polish/<nama-batch>          pekerjaan aktif
fix/<nama-bug>               bug mendesak
```

Contoh batch:

```text
polish/mobile-invoice-july
polish/dashboard-spacing-july
fix/login-redirect-loop
```

Satu batch ideal berisi perubahan yang masih satu area. Jangan gabungkan migration DB besar dengan polish warna/copy.

## 6. Kapan Harus Deploy Production

### Tidak perlu langsung deploy

- Copy atau label.
- Warna, spacing, radius, icon.
- Susunan card.
- Responsive polish.
- Empty state.
- Perubahan UI kecil tanpa risiko data.

Kumpulkan menjadi satu batch.

### Deploy setelah batch selesai

- Beberapa polish yang sudah disetujui di dev.
- Fitur baru yang sudah dites.
- Perubahan server action/API.
- Perubahan email/PDF/export.

### Deploy segera

- Auth rusak.
- Security issue.
- Pembayaran salah.
- Perhitungan invoice/keuangan salah.
- Risiko data hilang atau bocor.
- Route utama 500/down.

## 7. Release Gate Production

Sebelum production deploy:

1. Pastikan scope batch jelas.
2. Pastikan working tree tidak membawa file asing.
3. Jalankan lint pada file yang berubah.
4. Jalankan TypeScript check.
5. Jalankan test terkait.
6. Jalankan full build.
7. Jika ada migration, backup DB sebelum apply.
8. Commit dan push.

Target command setelah quality scripts dirapikan:

```bash
npm run lint
npx tsc --noEmit
npm test
npm run build
```

Catatan saat ini: full lint Cubiqlo masih memiliki error lama. Error tersebut harus dibereskan agar lint bisa menjadi release gate yang tegas.

## 8. Production Deploy

Build dilakukan saat container lama tetap melayani pengguna:

```bash
cd /root/projects/cubicle
docker compose build cubicle
```

Setelah build berhasil, ganti app container:

```bash
ACT="up -d --no-deps --force-recreate" && docker compose $ACT cubicle
```

Jangan pakai `docker restart` setelah build; perintah itu tetap memakai image lama.

Verifikasi:

```bash
docker inspect cubicle-cubicle-1 --format '{{.Image}} {{.State.Health.Status}} {{.HostConfig.RestartPolicy.Name}}'
curl -fsS https://app.cubiqlo.com/api/health
curl -LsS -o /dev/null -w '%{http_code} %{url_effective}\n' https://app.cubiqlo.com/login
```

Lakukan smoke test pada area yang berubah. Contoh perubahan invoice harus mengecek list, detail, create/edit, PDF/public share bila tersentuh.

## 9. Rollback

Sebelum deploy, catat image ID aktif:

```bash
docker inspect cubicle-cubicle-1 --format '{{.Image}}'
```

Setiap release harus punya:

- commit Git,
- image tag atau image ID,
- migration yang diterapkan,
- hasil health/smoke test.

Jika health gagal:

1. Jangan hapus image lama.
2. Jalankan kembali image sebelumnya.
3. Jika ada migration, gunakan prosedur rollback yang sudah disiapkan; jangan rollback schema secara buta.
4. Verifikasi `/api/health`, login, dan fitur terdampak.

## 10. Optimasi Build Docker

Ubah dependency install menjadi cache-aware dan deterministik:

```dockerfile
RUN --mount=type=cache,target=/root/.npm \
    npm ci --legacy-peer-deps --ignore-scripts
```

Gunakan Next build cache:

```dockerfile
RUN --mount=type=cache,target=/app/.next/cache \
    npm run build
```

Tujuan:

- download package tidak diulang,
- cache compiler Next dapat digunakan lagi,
- build batch berikutnya lebih cepat.

Perubahan source tetap membutuhkan `next build`; optimasi hanya mengurangi waktunya.

## 11. Fase Implementasi

### Fase 1 — Dev lane aman

- Buat DB `cubicle_dev`.
- Siapkan env development tanpa secret production yang tidak diperlukan.
- Seed akun/data QA.
- Jalankan Next dev sebagai service pada port `3100`.
- Tambahkan DNS dan route `dev.cubiqlo.com`.
- Lindungi dev dengan access control.
- Verifikasi login, dashboard, HMR, DB isolation, dan tidak ada cookie collision.

**Acceptance:** perubahan UI tampil tanpa rebuild; data yang dibuat di dev tidak muncul di production.

### Fase 2 — Release discipline

- Terapkan branch/batch convention.
- Bersihkan lint baseline.
- Buat checklist release dan smoke test per modul.
- Atur production deploy maksimal satu kali per batch, kecuali hotfix.
- Perbaiki restart policy app menjadi `unless-stopped` pada Compose dan runtime.

**Acceptance:** production hanya menerima batch yang sudah lolos check; app hidup kembali setelah host reboot.

### Fase 3 — Build acceleration

- Tambahkan npm cache mount.
- Tambahkan `.next/cache` mount pada Docker build.
- Ukur build cold vs warm.
- Simpan hasil waktu build agar manfaat terukur.

**Acceptance:** warm build lebih cepat daripada baseline tanpa mengubah output aplikasi.

### Fase 4 — CI image build, nanti

Jika workflow dua environment sudah stabil:

- GitHub Actions build image.
- Push image bertag commit SHA ke GHCR.
- VPS hanya pull image dan recreate container.
- Tambahkan health-gated deploy dan rollback image.

**Acceptance:** build gagal tidak menyentuh production; production switch memakai image yang sudah lulus CI.

### Fase 5 — Staging, saat dibutuhkan

Trigger membuat staging:

- pengguna aktif bertambah,
- ada tester eksternal,
- release rutin menyentuh auth/payment/migration,
- tim pengembang bertambah,
- butuh persetujuan sebelum production.

`staging.cubiqlo.com` menjalankan build production dengan DB test terpisah. Image yang lolos staging harus menjadi image yang sama saat dipromosikan ke production.

## 12. Target Hasil

- Feedback UI development: beberapa detik melalui HMR.
- Production deploy: satu kali per batch, bukan setiap edit.
- Risiko pengguna terkena perubahan setengah jadi turun.
- Build production tetap reproducible.
- Jalur menuju CI/CD dan staging tersedia tanpa menambah kompleksitas sekarang.

## 13. Urutan Eksekusi yang Direkomendasikan

1. Perbaiki restart policy production.
2. Buat DB development dan env terpisah.
3. Jalankan service dev pada port `3100`.
4. Tambahkan DNS/Traefik/proteksi `dev.cubiqlo.com`.
5. Verifikasi isolasi DB, auth, cookie, email, payment, dan storage.
6. Mulai workflow polish batch.
7. Bersihkan lint baseline.
8. Tambahkan Docker build cache.
9. Evaluasi CI/GHCR setelah workflow dipakai beberapa release.

---

**Keputusan sekarang:** implementasikan `dev.cubiqlo.com + app.cubiqlo.com`. Tunda staging sampai ada trigger operasional yang jelas.
