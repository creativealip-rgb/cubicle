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
      ["1. Live Timer", "Buka /app/time → Klik Mulai Timer. Pilih proyek & task. Timer tetap berjalan di latar belakang bahkan saat berpindah halaman atau browser tab.", "1. Live Timer", "Start a timer from /app/time, choose its project and task, and keep tracking while navigating the app."],
      ["2. Pencatatan Manual", "Klik Catat Waktu Manual → pilih tanggal, masukkan durasi (misal 2h 30m), kaitkan ke proyek/task, dan centang opsi Billable jika ditagihkan ke klien.", "2. Manual Time Entry", "Record a date, duration, project, task, and billable status when adding work without the live timer."],
      ["3. Tampilan Harian vs Mingguan", "Gunakan sub-nav pill Harian untuk melihat runutan entri per jam, atau Mingguan untuk matriks kalender 7-kolom (Senin–Minggu).", "3. Daily vs Weekly Views", "Use Daily for an hourly entry sequence or Weekly for a seven-column Monday-to-Sunday calendar grid."],
      ["4. KPI Ringkasan Jam Kerja", "Pantau total jam kerja tercatat, rasio efisiensi billable, serta status tracker aktif langsung di atas halaman.", "4. Work Hours KPIs", "Review recorded hours, billable efficiency, and the current tracker status from the page summary."],
      ["5. Filter & Edit Entri", "Filter berdasarkan proyek atau klien. Klik entri untuk memperbaiki catatan atau menghapus entri yang salah.", "5. Filter and Edit Entries", "Filter logs by project or client, then open an entry to correct its notes or remove an error."],
      ["6. Ekspor & Tagihkan", "Unduh PDF Timesheet atau impor langsung log waktu yang telah disetujui saat membuat invoice baru di /app/invoices/new.", "6. Export and Bill", "Download a timesheet PDF or import approved time logs while creating an invoice."],
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
      ["1. Pengeluaran Bisnis", "Catat belanja operasional, langganan software/tools, honor vendor, atau biaya operasional proyek. Sertakan bukti nota/receipt.", "1. Business Expenses", "Record operating purchases, software subscriptions, vendor fees, and project costs with receipt evidence."],
      ["2. Kategori & Alokasi", "Atur kategori pengeluaran bisnis (Tools, Server, Marketing, Operasional). Pantau breakdown persentase pengeluaran via 2-column grid.", "2. Categories and Allocation", "Classify expenses by tools, server, marketing, or operations and review their percentage breakdown."],
      ["3. Pengeluaran Berulang (Recurring)", "Aktifkan otomatisasi untuk tagihan bulanan/tahunan (seperti domain atau hosting) agar tercatat otomatis.", "3. Recurring Expenses", "Automate monthly or annual charges such as domain and hosting costs so they stay recorded."],
      ["4. Keuangan Pribadi (50/30/20)", "Gunakan Scope Switcher untuk beralih ke Keuangan Pribadi. Alokasikan pendapatan ke 50% Kebutuhan (Needs), 30% Keinginan (Wants), dan 20% Tabungan/Investasi (Savings).", "4. Personal Finance (50/30/20)", "Switch to Personal Finance and allocate income across 50% needs, 30% wants, and 20% savings."],
      ["5. Saldo & Target Tabungan", "Pantau sisa kuota kebutuhan bulanan dan simpan surplus pendapatan langsung ke rekening pos tabungan.", "5. Balance and Savings Goals", "Track remaining monthly needs budget and move surplus income into savings goals."],
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
      ["1. 4-KPI Overview Strip", "Pantau ringkasan Pemasukan Diterima, Total Pengeluaran, Laba Bersih (Net Profit), dan Piutang Berjalan (Outstanding AR).", "1. Four-KPI Overview", "Monitor received income, total expenses, net profit, and outstanding accounts receivable."],
      ["2. Trend & Margin Chart", "Grafik interaktif pendapatan vs pengeluaran bulanan dilengkapi garis trend margin keuntungan dan tooltip visual.", "2. Trend and Margin Chart", "Compare monthly income and expenses with profit-margin trends and visual tooltips."],
      ["3. Klien Terbaik (Top Revenue)", "Identifikasi klien yang memberikan kontribusi pendapatan terbesar bagi bisnis kamu.", "3. Top-Revenue Clients", "Identify clients contributing the largest share of business revenue."],
      ["4. Laporan Pribadi 50/30/20", "Pilih scope Pribadi untuk melihat Donut Chart visual distribusi anggaran 50/30/20 dan rekomendasi penyeimbangan finansial.", "4. Personal 50/30/20 Report", "View a donut chart of budget distribution and recommendations for better balance."],
      ["5. Filter Rentang Waktu", "Pilih periode laporan: Bulan Ini, Kuartal Ini, Tahun Ini, atau Rentang Kustom untuk evaluasi bisnis.", "5. Date-Range Filters", "Evaluate performance for this month, this quarter, this year, or a custom period."],
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
      ["1. Link Booking Publik", "Dapatkan URL pemesanan janji temu personal (misal: cubiqlo.com/booking/budi-setiawan) untuk ditaruh di bio atau email signature.", "1. Public Booking Link", "Share a personal appointment URL in your bio or email signature so clients can book."],
      ["2. Kustomisasi Slug Booking", "Atur nama slug URL pemesanan kamu di tab Pengaturan Kalender sesuai nama brand/personal.", "2. Customize the Booking Slug", "Set a branded booking URL slug from Calendar Settings."],
      ["3. Aturan Hari & Jam Kerja", "Tentukan hari aktif (misal Senin–Jumat) serta rentang jam ketersediaan kamu agar klien tidak bisa booking di luar jam kerja.", "3. Working Days and Hours", "Define available days and hours so clients cannot book outside your working schedule."],
      ["4. Manajemen Janji Temu", "Lihat daftar booking mendatang dengan Date Badge Tiles yang jelas (hari, tanggal, jam WIB), konfirmasi, atau batalkan jadwal.", "4. Appointment Management", "Review upcoming bookings with clear date and time badges, then confirm or cancel them."],
      ["5. Sinkronisasi Kalender (.ics)", "Unduh file feed .ics untuk sinkronisasi otomatis ke Google Calendar, Apple Calendar, atau Outlook.", "5. Calendar Sync (.ics)", "Download an .ics feed for automatic synchronization with Google Calendar, Apple Calendar, or Outlook."],
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
      ["1. Manajemen Target (Goals)", "Buat target jangka pendek atau tahunan. Bagi target besar menjadi beberapa milestone terukur.", "1. Goal Management", "Create short-term or annual goals and divide large outcomes into measurable milestones."],
      ["2. Progress Otomatis", "Centang milestone yang selesai untuk melihat peningkatan persentase progress target secara otomatis.", "2. Automatic Progress", "Mark completed milestones to update goal progress percentages automatically."],
      ["3. Habit Tracker Harian", "Bangun rutinitas positif (misal: Code 2 Jam, Olahraga, Baca Buku). Lakukan check-in harian dengan tombol ✓ Check.", "3. Daily Habit Tracker", "Build routines such as coding, exercise, or reading through daily check-ins."],
      ["4. Visual Heatmap 35-Hari", "Pantau konsistensi dan streak habit kamu melalui mini heatmap visual bergaya GitHub commit log.", "4. 35-Day Heatmap", "Review habit consistency and streaks in a compact GitHub-style activity heatmap."],
      ["5. Kategori & Prioritas", "Kelompokkan target dan habit berdasarkan kategori (Karir, Finansial, Kesehatan, Pribadi).", "5. Categories and Priorities", "Group goals and habits by career, finance, health, or personal priorities."],
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
      ["1. Private Notes", "Notes are accessible only to your account and are hidden from other workspace members.", "1. Private Notes", "Keep notes visible only to your account and hidden from other workspace members."],
      ["2. Full Markdown", "Write ideas, references, checklists, or code with full markdown formatting support.", "2. Full Markdown", "Write ideas, references, checklists, and code with full Markdown formatting."],
      ["3. Auto-Save & Tabs", "Changes save automatically. Create multiple note tabs to separate topics.", "3. Auto-Save and Tabs", "Changes save automatically, while separate tabs keep different topics organized."],
      ["4. Convert to Project Task", "Turn a note item into an operational project task with one click.", "4. Convert to a Project Task", "Turn a note item into an operational project task with one click."],
      ["5. Daily Journal", "Write daily reflections and work achievements in Journal for weekly review.", "5. Daily Journal", "Record daily reflections and work achievements for a weekly review."],
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
      ["1. Autentikasi Dua Faktor (2FA)", "Aktifkan 2FA di Pengaturan → Akun & Keamanan untuk mencegah akses tidak sah ke workspace kamu.", "1. Two-Factor Authentication (2FA)", "Enable 2FA in Account and Security settings to protect the workspace from unauthorized access."],
      ["2. Passkey Biometrik (FIDO2 / WebAuthn)", "Daftarkan sidik jari atau FaceID di perangkat kamu untuk login instan tanpa perlu ketik password.", "2. Biometric Passkeys (FIDO2 / WebAuthn)", "Register a fingerprint or Face ID for passwordless sign-in on your device."],
      ["3. TOTP Authenticator App", "Hubungkan aplikasi authenticator (Google Authenticator, Microsoft Authenticator, atau 1Password) via scan QR code.", "3. TOTP Authenticator App", "Connect Google Authenticator, Microsoft Authenticator, or 1Password by scanning its QR code."],
      ["4. 10 Kode Cadangan (Backup Recovery Codes)", "Generate dan simpan 10 kode cadangan offline sebagai jalur darurat jika perangkat hilang.", "4. Ten Backup Recovery Codes", "Generate and store ten offline recovery codes for emergencies when a device is unavailable."],
      ["5. Ganti Email Aman", "Ajukan perubahan email dengan verifikasi token ganda ke alamat email lama dan email baru.", "5. Secure Email Change", "Request an email change with token verification sent to both the old and new addresses."],
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
      ["1. Buat Proyek", "Proyek Baru → tentukan nama proyek, klien terkait, tipe billing (Fixed Price / Per Jam), dan tanggal deadline.", "1. Create a Project", "Set the project name, client, billing model (Fixed Price or Hourly), and deadline when starting a project."],
      ["2. Siklus Status Proyek", "Draf → Aktif → Ditunda → Selesai → Dibatalkan → Arsip.", "2. Project Status Lifecycle", "Move projects through Draft, Active, Paused, Completed, Cancelled, and Archived states."],
      ["3. Progress & Quota", "Pantau progress bar task, jumlah jam kerja terpakai vs estimasi, dan sisa kuota retainer bulanan.", "3. Progress and Quota", "Track task progress, used versus estimated hours, and remaining monthly retainer quota."],
      ["4. Kanban Board Interaktif", "Kolom Belum Mulai, Dikerjakan, Review, dan Selesai. Pindahkan task secara drag-and-drop.", "4. Interactive Kanban Board", "Move tasks between Not Started, In Progress, Review, and Done with drag and drop."],
      ["5. Detail Task & Subtask", "Tetapkan prioritas (Low, Medium, High, Urgent), assignee anggota tim, due date, dan log waktu task.", "5. Task and Subtask Details", "Set priority, assignee, due date, and time logs for each task."],
      ["6. Visibilitas Klien", "Atur apakah proyek/task dapat dilihat oleh klien di Client Portal atau bersifat internal tim.", "6. Client Visibility", "Choose whether clients can view a project or task in the Client Portal."],
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
      ["1. Aktivasi Portal Klien", "Buka menu Klien → Pilih Klien → Aktifkan Portal. Klien mendapatkan link khusus atau slug kustom (/client-portal/s/nama-klien).", "1. Activate the Client Portal", "Enable a client portal and share its dedicated link or custom slug."],
      ["2. Dashboard Klien", "Klien dapat melihat ringkasan status proyek yang sedang berjalan, invoice yang perlu dibayar, dan aktivitas terbaru.", "2. Client Dashboard", "Clients can review active projects, invoices awaiting payment, and recent activity."],
      ["3. Approval Task & Revisi Realtime", "Klien dapat menyetujui hasil kerja atau meminta revisi langsung dari portal dengan notifikasi instan ke workspace.", "3. Task Approval and Live Revisions", "Clients can approve work or request revisions with instant workspace notifications."],
      ["4. File Sharing & Upload", "Unduh materi final resolusi tinggi dan upload berkas brief/revisi oleh klien secara terenkripsi.", "4. File Sharing and Uploads", "Exchange high-resolution deliverables and encrypted briefs or revision files."],
      ["5. Riwayat Invoice & Pembayaran", "Klien dapat meninjau semua tagihan, mengunduh PDF, dan melihat instruksi pembayaran QRIS / transfer.", "5. Invoice and Payment History", "Clients can review invoices, download PDFs, and view QRIS or bank-transfer instructions."],
      ["6. White-label & Branding", "Portal klien otomatis menggunakan logo, nama bisnis, dan warna aksen dari pengaturan branding workspace kamu.", "6. White-Label Branding", "Use workspace logo, business name, and accent colors throughout the client portal."],
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
      ["1. Pembuatan Proposal", "Buat proposal penawaran dengan milestone harga, deskripsi ruang lingkup kerja, dan persentase DP (Down Payment).", "1. Create a Proposal", "Build an estimate with priced milestones, scope details, and a down-payment percentage."],
      ["2. Persetujuan Klien Online", "Klien membuka link proposal publik dan menyetujui secara digital. Setelah disetujui, sistem otomatis membuat Proyek dan Invoice DP.", "2. Online Client Approval", "Clients approve a public proposal digitally, triggering project and down-payment invoice creation."],
      ["3. Pembuatan Kontrak Kerja", "Susun kontrak resmi dengan klausul hukum, jadwal pembayaran, dan syarat ketentuan kerja yang jelas.", "3. Create an Employment Contract", "Draft terms with legal clauses, payment schedule, and clear working conditions."],
      ["4. Tanda Tangan Elektronik (E-Sign)", "Klien menandatangani kontrak secara sah melalui link web /contract/[token] dengan verifikasi timestamp digital.", "4. Electronic Signature (E-Sign)", "Clients sign contracts at the web link with a verifiable digital timestamp."],
      ["5. Template Center", "Simpan draft terbaik ke Template Center di /app/templates untuk digunakan berulang kali pada klien baru.", "5. Template Center", "Save strong proposal and contract drafts for reuse with future clients."],
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
      ["1. Katalog Layanan Terpusat", "Kelola daftar paket dan jasa yang kamu tawarkan dengan nama, deskripsi, harga standar, dan satuan waktu/item.", "1. Central Service Catalog", "Manage offered services with names, descriptions, standard prices, and units."],
      ["2. Model Penetapan Harga", "Dukung model Fixed Price (Harga Tetap), Per Jam (Hourly Rate), maupun Retainer (Langganan Berkala).", "2. Pricing Models", "Support fixed-price, hourly-rate, and recurring-retainer services."],
      ["3. Kategori Berwarna", "Kelompokkan layanan dengan tag kategori (misal: UI/UX Design, Web Development, SEO Marketing).", "3. Color-Coded Categories", "Group services with category tags such as UI/UX, web development, or SEO."],
      ["4. Arsip Layanan", "Nonaktifkan layanan yang sudah tidak ditawarkan tanpa merusak data histori proyek atau invoice lama.", "4. Archive Services", "Deactivate retired services without changing historical project or invoice data."],
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
      ["1. Template Center Terpadu", "Akses semua template dokumen bisnis di /app/templates dalam 3 tab: Proposal, Kontrak, dan Invoice.", "1. Unified Template Center", "Access proposal, contract, and invoice templates from the three template tabs."],
      ["2. Visual Block Editor", "Edit template proposal dan kontrak menggunakan block editor yang fleksibel.", "2. Visual Block Editor", "Edit proposal and contract templates with flexible content blocks."],
      ["3. Preset Invoice Standar", "Simpan catatan default, terms & conditions, mata uang, dan persentase pajak default agar pembuatan invoice lebih cepat.", "3. Standard Invoice Presets", "Save default notes, terms, currency, and tax settings to speed up invoicing."],
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
      ["1. Builder Formulir Dinamis", "Buat kuesioner dengan berbagai jenis kolom: Teks Singkat, Paragraf, Email, Angka, Pilihan Ganda, Checkbox, dan Tanggal.", "1. Dynamic Form Builder", "Create forms with short text, paragraphs, email, number, choice, checkbox, and date fields."],
      ["2. Link Publik Kuesioner", "Bagikan link form ke calon klien sebelum mulai bekerja untuk mengumpulkan kebutuhan secara terstruktur.", "2. Public Questionnaire Link", "Share a structured intake form with prospective clients before work begins."],
      ["3. Notifikasi Jawaban Masuk", "Terima notifikasi otomatis saat klien menyelesaikan pengisian formulir.", "3. New Response Notifications", "Receive an automatic notification when a client completes a form."],
      ["4. Konversi Jadi Brief Proyek", "Jawaban klien dapat langsung dihubungkan ke proyek yang bersangkutan sebagai acuan brief pengerjaan.", "4. Convert to a Project Brief", "Attach client responses to the relevant project as a working brief."],
    ],
  },
  "ai-studio": {
    icon: Sparkles,
    category: { id: "AI", en: "AI" },
    title: { id: "Prompt Studio & AI Assistant", en: "Prompt Studio & AI Assistant" },
    description: {
      id: "Generator brief & prompt 18 preset (Social Media, Ads, Product, Video, Brand) dan Asisten RAG workspace.",
      en: "18-preset prompt generator (Social Media, Ads, Product, Video, Brand) and workspace RAG Assistant.",
    },
    items: [
      ["1. Prompt Studio 18 Preset", "Pilih preset konten: Feed Instagram, Carousel, Story, Product Ad, Script Video/TikTok, Logo, hingga Copywriting Marketing.", "1. 18-Preset Prompt Studio", "Choose presets for Instagram feeds, carousels, stories, ads, video scripts, logos, and marketing copy."],
      ["2. Parameter Desain & Tone", "Kustomisasi style visual, rasio aspek (1:1, 9:16, 16:9), tone komunikasi, dan platform tujuan.", "2. Design and Tone Parameters", "Customize visual style, aspect ratio, communication tone, and target platform."],
      ["3. Hasil Siap Pakai", "AI menghasilkan visual prompt untuk Midjourney/Flux, caption copywriting, hashtag, dan hook video secara instan.", "3. Ready-to-Use Results", "Generate visual prompts, captions, hashtags, and video hooks for immediate use."],
      ["4. Asisten AI Workspace (RAG)", "Gunakan tombol sparkle di navbar untuk menanyakan status keuangan, task tertunda, atau ringkasan proyek workspace kamu.", "4. Workspace AI Assistant (RAG)", "Ask the navbar assistant about finances, pending tasks, and workspace project summaries."],
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
      ["1. Email Bisnis Kustom", "Gunakan alamat email domain bisnis kamu sendiri untuk pengiriman notifikasi profesional ke klien.", "1. Custom Business Email", "Send professional client notifications from your own business domain address."],
      ["2. Dispatch Otomatis", "Kirim invoice, proposal penawaran, dan link kontrak langsung ke inbox klien dengan template email rapi.", "2. Automatic Dispatch", "Send invoices, estimates, and contract links to client inboxes with polished templates."],
      ["3. Reply-To Workspace", "Balasan dari klien otomatis masuk ke email utama yang kamu atur di pengaturan workspace.", "3. Workspace Reply-To", "Route client replies automatically to the primary workspace email."],
      ["4. Akses Webmail", "Akses webmail terintegrasi untuk membaca dan membalas pesan klien langsung dari ekosistem Cubiqlo.", "4. Webmail Access", "Read and reply to client messages from Cubiqlo integrated webmail."],
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
  const toc = guide.items.map(([title, , enTitle]) => ({
    id: title.replace(/[^a-z0-9]+/gi, "-").toLowerCase(),
    label: lang === "en" ? enTitle : title,
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
        {guide.items.map(([title, desc, enTitle, enDesc], i) => {
          const sectionTitle = lang === "en" ? enTitle : title;
          const sectionDescription = lang === "en" ? enDesc : desc;
          return (
            <DocsSection key={title} id={toc[i].id} step={i + 1} icon={Icon} title={sectionTitle}>
              <p>{sectionDescription}</p>
            </DocsSection>
          );
        })}
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
              ? "Two billing models for new projects: Fixed Price and Hourly. Existing Retainer projects remain supported."
              : "Dua model billing untuk proyek baru: Fixed Price dan Per Jam. Proyek Retainer lama tetap didukung."}
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
