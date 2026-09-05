export type ProductUpdateType = "new" | "improvement" | "fix";

export interface ProductUpdateItem {
  type: ProductUpdateType;
  title: { id: string; en: string };
  description: { id: string; en: string };
  href?: string;
  cta?: { id: string; en: string };
}

export interface ProductUpdate {
  id: string;
  date: string;
  title: { id: string; en: string };
  summary: { id: string; en: string };
  items: ProductUpdateItem[];
}

export const productUpdates: ProductUpdate[] = [
  {
    id: "2026-09-05-ai-and-workspace-evolution",
    date: "2026-09-05",
    title: {
      id: "AI Assistant 2.0 & Modernisasi Antarmuka Workspace",
      en: "AI Assistant 2.0 & Workspace Interface Modernization",
    },
    summary: {
      id: "Perombakan total AI Assistant dengan dual-pane full viewport, manajemen sesi chat (pin & rename), draggable floating widget, interactive weekly task tracker, dan adaptive mobile cards universal.",
      en: "Complete revamp of AI Assistant featuring dual-pane full-viewport layout, chat session management (pin & rename), draggable floating widget, interactive weekly task tracker, and universal adaptive mobile cards.",
    },
    items: [
      {
        type: "new",
        title: {
          id: "AI Interactive Action Suite (Client, Project, Invoice, Task, Timer)",
          en: "AI Interactive Action Suite (Client, Project, Invoice, Task, Timer)",
        },
        description: {
          id: "AI Assistant kini mampu mengeksekusi aksi pembuatan data nyata secara langsung: daftarkan Klien, buat Proyek, terbitkan draf Invoice lengkap dengan kalkulasi item, tambah Tugas, dan nyalakan Timer pelacakan waktu kerja.",
          en: "AI Assistant can now execute live actions directly: register new Clients, create Projects, issue draft Invoices with line items calculation, create Tasks, and start active Time Trackers.",
        },
        href: "/app/brain",
        cta: {
          id: "Coba Aksi AI",
          en: "Try AI Actions",
        },
      },
      {
        type: "new",
        title: {
          id: "AI Assistant Hub 2.0 (Dual-Pane Full-Viewport)",
          en: "AI Assistant Hub 2.0 (Dual-Pane Full-Viewport)",
        },
        description: {
          id: "Pengalaman AI split 2-kolom ala ChatGPT/Claude tanpa double scroll, composer sticky di bagian bawah, dukungan multi-turn chat bersambung, dan knowledge base lengkap seluruh fitur Cubiqlo.",
          en: "Dual-column ChatGPT/Claude experience without double scrolling, sticky bottom composer, continuous multi-turn sessions, and comprehensive knowledge across all Cubiqlo features.",
        },
        href: "/app/brain",
        cta: {
          id: "Buka AI Assistant",
          en: "Open AI Assistant",
        },
      },
      {
        type: "new",
        title: {
          id: "Pin & Rename Sesi Chat AI",
          en: "Pin & Rename AI Chat Sessions",
        },
        description: {
          id: "Sematkan percakapan AI penting ke urutan paling atas dan ubah judul sesi chat secara instan langsung dari sidebar riwayat.",
          en: "Pin important AI conversations to the top and rename chat session titles inline directly from the history sidebar.",
        },
        href: "/app/brain",
        cta: {
          id: "Coba Sesi AI",
          en: "Try AI Sessions",
        },
      },
      {
        type: "new",
        title: {
          id: "Draggable Floating AI Widget",
          en: "Draggable Floating AI Widget",
        },
        description: {
          id: "Pop-up AI widget di pojok kanan bawah kini dapat digeser dan dipindahkan bebas menggunakan kursor mouse ke area layar mana pun.",
          en: "The navbar floating AI pop-up widget can now be dragged and moved anywhere across the viewport using mouse cursor gestures.",
        },
        href: "/app/dashboard",
        cta: {
          id: "Lihat Widget",
          en: "View Widget",
        },
      },
      {
        type: "new",
        title: {
          id: "Interactive Weekly Task Tracker",
          en: "Interactive Weekly Task Tracker",
        },
        description: {
          id: "Matriks pelacakan tugas mingguan interaktif (Senin–Minggu) dengan donut chart ringkas dan toggle centang cepat.",
          en: "Interactive weekly task matrix (Monday–Sunday) featuring compact completion donut charts and fast inline status toggling.",
        },
        href: "/app/tasks",
        cta: {
          id: "Buka Tasks",
          en: "Open Tasks",
        },
      },
      {
        type: "improvement",
        title: {
          id: "Service Catalog & Packages Modernization",
          en: "Service Catalog & Packages Modernization",
        },
        description: {
          id: "3-KPI summary strip, segmented category filter pills, dan modal kategori terpadu pada modul Service.",
          en: "3-KPI summary strip, segmented category filter pills, and unified category management modals on the Services module.",
        },
        href: "/app/services",
        cta: {
          id: "Lihat Services",
          en: "View Services",
        },
      },
      {
        type: "improvement",
        title: {
          id: "Universal Adaptive Mobile Cards (100% Modul)",
          en: "Universal Adaptive Mobile Cards (100% Modules)",
        },
        description: {
          id: "Tampilan data tabel di smartphone otomatis beralih ke format kartu adaptif yang compact, elegan, dan nyaman disentuh.",
          en: "Data tables across all modules automatically switch to compact, elegant, and touch-friendly adaptive cards on mobile viewports.",
        },
      },
      {
        type: "improvement",
        title: {
          id: "Halaman Booking Publik Lebih Premium",
          en: "Premium Public Booking Experience",
        },
        description: {
          id: "Desain visual halaman booking publik (/booking/[slug]) dipercantik dengan backdrop ambient, gradient avatar, dan auto slot fetcher.",
          en: "Public booking pages (/booking/[slug]) redesigned with ambient backdrop glows, gradient avatars, and dynamic calendar slot fetchers.",
        },
      },
      {
        type: "fix",
        title: {
          id: "Kontras Teks & Penegasan Divider Tabel Desktop",
          en: "Text Contrast & Crisp Table Dividers",
        },
        description: {
          id: "Perbaikan kontras teks bubble user pada chat AI dan penegasan garis pemisah tabel di seluruh rute aplikasi.",
          en: "Fixed high-contrast white text on user chat bubbles and strengthened desktop table border dividers across the platform.",
        },
      },
    ],
  },
  {
    id: "2026-07-25-settings-and-access",
    date: "2026-07-25",
    title: {
      id: "Pengaturan lebih aman, akses lebih rapi",
      en: "Enhanced Security & Polished Access Controls",
    },
    summary: {
      id: "Pembaruan keamanan akun, pengalaman mobile, dan pemisahan landing page dengan dashboard.",
      en: "Account security hardening, improved mobile settings navigation, and smooth multi-domain authentication handling.",
    },
    items: [
      {
        type: "improvement",
        title: {
          id: "Pengaturan akun lebih aman",
          en: "Account security hardening",
        },
        description: {
          id: "Validasi password, sesi perangkat lain, upload logo, dan izin owner diperketat.",
          en: "Stricter password validation, active session management, custom logo uploads, and enforced owner privileges.",
        },
        href: "/app/settings?tab=account",
        cta: {
          id: "Buka Pengaturan",
          en: "Open Settings",
        },
      },
      {
        type: "improvement",
        title: {
          id: "Navigasi mobile Settings",
          en: "Mobile Settings Navigation",
        },
        description: {
          id: "Tab Settings kini lebih mudah digeser dan tombol aksi punya area sentuh lebih nyaman.",
          en: "Settings tabs are now horizontally swipeable with optimized touch targets for mobile devices.",
        },
        href: "/app/settings",
        cta: {
          id: "Lihat Settings",
          en: "View Settings",
        },
      },
      {
        type: "fix",
        title: {
          id: "Login dan logout lintas subdomain",
          en: "Cross-subdomain Auth Session Routing",
        },
        description: {
          id: "Landing Cubiqlo dan dashboard app kini menangani sesi valid, logout, dan cookie lama tanpa redirect berulang.",
          en: "Clean session transitions between public landing and app dashboard without redirect loops or stale cookies.",
        },
      },
    ],
  },
  {
    id: "2026-07-18-workflow-polish",
    date: "2026-07-18",
    title: {
      id: "Workflow harian makin ringkas",
      en: "Streamlined Daily Client Workflows",
    },
    summary: {
      id: "Penyempurnaan navigasi dan tampilan untuk kerja klien sehari-hari.",
      en: "Polished navigation and compact layouts designed for daily freelance and agency client operations.",
    },
    items: [
      {
        type: "new",
        title: {
          id: "Service untuk freelancer",
          en: "Freelance Service Packages",
        },
        description: {
          id: "Susun layanan sebagai template proyek agar setup kerja berulang lebih cepat.",
          en: "Bundle recurring offerings into modular service packages for rapid project kickoffs.",
        },
        href: "/app/packages",
        cta: {
          id: "Kelola Service",
          en: "Manage Services",
        },
      },
      {
        type: "improvement",
        title: {
          id: "Daftar lebih fokus",
          en: "High-density Focused Lists",
        },
        description: {
          id: "Tampilan data penting diringkas agar status dan tindakan utama lebih cepat ditemukan.",
          en: "Key entity data streamlined so statuses and primary action buttons are instantly accessible.",
        },
      },
    ],
  },
];

export const latestProductUpdateId = productUpdates[0]?.id ?? "";
export const WHATS_NEW_STORAGE_KEY = "cubiqlo:whats-new:last-seen";
