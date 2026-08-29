"use client";

import { Button } from "@/components/ui/button";
import type { PersonalSiteInput } from "@/lib/personal-site/model";
import { LayoutTemplate, Monitor, Smartphone } from "lucide-react";
import { useT } from "@/lib/i18n-client";

export type SitePreset = {
  label: string;
  values: Pick<PersonalSiteInput, "subtitle" | "hero" | "about" | "ctaLabel" | "sections">;
};

export const SITE_PRESETS: SitePreset[] = [
  {
    label: "Freelancer",
    values: {
      subtitle: "Freelancer · Designer · Developer",
      hero: "I help businesses build clear, fast, production-ready digital products.",
      about: "Share your experience, core expertise, and ideal client profile.",
      ctaLabel: "Discuss a project",
      sections: [
        { id: "freelance-services", type: "services", heading: "Services", items: [{ id: "fs-1", title: "Web & Product", description: "Describe the outcome, scope, and who benefits." }, { id: "fs-2", title: "Automation", description: "Describe the process you can simplify." }] },
        { id: "freelance-process", type: "process", heading: "How it works", steps: [{ id: "fp-1", title: "Discovery", description: "Understand goals and scope." }, { id: "fp-2", title: "Build", description: "Execute with clear checkpoints." }, { id: "fp-3", title: "Launch", description: "Test, launch, and hand over." }] },
      ],
    },
  },
  {
    label: "Agency",
    values: {
      subtitle: "Creative Studio · Brand · Digital",
      hero: "We build brands and digital experiences that move businesses forward.",
      about: "Share your studio focus, team structure, and collaboration approach.",
      ctaLabel: "Start a project",
      sections: [
        { id: "agency-services", type: "services", heading: "What we do", items: [{ id: "as-1", title: "Brand", description: "Positioning, identity, and brand systems." }, { id: "as-2", title: "Digital", description: "Websites, product UI, and automation." }] },
        { id: "agency-portfolio", type: "portfolio", heading: "Selected work", projects: [] },
        { id: "agency-process", type: "process", heading: "Process", steps: [{ id: "ap-1", title: "Brief", description: "Align goals and scope." }, { id: "ap-2", title: "Strategy", description: "Set direction and priorities." }, { id: "ap-3", title: "Execution", description: "Design, build, and review." }] },
      ],
    },
  },
  {
    label: "Consultant",
    values: {
      subtitle: "Strategy Consultant · Advisor",
      hero: "I help teams make better decisions with clearer direction.",
      about: "Share relevant experience, advisory areas, and engagement models.",
      ctaLabel: "Schedule a session",
      sections: [
        { id: "consult-services", type: "services", heading: "Area advisory", items: [{ id: "cs-1", title: "Strategy", description: "Positioning, priorities, and roadmap." }, { id: "cs-2", title: "Operations", description: "Workflow, capacity, and execution systems." }] },
        { id: "consult-process", type: "process", heading: "Engagement", steps: [{ id: "cp-1", title: "Diagnostic", description: "Understand current conditions and bottlenecks." }, { id: "cp-2", title: "Roadmap", description: "Define decisions and sequence the work." }, { id: "cp-3", title: "Review", description: "Measure results and adjust direction." }] },
      ],
    },
  },
  {
    label: "Portfolio",
    values: {
      subtitle: "Creative Portfolio · Selected Work",
      hero: "Selected work that shows how I think and solve problems.",
      about: "Share your creative approach, primary medium, and preferred collaborations.",
      ctaLabel: "Contact me",
      sections: [
        { id: "portfolio-work", type: "portfolio", heading: "Selected work", projects: [] },
        { id: "portfolio-services", type: "services", heading: "Expertise", items: [{ id: "ps-1", title: "Core expertise", description: "Describe your primary medium or service." }] },
      ],
    },
  },
];

export function PresetPicker({ onSelect }: { onSelect: (preset: SitePreset) => void }) {
  const { t } = useT();
  return <div className="space-y-2"><div className="flex items-center gap-2"><LayoutTemplate className="h-4 w-4 text-muted-foreground" /><h3 className="text-sm font-semibold">{t("Template awal", "Starter templates")}</h3></div><div className="grid grid-cols-2 gap-2">{SITE_PRESETS.map((preset) => <Button key={preset.label} type="button" variant="outline" className="min-h-10" onClick={() => onSelect(preset)}>{preset.label}</Button>)}</div><p className="text-xs text-muted-foreground">{t("Template mengganti konten utama dan section, bukan slug, status, atau tautan.", "Templates replace main content and sections, not slug, status, or links.")}</p></div>;
}

export function PreviewToggle({ mode, onChange }: { mode: "desktop" | "mobile"; onChange: (mode: "desktop" | "mobile") => void }) {
  return <div className="inline-flex rounded-lg bg-muted p-1"><Button type="button" aria-pressed={mode === "desktop"} variant={mode === "desktop" ? "default" : "ghost"} size="sm" onClick={() => onChange("desktop")}><Monitor className="h-4 w-4" />Desktop</Button><Button type="button" aria-pressed={mode === "mobile"} variant={mode === "mobile" ? "default" : "ghost"} size="sm" onClick={() => onChange("mobile")}><Smartphone className="h-4 w-4" />Mobile</Button></div>;
}
