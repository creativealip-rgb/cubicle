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
      hero: "Saya membantu bisnis membangun produk digital yang jelas, cepat, dan siap dipakai.",
      about: "Jelaskan pengalaman, keahlian utama, dan tipe klien yang paling cocok bekerja dengan kamu.",
      ctaLabel: "Diskusikan proyek",
      sections: [
        { id: "freelance-services", type: "services", heading: "Layanan", items: [{ id: "fs-1", title: "Web & Product", description: "Jelaskan hasil, ruang lingkup, dan siapa yang terbantu." }, { id: "fs-2", title: "Automation", description: "Jelaskan proses yang bisa kamu sederhanakan." }] },
        { id: "freelance-process", type: "process", heading: "Cara kerja", steps: [{ id: "fp-1", title: "Discovery", description: "Pahami tujuan dan ruang lingkup." }, { id: "fp-2", title: "Build", description: "Eksekusi dengan checkpoint jelas." }, { id: "fp-3", title: "Launch", description: "Uji, rilis, dan serah terima." }] },
      ],
    },
  },
  {
    label: "Agency",
    values: {
      subtitle: "Creative Studio · Brand · Digital",
      hero: "Kami membangun brand dan pengalaman digital yang membantu bisnis bergerak maju.",
      about: "Jelaskan fokus studio, komposisi tim, dan cara kamu berkolaborasi dengan klien.",
      ctaLabel: "Mulai proyek",
      sections: [
        { id: "agency-services", type: "services", heading: "Yang kami kerjakan", items: [{ id: "as-1", title: "Brand", description: "Positioning, identity, dan brand system." }, { id: "as-2", title: "Digital", description: "Website, product UI, dan automation." }] },
        { id: "agency-portfolio", type: "portfolio", heading: "Pilihan karya", projects: [] },
        { id: "agency-process", type: "process", heading: "Proses", steps: [{ id: "ap-1", title: "Brief", description: "Selaraskan target dan ruang lingkup." }, { id: "ap-2", title: "Strategy", description: "Tentukan arah dan prioritas." }, { id: "ap-3", title: "Execution", description: "Desain, build, dan review." }] },
      ],
    },
  },
  {
    label: "Consultant",
    values: {
      subtitle: "Strategy Consultant · Advisor",
      hero: "Saya membantu tim mengambil keputusan lebih baik dengan arah yang lebih jelas.",
      about: "Jelaskan pengalaman relevan, area advisory, dan bentuk engagement kamu.",
      ctaLabel: "Jadwalkan sesi",
      sections: [
        { id: "consult-services", type: "services", heading: "Area advisory", items: [{ id: "cs-1", title: "Strategy", description: "Positioning, priorities, dan roadmap." }, { id: "cs-2", title: "Operations", description: "Workflow, capacity, dan execution system." }] },
        { id: "consult-process", type: "process", heading: "Engagement", steps: [{ id: "cp-1", title: "Diagnostic", description: "Pahami kondisi dan bottleneck." }, { id: "cp-2", title: "Roadmap", description: "Susun keputusan dan urutan kerja." }, { id: "cp-3", title: "Review", description: "Ukur hasil dan sesuaikan arah." }] },
      ],
    },
  },
  {
    label: "Portfolio",
    values: {
      subtitle: "Creative Portfolio · Selected Work",
      hero: "Pilihan karya yang menunjukkan cara saya berpikir dan menyelesaikan masalah.",
      about: "Jelaskan pendekatan kreatif, medium utama, dan jenis kolaborasi yang kamu cari.",
      ctaLabel: "Hubungi saya",
      sections: [
        { id: "portfolio-work", type: "portfolio", heading: "Karya pilihan", projects: [] },
        { id: "portfolio-services", type: "services", heading: "Keahlian", items: [{ id: "ps-1", title: "Keahlian utama", description: "Jelaskan medium atau layanan utama." }] },
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
