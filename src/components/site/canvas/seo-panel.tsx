"use client";

import { Share2, Search, MessageCircle, Copy, Check } from "lucide-react";
import { useState } from "react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ImageUpload } from "./image-upload";
import { useT } from "@/lib/i18n-client";
import type { PersonalSiteInput, SeoMetadata } from "@/lib/personal-site/model";

const SEO_TITLE_MAX = 80;
const SEO_DESCRIPTION_MAX = 180;

type SEOPanelProps = {
  site: PersonalSiteInput;
  updateSite: (patch: Partial<PersonalSiteInput>) => void;
  publicUrl: string;
};

/**
 * SEO/share settings tab (Phase 7).
 *
 * Reads directly from `site.seo` (controlled) so undo/redo, template apply,
 * and autosave never desync the inputs — same pattern as the Theme tab.
 */
export function SEOPanel({ site, updateSite, publicUrl }: SEOPanelProps) {
  const seo: Partial<SeoMetadata> = site.seo ?? {};
  const [copied, setCopied] = useState(false);
  const { t } = useT();

  const effectiveTitle = seo.title?.trim() || site.title;
  const effectiveDescription = seo.description?.trim() || site.hero;
  const ogImage = seo.ogImage?.trim() || "";

  function patchSeo(patch: Partial<SeoMetadata>) {
    updateSite({ seo: { title: "", description: "", ogImage: null, ...seo, ...patch } });
  }

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(publicUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      // clipboard unavailable — silently ignore
    }
  }

  return (
    <div className="space-y-5">
      {/* SEO title */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label className="text-xs font-medium flex items-center gap-1">
            <Search className="h-3 w-3 text-muted-foreground" />
            {t("Judul SEO", "SEO title")}
          </Label>
          <span className={`text-[10px] tabular-nums ${(seo.title?.length ?? 0) > SEO_TITLE_MAX ? "text-destructive" : "text-muted-foreground"}`}>
            {(seo.title ?? "").length}/{SEO_TITLE_MAX}
          </span>
        </div>
        <Input
          value={seo.title ?? ""}
          maxLength={SEO_TITLE_MAX}
          onChange={(e) => patchSeo({ title: e.target.value })}
          placeholder={site.title}
          className="h-8 text-xs"
          aria-label={t("Judul SEO", "SEO title")}
        />
        <p className="text-[11px] text-muted-foreground">
          {t("Kosong = pakai judul situs.", "Leave empty to use the site title.")}
        </p>
      </div>

      {/* SEO description */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label className="text-xs font-medium">{t("Deskripsi SEO", "SEO description")}</Label>
          <span className={`text-[10px] tabular-nums ${(seo.description?.length ?? 0) > SEO_DESCRIPTION_MAX ? "text-destructive" : "text-muted-foreground"}`}>
            {(seo.description ?? "").length}/{SEO_DESCRIPTION_MAX}
          </span>
        </div>
        <Textarea
          value={seo.description ?? ""}
          maxLength={SEO_DESCRIPTION_MAX}
          onChange={(e) => patchSeo({ description: e.target.value })}
          placeholder={site.hero}
          className="min-h-16 resize-none text-xs"
          aria-label={t("Deskripsi SEO", "SEO description")}
        />
        <p className="text-[11px] text-muted-foreground">
          {t("Kosong = pakai teks hero.", "Leave empty to use the hero text.")}
        </p>
      </div>

      {/* OG image */}
      <div className="space-y-2">
        <Label className="text-xs font-medium">{t("Gambar share (OG image)", "Share image (OG image)")}</Label>
        <ImageUpload
          value={ogImage}
          onChange={(url) => patchSeo({ ogImage: url || null })}
          label={t("Upload gambar", "Upload image")}
        />
        <Input
          value={ogImage}
          maxLength={2000}
          onChange={(e) => patchSeo({ ogImage: e.target.value || null })}
          className="h-8 text-xs"
          placeholder="https://…"
          aria-label={t("URL gambar share", "Share image URL")}
        />
        <p className="text-[11px] text-muted-foreground">
          {t("Dipakai saat link dibagikan ke WhatsApp, media sosial, dll.", "Shown when the link is shared on WhatsApp, social media, etc.")}
        </p>
      </div>

      <div className="h-px bg-border" />

      {/* Compact WhatsApp/share preview card */}
      <div className="space-y-2">
        <Label className="text-xs font-medium flex items-center gap-1">
          <Share2 className="h-3 w-3 text-muted-foreground" />
          {t("Pratinjau share", "Share preview")}
        </Label>
        <div className="overflow-hidden rounded-lg border bg-card text-card-foreground shadow-sm">
          {ogImage ? (
            <div className="relative aspect-[1.91/1] w-full">
              <Image src={ogImage} alt="" fill sizes="400px" className="object-cover" />
            </div>
          ) : (
            <div className="flex aspect-[1.91/1] w-full items-center justify-center bg-muted text-muted-foreground">
              <MessageCircle className="h-6 w-6" />
            </div>
          )}
          <div className="space-y-0.5 bg-muted/40 px-3 py-2">
            <p className="truncate text-[10px] uppercase tracking-wide text-muted-foreground">
              {publicUrl.replace(/^https?:\/\//, "").replace(/\/.*$/, "")}
            </p>
            <p className="truncate text-xs font-semibold">{effectiveTitle}</p>
            {effectiveDescription && (
              <p className="line-clamp-2 text-[11px] text-muted-foreground">{effectiveDescription}</p>
            )}
          </div>
        </div>
        <Button type="button" variant="outline" size="sm" className="w-full h-8 gap-1.5 text-xs" onClick={copyLink}>
          {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
          {copied ? t("Tersalin", "Copied") : t("Salin link publik", "Copy public link")}
        </Button>
      </div>
    </div>
  );
}
