"use client";

import { useMemo, useState, useEffect, useTransition, useRef, useCallback } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { useAppTransition } from "@/lib/transition-provider";
import { Button } from "@/components/ui/button";
import { UnifiedPublishView } from "@/components/public/unified-publish-view";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  Bold,
  Italic,
  Underline,
  Strikethrough,
  RotateCcw,
  Type,
  AlignLeft,
  Mail,
  Link as LinkIcon,
  Hash,
  Calendar,
  Clock,
  ListFilter,
  CheckSquare,
  Phone,
  Paperclip,
  PenTool,
  Star,
  Heading,
  Minus,
  Info,
  ShieldCheck,
  SplitSquareVertical,
  Plus,
  Trash2,
  Copy,
  GripVertical,
  Settings,
  Save,
  Loader2,
  ArrowLeft,
  Share2,
  Sliders,
  FileCheck,
  Palette,
  X,
  Code,
  Check,
  Globe,
  Smartphone,
  Monitor,
  Tablet,
  Image as ImageIcon,
  Columns,
  Square,
  QrCode,
  MessageCircle,
  Sparkles,
  LayoutTemplate,
  Lock,
  Calculator,
  Coins,
  DollarSign,
  Eye,
  Languages,
  MoreHorizontal,
  Upload,
  Play,
  Search,
  Undo2,
  Redo2,
} from "lucide-react";
import { toast } from "sonner";
import { createQuestionnaire, updateQuestionnaire } from "@/lib/actions/questionnaires";
import { translateQuestionnaireFields } from "@/lib/actions/questionnaire-translation";
import { getCurrentUserPlanForPortal } from "@/lib/actions/clients";
import { useT } from "@/lib/i18n-client";
import Link from "next/link";
import { useHistoryState } from "@/lib/use-history-state";
import { useUnsavedChanges } from "@/lib/use-unsaved-changes";
import type { QuestionnaireField, QuestionnaireFieldType } from "@/lib/questionnaire-schema";
import { CUBIQLO_FONTS, getFontFamily } from "@/lib/builder-fonts";
import { FloatingContextToolbar } from "@/components/site/canvas/floating-context-toolbar";
import { PublicDocumentHeader } from "@/components/public/public-document-header";
import { IntakeForm } from "@/components/questionnaires/intake-form";
import { BuilderShell } from "@/components/builder/builder-shell";

void BuilderShell;

function makeId() {
  return `f_${Math.random().toString(36).slice(2, 10)}`;
}

interface ElementDefinition {
  type: QuestionnaireFieldType;
  label: string;
  description: string;
  icon: React.ElementType;
  category: "basic" | "choice" | "advanced" | "structure";
  defaultConfig: Partial<QuestionnaireField>;
}

const ELEMENT_CATALOG: ElementDefinition[] = [
  // Basic
  {
    type: "text",
    label: "Short Text",
    description: "Single-line text input",
    icon: Type,
    category: "basic",
    defaultConfig: { placeholder: "Short answer...", colSpan: "full" },
  },
  {
    type: "textarea",
    label: "Long Text / Paragraph",
    description: "Detailed multiline text response",
    icon: AlignLeft,
    category: "basic",
    defaultConfig: { placeholder: "Write your complete answer here...", colSpan: "full" },
  },
  {
    type: "email",
    label: "Email Address",
    description: "Valid client email format",
    icon: Mail,
    category: "basic",
    defaultConfig: { placeholder: "contact@company.com", colSpan: "half" },
  },
  {
    type: "phone",
    label: "Phone / WhatsApp",
    description: "Phone or WhatsApp contact number",
    icon: Phone,
    category: "basic",
    defaultConfig: { placeholder: "+1 555-0199", colSpan: "half" },
  },
  {
    type: "date",
    label: "Date Picker",
    description: "Target deadline or kickoff date",
    icon: Calendar,
    category: "basic",
    defaultConfig: { colSpan: "half" },
  },
  {
    type: "time",
    label: "Time Picker",
    description: "Meeting time or availability",
    icon: Clock,
    category: "basic",
    defaultConfig: { colSpan: "half" },
  },
  {
    type: "url",
    label: "Website / URL",
    description: "Reference link or website address",
    icon: LinkIcon,
    category: "basic",
    defaultConfig: { placeholder: "https://example.com", colSpan: "full" },
  },

  // Choice
  {
    type: "select",
    label: "Single Select (Dropdown)",
    description: "Choose one option from dropdown",
    icon: ListFilter,
    category: "choice",
    defaultConfig: { options: ["Option 1", "Option 2", "Option 3"], colSpan: "full" },
  },
  {
    type: "multiselect",
    label: "Multiple Choice (Checkboxes)",
    description: "Select one or more choices",
    icon: CheckSquare,
    category: "choice",
    defaultConfig: { options: ["Option 1", "Option 2", "Option 3", "Option 4"], colSpan: "full" },
  },

  // Advanced / Interactive
  {
    type: "file",
    label: "File Upload",
    description: "Document, brief, or asset attachment",
    icon: Paperclip,
    category: "advanced",
    defaultConfig: { acceptFiles: ".pdf,.doc,.docx,.png,.jpg,.zip", placeholder: "Upload file (PDF, PNG, ZIP)", colSpan: "full" },
  },
  {
    type: "signature",
    label: "E-Signature",
    description: "Digital legal signature pad",
    icon: PenTool,
    category: "advanced",
    defaultConfig: { placeholder: "Sign here", colSpan: "full" },
  },
  {
    type: "rating",
    label: "Rating Scale (1-5 / 1-10)",
    description: "Satisfaction or NPS rating score",
    icon: Star,
    category: "advanced",
    defaultConfig: { maxRating: 5, colSpan: "full" },
  },
  {
    type: "image_choice",
    label: "Image Choice",
    description: "Visual selection with image cards",
    icon: ImageIcon,
    category: "advanced",
    defaultConfig: {
      label: "Select Design Style / Reference",
      imageOptions: [
        { label: "Modern & Clean", imageUrl: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=400&q=80" },
        { label: "Bold & Vibrant", imageUrl: "https://images.unsplash.com/photo-1550684848-fac1c5b4e853?w=400&q=80" },
        { label: "Minimalist Dark", imageUrl: "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=400&q=80" },
      ],
      colSpan: "full",
    },
  },
  {
    type: "matrix",
    label: "Matrix / Likert Scale",
    description: "Multi-row evaluation grid table",
    icon: Columns,
    category: "advanced",
    defaultConfig: {
      label: "Service Evaluation",
      sublabel: "Please rate each aspect below.",
      matrixRows: ["Response Speed", "Deliverable Quality", "Communication"],
      matrixCols: ["Poor", "Fair", "Good", "Excellent"],
      colSpan: "full",
    },
  },
  {
    type: "terms",
    label: "Terms & Consent",
    description: "Agreement and terms checkbox",
    icon: ShieldCheck,
    category: "advanced",
    defaultConfig: {
      label: "I agree to the project terms and privacy conditions",
      content: "By submitting this form, you acknowledge and agree to our standard service terms.",
      required: true,
      colSpan: "full",
    },
  },

  // Structural & Multi-Page
  {
    type: "page_break",
    label: "Page Break (Multi-Step)",
    description: "Pisahkan formulir menjadi beberapa halaman berurutan (wizard)",
    icon: SplitSquareVertical,
    category: "structure",
    defaultConfig: {
      label: "Next Step",
      colSpan: "full",
    },
  },
  {
    type: "heading",
    label: "Section Heading",
    description: "Section title and description separator",
    icon: Heading,
    category: "structure",
    defaultConfig: { label: "New Section", sublabel: "Additional instructions or guidelines for this section.", colSpan: "full" },
  },
  {
    type: "info",
    label: "Information / Note Box",
    description: "Important notice or guide banner",
    icon: Info,
    category: "structure",
    defaultConfig: {
      label: "Important Instructions",
      content: "Please fill in all details accurately to help us process your brief quickly.",
      colSpan: "full",
    },
  },
  {
    type: "divider",
    label: "Divider Line",
    description: "Horizontal visual divider line",
    icon: Minus,
    category: "structure",
    defaultConfig: { label: "Divider", colSpan: "full" },
  },
];

const FORM_TEMPLATES = [
  {
    id: "web-dev",
    title: "Web Development Client Intake",
    description: "Multi-step brief for website, landing page, or web app projects.",
    fields: [
      { id: makeId(), type: "text" as const, label: "Full Name / Company Name", required: true, placeholder: "Acme Corp", colSpan: "full" as const },
      { id: makeId(), type: "email" as const, label: "Business Email", required: true, placeholder: "contact@company.com", colSpan: "half" as const },
      { id: makeId(), type: "phone" as const, label: "WhatsApp / Phone Number", required: true, placeholder: "+1 555-0199", colSpan: "half" as const },
      { id: makeId(), type: "page_break" as const, label: "Project Scope & Features", required: false, colSpan: "full" as const },
      { id: makeId(), type: "select" as const, label: "Required Website Type", options: ["Company Profile / Landing Page", "E-Commerce / Online Store", "Custom Web Application", "Website Redesign"], required: true, colSpan: "full" as const },
      { id: makeId(), type: "textarea" as const, label: "Project Goals & Key Features", required: true, placeholder: "The website aims to increase conversions and strengthen brand presence...", colSpan: "full" as const },
      { id: makeId(), type: "url" as const, label: "Reference / Competitor Websites", required: false, placeholder: "https://apple.com, https://stripe.com", colSpan: "full" as const },
      { id: makeId(), type: "page_break" as const, label: "Assets & Timeline", required: false, colSpan: "full" as const },
      { id: makeId(), type: "file" as const, label: "Upload Brand Assets & Documents", acceptFiles: ".pdf,.doc,.docx,.png,.jpg,.zip", required: false, colSpan: "full" as const },
      { id: makeId(), type: "date" as const, label: "Target Launch Date", required: false, colSpan: "half" as const },
      { id: makeId(), type: "time" as const, label: "Preferred Contact Time", required: false, colSpan: "half" as const },
      { id: makeId(), type: "terms" as const, label: "I agree that this brief will be used to prepare a project proposal", required: true, colSpan: "full" as const },
    ],
  },
  {
    id: "branding-design",
    title: "Branding & Logo Design Brief",
    description: "Gather visual preferences, brand values, and design requirements.",
    fields: [
      { id: makeId(), type: "text" as const, label: "Brand Name", required: true, placeholder: "Cubiqlo Studio", colSpan: "half" as const },
      { id: makeId(), type: "text" as const, label: "Tagline or Slogan", required: false, placeholder: "Crafting modern experiences", colSpan: "half" as const },
      { id: makeId(), type: "textarea" as const, label: "Tell Us About Your Brand & Target Audience", required: true, placeholder: "Our audience consists of modern professionals aged 20-35...", colSpan: "full" as const },
      { id: makeId(), type: "multiselect" as const, label: "Desired Visual Vibe / Style", options: ["Modern & Minimalist", "Bold & Energetic", "Luxury & Elegant", "Friendly & Approachable", "Tech / Futuristic"], required: true, colSpan: "full" as const },
      { id: makeId(), type: "textarea" as const, label: "Preferred or Avoided Colors", required: false, placeholder: "Prefer navy blue and purple, avoid neon yellow.", colSpan: "full" as const },
      { id: makeId(), type: "file" as const, label: "Upload Moodboard / Design References", acceptFiles: ".pdf,.png,.jpg,.zip", required: false, colSpan: "full" as const },
    ],
  },
  {
    id: "feedback-survey",
    title: "Client Feedback & Satisfaction Survey",
    description: "Post-project satisfaction survey for client review and service improvement.",
    fields: [
      { id: makeId(), type: "text" as const, label: "Client / Company Name", required: true, placeholder: "John Doe", colSpan: "full" as const },
      { id: makeId(), type: "rating" as const, label: "Overall Satisfaction with the Final Deliverable", required: true, maxRating: 5, colSpan: "half" as const },
      { id: makeId(), type: "rating" as const, label: "Team Communication & Response Speed", required: true, maxRating: 5, colSpan: "half" as const },
      { id: makeId(), type: "textarea" as const, label: "What Did You Enjoy Most About Working With Us?", required: false, placeholder: "The quality of work and quick turnarounds...", colSpan: "full" as const },
      { id: makeId(), type: "textarea" as const, label: "Suggestions or Areas for Improvement", required: false, placeholder: "More frequent milestone check-ins...", colSpan: "full" as const },
      { id: makeId(), type: "signature" as const, label: "Sign-Off & Handover Confirmation", required: false, colSpan: "full" as const },
    ],
  },
];

const THEME_PRESETS = [
  { id: "purple", name: "Modern Purple", bgBtn: "bg-[#6C5CE7] hover:bg-[#5b4cc4]", hex: "#6C5CE7" },
  { id: "blue", name: "Ocean Blue", bgBtn: "bg-blue-600 hover:bg-blue-700", hex: "#2563EB" },
  { id: "emerald", name: "Emerald Green", bgBtn: "bg-emerald-600 hover:bg-emerald-700", hex: "#059669" },
  { id: "dark", name: "Minimal Dark", bgBtn: "bg-zinc-900 hover:bg-black", hex: "#18181B" },
];

// ─── Sortable Field Item Component ───
function SortableCanvasField({
  field,
  isSelected,
  onSelect,
  onDuplicate,
  onDelete,
  onOpenProperties,
  onUpdateLabel,
  onUpdateField,
  cardRadius = "rounded",
  themeHex = "#2563EB",
}: {
  field: QuestionnaireField;
  isSelected: boolean;
  onSelect: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
  onOpenProperties: () => void;
  onUpdateLabel: (val: string) => void;
  onUpdateField?: (patch: Partial<QuestionnaireField>) => void;
  cardRadius?: "normal" | "rounded" | "soft";
  themeHex?: string;
}) {
  const { t } = useT();
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: field.id });

  const isHalf = field.colSpan === "half";
  const fieldFontFamily = field.fontFamily ? getFontFamily(field.fontFamily) : undefined;
  const fieldAlignClass = field.align === "center" ? "text-center" : field.align === "right" ? "text-right" : "text-left";
  const fieldSizeClass = field.fontSize === "sm" ? "text-xs" : field.fontSize === "lg" ? "text-base" : field.fontSize === "xl" ? "text-lg" : "text-sm";
  const textStyles = `${field.bold ? "font-bold" : "font-medium"} ${field.italic ? "italic" : ""} ${field.underline || field.linkUrl ? "underline" : ""} ${field.strikethrough ? "line-through" : ""}`;

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.35 : 1,
    fontFamily: fieldFontFamily,
    color: field.color || undefined,
  };

  const isPageBreak = field.type === "page_break";
  const isHeading = field.type === "heading";
  const isDivider = field.type === "divider";
  const isLogo = field.type === "logo";
  const isInfo = field.type === "info";
  const isTerms = field.type === "terms";

  const cardRadiusClass =
    cardRadius === "normal"
      ? "rounded-md"
      : cardRadius === "soft"
      ? "rounded-2xl"
      : "rounded-xl";

  return (
    <div
      ref={setNodeRef}
      style={style}
      onClick={onSelect}
      className={`group relative ${cardRadiusClass} border p-4 sm:p-5 transition-all cursor-pointer ${
        isPageBreak ? "col-span-12 border-dashed border-primary/60 bg-primary/[0.03]" : isHalf ? "col-span-12 md:col-span-6" : "col-span-12"
      } ${
        isSelected
          ? "border-primary bg-primary/[0.02] ring-2 ring-primary/20 shadow-xs z-20"
          : "border-border/70 bg-card hover:border-primary/40 hover:shadow-xs z-0"
      }`}
    >
      {/* Floating Contextual Toolbar on Active Field Selection */}
      {isSelected && (
        <FloatingContextToolbar
          active={isSelected}
          value={{
            fontFamily: field.fontFamily,
            fontSize: field.fontSize,
            align: field.align,
            bold: field.bold,
            italic: field.italic,
            underline: field.underline,
            strikethrough: field.strikethrough,
            color: field.color,
            listType: field.listType,
            linkUrl: field.linkUrl,
          }}
          onChange={(patch) => onUpdateField && onUpdateField(patch)}
          onDuplicate={onDuplicate}
          onDelete={onDelete}
          onInsertEmoji={(emoji) => {
            onUpdateLabel((field.label || "") + emoji);
          }}
          tagType={isHeading ? "heading" : isInfo || isTerms ? "body" : "card"}
          className="-top-14 left-4"
        />
      )}

      {/* Top action toolbar (Hidden when FloatingContextToolbar is active to avoid duplicate controls) */}
      {!isSelected && (
        <div
          className="absolute -top-3.5 right-4 flex items-center gap-1 bg-background border border-border shadow-xs rounded-lg px-1.5 py-0.5 z-10 transition-opacity opacity-0 group-hover:opacity-100"
        >
          <button
            type="button"
            {...attributes}
            {...listeners}
            className="p-1 text-muted-foreground hover:text-foreground cursor-grab active:cursor-grabbing rounded"
            title={t("Drag untuk geser posisi", "Drag to reorder")}
          >
            <GripVertical className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onDuplicate();
            }}
            className="p-1 text-muted-foreground hover:text-primary rounded"
            title={t("Duplikasi", "Duplicate")}
          >
            <Copy className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onDelete();
            }}
            className="p-1 text-muted-foreground hover:text-destructive rounded"
            title={t("Hapus", "Delete")}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      {/* Field Layout Indicator Badge */}
      {isHalf && (
        <span className="absolute top-2 right-2 text-[9px] font-mono px-1.5 py-0.5 rounded bg-muted/60 text-muted-foreground hidden group-hover:inline">
          ½ width
        </span>
      )}

      {/* Page Break Field */}
      {isPageBreak ? (
        <div className="py-2 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-primary font-bold text-xs uppercase tracking-wider">
            <SplitSquareVertical className="h-4 w-4" />
            <span>─── {t("Pemisah Halaman (Page Break)", "Page Break (Multi-Step)")} ───</span>
          </div>
          <Badge variant="outline" className="text-[10px] font-semibold text-primary border-primary/40 bg-primary/5">
            {t("Langkah Baru", "New Step")}
          </Badge>
        </div>
      ) : isHeading ? (
        <div className={`space-y-1.5 pt-1 ${fieldAlignClass}`}>
          <input
            type="text"
            value={field.label}
            onChange={(e) => onUpdateLabel(e.target.value)}
            className={`w-full ${fieldSizeClass} ${textStyles} ${fieldAlignClass} tracking-tight text-foreground bg-transparent border-none focus:outline-none focus:ring-1 focus:ring-primary rounded px-1`}
          />
          {field.sublabel && <p className={`text-xs text-muted-foreground px-1 ${fieldAlignClass}`}>{field.sublabel}</p>}
        </div>
      ) : isLogo ? (
        <div className={`py-1 flex items-center ${field.align === "center" ? "justify-center" : field.align === "right" ? "justify-end" : "justify-start"}`}>
          <div className="flex items-center gap-3 p-2 rounded-xl border border-dashed border-border/80 bg-muted/20">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={field.src || `/api/public/workspace-logo/${field.id ? "workspace" : ""}`}
              alt="Logo"
              className={`${field.logoSize === "sm" ? "h-8" : field.logoSize === "lg" ? "h-16" : "h-12"} object-contain rounded`}
              onError={(e) => {
                (e.target as HTMLElement).style.display = "none";
              }}
            />
            <span className="text-xs font-semibold text-muted-foreground">{t("Header Logo Brand", "Brand Header Logo")}</span>
          </div>
        </div>
      ) : isDivider ? (
        <div className="py-2">
          <hr className="border-t-2 border-border/80" />
          <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider pt-1 block text-center">
            Divider Line
          </span>
        </div>
      ) : isInfo ? (
        <div className="p-3 rounded-xl border border-blue-500/30 bg-blue-500/5 space-y-1">
          <div className={`flex items-center gap-1.5 text-blue-600 font-bold text-xs ${fieldAlignClass}`}>
            <Info className="h-3.5 w-3.5 shrink-0" />
            <input
              type="text"
              value={field.label}
              onChange={(e) => onUpdateLabel(e.target.value)}
              className={`bg-transparent border-none focus:outline-none focus:ring-1 focus:ring-blue-500 rounded px-1 flex-1 ${textStyles} ${fieldSizeClass} ${fieldAlignClass}`}
            />
          </div>
          <p className={`text-xs text-muted-foreground leading-relaxed px-1 ${fieldAlignClass}`}>
            {field.content || t("Tuliskan informasi atau catatan panduan untuk responden.", "Provide guidelines or notes for respondents.")}
          </p>
        </div>
      ) : isTerms ? (
        <div className="flex items-start gap-2.5 pt-1">
          <Checkbox disabled className="mt-0.5" />
          <div className="space-y-0.5 min-w-0 flex-1">
            <input
              type="text"
              value={field.label}
              onChange={(e) => onUpdateLabel(e.target.value)}
              className={`w-full text-xs ${textStyles} ${fieldSizeClass} ${fieldAlignClass} text-foreground bg-transparent border-none focus:outline-none focus:ring-1 focus:ring-primary rounded px-1`}
            />
            {field.content && <p className={`text-[11px] text-muted-foreground px-1 ${fieldAlignClass}`}>{field.content}</p>}
          </div>
        </div>
      ) : (
        /* Standard Field Preview */
        <div className="space-y-2">
          <div className="flex items-center justify-between gap-2">
            <div className={`flex items-center gap-1.5 min-w-0 flex-1 ${fieldAlignClass === "text-center" ? "justify-center" : fieldAlignClass === "text-right" ? "justify-end" : "justify-start"}`}>
              {field.listType === "bullet" && <span className="select-none text-primary font-bold">•</span>}
              {field.listType === "number" && <span className="select-none text-muted-foreground font-semibold text-xs">1.</span>}
              <input
                type="text"
                value={field.label}
                onChange={(e) => onUpdateLabel(e.target.value)}
                className={`text-xs ${textStyles} ${fieldSizeClass} ${fieldAlignClass} text-foreground bg-transparent border-none focus:outline-none focus:ring-1 focus:ring-primary rounded px-1 py-0.5 flex-1`}
              />
              {field.required && <span className="text-destructive font-bold text-xs">*</span>}
            </div>
            <div className="flex items-center gap-1 shrink-0">
              <Badge variant="outline" className="text-[10px] uppercase font-bold text-muted-foreground border-border bg-muted/30">
                {field.type.replace("_", " ")}
              </Badge>
            </div>
          </div>

          {field.type === "text" && (
            <Input disabled placeholder={field.placeholder || t("Jawaban singkat...", "Short answer...")} className="h-9 text-xs bg-muted/20" />
          )}
          {field.type === "textarea" && (
            <Textarea disabled placeholder={field.placeholder || t("Tuliskan jawaban lengkap di sini...", "Write complete answer here...")} rows={2} className="text-xs bg-muted/20" />
          )}
          {field.type === "email" && (
            <Input disabled placeholder={field.placeholder || "email@domain.com"} className="h-9 text-xs bg-muted/20" />
          )}
          {field.type === "phone" && (
            <Input disabled placeholder={field.placeholder || "+1 555-0199"} className="h-9 text-xs bg-muted/20" />
          )}
          {field.type === "number" && (
            <Input disabled placeholder={field.placeholder || "0"} type="number" className="h-9 text-xs bg-muted/20" />
          )}
          {field.type === "date" && (
            <Input disabled type="date" className="h-9 text-xs bg-muted/20" />
          )}
          {field.type === "time" && (
            <Input disabled type="time" className="h-9 text-xs bg-muted/20" />
          )}
          {field.type === "url" && (
            <Input disabled placeholder={field.placeholder || "https://..."} className="h-9 text-xs bg-muted/20" />
          )}
          {field.type === "select" && (
            <Select disabled>
              <SelectTrigger className="h-9 text-xs bg-muted/20">
                <SelectValue placeholder={t("Pilih salah satu...", "Select an option...")} />
              </SelectTrigger>
            </Select>
          )}
          {field.type === "multiselect" && (
            <div className="space-y-1.5 pt-1 px-1">
              {(field.options || [t("Pilihan 1", "Option 1"), t("Pilihan 2", "Option 2")]).map((opt, i) => (
                <div key={i} className="flex items-center gap-2 text-xs text-muted-foreground">
                  <div className="h-3.5 w-3.5 rounded border border-border bg-muted/30" />
                  <span>{opt}</span>
                </div>
              ))}
            </div>
          )}
          {field.type === "file" && (
            <div className="border-2 border-dashed border-border/80 rounded-xl p-4 text-center bg-muted/10 space-y-1">
              <Paperclip className="h-4 w-4 mx-auto text-muted-foreground" />
              <p className="text-xs font-medium text-foreground">{t("Upload file brief atau dokumen", "Upload brief or document attachment")}</p>
              <p className="text-[10px] text-muted-foreground">{field.acceptFiles || t("Format: PDF, PNG, ZIP", "Format: PDF, PNG, ZIP")}</p>
            </div>
          )}
          {field.type === "signature" && (
            <div className="border border-border/80 rounded-xl overflow-hidden bg-card text-center shadow-2xs">
              <div className="flex items-center justify-between px-3 py-1.5 border-b border-border/60 bg-muted/20">
                <div className="flex items-center gap-1.5 text-[10px] font-semibold text-muted-foreground">
                  <span className="px-1.5 py-0.5 rounded bg-background shadow-2xs text-foreground font-bold">{t("Coret", "Draw")}</span>
                  <span>{t("Ketik", "Type")}</span>
                </div>
                <span className="text-[10px] text-muted-foreground/60">E-Sign</span>
              </div>
              <div className="h-20 bg-muted/5 flex flex-col items-center justify-center gap-1 p-2">
                <PenTool className="h-4 w-4 text-primary/70" />
                <p className="text-[11px] text-muted-foreground italic font-serif">{t("Area Tanda Tangan Digital (Draw / Type)", "Digital Signature Pad (Draw / Type)")}</p>
              </div>
            </div>
          )}
          {field.type === "rating" && (
            <div className="flex items-center gap-1.5 pt-1 px-1">
              {Array.from({ length: field.maxRating || 5 }).map((_, idx) => (
                <Star key={idx} className="h-4 w-4 text-amber-400 fill-amber-400/20" />
              ))}
            </div>
          )}
          {field.type === "image_choice" && (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 pt-1">
              {(field.imageOptions || []).map((imgOpt, idx) => (
                <div key={idx} className="rounded-xl border border-border/80 overflow-hidden bg-card text-center space-y-1 pb-2">
                  <div className="h-20 bg-muted/40 overflow-hidden flex items-center justify-center relative">
                    {imgOpt.imageUrl ? (
                      <img
                        src={imgOpt.imageUrl}
                        alt={imgOpt.label}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          (e.target as HTMLElement).style.display = "none";
                        }}
                      />
                    ) : (
                      <ImageIcon className="h-6 w-6 text-muted-foreground/40" />
                    )}
                  </div>
                  <p className="text-[11px] font-semibold text-foreground px-1 truncate">{imgOpt.label}</p>
                </div>
              ))}
            </div>
          )}
          {field.type === "matrix" && (
            <div className="overflow-x-auto border border-border/80 rounded-xl">
              <table className="w-full text-xs text-left">
                <thead className="bg-muted/40 text-[10px] uppercase font-bold text-muted-foreground border-b border-border/70">
                  <tr>
                    <th className="p-2.5">{t("Aspek / Pertanyaan", "Aspect / Question")}</th>
                    {(field.matrixCols || []).map((col, idx) => (
                      <th key={idx} className="p-2.5 text-center">{col}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {(field.matrixRows || []).map((row, rIdx) => (
                    <tr key={rIdx} className="hover:bg-muted/20">
                      <td className="p-2.5 font-medium text-foreground">{row}</td>
                      {(field.matrixCols || []).map((_, cIdx) => (
                        <td key={cIdx} className="p-2.5 text-center">
                          <input type="radio" disabled className="h-3.5 w-3.5 text-primary" />
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export function QuestionnaireBuilder({
  workspaceId,
  workspaceName,
  workspaceLogoUrl,
  questionnaireId,
  initial,
}: {
  workspaceId: string;
  workspaceName?: string | null;
  workspaceLogoUrl?: string | null;
  questionnaireId?: string;
  initial?: {
    name: string;
    slug?: string | null;
    description: string | null;
    expiresAt?: string | null;
    maxResponses?: number | null;
    requireAll?: boolean;
    themePreset?: string | null;
    cardRadius?: string | null;
    thankYouMessage?: string | null;
    redirectUrl?: string | null;
    passwordProtection?: string | null;
    formStatus?: "active" | "disabled";
    schema: QuestionnaireField[];
  };
}) {
  const { t } = useT();
  const router = useRouter();
  const { refresh } = useAppTransition();

  // Navigation tab: "build" | "settings" | "publish"
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const urlTab = searchParams.get("tab");
  const urlPreview = searchParams.get("preview");
  const urlDevice = searchParams.get("device") as "desktop" | "mobile" | null;
  const initialActiveTab = urlTab === "settings" || urlTab === "publish" ? urlTab : "build";
  const [activeTab, setActiveTabState] = useState<"build" | "settings" | "publish">(initialActiveTab);

  const setActiveTab = useCallback(
    (tab: "build" | "settings" | "publish") => {
      setActiveTabState(tab);
      const params = new URLSearchParams(window.location.search);
      if (tab === "build") {
        params.delete("tab");
      } else {
        params.set("tab", tab);
      }
      const newUrl = `${pathname}${params.toString() ? `?${params.toString()}` : ""}`;
      window.history.replaceState(null, "", newUrl);
    },
    [pathname]
  );
  const [isPaidPlan, setIsPaidPlan] = useState<boolean>(true);
  const [customSlug, setCustomSlug] = useState(initial?.slug || "");

  useEffect(() => {
    getCurrentUserPlanForPortal().then((res) => {
      setIsPaidPlan(res.isPaid);
    }).catch(() => {});
  }, []);
  const [previewDevice, setPreviewDeviceState] = useState<"desktop" | "tablet" | "mobile">(urlDevice || "desktop");

  const setPreviewDevice = useCallback(
    (dev: "desktop" | "tablet" | "mobile") => {
      setPreviewDeviceState(dev);
      const params = new URLSearchParams(window.location.search);
      if (dev === "desktop") {
        params.delete("device");
      } else {
        params.set("device", dev);
      }
      const newUrl = `${pathname}${params.toString() ? `?${params.toString()}` : ""}`;
      window.history.replaceState(null, "", newUrl);
    },
    [pathname]
  );
  const [livePreviewMode, setLivePreviewModeState] = useState(urlPreview === "1" || urlPreview === "true");

  const setLivePreviewMode = useCallback(
    (val: boolean | ((prev: boolean) => boolean)) => {
      setLivePreviewModeState((prev) => {
        const next = typeof val === "function" ? val(prev) : val;
        const params = new URLSearchParams(window.location.search);
        if (next) {
          params.set("preview", "1");
        } else {
          params.delete("preview");
        }
        const newUrl = `${pathname}${params.toString() ? `?${params.toString()}` : ""}`;
        window.history.replaceState(null, "", newUrl);
        return next;
      });
    },
    [pathname]
  );
  const [templateDialogOpen, setTemplateDialogOpen] = useState(false);
  // Form general state
  const [name, setName] = useState(initial?.name || "");
  const [description, setDescription] = useState(initial?.description || "");
  const [expiresAt, setExpiresAt] = useState<string>(initial?.expiresAt ? initial.expiresAt.slice(0, 16) : "");
  const [maxResponses, setMaxResponses] = useState<string>(initial?.maxResponses ? String(initial.maxResponses) : "");
  const [requireAll, setRequireAll] = useState<boolean>(initial?.requireAll || false);
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [selectedTheme, setSelectedTheme] = useState(initial?.themePreset || "purple");
  const [customHex, setCustomHex] = useState(
    THEME_PRESETS.find((p) => p.id === (initial?.themePreset || "purple"))?.hex || "#6C5CE7"
  );
  const [cardRoundness, setCardRoundness] = useState<"normal" | "rounded" | "soft">(
    (initial?.cardRadius as "normal" | "rounded" | "soft") || "rounded"
  );
  const [thankYouMessage, setThankYouMessage] = useState(
    initial?.thankYouMessage ||
      "Thank you! Your response has been received and will be processed shortly."
  );
  const [redirectUrl, setRedirectUrl] = useState(initial?.redirectUrl || "");
  const [passwordProtection, setPasswordProtection] = useState(initial?.passwordProtection || "");
  const [formStatus, setFormStatus] = useState<"active" | "disabled">((initial?.formStatus as any) || "active");

  const [isTranslating, setIsTranslating] = useState(false);

  const handleAiTranslate = async () => {
    if (fields.length === 0) {
      toast.error(t("Tidak ada pertanyaan untuk diterjemahkan.", "No fields to translate."));
      return;
    }

    setIsTranslating(true);
    const toastId = toast.loading(t("AI sedang menerjemahkan form ke Bahasa Inggris...", "AI is translating form to English..."));

    try {
      const res = await translateQuestionnaireFields({
        targetLang: "en",
        title: name,
        description: description,
        thankYouMessage: thankYouMessage,
        fields,
      });

      setFields(res.fields);
      if (res.title && !name.includes(" / ")) {
        setName(`${name} / ${res.title}`);
      }
      if (res.description && !description.includes(" / ")) {
        setDescription(`${description} / ${res.description}`);
      }
      if (res.thankYouMessage && !thankYouMessage.includes(" / ")) {
        setThankYouMessage(`${thankYouMessage} / ${res.thankYouMessage}`);
      }

      toast.success(t("Form berhasil diterjemahkan & siap dwibahasa (ID/EN)!", "Form successfully translated & ready for bilingual (ID/EN)!"), {
        id: toastId,
      });
    } catch (err: any) {
      toast.error(err.message || t("Gagal menerjemahkan formulir.", "Failed to translate form."), {
        id: toastId,
      });
    } finally {
      setIsTranslating(false);
    }
  };

  const defaultFields: QuestionnaireField[] = useMemo(
    () =>
      initial?.schema && initial.schema.length > 0
        ? initial.schema
        : [
            {
              id: makeId(),
              type: "text",
              label: t("Nama Lengkap", "Full Name"),
              required: false,
              placeholder: t("Masukkan nama Anda", "Enter your full name"),
              colSpan: "full",
            },
            {
              id: makeId(),
              type: "email",
              label: t("Email Bisnis", "Business Email"),
              required: false,
              placeholder: "email@company.com",
              colSpan: "half",
            },
            {
              id: makeId(),
              type: "phone",
              label: t("Nomor WhatsApp", "WhatsApp / Phone"),
              required: false,
              placeholder: "+1 555-0199",
              colSpan: "half",
            },
          ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  const {
    state: fields,
    set: setFields,
    undo,
    redo,
    canUndo,
    canRedo,
  } = useHistoryState<QuestionnaireField[]>(defaultFields, 50);

  // Keyboard shortcut Ctrl+Z / Ctrl+Y
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.ctrlKey || e.metaKey) && e.key === "z" && !e.shiftKey) {
        e.preventDefault();
        undo();
      } else if (
        ((e.ctrlKey || e.metaKey) && e.key === "y") ||
        ((e.ctrlKey || e.metaKey) && e.shiftKey && (e.key === "z" || e.key === "Z"))
      ) {
        e.preventDefault();
        redo();
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [undo, redo]);

  // Panels visibility: Elements sidebar (left) & Properties drawer (right)
  const [elementsOpen, setElementsOpen] = useState(true);
  const [activeLeftTab, setActiveLeftTab] = useState<"elements" | "structure">("elements");
  const [elementSearch, setElementSearch] = useState("");
  const [propertiesOpen, setPropertiesOpen] = useState(false);
  const [selectedFieldId, setSelectedFieldId] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  // DnD Sensors setup
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      setFields((items) => {
        const oldIndex = items.findIndex((i) => i.id === active.id);
        const newIndex = items.findIndex((i) => i.id === over.id);
        return arrayMove(items, oldIndex, newIndex);
      });
    }
  }

  const selectedField = useMemo(
    () => fields.find((f) => f.id === selectedFieldId) || null,
    [fields, selectedFieldId],
  );

  const dirty = useMemo(
    () =>
      JSON.stringify({ name, description, fields }) !==
      JSON.stringify({
        name: initial?.name || "",
        description: initial?.description || "",
        fields: initial?.schema || [],
      }),
    [name, description, fields, initial],
  );

  useUnsavedChanges(dirty);

  function handleAddField(def: ElementDefinition) {
    const newField: QuestionnaireField = {
      id: makeId(),
      type: def.type,
      label:
        def.type === "page_break"
          ? t("Langkah Baru", "New Step")
          : def.type === "heading"
            ? t("Judul Bagian Baru", "New Section Header")
            : def.type === "divider"
              ? t("Divider", "Divider")
              : def.type === "info"
                ? t("Informasi Penting", "Important Information")
                : `${t("Pertanyaan", "Question")} ${def.label}`,
      sublabel: def.type === "heading" ? t("Panduan singkat bagian ini...", "Brief guideline for this section...") : undefined,
      required: false,
      colSpan: def.defaultConfig.colSpan || "full",
      ...def.defaultConfig,
    };
    setFields((prev) => [...prev, newField]);
    setSelectedFieldId(newField.id);
    setPropertiesOpen(true);
    toast.success(`${def.label} ${t("ditambahkan", "added")}`);
  }

  function handleApplyTemplate(tpl: typeof FORM_TEMPLATES[0]) {
    setName(tpl.title);
    setDescription(tpl.description);
    setFields(tpl.fields);
    setSelectedFieldId(tpl.fields[0]?.id || null);
    setTemplateDialogOpen(false);
    toast.success(t(`Template ${tpl.title} diterapkan!`, `Template ${tpl.title} applied!`));
  }

  function handleDuplicateField(fieldId: string) {
    const target = fields.find((f) => f.id === fieldId);
    if (!target) return;
    const clone: QuestionnaireField = {
      ...target,
      id: makeId(),
      label: `${target.label} (Copy)`,
    };
    const idx = fields.findIndex((f) => f.id === fieldId);
    const updated = [...fields];
    updated.splice(idx + 1, 0, clone);
    setFields(updated);
    setSelectedFieldId(clone.id);
    toast.success(t("Field diduplikasi", "Field duplicated"));
  }

  function handleDeleteField(fieldId: string) {
    if (fields.length <= 1) {
      toast.error(t("Formulir harus memiliki minimal 1 field", "Form must have at least 1 field"));
      return;
    }
    setFields((prev) => prev.filter((f) => f.id !== fieldId));
    if (selectedFieldId === fieldId) {
      const remaining = fields.filter((f) => f.id !== fieldId);
      setSelectedFieldId(remaining[0]?.id || null);
    }
    toast.success(t("Field dihapus", "Field deleted"));
  }

  function updateSelectedField(patch: Partial<QuestionnaireField>) {
    if (!selectedFieldId) return;
    setFields((prev) =>
      prev.map((f) => (f.id === selectedFieldId ? { ...f, ...patch } : f)),
    );
  }

  const [savedStatus, setSavedStatus] = useState<"saved" | "saving" | "idle">("saved");
  const autoSaveTimerRef = useRef<NodeJS.Timeout | null>(null);

  const [activeQuestionnaireId, setActiveQuestionnaireId] = useState<string | null>(questionnaireId || null);

  const executeSave = useCallback(
    async (isAuto = false) => {
      if (!name.trim()) {
        if (!isAuto) toast.error(t("Nama formulir wajib diisi", "Form name is required"));
        return;
      }
      if (fields.length === 0) {
        if (!isAuto) toast.error(t("Formulir harus memiliki minimal 1 field", "At least 1 field is required"));
        return;
      }

      setSavedStatus("saving");
      try {
        let qId = activeQuestionnaireId;
        const normalizedSlug = isPaidPlan && customSlug.trim() ? customSlug.trim().toLowerCase() : null;
        const isoExpiresAt = expiresAt ? new Date(expiresAt).toISOString() : null;
        const parsedMaxResp = maxResponses ? parseInt(maxResponses, 10) : null;

        if (qId) {
          await updateQuestionnaire(qId, {
            name: name.trim(),
            description: description.trim() || null,
            slug: normalizedSlug,
            expiresAt: isoExpiresAt,
            maxResponses: parsedMaxResp,
            requireAll,
            themePreset: selectedTheme,
            cardRadius: cardRoundness,
            thankYouMessage: thankYouMessage.trim() || null,
            redirectUrl: redirectUrl.trim() || null,
            passwordProtection: passwordProtection.trim() || null,
            formStatus,
            schema: fields,
          });
          if (!isAuto) toast.success(t("Formulir berhasil diperbarui", "Form updated"));
        } else {
          const res = await createQuestionnaire({
            workspaceId,
            name: name.trim(),
            description: description.trim() || null,
            slug: normalizedSlug,
            expiresAt: isoExpiresAt,
            maxResponses: parsedMaxResp,
            requireAll,
            themePreset: selectedTheme,
            cardRadius: cardRoundness,
            thankYouMessage: thankYouMessage.trim() || null,
            redirectUrl: redirectUrl.trim() || null,
            passwordProtection: passwordProtection.trim() || null,
            formStatus,
            schema: fields,
          });
          qId = res.id;
          setActiveQuestionnaireId(res.id);
          if (!isAuto) toast.success(t("Formulir berhasil dibuat", "Form created"));
          window.history.replaceState(null, "", `/app/questionnaires/${qId}`);
        }
        setSavedStatus("saved");
      } catch (err: any) {
        setSavedStatus("idle");
        if (!isAuto) toast.error(err?.message || t("Gagal menyimpan", "Save failed"));
      }
    },
    [
      name,
      description,
      customSlug,
      expiresAt,
      maxResponses,
      requireAll,
      selectedTheme,
      cardRoundness,
      thankYouMessage,
      redirectUrl,
      passwordProtection,
      formStatus,
      fields,
      activeQuestionnaireId,
      isPaidPlan,
      workspaceId,
      t,
    ]
  );

  // Debounced auto-save on change
  useEffect(() => {
    if (!questionnaireId) return; // Only auto-save existing questionnaires
    if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
    autoSaveTimerRef.current = setTimeout(() => {
      void executeSave(true);
    }, 1500);

    return () => {
      if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
    };
  }, [
    name,
    description,
    customSlug,
    expiresAt,
    maxResponses,
    requireAll,
    selectedTheme,
    cardRoundness,
    thankYouMessage,
    redirectUrl,
    passwordProtection,
    formStatus,
    fields,
    questionnaireId,
    executeSave,
  ]);

  function handleSave() {
    startTransition(async () => {
      await executeSave(false);
    });
  }

  const [customOrigin, setCustomOrigin] = useState("");
  useEffect(() => {
    if (typeof window !== "undefined") {
      setCustomOrigin(window.location.origin);
    }
  }, []);

  const activeSlugOrId = customSlug.trim() || initial?.slug || activeQuestionnaireId || questionnaireId;
  const baseUrl = customOrigin || "https://cubiqlo.com";
  const shareUrl = activeSlugOrId ? `${baseUrl}/intake/${activeSlugOrId}` : "";
  const embedCode = activeSlugOrId ? `<iframe src="${baseUrl}/intake/${activeSlugOrId}" width="100%" height="700px" frameborder="0" style="border:0;border-radius:12px;"></iframe>` : "";

  return (
    <div className="flex flex-col h-[calc(100vh-56px)] w-full bg-slate-100/70 dark:bg-zinc-950 overflow-hidden select-none">
      {/* ─── Top Jotform Bar: Brand, Tabs, Device Switcher, Actions ─── */}
      <header className="h-13 border-b border-border/80 bg-background px-3 sm:px-4 flex items-center justify-between shrink-0 z-20">
        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
          <Button variant="ghost" size="icon" asChild className="h-8 w-8 rounded-lg shrink-0">
            <Link href="/app/questionnaires">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div className="min-w-0 flex items-center gap-1.5">
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t("Nama Formulir...", "Form Name...")}
              className="font-bold text-xs sm:text-sm bg-transparent border-none focus:outline-none focus:ring-1 focus:ring-primary rounded px-1.5 py-0.5 max-w-[140px] sm:max-w-xs truncate"
            />
          </div>
        </div>

        {/* 3 Main Workflow Tabs */}
        <div className="flex items-center gap-1 bg-muted/60 p-0.5 sm:p-1 rounded-xl border border-border/60">
          <button
            type="button"
            onClick={() => setActiveTab("build")}
            className={`flex items-center gap-1.5 px-2.5 sm:px-3.5 py-1 text-xs font-semibold rounded-lg transition-all ${
              activeTab === "build"
                ? "bg-background text-foreground shadow-xs"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Sliders className="h-3.5 w-3.5 text-primary" />
            <span>BUILD</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("settings")}
            className={`flex items-center gap-1.5 px-2.5 sm:px-3.5 py-1 text-xs font-semibold rounded-lg transition-all ${
              activeTab === "settings"
                ? "bg-background text-foreground shadow-xs"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Settings className="h-3.5 w-3.5" />
            <span>SETTINGS</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("publish")}
            className={`flex items-center gap-1.5 px-2.5 sm:px-3.5 py-1 text-xs font-semibold rounded-lg transition-all ${
              activeTab === "publish"
                ? "bg-background text-foreground shadow-xs"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Share2 className="h-3.5 w-3.5" />
            <span>PUBLISH</span>
          </button>
        </div>

        {/* Action Right: Clean, Ergonomic Controls */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          {/* Interactive Live Preview Switcher */}
          <button
            type="button"
            onClick={() => setLivePreviewMode(!livePreviewMode)}
            className={`flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-lg border transition-all ${
              livePreviewMode
                ? "bg-primary text-primary-foreground border-primary shadow-xs"
                : "bg-muted/40 text-muted-foreground hover:text-foreground border-border/70"
            }`}
            title={t("Uji coba langsung pengisian formulir interaktif", "Interactive live form preview")}
          >
            <Eye className="h-3.5 w-3.5" />
            <span>{t("Preview", "Preview")}</span>
          </button>

          {/* Desktop, Tablet & Mobile Viewport Switcher — ONLY in Live Preview Mode */}
          {livePreviewMode && (
            <div className="flex items-center bg-muted/60 p-0.5 rounded-lg border border-border/70 animate-in fade-in-0 duration-150">
              <button
                type="button"
                onClick={() => setPreviewDevice("desktop")}
                className={`p-1 rounded-md transition-all ${
                  previewDevice === "desktop" ? "bg-background text-foreground shadow-2xs font-semibold" : "text-muted-foreground hover:text-foreground"
                }`}
                title={t("Tampilan Desktop", "Desktop View")}
              >
                <Monitor className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                onClick={() => setPreviewDevice("tablet")}
                className={`p-1 rounded-md transition-all ${
                  previewDevice === "tablet" ? "bg-background text-foreground shadow-2xs font-semibold" : "text-muted-foreground hover:text-foreground"
                }`}
                title={t("Tampilan Tablet", "Tablet View")}
              >
                <Tablet className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                onClick={() => setPreviewDevice("mobile")}
                className={`p-1 rounded-md transition-all ${
                  previewDevice === "mobile" ? "bg-background text-foreground shadow-2xs font-semibold" : "text-muted-foreground hover:text-foreground"
                }`}
                title={t("Tampilan Mobile", "Mobile View")}
              >
                <Smartphone className="h-3.5 w-3.5" />
              </button>
            </div>
          )}

          {/* Quick Dropdown for Tools (AI Translate, Templates) */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-8 gap-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground border-border/80 px-2.5"
                title={t("Alat Tambahan & Template", "More Tools & Templates")}
              >
                <MoreHorizontal className="h-3.5 w-3.5" />
                <span className="hidden xl:inline">{t("Tools", "Tools")}</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56 p-1.5 space-y-0.5">
              <DropdownMenuItem
                disabled={isTranslating}
                onClick={handleAiTranslate}
                className="flex items-center gap-2 cursor-pointer text-xs font-medium text-primary hover:bg-primary/5 py-2"
              >
                <Languages className="h-4 w-4 text-primary" />
                <div className="flex flex-col">
                  <span className="font-semibold">{isTranslating ? t("Translating...", "Translating...") : t("Translate (ID ↔ EN)", "Translate (ID ↔ EN)")}</span>
                  <span className="text-[10px] text-muted-foreground">{t("1-Klik AI Terjemahan dwibahasa", "1-Click AI bilingual translate")}</span>
                </div>
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => setTemplateDialogOpen(true)}
                className="flex items-center gap-2 cursor-pointer text-xs font-medium py-2"
              >
                <LayoutTemplate className="h-4 w-4 text-muted-foreground" />
                <div className="flex flex-col">
                  <span className="font-semibold">{t("Form Templates", "Form Templates")}</span>
                  <span className="text-[10px] text-muted-foreground">{t("Pilih dari template siap pakai", "Choose from starter templates")}</span>
                </div>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {activeTab === "build" && !livePreviewMode && (
            <>
              {/* Elements & Properties Toggle Buttons */}
              <div className="flex items-center bg-muted/50 p-0.5 rounded-lg border border-border/60">
                <Button
                  type="button"
                  variant={elementsOpen ? "secondary" : "ghost"}
                  size="sm"
                  onClick={() => setElementsOpen(!elementsOpen)}
                  className={`h-7 px-2.5 gap-1.5 text-xs font-medium ${
                    elementsOpen ? "bg-background text-foreground shadow-xs" : "text-muted-foreground"
                  }`}
                  title={t("Katalog Elemen (+)", "Element Catalog (+)")}
                >
                  <Plus className="h-3.5 w-3.5" />
                  <span className="hidden md:inline">{t("Elemen", "Elements")}</span>
                </Button>

                <Button
                  type="button"
                  variant={propertiesOpen ? "secondary" : "ghost"}
                  size="sm"
                  onClick={() => setPropertiesOpen(!propertiesOpen)}
                  className={`h-7 px-2.5 gap-1.5 text-xs font-medium ${
                    propertiesOpen ? "bg-background text-foreground shadow-xs" : "text-muted-foreground"
                  }`}
                  title={t("Properti Field", "Field Properties")}
                >
                  <Settings className="h-3.5 w-3.5" />
                  <span className="hidden md:inline">{t("Properti", "Properties")}</span>
                </Button>
              </div>
            </>
          )}

          {/* Auto-save status indicator */}
          {questionnaireId && savedStatus === "saving" && (
            <div className="hidden sm:flex items-center gap-1.5 px-2 py-1 rounded-md text-[11px] font-medium text-muted-foreground bg-muted/40">
              <Loader2 className="h-3 w-3 animate-spin text-primary" />
              <span>{t("Menyimpan...", "Saving...")}</span>
            </div>
          )}

          <Button
            type="button"
            size="sm"
            disabled={pending || savedStatus === "saving"}
            onClick={handleSave}
            className="h-8 gap-1.5 text-xs font-semibold bg-primary text-primary-foreground shadow-xs"
          >
            {pending || savedStatus === "saving" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
            <span>{t("Simpan", "Save")}</span>
          </Button>
        </div>
      </header>

      {/* ─── TEMPLATE GALLERY MODAL ─── */}
      {templateDialogOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in-0">
          <div className="w-full max-w-2xl bg-background rounded-2xl border border-border shadow-2xl overflow-hidden flex flex-col max-h-[85vh] animate-in zoom-in-95 duration-150">
            <div className="p-5 border-b border-border/80 flex items-center justify-between bg-muted/20">
              <div className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-primary" />
                <div>
                  <h3 className="font-bold text-sm text-foreground">{t("Template Galeri Formulir", "Form Template Gallery")}</h3>
                  <p className="text-xs text-muted-foreground">{t("Pilih template siap pakai atau mulai dari kertas kosong.", "Choose a prebuilt template or start from blank canvas.")}</p>
                </div>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => setTemplateDialogOpen(false)}
                className="h-8 w-8 rounded-lg"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            <div className="flex-1 overflow-y-auto p-5 space-y-3.5 custom-scrollbar">
              {FORM_TEMPLATES.map((tpl) => (
                <div
                  key={tpl.id}
                  className="p-4 rounded-xl border border-border/80 bg-card hover:border-primary/50 hover:shadow-xs transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                >
                  <div className="space-y-1">
                    <h4 className="text-sm font-bold text-foreground flex items-center gap-2">
                      <span>{tpl.title}</span>
                      <Badge variant="secondary" className="text-[10px] font-semibold py-0">
                        {tpl.fields.length} {t("Kolom", "Fields")}
                      </Badge>
                    </h4>
                    <p className="text-xs text-muted-foreground">{tpl.description}</p>
                  </div>
                  <Button
                    type="button"
                    size="sm"
                    onClick={() => handleApplyTemplate(tpl)}
                    className="h-8.5 px-4 text-xs font-semibold shrink-0 bg-primary text-primary-foreground"
                  >
                    {t("Gunakan Template", "Use Template")}
                  </Button>
                </div>
              ))}
            </div>

            <div className="p-4 border-t border-border/80 bg-muted/10 flex items-center justify-between">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setTemplateDialogOpen(false)}
                className="text-xs text-muted-foreground"
              >
                {t("Mulai dari Blank Form", "Start with Blank Form")}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ─── TAB CONTENT: BUILD ─── */}
      {activeTab === "build" && (
        <div className="flex-1 flex min-h-0 overflow-hidden relative">
          {livePreviewMode ? (
            /* INTERACTIVE LIVE PREVIEW FRAME */
            <main className="flex-1 overflow-y-auto p-4 sm:p-8 flex flex-col items-center justify-start bg-slate-900/10 custom-scrollbar">
              <div
                className={`w-full transition-all duration-300 space-y-6 ${
                  previewDevice === "mobile"
                    ? "max-w-[400px]"
                    : previewDevice === "tablet"
                    ? "max-w-[768px]"
                    : "max-w-2xl"
                }`}
              >
                {/* Public Header Preview Banner */}
                <PublicDocumentHeader
                  badgeLabel="Official Form"
                  documentType="form"
                  documentTitle={name || t("Formulir", "Form")}
                  workspaceName={workspaceName || "Cubiqlo Workspace"}
                  workspaceLogoUrl={workspaceLogoUrl}
                />

                <div
                  className={`w-full bg-card border border-border/80 shadow-xl space-y-6 p-6 sm:p-10 ${
                    cardRoundness === "normal"
                      ? "rounded-md"
                      : cardRoundness === "soft"
                      ? "rounded-3xl"
                      : "rounded-2xl"
                  }`}
                >
                  <IntakeForm
                    token="preview_mode"
                    fields={fields}
                    formName={name}
                    formDescription={description}
                    themePreset={selectedTheme}
                    cardRadius={cardRoundness}
                    thankYouMessage={thankYouMessage}
                    redirectUrl={redirectUrl}
                  />
                </div>
              </div>
            </main>
          ) : (
            <>
              {/* PANEL KIRI: Element Catalog & Structure */}
              {elementsOpen && (
                <aside className="w-64 sm:w-72 h-full border-r border-border/80 bg-background flex flex-col shrink-0 z-10 animate-in slide-in-from-left-4 duration-150 overflow-hidden">
                  <div className="p-2.5 border-b border-border/60 flex flex-col gap-2 shrink-0 bg-muted/10">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1 bg-muted/60 p-0.5 rounded-lg">
                        <button
                          type="button"
                          onClick={() => setActiveLeftTab("elements")}
                          className={`px-2 py-0.5 text-[11px] font-bold rounded ${
                            activeLeftTab === "elements" ? "bg-background text-foreground shadow-2xs" : "text-muted-foreground"
                          }`}
                        >
                          Elements
                        </button>
                        <button
                          type="button"
                          onClick={() => setActiveLeftTab("structure")}
                          className={`px-2 py-0.5 text-[11px] font-bold rounded ${
                            activeLeftTab === "structure" ? "bg-background text-foreground shadow-2xs" : "text-muted-foreground"
                          }`}
                        >
                          Structure ({fields.length})
                        </button>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => setElementsOpen(false)}
                        className="h-6 w-6 rounded-md text-muted-foreground hover:text-foreground md:hidden"
                      >
                        <X className="h-3.5 w-3.5" />
                      </Button>
                    </div>

                    {/* Element Search Input */}
                    {activeLeftTab === "elements" && (
                      <div className="relative">
                        <Search className="h-3.5 w-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                        <Input
                          value={elementSearch}
                          onChange={(e) => setElementSearch(e.target.value)}
                          placeholder={t("Cari elemen...", "Search elements...")}
                          className="h-7.5 pl-8 text-xs bg-muted/20"
                        />
                      </div>
                    )}
                  </div>

                  <div className="flex-1 overflow-y-auto p-3 space-y-4 custom-scrollbar">
                    {activeLeftTab === "structure" ? (
                      <div className="space-y-1">
                        <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-2">
                          {t("Urutan Field Formulir", "Form Field Order")}
                        </p>
                        {fields.map((field, index) => (
                          <button
                            key={field.id}
                            type="button"
                            onClick={() => {
                              setSelectedFieldId(field.id);
                              setPropertiesOpen(true);
                            }}
                            className={`flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-left text-xs transition-all ${
                              selectedFieldId === field.id
                                ? "bg-primary/10 font-bold text-primary border border-primary/30"
                                : "text-muted-foreground hover:bg-muted/50 border border-transparent"
                            }`}
                          >
                            <GripVertical className="h-3 w-3 shrink-0 text-muted-foreground/50" />
                            <span className="w-4 text-[10px] text-muted-foreground/70">{index + 1}</span>
                            <span className="truncate flex-1 font-medium">{field.label || field.type}</span>
                          </button>
                        ))}
                      </div>
                    ) : elementSearch ? (
                      <div>
                        <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/80 mb-2">
                          {t("Hasil Pencarian", "Search Results")} ({ELEMENT_CATALOG.filter((e) => e.label.toLowerCase().includes(elementSearch.toLowerCase()) || e.description.toLowerCase().includes(elementSearch.toLowerCase())).length})
                        </p>
                        <div className="grid grid-cols-1 gap-1.5">
                          {ELEMENT_CATALOG.filter((e) => e.label.toLowerCase().includes(elementSearch.toLowerCase()) || e.description.toLowerCase().includes(elementSearch.toLowerCase())).map((item) => (
                            <button
                              key={item.type}
                              type="button"
                              draggable
                              onDragStart={(e) => {
                                e.dataTransfer.setData("application/json", JSON.stringify(item));
                              }}
                              onClick={() => {
                                handleAddField(item);
                                setElementSearch("");
                              }}
                              className="flex items-center gap-2.5 p-2 rounded-lg border border-border/60 bg-muted/20 hover:bg-primary/5 hover:border-primary/40 text-left transition-all group cursor-grab active:cursor-grabbing"
                            >
                              <div className="p-1.5 rounded-md bg-background border border-border/80 text-muted-foreground group-hover:text-primary group-hover:border-primary/40 shrink-0">
                                <item.icon className="h-3.5 w-3.5" />
                              </div>
                              <div className="min-w-0 flex-1">
                                <p className="text-xs font-medium text-foreground group-hover:text-primary truncate">
                                  {item.label}
                                </p>
                              </div>
                              <Plus className="h-3.5 w-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                            </button>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <>
                        {/* Basic Fields */}
                        <div>
                          <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/80 mb-2">
                            Basic Fields
                          </p>
                          <div className="grid grid-cols-1 gap-1.5">
                            {ELEMENT_CATALOG.filter((e) => e.category === "basic").map((item) => (
                              <button
                                key={item.type}
                                type="button"
                                draggable
                                onDragStart={(e) => {
                                  e.dataTransfer.setData("application/json", JSON.stringify(item));
                                }}
                                onClick={() => handleAddField(item)}
                                className="flex items-center gap-2.5 p-2 rounded-lg border border-border/60 bg-muted/20 hover:bg-primary/5 hover:border-primary/40 text-left transition-all group cursor-grab active:cursor-grabbing"
                              >
                                <div className="p-1.5 rounded-md bg-background border border-border/80 text-muted-foreground group-hover:text-primary group-hover:border-primary/40 shrink-0">
                                  <item.icon className="h-3.5 w-3.5" />
                                </div>
                                <div className="min-w-0 flex-1">
                                  <p className="text-xs font-medium text-foreground group-hover:text-primary truncate">
                                    {item.label}
                                  </p>
                                </div>
                                <Plus className="h-3.5 w-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* Choices & Selection */}
                        <div>
                          <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/80 mb-2">
                            Choices & Selection
                          </p>
                          <div className="grid grid-cols-1 gap-1.5">
                            {ELEMENT_CATALOG.filter((e) => e.category === "choice").map((item) => (
                              <button
                                key={item.type}
                                type="button"
                                draggable
                                onDragStart={(e) => {
                                  e.dataTransfer.setData("application/json", JSON.stringify(item));
                                }}
                                onClick={() => handleAddField(item)}
                                className="flex items-center gap-2.5 p-2 rounded-lg border border-border/60 bg-muted/20 hover:bg-primary/5 hover:border-primary/40 text-left transition-all group cursor-grab active:cursor-grabbing"
                              >
                                <div className="p-1.5 rounded-md bg-background border border-border/80 text-muted-foreground group-hover:text-primary group-hover:border-primary/40 shrink-0">
                                  <item.icon className="h-3.5 w-3.5" />
                                </div>
                                <div className="min-w-0 flex-1">
                                  <p className="text-xs font-medium text-foreground group-hover:text-primary truncate">
                                    {item.label}
                                  </p>
                                </div>
                                <Plus className="h-3.5 w-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* Advanced & Special Fields */}
                        <div>
                          <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/80 mb-2">
                            Advanced & Special Fields
                          </p>
                          <div className="grid grid-cols-1 gap-1.5">
                            {ELEMENT_CATALOG.filter((e) => e.category === "advanced").map((item) => (
                              <button
                                key={item.type}
                                type="button"
                                draggable
                                onDragStart={(e) => {
                                  e.dataTransfer.setData("application/json", JSON.stringify(item));
                                }}
                                onClick={() => handleAddField(item)}
                                className="flex items-center gap-2.5 p-2 rounded-lg border border-border/60 bg-muted/20 hover:bg-primary/5 hover:border-primary/40 text-left transition-all group cursor-grab active:cursor-grabbing"
                              >
                                <div className="p-1.5 rounded-md bg-background border border-border/80 text-muted-foreground group-hover:text-primary group-hover:border-primary/40 shrink-0">
                                  <item.icon className="h-3.5 w-3.5" />
                                </div>
                                <div className="min-w-0 flex-1">
                                  <p className="text-xs font-medium text-foreground group-hover:text-primary truncate">
                                    {item.label}
                                  </p>
                                </div>
                                <Plus className="h-3.5 w-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* Structure & Layout Fields */}
                        <div>
                          <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/80 mb-2">
                            Structure & Layout
                          </p>
                          <div className="grid grid-cols-1 gap-1.5">
                            {ELEMENT_CATALOG.filter((e) => e.category === "structure").map((item) => (
                              <button
                                key={item.type}
                                type="button"
                                draggable
                                onDragStart={(e) => {
                                  e.dataTransfer.setData("application/json", JSON.stringify(item));
                                }}
                                onClick={() => handleAddField(item)}
                                className="flex items-center gap-2.5 p-2 rounded-lg border border-border/60 bg-muted/20 hover:bg-primary/5 hover:border-primary/40 text-left transition-all group cursor-grab active:cursor-grabbing"
                              >
                                <div className="p-1.5 rounded-md bg-background border border-border/80 text-muted-foreground group-hover:text-primary group-hover:border-primary/40 shrink-0">
                                  <item.icon className="h-3.5 w-3.5" />
                                </div>
                                <div className="min-w-0 flex-1">
                                  <p className="text-xs font-medium text-foreground group-hover:text-primary truncate">
                                    {item.label}
                                  </p>
                                </div>
                                <Plus className="h-3.5 w-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                              </button>
                            ))}
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                </aside>
              )}

              {/* PANEL TENGAH: Live Form Canvas (Lega & Centered) */}
              <main className="flex-1 overflow-y-auto p-4 sm:p-6 md:p-8 flex justify-center custom-scrollbar">
                <div className={`w-full transition-all duration-200 ${previewDevice === "mobile" ? "max-w-sm" : "max-w-3xl"}`}>
                  {/* Form Paper Sheet */}
                  <div
                    onDragOver={(e) => {
                      e.preventDefault();
                      e.dataTransfer.dropEffect = "copy";
                    }}
                    onDrop={(e) => {
                      e.preventDefault();
                      try {
                        const data = e.dataTransfer.getData("application/json");
                        if (data) {
                          const item = JSON.parse(data) as ElementDefinition;
                          if (item && item.type) {
                            handleAddField(item);
                          }
                        }
                      } catch {
                        // ignore malformed drag data
                      }
                    }}
                    className={`border border-border/80 bg-background shadow-md p-5 sm:p-8 space-y-6 ${
                      cardRoundness === "normal"
                        ? "rounded-md"
                        : cardRoundness === "soft"
                          ? "rounded-3xl"
                          : "rounded-2xl"
                    }`}
                  >
                    {/* Form Title & Header Area */}
                    <div className="space-y-1.5 border-b border-border/60 pb-5">
                      <Input
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder={t("Judul Formulir...", "Form Title...")}
                        className="text-xl sm:text-2xl font-extrabold tracking-tight border-none px-0 h-auto focus-visible:ring-0 placeholder:text-muted-foreground/40"
                      />
                      <Textarea
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        placeholder={t("Tuliskan petunjuk atau deskripsi formulir untuk responden...", "Write instructions or description for respondents...")}
                        rows={2}
                        className="text-xs text-muted-foreground border-none px-0 min-h-[40px] resize-none focus-visible:ring-0 placeholder:text-muted-foreground/40"
                      />
                    </div>

                    {/* DnD Sortable Field List Canvas with 12-Column Grid */}
                    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                      <SortableContext items={fields.map((f) => f.id)} strategy={verticalListSortingStrategy}>
                        <div className="grid grid-cols-12 gap-3.5">
                          {fields.map((field) => (
                            <SortableCanvasField
                              key={field.id}
                              field={field}
                              cardRadius={cardRoundness}
                              themeHex={customHex}
                              isSelected={field.id === selectedFieldId}
                              onSelect={() => {
                                setSelectedFieldId(field.id);
                                setPropertiesOpen(true);
                              }}
                              onOpenProperties={() => {
                                setSelectedFieldId(field.id);
                                setPropertiesOpen(true);
                              }}
                              onUpdateLabel={(val) => {
                                setFields((prev) =>
                                  prev.map((f) => (f.id === field.id ? { ...f, label: val } : f)),
                                );
                              }}
                              onDuplicate={() => handleDuplicateField(field.id)}
                              onDelete={() => handleDeleteField(field.id)}
                              onUpdateField={(patch) => {
                                setFields((prev) =>
                                  prev.map((f) => (f.id === field.id ? { ...f, ...patch } : f)),
                                );
                              }}
                            />
                          ))}
                        </div>
                      </SortableContext>
                    </DndContext>

                    {/* Submit button preview */}
                    <div className="pt-5 border-t border-border/60 flex items-center justify-between">
                      <Button
                        disabled
                        style={{ backgroundColor: customHex }}
                        className="h-9.5 px-5 text-xs font-semibold text-white shadow-xs"
                      >
                        {t("Kirim Tanggapan", "Submit Form")}
                      </Button>
                      <span className="text-[10px] text-muted-foreground">Powered by Cubiqlo Forms</span>
                    </div>
                  </div>
                </div>

                {/* Floating Undo/Redo Widget in Canvas Area (Right Side) */}
                <div
                  className={`fixed bottom-6 z-30 flex items-center gap-1 rounded-xl border border-border/80 bg-background/95 backdrop-blur-md p-1 shadow-lg transition-all duration-200 ${
                    propertiesOpen ? "right-[300px] sm:right-[340px]" : "right-6"
                  }`}
                >
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 rounded-lg hover:bg-muted"
                    onClick={undo}
                    disabled={!canUndo}
                    title={t("Urungkan (Undo)", "Undo")}
                  >
                    <Undo2 className="h-4 w-4 text-foreground" />
                  </Button>
                  <div className="h-4 w-px bg-border/80" />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 rounded-lg hover:bg-muted"
                    onClick={redo}
                    disabled={!canRedo}
                    title={t("Ulangi (Redo)", "Redo")}
                  >
                    <Redo2 className="h-4 w-4 text-foreground" />
                  </Button>
                </div>
              </main>

              {/* PANEL KANAN: Field Properties Drawer (Sticky & Independent Scroll) */}
              {propertiesOpen && (
                <aside className="w-72 sm:w-80 h-full border-l border-border/80 bg-background flex flex-col shrink-0 z-10 animate-in slide-in-from-right-4 duration-150 overflow-hidden">
                  <div className="p-3.5 border-b border-border/60 flex items-center justify-between shrink-0">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                      <Settings className="h-3.5 w-3.5 text-primary" />
                      <span>{t("Properti Elemen", "Field Properties")}</span>
                    </h4>
                    <div className="flex items-center gap-1">
                      {selectedField && (
                        <Badge variant="secondary" className="text-[9px] uppercase font-bold py-0 mr-1">
                          {selectedField.type}
                        </Badge>
                      )}
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => setPropertiesOpen(false)}
                        className="h-6 w-6 rounded-md text-muted-foreground hover:text-foreground"
                        title={t("Tutup Panel", "Close Panel")}
                      >
                        <X className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>

                  <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
                    {selectedField ? (
                      <div className="space-y-4">
                        {/* Grid Column Layout (Shrink / Full) */}
                        {selectedField.type !== "page_break" && (
                          <div className="space-y-1.5">
                            <Label className="text-xs font-medium flex items-center justify-between">
                              <span>{t("Lebar Kolom", "Column Width")}</span>
                              <Badge variant="outline" className="text-[9px] font-mono">
                                {selectedField.colSpan === "half" ? t("50% (2 Kolom)", "50% Shrink") : t("100% (Penuh)", "100% Full")}
                              </Badge>
                            </Label>
                            <div className="grid grid-cols-2 gap-2">
                              <button
                                type="button"
                                onClick={() => updateSelectedField({ colSpan: "full" })}
                                className={`p-2 rounded-lg border text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
                                  selectedField.colSpan !== "half"
                                    ? "border-primary bg-primary/10 text-primary"
                                    : "border-border/70 hover:border-border text-muted-foreground"
                                }`}
                              >
                                <Square className="h-3.5 w-3.5" />
                                <span>100% Full</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => updateSelectedField({ colSpan: "half" })}
                                className={`p-2 rounded-lg border text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
                                  selectedField.colSpan === "half"
                                    ? "border-primary bg-primary/10 text-primary"
                                    : "border-border/70 hover:border-border text-muted-foreground"
                                }`}
                              >
                                <Columns className="h-3.5 w-3.5" />
                                <span>50% Shrink</span>
                              </button>
                            </div>
                          </div>
                        )}

                        {/* Field Label */}
                        <div className="space-y-1.5">
                          <Label className="text-xs font-medium">{t("Label Pertanyaan / Judul", "Question Label / Heading")}</Label>
                          <Input
                            value={selectedField.label}
                            onChange={(e) => updateSelectedField({ label: e.target.value })}
                            className="h-8.5 text-xs"
                          />
                        </div>

                        {/* Field Sublabel / Description */}
                        {selectedField.type !== "divider" && selectedField.type !== "page_break" && (
                          <div className="space-y-1.5">
                            <Label className="text-xs font-medium">{t("Sublabel / Petunjuk", "Sublabel / Help Text")}</Label>
                            <Input
                              value={selectedField.sublabel || ""}
                              onChange={(e) => updateSelectedField({ sublabel: e.target.value })}
                              placeholder={t("Petunjuk tambahan...", "Additional instructions...")}
                              className="h-8.5 text-xs"
                            />
                          </div>
                        )}

                        {/* Content Text (For Info / Terms) */}
                        {(selectedField.type === "info" || selectedField.type === "terms") && (
                          <div className="space-y-1.5">
                            <Label className="text-xs font-medium">{t("Isi Teks / Penjelasan", "Content / Description")}</Label>
                            <Textarea
                              value={selectedField.content || ""}
                              onChange={(e) => updateSelectedField({ content: e.target.value })}
                              rows={3}
                              className="text-xs"
                            />
                          </div>
                        )}

                        {/* Placeholder (if applicable) */}
                        {selectedField.type !== "heading" &&
                          selectedField.type !== "divider" &&
                          selectedField.type !== "page_break" &&
                          selectedField.type !== "info" &&
                          selectedField.type !== "terms" &&
                          selectedField.type !== "rating" &&
                          selectedField.type !== "signature" && (
                            <div className="space-y-1.5">
                              <Label className="text-xs font-medium">Placeholder</Label>
                              <Input
                                value={selectedField.placeholder || ""}
                                onChange={(e) => updateSelectedField({ placeholder: e.target.value })}
                                placeholder={t("Teks placeholder...", "Placeholder text...")}
                                className="h-8.5 text-xs"
                              />
                            </div>
                          )}

                        {/* Required Switch */}
                        {selectedField.type !== "heading" &&
                          selectedField.type !== "divider" &&
                          selectedField.type !== "page_break" &&
                          selectedField.type !== "info" && (
                            <div className="flex items-center justify-between rounded-lg border p-2.5 bg-muted/10">
                              <div>
                                <p className="text-xs font-medium">{t("Wajib Diisi (Required)", "Required Field")}</p>
                                <p className="text-[10px] text-muted-foreground">{t("Klien tidak bisa submit jika kosong", "Respondents cannot submit if left blank")}</p>
                              </div>
                              <Checkbox
                                checked={selectedField.required}
                                onCheckedChange={(checked) => updateSelectedField({ required: Boolean(checked) })}
                              />
                            </div>
                          )}

                        {/* Typography & Font Styling */}
                        <div className="space-y-2 pt-2 border-t border-border/60">
                          <Label className="text-xs font-medium">{t("Gaya Font", "Font Family")}</Label>
                          <Select
                            value={selectedField.fontFamily || "inter"}
                            onValueChange={(val) => updateSelectedField({ fontFamily: val })}
                          >
                            <SelectTrigger className="h-8.5 text-xs bg-background">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {CUBIQLO_FONTS.map((font) => (
                                <SelectItem key={font.id} value={font.id} style={{ fontFamily: font.fontFamily }}>
                                  {font.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="space-y-1.5 pt-1">
                          <Label className="text-xs font-medium">{t("Ukuran Teks", "Font Size")}</Label>
                          <div className="grid grid-cols-4 gap-1">
                            {(["sm", "base", "lg", "xl"] as const).map((sz) => (
                              <button
                                key={sz}
                                type="button"
                                onClick={() => updateSelectedField({ fontSize: sz })}
                                className={`py-1 text-xs font-bold rounded-md border transition-all ${
                                  (selectedField.fontSize || "base") === sz
                                    ? "bg-primary text-primary-foreground border-primary"
                                    : "bg-background text-muted-foreground hover:bg-muted/50 border-border/70"
                                }`}
                              >
                                {sz.toUpperCase()}
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* Text Styles: Bold, Italic, Underline, Strikethrough */}
                        <div className="space-y-1.5 pt-1">
                          <Label className="text-xs font-medium">{t("Gaya Penulisan Teks", "Text Formatting")}</Label>
                          <div className="grid grid-cols-4 gap-1 rounded-lg border border-border/70 bg-background p-0.5">
                            <button
                              type="button"
                              onClick={() => updateSelectedField({ bold: !selectedField.bold })}
                              className={`py-1 text-xs rounded font-bold transition-colors flex items-center justify-center ${
                                selectedField.bold ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted/50"
                              }`}
                              title="Bold"
                            >
                              <Bold className="h-3.5 w-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => updateSelectedField({ italic: !selectedField.italic })}
                              className={`py-1 text-xs rounded font-bold transition-colors flex items-center justify-center ${
                                selectedField.italic ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted/50"
                              }`}
                              title="Italic"
                            >
                              <Italic className="h-3.5 w-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => updateSelectedField({ underline: !selectedField.underline })}
                              className={`py-1 text-xs rounded font-bold transition-colors flex items-center justify-center ${
                                selectedField.underline ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted/50"
                              }`}
                              title="Underline"
                            >
                              <Underline className="h-3.5 w-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => updateSelectedField({ strikethrough: !selectedField.strikethrough })}
                              className={`py-1 text-xs rounded font-bold transition-colors flex items-center justify-center ${
                                selectedField.strikethrough ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted/50"
                              }`}
                              title="Strikethrough"
                            >
                              <Strikethrough className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </div>

                        {/* Alignment setting */}
                        <div className="space-y-1.5 pt-2 border-t border-border/60">
                          <Label className="text-xs font-medium">{t("Perataan Teks", "Text Alignment")}</Label>
                          <div className="grid grid-cols-3 gap-1 rounded-lg border border-border/70 bg-background p-0.5">
                            {(["left", "center", "right"] as const).map((al) => (
                              <button
                                key={al}
                                type="button"
                                onClick={() => updateSelectedField({ align: al })}
                                className={`py-1 text-xs capitalize rounded font-medium transition-colors ${
                                  (selectedField.align || "left") === al
                                    ? "bg-primary text-primary-foreground font-bold"
                                    : "text-muted-foreground hover:bg-muted/50"
                                }`}
                              >
                                {al}
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* Rating Scale Max setting */}
                        {selectedField.type === "rating" && (
                          <div className="space-y-1.5 pt-2 border-t border-border/60">
                            <Label className="text-xs font-medium">{t("Skala Bintang Maksimal", "Maximum Star Scale")}</Label>
                            <Select
                              value={String(selectedField.maxRating || 5)}
                              onValueChange={(val) => updateSelectedField({ maxRating: Number(val) })}
                            >
                              <SelectTrigger className="h-8.5 text-xs">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="5">5 {t("Bintang (Standar)", "Stars (Standard)")}</SelectItem>
                                <SelectItem value="10">10 {t("Bintang (NPS Scale)", "Stars (NPS Scale)")}</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        )}

                        {/* Logo Settings */}
                        {selectedField.type === "logo" && (
                          <div className="space-y-3 pt-2 border-t border-border/60">
                            <div className="space-y-1">
                              <Label className="text-xs font-medium">{t("Posisi Logo", "Logo Alignment")}</Label>
                              <div className="grid grid-cols-3 gap-1 rounded-lg border border-border/70 bg-background p-0.5">
                                {(["left", "center", "right"] as const).map((al) => (
                                  <button
                                    key={al}
                                    type="button"
                                    onClick={() => updateSelectedField({ align: al })}
                                    className={`py-1 text-xs capitalize rounded font-medium transition-colors ${
                                      (selectedField.align || "left") === al
                                        ? "bg-primary text-primary-foreground font-bold"
                                        : "text-muted-foreground hover:bg-muted/50"
                                    }`}
                                  >
                                    {al}
                                  </button>
                                ))}
                              </div>
                            </div>

                            <div className="space-y-1">
                              <Label className="text-xs font-medium">{t("Ukuran Logo", "Logo Size")}</Label>
                              <div className="grid grid-cols-3 gap-1 rounded-lg border border-border/70 bg-background p-0.5">
                                {(["sm", "md", "lg"] as const).map((sz) => (
                                  <button
                                    key={sz}
                                    type="button"
                                    onClick={() => updateSelectedField({ logoSize: sz })}
                                    className={`py-1 text-xs uppercase rounded font-medium transition-colors ${
                                      (selectedField.logoSize || "md") === sz
                                        ? "bg-primary text-primary-foreground font-bold"
                                        : "text-muted-foreground hover:bg-muted/50"
                                    }`}
                                  >
                                    {sz}
                                  </button>
                                ))}
                              </div>
                            </div>

                            <div className="space-y-1">
                              <Label className="text-xs font-medium">{t("Kustom Logo URL (Opsional)", "Custom Logo URL (Optional)")}</Label>
                              <Input
                                value={selectedField.src || ""}
                                onChange={(e) => updateSelectedField({ src: e.target.value })}
                                placeholder={`/api/public/workspace-logo/${workspaceId}`}
                                className="h-8.5 text-xs font-mono"
                              />
                              <p className="text-[10px] text-muted-foreground">{t("Kosongkan untuk otomatis menggunakan Logo Workspace.", "Leave empty to automatically use Workspace Logo.")}</p>
                            </div>
                          </div>
                        )}

                        {/* Image Choice Settings with Add / Edit / Remove Rows & Direct Image Upload */}
                        {selectedField.type === "image_choice" && (
                          <div className="space-y-3 pt-2 border-t border-border/60">
                            <div className="flex items-center justify-between">
                              <Label className="text-xs font-medium">{t("Pilihan Kartu Gambar", "Image Card Options")}</Label>
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  const current = selectedField.imageOptions || [];
                                  const newOpt = {
                                    label: `${t("Opsi Gambar", "Image Option")} ${current.length + 1}`,
                                    imageUrl: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=400&q=80",
                                  };
                                  updateSelectedField({ imageOptions: [...current, newOpt] });
                                }}
                                className="h-6 px-2 text-xs text-primary hover:bg-primary/10 font-bold"
                              >
                                <Plus className="h-3 w-3 mr-1" />
                                {t("Tambah Kartu", "Add Card")}
                              </Button>
                            </div>

                            <div className="space-y-2.5">
                              {(selectedField.imageOptions || []).map((opt, idx) => (
                                <div key={idx} className="p-2.5 rounded-xl border border-border/70 bg-muted/10 space-y-2 relative group">
                                  <div className="flex items-center justify-between gap-1.5">
                                    <Input
                                      value={opt.label}
                                      onChange={(e) => {
                                        const current = [...(selectedField.imageOptions || [])];
                                        current[idx] = { ...current[idx], label: e.target.value };
                                        updateSelectedField({ imageOptions: current });
                                      }}
                                      placeholder={t("Label Kartu...", "Card Label...")}
                                      className="h-7 text-xs bg-background flex-1"
                                    />
                                    <Button
                                      type="button"
                                      variant="ghost"
                                      size="icon"
                                      onClick={() => {
                                        const current = [...(selectedField.imageOptions || [])];
                                        if (current.length <= 1) {
                                          toast.error(t("Minimal harus ada 1 kartu", "At least 1 card required"));
                                          return;
                                        }
                                        current.splice(idx, 1);
                                        updateSelectedField({ imageOptions: current });
                                      }}
                                      className="h-6 w-6 text-muted-foreground hover:text-destructive shrink-0"
                                      title={t("Hapus kartu ini", "Delete card")}
                                    >
                                      <X className="h-3.5 w-3.5" />
                                    </Button>
                                  </div>

                                  {/* Thumbnail Preview & File Upload */}
                                  <div className="flex items-center gap-2">
                                    <div className="h-12 w-12 rounded-lg border border-border/70 overflow-hidden shrink-0 bg-muted flex items-center justify-center relative">
                                      {opt.imageUrl ? (
                                        <img src={opt.imageUrl} alt={opt.label} className="h-full w-full object-cover" />
                                      ) : (
                                        <ImageIcon className="h-5 w-5 text-muted-foreground" />
                                      )}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                      <label className="flex items-center justify-center gap-1.5 h-8 px-2.5 rounded-lg border border-border/80 bg-background hover:bg-muted/50 text-xs font-semibold text-foreground cursor-pointer transition-colors w-full">
                                        <Upload className="h-3.5 w-3.5 text-primary" />
                                        <span>{t("Upload Gambar", "Upload Image")}</span>
                                        <input
                                          type="file"
                                          accept="image/*"
                                          className="hidden"
                                          onChange={async (e) => {
                                            const file = e.target.files?.[0];
                                            if (!file) return;
                                            try {
                                              const fd = new FormData();
                                              fd.append("file", file);
                                              const res = await fetch("/api/upload", {
                                                method: "POST",
                                                body: fd,
                                              });
                                              const json = await res.json();
                                              if (json.url) {
                                                const current = [...(selectedField.imageOptions || [])];
                                                current[idx] = { ...current[idx], imageUrl: json.url };
                                                updateSelectedField({ imageOptions: current });
                                                toast.success(t("Gambar berhasil diupload", "Image uploaded successfully"));
                                              } else {
                                                toast.error(json.error || t("Gagal upload gambar", "Failed to upload image"));
                                              }
                                            } catch {
                                              toast.error(t("Gagal upload gambar", "Failed to upload image"));
                                            }
                                          }}
                                        />
                                      </label>
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Matrix Table Settings with Interactive Add/Remove for Rows & Cols */}
                        {selectedField.type === "matrix" && (
                          <div className="space-y-4 pt-2 border-t border-border/60">
                            {/* Matrix Rows (Aspects) */}
                            <div className="space-y-2">
                              <div className="flex items-center justify-between">
                                <Label className="text-xs font-medium">{t("Baris Evaluasi (Aspek)", "Evaluation Rows (Aspects)")}</Label>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => {
                                    const current = selectedField.matrixRows || [];
                                    const newRow = `${t("Aspek", "Aspect")} ${current.length + 1}`;
                                    updateSelectedField({ matrixRows: [...current, newRow] });
                                  }}
                                  className="h-6 px-2 text-xs text-primary hover:bg-primary/10 font-bold"
                                >
                                  <Plus className="h-3 w-3 mr-1" />
                                  {t("Tambah Baris", "Add Row")}
                                </Button>
                              </div>
                              <div className="space-y-1.5">
                                {(selectedField.matrixRows || []).map((row, rIdx) => (
                                  <div key={rIdx} className="flex items-center gap-1.5">
                                    <span className="text-[10px] text-muted-foreground font-mono w-4 shrink-0 text-center">
                                      {rIdx + 1}.
                                    </span>
                                    <Input
                                      value={row}
                                      onChange={(e) => {
                                        const current = [...(selectedField.matrixRows || [])];
                                        current[rIdx] = e.target.value;
                                        updateSelectedField({ matrixRows: current });
                                      }}
                                      placeholder={`Aspek ${rIdx + 1}`}
                                      className="h-7.5 text-xs bg-background flex-1"
                                    />
                                    <Button
                                      type="button"
                                      variant="ghost"
                                      size="icon"
                                      onClick={() => {
                                        const current = [...(selectedField.matrixRows || [])];
                                        if (current.length <= 1) {
                                          toast.error(t("Minimal harus ada 1 baris", "At least 1 row required"));
                                          return;
                                        }
                                        current.splice(rIdx, 1);
                                        updateSelectedField({ matrixRows: current });
                                      }}
                                      className="h-6 w-6 text-muted-foreground hover:text-destructive shrink-0"
                                    >
                                      <X className="h-3.5 w-3.5" />
                                    </Button>
                                  </div>
                                ))}
                              </div>
                            </div>

                            {/* Matrix Columns (Rating Scale) */}
                            <div className="space-y-2 pt-2 border-t border-dashed border-border/60">
                              <div className="flex items-center justify-between">
                                <Label className="text-xs font-medium">{t("Kolom Skala Nilai", "Rating Scale Columns")}</Label>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => {
                                    const current = selectedField.matrixCols || [];
                                    const newCol = `${t("Nilai", "Score")} ${current.length + 1}`;
                                    updateSelectedField({ matrixCols: [...current, newCol] });
                                  }}
                                  className="h-6 px-2 text-xs text-primary hover:bg-primary/10 font-bold"
                                >
                                  <Plus className="h-3 w-3 mr-1" />
                                  {t("Tambah Kolom", "Add Col")}
                                </Button>
                              </div>
                              <div className="space-y-1.5">
                                {(selectedField.matrixCols || []).map((col, cIdx) => (
                                  <div key={cIdx} className="flex items-center gap-1.5">
                                    <span className="text-[10px] text-muted-foreground font-mono w-4 shrink-0 text-center">
                                      {cIdx + 1}.
                                    </span>
                                    <Input
                                      value={col}
                                      onChange={(e) => {
                                        const current = [...(selectedField.matrixCols || [])];
                                        current[cIdx] = e.target.value;
                                        updateSelectedField({ matrixCols: current });
                                      }}
                                      placeholder={`Skala ${cIdx + 1}`}
                                      className="h-7.5 text-xs bg-background flex-1"
                                    />
                                    <Button
                                      type="button"
                                      variant="ghost"
                                      size="icon"
                                      onClick={() => {
                                        const current = [...(selectedField.matrixCols || [])];
                                        if (current.length <= 1) {
                                          toast.error(t("Minimal harus ada 1 kolom", "At least 1 column required"));
                                          return;
                                        }
                                        current.splice(cIdx, 1);
                                        updateSelectedField({ matrixCols: current });
                                      }}
                                      className="h-6 w-6 text-muted-foreground hover:text-destructive shrink-0"
                                    >
                                      <X className="h-3.5 w-3.5" />
                                    </Button>
                                  </div>
                                ))}
                              </div>
                            </div>
                          </div>
                        )}

                        {/* Options Editor for Select & Multiselect */}
                        {(selectedField.type === "select" || selectedField.type === "multiselect") && (
                          <div className="space-y-3 pt-2 border-t border-border/60">
                            <div className="flex items-center justify-between">
                              <Label className="text-xs font-medium">{t("Daftar Pilihan Opsi", "Choice Options List")}</Label>
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  const current = selectedField.options || [];
                                  const newOpt = `${t("Pilihan", "Option")} ${current.length + 1}`;
                                  updateSelectedField({ options: [...current, newOpt] });
                                }}
                                className="h-6 px-2 text-xs text-primary hover:bg-primary/10 font-bold"
                              >
                                <Plus className="h-3 w-3 mr-1" />
                                {t("Tambah Opsi", "Add Option")}
                              </Button>
                            </div>

                            <div className="space-y-1.5">
                              {(selectedField.options && selectedField.options.length > 0
                                ? selectedField.options
                                : [t("Pilihan 1", "Option 1"), t("Pilihan 2", "Option 2")]
                              ).map((opt, idx) => (
                                <div key={idx} className="flex items-center gap-1.5">
                                  <span className="text-[10px] text-muted-foreground font-mono w-4 shrink-0 text-center">
                                    {idx + 1}.
                                  </span>
                                  <Input
                                    value={opt}
                                    onChange={(e) => {
                                      const current = [...(selectedField.options || [t("Pilihan 1", "Option 1"), t("Pilihan 2", "Option 2")])];
                                      current[idx] = e.target.value;
                                      updateSelectedField({ options: current });
                                    }}
                                    placeholder={`${t("Opsi", "Option")} ${idx + 1}`}
                                    className="h-8 text-xs bg-background flex-1"
                                  />
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => {
                                      const current = [...(selectedField.options || [])];
                                      if (current.length <= 1) {
                                        toast.error(t("Minimal harus ada 1 opsi", "At least 1 option required"));
                                        return;
                                      }
                                      current.splice(idx, 1);
                                      updateSelectedField({ options: current });
                                    }}
                                    className="h-7 w-7 text-muted-foreground hover:text-destructive shrink-0"
                                    title={t("Hapus opsi ini", "Delete option")}
                                  >
                                    <X className="h-3.5 w-3.5" />
                                  </Button>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* File Upload Settings */}
                        {selectedField.type === "file" && (
                          <div className="space-y-1.5 pt-2 border-t border-border/60">
                            <Label className="text-xs font-medium">Tipe File Diterima</Label>
                            <Input
                              value={selectedField.acceptFiles || ""}
                              onChange={(e) => updateSelectedField({ acceptFiles: e.target.value })}
                              placeholder=".pdf,.doc,.docx,.png,.zip"
                              className="h-8.5 text-xs"
                            />
                          </div>
                        )}

                        {/* Quick Delete */}
                        <div className="pt-3 border-t border-border/60">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => handleDeleteField(selectedField.id)}
                            className="w-full h-8 text-xs text-destructive hover:bg-destructive/10 border-destructive/30"
                          >
                            <Trash2 className="h-3.5 w-3.5 mr-1.5" />
                            {t("Hapus Elemen Ini", "Delete This Element")}
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div className="py-12 text-center text-muted-foreground">
                        <Sliders className="h-8 w-8 mx-auto mb-2 opacity-40" />
                        <p className="text-xs">{t("Klik salah satu pertanyaan di canvas untuk mengedit pengaturannya.", "Click any field on the canvas to configure its settings.")}</p>
                      </div>
                    )}
                  </div>
                </aside>
              )}
            </>
          )}
        </div>
      )}

      {/* ─── TAB CONTENT: SETTINGS ─── */}
      {activeTab === "settings" && (
        <div className="flex-1 overflow-y-auto p-4 sm:p-8 md:p-12 flex justify-center custom-scrollbar">
          <div className="w-full max-w-2xl space-y-6">
            {/* General Information Card */}
            <div className="rounded-2xl border border-border/80 bg-background p-5 sm:p-7 space-y-4 shadow-sm">
              <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                <Settings className="h-4 w-4 text-primary" />
                <span>{t("Pengaturan Formulir", "Form Settings")}</span>
              </h3>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">{t("Nama Formulir", "Form Name")}</Label>
                <Input value={name} onChange={(e) => setName(e.target.value)} className="h-9 text-xs sm:text-sm" />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">{t("Deskripsi & Petunjuk", "Description & Instructions")}</Label>
                <Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} className="text-xs" />
              </div>
            </div>

            {/* Access & Status Controls */}
            <div className="rounded-2xl border border-border/80 bg-background p-5 sm:p-7 space-y-4 shadow-sm">
              <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                <Lock className="h-4 w-4 text-amber-500" />
                <span>{t("Batas Waktu, Kuota & Status Akses", "Expiration, Quota & Access Limits")}</span>
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold flex items-center gap-1.5">
                    <Calendar className="h-3.5 w-3.5 text-primary" />
                    <span>{t("Tanggal Kedaluwarsa (Auto-Close)", "Form Expiration Date")}</span>
                  </Label>
                  <Input
                    type="datetime-local"
                    value={expiresAt}
                    onChange={(e) => setExpiresAt(e.target.value)}
                    className="h-9 text-xs"
                  />
                  <p className="text-[10px] text-muted-foreground">
                    {t("Formulir akan otomatis ditutup setelah tanggal & jam ini terlewati.", "Form automatically closes and stops accepting entries after this date.")}
                  </p>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold flex items-center gap-1.5">
                    <Hash className="h-3.5 w-3.5 text-primary" />
                    <span>{t("Batas Maksimal Respon", "Max Responses Limit")}</span>
                  </Label>
                  <Input
                    type="number"
                    min="1"
                    value={maxResponses}
                    onChange={(e) => setMaxResponses(e.target.value)}
                    placeholder={t("Misal: 50 (Kosong = Tak Terbatas)", "e.g., 50 (Empty = Unlimited)")}
                    className="h-9 text-xs"
                  />
                  <p className="text-[10px] text-muted-foreground">
                    {t("Otomatis ditutup jika jumlah pengisi sudah mencapai kuota.", "Auto-closes when response count reaches this limit.")}
                  </p>
                </div>
              </div>

              {/* Global Require All Toggle */}
              <div className="flex items-center justify-between rounded-xl border p-3 bg-muted/10">
                <div>
                  <p className="text-xs font-semibold">{t("Wajibkan Semua Pertanyaan (Require All)", "Require All Form Questions")}</p>
                  <p className="text-[10px] text-muted-foreground">
                    {t("Aktifkan untuk mewajibkan responden mengisi semua kolom pertanyaan", "Make all questions strictly required to submit")}
                  </p>
                </div>
                <Checkbox
                  checked={requireAll}
                  onCheckedChange={(checked) => {
                    const isReq = Boolean(checked);
                    setRequireAll(isReq);
                    setFields((prev) =>
                      prev.map((f) =>
                        f.type !== "heading" && f.type !== "divider" && f.type !== "info" && f.type !== "page_break"
                          ? { ...f, required: isReq }
                          : f
                      )
                    );
                  }}
                />
              </div>

              <div className="flex items-center justify-between rounded-xl border p-3 bg-muted/10">
                <div>
                  <p className="text-xs font-semibold">{t("Status Formulir", "Form Status")}</p>
                  <p className="text-[10px] text-muted-foreground">
                    {formStatus === "active" ? t("Formulir aktif dan menerima tanggapan", "Form is active and accepting responses") : t("Formulir ditutup (tidak menerima pengisian)", "Form is disabled (closed for submissions)")}
                  </p>
                </div>
                <Select value={formStatus} onValueChange={(val: any) => setFormStatus(val)}>
                  <SelectTrigger className="h-8 text-xs w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">🟢 {t("Aktif", "Active")}</SelectItem>
                    <SelectItem value="disabled">🔴 {t("Ditutup", "Closed")}</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5 pt-1">
                <Label className="text-xs font-semibold">{t("Proteksi Password (Opsional)", "Password Protection (Optional)")}</Label>
                <Input
                  type="password"
                  value={passwordProtection}
                  onChange={(e) => setPasswordProtection(e.target.value)}
                  placeholder={t("Biarkan kosong untuk akses publik tanpa password", "Leave empty for public access without password")}
                  className="h-9 text-xs"
                />
                <p className="text-[10px] text-muted-foreground">
                  {t("Jika diisi, responden wajib memasukkan passcode sebelum dapat mengisi form.", "If set, respondents must enter this passcode before accessing the form.")}
                </p>
              </div>
            </div>

            {/* Theme & Styling */}
            <div className="rounded-2xl border border-border/80 bg-background p-5 sm:p-7 space-y-4 shadow-sm">
              <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                <Palette className="h-4 w-4 text-primary" />
                <span>{t("Tema, Warna & Radius Kartu", "Theme, Colors & Card Radius")}</span>
              </h3>
              <p className="text-xs text-muted-foreground">{t("Sesuaikan visual branding dengan identitas agensi dan klien Anda.", "Customize branding visuals to match your agency and client identity.")}</p>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-1">
                {THEME_PRESETS.map((tPreset) => (
                  <button
                    key={tPreset.id}
                    type="button"
                    onClick={() => {
                      setSelectedTheme(tPreset.id);
                      setCustomHex(tPreset.hex);
                    }}
                    className={`p-2.5 rounded-xl border text-left transition-all flex flex-col gap-2 ${
                      selectedTheme === tPreset.id
                        ? "border-primary ring-2 ring-primary/20 bg-muted/20"
                        : "border-border/70 hover:border-border"
                    }`}
                  >
                    <div className={`h-5 w-full rounded-md ${tPreset.bgBtn} flex items-center justify-center`}>
                      {selectedTheme === tPreset.id && <Check className="h-3 w-3 text-white" />}
                    </div>
                    <span className="text-xs font-semibold">{tPreset.name}</span>
                  </button>
                ))}
              </div>

              {/* Card Roundness Switcher */}
              <div className="space-y-2 pt-3 border-t border-border/60">
                <Label className="text-xs font-semibold">{t("Radius Sudut Kartu", "Card Corner Radius")}</Label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setCardRoundness("normal")}
                    className={`p-2 border text-xs font-semibold rounded-md transition-all ${
                      cardRoundness === "normal" ? "border-primary bg-primary/10 text-primary" : "text-muted-foreground"
                    }`}
                  >
                    Normal (6px)
                  </button>
                  <button
                    type="button"
                    onClick={() => setCardRoundness("rounded")}
                    className={`p-2 border text-xs font-semibold rounded-xl transition-all ${
                      cardRoundness === "rounded" ? "border-primary bg-primary/10 text-primary" : "text-muted-foreground"
                    }`}
                  >
                    Rounded (16px)
                  </button>
                  <button
                    type="button"
                    onClick={() => setCardRoundness("soft")}
                    className={`p-2 border text-xs font-semibold rounded-2xl transition-all ${
                      cardRoundness === "soft" ? "border-primary bg-primary/10 text-primary" : "text-muted-foreground"
                    }`}
                  >
                    Soft (24px)
                  </button>
                </div>
              </div>
            </div>

            {/* Thank You Page & Redirect */}
            <div className="rounded-2xl border border-border/80 bg-background p-5 sm:p-7 space-y-4 shadow-sm">
              <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                <FileCheck className="h-4 w-4 text-emerald-500" />
                <span>{t("Aksi Setelah Submit (Thank You Page)", "Post-Submission Action (Thank You Page)")}</span>
              </h3>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">{t("Pesan Terima Kasih", "Thank You Message")}</Label>
                <Textarea
                  value={thankYouMessage}
                  onChange={(e) => setThankYouMessage(e.target.value)}
                  rows={3}
                  className="text-xs"
                />
              </div>

              <div className="space-y-1.5 pt-2">
                <Label className="text-xs font-semibold">{t("URL Pengalihan / Redirect (Opsional)", "Redirect URL (Optional)")}</Label>
                <Input
                  value={redirectUrl}
                  onChange={(e) => setRedirectUrl(e.target.value)}
                  placeholder="https://wa.me/... or https://yourdomain.com"
                  className="h-9 text-xs font-mono"
                />
                <p className="text-[10px] text-muted-foreground">{t("Jika diisi, responden akan otomatis dialihkan ke tautan ini setelah submit.", "If provided, respondents will automatically be redirected to this link after submission.")}</p>
              </div>
            </div>

            {/* SECTION: URL & SLUG SETTINGS */}
            <div className="rounded-2xl border border-border/80 bg-background p-5 sm:p-7 space-y-4 shadow-sm">
              <div>
                <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                  <Globe className="h-4 w-4 text-primary" />
                  <span>{t("Pengaturan URL & Slug", "URL & Slug Settings")}</span>
                </h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {t("Tentukan alamat slug unik untuk tautan formulir publik Anda.", "Define the unique URL slug for your public intake form link.")}
                </p>
              </div>

              <div className="space-y-3 pt-1">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-foreground">
                    {t("Slug URL", "URL Slug")}
                  </Label>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono text-muted-foreground bg-muted px-2.5 py-2 rounded-lg border border-border/60 whitespace-nowrap">
                      https://cubiqlo.com/intake/
                    </span>
                    <Input
                      value={customSlug || (questionnaireId ? `form-${questionnaireId.slice(0, 8)}` : "")}
                      onChange={(e) => setCustomSlug(e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, ""))}
                      disabled={!isPaidPlan}
                      readOnly={!isPaidPlan}
                      placeholder="your-url"
                      className="font-mono text-xs sm:text-sm"
                    />
                  </div>
                  {!isPaidPlan && (
                    <p className="text-xs text-muted-foreground mt-1">
                      {t("Upgrade untuk memakai slug / URL kustom.", "Upgrade to use a custom slug / URL.")}{" "}
                      <a href="/app/billing" className="font-medium text-primary underline">{t("Upgrade Plan", "Upgrade Plan")}</a>
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ─── TAB CONTENT: PUBLISH ─── */}
      {activeTab === "publish" && (
        <UnifiedPublishView
          type="form"
          title={name || "Briefing Form"}
          shareUrl={shareUrl}
          previewUrl={shareUrl}
          embedCode={embedCode}
          hasSaved={Boolean(activeQuestionnaireId)}
        />
      )}
    </div>
  );
}
