# Cubiqlo — Personal Productivity & 50/30/20 Budget Plan

**Status:** CONTRACT-READY DRAFT — arah produk disetujui; **NO-GO untuk coding** sampai seluruh artifact Phase 0A tersedia dan lolos review mekanis.
**Target branch:** `dev/integration` melalui feature worktree terpisah
**Scope:** Habit Tracker, Goal Tracker, dan anggaran 50/30/20
**Prinsip:** tidak menambah menu sidebar kecuali satu submenu `Produktivitas / Productivity`; seluruh UI bilingual melalui `cubiqlo_lang`.

## 1. Keputusan produk terkunci

1. Sidebar `Personal` mendapat satu submenu baru:
   - ID: `Produktivitas`
   - EN: `Productivity`
2. Habit dan Goal tidak menjadi dua item sidebar.
3. Halaman Produktivitas punya navigasi internal:
   - `Ringkasan / Overview`
   - `Tujuan / Goals`
   - `Kebiasaan / Habits`
4. Budget 50/30/20 tidak mendapat menu baru.
5. Budget tampil sebagai fitur opsional di halaman `Pengeluaran / Expenses` yang sudah ada.
6. Pengeluaran bisnis dan transaksi pribadi memakai satu halaman/UX, tetapi storage, ownership, laporan, dan export dipisah.
7. Spreadsheet terlampir hanya referensi konsep. Jangan menyalin desain, copy, formula, atau struktur identik karena lisensinya personal-only dan melarang penggunaan komersial.
8. Goal, Habit, budget, kategori personal, dan transaksi personal adalah **user-level**; tidak berubah atau hilang saat user berpindah workspace.
9. Fitur Produktivitas tersedia untuk semua user yang login, bukan hanya workspace owner.
10. Tabungan diperlakukan sebagai `allocation`, bukan expense/spending.
11. Istilah UI Indonesia memakai `Tujuan` dan `Kebiasaan`; nama teknis/internal tetap `goal` dan `habit`.
12. Budget yang belum diaktifkan tidak menghalangi user mencatat transaksi pribadi.
13. Role `viewer` tetap dapat read/write data personal miliknya, tetapi tidak dapat mutation Expense bisnis.
14. Nilai uang personal dihitung sebagai PostgreSQL `numeric`; jangan memakai floating-point JS untuk aggregate, target, atau remaining.

## 2. Information architecture

```text
PERSONAL
├─ Catatan / Notes
└─ Produktivitas / Productivity
   ├─ Ringkasan / Overview
   ├─ Tujuan / Goals
   └─ Kebiasaan / Habits

KEUANGAN / FINANCE
└─ Pengeluaran / Expenses
   ├─ Ringkasan transaksi yang sudah ada
   ├─ Kartu Anggaran 50/30/20 opsional
   ├─ Filter Semua / Pribadi / Bisnis
   └─ Daftar transaksi
```

Route teknis:

```text
/app/productivity
/app/productivity?tab=goals
/app/productivity?tab=habits
/app/expenses
```

Tidak perlu route/menu budget baru. Detail budget dibuka lewat sheet/dialog pada `/app/expenses`.

## 3. Produktivitas / Productivity

### 3.1 Ringkasan / Overview

Tampilkan data yang bisa langsung ditindak:

- Habit hari ini / Today's habits
- Checklist cepat tanpa membuka detail
- Goal prioritas / Priority goals
- Progress minggu ini / This week's progress
- Streak aktif / Current streak
- Deadline terdekat / Upcoming deadlines
- CTA `Tambah Goal / Add goal`
- CTA `Tambah Habit / Add habit`

Empty state:

- Belum ada goal atau habit
- Dua CTA terpisah, tanpa wizard panjang
- ID dan EN wajib tersedia

### 3.2 Tujuan / Goals

#### Data goal

Storage MVP:

```text
personal_goals
- id UUID PK
- user_id text NOT NULL
- title text NOT NULL
- description text nullable
- life_area text NOT NULL
- deadline date nullable
- priority: low | medium | high
- reward text nullable
- status: not_started | in_progress | achieved | deferred | cancelled
- manual_progress integer NOT NULL default 0, CHECK 0–100
- sort_order integer NOT NULL default 0
- created_at timestamptz
- updated_at timestamptz
- UNIQUE (id, user_id)
- INDEX (user_id, status)
- INDEX (user_id, deadline)

personal_goal_steps
- id UUID PK
- goal_id UUID NOT NULL
- user_id text NOT NULL
- title text NOT NULL
- is_completed boolean NOT NULL default false
- sort_order integer NOT NULL default 0
- completed_at timestamptz nullable
- created_at timestamptz
- updated_at timestamptz
- composite FK (goal_id, user_id) → personal_goals(id, user_id) ON DELETE CASCADE
- INDEX (goal_id, sort_order)
```

Goal memakai status sebagai lifecycle utama. Hard delete adalah aksi eksplisit dan menghapus seluruh step terkait.

Default UX untuk goal yang tidak diteruskan adalah status `cancelled`, bukan hard delete. Hard delete hanya tersedia melalui menu destruktif, meminta konfirmasi dengan nama goal, dan wajib memverifikasi ownership dari session. Histori check-in habit tetap ada, tetapi konteks goal yang dihapus tidak dapat dipulihkan.

- Pemilik user; tidak memiliki `workspace_id`
- Judul / Title
- Deskripsi / Description, opsional
- Area hidup / Life area
- Deadline, opsional
- Prioritas: rendah, sedang, tinggi
- Reward, opsional
- Status: belum mulai, berjalan, tercapai, ditunda, dibatalkan
- Urutan manual
- Created/updated timestamps

Area hidup default:

- Keuangan / Finance
- Karier / Career
- Pengembangan diri / Personal growth
- Kesehatan / Health & wellness
- Relasi / Relationships
- Perjalanan / Travel
- Bisnis / Business
- Hobi / Hobbies
- Lainnya / Other

#### Langkah goal

Setiap goal dapat memiliki langkah:

- Judul langkah
- Status selesai/belum
- Urutan
- Tanggal selesai

Progress otomatis:

```text
jumlah langkah selesai / jumlah seluruh langkah × 100
```

Jika goal belum memiliki langkah, user dapat memperbarui `manual_progress`. Setelah ada minimal satu langkah, progress selalu dihitung dari seluruh langkah dan input manual disembunyikan. Jangan gabungkan progress habit secara otomatis.

Status tetap keputusan eksplisit user. Progress 100% tidak otomatis mengubah status. Saat user memilih `achieved`, UI menawarkan set progress 100% tetapi tidak memaksa. Overview hanya menampilkan goal `not_started` dan `in_progress`.

#### Hubungan dengan habit

- Habit boleh dikaitkan ke satu goal pada MVP.
- Goal menampilkan habit pendukung.
- Kinerja habit hanya menjadi konteks, bukan otomatis mengubah progress goal.

### 3.3 Kebiasaan / Habits

#### Data habit

Storage MVP:

```text
personal_habits
- id UUID PK
- user_id text NOT NULL
- goal_id UUID nullable
- name text NOT NULL
- description text nullable
- color text nullable
- icon text nullable
- frequency: daily | specific_weekdays
- weekdays smallint[] NOT NULL default '{}'
- start_date date NOT NULL
- status: active | archived
- created_at timestamptz
- updated_at timestamptz
- UNIQUE (id, user_id)
- composite FK (goal_id, user_id) → personal_goals(id, user_id) ON DELETE NO ACTION
- INDEX (user_id, status)

personal_habit_checkins
- id UUID PK
- habit_id UUID NOT NULL
- user_id text NOT NULL
- local_date date NOT NULL
- note text nullable
- completed_at timestamptz NOT NULL
- composite FK (habit_id, user_id) → personal_habits(id, user_id) ON DELETE CASCADE
- UNIQUE (habit_id, local_date)
- INDEX (user_id, local_date)
```

- Pemilik user; tidak memiliki `workspace_id`
- Nama / Name
- Deskripsi, opsional
- Warna/icon, opsional
- Goal terkait, opsional
- Frekuensi:
  - setiap hari / daily
  - hari tertentu / specific weekdays

- Tanggal mulai
- Status aktif/arsip
- Created/updated timestamps

MVP sengaja hanya memakai completion boolean per hari. Habit numerik seperti `minum 2 liter` ditunda sampai kebutuhan nyata muncul.

Delete goal yang masih terhubung ke habit wajib memakai satu transaction: set `goal_id = NULL` untuk habit milik user yang sama, lalu delete goal. Composite FK tetap `NO ACTION` agar `user_id NOT NULL` tidak ikut di-set null. Cross-user link ditolak DB dan aplikasi.

Constraint jadwal:

- `daily` wajib memiliki `weekdays = '{}'`.
- `specific_weekdays` wajib memiliki minimal satu weekday unik bernilai 0–6.
- Array weekday disimpan canonical: urut ascending dan tanpa duplikat.
- Phase 0A wajib memilih serta menuliskan satu enforcement DB konkret: normalized child table dengan `UNIQUE (habit_id, weekday)`, atau immutable PostgreSQL validation function yang dipakai `CHECK`. Validasi action saja tidak cukup untuk klaim DB guarantee.
- Check-in sebelum `start_date` atau setelah tanggal lokal user saat ini ditolak.
- Archive dapat dibatalkan; histori check-in tetap ada.

#### Check-in

Tidak ada row berarti belum selesai. Satu row berarti selesai. Toggle off menghapus row. Satu record per habit per tanggal:

- habit ID
- tanggal lokal user
- catatan singkat, opsional
- completed timestamp

Wajib ada unique constraint `(habit_id, date)` agar klik berulang tidak membuat duplikat.

#### Statistik

- Completion rate periode terpilih
- Current streak
- Best streak
- Total selesai
- Ringkasan mingguan
- Kalender bulanan

Jadwal adalah hari wajib; MVP tidak memakai target mingguan terpisah. Completion rate = check-in selesai / occurrence terjadwal pada periode. Current/best streak dihitung dari rangkaian occurrence terjadwal yang selesai. Hari yang tidak dijadwalkan tidak menambah atau memutus streak.

## 4. Anggaran 50/30/20 di Pengeluaran

### 4.1 Entry point

Jika belum aktif, tampilkan kartu kecil:

```text
Atur pengeluaran dengan metode 50/30/20
Enable the 50/30/20 budgeting method
[Aktifkan Anggaran / Enable budget]
```

Jika aktif, tampilkan kartu bulan berjalan:

- Kebutuhan / Needs
- Keinginan / Wants
- Tabungan / Savings
- Target, aktual, sisa, status, progress bar
- CTA `Kelola Anggaran / Manage budget`

Klik kartu membuka sheet/dialog. Tidak pindah halaman.

### 4.2 Setup budget

Input:

- Bulan/periode
- Pendapatan bersih
- Mata uang
- Needs default 50%
- Wants default 30%
- Savings default 20%

Validasi dan DB checks:

- `month` disimpan sebagai tanggal hari pertama bulan.
- `income` memakai `numeric(18,2)` dan harus lebih dari nol.
- Currency wajib berupa uppercase currency code tiga karakter. Aplikasi memvalidasi terhadap whitelist ISO 4217; DB menjaga format `[A-Z]{3}`.
- Persentase masing-masing 0–100 dengan DB CHECK.
- Total persentase wajib tepat 100 dengan DB CHECK.
- Satu konfigurasi per user, bulan, dan mata uang
- Tombol salin konfigurasi bulan sebelumnya

### 4.3 Transaksi pribadi dan bisnis

Halaman tetap satu, tetapi form memilih jenis record dan menulis ke storage yang sesuai. Label tetap ramah pengguna:

```text
Catat untuk / Record for
[Pribadi / Personal] [Bisnis / Business]
```

Jangan tampilkan istilah teknis `scope`.

Aturan default:

- Ada project/client: Bisnis
- Dibuka dari kartu budget: Pribadi
- Selain itu: pilihan terakhir user

Aturan server:

- `Bisnis` menulis ke tabel `expenses` existing dan wajib melewati permission workspace.
- `Pribadi` menulis ke tabel `personal_transactions` dan wajib `user_id = session.user.id`.
- Project, client, pajak bisnis, dan activity log workspace tidak berlaku pada transaksi pribadi.
- Receipt pribadi memakai prefix storage user-level terpisah; workspace member lain tidak boleh mendapat signed URL.

Role matrix:

| Workspace role | Personal read/write | Business read | Business write |
| -------------- | ------------------: | ------------: | -------------: |
| Owner          |                  Ya |            Ya |             Ya |
| Member         |                  Ya |            Ya |             Ya |
| Viewer         |                  Ya |            Ya |          Tidak |

Viewer tetap mendapat CTA tambah transaksi personal. Opsi Business disembunyikan atau disabled dengan penjelasan izin.

Filter daftar:

- Semua / All
- Pribadi / Personal
- Bisnis / Business

Kontrak daftar gabungan:

- DTO presentasi dinormalisasi, tetapi mutation tetap menuju action personal atau business terpisah.
- Sort canonical lintas storage: `date DESC, created_at DESC, source_rank DESC, id DESC`, dengan `source_rank = 1` untuk personal dan `0` untuk business. DTO tetap mengekspos `source = personal | business` untuk mencegah collision ID.
- Mode `All` memakai keyset cursor `{date, createdAt, sourceRank, id}`. Server mengambil maksimal 100 kandidat setelah cursor dari masing-masing storage, merge + sort, memotong sesuai page size, lalu mengembalikan cursor row terakhir. Jangan gunakan offset pada mode `All`.
- Cursor bersifat eksklusif. Comparator SQL pada masing-masing storage wajib identik dengan comparator merge. Urutan `source` dikunci eksplisit sebagai `personal` sebelum `business`, bukan bergantung pada urutan string atau locale.
- Semua row lama setelah cursor wajib tetap reachable tanpa duplicate atau skip pada page berikutnya. Insert baru yang mengurut sebelum cursor boleh tidak muncul pada sesi pagination berjalan; insert tidak boleh menyebabkan row lama hilang atau muncul dua kali.
- Mode Personal dan Business boleh memakai pagination native masing-masing storage.
- `ponytail:` bounded merge dibatasi 100 kandidat per storage per request; ganti dengan authorized SQL `UNION ALL` bila volume atau latency nyata melewati batas.
- Filter project/client hanya aktif pada mode Bisnis.
- Export dan bulk action mode Semua ditunda; export bisnis existing tidak berubah.

### 4.4 Bucket dan tipe transaksi personal

Bucket:

- Kebutuhan / Needs
- Keinginan / Wants
- Tabungan / Savings
- Di luar anggaran / Unbudgeted

Tipe record:

- `expense` untuk Needs, Wants, dan Unbudgeted.
- `allocation` untuk Savings.
- `income` ditunda; pendapatan MVP tetap menjadi input pada konfigurasi budget bulanan.

Bucket default melekat pada kategori personal. Form transaksi mengisi otomatis dari kategori, tetapi user boleh override. Kategori personal berdiri sendiri dan tidak memakai `expense_categories` milik workspace.

### 4.5 Data model dan integrity

Tabel bisnis existing `expenses`, `expense_categories`, dan `expense_recurring` tidak diubah semantik. Ini mencegah sekitar 30 consumer laporan/export/AI/dashboard ikut berisiko.

Storage personal baru, dengan kontrak PostgreSQL/Drizzle konkret:

```text
personal_transaction_categories
- id UUID PK default random
- user_id text NOT NULL FK → users(id) ON DELETE CASCADE
- name varchar(100) NOT NULL
- color varchar(7) NOT NULL default '#64748b', CHECK hex color
- icon varchar(50) nullable
- default_bucket: needs | wants | savings | unbudgeted, NOT NULL
- created_at timestamptz NOT NULL default now()
- updated_at timestamptz NOT NULL default now()
- UNIQUE (id, user_id)
- UNIQUE INDEX (user_id, lower(name))
- INDEX (user_id, name)

personal_transactions
- id UUID PK default random
- user_id text NOT NULL FK → users(id) ON DELETE CASCADE
- category_id UUID nullable
- transaction_type: expense | allocation, NOT NULL
- budget_bucket: needs | wants | savings | unbudgeted, NOT NULL
- amount numeric(18,2) NOT NULL, CHECK amount > 0
- currency char(3) NOT NULL, CHECK uppercase ISO-like `[A-Z]{3}`
- date date NOT NULL
- description varchar(500) NOT NULL
- merchant varchar(200) nullable
- receipt_key text nullable
- receipt_mime varchar(100) nullable
- receipt_size_bytes bigint nullable, CHECK receipt_size_bytes > 0 when present
- receipt_checksum text nullable
- created_at timestamptz NOT NULL default now()
- updated_at timestamptz NOT NULL default now()
- UNIQUE (id, user_id)
- composite FK (category_id, user_id) → personal_transaction_categories(id, user_id) ON DELETE NO ACTION
- INDEX (user_id, date DESC, created_at DESC, id DESC)
- INDEX (user_id, currency, date)
```

Constraint minimum:

- Semua mutation/read personal mengambil `user_id` dari session, bukan browser payload.
- Semua parent personal memiliki `UNIQUE (id, user_id)`; child menyimpan `user_id` dan memakai composite FK ownership. Validasi aplikasi tetap ada, tetapi bukan pengganti constraint DB.
- FK kategori transaksi memakai `(category_id, user_id)` → kategori `(id, user_id)`. Delete kategori memakai transaction untuk set `category_id = NULL` pada transaksi user yang sama, lalu delete kategori; snapshot bucket tetap tersimpan.
- `allocation` hanya valid untuk bucket `savings`.
- `expense` tidak boleh memakai bucket `savings`.
- Unique kategori personal `(user_id, lower(name))` atau padanan case-insensitive.
- Receipt key canonical: `personal/{user_id}/receipts/{transaction_id}/{uuid}.{ext}` dan selalu dibuat server.
- Receipt metadata (`receipt_mime`, `receipt_size_bytes`, `receipt_checksum`) diisi server setelah object write dan menjadi expected artifact reconciliation. Metadata harus seluruhnya `NULL` saat `receipt_key` null dan lengkap saat key terisi.
- Upload hanya menerima PDF/JPEG/PNG/WebP, maksimal 10 MiB, serta memvalidasi declared MIME, extension, dan magic bytes. Transaction harus sudah dibuat sebelum upload. Kegagalan DB setelah object write wajib melakukan compensating delete; replace/delete transaksi wajib membersihkan object lama. Download mengambil transaksi dengan `id + session user_id`, memverifikasi prefix canonical, lalu membuat signed URL 300 detik. Browser tidak boleh memilih object key bebas atau external URL.
- Data personal tidak masuk laporan bisnis, dashboard bisnis, AI workspace, activity log workspace, recurring business, maupun export bisnis.

Budget config:

```text
personal_budgets
- id UUID PK default random
- user_id text NOT NULL FK → users(id) ON DELETE CASCADE
- month date NOT NULL, CHECK first day of month
- currency char(3) NOT NULL, CHECK uppercase `[A-Z]{3}`; application whitelist ISO 4217
- income numeric(18,2) NOT NULL, CHECK income > 0
- needs_pct numeric(5,2) NOT NULL default 50
- wants_pct numeric(5,2) NOT NULL default 30
- savings_pct numeric(5,2) NOT NULL default 20
- CHECK setiap percentage 0–100
- CHECK needs_pct + wants_pct + savings_pct = 100
- enabled boolean NOT NULL default true
- created_at timestamptz NOT NULL default now()
- updated_at timestamptz NOT NULL default now()
- UNIQUE (id, user_id)
- INDEX (user_id, month DESC, currency)
```

Unique `(user_id, month, currency)`. DB check first-of-month: `month = date_trunc('month', month)::date`. Perubahan budget/transaksi historis langsung menghitung ulang; MVP tidak memiliki month lock atau personal audit ledger. Disable hanya mengubah `enabled=false`, tidak menghapus config atau transaksi. Copy previous month memakai transaction + unique constraint; jika target sudah ada, minta konfirmasi replace dan lakukan atomic update.

Tidak perlu backfill tabel expense existing karena seluruh record lama tetap bisnis.

### 4.6 Rumus dan status budget

```text
target_needs = round(income × needs_pct / 100, 2)
actual_needs = sum(expense bucket needs)
remaining_needs = target_needs - actual_needs

target_wants = round(income × wants_pct / 100, 2)
actual_wants = sum(expense bucket wants)
remaining_wants = target_wants - actual_wants

target_savings = round(income × savings_pct / 100, 2)
actual_savings = sum(allocation bucket savings)
remaining_savings = target_savings - actual_savings
```

- Rounding dilakukan per target akhir dengan PostgreSQL `round(numeric, 2)`, bukan per komponen transaksi dan bukan floating-point JS.
- Expense `unbudgeted` tampil sebagai baris terpisah dan tidak mengurangi remaining Needs/Wants.
- Needs/Wants di atas target berstatus warning; Savings mencapai/melewati target berstatus berhasil.
- Boundary bulan memakai kolom `date`, bukan `created_at`.
- Budget disabled tetap mengizinkan transaksi personal; hanya kartu target/progress yang disembunyikan.

### 4.7 Multi-currency

- Jangan menjumlahkan mata uang berbeda.
- Setiap kartu budget hanya untuk satu bulan dan satu mata uang.
- Transaksi hanya dihitung ke budget dengan user, periode, dan mata uang yang sama.
- `Needs + Wants + Unbudgeted` membentuk total spending.
- `Savings` dihitung dari total `allocation`, tidak mengurangi atau menambah total spending.
- Jika user memakai lebih dari satu mata uang, tampilkan selector mata uang; jangan konversi otomatis pada MVP.

## 5. Bilingual/i18n contract

Semua string memakai sistem i18n Cubiqlo dan `cubiqlo_lang`.

Wajib bilingual:

- Sidebar dan tab
- Heading dan helper copy
- Form label dan placeholder
- Button dan menu aksi
- Empty/loading/error state
- Toast
- Validation message
- Confirmation dialog
- Badge/status
- Tooltip
- `aria-label` dan screen-reader text
- Date/number/currency locale
- Email/notifikasi jika fitur reminder ditambahkan kelak

Tidak boleh ada formatter hardcoded `id-ID`. Gunakan locale aktif.

Timezone user-level disimpan sebagai `users.timezone text NOT NULL DEFAULT 'Asia/Jakarta'`. Mutation memvalidasi nama IANA lewat runtime `Intl.DateTimeFormat`; nilai invalid ditolak. Server menentukan `local_date` check-in dari timezone user; browser tidak menjadi source of truth. Saat timezone berubah, histori lama tidak digeser dan check-in baru memakai timezone terbaru. Setelah migration, workspace timezone tidak menjadi runtime fallback fitur personal.

Repo belum memiliki timezone user-level. Migration backfill memakai timezone workspace yang dimiliki user (`workspaces.owner_id = users.id`) dengan urutan deterministik `workspaces.created_at ASC, workspaces.id ASC`; jika user tidak memiliki workspace, gunakan `Asia/Jakarta`. Membership workspace lain tidak dipakai karena repo tidak menyimpan workspace aktif secara durable. Reconciliation mencatat jumlah row dari owner-workspace dan fallback.

Label inti:

| Indonesia           | English              |
| ------------------- | -------------------- |
| Produktivitas       | Productivity         |
| Ringkasan           | Overview             |
| Tujuan              | Goals                |
| Kebiasaan           | Habits               |
| Kebiasaan hari ini  | Today's habits       |
| Tujuan aktif        | Active goals         |
| Progress minggu ini | This week's progress |
| Streak aktif        | Current streak       |
| Streak terbaik      | Best streak          |
| Pengeluaran         | Expenses             |
| Anggaran            | Budget               |
| Kebutuhan           | Needs                |
| Keinginan           | Wants                |
| Tabungan            | Savings              |
| Di luar anggaran    | Unbudgeted           |
| Pribadi             | Personal             |
| Bisnis              | Business             |

## 6. Mobile UX dan accessibility

- Tab Produktivitas tetap dapat di-scroll horizontal pada layar kecil.
- Checklist habit minimum touch target 44×44 px.
- Form create/edit memakai dialog desktop dan bottom sheet/full-screen dialog mobile sesuai pola Cubiqlo.
- Progress bar memakai role dan nilai ARIA lengkap.
- Status tidak bergantung pada warna saja; selalu sertakan label.
- Kalender habit tidak memaksa grid desktop 31 kolom pada mobile; gunakan daftar mingguan atau horizontal scroll terkendali.
- Aksi utama tetap terlihat tanpa form ribuan pixel.

## 7. Out of scope MVP

- Reminder habit via push/email
- Social sharing, leaderboard, accountability partner
- AI coaching
- Habit kuantitatif/unit tracking
- Goal dependency kompleks
- Goal kolaboratif antar-member
- Sinkronisasi bank
- Automatic currency conversion
- Debt tracker penuh
- Investment portfolio
- Menyalin template, formula, desain, atau copy spreadsheet referensi

Tambah hanya setelah pemakaian MVP menunjukkan kebutuhan.

## 8. Fase implementasi

### Phase 0 — Audit dan baseline

- Audit sidebar Personal dan route Personal saat ini.
- Audit wiring navigation karena group Personal saat ini owner-only; sediakan Produktivitas untuk semua authenticated roles tanpa membuka Catatan/Jurnal yang tetap dibatasi.
- Inventaris consumer `expenses` untuk membuktikan storage personal tidak menyentuh semantik bisnis.
- Audit i18n pattern ID/EN saat ini.
- Rekam baseline build, typecheck, test, dan screenshot dev.
- Lock timezone/date convention untuk check-in habit dan transaksi personal.

**Gate:** route/role contract jelas; storage personal tidak memerlukan perubahan query bisnis.

### Phase 0A — Contract lock wajib

- Tambah/lock preference timezone user-level dan kebijakan perubahan timezone.
- Lock schema konkret goal, step, habit, check-in, kategori, transaksi, dan budget.
- Lock composite ownership FK, cascade behavior, DB checks, precision, index, dan enum.
- Lock rumus/status budget dan penanganan Unbudgeted.
- Lock sort/pagination bounded untuk daftar All.
- Lock semantics jadwal habit tanpa weekly target.
- Lock receipt key/upload/download contract.
- Lock hubungan status-progress goal.
- Lock role matrix: owner/member/viewer dapat read/write personal miliknya; viewer hanya read business Expense; owner/member dapat write business Expense.
- Ubah navigation visibility dari group-only menjadi child-level roles. Group Personal tampil jika minimal satu child visible; Notes/Journal owner-only, Productivity semua role.
- Lock money arithmetic pada PostgreSQL `numeric` dan larang aggregate budget dengan `Number`/`parseFloat`.
- Tulis migration plan, reconciliation query, dan negative ownership matrix.

**Gate:** seluruh keputusan di atas tercermin pada schema/migration design; implementor tidak perlu mengarang kontrak domain. Gate belum lulus hanya karena dokumen ini lengkap: migration SQL/Drizzle, reconciliation SQL, negative matrix, dan migration tests harus sudah tertulis serta direview.

### Phase 0A deliverables konkret

1. Migration user timezone dan tujuh tabel personal, lengkap dengan nama constraint/index.
2. Reconciliation SQL: row count, orphan parent/child, ownership mismatch, invalid enum/bucket, invalid currency/month, dan duplicate check-in/category/budget.
3. Negative matrix user A/B untuk seluruh read, mutation, relation, receipt, dan budget.
4. Navigation role wiring tests untuk owner/member/viewer.
5. Habit delete-goal transaction test dan concurrent check-in test.
6. Cursor contract tests: tie timestamp, ID collision lintas source, page boundary, dan insert di antara request.
7. Currency whitelist tests: kode ISO 4217 valid diterima; kode tiga huruf non-ISO ditolak aplikasi.
8. Budget nullability/default tests: income dan ketiga percentage tidak dapat `NULL`; default 50/30/20 menghasilkan total tepat 100.
9. Weekday DB enforcement tests: daily-array mismatch, empty specific weekdays, nilai di luar 0–6, dan duplikat ditolak DB.
10. Receipt lifecycle tests: invalid content, cross-user download, upload failure cleanup, replace cleanup, delete cleanup.

Artifact desain Phase 0A:

- `docs/plans/personal-productivity-phase0a-schema.md` — urutan migration, kontrak tabel, ledger constraint/index, transaction boundary, dan rollback.
- `docs/plans/personal-productivity-phase0a-reconciliation.sql` — row count, orphan/ownership mismatch, invalid domain, duplicate, receipt prefix, dan object inspection.
- `docs/plans/personal-productivity-phase0a-object-reconciliation.md` — kontrak audit read-only object storage; script executable dibuat bersama migration Phase 0A, bukan dipalsukan sebagai artifact siap jalan.
- `docs/plans/personal-productivity-phase0a-negative-matrix.md` — role/navigation serta positive-negative matrix user A/B.
- `docs/plans/personal-productivity-phase0a-test-contract.md` — migration, DB invariant, action, cursor, navigation, receipt, dan approval gates.

Artifact desain ini menyelesaikan contract lock, tetapi belum meluluskan gate coding. Gate baru lulus setelah migration SQL slot terbaru dan Drizzle schema ditulis, reconciliation dijalankan pada disposable clone, seluruh behavioral test menghasilkan bukti hijau, lalu direview mekanis.

### Phase 1 — Goal Tracker

- Schema goal + goal steps.
- Migration idempotent.
- Server actions dengan ownership check.
- Produktivitas shell + tabs.
- Goal list/detail/create/edit/defer/cancel/hard-delete. Tidak ada status archive pada MVP.
- Progress otomatis + manual fallback.
- ID/EN penuh.
- Unit/wiring tests.

**Acceptance:** user hanya melihat goal miliknya; progress benar; ID/EN tidak bocor.

### Phase 2 — Habit Tracker

- Schema habits + habit check-ins.
- Migration dan unique constraint.
- CRUD habit.
- Checklist hari ini.
- Jadwal mingguan.
- Kalender bulanan.
- Current/best streak dan completion rate.
- Link habit ke goal.
- Overview gabungan.
- ID/EN penuh.

**Acceptance:** check-in idempotent; streak menghormati jadwal; mobile usable.

### Phase 3A — Schema dan action transaksi personal

- Tambah schema kategori dan transaksi personal terpisah.
- Tambah constraint/index ownership dan bucket/type.
- Tambah server actions personal dengan user ID dari session.
- Negative ownership tests.

**Acceptance:** action personal terisolasi dan constraint DB menolak cross-user reference.

### Phase 3B — Personal list/form

- Tambah form dan daftar transaksi Pribadi tanpa mengubah surface Bisnis.
- Kategori personal, auto bucket, edit/delete, locale, dan empty/error state.

### Phase 3C — Unified Expense UX

- Update halaman/form/list agar bisnis dan pribadi terasa satu workflow.
- Implement filter All/Personal/Business dengan sort dan bounded merge contract.
- Pertahankan query, laporan, export, AI, recurring, dan API bisnis tanpa perubahan semantik.

### Phase 3D — Receipt personal

- Tambah receipt upload/download dengan key user-level canonical, MIME/size validation, ownership read, dan short-lived signed URL.

### Phase 3E — Business regression audit

- Audit seluruh consumer Expense bisnis.
- Jalankan targeted dan full regression; buktikan personal tidak masuk laporan/export/AI/activity/recurring/API bisnis.

**Acceptance Phase 3 keseluruhan:** personal tidak pernah muncul pada permukaan bisnis atau user lain; regresi Expense bisnis tetap hijau.

### Phase 4 — Budget 50/30/20

- Schema budget config.
- Enable/setup dialog.
- Kartu budget di halaman Expense.
- Auto bucket dari kategori.
- Actual-vs-target computation.
- Copy previous month.
- Per-currency selector.
- Empty/error/over-budget states.
- ID/EN penuh.

**Acceptance:** transaksi personal bulan/mata uang yang cocok memperbarui kartu; bisnis tidak memengaruhi budget.

### Phase 5 — QA, docs, release

- Migration verification pada DB fresh dan clone dev.
- Reconciliation: row count, orphan query, ownership mismatch query, dan constraint inspection sebelum/sesudah migration.
- Roll-forward recovery tercatat; backup/restore proof wajib sebelum production.
- Lint, typecheck, targeted tests, full tests, build.
- Authenticated desktop/mobile QA untuk ID dan EN.
- Permission sentinel: user A tidak melihat personal data user B.
- Multi-currency sentinel.
- Screenshot QA.
- Update feature inventory dan changelog.
- Merge ke `dev/integration`, deploy dev, smoke test.
- Production hanya setelah approval terpisah.

## 9. Test matrix minimum

### Goal

- Create/edit/defer/cancel/hard-delete goal; hard delete meminta konfirmasi nama goal
- Goal tanpa steps memakai manual progress
- Goal dengan steps menghitung progress otomatis
- Ownership user A/B
- Deadline dan status locale ID/EN

### Habit

- Daily dan specific weekdays tanpa weekly target
- Tidak ada row = belum selesai; toggle off menghapus row
- Duplicate check-in tanggal sama
- Toggle complete/incomplete
- Streak melewati non-scheduled day
- Best streak
- Month boundary, IANA timezone, perubahan timezone, dan DST
- Archived habit hilang dari Today's habits tetapi histori tetap ada

### Expense + Budget

- Expense bisnis lama tidak berubah
- Personal expense hanya terlihat pemilik
- Business tetap terlihat sesuai workspace role
- Business tidak masuk 50/30/20
- Personal tidak masuk laporan/export bisnis
- Needs/Wants/Savings actual benar
- Savings allocation tidak dihitung sebagai spending
- Expense tidak dapat disimpan sebagai bucket Savings
- Personal receipt user A tidak dapat diunduh user B
- Total percentage selain 100 ditolak
- Bulan/mata uang berbeda tidak tercampur
- Budget disabled tidak mengubah workflow Expense lama
- Viewer dapat CRUD personal tetapi tidak dapat mutation business
- Delete kategori mempertahankan transaksi dan bucket historis
- Copy previous month aman terhadap request bersamaan
- Upload receipt menolak MIME/extension/magic-byte mismatch dan file di atas 10 MiB
- Replace/delete receipt membersihkan object lama

### i18n

- Sidebar, tabs, form, toast, validation, empty state ID
- Surface yang sama EN
- Date/currency mengikuti locale aktif
- Tidak ada hardcoded `id-ID` pada file baru/diubah

## 10. Release gates

Wajib hijau sebelum handoff:

```text
eslint changed files
npx tsc --noEmit
relevant vitest suites
full vitest suite
npm run build
```

Runtime proof:

- Guest redirect benar
- Login ID dan EN
- Goal CRUD
- Habit CRUD + check-in
- Expense business regression
- Expense personal isolation
- Budget calculation
- Mobile screenshot
- Desktop screenshot
- Dev health/revision

## 11. Risiko utama

| Risiko                                  | Mitigasi                                                               |
| --------------------------------------- | ---------------------------------------------------------------------- |
| Personal expense bocor ke workspace     | tabel personal terpisah + session-derived user ID + negative tests     |
| Laporan bisnis berubah                  | jangan ubah semantik/query tabel expense bisnis                        |
| Persentase/streak salah karena timezone | timezone user-level IANA; server-derived local date; test boundary/DST |
| Sidebar membengkak                      | satu submenu Productivity, navigasi internal                           |
| Produktivitas hanya terlihat owner      | role contract eksplisit; semua authenticated roles dapat Productivity  |
| Savings salah dianggap spending         | tipe `allocation`; ringkasan spending dan saving dihitung terpisah     |
| ID/EN tidak konsisten                   | kamus i18n + EN screenshot QA                                          |
| Referensi berlisensi personal disalin   | gunakan konsep generik saja; desain/copy/formula original Cubiqlo      |
| Mata uang tercampur                     | query dan UI selalu group/filter per currency                          |

## 12. Definition of done

Fitur dianggap selesai hanya jika:

- Sidebar hanya bertambah satu item `Produktivitas / Productivity`.
- Tujuan dan Kebiasaan berfungsi end-to-end, bukan shell UI.
- Overview memiliki data nyata dari goal/habit.
- Budget berada di halaman Expense tanpa menu baru.
- Fitur budget opsional; Expense lama tetap mudah dipakai tanpa aktivasi.
- Personal dan business terisolasi lewat storage, auth, query, receipt, report, export, dan AI.
- Goal/Habit/Budget tetap sama ketika user berpindah workspace.
- ID/EN lengkap pada desktop/mobile.
- Migration, tests, build, authenticated QA, dan screenshot QA lulus.
- Dev deployment sehat.
- Tidak ada deploy production tanpa approval eksplisit.

## 13. Audit resolution log

Audit implementation-readiness diselesaikan pada revisi ini:

- Composite FK Habit → Goal tidak lagi memakai invalid full-column `SET NULL`.
- Schema finance personal dikonkretkan dengan tipe, nullability, FK, checks, index, dan delete behavior.
- Receipt upload/download/replace/delete contract dikunci.
- Unified list memakai stable keyset cursor lintas source.
- Navigation memakai child-level role visibility.
- User timezone migration/backfill/validation dikunci.
- Budget month/currency checks dan decimal arithmetic dikunci.
- Goal archive inconsistency dihapus.
- Viewer personal-vs-business permission matrix dikunci.

Dokumen ini tetap **NO-GO untuk coding** sampai Phase 0A deliverables konkret pada bagian 8 tersedia dan lolos review mekanis.
