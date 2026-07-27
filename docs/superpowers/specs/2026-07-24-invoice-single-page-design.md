# Invoice Single-Page Creation Design

## Goal
Membuat draft invoice lengkap dalam satu halaman: metadata, item manual, import timesheet, dan ringkasan total sebelum penyimpanan.

## UX
- Klien wajib; perubahan klien mereset proyek dan pilihan timesheet.
- Proyek opsional dan tersaring berdasarkan klien; mata uang mengikuti proyek.
- Tanggal terbit default hari ini; jatuh tempo default 14 hari setelah tanggal terbit dan ikut berubah sampai user mengeditnya manual.
- Item manual dapat ditambah/hapus inline. Minimal satu item manual atau satu time entry dipilih sebelum submit.
- Time entry billable yang belum invoiced tampil setelah klien/proyek dipilih.
- Subtotal tampil real-time. Catatan, syarat, dan template tetap tersedia dalam bagian lanjutan.
- Submit membuat satu draft lengkap lalu menuju detail invoice. Pengiriman email tetap terpisah di halaman detail.

## Data Flow
Client mengirim metadata, item manual, dan timeEntryIds ke satu server action. Server memvalidasi workspace/client/project/time entries, membuat invoice dan semua item dalam transaksi DB, menandai time entry terpilih sebagai invoiced, menghitung ulang total, lalu mengembalikan ID invoice.

## Safety
- Tidak ada invoice kosong.
- Project harus milik client dan workspace aktif.
- Time entries harus billable, belum invoiced, dan sesuai client/project invoice.
- Transaksi rollback penuh jika satu langkah gagal.
- Perubahan lokal lain tidak disentuh.

## Verification
Unit test helper perhitungan/default date, TypeScript, test invoice existing, build, browser mobile/desktop, lalu health/routing live.