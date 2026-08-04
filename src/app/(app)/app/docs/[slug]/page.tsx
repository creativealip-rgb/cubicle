import { getCurrentLang } from "@/lib/i18n";
import Link from "next/link";

const GUIDES = {
  "time-tracking": {
    title: { id: "Time Tracking", en: "Time Tracking" },
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
    title: { id: "Proyek & Task", en: "Projects & Tasks" },
    items: [
      ["1. Buat Proyek", "Proyek Baru → nama, klien, tipe billing (Fixed/Per Jam/Retainer/Paket), due date."],
      ["2. Status", "Draf → Aktif → Ditunda → Selesai → Dibatalkan → Arsip."],
      ["3. Progress", "Progress bar, task selesai/total, jam tercatat, sisa kuota paket."],
      ["4. Kanban Board", "Belum Mulai / Dikerjakan / Review / Selesai. Drag & drop task antar kolom."],
      ["5. Task Detail", "Klik task → judul, assignee, priority, due date, time entries, status."],
      ["6. Views", "Global Tasks: list + board toggle. Mobile: compact cards."],
      ["7. Filter", "Status, klien, billing type. Sort: nama, due date."],
      ["8. Client Visible", "Toggle per proyek — klien bisa lihat di portal atau hidden."],
    ],
  },
  "client-portal": {
    title: { id: "Client Portal", en: "Client Portal" },
    items: [
      ["1. Aktifkan", "Klien → Edit → Aktifkan portal sekarang. Link: cubiqlo.com/p/[token]."],
      ["2. Dashboard", "Progress proyek, invoice status, aktivitas terbaru."],
      ["3. Task Review", "Klien Setujui/Revisi task. Notifikasi ke workspace kamu."],
      ["4. File", "Download file di-share. Upload file (jika diizinkan)."],
      ["5. Invoice", "Lihat & download PDF invoice yang sudah dikirim."],
      ["6. Branding", "Settings → Branding → logo & warna workspace. Portal ikut tema."],
    ],
  },
} as const;

export default async function DocPage({ params }: { params: Promise<{ slug: string }> }) {
  const [{ slug }, lang] = await Promise.all([params, getCurrentLang()]);

  const guide = GUIDES[slug as keyof typeof GUIDES];
  if (!guide) return <div className="p-8 text-center text-muted-foreground">Halaman tidak ditemukan.</div>;

  return (
    <div className="min-w-0 space-y-6 max-w-3xl">
      <div>
        <Link href="/app/docs" className="text-sm text-muted-foreground hover:text-primary">← Dokumentasi</Link>
        <h1 className="text-2xl font-bold mt-1">{lang === "en" ? guide.title.en : guide.title.id}</h1>
      </div>
      <div className="space-y-4 text-sm text-muted-foreground">
        {guide.items.map(([title, desc]) => (
          <div key={title}>
            <h2 className="text-base font-semibold text-foreground mb-1">{title}</h2>
            <p>{desc}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
