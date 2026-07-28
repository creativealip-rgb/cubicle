# Cubiqlo — Project, Service, Package, Task, Activity, dan Time Tracking Plan

**Tanggal:** 2026-07-27  
**Status:** Approved product direction — Phase 0A containment live; Phase 0B development gate complete dengan documented follow-up sebelum public handoff/production cutover
**Owner:** Alip  
**Prepared by:** Wowo  
**Repo:** `/root/projects/cubicle`

### Audit eksekusi 2026-07-27

- `dev.cubiqlo.com` aktif sebagai production-build preview (`NODE_ENV=production`), bukan HMR, dengan DB `cubicle_dev` dan Redis terpisah.
- Normalized schema dump `cubicle_dev` dan `cubicle` identik pada audit ini.
- Ledger `cubicle_dev` migration `0043`–`0045` sudah direkonsiliasi berdasarkan schema proof dan checksum tanpa replay DDL.
- `scripts/migrate-ledger.sh` sekarang mewajibkan `DB_NAME` eksplisit dan menolak target production tanpa acknowledgement khusus.
- Akun QA sintetis tersedia hanya di `cubicle_dev`; login, session, dan authenticated dashboard smoke lulus.
- `docs/operations/dev-environment.md` sudah mengikuti runtime production-build preview aktual.
- Audit source lulus `npx tsc --noEmit`, full Vitest (`61` file, `311` test), behavioral DB integration (`10` checks), migration runner integration, dan production build.

---

## 1. Tujuan

Merapikan mental model Cubiqlo agar cocok untuk freelancer, remote worker, dan small agency yang:

- menjual jenis pekerjaan berbeda-beda;
- memakai billing fixed project, hourly, atau package;
- punya Task operasional berbeda di setiap project;
- kadang tidak membutuhkan timer;
- sering sudah terbiasa dengan pola My Hours;
- membutuhkan proposal, invoice, client portal, delivery, dan profitability dalam satu sistem.

Plan ini menjadi source of truth arah produk untuk:

- tiga billing type Cubiqlo;
- penggunaan Service;
- pemisahan Package dan Service;
- posisi Task Kanban;
- Activity reusable untuk timer;
- hubungan Time Entry dan description;
- project tanpa timer;
- migrasi kompatibel dari implementasi sekarang.

---

## 2. Keputusan produk yang dikunci

```text
Billing Type = bagaimana client membayar
Service      = apa yang freelancer/agency jual
Package      = bundle satu atau beberapa Service
Project      = engagement kerja untuk client tertentu
Task         = pekerjaan konkret yang harus selesai
Activity     = kategori waktu reusable
Time Entry   = kejadian pencatatan waktu aktual
Description  = detail pekerjaan pada satu sesi
```

### Aturan utama

1. Pertahankan tiga billing type: `project`, `hours`, `package`.
2. Service tidak hanya dipakai oleh `By Package`.
3. Service menjadi katalog penawaran komersial workspace-wide.
4. Semua billing type boleh memiliki nol, satu, atau banyak Service.
5. Package menjadi bundle dari satu atau banyak Service.
6. Task tetap tugas konkret/kanban, bukan kategori timer.
7. Tambahkan Activity sebagai kategori timer reusable ala My Hours/Harvest.
8. Time Entry mereferensikan Activity dan opsional Task; description tetap independen.
9. Jangan embed log di Task. Banyak Time Entry mereferensikan Task/Activity lewat foreign key.
10. Project dapat mematikan timer tanpa kehilangan Task, Service, invoice, file, atau portal.
11. Gunakan snapshot nama, scope, unit, dan harga saat Service/Package masuk Project.
12. Archive katalog; jangan hard-delete data yang sudah dipakai histori.
13. `time_tracking_mode` wajib ditegakkan di server action/API, bukan hanya hide UI.
14. MVP Package adalah one-off allowance; recurring/reset period di luar scope sampai model period dikunci.
15. Semua harga, currency, allowance, dan included Service dari portal harus di-resolve dan di-snapshot server-side.
16. Satu user hanya boleh memiliki satu active timer per workspace; enforcement wajib atomik di DB.
17. Portal password memakai HttpOnly session; raw bearer token tidak boleh dikirim kembali ke browser atau disimpan pada order/request history.
18. Package yang masuk Project menjadi `project_package_assignment` dengan snapshot komersial one-off; direct FK ke katalog bukan kontrak historis.
19. Project Service dan Package assignment menyimpan currency snapshot selain harga/scope.
20. Timer chronology target memakai `timer_segments`; `time_entries.start_time` lama dipertahankan selama compatibility window.

---

## 3. Temuan implementasi Cubiqlo sekarang

### Yang sudah benar

- `projects.billingType` mendukung `project | hours | package`.
- `By Project` mempunyai budget.
- `By Hours` mempunyai hourly rate.
- `By Package` dapat memilih katalog workspace melalui `selectedPackageId`.
- Task adalah objek operasional dengan status, priority, assignee, due date, dan visibility.
- `time_entries.task_id` sudah mereferensikan Task.
- Satu Task secara teknis sudah dapat direferensikan banyak Time Entry.
- Timer tersimpan server-side dan tetap berjalan setelah tab ditutup.
- Manual entry, pause/resume, billable, rate, approval status dasar, invoice integration, dan report sudah ada.

### Gap konsep sekarang

- Tabel dan action bernama `packages`, tetapi UI menggunakannya sebagai `Service`.
- Service hanya muncul ketika billing type `package`.
- Satu Project hanya memilih satu item lewat `selectedPackageId`.
- Service dan Package belum benar-benar terpisah.
- Timer menggunakan Task Kanban sebagai pilihan tracking.
- Memilih Task otomatis menyalin `task.title` ke `time_entries.description`.
- Task dan description menjadi duplikat, bukan dua konteks berbeda.
- Belum ada reusable Activity khusus timer.
- Belum ada setting timer per Project.
- Manual duration berisiko membentuk timestamp `00:00` semu.
- Pause menggeser `startTime`, sehingga durasi benar tetapi waktu mulai asli tidak terjaga.
- Portal authority, bearer-token containment, timer tenant/ownership guard, active-timer uniqueness, dan invoice-time eligibility sudah dikandung oleh Phase 0A.
- Behavioral DB integration untuk cross-workspace mutation, timer ownership, concurrent start, dan invoice idempotency masih perlu membuktikan containment Phase 0A secara runtime.
- Navigation sudah menampilkan label `Service`, tetapi route/schema/action tetap model Package lama; test registry navigasi drift.

### File terkait saat ini

```text
src/db/schema.ts
src/lib/actions/time.ts
src/lib/actions/packages.ts
src/components/forms/project-form.tsx
src/components/time/timer-widget.tsx
src/components/time/timesheet.tsx
src/components/app-topbar.tsx
src/app/api/time/active/route.ts
src/app/(app)/app/time/page.tsx
src/app/(app)/app/packages/
```

---

## 4. Mental model final

### Service

Pertanyaan: **Apa yang dijual kepada client?**

Contoh:

- Website Development
- API Development
- Brand Identity Design
- SEO Article Writing
- Email Management
- Social Media Management
- Strategy Consultation

Karakter:

- reusable lintas client dan Project;
- punya deskripsi komersial;
- punya pricing model dan default price/rate;
- dapat dipakai di proposal, Project scope, Package, dan invoice;
- bukan kartu Kanban;
- bukan kategori timer.

### Project

Pertanyaan: **Untuk client siapa engagement ini dijalankan?**

Project menyimpan:

- client;
- billing type;
- currency;
- budget/rate/package;
- tanggal;
- Service yang dibeli;
- Task delivery;
- time tracking mode;
- files, comments, invoices, dan portal visibility.

### Task

Pertanyaan: **Pekerjaan konkret apa yang harus selesai?**

Contoh:

- Implement checkout validation
- Draft article “Remote Hiring Guide”
- Schedule week-2 posts
- Prepare logo presentation v2

Karakter:

- berbeda tiap Project;
- status, assignee, deadline, priority, checklist/comment;
- dapat `done`;
- dapat memiliki banyak Time Entry;
- hubungan ke Project Service opsional.

### Activity

Pertanyaan: **Jenis waktu apa yang sedang dicatat?**

Contoh:

- Research
- Writing
- Design
- Development
- Testing
- Meeting
- Revision
- Client Communication
- Administration

Karakter:

- reusable workspace-wide;
- dapat diaktifkan per Project;
- bukan Task Kanban;
- tidak punya status/deadline;
- menjadi dimensi report dan timer;
- dapat punya default billable/rate, tetapi Project override lebih kuat.

### Time Entry

Pertanyaan: **Apa yang benar-benar dikerjakan pada sesi ini?**

Contoh:

```text
Project: Vendor Portal — Acme
Activity: Development
Related Task: Implement invoice endpoint
Description: Added pagination and authorization checks
Duration: 2h 15m
Billable: yes
```

Description milik Time Entry. Task title tidak lagi disalin permanen ke description.

---

## 5. Billing type final

## 5.1 By Project

Client membayar fixed fee untuk scope atau hasil.

```text
Project: Website Company Profile
Billing: By Project
Fixed fee: Rp15.000.000
Services:
- UI/UX Design
- WordPress Development
- Content Migration
```

### Timer default

`internal`

Timer dipakai menghitung cost dan profitability, bukan jumlah invoice client.

Portal client fokus pada:

- progress;
- milestone;
- deliverable;
- invoice;
- files/comments.

Jam dapat disembunyikan.

## 5.2 By Hours

Client membayar waktu aktual.

```text
Project: Monthly Development Support
Billing: By Hours
Rate: $20/hour
Services:
- Web Development
- Technical Support
```

### Timer default

`billable`

Timer menjadi fitur utama. Activity disarankan wajib. Task tetap opsional. Invoice mengambil approved billable entries.

## 5.3 By Package

Client membeli bundle atau allowance.

```text
Package: Dedicated VA — 60 Hours
Services:
- Email Management
- Calendar Management
- Data Entry
Price: $550 one-off
Allowance: 60 hours sepanjang engagement
```

Package dapat memakai allowance:

- `hours`;
- `units`/deliverables;
- `mixed`;
- `unlimited`/fair use.

### Timer default

- Package hours: `billable` atau `usage`.
- Package output/unit: `internal` atau `off`.

Project menunjukkan used, remaining, dan usage percentage bila allowance terukur.

---

## 6. Time tracking mode per Project

Tambahkan field:

```text
off       = timer tidak digunakan
internal  = waktu dicatat untuk cost/profitability, bukan dasar tagihan
billable  = waktu menjadi dasar billing/usage client
```

Default:

```text
By Project → internal
By Hours   → billable
By Package → ditentukan allowance package
```

Admin dapat override.

### Saat `off`

Sembunyikan:

- Start Timer;
- Activity selector;
- Timesheet section pada Project;
- hourly rate/time KPI;
- time entry CTA di Task.

Tetap tampilkan:

- Services/scope;
- Tasks;
- files;
- comments;
- invoice;
- portal;
- progress.

Log historis tidak dihapus saat mode berubah ke `off`; tampilkan read-only melalui history/report bila ada.

---

## 7. Service dan Package

## 7.1 Service catalog

Service adalah atomic offering.

Field MVP:

```text
name
description
category
pricing_model: fixed | hourly | unit | recurring
unit: project | hour | day | item | month
default_price
currency
active/archived
```

Service tersedia untuk semua billing type.

## 7.2 Project Service snapshot

Ketika Service ditambahkan ke Project, buat instance/snapshot.

```text
project_services
- project_id
- service_id nullable
- name_snapshot
- description_snapshot
- pricing_model_snapshot
- quantity
- unit
- unit_price
- amount
- included_allowance
- sort_order
- status
```

Alasan snapshot:

- negosiasi client tidak mengubah katalog;
- edit harga katalog tidak mengubah kontrak lama;
- invoice/report historis tetap benar;
- Service dapat diarsipkan tanpa merusak Project.

Project boleh memiliki nol, satu, atau banyak Project Service.

## 7.3 Package

Package merupakan bundle reusable.

```text
Package: Launch Content Kit
Included Services:
- Content Strategy × 1
- Landing Page Copy × 1
- SEO Article Writing × 3
- Social Post Copy × 10
```

Data inti:

```text
packages
package_items
```

Saat Package dipilih ke Project:

- snapshot Package metadata;
- snapshot included Service lines ke `project_services`;
- izinkan custom scope/rate tanpa mengubah template Package.

## 7.4 Route dan naming

Target:

```text
/app/services  = Service catalog
/app/packages  = Package builder/catalog
```

Route lama `/app/packages` saat ini perlu migrasi bertahap karena sudah dipakai sebagai katalog yang dilabel Service.

---

## 8. Timer UX final

Urutan field:

```text
Client
Project
Activity
Related Task (optional)
Work description
Tags
Billable
Rate (hanya jika user punya permission)
```

### Kompatibilitas dengan user My Hours

Onboarding copy:

> Pilih Project dan Activity seperti memilih Project dan Task di My Hours. Related Task menghubungkan waktu ke pekerjaan Kanban Cubiqlo. Description menjelaskan pekerjaan sesi ini.

Jangan gunakan dua label `Task` dalam timer.

Label Indonesia:

- Aktivitas
- Tugas terkait — opsional
- Deskripsi pekerjaan

### Start dari Task

Saat timer dimulai dari halaman Task:

- preselect `task_id`;
- preselect Project;
- jangan simpan Task title sebagai description;
- tampilkan Task title sebagai context/placeholder;
- user dapat memilih Activity;
- description tetap independen.

### Satu Task, banyak log

```text
Task: Implement checkout

Logs:
- Development · Added validation · 2h
- Testing · Covered edge cases · 1h
- Revision · Applied review feedback · 45m
```

Total Task dihitung dari agregasi Time Entry, bukan disimpan sebagai log array di Task.

---

## 9. Data model target

```text
services
- id
- workspace_id
- name
- description
- category_id
- default_pricing_model
- default_unit
- default_price
- currency
- status
- created_at
- updated_at

service_categories
- id
- workspace_id
- name
- color
- sort_order

packages
- id
- workspace_id
- name
- description
- default_price
- currency
- allowance_type: hours | units | mixed | unlimited
- allowance_value
- status: active | archived

Catatan MVP: Package bersifat one-off sepanjang engagement. Recurring Package membutuhkan `project_package_instances`, cadence, period start/end, reset, dan carry-over policy; jangan memakai label `/month` sebelum model itu diimplementasikan.

Legacy Package yang memakai copy `/month` tidak boleh otomatis ditafsirkan sebagai one-off. Klasifikasikan sebagai `legacy_recurring_unmodeled` dan read-only sampai owner memilih migrasi per Project; row count, assignment, price, currency, hours, dan usage harus tetap identik.

package_items
- id
- package_id
- service_id
- quantity
- unit
- unit_price
- included_allowance
- sort_order

projects
- ...existing
- billing_type
- time_tracking_mode
- activity_required boolean default false

project_package_assignments
- id
- workspace_id
- project_id
- source_package_id nullable
- name_snapshot
- description_snapshot
- price_snapshot
- currency_snapshot
- allowance_type_snapshot
- allowance_value_snapshot
- assigned_at
- status: active | archived

project_services
- id
- project_id
- service_id nullable
- package_item_id nullable
- name_snapshot
- description_snapshot
- pricing_model_snapshot
- quantity
- unit
- unit_price
- currency_snapshot
- amount
- included_allowance
- source_package_assignment_id nullable
- sort_order
- status

activities
- id
- workspace_id
- name
- default_billable
- default_hourly_rate nullable
- status

project_activities
- project_id
- activity_id
- enabled
- rate_override nullable
- billable_override nullable

tasks
- ...existing
- project_service_id nullable

time_entries
- ...existing
- entry_type: timer | duration | interval
- activity_id nullable untuk legacy/uncategorized
- project_service_id nullable/derived
- description independent
- billing_rate_snapshot
- billing_currency_snapshot
- cost_rate_snapshot nullable (Phase Profitability)
- cost_currency_snapshot nullable (Phase Profitability)
- work_date + duration_seconds untuk duration-only entry
- original_started_at

timer_segments
- id
- time_entry_id
- started_at
- ended_at nullable

invoice_items
- ...existing
- time_entry_id nullable
- project_id nullable
- project_service_id nullable
- package_assignment_id nullable
- previous_time_entry_status nullable
- name/description/quantity/unit/unit_price/currency snapshots

Constraint minimum:
- unique partial active timer per `(workspace_id, user_id)`;
- unique `(project_id, activity_id)` pada `project_activities`;
- normalized active Service/Activity name unik per workspace;
- quantity, price, amount, allowance tidak negatif;
- semua relasi Project/Service/Activity/Task wajib satu workspace;
- satu Time Entry hanya dapat ditautkan ke satu invoice item aktif;
- histori memakai `RESTRICT` atau `SET NULL`, bukan cascade delete.
```

---

## 10. Rate resolution

Untuk hourly/billable entry:

```text
1. Explicit permitted entry override
2. Project Activity override untuk Activity-based billing
3. Project Service override untuk Service-based billing
4. Client-specific Service rate (future)
5. Project rate
6. Service/Activity default rate
7. Workspace default rate
```

Simpan hasil akhir sebagai billing rate snapshot beserta currency pada Time Entry/invoice line. Field `hourly_rate` lama diperlakukan sebagai billing rate snapshot legacy; jangan membuat dua sumber rate paralel. Jangan mutasi rate Time Entry ketika invoice dibuat dan jangan hitung histori memakai rate terbaru.

Normal member tidak boleh override rate tanpa permission. Profitability memakai cost rate snapshot terpisah dari billing rate.

---

## 11. Time entry lifecycle dan hardening

Target sederhana:

```text
No active timer
  Start
    Running
      Pause
      Resume
      Switch activity
      Edit metadata
      Stop → completed entry
      Discard → deleted open entry
```

### Perbaikan pause

Implementasi sekarang menggeser `startTime` saat resume. Keputusan target: **pakai `timer_segments`** agar waktu mulai asli dan setiap pause/resume dapat diaudit.

```text
timer_segments
- time_entry_id
- started_at
- ended_at
```

`time_entries.original_started_at` menyimpan awal sesi. Segment aktif memiliki `ended_at IS NULL`; pause menutup segment, resume membuat segment baru. Backfill mempertahankan `start_time`/`end_time` legacy selama compatibility window dan total duration sebelum/sesudah wajib identik.

### Manual entry

Pisahkan mode dengan discriminator `entry_type`:

- `duration`: `work_date + duration_seconds + timezone_snapshot`, tanpa `start_time/end_time` palsu.
- `interval`: timestamp start–end aktual.
- `timer`: chronology server-side dengan original start dan segment/accumulated time.

Backfill legacy:

- `manual_minutes IS NOT NULL` dikenali sebagai duration entry;
- tanggal tidak boleh diturunkan dari UTC mentah bila menggeser tanggal lokal;
- total menit dan tanggal report sebelum/sesudah migrasi harus identik.

### Cross-tab/device

- `BroadcastChannel` untuk tab browser sama;
- refresh pada focus/visibility change;
- poll lightweight active state 15–30 detik;
- SSE/WebSocket hanya jika real-time team view dibutuhkan.

---

## 12. Task detail target

Tambahkan panel waktu bila Project tracking mode bukan `off` atau punya histori:

- total tracked;
- billable time;
- estimated vs actual;
- cost/revenue jika user berhak;
- breakdown Activity;
- breakdown member;
- recent time entries;
- Start Timer;
- Add Manual Time;
- link ke filtered timesheet.

Task tetap delivery object. Panel hanya query Time Entry yang mereferensikan Task.

---

## 13. Reporting target

### Grouping

- Client
- Project
- Service/Project Service
- Activity
- Task
- User
- Tag

### Views

1. Today timeline
2. Weekly timesheet grid
3. All entries
4. Task time history
5. Service profitability
6. Package allowance usage

### Approval workflow target

```text
draft → submitted/pending → approved/rejected → invoiced
```

Tambahkan:

- submittedAt/submittedBy;
- approvedAt/approvedBy;
- rejectedAt/rejectedBy/reason;
- period locking;
- permission-based status transition;
- timer-only/manual-entry policy untuk Team plan.

---

## 14. Template onboarding per profesi

Template hanya seed yang dapat diedit/dihapus. Jangan dipaksakan global.

### Virtual Assistant

Services:
- Email Management
- Calendar Management
- Data Entry
- Customer Support

Activities:
- Email
- Scheduling
- Research
- Client Communication
- Administration

### Developer

Services:
- Web Development
- API Development
- Maintenance
- Technical Consultation

Activities:
- Development
- Code Review
- Testing
- Meeting
- Deployment

### Designer

Services:
- Logo Design
- Brand Identity
- Social Media Design
- UI/UX Design

Activities:
- Research
- Sketching
- Design
- Revision
- Client Meeting

### Writer

Services:
- SEO Article Writing
- Website Copywriting
- Editing
- Content Strategy

Activities:
- Research
- Writing
- Editing
- Revision
- Interview

### Social Media Manager

Services:
- Content Planning
- Post Design
- Copywriting
- Scheduling
- Analytics Reporting

Activities:
- Research
- Planning
- Design
- Copywriting
- Publishing
- Reporting

### Consultant

Services:
- Discovery Session
- Business Audit
- Strategy Consulting
- Implementation Support

Activities:
- Discovery
- Analysis
- Workshop
- Documentation
- Client Meeting

Task tidak otomatis dibuat dari template profesi. Task harus mengikuti pekerjaan konkret Project.

---

## 15. Migrasi kompatibel

### Prinsip

- zero data loss;
- existing Project/Task/Time Entry tetap valid;
- perubahan bertahap dan feature-flagged;
- jangan rename/drop tabel lama dalam migrasi pertama;
- historical package/order/invoice tetap dapat dibaca.

### Tahap migrasi

1. Audit dan bekukan destructive behavior lama:
   - nonaktifkan hard-delete `packages` yang sudah direferensikan;
   - ubah FK histori `package_orders.package_id` dari cascade menjadi `RESTRICT` atau nullable `SET NULL`;
   - pertahankan snapshot nama, harga, currency, hours, dan status order.
2. Tambah `projects.time_tracking_mode` dan `activity_required` secara nullable/feature-flagged; backfill berdasarkan billing type; baru beri default/constraint setelah reconciliation.
3. Tambah tabel `services`, `project_services`, `activities`, `project_activities`.
4. Tambah nullable `time_entries.activity_id`, `project_service_id`, discriminator entry, snapshot rate/currency, dan field chronology baru.
5. Tambah nullable `tasks.project_service_id` dan source relation pada invoice items.
6. Pertahankan `time_entries.task_id`, description, `hourly_rate`, `selectedPackageId`, dan tabel lama selama compatibility window.
7. Hentikan auto-copy Task title hanya untuk log baru.
8. Klasifikasikan `packages` lama dengan aturan deterministik:
   - direferensikan `projects.selectedPackageId` atau `package_orders.package_id` → tetap Package;
   - memiliki `hours`, `allowCustom`, `minHours`, atau `maxHours` → tetap Package;
   - record ambigu → reconciliation queue, tidak otomatis disalin sebagai Service;
   - Service catalog baru boleh dimulai kosong/seed manual agar tidak membuat duplikasi semantik.
9. Pertahankan UUID Package lama. Buat orphan report sebelum menambah FK `projects.package_id`.
10. Terapkan dual-read/dual-write `selectedPackageId` dan `package_id`; pindahkan invoice, portal, order, report, dan Project form satu per satu.
11. Ubah Project form agar semua billing type dapat memilih banyak Service.
12. Ubah By Package menjadi memilih Package dan melihat included Services.
13. Redirect route lama hanya setelah seluruh caller pindah dan compatibility matrix lulus.
14. Drop/rename kolom atau tabel lama hanya pada migration terpisah setelah production reconciliation dan rollback window selesai.

### Reconciliation gate wajib

Sebelum dan sesudah migrasi, bandingkan:

- row count per tabel;
- orphan count dan ID mapping;
- Project → selected Package resolution;
- order count/status dan total per currency;
- invoice total/status per currency;
- total tracked minutes dan tanggal report;
- portal visibility dan package usage;
- archive/delete attempt tidak menghapus histori.

Cutover gagal bila salah satu nilai historis berubah tanpa keputusan eksplisit.

### Data lama dengan description = Task title

Jangan rewrite otomatis. Nilai itu tetap fakta historis meski redundan. Untuk UI:

- jika `description.trim() === task.title.trim()`, boleh tampilkan description sekali;
- jangan menghapus nilai DB tanpa keputusan eksplisit;
- log baru mengikuti model independen.

---

## 16. Phase implementasi

## Phase 0A — Containment security dan financial integrity

**Status:** live di production lewat commit `823b986` dan migration `0046_phase0a_integrity_containment.sql`.

- [x] Inventory seluruh penggunaan `packages`, `selectedPackageId`, `/app/packages`, package orders, portal, invoice, proposal, report, dan caller timer utama.
- [x] Portal mutation memakai HttpOnly portal session/credential resolver server-side; raw bearer token tidak dikirim ke Client Component dan tidak disimpan pada order/request history untuk write baru.
- [x] Package order menerima hanya `projectId`, `packageId`, message, dan idempotency key; server resolve client, workspace, Project, Package, name, price, currency, allowance, hours, dan status.
- [x] Custom Package Request memakai schema runtime, rate limit, idempotency, token–client–Project scope, dan admin transition yang authenticated + workspace-scoped.
- [x] Nonaktifkan Package hard-delete; ubah FK commercial history menjadi `RESTRICT`/`SET NULL`; Package, Project, dan catalog record yang direferensikan hanya dapat diarsipkan.
- [x] Seluruh timer write path memakai satu resolver tenant untuk workspace–Client–Project–Task; pause/resume/stop/discard hanya boleh oleh pemilik timer.
- [x] Tambah partial unique index active timer `(workspace_id, user_id) WHERE end_time IS NULL AND manual_minutes IS NULL`; start/switch atomik dalam transaction.
- [x] Block edit/delete entry `invoiced`; invoice import hanya `approved + billable + completed + duration>0 + same client/project/workspace`.
- [x] Invoice import atomik dan idempotent; jangan mutasi rate snapshot Time Entry; simpan previous status saat link dibuat dan restore status tersebut ketika link draft dilepas.
- [x] Tambah regression test source/wiring untuk authority portal, archive semantics, tenant resolver, ownership guard, active-timer constraint, dan invoice eligibility.
- [x] Tambah behavioral DB integration nyata untuk cross-workspace Client/Project/Task, timer ownership, concurrent start, invoice eligibility/idempotency, dan Package order idempotency pada DB disposable. Evidence: `docs/operations/evidence/phase0b/phase0a-db-integration-20260727.md`. Token/client mismatch dan spoofed commercial snapshot tetap membutuhkan direct portal-action integration sebelum public handoff besar.
- [x] Ops follow-up: audit credential QA historis selesai 2026-07-28. Scan 460 blob non-binary di seluruh git history untuk private key, GitHub/AWS token, JWT, dan assignment password/API key/secret/token tidak menemukan credential nyata. Evidence: `docs/operations/evidence/phase0b/credential-history-audit-20260728.md`; rotasi tidak diperlukan berdasarkan hasil scan.

**Acceptance:** containment runtime sudah live di production. Evidence Phase 0A baru lengkap setelah behavioral integration membuktikan spoof price/currency ditolak; token Client A tidak dapat menulis Project B; raw token tidak muncul di client payload/history write baru; member tidak dapat mengontrol timer user lain; kombinasi Client/Project/Task silang ditolak; concurrent start menghasilkan satu timer; draft/non-billable/open entry tidak dapat di-invoice; invoiced entry immutable; archive tidak menghapus assignment/order/request.

## Phase 0B — Schema ADR, migration evidence, dan release gate

- [x] Audit normalized schema dump dev/prod; hasil 2026-07-27 identik. Ulangi dan simpan evidence pada setiap migration rehearsal.
- [x] Rekonsiliasi ledger dev untuk migration `0043`–`0045` yang object-nya sudah ada dari schema clone; catat checksum tanpa replay DDL dan verifikasi ulang schema diff nol. Evidence: `docs/operations/evidence/phase0b/dev-ledger-reconciliation-0043-0045.md`.
- [x] Ubah migration workflow agar target DB wajib eksplisit dan fail-closed. Command polos `./migrate.sh` tidak boleh diam-diam memilih production untuk release plan ini.
- [x] Selaraskan `docs/operations/dev-environment.md` dengan runtime production-build preview aktual; hapus instruksi HMR/`next dev`/resource lama yang bertentangan.
- [x] Buat ulang akun QA sintetis di `cubicle_dev`, perbarui secret operasional, lalu buktikan login dan smoke test authenticated tanpa menyentuh akun production. Evidence: `docs/operations/evidence/phase0b/dev-qa-auth-smoke.md`.
- [x] Finalkan ERD dengan `project_package_assignments`, currency snapshot, explicit invoice source relations, dan `timer_segments` pada `docs/architecture/ADR-001-project-service-activity-time-schema.md`.
- [x] Klasifikasikan legacy copy `/month` sebagai `legacy_recurring_unmodeled`; tidak ada reinterpretasi otomatis sebagai one-off.
- [x] Buat transition matrix approval/permission dan migration compatibility matrix pada ADR.
- [x] Buat orphan report, ID mapping, reconciliation script, backup checksum, restore-test, dan rollback rehearsal. Evidence: `docs/operations/evidence/phase0b/reconciliation-summary-20260727.md` dan `docs/operations/evidence/phase0b/backup-restore-rollback-20260727T173307Z.md`.
- [x] Kunci naming ID/EN dan migration route compatibility pada ADR.
- [x] Kunci Package baru sebagai one-off allowance; recurring belum dijanjikan pada ADR.

**Acceptance:** seluruh pilihan schema sudah menjadi ADR; dev login + authenticated smoke test lulus; schema dan ledger dev punya evidence yang dapat diaudit; migration menolak target ambigu; backup dapat direstore; reconciliation baseline tersimpan; migration fresh + existing snapshot lulus dua kali; rollback diuji.

### Gate wajib sebelum Phase 1

Phase 1 tidak boleh dimulai sebelum seluruh kondisi ini lulus:

1. Akun QA dev valid dan authenticated smoke test `/app/dashboard`, `/app/time`, dan `/app/projects` lulus.
2. Normalized schema diff dev/prod nol pada baseline, lalu perubahan Phase 1 hanya muncul sebagai diff yang direncanakan.
3. Ledger dev `0043`–`0046` konsisten dengan object dan checksum aktual tanpa replay migration applied.
4. Migration runner memerlukan target eksplisit dan mempunyai test yang membuktikan target ambigu ditolak.
5. Backup dev memiliki checksum, dapat direstore ke DB disposable, dan hasil restore lolos reconciliation baseline.
6. Orphan report, ID mapping, row count, totals per currency, tracked minutes, dan rollback command tersimpan sebagai evidence.
7. Behavioral integration Phase 0A lulus pada DB disposable/dev.
8. Dokumentasi operator dev sesuai dengan Compose dan runtime aktual.

## Phase 1 — Project tracking mode dan description independence

- [x] Tambah `time_tracking_mode` dan `activity_required`.
- [x] Backfill/default sesuai billing type.
- [x] Hide/show timer UI per Project.
- [x] Tegakkan mode di seluruh server action/API: start, Task quick-start, manual entry, edit/reassign, dan completion.
- [x] Kunci aturan timer tanpa Project: boleh capture cepat, tetapi tidak boleh selesai sebelum memilih Project non-`off`.
- [x] Hentikan auto-copy Task title sebagai description permanen.
- [x] Task quick-start memakai placeholder/context.
- [x] Pastikan project `off` tetap punya Task/Service/invoice normal.
- [x] Jaga histori log saat mode berubah; histori tampil read-only.

**Acceptance:** Project `off` bersih di UI dan menolak write lewat direct server/API test; timer kosong tidak dapat diselesaikan tanpa Project valid; log baru tidak menduplikasi Task title otomatis; histori tetap terbaca.

## Phase 2 — Activity catalog ala My Hours

**Status 2026-07-28:** implemented di branch `feat/service-catalog-phase3`; dev deploy/smoke sedang diverifikasi. Evidence kode: `src/lib/activity-wiring.test.ts`, `drizzle/0048_activity_catalog.sql`, `src/lib/actions/activities.ts`, `src/components/projects/project-activity-settings.tsx`, `src/components/time/*`, `src/app/(app)/app/reports/page.tsx`.

- [x] Tambah Activities CRUD workspace.
- [x] Tambah enabled Activities per Project.
- [x] Tambah `activity_id` pada timer/manual/edit entry.
- [x] Timer order: Project → Activity → Related Task → Description.
- [x] Report/filter/group by Activity.
- [x] Seed template profesi opsional tersedia sebagai data editable untuk Virtual Assistant, Developer, Designer, Writer, Social Media Manager, dan Consultant di `src/lib/profession-templates.ts`.
- [x] Recent timer combination dideduplikasi dari histori user dan dapat difavoritkan lokal dari Timer widget.

**Acceptance:** satu Activity reusable dipakai banyak log; description per log dapat berbeda; Task tetap opsional; legacy null tampil sebagai `Tanpa aktivitas`; bila `activity_required=true`, entry tidak dapat diselesaikan/submitted sebelum Activity dipilih; cross-workspace Activity ID ditolak.

## Phase 3 — Service catalog untuk semua billing type

**Status 2026-07-28:** implemented sebagai Service catalog + Project Service snapshot, termasuk generator invoice/proposal dari Project Service lines. Evidence kode: `src/lib/service-catalog-wiring.test.ts`, `src/lib/project-service-lines.ts`, `src/lib/actions/invoices.ts`, `src/lib/actions/proposals.ts`, `drizzle/0049_service_catalog.sql`, `src/lib/actions/services.ts`, dan UI Service/Project Service.

- [x] Buat Service CRUD terpisah.
- [x] Service categories dan pricing model.
- [x] Buat `project_services` snapshot.
- [x] Project dapat memilih banyak Service.
- [x] By Project/Hours/Package semua dapat memakai Service.
- [x] Proposal/invoice mengambil Project Service lines memakai `buildProjectServiceDocumentLines` dengan source + snapshot.
- [x] Archive Service tanpa merusak histori.

**Acceptance:** Service reusable lintas Project; harga/scope Project lama stabil setelah katalog diedit; invoice/proposal line punya source + snapshot; generate ulang idempotent; invoice `sent`/`paid` immutable; archive Service tidak menghapus histori.

## Phase 4 — Package builder bersih

- [x] Package catalog terpisah.
- [x] Package berisi banyak Service.
- [x] Package allowance MVP `hours` one-off; unit/mixed/recurring diklasifikasikan tanpa silent semantic conversion.
- [x] Project mengambil snapshot included Services.
- [x] UUID Package lama dipertahankan dan selected Package dual-read/dual-write selama cutover.
- [x] Admin assignment dan client order flow dimigrasikan.
- [x] Portal order resolve harga/currency/allowance/items server-side dan memvalidasi token, client, Project, Package, status, serta workspace.
- [x] Portal menampilkan Package, Services, usage, remaining.
- [x] Order history tidak hilang ketika Package diarsipkan.

**Acceptance:** Package bukan sinonim Service; seluruh Project package lama resolve ID dan harga identik; spoof harga/cross-workspace ditolak; usage one-off konsisten; archive tidak menghapus order/invoice history.

## Phase 5 — Timer UX dan data integrity

- [x] Edit metadata timer saat running.
- [x] Atomic switch Activity/Task; entry lama ditutup dan entry baru dimulai dalam satu transaction.
- [x] Tambah unique partial index untuk satu active timer per workspace/user dan transaction/advisory locking pada start lewat Phase 0A; behavioral concurrency proof tetap wajib di Phase 0B.
- [x] Preserve original start time melalui `timer_segments`.
- [x] Duration-only memakai `entry_type=duration`, `work_date`, timezone snapshot, dan duration tanpa midnight timestamp palsu.
- [x] Refresh-safe timer state; cross-tab sync memakai state server.
- [x] Permission rate override dan snapshot billing rate + currency; invoice tidak memutasi snapshot.
- [x] Stale timer correction flow tanpa silent 24h truncation.

**Acceptance:** concurrent-start test menghasilkan tepat satu active timer; switch tidak kehilangan durasi/atribusi; original timeline benar; legacy duration mempertahankan tanggal dan total menit lintas timezone; konsisten lintas halaman/tab/device.

## Phase 6 — Daily/weekly/approval

- [x] Today timeline.
- [x] Weekly grid.
- [x] Copy previous week.
- [x] Implement transition matrix `draft → submitted → approved|rejected → invoiced`; rejected dapat kembali ke draft sesuai permission.
- [x] Batasi invoice import ke entry `approved + billable + completed + duration>0` lewat Phase 0A; behavioral eligibility/idempotency proof tetap wajib di Phase 0B.
- [x] Simpan dan restore previous status saat invoice link draft dibuat/dilepas lewat Phase 0A.
- [x] Tambah audit metadata approval/submission/rejection dan tegakkan transition permission.
- [x] Period locking; submitted/approved/invoiced tidak dapat diedit sembarang role.
- [x] Timer-only/manual-entry policy.
- [x] Forgotten timer dan target-hours reminder state.

**Acceptance:** transition permission lulus; import invoice atomik/idempotent; draft/rejected/non-billable tidak dapat ditagih; hapus line dari draft invoice mengembalikan status tepat sebelumnya; locked/invoiced immutable.

## Phase 7 — Profitability

- [x] Link Task dan Time Entry ke Project Service secara opsional/derived.
- [x] Cost vs sold amount per Service.
- [x] Margin per Project Service.
- [x] Estimate vs actual.
- [x] Client-specific rate cards.
- [x] Revenue by Service report query.

**Acceptance:** Cubiqlo dapat menjawab layanan mana yang paling laku dan paling untung.

---

## 17. Urutan release disarankan

```text
Release 0A — Security & financial containment
  portal order/request authority, history preservation, timer tenancy/ownership,
  active-timer DB constraint, invoice-time eligibility/lifecycle

Release 0B — Schema ADR & migration evidence
  Project Package assignment snapshot, tenant constraints, timer segments,
  entry discriminator, legacy monthly classification, reconciliation baseline

Release A1 — Project tracking mode
  timeTrackingMode server enforcement, description independence,
  compatibility reader, legacy history read-only

Release A2 — Activity + timer storage
  Activity, timer segments, manual duration/timezone, cross-tab sync

Release B — Service foundation
  Service CRUD, Project Service snapshot, multi-Service Project,
  proposal/invoice explicit source relation, archive semantics

Release C — Package migration
  deterministic legacy mapping, UUID preservation, dual-read/write,
  one-off assignment snapshot, secure portal order, allowance usage

Release D — Team timesheet
  today/weekly, submit/approve/reject, period lock, invoice transition

Release E — Profitability
  cost-rate snapshot, Service/Project margin, rate cards,
  recurring package periods hanya bila kebutuhan tervalidasi
```

Setiap release harus menjadi vertical slice yang dapat dibuild, diuji, dan diaktifkan feature flag sendiri. Jangan membuka satu branch besar Phase 0–7. Jangan mulai dari profitability atau recurring Package sebelum batas Service/Activity/Task dan migrasi histori stabil.

---

## 18. Anti-pattern yang dilarang

1. Service hanya tersedia untuk By Package.
2. Service dijadikan sinonim Package.
3. Service dijadikan kategori timer seperti Meeting/Admin.
4. Task Kanban diubah menjadi kategori timer global.
5. Task wajib untuk setiap Time Entry.
6. Task title otomatis disimpan sebagai description final.
7. Time log di-embed sebagai JSON/array pada Task.
8. Satu Project dibatasi hanya satu Service.
9. Katalog menjadi direct FK tanpa snapshot kontrak/harga.
10. Edit katalog mengubah Project/invoice historis.
11. Hard-delete Service/Package/Activity yang sudah dipakai.
12. Satu rate dipakai untuk semua billing model tanpa hierarchy/snapshot.
13. Project `off` kehilangan histori time entry.
14. Package output dipaksa memakai allowance jam.
15. Silent truncation timer 24 jam tanpa koreksi/audit.
16. Manual duration dibuat menjadi jam mulai palsu 00:00.
17. `time_tracking_mode=off` hanya ditegakkan lewat UI.
18. Client portal mengirim atau menentukan harga/currency/allowance snapshot.
19. Migrator menebak record Package lama sebagai Service tanpa aturan deterministik.
20. Cascade delete menghapus Package order/invoice history.
21. Dua active timer dibiarkan terjadi karena tidak ada DB constraint.
22. Invoice mengambil draft/rejected/non-billable entry.
23. Package diberi label bulanan tanpa period/reset/carry-over model.
24. Billing rate dan cost rate dicampur dalam satu field.
25. Activity dari workspace lain dapat dipasang hanya karena UUID valid.

---

## 19. Benchmark produk

Arah ini disusun dari pola resmi:

- Bonsai Services Library: https://help.hellobonsai.com/en/articles/12824095-services-library
- HoneyBook Services: https://help.honeybook.com/en/articles/5643712-add-manage-and-use-services-in-honeybook-smart-files
- Productive Rate Cards: https://help.productive.io/en/articles/2179593-setting-up-rate-cards
- Productive Service Types: https://help.productive.io/en/articles/2179629-understanding-service-types
- Harvest Project/Task setup: https://support.getharvest.com/hc/en-us/articles/360048686831-Create-and-duplicate-projects
- My Hours Tasks: https://help.myhours.com/en/articles/1091811-task-lists-and-tasks
- My Hours Task Templates: https://help.myhours.com/en/articles/10425636-task-templates
- Teamwork Timesheet: https://support.teamwork.com/projects/time-tracking/track-and-manage-time-in-my-timesheet
- Clockify Time Entry: https://clockify.me/help/track-time-and-expenses/creating-a-time-entry

Interpretasi utama:

- Bonsai/HoneyBook/Productive mendukung Service sebagai reusable commercial catalog/rate layer.
- My Hours/Harvest memakai reusable Task sebagai time dimension.
- Karena Cubiqlo sudah punya Task Kanban, fungsi reusable timer diberi nama Activity agar tidak bentrok.
- Project tetap pusat delivery; Service tidak mengambil fungsi container Project.

---

## 20. Definition of done keseluruhan

Plan dianggap selesai diimplementasikan ketika:

1. User memahami billing type tanpa penjelasan manual.
2. Service berarti penawaran yang dijual dan berlaku untuk semua billing type.
3. Package berarti bundle Service.
4. Task tetap pekerjaan konkret berbeda per Project.
5. Activity reusable dapat dipakai berkali-kali seperti Task di My Hours.
6. Description Time Entry mencatat pekerjaan sesi aktual.
7. Project tanpa timer tidak melihat clutter timer.
8. Project hourly/package-hours mempunyai workflow tracking lengkap.
9. Data lama tetap terbaca dan invoice/report historis tidak berubah.
10. Service/Package edit tidak mengubah snapshot Project lama.
11. Timer menjaga original timeline dan sinkron lintas tab/device.
12. Reports dapat group by Service, Activity, Task, Project, dan User.
13. Approval dan locking mencegah manipulasi entry yang sudah disetujui/di-invoice.
14. Build, migration, E2E, portal visibility, invoice, dan multi-currency checks lulus sebelum deploy.
15. Reconciliation row count, orphan, ID mapping, Package assignment, order, invoice, tracked minutes, dan totals per currency lulus.
16. Project `off` ditolak oleh seluruh write path server.
17. Concurrent start menghasilkan satu active timer.
18. Portal tidak mempercayai harga/currency/allowance dari client dan menolak cross-workspace identifiers.
19. Package MVP one-off tidak mencampur klaim recurring; recurring baru selesai bila period/reset/carry-over dimodelkan.
20. Invoice import hanya `approved + billable`, idempotent, dan tidak mengubah snapshot entry lama.
21. Archive Service/Package/Activity tidak menghapus histori.
22. Rollback rehearsal dan restore-test lulus sebelum production cutover.

---

## 21. Catatan eksekusi

Plan ini approved sebagai arah produk, tetapi belum berarti izin otomatis untuk migration production/deploy. Eksekusi dimulai per phase dengan:

1. audit caller dan schema;
2. migration idempotent;
3. backward compatibility;
4. build/typecheck/test;
5. local/staging QA;
6. production migration;
7. deploy dan health verification;
8. update changelog/feature status.

Production cutover juga wajib memiliki:

- feature flag per release;
- backup checksum + restore-test;
- reconciliation report sebelum/sesudah;
- compatibility window old/new reader-writer;
- rollback command dan owner keputusan go/no-go;
- direct authorization/concurrency tests selain UI smoke test.

`docs/TIMER_REVISI_PLAN.md` tetap menjadi catatan revisi timer lama. Dokumen ini menjadi canonical product plan untuk hubungan Project–Service–Package–Task–Activity–Time Entry.
