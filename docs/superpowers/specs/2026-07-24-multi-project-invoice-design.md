# Multi-Project Invoice Design

## Goal
Mempercepat pembuatan invoice: user memilih satu klien dan beberapa proyek; proyek otomatis menjadi item tagihan. Proyek beda mata uang dikonversi memakai kurs manual workspace.

## UX
- Klien tetap single-select.
- Proyek menjadi multi-select dan hanya menampilkan proyek milik klien terpilih.
- Memilih proyek otomatis menambah item proyek; item manual tidak lagi wajib.
- Menghapus proyek meminta konfirmasi lalu menghapus item otomatis terkait.
- Item otomatis tetap dapat diedit setelah dibuat.
- Timesheet menampilkan entri dari seluruh proyek terpilih.
- Mata uang invoice default memakai base currency workspace, tetapi tetap dapat dipilih.
- Item proyek beda mata uang menampilkan nominal asli, kurs manual, dan hasil konversi.
- Jika kurs menuju mata uang invoice tidak tersedia, proyek tidak dapat dipilih dan UI menampilkan tautan **Atur Kurs**.

## Nominal Proyek
- Billing `project`: gunakan budget proyek.
- Billing `package`: gunakan custom price jika ada, selain itu harga service.
- Billing `hours`: tidak membuat nominal budget; gunakan timesheet terpilih dikali hourly rate.
- Fallback budget hanya dipakai jika tipe billing lain memiliki budget valid.

## Currency Conversion
Kurs workspace disimpan sebagai `1 foreign currency = N base currency`.
- Sumber sama dengan tujuan: nilai tidak berubah.
- Foreign ke base: `amount × rate`.
- Base ke foreign: `amount ÷ rate`.
- Foreign A ke foreign B: `(amount × rateA) ÷ rateB`.
- Tidak ada tebakan atau live API.
- Nilai konversi dan kurs efektif dibekukan ke item saat invoice dibuat agar invoice historis tidak berubah ketika Settings diperbarui.

## Data Model
Payload create invoice berisi item manual, item proyek, dan item timesheet. Item proyek membawa `projectId`, original amount/currency, conversion rate, dan converted amount. Jika schema saat ini belum memiliki metadata sumber proyek/FX, tambahkan kolom terstruktur atau metadata JSON melalui migrasi aman; jangan menyandarkan data audit pada deskripsi teks.

## Server Validation
- Semua proyek harus milik client dan workspace aktif.
- Semua kurs dihitung ulang di server dari workspace currency rates.
- Nominal proyek dihitung ulang dari data proyek/service di server.
- Time entry harus billable, belum invoiced, serta berasal dari client dan salah satu proyek terpilih.
- Invoice, items, dan status timesheet disimpan atomik dalam satu transaksi.
- Duplicate project/time entry ditolak.

## Error Handling
- Kurs hilang: blok submit dan sebut pasangan mata uang yang kurang.
- Project tanpa nominal pada billing non-hourly: item dibuat bernilai nol dan wajib diedit sebelum submit.
- Perubahan klien mereset proyek serta timesheet setelah konfirmasi jika sudah ada pilihan.

## Testing
- Unit test konversi same/base/foreign/cross-currency dan missing rate.
- Unit test nominal per billing type.
- Server validation project ownership, duplicate source, stale rate, dan time-entry eligibility.
- UI test multi-select, auto item, removal confirmation, reset client, subtotal, dan mobile layout.
- Typecheck, focused tests, production build, authenticated browser QA, lalu deploy sesuai guardrail VPS.
