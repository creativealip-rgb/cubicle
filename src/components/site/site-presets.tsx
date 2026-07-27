"use client";

import { Button } from "@/components/ui/button";
import { Monitor, Smartphone, LayoutTemplate } from "lucide-react";
import type { SiteSection } from "./section-editor";

/* ── Template presets ─────────────────────────────────── */

export type SitePreset = {
  label: string;
  sections: SiteSection[];
  subtitle: string;
  hero: string;
  about: string;
  ctaLabel: string;
};

export const SITE_PRESETS: SitePreset[] = [
  {
    label: "Freelancer",
    subtitle: "Freelancer · Designer · Developer",
    hero: "I help businesses build beautiful digital products — websites, apps, and automations.",
    about: "With 5+ years of experience, I combine design thinking with technical execution to deliver results that matter. I work directly with founders and teams who need a reliable creative partner.",
    ctaLabel: "Book a free call",
    sections: [
      { id: "p1", type: "services", heading: "Services", content: "Website Design & Development\nUI/UX Design\nLanding Pages\nNo-Code Automation" },
      { id: "p2", type: "process", heading: "How I Work", content: "1. Discovery — understand your goals\n2. Design — wireframes and visual mockups\n3. Build — development and integration\n4. Launch — testing, deploy, handoff" },
      { id: "p3", type: "pricing", heading: "Pricing", content: "Starter: 1-page landing — from $500\nGrowth: 5-page website — from $1,500\nCustom: full-stack app — let's talk" },
      { id: "p4", type: "testimonials", heading: "Client Feedback", content: "\"Fast, clean, and exactly what I needed.\"\n— Happy Client" },
    ],
  },
  {
    label: "Agency",
    subtitle: "Creative Agency · Brand · Digital",
    hero: "We build brands and digital experiences that grow your business.",
    about: "We're a small, senior team that works like an extension of your company. From brand identity to full-stack development, we deliver end-to-end.",
    ctaLabel: "Start a project",
    sections: [
      { id: "p1", type: "services", heading: "What We Do", content: "Brand Identity & Strategy\nWeb Design & Development\nMarketing Automation\nContent Production" },
      { id: "p2", type: "portfolio", heading: "Selected Work", content: "Project A — E-commerce redesign → 3x conversion\nProject B — SaaS dashboard → 40% faster workflows\nProject C — Brand overhaul → new market entry" },
      { id: "p3", type: "process", heading: "Our Process", content: "1. Brief — align on goals and scope\n2. Strategy — research and positioning\n3. Execution — design, build, test\n4. Growth — measure, iterate, scale" },
      { id: "p4", type: "testimonials", heading: "What Clients Say", content: "\"They think like founders, not vendors.\"\n— CEO, Tech Startup" },
      { id: "p5", type: "contact", heading: "Get in Touch", content: "Email: hello@youragency.com\nPhone: +62 812-xxxx-xxxx\nOffice: Jakarta, Indonesia" },
    ],
  },
  {
    label: "Consultant",
    subtitle: "Strategy Consultant · Advisor",
    hero: "I help companies make better decisions, faster.",
    about: "Former [Company] operator turned independent consultant. I work with founders and leadership teams on strategy, operations, and growth.",
    ctaLabel: "Schedule a session",
    sections: [
      { id: "p1", type: "services", heading: "Advisory Areas", content: "Business Strategy & Positioning\nOperational Efficiency\nGo-to-Market Planning\nTeam Structure & Hiring" },
      { id: "p2", type: "process", heading: "Engagement Model", content: "1. Diagnostic — 1-week deep dive\n2. Strategy — roadmap and priorities\n3. Execution support — weekly check-ins\n4. Review — measure outcomes" },
      { id: "p3", type: "pricing", heading: "Packages", content: "Diagnostic Sprint: $2,000 (1 week)\nMonthly Advisory: $3,500/mo\nCustom Engagement: scope-based" },
      { id: "p4", type: "testimonials", heading: "Results", content: "\"Helped us cut costs 30% in 3 months.\"\n— COO, Series B Startup" },
    ],
  },
  {
    label: "Portfolio",
    subtitle: "Creative Portfolio · Art · Design",
    hero: "Selected works across branding, illustration, and digital design.",
    about: "I'm a visual designer who loves clean lines, bold color, and meaningful storytelling. Based in Surabaya, working globally.",
    ctaLabel: "See my work",
    sections: [
      { id: "p1", type: "portfolio", heading: "Featured Projects", content: "Brand Identity — Coffee Roaster\nPackaging Design — Skincare Line\nEditorial Layout — Travel Magazine\nWebsite — Architecture Studio" },
      { id: "p2", type: "services", heading: "Services", content: "Brand Identity Design\nPrint & Packaging\nEditorial Design\nWeb & Digital Design" },
      { id: "p3", type: "faq", heading: "FAQ", content: "Q: What's your turnaround?\nA: 2–4 weeks depending on scope.\n\nQ: Do you work with international clients?\nA: Yes, all remote via video call.\n\nQ: Can I request revisions?\nA: Up to 3 rounds included." },
    ],
  },
];

/* ── Preset picker ────────────────────────────────────── */

interface PresetPickerProps {
  onSelect: (preset: SitePreset) => void;
}

export function PresetPicker({ onSelect }: PresetPickerProps) {
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <LayoutTemplate className="h-4 w-4 text-muted-foreground" />
        <label className="text-sm font-medium">Template presets</label>
      </div>
      <div className="grid grid-cols-2 gap-2">
        {SITE_PRESETS.map((preset) => (
          <Button
            key={preset.label}
            type="button"
            variant="outline"
            size="sm"
            className="text-xs h-8"
            onClick={() => onSelect(preset)}
          >
            {preset.label}
          </Button>
        ))}
      </div>
      <p className="text-xs text-muted-foreground">Apply a template to pre-fill sections, subtitle, hero text, and about.</p>
    </div>
  );
}

/* ── Preview toggle ───────────────────────────────────── */

type ViewMode = "desktop" | "mobile";

interface PreviewToggleProps {
  mode: ViewMode;
  onChange: (mode: ViewMode) => void;
}

export function PreviewToggle({ mode, onChange }: PreviewToggleProps) {
  return (
    <div className="inline-flex rounded-lg border bg-muted/50 p-0.5">
      <Button
        type="button"
        variant={mode === "desktop" ? "default" : "ghost"}
        size="sm"
        className="h-7 gap-1 text-xs"
        onClick={() => onChange("desktop")}
      >
        <Monitor className="h-3.5 w-3.5" />
        Desktop
      </Button>
      <Button
        type="button"
        variant={mode === "mobile" ? "default" : "ghost"}
        size="sm"
        className="h-7 gap-1 text-xs"
        onClick={() => onChange("mobile")}
      >
        <Smartphone className="h-3.5 w-3.5" />
        Mobile
      </Button>
    </div>
  );
}
