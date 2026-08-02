"use client";

import { useMemo, useState } from "react";
import { Check, ChevronDown, ChevronRight, Info, Loader2, Monitor, Palette, Smartphone, Sparkles, Terminal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { generateVisualPrompt } from "@/lib/actions/visual-prompts";
import { launchPromptCatalog, type PromptCategory, type PromptOptionValue, type PromptTypeId } from "@/lib/prompts/catalog";
import { parsePromptResult, type PromptGenerationResult } from "@/lib/prompts/build-prompt";
import { toneOptions, styleOptions, platformOptions, ratioOptions } from "@/lib/prompts/field-options";
import { PromptResult } from "./prompt-result";
import { PromptHistoryDrawer, type PromptHistoryItem } from "./prompt-history-drawer";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

const categories: { id: PromptCategory; label: string }[] = [
  { id: "social-media", label: "Social Media" },
  { id: "ads-promotion", label: "Iklan & Promosi" },
  { id: "product", label: "Produk" },
  { id: "video", label: "Video" },
  { id: "brand-copy", label: "Brand & Copy" },
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

/** Style reference descriptions for "Lihat Referensi" tooltips. */
const styleRefs: Record<string, string> = {
  "Minimal Clean": "Tipografi sans-serif, whitespace luas, warna netral. Cocok: tech, SaaS, skincare.",
  "Luxury Premium": "Tipografi serif, warna gelap/emas, tekstur marmer/velvet. Cocok: fashion, jewelry, hospitality.",
  "Dark Neon": "Background gelap, aksen neon terang, glow effect. Cocok: nightlife, gaming, tech futuristik.",
  "Bold & Colorful": "Warna cerah kontras, tipografi tebal, layout dinamis. Cocok: F&B, anak muda, event.",
  "Corporate Professional": "Warna biru/netral, grid rapi, tipografi clean. Cocok: B2B, fintech, konsultan.",
  "Bright & Fresh": "Warna pastel/cerah, ilustrasi ringan, kesan segar. Cocok: health, food, eco-friendly.",
  "Warm & Cozy": "Tone earth/warm, tekstur kayu/kain, pencahayaan lembut. Cocok: home decor, coffee shop, wellness.",
  "Futuristic Tech": "Gradien holografik, bentuk geometris, efek glassmorphism. Cocok: AI, blockchain, startup.",
  "Retro Vintage": "Warna muted/sepia, tipografi klasik, tekstur kertas. Cocok: heritage, artisan, vinyl.",
  "Playful Fun": "Bentuk rounded, warna pop, ilustrasi kartun. Cocok: kids, casual food, social app.",
};

const lightingRefs: Record<string, string> = {
  "Soft Lighting": "Cahaya lembut merata, bayangan tipis. Kesan profesional dan clean.",
  "Neon Glow": "Cahaya neon warna-warni, efek glow. Kesan modern dan energik.",
  "Dramatic Shadow": "Kontras tinggi, bayangan tajam. Kesan misterius dan premium.",
  "Studio Light": "Cahaya studio terkontrol, highlight merata. Kesan commercial dan polished.",
  "Natural Sunlight": "Cahaya matahari alami, warm tone. Kesan natural dan trustworthy.",
  "Ring Light": "Cahaya merata di wajah, catchlight bulat. Kesan beauty dan influencer.",
  "Golden Hour": "Cahaya keemasan sore hari, warm gradient. Kesan aspirasional dan cinematic.",
  "Backlit / Silhouette": "Cahaya dari belakang, subjek gelap. Kesan dramatis dan artistic.",
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

function PreviewPanel({ selected, form }: { selected: { name: string; description: string }; form: FormState }) {
  const ratio = form.ratio || "4:5 (Portrait Feed)";
  const style = form.style || "—";
  const platform = form.platform || "—";
  const ratioNum = ratio.split(" ")[0];
  const [w, h] = ratioNum.split(":").map(Number);
  const aspect = w && h ? w / h : 4 / 5;
  const previewH = Math.min(200, Math.round(160 / aspect));

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
        <Monitor className="h-4 w-4" /> Preview
      </div>
      {/* Wireframe mockup */}
      <div className="flex justify-center">
        <div className="rounded-xl border-2 border-dashed border-muted-foreground/20 bg-muted/30 flex flex-col items-center justify-center gap-2 text-muted-foreground" style={{ width: Math.min(160, previewH * aspect), height: previewH }}>
          <Smartphone className="h-6 w-6 opacity-40" />
          <span className="text-[10px] font-medium">{ratioNum}</span>
        </div>
      </div>
      {/* Settings summary */}
      <div className="grid grid-cols-2 gap-2 text-xs">
        <div className="rounded-lg bg-muted/50 px-3 py-2">
          <p className="text-muted-foreground">Style</p>
          <p className="font-medium truncate">{style}</p>
        </div>
        <div className="rounded-lg bg-muted/50 px-3 py-2">
          <p className="text-muted-foreground">Platform</p>
          <p className="font-medium truncate">{platform}</p>
        </div>
        <div className="rounded-lg bg-muted/50 px-3 py-2">
          <p className="text-muted-foreground">Rasio</p>
          <p className="font-medium truncate">{ratioNum}</p>
        </div>
        <div className="rounded-lg bg-muted/50 px-3 py-2">
          <p className="text-muted-foreground">Tone</p>
          <p className="font-medium truncate">{form.tone || "—"}</p>
        </div>
      </div>
      {/* Type description */}
      <div className="rounded-lg border bg-background p-3">
        <p className="text-xs font-medium text-foreground">{selected.name}</p>
        <p className="mt-0.5 text-[11px] leading-relaxed text-muted-foreground">{selected.description}</p>
      </div>
    </div>
  );
}

export function PromptStudio({ generations, usage }: { generations: PromptHistoryItem[]; usage: { totalInputTokens: number; totalOutputTokens: number; totalCost: number; monthlyCap: number; totalGenerations: number; generationLimit: number | null } }) {
  const [category, setCategory] = useState<PromptCategory>("social-media");
  const [typeId, setTypeId] = useState<PromptTypeId>("instagram-feed");
  const [form, setForm] = useState(empty);
  const [result, setResult] = useState<PromptGenerationResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [pendingType, setPendingType] = useState<PromptTypeId | null>(null);
  const [showTerminal, setShowTerminal] = useState(false);

  const selected = launchPromptCatalog.find((item) => item.id === typeId)!;
  const types = launchPromptCatalog.filter((item) => item.category === category);

  const valid = useMemo(() => Boolean(
    form.brand.trim() && form.campaign.trim() && form.goal.trim() && form.audience.trim() &&
    selected.fields.filter((f) => f.required).every((f) => form.options[f.key] !== undefined && form.options[f.key] !== "")
  ), [form, selected]);

  function patchField(key: keyof Omit<FormState, "options">, value: string) {
    setForm((current) => ({ ...current, [key]: value }));
  }
  function applyType(next: PromptTypeId) {
    const item = launchPromptCatalog.find((entry) => entry.id === next)!;
    setCategory(item.category);
    setTypeId(next);
    setForm((current) => ({ ...current, options: { ...item.defaults } }));
    setResult(null);
    setPendingType(null);
  }
  function chooseType(next: PromptTypeId) {
    if (result && next !== typeId) { setPendingType(next); return; }
    applyType(next);
  }
  async function generate() {
    if (!valid || loading) return;
    setLoading(true);
    try {
      const response = await generateVisualPrompt({ promptType: typeId, ...form });
      const next = parsePromptResult(response.generation.generatedOutput || "", typeId).result;
      setResult(next);
      toast.success("Materi selesai dibuat");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Materi gagal dibuat");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="app-page-title">Prompt Studio</h1>
          <p className="mt-1 text-sm text-muted-foreground">Buat materi campaign dari brief sederhana.</p>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs text-muted-foreground">Generate {usage.totalGenerations}/{usage.generationLimit ?? "Unlimited"}</span>
          <PromptHistoryDrawer items={generations} onSelect={setResult} />
        </div>
      </div>

      {/* Compact type selector */}
      <section className="rounded-2xl border bg-white p-3 sm:p-4">
        {/* Mobile: dropdowns */}
        <div className="grid gap-2 sm:grid-cols-2 md:hidden">
          <div className="space-y-1">
            <Label htmlFor="prompt-category-mobile" className="text-xs">Kategori</Label>
            <select id="prompt-category-mobile" value={category} onChange={(e) => {
              const cat = e.target.value as PromptCategory;
              const first = launchPromptCatalog.find((item) => item.category === cat)!;
              setCategory(cat);
              chooseType(first.id);
            }} className="h-10 w-full rounded-lg border bg-background px-3 text-sm">
              {categories.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
            </select>
          </div>
          <div className="space-y-1">
            <Label htmlFor="prompt-type-mobile" className="text-xs">Jenis</Label>
            <select id="prompt-type-mobile" value={typeId} onChange={(e) => chooseType(e.target.value as PromptTypeId)} className="h-10 w-full rounded-lg border bg-background px-3 text-sm">
              {types.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
          </div>
        </div>
        {/* Desktop: compact pills */}
        <div className="hidden md:block">
          <div className="flex items-center gap-3">
            {/* Category dropdown */}
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
                {categories.map((c) => <SelectItem key={c.id} value={c.id}>{c.label}</SelectItem>)}
              </SelectContent>
            </Select>
            {/* Separator */}
            <div className="h-5 w-px bg-border" />
            {/* Type pills */}
            <div className="flex flex-1 items-center gap-1.5 overflow-x-auto pb-0.5">
              {types.map((item) => (
                <button key={item.id} onClick={() => chooseType(item.id)} className={cn(
                  "h-8 shrink-0 rounded-lg px-3 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
                  typeId === item.id ? "bg-primary text-primary-foreground" : "bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground"
                )}>
                  {item.name}
                </button>
              ))}
            </div>
          </div>
          <p className="mt-1.5 text-[11px] text-muted-foreground">{selected.description}</p>
        </div>
      </section>

      {/* Main content: form + preview */}
      <div className="grid items-start gap-5 xl:grid-cols-[minmax(360px,430px)_minmax(0,1fr)]">
        {/* Brief form */}
        <section id="prompt-brief" className="rounded-2xl border bg-slate-50/70 p-4 sm:p-5">
          <div className="mb-3 sm:mb-4">
            <p className="font-semibold">Brief {selected.name}</p>
            <p className="text-xs text-muted-foreground">Isi informasi utama, lalu detail khusus bila diperlukan.</p>
          </div>
          <div className="space-y-3 sm:space-y-4">
            {/* A. Brand Info */}
            <div>
              <p className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                <span className="flex h-5 w-5 items-center justify-center rounded bg-primary/10 text-[10px] font-bold text-primary">A</span>
                Informasi Brand & Produk
              </p>
              <div className="space-y-3">
                {([["brand", "Brand", "Contoh: Cubiqlo"], ["campaign", "Product / campaign", "Contoh: Aplikasi pengelolaan klien untuk freelancer"], ["goal", "Goal", "Contoh: Mendorong pendaftaran akun gratis"], ["audience", "Audience", "Contoh: Freelancer Indonesia yang kewalahan mengelola banyak klien"]] as const).map(([key, label, placeholder]) => (
                  <div className="space-y-1.5" key={key}>
                    <Label htmlFor={key}>{label}</Label>
                    <Input id={key} value={form[key as keyof FormState] as string} placeholder={placeholder} onChange={(e) => patchField(key as keyof Omit<FormState, "options">, e.target.value)} />
                  </div>
                ))}
              </div>
            </div>

            {/* B. Type-specific fields */}
            {selected.fields.length > 0 && (
              <div>
                <p className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  <span className="flex h-5 w-5 items-center justify-center rounded bg-primary/10 text-[10px] font-bold text-primary">B</span>
                  Detail {selected.name}
                </p>
                <div className="space-y-3">
                  {selected.fields.map((field) => (
                    <div className="space-y-1.5" key={field.key}>
                      <Label htmlFor={`option-${field.key}`}>{field.label}{field.required ? " *" : ""}</Label>
                      {field.type === "select" ? (
                        <Select value={String(form.options[field.key] ?? "")} onValueChange={(value) => setForm((current) => ({ ...current, options: { ...current.options, [field.key]: field.key.endsWith("Count") ? Number(value) : value } }))}>
                          <SelectTrigger id={`option-${field.key}`}><SelectValue placeholder="Pilih opsi" /></SelectTrigger>
                          <SelectContent>{field.options?.map((option) => <SelectItem key={option} value={option}>{option}</SelectItem>)}</SelectContent>
                        </Select>
                      ) : field.type === "textarea" ? (
                        <Textarea id={`option-${field.key}`} value={String(form.options[field.key] ?? "")} onChange={(e) => setForm((current) => ({ ...current, options: { ...current.options, [field.key]: e.target.value } }))} />
                      ) : (
                        <Input id={`option-${field.key}`} type={field.type} min={field.min} max={field.max} value={String(form.options[field.key] ?? "")} onChange={(e) => setForm((current) => ({ ...current, options: { ...current.options, [field.key]: field.type === "number" ? Number(e.target.value) : e.target.value } }))} />
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* C. Style & Visual */}
            <details className="rounded-xl border bg-white p-3" open>
              <summary className="flex cursor-pointer items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                <span className="flex h-5 w-5 items-center justify-center rounded bg-primary/10 text-[10px] font-bold text-primary">C</span>
                Style & Visual
                <ChevronDown className="ml-auto h-3.5 w-3.5 transition-transform [[data-state=open]>&]:rotate-180" />
              </summary>
              <div className="mt-3 space-y-3">
                <div className="space-y-1.5">
                  <div className="flex items-center gap-1.5">
                    <Label htmlFor="style">Gaya Desain</Label>
                    {form.style && styleRefs[form.style] && <InfoTip text={styleRefs[form.style]} />}
                  </div>
                  <Select value={form.style} onValueChange={(v) => patchField("style", v)}>
                    <SelectTrigger id="style"><SelectValue placeholder="Pilih gaya desain" /></SelectTrigger>
                    <SelectContent>{styleOptions.map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <div className="flex items-center gap-1.5">
                    <Label htmlFor="tone">Tone</Label>
                  </div>
                  <Select value={form.tone} onValueChange={(v) => patchField("tone", v)}>
                    <SelectTrigger id="tone"><SelectValue placeholder="Pilih tone" /></SelectTrigger>
                    <SelectContent>{toneOptions.map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="colorPalette">Color palette</Label>
                  <Input id="colorPalette" value={form.colorPalette} onChange={(e) => patchField("colorPalette", e.target.value)} placeholder="Contoh: #2dd4bf, #ffffff" />
                </div>
              </div>
            </details>

            {/* D. Platform & Format */}
            <details className="rounded-xl border bg-white p-3" open>
              <summary className="flex cursor-pointer items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                <span className="flex h-5 w-5 items-center justify-center rounded bg-primary/10 text-[10px] font-bold text-primary">D</span>
                Platform & Format
                <ChevronDown className="ml-auto h-3.5 w-3.5 transition-transform [[data-state=open]>&]:rotate-180" />
              </summary>
              <div className="mt-3 space-y-3">
                <div className="space-y-1.5">
                  <Label htmlFor="platform">Platform</Label>
                  <Select value={form.platform} onValueChange={(v) => patchField("platform", v)}>
                    <SelectTrigger id="platform"><SelectValue placeholder="Pilih platform" /></SelectTrigger>
                    <SelectContent>{platformOptions.map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="ratio">Rasio Aspek</Label>
                  <Select value={form.ratio} onValueChange={(v) => patchField("ratio", v)}>
                    <SelectTrigger id="ratio"><SelectValue placeholder="Pilih rasio" /></SelectTrigger>
                    <SelectContent>{ratioOptions.map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="offer">Offer / Penawaran</Label>
                  <Input id="offer" value={form.offer} onChange={(e) => patchField("offer", e.target.value)} placeholder="Contoh: Diskon 50% untuk pembelian pertama" />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="notes">Catatan tambahan</Label>
                  <Textarea id="notes" value={form.notes} onChange={(e) => patchField("notes", e.target.value)} placeholder="Instruksi khusus untuk AI..." />
                </div>
              </div>
            </details>

            {/* Generate */}
            <Button className="h-11 w-full" disabled={!valid || loading} onClick={generate}>
              {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
              {loading ? "Menyusun materi…" : "Generate Materi"}
            </Button>
          </div>
        </section>

        {/* Right panel: preview + result */}
        <div className="space-y-4">
          {/* Preview panel (desktop only) */}
          <div className="hidden xl:block">
            <div className="rounded-2xl border bg-white p-4">
              <PreviewPanel selected={selected} form={form} />
            </div>
          </div>
          {/* Result with terminal toggle */}
          <div>
            {result && (
              <div className="mb-2 flex items-center gap-2">
                <button onClick={() => setShowTerminal(false)} className={cn("rounded-md px-2.5 py-1 text-xs font-medium transition-colors", !showTerminal ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:text-foreground")}>
                  <Sparkles className="mr-1 inline-block h-3 w-3" />Cards
                </button>
                <button onClick={() => setShowTerminal(true)} className={cn("rounded-md px-2.5 py-1 text-xs font-medium transition-colors", showTerminal ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:text-foreground")}>
                  <Terminal className="mr-1 inline-block h-3 w-3" />Terminal
                </button>
              </div>
            )}
            <PromptResult result={result} loading={loading} onEdit={() => document.getElementById("prompt-brief")?.scrollIntoView({ behavior: "smooth" })} onRegenerate={generate} />
          </div>
        </div>
      </div>

      {/* Confirm type change dialog */}
      <Dialog open={Boolean(pendingType)} onOpenChange={(open) => !open && setPendingType(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Ganti jenis konten?</DialogTitle>
            <DialogDescription>Hasil yang sedang tampil akan ditutup. Brief utama tetap tersimpan.</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPendingType(null)}>Batal</Button>
            <Button onClick={() => pendingType && applyType(pendingType)}>Ganti jenis</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
