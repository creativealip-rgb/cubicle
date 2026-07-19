"use client";

import { useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { generateVisualPrompt } from "@/lib/actions/visual-prompts";
import {
  Check,
  Copy,
  Image as ImageIcon,
  LayoutGrid,
  Loader2,
  MessageSquareText,
  Package,
  Sparkles,
  Video,
  Wand2,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

type ModeGroup = "design" | "feed" | "product" | "content";

const groups: { id: ModeGroup; name: string; icon: typeof ImageIcon }[] = [
  { id: "design", name: "Design", icon: ImageIcon },
  { id: "feed", name: "Feed", icon: LayoutGrid },
  { id: "product", name: "Produk", icon: Package },
  { id: "content", name: "Konten", icon: MessageSquareText },
];

const modes = [
  {
    id: "banner",
    group: "design" as const,
    name: "Design Grafis",
    ratio: "1:1",
    desc: "Brief produk jadi banner komersial siap upload.",
  },
  {
    id: "typography",
    group: "design" as const,
    name: "Typography Ads",
    ratio: "4:5",
    desc: "Iklan tipografi premium dengan copy conversion.",
  },
  {
    id: "logo-mockup",
    group: "design" as const,
    name: "Logo Produk",
    ratio: "1:1",
    desc: "Logo + brand mockup affiliate-ready.",
  },
  {
    id: "nine-feed",
    group: "feed" as const,
    name: "9 Feed Konsisten",
    ratio: "4:5",
    desc: "Satu campaign jadi 9 feed: hero, fitur, harga, testimoni, CTA.",
  },
  {
    id: "carousel",
    group: "feed" as const,
    name: "Carousel Feeds",
    ratio: "4:5",
    desc: "Alur hook → value → proof → CTA untuk 3–7 slide.",
  },
  {
    id: "thumbnail",
    group: "feed" as const,
    name: "YouTube Thumbnail",
    ratio: "16:9",
    desc: "Thumbnail clickable dengan subject, ekspresi, dan teks overlay.",
  },
  {
    id: "menu-fnb",
    group: "product" as const,
    name: "Menu F&B",
    ratio: "4:5",
    desc: "Menu restoran/cafe premium dengan layout siap jual.",
  },
  {
    id: "try-on",
    group: "product" as const,
    name: "Try-On Produk",
    ratio: "4:5",
    desc: "Prompt model memakai produk untuk visual conversion.",
  },
  {
    id: "review",
    group: "product" as const,
    name: "Review Produk",
    ratio: "1:1",
    desc: "Banner review high-converting dengan badge dan proof.",
  },
  {
    id: "copy",
    group: "content" as const,
    name: "Copy Writing",
    ratio: "Text",
    desc: "Hook, body, CTA, caption, dan variasi angle.",
  },
  {
    id: "storyboard",
    group: "content" as const,
    name: "Video Storyboard",
    ratio: "16:9",
    desc: "Scene-by-scene storyboard dengan VO, overlay, dan visual.",
  },
  {
    id: "face-card",
    group: "content" as const,
    name: "Face Card Analysis",
    ratio: "4:5",
    desc: "Prompt board analisa style, color, grooming, makeup, spectacles.",
  },
];

const styles = [
  "Luxury Premium",
  "Clean Minimal",
  "Bold Marketplace",
  "Futuristic Tech",
  "Warm F&B",
  "Editorial Magazine",
  "Viral TikTok",
  "Corporate Premium",
];
const ratios = [
  "1:1 Instagram",
  "4:5 Feed",
  "9:16 Story/Reels/TikTok",
  "16:9 YouTube/Web",
  "Multi-ratio",
];

function pickRatio(modeRatio: string) {
  if (modeRatio === "Text") return "Multi-ratio";
  return ratios.find((r) => r.startsWith(modeRatio)) ?? ratios[0];
}

export function AutoFeedsStudio() {
  const [group, setGroup] = useState<ModeGroup>("design");
  const [mode, setMode] = useState(modes[0].id);
  const [brand, setBrand] = useState("GoldHeritage");
  const [product, setProduct] = useState("24K Pendant — Eid Edition");
  const [offer, setOffer] = useState("Diskon 20% sampai akhir minggu");
  const [audience, setAudience] = useState(
    "wanita 25-40 yang suka perhiasan premium"
  );
  const [style, setStyle] = useState(styles[0]);
  const [ratio, setRatio] = useState(ratios[0]);
  const [color, setColor] = useState("gold, ivory, deep emerald");
  const [notes, setNotes] = useState(
    "Produk harus terlihat premium, clean, dan siap dipakai untuk ads."
  );
  const [aiOutput, setAiOutput] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [copied, setCopied] = useState(false);

  const selected = modes.find((item) => item.id === mode) ?? modes[0];
  const groupModes = modes.filter((item) => item.group === group);

  const output = useMemo(() => {
    const base = `ENGINE: ${selected.name}\nFORMAT: ${ratio}\nBRAND: ${brand}\nPRODUCT/OFFER: ${product}\nPROMO: ${offer}\nAUDIENCE: ${audience}\nSTYLE: ${style}\nCOLOR PALETTE: ${color}\nNOTES: ${notes}`;

    if (selected.id === "copy") {
      return `${base}\n\nTASK:\nCreate 10 high-converting Indonesian marketing copy variations for this product. Each variation must include:\n1. Hook under 9 words\n2. Body copy under 35 words\n3. CTA under 6 words\n4. Caption under 120 words\n5. Hashtags relevant to niche\n\nTone: persuasive, premium, clear, non-cringe. Output as numbered list.`;
    }

    if (selected.id === "nine-feed") {
      return `${base}\n\nTASK:\nCreate a 9-post Instagram feed campaign. Keep color, typography, lighting, and product treatment consistent. Define each post:\n1. Hero product\n2. Problem statement\n3. Main benefit\n4. Feature detail\n5. Social proof\n6. Offer / price\n7. Lifestyle use-case\n8. FAQ / objection handling\n9. Strong CTA\n\nFor each post output: visual prompt, overlay text, composition, and CTA.`;
    }

    if (selected.id === "carousel") {
      return `${base}\n\nTASK:\nCreate a 7-slide carousel concept. Flow: hook, problem, insight, solution, proof, offer, CTA. For each slide include visual direction, headline, body text, layout notes, and image prompt. Keep all slides visually consistent.`;
    }

    if (selected.id === "storyboard") {
      return `${base}\n\nTASK:\nCreate a 30-second video storyboard. Output 8 fast scenes. For each scene include: duration, camera angle, visual prompt, voice-over, text overlay, transition, and music mood.`;
    }

    return `${base}\n\nTASK:\nGenerate a commercial-grade visual prompt for AI image/design generation. Requirements:\n- clean product hierarchy\n- strong typography placement\n- conversion-focused layout\n- realistic lighting and premium composition\n- platform-ready ${ratio}\n- include headline, subheadline, CTA, badge, background direction\n- avoid messy text, distorted logo, extra fingers, unreadable typography\n\nOUTPUT:\n1. Final visual prompt\n2. Overlay copy\n3. Layout composition\n4. Negative prompt\n5. Export checklist`;
  }, [
    audience,
    brand,
    color,
    mode,
    notes,
    offer,
    product,
    ratio,
    selected.name,
    selected.id,
    style,
  ]);

  const displayedOutput = aiOutput || output;

  function selectGroup(next: ModeGroup) {
    setGroup(next);
    const first = modes.find((item) => item.group === next) ?? modes[0];
    setMode(first.id);
    setRatio(pickRatio(first.ratio));
    setAiOutput("");
  }

  function selectMode(modeId: string) {
    const next = modes.find((item) => item.id === modeId) ?? modes[0];
    setMode(next.id);
    setRatio(pickRatio(next.ratio));
    setAiOutput("");
  }

  async function handleGenerateAi() {
    setIsGenerating(true);
    try {
      const result = await generateVisualPrompt({
        mode: selected.name,
        brand,
        product,
        offer,
        audience,
        style,
        ratio,
        color,
        notes,
        draftPrompt: output,
      });
      setAiOutput(result.generation.generatedOutput || "");
      toast.success("AI output generated");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "AI generation failed");
    } finally {
      setIsGenerating(false);
    }
  }

  async function copyOutput() {
    await navigator.clipboard.writeText(displayedOutput);
    setCopied(true);
    toast.success("Prompt copied");
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <div className="overflow-hidden rounded-2xl border bg-white shadow-sm">
      <div className="border-b bg-gradient-to-r from-slate-950 via-slate-900 to-indigo-950 px-5 py-5 text-white sm:px-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="inline-flex h-8 w-8 items-center justify-center rounded-xl bg-white/10">
                <Wand2 className="h-4 w-4" />
              </span>
              <Badge className="border-0 bg-white/10 text-white hover:bg-white/10">
                Prompt Engine
              </Badge>
            </div>
            <h2 className="mt-3 text-xl font-semibold tracking-tight sm:text-2xl">
              Brief → prompt siap generate
            </h2>
            <p className="mt-1 max-w-xl text-sm text-slate-300">
              Pilih jenis prompt, isi brief, generate atau copy draft.
            </p>
          </div>
          <div className="rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-right">
            <p className="text-[11px] uppercase tracking-wide text-slate-400">
              Rata-rata
            </p>
            <p className="text-lg font-semibold">&lt; 30 dtk</p>
          </div>
        </div>
      </div>

      <div className="space-y-5 p-5 sm:p-6">
        {/* Group tabs */}
        <div className="flex flex-wrap gap-2">
          {groups.map((item) => {
            const Icon = item.icon;
            const active = group === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => selectGroup(item.id)}
                className={cn(
                  "inline-flex min-w-[96px] items-center justify-center gap-1.5 rounded-full border px-4 py-2 text-sm font-medium transition",
                  active
                    ? "border-indigo-500 bg-indigo-50 text-indigo-700 shadow-sm"
                    : "border-border bg-background text-muted-foreground hover:border-indigo-300 hover:text-foreground"
                )}
              >
                <Icon className="h-3.5 w-3.5" />
                {item.name}
              </button>
            );
          })}
        </div>

        {/* Mode pills */}
        <div className="space-y-2">
          <div className="flex flex-wrap gap-2">
            {groupModes.map((item) => {
              const active = mode === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => selectMode(item.id)}
                  className={cn(
                    "inline-flex items-center gap-2 rounded-full px-3.5 py-1.5 text-sm transition",
                    active
                      ? "bg-slate-900 text-white shadow-sm"
                      : "bg-muted/70 text-muted-foreground hover:bg-muted hover:text-foreground"
                  )}
                >
                  {item.name}
                  <span
                    className={cn(
                      "rounded-full px-1.5 py-0.5 text-[10px] font-medium",
                      active ? "bg-white/15 text-white" : "bg-background/80"
                    )}
                  >
                    {item.ratio}
                  </span>
                </button>
              );
            })}
          </div>
          <p className="text-sm text-muted-foreground">{selected.desc}</p>
        </div>

        <div className="grid gap-5 xl:grid-cols-[minmax(0,420px)_minmax(0,1fr)]">
          {/* Brief form */}
          <div className="rounded-2xl border bg-slate-50/70 p-4 sm:p-5">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-semibold">Brief</p>
                <p className="text-xs text-muted-foreground">
                  Mode: {selected.name}
                </p>
              </div>
              {selected.id === "storyboard" ? (
                <Video className="h-4 w-4 text-muted-foreground" />
              ) : (
                <Sparkles className="h-4 w-4 text-muted-foreground" />
              )}
            </div>

            <div className="space-y-3.5">
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label className="text-xs">Brand</Label>
                  <Input
                    value={brand}
                    onChange={(e) => setBrand(e.target.value)}
                    className="bg-white"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Product / campaign</Label>
                  <Input
                    value={product}
                    onChange={(e) => setProduct(e.target.value)}
                    className="bg-white"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs">Promo / offer</Label>
                <Input
                  value={offer}
                  onChange={(e) => setOffer(e.target.value)}
                  className="bg-white"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs">Audience</Label>
                <Input
                  value={audience}
                  onChange={(e) => setAudience(e.target.value)}
                  className="bg-white"
                />
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label className="text-xs">Style</Label>
                  <Select value={style} onValueChange={setStyle}>
                    <SelectTrigger className="bg-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {styles.map((s) => (
                        <SelectItem key={s} value={s}>
                          {s}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Ratio</Label>
                  <Select value={ratio} onValueChange={setRatio}>
                    <SelectTrigger className="bg-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {ratios.map((r) => (
                        <SelectItem key={r} value={r}>
                          {r}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs">Color palette</Label>
                <Input
                  value={color}
                  onChange={(e) => setColor(e.target.value)}
                  className="bg-white"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs">Extra notes</Label>
                <Textarea
                  rows={4}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="bg-white resize-none"
                />
              </div>
            </div>
          </div>

          {/* Output */}
          <div className="flex min-h-[420px] flex-col rounded-2xl border p-4 sm:p-5">
            <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-sm font-semibold">Output prompt</p>
                <p className="text-xs text-muted-foreground">
                  {aiOutput ? "Hasil AI" : "Draft siap edit / generate AI"}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button
                  onClick={handleGenerateAi}
                  disabled={isGenerating}
                  className="gap-2"
                >
                  {isGenerating ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Sparkles className="h-4 w-4" />
                  )}
                  {isGenerating ? "Generating..." : "Generate AI"}
                </Button>
                <Button onClick={copyOutput} variant="outline" className="gap-2">
                  {copied ? (
                    <Check className="h-4 w-4" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                  Copy
                </Button>
              </div>
            </div>

            <Textarea
              value={displayedOutput}
              readOnly
              className="min-h-[320px] flex-1 resize-y font-mono text-xs leading-5"
            />

            <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
              <span className="inline-flex items-center gap-1">
                <Wand2 className="h-3 w-3" /> Siap paste ke AI image/design tool
              </span>
              <span className="inline-flex items-center gap-1">
                <Sparkles className="h-3 w-3" /> Cocok untuk client campaign
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
