# Cubiqlo — Comprehensive Feature Documentation

> **App URL:** https://app.cubiqlo.com  
> **Repository:** `/root/projects/cubicle`  
> **Tech Stack:** Next.js 16 (App Router), React 19, TypeScript, Drizzle ORM, PostgreSQL 16, Better Auth v5, Tailwind CSS v4, Cloudflare R2, Resend, Pakasir QRIS Gateway, 9Router AI.

---

## 📋 Table of Contents
1. [Overview & Target Users](#1-overview--target-users)
2. [Authentication & Workspace Access](#2-authentication--workspace-access)
3. [Dashboard & Action Queue](#3-dashboard--action-queue)
4. [Client Operations & Management](#4-client-operations--management)
5. [Project & Billing Models](#5-project--billing-models)
6. [Tasks & Kanban Board](#6-tasks--kanban-board)
7. [Time Tracking & Timesheets](#7-time-tracking--timesheets)
8. [Invoices & Payments](#8-invoices--payments)
9. [Proposals, Contracts & Sales Docs](#9-proposals-contracts--sales-docs)
10. [Client Portal](#10-client-portal)
11. [Calendar & Public Booking](#11-calendar--public-booking)
12. [Personal Landing Builder](#12-personal-landing-builder)
13. [Personal Notes & Work Journal](#13-personal-notes--work-journal)
14. [AI Prompt Studio & AI Assistant](#14-ai-prompt-studio--ai-assistant)
15. [Settings, Team & Subscriptions](#15-settings-team--subscriptions)
16. [Security & Access Control](#16-security--access-control)

---

## 1. Overview & Target Users

Cubiqlo adalah **Client Operations Hub** serba ada untuk freelancer, studio kreatif, agensi kecil, software dev house, dan konsultan independen. Cubiqlo menggabungkan seluruh alur kerja operasional klien dalam satu platform terpadu tanpa perlu berpindah-pindah aplikasi.

### Core Value Proposition
- **Client Operations Centralized**: Dari penawaran proposal, penandatanganan kontrak, pengerjaan tugas, time tracking, penagihan invoice, hingga portal klien.
- **Billing-Aware Architecture**: Seluruh log waktu dan task terhubung langsung dengan skema penagihan (*Fixed Price*, *Hourly*, atau *Retainer*).
- **Public & Client-Facing Portal**: Klien dapat memantau progres, mengunduh deliverable file, membayar invoice, dan menyetujui kontrak tanpa perlu membuat akun/login.
- **AI-Powered Productivity**: Asisten pintar berbasis RAG untuk kueri data workspace dan Generator Brief/Prompt untuk materi marketing & desain.

---

## 2. Authentication & Workspace Access

Menggunakan **Better Auth v5** dengan skema keamanan berbasis sesi cookie terenkripsi.

### Authentication Endpoints
- `/login` — Halaman Masuk
- `/signup` — Pendaftaran Akun Baru
- `/forgot-password` & `/reset-password` — Pemulihan Kata Sandi
- `/onboarding` — Setup awal profil workspace untuk akun baru

### Multi-Tenancy & Workspace Roles
Setiap pengguna terhubung ke setidaknya satu Workspace. Terdapat 3 tingkatan peran (*role*):
1. **Owner**: Akses penuh ke seluruh fitur, manajemen tim, pengaturan billing/QRIS, dan hapus workspace/data.
2. **Member**: Dapat membuat dan mengedit Klien, Proyek, Task, Time Entry, Invoice, Proposal, Kontrak, dan Upload File. Tidak dapat mengedit pengaturan tim/owner.
3. **Viewer**: Akses *Read-Only* ke seluruh data workspace. Tidak dapat menambah/mengedit/menghapus data atau mengoperasikan timer.

---

## 3. Dashboard & Action Queue

Halaman utama (`/app/dashboard`) menyajikan ringkasan kesehatan bisnis dan operasional secara *real-time*.

### Key Features & Components
- **Salam Dinamis & Bahasa**: Salam yang menyesuaikan waktu (Pagi/Siang/Malam) dan sakelar preferensi bahasa (ID / EN).
- **Quick Action Bar**: Tombol pintas untuk *Task Baru*, *Invoice Baru*, *Mulai Timer*, dan *Tambah Klien*.
- **Perlu Ditangani (Action Queue)**:
  - Tagihan/Invoice terlambat bayar.
  - Task yang jatuh tempo hari ini / *overdue*.
  - Kontrak yang menunggu persetujuan klien.
- **KPI Metrics Cards**:
  - Total Klien Aktif.
  - Total Proyek Berjalan.
  - Task Jatuh Tempo.
  - Total Outstanding Invoice.
- **Revenue Sparkline & Arus Kas**: Grafik visual tren pendapatan 14 hari terakhir dan proyeksi arus kas 30/60/90 hari.
- **Indikator Kesehatan Klien**: Pengelompokan status keaktifan klien (Sehat, Pasif, Berisiko).

---

## 4. Client Operations & Management

Pusat pengelolaan data klien (`/app/clients` & `/app/clients/[clientId]`).

### Core Capabilities
- **Profil Klien**: Nama, nama perusahaan, email, nomor telepon, alamat fisik, dan catatan internal.
- **Client Portal Access Control**:
  - **Portal Token**: Token unik terenkripsi untuk akses portal via URL (`/client-portal/[token]`).
  - **Custom Short Slug**: Tautan pendek kustom (contoh: `/client-portal/alip-studio`).
  - **Akses Klien**: Kemampuan untuk mengaktifkan, memperbarui kata sandi portal, atau mencabut akses portal kapan saja.
- **Document & Action Requests**:
  - Kirim pengingat/permintaan dokumen langsung ke dashboard portal klien.
  - Status request: *Pending*, *Done*, *Cancelled*.
- **Ekspor Data**: Fitur ekspor daftar klien atau detail klien ke format berkas Excel (`.xlsx`).
- **Hapus Klien Terproteksi**: Menghapus klien secara permanen dengan mengonfirmasi mengetik ulang nama klien (menghapus proyek, task, dan dokumen terkait secara transaksional).

---

## 5. Project & Billing Models

Pengelolaan proyek terintegrasi skema penagihan (`/app/projects` & `/app/projects/[projectId]`).

### Skema Billing Proyek (Billing Types)
1. **Fixed Price (By Project)**: Paket harga tetap per proyek. Task dikelola menggunakan sistem Kanban List/Board.
2. **Hourly (By Hours)**: Penagihan berbasis tarif per jam (*hourly rate*). Log waktu yang dikumpulkan dapat diimpor langsung ke Invoice.
3. **Retainer**: Alokasi kuota jam kerja atau progres berkala bulanan.

### Fitur Proyek
- **Kontrol Visibilitas Portal (Client Visibility)**: Toggle untuk menyembunyikan atau menampilkan proyek & task di Client Portal.
- **Struktur Tab Detail Proyek**:
  - **Pekerjaan**: Kanban/Daftar Task proyek.
  - **Waktu**: Log waktu khusus proyek tersebut (jika bertipe Hourly/Retainer).
  - **File**: Berkas proyek dengan filter visibilitas internal/klien.
  - **Billing**: Status penagihan, total invoice, dan pembayaran proyek.
- **Hapus Proyek Terproteksi**: Hapus proyek beserta seluruh data terikat dengan konfirmasi ketik nama proyek.

---

## 6. Tasks & Kanban Board

Manajemen pekerjaan harian (`/app/tasks`).

### Kanban & Task Features
- **5 Kolom Kanban**: *Backlog*, *Todo*, *In Progress*, *In Review*, *Done*.
- **Drag & Drop**: Pemindahan status task menggunakan `@dnd-kit`.
- **Properti Task**:
  - Prioritas: *Low*, *Medium*, *High*, *Urgent*.
  - Assignee: Alokasi ke anggota tim.
  - Due Date & Estimasi Jam Kerja.
  - Client Visibility Toggle (apakah tampak di Portal).
- **Diskusi & Komentar**: Thread komentar per task untuk kolaborasi internal.
- **Koneksi Catatan**: Konversi cepat dari Personal Note menjadi Task resmi.

---

## 7. Time Tracking & Timesheets

Pencatatan jam kerja presisi (`/app/time`).

### Timer Lifecycle & Modes
- **Real-Time Live Timer**: Widget timer aktif berjalan di topbar navigasi dengan indikator durasi di tab browser (`⏱️ [00:00:00]`).
- **Pencatatan Manual**: Input durasi secara manual dengan memilih *Proyek*, *Task*, dan *Tag*.
- **Timesheet Harian & Mingguan**:
  - Grid log waktu harian dengan opsi edit baris langsung.
  - Grid mingguan untuk melihat alokasi jam kerja tim.
- **Status Penagihan Log Waktu**:
  - Status `uninvoiced`: Jam kerja belum ditagih.
  - Status `invoiced`: Jam kerja yang sudah diimpor ke dalam Invoice (terkunci dari pengeditan harga).
- **Laporan & Ekspor Berkas**:
  - Ekspor log waktu ke PDF (Timesheet VA / Laporan Detail).
  - *CSV time export tidak tersedia.*
- **Persetujuan Timesheet**: Submit ringkasan mingguan (`/app/time/approvals`) & review oleh owner dengan status *draft → submitted → approved / rejected*.

---

## 8. Invoices & Payments

Sistem penagihan keuangan komprehensif (`/app/invoices` & `/app/invoices/[invoiceId]`).

### Invoice Lifecycle
```
[Draft] ➔ [Sent] ➔ [Viewed] (Auto saat dibaca klien) ➔ [Paid] / [Overdue] / [Cancelled] / [Archived]
```

### Fitur Penagihan
- **Penomoran Otomatis**: Penomoran invoice thread-safe (misal: `INV-0001`, `INV-0002`).
- **Import Time Logs**: Tarik jam kerja *uninvoiced* dari modul Time Tracking otomatis menjadi baris item penagihan.
- **Multi-Project Invoice**: Menggabungkan item penagihan dari beberapa proyek berbeda milik klien yang sama dalam satu invoice.
- **Kalkulasi Otomatis**: Subtotal, diskon, persentase pajak, dan total tagihan dihitung otomatis.
- **Public Share Link & PDF**:
  - Halaman publik tanpa login (`/invoice/[token]`).
  - Auto-change status dari `sent` ke `viewed` saat klien membuka link.
  - Render berkas PDF via `@react-pdf/renderer` (`/api/invoices/[id]/pdf`).
- **Pencatatan Pembayaran**: Catat pembayaran parsial atau lunas, yang secara otomatis mengubah status invoice menjadi `paid`.
- **Pengingat Jatuh Tempo (Overdue Reminders)**: Pengiriman pengingat pembayaran manual atau otomatis via email.

---

## 9. Proposals, Contracts & Sales Docs

Modul penawaran dan kesepakatan hukum (`/app/proposals` & `/app/contracts`).

### Proposal Penawaran (`/app/proposals`)
- Buat penawaran harga dengan estimasi biaya, penentuan Down Payment (DP), dan tanggal masa berlaku.
- **Public Proposal Link** (`/proposal/[token]`): Tampilan persetujuan untuk klien.
- **Auto Project & Invoice Generation**: Saat klien menyetujui proposal, sistem dapat otomatis membuatkan Proyek baru dan Invoice DP.

### Kontrak & E-Sign (`/app/contracts`)
- Buat draft kontrak kerja dengan klausal hukum dan syarat ketentuan.
- **Public E-Sign Link** (`/contract/[token]`): Klien dapat menandatangani dokumen secara elektronik.
- Pembaruan status otomatis setelah ditandatangani.

### Template Center (`/app/templates`)
- Pusat pengelolaan template berkas penagihan, proposal, dan kontrak agar dapat digunakan kembali dengan cepat.

---

## 10. Client Portal

Halaman portal terisolasi untuk klien (`/client-portal/[token]` atau `/client-portal/[slug]`).

### Tampilan & Fitur Klien
- **Branding Header**: Menampilkan nama dan logo Workspace agensi.
- **Ringkasan Proyek**: Menampilkan daftar proyek yang diset *Client Visible*.
- **Pekerjaan & Task**: Menampilkan task yang diizinkan untuk dipantau klien.
- **Berkas & Deliverables**: Menampilkan berkas berlabel `Client` atau `Deliverable` yang dapat diunduh.
- **Upload File Klien**: Klien dapat mengunggah berkas revisi atau dokumen pendukung (`POST /api/client-portal/files/upload`).
- **Penagihan & Invoice**: Akses langsung ke invoice terbuka dan riwayat pembayaran.
- **Tab Requests**: Permintaan dokumen/pengingat dari tim workspace & pemesanan paket kustom oleh klien.
- *Komentar portal tidak tersedia* — komunikasi klien via kontak WA/email (tab Contact).

---

## 11. Calendar & Public Booking

Penjadwalan janji temu dan manajemen kalender (`/app/calendar` & `/booking/[slug]`).

### Availability Rules
- Pengaturan jam & hari kerja operasional (Senin–Minggu) berbasis zona waktu IANA (misal: `Asia/Jakarta`).

### Public Booking Page (`/booking/[slug]`)
- Klien memilih tanggal dan melihat ketersediaan slot waktu yang sudah dikonversi otomatis sesuai zona waktu.
- Klien mengisikan nama, email, dan topik konsultasi.
- **Sistem Pengingat & .ics**: Konfirmasi jadwal otomatis dan berkas `.ics` yang dapat diunduh untuk dimasukkan ke Google Calendar / Apple Calendar.

---

## 12. Personal Landing Builder

Pembuat halaman landing page visual tanpa koding (`/app/personal-site` & `/site/[slug]`).

### Key Features
- **WYSIWYG Canvas Editor**: Editor visual drag-and-drop dengan 16 starter blocks dan 3 template siap pakai (*Freelancer Profile*, *Agency Website*, *Service Offer*).
- **Section Manager**: Pengaturan elemen Services, Pricing, FAQ, Call-to-Action (CTA), dan Gallery.
- **Device Switcher**: Mode pratinjau responsif untuk Desktop, Tablet, dan Mobile.
- **SEO & Social Share**: Pengaturan Meta Title, Meta Description, dan OpenGraph (OG) image.
- **Multi-Page & Subpage**: Mendukung pembuatan sub-halaman (contoh: `/site/alip/contact`).

---

## 13. Personal Notes & Work Journal

Alat produktivitas internal (`/app/personal` & `/app/journal`).

### Personal Notes (`/app/personal`)
- Catatan cepat pribadi dengan dukungan penyematan (*pinning*), pengelompokan tab (*Open, Done, Archived*), dan keberulangan (*recurrence*).
- **Konversi ke Task**: Satu klik untuk mengubah catatan pribadi menjadi Task proyek resmi dengan opsi prioritas.

### Work Journal (`/app/journal`)
- Log catatan harian pekerjaan dengan mood tracker, tag i18n, pencarian, dan fitur ekspor data jurnal.

---

## 14. AI Prompt Studio & AI Assistant

Fitur kecerdasan buatan terintegrasi (`/app/prompts` & `/app/brain`).

### AI Prompt Studio (`/app/prompts`)
- Generator materi pemasaran dan brief visual berbasis AI (menggunakan model 9Router / Gemini).
- 18 kuis/katalog prompt terstruktur meliputi: *Feed Instagram, Carousel, Story, Product Ad, Promo Discount, Testimonial, Product Photography, UGC Script, YouTube Thumbnail, Marketing Copy, Logo*, dll.
- Opsi bahasa ganda (ID / EN) pada opsi Rasio, Platform, Tone, dan Style.

### AI Assistant (`/app/brain`)
- Widget asisten mengambang di seluruh halaman `/app/*`.
- Menggunakan arsitektur Agentic RAG untuk menjawab pertanyaan seputar data workspace (Klien, Proyek, Invoice, Task) tanpa mengirim data Sensitif ke luar.
- Eksekusi tindakan aman (misal: buat draft reminder invoice) dengan persetujuan UI pengguna.
- Model default: `ag/gemini-3-flash` via 9Router (`AI_MODEL`).

---

## 15. Settings, Team & Subscriptions

Pengaturan akun dan langganan workspace (`/app/settings` & `/app/billing`).

### Workspace & Team Settings (`/app/settings`)
- **Branding**: Nama workspace, alamat penagihan, logo workspace, dan pengaturan email balasan kustom (*Reply-To*).
- **Manajemen Tim**: Undang anggota tim via email, ubah peran (*Owner, Member, Viewer*), atau hapus anggota.

### Subscription & QRIS Payment (`/app/billing`)
- Integrasi pembayaran **Pakasir QRIS** untuk *upgrade* paket langganan Workspace. Langganan dibayar **tahunan** (sekali bayar via QRIS, tanpa pajak):
  - **Free Plan**: Gratis (maksimal 3 klien, 5 proyek, 10 invoice/bulan, AI 10 request/bulan).
  - **Solo Plan**: Rp 588.000 / tahun (unlimited klien, 1 user).
  - **Team Plan**: Rp 1.188.000 / tahun (unlimited klien & user).
- Proses checkout otomatis via webhook Pakasir yang secara instan memperbarui status paket workspace.

### Modul Tersembunyi / Experimental (tanpa entri sidebar)
- **Email Suite (`/app/email`)**: Template email, draft & pengiriman — *experimental*, belum muncul di navigasi.
- **Packages (`/app/packages`)**: Manajemen paket & pesanan paket kustom — *experimental*, belum muncul di navigasi.

---

## 16. Security & Access Control

### Data Protection & Guards
- **Multi-Tenant Isolation**: Setiap kueri database difilter ketat berdasarkan `workspace_id`. Pengguna dari workspace A tidak dapat mengakses data workspace B.
- **Public Download Security**: Berkas internal terlindungi signed token R2; berkas klien di portal diverifikasi berdasarkan token portal aktif dan flag visibilitas berkas.
- **Audit Logs**: Pencatatan aktivitas pembukaan portal, transaksi pembayaran, dan perubahan data penting di database.
