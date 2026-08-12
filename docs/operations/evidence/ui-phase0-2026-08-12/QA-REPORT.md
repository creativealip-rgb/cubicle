# Cubiqlo UI Phase 0 — QA Evidence Report

**Tanggal:** 12 Agustus 2026
**Lingkup:** Audit bukti QA Phase 0 (read-only) — route matrix, pass/blocker, state yang belum diuji.
**Tidak ada kode aplikasi yang diubah.** Laporan ini murni dokumentasi evidence.
**Akun QA:** dedikasi owner workspace; identifier di-redact; tidak ada credential/cookie/secret tersimpan di artifact.

## 1. Sumber Evidence

| Sumber | Lokasi | Keterangan |
|---|---|---|
| Canonical baseline | `docs/operations/evidence/ui-phase0-2026-08-12/BASELINE.md` | Verdict, token/contrast, capability gate, scope Batch A |
| Manifest | `docs/operations/evidence/ui-phase0-2026-08-12/MANIFEST.md` | Tabel 12 route × 4 viewport, state coverage |
| Runtime machine output | `docs/operations/evidence/ui-phase0-2026-08-12/runtime.json` | 48 capture: status, console, issue, revision, screenshot |
| Screenshot canonical | `docs/operations/evidence/ui-phase0-2026-08-12/*.png` | 48 PNG: desktop/tablet/mobile/short-mobile |
| Screenshot sekunder | `/tmp/cubiqlo-qa-20260812/*.png` | 24 PNG ad-hoc: desktop `1280×577` + mobile `390×844`, 12 route |
| Plan | `plan-ui-improvement.md` | Requirement Phase 0 §7, route scope §6 |

### Revisi terekam

- Source (main saat capture): `44a9c32ef58b03f8f83b4d32f63dbf1544b03b0d`
- Dev runtime saat capture: `b211a50b74ce08a077d8c9a7b37785cf09bc8813`
- Dev image: `sha256:dc1f4d82fcd046fbd77509553dbfdd98711917945ff7a647f750a07b38ebcde8`
- **Catatan audit (12/08 sore):** `origin/dev/integration` sudah maju melewati revisi capture (reflog: `b211a50` → `2a4bb38` → `191ab5a` merge batch polish UI → `73750ef`; HEAD remote saat laporan ditulis = `73750ef`). Evidence direkam sebelum batch polish ter-deploy; validasi lanjutan wajib re-capture pada revisi dev terbaru.

## 2. Route Matrix

Status HTTP per viewport; console error hanya muncul di `/app/projects` mobile (502).

| Route | Desktop 1440×900 | Tablet 1024×768 | Mobile 390×844 | Short-mobile 390×667 | Console err | H1 (desktop, ID) | Data state |
|---|---:|---:|---:|---:|---:|---|---|
| `/app/dashboard` | 200 | 200 | 200 | 200 | 0 | Selamat pagi, Alip | Populated |
| `/app/reports` | 200 | 200 | 200 | 200 | 0 | Laporan | Populated |
| `/app/projects` | 200 | 200 | **502*** | 200 | 1 | Proyek | Populated |
| `/app/time` | 200 | 200 | 200 | 200 | 0 | Time | Populated |
| `/app/invoices` | 200 | 200 | 200 | 200 | 0 | Invoice | Populated (empty list: 0 invoice) |
| `/app/calendar` | 200 | 200 | 200 | 200 | 0 | Kalender | Populated (empty rules/appointments) |
| `/app/files` | 200 | 200 | 200 | 200 | 0 | Berkas | Populated |
| `/app/tasks` | 200 | 200 | 200 | 200 | 0 | Tugas | Populated |
| `/app/settings` | 200 | 200 | 200 | 200 | 0 | — | Populated |
| `/app/personal` | 200 | 200 | 200 | 200 | 0 | — | Populated |
| `/app/docs` | 200 | 200 | 200 | 200 | 0 | — | Populated (static guide) |
| `/app/whats-new` | 200 | 200 | 200 | 200 | 0 | What's New di Cubiqlo | Populated |

\* `/app/projects` mobile: satu `502` transien saat capture; retry manual langsung `200`. Tidak ada restart container (restart count `0`). Klasifikasi: tekanan runtime dev sesaat, bukan bug page terkonfirmasi. Retry tidak tersimpan sebagai baris capture terpisah (lihat §5).

### Isu per route

| Route | Issue | Detail |
|---|---|---|
| Semua route (kecuali settings/docs/whats-new) | Duplicate current-nav entries di DOM | Leaf `aria-current="page"` + parent group `aria-current="true"`; copy desktop & mobile sidebar sama-sama di DOM |
| `/app/personal` | Horizontal overflow (tablet) | `document 1069px > viewport 1024px` — terkonfirmasi |
| `/app/projects` (mobile) | Transient HTTP 502 | Lihat catatan di atas |
| `/app/settings`, `/app/docs`, `/app/whats-new` | Tidak ada isu spesifik route | Duplicate current-nav global tetap berlaku |

## 3. Known Passes

- **48/48 capture berhasil**; 47/48 initial response `200`; 1 transient `502` + retry `200`.
- Semua 12 route render populated/account-visible pada keempat viewport; title/h1 konsisten (ID locale).
- Console error: hanya 1 event (502 `/app/projects` mobile); tidak ada error JS lain.
- Base token runtime cocok dengan `src/app/globals.css`; contrast pair terukur (detail di `BASELINE.md` §Base Color).
- Sidebar navigasi mobile reachable via hamburger; tidak ada overflow horizontal di `390px` pada capture mobile (terlihat di `/tmp` screenshot).
- Data yang terlihat konsisten antar capture: `/app/projects` 3 baris (Hourly Mimi Amilia, Creativealip Mimi Amilia, Whale Dive Centre) muncul di runtime.json dan screenshot sekunder `/tmp/cubiqlo-qa-20260812/projects*.png`.

## 4. Blockers / Temuan Terkonfirmasi

1. **Duplicate active-nav semantics (global).** `src/components/sidebar/sidebar-navigation.tsx`: leaf pakai `aria-current="page"`, parent group ikut `aria-current="true"` saat child aktif; copy desktop+mobile tetap di DOM → duplikat accessibility-current. Batch A wajib: hanya leaf yang `aria-current="page"`, parent hanya `aria-expanded`.
2. **Overflow horizontal `/app/personal` tablet** (`1069 > 1024`). Batch A scope item 3.
3. **Sidebar bottom clipping** (dari screenshot sekunder `/tmp` desktop `1280×577`): item bawah (Files/Personal/What's New) terpotong & scrollbar sidebar muncul. Sesuai temuan global plan §5.4 (sidebar bawah clipped) — perlu re-prove di revisi dev terbaru karena Batch A scope menyebut fix `100dvh` + internal scroll.
4. **Capability gate** (dari `BASELINE.md`): calendar scheduling grid, inline file preview, docs search, docs read-state, global board drag/drop → `DEFER_PRODUCT_WORK`, tidak boleh masuk batch polish.

## 5. State Coverage — Sisa yang Belum Diuji

| State | Status | Catatan / langkah proof berikutnya |
|---|---|---|
| Populated/current | ✅ Exercised | 12 route × 4 viewport |
| Empty | ⏳ Not exercised | Invoice & calendar kebetulan kosong di data saat ini (belum jadi proof). Gunakan fixture deterministik atau workspace kosong saat batch pemilik route |
| Loading | ⏳ Not exercised | Tidak ada interceptor/delay saat capture. Uji pada permukaan async yang berubah saat batch |
| Error | ⏳ Not exercised | Tidak ada fault injection aman saat read-only. Uji recoverable error untuk surface async berubah |
| Permission/disabled | ⏳ Not exercised | Hanya role owner terekam. Gunakan akun viewer/member QA bila penyajian permission berubah |
| Long content | 🟡 Partially | Tinggi konten aktual tercatat (dashboard 1180px, reports 1619px); belum ada fixture konten panjang sintetis |
| EN locale | ⏳ Not exercised | Capture hanya ID. Audit string/formatter EN wajib di Batch A (plan §9) |
| Role selain owner | ⏳ Not exercised | Lihat permission/disabled |

**Obligasi acceptance:** state `Not exercised` menjadi kewajiban batch pemilik route/shared primitive (plan §7.2), bukan dianggap lulus.

## 6. Catatan Audit Tambahan

- `/tmp/cubiqlo-qa-20260812` adalah 24 screenshot ad-hoc terpisah (12 route × desktop `1280×577` + mobile `390×844`), **bukan** 48 capture canonical (`1440×900` dst). Tidak ada runtime.json di /tmp; hanya dipakai sebagai konfirmasi visual sekunder. MD5 berbeda dari evidence dir (viewport berbeda) — bukan duplikat, jangan di-overwrite.
- `runtime.json` membawa per-capture: role, locale, state, revision, screenshot, console errors, geometry, issue classification.
- Browser session storage dihapus setelah capture; tidak ada secret/cookie yang disimpan.
- Screenshot canonical belum di-commit ke git (folder untracked di `main`). Laporan ini direncanakan ikut di-commit pada branch audit sendiri.
- Peringatan BASELINE §Post-capture: worktree `main` & `dev/integration` sempat punya perubahan paralel di luar scope Phase 0; jangan branch Batch A dari worktree kotor. Batch A hanya dari revisi integration bersih yang disetujui.
- Gate lint/test/build **tidak dijalankan** saat Phase 0 (sengaja read-only) — `Not run in Phase 0`, tidak diasumsikan pass. Batch A wajib menjalankan 4 gates dari worktree bersih.
