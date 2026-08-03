"use client";

import { Plus, Type, Briefcase, ListOrdered, DollarSign, FolderOpen, MessageSquareQuote, HelpCircle, Mail, Images, Code, Share2, MousePointerClick, Minus, ArrowUpDown, ChevronDown, List, Columns } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { CanvasSection } from "./canvas-section";
import { InlineText } from "./inline-text";
import type { PersonalSiteInput, PersonalSiteSection, ThemeConfig } from "@/lib/personal-site/model";
import { PERSONAL_SITE_SECTION_TYPES } from "@/lib/personal-site/model";

type Props = {
  site: PersonalSiteInput;
  selectedSectionId: string | null;
  onSelectSection: (id: string | null) => void;
  onUpdateSite: (patch: Partial<PersonalSiteInput>) => void;
  onUpdateSection: (sectionId: string, patch: Partial<PersonalSiteSection>) => void;
  onAddSection: (type: PersonalSiteSection["type"]) => void;
  onMoveSection: (id: string, direction: -1 | 1) => void;
  onDuplicateSection: (id: string) => void;
  onDeleteSection: (id: string) => void;
};

const WIDGET_ICONS: Record<string, React.ElementType> = {
  services: Briefcase,
  process: ListOrdered,
  pricing: DollarSign,
  portfolio: FolderOpen,
  testimonials: MessageSquareQuote,
  faq: HelpCircle,
  contact: Mail,
  custom: Type,
  gallery: Images,
  embed: Code,
  social: Share2,
  cta: MousePointerClick,
  divider: Minus,
  spacer: ArrowUpDown,
  collapsible: ChevronDown,
  tableOfContents: List,
  contentBlock: Columns,
};

export function CanvasRenderer({
  site,
  selectedSectionId,
  onSelectSection,
  onUpdateSite,
  onUpdateSection,
  onAddSection,
  onMoveSection,
  onDuplicateSection,
  onDeleteSection,
}: Props) {
  const theme = site.themeConfig;

  return (
    <div
      className="mx-auto max-w-5xl bg-background shadow-sm rounded-xl overflow-hidden"
      style={{
        backgroundColor: theme?.backgroundColor ?? "#ffffff",
        color: theme?.textColor ?? "#111827",
      }}
      onClick={() => onSelectSection(null)}
    >
      {/* Hero section */}
      <div className="relative px-8 pt-16 pb-12 text-center" style={{ backgroundColor: theme?.primaryColor ?? "#6647F0" }}>
        <InlineText
          value={site.title}
          onChange={(v) => onUpdateSite({ title: v })}
          tag="h1"
          className="text-3xl font-bold text-white mb-2"
          placeholder="Judul..."
        />
        <InlineText
          value={site.subtitle}
          onChange={(v) => onUpdateSite({ subtitle: v })}
          tag="p"
          className="text-lg text-white/80 mb-4"
          placeholder="Subtitle..."
        />
        <InlineText
          value={site.hero}
          onChange={(v) => onUpdateSite({ hero: v })}
          tag="p"
          className="text-white/90 max-w-2xl mx-auto"
          placeholder="Deskripsi hero..."
        />
      </div>

      {/* About */}
      {site.about && (
        <div className="px-8 py-8">
          <InlineText
            value={site.about}
            onChange={(v) => onUpdateSite({ about: v })}
            tag="p"
            className="text-muted-foreground leading-relaxed"
            placeholder="Tentang kamu..."
          />
        </div>
      )}

      {/* Sections */}
      <div className="px-8 py-4 space-y-6">
        {site.sections.map((section, index) => (
          <CanvasSection
            key={section.id}
            id={section.id}
            selected={selectedSectionId === section.id}
            onSelect={() => onSelectSection(section.id)}
            onMoveUp={() => onMoveSection(section.id, -1)}
            onMoveDown={() => onMoveSection(section.id, 1)}
            onDuplicate={() => onDuplicateSection(section.id)}
            onDelete={() => onDeleteSection(section.id)}
          >
            <SectionRenderer
              section={section}
              onUpdate={(patch) => onUpdateSection(section.id, patch)}
              theme={theme}
            />
          </CanvasSection>
        ))}

        {/* Add section button */}
        <div className="flex justify-center py-4">
          <Button
            type="button"
            variant="outline"
            onClick={(e) => { e.stopPropagation(); onAddSection("custom"); }}
            className="gap-2"
          >
            <Plus className="h-4 w-4" />
            Tambah Section
          </Button>
        </div>
      </div>

      {/* CTA */}
      {(site.ctaLabel || site.ctaUrl) && (
        <div className="px-8 py-8 text-center">
          <InlineText
            value={site.ctaLabel}
            onChange={(v) => onUpdateSite({ ctaLabel: v })}
            tag="p"
            className="text-lg font-semibold mb-2"
            placeholder="Label tombol..."
          />
        </div>
      )}

      {/* Links */}
      {site.links.length > 0 && (
        <div className="px-8 py-6 flex flex-wrap justify-center gap-3">
          {site.links.map((link) => (
            <span key={link.id} className="text-sm text-muted-foreground underline">
              {link.label}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

function SectionRenderer({ section, onUpdate, theme }: { section: PersonalSiteSection; onUpdate: (patch: Partial<PersonalSiteSection>) => void; theme?: ThemeConfig }) {
  switch (section.type) {
    case "services":
      return (
        <div className="py-6">
          <InlineText value={section.heading} onChange={(v) => onUpdate({ heading: v })} tag="h2" className="text-xl font-semibold mb-4" />
          <div className="grid gap-4 sm:grid-cols-2">
            {section.items.map((item, i) => (
              <div key={item.id} className="rounded-lg border p-4">
                <InlineText value={item.title} onChange={(v) => onUpdate({ items: section.items.map((it, j) => j === i ? { ...it, title: v } : it) })} tag="h3" className="font-medium mb-1" />
                <InlineText value={item.description} onChange={(v) => onUpdate({ items: section.items.map((it, j) => j === i ? { ...it, description: v } : it) })} tag="p" className="text-sm text-muted-foreground" />
              </div>
            ))}
          </div>
        </div>
      );

    case "process":
      return (
        <div className="py-6">
          <InlineText value={section.heading} onChange={(v) => onUpdate({ heading: v })} tag="h2" className="text-xl font-semibold mb-4" />
          <div className="space-y-3">
            {section.steps.map((step, i) => (
              <div key={step.id} className="flex gap-3">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-medium">{i + 1}</span>
                <div>
                  <InlineText value={step.title} onChange={(v) => onUpdate({ steps: section.steps.map((s, j) => j === i ? { ...s, title: v } : s) })} tag="h3" className="font-medium" />
                  <InlineText value={step.description} onChange={(v) => onUpdate({ steps: section.steps.map((s, j) => j === i ? { ...s, description: v } : s) })} tag="p" className="text-sm text-muted-foreground" />
                </div>
              </div>
            ))}
          </div>
        </div>
      );

    case "pricing":
      return (
        <div className="py-6">
          <InlineText value={section.heading} onChange={(v) => onUpdate({ heading: v })} tag="h2" className="text-xl font-semibold mb-4" />
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {section.offers.map((offer, i) => (
              <div key={offer.id} className="rounded-lg border p-4 text-center">
                <InlineText value={offer.name} onChange={(v) => onUpdate({ offers: section.offers.map((o, j) => j === i ? { ...o, name: v } : o) })} tag="h3" className="font-medium mb-1" />
                <InlineText value={offer.price} onChange={(v) => onUpdate({ offers: section.offers.map((o, j) => j === i ? { ...o, price: v } : o) })} tag="p" className="text-lg font-bold text-primary" />
                <InlineText value={offer.description} onChange={(v) => onUpdate({ offers: section.offers.map((o, j) => j === i ? { ...o, description: v } : o) })} tag="p" className="text-sm text-muted-foreground mt-2" />
              </div>
            ))}
          </div>
        </div>
      );

    case "portfolio":
      return (
        <div className="py-6">
          <InlineText value={section.heading} onChange={(v) => onUpdate({ heading: v })} tag="h2" className="text-xl font-semibold mb-4" />
          <div className="grid gap-4 sm:grid-cols-2">
            {section.projects.map((project, i) => (
              <div key={project.id} className="rounded-lg border p-4">
                <InlineText value={project.title} onChange={(v) => onUpdate({ projects: section.projects.map((p, j) => j === i ? { ...p, title: v } : p) })} tag="h3" className="font-medium mb-1" />
                <InlineText value={project.description} onChange={(v) => onUpdate({ projects: section.projects.map((p, j) => j === i ? { ...p, description: v } : p) })} tag="p" className="text-sm text-muted-foreground" />
              </div>
            ))}
          </div>
        </div>
      );

    case "testimonials":
      return (
        <div className="py-6">
          <InlineText value={section.heading} onChange={(v) => onUpdate({ heading: v })} tag="h2" className="text-xl font-semibold mb-4" />
          <div className="space-y-4">
            {section.testimonials.map((t, i) => (
              <div key={t.id} className="rounded-lg border p-4 italic">
                <InlineText value={t.quote} onChange={(v) => onUpdate({ testimonials: section.testimonials.map((tt, j) => j === i ? { ...tt, quote: v } : tt) })} tag="p" className="mb-2" />
                <div className="text-sm text-muted-foreground not-italic">
                  <InlineText value={t.author} onChange={(v) => onUpdate({ testimonials: section.testimonials.map((tt, j) => j === i ? { ...tt, author: v } : tt) })} tag="span" className="font-medium" />
                  {t.role && <span> — <InlineText value={t.role} onChange={(v) => onUpdate({ testimonials: section.testimonials.map((tt, j) => j === i ? { ...tt, role: v } : tt) })} tag="span" /></span>}
                </div>
              </div>
            ))}
          </div>
        </div>
      );

    case "faq":
      return (
        <div className="py-6">
          <InlineText value={section.heading} onChange={(v) => onUpdate({ heading: v })} tag="h2" className="text-xl font-semibold mb-4" />
          <div className="space-y-3">
            {section.items.map((item, i) => (
              <div key={item.id} className="rounded-lg border p-4">
                <InlineText value={item.question} onChange={(v) => onUpdate({ items: section.items.map((it, j) => j === i ? { ...it, question: v } : it) })} tag="h3" className="font-medium mb-1" />
                <InlineText value={item.answer} onChange={(v) => onUpdate({ items: section.items.map((it, j) => j === i ? { ...it, answer: v } : it) })} tag="p" className="text-sm text-muted-foreground" />
              </div>
            ))}
          </div>
        </div>
      );

    case "contact":
      return (
        <div className="py-6">
          <InlineText value={section.heading} onChange={(v) => onUpdate({ heading: v })} tag="h2" className="text-xl font-semibold mb-4" />
          <div className="space-y-2">
            {section.methods.map((method, i) => (
              <div key={method.id} className="flex items-center gap-2">
                <InlineText value={method.label} onChange={(v) => onUpdate({ methods: section.methods.map((m, j) => j === i ? { ...m, label: v } : m) })} tag="span" className="font-medium" />
                <span className="text-muted-foreground">:</span>
                <InlineText value={method.value} onChange={(v) => onUpdate({ methods: section.methods.map((m, j) => j === i ? { ...m, value: v } : m) })} tag="span" className="text-muted-foreground" />
              </div>
            ))}
          </div>
        </div>
      );

    case "custom":
      return (
        <div className="py-6">
          <InlineText value={section.heading} onChange={(v) => onUpdate({ heading: v })} tag="h2" className="text-xl font-semibold mb-4" />
          <InlineText value={section.content} onChange={(v) => onUpdate({ content: v })} tag="p" className="text-muted-foreground whitespace-pre-wrap" />
        </div>
      );

    case "gallery":
      return (
        <div className="py-6">
          <InlineText value={section.heading} onChange={(v) => onUpdate({ heading: v })} tag="h2" className="text-xl font-semibold mb-4" />
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {section.images.map((img) => (
              <div key={img.id} className="aspect-square rounded-lg bg-muted overflow-hidden">
                {img.url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={img.url} alt={img.alt ?? ""} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-muted-foreground text-xs">No image</div>
                )}
              </div>
            ))}
          </div>
        </div>
      );

    case "embed":
      return (
        <div className="py-6">
          <InlineText value={section.heading} onChange={(v) => onUpdate({ heading: v })} tag="h2" className="text-xl font-semibold mb-4" />
          <div className="rounded-lg border overflow-hidden" style={{ height: section.height ?? 400 }}>
            {section.url ? (
              <iframe src={section.url} className="w-full h-full" title={section.heading} />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-muted-foreground text-sm">Masukkan URL embed</div>
            )}
          </div>
        </div>
      );

    case "social":
      return (
        <div className="py-6">
          <InlineText value={section.heading} onChange={(v) => onUpdate({ heading: v })} tag="h2" className="text-xl font-semibold mb-4" />
          <div className="flex flex-wrap gap-2">
            {section.links.map((link) => (
              <span key={link.id} className="rounded-full border px-3 py-1 text-sm">
                {link.platform}
              </span>
            ))}
          </div>
        </div>
      );

    case "cta":
      return (
        <div className="py-8 text-center">
          <InlineText value={section.text} onChange={(v) => onUpdate({ text: v })} tag="p" className="text-lg mb-4" />
          {section.buttonLabel && (
            <span className="inline-flex items-center rounded-lg px-6 py-2.5 text-sm font-medium text-white" style={{ backgroundColor: theme?.primaryColor ?? "#6647F0" }}>
              {section.buttonLabel}
            </span>
          )}
        </div>
      );

    case "divider":
      return <hr className="my-4 border-border" />;

    case "collapsible":
      return (
        <div className="py-6">
          <InlineText value={section.heading} onChange={(v) => onUpdate({ heading: v })} tag="h2" className="text-xl font-semibold mb-4" />
          <div className="space-y-2">
            {section.items.map((item) => (
              <details key={item.id} className="rounded-lg border">
                <summary className="px-4 py-3 cursor-pointer font-medium">{item.title}</summary>
                <div className="px-4 pb-3 text-sm text-muted-foreground">{item.content}</div>
              </details>
            ))}
          </div>
        </div>
      );

    case "spacer":
      return <div style={{ height: section.height ?? 40 }} />;

    case "tableOfContents":
      return (
        <div className="py-4">
          <p className="text-sm font-medium text-muted-foreground mb-2">Daftar Isi</p>
          <div className="space-y-1 text-sm">
            <p className="text-muted-foreground italic">Auto-generated dari section headings</p>
          </div>
        </div>
      );

    case "contentBlock":
      return (
        <div className="py-6">
          <InlineText value={section.heading} onChange={(v) => onUpdate({ heading: v })} tag="h2" className="text-xl font-semibold mb-4" />
          <div className={`grid gap-4 ${section.columns === 2 ? "sm:grid-cols-2" : section.columns === 3 ? "sm:grid-cols-3" : "sm:grid-cols-4"}`}>
            {section.items.map((item, i) => (
              <div key={item.id} className="rounded-lg border p-4">
                <InlineText value={item.content} onChange={(v) => onUpdate({ items: section.items.map((it, j) => j === i ? { ...it, content: v } : it) })} tag="p" className="text-sm" />
              </div>
            ))}
          </div>
        </div>
      );

    default:
      return <div className="py-4 text-muted-foreground text-sm">Unknown section type</div>;
  }
}
