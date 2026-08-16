import { getCurrentLang, createT } from "@/lib/i18n";
import { FileText, Settings2, ListPlus, Send, BadgeCheck, Wallet, Download } from "lucide-react";
import {
  DocsBreadcrumb,
  DocsHero,
  DocsLayout,
  DocsSection,
  DocsCallout,
  DocsInlineLink,
} from "@/components/docs/doc-shell";

export default async function DocInvoice() {
  const lang = await getCurrentLang();
  const t = createT(lang);

  const toc = [
    { id: "persiapan", label: t("1. Persiapan", "1. Preparation") },
    { id: "bikin-invoice", label: t("2. Bikin Invoice", "2. Create Invoice") },
    { id: "detail-invoice", label: t("3. Detail Invoice", "3. Invoice Details") },
    { id: "kirim", label: t("4. Kirim", "4. Send") },
    { id: "status", label: t("5. Status", "5. Status") },
    { id: "pembayaran", label: t("6. Pembayaran", "6. Payment") },
    { id: "download", label: t("7. Download", "7. Download") },
  ];

  return (
    <div className="min-w-0 space-y-5">
      <DocsBreadcrumb
        items={[
          { label: t("Dokumentasi", "Documentation"), href: "/app/docs" },
          { label: t("Invoice & Pembayaran", "Invoice & Payments") },
        ]}
      />
      <DocsHero
        icon={FileText}
        category={t("Keuangan", "Finance")}
        title={t("Invoice & Pembayaran", "Invoice & Payments")}
        description={t(
          "Dari catat waktu sampai terima bayaran. Fixed price, hourly, dan retainer.",
          "From time tracking to getting paid. Fixed price, hourly, and retainer."
        )}
      />
      <DocsLayout toc={toc} tocLabel={t("Daftar Isi", "Table of Contents")}>
        <DocsSection id="persiapan" step={1} icon={Settings2} title={t("Persiapan", "Preparation")}>
          <p>
            {t(
              "Tambah Klien → Buat Proyek → Catat Waktu → Atur Settings (mata uang, pajak, terms).",
              "Add Client → Create Project → Track Time → Configure Settings (currency, tax, terms)."
            )}
          </p>
        </DocsSection>

        <DocsSection id="bikin-invoice" step={2} icon={ListPlus} title={t("Bikin Invoice", "Create Invoice")}>
          <p>
            {t(
              "/app/invoices → Invoice Baru → pilih klien, proyek, tipe billing (Fixed Price / Per Jam / Retainer).",
              "/app/invoices → New Invoice → select client, project, billing type (Fixed Price / Hourly / Retainer)."
            )}
          </p>
        </DocsSection>

        <DocsSection id="detail-invoice" step={3} icon={FileText} title={t("Detail Invoice", "Invoice Details")}>
          <p>
            {t(
              "Tambah line items atau Import Waktu dari time entries. Set pajak & diskon.",
              "Add line items or Import Time from time entries. Set tax & discount."
            )}
          </p>
        </DocsSection>

        <DocsSection id="kirim" step={4} icon={Send} title={t("Kirim", "Send")}>
          <p>
            {t(
              "Review → Kirim Invoice. Klien terima email + link invoice online + PDF.",
              "Review → Send Invoice. Client receives email + online invoice link + PDF."
            )}
          </p>
        </DocsSection>

        <DocsSection id="status" step={5} icon={BadgeCheck} title={t("Status", "Status")}>
          <p>
            {t(
              "Draf → Terkirim → Dilihat → Lunas → Arsip. Dashboard keuangan update otomatis.",
              "Draft → Sent → Viewed → Paid → Archived. Finance dashboard updates automatically."
            )}
          </p>
        </DocsSection>

        <DocsSection id="pembayaran" step={6} icon={Wallet} title={t("Pembayaran", "Payment")}>
          <p>
            {t(
              "Tandai Dibayar → masukkan jumlah, metode, tanggal. Support partial payment.",
              "Mark Paid → enter amount, method, date. Partial payments supported."
            )}
          </p>
        </DocsSection>

        <DocsSection id="download" step={7} icon={Download} title={t("Download", "Download")}>
          <p>
            {t(
              "PDF putih profesional dengan logo. Share link publik.",
              "Professional white PDF with your logo. Public share link."
            )}
          </p>
          <DocsCallout variant="info">
            {t(
              "Pelajari cara mengimpor waktu yang belum ditagih ke invoice di panduan:",
              "Learn how to import unbilled time into invoices in the guide:",
            )}{" "}
            <DocsInlineLink href="/app/docs/time-tracking">{t("Time Tracking", "Time Tracking")}</DocsInlineLink>
          </DocsCallout>
        </DocsSection>
      </DocsLayout>
    </div>
  );
}
