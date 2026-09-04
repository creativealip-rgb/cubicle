import { getCurrentLang } from "@/lib/i18n";
import {
  Clock,
  Briefcase,
  Users,
  FileCheck2,
  Sparkles,
  Wrench,
  Layers,
  ClipboardList,
  Receipt,
  Calendar,
  Target,
  NotebookPen,
  ShieldCheck,
  PieChart,
  Mail,
} from "lucide-react";
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
    title: { id: "Time Tracking & Timesheet", en: "Time Tracking & Timesheet" },
    description: {
      id: "Timer realtime, pencatatan log manual harian, matriks mingguan 7 hari, dan ekspor PDF siap tagih.",
      en: "Realtime timer, daily manual logging, 7-day weekly grid, and billable PDF exports.",
    },
    items: [
      ["1. Live Timer", "Buka /app/time → Klik Mulai Timer. Pilih proyek & task. Timer tetap berjalan di latar belakang bahkan saat berpindah halaman atau browser tab."],
      ["2. Pencatatan Manual", "Klik Catat Waktu Manual → pilih tanggal, masukkan durasi (misal 2h 30m), kaitkan ke proyek/task, dan centang opsi Billable jika ditagihkan ke klien."],
      ["3. Tampilan Harian vs Mingguan", "Gunakan sub-nav pill Harian untuk melihat runutan entri per jam, atau Mingguan untuk matriks kalender 7-kolom (Senin–Minggu)."],
      ["4. KPI Ringkasan Jam Kerja", "Pantau total jam kerja tercatat, rasio efisiensi billable, serta status tracker aktif langsung di atas halaman."],
      ["5. Filter & Edit Entri", "Filter berdasarkan proyek atau klien. Klik entri untuk memperbaiki catatan atau menghapus entri yang salah."],
      ["6. Ekspor & Tagihkan", "Unduh PDF Timesheet atau impor langsung log waktu yang telah disetujui saat membuat invoice baru di /app/invoices/new."],
    ],
  },
  expenses: {
    icon: Receipt,
    category: { id: "Keuangan", en: "Finance" },
    title: { id: "Pengeluaran Bisnis & Anggaran 50/30/20", en: "Business Expenses & 50/30/20 Budget" },
    description: {
      id: "Pencatatan pengeluaran operasional bisnis, biaya berulang (recurring), dan manajemen keuangan pribadi 50/30/20.",
      en: "Operational business expenses, recurring expenses, and personal finance 50/30/20 budgeting.",
    },
    items: [
      ["1. Pengeluaran Bisnis", "Catat belanja operasional, langganan software/tools, honor vendor, atau biaya operasional proyek. Sertakan bukti nota/receipt."],
      ["2. Kategori & Alokasi", "Atur kategori pengeluaran bisnis (Tools, Server, Marketing, Operasional). Pantau breakdown persentase pengeluaran via 2-column grid."],
      ["3. Pengeluaran Berulang (Recurring)", "Aktifkan otomatisasi untuk tagihan bulanan/tahunan (seperti domain atau hosting) agar tercatat otomatis."],
      ["4. Keuangan Pribadi (50/30/20)", "Gunakan Scope Switcher untuk beralih ke Keuangan Pribadi. Alokasikan pendapatan ke 50% Kebutuhan (Needs), 30% Keinginan (Wants), dan 20% Tabungan/Investasi (Savings)."],
      ["5. Saldo & Target Tabungan", "Pantau sisa kuota kebutuhan bulanan dan simpan surplus pendapatan langsung ke rekening pos tabungan."],
    ],
  },
  reports: {
    icon: PieChart,
    category: { id: "Keuangan", en: "Finance" },
    title: { id: "Laporan Finansial & Arus Kas", en: "Financial Reports & Cash Flow" },
    description: {
      id: "Analisa laba bersih (net profit), margin keuntungan, performa klien terbaik, dan visual Donut 50/30/20.",
      en: "Analyze net profit trends, profit margins, top clients, and interactive 50/30/20 Donut charts.",
    },
    items: [
      ["1. 4-KPI Overview Strip", "Pantau ringkasan Pemasukan Diterima, Total Pengeluaran, Laba Bersih (Net Profit), dan Piutang Berjalan (Outstanding AR)."],
      ["2. Trend & Margin Chart", "Grafik interaktif pendapatan vs pengeluaran bulanan dilengkapi garis trend margin keuntungan dan tooltip visual."],
      ["3. Klien Terbaik (Top Revenue)", "Identifikasi klien yang memberikan kontribusi pendapatan terbesar bagi bisnis kamu."],
      ["4. Laporan Pribadi 50/30/20", "Pilih scope Pribadi untuk melihat Donut Chart visual distribusi anggaran 50/30/20 dan rekomendasi penyeimbangan finansial."],
      ["5. Filter Rentang Waktu", "Pilih periode laporan: Bulan Ini, Kuartal Ini, Tahun Ini, atau Rentang Kustom untuk evaluasi bisnis."],
    ],
  },
  calendar: {
    icon: Calendar,
    category: { id: "Jadwal", en: "Scheduling" },
    title: { id: "Kalender & Booking Janji Temu", en: "Calendar & Appointment Booking" },
    description: {
      id: "Aturan ketersediaan jam kerja, link pemesanan online publik (/booking/slug), dan integrasi jadwal kalender.",
      en: "Working hours availability rules, public online booking link (/booking/slug), and calendar sync.",
    },
    items: [
      ["1. Link Booking Publik", "Dapatkan URL pemesanan janji temu personal (misal: cubiqlo.com/booking/budi-setiawan) untuk ditaruh di bio atau email signature."],
      ["2. Kustomisasi Slug Booking", "Atur nama slug URL pemesanan kamu di tab Pengaturan Kalender sesuai nama brand/personal."],
      ["3. Aturan Hari & Jam Kerja", "Tentukan hari aktif (misal Senin–Jumat) serta rentang jam ketersediaan kamu agar klien tidak bisa booking di luar jam kerja."],
      ["4. Manajemen Janji Temu", "Lihat daftar booking mendatang dengan Date Badge Tiles yang jelas (hari, tanggal, jam WIB), konfirmasi, atau batalkan jadwal."],
      ["5. Sinkronisasi Kalender (.ics)", "Unduh file feed .ics untuk sinkronisasi otomatis ke Google Calendar, Apple Calendar, atau Outlook."],
    ],
  },
  productivity: {
    icon: Target,
    category: { id: "Produktivitas", en: "Productivity" },
    title: { id: "Target & Habit Tracker", en: "Goals & Habit Tracker" },
    description: {
      id: "Pencapaian target bertahap dengan progress milestones, daily habit check-in, dan mini visual heatmap 35-hari.",
      en: "Milestone-based goal tracking, daily habit check-in, and 35-day mini visual heatmaps.",
    },
    items: [
      ["1. Manajemen Target (Goals)", "Buat target jangka pendek atau tahunan. Bagi target besar menjadi beberapa milestone terukur."],
      ["2. Progress Otomatis", "Centang milestone yang selesai untuk melihat peningkatan persentase progress target secara otomatis."],
      ["3. Habit Tracker Harian", "Bangun rutinitas positif (misal: Code 2 Jam, Olahraga, Baca Buku). Lakukan check-in harian dengan tombol ✓ Check."],
      ["4. Visual Heatmap 35-Hari", "Pantau konsistensi dan streak habit kamu melalui mini heatmap visual bergaya GitHub commit log."],
      ["5. Kategori & Prioritas", "Kelompokkan target dan habit berdasarkan kategori (Karir, Finansial, Kesehatan, Pribadi)."],
    ],
  },
  notes: {
    icon: NotebookPen,
    category: { id: "Produktivitas", en: "Productivity" },
    title: { id: "Personal Notes & Journal", en: "Personal Notes & Journal" },
    description: {
      id: "Catatan markdown pribadi terisolasi, auto-save realtime, konversi catatan ke task proyek, dan jurnal harian.",
      en: "Isolated private markdown notes, realtime auto-save, note-to-task conversion, and daily reflection journals.",
    },
    items: [
      ["1. Catatan Pribadi Terisolasi", "Catatan hanya bisa diakses oleh akun kamu (tidak terlihat oleh anggota tim workspace lain)."],
      ["2. Format Markdown Lengkap", "Tulis ide, referensi, checklist, atau kode dengan dukungan markdown formatting penuh."],
      ["3. Auto-Save & Tabs", "Perubahan tersimpan otomatis seketika. Buat banyak tab catatan untuk memisahkan topik."],
      ["4. Konversi Jadi Task Proyek", "Ubah poin catatan langsung menjadi task proyek operasional hanya dengan 1 klik."],
      ["5. Jurnal Harian (Journal)", "Tulis refleksi harian dan pencapaian kerja di modul Jurnal untuk evaluasi mingguan."],
    ],
  },
  "security-2fa": {
    icon: ShieldCheck,
    category: { id: "Keamanan", en: "Security" },
    title: { id: "Keamanan Akun, 2FA & Passkey", en: "Account Security, 2FA & Passkeys" },
    description: {
      id: "Perlindungan akun tingkat tinggi dengan Passkey biometrik (FaceID/TouchID), TOTP Authenticator, dan 10 Backup Codes.",
      en: "High-level account security with biometric Passkeys, TOTP Authenticator, and 10 Backup Recovery Codes.",
    },
    items: [
      ["1. Autentikasi Dua Faktor (2FA)", "Aktifkan 2FA di Pengaturan → Akun & Keamanan untuk mencegah akses tidak sah ke workspace kamu."],
      ["2. Passkey Biometrik (FIDO2 / WebAuthn)", "Daftarkan sidik jari atau FaceID di perangkat kamu untuk login instan tanpa perlu ketik password."],
      ["3. TOTP Authenticator App", "Hubungkan aplikasi authenticator (Google Authenticator, Microsoft Authenticator, atau 1Password) via scan QR code."],
      ["4. 10 Kode Cadangan (Backup Recovery Codes)", "Generate dan simpan 10 kode cadangan offline sebagai jalur darurat jika perangkat hilang."],
      ["5. Ganti Email Aman", "Ajukan perubahan email dengan verifikasi token ganda ke alamat email lama dan email baru."],
    ],
  },
  projects: {
    icon: Briefcase,
    category: { id: "Pekerjaan", en: "Work" },
    title: { id: "Proyek & Task", en: "Projects & Tasks" },
    description: {
      id: "Kelola pipeline proyek & task. Kanban board, priority, assignee, deadline, dan billing models.",
      en: "Manage project & task pipelines. Kanban boards, priority, assignees, deadlines, and billing models.",
    },
    items: [
      ["1. Buat Proyek", "Proyek Baru → tentukan nama proyek, klien terkait, tipe billing (Fixed Price / Per Jam / Retainer), dan tanggal deadline."],
      ["2. Siklus Status Proyek", "Draf → Aktif → Ditunda → Selesai → Dibatalkan → Arsip."],
      ["3. Progress & Quota", "Pantau progress bar task, jumlah jam kerja terpakai vs estimasi, dan sisa kuota retainer bulanan."],
      ["4. Kanban Board Interaktif", "Kolom Belum Mulai, Dikerjakan, Review, dan Selesai. Pindahkan task secara drag-and-drop."],
      ["5. Detail Task & Subtask", "Tetapkan prioritas (Low, Medium, High, Urgent), assignee anggota tim, due date, dan log waktu task."],
      ["6. Visibilitas Klien", "Atur apakah proyek/task dapat dilihat oleh klien di Client Portal atau bersifat internal tim."],
    ],
  },
  "client-portal": {
    icon: Users,
    category: { id: "Klien", en: "Clients" },
    title: { id: "Client Portal", en: "Client Portal" },
    description: {
      id: "Bagikan progres pekerjaan, berkas file, dan tagihan invoice secara aman ke klien dengan portal kustom.",
      en: "Share work progress, files, and invoices securely with clients via customized client portals.",
    },
    items: [
      ["1. Aktivasi Portal Klien", "Buka menu Klien → Pilih Klien → Aktifkan Portal. Klien mendapatkan link khusus atau slug kustom (/client-portal/s/nama-klien)."],
      ["2. Dashboard Klien", "Klien dapat melihat ringkasan status proyek yang sedang berjalan, invoice yang perlu dibayar, dan aktivitas terbaru."],
      ["3. Approval Task & Revisi Realtime", "Klien dapat menyetujui hasil kerja atau meminta revisi langsung dari portal dengan notifikasi instan ke workspace."],
      ["4. File Sharing & Upload", "Unduh materi final resolusi tinggi dan upload berkas brief/revisi oleh klien secara terenkripsi."],
      ["5. Riwayat Invoice & Pembayaran", "Klien dapat meninjau semua tagihan, mengunduh PDF, dan melihat instruksi pembayaran QRIS / transfer."],
      ["6. White-label & Branding", "Portal klien otomatis menggunakan logo, nama bisnis, dan warna aksen dari pengaturan branding workspace kamu."],
    ],
  },
  "proposals-contracts": {
    icon: FileCheck2,
    category: { id: "Sales", en: "Sales" },
    title: { id: "Proposal & Kontrak", en: "Proposals & Contracts" },
    description: {
      id: "Penawaran harga profesional, penandatanganan elektronik (e-sign), dan integrasi invoice DP otomatis.",
      en: "Professional estimates, electronic signatures (e-sign), and automatic down payment invoice generation.",
    },
    items: [
      ["1. Pembuatan Proposal", "Buat proposal penawaran dengan milestone harga, deskripsi ruang lingkup kerja, dan persentase DP (Down Payment)."],
      ["2. Persetujuan Klien Online", "Klien membuka link proposal publik dan menyetujui secara digital. Setelah disetujui, sistem otomatis membuat Proyek dan Invoice DP."],
      ["3. Pembuatan Kontrak Kerja", "Susun kontrak resmi dengan klausul hukum, jadwal pembayaran, dan syarat ketentuan kerja yang jelas."],
      ["4. Tanda Tangan Elektronik (E-Sign)", "Klien menandatangani kontrak secara sah melalui link web /contract/[token] dengan verifikasi timestamp digital."],
      ["5. Template Center", "Simpan draft terbaik ke Template Center di /app/templates untuk digunakan berulang kali pada klien baru."],
    ],
  },
  services: {
    icon: Wrench,
    category: { id: "Bisnis", en: "Business" },
    title: { id: "Layanan", en: "Services" },
    description: {
      id: "Katalog layanan workspace: harga, satuan, dan kategori standar.",
      en: "Workspace service catalog: pricing, units, and standard categories.",
    },
    items: [
      ["1. Katalog Layanan Terpusat", "Kelola daftar paket dan jasa yang kamu tawarkan dengan nama, deskripsi, harga standar, dan satuan waktu/item."],
      ["2. Model Penetapan Harga", "Dukung model Fixed Price (Harga Tetap), Per Jam (Hourly Rate), maupun Retainer (Langganan Berkala)."],
      ["3. Kategori Berwarna", "Kelompokkan layanan dengan tag kategori (misal: UI/UX Design, Web Development, SEO Marketing)."],
      ["4. Arsip Layanan", "Nonaktifkan layanan yang sudah tidak ditawarkan tanpa merusak data histori proyek atau invoice lama."],
    ],
  },
  templates: {
    icon: Layers,
    category: { id: "Bisnis", en: "Business" },
    title: { id: "Template Center", en: "Template Center" },
    description: {
      id: "Pusat template standar untuk Proposal, Kontrak, dan Template Invoice.",
      en: "Centralized template center for Proposals, Contracts, and Invoice presets.",
    },
    items: [
      ["1. Template Center Terpadu", "Akses semua template dokumen bisnis di /app/templates dalam 3 tab: Proposal, Kontrak, dan Invoice."],
      ["2. Visual Block Editor", "Edit template proposal dan kontrak menggunakan block editor yang fleksibel."],
      ["3. Preset Invoice Standar", "Simpan catatan default, terms & conditions, mata uang, dan persentase pajak default agar pembuatan invoice lebih cepat."],
    ],
  },
  questionnaires: {
    icon: ClipboardList,
    category: { id: "Bisnis", en: "Business" },
    title: { id: "Formulir & Kuesioner", en: "Forms & Questionnaires" },
    description: {
      id: "Formulir intake brief klien. Jawaban klien otomatis tersimpan dan siap dijadikan brief proyek.",
      en: "Client intake forms. Client responses automatically convert into project briefs.",
    },
    items: [
      ["1. Builder Formulir Dinamis", "Buat kuesioner dengan berbagai jenis kolom: Teks Singkat, Paragraf, Email, Angka, Pilihan Ganda, Checkbox, dan Tanggal."],
      ["2. Link Publik Kuesioner", "Bagikan link form ke calon klien sebelum mulai bekerja untuk mengumpulkan kebutuhan secara terstruktur."],
      ["3. Notifikasi Jawaban Masuk", "Terima notifikasi otomatis saat klien menyelesaikan pengisian formulir."],
      ["4. Konversi Jadi Brief Proyek", "Jawaban klien dapat langsung dihubungkan ke proyek yang bersangkutan sebagai acuan brief pengerjaan."],
    ],
  },
  "ai-studio": {
    icon: Sparkles,
    category: { id: "AI", en: "AI" },
    title: { id: "Prompt Studio & AI Assistant", en: "Prompt Studio & AI Assistant" },
    description: {
      id: "Generator brief & prompt 17 preset (Social Media, Ads, Product, Video, Brand) dan Asisten RAG workspace.",
      en: "17-preset prompt generator (Social Media, Ads, Product, Video, Brand) and workspace RAG Assistant.",
    },
    items: [
      ["1. Prompt Studio 17 Preset", "Pilih preset konten: Feed Instagram, Carousel, Story, Product Ad, Script Video/TikTok, Logo, hingga Copywriting Marketing."],
      ["2. Parameter Desain & Tone", "Kustomisasi style visual, rasio aspek (1:1, 9:16, 16:9), tone komunikasi, dan platform tujuan."],
      ["3. Hasil Siap Pakai", "AI menghasilkan visual prompt untuk Midjourney/Flux, caption copywriting, hashtag, dan hook video secara instan."],
      ["4. Asisten AI Workspace (RAG)", "Gunakan tombol sparkle di navbar untuk menanyakan status keuangan, task tertunda, atau ringkasan proyek workspace kamu."],
    ],
  },
  email: {
    icon: Mail,
    category: { id: "Komunikasi", en: "Communication" },
    title: { id: "Email Bisnis & Kotak Masuk", en: "Business Email & Inbox" },
    description: {
      id: "Integrasi email bisnis kustom, notifikasi pengiriman invoice/proposal, dan webmail terpusat.",
      en: "Custom branded email integration, invoice/proposal dispatch notifications, and unified webmail.",
    },
    items: [
      ["1. Email Bisnis Kustom", "Gunakan alamat email domain bisnis kamu sendiri untuk pengiriman notifikasi profesional ke klien."],
      ["2. Dispatch Otomatis", "Kirim invoice, proposal penawaran, dan link kontrak langsung ke inbox klien dengan template email rapi."],
      ["3. Reply-To Workspace", "Balasan dari klien otomatis masuk ke email utama yang kamu atur di pengaturan workspace."],
      ["4. Akses Webmail", "Akses webmail terintegrasi untuk membaca dan membalas pesan klien langsung dari ekosistem Cubiqlo."],
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
        {slug === "expenses" && (
          <DocsCallout variant="info">
            {lang === "en"
              ? "Personal budget allocations use the 50% Needs, 30% Wants, 20% Savings principle."
              : "Alokasi anggaran pribadi mengadopsi prinsip 50% Kebutuhan, 30% Keinginan, 20% Tabungan/Investasi."}
          </DocsCallout>
        )}
      </DocsLayout>
    </div>
  );
}
