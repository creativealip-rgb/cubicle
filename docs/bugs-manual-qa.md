# Cubiqlo — Bugs + Kekurangan (Manual QA Backlog)

Status: **P0–P3 mostly fixed; calendar/booking QA fixed through v0.1.115** (2026-07-24)
Live: Docker `cubicle-cubicle-1` healthy  
Sumber: manual QA Alip + Coder  
Workspace acuan: **Alip Testing** (`alipdevcom@gmail.com`)

---

## Open — hold fix

### CLIENT-001 — Hapus tab Catatan di detail client
**Prioritas:** P3
**Status:** fixed
Tab `Catatan` redundant karena catatan internal sudah tampil di ringkasan/detail utama client. Trigger dan content tab dihapus; catatan internal tetap tampil di ringkasan client.

### TASK-001 — Hapus banner “Tugas dan Timer terpisah”
**Prioritas:** P3
**Status:** fixed
Banner penjelasan `Tugas dan Timer terpisah` di halaman Tugas dihapus. Filter dan daftar tugas tetap.

---

## Progress snapshot (v0.1.41 → v0.1.50)

| Ver | Fokus |
|---|---|
| 0.1.42 | P0 critical (plan limit, portal enable, upload, timer, cascade, sheet Select) |
| 0.1.43 | P1 invoice/client/logo/notes/rate/reports |
| 0.1.45 | P2 task/time/files/team/portal activation/onboarding |
| 0.1.46 | P3 soft-fail, stale action, questionnaire mobile, money labels, journal mood, portal request approval |
| 0.1.47 | Portal: hapus comment → WA/Email contact only |
| 0.1.48 | Portal Recent Activity compact (3 default, group spam) |
| 0.1.49 | Portal contact copy clean (no “gak nerima komentar”) |
| 0.1.50 | Portal task approve / minta revisi on status `review` |

---

## P0 — critical / broken (FIXED)

### BUG-001 — Plan limit UX projects
**Status:** fixed  
Banner + upgrade → `/app/billing`; soft error toast on create.

### BUG-002 — Portal enable on client create
**Status:** fixed  
Checkbox default ON; insert sets `portalEnabled` + token.

### BUG-003 — Upgrade button clients
**Status:** fixed  
Link ke `/app/billing`.

### BUG-004 — File upload network fail
**Status:** fixed  
CSP allow R2 + same-origin proxy `POST /api/files/upload`.

### BUG-005 — Expense receipt upload fail
**Status:** fixed  
Same-origin proxy `POST /api/expenses/receipt`.

### BUG-006 — Timer loncat 8jam / 32jam
**Status:** fixed  
Manual entry set `endTime`; active timer query exclude `manual_minutes`; legacy rows closed.

### BUG-007 — Time filter client→project→task
**Status:** fixed  
Manual entry + timer widget cascade ketat, no fallback all.

### BUG-008 — Task sidebar Select auto-close sheet
**Status:** fixed  
Shared `portaled-popper-guard` on Dialog + Sheet.

---

## P1 — core flow jelek / setengah jadi (FIXED)

### BUG-009 — Invoice create loading lama
**Status:** fixed  
Skeleton `/app/invoices/new/loading.tsx` + button “Membuat invoice…”.

### BUG-010 — Invoice edit meta no save
**Status:** fixed  
`InvoiceMetaForm` save status/tax/notes/terms.

### BUG-011 — Logo branding URL only
**Status:** fixed  
Workspace branding form + `POST /api/workspace/logo` R2 upload.

### BUG-012 — Public invoice logo/contact mismatch
**Status:** fixed  
Public invoice uses workspace logo + billing contact.

### BUG-013 — Client edit dialog scroll/close
**Status:** fixed  
`ClientEditDialog` scroll + auto-close on save.

### BUG-014 — Package currency hardcode IDR
**Status:** fixed  
Default package currency = workspace currency.

### BUG-015 — Expense tabs jump
**Status:** fixed  
Lighter tab transition.

### BUG-016 — Notes list dense / expand broken
**Status:** fixed  
Compact list + expand + tab state.

### BUG-017 — Delete toast English generic
**Status:** fixed  
ID toast copy.

### BUG-018 — Sidebar PERSONAL i18n
**Status:** fixed  
`Catatan` / `Jurnal`.

### BUG-019 — Time → invoice rate 0
**Status:** fixed  
Rate fallback: entry → project hours rate → workspace `defaultHourlyRate`.

### BUG-020 — Reports multi-currency sum
**Status:** fixed  
No cross-currency sum; labels per currency.

---

## P2 — product depth (FIXED v0.1.45+)

### PROD-003 — Menu Penjualan terlalu luas → HOLD
### PROD-004 — Task vs time edukasi UI
**Status:** fixed (v0.1.45)  
Banner helper di Tasks + Time Tracking.
### PROD-005 — Time tags opsional
**Status:** fixed (v0.1.45)  
Tag opsional di timer + manual entry; chip preset; no default hardcode.
### PROD-006 — Files daily driver
**Status:** fixed (v0.1.45)  
Filter + toggle visibility/type; deliverable auto client-visible.
### PROD-007 — Team invite usable
**Status:** fixed (v0.1.45)  
Plan gate UX + email undangan Resend; pending-signup path.
### PROD-008 — Portal activation + file + approval loop
**Status:** fixed (v0.1.46 request approval; v0.1.50 task approve)  
Activation UX + full link. Portal request type `approval` + task `review` Setujui/Minta revisi.
### PROD-009 — Onboarding guided first-win
**Status:** fixed (v0.1.45)  
Step portal klien di dashboard checklist.

---

## P3 — nice / nanggung

- Journal first-class — **fixed** (v0.1.46 mood filter)
- Questionnaire polish — **fixed** (v0.1.46 mobile cards + i18n)
- Dashboard money clarity per currency — **fixed** (v0.1.46 labels)
- Mobile form density — **partial** (questionnaires cards; more screens later)
- Stale Server Action hard refresh — **fixed** (v0.1.46 helper + error boundary)
- Error handling campur throw vs `{ok:false}` — **partial** (clients + projects soft-fail)

### Portal UX follow-ups (done v0.1.47–0.1.50)
- Hapus comment client portal → WA/Email only (**v0.1.47**)
- Recent Activity compact 3/5 + group task spam (**v0.1.48**)
- Contact copy clean (**v0.1.49**)
- Task approve/revisi di portal (**v0.1.50**)

---

## Settings audit — 2026-07-25

Status: **fixed + deployed + live verified**.

- **SET-001 fixed:** upload raster divalidasi lewat MIME allowlist + magic bytes.
- **SET-002 fixed:** UI dan API sama-sama hanya menerima PNG/JPG/WebP/GIF.
- **SET-003 fixed:** password tidak lagi di-trim; whitespace dipertahankan.
- **SET-004 fixed:** ganti password me-revoke sesi perangkat lain.
- **SET-005 fixed:** branding, logo, booking, nama workspace, dan kurs owner-only di server + read-only UI.
- **SET-006 fixed:** konfirmasi disconnect Google, hapus logo/member; member target spesifik + tombol 44px + aria-label.
- **SET-007 fixed:** Account Settings ikut ID/EN.
- **SET-008 fixed:** password required, minLength, confirmation, dan invalid submit disabled.
- **SET-009 fixed:** regression test signature gambar + password policy/whitespace.
- **SET-010 fixed:** deployed; health + DB `ok`; desktop 1280px dan mobile 390×844 live verified tanpa document overflow.

Verifikasi: `101/101` tests pass, touched-file ESLint pass, TypeScript/build pass, live health pass. Full lint masih punya 13 error lama di luar Settings.

## Host routing — 2026-07-25

Status: **fixed + deployed + live verified**.

- Guest `cubiqlo.com/` tetap melihat landing page.
- User dengan session yang membuka `cubiqlo.com/` otomatis pindah ke `app.cubiqlo.com/app/dashboard`.
- Auth dan app routes di apex pindah ke `app.cubiqlo.com` dengan path/query tetap utuh.
- `www.cubiqlo.com/*` canonical ke `cubiqlo.com/*`.
- Regression test host routing: `7/7` pass; full suite `108/108` pass.
- **Redirect-loop regression fixed:** redirect tidak lagi mempercayai keberadaan cookie mentah. Landing memvalidasi sesi lewat Better Auth; stale/logout cookie tetap bisa membuka login dan landing tanpa `ERR_TOO_MANY_REDIRECTS`.
- Live E2E: stale cookie → login `200`, apex `200`; sesi valid → apex ke dashboard; sign-out API `200`, lalu login/apex tetap `200`.
- Logo Cubiqlo pada halaman `/login` dan `/signup` sekarang mengarah ke landing canonical `https://cubiqlo.com/`, berlaku desktop/mobile dan sudah diverifikasi lewat klik live.

## What’s New — 2026-07-25

Status: **implemented + deployed; authenticated visual automation pending valid test login**.

- Halaman `/app/whats-new` berisi timeline pembaruan dengan kategori New, Improvement, dan Fix serta CTA ke fitur terkait.
- Menu utility tersedia di footer sidebar dan dropdown akun/mobile.
- Badge New disimpan per-browser dan ditandai dibaca saat halaman dibuka; release ID baru memunculkan badge kembali.
- Regression data `3/3` pass; full suite `111/111` pass; touched lint, TypeScript, dan production build pass.
- Guest guard live benar: `/app/whats-new` menuju `/login?redirect=%2Fapp%2Fwhats-new`.
- Visual authenticated live belum diautomasi karena kredensial testing lama mengembalikan 401; akun tidak di-reset.

## Manual QA findings — 2026-08-09

Status: **open — hold fix**. Alip sedang testing manual. Jangan ubah code sebelum diminta.

### PROJECT-002 — Retainer fee dan included minutes kosong saat edit
**Prioritas:** P1
**Status:** open — hold fix

Saat project retainer diedit, user sudah memilih currency `SGD` dan mengisi `Biaya Retainer` serta `Menit termasuk`. Setelah klik `Simpan`, saat dialog edit dibuka kembali kedua field kembali kosong.

Actual:
- Currency dipilih `SGD`.
- Biaya retainer diisi.
- Menit termasuk diisi.
- Save berhasil/tidak memberi error jelas.
- Reopen edit menampilkan fee dan minutes kosong.

Expected:
- `retainerFee` dan `retainerIncludedMinutes` tersimpan ke DB.
- Reopen edit menampilkan nilai tersimpan.
- Reload halaman tetap menampilkan nilai sama.
- Currency `SGD` tetap konsisten.
- Field wajib tidak boleh silently clear.
- Jika save gagal, tampil error human dan dialog tidak menutup seolah sukses.

Evidence: screenshot manual QA dialog edit project retainer.

---

### PROJECT-001 — Project bisa dibuat dengan currency yang belum dikonfigurasi
**Prioritas:** P1
**Status:** open — hold fix

User bisa memilih currency yang belum dikonfigurasi di workspace lalu tetap membuat project.

Expected:
- Submit ditolak jika currency belum dikonfigurasi/diaktifkan di workspace; atau
- aplikasi menampilkan prompt jelas untuk mengatur currency tersebut terlebih dulu.
- Error harus human, bukan Server Components digest.
- Currency project tidak boleh tersimpan sebagai currency yang belum valid.
- Validasi berlaku di UI dan server action.
- Setelah currency dikonfigurasi, create project dengan currency tersebut berhasil.

Evidence: manual QA saat membuat project dengan currency yang belum diset.

---

### PROJECT-UX-001 — Create project tidak menampilkan loading state
**Prioritas:** P2
**Status:** open — hold fix

Setelah submit `Buat Project`, halaman/tab Projects terlihat kosong sebentar lalu project muncul tiba-tiba. Tidak ada indikator bahwa request sedang diproses.

Expected:
- Tombol submit berubah menjadi state loading, misalnya `Membuat project…`.
- Tombol submit disabled selama request berjalan.
- List menampilkan skeleton/optimistic pending state atau loading indicator yang jelas.
- Tidak ada duplicate submit saat user klik berulang.
- Setelah sukses, project muncul tanpa empty-state flash.
- Setelah gagal, error human tampil dan form tetap aman.

Evidence: manual QA setelah create project; tab Projects sempat kosong sebelum row muncul.

---

### CLIENT-002 — Duplicate portal slug menampilkan generic Server Components error
**Prioritas:** P1
**Status:** open — hold fix

Saat membuat client memakai slug portal yang sudah terdaftar, submit gagal dengan generic production error:

```text
An error occurred in the Server Components render.
The specific message is omitted in production builds...
```

Expected:

```text
Slug portal sudah digunakan. Pilih slug lain.
```

Acceptance criteria:
- Server menangkap unique constraint duplicate slug.
- Action mengembalikan soft error terstruktur, bukan throw generic yang menjadi digest.
- Error tampil dekat field `Slug portal` atau sebagai toast yang jelas.
- Modal tetap terbuka dan seluruh input tetap tersimpan.
- Tidak membuat client setengah jadi.
- Retry dengan slug baru berhasil.
- Reload + DB membuktikan hanya satu slug yang tersimpan.

Evidence: screenshot manual QA saat create client dengan slug `universitas-amikom-purwokerto` yang sudah dipakai.

---

### UX-001 — Create workspace masih pakai browser `prompt()` default
**Prioritas:** P2
**Status:** open — hold fix

Saat membuat workspace baru, UI menampilkan native browser prompt:

```text
app.cubiqlo.com menyatakan
Nama workspace baru:
[ OK ] [ Batal ]
```

Risiko/cek lanjutan:
- UX terlihat mentah dan tidak konsisten dengan modal aplikasi.
- Input kosong perlu diuji.
- Cancel perlu diuji.
- Nama whitespace perlu diuji.
- Nama duplikat perlu diuji.
- Error server perlu tampil human.
- Setelah create, workspace baru harus menjadi workspace aktif.
- Reload harus mempertahankan workspace baru.
- DB harus menyimpan nama yang benar.

Evidence: screenshot manual QA, tab `B16-SOLO-1786278941974`.

### UX-002 — Workspace baru masih memakai/default menampilkan state plan Solo
**Prioritas:** P2
**Status:** open — hold fix

Setelah create workspace baru, tampilan masih menunjukkan kartu plan:

```text
Solo
Aktif
```

Perlu verifikasi apakah ini:
- expected inheritance dari plan account; atau
- bug karena workspace baru seharusnya Free/default plan.

Jangan simpulkan sebelum cek DB subscription/workspace dan aturan product.

Evidence: screenshot manual QA, kartu `Solo Aktif`.

## Belum dicek / hold

| Area | Risiko |
|---|---|
| Kalender | **checked/fixed v0.1.115** — confirmation guards, localized form, visible timezone, responsive booking UI, timezone-correct slots, valid ICS download |
| Brain | AI quality/cost unknown |
| Prompt | template/gen flow unknown |
| Menu Penjualan | HOLD (PROD-003) |
| Soft-fail pattern full app | partial (clients/projects only) |

---

## Pola bug berulang

| Pola | Status |
|---|---|
| Dialog/Sheet + portaled dropdown auto-close | **fixed** (shared guard) |
| Upload network fail | **fixed** (CSP + proxy) |
| Limit plan UX | **fixed** clients+projects |
| Filter parent→child | **fixed** time |
| Client dialog scroll/close | **fixed** |
| Invoice meta save + logo | **fixed** |
| Notes collapse | **fixed** |
| Portal badge review tanpa aksi | **fixed** (v0.1.50 task approve) |

---

## Manual QA quick (portal v0.1.50)

1. Hard refresh portal client
2. Project badge **Menunggu review kamu** → expand Tasks
3. Task status `review` → **Setujui** / **Minta revisi** + note
4. Hubungi Tim = tombol WA/Email saja (no comment copy)
5. Recent Activity max 3 + expand
6. Files: hanya visibility `client` di project accordion, download pakai token
