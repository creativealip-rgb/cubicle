export type ProfessionTemplateKey = "virtual-assistant" | "developer" | "designer" | "writer" | "social-media-manager" | "consultant";
export type ProfessionTemplate = { label: string; services: string[]; activities: string[] };

export const PROFESSION_TEMPLATES: Record<ProfessionTemplateKey, ProfessionTemplate> = {
  "virtual-assistant": { label: "Virtual Assistant", services: ["Email Management", "Calendar Management", "Data Entry", "Customer Support"], activities: ["Email", "Scheduling", "Research", "Client Communication", "Administration"] },
  developer: { label: "Developer", services: ["Web Development", "API Development", "Maintenance", "Technical Consultation"], activities: ["Development", "Code Review", "Testing", "Meeting", "Deployment"] },
  designer: { label: "Designer", services: ["Logo Design", "Brand Identity", "Social Media Design", "UI/UX Design"], activities: ["Research", "Sketching", "Design", "Revision", "Client Meeting"] },
  writer: { label: "Writer", services: ["SEO Article Writing", "Website Copywriting", "Editing", "Content Strategy"], activities: ["Research", "Writing", "Editing", "Revision", "Interview"] },
  "social-media-manager": { label: "Social Media Manager", services: ["Content Planning", "Post Design", "Copywriting", "Scheduling", "Analytics Reporting"], activities: ["Research", "Planning", "Design", "Copywriting", "Publishing", "Reporting"] },
  consultant: { label: "Consultant", services: ["Discovery Session", "Business Audit", "Strategy Consulting", "Implementation Support"], activities: ["Discovery", "Analysis", "Workshop", "Documentation", "Client Meeting"] },
};

export function getProfessionTemplate(key: ProfessionTemplateKey): ProfessionTemplate {
  const value = PROFESSION_TEMPLATES[key];
  return { ...value, services: [...value.services], activities: [...value.activities] };
}
