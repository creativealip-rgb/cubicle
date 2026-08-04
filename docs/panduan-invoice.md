# Panduan Invoice Cubiqlo

Dari mencatat waktu → kirim invoice → terima pembayaran. Semua dalam satu tempat.

---

## 1. Sebelum Invoice: Persiapan

Sebelum bikin invoice pertama, pastikan udah disiapkan:

| Step | Lokasi | Kenapa |
|---|---|---|
| Tambah **Klien** | `/app/clients` | Invoice perlu penerima |
| Buat **Proyek** | `/app/projects` | Invoice terikat ke proyek |
| Catat **Waktu** | `/app/time` | Untuk invoice hourly/retainer |
| Atur **Settings** | `/app/settings?tab=branding` | Logo, mata uang, pajak, terms |

---

## 2. Bikin Invoice Baru

1. Buka `/app/invoices`
2. Klik **Invoice Baru**
3. Pilih klien
4. Pilih proyek (opsional)
5. Tentukan tipe billing:
   - **Fixed Price** — harga tetap
   - **Per Jam** — tarif × jam
   - **Retainer** — biaya langganan bulanan
   - **Paket** — paket jam kerja

---

## 3. Isi Detail Invoice

Setelah dibuat, isi detail di halaman invoice:

### Info Dasar
- Nomor invoice (auto-generated: INV-YYYY-####)
- Tanggal terbit & jatuh tempo
- Mata uang

### Line Items
- Tambah item kerja
- Deskripsi, jumlah, harga satuan
- Bisa import waktu dari time entries

### Import Waktu (Hourly)
1. Klik **Import Waktu**
2. Pilih time entries yang belum ditagih
3. Rate otomatis dari project/client settings
4. Klik **Import**

### Pajak & Diskon
- Set tax rate (%)
- Tambah diskon

---

## 4. Kirim Invoice

Setelah invoice siap:

1. Review semua detail
2. Klik **Kirim Invoice**
3. Invoice dikirim via email ke klien
4. Status berubah: Draf → **Terkirim**

Klien dapat:
- Lihat invoice online via link
- Download PDF
- Lihat detail line items

---

## 5. Pantau Status

Invoice melewati beberapa status:

| Status | Arti |
|---|---|
| **Draf** | Belum dikirim |
| **Terkirim** | Sudah di-email ke klien |
| **Dilihat** | Klien sudah buka invoice |
| **Lunas** | Sudah dibayar |
| **Arsip** | Disembunyikan dari list aktif |

Dashboard **Keuangan** menunjukkan:
- Total ditagihkan
- Total belum dibayar
- Total dibayar (30 hari)

---

## 6. Pembayaran

### Tandai Dibayar
1. Buka invoice
2. Klik **Tandai Dibayar**
3. Masukkan:
   - Jumlah pembayaran
   - Metode pembayaran
   - Tanggal pembayaran
4. Status → **Lunas**

### Partial Payment
Bisa mencatat pembayaran sebagian. Invoice tetap "Terkirim" sampai total lunas.

---

## 7. Download & Share

- **Download PDF** — format profesional dengan logo
- **Share Link** — link publik untuk klien
- **Copy Link** — tempel di chat/email

---

## 8. Filter & Cari

List invoice support filter:

- **Status tab:** Semua / Draf / Terkirim / Dilihat / Lunas / Arsip
- **Klien filter:** per klien
- **Proyek filter:** per proyek
- **Billing filter:** Fixed Price / Per Jam / Retainer / Paket

Urutkan klik header kolom (No. Invoice, Tanggal, Total).

---

## 9. Workflow Ideal

```
Catat waktu → Pilih proyek → Import ke invoice
    ↓
Tambah item manual jika perlu
    ↓
Review + kirim invoice
    ↓
Klien lihat & bayar
    ↓
Tandai lunas → Laporan keuangan update otomatis
```

---

## FAQ

**Q: Invoice number bisa custom?**
A: Format INV-YYYY-#### auto. Counter per tahun.

**Q: Bisa multi-currency?**
A: Ya. Set currency per invoice. Dashboard ringkasan dalam IDR (setara).

**Q: Gimana klien bayar?**
A: Saat ini pembayaran manual (transfer). Kamu tandai lunas setelah terima. Payment gateway coming soon.

**Q: Bisa kirim invoice ke multiple email?**
A: Invoice dikirim ke email klien yang terdaftar. Tambah CC di settings.

**Q: PDF-nya putih polos?**
A: Ya, PDF putih dengan logo, detail invoice, line items, dan terms.
