import { getCurrentLang, createT } from "@/lib/i18n";
import { Rocket, Users, Briefcase, KanbanSquare, Clock3, ReceiptText } from "lucide-react";
import {
  DocsBreadcrumb,
  DocsHero,
  DocsLayout,
  DocsSection,
  DocsSteps,
  DocsCallout,
} from "@/components/docs/doc-shell";

export default async function DocGettingStarted() {
  const lang = await getCurrentLang();
  const t = createT(lang);

  const toc = [
    { id: "tambah-klien", label: t("Langkah 1: Menambahkan Klien Baru", "Step 1: Adding a New Client") },
    { id: "buat-proyek", label: t("Langkah 2: Membuat Proyek & Menentukan Skema Billing", "Step 2: Creating a Project & Setting Billing Model") },
    { id: "kelola-task", label: t("Langkah 3: Mengelola Task di Kanban Board", "Step 3: Managing Tasks on the Kanban Board") },
    { id: "time-tracking", label: t("Langkah 4: Melacak Jam Kerja (Time Tracking)", "Step 4: Tracking Work Hours (Time Tracking)") },
    { id: "invoice", label: t("Langkah 5: Menerbitkan Invoice & Menerima Pembayaran", "Step 5: Issuing Invoices & Receiving Payments") },
  ];

  return (
    <div className="min-w-0 space-y-5">
      <DocsBreadcrumb
        items={[
          { label: t("Dokumentasi", "Documentation"), href: "/app/docs" },
          { label: t("Panduan Alur Operasional End-to-End", "End-to-End Operational Workflow Guide") },
        ]}
      />
      <DocsHero
        icon={Rocket}
        category={t("Panduan", "Guide")}
        title={t("Panduan Alur Operasional End-to-End", "End-to-End Operational Workflow Guide")}
        description={t(
          "Langkah demi langkah mengoperasikan pekerjaan klien di Cubiqlo: dari pendaftaran klien hingga penagihan lunas.",
          "Step-by-step guide operating client work in Cubiqlo: from client onboarding to invoice payment."
        )}
        readMinutes={7}
      />
      <DocsLayout toc={toc} tocLabel={t("Daftar Isi", "Table of Contents")}>
        <DocsSection id="tambah-klien" step={1} icon={Users} title={t("Menambahkan Klien Baru", "Adding a New Client")}>
          <p>
            {t(
              "Fungsi: Menyimpan database kontak klien, perusahaan, serta membuka akses Client Portal terisolasi.",
              "Function: Save client contact database, company details, and unlock an isolated Client Portal."
            )}
          </p>
          <div className="rounded-lg bg-muted/40 p-3 text-xs space-y-1.5">
            <p className="font-medium text-foreground">{t("Cara Eksekusi:", "Execution Steps:")}</p>
            <DocsSteps
              items={[
                t("Buka menu sidebar Pekerjaan → Klien (/app/clients).", "Navigate to Work → Clients (/app/clients)."),
                t("Klik tombol 'Tambah Klien' di pojok kanan atas.", "Click the 'Add Client' button on the top right."),
                t(
                  "Isi nama klien, nama perusahaan, email utama, nomor HP, dan alamat penagihan.",
                  "Fill in client name, company name, primary email, phone number, and billing address."
                ),
                t(
                  "Aktifkan sakelar 'Client Portal' jika ingin memberi akses portal langsung.",
                  "Enable the 'Client Portal' toggle if you wish to grant direct portal access."
                ),
                t("Klik 'Simpan'. Klien baru berhasil terdaftar di workspace.", "Click 'Save'. The new client is registered in the workspace."),
              ]}
            />
          </div>
        </DocsSection>

        <DocsSection
          id="buat-proyek"
          step={2}
          icon={Briefcase}
          title={t("Membuat Proyek & Menentukan Skema Billing", "Creating a Project & Setting Billing Model")}
        >
          <p>
            {t(
              "Fungsi: Mengelompokkan scope pekerjaan, menetapkan tipe penagihan, dan mengatur visibilitas klien.",
              "Function: Group work scope, assign billing models, and control client visibility."
            )}
          </p>
          <div className="rounded-lg bg-muted/40 p-3 text-xs space-y-1.5">
            <p className="font-medium text-foreground">{t("Cara Eksekusi:", "Execution Steps:")}</p>
            <DocsSteps
              items={[
                t("Buka menu Pekerjaan → Proyek (/app/projects).", "Navigate to Work → Projects (/app/projects)."),
                t("Klik 'Proyek Baru'.", "Click 'New Project'."),
                t("Pilih Klien terdaftar dan beri nama proyek.", "Select registered Client and enter project name."),
                t(
                  "Pilih Tipe Billing: Fixed Price, Hourly (Per Jam), atau Retainer.",
                  "Select Billing Type: Fixed Price, Hourly, or Retainer."
                ),
                t("Atur tanggal mulai & estimasi selesai.", "Set start date and target completion date."),
                t(
                  "Aktifkan toggle 'Muncul di Portal' agar klien bisa memantau progres.",
                  "Enable 'Visible in Portal' so client can track progress."
                ),
                t("Klik 'Buat Proyek'.", "Click 'Create Project'."),
              ]}
            />
          </div>
          <DocsCallout variant="info">
            {t(
              "Tiga model billing aktif: Fixed Price (nilai tetap), Per Jam (tarif × jam), dan Retainer (biaya per periode + kuota menit).",
              "Three active billing models: Fixed Price (flat value), Hourly (rate × hours), and Retainer (periodic fee + minute quota)."
            )}
          </DocsCallout>
        </DocsSection>

        <DocsSection
          id="kelola-task"
          step={3}
          icon={KanbanSquare}
          title={t("Mengelola Task di Kanban Board", "Managing Tasks on the Kanban Board")}
        >
          <p>
            {t(
              "Fungsi: Memecah proyek menjadi pekerjaan konkret, mengatur prioritas, deadline, dan alokasi tim.",
              "Function: Break down project into tasks, assign priorities, deadlines, and team members."
            )}
          </p>
          <div className="rounded-lg bg-muted/40 p-3 text-xs space-y-1.5">
            <p className="font-medium text-foreground">{t("Cara Eksekusi:", "Execution Steps:")}</p>
            <DocsSteps
              items={[
                t(
                  "Buka Pekerjaan → Tugas (/app/tasks) atau Tab Pekerjaan di dalam proyek.",
                  "Open Work → Tasks (/app/tasks) or Tasks tab inside project."
                ),
                t("Klik 'Tambah Task'.", "Click 'Add Task'."),
                t(
                  "Isi judul task, pilih proyek, tentukan prioritas (Urgent/High/Medium/Low), dan due date.",
                  "Enter task title, select project, set priority, and due date."
                ),
                t("Pilih anggota tim sebagai Assignee.", "Select team member as Assignee."),
                t(
                  "Gunakan fitur Drag & Drop untuk menggeser status task dari Todo ➔ In Progress ➔ Done.",
                  "Use Drag & Drop to move task status from Todo ➔ In Progress ➔ Done."
                ),
              ]}
            />
          </div>
        </DocsSection>

        <DocsSection
          id="time-tracking"
          step={4}
          icon={Clock3}
          title={t("Melacak Jam Kerja (Time Tracking)", "Tracking Work Hours (Time Tracking)")}
        >
          <p>
            {t(
              "Fungsi: Mencatat waktu pengerjaan task presisi untuk audit transparansi atau penagihan hourly.",
              "Function: Log accurate work time for transparency audits or hourly billing."
            )}
          </p>
          <div className="rounded-lg bg-muted/40 p-3 text-xs space-y-1.5">
            <p className="font-medium text-foreground">{t("Cara Eksekusi:", "Execution Steps:")}</p>
            <DocsSteps
              items={[
                t(
                  "Klik tombol 'Mulai Timer' di topbar atau buka /app/time.",
                  "Click 'Start Timer' on topbar or open /app/time."
                ),
                t(
                  "Pilih Proyek dan Task yang sedang dikerjakan, lalu jalankan timer.",
                  "Select Project & Task being worked on, then run timer."
                ),
                t(
                  "Klik 'Stop' saat selesai — log waktu otomatis tersimpan dengan status Uninvoiced.",
                  "Click 'Stop' when done — time log saves automatically as Uninvoiced."
                ),
              ]}
            />
          </div>
        </DocsSection>

        <DocsSection
          id="invoice"
          step={5}
          icon={ReceiptText}
          title={t("Menerbitkan Invoice & Menerima Pembayaran", "Issuing Invoices & Receiving Payments")}
        >
          <p>
            {t(
              "Fungsi: Menagih biaya pekerjaan ke klien, mengimpor jam kerja, dan mencatat status pembayaran lunas.",
              "Function: Bill clients for work done, import time logs, and record payment completion."
            )}
          </p>
          <div className="rounded-lg bg-muted/40 p-3 text-xs space-y-1.5">
            <p className="font-medium text-foreground">{t("Cara Eksekusi:", "Execution Steps:")}</p>
            <DocsSteps
              items={[
                t(
                  "Buka Keuangan → Invoice (/app/invoices) → klik 'Invoice Baru'.",
                  "Open Finance → Invoices (/app/invoices) → click 'New Invoice'."
                ),
                t("Pilih Klien dan Proyek terkait.", "Select Client and associated Project."),
                t(
                  "Klik 'Import Waktu' untuk memasukkan log jam kerja secara otomatis atau tambah item manual.",
                  "Click 'Import Time' to pull work logs automatically or add line items manually."
                ),
                t(
                  "Atur tanggal jatuh tempo (due date), persentase pajak, dan diskon.",
                  "Set due date, tax percentage, and discount."
                ),
                t(
                  "Klik 'Kirim Invoice' — bagikan Share Link publik (/invoice/[token]) atau unduh berkas PDF.",
                  "Click 'Send Invoice' — share public link (/invoice/[token]) or download PDF."
                ),
                t(
                  "Saat pembayaran diterima, klik 'Tandai Dibayar' — status invoice otomatis berubah menjadi Lunas (Paid).",
                  "When payment is received, click 'Mark Paid' — status changes automatically to Paid."
                ),
              ]}
            />
          </div>
        </DocsSection>
      </DocsLayout>
    </div>
  );
}
