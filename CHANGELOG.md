# Changelog

## v0.1.100 — 2026-07-22 — Notif dedupe + kurs ke tab Workspace

- Bell spam fix: `invoice_overdue` / `task_due_soon` dedupe (skip jika unread sama, cooldown 24h)
- Cron `cron-reminders.sh` tidak double-hit probe+POST lagi
- Cleanup notif duplikat lama di DB
- Kurs dashboard pindah Settings **tab Workspace** (bukan Branding)

## v0.1.99 — 2026-07-22 — Dashboard base currency (manual FX)

- Table `workspace_currency_rates` + Settings **Kurs dashboard** (tab Workspace)
- Rate manual: `1 USD = X IDR` (base = `defaultCurrency` workspace)
- Dashboard finance (revenue 30d, sparkline, pie) convert ke base currency
- Currency tanpa rate **di-skip**, warning + link Settings (tidak tebak kurs)
- Amount asli invoice/payment **tidak** diubah di DB

## v0.1.98 — 2026-07-22 — Dashboard declutter

- Greeting: cuma tanggal, hapus “X proyek aktif · Y tugas jatuh tempo”
- Kerja: hapus card **Tugas Jatuh Tempo** + **Invoice Jatuh Tempo** (sudah di Reminder)
- Hapus card **Timer Aktif** di dashboard (sudah di navbar)

## v0.1.97 — 2026-07-21 — Portal branding + client folder upload

- Header portal: logo workspace (fallback monogram), billing name/address/kontak
- Tab Folders: **Upload file** + drag-drop (max 25MB, validate extension/magic bytes)
- Endpoint `POST /api/client-portal/files/upload` (token auth, visibility=client)
- Download portal dukung file client-level (tanpa project)
- Notif in-app `client_file_uploaded` ke workspace members

## v0.1.96 — 2026-07-21 — Portal tabs + file manager

- Hapus card **Active** di portal (chip active projects tetap)
- Portal dipecah tab: Overview / Projects / Folders / Invoices / Contact
- Deep-link `?tab=projects|files|invoices|contact`
- Tab **Folders**: file manager (project → folder → file, breadcrumb, download)
- Folders/files scoped visibility client; `?projectId=&folderId=`

## v0.1.95 — 2026-07-21 — Branding Reply-To + owner fallback

- Reply-To pindah ke tab **Branding & Invoice** (bukan Integrasi)
- Helper `resolveWorkspaceReplyTo`: `replyToEmail` → `billingEmail` → email owner
- Outbound email (invoice, booking, team invite, email suite) pakai helper
- Portal contact email ikut fallback yang sama
- From tetap `noreply@cubiqlo.com` (SPF/DKIM aman); balasan klien lewat Reply-To

## v0.1.94 — 2026-07-21 — Settings tab groups

- Settings page dipecah ke tab: Workspace / Tim / Branding & Invoice / Integrasi / Lainnya
- Deep-link `?tab=team|branding|integrations|more`
- Google Calendar OAuth return land di tab Integrasi

## v0.1.93 — 2026-07-21 — Timer ↔ task link + bell/reminder separation

- **Start timer dari task**: tombol di task detail sheet → auto-link client/project/task + deskripsi = judul task
- **Auto-map deskripsi**: pilih task di timer widget / timesheet edit / manual entry → deskripsi isi judul (bisa diedit)
- **Bell ≠ Reminder**: copy UI bedakan inbox event (bell) vs active to-do dashboard (reminder)
- Project tasks query: ikut `projectId` + `projectName` biar start timer dari project tab aman

## v0.1.92 — 2026-07-21 — Portal request report/meeting + top summary

- **Request Report / Request Meeting** di client portal: dialog form + simpan ke `portal_requests` + notifikasi in-app ke workspace members
- Admin client tab Portal: badge **From client** untuk request dari portal
- Portal top summary: Active / By project / By hours / By package / Due invoice / Reminder
- List Requests & Reminders tampil di portal (approve/upload/mark done)

## v0.1.91 — 2026-07-21 — Stop timer no dialog

- Klik stop = hentikan langsung, tanpa form/dialog
- Navbar + halaman timer sama: simpan entri apa adanya, lengkapi nanti di timesheet

## v0.1.90 — 2026-07-21 — Stop timer optional + client export/DB fix

- **Stop form optional**: client/project/task/deskripsi boleh kosong; batal dialog = timer tetap jalan; lengkapi nanti di timesheet
- **DB live**: apply `clients.client_number` + backfill `CLI-######` + trigger assign
- **Export client xlsx** (single + bulk): Nama, Custom ID, Contact Person, Perusahaan, Email, Nomor Telepon, Alamat, Website, Status
- Docker build: `NODE_OPTIONS=--max-old-space-size=2048` anti OOM thrash

## v0.1.89 — 2026-07-21 — Weekly product revision: timer, dashboard, portal, invoice

- **Navbar timer quick-start**: klik mulai langsung (tanpa redirect ke /app/time); deskripsi + klien/proyek diisi saat stop
- Timer running: opsi **Stop** + **Pause/Resume**; batal dialog stop tidak matikan timer
- **Dashboard**: buang quick-action redundant (timer/invoice/klien); gabung reminder; finance 30-hari di sidebar kanan; ringkas active projects + overdue tasks di greeting
- **Client**: export Excel (satuan + bulk) kolom nama/custom ID/contact/status/telepon; email+phone di bawah header; auto `CLI-000001`
- **Task**: kolom nama assignee
- **Client portal**: by project + pie progress; hours per task; badge **NEW** invoice (belum dilihat klien); status invoice di kanan dekat download PDF
- **Mail invoicing**: workspace template body custom + placeholder `{{client_name}}` `{{invoice_number}}` `{{project_name}}` `{{amount}}` `{{due_date}}` `{{invoice_link}}`
- DB: `invoices.client_first_viewed_at`, `workspaces.invoice_email_body`

## v0.1.88 — 2026-07-19 — Invoice payment currency + timesheet range

- Section **Pembayaran**: format uang pakai currency invoice (bukan hardcode Rp)
- **Ekspor Timesheet** di edit invoice: dialog pilih range tanggal (bulan ini/lalu/custom)

## v0.1.87 — 2026-07-19 — Restore clean homepage

- Revert Google OAuth branding homepage patches
- Landing page back to clean marketing copy (pre-branding attempt)

## v0.1.86 — 2026-07-19 — Stronger Google OAuth branding homepage

- Header text **Cubiqlo** + Privacy/Terms links visible
- About section: purpose EN/ID + why Google Calendar access
- Explicit app name match statement for consent screen reviewers

## v0.1.85 — 2026-07-19 — Homepage branding for Google OAuth

- Homepage H1 exact **Cubiqlo** (match OAuth consent app name)
- Purpose block EN + ID above the fold for Google branding verification

## v0.1.84 — 2026-07-19 — Time list pagination

- Menu **Waktu**: list max **10 entri/halaman** + prev/next
- Total/filter summary tetap hitung semua hasil filter

## v0.1.83 — 2026-07-19 — Client Google Calendar CRUD + pagination

- Tab client Calendar: **buat / edit / hapus** event langsung ke Google Calendar klien
- List event max **10 per halaman** (prev/next)
- Form: judul, mulai–selesai, lokasi, catatan

## v0.1.82 — 2026-07-19 — Client Google Calendar (per-client)

- Clients → detail → tab **Calendar / Meetings**
- Connect Google Calendar **klien** via invite link (tanpa login Cubiqlo)
- Status connect/disconnect + list event Google klien (terpisah dari calendar user)
- Tabel `client_google_calendar_connections`
- Routes: `/api/integrations/google-calendar/client-invite/[token]`, result page `/client-gcal`

## v0.1.81 — 2026-07-19 — Google Calendar sync

- Settings → **Google Calendar**: connect/disconnect OAuth.
- Token disimpan terenkripsi AES-256-GCM di `google_calendar_connections`.
- Public booking auto-create Google event; cancel appointment hapus event (best-effort).
- Env: `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, optional `GOOGLE_REDIRECT_URI` / `GOOGLE_TOKEN_ENCRYPTION_KEY`.
- Redirect URI default: `https://cubiqlo.com/api/integrations/google-calendar/callback`.

## v0.1.79 — 2026-07-19 — Sortable table headers

- Reusable `SortableHeader` + `useTableSort` (3-state: ASC → DESC → default).
- Sortable columns on Tasks, Projects, Clients, Invoices, Proposals, Contracts, Expenses, Questionnaires.
- Project tasks list view: same 3-state column sort.

## v0.1.78 — 2026-07-19 — Project status: archived

- Project status enum + form + tabs: tambah **archived** / Diarsipkan.
- `archiveProject` sekarang set `status=archived` (bukan `cancelled`).
- Portal: project archived ikut bucket arsip (bersama completed/cancelled).
- Badge/status color untuk archived sudah ready.

## v0.1.77 — 2026-07-19 — Projects status tabs + client/package filters

- Projects list: status tabs (All / Active / Draft / On Hold / Completed / Cancelled) with counts.
- Filter by client and package (`selected_package_id`).
- Empty state adapts when filters return no rows.

## v0.1.76 — 2026-07-19 — Prompt Studio regroup tabs

- Prompt Studio: 2-level tabs — group by output type (Visual Iklan / Feed Series / Produk / Copy & Video), then mode di dalam group.
- Ganti grouping lama Design/Feed/Produk/Konten yang gak cocok isi.

## v0.1.75 — 2026-07-19 — Workspace rename + Prompt Studio cleanup

- Settings: owner-only **edit nama workspace**.
- Prompt Studio: hapus banner "Brief → prompt", flat tabs (Design Grafis, Typography Ads, dll) styling seperti invoice tabs.
- Cost/token visual prompt: hitung dari usage API + estimateCost (bukan hardcode $0.0000), revalidate setelah generate.

## v0.1.74 — 2026-07-19 — Hide PERSONAL for invited members

- Sidebar **PERSONAL** (Catatan / Landing Page / Jurnal) hanya tampil untuk **owner** workspace.
- Direct URL non-owner → redirect `/app/dashboard` (no error card).
- Access rule tetap owner-only di `personal-notes` actions.

## v0.1.73 — 2026-07-19 — Prompt Studio cleanup + tabs

- Hapus section **Generate** (template form) dari `/app/prompts`.
- Redesign AutoFeedsStudio: group tab (Design/Feed/Produk/Konten) + pill mode.
- Layout rapi: brief kiri, output kanan, history full-width, stats di header.
- Hapus `prompt-form.tsx` unused.

## v0.1.72 — 2026-07-19 — Invoice PDF: no paid fallback

- `Paid`/`Dibayar` hanya sum **Catatan Pembayaran** — no fallback ke total invoice.
- Belum ada payment row → `Paid = 0` (sama seperti section Pembayaran di edit invoice).
- Header **Paid** hanya jika sum payment >= total; status `paid` saja tidak cukup.

## v0.1.71 — 2026-07-18 — Invoice PDF: paid amount from payments

- PDF ambil total dibayar dari **Catatan Pembayaran** (`payments`).
- Header: **Paid** = sum payment; **Amount Due** = total − paid (bukan hardcode 0).
- Blok totals: baris Paid + Amount Due.

## v0.1.70 — 2026-07-18 — Invoice PDF: full white background

- Page background force `#ffffff`.
- Box thank-you/payment netral putih (hapus soft ungu).

## v0.1.69 — 2026-07-18 — Invoice PDF: header full white

- Hapus stripe ungu + hero box ungu soft di atas PDF invoice.
- Border header netral abu; background header full putih seragam.

## v0.1.68 — 2026-07-18 — Invoice PDF: detail report under description

- Pindah blok **Detail report** ke langsung di bawah tabel Description (sebelum totals).

## v0.1.67 — 2026-07-18 — Invoice PDF: detail report link

- PDF invoice (`/api/invoices/[id]/pdf`) tampil blok **Detail report** + URL full timesheet.
- URL: `/api/time/export/pdf/va-timesheet?report=full&clientId=…(&projectId=…)`.
- Portal client PDF tetap tanpa link (timesheet butuh login workspace).

## v0.1.66 — 2026-07-18 — Invoice: link ekspor timesheet full

- Detail invoice: tombol **Ekspor Timesheet** → `/api/time/export/pdf/va-timesheet?report=full` (sama full export di menu Waktu).
- Prefill filter `clientId` (+ `projectId` kalau invoice punya proyek).

## v0.1.65 — 2026-07-18 — Global search + docs completeness

- Halaman `/app/search` (topbar search sekarang land ke hasil nyata).
- Search klien/proyek/tugas/invoice via ILIKE + filter kind.
- USER_GUIDE: form field list (sec 20) + permission matrix role×aksi (sec 21).

## v0.1.64 — 2026-07-18 — Invoice list toolbar polish

- Tab status pakai `TabsList`/`TabsTrigger` (sama styling Clients/Projects).
- Filter klien + jenis proyek sejajar baris tab (kanan di desktop).

## v0.1.63 — 2026-07-18 — Invoice list: filter client + jenis proyek

- Filter dropdown klien + jenis billing (Per Jam / Per Paket / Per Proyek / Tanpa proyek).
- URL query `?clientId=&billing=` tetap hidup bareng tab status + pagination.
- Kolom Proyek + Jenis di tabel list.

## v0.1.62 — 2026-07-18 — Invoice archive tab

- Status baru `archived` (Arsip) di schema + Edit Invoice + badge.
- Tab **Arsip** di list invoice; tab **Semua** exclude arsip biar list utama bersih.
- Portal klien: arsip disembunyikan + gak masuk outstanding.

## v0.1.61 — 2026-07-18 — Invoice list: status tabs + pagination

- Tab status: Semua / Draf / Terkirim / Dilihat / Terlambat / Lunas / Dibatalkan (count badge).
- Pagination 10 invoice/halaman (`?status=&page=`), prev/next + "Menampilkan X–Y dari Z".
- Tab kosong (non-core) disembunyikan biar gak ramai.

## v0.1.60 — 2026-07-18 — Import time: Select All lebih jelas

- Tombol `Pilih Semua (N)` outline + master checkbox sticky di atas list.
- Indeterminate state saat sebagian dipilih; clear selection; fix double-toggle checkbox.

## v0.1.59 — 2026-07-18 — Client projects: package progress by hours

- Tab Proyek di client detail: progress bar package pakai % jam billable terpakai / kuota paket (bukan task done).
- Label: `X.Y/40 jam terpakai` + nama paket. Warna bar: hijau <80%, oranye ≥80%, amber ≥100%.
- Hours billing: tampil jam tercatat (tanpa progress task). Project billing: tetap task progress.

## v0.1.58 — 2026-07-18 — Invoice detail: project + billing type

- Header invoice: tampil nama proyek + label billing (Per Jam / Per Paket / Per Proyek).
- Package: tampil nama paket + jam (mis. Starter 40 Jam (40 jam)).
- Form Edit Invoice: blok read-only konteks proyek (bukan field editable).

## v0.1.57 — 2026-07-18 — Import time by project + line desc project name

- Import time list: filter by `invoice.projectId` (bukan semua time klien). Invoice tanpa project tetap client-wide.
- Server `importTimeEntries`: reject time beda project/client dari invoice.
- Line item desc import: `Project — deskripsi` (PDF/client-facing).
- UI list import: tampil nama project di subtitle.
- Backfill deskripsi item time_entry yang belum ada prefix project.

## v0.1.56 — 2026-07-18 — Import time rate preview + create rate fallback

- List import time: rate preview pakai entry → project → workspace default (project package gak kelihatan 0).
- Create timer/manual entry: fallback rate sama (bukan cuma project hourly).
- Repair unbilled time entries rate kosong di Alip Testing → 250k.

## v0.1.55 — 2026-07-18 — Invoice create UX + time import restore

- **Buat invoice**: tombol loading `Membuat invoice…`, hard redirect ke detail invoice baru (mobile gak stuck di form).
- **Hapus item time**: restore time entry status `approved` (bisa di-import ulang, gak hilang).
- **Import time rate 0**: fallback project rate (semua billing type) + workspace default; persist rate ke time entry.
- Data repair Alip Testing: orphaned invoiced times restored, zero-rate line items + totals INV-0001/INV-0008, default hourly rate 250k.

## v0.1.54 — 2026-07-18 — Fix invoice number collision

- Create invoice gagal (`INV-0002 already exists`) karena counter stale setelah seed.
- Generator nomor: selalu `max(counter, MAX(existing INV-####)+1)` di dalam transaction.
- Sync counter workspace Alip Testing ke next `INV-0008`.
- Error duplicate → pesan user-friendly (bukan opaque RSC digest).

## v0.1.53 — 2026-07-18 — Contextual back client → project

- Client tab Proyek → project pakai `?from=client`.
- Project detail: back **Kembali ke [Client]** + buka client di `?tab=projects` (bukan always All Projects).
- Dari list All Projects: back tetap **Kembali ke Proyek**.

## v0.1.52 — 2026-07-18 — Templates Soon gate + project billing labels

- **Templates**: badge **Soon** di sidebar. User non-preview cuma liat halaman Soon (gak buka center). `alipdevcom@gmail.com` tetap bisa buka full UI, badge Soon tetap ada.
- **Project detail**: tampil jenis billing **Per Jam / Per Proyek / Per Paket** + hint + rate/budget.
- **Client → tab Proyek**: badge billing type + ringkas rate/budget/paket.

## v0.1.51 — 2026-07-18 — Mobile/tablet nav + header polish

- **Topbar compact**: phone max ~4 controls (menu, search icon, New, notif, avatar). Search expand full-width; timer idle hide on phone; AI + workspace switcher pindah ke avatar menu di mobile.
- **Sidebar**: overlay sampai **lg** (tablet gak nge-squeeze content). Width `min(280px, 85vw)`.
- **Page headers**: clients/calendar/tasks/projects/time/invoices stack di mobile, title `text-xl→2xl`, label tombol pendek.
- Loading skeleton match breakpoint baru.

## v0.1.50 — 2026-07-18 — Portal task approve / revisi

- Client portal: task status `review` + client-visible → tombol **Setujui** / **Minta revisi** + note opsional.
- Approve → task `done`. Revisi → task `in_progress`, note append di description.
- Notif workspace + activity log (`client_approved_task` / `client_requested_task_revision`).
- Badge “Menunggu review kamu” sekarang punya aksi beneran.

## v0.1.49 — 2026-07-18 — Portal contact copy clean

- Hapus teks “Portal gak menerima komentar…”. Card “Hubungi Tim” cuma judul + tombol WA/Email.

## v0.1.48 — 2026-07-18 — Portal Recent Activity compact

- Default tampil **3** item, tombol “Lihat N lainnya” (max pool **5**).
- Group spam task: `Task added` sejenis se-project se-hari → `3 tasks added in …`.
- Time entry: **1** terbaru per project (bukan 5).
- Project created: cuma kalau ≤ 30 hari.

## v0.1.47 — 2026-07-18 — Portal: no comments, WA/email only

- Hapus form + thread komentar di client portal (project accordion + bottom “Message Your Team”).
- Ganti tombol **WhatsApp** + **Email** (`billingPhone`, `replyToEmail`/`billingEmail`).
- Hapus server action `createPortalComment` + komponen portal comment form.
- Comment internal app (team) tetap ada.

## v0.1.46 — 2026-07-18 — P3 polish

- **Stale Server Action**: `isStaleServerActionError` helper; auto-reload di client/project form + app `error.tsx` recovery UI.
- **Error shape**: `createClient` soft-fail `{ok:false, PLAN_LIMIT}` (sama pola project); toast limit plan.
- **Portal approval loop**: type `approval` → Approve / Request changes + note; admin lihat badge decision.
- **Questionnaire mobile**: card list di mobile, table desktop; i18n via `cubiqlo_lang`.
- **Dashboard money clarity**: label USD terpisah; note multi-currency tidak dijumlah.
- **Journal**: filter mood + tag/search tetap; export ikut filter.

## v0.1.45 — 2026-07-18 — P2 product polish

- **PROD-004 task vs time**: helper banner di Tasks + Time Tracking (tugas = checklist, timer = jam billable).
- **PROD-005 time tags**: tag opsional di timer + manual entry; chip preset; gak hardcode default "Research".
- **PROD-006 files daily driver**: filter All/Internal/Client/Deliverable; toggle visibility + tipe per file; deliverable auto client-visible.
- **PROD-007 team invite**: plan gate UX + link upgrade; email undangan via Resend; pending-signup path kalau user belum daftar.
- **PROD-008 portal activation**: checklist cara pakai; full shareable link + open; copy token sekali.
- **PROD-009 onboarding first-win**: step "Aktifkan portal klien" di dashboard checklist.

## v0.1.44 — 2026-07-18 — Logo invoice: upload file (bukan cuma URL)

- Settings → Branding: **Upload logo** (PNG/JPG/WebP/GIF/SVG, max 2MB) via same-origin `POST /api/workspace/logo` → R2.
- Serve public: `GET /api/public/workspace-logo/[workspaceId]` (PDF + preview klien + cache bust `?v=`).
- Hapus logo: `DELETE /api/workspace/logo`.
- URL manual tetap ada (toggle “Atau pakai URL”) buat CDN eksternal.

## v0.1.43 — 2026-07-18 — P1: client dialog, package currency, notes, invoice, branding

- **BUG-013/014 client edit**: `ClientEditDialog` controlled + `max-h-[90vh] overflow-y-auto` + close on success.
- **BUG-015 package currency**: form default dari workspace `defaultCurrency` (bukan hardcode IDR).
- **BUG-016 expense tabs**: `Link` tab pakai `scroll={false}` + prefetch (kurang jump).
- **BUG-017 notes collapse**: card default compact (body preview 160 chars); Expand buka edit/convert.
- **BUG-018 notes tab**: revalidatePath sudah cover personal; list reset expand saat tab/query ganti.
- **BUG-009/010 invoice**: loading skeleton `/invoices/new`; form create label “Membuat invoice…”; **Edit Invoice** card + tombol **Simpan invoice** (meta status/tax/notes/terms).
- **BUG-011/012 branding**: Settings → **Branding & Invoice** (logo URL + billing fields); public `/invoice/[token]` render logo; PDF sudah pakai `logoUrl`.
- **BUG-019 toast delete**: “Item dihapus” / “Generation dihapus” (bukan English generic).
- **BUG-020 sidebar PERSONAL**: label `Catatan`/`Jurnal` map i18n benar.
- **PROD-002 time→invoice rate**: fallback entry → project hours rate → workspace `defaultHourlyRate`.
- **PROD-001 reports**: sudah group per currency (no cross-currency sum) — keep as-is.

## v0.1.42 — 2026-07-18 — P0: plan limit, portal, timer, sheet, upload

- **BUG-001/003 plan limit UX**: banner + upgrade link di `/app/projects` (mirror clients); tombol Upgrade clients → `/app/billing`; `createProject` soft-return `{ok:false, error}` + toast (bukan throw → Next digest).
- **BUG-002 portal create**: form client punya checkbox **Aktifkan portal sekarang** (default ON create); insert set `portalEnabled` + generate token.
- **BUG-006 timer loncat jam**: manual entry set `startTime`+`endTime` (bukan end null); active-timer query exclude `manual_minutes`; legacy open manual rows closed in DB.
- **BUG-007 cascade time**: manual entry + timer widget filter client→project→task ketat (no fallback all).
- **BUG-008 sheet auto-close**: shared `portaled-popper-guard` dipakai Dialog + Sheet (task sidebar Select aman).
- **BUG-004/005 upload**: CSP `connect-src` allow `*.r2.cloudflarestorage.com`; same-origin proxy `/api/files/upload` + `/api/expenses/receipt` (hindari CORS/CSP block browser).

## v0.1.41 — 2026-07-18 — Fix: klik Currency trigger (bukan opsi) nutupin dialog

- Bug real: saat dropdown Currency **sudah terbuka**, klik lagi pada **SelectTrigger** (kotak IDR) → dialog New Package nutup + form hilang. Klik opsi list (IDR/USD/…) aman.
- Root cause: Select Content pakai `disableOutsidePointerEvents` → body `pointer-events:none`. Trigger kelihatan, hit-test jatuh ke **Dialog Overlay** → Dialog dismiss. Flag capture-phase v0.1.40 cuma nge-track klik di listbox/option, bukan klik overlay saat layer open.
- Fix `DialogContent`: selama portaled Select/Popover open, **semua** pointer event di-capture sebagai "nested interaction" (flag 200ms) + treat `role=combobox` sebagai select. Select tutup dulu; dialog tetap buka. Klik luar kedua kali baru tutup dialog.
- Select v2.3.0 **tidak** punya prop `modal` — jangan andalkan itu.

## v0.1.40 — 2026-07-18 — Dialog tetap buka saat reselect opsi Select sama

- Bug: di modal (contoh **New Package**), klik opsi Select yang sudah terpilih (IDR → IDR) menutup dialog + input hilang.
- Root cause: Radix Select unmount item sebelum deferred `pointerDownOutside`/`interactOutside` Dialog; `composedPath()` sering kosong → guard lama miss.
- Fix: `DialogContent` track interaksi portaled popper di capture phase (`pointerdown`/`click`) + guard `onFocusOutside`; selector cover Select/Dropdown/Popover/Combobox.
- Scope global: semua dialog yang pakai Select ikut aman (project, expense, package, availability, dll).
- Bonus: `/app/packages` crash `JSON.parse` features non-JSON (legacy plain text seed) → parse aman (JSON array ATAU multiline text).

## v0.1.39 — 2026-07-17 — Fix public proposal 500 (formatMoney Client Component)

- Root cause: server page pass function `formatMoney` ke client component `ProposalPublicView` → Next.js 500 (`Functions cannot be passed directly to Client Components`).
- Fix: import `formatMoney` dari `@/lib/utils` di dalam client component; hapus prop function dari public page.
- QA seed non-destructive: `scripts/seed-qa-manual.mjs` + docs `QA_TEST_READY.md` / `MANUAL_TEST_CHECKLIST.md`.

## v0.1.38 — 2026-07-15 — Sidebar: auto-open group aktif (Sales/Template)

- Group **Penjualan/Sales** auto expand saat route di dalamnya (`/app/templates`, proposal, kontrak, editor template).
- Accordion tetap: buka section aktif, Kerja tetap terbuka.
- Fix item active ke-hide karena default `Penjualan: false`.

## v0.1.37 — 2026-07-15 — Template Center: tab Proposal + tabs kiri

- **Tab Proposal**: table `proposal_templates` + actions CRUD/duplikat/set-default; dialog scope + currency + PPN + DP.
- **TabsList kiri**: `justify-start` + `w-auto` (bukan full-width center).
- URL: `?tab=proposal` sync; header quick-link **Buat proposal**.
- Migration: `drizzle/0027_proposal_templates.sql` (sudah push live).
- Verified: health 200 · healthy · bundle `0.1.37` (`listProposalTemplates` / `setDefaultProposalTemplate` di chunks).

## v0.1.36 — 2026-07-15 — Template Center UX: tab URL sync, duplikat, set default

- **Tab ↔ URL**: ganti tab update `?tab=invoice|contract|prompt` (`router.replace`, no scroll jump); Suspense boundary untuk `useSearchParams`.
- **Card actions**: Edit · Duplikat · Hapus; kontrak + **Penuh** (editor) + **Default** (set default 1-klik).
- **Actions**: `duplicateInvoiceTemplate`, `duplicateContractTemplate`, `setDefaultContractTemplate`.
- **Entry points**: Invoice list Template → `/app/templates?tab=invoice`; `/app/invoices/templates` redirect ke center.
- Verified live: health 200, container healthy, bundle `0.1.36` (Duplikat / setDefaultContractTemplate di chunks). Login QA browser skip (credential 401).

## v0.1.31 — 2026-07-15 — Jurnal polish: tabs arsip, edit, i18n mood

- **Tabs Aktif / Arsip** on `/app/journal` (status filter via `listPersonalNotes`).
- **Edit inline** entri (title/tags/mood/body) + **restore** dari arsip + **hapus permanen**.
- **i18n mood/placeholder**: label Suasana ID (Senang/Biasa/…), placeholder tag & isi bilingual.
- Empty state jelas per tab; export disabled saat kosong.
- Verified live: create “QA Journal Day” 🔥 + tags; arsip list 2 entri + Pulihkan; bundle `0.1.31` health 200.

Versi aplikasi mengikuti `package.json` (`version`) dan otomatis tampil di sidebar
lewat `NEXT_PUBLIC_APP_VERSION`. Naikkan versi di `package.json` setiap rilis,
lalu tambahkan entri di sini.

## v0.1.35 — 2026-07-15 — Hapus menu Template Kontrak (redundant)

- Sidebar: buang **Template Kontrak** (dobel dengan **Template**/Pusat Template).
- `/app/contract-templates` list → redirect ke `/app/templates?tab=contract`.
- Keep editor: `/app/contract-templates/new` + `/app/contract-templates/[id]`.
- Builder back/save/delete → Pusat Template tab kontrak.
- Verified live: redirect OK, sidebar cuma Template, health 200 bundle `0.1.35`.

## v0.1.34 — 2026-07-15 — Template Center + Template Kontrak polish

- **Pusat Template (`/app/templates`)**: title/tabs/actions ID; invoice form adds currency+PPN; contract form default body + correct `{{client.name}}` vars + default flag; links to invoice/contract tools.
- **Template Kontrak list**: full i18n (no "New template"/"contracts"), usage count query batched, link back to Template Center.
- **Builder**: ID labels, default body ID, variable helper ID, toast, delete confirm ID.
- **Actions**: auth list/create/update/delete; unique default template; workspace-scoped delete/update; revalidatePath.
- **`/app/invoice-templates`**: redirect to `/app/templates?tab=invoice`.
- Verified live: Pusat Template Invoice(1)/Kontrak(0); contract-templates empty state ID; health 200 bundle `0.1.34`.

## v0.1.33 — 2026-07-15 — Kontrak polish: status tabs, activity date fix, detail i18n

- **List**: status filter tabs + counts; activity follows real status (no false "Draf"); valid-until under title; resend for sent/viewed.
- **Detail**: full i18n (status badge, Back→Semua kontrak, Download PDF→Unduh PDF, Signed/Declined/body labels); meta Status/Valid/Created; send/resend+copy; revoke; delete guard (block signed).
- **Body**: normalize literal `\n`; create dialog default body ID + toast.
- **Actions**: revalidatePath create/update/send/revoke/delete; delete scoped to workspace.
- Verified live: tabs Semua 3 / Terkirim 1 / Ditandatangani 2; detail Mimi Amilia Terkirim + Kirim ulang/Cabut/Hapus; health 200 bundle `0.1.33`.

## v0.1.32 — 2026-07-15 — Proposal polish: status tabs, activity date fix, detail i18n

- **List**: status filter tabs + counts; activity label follows real status (no more "Draf" on sent/accepted seed data); valid-until under title; resend action for sent/viewed.
- **Detail**: full i18n (status badge, All proposals, Line items, Tax→Pajak, Scope→Cakupan); meta cards Total/DP/Valid until; send/resend + copy link; delete (blocked if accepted); scope `\n` normalize.
- **Actions**: `revalidatePath` on create/update/send/delete; delete guard for accepted proposals.
- New page: empty-client guard + back link.
- Verified live: list tabs 3 total; detail Mobile App Terkirim + DP 25% + Kirim ulang/Hapus; health 200 bundle `0.1.32`.

## v0.1.30 — 2026-07-15 — Catatan optional: priority convert, reverse link, infinite scroll

- **Priority picker** on convert note→task (low/medium/high/urgent).
- **Reverse link task↔note**: `tasks.source_note_id` + `personal_notes.converted_task_id`; note shows "Buka task terkait"; task list "Dari catatan" + sheet "Buka di Catatan"; `?focus=` opens task sheet.
- **Infinite scroll / load-more**: client list loads 25, IntersectionObserver + "Muat lebih banyak", `loadMorePersonalNotes` server action.
- Guard: note already converted cannot convert again.

## v0.1.29 — 2026-07-15 — Catatan: recurrence auto-roll, convert→task, pagination

- **Recurrence auto-roll**: mark done on recurring note advances due (daily/weekly/monthly/yearly) and stays open; cron `/api/cron/personal-note-reminders` rolls past-due open recurring notes first (`rolled` in response).
- **Convert note → task**: pick project → creates todo task (assignee=self, due from note) + archives note; redirects `/app/tasks?focus=`.
- **Pagination**: 25/page with prev/next + count ranges; status counts via SQL `GROUP BY`.
- Verified live: cron rolled weekly due past→future; browser convert “QA convert note” → task on project Test; health 200 bundle `0.1.29`.

## v0.1.28 — 2026-07-15 — Harden Catatan/Jurnal: status, reminder cron, tabs, hide system notes

- **P0 status normalize**: live `personal_notes.status='active'` (6 rows) → `open`. Schema + UI + cron + dashboard konsisten `open|done|archived`.
- **P0 reminder cron**: `/api/cron/personal-note-reminders` + columns `last_reminded_{7,3,1}d` (dedupe 20h). `scripts/cron-reminders.sh` load hanya `CRON_SECRET`/`CUBICLE_URL` (hindari parse `.env` rusak), hit generic reminders **dan** personal-note cron. Smoke: sent 1 then 0 (dedupe).
- **P0 label**: remind = **hari** (7d/3d/1d), bukan “jam”.
- **Catatan UI** (`/app/personal`): tabs Aktif/Selesai/Arsip/Semua, recurrence **select** (label-only, no fake free-text engine), overdue badge, restore arsip, confirm delete, i18n `t()`, hide system titles `[journal]`/`[site]`.
- **Jurnal**: filter non-archived, archive button + confirm, empty state jujur, i18n search/export.
- **Callers** personal-site/preview: `includeSystem: true` supaya `[site]` tetap kebaca.
- **Dashboard** upcoming reminders: status `open` + hide system titles.
- Verified live v0.1.28 healthy; browser Catatan tabs + Arsip restore; Journal 0/0 (archived Day 1 hidden).

## v0.1.27 — 2026-07-15 — Harden halaman Reports: multi-currency integrity, AR, cashflow

- **P0 multi-currency integrity** (`app/reports/page.tsx`): collection health / overdue / outstanding **tidak lagi sum lintas currency** (bug `Rp 3.886.200` = 3.885.000 IDR + 1.200 USD). Semua KPI money multi-line via shared `formatMoney` (`$` glyph, bukan `USD …`).
- **AR aging**: exclude `draft`/`paid`/`cancelled` — hanya `sent`/`viewed`/`overdue`. Remaining = total − partial payments. Draft Rp 24.420.000 tidak lagi inflate Current.
- **Project expenses**: group by project+currency; **tidak** hardcode IDR (fix Website Redesign `Rp 270.010` palsu → `Rp 270.000` + `$10.00`). Claim income palsu di description dihapus.
- **Label jujur**: KPI window = **6 bulan** (bukan YTD dusta). Top clients / top expenses tetap calendar YTD.
- **Cashflow**: bucket **Sudah terlambat** + 3 bulan ke depan; remaining partial-payment aware; hide empty month noise di P&L.
- **Top clients unpaid**: partial-payment aware (sum payments per invoice).
- **i18n**: string utama lewat `t()`; empty months disembunyikan.
- Verified live: `tsc --noEmit` 0, docker build + deploy healthy, health 200, browser `/app/reports` collection `45% IDR · 52% USD`, overdue `Rp 3.885.000 · $1,200`, project expenses multi-line. Commit `3580332`.

## v0.1.26 — 2026-07-15 — Overhaul halaman Expenses: multi-currency, edit, filter, kategori, rutin, struk, CSV

- **P0 multi-currency KPI** (`app/expenses/page.tsx`): income & net dihitung per currency (join `payments` × `invoices.currency`). Tidak ada lagi sum USD+IDR jadi satu angka IDR palsu. Spent/income/net tampil multi-line (`formatMoney` per currency). Breakdown kategori bar-scale pilih currency dominan (prefer IDR).
- **List ops**: month picker, search deskripsi/vendor, filter kategori, pagination 25/page, kolom klien, amount `whitespace-nowrap` via `formatMoney`.
- **Edit expense UI** (`edit-expense-button.tsx` + form mode edit) — pakai `updateExpense` yang sudah ada.
- **i18n penuh** form + delete dialog + semua string baru lewat `useT()` / `createT()`.
- **Quick-add compact**: amount + description + category default; advanced expand (vendor/project/client/currency/tax/receipt).
- **Category manager** tab: create/edit/delete kategori (warna preset).
- **Recurring manager** tab: CRUD rutin, pause/resume, generate-now (`createRecurring`/`updateRecurring`/`deleteRecurring`/`generateFromRecurring`).
- **Receipt upload** R2 presigned PUT (`getExpenseReceiptUploadUrl` / `getExpenseReceiptDownloadUrl`); tax optional di form.
- **Export CSV** (`exportExpensesCsv` + tombol client) filter-aware (month/category/q).
- Verified live: `tsc --noEmit` 0 error, docker build + deploy `cubicle-cubicle-1` healthy, health 200, browser test multi-currency KPI + tabs Rutin/Kategori. Commit `e84411a`.

## v0.1.25 — 2026-07-14 — Katalog paket workspace reusable + input waktu & PDF sadar billing-type

- **Katalog paket level workspace** (`app/packages/page.tsx` + `components/packages/package-catalog.tsx` baru): paket (mis. 40/60/100 jam) kini dibuat sekali sebagai template reusable, bukan diketik ulang per proyek. Skema `packages.projectId` diubah jadi nullable (migrasi `ALTER TABLE packages ALTER COLUMN project_id DROP NOT NULL`); `projectId = NULL` menandai paket katalog workspace. Action baru `getWorkspacePackages`, `createWorkspacePackage`, `assignPackageToProject` (assign paket ke proyek + set `billingType = "package"`). Menu "Paket" ditambah di grup Keuangan sidebar.
- **Field tarif kondisional di input waktu** (`components/time/timer-widget.tsx` + `manual-entry-form.tsx`): input "Tarif per jam" hanya muncul kalau proyek terpilih bertipe by-hours (`billingType === "hours"`). Untuk proyek flat-fee/package, tarif diwarisi otomatis dari proyek — field disembunyikan supaya tidak membingungkan. Query `time/page.tsx` kini ikut load `billingType` + `rate` per proyek. Manual-entry dapat hint "Kosongkan untuk pakai tarif proyek".
- **Fix perhitungan paket di ekspor PDF** (`/api/time/export/pdf/va-timesheet`): sebelumnya proyek tipe `package` salah dihitung `(menit/60) × rate` → hasil Rp 0 karena paket tidak punya hourly rate, dan harga paket tidak masuk total. Sekarang harga paket diperlakukan sebagai **fixed fee sekali per proyek** (seperti flat fee), konsisten di grand total, subtotal per-klien, sel per-entry (tag "paket"), dan amount level-proyek di dashboard report.
- Verified: `tsc --noEmit` 0 error, build + deploy container `cubicle-cubicle-1` healthy (BUILD_ID `INuR-rYiSxEtAx3iWHzcd`), create paket workspace terverifikasi live di browser (paket "Paket Hemat" tampil di katalog). Commit `b47ca84`.

## v0.1.24 — 2026-07-14 — Fix bug mata uang timesheet + lokalisasi penuh Waktu + polish list Proyek & badge portal Klien

- **Fix bug ikon mata uang ganda di timesheet** (`components/time/timesheet.tsx`): badge tarif dulu render `<DollarSign>` hardcode DI DEPAN hasil `formatRate` yang sudah punya simbol sendiri → USD tampil "$ $13.00", IDR tampil "$ Rp 25". Buang ikon hardcode; sekarang bersih "$13.00 / jam" & "Rp 25 / jam" sesuai currency proyek.
- **Lokalisasi penuh timesheet:** durasi `h/m` → `j/mnt` (ikut bahasa), tanggal entri pakai `locale` (DD/MM/YYYY untuk ID, sebelumnya `toLocaleDateString()` tanpa arg → MM/DD/YYYY). Card summary (Total Waktu/Bisa Ditagih/Entri), semua label & item filter (Klien/Proyek/Bisa Ditagih/Tag/Dari/Sampai), empty state, "Tanpa judul"/"Tidak diketahui" — semua lewat `t()`.
- **Polish visual list Proyek** (`app/projects/page.tsx`): badge status dulu polos abu-abu → tambah dot berwarna (`statusColors`: hijau=aktif, biru=selesai, dst) di badge desktop & mobile. Rebalance grid kolom (Jatuh Tempo 1→2, Aksi 2→1) supaya header "Jatuh Tempo" tidak pecah dua baris & alignment lurus.
- **Badge portal Klien** (`app/clients/page.tsx`): teks badge kolom Portal "Aktif" → "Nyala"/"On" supaya tidak dobel-baca dengan badge kolom Status "Aktif".
- Verified live di cubiqlo.com (tsc 0 error, container healthy v0.1.24, browser test: timesheet bersih tanpa dollar ganda + tanggal DD/MM + durasi j/mnt, list proyek badge berwarna + header satu baris). Commit `26b516d`.

## v0.1.23 — 2026-07-14 — Lokalisasi detail proyek + UX Tugas (auto-filter, board view, fix Kanban)

- **Lokalisasi penuh halaman detail proyek** (`app/projects/[projectId]/page.tsx`): header (Kembali ke Proyek, Klien, Ubah), badge status pakai `projectStatusVariant` (variant + label ID), semua tab (Tugas/Berkas/Waktu/Komentar/Linimasa), `actionLabels` timeline, empty state (Tanpa judul/Tidak diketahui/Sistem). Tanggal & waktu pakai `locale`.
- **Fix warna card Kanban bentrok** (`components/tasks/kanban-board.tsx`): buang `border-l-4` + `priorityColors` warna prioritas di kiri card yang tabrakan visual dengan dot status kolom. Card sekarang border netral (`border-border`), warna hanya di badge prioritas.
- **Filter Tugas auto-apply** (`components/tasks/task-filters.tsx` baru): konversi form filter ke client component; pilih dropdown langsung `router.push` (buang tombol Filter manual). Label dropdown ke-4 diperjelas jadi "Semua Petugas / Ditugaskan ke".
- **Toggle List/Board di halaman Tugas global** (`task-view-toggle.tsx` + `tasks-board-view.tsx` baru): mode Papan read-only grouped by status (4 kolom), card tampil judul/proyek/prioritas/assignee, klik buka detail sheet. State via `?view=board`.
- **Toggle Papan/Daftar di tab Tugas detail proyek** (`project-tasks-tab.tsx` baru): wrapper client dengan state lokal — Papan pakai `KanbanBoard` (drag-and-drop tetap fungsional), Daftar pakai tampilan tabel (Judul/Ditugaskan/Jatuh Tempo/Prioritas/Status) dengan detail sheet on click.
- **Progress bar proyek compact:** `p-4 h-3` → `p-3 h-2`, due date dipindah ke header inline (hemat ruang vertikal).
- Verified live di cubiqlo.com (tsc 0 error, container healthy, HTTP 200, browser test login test user: lokalisasi + Kanban + auto-filter + toggle board dua arah). Commit `66ccfc2` + `87fd7e5`.

## v0.1.22 — 2026-07-14 — Currency-aware timesheet + ekspor PDF sadar billing-type

- **Fix currency timesheet:** `formatRate` di `timesheet.tsx` dulu hardcode `IDR`; sekarang pakai `currency` dari project (query `time/page.tsx` load field `currency`). Rate USD tampil `$13.00`, IDR tampil `Rp 25` sesuai project — sebelumnya semua dipaksa `Rp`.
- **Timer widget:** dropdown proyek difilter per klien terpilih, task difilter per proyek terpilih (mencegah salah assign lintas klien). Rate otomatis diwarisi dari `project.rate` bila kolom tarif dikosongkan saat start timer.
- **Ekspor PDF billing-type-aware** (`/api/time/export/pdf/va-timesheet`): query join `packages` + load `billing_type`, `rate`, `currency`, `hours`. Helper baru `formatMoney` (currency-aware, IDR tanpa desimal), `entryAmount`, `sumByCurrency`, `renderMoneyMap` (multi-currency `$X + RpY`).
  - `hours`/`package`: amount = jam × rate efektif (entry rate override project rate).
  - `project` (flat fee): entry tampil tag `biaya tetap`, fee dihitung sekali per project di level klien/total (bukan per entry).
  - `package`: badge tipe + catatan kuota `(terpakai Xh / Yh)`.
  - Dashboard report: tambah kolom `JUMLAH TAGIHAN` per project + badge billing-type.
- Verified live di cubiqlo.com (tsc 0 error, container healthy, HTTP 200, browser test ketiga billing type). Commit `2f63d28`.

## v0.1.21 — 2026-07-14 — Lokalisasi ID + versioning otomatis

- Lokalisasi UI app ke Bahasa Indonesia di 29 file: halaman Proyek, Tugas (board kanban + tabel), Waktu (timer, entri manual, timesheet, ekspor PDF/CSV), Workspace Pribadi, Kuesioner, plus komponen tersebar (expenses, proposals, files, comments, calendar, portal, prompts, invoice templates).
- Terpusatkan label status/prioritas di `src/lib/status-badge.tsx` (task, project, invoice, priority) supaya konsisten lintas halaman.
- Tanggal jatuh tempo proyek pakai locale `id-ID`.
- Versioning: `package.json` jadi sumber versi tunggal, di-inject ke bundle lewat `next.config.ts` (`env.NEXT_PUBLIC_APP_VERSION`); sidebar baca env, bukan hardcode lagi. Sebelumnya sidebar hardcode `v0.1.21` sementara `package.json` masih `0.1.0` (tidak sinkron).

## 2026-07-08 — Package billing + portal redesign

- Added "By Package" billing type: packages table, admin CRUD per project, custom pricing (custom_price, min/max hours, allow_custom).
- Custom package request flow: client requests custom hours via portal slider, auto-estimates price, saves to custom_package_requests table.
- Package order flow: "Take This Package" button with confirm modal, saves to package_orders table.
- Admin-assigned packages: admin selects package in project form, portal shows "by hours" style with package total/used/remaining hours + progress bar.
- Portal redesign: hero summary (4 cards with icons), quick actions bar, activity feed (8 recent events), accordion projects (one-at-a-time expand), unified invoices table split IDR/USD with PDF buttons, single "Message Your Team" contact form.
- Migrations: 0023 (package_custom_pricing), 0024 (custom_package_requests), 0025 (package_orders), 0026 (project_selected_package).
- Latest commit: `67aed7f feat: portal redesign — activity feed, compact accordion, unified invoices, quick actions`.

## 2026-07-07 — Cubiqlo meeting P1 execution

- Added client PDF exports: single client and bulk combined PDF.
- Added project billing type (`by project` / `by hours`) plus start and finish dates.
- Added time entry tags and expanded PDF reporting options.
- Simplified sidebar/navigation: moved billing and support to avatar menu, hid email, removed nodes, renamed personal area toward Notes.
- Added navbar timer quick actions.
- Fixed task modal close after save and generalized form close-before-refresh behavior for client/project/invoice/task forms.
- Latest deployed commit after this batch: `2babd61 fix: close forms before refresh`.

## 2026-07-07 — P0 dashboard fixes from meeting plan

- Completed P0 dashboard reorder: `REMINDER` → `KERJA` → `KEUANGAN`.
- Removed client health card and restored invoice card as `Invoice Jatuh Tempo` per follow-up request.
- Fixed `Tugas Jatuh Tempo` and `Invoice Jatuh Tempo` counts to use due-date based queries.
- Compacted `Aktivitas Terbaru` to latest 5 rows.
- Added client-side Jakarta-time dashboard greeting that updates every 60 seconds.
- Refined dashboard greeting spacing.
- Fixed global select/modal close bug by preventing Dialog outside-close on Radix Select portal interactions.
- Updated `docs/meeting-2026-07-06-cubiqlo-plan.md` with P0 progress status.

## 2026-07-05 — Docs sync + personal landing page publishing

- Added `docs/feature-status.md` with full feature inventory, current status, shipped scope, partial/process items, and next build order.
- Added public personal landing pages via `/site/[slug]`; default live URL verified at `/site/alip`.
- Added private full-page preview route `/site/preview`.
- Expanded `/app/personal-site` builder with slug, publish toggle, editable sections, links, theme label, accent color, dashboard preview, and `Open live page` action.
- Verified live health: `/api/health` returns `{"status":"ok","db":"ok"}` and `/site/alip` returns `HTTP/2 200`.

## 2026-06-29 — Phase 4B templates + personal note edit/search

- Added `email_templates` table and migration `drizzle/0014_p4b_email_templates_note_edit.sql`.
- Added email template create/update/delete actions and template section on `/app/email`.
- Added personal note edit action and inline edit UI on `/app/personal`.
- Added personal note search via `/app/personal?q=...`.
- Updated Phase 4 docs with shipped/remaining scope.

## 2026-06-29 — Phase 4 email suite + personal workspace v0

- Added `/app/email` with compose, save draft, send now via existing Resend helper, optional client/project linking, and recent email log.
- Added `email_messages` table and activity logs for draft/send/failure/delete.
- Added `/app/personal` with user-scoped private notes, pin/unpin, done/open, archive, and delete.
- Added `personal_notes` table.
- Added sidebar entries for `Komunikasi → Email` and `Personal → Personal`.
- Added `docs/phase-4-email-personal-workspace.md` with strict P4 MVP scope and deferred items.
- Verified migration applied to production Docker DB, `npm run lint`, and `npm run build` pass.

## 2026-06-29 — Phase 3N viewer mutation guards

- Guarded `/api/settings/reply-to` with authenticated workspace-owner authorization before mutating workspace reply-to email.
- Guarded `/api/ai/action` task-status updates and invoice-reminder sends with owner/member workspace write checks.
- Verified fresh TRST viewer account receives 403 for reply-to update, AI task status update, and AI invoice reminder direct requests.
- Verified `npm run lint`, `npm run build`, Docker rebuild, `/api/health`, and production smoke pass.

## 2026-06-29 — Phase 3L final launch QA

- Fixed native invoice share route auth by reading session from route request headers and updating invoice token hash directly.
- Verified production public invoice link for `TRST-P3L-1782725600` returned 200 and marked invoice viewed.
- Verified R2 upload/download/delete against production bucket with disposable QA object.
- Verified client portal visibility allowlist: visible project/task shown, internal project/task sentinels hidden.
- Verified monitor script healthy on production host.
- Updated launch QA decision to technical launch QA pass with remaining paid-launch caveats for Pakasir live payment and real external alert delivery.

## 2026-06-29 — Phase 3M client creation native fallback

- Moved client creation from flaky modal/hydration flow to dedicated `/app/clients/new` page.
- Added classic POST route `/api/clients/create` so core client creation works without client-side JS.
- Verified production DB row for `TRST Phase3M2 Native Client 1782725507`.
- Verified lint, build, Docker health, `/api/health`, and production smoke after deploy.

## 2026-06-29 — Phase 3K workspace bootstrap hardening

- Made workspace auto-bootstrap idempotent: reuse existing owner workspace, recover existing slug, and insert membership with conflict ignore.
- Fixed fresh-account workspace race that could raise duplicate `workspaces_slug_unique` and break first client/project actions after signup.
- Verified `npm run lint`, `npm run build`, Docker rebuild, `/api/health`, and production smoke pass.
- Production QA: fresh signup/login works; client creation succeeds when form submit fires; project creation select and invoice share flow remained usable from Phase 3J retest.

## 2026-06-29 — Phase 3I project form + invoice share action fixes

- Replaced project creation client ID text field with workspace client select when creating projects from `/app/projects`.
- Set invoice share-link generate/revoke buttons to `type="button"` to prevent accidental form-submit behavior in nested/interactive layouts.
- Verified `npm run lint`, `npm run build`, Docker rebuild, `/api/health`, and production smoke pass.

## 2026-06-29 — Phase 3H deeper product QA pass

- Created `TRST Deep QA Client` through production UI.
- Verified client detail, project detail with task count, and invoice detail page using TRST QA account.
- Seeded QA project/task/invoice records for page verification after browser automation could not complete project select cleanly.
- Noted invoice share-link click did not create token in this browser run; kept as manual follow-up.
- Updated `docs/launch_qa_result.md` with Phase 3H status.

## 2026-06-29 — Phase 3G test account + credentialed QA smoke

- Created new `TRST QA` production test account via signup and marked email verified for QA.
- Verified login, dashboard, clients page, billing owner buttons, and reports quick actions on production.
- Updated `docs/launch_qa_result.md` with credentialed QA smoke status and remaining deeper manual checks.

## 2026-06-29 — Phase 3F launch QA execution

