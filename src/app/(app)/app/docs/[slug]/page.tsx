import { getCurrentLang } from "@/lib/i18n";
import { Clock, Briefcase, Users, FileCheck2, Sparkles } from "lucide-react";
import {
  DocsBreadcrumb,
  DocsHero,
  DocsLayout,
  DocsSection,
  DocsCallout,
} from "@/components/docs/doc-shell";

const GUIDES = {
  "time-tracking": {
    icon: Clock,
    category: { id: "Produktivitas", en: "Productivity" },
    title: { id: "Time Tracking", en: "Time Tracking" },
    description: {
      id: "Timer, input manual, timesheet mingguan. Siap ditagih.",
      en: "Timer, manual entry, weekly timesheet. Ready for invoicing.",
    },
    items: [
      ["1. Timer", "Klik Mulai Timer atau tombol 00:00 di top bar. Pilih proyek & task. Timer tetap jalan meski pindah halaman."],
      ["2. Input Manual", "Catat Waktu → isi tanggal, durasi, proyek, task, deskripsi, toggle billable."],
      ["3. Timesheet", "Harian: list per hari + total. Mingguan: grid 7 kolom. Klik cell untuk edit."],
      ["4. Filter", "By proyek, task, status, klien."],
      ["5. Edit & Hapus", "Klik entry → ubah durasi, deskripsi. Hapus = entry di-recover (approved)."],
      ["6. Ekspor", "PDF harian/mingguan. Import ke invoice via Invoice → Import Waktu."],
    ],
  },
  projects: {
    icon: Briefcase,
    category: { id: "Pekerjaan", en: "Work" },
    title: { id: "Proyek & Task", en: "Projects & Tasks" },
    description: {
      id: "Kelola pipeline proyek & task. Kanban board, priority, assignee, deadline.",
      en: "Manage your project & task pipeline. Kanban board, priority, assignee, deadline.",
    },
    items: [
      ["1. Buat Proyek", "Proyek Baru → nama, klien, tipe billing (Fixed/Per Jam/Retainer), due date."],
      ["2. Status", "Draf → Aktif → Ditunda → Selesai → Dibatalkan → Arsip."],
      ["3. Progress", "Progress bar, task selesai/total, jam tercatat, sisa kuota retainer."],
      ["4. Kanban Board", "Belum Mulai / Dikerjakan / Review / Selesai. Drag & drop task antar kolom."],
      ["5. Task Detail", "Klik task → judul, assignee, priority, due date, time entries, status."],
      ["6. Views", "Global Tasks: list + board toggle. Mobile: compact cards."],
      ["7. Filter", "Status, klien, billing type. Sort: nama, due date."],
      ["8. Client Visible", "Toggle per proyek — klien bisa lihat di portal atau hidden."],
    ],
  },
  "client-portal": {
    icon: Users,
    category: { id: "Klien", en: "Clients" },
    title: { id: "Client Portal", en: "Client Portal" },
    description: {
      id: "Share progres, file, dan invoice ke klien. Approval task real-time.",
      en: "Share progress, files, and invoices with clients. Real-time task approval.",
    },
    items: [
      ["1. Aktifkan", "Klien → Edit → Aktifkan portal sekarang. Link: cubiqlo.com/p/[token] atau slug kustom."],
      ["2. Dashboard", "Progress proyek, invoice status, aktivitas terbaru."],
      ["3. Task Review", "Klien Setujui/Revisi task. Notifikasi ke workspace kamu."],
      ["4. File", "Download file di-share & upload berkas revisi oleh klien."],
      ["5. Invoice", "Lihat & download PDF invoice yang sudah dikirim."],
      ["6. Branding", "Settings → Branding → logo & warna workspace. Portal ikut tema."],
    ],
  },
  "proposals-contracts": {
    icon: FileCheck2,
    category: { id: "Sales", en: "Sales" },
    title: { id: "Proposal & Kontrak", en: "Proposals & Contracts" },
    description: {
      id: "Penawaran harga, penandatanganan e-sign, dan template center sales docs.",
      en: "Estimates, e-signatures, and sales doc template center.",
    },
    items: [
      ["1. Buat Proposal", "Proposal Baru → set klien, milestone harga, DP (%), dan tanggal kadaluarsa."],
      ["2. Approval Klien", "Klien membuka link publik proposal → menyetujui → proyek & invoice DP otomatis terbuat."],
      ["3. Buat Kontrak", "Kontrak Baru → klausa hukum, syarat ketentuan kerja, dan penetapan nilai kontrak."],
      ["4. Penandatanganan E-Sign", "Klien menandatangani kontrak secara elektronik via link publik /contract/[token]."],
      ["5. Template Center", "Kelola template proposal & kontrak di /app/templates untuk digunakan kembali."],
    ],
  },
  "ai-studio": {
    icon: Sparkles,
    category: { id: "AI", en: "AI" },
    title: { id: "AI Studio & Assistant", en: "AI Studio & Assistant" },
    description: {
      id: "Generator brief/prompt bilingual (18 preset) dan Asisten RAG workspace.",
      en: "Bilingual brief/prompt generator (18 presets) and workspace RAG Assistant.",
    },
    items: [
      ["1. Prompt Studio", "Pilih dari 18 preset brief (Feed, Carousel, Story, Product Ad, Script Video, Logo, dll)."],
      ["2. Parameter Bilingual", "Atur Platform, Rasio, Tone, dan Style dengan dukungan pilihan bahasa ID / EN."],
      ["3. AI Assistant Floating", "Klik ikon sparkle di pojok kanan bawah untuk tanya-jawab data workspace."],
      ["4. Agentic RAG Workspace", "Cek status proyek, invoice outstanding, atau buat draf pengingat tanpa data keluar."],
    ],
  },
} as const;

export default async function DocPage({ params }: { params: Promise<{ slug: string }> }) {
  const [{ slug }, lang] = await Promise.all([params, getCurrentLang()]);

  const guide = GUIDES[slug as keyof typeof GUIDES];
  if (!guide) {
    return (
      <div className="p-8 text-center text-muted-foreground">
        {lang === "en" ? "Page not found." : "Halaman tidak ditemukan."}
      </div>
    );
  }

  const Icon = guide.icon;
  const toc = guide.items.map(([title]) => ({
    id: title.replace(/[^a-z0-9]+/gi, "-").toLowerCase(),
    label: title,
  }));

  return (
    <div className="min-w-0 space-y-5">
      <DocsBreadcrumb
        items={[
          { label: lang === "en" ? "Documentation" : "Dokumentasi", href: "/app/docs" },
          { label: lang === "en" ? guide.title.en : guide.title.id },
        ]}
      />
      <DocsHero
        icon={Icon}
        category={lang === "en" ? guide.category.en : guide.category.id}
        title={lang === "en" ? guide.title.en : guide.title.id}
        description={lang === "en" ? guide.description.en : guide.description.id}
        readMinutes={Math.max(1, Math.round(guide.items.join(" ").split(/\s+/).filter(Boolean).length / 200))}
      />
      <DocsLayout toc={toc} tocLabel={lang === "en" ? "Table of Contents" : "Daftar Isi"}>
        {guide.items.map(([title, desc], i) => (
          <DocsSection key={title} id={toc[i].id} step={i + 1} icon={Icon} title={title}>
            <p>{desc}</p>
          </DocsSection>
        ))}
        {slug === "time-tracking" && (
          <DocsCallout variant="info">
            {lang === "en"
              ? "Time logs can be imported into invoices via Invoice → Import Time."
              : "Log waktu bisa diimpor ke invoice via Invoice → Import Waktu."}
          </DocsCallout>
        )}
        {slug === "projects" && (
          <DocsCallout variant="info">
            {lang === "en"
              ? "Three active billing models: Fixed Price, Hourly, and Retainer."
              : "Tiga model billing aktif: Fixed Price, Per Jam, dan Retainer."}
          </DocsCallout>
        )}
      </DocsLayout>
    </div>
  );
}
