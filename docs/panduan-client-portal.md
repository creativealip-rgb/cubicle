# Panduan Client Portal

Share progres, file, dan invoice ke klien — semua dalam satu portal.

---

## 1. Aktifkan Portal Klien

1. Buka `/app/clients`
2. Pilih klien → klik **Edit**
3. Cari **Aktifkan portal sekarang**
4. Portal otomatis generate token unik
5. Share link portal ke klien

> Link portal: `cubiqlo.com/p/[token]`

---

## 2. Isi Portal

Klien yang buka portal bisa lihat:

### Dashboard
- Progress proyek (persentase, task selesai/total)
- Invoice status (terkirim, lunas)
- Aktivitas terbaru

### Proyek
- List proyek yang **client visible**
- Progress bar per proyek
- Klik proyek untuk detail

### Task Review
- Task yang sudah di-review (status "Review")
- Klien bisa **Setujui** atau **Revisi**
- Status update real-time ke workspace kamu

### File
- Download file yang di-share
- Upload file (jika diizinkan)

### Invoice
- Lihat invoice yang sudah dikirim
- Download PDF invoice
- Lihat status pembayaran

---

## 3. Setujui & Revisi Task

Task yang masuk review bisa di-approve klien:

1. Klien buka portal → tab **Task**
2. Lihat task dengan status "Review"
3. Klik **Setujui** → task auto-selesai
4. Atau klik **Revisi** + tulis catatan → task kembali ke "Dikerjakan"

Kamu dapat notifikasi di dashboard saat klien approve/revisi.

---

## 4. Share File ke Klien

1. Buka `/app/files`
2. Upload file ke folder klien
3. File otomatis muncul di portal klien

Atau dari halaman klien/proyek, upload langsung.

---

## 5. Custom Branding

Portal klien bisa di-custom:

1. Buka `/app/settings?tab=branding`
2. Upload **logo workspace**
3. Atur **warna primary**
4. Portal klien ikut tema workspace kamu

---

## 6. Tips

| Tips | Detail |
|---|---|
| **Aktifkan portal sejak awal** | Klien bisa mantau progres tanpa nanya-nanya |
| **Setujui task dulu** | Sebelum kirim ke klien, pastikan task udah rapi |
| **Share file hasil kerja** | Upload deliverable ke portal — klien download sendiri |
| **Invoice di portal** | Klien bisa lihat & download invoice kapan aja |
| **Nonaktifkan sementara** | Edit klien → matikan portal toggle |

---

## FAQ

**Q: Klien perlu login?**
A: Tidak. Portal bisa diakses via link token. No password needed.

**Q: Klien bisa edit data?**
A: Tidak. Klien cuma bisa lihat, approve task, upload file, dan download.

**Q: Bisa multiple klien lihat portal yang sama?**
A: Share link yang sama ke semua stakeholder klien.

**Q: Gimana kalau klien lupa link?**
A: Buka halaman klien → copy link portal.

**Q: Klien bisa lihat semua invoice?**
A: Hanya invoice yang sudah dikirim (status: Terkirim/Dilihat/Lunas).
