"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { Plus, X, Sparkles, Check, Loader2 } from "lucide-react";
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

type PropertiesPanelProps = {
  section: PersonalSiteSection | null;
  onUpdate: (patch: Partial<PersonalSiteSection>) => void;
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

export function PropertiesPanel({ section, onUpdate, onClose }: PropertiesPanelProps) {
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
      <div className="flex items-center justify-between border-b px-4 py-3">
        <div className="min-w-0">
          <h2 className="text-sm font-semibold">{t("Bagian", "Section")}</h2>
          <p className="truncate text-xs text-muted-foreground capitalize">{section.type}</p>
        </div>
        <Button type="button" variant="ghost" size="icon" className="h-7 w-7" onClick={onClose} aria-label={t("Tutup panel properti", "Close properties panel")}>
          <X className="h-4 w-4" />
        </Button>
      </div>

      <div className="flex-1 space-y-6 overflow-y-auto p-4">
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
        <div className="space-y-3">
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">{t("Judul", "Heading")}</Label>
            <Input
              value={section.heading}
              maxLength={80}
              onChange={(e) => onUpdate({ heading: e.target.value })}
              className="h-8 text-sm"
              placeholder={t("Judul bagian", "Section heading")}
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">{t("Animasi", "Animation")}</Label>
            <select
              value={("animation" in section ? section.animation : undefined) ?? "none"}
              onChange={(e) => onUpdate({ animation: e.target.value as (typeof PERSONAL_SITE_ANIMATIONS)[number] })}
              className="flex h-8 w-full rounded-md border border-input bg-background px-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary"
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
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <Label className="text-xs font-medium uppercase text-muted-foreground">{t("Gambar", "Images")} ({section.images.length}/{GALLERY_MAX})</Label>
        <AddItemButton
          label={t("Tambah gambar", "Add image")}
          disabled={atMax}
          onClick={() => onUpdate({ images: appendItem(section.images, () => ({ id: makeItemId("image"), url: "", alt: "" })) })}
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
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">{t("Gambar", "Image")}</Label>
            <ImageUpload
              value={image.url}
              onChange={(url) => onUpdate({ images: patchItem(section.images, i, { url }) })}
              label={t("Unggah", "Upload")}
            />
            <Input
              value={image.url}
              maxLength={2000}
              onChange={(e) => onUpdate({ images: patchItem(section.images, i, { url: e.target.value }) })}
              className="h-8 text-xs"
              placeholder={t("…atau tempel URL gambar", "…or paste an image URL")}
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">{t("Teks alternatif", "Alt text")}</Label>
            <Input
              value={image.alt ?? ""}
              maxLength={200}
              onChange={(e) => onUpdate({ images: patchItem(section.images, i, { alt: e.target.value }) })}
              className="h-8 text-sm"
              placeholder={t("Deskripsi gambar", "Image description")}
            />
          </div>
        </div>
      ))}
    </div>
  );
}
