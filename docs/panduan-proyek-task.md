# Panduan Proyek & Task

Kelola pipeline kerja dari awal sampai selesai.

---

## 1. Dashboard & Overview Proyek

Dashboard (`/app/dashboard`) memberi ringkasan operasional:

- **KPI**: Klien Aktif & Proyek Aktif
- **Reminder**: invoice jatuh tempo, task perlu dikerjakan, approval task client, kontrak menunggu
- **Aktivitas Terbaru**: riwayat aktivitas workspace (termasuk perubahan proyek/task)
- **Keuangan**: revenue 30 hari + pie per klien

---

## 2. Buat Proyek

1. Buka `/app/projects`
2. Klik **Proyek Baru**
3. Isi:
   - **Nama proyek** — deskriptif & singkat
   - **Klien** — pilih klien terkait
   - **Model Tagihan** (salah satu dari 3):
     - **Harga Tetap (Fixed Price)** — nilai proyek tetap; pembayaran per milestone/invoice
     - **Per Jam (Hourly)** — tarif per jam; waktu dicatat & ditagih via import waktu
     - **Retainer** — biaya per periode + kuota menit; reset tiap periode, ada kebijakan overage
   - **Due Date** — tenggat proyek
4. Klik **Buat**

---

## 3. Status & Filter Proyek

List proyek (`/app/projects`) punya **status tab** + filter:

| Status | Arti |
|---|---|
| **Aktif** | Sedang berjalan (tab default) |
| **Draf** | Belum aktif, masih persiapan |
| **Ditunda (On Hold)** | Pending (klien delay, dsb) |
| **Selesai** | Done, siap arsip |
| **Dibatalkan** | Project batal |
| **Diarsipkan** | Tersembunyi dari list aktif |

Filter tambahan: **Klien** (per klien) dan **Billing** (Harga Tetap / Per Jam / Retainer), serta **sort** nama proyek / due date.
Ganti status proyek dari halaman detail proyek.

---

## 4. Progress & Detail Proyek

Di halaman detail proyek (`/app/projects/[projectId]`):

- **Progress bar** — tergantung model tagihan:
  - Harga Tetap: task selesai / total task
  - Per Jam: task selesai + akumulasi jam
  - Retainer: jam disetujui / kuota menit termasuk
- **Total task** & **task selesai**
- **Jam tercatat** — total waktu (hourly/retainer)
- **Kuota retainer** — sisa menit & % terpakai

### Tab Detail

| Tab | Isi |
|---|---|
| **Tugas** | Editor task sesuai mode proyek (lihat Task Modes) |
| **Berkas** | File proyek (upload, visibility) |
| **Waktu** | Log waktu terkait proyek (tampil jika tracking aktif / ada riwayat) |
| **Invoice** | Ringkasan model tagihan, rate/budget/retainer, dan invoice terkait |

### Visibilitas Klien

Setiap proyek bisa di-set **Tampilkan di Portal Klien**:
- Aktif → klien bisa lihat progres & task di portal
- Nonaktif → hidden dari portal klien

### Timeline / Aktivitas

Perubahan penting (status proyek, task, invoice) tercatat di **log aktivitas** workspace — terlihat di Dashboard (**Aktivitas Terbaru**) dan feed aktivitas portal klien.

### Arsip vs Hapus Permanen

- **Arsip** — ubah status jadi **Diarsipkan**: proyek tersembunyi dari list aktif, data tetap utuh & bisa dipulihkan (ubah status lagi).
- **Hapus Permanen** — tombol hapus di detail proyek: konfirmasi dengan **mengetik nama proyek**; menghapus proyek beserta seluruh data terikat secara transaksional. Tidak bisa dibatalkan.

---

## 5. Task Modes

Mode task ditentukan model tagihan proyek (bisa diubah via kebijakan task proyek):

| Mode | Dipakai untuk | Cara kerja |
|---|---|---|
| **Workflow** | Harga Tetap (Fixed Price) | Kanban: **Backlog → Todo → In Progress → In Review → Done**; drag & drop antar kolom |
| **Reusable** | Per Jam & Retainer | Flat list task berulang (recurring); task dipakai berulang tiap periode, tanpa status kanban |

### Buat Task
1. Buka tab **Tugas** di detail proyek
2. Klik **+** / **Tambah Task**
3. Isi judul task
4. Opsional: deskripsi, assignee, due date, priority

### Task Detail
Klik task untuk buka detail sheet:
- **Judul & deskripsi**
- **Assignee** — siapa yang ngerjain
- **Priority** — urgent / high / medium / low
- **Due date** — tenggat task
- **Time entries** — catatan waktu terkait
- **Status** — update progress

---

## 6. Task Views

### Global Tasks (`/app/tasks`)
- **List view** — tabel semua task
- **Board view** — kanban grouped by status
- Toggle di atas: **Daftar** / **Papan**
- Filter: project, assignee, priority, status

### Mobile
- Di HP, task tampil sebagai cards (compact)
- Tap card untuk buka detail sheet

---

## 7. Retainer: Kuota & Overage

Untuk proyek **Retainer**, konfigurasi di form proyek:

- **Biaya Retainer** — fee per periode
- **Menit Termasuk** — kuota menit per periode
- **Tanggal Reset (1–28)** — hari reset periode
- **Kebijakan Overage**:
  - **Tidak ada** — tanpa penanganan overage
  - **Peringatkan** — hanya peringatan saat kuota habis
  - **Tagihkan** — overage ditagih dengan **Rate Overage**

Progress bar retainer = jam disetujui ÷ kuota termasuk; saat melewati kuota, overage dihitung sesuai kebijakan.

---

## 8. Tips

| Tips | Detail |
|---|---|
| **Bikin task kecil** | Task 1-3 hari lebih gampang di-track |
| **Assign task** | Jangan biarin task unassigned terlalu lama |
| **Update status** | Pindahin task ke "Review" sebelum "Selesai" |
| **Due date task** | Set due date untuk task prioritas |
| **Portal klien** | Aktifkan client visible untuk transparansi |

---

## FAQ

**Q: Bisa multi proyek per klien?**
A: Ya. Satu klien bisa punya banyak proyek.

**Q: Beda model tagihan pengaruh apa?**
A: Cara invoicing & mode task. Harga Tetap = nilai tetap + workflow kanban. Per Jam = rate × jam, tagih via import waktu. Retainer = fee per periode + kuota menit, overage sesuai kebijakan.

**Q: Gimana ganti model tagihan?**
A: Edit proyek → ubah model tagihan. Tidak mengubah invoice yang sudah ada.

**Q: Task bisa recurring?**
A: Ya. Di mode **Reusable** (Per Jam / Retainer) task bersifat recurring; di mode **Workflow** (Harga Tetap) task one-time di kanban.

**Q: Apa bedanya arsip dan hapus permanen?**
A: Arsip = sembunyikan dari list aktif, bisa dipulihkan. Hapus permanen = hapus semua data proyek, perlu ketik nama proyek, tidak bisa dibatalkan.
