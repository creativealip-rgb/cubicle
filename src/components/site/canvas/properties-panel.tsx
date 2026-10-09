"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import {
  Plus,
  X,
  Sparkles,
  Check,
  Loader2,
  Calendar,
  Bold,
  Italic,
  Underline,
  Strikethrough,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Settings2,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ImageUpload } from "./image-upload";
import type { PersonalSiteSection } from "@/lib/personal-site/model";
import { PERSONAL_SITE_ANIMATIONS } from "@/lib/personal-site/model";
import { generatePersonalSiteCopy } from "@/lib/actions/personal-site-ai";
import { toast } from "sonner";
import { useT } from "@/lib/i18n-client";
import { CUBIQLO_FONTS } from "@/lib/builder-fonts";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type PropertiesPanelProps = {
  section: PersonalSiteSection | null;
  onUpdate: (patch: Partial<PersonalSiteSection>) => void;
  onDelete?: () => void;
  onClose: () => void;
};

/**
 * Fresh, collision-resistant id for nested items added in the panel.
 * Kept under the model's 80-char id limit so saves stay schema-compatible.
 */
export function makeItemId(prefix = "item"): string {
  const random = typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID().replace(/-/g, "").slice(0, 12)
    : `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 10)}`;
  return `${prefix}_${random}`;
}

/** Append a new item produced by `create` without mutating the source array. */
export function appendItem<T>(items: readonly T[], create: () => T): T[] {
  return [...items, create()];
}

/** Patch the item at `index`, leaving all other items untouched. Out-of-range indexes are no-ops. */
export function patchItem<T>(items: readonly T[], index: number, patch: Partial<T>): T[] {
  if (index < 0 || index >= items.length) return [...items];
  return items.map((item, i) => (i === index ? { ...item, ...patch } : item));
}

/** Remove the item at `index`. Out-of-range indexes return a copy of the original list. */
export function removeItemAt<T>(items: readonly T[], index: number): T[] {
  if (index < 0 || index >= items.length) return [...items];
  return items.filter((_, i) => i !== index);
}

/**
 * AI copy generation state for preview-before-apply UX.
 */
interface AiGenerationState {
  isGenerating: boolean;
  preview: PersonalSiteSection | null;
  pendingPatch: PersonalSiteSection | null; // what to apply after user clicks Apply
}

export function PropertiesPanel({ section, onUpdate, onDelete, onClose }: PropertiesPanelProps) {
  const { t } = useT();
  const [aiState, setAiState] = useState<AiGenerationState>({
    isGenerating: false,
    preview: null,
    pendingPatch: null,
  });

  // Reset AI preview when section changes
  useEffect(() => {
    setAiState({ isGenerating: false, preview: null, pendingPatch: null });
  }, [section?.id]);

  if (!section) return null;

  const handleGenerateCopy = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);

    const businessName = formData.get("businessName") as string;
    const niche = formData.get("niche") as string;
    const targetAudience = formData.get("targetAudience") as string;
    const offer = formData.get("offer") as string;
    const tone = formData.get("tone") as "professional" | "friendly" | "bold" | "minimal";

    try {
      setAiState(s => ({ ...s, isGenerating: true }));

      const result = await generatePersonalSiteCopy({
        sectionType: section.type,
        businessName,
        niche,
        targetAudience,
        offer,
        tone,
      });

      // Store preview for explicit Apply
      setAiState({
        isGenerating: false,
        preview: result.patch,
        pendingPatch: result.patch,
      });

      toast.success(t("Copy berhasil dibuat — klik Apply untuk menerapkannya.", "Copy generated — click Apply to use it."));
    } catch (err) {
      const msg = err instanceof Error ? err.message : t("Gagal membuat copy.", "Failed to generate copy.");
      toast.error(msg);
      setAiState({ isGenerating: false, preview: null, pendingPatch: null });
    }
  };

  const handleApplyPreview = () => {
    if (!aiState.pendingPatch) return;
    onUpdate(aiState.pendingPatch);
    setAiState({ isGenerating: false, preview: null, pendingPatch: null });
    toast.success(t("Copy diterapkan ke bagian.", "Copy applied to section."));
  };

  const handleDiscardPreview = () => {
    setAiState({ isGenerating: false, preview: null, pendingPatch: null });
  };

  return (
    <aside className="hidden md:flex w-80 shrink-0 flex-col border-l bg-background">
      <div className="flex items-center justify-between border-b px-4 py-3 bg-muted/20">
        <div className="flex items-center gap-2 min-w-0">
          <Settings2 className="h-4 w-4 text-primary shrink-0" />
          <div>
            <h2 className="text-xs font-bold uppercase tracking-wider text-foreground">{t("Properti Bagian", "Section Properties")}</h2>
            <span className="inline-block px-1.5 py-0.5 rounded text-[10px] font-semibold bg-muted text-muted-foreground uppercase">
              {section.type}
            </span>
          </div>
        </div>
        <Button type="button" variant="ghost" size="icon" className="h-7 w-7 rounded-full hover:bg-muted" onClick={onClose} aria-label={t("Tutup panel properti", "Close properties panel")}>
          <X className="h-4 w-4" />
        </Button>
      </div>

      <div className="flex-1 space-y-6 overflow-y-auto p-4 custom-scrollbar">
        {/* AI Copy Generation */}
        <div className="rounded-lg border bg-muted/30 p-4">
          <div className="mb-3 flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" />
            <Label className="text-xs font-medium uppercase text-muted-foreground">{t("Generator Copy AI", "AI Copy Generator")}</Label>
          </div>

          {section.type === "services" && (
            <form onSubmit={handleGenerateCopy} className="space-y-3">
              <Input name="businessName" placeholder={t("Nama bisnis", "Business name")} defaultValue="" required maxLength={80} />
              <Textarea name="niche" placeholder={t("Niche/spesialisasi (mis: pemasaran digital)", "Niche/specialization (e.g. digital marketing)")} required maxLength={160} className="min-h-10 resize-none text-xs" />
              <Textarea name="targetAudience" placeholder={t("Target audiens (mis: UMKM Jakarta)", "Target audience (e.g. small businesses)")} required maxLength={240} className="min-h-10 resize-none text-xs" />
              <Textarea name="offer" placeholder={t("Penawaran utama (mis: landing page siap diluncurkan)", "Main offer (e.g. launch-ready landing page)")} required maxLength={500} className="min-h-12 resize-none text-xs" />
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">{t("Nada", "Tone")}</Label>
                <select name="tone" className="flex h-8 w-full rounded-md border border-input bg-background px-2 text-xs shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary">
                  <option value="professional">{t("Profesional", "Professional")}</option>
                  <option value="friendly">{t("Ramah", "Friendly")}</option>
                  <option value="bold">{t("Tegas", "Bold")}</option>
                  <option value="minimal">{t("Minimal", "Minimal")}</option>
                </select>
              </div>
              <Button type="submit" disabled={aiState.isGenerating} className="w-full gap-1 text-xs">
                {aiState.isGenerating ? (
                  <>
                    <Loader2 className="h-3 w-3 animate-spin" /> Generate...
                  </>
                ) : (
                  <>
                    <Sparkles className="h-3 w-3" /> Generate copy
                  </>
                )}
              </Button>
            </form>
          )}

          {section.type === "faq" && (
            <form onSubmit={handleGenerateCopy} className="space-y-3">
              <Input name="businessName" placeholder={t("Nama bisnis", "Business name")} defaultValue="" required maxLength={80} />
              <Textarea name="niche" placeholder={t("Niche/spesialisasi (mis: pengembangan web)", "Niche/specialization (e.g. web development)")} required maxLength={160} className="min-h-10 resize-none text-xs" />
              <Textarea name="targetAudience" placeholder={t("Target audiens (mis: startup Indonesia)", "Target audience (e.g. startups)")} required maxLength={240} className="min-h-10 resize-none text-xs" />
              <Textarea name="offer" placeholder={t("Penawaran utama (mis: jasa pembuatan website kustom)", "Main offer (e.g. custom website development)")} required maxLength={500} className="min-h-12 resize-none text-xs" />
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">{t("Nada", "Tone")}</Label>
                <select name="tone" className="flex h-8 w-full rounded-md border border-input bg-background px-2 text-xs shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary">
                  <option value="professional">{t("Profesional", "Professional")}</option>
                  <option value="friendly">{t("Ramah", "Friendly")}</option>
                  <option value="bold">{t("Tegas", "Bold")}</option>
                  <option value="minimal">{t("Minimal", "Minimal")}</option>
                </select>
              </div>
              <Button type="submit" disabled={aiState.isGenerating} className="w-full gap-1 text-xs">
                {aiState.isGenerating ? (
                  <>
                    <Loader2 className="h-3 w-3 animate-spin" /> Generate...
                  </>
                ) : (
                  <>
                    <Sparkles className="h-3 w-3" /> Generate FAQ
                  </>
                )}
              </Button>
            </form>
          )}

          {section.type === "cta" && (
            <form onSubmit={handleGenerateCopy} className="space-y-3">
              <Input name="businessName" placeholder={t("Nama bisnis", "Business name")} defaultValue="" required maxLength={80} />
              <Textarea name="niche" placeholder={t("Niche/spesialisasi (mis: konsultasi desain)", "Niche/specialization (e.g. design consultancy)")} required maxLength={160} className="min-h-10 resize-none text-xs" />
              <Textarea name="targetAudience" placeholder={t("Target audiens (mis: tim produk)", "Target audience (e.g. product teams)")} required maxLength={240} className="min-h-10 resize-none text-xs" />
              <Textarea name="offer" placeholder={t("Penawaran utama (mis: konsultasi UX/UI & sistem desain)", "Main offer (e.g. UX/UI and design-system consulting)")} required maxLength={500} className="min-h-12 resize-none text-xs" />
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">{t("Nada", "Tone")}</Label>
                <select name="tone" className="flex h-8 w-full rounded-md border border-input bg-background px-2 text-xs shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary">
                  <option value="professional">{t("Profesional", "Professional")}</option>
                  <option value="friendly">{t("Ramah", "Friendly")}</option>
                  <option value="bold">{t("Tegas", "Bold")}</option>
                  <option value="minimal">{t("Minimal", "Minimal")}</option>
                </select>
              </div>
              <Button type="submit" disabled={aiState.isGenerating} className="w-full gap-1 text-xs">
                {aiState.isGenerating ? (
                  <>
                    <Loader2 className="h-3 w-3 animate-spin" /> Generate CTA...
                  </>
                ) : (
                  <>
                    <Sparkles className="h-3 w-3" /> Generate CTA
                  </>
                )}
              </Button>
            </form>
          )}
        </div>

        {/* Preview before apply */}
        {aiState.preview && (
          <div className="rounded-lg border bg-accent p-4">
            <div className="mb-2 flex items-center justify-between">
              <Label className="text-xs font-medium">{t("Pratinjau", "Preview")}</Label>
              <div className="flex gap-1">
                <Button type="button" variant="outline" size="sm" className="h-6 text-xs" onClick={handleDiscardPreview}>
                  <X className="h-3 w-3" /> Discard
                </Button>
                <Button type="button" variant="default" size="sm" className="h-6 gap-1 text-xs" onClick={handleApplyPreview}>
                  <Check className="h-3 w-3" /> Apply
                </Button>
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              {t("Klik Apply untuk menerapkan copy ke bagian ini. Konten saat ini tidak akan hilang sebelum Anda konfirmasi.", "Click Apply to use this copy in the section. Existing content stays until you confirm.")}
            </p>
          </div>
        )}

        {/* Shared fields */}
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label className="text-xs font-medium text-foreground">{t("Judul Bagian", "Heading")}</Label>
            <Input
              value={section.heading}
              maxLength={80}
              onChange={(e) => onUpdate({ heading: e.target.value })}
              className="h-8.5 text-xs bg-background"
              placeholder={t("Judul bagian", "Section heading")}
            />
          </div>

          {/* Typography & Font Styling — EXACTLY LIKE FORM BUILDER */}
          <div className="space-y-3 pt-2 border-t border-border/60">
            {/* Font Family */}
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-foreground">{t("Gaya Font", "Font Family")}</Label>
              <Select
                value={("fontFamily" in section ? (section as any).fontFamily : undefined) || "inter"}
                onValueChange={(val) => onUpdate({ fontFamily: val } as any)}
              >
                <SelectTrigger className="w-full bg-background border-border/70 text-xs">
                  <SelectValue placeholder="Pilih Font..." />
                </SelectTrigger>
                <SelectContent>
                  {CUBIQLO_FONTS.map((font) => (
                    <SelectItem key={font.id} value={font.id} className="text-xs">
                      {font.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Font Size Selector (SM / BASE / LG / XL) */}
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-foreground">{t("Ukuran Teks", "Font Size")}</Label>
              <div className="grid grid-cols-4 gap-1">
                {(["sm", "base", "lg", "xl"] as const).map((sz) => (
                  <button
                    key={sz}
                    type="button"
                    onClick={() => onUpdate({ fontSize: sz } as any)}
                    className={`py-1 text-xs font-bold rounded-md border transition-all ${
                      (("fontSize" in section ? (section as any).fontSize : undefined) || "base") === sz
                        ? "bg-primary text-primary-foreground border-primary shadow-xs"
                        : "bg-background text-muted-foreground hover:bg-muted/50 border-border/70"
                    }`}
                  >
                    {sz.toUpperCase()}
                  </button>
                ))}
              </div>
            </div>

            {/* Text Styles: Bold, Italic, Underline, Strikethrough */}
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-foreground">{t("Gaya Penulisan Teks", "Text Formatting")}</Label>
              <div className="grid grid-cols-4 gap-1 rounded-lg border border-border/70 bg-background p-0.5">
                <button
                  type="button"
                  onClick={() => {
                    const isBold = ("bold" in section ? (section as any).bold : false);
                    onUpdate({ bold: !isBold } as any);
                  }}
                  className={`py-1.5 text-xs rounded font-bold transition-colors flex items-center justify-center ${
                    ("bold" in section && (section as any).bold) ? "bg-primary text-primary-foreground shadow-xs" : "text-muted-foreground hover:bg-muted/50"
                  }`}
                  title="Bold"
                >
                  <Bold className="h-3.5 w-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const isItalic = ("italic" in section ? (section as any).italic : false);
                    onUpdate({ italic: !isItalic } as any);
                  }}
                  className={`py-1.5 text-xs rounded font-bold transition-colors flex items-center justify-center ${
                    ("italic" in section && (section as any).italic) ? "bg-primary text-primary-foreground shadow-xs" : "text-muted-foreground hover:bg-muted/50"
                  }`}
                  title="Italic"
                >
                  <Italic className="h-3.5 w-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const isUnderline = ("underline" in section ? (section as any).underline : false);
                    onUpdate({ underline: !isUnderline } as any);
                  }}
                  className={`py-1.5 text-xs rounded font-bold transition-colors flex items-center justify-center ${
                    ("underline" in section && (section as any).underline) ? "bg-primary text-primary-foreground shadow-xs" : "text-muted-foreground hover:bg-muted/50"
                  }`}
                  title="Underline"
                >
                  <Underline className="h-3.5 w-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const isStrike = ("strikethrough" in section ? (section as any).strikethrough : false);
                    onUpdate({ strikethrough: !isStrike } as any);
                  }}
                  className={`py-1.5 text-xs rounded font-bold transition-colors flex items-center justify-center ${
                    ("strikethrough" in section && (section as any).strikethrough) ? "bg-primary text-primary-foreground shadow-xs" : "text-muted-foreground hover:bg-muted/50"
                  }`}
                  title="Strikethrough"
                >
                  <Strikethrough className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>

            {/* Text Alignment */}
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-foreground">{t("Perataan Teks", "Text Alignment")}</Label>
              <div className="grid grid-cols-3 gap-1 rounded-lg border border-border/70 bg-background p-0.5">
                {(["left", "center", "right"] as const).map((al) => (
                  <button
                    key={al}
                    type="button"
                    onClick={() => onUpdate({ align: al } as any)}
                    className={`py-1.5 text-xs rounded font-bold transition-colors flex items-center justify-center ${
                      (("align" in section ? (section as any).align : undefined) || "left") === al
                        ? "bg-primary text-primary-foreground shadow-xs"
                        : "text-muted-foreground hover:bg-muted/50"
                    }`}
                    title={al === "left" ? "Rata Kiri" : al === "center" ? "Rata Tengah" : "Rata Kanan"}
                  >
                    {al === "left" ? (
                      <AlignLeft className="h-3.5 w-3.5" />
                    ) : al === "center" ? (
                      <AlignCenter className="h-3.5 w-3.5" />
                    ) : (
                      <AlignRight className="h-3.5 w-3.5" />
                    )}
                  </button>
                ))}
              </div>
            </div>
            <select
              value={("animation" in section ? section.animation : undefined) ?? "none"}
              onChange={(e) => onUpdate({ animation: e.target.value as (typeof PERSONAL_SITE_ANIMATIONS)[number] })}
              className="flex h-8.5 w-full rounded-md border border-input bg-background px-2 text-xs shadow-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary"
            >
              {PERSONAL_SITE_ANIMATIONS.map((a) => (
                <option key={a} value={a}>{a === "none" ? t("Tanpa animasi", "None") : a}</option>
              ))}
            </select>
          </div>
        </div>

        {section.type === "services" && <ServicesEditor section={section} onUpdate={onUpdate} />}
        {section.type === "pricing" && <PricingEditor section={section} onUpdate={onUpdate} />}
        {section.type === "faq" && <FaqEditor section={section} onUpdate={onUpdate} />}
        {section.type === "cta" && <CtaEditor section={section} onUpdate={onUpdate} />}
        {section.type === "gallery" && <GalleryEditor section={section} onUpdate={onUpdate} />}
        {section.type === "image" && <SingleImageEditor section={section} onUpdate={onUpdate} />}
        {section.type === "mediaText" && <MediaTextEditor section={section} onUpdate={onUpdate} />}
        {section.type === "booking" && <BookingEditor section={section} onUpdate={onUpdate} />}

        {/* Delete Element Button at Bottom — EXACTLY LIKE FORM BUILDER */}
        {onDelete && (
          <div className="pt-4 border-t border-border/70">
            <Button
              type="button"
              variant="outline"
              onClick={onDelete}
              className="w-full justify-center gap-2 text-xs font-semibold text-destructive border-destructive/30 hover:bg-destructive/10 hover:border-destructive/60 transition-all h-9"
            >
              <Trash2 className="h-4 w-4" />
              <span>{t("Hapus Bagian Ini", "Delete This Section")}</span>
            </Button>
          </div>
        )}
      </div>
    </aside>
  );
}

type EditorProps<T> = {
  section: T;
  onUpdate: (patch: Partial<PersonalSiteSection>) => void;
};

function RemoveItemButton({ onClick, label }: { onClick: () => void; label: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="absolute right-2 top-2 rounded p-1 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
      aria-label={label}
    >
      <X className="h-3 w-3" />
    </button>
  );
}

function AddItemButton({ onClick, label, disabled }: { onClick: () => void; label: string; disabled?: boolean }) {
  return (
    <Button type="button" variant="outline" size="sm" className="h-7 gap-1 text-xs" onClick={onClick} disabled={disabled}>
      <Plus className="h-3 w-3" /> {label}
    </Button>
  );
}

const SERVICES_MAX = 12;
const PRICING_MAX = 8;
const FAQ_MAX = 12;
const GALLERY_MAX = 12;

function ServicesEditor({ section, onUpdate }: EditorProps<Extract<PersonalSiteSection, { type: "services" }>>) {
  const { t } = useT();
  const atMax = section.items.length >= SERVICES_MAX;
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <Label className="text-xs font-medium uppercase text-muted-foreground">Services ({section.items.length}/{SERVICES_MAX})</Label>
        <AddItemButton
          label={t("Tambah layanan", "Add service")}
          disabled={atMax}
          onClick={() => onUpdate({ items: appendItem(section.items, () => ({ id: makeItemId("service"), title: "", description: "" })) })}
        />
      </div>
      {section.items.map((item, i) => (
        <div key={item.id} className="relative space-y-2 rounded-lg border p-3">
          <RemoveItemButton label={`Remove service ${i + 1}`} onClick={() => onUpdate({ items: removeItemAt(section.items, i) })} />
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">{t("Judul", "Title")}</Label>
            <Input
              value={item.title}
              maxLength={100}
              onChange={(e) => onUpdate({ items: patchItem(section.items, i, { title: e.target.value }) })}
              className="h-8 text-sm"
              placeholder={t("Nama layanan", "Service name")}
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">{t("Deskripsi", "Description")}</Label>
            <Textarea
              value={item.description}
              maxLength={1000}
              onChange={(e) => onUpdate({ items: patchItem(section.items, i, { description: e.target.value }) })}
              className="min-h-16 resize-none text-sm"
              placeholder={t("Apa yang termasuk dalam layanan ini?", "What does this service include?")}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

function PricingEditor({ section, onUpdate }: EditorProps<Extract<PersonalSiteSection, { type: "pricing" }>>) {
  const { t } = useT();
  const atMax = section.offers.length >= PRICING_MAX;
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <Label className="text-xs font-medium uppercase text-muted-foreground">Offers ({section.offers.length}/{PRICING_MAX})</Label>
        <AddItemButton
          label={t("Tambah penawaran", "Add offer")}
          disabled={atMax}
          onClick={() => onUpdate({ offers: appendItem(section.offers, () => ({ id: makeItemId("offer"), name: "", price: "", description: "" })) })}
        />
      </div>
      {section.offers.map((offer, i) => (
        <div key={offer.id} className="relative space-y-2 rounded-lg border p-3">
          <RemoveItemButton label={`Remove offer ${i + 1}`} onClick={() => onUpdate({ offers: removeItemAt(section.offers, i) })} />
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">{t("Nama", "Name")}</Label>
            <Input
              value={offer.name}
              maxLength={100}
              onChange={(e) => onUpdate({ offers: patchItem(section.offers, i, { name: e.target.value }) })}
              className="h-8 text-sm"
              placeholder={t("Nama paket", "Package name")}
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">{t("Harga", "Price")}</Label>
            <Input
              value={offer.price}
              maxLength={80}
              onChange={(e) => onUpdate({ offers: patchItem(section.offers, i, { price: e.target.value }) })}
              className="h-8 text-sm"
              placeholder={t("Rp2.500.000 / Kustom", "$150 / Custom")}
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">{t("Deskripsi", "Description")}</Label>
            <Textarea
              value={offer.description}
              maxLength={1000}
              onChange={(e) => onUpdate({ offers: patchItem(section.offers, i, { description: e.target.value }) })}
              className="min-h-16 resize-none text-sm"
              placeholder={t("Apa yang termasuk?", "What is included?")}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

function FaqEditor({ section, onUpdate }: EditorProps<Extract<PersonalSiteSection, { type: "faq" }>>) {
  const { t } = useT();
  const atMax = section.items.length >= FAQ_MAX;
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <Label className="text-xs font-medium uppercase text-muted-foreground">FAQ ({section.items.length}/{FAQ_MAX})</Label>
        <AddItemButton
          label={t("Tambah pertanyaan", "Add question")}
          disabled={atMax}
          onClick={() => onUpdate({ items: appendItem(section.items, () => ({ id: makeItemId("faq"), question: "", answer: "" })) })}
        />
      </div>
      {section.items.map((item, i) => (
        <div key={item.id} className="relative space-y-2 rounded-lg border p-3">
          <RemoveItemButton label={`Remove question ${i + 1}`} onClick={() => onUpdate({ items: removeItemAt(section.items, i) })} />
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">{t("Pertanyaan", "Question")}</Label>
            <Input
              value={item.question}
              maxLength={200}
              onChange={(e) => onUpdate({ items: patchItem(section.items, i, { question: e.target.value }) })}
              className="h-8 text-sm"
              placeholder={t("Pertanyaan yang sering diajukan", "Frequently asked question")}
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">{t("Jawaban", "Answer")}</Label>
            <Textarea
              value={item.answer}
              maxLength={2000}
              onChange={(e) => onUpdate({ items: patchItem(section.items, i, { answer: e.target.value }) })}
              className="min-h-16 resize-none text-sm"
              placeholder={t("Jawaban singkat dan jelas", "Short, clear answer")}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

function CtaEditor({ section, onUpdate }: EditorProps<Extract<PersonalSiteSection, { type: "cta" }>>) {
  const { t } = useT();
  return (
    <div className="space-y-3">
      <Label className="text-xs font-medium uppercase text-muted-foreground">{t("Ajakan bertindak", "Call to action")}</Label>
      <div className="space-y-1">
        <Label className="text-xs text-muted-foreground">{t("Teks", "Text")}</Label>
        <Textarea
          value={section.text}
          maxLength={500}
          onChange={(e) => onUpdate({ text: e.target.value })}
          className="min-h-16 resize-none text-sm"
          placeholder={t("Ajakan singkat untuk pengunjung", "A short invitation for visitors")}
        />
      </div>
      <div className="space-y-1">
        <Label className="text-xs text-muted-foreground">{t("Label tombol", "Button label")}</Label>
        <Input
          value={section.buttonLabel}
          maxLength={60}
          onChange={(e) => onUpdate({ buttonLabel: e.target.value })}
          className="h-8 text-sm"
          placeholder={t("Hubungi saya", "Contact me")}
        />
      </div>
      <div className="space-y-1">
        <Label className="text-xs text-muted-foreground">{t("URL tombol", "Button URL")}</Label>
        <Input
          value={section.buttonUrl ?? ""}
          maxLength={2000}
          onChange={(e) => onUpdate({ buttonUrl: e.target.value })}
          className="h-8 text-sm"
          placeholder="https://… or mailto:…"
        />
        <p className="text-[11px] text-muted-foreground">{t("Kosongkan untuk mematikan tombol. URL harus publik (http/https/mailto/tel).", "Leave empty to disable the button. URL must be public (http/https/mailto/tel).")}</p>
      </div>
    </div>
  );
}

function GalleryEditor({ section, onUpdate }: EditorProps<Extract<PersonalSiteSection, { type: "gallery" }>>) {
  const { t } = useT();
  const atMax = section.images.length >= GALLERY_MAX;
  const layout = section.layout ?? "grid";
  const aspectRatio = section.aspectRatio ?? "video";
  const columns = section.columns ?? 3;

  return (
    <div className="space-y-4">
      {/* Google Sites Style Layout Selector */}
      <div className="space-y-2 rounded-xl border bg-muted/20 p-3">
        <Label className="text-xs font-semibold text-foreground flex items-center justify-between">
          <span>{t("Layout & Tampilan", "Layout & Display")}</span>
        </Label>

        {/* Layout Presets */}
        <div className="space-y-1">
          <Label className="text-[11px] text-muted-foreground">{t("Format Layout", "Layout Preset")}</Label>
          <select
            value={layout}
            onChange={(e) => onUpdate({ layout: e.target.value as any })}
            className="flex h-8 w-full rounded-lg border border-input bg-background px-2 text-xs shadow-2xs focus-visible:ring-1 focus-visible:ring-primary"
          >
            <option value="grid">{t("Grid Gambar Murni (Google Sites)", "Pure Image Grid")}</option>
            <option value="cards_1col">{t("1 Kolom (Gambar Besar + Teks)", "1 Column (Hero Image + Text)")}</option>
            <option value="cards_2col">{t("2 Kolom (Gambar + Judul & Deskripsi)", "2 Columns (Image + Title/Desc)")}</option>
            <option value="cards_3col">{t("3 Kolom (Cards Berjejer)", "3 Columns (3 Cards Row)")}</option>
            <option value="cards_4col">{t("4 Kolom (Compact Grid)", "4 Columns (Compact Grid)")}</option>
          </select>
        </div>

        {/* Aspect Ratio / Height Controller */}
        <div className="grid grid-cols-2 gap-2 pt-1">
          <div className="space-y-1">
            <Label className="text-[11px] text-muted-foreground">{t("Rasio Foto (Tinggi)", "Aspect Ratio")}</Label>
            <select
              value={aspectRatio}
              onChange={(e) => onUpdate({ aspectRatio: e.target.value as any })}
              className="flex h-8 w-full rounded-lg border border-input bg-background px-2 text-xs shadow-2xs focus-visible:ring-1 focus-visible:ring-primary"
            >
              <option value="video">{t("16:9 (Landscape)", "16:9 Landscape")}</option>
              <option value="square">{t("1:1 (Persegi / Square)", "1:1 Square")}</option>
              <option value="wide">{t("21:9 (Ultra Wide)", "21:9 Ultra Wide")}</option>
              <option value="portrait">{t("3:4 (Portrait)", "3:4 Portrait")}</option>
              <option value="auto">{t("Asli (Auto Height)", "Original Auto")}</option>
            </select>
          </div>

          <div className="space-y-1">
            <Label className="text-[11px] text-muted-foreground">{t("Jumlah Kolom", "Columns")}</Label>
            <select
              value={columns}
              onChange={(e) => onUpdate({ columns: Number(e.target.value) as any })}
              className="flex h-8 w-full rounded-lg border border-input bg-background px-2 text-xs shadow-2xs focus-visible:ring-1 focus-visible:ring-primary"
            >
              <option value={1}>1 {t("Kolom", "Column")}</option>
              <option value={2}>2 {t("Kolom", "Columns")}</option>
              <option value={3}>3 {t("Kolom", "Columns")}</option>
              <option value={4}>4 {t("Kolom", "Columns")}</option>
            </select>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between">
        <Label className="text-xs font-medium uppercase text-muted-foreground">{t("Gambar", "Images")} ({section.images.length}/{GALLERY_MAX})</Label>
        <AddItemButton
          label={t("Tambah gambar", "Add image")}
          disabled={atMax}
          onClick={() => onUpdate({ images: appendItem(section.images, () => ({ id: makeItemId("image"), url: "", alt: "", title: "", description: "" })) })}
        />
      </div>
      {section.images.map((image, i) => (
        <div key={image.id} className="relative space-y-2 rounded-lg border p-3">
          <RemoveItemButton label={t(`Hapus gambar ${i + 1}`, `Remove image ${i + 1}`)} onClick={() => onUpdate({ images: removeItemAt(section.images, i) })} />
          {image.url && (
            <div className="relative aspect-video w-full rounded overflow-hidden">
              <Image src={image.url} alt={image.alt ?? ""} fill sizes="300px" className="object-cover" />
            </div>
          )}
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">{t("Unggah Gambar", "Upload Image")}</Label>
            <ImageUpload
              value={image.url}
              onChange={(url) => onUpdate({ images: patchItem(section.images, i, { url }) })}
              label={t("Unggah", "Upload")}
            />
          </div>

          {/* Show Title & Description inputs when not purely minimal */}
          {(layout !== "grid" || layout.startsWith("cards")) && (
            <div className="space-y-2 pt-1 border-t border-border/50">
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">{t("Judul Card", "Card Title")}</Label>
                <Input
                  value={image.title ?? ""}
                  maxLength={100}
                  onChange={(e) => onUpdate({ images: patchItem(section.images, i, { title: e.target.value }) })}
                  className="h-8 text-xs font-semibold"
                  placeholder={t("Judul item gambar...", "Image card title...")}
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">{t("Deskripsi", "Description")}</Label>
                <Textarea
                  value={image.description ?? ""}
                  maxLength={500}
                  onChange={(e) => onUpdate({ images: patchItem(section.images, i, { description: e.target.value }) })}
                  className="min-h-14 resize-none text-xs"
                  placeholder={t("Keterangan singkat...", "Short description...")}
                />
              </div>
            </div>
          )}

          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">{t("Teks alternatif", "Alt text")}</Label>
            <Input
              value={image.alt ?? ""}
              maxLength={200}
              onChange={(e) => onUpdate({ images: patchItem(section.images, i, { alt: e.target.value }) })}
              className="h-8 text-xs font-mono"
              placeholder={t("Deskripsi gambar", "Image description")}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

function BookingEditor({ section, onUpdate }: EditorProps<Extract<PersonalSiteSection, { type: "booking" }>>) {
  const { t } = useT();
  return (
    <div className="space-y-4">
      <div className="space-y-1">
        <Label className="text-xs text-muted-foreground">{t("Subjudul / Keterangan", "Subtitle / Description")}</Label>
        <Input
          value={section.subtitle || ""}
          maxLength={160}
          onChange={(e) => onUpdate({ subtitle: e.target.value })}
          className="h-8 text-xs"
          placeholder={t("Pilih tanggal dan slot waktu yang tersedia...", "Choose your preferred date and time...")}
        />
      </div>

      <div className="rounded-lg bg-muted/40 border p-3 space-y-2">
        <div className="flex items-center gap-2 text-primary font-semibold text-xs">
          <Calendar className="h-4 w-4" />
          <span>{t("Sinkronisasi Calendar", "Calendar Integration")}</span>
        </div>
        <p className="text-[11px] text-muted-foreground leading-relaxed">
          {t(
            "Jadwal slot waktu dan platform pertemuan (Google Meet, Zoom, dll.) otomatis sinkron dengan jam kerja yang Anda atur di menu Calendar.",
            "Time slots and meeting platforms (Google Meet, Zoom, etc.) automatically sync from your Calendar availability settings."
          )}
        </p>
      </div>
    </div>
  );
}

function SingleImageEditor({ section, onUpdate }: EditorProps<Extract<PersonalSiteSection, { type: "image" }>>) {
  const { t } = useT();
  return (
    <div className="space-y-4">
      <div className="space-y-1.5">
        <Label className="text-xs font-semibold">{t("Unggah Gambar", "Upload Image")}</Label>
        <ImageUpload
          value={section.url || ""}
          onChange={(url) => onUpdate({ url })}
          label={t("Unggah", "Upload")}
        />
      </div>

      <div className="space-y-1">
        <Label className="text-xs text-muted-foreground">{t("Ukuran Gambar", "Image Size")}</Label>
        <select
          value={section.size || "md"}
          onChange={(e) => onUpdate({ size: e.target.value as "sm" | "md" | "lg" | "full" })}
          className="flex h-8 w-full rounded-md border border-input bg-background px-2 text-xs shadow-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary"
        >
          <option value="sm">{t("Kecil (Small)", "Small (sm)")}</option>
          <option value="md">{t("Sedang (Medium)", "Medium (md)")}</option>
          <option value="lg">{t("Besar (Large)", "Large (lg)")}</option>
          <option value="full">{t("Lebar Penuh (Full Width)", "Full Width (full)")}</option>
        </select>
      </div>

      <div className="space-y-1">
        <Label className="text-xs text-muted-foreground">{t("Perataan (Alignment)", "Alignment")}</Label>
        <select
          value={section.align || "center"}
          onChange={(e) => onUpdate({ align: e.target.value as "left" | "center" | "right" })}
          className="flex h-8 w-full rounded-md border border-input bg-background px-2 text-xs shadow-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary"
        >
          <option value="left">{t("Rata Kiri", "Left")}</option>
          <option value="center">{t("Rata Tengah", "Center")}</option>
          <option value="right">{t("Rata Kanan", "Right")}</option>
        </select>
      </div>

      <div className="space-y-1">
        <Label className="text-xs text-muted-foreground">{t("Rasio Aspek", "Aspect Ratio")}</Label>
        <select
          value={section.aspectRatio || "auto"}
          onChange={(e) => onUpdate({ aspectRatio: e.target.value as "auto" | "square" | "video" | "wide" | "portrait" })}
          className="flex h-8 w-full rounded-md border border-input bg-background px-2 text-xs shadow-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary"
        >
          <option value="auto">{t("Otomatis (Sesuai Asli)", "Auto (Original)")}</option>
          <option value="square">{t("Kotak 1:1", "Square 1:1")}</option>
          <option value="video">{t("Video 16:9", "Video 16:9")}</option>
          <option value="wide">{t("Banner Lebar 21:9", "Wide Banner 21:9")}</option>
          <option value="portrait">{t("Potret 3:4", "Portrait 3:4")}</option>
        </select>
      </div>

      <div className="space-y-1">
        <Label className="text-xs text-muted-foreground">{t("Teks Keterangan (Caption)", "Caption")}</Label>
        <Input
          value={section.caption || ""}
          maxLength={200}
          onChange={(e) => onUpdate({ caption: e.target.value })}
          className="h-8 text-xs"
          placeholder={t("Keterangan di bawah gambar...", "Caption below image...")}
        />
      </div>

      <div className="space-y-1">
        <Label className="text-xs text-muted-foreground">{t("Tautan URL (Opsional)", "Link URL (Optional)")}</Label>
        <Input
          value={section.linkUrl || ""}
          maxLength={2000}
          onChange={(e) => onUpdate({ linkUrl: e.target.value })}
          className="h-8 text-xs font-mono"
          placeholder="https://..."
        />
      </div>
    </div>
  );
}

function MediaTextEditor({ section, onUpdate }: EditorProps<Extract<PersonalSiteSection, { type: "mediaText" }>>) {
  const { t } = useT();
  return (
    <div className="space-y-4">
      <div className="space-y-1.5">
        <Label className="text-xs font-semibold">{t("Unggah Gambar Media", "Upload Media Image")}</Label>
        <ImageUpload
          value={section.imageUrl || ""}
          onChange={(imageUrl) => onUpdate({ imageUrl })}
          label={t("Unggah", "Upload")}
        />
      </div>

      <div className="space-y-1">
        <Label className="text-xs text-muted-foreground">{t("Posisi Media (Gambar)", "Media Position")}</Label>
        <select
          value={section.mediaPosition || "left"}
          onChange={(e) => onUpdate({ mediaPosition: e.target.value as "left" | "right" })}
          className="flex h-8 w-full rounded-md border border-input bg-background px-2 text-xs shadow-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary"
        >
          <option value="left">{t("Media di Kiri, Teks di Kanan", "Media Left, Text Right")}</option>
          <option value="right">{t("Teks di Kiri, Media di Kanan", "Text Left, Media Right")}</option>
        </select>
      </div>

      <div className="space-y-1">
        <Label className="text-xs text-muted-foreground">{t("Proporsi Lebar Media", "Media Width")}</Label>
        <select
          value={section.mediaWidth || "50%"}
          onChange={(e) => onUpdate({ mediaWidth: e.target.value as "30%" | "40%" | "50%" | "60%" })}
          className="flex h-8 w-full rounded-md border border-input bg-background px-2 text-xs shadow-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary"
        >
          <option value="30%">30% Media / 70% Teks</option>
          <option value="40%">40% Media / 60% Teks</option>
          <option value="50%">50% Seimbang / 50% Teks</option>
          <option value="60%">60% Media / 40% Teks</option>
        </select>
      </div>

      <div className="space-y-1">
        <Label className="text-xs text-muted-foreground">{t("Konten Teks / Deskripsi", "Content / Story")}</Label>
        <Textarea
          value={section.content || ""}
          maxLength={2000}
          onChange={(e) => onUpdate({ content: e.target.value })}
          className="min-h-24 resize-none text-xs leading-relaxed"
          placeholder={t("Tuliskan cerita, keunggulan layanan, atau deskripsi di sini...", "Write your story or description here...")}
        />
      </div>

      <div className="space-y-2 pt-2 border-t border-border/60">
        <Label className="text-xs font-semibold">{t("Tombol Aksi (CTA Button)", "CTA Button")}</Label>
        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground">{t("Label Tombol", "Button Label")}</Label>
          <Input
            value={section.buttonLabel || ""}
            maxLength={60}
            onChange={(e) => onUpdate({ buttonLabel: e.target.value })}
            className="h-8 text-xs font-semibold"
            placeholder={t("contoh: Konsultasi Sekarang", "e.g. Get Started")}
          />
        </div>
        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground">{t("Tautan Tombol (URL)", "Button URL")}</Label>
          <Input
            value={section.buttonUrl || ""}
            maxLength={2000}
            onChange={(e) => onUpdate({ buttonUrl: e.target.value })}
            className="h-8 text-xs font-mono"
            placeholder={t("https://... atau #contact", "https://... or #contact")}
          />
        </div>
      </div>
    </div>
  );
}
