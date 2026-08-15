"use client";

import { useState } from "react";
import Image from "next/image";
import { Plus, ChevronDown, ChevronUp, GripVertical, Copy, Trash2 } from "lucide-react";
import { SortableContext, verticalListSortingStrategy, useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { InlineText } from "./inline-text";
import { ImageUpload } from "./image-upload";
import { useT } from "@/lib/i18n-client";
import type { PersonalSiteInput, PersonalSiteSection, ThemeConfig } from "@/lib/personal-site/model";
import { isEditorialPlaceholderText, PERSONAL_SITE_ANIMATIONS } from "@/lib/personal-site/model";

// --- Device preview (Phase 5) ---------------------------------------------
// Preview-only viewport widths for the editor canvas. This state never touches
// the site model, so switching devices cannot dirty the document or lose edits.
export type CanvasDevice = "desktop" | "tablet" | "mobile";

export const CANVAS_DEVICES: CanvasDevice[] = ["desktop", "tablet", "mobile"];

/** Map a preview device to the canvas max-width class. Pure helper — exported for tests. */
export function getCanvasMaxWidthClass(device: CanvasDevice): string {
  switch (device) {
    case "tablet": return "max-w-3xl";
    case "mobile": return "max-w-[390px]";
    case "desktop": return "max-w-5xl";
    default: return "max-w-5xl";
  }
}

type Props = {
  site: PersonalSiteInput;
  selectedSectionId: string | null;
  /** Preview-only viewport width; defaults to desktop. Never persisted. */
  device?: CanvasDevice;
  onSelectSection: (id: string | null) => void;
  onUpdateSite: (patch: Partial<PersonalSiteInput>) => void;
  onUpdateSection: (sectionId: string, patch: Partial<PersonalSiteSection>) => void;
  onAddSection: (type: PersonalSiteSection["type"]) => void;
  onMoveSection: (id: string, direction: -1 | 1) => void;
  onDuplicateSection: (id: string) => void;
  onDeleteSection: (id: string) => void;
  readinessTarget?: string | null;
};

export function CanvasRenderer({
  site,
  selectedSectionId,
  device = "desktop",
  onSelectSection,
  onUpdateSite,
  onUpdateSection,
  onAddSection,
  onMoveSection,
  onDuplicateSection,
  onDeleteSection,
  readinessTarget,
  onReorderSections: _onReorderSections,
}: Props & { onReorderSections?: (sections: PersonalSiteSection[]) => void }) { // reserved for future use
  const { t } = useT();
  const theme = site.themeConfig ?? undefined;
  const heroCopy = isEditorialPlaceholderText(site.hero) ? "" : site.hero;
  const aboutCopy = isEditorialPlaceholderText(site.about) ? "" : site.about;

  return (
    <div
      data-preview-device={device}
      className={cn("mx-auto w-full min-w-0 bg-background shadow-sm rounded-xl overflow-hidden", getCanvasMaxWidthClass(device))}
      style={{
        backgroundColor: theme?.backgroundColor ?? "#ffffff",
        color: theme?.textColor ?? "#111827",
        ...(theme?.fontBody ? { fontFamily: theme.fontBody } : {}),
      }}
      onClick={() => onSelectSection(null)}
    >
      {/* Hero section */}
      <div data-readiness-target="hero" className={cn("relative px-8 pt-16 pb-12 text-center", readinessTarget === "hero" && "ring-4 ring-red-400 ring-offset-2")} style={{ backgroundColor: theme?.primaryColor ?? "#6647F0" }}>
        {site.heroImage && (
          <Image
            src={site.heroImage}
            alt=""
            fill
            sizes="100vw"
            aria-hidden="true"
            className="object-cover opacity-20"
          />
        )}
        <div className="relative z-10">
          <InlineText
            value={site.title}
            onChange={(v) => onUpdateSite({ title: v })}
            tag="h1"
            className="text-3xl font-bold text-white mb-2"
            placeholder={t("Judul...", "Title...")}
          />
          <InlineText
            value={site.subtitle}
            onChange={(v) => onUpdateSite({ subtitle: v })}
            tag="p"
            className="text-lg text-white/80 mb-4"
            placeholder="Subtitle..."
          />
          <InlineText
            value={heroCopy}
            onChange={(v) => onUpdateSite({ hero: v })}
            tag="p"
            className="text-white/90 max-w-2xl mx-auto"
            placeholder={t("Deskripsi hero...", "Hero description...")}
          />
          <div className="mt-4 flex justify-center">
            <ImageUpload
              value={site.heroImage ?? ""}
              onChange={(url) => onUpdateSite({ heroImage: url || undefined })}
              label={t("Unggah gambar hero", "Upload hero image")}
            />
          </div>
        </div>
      </div>

      {/* About */}
      {aboutCopy && (
        <div className="px-8 py-8">
          <InlineText
            value={aboutCopy}
            onChange={(v) => onUpdateSite({ about: v })}
            tag="p"
            className="text-muted-foreground leading-relaxed"
            placeholder={t("Tentang kamu...", "About you...")}
          />
        </div>
      )}

      {/* Sections */}
      <div className="px-8 py-4 space-y-6">
        <SortableContext items={site.sections.map((s) => s.id)} strategy={verticalListSortingStrategy}>
          {site.sections.map((section) => (
            <SortableCanvasSection
              key={section.id}
              section={section}
              selected={selectedSectionId === section.id}
              onSelect={() => onSelectSection(section.id)}
              onMoveUp={() => onMoveSection(section.id, -1)}
              onMoveDown={() => onMoveSection(section.id, 1)}
              onDuplicate={() => onDuplicateSection(section.id)}
              onDelete={() => onDeleteSection(section.id)}
              onUpdate={(patch) => onUpdateSection(section.id, patch)}
              theme={theme}
            />
          ))}
        </SortableContext>

        {/* Add section button */}
        <div className="flex justify-center py-4">
          <Button
            type="button"
            variant="outline"
            onClick={(e) => { e.stopPropagation(); onAddSection("custom"); }}
            className="gap-2"
          >
            <Plus className="h-4 w-4" />
            {t("Tambah Bagian", "Add Section")}
          </Button>
        </div>
      </div>

      {/* CTA */}
      {(site.ctaLabel || site.ctaUrl) && (
        <div data-readiness-target="cta" className={cn("px-8 py-8 text-center", readinessTarget === "cta" && "ring-4 ring-red-400 ring-offset-2")}>
          <InlineText
            value={site.ctaLabel}
            onChange={(v) => onUpdateSite({ ctaLabel: v })}
            tag="p"
            className="text-lg font-semibold mb-2"
            placeholder={t("Label tombol...", "Button label...")}
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

function SortableCanvasSection({ section, selected, onSelect, onMoveUp, onMoveDown, onDuplicate, onDelete, onUpdate, theme }: {
  section: PersonalSiteSection;
  selected: boolean;
  onSelect: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
  onUpdate: (patch: Partial<PersonalSiteSection>) => void;
  theme?: ThemeConfig;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: section.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes} data-section-id={section.id}>
      <CanvasSectionWrapper
        id={section.id}
        selected={selected}
        onSelect={onSelect}
        onMoveUp={onMoveUp}
        onMoveDown={onMoveDown}
        onDuplicate={onDuplicate}
        onDelete={onDelete}
        animation={"animation" in section ? section.animation : undefined}
        onAnimationChange={(anim) => onUpdate({ animation: anim } as Partial<PersonalSiteSection>)}
        dragHandleProps={listeners}
      >
        <SectionRenderer section={section} onUpdate={onUpdate} theme={theme} />
      </CanvasSectionWrapper>
    </div>
  );
}

function CanvasSectionWrapper({ id, selected, onSelect, onMoveUp, onMoveDown, onDuplicate, onDelete, animation, onAnimationChange, dragHandleProps, children }: {
  id: string;
  selected: boolean;
  onSelect: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
  animation?: string;
  onAnimationChange?: (animation: string) => void;
  dragHandleProps?: Record<string, unknown>;
  children: React.ReactNode;
}) {
  const [hovered, setHovered] = useState(false);

  return (
    <div
      data-section-id={id}
      onClick={(e) => { e.stopPropagation(); onSelect(); }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className={cn(
        "relative group transition-[outline] rounded-lg",
        selected ? "outline-2 outline-primary outline-offset-2" : "outline-transparent",
        hovered && !selected && "outline-1 outline-muted-foreground/20 outline-offset-2",
      )}
    >
      {(hovered || selected) && (
        <div className="absolute -top-3 right-2 z-20 flex items-center gap-0.5 rounded-lg border bg-background px-1 py-0.5 shadow-sm">
          <button type="button" onClick={(e) => { e.stopPropagation(); onMoveUp(); }} className="p-1 hover:bg-muted rounded" aria-label="Move up">
            <ChevronUp className="h-3 w-3" />
          </button>
          <button type="button" onClick={(e) => { e.stopPropagation(); onMoveDown(); }} className="p-1 hover:bg-muted rounded" aria-label="Move down">
            <ChevronDown className="h-3 w-3" />
          </button>
          <div className="w-px h-3 bg-border mx-0.5" />
          {onAnimationChange && (
            <select
              value={animation || "none"}
              onChange={(e) => { e.stopPropagation(); onAnimationChange(e.target.value); }}
              onClick={(e) => e.stopPropagation()}
              className="h-6 text-[10px] bg-transparent border-none cursor-pointer hover:bg-muted rounded px-0.5"
              title="Animation"
            >
              {PERSONAL_SITE_ANIMATIONS.map((a) => (
                <option key={a} value={a}>{a === "none" ? "✦ None" : `✦ ${a}`}</option>
              ))}
            </select>
          )}
          <div className="w-px h-3 bg-border mx-0.5" />
          <button type="button" onClick={(e) => { e.stopPropagation(); onDuplicate(); }} className="p-1 hover:bg-muted rounded" aria-label="Duplicate">
            <Copy className="h-3 w-3" />
          </button>
          <button type="button" onClick={(e) => { e.stopPropagation(); onDelete(); }} className="p-1 hover:bg-muted rounded text-destructive" aria-label="Delete">
            <Trash2 className="h-3 w-3" />
          </button>
          <div {...dragHandleProps} className="cursor-grab p-1 hover:bg-muted rounded" aria-label="Drag to reorder">
            <GripVertical className="h-3 w-3" />
          </div>
        </div>
      )}
      {children}
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
              <div key={item.id} className="rounded-lg border bg-card p-4 shadow-sm">
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
              <div key={offer.id} className="rounded-lg border bg-card p-4 shadow-sm text-center">
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
              <div key={project.id} className="rounded-lg border bg-card p-4 shadow-sm">
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
              <div key={t.id} className="rounded-lg border bg-card p-4 shadow-sm italic">
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
              <div key={item.id} className="rounded-lg border bg-card p-4 shadow-sm">
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
            {section.images.map((img, i) => (
              <div key={img.id} className="space-y-1">
                <div className="relative aspect-square rounded-lg bg-muted overflow-hidden">
                  {img.url ? (
                    <Image
                      src={img.url}
                      alt={img.alt ?? ""}
                      fill
                      sizes="(max-width: 640px) 100vw, 33vw"
                      className="object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-muted-foreground text-xs">No image</div>
                  )}
                </div>
                <ImageUpload
                  value={img.url}
                  onChange={(url) => onUpdate({ images: section.images.map((im, j) => j === i ? { ...im, url } : im) })}
                  label="Upload"
                />
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
              <details key={item.id} className="rounded-lg border bg-card shadow-sm">
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
              <div key={item.id} className="rounded-lg border bg-card p-4 shadow-sm">
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
