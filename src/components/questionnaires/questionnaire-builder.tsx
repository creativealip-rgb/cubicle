"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useAppTransition } from "@/lib/transition-provider";
import { Button } from "@/components/ui/button";
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
  Type,
  AlignLeft,
  Mail,
  Link as LinkIcon,
  Hash,
  Calendar,
  ListFilter,
  CheckSquare,
  Phone,
  Paperclip,
  PenTool,
  Star,
  Heading,
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
  Image as ImageIcon,
  Edit2,
  QrCode,
  MessageCircle,
  Sparkles,
  LayoutTemplate,
} from "lucide-react";
import { toast } from "sonner";
import { createQuestionnaire, updateQuestionnaire } from "@/lib/actions/questionnaires";
import { useT } from "@/lib/i18n-client";
import Link from "next/link";
import { useUnsavedChanges } from "@/lib/use-unsaved-changes";
import type { QuestionnaireField, QuestionnaireFieldType } from "@/lib/questionnaire-schema";

function makeId() {
  return `f_${Math.random().toString(36).slice(2, 10)}`;
}

interface ElementDefinition {
  type: QuestionnaireFieldType;
  label: string;
  description: string;
  icon: React.ElementType;
  category: "basic" | "choice" | "advanced";
  defaultConfig: Partial<QuestionnaireField>;
}

const ELEMENT_CATALOG: ElementDefinition[] = [
  // Basic
  {
    type: "text",
    label: "Short Text",
    description: "Nama, judul, input pendek",
    icon: Type,
    category: "basic",
    defaultConfig: { placeholder: "Jawaban singkat..." },
  },
  {
    type: "textarea",
    label: "Long Text / Paragraph",
    description: "Deskripsi, brief rinci, catatan",
    icon: AlignLeft,
    category: "basic",
    defaultConfig: { placeholder: "Tuliskan jawaban lengkap di sini..." },
  },
  {
    type: "email",
    label: "Email Address",
    description: "Validasi format email klien",
    icon: Mail,
    category: "basic",
    defaultConfig: { placeholder: "contoh@perusahaan.com" },
  },
  {
    type: "phone",
    label: "Phone / WhatsApp",
    description: "Nomor kontak telepon atau WA",
    icon: Phone,
    category: "basic",
    defaultConfig: { placeholder: "+62 812-3456-7890" },
  },
  {
    type: "number",
    label: "Number",
    description: "Angka, jumlah tim, budget",
    icon: Hash,
    category: "basic",
    defaultConfig: { placeholder: "0" },
  },
  {
    type: "date",
    label: "Date Picker",
    description: "Tanggal deadline / mulai",
    icon: Calendar,
    category: "basic",
    defaultConfig: {},
  },
  {
    type: "url",
    label: "Website / URL",
    description: "Tautan referensi atau website",
    icon: LinkIcon,
    category: "basic",
    defaultConfig: { placeholder: "https://example.com" },
  },

  // Choice
  {
    type: "select",
    label: "Single Select (Dropdown)",
    description: "Pilih satu dari beberapa opsi",
    icon: ListFilter,
    category: "choice",
    defaultConfig: { options: ["Opsi 1", "Opsi 2", "Opsi 3"] },
  },
  {
    type: "multiselect",
    label: "Multiple Choice (Checkboxes)",
    description: "Pilih beberapa opsi sekaligus",
    icon: CheckSquare,
    category: "choice",
    defaultConfig: { options: ["Pilihan A", "Pilihan B", "Pilihan C"] },
  },

  // Advanced / Interactive
  {
    type: "file",
    label: "File Upload",
    description: "Klien upload dokumen brief / aset",
    icon: Paperclip,
    category: "advanced",
    defaultConfig: { acceptFiles: ".pdf,.doc,.docx,.png,.jpg,.zip", placeholder: "Upload file brief (PDF, PNG, ZIP)" },
  },
  {
    type: "signature",
    label: "E-Signature",
    description: "Tanda tangan digital langsung",
    icon: PenTool,
    category: "advanced",
    defaultConfig: { placeholder: "Tanda tangan di sini" },
  },
  {
    type: "rating",
    label: "Rating Scale",
    description: "Skala rating 1-5 bintang",
    icon: Star,
    category: "advanced",
    defaultConfig: { maxRating: 5 },
  },
  {
    type: "heading",
    label: "Section Heading",
    description: "Pemisah bagian formulir",
    icon: Heading,
    category: "advanced",
    defaultConfig: { label: "Bagian Baru", sublabel: "Deskripsi atau panduan pengisian bagian ini." },
  },
];

const FORM_TEMPLATES = [
  {
    id: "web-dev",
    title: "Web Development Client Intake",
    description: "Brief lengkap untuk project pembuatan website, landing page, atau web app.",
    fields: [
      { id: makeId(), type: "text" as const, label: "Nama Lengkap / Perusahaan", required: true, placeholder: "PT Contoh Sukses" },
      { id: makeId(), type: "email" as const, label: "Email Bisnis", required: true, placeholder: "contact@contoh.com" },
      { id: makeId(), type: "phone" as const, label: "Nomor WhatsApp", required: true, placeholder: "+62 812-3456-7890" },
      { id: makeId(), type: "select" as const, label: "Tipe Website yang Dibutuhkan", options: ["Company Profile / Landing Page", "E-Commerce / Toko Online", "Custom Web Application", "Redesign Website Lama"], required: true },
      { id: makeId(), type: "textarea" as const, label: "Jelaskan Tujuan & Fitur Utama", required: true, placeholder: "Website untuk meningkatkan penjualan dan branding..." },
      { id: makeId(), type: "url" as const, label: "Website Referensi / Kompetitor", required: false, placeholder: "https://apple.com, https://stripe.com" },
      { id: makeId(), type: "file" as const, label: "Upload Asset / Dokumen Pendukung", acceptFiles: ".pdf,.doc,.docx,.png,.jpg,.zip", required: false },
      { id: makeId(), type: "date" as const, label: "Target Tanggal Peluncuran (Launch Date)", required: false },
    ],
  },
  {
    id: "branding-design",
    title: "Branding & Logo Design Brief",
    description: "Kumpulkan preferensi visual, nilai brand, dan aset dari klien untuk project desain.",
    fields: [
      { id: makeId(), type: "text" as const, label: "Nama Brand / Brand Name", required: true, placeholder: "Cubiqlo Studio" },
      { id: makeId(), type: "text" as const, label: "Tagline atau Slogan (Jika Ada)", required: false, placeholder: "Crafting modern experiences" },
      { id: makeId(), type: "textarea" as const, label: "Ceritakan tentang Brand & Target Audiens Anda", required: true, placeholder: "Target kami adalah profesional muda umur 20-35 tahun..." },
      { id: makeId(), type: "multiselect" as const, label: "Nuansa / Vibe Visual yang Diinginkan", options: ["Modern & Minimalist", "Bold & Energetic", "Luxury & Elegant", "Friendly & Approachable", "Tech / Futuristic"], required: true },
      { id: makeId(), type: "textarea" as const, label: "Warna yang Disukai atau Dihindari", required: false, placeholder: "Suka warna biru navy dan ungu, hindari warna kuning cerah." },
      { id: makeId(), type: "file" as const, label: "Upload Moodboard / Referensi Desain", acceptFiles: ".pdf,.png,.jpg,.zip", required: false },
    ],
  },
  {
    id: "feedback-survey",
    title: "Client Feedback & Satisfaction Survey",
    description: "Survey kepuasan klien setelah project selesai untuk review dan perbaikan layanan.",
    fields: [
      { id: makeId(), type: "text" as const, label: "Nama Klien / Perusahaan", required: true, placeholder: "Budi Santoso" },
      { id: makeId(), type: "rating" as const, label: "Seberapa Puas Anda dengan Hasil Akhir Proyek?", required: true, maxRating: 5 },
      { id: makeId(), type: "rating" as const, label: "Kecepatan Respon & Komunikasi Tim Kami", required: true, maxRating: 5 },
      { id: makeId(), type: "textarea" as const, label: "Apa yang Paling Anda Sukai dari Kolaborasi Ini?", required: false, placeholder: "Hasil desain sangat memuaskan..." },
      { id: makeId(), type: "textarea" as const, label: "Saran atau Hal yang Bisa Kami Tingkatkan?", required: false, placeholder: "Komunikasi estimasi waktu bisa lebih sering..." },
      { id: makeId(), type: "signature" as const, label: "Tanda Tangan Konfirmasi Serah Terima", required: false },
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
}: {
  field: QuestionnaireField;
  isSelected: boolean;
  onSelect: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
  onOpenProperties: () => void;
  onUpdateLabel: (val: string) => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: field.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.35 : 1,
  };

  const isHeading = field.type === "heading";

  return (
    <div
      ref={setNodeRef}
      style={style}
      onClick={onSelect}
      className={`group relative rounded-xl border p-4 sm:p-5 transition-all cursor-pointer ${
        isSelected
          ? "border-primary bg-primary/[0.02] ring-2 ring-primary/20 shadow-xs"
          : "border-border/70 bg-card hover:border-primary/40 hover:shadow-xs"
      }`}
    >
      {/* Top action toolbar */}
      <div
        className={`absolute -top-3.5 right-4 flex items-center gap-1 bg-background border border-border shadow-xs rounded-lg px-1.5 py-0.5 z-10 transition-opacity ${
          isSelected ? "opacity-100" : "opacity-0 group-hover:opacity-100"
        }`}
      >
        <button
          type="button"
          {...attributes}
          {...listeners}
          className="p-1 text-muted-foreground hover:text-foreground cursor-grab active:cursor-grabbing rounded"
          title="Drag untuk geser posisi"
        >
          <GripVertical className="h-3.5 w-3.5" />
        </button>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onOpenProperties();
          }}
          className="p-1 text-muted-foreground hover:text-primary rounded"
          title="Buka Properti"
        >
          <Settings className="h-3.5 w-3.5" />
        </button>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onDuplicate();
          }}
          className="p-1 text-muted-foreground hover:text-primary rounded"
          title="Duplikasi"
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
          title="Hapus"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* Heading Field */}
      {isHeading ? (
        <div className="space-y-1.5 pt-1">
          <input
            type="text"
            value={field.label}
            onChange={(e) => onUpdateLabel(e.target.value)}
            className="w-full text-base sm:text-lg font-bold tracking-tight text-foreground bg-transparent border-none focus:outline-none focus:ring-1 focus:ring-primary rounded px-1"
          />
          {field.sublabel && <p className="text-xs text-muted-foreground px-1">{field.sublabel}</p>}
        </div>
      ) : (
        /* Standard Field Preview */
        <div className="space-y-2">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-1.5 min-w-0 flex-1">
              <input
                type="text"
                value={field.label}
                onChange={(e) => onUpdateLabel(e.target.value)}
                className="text-xs font-semibold text-foreground bg-transparent border-none focus:outline-none focus:ring-1 focus:ring-primary rounded px-1 py-0.5 flex-1"
              />
              {field.required && <span className="text-destructive font-bold text-xs shrink-0">*</span>}
            </div>
            <Badge variant="outline" className="text-[9px] uppercase font-bold tracking-wider py-0 px-1.5 text-muted-foreground shrink-0">
              {field.type}
            </Badge>
          </div>

          {field.sublabel && <p className="text-[11px] text-muted-foreground px-1">{field.sublabel}</p>}

          {field.type === "text" && (
            <Input disabled placeholder={field.placeholder || "Jawaban singkat..."} className="h-9 text-xs bg-muted/20" />
          )}
          {field.type === "textarea" && (
            <Textarea disabled placeholder={field.placeholder || "Tuliskan jawaban lengkap di sini..."} rows={2} className="text-xs bg-muted/20" />
          )}
          {field.type === "email" && (
            <Input disabled placeholder={field.placeholder || "email@domain.com"} className="h-9 text-xs bg-muted/20" />
          )}
          {field.type === "phone" && (
            <Input disabled placeholder={field.placeholder || "+62 812..."} className="h-9 text-xs bg-muted/20" />
          )}
          {field.type === "number" && (
            <Input disabled placeholder={field.placeholder || "0"} type="number" className="h-9 text-xs bg-muted/20" />
          )}
          {field.type === "date" && (
            <Input disabled type="date" className="h-9 text-xs bg-muted/20" />
          )}
          {field.type === "url" && (
            <Input disabled placeholder={field.placeholder || "https://..."} className="h-9 text-xs bg-muted/20" />
          )}
          {field.type === "select" && (
            <Select disabled>
              <SelectTrigger className="h-9 text-xs bg-muted/20">
                <SelectValue placeholder="Pilih salah satu..." />
              </SelectTrigger>
            </Select>
          )}
          {field.type === "multiselect" && (
            <div className="space-y-1.5 pt-1 px-1">
              {(field.options || ["Pilihan 1", "Pilihan 2"]).map((opt, i) => (
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
              <p className="text-xs font-medium text-foreground">Upload file brief atau dokumen</p>
              <p className="text-[10px] text-muted-foreground">{field.acceptFiles || "Format: PDF, PNG, ZIP"}</p>
            </div>
          )}
          {field.type === "signature" && (
            <div className="border border-border/80 rounded-xl p-3 text-center bg-muted/10 h-14 flex items-center justify-center gap-2">
              <PenTool className="h-3.5 w-3.5 text-muted-foreground" />
              <p className="text-[11px] text-muted-foreground italic">Area Tanda Tangan Digital</p>
            </div>
          )}
          {field.type === "rating" && (
            <div className="flex items-center gap-1.5 pt-1 px-1">
              {[1, 2, 3, 4, 5].map((star) => (
                <Star key={star} className="h-4 w-4 text-amber-400 fill-amber-400/20" />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export function QuestionnaireBuilder({
  workspaceId,
  questionnaireId,
  initial,
}: {
  workspaceId: string;
  questionnaireId?: string;
  initial?: { name: string; description: string | null; schema: QuestionnaireField[] };
}) {
  const { t } = useT();
  const router = useRouter();
  const { refresh } = useAppTransition();

  // Navigation tab: "build" | "settings" | "publish"
  const [activeTab, setActiveTab] = useState<"build" | "settings" | "publish">("build");
  const [previewDevice, setPreviewDevice] = useState<"desktop" | "mobile">("desktop");
  const [templateDialogOpen, setTemplateDialogOpen] = useState(!initial && !questionnaireId);

  // Form general state
  const [name, setName] = useState(initial?.name || "");
  const [description, setDescription] = useState(initial?.description || "");
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [selectedTheme, setSelectedTheme] = useState("purple");
  const [thankYouMessage, setThankYouMessage] = useState(
    "Terima kasih! Tanggapan Anda telah berhasil kami terima dan akan segera kami proses.",
  );
  const [redirectUrl, setRedirectUrl] = useState("");

  const [fields, setFields] = useState<QuestionnaireField[]>(
    initial?.schema && initial.schema.length > 0
      ? initial.schema
      : [
          {
            id: makeId(),
            type: "text",
            label: "Nama Lengkap",
            required: true,
            placeholder: "Masukkan nama Anda",
          },
          {
            id: makeId(),
            type: "email",
            label: "Email Bisnis",
            required: true,
            placeholder: "email@perusahaan.com",
          },
        ],
  );

  // Panels visibility: Elements sidebar (left) & Properties drawer (right)
  const [elementsOpen, setElementsOpen] = useState(true);
  const [propertiesOpen, setPropertiesOpen] = useState(true);
  const [selectedFieldId, setSelectedFieldId] = useState<string | null>(fields[0]?.id ?? null);
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
      label: def.type === "heading" ? "Judul Bagian Baru" : `Pertanyaan ${def.label}`,
      sublabel: def.type === "heading" ? "Panduan singkat bagian ini..." : undefined,
      required: def.type !== "heading",
      ...def.defaultConfig,
    };
    setFields((prev) => [...prev, newField]);
    setSelectedFieldId(newField.id);
    setPropertiesOpen(true);
    toast.success(`${def.label} ditambahkan`);
  }

  function handleApplyTemplate(tpl: typeof FORM_TEMPLATES[0]) {
    setName(tpl.title);
    setDescription(tpl.description);
    setFields(tpl.fields);
    setSelectedFieldId(tpl.fields[0]?.id || null);
    setTemplateDialogOpen(false);
    toast.success(`Template ${tpl.title} diterapkan!`);
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
    toast.success("Field diduplikasi");
  }

  function handleDeleteField(fieldId: string) {
    if (fields.length <= 1) {
      toast.error("Formulir harus memiliki minimal 1 field");
      return;
    }
    setFields((prev) => prev.filter((f) => f.id !== fieldId));
    if (selectedFieldId === fieldId) {
      const remaining = fields.filter((f) => f.id !== fieldId);
      setSelectedFieldId(remaining[0]?.id || null);
    }
    toast.success("Field dihapus");
  }

  function updateSelectedField(patch: Partial<QuestionnaireField>) {
    if (!selectedFieldId) return;
    setFields((prev) =>
      prev.map((f) => (f.id === selectedFieldId ? { ...f, ...patch } : f)),
    );
  }

  function handleSave() {
    if (!name.trim()) {
      toast.error(t("Nama formulir wajib diisi", "Form name is required"));
      return;
    }
    if (fields.length === 0) {
      toast.error(t("Formulir harus memiliki minimal 1 field", "At least 1 field is required"));
      return;
    }

    startTransition(async () => {
      try {
        let qId = questionnaireId;
        if (questionnaireId) {
          await updateQuestionnaire(questionnaireId, {
            name: name.trim(),
            description: description.trim() || null,
            schema: fields,
          });
          toast.success(t("Formulir berhasil diperbarui", "Form updated"));
        } else {
          const res = await createQuestionnaire({
            workspaceId,
            name: name.trim(),
            description: description.trim() || null,
            schema: fields,
          });
          qId = res.id;
          toast.success(t("Formulir berhasil dibuat", "Form created"));
        }
        router.push(`/app/questionnaires/${qId}`);
        refresh();
      } catch (err: any) {
        toast.error(err?.message || t("Gagal menyimpan", "Save failed"));
      }
    });
  }

  const shareUrl = questionnaireId ? `https://app.cubiqlo.com/app/questionnaires/${questionnaireId}` : "";
  const embedCode = questionnaireId ? `<iframe src="https://app.cubiqlo.com/app/questionnaires/${questionnaireId}" width="100%" height="700px" frameborder="0" style="border:0;border-radius:12px;"></iframe>` : "";

  return (
    <div className="flex flex-col h-full w-full bg-slate-100/70 dark:bg-zinc-950 overflow-hidden select-none">
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

        {/* Action Right: Templates, Device Switcher, Drawers & Save */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setTemplateDialogOpen(true)}
            className="h-8 gap-1.5 text-xs font-semibold text-primary border-primary/30 hover:bg-primary/5"
          >
            <LayoutTemplate className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Templates</span>
          </Button>

          {activeTab === "build" && (
            <>
              {/* Desktop / Mobile Switcher */}
              <div className="hidden lg:flex items-center bg-muted/60 p-0.5 rounded-lg border border-border/60">
                <button
                  type="button"
                  onClick={() => setPreviewDevice("desktop")}
                  className={`p-1 rounded-md transition-all ${
                    previewDevice === "desktop" ? "bg-background text-foreground shadow-xs" : "text-muted-foreground hover:text-foreground"
                  }`}
                  title="Desktop Preview"
                >
                  <Monitor className="h-3.5 w-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => setPreviewDevice("mobile")}
                  className={`p-1 rounded-md transition-all ${
                    previewDevice === "mobile" ? "bg-background text-foreground shadow-xs" : "text-muted-foreground hover:text-foreground"
                  }`}
                  title="Mobile Preview"
                >
                  <Smartphone className="h-3.5 w-3.5" />
                </button>
              </div>

              <Button
                type="button"
                variant={elementsOpen ? "secondary" : "outline"}
                size="sm"
                onClick={() => setElementsOpen(!elementsOpen)}
                className="h-8 gap-1.5 text-xs font-medium hidden md:inline-flex"
                title="Toggle Element Catalog"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>Elements</span>
              </Button>

              <Button
                type="button"
                variant={propertiesOpen ? "secondary" : "outline"}
                size="sm"
                onClick={() => setPropertiesOpen(!propertiesOpen)}
                className="h-8 gap-1.5 text-xs font-medium hidden md:inline-flex"
                title="Toggle Field Properties"
              >
                <Settings className="h-3.5 w-3.5" />
                <span>Properties</span>
              </Button>
            </>
          )}

          <Button
            type="button"
            size="sm"
            disabled={pending}
            onClick={handleSave}
            className="h-8 gap-1.5 text-xs font-semibold bg-primary text-primary-foreground shadow-xs"
          >
            {pending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
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
                  <h3 className="font-bold text-sm text-foreground">Template Galeri Formulir</h3>
                  <p className="text-xs text-muted-foreground">Pilih template siap pakai atau mulai dari kertas kosong.</p>
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
                        {tpl.fields.length} Kolom
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
                    Gunakan Template
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
                Mulai dari Blank Form
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ─── TAB CONTENT: BUILD ─── */}
      {activeTab === "build" && (
        <div className="flex-1 flex min-h-0 overflow-hidden relative">
          {/* PANEL KIRI: Element Catalog (Collapsible) */}
          {elementsOpen && (
            <aside className="w-60 sm:w-64 border-r border-border/80 bg-background flex flex-col shrink-0 z-10 animate-in slide-in-from-left-4 duration-150">
              <div className="p-3 border-b border-border/60 flex items-center justify-between">
                <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                  <Plus className="h-3.5 w-3.5 text-primary" />
                  <span>Form Elements</span>
                </h4>
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

              <div className="flex-1 overflow-y-auto p-3 space-y-4 custom-scrollbar">
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
                        onClick={() => handleAddField(item)}
                        className="flex items-center gap-2.5 p-2 rounded-lg border border-border/60 bg-muted/20 hover:bg-primary/5 hover:border-primary/40 text-left transition-all group"
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

                {/* Choice Fields */}
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/80 mb-2">
                    Choices & Selection
                  </p>
                  <div className="grid grid-cols-1 gap-1.5">
                    {ELEMENT_CATALOG.filter((e) => e.category === "choice").map((item) => (
                      <button
                        key={item.type}
                        type="button"
                        onClick={() => handleAddField(item)}
                        className="flex items-center gap-2.5 p-2 rounded-lg border border-border/60 bg-muted/20 hover:bg-primary/5 hover:border-primary/40 text-left transition-all group"
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

                {/* Advanced Fields */}
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/80 mb-2">
                    Advanced & Media
                  </p>
                  <div className="grid grid-cols-1 gap-1.5">
                    {ELEMENT_CATALOG.filter((e) => e.category === "advanced").map((item) => (
                      <button
                        key={item.type}
                        type="button"
                        onClick={() => handleAddField(item)}
                        className="flex items-center gap-2.5 p-2 rounded-lg border border-border/60 bg-muted/20 hover:bg-primary/5 hover:border-primary/40 text-left transition-all group"
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
              </div>
            </aside>
          )}

          {/* PANEL TENGAH: Live Form Canvas (Lega & Centered) */}
          <main className="flex-1 overflow-y-auto p-4 sm:p-6 md:p-8 flex justify-center custom-scrollbar">
            <div className={`w-full transition-all duration-200 ${previewDevice === "mobile" ? "max-w-sm" : "max-w-3xl"}`}>
              {/* Form Paper Sheet */}
              <div className="rounded-2xl border border-border/80 bg-background shadow-md p-5 sm:p-8 space-y-6">
                {/* Optional Header Logo Banner */}
                <div className="flex items-center justify-between pb-1">
                  {logoUrl ? (
                    <div className="relative group">
                      <img src={logoUrl} alt="Logo" className="h-10 object-contain rounded" />
                      <button
                        type="button"
                        onClick={() => setLogoUrl(null)}
                        className="absolute -top-2 -right-2 bg-destructive text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                        title="Hapus Logo"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => {
                        const url = window.prompt("Masukkan URL Logo / Gambar:");
                        if (url) setLogoUrl(url);
                      }}
                      className="text-[11px] font-medium text-muted-foreground hover:text-primary flex items-center gap-1.5 py-1 px-2 rounded-lg border border-dashed border-border hover:border-primary/40 transition-all"
                    >
                      <ImageIcon className="h-3.5 w-3.5" />
                      <span>+ Pasang Logo Brand</span>
                    </button>
                  )}
                </div>

                {/* Form Title & Header Area */}
                <div className="space-y-1.5 border-b border-border/60 pb-5">
                  <Input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Judul Formulir..."
                    className="text-xl sm:text-2xl font-extrabold tracking-tight border-none px-0 h-auto focus-visible:ring-0 placeholder:text-muted-foreground/40"
                  />
                  <Textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Tuliskan petunjuk atau deskripsi formulir untuk responden..."
                    rows={2}
                    className="text-xs text-muted-foreground border-none px-0 min-h-[40px] resize-none focus-visible:ring-0 placeholder:text-muted-foreground/40"
                  />
                </div>

                {/* DnD Sortable Field List Canvas */}
                <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                  <SortableContext items={fields.map((f) => f.id)} strategy={verticalListSortingStrategy}>
                    <div className="space-y-3.5">
                      {fields.map((field) => (
                        <SortableCanvasField
                          key={field.id}
                          field={field}
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
                        />
                      ))}
                    </div>
                  </SortableContext>
                </DndContext>

                {/* Add question bottom banner */}
                <div className="pt-2 flex items-center justify-center">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setElementsOpen(true)}
                    className="h-8.5 px-4 text-xs font-semibold gap-2 border-dashed border-primary/40 text-primary hover:bg-primary/5"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    <span>Tambah Pertanyaan Baru</span>
                  </Button>
                </div>

                {/* Submit button preview */}
                <div className="pt-5 border-t border-border/60 flex items-center justify-between">
                  <Button disabled className="h-9.5 px-5 text-xs font-semibold bg-primary text-primary-foreground">
                    Submit Form
                  </Button>
                  <span className="text-[10px] text-muted-foreground">Powered by Cubiqlo Forms</span>
                </div>
              </div>
            </div>
          </main>

          {/* PANEL KANAN: Field Properties Drawer (Collapsible) */}
          {propertiesOpen && (
            <aside className="w-72 sm:w-80 border-l border-border/80 bg-background flex flex-col shrink-0 z-10 animate-in slide-in-from-right-4 duration-150">
              <div className="p-3.5 border-b border-border/60 flex items-center justify-between">
                <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                  <Settings className="h-3.5 w-3.5 text-primary" />
                  <span>Field Properties</span>
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
                    title="Tutup Panel"
                  >
                    <X className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
                {selectedField ? (
                  <div className="space-y-4">
                    {/* Field Label */}
                    <div className="space-y-1.5">
                      <Label className="text-xs font-medium">Question Label / Heading</Label>
                      <Input
                        value={selectedField.label}
                        onChange={(e) => updateSelectedField({ label: e.target.value })}
                        className="h-8.5 text-xs"
                      />
                    </div>

                    {/* Field Sublabel / Description */}
                    <div className="space-y-1.5">
                      <Label className="text-xs font-medium">Sublabel / Help Text</Label>
                      <Input
                        value={selectedField.sublabel || ""}
                        onChange={(e) => updateSelectedField({ sublabel: e.target.value })}
                        placeholder="Petunjuk tambahan..."
                        className="h-8.5 text-xs"
                      />
                    </div>

                    {/* Placeholder (if applicable) */}
                    {selectedField.type !== "heading" &&
                      selectedField.type !== "rating" &&
                      selectedField.type !== "signature" && (
                        <div className="space-y-1.5">
                          <Label className="text-xs font-medium">Placeholder</Label>
                          <Input
                            value={selectedField.placeholder || ""}
                            onChange={(e) => updateSelectedField({ placeholder: e.target.value })}
                            placeholder="Teks placeholder..."
                            className="h-8.5 text-xs"
                          />
                        </div>
                      )}

                    {/* Required Switch */}
                    {selectedField.type !== "heading" && (
                      <div className="flex items-center justify-between rounded-lg border p-2.5 bg-muted/10">
                        <div>
                          <p className="text-xs font-medium">Wajib Diisi (Required)</p>
                          <p className="text-[10px] text-muted-foreground">Klien tidak bisa submit jika kosong</p>
                        </div>
                        <Checkbox
                          checked={selectedField.required}
                          onCheckedChange={(checked) => updateSelectedField({ required: Boolean(checked) })}
                        />
                      </div>
                    )}

                    {/* Options Editor for Select & Multiselect */}
                    {(selectedField.type === "select" || selectedField.type === "multiselect") && (
                      <div className="space-y-2 pt-2 border-t border-border/60">
                        <Label className="text-xs font-medium">Pilihan Opsi (Satu per baris)</Label>
                        <Textarea
                          value={(selectedField.options || []).join("\n")}
                          onChange={(e) =>
                            updateSelectedField({
                              options: e.target.value.split("\n").filter((s) => s.trim().length > 0),
                            })
                          }
                          rows={4}
                          placeholder="Opsi 1&#10;Opsi 2&#10;Opsi 3"
                          className="text-xs font-mono"
                        />
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

                    {/* Conditional Logic Setting */}
                    <div className="space-y-2 pt-2 border-t border-border/60">
                      <div className="flex items-center justify-between">
                        <Label className="text-xs font-medium flex items-center gap-1.5">
                          <Sliders className="h-3.5 w-3.5 text-primary" />
                          <span>Conditional Logic</span>
                        </Label>
                        {selectedField.condition && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => updateSelectedField({ condition: undefined })}
                            className="h-6 px-1.5 text-[10px] text-destructive hover:bg-destructive/10"
                          >
                            Reset
                          </Button>
                        )}
                      </div>

                      {fields.filter((f) => f.id !== selectedField.id && f.type !== "heading").length > 0 ? (
                        <div className="space-y-2 rounded-lg border p-2.5 bg-muted/10">
                          <p className="text-[11px] text-muted-foreground">Tampilkan pertanyaan ini hanya jika:</p>
                          <Select
                            value={selectedField.condition?.fieldId || "none"}
                            onValueChange={(val) => {
                              if (val === "none") {
                                updateSelectedField({ condition: undefined });
                              } else {
                                updateSelectedField({
                                  condition: {
                                    fieldId: val,
                                    operator: "equals",
                                    value: "",
                                  },
                                });
                              }
                            }}
                          >
                            <SelectTrigger className="h-8 text-xs bg-background">
                              <SelectValue placeholder="Pilih pertanyaan pemicu..." />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="none">Tanpa Kondisi (Selalu Tampil)</SelectItem>
                              {fields
                                .filter((f) => f.id !== selectedField.id && f.type !== "heading")
                                .map((f) => (
                                  <SelectItem key={f.id} value={f.id}>
                                    {f.label}
                                  </SelectItem>
                                ))}
                            </SelectContent>
                          </Select>

                          {selectedField.condition && (
                            <div className="space-y-1.5 pt-1">
                              <Label className="text-[10px] text-muted-foreground uppercase font-bold">
                                Nilai yang Cocok (Value Equals):
                              </Label>
                              <Input
                                value={selectedField.condition.value || ""}
                                onChange={(e) =>
                                  updateSelectedField({
                                    condition: {
                                      ...selectedField.condition!,
                                      value: e.target.value,
                                    },
                                  })
                                }
                                placeholder="Misal: Web Development, Ya, dsb."
                                className="h-8 text-xs bg-background"
                              />
                            </div>
                          )}
                        </div>
                      ) : (
                        <p className="text-[10px] text-muted-foreground italic">
                          Tambahkan minimal 2 pertanyaan untuk mengaktifkan conditional logic.
                        </p>
                      )}
                    </div>

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
                        Hapus Pertanyaan Ini
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="py-12 text-center text-muted-foreground">
                    <Sliders className="h-8 w-8 mx-auto mb-2 opacity-40" />
                    <p className="text-xs">Klik salah satu pertanyaan di canvas untuk mengedit pengaturannya.</p>
                  </div>
                )}
              </div>
            </aside>
          )}
        </div>
      )}

      {/* ─── TAB CONTENT: SETTINGS ─── */}
      {activeTab === "settings" && (
        <div className="flex-1 overflow-y-auto p-4 sm:p-8 md:p-12 flex justify-center custom-scrollbar">
          <div className="w-full max-w-2xl space-y-5">
            {/* General Info */}
            <div className="rounded-2xl border border-border/80 bg-background p-5 sm:p-7 space-y-4 shadow-sm">
              <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                <Settings className="h-4 w-4 text-primary" />
                <span>Pengaturan Formulir</span>
              </h3>

              <div className="space-y-1.5">
                <Label className="text-xs font-medium">Nama Formulir</Label>
                <Input value={name} onChange={(e) => setName(e.target.value)} className="h-9 text-xs sm:text-sm" />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-medium">Deskripsi & Petunjuk</Label>
                <Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} className="text-xs" />
              </div>
            </div>

            {/* Theme & Styling */}
            <div className="rounded-2xl border border-border/80 bg-background p-5 sm:p-7 space-y-4 shadow-sm">
              <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                <Palette className="h-4 w-4 text-primary" />
                <span>Tema & Warna Aksen</span>
              </h3>
              <p className="text-xs text-muted-foreground">Pilih warna branding yang cocok dengan identity agensi Anda.</p>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-1">
                {THEME_PRESETS.map((tPreset) => (
                  <button
                    key={tPreset.id}
                    type="button"
                    onClick={() => setSelectedTheme(tPreset.id)}
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
            </div>

            {/* Thank You Page & Redirect */}
            <div className="rounded-2xl border border-border/80 bg-background p-5 sm:p-7 space-y-4 shadow-sm">
              <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                <FileCheck className="h-4 w-4 text-emerald-500" />
                <span>Aksi Setelah Submit (Thank You Page)</span>
              </h3>

              <div className="space-y-1.5">
                <Label className="text-xs font-medium">Pesan Sukses (Thank You Message)</Label>
                <Textarea
                  value={thankYouMessage}
                  onChange={(e) => setThankYouMessage(e.target.value)}
                  rows={3}
                  className="text-xs"
                />
              </div>

              <div className="space-y-1.5 pt-2">
                <Label className="text-xs font-medium">Redirect URL (Opsional)</Label>
                <Input
                  value={redirectUrl}
                  onChange={(e) => setRedirectUrl(e.target.value)}
                  placeholder="https://wa.me/... atau https://website.com"
                  className="h-9 text-xs font-mono"
                />
                <p className="text-[10px] text-muted-foreground">Jika diisi, responden akan langsung diarahkan ke URL ini setelah submit.</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ─── TAB CONTENT: PUBLISH ─── */}
      {activeTab === "publish" && (
        <div className="flex-1 overflow-y-auto p-4 sm:p-8 md:p-12 flex justify-center custom-scrollbar">
          <div className="w-full max-w-2xl space-y-5">
            <div className="rounded-2xl border border-border/80 bg-background p-5 sm:p-7 space-y-4 shadow-sm">
              <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                <Globe className="h-4 w-4 text-primary" />
                <span>Bagikan Formulir</span>
              </h3>

              {questionnaireId ? (
                <div className="space-y-5">
                  <div className="space-y-2">
                    <Label className="text-xs font-semibold">Tautan Langsung (Direct Link)</Label>
                    <div className="flex items-center gap-2">
                      <Input
                        readOnly
                        value={shareUrl}
                        className="h-9.5 text-xs bg-muted/30 font-mono"
                      />
                      <Button
                        type="button"
                        size="sm"
                        onClick={() => {
                          navigator.clipboard.writeText(shareUrl);
                          toast.success("Tautan berhasil disalin!");
                        }}
                        className="h-9.5 px-4 text-xs font-semibold"
                      >
                        Salin Link
                      </Button>
                    </div>
                  </div>

                  {/* WhatsApp Quick Share Button */}
                  <div className="pt-2 flex items-center gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        const text = `Halo, mohon bantu isi formulir brief ${name || "proyek"} melalui tautan berikut:\n${shareUrl}`;
                        window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank");
                      }}
                      className="h-9 gap-1.5 text-xs font-semibold border-emerald-500/40 text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/40"
                    >
                      <MessageCircle className="h-4 w-4" />
                      <span>Bagikan ke WhatsApp</span>
                    </Button>

                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        window.open(
                          `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(shareUrl)}`,
                          "_blank",
                        );
                      }}
                      className="h-9 gap-1.5 text-xs font-semibold"
                    >
                      <QrCode className="h-4 w-4 text-primary" />
                      <span>Lihat QR Code</span>
                    </Button>
                  </div>

                  <div className="space-y-2 pt-3 border-t border-border/60">
                    <Label className="text-xs font-semibold flex items-center gap-1.5">
                      <Code className="h-3.5 w-3.5 text-primary" />
                      <span>Embed Formulir ke Website (iFrame)</span>
                    </Label>
                    <Textarea
                      readOnly
                      value={embedCode}
                      rows={3}
                      className="text-xs font-mono bg-muted/30"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        navigator.clipboard.writeText(embedCode);
                        toast.success("Kode Embed disalin ke clipboard!");
                      }}
                      className="h-8.5 px-3 text-xs"
                    >
                      Salin Kode Embed
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="py-8 text-center space-y-2">
                  <Share2 className="h-8 w-8 mx-auto text-muted-foreground/50" />
                  <p className="text-xs text-muted-foreground">
                    Klik tombol <strong>Simpan</strong> di kanan atas terlebih dahulu untuk menghasilkan link publik dan kode embed.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
