import { getCurrentLang, createT } from "@/lib/i18n";
import Link from "next/link";

export default async function DocGettingStarted() {
  const lang = await getCurrentLang();
  const t = createT(lang);

  return (
    <div className="min-w-0 space-y-8 max-w-3xl">
      <div>
        <Link href="/app/docs" className="text-sm text-muted-foreground hover:text-primary transition-colors">
          ← {t("Dokumentasi", "Documentation")}
        </Link>
        <h1 className="text-2xl font-bold tracking-tight mt-1">
          {t("Panduan Alur Operasional End-to-End", "End-to-End Operational Workflow Guide")}
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          {t(
            "Langkah demi langkah mengoperasikan pekerjaan klien di Cubiqlo: dari pendaftaran klien hingga penagihan lunas.",
            "Step-by-step guide operating client work in Cubiqlo: from client onboarding to invoice payment."
          )}
        </p>
      </div>

      <div className="space-y-6 text-sm text-muted-foreground">
        {/* Step 1 */}
        <section className="rounded-xl border bg-card p-5 space-y-2">
          <div className="flex items-center gap-2">
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-primary-foreground font-bold text-xs">1</span>
            <h2 className="text-base font-semibold text-foreground">
              {t("Langkah 1: Menambahkan Klien Baru", "Step 1: Adding a New Client")}
            </h2>
          </div>
          <p>
            {t(
              "Fungsi: Menyimpan database kontak klien, perusahaan, serta membuka akses Client Portal terisolasi.",
              "Function: Save client contact database, company details, and unlock an isolated Client Portal."
            )}
          </p>
          <div className="bg-muted/40 rounded-lg p-3 text-xs space-y-1">
            <p className="font-medium text-foreground">{t("Cara Eksekusi:", "Execution Steps:")}</p>
            <ol className="list-decimal pl-4 space-y-1">
              <li>{t("Buka menu sidebar Pekerjaan → Klien (/app/clients).", "Navigate to Work → Clients (/app/clients).")}</li>
              <li>{t("Klik tombol 'Tambah Klien' di pojok kanan atas.", "Click the 'Add Client' button on the top right.")}</li>
              <li>{t("Isi nama klien, nama perusahaan, email utama, nomor HP, dan alamat penagihan.", "Fill in client name, company name, primary email, phone number, and billing address.")}</li>
              <li>{t("Aktifkan sakelar 'Client Portal' jika ingin memberi akses portal langsung.", "Enable the 'Client Portal' toggle if you wish to grant direct portal access.")}</li>
              <li>{t("Klik 'Simpan'. Klien baru berhasil terdaftar di workspace.", "Click 'Save'. The new client is registered in the workspace.")}</li>
            </ol>
          </div>
        </section>

        {/* Step 2 */}
        <section className="rounded-xl border bg-card p-5 space-y-2">
          <div className="flex items-center gap-2">
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-primary-foreground font-bold text-xs">2</span>
            <h2 className="text-base font-semibold text-foreground">
              {t("Langkah 2: Membuat Proyek & Menentukan Skema Billing", "Step 2: Creating a Project & Setting Billing Model")}
            </h2>
          </div>
          <p>
            {t(
              "Fungsi: Mengelompokkan scope pekerjaan, menetapkan tipe penagihan, dan mengatur visibilitas klien.",
              "Function: Group work scope, assign billing models, and control client visibility."
            )}
          </p>
          <div className="bg-muted/40 rounded-lg p-3 text-xs space-y-1">
            <p className="font-medium text-foreground">{t("Cara Eksekusi:", "Execution Steps:")}</p>
            <ol className="list-decimal pl-4 space-y-1">
              <li>{t("Buka menu Pekerjaan → Proyek (/app/projects).", "Navigate to Work → Projects (/app/projects).")}</li>
              <li>{t("Klik 'Proyek Baru'.", "Click 'New Project'.")}</li>
              <li>{t("Pilih Klien terdaftar dan beri nama proyek.", "Select registered Client and enter project name.")}</li>
              <li>
                {t(
                  "Pilih Tipe Billing: Fixed Price (Paket/By Project), Hourly (Per Jam), atau Retainer.",
                  "Select Billing Type: Fixed Price, Hourly, or Retainer."
                )}
              </li>
              <li>{t("Atur tanggal mulai & estimasi selesai.", "Set start date and target completion date.")}</li>
              <li>{t("Aktifkan toggle 'Muncul di Portal' agar klien bisa memantau progres.", "Enable 'Visible in Portal' so client can track progress.")}</li>
              <li>{t("Klik 'Buat Proyek'.", "Click 'Create Project'.")}</li>
            </ol>
          </div>
        </section>

        {/* Step 3 */}
        <section className="rounded-xl border bg-card p-5 space-y-2">
          <div className="flex items-center gap-2">
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-primary-foreground font-bold text-xs">3</span>
            <h2 className="text-base font-semibold text-foreground">
              {t("Langkah 3: Mengelola Task di Kanban Board", "Step 3: Managing Tasks on the Kanban Board")}
            </h2>
          </div>
          <p>
            {t(
              "Fungsi: Memecah proyek menjadi pekerjaan konkret, mengatur prioritas, deadline, dan alokasi tim.",
              "Function: Break down project into tasks, assign priorities, deadlines, and team members."
            )}
          </p>
          <div className="bg-muted/40 rounded-lg p-3 text-xs space-y-1">
            <p className="font-medium text-foreground">{t("Cara Eksekusi:", "Execution Steps:")}</p>
            <ol className="list-decimal pl-4 space-y-1">
              <li>{t("Buka Pekerjaan → Tugas (/app/tasks) atau Tab Pekerjaan di dalam proyek.", "Open Work → Tasks (/app/tasks) or Tasks tab inside project.")}</li>
              <li>{t("Klik 'Tambah Task'.", "Click 'Add Task'.")}</li>
              <li>{t("Isi judul task, pilih proyek, tentukan prioritas (Urgent/High/Medium/Low), dan due date.", "Enter task title, select project, set priority, and due date.")}</li>
              <li>{t("Pilih anggota tim sebagai Assignee.", "Select team member as Assignee.")}</li>
              <li>{t("Gunakan fitur Drag & Drop untuk menggeser status task dari Todo ➔ In Progress ➔ Done.", "Use Drag & Drop to move task status from Todo ➔ In Progress ➔ Done.")}</li>
            </ol>
          </div>
        </section>

        {/* Step 4 */}
        <section className="rounded-xl border bg-card p-5 space-y-2">
          <div className="flex items-center gap-2">
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-primary-foreground font-bold text-xs">4</span>
            <h2 className="text-base font-semibold text-foreground">
              {t("Langkah 4: Melacak Jam Kerja (Time Tracking)", "Step 4: Tracking Work Hours (Time Tracking)")}
            </h2>
          </div>
          <p>
            {t(
              "Fungsi: Mencatat waktu pengerjaan task presisi untuk audit transparansi atau penagihan hourly.",
              "Function: Log accurate work time for transparency audits or hourly billing."
            )}
          </p>
          <div className="bg-muted/40 rounded-lg p-3 text-xs space-y-1">
            <p className="font-medium text-foreground">{t("Cara Eksekusi:", "Execution Steps:")}</p>
            <ol className="list-decimal pl-4 space-y-1">
              <li>{t("Klik tombol 'Mulai Timer' di topbar atau buka /app/time.", "Click 'Start Timer' on topbar or open /app/time.")}</li>
              <li>{t("Pilih Proyek dan Task yang sedang dikerjakan, lalu jalankan timer.", "Select Project & Task being worked on, then run timer.")}</li>
              <li>{t("Klik 'Stop' saat selesai — log waktu otomatis tersimpan dengan status Uninvoiced.", "Click 'Stop' when done — time log saves automatically as Uninvoiced.")}</li>
            </ol>
          </div>
        </section>

        {/* Step 5 */}
        <section className="rounded-xl border bg-card p-5 space-y-2">
          <div className="flex items-center gap-2">
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-primary-foreground font-bold text-xs">5</span>
            <h2 className="text-base font-semibold text-foreground">
              {t("Langkah 5: Menerbitkan Invoice & Menerima Pembayaran", "Step 5: Issuing Invoices & Receiving Payments")}
            </h2>
          </div>
          <p>
            {t(
              "Fungsi: Menagih biaya pekerjaan ke klien, mengimpor jam kerja, dan mencatat status pembayaran lunas.",
              "Function: Bill clients for work done, import time logs, and record payment completion."
            )}
          </p>
          <div className="bg-muted/40 rounded-lg p-3 text-xs space-y-1">
            <p className="font-medium text-foreground">{t("Cara Eksekusi:", "Execution Steps:")}</p>
            <ol className="list-decimal pl-4 space-y-1">
              <li>{t("Buka Keuangan → Invoice (/app/invoices) → klik 'Invoice Baru'.", "Open Finance → Invoices (/app/invoices) → click 'New Invoice'.")}</li>
              <li>{t("Pilih Klien dan Proyek terkait.", "Select Client and associated Project.")}</li>
              <li>{t("Klik 'Import Waktu' untuk memasukkan log jam kerja secara otomatis atau tambah item manual.", "Click 'Import Time' to pull work logs automatically or add line items manually.")}</li>
              <li>{t("Atur tanggal jatuh tempo (due date), persentase pajak, dan diskon.", "Set due date, tax percentage, and discount.")}</li>
              <li>{t("Klik 'Kirim Invoice' — bagikan Share Link publik (/invoice/[token]) atau unduh berkas PDF.", "Click 'Send Invoice' — share public link (/invoice/[token]) or download PDF.")}</li>
              <li>{t("Saat pembayaran diterima, klik 'Tandai Dibayar' — status invoice otomatis berubah menjadi Lunas (Paid).", "When payment is received, click 'Mark Paid' — status changes automatically to Paid.")}</li>
            </ol>
          </div>
        </section>
      </div>
    </div>
  );
}
