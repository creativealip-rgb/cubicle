"use client";

import { Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ImageUpload } from "./image-upload";
import type { PersonalSiteSection } from "@/lib/personal-site/model";
import { PERSONAL_SITE_ANIMATIONS } from "@/lib/personal-site/model";

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

export function PropertiesPanel({ section, onUpdate, onClose }: PropertiesPanelProps) {
  if (!section) return null;

  const animation = "animation" in section ? section.animation : undefined;

  return (
    <aside className="hidden md:flex w-80 shrink-0 flex-col border-l bg-background">
      <div className="flex items-center justify-between border-b px-4 py-3">
        <div className="min-w-0">
          <h2 className="text-sm font-semibold">Section</h2>
          <p className="truncate text-xs text-muted-foreground capitalize">{section.type}</p>
        </div>
        <Button type="button" variant="ghost" size="icon" className="h-7 w-7" onClick={onClose} aria-label="Close properties panel">
          <X className="h-4 w-4" />
        </Button>
      </div>

      <div className="flex-1 space-y-6 overflow-y-auto p-4">
        {/* Shared fields */}
        <div className="space-y-3">
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Heading</Label>
            <Input
              value={section.heading}
              maxLength={80}
              onChange={(e) => onUpdate({ heading: e.target.value })}
              className="h-8 text-sm"
              placeholder="Section heading"
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Animation</Label>
            <select
              value={animation ?? "none"}
              onChange={(e) => onUpdate({ animation: e.target.value as (typeof PERSONAL_SITE_ANIMATIONS)[number] })}
              className="flex h-8 w-full rounded-md border border-input bg-background px-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary"
            >
              {PERSONAL_SITE_ANIMATIONS.map((a) => (
                <option key={a} value={a}>{a === "none" ? "None" : a}</option>
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
  const atMax = section.items.length >= SERVICES_MAX;
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <Label className="text-xs font-medium uppercase text-muted-foreground">Services ({section.items.length}/{SERVICES_MAX})</Label>
        <AddItemButton
          label="Add service"
          disabled={atMax}
          onClick={() => onUpdate({ items: appendItem(section.items, () => ({ id: makeItemId("service"), title: "", description: "" })) })}
        />
      </div>
      {section.items.map((item, i) => (
        <div key={item.id} className="relative space-y-2 rounded-lg border p-3">
          <RemoveItemButton label={`Remove service ${i + 1}`} onClick={() => onUpdate({ items: removeItemAt(section.items, i) })} />
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Title</Label>
            <Input
              value={item.title}
              maxLength={100}
              onChange={(e) => onUpdate({ items: patchItem(section.items, i, { title: e.target.value }) })}
              className="h-8 text-sm"
              placeholder="Service name"
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Description</Label>
            <Textarea
              value={item.description}
              maxLength={1000}
              onChange={(e) => onUpdate({ items: patchItem(section.items, i, { description: e.target.value }) })}
              className="min-h-16 resize-none text-sm"
              placeholder="What does this service include?"
            />
          </div>
        </div>
      ))}
    </div>
  );
}

function PricingEditor({ section, onUpdate }: EditorProps<Extract<PersonalSiteSection, { type: "pricing" }>>) {
  const atMax = section.offers.length >= PRICING_MAX;
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <Label className="text-xs font-medium uppercase text-muted-foreground">Offers ({section.offers.length}/{PRICING_MAX})</Label>
        <AddItemButton
          label="Add offer"
          disabled={atMax}
          onClick={() => onUpdate({ offers: appendItem(section.offers, () => ({ id: makeItemId("offer"), name: "", price: "", description: "" })) })}
        />
      </div>
      {section.offers.map((offer, i) => (
        <div key={offer.id} className="relative space-y-2 rounded-lg border p-3">
          <RemoveItemButton label={`Remove offer ${i + 1}`} onClick={() => onUpdate({ offers: removeItemAt(section.offers, i) })} />
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Name</Label>
            <Input
              value={offer.name}
              maxLength={100}
              onChange={(e) => onUpdate({ offers: patchItem(section.offers, i, { name: e.target.value }) })}
              className="h-8 text-sm"
              placeholder="Package name"
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Price</Label>
            <Input
              value={offer.price}
              maxLength={80}
              onChange={(e) => onUpdate({ offers: patchItem(section.offers, i, { price: e.target.value }) })}
              className="h-8 text-sm"
              placeholder="Rp 2.500.000 / Custom"
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Description</Label>
            <Textarea
              value={offer.description}
              maxLength={1000}
              onChange={(e) => onUpdate({ offers: patchItem(section.offers, i, { description: e.target.value }) })}
              className="min-h-16 resize-none text-sm"
              placeholder="What is included?"
            />
          </div>
        </div>
      ))}
    </div>
  );
}

function FaqEditor({ section, onUpdate }: EditorProps<Extract<PersonalSiteSection, { type: "faq" }>>) {
  const atMax = section.items.length >= FAQ_MAX;
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <Label className="text-xs font-medium uppercase text-muted-foreground">FAQ ({section.items.length}/{FAQ_MAX})</Label>
        <AddItemButton
          label="Add question"
          disabled={atMax}
          onClick={() => onUpdate({ items: appendItem(section.items, () => ({ id: makeItemId("faq"), question: "", answer: "" })) })}
        />
      </div>
      {section.items.map((item, i) => (
        <div key={item.id} className="relative space-y-2 rounded-lg border p-3">
          <RemoveItemButton label={`Remove question ${i + 1}`} onClick={() => onUpdate({ items: removeItemAt(section.items, i) })} />
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Question</Label>
            <Input
              value={item.question}
              maxLength={200}
              onChange={(e) => onUpdate({ items: patchItem(section.items, i, { question: e.target.value }) })}
              className="h-8 text-sm"
              placeholder="Frequently asked question"
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Answer</Label>
            <Textarea
              value={item.answer}
              maxLength={2000}
              onChange={(e) => onUpdate({ items: patchItem(section.items, i, { answer: e.target.value }) })}
              className="min-h-16 resize-none text-sm"
              placeholder="Short, clear answer"
            />
          </div>
        </div>
      ))}
    </div>
  );
}

function CtaEditor({ section, onUpdate }: EditorProps<Extract<PersonalSiteSection, { type: "cta" }>>) {
  return (
    <div className="space-y-3">
      <Label className="text-xs font-medium uppercase text-muted-foreground">Call to action</Label>
      <div className="space-y-1">
        <Label className="text-xs text-muted-foreground">Text</Label>
        <Textarea
          value={section.text}
          maxLength={500}
          onChange={(e) => onUpdate({ text: e.target.value })}
          className="min-h-16 resize-none text-sm"
          placeholder="Ajakan singkat untuk pengunjung"
        />
      </div>
      <div className="space-y-1">
        <Label className="text-xs text-muted-foreground">Button label</Label>
        <Input
          value={section.buttonLabel}
          maxLength={60}
          onChange={(e) => onUpdate({ buttonLabel: e.target.value })}
          className="h-8 text-sm"
          placeholder="Hubungi saya"
        />
      </div>
      <div className="space-y-1">
        <Label className="text-xs text-muted-foreground">Button URL</Label>
        <Input
          value={section.buttonUrl ?? ""}
          maxLength={2000}
          onChange={(e) => onUpdate({ buttonUrl: e.target.value })}
          className="h-8 text-sm"
          placeholder="https://… or mailto:…"
        />
        <p className="text-[11px] text-muted-foreground">Kosongkan untuk mematikan tombol. URL harus publik (http/https/mailto/tel).</p>
      </div>
    </div>
  );
}

function GalleryEditor({ section, onUpdate }: EditorProps<Extract<PersonalSiteSection, { type: "gallery" }>>) {
  const atMax = section.images.length >= GALLERY_MAX;
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <Label className="text-xs font-medium uppercase text-muted-foreground">Images ({section.images.length}/{GALLERY_MAX})</Label>
        <AddItemButton
          label="Add image"
          disabled={atMax}
          onClick={() => onUpdate({ images: appendItem(section.images, () => ({ id: makeItemId("image"), url: "", alt: "" })) })}
        />
      </div>
      {section.images.map((image, i) => (
        <div key={image.id} className="relative space-y-2 rounded-lg border p-3">
          <RemoveItemButton label={`Remove image ${i + 1}`} onClick={() => onUpdate({ images: removeItemAt(section.images, i) })} />
          {image.url && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={image.url} alt={image.alt ?? ""} className="aspect-video w-full rounded object-cover" />
          )}
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Image</Label>
            <ImageUpload
              value={image.url}
              onChange={(url) => onUpdate({ images: patchItem(section.images, i, { url }) })}
              label="Upload"
            />
            <Input
              value={image.url}
              maxLength={2000}
              onChange={(e) => onUpdate({ images: patchItem(section.images, i, { url: e.target.value }) })}
              className="h-8 text-xs"
              placeholder="…or paste an image URL"
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Alt text</Label>
            <Input
              value={image.alt ?? ""}
              maxLength={200}
              onChange={(e) => onUpdate({ images: patchItem(section.images, i, { alt: e.target.value }) })}
              className="h-8 text-sm"
              placeholder="Deskripsi gambar"
            />
          </div>
        </div>
      ))}
    </div>
  );
}
