"use client";

import { useState } from "react";
import { Braces, Info, Loader2, Sparkles, TriangleAlert, Zap } from "lucide-react";
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
import { validateField } from "@/lib/prompts/prompt-studio-validation";
import { PromptResult } from "./prompt-result";
import { PromptHistoryDrawer, type PromptHistoryItem } from "./prompt-history-drawer";
import { PageHeader } from "@/components/ui/page-header";
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

function FieldError({ message }: { message: string }) {
  return (
    <p role="alert" className="flex items-center gap-1 text-[11px] font-medium text-destructive mt-1">
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
  const [showPrompt, setShowPrompt] = useState(true);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [attempted, setAttempted] = useState(false);
  const [dirty, setDirty] = useState(false);

  const selected = launchPromptCatalog.find((item) => item.id === typeId)!;
  const types = launchPromptCatalog.filter((item) => item.category === category);
  const detailFields = nonOverlapFields(selected.fields);

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

  const errorsState = attempted ? errors : {};
  const valid = Object.keys(fieldErrors()).length === 0;

  function patchField(key: keyof Omit<FormState, "options">, value: string) {
    setForm((current) => ({ ...current, [key]: value }));
    setDirty(true);
  }

  function applyType(next: PromptTypeId) {
    const item = launchPromptCatalog.find((entry) => entry.id === next)!;
    setCategory(item.category);
    setTypeId(next);
    const { globals: itemGlobals, options } = splitOverlapDefaults(item.defaults);
    setForm((current) => ({
      ...current,
      platform: String(itemGlobals.platform ?? current.platform),
      ratio: String(itemGlobals.ratio ?? current.ratio),
      tone: String(itemGlobals.tone ?? current.tone),
      offer: String(itemGlobals.offer ?? current.offer),
      options: { ...options },
    }));
    setResult(null);
    setPendingType(null);
    setPendingReason(null);
    setErrors({});
    setAttempted(false);
    setDirty(false);
  }

  function chooseType(next: PromptTypeId) {
    if (next === typeId) return;
    if (result && next !== typeId) {
      setPendingReason("result");
      setPendingType(next);
      return;
    }
    if (dirty) {
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
    campaign: { id: "Contoh: Aplikasi manajemen klien freelance", en: "e.g.: Freelancer client management app" },
    goal: { id: "Contoh: Mendorong pendaftaran akun", en: "e.g.: Drive free account signups" },
    audience: { id: "Contoh: Freelancer & studio kreatif", en: "e.g.: Freelancers & creative studios" },
  };

  return (
    <div className="space-y-4">
      {/* Universal Page Header with AI Quota Badge */}
      <PageHeader
        icon={Sparkles}
        title="Prompt Studio"
        description={t(
          "Buat materi visual, brief campaign, dan konten iklan instan berbasis AI.",
          "Create visual assets, campaign briefs, and marketing content instantly with AI.",
        )}
        actions={
          <div className="flex items-center gap-2">
            <div className="hidden sm:flex items-center gap-1.5 px-3 py-1 rounded-lg border bg-card text-xs text-muted-foreground shadow-xs">
              <Zap className="h-3.5 w-3.5 text-amber-500" />
              <span>
                {t("Kredit AI:", "AI Quota:")} <strong className="text-foreground font-semibold">{usage.totalGenerations}/{usage.generationLimit}</strong>
              </span>
            </div>
            <PromptHistoryDrawer items={generations} onSelect={setResult} />
          </div>
        }
      />

      {/* Category & Template Selector Toolbar */}
      <section className="rounded-xl border bg-card p-2.5 sm:p-3 shadow-xs">
        {/* Mobile: Select dropdowns */}
        <div className="grid gap-2 sm:grid-cols-2 md:hidden">
          <div className="space-y-1">
            <Label htmlFor="prompt-category-mobile" className="text-xs font-semibold">{t("Kategori", "Category")}</Label>
            <select
              id="prompt-category-mobile"
              value={category}
              onChange={(e) => {
                const cat = e.target.value as PromptCategory;
                const first = launchPromptCatalog.find((item) => item.category === cat)!;
                setCategory(cat);
                chooseType(first.id);
              }}
              className="h-9 w-full rounded-lg border bg-background px-3 text-xs"
            >
              {categories.map((c) => <option key={c.id} value={c.id}>{lang === "en" ? c.labelEn : c.label}</option>)}
            </select>
          </div>
          <div className="space-y-1">
            <Label htmlFor="prompt-type-mobile" className="text-xs font-semibold">{t("Jenis Konten", "Content Type")}</Label>
            <select
              id="prompt-type-mobile"
              value={typeId}
              onChange={(e) => chooseType(e.target.value as PromptTypeId)}
              className="h-9 w-full rounded-lg border bg-background px-3 text-xs"
            >
              {types.map((item) => <option key={item.id} value={item.id}>{lang === "en" && item.nameEn ? item.nameEn : item.name}</option>)}
            </select>
          </div>
        </div>

        {/* Desktop: Segmented Category & Type Pills */}
        <div className="hidden md:flex flex-col gap-2">
          <div className="flex items-center gap-3">
            <Select
              value={category}
              onValueChange={(v) => {
                const cat = v as PromptCategory;
                const first = launchPromptCatalog.find((item) => item.category === cat)!;
                setCategory(cat);
                chooseType(first.id);
              }}
            >
              <SelectTrigger className="h-8.5 w-auto min-w-[150px] shrink-0 rounded-lg text-xs font-semibold bg-muted/50 border-border/80">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {categories.map((c) => <SelectItem key={c.id} value={c.id}>{lang === "en" ? c.labelEn : c.label}</SelectItem>)}
              </SelectContent>
            </Select>

            <div className="h-5 w-px bg-border/80" />

            <div className="flex flex-1 items-center gap-1.5 overflow-x-auto pb-0.5">
              {types.map((item) => (
                <button
                  key={item.id}
                  onClick={() => chooseType(item.id)}
                  className={cn(
                    "h-8 shrink-0 rounded-lg px-3 text-xs font-semibold transition-all cursor-pointer",
                    typeId === item.id
                      ? "bg-primary text-primary-foreground shadow-xs"
                      : "bg-muted/40 text-muted-foreground hover:bg-muted/80 hover:text-foreground",
                  )}
                >
                  {lang === "en" && item.nameEn ? item.nameEn : item.name}
                </button>
              ))}
            </div>
          </div>
          <p className="text-[11px] text-muted-foreground">
            {lang === "en" && selected.descriptionEn ? selected.descriptionEn : selected.description}
          </p>
        </div>
      </section>

      {/* Main Content Grid: 2-Column Form + Live Preview */}
      <div className="grid items-start gap-4 xl:grid-cols-[minmax(380px,460px)_minmax(0,1fr)]">
        {/* Brief Form */}
        <section id="prompt-brief" className="rounded-xl border bg-card p-4 shadow-xs space-y-4">
          <div className="border-b pb-3">
            <h2 className="font-semibold text-sm text-foreground">
              {t("Brief", "Brief")}: {lang === "en" && selected.nameEn ? selected.nameEn : selected.name}
            </h2>
            <p className="text-xs text-muted-foreground">
              {t("Lengkapi parameter kampanye untuk instruksi prompt AI yang presisi.", "Complete campaign parameters for precise AI instructions.")}
            </p>
          </div>

          <div className="space-y-4">
            {/* 1. Brand & Product Info (2-Col Grid) */}
            <div className="space-y-2.5">
              <p className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-muted-foreground">
                <span className="flex h-4.5 w-4.5 items-center justify-center rounded-md bg-primary/10 text-[10px] font-bold text-primary">1</span>
                {t("Informasi Brand & Produk", "Brand & Product Info")}
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <div className="space-y-1">
                  <Label htmlFor="brand" className="text-xs font-medium">{t("Nama Brand", "Brand")} *</Label>
                  <Input
                    id="brand"
                    className="h-8.5 text-xs"
                    value={form.brand}
                    placeholder={briefPlaceholders.brand[lang]}
                    onChange={(e) => patchField("brand", e.target.value)}
                    aria-invalid={Boolean(errorsState.brand)}
                  />
                  {errorsState.brand && <FieldError message={errorsState.brand} />}
                </div>

                <div className="space-y-1">
                  <Label htmlFor="campaign" className="text-xs font-medium">{t("Produk / Campaign", "Product")} *</Label>
                  <Input
                    id="campaign"
                    className="h-8.5 text-xs"
                    value={form.campaign}
                    placeholder={briefPlaceholders.campaign[lang]}
                    onChange={(e) => patchField("campaign", e.target.value)}
                    aria-invalid={Boolean(errorsState.campaign)}
                  />
                  {errorsState.campaign && <FieldError message={errorsState.campaign} />}
                </div>

                <div className="space-y-1">
                  <Label htmlFor="goal" className="text-xs font-medium">{t("Tujuan", "Goal")} *</Label>
                  <Input
                    id="goal"
                    className="h-8.5 text-xs"
                    value={form.goal}
                    placeholder={briefPlaceholders.goal[lang]}
                    onChange={(e) => patchField("goal", e.target.value)}
                    aria-invalid={Boolean(errorsState.goal)}
                  />
                  {errorsState.goal && <FieldError message={errorsState.goal} />}
                </div>

                <div className="space-y-1">
                  <Label htmlFor="audience" className="text-xs font-medium">{t("Target Audiens", "Audience")} *</Label>
                  <Input
                    id="audience"
                    className="h-8.5 text-xs"
                    value={form.audience}
                    placeholder={briefPlaceholders.audience[lang]}
                    onChange={(e) => patchField("audience", e.target.value)}
                    aria-invalid={Boolean(errorsState.audience)}
                  />
                  {errorsState.audience && <FieldError message={errorsState.audience} />}
                </div>
              </div>
            </div>

            {/* 2. Template Specific Details */}
            {detailFields.length > 0 && (
              <div className="space-y-2.5 border-t pt-3">
                <p className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  <span className="flex h-4.5 w-4.5 items-center justify-center rounded-md bg-primary/10 text-[10px] font-bold text-primary">2</span>
                  {t("Detail Khusus Template", "Template Details")}
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {detailFields.map((field) => {
                    const raw = form.options[field.key];
                    const fieldError = errorsState[field.key];
                    return (
                      <div className={cn("space-y-1", field.type === "textarea" && "sm:col-span-2")} key={field.key}>
                        <Label htmlFor={`option-${field.key}`} className="text-xs font-medium">
                          {getFieldName(field)}{field.required ? " *" : ""}
                        </Label>
                        {field.type === "select" ? (
                          <Select
                            value={raw === undefined ? "" : String(raw)}
                            onValueChange={(value) => {
                              setForm((current) => ({
                                ...current,
                                options: { ...current.options, [field.key]: field.key.endsWith("Count") ? Number(value) : value },
                              }));
                              setDirty(true);
                            }}
                          >
                            <SelectTrigger id={`option-${field.key}`} className="h-8.5 text-xs" aria-invalid={Boolean(fieldError)}>
                              <SelectValue placeholder={t("Pilih opsi", "Select option")} />
                            </SelectTrigger>
                            <SelectContent>
                              {field.options?.map((option) => (
                                <SelectItem key={option} value={option} className="text-xs">
                                  {displayOption(option, lang)}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        ) : field.type === "textarea" ? (
                          <Textarea
                            id={`option-${field.key}`}
                            className="text-xs min-h-[70px]"
                            value={String(raw ?? "")}
                            onChange={(e) => {
                              setForm((current) => ({ ...current, options: { ...current.options, [field.key]: e.target.value } }));
                              setDirty(true);
                            }}
                            aria-invalid={Boolean(fieldError)}
                          />
                        ) : (
                          <Input
                            id={`option-${field.key}`}
                            className="h-8.5 text-xs"
                            type={field.type}
                            min={field.min}
                            max={field.max}
                            value={raw === undefined ? "" : String(raw)}
                            onChange={(e) => {
                              setForm((current) => ({
                                ...current,
                                options: { ...current.options, [field.key]: field.type === "number" ? Number(e.target.value) : e.target.value },
                              }));
                              setDirty(true);
                            }}
                            aria-invalid={Boolean(fieldError)}
                          />
                        )}
                        {fieldError && <FieldError message={fieldError} />}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* 3. Style & Visual (Grid 2-Col) */}
            <div className="space-y-2.5 border-t pt-3">
              <p className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-muted-foreground">
                <span className="flex h-4.5 w-4.5 items-center justify-center rounded-md bg-primary/10 text-[10px] font-bold text-primary">3</span>
                {t("Gaya & Format Visual", "Style & Format")}
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <div className="space-y-1">
                  <div className="flex items-center gap-1">
                    <Label htmlFor="style" className="text-xs font-medium">{t("Gaya Desain", "Design Style")}</Label>
                    {form.style && styleRefs[form.style] && <InfoTip text={lang === "en" ? styleRefs[form.style].en : styleRefs[form.style].id} />}
                  </div>
                  <Select value={form.style} onValueChange={(v) => patchField("style", v)}>
                    <SelectTrigger id="style" className="h-8.5 text-xs">
                      <SelectValue placeholder={t("Pilih gaya desain", "Select style")} />
                    </SelectTrigger>
                    <SelectContent>
                      {styleOptions.map((o) => <SelectItem key={o} value={o} className="text-xs">{o}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1">
                  <Label htmlFor="tone" className="text-xs font-medium">{t("Tone / Nada", "Tone")}</Label>
                  <Select value={form.tone} onValueChange={(v) => patchField("tone", v)}>
                    <SelectTrigger id="tone" className="h-8.5 text-xs">
                      <SelectValue placeholder={t("Pilih tone", "Select tone")} />
                    </SelectTrigger>
                    <SelectContent>
                      {toneOptions.map((o) => <SelectItem key={o} value={o} className="text-xs">{o}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1">
                  <Label htmlFor="platform" className="text-xs font-medium">{t("Platform", "Platform")}</Label>
                  <Select value={form.platform} onValueChange={(v) => patchField("platform", v)}>
                    <SelectTrigger id="platform" className="h-8.5 text-xs">
                      <SelectValue placeholder={t("Pilih platform", "Select platform")} />
                    </SelectTrigger>
                    <SelectContent>
                      {platformOptions.map((o) => <SelectItem key={o} value={o} className="text-xs">{o}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1">
                  <Label htmlFor="ratio" className="text-xs font-medium">{t("Aspek Rasio", "Aspect Ratio")}</Label>
                  <Select value={form.ratio} onValueChange={(v) => patchField("ratio", v)}>
                    <SelectTrigger id="ratio" className="h-8.5 text-xs">
                      <SelectValue placeholder={t("Pilih rasio", "Select ratio")} />
                    </SelectTrigger>
                    <SelectContent>
                      {ratioOptions.map((o) => <SelectItem key={o} value={o} className="text-xs">{o}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1 sm:col-span-2">
                  <Label htmlFor="colorPalette" className="text-xs font-medium">{t("Palet Warna", "Color Palette")}</Label>
                  <Input
                    id="colorPalette"
                    className="h-8.5 text-xs"
                    value={form.colorPalette}
                    onChange={(e) => patchField("colorPalette", e.target.value)}
                    placeholder={t("Contoh: #2dd4bf, #ffffff", "e.g.: #2dd4bf, #ffffff")}
                  />
                </div>

                <div className="space-y-1 sm:col-span-2">
                  <Label htmlFor="offer" className="text-xs font-medium">{t("Offer / Penawaran (Opsional)", "Offer (Optional)")}</Label>
                  <Input
                    id="offer"
                    className="h-8.5 text-xs"
                    value={form.offer}
                    onChange={(e) => patchField("offer", e.target.value)}
                    placeholder={t("Contoh: Diskon 50% untuk pembelian pertama", "e.g.: 50% off for first purchase")}
                  />
                </div>

                <div className="space-y-1 sm:col-span-2">
                  <Label htmlFor="notes" className="text-xs font-medium">{t("Catatan Tambahan (Opsional)", "Notes (Optional)")}</Label>
                  <Textarea
                    id="notes"
                    className="text-xs min-h-[60px]"
                    value={form.notes}
                    onChange={(e) => patchField("notes", e.target.value)}
                    placeholder={t("Instruksi khusus untuk AI...", "Special instructions for AI...")}
                  />
                </div>
              </div>
            </div>

            {/* Execute Button */}
            <div className="pt-2">
              <Button
                className="h-10 w-full rounded-lg font-semibold shadow-xs"
                disabled={!valid || loading}
                onClick={generate}
              >
                {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
                {loading ? t("Menyusun materi dengan AI…", "Generating with AI…") : t("Generate Prompt & Materi", "Generate Prompt & Assets")}
              </Button>
            </div>
          </div>
        </section>

        {/* Live Output / Result Area */}
        <div className="space-y-3 xl:sticky xl:top-20 xl:max-h-[calc(100vh-6rem)] xl:overflow-y-auto">
          {result && (
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowPrompt(true)}
                className={cn(
                  "rounded-lg px-3 py-1.5 text-xs font-semibold transition-all cursor-pointer",
                  showPrompt ? "bg-primary text-primary-foreground shadow-xs" : "bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground",
                )}
              >
                <Braces className="mr-1.5 inline-block h-3.5 w-3.5" />{t("Prompt", "Prompt")}
              </button>
              <button
                onClick={() => setShowPrompt(false)}
                className={cn(
                  "rounded-lg px-3 py-1.5 text-xs font-semibold transition-all cursor-pointer",
                  !showPrompt ? "bg-primary text-primary-foreground shadow-xs" : "bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground",
                )}
              >
                <Sparkles className="mr-1.5 inline-block h-3.5 w-3.5" />{t("Kartu Visual", "Visual Cards")}
              </button>
            </div>
          )}
          <PromptResult
            result={result}
            loading={loading}
            view={showPrompt ? "prompt" : "cards"}
            onEdit={() => document.getElementById("prompt-brief")?.scrollIntoView({ behavior: "smooth" })}
            onRegenerate={generate}
          />
        </div>
      </div>

      {/* Type Switch Confirmation Modal */}
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
