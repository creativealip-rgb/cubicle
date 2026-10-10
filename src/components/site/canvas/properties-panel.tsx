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

type PropertiesContentProps = {
  section: PersonalSiteSection;
  onUpdate: (patch: Partial<PersonalSiteSection>) => void;
  onDelete?: () => void;
  onClose?: () => void;
};

/**
 * Reusable section-properties body: header + scrollable field list, with no
 * outer rail/positioning chrome. Rendered by the desktop `<aside>` rail and by
 * the mobile bottom drawer, so both share identical 20-type parity.
 */
export function PropertiesContent({ section, onUpdate, onDelete, onClose }: PropertiesContentProps) {
  const { t } = useT();
  const [aiState, setAiState] = useState<AiGenerationState>({
    isGenerating: false,
    preview: null,
    pendingPatch: null,
  });

  // Reset AI preview when section changes
  useEffect(() => {
    setAiState({ isGenerating: false, preview: null, pendingPatch: null });
  }, [section.id]);

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
    <div className="flex min-h-0 flex-1 flex-col">
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
            {/* Heading text & font styling is now handled inline on canvas */}
            {"heading" in section && (
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-foreground">{t("Judul Bagian", "Section Heading")}</Label>
                <Input
                  value={(section as any).heading ?? ""}
                  onChange={(e) => onUpdate({ heading: e.target.value } as any)}
                  className="bg-background border-border/70 text-xs"
                  placeholder={t("Judul bagian...", "Section heading...")}
                />
              </div>
            )}

            {/* Animation Selector */}
            {"animation" in section && (
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-foreground">{t("Animasi Muncul", "Transition Animation")}</Label>
                <Select
                  value={(section as any).animation || "none"}
                  onValueChange={(val) => onUpdate({ animation: val } as any)}
                >
                  <SelectTrigger aria-label={t("Animasi Muncul", "Transition Animation")} className="w-full bg-background border-border/70 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PERSONAL_SITE_ANIMATIONS.map((animation) => (
                      <SelectItem key={animation} value={animation} className="text-xs">
                        {{
                          none: "None (Static)",
                          "fade-up": "Fade Up",
                          "fade-in": "Fade In",
                          "slide-left": "Slide Left",
                          "slide-right": "Slide Right",
                          "zoom-in": "Zoom In",
                          bounce: "Bounce",
                        }[animation]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
        </div>

        {section.type === "services" && <ServicesEditor section={section} onUpdate={onUpdate} />}
        {section.type === "process" && <ProcessEditor section={section} onUpdate={onUpdate} />}
        {section.type === "pricing" && <PricingEditor section={section} onUpdate={onUpdate} />}
        {section.type === "portfolio" && <PortfolioEditor section={section} onUpdate={onUpdate} />}
        {section.type === "testimonials" && <TestimonialsEditor section={section} onUpdate={onUpdate} />}
        {section.type === "faq" && <FaqEditor section={section} onUpdate={onUpdate} />}
        {section.type === "contact" && <ContactEditor section={section} onUpdate={onUpdate} />}
        {section.type === "custom" && <CustomEditor section={section} onUpdate={onUpdate} />}
        {section.type === "cta" && <CtaEditor section={section} onUpdate={onUpdate} />}
        {section.type === "gallery" && <GalleryEditor section={section} onUpdate={onUpdate} />}
        {section.type === "image" && <SingleImageEditor section={section} onUpdate={onUpdate} />}
        {section.type === "mediaText" && <MediaTextEditor section={section} onUpdate={onUpdate} />}
        {section.type === "booking" && <BookingEditor section={section} onUpdate={onUpdate} />}
        {section.type === "embed" && <EmbedEditor section={section} onUpdate={onUpdate} />}
        {section.type === "social" && <SocialEditor section={section} onUpdate={onUpdate} />}
        {section.type === "collapsible" && <CollapsibleEditor section={section} onUpdate={onUpdate} />}
        {section.type === "spacer" && <SpacerEditor section={section} onUpdate={onUpdate} />}
        {section.type === "contentBlock" && <ContentBlockEditor section={section} onUpdate={onUpdate} />}

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
    </div>
  );
}

export function PropertiesPanel({ section, onUpdate, onDelete, onClose }: PropertiesPanelProps) {
  if (!section) return null;

  return (
    <aside className="hidden md:flex w-80 shrink-0 flex-col border-l bg-background">
      <PropertiesContent section={section} onUpdate={onUpdate} onDelete={onDelete} onClose={onClose} />
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
const PROCESS_MAX = 12;
const PRICING_MAX = 8;
const PORTFOLIO_MAX = 12;
const TESTIMONIALS_MAX = 8;
const FAQ_MAX = 12;
const CONTACT_MAX = 10;
const GALLERY_MAX = 12;
const SOCIAL_MAX = 10;
const COLLAPSIBLE_MAX = 12;
const CONTENT_BLOCK_MAX = 4;

/**
 * Numeric input that lets the user type freely and commits a schema-valid value
 * on blur or Enter. Clamping on every keystroke left most values unreachable:
 * typing "4" toward a 40px spacer snapped to the 16 minimum first, so the next
 * keystroke built on "16" instead of "4".
 *
 * The draft is local so the committed value in site state is never transiently
 * out of range, which would fail the storage schema mid-autosave.
 */
function NumberField({
  value,
  min,
  max,
  fallback,
  onCommit,
  className,
}: {
  value: number | undefined;
  min: number;
  max: number;
  fallback: number;
  onCommit: (value: number) => void;
  className?: string;
}) {
  const committed = value ?? fallback;
  const [draft, setDraft] = useState(String(committed));
  useEffect(() => setDraft(String(committed)), [committed]);

  const commit = () => {
    const parsed = Number(draft);
    const next =
      draft.trim() === "" || !Number.isFinite(parsed)
        ? fallback
        : Math.min(max, Math.max(min, Math.round(parsed)));
    setDraft(String(next));
    if (next !== committed) onCommit(next);
  };

  return (
    <Input
      type="number"
      min={min}
      max={max}
      value={draft}
      className={className}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => {
        if (e.key === "Enter") commit();
      }}
    />
  );
}



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

function ProcessEditor({ section, onUpdate }: EditorProps<Extract<PersonalSiteSection, { type: "process" }>>) {
  const { t } = useT();
  const atMax = section.steps.length >= PROCESS_MAX;
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <Label className="text-xs font-medium uppercase text-muted-foreground">{t("Langkah Kerja", "Process Steps")} ({section.steps.length}/{PROCESS_MAX})</Label>
        <AddItemButton
          label={t("Tambah langkah", "Add step")}
          disabled={atMax}
          onClick={() => onUpdate({ steps: appendItem(section.steps, () => ({ id: makeItemId("step"), title: "", description: "" })) })}
        />
      </div>
      {section.steps.map((step, i) => (
        <div key={step.id} className="relative space-y-2 rounded-lg border p-3">
          <RemoveItemButton label={`Remove step ${i + 1}`} onClick={() => onUpdate({ steps: removeItemAt(section.steps, i) })} />
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">{t("Judul Langkah", "Step Title")}</Label>
            <Input
              value={step.title}
              maxLength={100}
              onChange={(e) => onUpdate({ steps: patchItem(section.steps, i, { title: e.target.value }) })}
              className="h-8 text-sm"
              placeholder={t("Nama langkah", "Step title")}
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">{t("Deskripsi", "Description")}</Label>
            <Textarea
              value={step.description}
              maxLength={1000}
              onChange={(e) => onUpdate({ steps: patchItem(section.steps, i, { description: e.target.value }) })}
              className="min-h-16 resize-none text-sm"
              placeholder={t("Penjelasan proses...", "Process explanation...")}
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
              placeholder={t("Contoh: Rp 2.500.000 / $199", "e.g. $199")}
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">{t("Deskripsi", "Description")}</Label>
            <Textarea
              value={offer.description}
              maxLength={1000}
              onChange={(e) => onUpdate({ offers: patchItem(section.offers, i, { description: e.target.value }) })}
              className="min-h-16 resize-none text-sm"
              placeholder={t("Apa yang didapat klien?", "What does the client get?")}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

function PortfolioEditor({ section, onUpdate }: EditorProps<Extract<PersonalSiteSection, { type: "portfolio" }>>) {
  const { t } = useT();
  const atMax = section.projects.length >= PORTFOLIO_MAX;
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <Label className="text-xs font-medium uppercase text-muted-foreground">{t("Daftar Proyek", "Projects")} ({section.projects.length}/{PORTFOLIO_MAX})</Label>
        <AddItemButton
          label={t("Tambah proyek", "Add project")}
          disabled={atMax}
          onClick={() => onUpdate({ projects: appendItem(section.projects, () => ({ id: makeItemId("proj"), title: "", description: "", url: "" })) })}
        />
      </div>
      {section.projects.map((proj, i) => (
        <div key={proj.id} className="relative space-y-2 rounded-lg border p-3">
          <RemoveItemButton label={`Remove project ${i + 1}`} onClick={() => onUpdate({ projects: removeItemAt(section.projects, i) })} />
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">{t("Judul Proyek", "Project Title")}</Label>
            <Input
              value={proj.title}
              maxLength={120}
              onChange={(e) => onUpdate({ projects: patchItem(section.projects, i, { title: e.target.value }) })}
              className="h-8 text-sm"
              placeholder={t("Nama proyek / brand", "Project / client name")}
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">{t("Tautan URL Proyek", "Project URL")}</Label>
            <Input
              value={proj.url || ""}
              maxLength={2000}
              onChange={(e) => onUpdate({ projects: patchItem(section.projects, i, { url: e.target.value }) })}
              className="h-8 text-xs font-mono"
              placeholder="https://..."
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">{t("Deskripsi", "Description")}</Label>
            <Textarea
              value={proj.description}
              maxLength={1000}
              onChange={(e) => onUpdate({ projects: patchItem(section.projects, i, { description: e.target.value }) })}
              className="min-h-16 resize-none text-sm"
              placeholder={t("Hasil karya atau ringkasan solusi...", "Summary of project results...")}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

function TestimonialsEditor({ section, onUpdate }: EditorProps<Extract<PersonalSiteSection, { type: "testimonials" }>>) {
  const { t } = useT();
  const atMax = section.testimonials.length >= TESTIMONIALS_MAX;
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <Label className="text-xs font-medium uppercase text-muted-foreground">{t("Testimoni Klien", "Client Testimonials")} ({section.testimonials.length}/{TESTIMONIALS_MAX})</Label>
        <AddItemButton
          label={t("Tambah testimoni", "Add testimonial")}
          disabled={atMax}
          onClick={() => onUpdate({ testimonials: appendItem(section.testimonials, () => ({ id: makeItemId("testi"), quote: "", author: "", role: "" })) })}
        />
      </div>
      {section.testimonials.map((testi, i) => (
        <div key={testi.id} className="relative space-y-2 rounded-lg border p-3">
          <RemoveItemButton label={`Remove testimonial ${i + 1}`} onClick={() => onUpdate({ testimonials: removeItemAt(section.testimonials, i) })} />
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">{t("Kutipan Testimoni", "Quote")}</Label>
            <Textarea
              value={testi.quote}
              maxLength={1000}
              onChange={(e) => onUpdate({ testimonials: patchItem(section.testimonials, i, { quote: e.target.value }) })}
              className="min-h-16 resize-none text-sm italic"
              placeholder={t("Hasil kerja sangat memuaskan...", "Great work delivered on time...")}
            />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">{t("Nama Pemberi Testimoni", "Author")}</Label>
              <Input
                value={testi.author}
                maxLength={100}
                onChange={(e) => onUpdate({ testimonials: patchItem(section.testimonials, i, { author: e.target.value }) })}
                className="h-8 text-sm"
                placeholder={t("Budi Santoso", "John Doe")}
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">{t("Jabatan / Perusahaan", "Role")}</Label>
              <Input
                value={testi.role}
                maxLength={120}
                onChange={(e) => onUpdate({ testimonials: patchItem(section.testimonials, i, { role: e.target.value }) })}
                className="h-8 text-sm"
                placeholder={t("CEO StartupX", "Founder")}
              />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function ContactEditor({ section, onUpdate }: EditorProps<Extract<PersonalSiteSection, { type: "contact" }>>) {
  const { t } = useT();
  const atMax = section.methods.length >= CONTACT_MAX;
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <Label className="text-xs font-medium uppercase text-muted-foreground">{t("Kanal Kontak", "Contact Channels")} ({section.methods.length}/{CONTACT_MAX})</Label>
        <AddItemButton
          label={t("Tambah kontak", "Add contact")}
          disabled={atMax}
          onClick={() => onUpdate({ methods: appendItem(section.methods, () => ({ id: makeItemId("contact"), label: "Email", value: "", url: "" })) })}
        />
      </div>
      {section.methods.map((method, i) => (
        <div key={method.id} className="relative space-y-2 rounded-lg border p-3">
          <RemoveItemButton label={`Remove contact ${i + 1}`} onClick={() => onUpdate({ methods: removeItemAt(section.methods, i) })} />
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">{t("Label", "Label")}</Label>
              <Input
                value={method.label}
                maxLength={80}
                onChange={(e) => onUpdate({ methods: patchItem(section.methods, i, { label: e.target.value }) })}
                className="h-8 text-sm"
                placeholder="Email / WA / Phone"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">{t("Nilai / Teks", "Value")}</Label>
              <Input
                value={method.value}
                maxLength={160}
                onChange={(e) => onUpdate({ methods: patchItem(section.methods, i, { value: e.target.value }) })}
                className="h-8 text-sm"
                placeholder="halo@example.com"
              />
            </div>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">{t("Tautan URL Kontak (Opsional)", "Contact Link URL")}</Label>
            <Input
              value={method.url || ""}
              maxLength={2000}
              onChange={(e) => onUpdate({ methods: patchItem(section.methods, i, { url: e.target.value }) })}
              className="h-8 text-xs font-mono"
              placeholder="mailto:..., https://wa.me/..."
            />
          </div>
        </div>
      ))}
    </div>
  );
}

function CustomEditor({ section, onUpdate }: EditorProps<Extract<PersonalSiteSection, { type: "custom" }>>) {
  const { t } = useT();
  return (
    <div className="space-y-3">
      <div className="space-y-1">
        <Label className="text-xs text-muted-foreground">{t("Isi Konten Kustom", "Custom Content")}</Label>
        <Textarea
          value={section.content}
          maxLength={1000}
          onChange={(e) => onUpdate({ content: e.target.value })}
          className="min-h-28 resize-none text-sm leading-relaxed"
          placeholder={t("Tulis paragraf bebas di sini...", "Write custom paragraph content here...")}
        />
      </div>
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

function EmbedEditor({ section, onUpdate }: EditorProps<Extract<PersonalSiteSection, { type: "embed" }>>) {
  const { t } = useT();
  return (
    <div className="space-y-3">
      <div className="space-y-1">
        <Label className="text-xs text-muted-foreground">{t("URL Sematan", "Embed URL")}</Label>
        <Input
          value={section.url}
          maxLength={2000}
          onChange={(e) => onUpdate({ url: e.target.value })}
          className="h-8 text-xs font-mono"
          placeholder="https://..."
        />
      </div>
      <div className="space-y-1">
        <Label className="text-xs text-muted-foreground">{t("Tinggi (px)", "Height (px)")}</Label>
        <NumberField
          min={100}
          max={800}
          fallback={400}
          value={section.height}
          onCommit={(height) => onUpdate({ height })}
          className="h-8 text-xs"
        />
      </div>
    </div>
  );
}

function SpacerEditor({ section, onUpdate }: EditorProps<Extract<PersonalSiteSection, { type: "spacer" }>>) {
  const { t } = useT();
  return (
    <div className="space-y-3">
      <div className="space-y-1">
        <Label className="text-xs text-muted-foreground">{t("Tinggi Spacer (px)", "Spacer height (px)")}</Label>
        <NumberField
          min={16}
          max={200}
          fallback={40}
          value={section.height}
          onCommit={(height) => onUpdate({ height })}
          className="h-8 text-xs"
        />
      </div>
    </div>
  );
}

function SocialEditor({ section, onUpdate }: EditorProps<Extract<PersonalSiteSection, { type: "social" }>>) {
  const { t } = useT();
  const atMax = section.links.length >= SOCIAL_MAX;
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <Label className="text-xs font-medium uppercase text-muted-foreground">{t("Tautan Sosial", "Social Links")} ({section.links.length}/{SOCIAL_MAX})</Label>
        <AddItemButton
          label={t("Tambah tautan sosial", "Add social link")}
          onClick={() => {
            if (atMax) {
              toast.error(t(`Batas maksimal ${SOCIAL_MAX} tautan sosial tercapai.`, `Maximum of ${SOCIAL_MAX} social links reached.`));
              return;
            }
            onUpdate({ links: appendItem(section.links, () => ({ id: makeItemId("link"), platform: "", url: "" })) });
          }}
        />
      </div>
      {section.links.map((link, i) => (
        <div key={link.id} className="relative space-y-2 rounded-lg border p-3">
          <RemoveItemButton label={t(`Hapus tautan ${i + 1}`, `Remove link ${i + 1}`)} onClick={() => onUpdate({ links: removeItemAt(section.links, i) })} />
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">{t("Platform", "Platform")}</Label>
            <Input
              value={link.platform}
              maxLength={40}
              onChange={(e) => onUpdate({ links: patchItem(section.links, i, { platform: e.target.value }) })}
              className="h-8 text-sm"
              placeholder={t("Instagram / LinkedIn / X", "Instagram / LinkedIn / X")}
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">{t("URL Profil", "Profile URL")}</Label>
            <Input
              value={link.url}
              maxLength={2000}
              onChange={(e) => onUpdate({ links: patchItem(section.links, i, { url: e.target.value }) })}
              className="h-8 text-xs font-mono"
              placeholder="https://..."
            />
          </div>
        </div>
      ))}
    </div>
  );
}

function CollapsibleEditor({ section, onUpdate }: EditorProps<Extract<PersonalSiteSection, { type: "collapsible" }>>) {
  const { t } = useT();
  const atMax = section.items.length >= COLLAPSIBLE_MAX;
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <Label className="text-xs font-medium uppercase text-muted-foreground">{t("Item Lipat", "Collapsible Items")} ({section.items.length}/{COLLAPSIBLE_MAX})</Label>
        <AddItemButton
          label={t("Tambah item", "Add collapsible item")}
          onClick={() => {
            if (atMax) {
              toast.error(t(`Batas maksimal ${COLLAPSIBLE_MAX} item tercapai.`, `Maximum of ${COLLAPSIBLE_MAX} items reached.`));
              return;
            }
            onUpdate({ items: appendItem(section.items, () => ({ id: makeItemId("collapse"), title: "", content: "" })) });
          }}
        />
      </div>
      {section.items.map((item, i) => (
        <div key={item.id} className="relative space-y-2 rounded-lg border p-3">
          <RemoveItemButton label={t(`Hapus item ${i + 1}`, `Remove item ${i + 1}`)} onClick={() => onUpdate({ items: removeItemAt(section.items, i) })} />
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">{t("Judul", "Title")}</Label>
            <Input
              value={item.title}
              maxLength={200}
              onChange={(e) => onUpdate({ items: patchItem(section.items, i, { title: e.target.value }) })}
              className="h-8 text-sm"
              placeholder={t("Judul yang bisa dibuka-tutup", "Toggle heading")}
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">{t("Isi", "Content")}</Label>
            <Textarea
              value={item.content}
              maxLength={2000}
              onChange={(e) => onUpdate({ items: patchItem(section.items, i, { content: e.target.value }) })}
              className="min-h-16 resize-none text-sm"
              placeholder={t("Konten yang muncul saat dibuka", "Content revealed when expanded")}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

function ContentBlockEditor({ section, onUpdate }: EditorProps<Extract<PersonalSiteSection, { type: "contentBlock" }>>) {
  const { t } = useT();
  const atMax = section.items.length >= CONTENT_BLOCK_MAX;
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-2">
        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground">{t("Jumlah Kolom", "Columns")}</Label>
          <select
            value={section.columns}
            onChange={(e) => onUpdate({ columns: Number(e.target.value) as 2 | 3 | 4 })}
            className="flex h-8 w-full rounded-md border border-input bg-background px-2 text-xs shadow-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary"
          >
            <option value={2}>2</option>
            <option value={3}>3</option>
            <option value={4}>4</option>
          </select>
        </div>
        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground">{t("Tata Letak", "Layout")}</Label>
          <select
            value={section.layout}
            onChange={(e) => onUpdate({ layout: e.target.value as any })}
            className="flex h-8 w-full rounded-md border border-input bg-background px-2 text-xs shadow-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary"
          >
            <option value="equal">{t("Seimbang", "Equal")}</option>
            <option value="left-heavy">{t("Kiri Lebih Besar", "Left heavy")}</option>
            <option value="right-heavy">{t("Kanan Lebih Besar", "Right heavy")}</option>
            <option value="thirds">{t("Sepertiga", "Thirds")}</option>
          </select>
        </div>
      </div>
      <div className="flex items-center justify-between">
        <Label className="text-xs font-medium uppercase text-muted-foreground">{t("Kolom Konten", "Content Columns")} ({section.items.length}/{CONTENT_BLOCK_MAX})</Label>
        <AddItemButton
          label={t("Tambah kolom", "Add column")}
          onClick={() => {
            if (atMax) {
              toast.error(t(`Batas maksimal ${CONTENT_BLOCK_MAX} kolom tercapai.`, `Maximum of ${CONTENT_BLOCK_MAX} columns reached.`));
              return;
            }
            onUpdate({ items: appendItem(section.items, () => ({ id: makeItemId("col"), content: "" })) });
          }}
        />
      </div>
      {section.items.map((item, i) => (
        <div key={item.id} className="relative space-y-2 rounded-lg border p-3">
          <RemoveItemButton label={t(`Hapus kolom ${i + 1}`, `Remove column ${i + 1}`)} onClick={() => onUpdate({ items: removeItemAt(section.items, i) })} />
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">{t("Konten Kolom", "Column Content")}</Label>
            <Textarea
              value={item.content}
              maxLength={2000}
              onChange={(e) => onUpdate({ items: patchItem(section.items, i, { content: e.target.value }) })}
              className="min-h-16 resize-none text-sm"
              placeholder={t("Isi kolom...", "Column content...")}
            />
          </div>
        </div>
      ))}
    </div>
  );
}
