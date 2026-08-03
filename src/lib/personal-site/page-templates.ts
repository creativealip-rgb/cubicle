import type { PersonalSiteInput, PersonalSiteSection } from "@/lib/personal-site/model";
import { getSectionTemplateById } from "./section-templates";

export type PageTemplate = {
  id: string;
  label: string;
  description: string;
  category: string;
  build: (site: PersonalSiteInput) => Partial<PersonalSiteInput>;
};

// Helper function to build sections from template IDs
function buildSections(templateIds: string[]): PersonalSiteSection[] {
  return templateIds.map((id) => getSectionTemplateById(id)?.build()).filter((section): section is PersonalSiteSection => Boolean(section));
}

export const PAGE_TEMPLATES: PageTemplate[] = [
  // TEMPLATE 1: Freelancer Profile
  {
    id: "freelancer-profile",
    label: "Freelancer Profile",
    description: "Profil profesional untuk freelancer dengan layanan, proses, dan portfolio.",
    category: "individual",
    build: (_site: PersonalSiteInput) => ({
      title: "Nama Anda – Freelancer",
      subtitle: "Freelancer · Consultant · Specialist",
      hero: "Saya membantu bisnis kecil dan menengah tampil lebih profesional, terpercaya, dan siap menerima klien baru melalui website yang efektif.",
      about:
        "Saya adalah freelancer berpengalaman dengan +5 tahun pengalaman membangun website dan solusi digital untuk berbagai industri. Pendekatan saya berfokus pada hasil nyata - bukan hanya desain bagus, tapi website yang benar-benar meningkatkan konversi dan kredibilitas bisnis Anda.\n\nSetiap project dimulai dengan pemahaman mendalam tentang kebutuhan Anda, dilanjutkan dengan eksekusi terstruktur, dan diakhiri dengan handover lengkap termasuk dokumentasi dan panduan maintenance.",
      ctaLabel: "Konsultasi Gratis",
      pages: [
        {
          id: "home",
          slug: "",
          title: "Beranda",
          isHome: true,
          sections: buildSections([
            "services-software-dev",
            "process-agile",
            "testimonials-3-clients",
            "cta-primary"
          ]),
        },
      ],
    }),
  },

  // TEMPLATE 2: Agency Website
  {
    id: "agency-website",
    label: "Agency Website",
    description: "Website agensi digital lengkap dengan team, services, dan portfolio.",
    category: "business",
    build: (_site: PersonalSiteInput) => ({
      title: "Nama Agensi Anda",
      subtitle: "Digital Agency · Web Development · Marketing Solutions",
      hero: "Kami mengubah visi Anda menjadi kenyataan digital yang measurable dan scalable.",
      about:
        "Agensi kami adalah team cross-functional yang terdiri dari strategists, designers, developers, dan marketers yang bekerja sama untuk menghadirkan solusi digital end-to-end.\n\nDengan pengalaman mengerjakan 100+ project untuk klien lokal dan internasional, kami memahami bahwa setiap bisnis unik. Oleh karena itu, pendekatan kami selalu dimulai dari discovery mendalam untuk memastikan solusi yang kami bangun benar-benar sesuai dengan goals dan constraints spesifik Anda.\n\nTim kami mengadopsi agile methodology dengan weekly sprints, transparent communication, dan data-driven decision making untuk memastikan hasil maksimal dan accountability penuh selama project berjalan.",
      ctaLabel: "Mulai Project",
      pages: [
        {
          id: "home",
          slug: "",
          title: "Beranda",
          isHome: true,
          sections: buildSections([
            "services-3-cards",
            "pricing-3-packages",
            "gallery-portfolio",
            "testimonials-3-clients",
            "cta-contact"
          ]),
        },
        {
          id: "about",
          slug: "about",
          title: "Tentang Kami",
          isHome: false,
          sections: buildSections([
            "process-agile",
            "content-block-2-col",
            "divider-simple"
          ]),
        },
      ],
    }),
  },

  // TEMPLATE 3: Service Offer
  {
    id: "service-offer",
    label: "Service Offer",
    description: "Landing page fokus pada satu atau beberapa jasa utama dengan clear CTA.",
    category: "business",
    build: (_site: PersonalSiteInput) => ({
      title: "Nama Jasa Anda",
      subtitle: "Professional Services · Expert Solutions",
      hero: "Solusi profesional untuk masalah spesifik bisnis Anda — delivered on-time, on-budget, dengan kualitas yang dapat diukur.",
      about:
        "Jasa kami dirancang khusus untuk menyelesaikan pain point yang paling menghambat pertumbuhan bisnis Anda. Dengan metodologi proven dan tim ahli bersertifikat, kami memberikan hasil yang tidak hanya memenuhi ekspektasi, tapi melampaui harapan.\n\nKeunggulan layanan kami:\n• Tim expert dengan track record terbukti\n• Proses transparent dengan regular updates\n• Quality assurance ketat sebelum delivery\n• Support dan maintenance post-launch\n• Flexible pricing tanpa hidden costs",
      ctaLabel: "Dapatkan Penawaran",
      pages: [
        {
          id: "home",
          slug: "",
          title: "Beranda",
          isHome: true,
          sections: buildSections([
            "services-software-dev",
            "pricing-saas-tier",
            "faq-freelancer",
            "cta-primary"
          ]),
        },
        {
          id: "pricing",
          slug: "pricing",
          title: "Harga & Paket",
          isHome: false,
          sections: buildSections(["pricing-saas-tier"]),
        },
      ],
    }),
  },
];

// Get templates by category
export function getPageTemplatesByCategory(category?: string): PageTemplate[] {
  if (!category) return PAGE_TEMPLATES;
  return PAGE_TEMPLATES.filter((template) => template.category === category);
}

// Get all categories
export function getPageTemplateCategories(): { value: string; label: string }[] {
  const categories = Array.from(new Set(PAGE_TEMPLATES.map((t) => t.category)));
  return categories.map((cat) => ({
    value: cat,
    label: cat.charAt(0).toUpperCase() + cat.slice(1),
  }));
}
