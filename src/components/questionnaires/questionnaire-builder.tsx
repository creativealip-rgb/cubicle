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
  Eye,
  Save,
  Loader2,
  ArrowLeft,
  Share2,
  Sliders,
  FileCheck,
  Palette,
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

// ─── Sortable Field Item Component ───
function SortableCanvasField({
  field,
  isSelected,
  onSelect,
  onDuplicate,
  onDelete,
}: {
  field: QuestionnaireField;
  isSelected: boolean;
  onSelect: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
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
    opacity: isDragging ? 0.4 : 1,
  };

  const isHeading = field.type === "heading";

  return (
    <div
      ref={setNodeRef}
      style={style}
      onClick={onSelect}
      className={`group relative rounded-xl border p-4 transition-all cursor-pointer ${
        isSelected
          ? "border-primary bg-primary/[0.02] ring-2 ring-primary/20 shadow-xs"
          : "border-border/60 bg-card hover:border-border hover:shadow-xs"
      }`}
    >
      {/* Action controls & Drag handle */}
      <div
        className={`absolute -top-3 right-3 flex items-center gap-1 bg-background border border-border shadow-xs rounded-md px-1 py-0.5 z-10 transition-opacity ${
          isSelected ? "opacity-100" : "opacity-0 group-hover:opacity-100"
        }`}
      >
        <button
          type="button"
          {...attributes}
          {...listeners}
          className="p-1 text-muted-foreground hover:text-foreground cursor-grab active:cursor-grabbing"
          title="Drag untuk geser posisi"
        >
          <GripVertical className="h-3 w-3" />
        </button>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onDuplicate();
          }}
          className="p-1 text-muted-foreground hover:text-primary"
          title="Duplikasi"
        >
          <Copy className="h-3 w-3" />
        </button>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onDelete();
          }}
          className="p-1 text-muted-foreground hover:text-destructive"
          title="Hapus"
        >
          <Trash2 className="h-3 w-3" />
        </button>
      </div>

      {/* Heading Field */}
      {isHeading ? (
        <div className="space-y-1">
          <h3 className="text-base font-bold text-foreground">{field.label}</h3>
          {field.sublabel && <p className="text-xs text-muted-foreground">{field.sublabel}</p>}
        </div>
      ) : (
        /* Standard Field Preview */
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-xs font-semibold text-foreground flex items-center gap-1">
              <span>{field.label}</span>
              {field.required && <span className="text-destructive">*</span>}
            </label>
            <Badge variant="outline" className="text-[9px] uppercase font-bold tracking-wider py-0 px-1 text-muted-foreground">
              {field.type}
            </Badge>
          </div>

          {field.sublabel && <p className="text-[11px] text-muted-foreground">{field.sublabel}</p>}

          {field.type === "text" && (
            <Input disabled placeholder={field.placeholder || "Teks singkat..."} className="h-9 text-xs bg-muted/20" />
          )}
          {field.type === "textarea" && (
            <Textarea disabled placeholder={field.placeholder || "Teks panjang..."} rows={3} className="text-xs bg-muted/20" />
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
                <SelectValue placeholder="Pilih opsi..." />
              </SelectTrigger>
            </Select>
          )}
          {field.type === "multiselect" && (
            <div className="space-y-1.5 pt-1">
              {(field.options || ["Pilihan 1", "Pilihan 2"]).map((opt, i) => (
                <div key={i} className="flex items-center gap-2 text-xs text-muted-foreground">
                  <div className="h-4 w-4 rounded border border-border bg-muted/30" />
                  <span>{opt}</span>
                </div>
              ))}
            </div>
          )}
          {field.type === "file" && (
            <div className="border-2 border-dashed border-border/80 rounded-xl p-4 text-center bg-muted/10 space-y-1">
              <Paperclip className="h-5 w-5 mx-auto text-muted-foreground" />
              <p className="text-xs font-medium text-foreground">Upload file brief atau dokumen</p>
              <p className="text-[10px] text-muted-foreground">{field.acceptFiles || "Format: PDF, PNG, ZIP"}</p>
            </div>
          )}
          {field.type === "signature" && (
            <div className="border border-border/80 rounded-xl p-4 text-center bg-muted/10 h-16 flex items-center justify-center gap-2">
              <PenTool className="h-4 w-4 text-muted-foreground" />
              <p className="text-[11px] text-muted-foreground italic">Area Tanda Tangan Digital Klien</p>
            </div>
          )}
          {field.type === "rating" && (
            <div className="flex items-center gap-1.5 pt-1">
              {[1, 2, 3, 4, 5].map((star) => (
                <Star key={star} className="h-5 w-5 text-amber-400 fill-amber-400/20" />
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

  // Form general state
  const [name, setName] = useState(initial?.name || "");
  const [description, setDescription] = useState(initial?.description || "");
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

  // Active selected field for right drawer properties
  const [selectedFieldId, setSelectedFieldId] = useState<string | null>(fields[0]?.id ?? null);
  const [previewOpen, setPreviewOpen] = useState(false);
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
    toast.success(`${def.label} ditambahkan`);
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

  return (
    <div className="flex flex-col h-[calc(100vh-68px)] -m-4 sm:-m-6 bg-slate-50 dark:bg-zinc-950 overflow-hidden">
      {/* ─── Top Jotform Bar: Brand, Tabs, Actions ─── */}
      <header className="h-14 border-b border-border/80 bg-background px-4 flex items-center justify-between shrink-0 z-20">
        <div className="flex items-center gap-3 min-w-0">
          <Button variant="ghost" size="icon" asChild className="h-8 w-8 rounded-lg shrink-0">
            <Link href="/app/questionnaires">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div className="min-w-0">
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t("Nama Formulir...", "Form Name...")}
              className="font-bold text-sm bg-transparent border-none focus:outline-none focus:ring-1 focus:ring-primary rounded px-1.5 py-0.5 max-w-[240px] sm:max-w-xs truncate"
            />
          </div>
        </div>

        {/* 3 Main Workflow Tabs */}
        <div className="flex items-center gap-1 bg-muted/60 p-1 rounded-lg border border-border/60">
          <button
            type="button"
            onClick={() => setActiveTab("build")}
            className={`flex items-center gap-1.5 px-3 py-1 text-xs font-semibold rounded-md transition-all ${
              activeTab === "build"
                ? "bg-background text-foreground shadow-xs"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Sliders className="h-3.5 w-3.5" />
            <span>BUILD</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("settings")}
            className={`flex items-center gap-1.5 px-3 py-1 text-xs font-semibold rounded-md transition-all ${
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
            className={`flex items-center gap-1.5 px-3 py-1 text-xs font-semibold rounded-md transition-all ${
              activeTab === "publish"
                ? "bg-background text-foreground shadow-xs"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Share2 className="h-3.5 w-3.5" />
            <span>PUBLISH</span>
          </button>
        </div>

        {/* Action Right: Preview & Save */}
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setPreviewOpen(!previewOpen)}
            className="h-8 gap-1.5 text-xs font-medium"
          >
            <Eye className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">{previewOpen ? "Tutup Preview" : "Preview"}</span>
          </Button>

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

      {/* ─── TAB CONTENT ─── */}
      {activeTab === "build" && (
        <div className="flex-1 flex min-h-0 overflow-hidden relative">
          {/* PANEL KIRI: Element Catalog */}
          <aside className="w-64 border-r border-border/80 bg-background flex flex-col shrink-0 z-10">
            <div className="p-3 border-b border-border/60">
              <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <Plus className="h-3.5 w-3.5 text-primary" />
                <span>Form Elements</span>
              </h4>
              <p className="text-[11px] text-muted-foreground mt-0.5">Klik untuk menambah atau drag di canvas.</p>
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

          {/* PANEL TENGAH: Live Form Canvas with DnD */}
          <main className="flex-1 overflow-y-auto p-4 sm:p-8 flex justify-center custom-scrollbar bg-slate-100/70 dark:bg-zinc-900/50">
            <div className="w-full max-w-2xl space-y-4">
              {/* Form Paper Container */}
              <div className="rounded-2xl border border-border/80 bg-background shadow-sm p-6 sm:p-8 space-y-6">
                {/* Form Title & Header Area */}
                <div className="space-y-2 border-b border-border/60 pb-5">
                  <Input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Judul Formulir..."
                    className="text-xl sm:text-2xl font-bold border-none px-0 h-auto focus-visible:ring-0 placeholder:text-muted-foreground/50"
                  />
                  <Textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Tuliskan petunjuk atau deskripsi formulir untuk responden..."
                    rows={2}
                    className="text-xs text-muted-foreground border-none px-0 min-h-[50px] resize-none focus-visible:ring-0 placeholder:text-muted-foreground/40"
                  />
                </div>

                {/* DnD Sortable Field List Canvas */}
                <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                  <SortableContext items={fields.map((f) => f.id)} strategy={verticalListSortingStrategy}>
                    <div className="space-y-4">
                      {fields.map((field) => (
                        <SortableCanvasField
                          key={field.id}
                          field={field}
                          isSelected={field.id === selectedFieldId}
                          onSelect={() => setSelectedFieldId(field.id)}
                          onDuplicate={() => handleDuplicateField(field.id)}
                          onDelete={() => handleDeleteField(field.id)}
                        />
                      ))}
                    </div>
                  </SortableContext>
                </DndContext>

                {/* Submit button preview */}
                <div className="pt-4 border-t border-border/60">
                  <Button disabled className="w-full sm:w-auto h-9 text-xs font-semibold bg-primary text-primary-foreground">
                    Submit Form
                  </Button>
                </div>
              </div>
            </div>
          </main>

          {/* PANEL KANAN: Field Properties Drawer */}
          <aside className="w-72 border-l border-border/80 bg-background flex flex-col shrink-0 z-10">
            <div className="p-3 border-b border-border/60 flex items-center justify-between">
              <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <Settings className="h-3.5 w-3.5 text-primary" />
                <span>Properties</span>
              </h4>
              {selectedField && (
                <Badge variant="secondary" className="text-[9px] uppercase font-bold py-0">
                  {selectedField.type}
                </Badge>
              )}
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
                      className="h-8 text-xs"
                    />
                  </div>

                  {/* Field Sublabel / Description */}
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium">Sublabel / Help Text</Label>
                    <Input
                      value={selectedField.sublabel || ""}
                      onChange={(e) => updateSelectedField({ sublabel: e.target.value })}
                      placeholder="Petunjuk tambahan..."
                      className="h-8 text-xs"
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
                          className="h-8 text-xs"
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
                        className="h-8 text-xs"
                      />
                    </div>
                  )}

                  {/* Quick Delete */}
                  <div className="pt-4 border-t border-border/60">
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
        </div>
      )}

      {/* ─── TAB SETTINGS ─── */}
      {activeTab === "settings" && (
        <div className="flex-1 overflow-y-auto p-6 sm:p-10 flex justify-center custom-scrollbar">
          <div className="w-full max-w-2xl space-y-6">
            <div className="rounded-xl border border-border/80 bg-background p-6 space-y-4 shadow-sm">
              <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                <Settings className="h-4 w-4 text-primary" />
                <span>Pengaturan Umum Formulir</span>
              </h3>

              <div className="space-y-1.5">
                <Label className="text-xs font-medium">Nama Formulir</Label>
                <Input value={name} onChange={(e) => setName(e.target.value)} className="h-9 text-sm" />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-medium">Deskripsi & Petunjuk</Label>
                <Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} className="text-xs" />
              </div>
            </div>

            <div className="rounded-xl border border-border/80 bg-background p-6 space-y-4 shadow-sm">
              <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                <FileCheck className="h-4 w-4 text-emerald-500" />
                <span>Halaman Terima Kasih (Thank You Page)</span>
              </h3>
              <p className="text-xs text-muted-foreground">
                Pesan yang ditampilkan ke klien sesaat setelah formulir berhasil dikirim.
              </p>
              <Textarea
                defaultValue="Terima kasih! Tanggapan Anda telah kami terima dan akan segera kami proses."
                rows={3}
                className="text-xs"
              />
            </div>
          </div>
        </div>
      )}

      {/* ─── TAB PUBLISH ─── */}
      {activeTab === "publish" && (
        <div className="flex-1 overflow-y-auto p-6 sm:p-10 flex justify-center custom-scrollbar">
          <div className="w-full max-w-2xl space-y-6">
            <div className="rounded-xl border border-border/80 bg-background p-6 space-y-4 shadow-sm">
              <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                <Share2 className="h-4 w-4 text-primary" />
                <span>Bagikan Formulir ke Klien</span>
              </h3>
              <p className="text-xs text-muted-foreground">
                {questionnaireId
                  ? "Formulir ini dapat langsung dikirim ke klien tertentu dari halaman detail formulir, atau dibagikan tautan intake-nya."
                  : "Simpan formulir terlebih dahulu untuk menghasilkan link publik dan membagikannya ke klien."}
              </p>

              {questionnaireId && (
                <div className="space-y-3 pt-2">
                  <div className="flex items-center gap-2">
                    <Input
                      readOnly
                      value={`https://app.cubiqlo.com/app/questionnaires/${questionnaireId}`}
                      className="h-9 text-xs bg-muted/30 font-mono"
                    />
                    <Button
                      type="button"
                      size="sm"
                      onClick={() => {
                        navigator.clipboard.writeText(`https://app.cubiqlo.com/app/questionnaires/${questionnaireId}`);
                        toast.success("Tautan disalin ke clipboard!");
                      }}
                      className="h-9 px-3 text-xs"
                    >
                      Salin Link
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
