import type { PersonalSiteSection } from "@/lib/personal-site/model";

export type SectionTemplate = {
  id: string;
  type: PersonalSiteSection["type"];
  label: string;
  description: string;
  category: "hero" | "content" | "conversion" | "proof" | "media" | "layout";
  build: () => PersonalSiteSection;
};

function makeId(prefix = "s") {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}`;
}

// Helper function to build array of items with proper IDs
function buildItems<T extends Record<string, unknown>>(
  base: T,
  count: number,
  buildItem: (index: number) => Partial<T>
): T[] {
  const result: T[] = [];
  for (let i = 0; i < count; i++) {
    // Spread base first, then per-item overrides, and put the fresh id last so
    // the generated id always wins over the empty placeholder in base.
    const item = { ...base, ...buildItem(i), id: makeId() };
    result.push(item as T);
  }
  return result;
}

export const SECTION_TEMPLATES: SectionTemplate[] = [
  // SERVICES TEMPLATES
  {
    id: "services-3-cards",
    type: "services" as const,
    label: "Layanan 3 Kartu",
    description: "Tiga layanan utama dengan manfaat singkat.",
    category: "content",
    build: () => ({
      id: makeId(),
      type: "services" as const,
      heading: "Layanan yang bisa kamu pilih",
      items: buildItems(
        { id: "", title: "", description: "" },
        3,
        (i) => ({
          title: ["Strategi", "Eksekusi", "Optimasi"][i],
          description: [
            "Riset kebutuhan dan susun arah kerja yang jelas.",
            "Bangun solusi dengan milestone dan review rutin.",
            "Ukur hasil, perbaiki bottleneck, dan tingkatkan performa.",
          ][i],
        })
      ),
    }),
  },
  {
    id: "services-software-dev",
    type: "services" as const,
    label: "Pengembangan Software",
    description: "Layanan custom software untuk bisnis Anda.",
    category: "content",
    build: () => ({
      id: makeId(),
      type: "services" as const,
      heading: "Pengembangan Aplikasi & Web",
      items: buildItems(
        { id: "", title: "", description: "" },
        3,
        (i) => ({
          title: ["Web Apps", "Mobile Apps", "API Integration"][i],
          description: [
            "Aplikasi web scalable dengan arsitektur modern.",
            "Aplikasi mobile cross-platform Android & iOS.",
            "Integrasi sistem dan API pihak ketiga.",
          ][i],
        })
      ),
    }),
  },

  // PRICING TEMPLATES
  {
    id: "pricing-3-packages",
    type: "pricing" as const,
    label: "Pricing 3 Paket",
    description: "Paket Basic, Growth, dan Premium.",
    category: "conversion",
    build: () => ({
      id: makeId(),
      type: "pricing" as const,
      heading: "Paket kerja sama",
      offers: buildItems(
        { id: "", name: "", price: "", description: "" },
        3,
        (i) => ({
          name: ["Basic", "Growth", "Premium"][i],
          price: ["Mulai Rp2.500.000", "Mulai Rp7.500.000", "Custom"][i],
          description: [
            "Cocok untuk validasi cepat dan scope kecil.",
            "Untuk bisnis yang butuh sistem rapi dan siap jalan.",
            "Untuk kebutuhan kompleks, integrasi, dan pendampingan.",
          ][i],
        })
      ),
    }),
  },
  {
    id: "pricing-saas-tier",
    type: "pricing" as const,
    label: "SaaS Pricing Tier",
    description: "Paket bulanan untuk SaaS produk.",
    category: "conversion",
    build: () => ({
      id: makeId(),
      type: "pricing" as const,
      heading: "Pilih rencana yang tepat",
      offers: buildItems(
        { id: "", name: "", price: "", description: "" },
        3,
        (i) => ({
          name: ["Starter", "Professional", "Enterprise"][i],
          price: ["$29/bulan", "$79/bulan", "Hubungi kami"][i],
          description: [
            "Untuk individu dan side projects.",
            "Untuk tim kecil dan growing businesses.",
            "Untuk organisasi dengan skala besar.",
          ][i],
        })
      ),
    }),
  },

  // FAQ TEMPLATES
  {
    id: "faq-5-items",
    type: "faq" as const,
    label: "FAQ 5 Pertanyaan",
    description: "Pertanyaan umum sebelum klien menghubungi.",
    category: "conversion",
    build: () => ({
      id: makeId(),
      type: "faq" as const,
      heading: "Pertanyaan umum",
      items: buildItems(
        { id: "", question: "", answer: "" },
        5,
        (i) => ({
          question: [
            "Berapa lama proses pengerjaan?",
            "Apakah bisa konsultasi dulu?",
            "Apakah revisi termasuk?",
            "Metode pembayarannya bagaimana?",
            "Apakah dapat file/source akhir?",
          ][i],
          answer: [
            "Tergantung scope. Project kecil biasanya 1-2 minggu, project kompleks dibuat per milestone.",
            "Bisa. Kita mulai dari diskusi kebutuhan agar scope dan estimasi jelas.",
            "Ya, revisi mengikuti paket atau kesepakatan di proposal.",
            "Umumnya memakai DP dan pelunasan per milestone.",
            "Ya, aset final diserahkan sesuai scope project.",
          ][i],
        })
      ),
    }),
  },
  {
    id: "faq-freelancer",
    type: "faq" as const,
    label: "FAQ Freelancer",
    description: "FAQ khusus untuk freelancer profile.",
    category: "conversion",
    build: () => ({
      id: makeId(),
      type: "faq" as const,
      heading: "Yang sering ditanyakan",
      items: buildItems(
        { id: "", question: "", answer: "" },
        5,
        (i) => ({
          question: [
            "Apa pengalaman Anda?",
            "Bagaimana cara kerja kolaborasi?",
            "Bagaimana jika ada perubahan kebutuhan?",
            "Apakah ada garansi setelah delivery?",
            "Bagaimana biaya tambahan dihitung?",
          ][i],
          answer: [
            "Saya telah mengerjakan 50+ project untuk berbagai industri sejak 2018.",
            "Dimulai dengan discovery call, disusul dengan weekly updates dan staging preview.",
            "Perubahan dipantau di setiap milestone dengan persetujuan tertulis.",
            "Ada 14 hari bug fix warranty setelah project launch.",
            "Timewaste dan feature request baru akan dibid terpisah.",
          ][i],
        })
      ),
    }),
  },

  // TESTIMONIALS
  {
    id: "testimonials-3-clients",
    type: "testimonials" as const,
    label: "Testimoni 3 Klien",
    description: "Kutipan dari klien sebelumnya.",
    category: "proof",
    build: () => ({
      id: makeId(),
      type: "testimonials" as const,
      heading: "Apa kata klien",
      testimonials: buildItems(
        { id: "", quote: "", author: "", role: "" },
        3,
        (i) => ({
          quote: [
            "Hasil kerja sangat memuaskan, komunikasi lancar, dan tepat waktu.",
            "Profesional dan detail-oriented. Sangat merekomendasikan!",
            "Website yang dibangun meningkatkan konversi kita hingga 40%.",
          ][i],
          author: ["Budi Santoso", "Siti Rahmawati", "Andi Wijaya"][i],
          role: ["CEO StartupX", "Marketing Director", "Founder TechCorp"][i],
        })
      ),
    }),
  },

  // CTA TEMPLATES
  {
    id: "cta-primary",
    type: "cta" as const,
    label: "CTA Utama",
    description: "Call-to-action untuk konversi utama.",
    category: "conversion",
    build: () => ({
      id: makeId(),
      type: "cta" as const,
      heading: "Siap memulai proyek?",
      text: "Hubungi kami sekarang untuk konsultasi gratis tentang kebutuhan Anda.",
      buttonLabel: "Konsultasi Gratis",
      buttonUrl: "",
    }),
  },
  {
    id: "cta-contact",
    type: "cta" as const,
    label: "CTA Kontak",
    description: "CTA untuk mengarahkan ke kontak/wa.",
    category: "conversion",
    build: () => ({
      id: makeId(),
      type: "cta" as const,
      heading: "Butuh bantuan?",
      text: "Tim kami siap membantu menjawab pertanyaan Anda 24/7.",
      buttonLabel: "Chat via WhatsApp",
      buttonUrl: "https://wa.me/",
    }),
  },

  // PROCESS TEMPLATES
  {
    id: "process-3-step",
    type: "process" as const,
    label: "Proses 3 Langkah",
    description: "Workflow sederhana dalam 3 langkah.",
    category: "content",
    build: () => ({
      id: makeId(),
      type: "process" as const,
      heading: "Cara kerja",
      steps: buildItems(
        { id: "", title: "", description: "" },
        3,
        (i) => ({
          title: ["Discovery", "Development", "Delivery"][i],
          description: [
            "Diskusikan kebutuhan dan goals proyek Anda bersama tim kami.",
            "Kami bangun solusi dengan checkpoint dan review berkala.",
            "Project selesai dengan testing, training, dan handover lengkap.",
          ][i],
        })
      ),
    }),
  },
  {
    id: "process-agile",
    type: "process" as const,
    label: "Metode Agile",
    description: "Workflow pengembangan dengan agile methodology.",
    category: "content",
    build: () => ({
      id: makeId(),
      type: "process" as const,
      heading: "Agile Development Process",
      steps: buildItems(
        { id: "", title: "", description: "" },
        4,
        (i) => ({
          title: ["Sprint Planning", "Development", "Testing & QA", "Deployment"][i],
          description: [
            "Setiap sprint dimulai dengan planning 2-week iteration.",
            "Coding dengan code review dan pair programming.",
            "Automated tests, manual testing, dan user acceptance.",
            "Staging deployment followed by production rollout.",
          ][i],
        })
      ),
    }),
  },

  // GALLERY TEMPLATES
  {
    id: "gallery-portfolio",
    type: "gallery" as const,
    label: "Portfolio Gallery",
    description: "Gallery gambar untuk menampilkan work.",
    category: "media",
    build: () => ({
      id: makeId(),
      type: "gallery" as const,
      heading: "Work Terbaru",
      images: buildItems(
        { id: "", url: "", alt: "" },
        6,
        (i) => ({
          url: `https://picsum.photos/seed/${i + 10}/400/300`,
          alt: `Project ${i + 1}`,
        })
      ),
    }),
  },

  // CONTENT BLOCK TEMPLATE
  {
    id: "content-block-2-col",
    type: "contentBlock" as const,
    label: "Content Block 2 Kolom",
    description: "Dua kolom konten dengan layout fleksibel.",
    category: "layout",
    build: () => ({
      id: makeId(),
      type: "contentBlock" as const,
      heading: "Keunggulan Kami",
      columns: 2,
      layout: "equal" as const,
      items: buildItems(
        { id: "", content: "" },
        2,
        (i) => ({
          content: [
            "Kami menggunakan best practices dan standar industri tertinggi untuk memastikan kualitas dan keamanan.",
            "Tim kami terdiri dari profesional berpengalaman yang siap membantu mewujudkan visi Anda.",
          ][i],
        })
      ),
    }),
  },

  // DIVIDER TEMPLATE
  {
    id: "divider-simple",
    type: "divider" as const,
    label: "Divider Minimalis",
    description: "Pemisah horizontal untuk visual break.",
    category: "layout",
    build: () => ({
      id: makeId(),
      type: "divider" as const,
      heading: "Pemisah bagian",
    }),
  },

  // SPACER TEMPLATE
  {
    id: "spacer-large",
    type: "spacer" as const,
    label: "Spacer Besar",
    description: "Spacing vertikal yang lebih besar.",
    category: "layout",
    build: () => ({
      id: makeId(),
      type: "spacer" as const,
      heading: "Jarak vertikal",
      height: 80,
    }),
  },

  // EMBED TEMPLATE
  {
    id: "embed-video",
    type: "embed" as const,
    label: "Embed Video",
    description: "Embed video dari YouTube atau lainnya.",
    category: "media",
    build: () => ({
      id: makeId(),
      type: "embed" as const,
      heading: "Video Demo",
      url: "https://www.youtube.com/embed/dQw4w9WgXcQ",
      height: 400,
    }),
  },
];

// Helper function to get template by ID
export function getSectionTemplateById(id: string): SectionTemplate | undefined {
  return SECTION_TEMPLATES.find((template) => template.id === id);
}

// Filter templates by category
export function getTemplatesByCategory(category: string): SectionTemplate[] {
  return SECTION_TEMPLATES.filter((template) => template.category === category);
}

// Get all categories
export function getCategoryOptions(): { value: string; label: string }[] {
  const categories = Array.from(new Set(SECTION_TEMPLATES.map((t) => t.category)));
  return categories.map((cat) => ({
    value: cat,
    label: cat.charAt(0).toUpperCase() + cat.slice(1),
  }));
}
