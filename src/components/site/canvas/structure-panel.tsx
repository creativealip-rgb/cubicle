"use client";

import {
  FileText,
  Layers,
  Image,
  Type,
  GripVertical,
  Briefcase,
  ListOrdered,
  Tag,
  FolderGit2,
  Quote,
  HelpCircle,
  Mail,
  Code,
  Share2,
  MousePointerClick,
  Minus,
  MoveVertical,
  ListCollapse,
  BookOpen,
  Columns3,
} from "lucide-react";
import { SortableContext, verticalListSortingStrategy, useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type { PersonalSiteSection } from "@/lib/personal-site/model";

const SECTION_ICONS: Record<string, typeof FileText> = {
  custom: Type,
  services: Briefcase,
  process: ListOrdered,
  pricing: Tag,
  portfolio: FolderGit2,
  testimonials: Quote,
  faq: HelpCircle,
  contact: Mail,
  cta: MousePointerClick,
  gallery: Image,
  embed: Code,
  social: Share2,
  divider: Minus,
  spacer: MoveVertical,
  collapsible: ListCollapse,
  tableOfContents: BookOpen,
  contentBlock: Columns3,
};

function getSectionPreview(section: PersonalSiteSection): string {
  if (section.heading && section.heading !== "Section") return section.heading;
  switch (section.type) {
    case "custom": return section.content?.slice(0, 50) || "Teks";
    case "cta": return section.text || section.buttonLabel || "CTA";
    case "testimonials": return section.testimonials?.[0]?.author || "Testimoni";
    case "faq": return section.items?.[0]?.question || "FAQ";
    case "pricing": return section.offers?.[0]?.name || "Harga";
    case "services": return section.items?.[0]?.title || "Layanan";
    case "portfolio": return section.projects?.[0]?.title || "Portofolio";
    case "gallery": return "Galeri";
    case "contact": return "Kontak";
    case "process": return section.steps?.[0]?.title || "Proses";
    default: return section.type;
  }
}

function StructureRow({ section, selected, onSelect }: {
  section: PersonalSiteSection;
  selected: boolean;
  onSelect: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: section.id,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const Icon = SECTION_ICONS[section.type] ?? FileText;
  const preview = getSectionPreview(section);

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`flex items-center gap-2 rounded-md border px-2 py-1.5 text-xs cursor-pointer transition-colors group ${
        selected ? "border-primary/60 bg-primary/5" : "hover:bg-muted"
      }`}
      onClick={onSelect}
    >
      <button
        type="button"
        {...attributes}
        {...listeners}
        className="cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground shrink-0"
        aria-label="Drag to reorder"
        title="Drag to reorder"
      >
        <GripVertical className="h-3.5 w-3.5" />
      </button>
      <Icon className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
      <span className="truncate flex-1 text-left">{preview}</span>
    </div>
  );
}

type Props = {
  sections: PersonalSiteSection[];
  selectedSectionId: string | null;
  onSelectSection: (id: string) => void;
};

export function StructurePanel({ sections, selectedSectionId, onSelectSection }: Props) {
  if (sections.length === 0) {
    return (
      <div className="p-4 text-center text-xs text-muted-foreground">
        <Layers className="h-5 w-5 mx-auto mb-2 opacity-30" />
        <p>Belum ada section.</p>
        <p>Tambah dari tab Insert.</p>
      </div>
    );
  }

  return (
    <div className="space-y-1 p-2">
      <SortableContext items={sections.map((s) => s.id)} strategy={verticalListSortingStrategy}>
        {sections.map((section) => (
          <StructureRow
            key={section.id}
            section={section}
            selected={selectedSectionId === section.id}
            onSelect={() => {
              onSelectSection(section.id);
              // Scroll to section in canvas
              const el = document.querySelector(`[data-section-id="${section.id}"]`);
              el?.scrollIntoView({ behavior: "smooth", block: "center" });
            }}
          />
        ))}
      </SortableContext>
    </div>
  );
}
