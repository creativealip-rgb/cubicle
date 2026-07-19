"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
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
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { generateVisualPrompt } from "@/lib/actions/visual-prompts";
import {
  Check,
  Copy,
  Loader2,
  Sparkles,
  Video,
  Wand2,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const modes = [
  {
    id: "banner",
    name: "Design Grafis",
    ratio: "1:1",
    desc: "Brief produk jadi banner komersial siap upload.",
  },
  {
    id: "typography",
    name: "Typography Ads",
    ratio: "4:5",
    desc: "Iklan tipografi premium dengan copy conversion.",
  },
  {
    id: "logo-mockup",
    name: "Logo Produk",
    ratio: "1:1",
    desc: "Logo + brand mockup affiliate-ready.",
  },
  {
    id: "nine-feed",
    name: "9 Feed Konsisten",
    ratio: "4:5",
    desc: "Satu campaign jadi 9 feed: hero, fitur, harga, testimoni, CTA.",
  },
  {
    id: "carousel",
    name: "Carousel Feeds",
    ratio: "4:5",
    desc: "Alur hook → value → proof → CTA untuk 3–7 slide.",
  },
  {
    id: "thumbnail",
    name: "YouTube Thumbnail",
    ratio: "16:9",
    desc: "Thumbnail clickable dengan subject, ekspresi, dan teks overlay.",
  },
  {
    id: "menu-fnb",
    name: "Menu F&B",
    ratio: "4:5",
    desc: "Menu restoran/cafe premium dengan layout siap jual.",
  },
  {
    id: "try-on",
    name: "Try-On Produk",
    ratio: "4:5",
    desc: "Prompt model memakai produk untuk visual conversion.",
  },
  {
    id: "review",
    name: "Review Produk",
    ratio: "1:1",
    desc: "Banner review high-converting dengan badge dan proof.",
  },
  {
    id: "copy",
    name: "Copy Writing",
    ratio: "Text",
    desc: "Hook, body, CTA, caption, dan variasi angle.",
  },
  {
    id: "storyboard",
    name: "Video Storyboard",
    ratio: "16:9",
    desc: "Scene-by-scene storyboard dengan VO, overlay, dan visual.",
  },
  {
    id: "face-card",
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
  const router = useRouter();
  const [mode, setMode] = useState(modes[0].id);
  const [brand, setBrand] = useState("GoldHeritage");
  const [product, setProduct] = useState("24K Pendant — Eid Edition");
  const [offer, setOffer] = useState("Diskon 20% sampai akhir minggu");
  const [audience, setAudience] = useState(
    "wanita 25-40 yang suka perhiasan premium",
  );
  const [style, setStyle] = useState(styles[0]);
  const [ratio, setRatio] = useState(ratios[0]);
  const [color, setColor] = useState("gold, ivory, deep emerald");
  const [notes, setNotes] = useState(
    "Produk harus terlihat premium, clean, dan siap dipakai untuk ads.",
  );
  const [aiOutput, setAiOutput] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [copied, setCopied] = useState(false);

  const selected = modes.find((item) => item.id === mode) ?? modes[0];

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
    notes,
    offer,
    product,
    ratio,
    selected.name,
    selected.id,
    style,
  ]);

  const displayedOutput = aiOutput || output;

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
      toast.success(
        `AI output generated · $${Number(result.usage?.costUsd ?? 0).toFixed(4)}`,
      );
      router.refresh();
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
      <div className="space-y-5 p-5 sm:p-6">
        <Tabs value={mode} onValueChange={selectMode} className="space-y-3">
          <TabsList className="h-auto w-full flex-wrap justify-start gap-1 overflow-x-auto p-1">
            {modes.map((item) => {
              const active = mode === item.id;
              return (
                <TabsTrigger
                  key={item.id}
                  value={item.id}
                  className="gap-1.5 data-[state=active]:shadow"
                >
                  <span>{item.name}</span>
                  <span
                    className={cn(
                      "rounded-full px-1.5 py-0.5 text-[10px] tabular-nums",
                      active
                        ? "bg-primary/10 text-primary"
                        : "bg-background/80 text-muted-foreground",
                    )}
                  >
                    {item.ratio}
                  </span>
                </TabsTrigger>
              );
            })}
          </TabsList>
          <p className="text-sm text-muted-foreground">{selected.desc}</p>
        </Tabs>

        <div className="grid gap-5 xl:grid-cols-[minmax(0,420px)_minmax(0,1fr)]">
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
