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
    label: "Three Service Cards",
    description: "Three core services with concise benefits.",
    category: "content",
    build: () => ({
      id: makeId(),
      type: "services" as const,
      heading: "Services you can choose",
      items: buildItems(
        { id: "", title: "", description: "" },
        3,
        (i) => ({
          title: ["Strategy", "Execution", "Optimization"][i],
          description: [
            "Research needs and define a clear direction.",
            "Build the solution through milestones and regular reviews.",
            "Measure results, remove bottlenecks, and improve performance.",
          ][i],
        })
      ),
    }),
  },
  {
    id: "services-software-dev",
    type: "services" as const,
    label: "Software Development",
    description: "Custom software services for your business.",
    category: "content",
    build: () => ({
      id: makeId(),
      type: "services" as const,
      heading: "Application & Web Development",
      items: buildItems(
        { id: "", title: "", description: "" },
        3,
        (i) => ({
          title: ["Web Apps", "Mobile Apps", "API Integration"][i],
          description: [
            "Scalable web applications with modern architecture.",
            "Cross-platform mobile applications for Android and iOS.",
            "System and third-party API integration.",
          ][i],
        })
      ),
    }),
  },

  // PRICING TEMPLATES
  {
    id: "pricing-3-packages",
    type: "pricing" as const,
    label: "Three Pricing Plans",
    description: "Basic, Growth, and Premium plans.",
    category: "conversion",
    build: () => ({
      id: makeId(),
      type: "pricing" as const,
      heading: "Engagement plans",
      offers: buildItems(
        { id: "", name: "", price: "", description: "" },
        3,
        (i) => ({
          name: ["Basic", "Growth", "Premium"][i],
          price: ["Starting at $150", "Starting at $450", "Custom"][i],
          description: [
            "Ideal for quick validation and a focused scope.",
            "For businesses that need an organized, launch-ready system.",
            "For complex needs, integrations, and ongoing support.",
          ][i],
        })
      ),
    }),
  },
  {
    id: "pricing-saas-tier",
    type: "pricing" as const,
    label: "SaaS Pricing Tier",
    description: "Monthly plans for SaaS products.",
    category: "conversion",
    build: () => ({
      id: makeId(),
      type: "pricing" as const,
      heading: "Choose the right plan",
      offers: buildItems(
        { id: "", name: "", price: "", description: "" },
        3,
        (i) => ({
          name: ["Starter", "Professional", "Enterprise"][i],
          price: ["$29/month", "$79/month", "Contact us"][i],
          description: [
            "For individuals and side projects.",
            "For small teams and growing businesses.",
            "For large organizations.",
          ][i],
        })
      ),
    }),
  },

  // FAQ TEMPLATES
  {
    id: "faq-5-items",
    type: "faq" as const,
    label: "Five-question FAQ",
    description: "Common questions before clients get in touch.",
    category: "conversion",
    build: () => ({
      id: makeId(),
      type: "faq" as const,
      heading: "Frequently asked questions",
      items: buildItems(
        { id: "", question: "", answer: "" },
        5,
        (i) => ({
          question: [
            "How long does the process take?",
            "Can we start with a consultation?",
            "Are revisions included?",
            "How does payment work?",
            "Will I receive the final source files?",
          ][i],
          answer: [
            "It depends on scope. Small projects usually take 1–2 weeks; complex projects are delivered by milestone.",
            "Yes. We start by discussing your needs so scope and estimates are clear.",
            "Yes. Revisions follow the selected plan or proposal agreement.",
            "Payments typically use a deposit followed by milestone installments.",
            "Yes. Final assets are delivered according to project scope.",
          ][i],
        })
      ),
    }),
  },
  {
    id: "faq-freelancer",
    type: "faq" as const,
    label: "FAQ Freelancer",
    description: "FAQ designed for freelancer profiles.",
    category: "conversion",
    build: () => ({
      id: makeId(),
      type: "faq" as const,
      heading: "Common questions",
      items: buildItems(
        { id: "", question: "", answer: "" },
        5,
        (i) => ({
          question: [
            "What experience do you have?",
            "How does collaboration work?",
            "What happens if requirements change?",
            "Is post-delivery support included?",
            "How are additional costs calculated?",
          ][i],
          answer: [
            "Share relevant experience and industries served.",
            "We start with discovery, followed by weekly updates and staging previews.",
            "Changes are tracked at each milestone with written approval.",
            "A 14-day bug-fix warranty is included after launch.",
            "New feature requests are estimated separately.",
          ][i],
        })
      ),
    }),
  },

  // TESTIMONIALS
  {
    id: "testimonials-3-clients",
    type: "testimonials" as const,
    label: "Client Testimonials",
    description: "Quotes from previous clients.",
    category: "proof",
    // Starter block inserts an EMPTY proof block — fake testimonials are never
    // auto-generated (P0.3). The section stays hidden on the public page until
    // the owner adds real client quotes.
    build: () => ({
      id: makeId(),
      type: "testimonials" as const,
      heading: "What clients say",
      testimonials: [],
    }),
  },

  // CTA TEMPLATES
  {
    id: "cta-primary",
    type: "cta" as const,
    label: "Primary CTA",
    description: "Call to action for the primary conversion.",
    category: "conversion",
    build: () => ({
      id: makeId(),
      type: "cta" as const,
      heading: "Ready to start a project?",
      text: "Contact us for a free consultation about your needs.",
      buttonLabel: "Free Consultation",
      buttonUrl: "",
    }),
  },
  {
    id: "cta-contact",
    type: "cta" as const,
    label: "Contact CTA",
    description: "CTA that directs visitors to your contact channel.",
    category: "conversion",
    build: () => ({
      id: makeId(),
      type: "cta" as const,
      heading: "Need help?",
      text: "Our team is ready to answer your questions.",
      buttonLabel: "Chat via WhatsApp",
      // Left empty on purpose: a template must not point at a dead
      // https://wa.me/ destination. The owner fills in their own number.
      buttonUrl: "",
    }),
  },

  // PROCESS TEMPLATES
  {
    id: "process-3-step",
    type: "process" as const,
    label: "Three-step Process",
    description: "A simple three-step workflow.",
    category: "content",
    build: () => ({
      id: makeId(),
      type: "process" as const,
      heading: "How it works",
      steps: buildItems(
        { id: "", title: "", description: "" },
        3,
        (i) => ({
          title: ["Discovery", "Development", "Delivery"][i],
          description: [
            "Discuss project needs and goals with our team.",
            "We build the solution through checkpoints and regular reviews.",
            "The project concludes with testing, training, and a complete handover.",
          ][i],
        })
      ),
    }),
  },
  {
    id: "process-agile",
    type: "process" as const,
    label: "Agile Method",
    description: "Development workflow based on agile methodology.",
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
            "Each sprint starts with planning for a two-week iteration.",
            "Development includes code review and pair programming.",
            "Automated tests, manual testing, and user acceptance.",
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
    description: "Image gallery for showcasing work.",
    category: "media",
    build: () => ({
      id: makeId(),
      type: "gallery" as const,
      heading: "Latest Work",
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
    label: "Two-column Content Block",
    description: "Two content columns with a flexible layout.",
    category: "layout",
    build: () => ({
      id: makeId(),
      type: "contentBlock" as const,
      heading: "Why choose us",
      columns: 2,
      layout: "equal" as const,
      items: buildItems(
        { id: "", content: "" },
        2,
        (i) => ({
          content: [
            "We use proven practices and high industry standards to ensure quality and security.",
            "Our experienced team is ready to bring your vision to life.",
          ][i],
        })
      ),
    }),
  },

  // DIVIDER TEMPLATE
  {
    id: "divider-simple",
    type: "divider" as const,
    label: "Minimal Divider",
    description: "A horizontal divider for visual separation.",
    category: "layout",
    build: () => ({
      id: makeId(),
      type: "divider" as const,
      heading: "Section divider",
    }),
  },

  // SPACER TEMPLATE
  {
    id: "spacer-large",
    type: "spacer" as const,
    label: "Large Spacer",
    description: "Larger vertical spacing.",
    category: "layout",
    build: () => ({
      id: makeId(),
      type: "spacer" as const,
      heading: "Vertical spacing",
      height: 80,
    }),
  },

  // EMBED TEMPLATE
  {
    id: "embed-video",
    type: "embed" as const,
    label: "Embed Video",
    description: "Embed a video from YouTube or another provider.",
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
