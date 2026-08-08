# Panduan Time Tracking

Catat waktu kerja dengan timer atau input manual. Akurat, simpel, siap ditagih.

---

## 1. Mulai Timer

Cara termudah catat waktu:

1. Klik **▶️ Mulai Timer** di `/app/time`
2. Atau klik tombol timer (00:00) di top bar
3. Pilih proyek & task (opsional)
4. Timer berjalan — kerja seperti biasa
5. Klik **⏸️ Stop** setelah selesai

> 💡 Timer tetap jalan meski kamu pindah halaman atau tutup tab.

### Top Bar Timer
Timer di top bar menunjukkan waktu berjalan:
- Klik untuk pause/resume
- Klik dropdown untuk stop
- Lihat detail timer aktif

---

## 2. Input Manual

Kalau lupa start timer:

1. Buka `/app/time`
2. Klik **Catat Waktu**
3. Isi:
   - **Tanggal** — kapan kerja dilakukan
   - **Durasi** — jam & menit
   - **Proyek** — terkait proyek mana
   - **Task** — task spesifik (opsional)
   - **Deskripsi** — apa yang dikerjakan
   - **Billable** — bisa ditagih atau internal
4. Klik **Simpan**

---

## 3. Timesheet

### Tampilan Harian
- Default view di `/app/time`
- Lihat semua entry per hari
- Total jam per hari
- Navigasi: ← hari sebelumnya | hari ini | hari berikutnya →

### Tampilan Mingguan
- Klik tab **Mingguan**
- Grid 7 kolom (Senin-Minggu)
- Total jam per hari & per minggu
- Klik cell untuk edit entry

---

## 4. Filter & Sort

- **Proyek** — filter by project
- **Task** — filter by task
- **Status** — billable / non-billable / semua
- **Klien** — filter by client

---

## 5. Edit & Hapus

### Edit Entry
- Klik entry di timesheet
- Ubah durasi, deskripsi, proyek
- Toggle billable/non-billable
- Simpan

### Hapus Entry
- Klik entry
- Klik **Hapus**
- Entry dikembalikan ke status "approved" (bisa di-recover)

---

## 6. Ekspor

- **Ekspor PDF** — timesheet harian/mingguan
- **Import ke Invoice** — dari halaman invoice, klik Import Waktu

---

## 7. Tips

| Tips | Detail |
|---|---|
| **Start timer pagi** | Biasakan start timer pas mulai kerja |
| **Deskripsi jelas** | Tulis apa yang dikerjakan — memudahkan invoicing |
| **Assign proyek** | Selalu kaitkan ke proyek biar gampang ditagih |
| **Billable toggle** | Pisahkan kerja yang bisa ditagih vs internal |
| **Weekly review** | Cek timesheet mingguan tiap Jumat |

---

## FAQ

**Q: Timer tetap jalan kalau internet mati?**
A: Timer berbasis server. Kalau internet mati, timer tetap menghitung. Stop saat koneksi kembali.

**Q: Bisa edit entry yang sudah di-import ke invoice?**
A: Bisa. Tapi perubahan tidak otomatis update invoice. Re-import jika perlu.

**Q: Ada batasan jumlah entry?**
A: Tidak ada. Catat sebanyak yang kamu perlu.

**Q: Gimana cara lihat total jam per proyek?**
A: Filter by proyek di timesheet, atau lihat di halaman proyek detail.
