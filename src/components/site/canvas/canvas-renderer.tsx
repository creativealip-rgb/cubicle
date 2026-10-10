"use client";

import { useState } from "react";
import Image from "next/image";
import { Plus, ChevronDown, ChevronUp, GripVertical, Copy, Trash2, Image as ImageIcon, Calendar } from "lucide-react";
import { SortableContext, verticalListSortingStrategy, useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { InlineText } from "./inline-text";
import { FloatingContextToolbar } from "./floating-context-toolbar";
import { ImageUpload } from "./image-upload";
import { useT } from "@/lib/i18n-client";
import { CUBIQLO_FONTS, getFontFamily } from "@/lib/builder-fonts";
import { GoogleSitesGalleryCanvas } from "./google-sites-gallery";
import type { PersonalSiteInput, PersonalSiteSection, ThemeConfig } from "@/lib/personal-site/model";
import { isEditorialPlaceholderText, PERSONAL_SITE_ANIMATIONS } from "@/lib/personal-site/model";

function patchItem<T>(arr: T[], idx: number, patch: any): T[] {
  return arr.map((item, i) => (i === idx ? { ...item, ...patch } : item));
}

function removeItemAt<T>(arr: T[], idx: number): T[] {
  return arr.filter((_, i) => i !== idx);
}

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
      <div data-readiness-target="hero" className={cn("relative px-8 pt-20 pb-16 text-center overflow-hidden", readinessTarget === "hero" && "ring-4 ring-red-400 ring-offset-2")} style={{ backgroundColor: theme?.primaryColor ?? "#2563EB" }}>
        {site.heroImage && (
          <>
            <Image
              src={site.heroImage}
              alt=""
              fill
              sizes="100vw"
              aria-hidden="true"
              className="object-cover opacity-85"
            />
            {/* Gentle Dark Gradient Overlay so text stays 100% legible */}
            <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-black/30 to-black/60 pointer-events-none" />
          </>
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
          <div className="mt-6 flex justify-center">
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
        section={section}
        onUpdate={onUpdate}
        animation={"animation" in section ? section.animation : undefined}
        onAnimationChange={(anim) => onUpdate({ animation: anim } as Partial<PersonalSiteSection>)}
        dragHandleProps={listeners}
      >
        <SectionRenderer section={section} onUpdate={onUpdate} theme={theme} />
      </CanvasSectionWrapper>
    </div>
  );
}

function CanvasSectionWrapper({ id, selected, onSelect, onMoveUp, onMoveDown, onDuplicate, onDelete, animation, onAnimationChange, dragHandleProps, section, onUpdate, children }: {
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
  section?: any;
  onUpdate?: (patch: any) => void;
  children: React.ReactNode;
}) {
  const { t } = useT();
  const [hovered, setHovered] = useState(false);
  const fontFamily = section?.fontFamily ? getFontFamily(section.fontFamily) : undefined;

  return (
    <div
      data-section-id={id}
      onClick={(e) => { e.stopPropagation(); onSelect(); }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={fontFamily ? { fontFamily } : undefined}
      className={cn(
        "relative group transition-[outline] rounded-lg",
        selected ? "outline-2 outline-primary outline-offset-4" : "outline-transparent",
        hovered && !selected && "outline-1 outline-muted-foreground/20 outline-offset-2",
      )}
    >
      {/* Floating Contextual Toolbar atop the selected section */}
      {selected && onUpdate && (
        <FloatingContextToolbar
          active={selected}
          value={{
            fontFamily: section.fontFamily,
            fontSize: section.fontSize,
            align: section.align,
            bold: section.bold,
            italic: section.italic,
            underline: section.underline,
            strikethrough: section.strikethrough,
          }}
          onChange={(patch) => onUpdate(patch)}
          onDuplicate={onDuplicate}
          onDelete={onDelete}
          tagType="heading"
        />
      )}

      {(hovered && !selected) && (
        <div className="absolute -top-3 right-2 z-20 flex items-center gap-0.5 rounded-lg border bg-background px-1 py-0.5 shadow-sm">
          <button type="button" onClick={(e) => { e.stopPropagation(); onMoveUp(); }} className="p-1 hover:bg-muted rounded" aria-label={t("Naikkan", "Move up")}>
            <ChevronUp className="h-3 w-3" />
          </button>
          <button type="button" onClick={(e) => { e.stopPropagation(); onMoveDown(); }} className="p-1 hover:bg-muted rounded" aria-label={t("Turunkan", "Move down")}>
            <ChevronDown className="h-3 w-3" />
          </button>
          <div className="w-px h-3 bg-border mx-0.5" />
          <button type="button" onClick={(e) => { e.stopPropagation(); onDuplicate(); }} className="p-1 hover:bg-muted rounded" aria-label={t("Duplikat", "Duplicate")}>
            <Copy className="h-3 w-3" />
          </button>
          <button type="button" onClick={(e) => { e.stopPropagation(); onDelete(); }} className="p-1 hover:bg-muted rounded text-destructive" aria-label={t("Hapus", "Delete")}>
            <Trash2 className="h-3 w-3" />
          </button>
          <div {...dragHandleProps} className="cursor-grab p-1 hover:bg-muted rounded" aria-label={t("Seret untuk mengurutkan", "Drag to reorder")}>
            <GripVertical className="h-3 w-3" />
          </div>
        </div>
      )}
      {children}
    </div>
  );
}

function getHeadingStyle(section: any, defaultClass: string = "text-xl font-semibold mb-4") {
  const isBold = section.bold;
  const isItalic = section.italic;
  const isUnderline = section.underline;
  const isStrike = section.strikethrough;
  const align = section.align || "left";
  const fontSize = section.fontSize || "base";
  const fontFamily = section.fontFamily ? getFontFamily(section.fontFamily) : undefined;

  const sizeClass =
    fontSize === "sm"
      ? "text-sm"
      : fontSize === "lg"
      ? "text-2xl"
      : fontSize === "xl"
      ? "text-3xl"
      : "text-xl";

  const alignClass =
    align === "center"
      ? "text-center"
      : align === "right"
      ? "text-right"
      : "text-left";

  return {
    className: cn(
      defaultClass,
      sizeClass,
      alignClass,
      isBold && "font-bold",
      isItalic && "italic",
      isUnderline && "underline",
      isStrike && "line-through",
    ),
    style: fontFamily ? { fontFamily } : undefined,
  };
}

function getResolvedItemStyle(section: any, item: any, baseClass: string = "font-medium mb-1") {
  const isBold = item.bold !== undefined ? item.bold : section.bold;
  const isItalic = item.italic !== undefined ? item.italic : section.italic;
  const isUnderline = item.underline !== undefined ? item.underline : section.underline;
  const isStrike = item.strikethrough !== undefined ? item.strikethrough : section.strikethrough;
  const align = item.align || section.align || "left";
  const fontSize = item.fontSize || section.fontSize || "base";

  const sizeClass =
    fontSize === "sm"
      ? "text-xs"
      : fontSize === "lg"
      ? "text-lg"
      : fontSize === "xl"
      ? "text-xl font-bold"
      : "text-sm";

  const alignClass =
    align === "center"
      ? "text-center"
      : align === "right"
      ? "text-right"
      : "text-left";

  return cn(
    baseClass,
    sizeClass,
    alignClass,
    isBold && "font-bold",
    isItalic && "italic",
    isUnderline && "underline",
    isStrike && "line-through",
  );
}

function getResolvedItemDescStyle(section: any, item: any) {
  const isItalic = item.italic !== undefined ? item.italic : section.italic;
  const isUnderline = item.underline !== undefined ? item.underline : section.underline;
  const align = item.align || section.align || "left";
  const fontSize = item.fontSize || section.fontSize || "base";

  const sizeClass =
    fontSize === "sm"
      ? "text-[11px]"
      : fontSize === "lg"
      ? "text-base"
      : fontSize === "xl"
      ? "text-lg"
      : "text-xs";

  const alignClass =
    align === "center"
      ? "text-center"
      : align === "right"
      ? "text-right"
      : "text-left";

  return cn(
    "text-muted-foreground",
    sizeClass,
    alignClass,
    isItalic && "italic",
    isUnderline && "underline",
  );
}

function SectionRenderer({ section, onUpdate, theme }: { section: PersonalSiteSection; onUpdate: (patch: Partial<PersonalSiteSection>) => void; theme?: ThemeConfig }) {
  const { t } = useT();
  const headingStyle = getHeadingStyle(section as any);
  const [activeItemId, setActiveItemId] = useState<string | null>(null);

  switch (section.type) {
    case "services":
      return (
        <div className="py-6">
          <InlineText value={section.heading} onChange={(v) => onUpdate({ heading: v })} tag="h2" className={headingStyle.className} style={headingStyle.style} />
          <div className="grid gap-4 sm:grid-cols-2">
            {section.items.map((item, i) => {
              const isItemActive = activeItemId === item.id;
              return (
                <div
                  key={item.id}
                  onClick={(e) => { e.stopPropagation(); setActiveItemId(item.id); }}
                  className={cn(
                    "relative rounded-lg border bg-card p-4 shadow-sm transition-all group",
                    isItemActive ? "ring-2 ring-primary ring-offset-2" : "hover:border-primary/50"
                  )}
                  style={headingStyle.style?.fontFamily ? { fontFamily: headingStyle.style.fontFamily } : undefined}
                >
                  {isItemActive && (
                    <FloatingContextToolbar
                      active={isItemActive}
                      value={{
                        fontSize: item.fontSize,
                        align: item.align,
                        bold: item.bold,
                        italic: item.italic,
                        underline: item.underline,
                        strikethrough: item.strikethrough,
                      }}
                      onChange={(patch) => onUpdate({ items: patchItem(section.items, i, patch) })}
                      tagType="card"
                      onDelete={() => onUpdate({ items: removeItemAt(section.items, i) })}
                    />
                  )}
                  <InlineText value={item.title} onChange={(v) => onUpdate({ items: section.items.map((it, j) => j === i ? { ...it, title: v } : it) })} tag="h3" className={getResolvedItemStyle(section, item, "font-semibold mb-1")} />
                  <InlineText value={item.description} onChange={(v) => onUpdate({ items: section.items.map((it, j) => j === i ? { ...it, description: v } : it) })} tag="p" className={getResolvedItemDescStyle(section, item)} />
                </div>
              );
            })}
          </div>
        </div>
      );

    case "process":
      return (
        <div className="py-6">
          <InlineText value={section.heading} onChange={(v) => onUpdate({ heading: v })} tag="h2" className={headingStyle.className} style={headingStyle.style} />
          <div className="space-y-3">
            {section.steps.map((step, i) => {
              const isItemActive = activeItemId === step.id;
              return (
                <div
                  key={step.id}
                  onClick={(e) => { e.stopPropagation(); setActiveItemId(step.id); }}
                  className={cn(
                    "relative flex gap-3 p-2 rounded-lg transition-all",
                    isItemActive ? "ring-2 ring-primary ring-offset-2 bg-muted/20" : "hover:bg-muted/10"
                  )}
                  style={headingStyle.style?.fontFamily ? { fontFamily: headingStyle.style.fontFamily } : undefined}
                >
                  {isItemActive && (
                    <FloatingContextToolbar
                      active={isItemActive}
                      value={{
                        fontSize: step.fontSize,
                        align: step.align,
                        bold: step.bold,
                        italic: step.italic,
                        underline: step.underline,
                        strikethrough: step.strikethrough,
                      }}
                      onChange={(patch) => onUpdate({ steps: patchItem(section.steps, i, patch) })}
                      tagType="card"
                      onDelete={() => onUpdate({ steps: removeItemAt(section.steps, i) })}
                    />
                  )}
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-medium">{i + 1}</span>
                  <div className="flex-1">
                    <InlineText value={step.title} onChange={(v) => onUpdate({ steps: section.steps.map((s, j) => j === i ? { ...s, title: v } : s) })} tag="h3" className={getResolvedItemStyle(section, step, "font-semibold mb-1")} />
                    <InlineText value={step.description} onChange={(v) => onUpdate({ steps: section.steps.map((s, j) => j === i ? { ...s, description: v } : s) })} tag="p" className={getResolvedItemDescStyle(section, step)} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      );

    case "pricing":
      return (
        <div className="py-6">
          <InlineText value={section.heading} onChange={(v) => onUpdate({ heading: v })} tag="h2" className={headingStyle.className} style={headingStyle.style} />
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {section.offers.map((offer, i) => {
              const isItemActive = activeItemId === offer.id;
              return (
                <div
                  key={offer.id}
                  onClick={(e) => { e.stopPropagation(); setActiveItemId(offer.id); }}
                  className={cn(
                    "relative rounded-lg border bg-card p-4 shadow-sm text-center transition-all",
                    isItemActive ? "ring-2 ring-primary ring-offset-2" : "hover:border-primary/50"
                  )}
                  style={headingStyle.style?.fontFamily ? { fontFamily: headingStyle.style.fontFamily } : undefined}
                >
                  {isItemActive && (
                    <FloatingContextToolbar
                      active={isItemActive}
                      value={{
                        fontSize: offer.fontSize,
                        align: offer.align,
                        bold: offer.bold,
                        italic: offer.italic,
                        underline: offer.underline,
                        strikethrough: offer.strikethrough,
                      }}
                      onChange={(patch) => onUpdate({ offers: patchItem(section.offers, i, patch) })}
                      tagType="card"
                      onDelete={() => onUpdate({ offers: removeItemAt(section.offers, i) })}
                    />
                  )}
                  <InlineText value={offer.name} onChange={(v) => onUpdate({ offers: section.offers.map((o, j) => j === i ? { ...o, name: v } : o) })} tag="h3" className={getResolvedItemStyle(section, offer, "font-semibold mb-1")} />
                  <InlineText value={offer.price} onChange={(v) => onUpdate({ offers: section.offers.map((o, j) => j === i ? { ...o, price: v } : o) })} tag="p" className="text-lg font-bold text-primary my-1" />
                  <InlineText value={offer.description} onChange={(v) => onUpdate({ offers: section.offers.map((o, j) => j === i ? { ...o, description: v } : o) })} tag="p" className={getResolvedItemDescStyle(section, offer)} />
                </div>
              );
            })}
          </div>
        </div>
      );

    case "portfolio":
      return (
        <div className="py-6">
          <InlineText value={section.heading} onChange={(v) => onUpdate({ heading: v })} tag="h2" className={headingStyle.className} style={headingStyle.style} />
          <div className="grid gap-4 sm:grid-cols-2">
            {section.projects.map((project, i) => {
              const isItemActive = activeItemId === project.id;
              return (
                <div
                  key={project.id}
                  onClick={(e) => { e.stopPropagation(); setActiveItemId(project.id); }}
                  className={cn(
                    "relative rounded-lg border bg-card p-4 shadow-sm transition-all",
                    isItemActive ? "ring-2 ring-primary ring-offset-2" : "hover:border-primary/50"
                  )}
                  style={headingStyle.style?.fontFamily ? { fontFamily: headingStyle.style.fontFamily } : undefined}
                >
                  {isItemActive && (
                    <FloatingContextToolbar
                      active={isItemActive}
                      value={{
                        fontSize: project.fontSize,
                        align: project.align,
                        bold: project.bold,
                        italic: project.italic,
                        underline: project.underline,
                        strikethrough: project.strikethrough,
                      }}
                      onChange={(patch) => onUpdate({ projects: patchItem(section.projects, i, patch) })}
                      tagType="card"
                      onDelete={() => onUpdate({ projects: removeItemAt(section.projects, i) })}
                    />
                  )}
                  <InlineText value={project.title} onChange={(v) => onUpdate({ projects: section.projects.map((p, j) => j === i ? { ...p, title: v } : p) })} tag="h3" className={getResolvedItemStyle(section, project, "font-semibold mb-1")} />
                  <InlineText value={project.description} onChange={(v) => onUpdate({ projects: section.projects.map((p, j) => j === i ? { ...p, description: v } : p) })} tag="p" className={getResolvedItemDescStyle(section, project)} />
                </div>
              );
            })}
          </div>
        </div>
      );

    case "testimonials":
      return (
        <div className="py-6">
          <InlineText value={section.heading} onChange={(v) => onUpdate({ heading: v })} tag="h2" className={headingStyle.className} style={headingStyle.style} />
          <div className="space-y-4">
            {section.testimonials.map((t, i) => {
              const isItemActive = activeItemId === t.id;
              return (
                <div
                  key={t.id}
                  onClick={(e) => { e.stopPropagation(); setActiveItemId(t.id); }}
                  className={cn(
                    "relative rounded-lg border bg-card p-4 shadow-sm italic transition-all",
                    isItemActive ? "ring-2 ring-primary ring-offset-2 not-italic" : "hover:border-primary/50"
                  )}
                  style={headingStyle.style?.fontFamily ? { fontFamily: headingStyle.style.fontFamily } : undefined}
                >
                  {isItemActive && (
                    <FloatingContextToolbar
                      active={isItemActive}
                      value={{
                        fontSize: t.fontSize,
                        align: t.align,
                        bold: t.bold,
                        italic: t.italic,
                        underline: t.underline,
                        strikethrough: t.strikethrough,
                      }}
                      onChange={(patch) => onUpdate({ testimonials: patchItem(section.testimonials, i, patch) })}
                      tagType="card"
                      onDelete={() => onUpdate({ testimonials: removeItemAt(section.testimonials, i) })}
                    />
                  )}
                  <InlineText value={t.quote} onChange={(v) => onUpdate({ testimonials: section.testimonials.map((tt, j) => j === i ? { ...tt, quote: v } : tt) })} tag="p" className={cn(getResolvedItemDescStyle(section, t), "mb-2 not-italic text-foreground")} />
                  <div className="text-sm text-muted-foreground not-italic" style={headingStyle.style?.fontFamily ? { fontFamily: headingStyle.style.fontFamily } : undefined}>
                    <InlineText value={t.author} onChange={(v) => onUpdate({ testimonials: section.testimonials.map((tt, j) => j === i ? { ...tt, author: v } : tt) })} tag="span" className={getResolvedItemStyle(section, t, "font-medium")} />
                    {t.role && <span> — <InlineText value={t.role} onChange={(v) => onUpdate({ testimonials: section.testimonials.map((tt, j) => j === i ? { ...tt, role: v } : tt) })} tag="span" className={getResolvedItemDescStyle(section, t)} /></span>}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      );

    case "faq":
      return (
        <div className="py-6">
          <InlineText value={section.heading} onChange={(v) => onUpdate({ heading: v })} tag="h2" className={headingStyle.className} style={headingStyle.style} />
          <div className="space-y-3">
            {section.items.map((item, i) => {
              const isItemActive = activeItemId === item.id;
              return (
                <div
                  key={item.id}
                  onClick={(e) => { e.stopPropagation(); setActiveItemId(item.id); }}
                  className={cn(
                    "relative rounded-lg border bg-card p-4 shadow-sm transition-all",
                    isItemActive ? "ring-2 ring-primary ring-offset-2" : "hover:border-primary/50"
                  )}
                  style={headingStyle.style?.fontFamily ? { fontFamily: headingStyle.style.fontFamily } : undefined}
                >
                  {isItemActive && (
                    <FloatingContextToolbar
                      active={isItemActive}
                      value={{
                        fontSize: item.fontSize,
                        align: item.align,
                        bold: item.bold,
                        italic: item.italic,
                        underline: item.underline,
                        strikethrough: item.strikethrough,
                      }}
                      onChange={(patch) => onUpdate({ items: patchItem(section.items, i, patch) })}
                      tagType="card"
                      onDelete={() => onUpdate({ items: removeItemAt(section.items, i) })}
                    />
                  )}
                  <InlineText value={item.question} onChange={(v) => onUpdate({ items: section.items.map((it, j) => j === i ? { ...it, question: v } : it) })} tag="h3" className={getResolvedItemStyle(section, item, "font-semibold mb-1")} />
                  <InlineText value={item.answer} onChange={(v) => onUpdate({ items: section.items.map((it, j) => j === i ? { ...it, answer: v } : it) })} tag="p" className={getResolvedItemDescStyle(section, item)} />
                </div>
              );
            })}
          </div>
        </div>
      );

    case "contact":
      return (
        <div className="py-6">
          <InlineText value={section.heading} onChange={(v) => onUpdate({ heading: v })} tag="h2" className={headingStyle.className} style={headingStyle.style} />
          <div className="space-y-2">
            {section.methods.map((method, i) => {
              const isItemActive = activeItemId === method.id;
              return (
                <div
                  key={method.id}
                  onClick={(e) => { e.stopPropagation(); setActiveItemId(method.id); }}
                  className={cn(
                    "relative flex items-center gap-2 p-2 rounded-lg transition-all",
                    isItemActive ? "ring-2 ring-primary ring-offset-2 bg-muted/20" : "hover:bg-muted/10"
                  )}
                  style={headingStyle.style?.fontFamily ? { fontFamily: headingStyle.style.fontFamily } : undefined}
                >
                  {isItemActive && (
                    <FloatingContextToolbar
                      active={isItemActive}
                      value={{
                        fontSize: method.fontSize,
                        align: method.align,
                        bold: method.bold,
                        italic: method.italic,
                        underline: method.underline,
                        strikethrough: method.strikethrough,
                      }}
                      onChange={(patch) => onUpdate({ methods: patchItem(section.methods, i, patch) })}
                      tagType="card"
                      onDelete={() => onUpdate({ methods: removeItemAt(section.methods, i) })}
                    />
                  )}
                  <InlineText value={method.label} onChange={(v) => onUpdate({ methods: section.methods.map((m, j) => j === i ? { ...m, label: v } : m) })} tag="span" className={getResolvedItemStyle(section, method, "font-medium")} />
                  <span className="text-muted-foreground">:</span>
                  <InlineText value={method.value} onChange={(v) => onUpdate({ methods: section.methods.map((m, j) => j === i ? { ...m, value: v } : m) })} tag="span" className={getResolvedItemDescStyle(section, method)} />
                </div>
              );
            })}
          </div>
        </div>
      );

    case "booking":
      return (
        <div className="py-6">
          <div className="max-w-2xl mx-auto rounded-3xl border border-border/80 bg-card p-6 sm:p-8 shadow-sm space-y-4 text-center">
            <div className="flex flex-col items-center justify-center gap-2">
              <span className="h-10 w-10 rounded-full bg-primary/10 text-primary flex items-center justify-center">
                <Calendar className="h-5 w-5" />
              </span>
              <InlineText value={section.heading} onChange={(v) => onUpdate({ heading: v })} tag="h2" className={headingStyle.className} style={headingStyle.style} />
              <InlineText value={section.subtitle || ""} onChange={(v) => onUpdate({ subtitle: v })} tag="p" className="text-xs text-muted-foreground max-w-md" />
            </div>
            <div className="rounded-2xl border border-dashed border-border/80 bg-muted/30 p-6 flex flex-col items-center justify-center gap-2 text-muted-foreground">
              <p className="text-xs font-semibold">{t("Formulir Jadwal Pertemuan Interaktif", "Interactive Appointment Booking Form")}</p>
              <p className="text-[11px] opacity-75">{t("Pengunjung dapat memilih durasi, tanggal, dan slot jam ketersediaan langsung di situs Anda.", "Visitors can select duration, date, and available time slots directly on your site.")}</p>
            </div>
          </div>
        </div>
      );

    case "custom":
      return (
        <div className="py-6">
          <InlineText value={section.heading} onChange={(v) => onUpdate({ heading: v })} tag="h2" className={headingStyle.className} style={headingStyle.style} />
          <InlineText value={section.content} onChange={(v) => onUpdate({ content: v })} tag="p" className="text-muted-foreground whitespace-pre-wrap" />
        </div>
      );

    case "gallery":
      return (
        <GoogleSitesGalleryCanvas
          section={section}
          onUpdate={onUpdate}
        />
      );

    case "image":
      return (
        <div className="py-6">
          {section.heading && (
            <InlineText value={section.heading} onChange={(v) => onUpdate({ heading: v })} tag="h2" className={headingStyle.className} style={headingStyle.style} />
          )}
          <div className={`flex flex-col ${section.align === "left" ? "items-start" : section.align === "right" ? "items-end" : "items-center"}`}>
            <div
              className={`relative overflow-hidden rounded-2xl border border-border/80 bg-muted/20 ${
                section.size === "sm"
                  ? "w-full max-w-sm"
                  : section.size === "md"
                  ? "w-full max-w-xl"
                  : section.size === "lg"
                  ? "w-full max-w-3xl"
                  : "w-full"
              }`}
            >
              {section.url ? (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img
                  src={section.url}
                  alt={section.alt || section.heading || "Image"}
                  className={`w-full object-cover transition-all ${
                    section.aspectRatio === "square"
                      ? "aspect-square"
                      : section.aspectRatio === "video"
                      ? "aspect-video"
                      : section.aspectRatio === "wide"
                      ? "aspect-[21/9]"
                      : section.aspectRatio === "portrait"
                      ? "aspect-[3/4]"
                      : "h-auto max-h-[550px]"
                  }`}
                />
              ) : (
                <div className="py-16 flex flex-col items-center justify-center text-muted-foreground gap-2">
                  <ImageIcon className="h-8 w-8 text-muted-foreground/60" />
                  <p className="text-xs font-medium">{t("Pilih atau unggah gambar di panel kanan", "Select or upload an image in the right panel")}</p>
                </div>
              )}
            </div>
            {section.caption && (
              <InlineText
                value={section.caption}
                onChange={(v) => onUpdate({ caption: v })}
                tag="p"
                className="mt-2 text-center text-xs text-muted-foreground italic max-w-xl"
              />
            )}
          </div>
        </div>
      );

    case "mediaText": {
      const isLeft = (section.mediaPosition || "left") === "left";
      return (
        <div className="py-6">
          <div className={`grid gap-6 md:gap-8 items-center ${isLeft ? "md:grid-cols-12" : "md:grid-cols-12"}`}>
            {/* Image Column */}
            <div
              className={`rounded-2xl overflow-hidden border border-border/80 bg-muted/20 ${
                section.mediaWidth === "30%"
                  ? "md:col-span-4"
                  : section.mediaWidth === "40%"
                  ? "md:col-span-5"
                  : section.mediaWidth === "60%"
                  ? "md:col-span-7"
                  : "md:col-span-6"
              } ${isLeft ? "order-1" : "order-1 md:order-2"}`}
            >
              {section.imageUrl ? (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img
                  src={section.imageUrl}
                  alt={section.imageAlt || section.heading || "Media"}
                  className="w-full h-auto max-h-[420px] object-cover rounded-xl"
                />
              ) : (
                <div className="py-16 flex flex-col items-center justify-center text-muted-foreground gap-2">
                  <ImageIcon className="h-8 w-8 text-muted-foreground/60" />
                  <p className="text-xs font-medium">{t("Unggah media di panel kanan", "Upload media in right panel")}</p>
                </div>
              )}
            </div>

            {/* Text & Content Column */}
            <div
              className={`space-y-3.5 ${
                section.mediaWidth === "30%"
                  ? "md:col-span-8"
                  : section.mediaWidth === "40%"
                  ? "md:col-span-7"
                  : section.mediaWidth === "60%"
                  ? "md:col-span-5"
                  : "md:col-span-6"
              } ${isLeft ? "order-2" : "order-2 md:order-1"}`}
            >
              <InlineText
                value={section.heading}
                onChange={(v) => onUpdate({ heading: v })}
                tag="h2"
                className="text-xl sm:text-2xl font-bold tracking-tight text-foreground"
              />
              <InlineText
                value={section.content ?? ""}
                onChange={(v) => onUpdate({ content: v })}
                tag="p"
                className="text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap"
              />
              {section.buttonLabel && (
                <div className="pt-2">
                  <span
                    className="inline-flex items-center rounded-xl px-5 py-2.5 text-xs font-semibold text-white shadow-xs"
                    style={{ backgroundColor: theme?.primaryColor ?? "#2563EB" }}
                  >
                    {section.buttonLabel}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
      );
    }

    case "embed":
      return (
        <div className="py-6">
          <InlineText value={section.heading} onChange={(v) => onUpdate({ heading: v })} tag="h2" className="text-xl font-semibold mb-4" />
          <div className="rounded-lg border overflow-hidden" style={{ height: section.height ?? 400 }}>
            {section.url ? (
              <iframe src={section.url} className="w-full h-full" title={section.heading} />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-muted-foreground text-sm">{t("Masukkan URL embed", "Enter an embed URL")}</div>
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
            <span className="inline-flex items-center rounded-lg px-6 py-2.5 text-sm font-medium text-white" style={{ backgroundColor: theme?.primaryColor ?? "#2563EB" }}>
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
          <InlineText value={section.heading} onChange={(v) => onUpdate({ heading: v })} tag="h2" className={headingStyle.className} style={headingStyle.style} />
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

    case "cta":
      return (
          <div className="py-6">
            <div className="rounded-2xl border bg-card p-6 sm:p-8 shadow-sm space-y-4 text-center">
              <InlineText value={section.heading} onChange={(v) => onUpdate({ heading: v })} tag="h2" className={headingStyle.className} style={headingStyle.style} />
              <InlineText value={section.text} onChange={(v) => onUpdate({ text: v })} tag="p" className="text-muted-foreground text-sm max-w-xl mx-auto" />
              <div className="pt-2">
                <Button size="lg" className="rounded-xl px-6 font-semibold">
                  <InlineText value={section.buttonLabel || "Click Here"} onChange={(v) => onUpdate({ buttonLabel: v })} tag="span" />
                </Button>
              </div>
            </div>
          </div>
        );

      case "contentBlock":
        return (
          <div className="py-6">
            <InlineText value={section.heading} onChange={(v) => onUpdate({ heading: v })} tag="h2" className={headingStyle.className} style={headingStyle.style} />
            <div className="grid gap-4 sm:grid-cols-2">
              {section.items.map((item, i) => (
                <div key={item.id} className="rounded-lg border bg-card p-4 shadow-sm">
                  <InlineText value={item.content} onChange={(v) => onUpdate({ items: section.items.map((it, j) => j === i ? { ...it, content: v } : it) })} tag="p" className="text-sm leading-relaxed" />
                </div>
              ))}
            </div>
          </div>
        );

    default:
      return <div className="py-4 text-muted-foreground text-sm">Unknown section type</div>;
  }
}
