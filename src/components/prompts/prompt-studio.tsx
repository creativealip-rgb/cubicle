"use client";

import { useState } from "react";
import { ChevronDown, Info, Loader2, Monitor, Smartphone, Sparkles, Terminal, TriangleAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { generateVisualPrompt } from "@/lib/actions/visual-prompts";
import { launchPromptCatalog, type PromptCategory, type PromptFieldDefinition, type PromptOptionValue, type PromptTypeId, type OverlapKey, splitOverlapDefaults, nonOverlapFields, displayOption, isOverlapKey } from "@/lib/prompts/catalog";
import { parsePromptResult, type PromptGenerationResult } from "@/lib/prompts/build-prompt";
import { toneOptions, styleOptions, platformOptions, ratioOptions } from "@/lib/prompts/field-options";
import { hasEnteredDetails, validateField } from "@/lib/prompts/prompt-studio-validation";
import { PromptResult } from "./prompt-result";
import { PromptHistoryDrawer, type PromptHistoryItem } from "./prompt-history-drawer";
import { cn } from "@/lib/utils";
import { useT } from "@/lib/i18n-client";
import { toast } from "sonner";

const categories: { id: PromptCategory; label: string; labelEn: string }[] = [
  { id: "social-media", label: "Social Media", labelEn: "Social Media" },
  { id: "ads-promotion", label: "Iklan & Promosi", labelEn: "Ads & Promotion" },
  { id: "product", label: "Produk", labelEn: "Product" },
  { id: "video", label: "Video", labelEn: "Video" },
  { id: "brand-copy", label: "Brand & Copy", labelEn: "Brand & Copy" },
];

type FormState = {
  brand: string; campaign: string; goal: string; audience: string;
  offer: string; tone: string; style: string; platform: string;
  ratio: string; colorPalette: string; notes: string;
  options: Record<string, PromptOptionValue>;
};
const empty: FormState = {
  brand: "", campaign: "", goal: "", audience: "",
  offer: "", tone: "", style: "", platform: "",
  ratio: "", colorPalette: "", notes: "", options: {},
};

const styleRefs: Record<string, { id: string; en: string }> = {
  "Minimal Clean": { id: "Tipografi sans-serif, whitespace luas, warna netral. Cocok: tech, SaaS, skincare.", en: "Sans-serif typography, generous whitespace, neutral colors. Fits: tech, SaaS, skincare." },
  "Luxury Premium": { id: "Tipografi serif, warna gelap/emas, tekstur marmer/velvet. Cocok: fashion, jewelry, hospitality.", en: "Serif typography, dark/gold tones, marble/velvet textures. Fits: fashion, jewelry, hospitality." },
  "Dark Neon": { id: "Background gelap, aksen neon terang, glow effect. Cocok: nightlife, gaming, tech futuristik.", en: "Dark background, bright neon accents, glow effect. Fits: nightlife, gaming, futuristic tech." },
  "Bold & Colorful": { id: "Warna cerah kontras, tipografi tebal, layout dinamis. Cocok: F&B, anak muda, event.", en: "Bright contrasting colors, bold typography, dynamic layout. Fits: F&B, youth, events." },
  "Corporate Professional": { id: "Warna biru/netral, grid rapi, tipografi clean. Cocok: B2B, fintech, konsultan.", en: "Blue/neutral tones, clean grid, clean typography. Fits: B2B, fintech, consulting." },
  "Bright & Fresh": { id: "Warna pastel/cerah, ilustrasi ringan, kesan segar. Cocok: health, food, eco-friendly.", en: "Pastel/bright colors, light illustrations, fresh feel. Fits: health, food, eco-friendly." },
  "Warm & Cozy": { id: "Tone earth/warm, tekstur kayu/kain, pencahayaan lembut. Cocok: home decor, coffee shop, wellness.", en: "Earth/warm tones, wood/fabric textures, soft lighting. Fits: home decor, coffee shop, wellness." },
  "Futuristic Tech": { id: "Gradien holografik, bentuk geometris, efek glassmorphism. Cocok: AI, blockchain, startup.", en: "Holographic gradients, geometric shapes, glassmorphism. Fits: AI, blockchain, startup." },
  "Retro Vintage": { id: "Warna muted/sepia, tipografi klasik, tekstur kertas. Cocok: heritage, artisan, vinyl.", en: "Muted/sepia colors, classic typography, paper texture. Fits: heritage, artisan, vinyl." },
  "Playful Fun": { id: "Bentuk rounded, warna pop, ilustrasi kartun. Cocok: kids, casual food, social app.", en: "Rounded shapes, pop colors, cartoon illustrations. Fits: kids, casual food, social app." },
};

function InfoTip({ text }: { text: string }) {
  return (
    <span className="group relative inline-flex">
      <Info className="h-3.5 w-3.5 text-muted-foreground/60 cursor-help" />
      <span className="pointer-events-none absolute bottom-full left-1/2 z-50 mb-2 w-64 -translate-x-1/2 rounded-lg border bg-popover p-3 text-xs leading-relaxed text-popover-foreground shadow-md opacity-0 transition-opacity group-hover:opacity-100">
        {text}
      </span>
    </span>
  );
}

function PreviewPanel({ selected, form }: { selected: { name: string; nameEn?: string; description: string; descriptionEn?: string }; form: FormState }) {
  const { t, lang } = useT();
  const ratio = form.ratio || "4:5 (Portrait Feed)";
  const style = form.style || "";
  const platform = form.platform || "";
  const ratioNum = ratio.split(" ")[0];
  const [w, h] = ratioNum.split(":").map(Number);
  const aspect = w && h ? w / h : 4 / 5;
  const previewH = Math.min(120, Math.round(100 / aspect));

  return (
    <div className="space-y-2.5">
      <div className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
        <Monitor className="h-3.5 w-3.5" /> {t("Preview", "Preview")}
      </div>
      <div className="flex justify-center">
        <div className="rounded-lg border border-dashed border-muted-foreground/20 bg-muted/30 flex flex-col items-center justify-center gap-1 text-muted-foreground" style={{ width: Math.min(100, previewH * aspect), height: previewH }}>
          <Smartphone className="h-4 w-4 opacity-40" />
          <span className="text-[9px] font-medium">{ratioNum}</span>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-1.5 text-[11px]">
        {style ? (
          <div className="rounded-md bg-muted/50 px-2 py-1">
            <p className="text-[10px] text-muted-foreground">{t("Style", "Style")}</p>
            <p className="font-medium truncate">{style}</p>
          </div>
        ) : null}
        {platform ? (
          <div className="rounded-md bg-muted/50 px-2 py-1">
            <p className="text-[10px] text-muted-foreground">{t("Platform", "Platform")}</p>
            <p className="font-medium truncate">{platform}</p>
          </div>
        ) : null}
        <div className="rounded-md bg-muted/50 px-2 py-1">
          <p className="text-[10px] text-muted-foreground">{t("Rasio", "Ratio")}</p>
          <p className="font-medium truncate">{ratioNum}</p>
        </div>
        {form.tone ? (
          <div className="rounded-md bg-muted/50 px-2 py-1">
            <p className="text-[10px] text-muted-foreground">{t("Tone", "Tone")}</p>
            <p className="font-medium truncate">{form.tone}</p>
          </div>
        ) : null}
      </div>
      <div className="rounded-md border bg-background p-2">
        <p className="text-[11px] font-medium text-foreground">{lang === "en" && selected.nameEn ? selected.nameEn : selected.name}</p>
        <p className="mt-0.5 text-[10px] leading-relaxed text-muted-foreground line-clamp-2">{lang === "en" && selected.descriptionEn ? selected.descriptionEn : selected.description}</p>
      </div>
    </div>
  );
}

/**
 * Validates one field against the catalog schema rules (required, min/max,
 * select membership). Mirrors promptBriefSchema so users see the same rules
 * inline, before submit. Returns null when the field is valid.
 */
function FieldError({ message }: { message: string }) {
  return (
    <p role="alert" className="flex items-center gap-1 text-xs font-medium text-destructive">
      <TriangleAlert className="h-3 w-3 shrink-0" />
      {message}
    </p>
  );
}

export function PromptStudio({ generations, usage }: { generations: PromptHistoryItem[]; usage: { totalInputTokens: number; totalOutputTokens: number; totalCost: number; monthlyCap: number; totalGenerations: number; generationLimit: number } }) {
  const { t, lang } = useT();
  const [category, setCategory] = useState<PromptCategory>("social-media");
  const [typeId, setTypeId] = useState<PromptTypeId>("instagram-feed");
  const [form, setForm] = useState(empty);
  const [result, setResult] = useState<PromptGenerationResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [pendingType, setPendingType] = useState<PromptTypeId | null>(null);
  const [pendingReason, setPendingReason] = useState<"result" | "dirty" | null>(null);
  const [previewOpen, setPreviewOpen] = useState(true);
  const [showTerminal, setShowTerminal] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [attempted, setAttempted] = useState(false);

  const selected = launchPromptCatalog.find((item) => item.id === typeId)!;
  const types = launchPromptCatalog.filter((item) => item.category === category);
  const detailFields = nonOverlapFields(selected.fields);

  // Global form values are the single source of truth for overlap keys
  // (platform, ratio, tone, offer); validation and prompt building resolve
  // type-specific fields from them instead of duplicate inputs.
  const globals = {
    platform: form.platform,
    ratio: form.ratio,
    tone: form.tone,
    offer: form.offer,
  };

  function fieldValue(field: PromptFieldDefinition): PromptOptionValue | undefined {
    if (isOverlapKey(field.key)) {
      const global = globals[field.key as OverlapKey];
      return global || undefined;
    }
    return form.options[field.key];
  }

  function fieldErrors(): Record<string, string> {
    const next: Record<string, string> = {};
    for (const field of selected.fields) {
      const message = validateField(field, fieldValue(field), lang);
      if (message) next[field.key] = message;
    }
    return next;
  }

  const errorsState = attempted ? fieldErrors() : {};
  const valid = Object.keys(fieldErrors()).length === 0;

  function patchField(key: keyof Omit<FormState, "options">, value: string) {
    setForm((current) => ({ ...current, [key]: value }));
  }
  function applyType(next: PromptTypeId) {
    const item = launchPromptCatalog.find((entry) => entry.id === next)!;
    setCategory(item.category);
    setTypeId(next);
    const { globals, options } = splitOverlapDefaults(item.defaults);
    // Initialize global form fields from overlap defaults (cast string values for FormState)
    setForm((current) => ({
      ...current,
      platform: String(globals.platform ?? current.platform),
      ratio: String(globals.ratio ?? current.ratio),
      tone: String(globals.tone ?? current.tone),
      offer: String(globals.offer ?? current.offer),
      options: { ...options },
    }));
    setResult(null);
    setPendingType(null);
    setPendingReason(null);
    setErrors({});
    setAttempted(false);
  }
  function chooseType(next: PromptTypeId) {
    if (next === typeId) return;
    if (result && next !== typeId) {
      setPendingReason("result");
      setPendingType(next);
      return;
    }
    if (hasEnteredDetails(form)) {
      setPendingReason("dirty");
      setPendingType(next);
      return;
    }
    applyType(next);
  }
  function confirmTypeChange() {
    if (pendingType) applyType(pendingType);
  }
  function getFieldName(f: { label: string; labelEn?: string }) {
    return lang === "en" && f.labelEn ? f.labelEn : f.label;
  }
  async function generate() {
    if (loading) return;
    const nextErrors = fieldErrors();
    setErrors(nextErrors);
    setAttempted(true);
    if (Object.keys(nextErrors).length > 0) {
      toast.error(t("Periksa kembali isian yang ditandai merah.", "Please check the highlighted fields."));
      return;
    }
    setLoading(true);
    try {
      const response = await generateVisualPrompt({ promptType: typeId, ...form });
      const next = parsePromptResult(response.generation.generatedOutput || "", typeId).result;
      setResult(next);
      toast.success(t("Materi selesai dibuat", "Material generated"));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t("Materi gagal dibuat", "Generation failed"));
    } finally {
      setLoading(false);
    }
  }

  const briefPlaceholders: Record<string, { id: string; en: string }> = {
    brand: { id: "Contoh: Cubiqlo", en: "e.g.: Cubiqlo" },
    campaign: { id: "Contoh: Aplikasi pengelolaan klien untuk freelancer", en: "e.g.: Client management app for freelancers" },
    goal: { id: "Contoh: Mendorong pendaftaran akun gratis", en: "e.g.: Drive free account signups" },
    audience: { id: "Contoh: Freelancer Indonesia yang kewalahan mengelola banyak klien", en: "e.g.: Indonesian freelancers overwhelmed managing multiple clients" },
  };

  const coreFields: [keyof Omit<FormState, "options">, string][] = [
    ["brand", t("Nama Brand", "Brand")],
    ["campaign", t("Produk / Campaign", "Product / Campaign")],
    ["goal", t("Tujuan", "Goal")],
    ["audience", t("Audiens", "Audience")],
  ];

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="app-page-title">Prompt Studio</h1>
          <p className="mt-1 text-sm text-muted-foreground">{t("Buat materi campaign dari brief sederhana.", "Create campaign material from a simple brief.")}</p>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs text-muted-foreground">{t("Generate", "Generated")} {usage.totalGenerations}/{usage.generationLimit}</span>
          {/* Desktop CTA so Generate stays visible in the first fold without scrolling */}
          <Button className="hidden h-9 xl:inline-flex" disabled={!valid || loading} onClick={generate}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
            {loading ? t("Menyusun materi…", "Generating…") : t("Generate", "Generate")}
          </Button>
          <PromptHistoryDrawer items={generations} onSelect={setResult} />
        </div>
      </div>

      {/* Compact type selector */}
      <section className="rounded-2xl border bg-white p-3 sm:p-4">
        {/* Mobile: dropdowns */}
        <div className="grid gap-2 sm:grid-cols-2 md:hidden">
          <div className="space-y-1">
            <Label htmlFor="prompt-category-mobile" className="text-xs">{t("Kategori", "Category")}</Label>
            <select id="prompt-category-mobile" value={category} onChange={(e) => {
              const cat = e.target.value as PromptCategory;
              const first = launchPromptCatalog.find((item) => item.category === cat)!;
              setCategory(cat);
              chooseType(first.id);
            }} className="h-10 w-full rounded-lg border bg-background px-3 text-sm">
              {categories.map((c) => <option key={c.id} value={c.id}>{lang === "en" ? c.labelEn : c.label}</option>)}
            </select>
          </div>
          <div className="space-y-1">
            <Label htmlFor="prompt-type-mobile" className="text-xs">{t("Jenis", "Type")}</Label>
            <select id="prompt-type-mobile" value={typeId} onChange={(e) => chooseType(e.target.value as PromptTypeId)} className="h-10 w-full rounded-lg border bg-background px-3 text-sm">
              {types.map((item) => <option key={item.id} value={item.id}>{lang === "en" && item.nameEn ? item.nameEn : item.name}</option>)}
            </select>
          </div>
        </div>
        {/* Desktop: compact pills */}
        <div className="hidden md:block">
          <div className="flex items-center gap-3">
            <Select value={category} onValueChange={(v) => {
              const cat = v as PromptCategory;
              const first = launchPromptCatalog.find((item) => item.category === cat)!;
              setCategory(cat);
              chooseType(first.id);
            }}>
              <SelectTrigger className="h-9 w-auto min-w-[140px] shrink-0 rounded-lg text-sm font-medium">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {categories.map((c) => <SelectItem key={c.id} value={c.id}>{lang === "en" ? c.labelEn : c.label}</SelectItem>)}
              </SelectContent>
            </Select>
            <div className="h-5 w-px bg-border" />
            <div className="flex flex-1 items-center gap-1.5 overflow-x-auto pb-0.5">
              {types.map((item) => (
                <button key={item.id} onClick={() => chooseType(item.id)} className={cn(
                  "h-8 shrink-0 rounded-lg px-3 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
                  typeId === item.id ? "bg-primary text-primary-foreground" : "bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground"
                )}>
                  {lang === "en" && item.nameEn ? item.nameEn : item.name}
                </button>
              ))}
            </div>
          </div>
          <p className="mt-1.5 text-[11px] text-muted-foreground">{lang === "en" && selected.descriptionEn ? selected.descriptionEn : selected.description}</p>
        </div>
      </section>

      {/* Main content: form + preview */}
      <div className="grid items-start gap-5 xl:grid-cols-[minmax(360px,430px)_minmax(0,1fr)]">
        {/* Brief form */}
        <section id="prompt-brief" className="rounded-2xl border bg-slate-50/70 p-4 sm:p-5">
          <div className="mb-3 sm:mb-4">
            <p className="font-semibold">Brief {lang === "en" && selected.nameEn ? selected.nameEn : selected.name}</p>
            <p className="text-xs text-muted-foreground">{t("Isi informasi utama, lalu detail khusus bila diperlukan.", "Fill in the main information, then add specific details if needed.")}</p>
          </div>
          <div className="space-y-3 sm:space-y-4">
            {/* 1. Brand/Product Info */}
            <div>
              <p className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                <span className="flex h-5 w-5 items-center justify-center rounded bg-primary/10 text-[10px] font-bold text-primary">1</span>
                {t("Informasi Brand & Produk", "Brand & Product Info")}
              </p>
              <div className="space-y-3">
                {coreFields.map(([key, label]) => (
                  <div className="space-y-1.5" key={key}>
                    <Label htmlFor={key}>{label}</Label>
                    <Input id={key} value={form[key] as string} placeholder={briefPlaceholders[key][lang]} onChange={(e) => patchField(key, e.target.value)} aria-invalid={Boolean(errors[key])} />
                    {errors[key] && <FieldError message={errors[key]} />}
                  </div>
                ))}
              </div>
            </div>

            {/* 2. Template Details */}
            <div>
              <p className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                <span className="flex h-5 w-5 items-center justify-center rounded bg-primary/10 text-[10px] font-bold text-primary">2</span>
                {t("Detail Template", "Template Details")}
              </p>
              {detailFields.length > 0 ? (
                <div className="space-y-3">
                  {detailFields.map((field) => {
                    const raw = form.options[field.key];
                    const fieldError = errors[field.key];
                    return (
                      <div className="space-y-1.5" key={field.key}>
                        <Label htmlFor={`option-${field.key}`}>{getFieldName(field)}{field.required ? " *" : ""}</Label>
                        {field.type === "select" ? (
                          <Select value={raw === undefined ? "" : String(raw)} onValueChange={(value) => setForm((current) => ({ ...current, options: { ...current.options, [field.key]: field.key.endsWith("Count") ? Number(value) : value } }))}>
                            <SelectTrigger id={`option-${field.key}`} aria-invalid={Boolean(fieldError)}><SelectValue placeholder={t("Pilih opsi", "Select option")} /></SelectTrigger>
                            <SelectContent>{field.options?.map((option) => <SelectItem key={option} value={option}>{displayOption(option, lang)}</SelectItem>)}</SelectContent>
                          </Select>
                        ) : field.type === "textarea" ? (
                          <Textarea id={`option-${field.key}`} value={String(raw ?? "")} onChange={(e) => setForm((current) => ({ ...current, options: { ...current.options, [field.key]: e.target.value } }))} aria-invalid={Boolean(fieldError)} />
                        ) : (
                          <Input id={`option-${field.key}`} type={field.type} min={field.min} max={field.max} value={raw === undefined ? "" : String(raw)} onChange={(e) => setForm((current) => ({ ...current, options: { ...current.options, [field.key]: field.type === "number" ? Number(e.target.value) : e.target.value } }))} aria-invalid={Boolean(fieldError)} />
                        )}
                        {fieldError && <FieldError message={fieldError} />}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="rounded-lg border border-dashed bg-white px-3 py-2.5 text-xs text-muted-foreground">
                  {t("Template ini tidak butuh detail tambahan. Langsung lanjut ke bagian berikutnya.", "This template needs no extra details. Continue to the next section.")}
                </p>
              )}
            </div>

            {/* 3. Style & Visual */}
            <details className="rounded-xl border bg-white p-3" open>
              <summary className="flex cursor-pointer items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                <span className="flex h-5 w-5 items-center justify-center rounded bg-primary/10 text-[10px] font-bold text-primary">3</span>
                {t("Gaya & Visual", "Style & Visual")}
                <ChevronDown className="ml-auto h-3.5 w-3.5 transition-transform [[data-state=open]>&]:rotate-180" />
              </summary>
              <div className="mt-3 space-y-3">
                <div className="space-y-1.5">
                  <div className="flex items-center gap-1.5">
                    <Label htmlFor="style">{t("Gaya Desain", "Design Style")}</Label>
                    {form.style && styleRefs[form.style] && <InfoTip text={lang === "en" ? styleRefs[form.style].en : styleRefs[form.style].id} />}
                  </div>
                  <Select value={form.style} onValueChange={(v) => patchField("style", v)}>
                    <SelectTrigger id="style"><SelectValue placeholder={t("Pilih gaya desain", "Select design style")} /></SelectTrigger>
                    <SelectContent>{styleOptions.map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="tone">{t("Nada / Tone", "Tone")}</Label>
                  <Select value={form.tone} onValueChange={(v) => patchField("tone", v)}>
                    <SelectTrigger id="tone"><SelectValue placeholder={t("Pilih tone", "Select tone")} /></SelectTrigger>
                    <SelectContent>{toneOptions.map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="colorPalette">{t("Palet Warna", "Color palette")}</Label>
                  <Input id="colorPalette" value={form.colorPalette} onChange={(e) => patchField("colorPalette", e.target.value)} placeholder={t("Contoh: #2dd4bf, #ffffff", "e.g.: #2dd4bf, #ffffff")} />
                </div>
              </div>
            </details>

            {/* 4. Platform & Format */}
            <details className="rounded-xl border bg-white p-3" open>
              <summary className="flex cursor-pointer items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                <span className="flex h-5 w-5 items-center justify-center rounded bg-primary/10 text-[10px] font-bold text-primary">4</span>
                {t("Platform & Format", "Platform & Format")}
                <ChevronDown className="ml-auto h-3.5 w-3.5 transition-transform [[data-state=open]>&]:rotate-180" />
              </summary>
              <div className="mt-3 space-y-3">
                <div className="space-y-1.5">
                  <Label htmlFor="platform">{t("Platform", "Platform")}</Label>
                  <Select value={form.platform} onValueChange={(v) => patchField("platform", v)}>
                    <SelectTrigger id="platform"><SelectValue placeholder={t("Pilih platform", "Select platform")} /></SelectTrigger>
                    <SelectContent>{platformOptions.map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="ratio">{t("Rasio Aspek", "Aspect Ratio")}</Label>
                  <Select value={form.ratio} onValueChange={(v) => patchField("ratio", v)}>
                    <SelectTrigger id="ratio"><SelectValue placeholder={t("Pilih rasio", "Select ratio")} /></SelectTrigger>
                    <SelectContent>{ratioOptions.map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="offer">{t("Offer / Penawaran", "Offer")}</Label>
                  <Input id="offer" value={form.offer} onChange={(e) => patchField("offer", e.target.value)} placeholder={t("Contoh: Diskon 50% untuk pembelian pertama", "e.g.: 50% off for first purchase")} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="notes">{t("Catatan tambahan", "Additional notes")}</Label>
                  <Textarea id="notes" value={form.notes} onChange={(e) => patchField("notes", e.target.value)} placeholder={t("Instruksi khusus untuk AI...", "Special instructions for AI...")} />
                </div>
              </div>
            </details>

            {/* Generate — sticky bottom action on mobile, in-flow on desktop */}
            <div className="sticky bottom-2 z-20 space-y-2 rounded-xl bg-slate-50/95 px-2 py-2 shadow-[0_-4px_12px_rgba(15,23,42,0.06)] backdrop-blur sm:static sm:z-auto sm:bg-transparent sm:p-0 sm:shadow-none">
              <Button className="h-11 w-full" disabled={!valid || loading} onClick={generate}>
                {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
                {loading ? t("Menyusun materi…", "Generating…") : t("Generate Materi", "Generate")}
              </Button>
              {attempted && Object.keys(errorsState).length > 0 && (
                <p role="alert" className="text-xs font-medium text-destructive">
                  {t("Periksa kembali isian yang ditandai merah.", "Please check the highlighted fields.")}
                </p>
              )}
            </div>
          </div>
        </section>

        {/* Right panel: preview + result */}
        <div className="space-y-3 xl:sticky xl:top-20 xl:max-h-[calc(100vh-6rem)] xl:overflow-y-auto pb-1">
          {/* Preview: static card on xl+, compact collapsible below */}
          <div className="hidden xl:block">
            <div className="rounded-xl border bg-white p-3">
              <PreviewPanel selected={selected} form={form} />
            </div>
          </div>
          <details className="group xl:hidden rounded-xl border bg-white" open={previewOpen} onToggle={(e) => setPreviewOpen((e.target as HTMLDetailsElement).open)}>
            <summary className="flex cursor-pointer items-center gap-1.5 rounded-xl bg-white p-3 text-xs font-semibold text-foreground select-none">
              <Monitor className="h-3.5 w-3.5" /> {t("Preview", "Preview")}
              <span className="min-w-0 flex-1 truncate text-[11px] font-normal text-muted-foreground">
                {[form.platform, form.ratio?.split(" ")[0], form.style, form.tone].filter(Boolean).join(" · ") || t("Belum ada pilihan", "No selections yet")}
              </span>
              <ChevronDown className="h-3.5 w-3.5 shrink-0 transition-transform group-open:rotate-180" />
            </summary>
            <div className="px-3 pb-3">
              <PreviewPanel selected={selected} form={form} />
            </div>
          </details>
          <div>
            {result && (
              <div className="mb-2 flex items-center gap-2">
                <button onClick={() => setShowTerminal(false)} className={cn("rounded-md px-2.5 py-1 text-xs font-medium transition-colors", !showTerminal ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:text-foreground")}>
                  <Sparkles className="mr-1 inline-block h-3 w-3" />{t("Kartu", "Cards")}
                </button>
                <button onClick={() => setShowTerminal(true)} className={cn("rounded-md px-2.5 py-1 text-xs font-medium transition-colors", showTerminal ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:text-foreground")}>
                  <Terminal className="mr-1 inline-block h-3 w-3" />{t("Terminal", "Terminal")}
                </button>
              </div>
            )}
            <PromptResult result={result} loading={loading} view={showTerminal ? "terminal" : "cards"} onEdit={() => document.getElementById("prompt-brief")?.scrollIntoView({ behavior: "smooth" })} onRegenerate={generate} />
          </div>
        </div>
      </div>

      {/* Confirm type change dialog */}
      <Dialog open={Boolean(pendingType)} onOpenChange={(open) => !open && setPendingType(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("Ganti jenis konten?", "Change content type?")}</DialogTitle>
            {pendingReason === "dirty" ? (
              <DialogDescription>{t("Brief dan detail yang sudah diisi akan direset. Lanjutkan?", "Your filled brief and details will be reset. Continue?")}</DialogDescription>
            ) : (
              <DialogDescription>{t("Hasil yang sedang tampil akan ditutup. Brief utama tetap tersimpan.", "Current results will be hidden. Main brief will be preserved.")}</DialogDescription>
            )}
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPendingType(null)}>{t("Batal", "Cancel")}</Button>
            <Button onClick={confirmTypeChange}>{t("Ganti jenis", "Change type")}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
