import { getCurrentLang, createT } from "@/lib/i18n";
import Link from "next/link";

export default async function DocInvoice() {
  const lang = await getCurrentLang();
  const t = createT(lang);

  return (
    <div className="min-w-0 space-y-6 max-w-3xl">
      <div>
        <Link href="/app/docs" className="text-sm text-muted-foreground hover:text-primary">← Dokumentasi</Link>
        <h1 className="text-2xl font-bold mt-1">{t("Invoice & Pembayaran", "Invoice & Payments")}</h1>
      </div>

      <div className="space-y-4 text-sm text-muted-foreground">
        <div>
          <h2 className="text-base font-semibold text-foreground mb-1">1. Persiapan</h2>
          <p>Tambah Klien → Buat Proyek → Catat Waktu → Atur Settings (mata uang, pajak, terms).</p>
        </div>
        <div>
          <h2 className="text-base font-semibold text-foreground mb-1">2. Bikin Invoice</h2>
          <p>/app/invoices → Invoice Baru → pilih klien, proyek, tipe billing (Fixed Price / Per Jam / Retainer / Paket).</p>
        </div>
        <div>
          <h2 className="text-base font-semibold text-foreground mb-1">3. Detail Invoice</h2>
          <p>Tambah line items atau Import Waktu dari time entries. Set pajak & diskon.</p>
        </div>
        <div>
          <h2 className="text-base font-semibold text-foreground mb-1">4. Kirim</h2>
          <p>Review → Kirim Invoice. Klien terima email + link invoice online + PDF.</p>
        </div>
        <div>
          <h2 className="text-base font-semibold text-foreground mb-1">5. Status</h2>
          <p>Draf → Terkirim → Dilihat → Lunas → Arsip. Dashboard keuangan update otomatis.</p>
        </div>
        <div>
          <h2 className="text-base font-semibold text-foreground mb-1">6. Pembayaran</h2>
          <p>Tandai Dibayar → masukkan jumlah, metode, tanggal. Support partial payment.</p>
        </div>
        <div>
          <h2 className="text-base font-semibold text-foreground mb-1">7. Download</h2>
          <p>PDF putih profesional dengan logo. Share link publik.</p>
        </div>
      </div>
    </div>
  );
}
