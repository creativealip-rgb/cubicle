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
