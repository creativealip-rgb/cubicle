# Panduan Proyek & Task

Kelola pipeline kerja dari awal sampai selesai.

---

## 1. Buat Proyek

1. Buka `/app/projects`
2. Klik **Proyek Baru**
3. Isi:
   - **Nama proyek** — deskriptif & singkat
   - **Klien** — pilih klien terkait
   - **Tipe Billing:**
     - **Fixed Price** — harga tetap
     - **Per Jam** — hourly rate
     - **Retainer** — bulanan dengan kuota jam
     - **Paket** — paket jam kerja
   - **Due Date** — tenggat proyek
4. Klik **Buat**

---

## 2. Status Proyek

| Status | Arti |
|---|---|
| **Draf** | Belum aktif, masih persiapan |
| **Aktif** | Sedang berjalan |
| **Ditunda** | Pending (klien delay, dsb) |
| **Selesai** | Done, siap arsip |
| **Dibatalkan** | Project batal |
| **Diarsipkan** | Tersembunyi dari list aktif |

Ganti status proyek dari halaman detail proyek.

---

## 3. Progress Tracking

Di halaman proyek, kamu bisa lihat:

- **Progress bar** — persentase task selesai
- **Total task** — berapa task dibuat
- **Task selesai** — berapa yang done
- **Jam tercatat** — total waktu (untuk hourly)
- **Paket jam** — sisa kuota (untuk package)

---

## 4. Task — Kanban Board

### Board View
- **Belum Mulai** → **Dikerjakan** → **Review** → **Selesai**
- Drag & drop task antar kolom
- Warna kolom sesuai status

### Buat Task
1. Buka tab **Tugas** di proyek detail
2. Klik **+** di kolom yang sesuai
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

## 5. Task Views

### Global Tasks (`/app/tasks`)
- **List view** — tabel semua task
- **Board view** — kanban grouped by status (read-only)
- Toggle di atas: **Daftar** / **Papan**
- Filter: project, assignee, priority, status

### Mobile
- Di HP, task tampil sebagai cards (compact)
- Tap card untuk buka detail sheet

---

## 6. Filter Proyek

List proyek support filter:

- **Status tab** — aktif, draft, selesai, dll
- **Klien** — per klien
- **Billing** — fixed price / hourly / retainer / package
- **Sort:** nama proyek, due date

---

## 7. Client Visibility

Setiap proyek bisa di-set **client visible**:
- Aktif → klien bisa lihat progres di portal
- Nonaktif → hidden dari portal klien

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

**Q: Beda billing type pengaruh apa?**
A: Cara invoicing. Fixed price = harga total. Hourly = rate × jam. Retainer = bulanan.

**Q: Gimana ganti billing type?**
A: Edit proyek → ubah tipe billing. Tidak mengubah invoice yang sudah ada.

**Q: Task bisa recurring?**
A: Ya. Set behavior "recurring" saat buat task.
