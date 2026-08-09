# Cubiqlo — Client Operations Hub

> **Status:** Production live · **URL:** https://app.cubiqlo.com
> **Stack:** Next.js 16 · React 19 · Drizzle ORM + PostgreSQL 16 · Better Auth v5 · Tailwind CSS v4 · shadcn/ui · Dokploy + Docker · Cloudflare R2 · Resend · Pakasir QRIS · **AI Assistant (9router + ag/gemini-3-flash)**

---

## 🧠 Overview

Cubiqlo (repo `cubicle`) adalah SaaS *Client Operations Hub* terpadu — satu workspace komprehensif untuk mengelola *Client, Project, Task, File, Time Tracking, Invoice, Booking, Client Portal, Proposal, Contract/E-sign, Personal Landing Builder, Personal Notes, Work Journal, AI Prompt Studio*, dan *AI Assistant*.

Target pengguna: freelancer, studio desain/software, agensi kecil, marketing team, dan konsultan independen yang membutuhkan operasional kerja rapi tanpa harus berganti-ganti aplikasi.

---

## 🔐 Authentication & Roles

Menggunakan **Better Auth v5** (email & password).

```
GET  /login
GET  /signup
GET  /forgot-password
GET  /reset-password
GET  /onboarding
POST /api/auth/[...all]
```

### Role & Permission Matrix

| Action / Modul | Owner | Member | Viewer |
|----------------|:-----:|:------:|:------:|
| Read All Data | ✅ | ✅ | ✅ |
| Create & Edit Client / Project / Task / File | ✅ | ✅ | ❌ |
| Create & Edit Invoice / Proposal / Contract | ✅ | ✅ | ❌ |
| Time Tracking (Start/Stop Timer, Add Log) | ✅ | ✅ | ❌ |
| Generate Share Link / Client Portal Token | ✅ | ✅ | ❌ |
| Record Payment / Mark Invoice Paid | ✅ | ✅ | ❌ |
| AI Prompt Studio & AI Assistant | ✅ | ✅ | ❌ |
| Personal Site Builder / Notes / Journal | ✅ | ✅ | ❌ |
| Manage Workspace Settings & Team (Add/Remove) | ✅ | ❌ | ❌ |
| Manage Billing & Upgrade Subscription (Pakasir QRIS) | ✅ | ❌ | ❌ |

---

## 🌐 Localization & Currency Rules

- **Indonesian (Internal `(app)/app/` routes)**: Seluruh modul internal operasional (Dashboard, Klien, Proyek, Task, Time, Invoice, Proposal, Kontrak, Settings, Billing).
- **English (Public & Client-Facing routes)**: Tampilan publik yang diakses klien internasional (Invoice Viewer, Client Portal, Proposal Viewer, Contract E-sign, Booking Page, Email Templates).
- **Format Mata Uang**: Mata uang non-IDR menggunakan ISO currency code prefix (contoh: `USD 1,000.00` tanpa simbol `$`), sedangkan Rupiah menggunakan `Rp`.

---

## 📊 Dashboard & Action Queue

```
GET /app/dashboard
```

- **Salam Dinamis & Bahasa**: Fitur pemilih bahasa `ID / EN` (disimpan di cookie `cubiqlo_lang`) dan salam dinamis sesuai waktu.
- **Quick Action Bar**: Tombol pintas cepat: *Task Baru*, *Invoice Baru*, *Mulai Timer*, *Tambah Klien*.
- **Perlu Ditangani (Action Queue)**: Pengelompokan tindakan mendesak (*Invoice Terlambat*, *Task Jatuh Tempo*, *Kontrak Menunggu Persetujuan*, *Notifikasi Belum Dibaca*).
- **KPI Metrics**: Total Klien Aktif, Proyek Berjalan, Task Jatuh Tempo, dan Total Outstanding Invoices.
- **Visual Arus Kas & Kesehatan**: Grafik tren pendapatan 14 hari terakhir, proyeksi kas 30/60/90 hari, serta status kesehatan klien (Sehat / Pasif / Berisiko).

---

## 🏢 Client Operations & Management

```
GET /app/clients
GET /app/clients/[clientId]
```

- **Profil Klien**: Pengelolaan informasi klien, nama perusahaan, email, nomor HP, alamat, dan catatan internal.
- **Client Portal Access Control**:
  - **Portal Token**: Token terenkripsi untuk akses portal via URL (`/client-portal/[token]`).
  - **Custom Short Slug**: Tautan pendek kustom (contoh: `/client-portal/alip-studio`).
  - **Manajemen Kata Sandi Portal**: Atur kata sandi portal, aktifkan, atau cabut akses kapan saja.
- **Document & Action Requests**: Pengiriman permintaan dokumen/pengingat ke dashboard portal klien (tab **Requests** portal).
- **Ekspor Data**: Fitur ekspor daftar klien & detail klien ke berkas Excel (`.xlsx`).
- **Hapus Klien Terproteksi**: Hapus klien permanen beserta seluruh data proyek/invoice terkait dengan konfirmasi ketik nama klien secara transaksional.

---

## 📁 Projects & Billing Models

```
GET /app/projects
GET /app/projects/[projectId]
```

- **Tipe Billing Proyek** (3 model aktif):
  - **Fixed Price (Harga Tetap)**: Nilai harga tetap per proyek; task memakai workflow kanban.
  - **Hourly (Per Jam)**: Penagihan berbasis tarif per jam (*hourly rate*).
  - **Retainer**: Biaya per periode + kuota menit termasuk, reset tiap periode, kebijakan overage.
- **Client Visibility Toggle**: Kontrol apakah proyek & task bersangkutan ditampilkan di Client Portal.
- **Struktur Tab Detail**: Tab Tugas (Task), Berkas (File), Waktu (Log Waktu), dan Invoice (Keuangan & Invoice Proyek).
- **Hapus Proyek Terproteksi**: Hapus proyek beserta seluruh data terikat dengan konfirmasi ketik nama proyek.

---

## ✅ Tasks & Kanban Board

```
GET /app/tasks
```

- **5 Kolom Kanban**: *Backlog*, *Todo*, *In Progress*, *In Review*, *Done* dengan interaksi drag & drop (`@dnd-kit`).
- **Properti Task**: Prioritas (*Low, Medium, High, Urgent*), Assignee, Due Date, dan Client Visibility.
- **Task Comments**: Thread komentar internal per task.
- **Koneksi Catatan**: Konversi cepat dari Personal Note menjadi Task resmi proyek.

---

## ⏱️ Time Tracking & Timesheets

```
GET /app/time
```

- **Active Live Timer**: Widget timer aktif di topbar navigasi dengan indikator durasi di tab browser (`⏱️ [00:00:00]`).
- **Input Manual & Tagging**: Input log waktu manual dengan hirarki Proyek > Task > Tag.
- **Timesheet Harian & Mingguan**: Grid harian (maks 10 log/halaman) yang dapat diedit langsung, serta ringkasan mingguan tim.
- **Status Log Waktu**: Log status `uninvoiced` dapat diimpor otomatis menjadi item penagihan Invoice. Log status `invoiced` terkunci dari pengeditan harga.
- **Ekspor Berkas**: Ekspor log waktu ke PDF (Timesheet VA / Laporan Detail). *(CSV time export tidak tersedia.)*
- **Persetujuan Timesheet**: Submit ringkasan mingguan (`/app/time/approvals`) & review oleh owner dengan status *draft → submitted → approved / rejected*.

---

## 💰 Invoices & Payments

```
GET /app/invoices
GET /app/invoices/[invoiceId]
GET /invoice/[token] (Public)
```

- **Invoice Lifecycle**: `Draft` ➔ `Sent` ➔ `Viewed` (auto saat dibaca klien) ➔ `Paid` / `Overdue` / `Cancelled` / `Archived`.
- **Auto Numbering**: Penomoran invoice otomatis yang thread-safe (contoh: `INV-0001`).
- **Import Time Logs**: Tarik log waktu *uninvoiced* otomatis menjadi item penagihan.
- **Multi-Project Invoice**: Gabungkan item penagihan dari beberapa proyek milik klien yang sama dalam satu invoice.
- **Public Share Link & PDF**: Halaman publik tanpa login (`/invoice/[token]`) & generate PDF via `@react-pdf/renderer` (`/api/invoices/[id]/pdf`).
- **Pencatatan Pembayaran & Reminders**: Pencatatan pembayaran parsial/lunas & pengiriman pengingat jatuh tempo via email.
- **Template Center**: Template invoice, proposal & kontrak dikelola di `/app/templates` (tersedia penuh hanya untuk pengguna preview; selain itu tampil sebagai "Segera").

---

## 📄 Proposals, Contracts & Sales Docs

```
GET /app/proposals | GET /app/contracts | GET /app/templates
```

- **Proposal Penawaran (`/app/proposals`)**: Buat proposal dengan milestone harga & DP. Persetujuan di halaman publik (`/proposal/[token]`) otomatis membuatkan Proyek baru & Invoice DP.
- **Kontrak & E-Sign (`/app/contracts`)**: Dokumen kesepakatan hukum dengan penandatanganan elektronik oleh klien (`/contract/[token]`).
- **Template Center (`/app/templates`)**: Hub pengelolaan template invoice, proposal, dan kontrak.

---

## 🔗 Client Portal

```
GET /client-portal/[token]
GET /client-portal/[slug]
```

- Akses publik terisolasi untuk klien tanpa login. Link portal canonical menggunakan slug: `/client-portal/[slug]` (token dipakai internal untuk verifikasi).
- Fitur: Branding workspace, ringkasan proyek & task visible, berkas & deliverable download, invoice & pembayaran, pengunggahan file revisi oleh klien (`POST /api/client-portal/files/upload`), serta tab **Requests** untuk permintaan dokumen/pengingat & pemesanan paket kustom.
- *Komentar portal tidak tersedia* — komunikasi klien via kontak WA/email (lihat tab Contact).

---

## 📅 Calendar & Public Booking

```
GET /app/calendar
GET /booking/[slug] (Public)
```

- **Availability Rules**: Pengaturan hari & jam kerja operasional berbasis IANA Timezone.
- **Public Booking Page (`/booking/[slug]`)**: Klien memilih slot waktu yang dikonversi otomatis sesuai zona waktu klien.
- **ICS Invite**: Konfirmasi janji temu dilengkapi berkas `.ics` yang dapat diunduh untuk Google/Apple Calendar.

---

## 🌐 Personal Landing Builder

```
GET /app/personal-site
GET /site/[slug] (Public)
```

- **WYSIWYG Canvas Editor**: 16 starter blocks, 3 template halaman (*Freelancer Profile, Agency Website, Service Offer*), section manager (Services, Pricing, FAQ, CTA, Gallery), dan device preview switcher (Desktop, Tablet, Mobile).
- **Publish & SEO**: Pengaturan custom slug, meta SEO, gambar OpenGraph (OG), dan dukungan subpage (contoh: `/site/alip/contact`).

---

## 📝 Personal Notes & Work Journal

```
GET /app/personal | GET /app/journal
```

- **Personal Notes**: Catatan pribadi cepat, pinning, recurrence, dan konversi 1-klik menjadi Task resmi.
- **Work Journal**: Log jurnal harian pekerjaan dengan mood tracker, tag i18n, search, dan ekspor.

---

## 🤖 AI Prompt Studio & AI Assistant

```
GET /app/prompts | Floating Chat Widget (/app/*)
```

- **AI Prompt Studio (`/app/prompts`)**: Generator materi kampanye & brief visual dengan 18 preset katalog (Feed Instagram, Carousel, Story, Product Ad, Thumbnail, UGC Script, Logo, dll) berdukungan bilingual (ID/EN).
- **AI Assistant (`/app/brain`)**: Asisten pintar berbasis Agentic RAG (model default `ag/gemini-3-flash` via 9Router) untuk tanya-jawab data workspace & eksekusi tindakan terkonfirmasi UI. Tersedia juga sebagai widget mengambang di seluruh halaman `/app/*`.

---

## ⚙️ Settings, Team & Subscriptions

```
GET /app/settings | GET /app/billing
```

- **Workspace & Team Settings (`/app/settings`)**: Logo workspace, alamat penagihan, email balasan kustom (*Reply-To*), dan manajemen peran tim (Owner, Member, Viewer).
- **Subscription Pakasir QRIS (`/app/billing`)**: Langganan dibayar **tahunan** (sekali bayar via QRIS, tanpa pajak):
  - **Free**: Gratis (maksimal 3 klien, 5 proyek, 10 invoice/bulan, AI 10 request/bulan).
  - **Solo**: Rp 588.000 / tahun (unlimited klien, 1 user).
  - **Team**: Rp 1.188.000 / tahun (unlimited klien & user).
  - Checkout otomatis terverifikasi via webhook Pakasir (`/api/webhooks/pakasir`).
- **Modul tersembunyi (tanpa entri sidebar, akses via URL langsung)**:
  - **Email Suite (`/app/email`)**: Template email, draft & pengiriman — *experimental*, belum muncul di navigasi.
  - **Packages (`/app/packages`)**: Manajemen paket & pesanan paket kustom — *experimental*, belum muncul di navigasi.

---

## 🔒 Security & Access Control

- **Multi-Tenant Isolation**: Kueri database diisolasi ketat berdasarkan `workspace_id`.
- **Protected File Downloads**: Berkas terproteksi signed token R2; akses portal diverifikasi berdasar token & visibilitas berkas.
- **Audit Logs**: Pencatatan aktivitas pembukaan portal, transaksi pembayaran, dan mutasi data penting.
