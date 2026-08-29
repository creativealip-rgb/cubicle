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
    description: "Professional freelancer profile with services, process, and portfolio.",
    category: "individual",
    build: (_site: PersonalSiteInput) => ({
      title: "Your Name – Freelancer",
      subtitle: "Freelancer · Consultant · Specialist",
      hero: "I help small and medium businesses look more professional, build trust, and win new clients through effective websites.",
      about:
        "I am an experienced freelancer with 5+ years building websites and digital solutions across industries. My approach focuses on measurable outcomes—not only polished design, but websites that improve conversion and business credibility.\n\nEvery project starts with a deep understanding of your needs, continues through structured execution, and ends with a complete handover including documentation and maintenance guidance.",
      ctaLabel: "Free Consultation",
      pages: [
        {
          id: "home",
          slug: "",
          title: "Home",
          isHome: true,
          sections: buildSections([
            "services-software-dev",
            "process-agile",
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
    description: "Complete digital agency website with team, services, and portfolio.",
    category: "business",
    build: (_site: PersonalSiteInput) => ({
      title: "Your Agency Name",
      subtitle: "Digital Agency · Web Development · Marketing Solutions",
      hero: "We turn your vision into measurable, scalable digital experiences.",
      about:
        "Our cross-functional team brings strategists, designers, developers, and marketers together to deliver end-to-end digital solutions.\n\nWe start with focused discovery to understand your business, goals, and constraints before designing the right solution.\n\nOur team uses agile delivery, weekly sprints, transparent communication, and data-driven decisions to maintain quality and accountability.",
      ctaLabel: "Start a Project",
      pages: [
        {
          id: "home",
          slug: "",
          title: "Home",
          isHome: true,
          sections: buildSections([
            "services-3-cards",
            "pricing-3-packages",
            "gallery-portfolio",
            "cta-contact"
          ]),
        },
        {
          id: "about",
          slug: "about",
          title: "About Us",
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
    description: "A focused landing page for one or more core services with a clear CTA.",
    category: "business",
    build: (_site: PersonalSiteInput) => ({
      title: "Your Service Name",
      subtitle: "Professional Services · Expert Solutions",
      hero: "Professional solutions for specific business challenges—delivered on time, on budget, with measurable quality.",
      about:
        "Our services address the challenges that most limit business growth. With a proven methodology and experienced specialists, we deliver outcomes against clear expectations.\n\nWhat you get:\n• Experienced specialists with a proven track record\n• A transparent process with regular updates\n• Thorough quality assurance before delivery\n• Post-launch support and maintenance\n• Flexible pricing with no hidden costs",
      ctaLabel: "Request a Quote",
      pages: [
        {
          id: "home",
          slug: "",
          title: "Home",
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
          title: "Pricing & Plans",
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
