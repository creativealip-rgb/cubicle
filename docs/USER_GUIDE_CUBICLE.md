# Cubiqlo / Cubicle — Panduan Lengkap Fitur & Halaman

> **App live:** https://cubiqlo.com  
> **Versi docs:** sinkron dengan app **v0.1.116** (24 Juli 2026)
> **Audience:** user / owner workspace / onboarding internal  
> **Bahasa UI app:** Indonesia (default) + English toggle di sidebar

---

## 1. Ringkasan produk

**Cubiqlo (repo: Cubicle)** = workspace operasi klien untuk freelancers, VA, studio kecil, dan agency.

Satu app mengganti campuran spreadsheet + chat + folder drive:

1. **Kerja** — klien, proyek, tugas, waktu, kalender, file  
2. **Keuangan** — invoice, paket jam, pengeluaran, laporan  
3. **Penjualan** — proposal, kontrak, template, kuesioner intake  
4. **Personal** — catatan/reminder, jurnal, landing page  
5. **AI** — Brain chat + Prompt Studio  
6. **Portal publik** — klien lihat proyek/file/invoice tanpa login staff

### Stack (teknis singkat)

- Next.js 16 App Router + React 19 + TypeScript  
- PostgreSQL + Drizzle ORM  
- Better Auth (email/password)  
- Cloudflare R2 (file)  
- Resend (email)  
- Pakasir QRIS (billing plan app)  
- `@react-pdf/renderer` (PDF invoice / timesheet)  
- Docker + reverse proxy (prod)

### Model data inti

Semua data di-scope **workspace**. User masuk lewat membership (`owner` / `member` / `viewer`).

Entity utama:

- Workspace, members  
- Clients, projects, tasks, packages  
- Time entries, invoices, invoice items, payments  
- Expenses, expense categories, recurring expenses  
- Proposals, contracts, templates  
- Files, folders  
- Appointments, availability rules  
- Questionnaires + responses  
- Personal notes (notes / journal / site)  
- AI conversations, prompt templates  
- Notifications, activity logs, portal visits  

---

## 2. Akses, auth, onboarding

### 2.1 Halaman publik auth

| Route | Fungsi |
|---|---|
| `/` | Landing marketing produk |
| `/login` | Login email + password; redirect ke target terproteksi |
| `/signup` | Daftar akun baru |
| `/forgot-password` | Minta reset password |
| `/reset-password` | Set password baru dari token email |
| `/verify-email` | Verifikasi email |
| `/verify-email/success` | Konfirmasi sukses |
| `/privacy` | Kebijakan privasi |
| `/terms` | Syarat layanan |

**Alur tipikal**

1. Signup → verifikasi email (jika diaktifkan)  
2. Login  
3. Kalau belum selesai setup → `/onboarding`  
4. Masuk app di `/app/dashboard`

### 2.2 Onboarding (`/onboarding`)

Wizard 3 langkah:

1. **Workspace** — nama workspace  
2. **Tim** — undang email anggota (opsional)  
3. **Siap** — selesai, masuk dashboard  

Hasil: workspace aktif + membership owner.

### 2.3 Proteksi route

- Semua `/app/*` butuh session login  
- Unauthenticated → redirect `/login?redirect=...`  
- Role:
  - **owner** — full manage (team, billing, delete kritis)
  - **member** — create/edit operasional
  - **viewer** — read-only (tombol tulis disembunyikan)

### 2.4 Shell app (setiap halaman internal)

Sidebar grup:

- **Dashboard**
- **Kerja** — Klien, Proyek, Tugas, Waktu, Kalender, File  
- **Keuangan** — Invoice, Paket, Pengeluaran, Laporan  
- **Personal** — Catatan, Landing Page, Jurnal  
- **Penjualan** — Proposal, Kontrak, Template  
- **AI** — Brain, Prompt  

### Topbar (`AppTopbar`) — detail

| Kontrol | Fungsi |
|---|---|
| **Search** | Input cari (desktop) / icon expand (mobile). Submit → `/app/search?q=...` (global search klien/proyek/tugas/invoice) |
| **+ Baru** | Quick create: Proyek, Tugas, Klien, Invoice (role writable) |
| **Timer chip** | Timer aktif global: elapsed live, Pause / Stop / buka `/app/time`. Sembunyi di phone kalau idle |
| **AI sparkles** | Toggle floating AI panel (`cubicle:toggle-ai`) — tablet/desktop |
| **Notifikasi** | Bell unread + list in-app notifications |
| **Workspace switcher** | List workspace user, switch aktif, create workspace (gated plan), invite/upgrade CTA |
| **Avatar menu** | Profile, Settings, Billing, Support, Sign out |
| **Hamburger** | Buka sidebar mobile/tablet |

Lain:

- Floating **AIChatPanel** di semua `/app/*` **kecuali** `/app/brain` (fullpage)  
- Bahasa ID/EN toggle di **sidebar**  
- Collapse sidebar desktop (persist localStorage)

Badge sidebar:

- Tugas terbuka milik user  
- Invoice belum lunas  
- Proposal draft  
- Kontrak draft  

### Modul di luar sidebar (akses deep-link / topbar)

| Route | Cara buka | Catatan |
|---|---|---|
| `/app/email` | Deep link / bookmark | Email suite (compose + template) — **tidak di sidebar** |
| `/app/support` | Avatar menu → Support | Ticket center |
| `/app/questionnaires` | Kalender shortcut / deep link | Intake forms — **tidak di sidebar** |
| `/app/settings` | Avatar menu | Workspace + team |
| `/app/billing` | Avatar / workspace menu | Langganan Cubiqlo |
| `/app/notes` | Legacy alias | Redirect → `/app/personal` |
| `/app/invoice-templates` | Legacy | Redirect → `/app/templates?tab=invoice` |
| `/app/invoices/templates` | Legacy | Redirect → `/app/templates?tab=invoice` |
| `/app/contract-templates` | Legacy list | Redirect → `/app/templates?tab=contract` (editor `/new` & `/[id]` tetap hidup) |

---

## 3. Dashboard — `/app/dashboard`

**Tujuan:** “apa yang harus dikerjakan / ditagih hari ini”.

### Yang ditampilkan

1. **Greeting** berbasis waktu Jakarta (update periodik) + tanggal saja  
   - Tidak lagi menampilkan “X proyek aktif · Y tugas jatuh tempo” di subtitle  
2. **Onboarding checklist** (workspace baru)  
3. Blok **Reminder** (active to-do, bukan bell inbox)
   - Invoice jatuh tempo  
   - Tugas perlu dikerjakan  
   - Approval task client  
   - Kontrak menunggu  
   - Appointment mendatang  
   - Catatan personal dengan due date  
4. Blok **Kerja** (KPI ringkas)
   - **Klien Aktif**  
   - **Proyek Aktif**  
   - Card due task/invoice & timer aktif **tidak** di sini (due di Reminder; timer di topbar)  
5. **Aktivitas terbaru** + sidebar **Keuangan** (revenue 30 hari + pie per klien)

### Cara pakai

- Cek dulu list **Reminder**  
- Klik item → detail resource  
- Timer: pakai chip di topbar, bukan card dashboard  
- Selesai kerja harian → lanjut modul Kerja / Invoice  

---

## 4. Kerja

### 4.1 Klien — `/app/clients`

**Tujuan:** master data klien.

#### List

- Tab status: **Aktif / Tidak aktif / Arsip** + count  
- Search nama/perusahaan  
- Tabel desktop + card mobile  
- Limit free plan: **3 klien** (banner upgrade muncul saat penuh)  
- Aksi: buka detail, export PDF klien (bulk/single via API)

#### Buat klien

- `/app/clients/new` atau dialog create  
- Field umum: nama, perusahaan, email, phone, alamat, status, notes  
- Portal slug (auto-generate) untuk client portal  

#### Detail klien — `/app/clients/[clientId]`

Tab:

| Tab | Isi |
|---|---|
| **Overview** | Ringkas kontak, status, stats |
| **Projects** | Daftar proyek + progress (package = jam terpakai/kuota; project = task ratio; hours = akumulasi jam) |
| **Files** | File terkait klien |
| **Invoices** | Invoice klien |
| **Appointments** | Janji temu klien |
| **Portal** | Token portal, link share, request dari portal, audit akses |
| **Notes** | Catatan terkait |

Aksi penting:

- Edit klien (dialog)  
- Export PDF klien  
- Generate / regenerate portal access  
- Kelola portal requests (approve/reject admin)

#### Portal request (klien ↔ staff)

Klien di portal bisa kirim request; staff kelola di tab Portal klien.

| Field | Nilai |
|---|---|
| Type | `document` / `approval` / `info` / `other` |
| Status | `pending` → `completed` / `cancelled` |
| Opsional | project, due date, description |

Admin: respond / complete request. Klien: upload/response via API portal.

#### Field klien (schema)

`name`, `companyName`, `email`, `phone`, `website`, `address`, `status`, `tags[]`, `internalNotes`, `portalEnabled`, token hash/expiry/revoke, `portalSlug` + `portalSlugEnabled`.

### 4.2 Proyek — `/app/projects`

**Tujuan:** container kerja per klien.

#### List

- Status: Draft / Aktif / On Hold / Completed / Cancelled  
- Info billing type, klien, progress  
- Create dialog proyek baru  

#### Field proyek penting

- Nama, klien, status  
- **Billing type:**
  - `hours` — Per Jam  
  - `package` — Per Paket (kuota jam)  
  - `project` — Per Proyek (fixed)  
- Tanggal mulai / selesai  
- Budget / package hours (jika relevan)  
- **clientVisible** — tampil di client portal  
- **selectedPackageId** — link ke paket katalog  
- **Project members** — assign anggota tim ke proyek  
- Rate / budget / currency  

#### Detail proyek — `/app/projects/[projectId]`

Tab:

| Tab | Fungsi |
|---|---|
| **Tasks** | Kanban/list task proyek |
| **Files** | File proyek |
| **Time** | Jam tercatat di proyek |
| **Comments** | Diskusi internal + notifikasi email |
| **Timeline** | Timeline aktivitas/status |

Aksi:

- Edit meta proyek  
- Lihat progress otomatis (bergantung billing type)  
- Navigasi cepat ke invoice / time  

### 4.3 Tugas — `/app/tasks`

**Tujuan:** eksekusi kerja harian.

#### Fitur

- View toggle: **Board (kanban)** / list  
- Filter status/priority/assignee/project  
- Create task dialog  
- Detail sheet (slide-over)  
- Priority badge + status badge  
- Drag-and-drop status di board  
- Deep-link `?focus=` buka sheet task (termasuk dari convert catatan)

#### Field task umum

- Judul, deskripsi  
- Project, assignee  
- Status, priority  
- Due date  
- Link balik ke personal note (jika convert dari catatan)

### 4.4 Waktu — `/app/time`

**Tujuan:** track jam billable/non-billable.

#### Komponen

1. **TimerWidget**
   - Start/stop timer aktif  
   - Pilih client / project / task  
   - Deskripsi + tags  
   - Rate fallback: entry → project → workspace default  
2. **ManualEntryForm**
   - Input jam manual (start/end atau duration)  
3. **Timesheet**
   - Riwayat entry  
   - Edit/hapus (role writable)  
4. **PdfExportButton**
   - Export timesheet PDF (VA timesheet)
   - Mode: Detailed / Dashboard / Full  
   - Filter client/project/date range  

#### Status entry

`draft` → `approved` → `invoiced`

- `billable` true/false  
- `hourlyRate` fallback: entry → project.rate → workspace default  
- Tags preset umum: Research, Cold Calling, Follow Up, Task Reporting  
- CSV export via action (selain PDF)  

#### Integrasi

- Import entry ke invoice (lihat Invoice detail)  
- Progress package project memakai total menit entry  

### 4.5 Kalender — `/app/calendar`

**Tujuan:** janji temu + availability booking publik.

#### Fitur internal

- Daftar appointment mendatang  
- Buat/hapus **aturan ketersediaan** berdasarkan hari, jam, dan zona waktu IANA
- Waktu selesai wajib setelah waktu mulai
- Hapus aturan dan batalkan janji memakai dialog konfirmasi agar tidak terpencet langsung
- Unduh file kalender lewat tombol **Unduh .ics** (`/api/calendar/[id]/ics`)

#### Booking publik

- Workspace punya `bookingSlug`  
- Publik buka `/booking/[slug]`  
- Pilih tanggal → pilih slot → isi nama/email/catatan → pesan janji
- Zona waktu aturan (contoh `Asia/Jakarta`) tampil di atas pilihan slot
- Slot dihitung dan ditampilkan sesuai zona waktu aturan, bukan zona waktu server
- Grid slot responsif: 2 kolom di HP, 3 kolom mulai layar kecil

### 4.6 File — `/app/files`

**Tujuan:** storage terorganisir (R2).

#### Fitur

- Folder tree
- Upload button + drag-drop zone; batas maksimal **25 MB per file**
- New folder
- List file dengan filter client/project
- Download / delete; penghapusan wajib dikonfirmasi dan membersihkan object Cloudflare R2
- **Visibility:** `internal` | `client`
- **File type:** `working_file` | `deliverable`
- Folder nested (`parentId`); scope klien/proyek subfolder wajib sama dengan folder induk
- Rename folder / delete folder
- Owner/member dapat mengelola berkas; viewer hanya dapat melihat dan membuka berkas
- Tampilan mobile memakai tombol sentuh lebih besar, aksi folder selalu terlihat, dan dialog tetap bisa di-scroll

## 5. Keuangan

### 5.1 Invoice list — `/app/invoices` (v0.1.64)

**Tujuan:** pusat penagihan.

#### Toolbar

**Kiri — tab status (style TabsList sama Clients):**

- Semua (exclude `archived`)  
- Draf  
- Terkirim  
- Dilihat  
- Terlambat  
- Lunas  
- Dibatalkan  
- Arsip  

Setiap tab ada count badge. Count menyesuaikan filter aktif.

**Kanan — filter sejajar tab:**

- Dropdown **Klien**  
- Dropdown **Jenis proyek** (`hours` / `package` / `project` / tanpa proyek)  
- Tombol Filter / Reset  

#### Tabel

Kolom:

- No. invoice (`INV-YYYY-XXXX`)  
- Client  
- Project  
- Type (billing)  
- Issue date  
- Due date  
- Total (multi-currency format)  
- Status badge  
- Actions (lihat detail)

#### Pagination

- **10 invoice / halaman**  
- URL state: `?status=&clientId=&billing=&page=`  
- Prev/Next + “Menampilkan X–Y dari Z”

#### Aksi header

- Templates → Template Center tab invoice  
- + New Invoice  

### 5.2 Buat invoice — `/app/invoices/new`

- Pilih klien  
- Opsional project + template invoice  
- Currency, tax, dates, notes  
- Line items awal  
- Submit → detail invoice  

### 5.3 Detail invoice — `/app/invoices/[invoiceId]`

**Ini halaman operasional terpenting finance.**

#### Header

- Nomor, status badge  
- Client + project + billing type  
- Issue/due date, currency, total  
- Aksi:
  - Back to list  
  - PDF invoice download  
  - Share link publik  
  - Send invoice email  
  - Send reminder (overdue/unpaid)  

#### Edit meta

`InvoiceMetaForm`:

- Status: `draft | sent | viewed | paid | overdue | cancelled | archived`  
- Dates, tax, notes, currency, dsb.  
- **Arsip** = status `archived` (hilang dari tab Semua, masuk tab Arsip)

#### Line items

- Tambah item manual  
- Hapus item  
- Deskripsi format rekomendasi: `[Nama Project] — [Deskripsi]`  

#### Import Time Entries

- Modal daftar time entry eligible (biasanya approved/unbilled, filter by project invoice jika ada)  
- Checkbox per entry  
- **Pilih Semua (N)** + master checkbox + Kosongkan  
- Import → jadi line items + entry marked billed  

#### Payments

- Catat pembayaran partial/full  
- Update sisa tagihan  
- Riwayat payment  

#### Share

- Generate shared token  
- Public URL `/invoice/[token]`  
- View tracking (status bisa jadi `viewed`)

### 5.4 Paket — `/app/packages`

**Tujuan:** katalog paket jam/retainer.

#### Fitur

- CRUD paket (nama, jam, harga, currency, deskripsi, features, badge)  
- Active/inactive  
- Custom package range (`minHours`–`maxHours`, `allowCustom`)  
- Catalog level = `projectId` null (reusable) vs legacy per-project  
- Assign package ke project (`selectedPackageId`)  
- **Package order** (portal): klien order paket → status `pending / confirmed / invoiced / cancelled`  
- **Custom package request** (portal): minta jam custom → `pending / approved / rejected`  

### 5.5 Pengeluaran — `/app/expenses`

**Tujuan:** expense tracking + P/L.

#### Fitur

- Form tambah expense  
- Edit / delete  
- Kategori (Category Manager)  
- Recurring expenses (Recurring Manager)  
- Filter tanggal/kategori/project/client  
- Upload/link receipt  
- CSV export  
- Ringkas total + tren  
- Pagination list  

### 5.6 Laporan — `/app/reports`

**Tujuan:** kesehatan keuangan workspace.

#### Blok umum

- Revenue / paid / outstanding (multi-currency map)  
- Collection health (invoice aging-ish)  
- Top clients  
- Expense breakdown by category  
- Profit-ish view (revenue vs expense)  
- Link cepat ke invoice/expense terkait  

---

## 6. Penjualan

### 6.1 Proposal — `/app/proposals`

#### List

Tab status:

- All / Draft / Sent / Viewed / Accepted / Declined / Expired  

Kolom: title, client, total, status, activity date.

Aksi:

- New proposal  
- Send / resend  
- Open detail  

#### New — `/app/proposals/new`

- Client, title, body markdown  
- Line items, tax, DP percent  
- Valid until  

#### Detail — `/app/proposals/[proposalId]`

- Preview markdown body  
- Line items table  
- Status + timestamps (sent/viewed/accepted/declined)  
- Send/resend + copy public link  
- Delete (guard status)  

#### Publik — `/proposal/[token]`

- Klien buka tanpa login  
- Lihat proposal  
- Accept / Decline  
- Status & notifikasi ke workspace  

### 6.2 Kontrak — `/app/contracts`

#### List

Tab:

- All / Draft / Sent / Viewed / Signed / Declined / Expired / Revoked  

Aksi: create from template, send, open detail.

#### Detail — `/app/contracts/[contractId]`

- Body markdown  
- Client/project meta  
- Send / resend / copy link  
- Revoke  
- Delete guard  
- Signed metadata  

#### Publik — `/contract/[token]`

- Baca kontrak  
- Signature pad digital  
- State handling: not found / revoked / expired / already signed / declined / not sent  

### 6.3 Template Center — `/app/templates`

**Akses:** preview gate email tertentu (`canAccessTemplatesPreview`).

Tab:

- Invoice templates  
- Proposal templates  
- Contract templates  
- Prompt (placeholder/soon)

Fungsi:

- CRUD template  
- Editor kontrak di `/app/contract-templates/new` & `/[templateId]`  
- Dipakai saat create dokumen penjualan/invoice  

> Catatan: apply-template otomatis di semua create form masih bertahap; core hub sudah ada.

### 6.4 Kuesioner / Intake

#### Internal

- `/app/questionnaires` — list form  
- `/app/questionnaires/new` — builder schema field  
- `/app/questionnaires/[id]` — detail + responses  

Field schema support:

- text, textarea, select, multiselect, number, date, email, url  
- required/optional, options, placeholder  

#### Publik

- `/intake/[token]`  
- Klien isi form  
- State: not found / revoked / expired / already submitted  

---

## 7. Personal workspace

### 7.1 Catatan — `/app/personal`

**Tujuan:** personal notes + reminders (bukan project notes).

#### Fitur

- Tab: Open / Done / Archived / All  
- Pin note  
- Due date + overdue highlight  
- Recurrence: daily / weekly / monthly / yearly / none  
- Auto-roll recurrence setelah selesai (via cron/logic)  
- Convert note → task (pilih priority + project)  
- Reverse link task↔note  
- Infinite load-more  
- Sembunyikan prefix khusus `[journal]` / `[site]` dari list notes biasa  
- Reminder cron (7d / 3d / 1d, dedupe)

### 7.2 Jurnal — `/app/journal`

**Tujuan:** daily journal terpisah dari task notes.

- Tab Aktif / Arsip  
- Create / edit / archive / restore / delete  
- Mood picker + tags  
- Search / filter / export  
- Storage: personal notes dengan prefix `[journal]`

### 7.3 Landing Page builder — `/app/personal-site`

**Tujuan:** mini site publik personal/studio.

#### Builder

- Title, subtitle, hero, about  
- CTA label/url  
- Theme background + accent color  
- Sections (services/process/pricing/portfolio/testimonials/faq/contact/custom)  
- Links list  
- Publish toggle + slug  
- Preview  

#### Routes terkait

| Route | Akses | Fungsi |
|---|---|---|
| `/app/personal-site` | login | builder |
| `/site/preview` | login | full preview private |
| `/site/[slug]` | publik | published landing |

---

## 8. AI

### 8.1 Brain — `/app/brain`

Full-page AI chat (`AIChatPanel` variant fullpage). Floating panel juga ada di shell (kecuali di Brain).

#### Kemampuan

- Chat multi-turn + persistence conversation + auto title  
- Sidebar history  
- Export conversations API  
- Tool-calling ke data workspace  
- Action tools butuh konfirmasi UI  
- Voice UI terse + format IDR  

#### AI tools (read)

| Tool | Fungsi |
|---|---|
| `list_clients` / `get_client` | Daftar / detail klien |
| `list_projects` / `get_project` | Daftar / detail proyek |
| `list_tasks` / `get_task` | Daftar / detail tugas |
| `list_invoices` / `get_invoice` | Daftar / detail invoice |
| `get_workspace_summary` | Ringkas workspace |
| `list_workspace_members` | Anggota tim |
| `search_workspace` | Cari lintas entity |
| `list_prompts` / `get_prompt` | Prompt templates |
| `list_expenses` / `expense_summary` | Expense list + ringkas |
| `monthly_pl` | P&L bulanan |
| `project_pl` | P&L per proyek |
| `client_revenue` | Revenue per klien |
| `invoice_aging` | Aging piutang |
| `top_expense_categories` | Top kategori expense |
| `list_proposals` / `get_proposal` | Proposal |
| `list_contracts` / `get_contract` | Kontrak |
| `list_questionnaires` / responses | Kuesioner + jawaban |
| `list_recurring` | Expense recurring |
| `cash_flow_forecast` | Forecast cash flow |

#### AI tools (action, confirm UI)

| Tool | Fungsi |
|---|---|
| `update_task_status` | Ubah status task |
| `draft_invoice_reminder` | Draft reminder invoice |

#### Batas saat ini

- Belum pure vector RAG embeddings  
- AI usage di-track harian (`ai_usage_daily`)  

### 8.2 Prompt Studio — `/app/prompts`

- Library prompt templates per workspace  
- Generate dari template  
- History generations  
- Monthly usage stats  
- AutoFeedsStudio (komposer prompt lanjutan)

---

## 9. Komunikasi & support

### 9.1 Email suite — `/app/email`

- Compose draft  
- Save template  
- Send via Resend  
- Link opsional ke client/project  
- List messages + status  
- Delete draft/template  

Settings terkait: **Reply-To email** di tab **Branding & Invoice** (`/app/settings?tab=branding`).

Fallback outbound Reply-To: `replyToEmail` → `billingEmail` → email owner. Header **From** tetap `noreply@cubiqlo.com`.

### 9.2 Support Center — `/app/support`

- Ticket list + counts (`open`, `in_progress`, `resolved`, `closed`)  
- Create ticket  
- Link client/project/assignee  
- UI client-side management  

> Depth SLA/assignment email masih berkembang; fondasi ticket sudah ada.

### 9.3 Settings — `/app/settings`

Layout **tab** (deep-link `?tab=`):

| Tab | `?tab=` | Isi |
|---|---|---|
| **Workspace** | (default) | Nama workspace, currency default, tax |
| **Tim** | `team` | Invite member, ubah role, remove member (limit plan) |
| **Branding & Invoice** | `branding` | Logo, billing name/address/phone/email, **Reply-To email** |
| **Integrasi** | `integrations` | Google Calendar OAuth (return ke tab ini) |
| **Lainnya** | `more` | Link Billing + opsi tambahan |

Team manager:
- Invite member  
- Ubah role  
- Remove member  
- Limit invite mengikuti plan (`canInviteMember`)

### 9.4 Billing plan app — `/app/billing`

Bukan invoice klien — ini **langganan Cubiqlo**.

| Plan | Harga | Ringkas |
|---|---|---|
| **Free** | Rp 0 | 1 user, 3 klien, core project/task/invoice/time |
| **Solo** | Rp 49rb/bulan | unlimited clients, portal, AI, booking, proposal/kontrak |
| **Team** | Rp 99rb/bulan | 5 users, shared workspace, roles, advanced reports |

Bayar lewat **Pakasir QRIS**. Plan aktif setelah webhook payment sukses.

---

## 10. Halaman publik klien (token/slug)

| Route | Siapa | Fungsi detail |
|---|---|---|
| `/client-portal/[token]` | Klien | Portal branded + tabbed: **Overview / Projects / Folders / Invoices / Contact**. Header logo/billing workspace. Folders = file manager + **upload klien** (max 25MB). Deep-link `?tab=projects\|files\|invoices\|contact` + `projectId`/`folderId`. Download file client-visible (project-level & client-level). Invoice exclude archived. Contact pakai Reply-To fallback. |
| `/invoice/[token]` | Klien | Lihat invoice shared, status badge, line items, mark viewed |
| `/proposal/[token]` | Klien | Lihat + accept/decline proposal |
| `/contract/[token]` | Klien | Lihat + tanda tangan digital |
| `/intake/[token]` | Klien/lead | Isi kuesioner onboarding |
| `/booking/[slug]` | Publik | Book slot dari availability workspace |
| `/site/[slug]` | Publik | Landing page personal published |

### Keamanan publik

- Token di-hash (SHA-256) di DB  
- Expiry / revoke / already-submitted checks  
- Portal access logs + visit tracking  
- File/invoice visibility difilter server-side  

---

## 11. Alur kerja end-to-end (rekomendasi)

### A. Freelance retainer jam

1. Buat **Klien**  
2. Buat **Proyek** billing `hours` atau `package`  
3. Track kerja di **Waktu** (timer/manual)  
4. Buat **Invoice** → **Import Time** → review line items  
5. Send invoice + share link  
6. Catat payment → status `paid`  
7. Optional: arsip invoice lama  

### B. Project fixed fee

1. Klien + proyek `project`  
2. Breakdown **Tasks**  
3. Kirim **Proposal** → accept  
4. Kirim **Kontrak** → sign  
5. Invoice milestone manual  
6. Files & comments di project  

### C. VA package 40 jam

1. Paket di `/app/packages`  
2. Proyek `package` + kuota jam  
3. Timer entry men-consume kuota  
4. Progress bar klien/proyek = jam terpakai / total  
5. Invoice sisa/overage sesuai kesepakatan  

### D. Lead → client

1. Landing `/site/[slug]` atau booking  
2. Intake questionnaire  
3. Proposal  
4. Contract  
5. Convert jadi client ops penuh  

---

## 12. Status kamus (penting)

### Invoice

`draft → sent → viewed → paid`  
Cabang: `overdue`, `cancelled`, `archived`

- **Semua** di list = non-archived  
- **Arsip** = soft-hide dari operasi harian  

### Proposal

`draft, sent, viewed, accepted, declined, expired`

### Contract

`draft, sent, viewed, signed, declined, expired, revoked`

### Project

`draft, active, on_hold, completed, cancelled` (label UI bilingual)

### Task

- Status: `todo` / `in_progress` / `review` / `done`  
- Priority: `low` / `medium` / `high` / `urgent`  
- `clientVisible`, `sourceNoteId` (convert dari catatan)

### Time entry

`draft` / `approved` / `invoiced` + `billable` flag

### Client

`active` / `inactive` / `archived`

### Portal request

`pending` / `completed` / `cancelled` · type `document|approval|info|other`

### Package order / custom request

- Order: `pending` / `confirmed` / `invoiced` / `cancelled`  
- Custom request: `pending` / `approved` / `rejected`

### Support ticket

`open` / `in_progress` / `resolved` / `closed`

### File

Visibility `internal|client` · type `working_file|deliverable`

### Comment

Visibility `internal|client` · source `internal|portal` · entity `project|task|file|invoice|support_ticket`

---

## 13. API & otomasi (untuk advanced user/ops)

### Health

- `GET /api/health` → status app + DB  
- `GET /api/health/env` → audit env (guarded)

### Auth

- `/api/auth/[...all]` Better Auth handler  
- Sign-out endpoint  

### Domain API (lengkap route.ts)

| Area | Endpoint |
|---|---|
| Health | `GET /api/health`, `GET /api/health/env` |
| Auth | `/api/auth/[...all]`, `/api/auth/sign-out` |
| Clients | `POST /api/clients/create`, `GET .../export/pdf`, `GET .../[clientId]/export/pdf` |
| Invoices | `GET /api/invoices/[id]/pdf`, share generate/get |
| Time | `GET /api/time/active`, `.../export/pdf`, `.../export/pdf/va-timesheet` |
| Files | upload, download `[fileId]` |
| Expenses | receipt upload/download |
| Calendar | `GET /api/calendar/[appointmentId]/ics` |
| Contracts | `GET /api/contracts/[id]/pdf` |
| Portal | invoice PDF, request upload |
| Portal requests | `/api/portal-requests` |
| Notifications | list + reminders |
| Billing | checkout + `POST /api/webhooks/pakasir` |
| AI | chat, action, conversations, export |
| Settings | reply-to |
| Workspace | logo upload + public logo |
| Cron | expire-plans, invoice-overdue, personal-note-reminders, plan-reminders |

---

## 14. Batas plan & feature gates

1. Free: max 3 clients  
2. Team seats terbatas (invite guard)  
3. Template Center preview bisa di-gate email internal  
4. AI usage tracked (quota/plan dependent)  
5. Beberapa fitur “PARTIAL” (lihat `docs/feature-status.md`):
   - deep WA automation  
   - Google/Outlook calendar sync 2-way  
   - support SLA advanced  
   - landing builder v2 drag polish  

---

## 15. Tips UX harian

1. Pakai **Dashboard** tiap pagi untuk due items  
2. Timer start sebelum kerja, stop + isi deskripsi jelas  
3. Import time ke invoice, jangan ketik ulang jam  
4. Pakai status **Archived** daripada delete invoice historis  
5. Filter invoice by client + billing type saat periode tutup buku  
6. Portal token per klien — jangan share workspace login ke klien  
7. Proposal/kontrak: selalu set `validUntil`  
8. Package project: cek progress jam sebelum over-serve  
9. Notes recurrence untuk reminder admin (pajak, perpanjang domain, dsb.)  
10. Brain bagus untuk tanya “invoice outstanding klien X” — tetap verifikasi angka di Reports  

---

## 16. Peta route cepat

### Internal

```
/app/dashboard
/app/clients
/app/clients/new
/app/clients/[clientId]
/app/projects
/app/projects/[projectId]
/app/tasks
/app/time
/app/calendar
/app/files
/app/invoices
/app/invoices/new
/app/invoices/[invoiceId]
/app/packages
/app/expenses
/app/reports
/app/personal
/app/personal-site
/app/journal
/app/proposals
/app/proposals/new
/app/proposals/[proposalId]
/app/contracts
/app/contracts/[contractId]
/app/templates
/app/contract-templates/new
/app/contract-templates/[templateId]
/app/questionnaires
/app/questionnaires/new
/app/questionnaires/[questionnaireId]
/app/brain
/app/prompts
/app/email
/app/support
/app/settings
/app/billing
/onboarding

# redirects / legacy
/app/notes → /app/personal
/app/invoice-templates → /app/templates?tab=invoice
/app/invoices/templates → /app/templates?tab=invoice
/app/contract-templates → /app/templates?tab=contract

/app/search?q=&kind=
```

### Public

```
/
/login /signup /forgot-password /reset-password /verify-email /verify-email/success
/client-portal/[token]
/invoice/[token]
/proposal/[token]
/contract/[token]
/intake/[token]
/booking/[slug]
/site/[slug]
/site/preview
/privacy /terms
```

---

## 17. Coverage audit (2026-07-18 re-check)

| Area | Status docs | Catatan |
|---|---|---|
| Semua `page.tsx` internal + public | Covered / noted | 58 pages; legacy redirects dicatat |
| Sidebar modules | Covered | |
| Topbar controls | Covered (v2) | |
| Global search `/app/search` | Covered (v3) | ILIKE multi-entity + filter kind |
| Invoice list v0.1.64 | Covered | tabs + client/billing filter + archive + pagination |
| Portal package order/request | Covered (v2) | |
| AI tool list | Covered (v2) | 30+ tools |
| Status enums schema | Covered (v2) | |
| Full API route map | Covered (v2) | |
| Form field list (schema) | Covered (v3) | section 20 |
| Permission matrix per aksi | Covered (v3) | section 21 |
| Cron schedule exact times | Partial | endpoint ada; jadwal server ops di docs ops |
| WhatsApp / calendar sync | Explicit non-feature | TODO di feature-status |
| Screenshot UI per page | Partial | opsional QA visual |

**Verdict:** user guide operasional **v0.1.65** lengkap (routes + fields + roles + search).

---

## 18. Dokumen terkait di repo

| File | Isi |
|---|---|
| `docs/feature-status.md` | Status DONE/PARTIAL/TODO per fitur |
| `docs/feature.md` | Backlog ide fitur masa depan |
| `docs/ai-assistant.md` | Detail Brain/AI tools |
| `docs/cubicle_prd.md` | PRD awal |
| `docs/cubicle_ops.md` | Operasional deploy |
| `docs/cubicle_env.md` | Env vars |
| `docs/MANUAL_TEST_CHECKLIST.md` | QA manual |
| `CHANGELOG.md` | Riwayat rilis versi |
| `README.md` | Intro repo dev |

---

## 19. Changelog docs ini

- **2026-07-18** — initial full user guide (v0.1.64)
  - Cover all sidebar modules + public pages  
  - Invoice tabs/filters/archive/pagination terbaru  
  - Package progress, import time select-all, portal archive hide  
- **2026-07-18 (audit v2)** — gap fill setelah re-scan codebase
  - Topbar detail, floating AI, workspace switcher  
  - Modul non-sidebar + legacy redirects  
  - Portal request / package order / custom request  
  - File visibility + type, time status enum, task status exact  
  - AI tools table lengkap  
  - API route inventory  
  - Coverage audit section  
- **2026-07-18 (v3 / v0.1.65)**
  - Implement `/app/search` global search  
  - Form field list (section 20)  
  - Permission matrix owner/member/viewer (section 21)  

---

## 20. Form fields (schema / input)

Sumber: Zod schema di `src/lib/actions/*` + form components.

### Client

| Field | Required | Notes |
|---|---|---|
| `name` | yes | |
| `companyName` | no | |
| `email` | no | email valid / empty |
| `phone` | no | |
| `website` | no | |
| `address` | no | |
| `tags[]` | no | default `[]` |
| `internalNotes` | no | |
| `portalSlug` | no | slug 3–60, `a-z0-9-` |
| `portalSlugEnabled` | no | default true |
| `portalEnabled` | no | create: generate token 90 hari |

### Project

| Field | Required | Notes |
|---|---|---|
| `name` | yes | |
| `description` | no | |
| `clientId` | yes | uuid |
| `status` | | `draft\|active\|on_hold\|completed\|cancelled` |
| `billingType` | | `project\|hours\|package` |
| `currency` | | default IDR |
| `rate` / `budget` | no | number |
| `startDate` / `finishDate` / `dueDate` | no | string date |
| `clientVisible` | | default false |
| `selectedPackageId` | no | uuid package |

### Task

| Field | Required | Notes |
|---|---|---|
| `title` | yes | |
| `description` | no | |
| `projectId` | yes | create |
| `status` | | `todo\|in_progress\|review\|done` |
| `priority` | | `low\|medium\|high\|urgent` |
| `assigneeId` | no | |
| `dueDate` | no | |
| `clientVisible` | | default false |

### Invoice create / update

**Create:** `clientId*`, `projectId?`, `issueDate*`, `dueDate?`, `currency` (default USD di schema create), `notes?`, `terms?`  
**Update:** + `status` (`draft|sent|viewed|paid|overdue|cancelled|archived`), `discount`, `tax`  
**Item:** `description*`, `quantity`, `unitPrice`  
**Import time:** `invoiceId*`, `timeEntryIds[]*`  
**Payment:** `invoiceId*`, `amount*`, `paidAt*`, `method?`, `notes?`

### Time

**Start timer:** `workspaceId*`, `clientId*`, `projectId*`, `taskId?`, `description?`, `tags?`, `hourlyRate?`  
**Manual:** + `date*`, `durationMinutes*`, `billable` (default true)  
**Update:** description/tags/client/project/task/start/end/manualMinutes/billable/`status` (`draft|approved|invoiced`)

### Expense

`amount*`, `currency` (3 char, default IDR), `date*`, `description*` (max 500), `categoryId?`, `projectId?`, `clientId?`, `vendor?`, `taxIncluded`, `taxAmount?`, `receiptUrl?`  
**Category:** `name*`, `color` (#hex), `icon?`

### Package

`name*`, `hours?`, `price*`, `currency`, `description?`, `features[]?`, `badge?`, `sortOrder`, `active`, `customPrice?`, `minHours?`, `maxHours?`, `allowCustom`

### Personal note (owner-only)

`title*` (max 200), `body?` (max 20k), `dueDate?`, `recurrenceRule` (`none|daily|weekly|monthly|yearly`), `notify7d/3d/1d`, `pinned`  
Status note: `open|done|archived`

### Workspace branding

`billingName`, `billingEmail`, `billingPhone`, `billingAddress`, `taxId`, `logoUrl`, `defaultCurrency`, `defaultTaxRate` (0–100), `defaultHourlyRate`, `defaultInvoiceTerms`

### Support ticket

Create: title/body/priority (lihat form support)  
Delete ticket: **owner only**

### Proposal / Contract / Questionnaire / Email

Lihat section 6 & 9 — field utama: title/body/client/validUntil/line items (proposal), body template (contract), fields[] (questionnaire), to/subject/body (email).

---

## 21. Permission matrix (role × aksi)

Roles workspace: **owner** | **member** | **viewer**  
Helper: `assertWorkspaceWritable` = owner+member; `assertWorkspaceOwner` = owner only.

Legend: **Y** = allowed · **N** = blocked · **R** = read-only UI

| Aksi | Owner | Member | Viewer |
|---|---|---|---|
| Lihat dashboard / list entity | Y | Y | Y |
| Global search | Y | Y | Y |
| Create/update client, project, task | Y | Y | N |
| Archive client / project | Y | Y | N |
| Timer start/stop + time entry write | Y | Y | N |
| Invoice create/edit/item/import/payment/send/share | Y | Y | N (read list/detail ok) |
| Expense create/update/delete | Y | Y | N |
| Package CRUD + assign | Y | Y | N |
| File/folder upload/rename/delete | Y | Y | R |
| Comment create | Y | Y | N (umum writable) |
| Proposal / contract write + send | Y | Y | N |
| Questionnaire write + send | Y | Y | N |
| Email suite draft/send | Y | Y | N |
| Template create/update/delete (invoice/proposal/contract) | Y | Y | N |
| Support ticket create/update | Y | Y | N |
| Support ticket **delete** | Y | N | N |
| **Personal notes** (CRUD) | Y | N | N |
| Team: invite / change role / remove | Y | N | N |
| Remove owner / change owner role | N (MVP lock) | N | N |
| Workspace branding update | Y | Y | N |
| Billing / plan upgrade | Y (owner akun) | via plan user | via plan user |
| AI Brain read tools | plan gate | plan gate | plan gate |
| AI action tools (confirm UI) | plan + writable | plan + writable | N write |

### Plan gates (bukan role, per user plan)

| Fitur | Free | Solo | Team |
|---|---|---|---|
| Max clients | 3 | unlimited | unlimited |
| Max projects | 5 | unlimited | unlimited |
| Invoices / bulan | 10 | unlimited | unlimited |
| Workspaces | 1 | 3 | unlimited |
| Invite members | N | N | Y |
| Client portal | N | Y | Y |
| AI assistant | N | Y (15/hari) | Y (500/hari soft) |
| Max file size | 5 MB | 25 MB | 50 MB |

### UI `canWrite`

Topbar + banyak page: `role === "owner" || role === "member"`.  
Viewer: hide tombol +Baru, timer write, create dialogs.

---

**Maintainer note:** kalau ada fitur baru, update section route terkait + naikkan versi di header docs ini bersamaan bump `package.json`.
