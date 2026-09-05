export type ProductUpdateType = "new" | "improvement" | "fix";

export interface ProductUpdateItem {
  type: ProductUpdateType;
  title: string;
  description: string;
  href?: string;
  cta?: string;
}

export interface ProductUpdate {
  id: string;
  date: string;
  title: string;
  summary: string;
  items: ProductUpdateItem[];
}

export const productUpdates: ProductUpdate[] = [
  {
    id: "2026-09-05-ai-and-workspace-evolution",
    date: "2026-09-05",
    title: "AI Assistant 2.0 & Modernisasi Antarmuka Workspace",
    summary: "Perombakan total AI Assistant dengan dual-pane full viewport, manajemen sesi chat (pin & rename), draggable floating widget, interactive weekly task tracker, dan adaptive mobile cards universal.",
    items: [
      {
        type: "new",
        title: "AI Assistant Hub 2.0 (Dual-Pane Full-Viewport)",
        description: "Pengalaman AI split 2-kolom ala ChatGPT/Claude tanpa double scroll, composer sticky di bagian bawah, dukungan multi-turn chat bersambung, dan knowledge base lengkap seluruh fitur Cubiqlo.",
        href: "/app/brain",
        cta: "Buka AI Assistant",
      },
      {
        type: "new",
        title: "Pin & Rename Sesi Chat AI",
        description: "Sematkan percakapan AI penting ke urutan paling atas dan ubah judul sesi chat secara instan langsung dari sidebar riwayat.",
        href: "/app/brain",
        cta: "Coba Sesi AI",
      },
      {
        type: "new",
        title: "Draggable Floating AI Widget",
        description: "Pop-up AI widget di pojok kanan bawah kini dapat digeser dan dipindahkan bebas menggunakan kursor mouse ke area layar mana pun.",
        href: "/app/dashboard",
        cta: "Lihat Widget",
      },
      {
        type: "new",
        title: "Interactive Weekly Task Tracker",
        description: "Matriks pelacakan tugas mingguan interaktif (Senin–Minggu) dengan donut chart ringkas dan toggle centang cepat.",
        href: "/app/tasks",
        cta: "Buka Tasks",
      },
      {
        type: "improvement",
        title: "Service Catalog & Packages Modernization",
        description: "3-KPI summary strip, segmented category filter pills, dan modal kategori terpadu pada modul Service.",
        href: "/app/services",
        cta: "Lihat Services",
      },
      {
        type: "improvement",
        title: "Universal Adaptive Mobile Cards (100% Modul)",
        description: "Tampilan data tabel di smartphone otomatis beralih ke format kartu adaptif yang compact, elegan, dan nyaman disentuh.",
      },
      {
        type: "improvement",
        title: "Halaman Booking Publik Lebih Premium",
        description: "Desain visual halaman booking publik (/booking/[slug]) dipercantik dengan backdrop ambient, gradient avatar, dan auto slot fetcher.",
      },
      {
        type: "fix",
        title: "Kontras Teks & Penegasan Divider Tabel Desktop",
        description: "Perbaikan kontras teks bubble user pada chat AI dan penegasan garis pemisah tabel di seluruh rute aplikasi.",
      },
    ],
  },
  {
    id: "2026-07-25-settings-and-access",
    date: "2026-07-25",
    title: "Pengaturan lebih aman, akses lebih rapi",
    summary: "Pembaruan keamanan akun, pengalaman mobile, dan pemisahan landing page dengan dashboard.",
    items: [
      {
        type: "improvement",
        title: "Pengaturan akun lebih aman",
        description: "Validasi password, sesi perangkat lain, upload logo, dan izin owner diperketat.",
        href: "/app/settings?tab=account",
        cta: "Buka Pengaturan",
      },
      {
        type: "improvement",
        title: "Navigasi mobile Settings",
        description: "Tab Settings kini lebih mudah digeser dan tombol aksi punya area sentuh lebih nyaman.",
        href: "/app/settings",
        cta: "Lihat Settings",
      },
      {
        type: "fix",
        title: "Login dan logout lintas subdomain",
        description: "Landing Cubiqlo dan dashboard app kini menangani sesi valid, logout, dan cookie lama tanpa redirect berulang.",
      },
    ],
  },
  {
    id: "2026-07-18-workflow-polish",
    date: "2026-07-18",
    title: "Workflow harian makin ringkas",
    summary: "Penyempurnaan navigasi dan tampilan untuk kerja klien sehari-hari.",
    items: [
      {
        type: "new",
        title: "Service untuk freelancer",
        description: "Susun layanan sebagai template proyek agar setup kerja berulang lebih cepat.",
        href: "/app/packages",
        cta: "Kelola Service",
      },
      {
        type: "improvement",
        title: "Daftar lebih fokus",
        description: "Tampilan data penting diringkas agar status dan tindakan utama lebih cepat ditemukan.",
      },
    ],
  },
];

export const latestProductUpdateId = productUpdates[0]?.id ?? "";
export const WHATS_NEW_STORAGE_KEY = "cubiqlo:whats-new:last-seen";
