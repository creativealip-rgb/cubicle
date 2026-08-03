"use client";

import { useActionState, useEffect, useMemo, useRef, useState } from "react";
import { ExternalLink, Eye, FilePenLine, Save, Send, Undo2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PersonalSiteRenderer } from "./personal-site-renderer";
import { LinkEditor } from "./link-editor";
import { SectionEditor } from "./section-editor";
import { PresetPicker, PreviewToggle, type SitePreset } from "./site-presets";
import {
  checkSlugUnique,
  type PersonalSiteActionState,
} from "@/lib/actions/personal-site";
import {
  normalizePersonalSiteSlug,
  personalSiteInputSchema,
  type PersonalSiteInput,
} from "@/lib/personal-site/model";
import { useT } from "@/lib/i18n-client";

type EditorSection = "identity" | "content" | "links" | "appearance";

export function BuilderClient({
  initialSite,
  action,
  publicSiteBaseUrl,
  previewUrl,
}: {
  initialSite: PersonalSiteInput;
  action: (state: PersonalSiteActionState, formData: FormData) => Promise<PersonalSiteActionState>;
  publicSiteBaseUrl: string;
  previewUrl: string;
}) {
  const { t } = useT();
  const [state, formAction, pending] = useActionState(
    action,
    { status: "idle" } satisfies PersonalSiteActionState,
  );
  const [site, setSite] = useState<PersonalSiteInput>(initialSite);
  const [savedSnapshot, setSavedSnapshot] = useState(() => JSON.stringify(initialSite));
  const submittedSnapshotRef = useRef(JSON.stringify(initialSite));
  const [mode, setMode] = useState<"edit" | "preview">("edit");
  const [editorSection, setEditorSection] = useState<EditorSection>("identity");
  const [previewMode, setPreviewMode] = useState<"desktop" | "mobile">("desktop");
  const [slugStatus, setSlugStatus] = useState<"idle" | "checking" | "available" | "taken" | "invalid">("idle");
  const formRef = useRef<HTMLFormElement>(null);
  const mobileFormRef = useRef<HTMLFormElement>(null);

  const serialized = useMemo(() => JSON.stringify(site), [site]);
  const dirty = serialized !== savedSnapshot;
  const normalizedSlug = normalizePersonalSiteSlug(site.slug);
  const publicUrl = `${publicSiteBaseUrl}/${normalizedSlug}`;

  useEffect(() => {
    if (state.status !== "success") return;
    const submitted = JSON.parse(submittedSnapshotRef.current) as PersonalSiteInput;
    const saved = { ...submitted, slug: state.slug || submitted.slug, published: Boolean(state.published) };
    setSite(saved);
    setSavedSnapshot(JSON.stringify(saved));
  }, [state]);

  useEffect(() => {
    const clean = normalizePersonalSiteSlug(site.slug);
    if (clean.length < 2 || !personalSiteInputSchema.shape.slug.safeParse(clean).success) {
      setSlugStatus("invalid");
      return;
    }
    if (clean === initialSite.slug) {
      setSlugStatus("idle");
      return;
    }
    setSlugStatus("checking");
    const timer = window.setTimeout(async () => {
      try {
        setSlugStatus(await checkSlugUnique(clean) ? "available" : "taken");
      } catch {
        setSlugStatus("idle");
      }
    }, 500);
    return () => window.clearTimeout(timer);
  }, [initialSite.slug, site.slug]);

  const update = <K extends keyof PersonalSiteInput>(key: K, value: PersonalSiteInput[K]) => {
    if (pending) return;
    setSite((current) => ({ ...current, [key]: value }));
  };

  const applyPreset = (preset: SitePreset) => {
    if (pending) return;
    const run = async () => {
      if (dirty) {
        const ok = await confirm({
          title: t("Ganti template?", "Replace template?"),
          description: t("Template akan mengganti konten utama dan section yang belum disimpan. Lanjut?", "Template will replace unsaved main content and sections. Continue?"),
          confirmLabel: t("Lanjut", "Continue"),
        });
        if (!ok) return;
      }
      setSite((current) => ({ ...current, ...structuredClone(preset.values) }));
    };
    run();
  };

  const reset = () => {
    const run = async () => {
      if (dirty) {
        const ok = await confirm({
          title: t("Batalkan perubahan?", "Discard changes?"),
          description: t("Batalkan semua perubahan yang belum disimpan?", "Discard all unsaved changes?"),
          confirmLabel: t("Batalkan", "Discard"),
          destructive: true,
        });
        if (!ok) return;
      }
      setSite(JSON.parse(savedSnapshot) as PersonalSiteInput);
    };
    run();
  };

  const labels = {
    about: t("Tentang", "About"),
    workWithMe: t("Mari bekerja sama", "Work with me"),
    contactHint: t("Pilih cara menghubungi atau lihat portfolio di bawah.", "Choose a contact or portfolio link below."),
  };

  const messageClass = state.status === "error"
    ? "border-red-200 bg-red-50 text-red-700"
    : "border-emerald-200 bg-emerald-50 text-emerald-700";

  return <div className="space-y-5 overflow-x-clip pb-24 xl:pb-6">
    <header className="app-page-header gap-4">
      <div className="min-w-0">
        <h1 className="app-page-title">{t("Landing Page Personal", "Personal Landing Page")}</h1>
        <p className="app-page-description">{t("Buat halaman publik singkat untuk layanan, karya, dan kontak kamu.", "Create a focused public page for your services, work, and contact details.")}</p>
      </div>
      <div className="flex flex-wrap gap-2">
        <Button type="button" variant="outline" asChild><a href={previewUrl} target="_blank" rel="noreferrer"><Eye className="h-4 w-4" />{t("Buka preview di tab baru", "Open preview in new tab")}</a></Button>
        {site.published && <Button type="button" asChild><a href={publicUrl} target="_blank" rel="noreferrer"><ExternalLink className="h-4 w-4" />{t("Buka halaman publik", "Open public page")}</a></Button>}
      </div>
    </header>

    <div className="flex rounded-xl bg-muted p-1 xl:hidden" role="tablist" aria-label={t("Mode builder", "Builder mode")}>
      <Button type="button" role="tab" aria-selected={mode === "edit"} variant={mode === "edit" ? "default" : "ghost"} className="flex-1" onClick={() => setMode("edit")}><FilePenLine className="h-4 w-4" />{t("Edit", "Edit")}</Button>
      <Button type="button" role="tab" aria-selected={mode === "preview"} variant={mode === "preview" ? "default" : "ghost"} className="flex-1" onClick={() => { setMode("preview"); setPreviewMode("mobile"); }}><Eye className="h-4 w-4" />{t("Preview", "Preview")}</Button>
    </div>

    {state.message && <div role={state.status === "error" ? "alert" : "status"} className={`rounded-xl border px-4 py-3 text-sm ${messageClass}`}>{state.message}</div>}

    <div className="grid gap-6 xl:grid-cols-[minmax(0,600px)_minmax(0,1fr)]">
      <form action={formAction} onSubmit={() => { submittedSnapshotRef.current = serialized; }} className={`${mode === "preview" ? "hidden xl:block" : "block"} min-w-0 space-y-4`}>
        <input type="hidden" name="site" value={serialized} />

        <div className="grid grid-cols-2 gap-1 rounded-xl bg-muted p-1 sm:grid-cols-4" role="tablist" aria-label={t("Bagian editor", "Editor section")}>
          {([
            ["identity", t("Identitas", "Identity")],
            ["content", t("Konten", "Content")],
            ["links", t("Tautan", "Links")],
            ["appearance", t("Tampilan", "Appearance")],
          ] as const).map(([value, label]) => (
            <Button key={value} type="button" role="tab" aria-selected={editorSection === value} variant={editorSection === value ? "default" : "ghost"} className="min-h-11" onClick={() => setEditorSection(value)}>{label}</Button>
          ))}
        </div>

        <Card className={editorSection !== "identity" ? "hidden" : undefined}>
          <CardHeader><CardTitle>{t("Mulai dari template", "Start with a template")}</CardTitle></CardHeader>
          <CardContent><PresetPicker onSelect={applyPreset} /></CardContent>
        </Card>

        <Card className={editorSection !== "identity" ? "hidden" : undefined}>
          <CardHeader><CardTitle>{t("Identitas", "Identity")}</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <Field label={t("Nama / studio", "Name / studio")} error={state.fieldErrors?.title?.[0]}><Input value={site.title} maxLength={100} onChange={(e) => update("title", e.target.value)} /></Field>
            <Field label={t("Tagline", "Tagline")} error={state.fieldErrors?.subtitle?.[0]}><Input value={site.subtitle} maxLength={160} onChange={(e) => update("subtitle", e.target.value)} /></Field>
            <Field label={t("Pesan utama", "Hero message")} error={state.fieldErrors?.hero?.[0]}><Textarea rows={4} value={site.hero} maxLength={500} onChange={(e) => update("hero", e.target.value)} /></Field>
            <Field label={t("Tentang", "About")} error={state.fieldErrors?.about?.[0]}><Textarea rows={5} value={site.about} maxLength={2000} onChange={(e) => update("about", e.target.value)} /></Field>
          </CardContent>
        </Card>

        <Card className={editorSection !== "identity" ? "hidden" : undefined}>
          <CardHeader><CardTitle>{t("Aksi utama", "Primary action")}</CardTitle></CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <Field label={t("Label tombol", "Button label")} error={state.fieldErrors?.ctaLabel?.[0]}><Input value={site.ctaLabel} maxLength={60} onChange={(e) => update("ctaLabel", e.target.value)} /></Field>
            <Field label={t("Tujuan publik", "Public destination")} error={state.fieldErrors?.ctaUrl?.[0]} hint={t("Gunakan booking publik, website, mailto:, atau tel:. Route /app tidak diizinkan.", "Use public booking, website, mailto:, or tel:. /app routes are not allowed.")}><Input value={site.ctaUrl} placeholder="https://, mailto:, tel:, /booking/..." onChange={(e) => update("ctaUrl", e.target.value)} /></Field>
          </CardContent>
        </Card>

        <Card className={editorSection !== "content" ? "hidden" : undefined}>
          <CardHeader><CardTitle>{t("Konten", "Content")}</CardTitle></CardHeader>
          <CardContent><SectionEditor sections={site.sections} onChange={(sections) => update("sections", sections)} /></CardContent>
        </Card>

        <Card className={editorSection !== "links" ? "hidden" : undefined}>
          <CardHeader><CardTitle>{t("Tautan tambahan", "Additional links")}</CardTitle></CardHeader>
          <CardContent><LinkEditor links={site.links} onChange={(links) => update("links", links)} /></CardContent>
        </Card>

        <Card className={editorSection !== "appearance" ? "hidden" : undefined}>
          <CardHeader><CardTitle>{t("Tampilan", "Appearance")}</CardTitle></CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <Field label={t("Tema", "Theme")}><Select value={site.theme} onValueChange={(value) => update("theme", value as PersonalSiteInput["theme"])}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="midnight">Midnight</SelectItem><SelectItem value="paper">Paper</SelectItem><SelectItem value="studio">Studio</SelectItem></SelectContent></Select></Field>
            <Field label={t("Warna aksen", "Accent color")} error={state.fieldErrors?.accent?.[0]}><div className="grid grid-cols-[48px_1fr] gap-2"><Input aria-label={t("Pilih warna aksen", "Choose accent color")} className="h-10 p-1" type="color" value={site.accent} onChange={(e) => update("accent", e.target.value)} /><Input value={site.accent} onChange={(e) => update("accent", e.target.value)} /></div></Field>
          </CardContent>
        </Card>

        <Card className={editorSection !== "appearance" ? "hidden" : undefined}>
          <CardHeader><CardTitle>{t("Publikasi", "Publishing")}</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <Field label={t("Slug publik", "Public slug")} error={state.fieldErrors?.slug?.[0]} hint={`URL: ${publicUrl}`}><Input value={site.slug} onChange={(e) => update("slug", e.target.value)} onBlur={() => update("slug", normalizePersonalSiteSlug(site.slug))} /></Field>
            <div className="min-h-5 text-xs">
              {slugStatus === "checking" && <span className="text-muted-foreground">{t("Memeriksa slug…", "Checking slug…")}</span>}
              {slugStatus === "available" && <span className="text-emerald-600">{t("Slug tersedia.", "Slug is available.")}</span>}
              {slugStatus === "taken" && <span className="text-red-600">{t("Slug sudah dipakai.", "Slug is already taken.")}</span>}
              {slugStatus === "invalid" && <span className="text-red-600">{t("Slug belum valid.", "Slug is not valid yet.")}</span>}
            </div>
            <p className="rounded-xl bg-muted/50 p-3 text-sm"><strong>{t("Status tersimpan:", "Saved status:")}</strong> {site.published ? t("Published", "Published") : t("Draft", "Draft")}{dirty && <span className="text-amber-700"> · {t("Ada perubahan belum disimpan", "Unsaved changes")}</span>}</p>
          </CardContent>
        </Card>

        <div className="sticky bottom-3 z-20 hidden items-center justify-between gap-3 rounded-2xl border bg-background/95 p-3 shadow-xl backdrop-blur xl:flex">
          <Button type="button" variant="ghost" disabled={!dirty || pending} onClick={reset}><Undo2 className="h-4 w-4" />{t("Batalkan", "Discard")}</Button>
          <div className="flex gap-2">
            {site.published && <Button name="intent" value="unpublish" type="button" variant="outline" disabled={pending} onClick={async () => { const ok = await confirm({ title: t("Sembunyikan halaman?", "Unpublish page?"), description: t("Sembunyikan halaman publik ini?", "Unpublish this public page?"), confirmLabel: t("Unpublish", "Unpublish"), destructive: true }); if (ok) { const form = formRef.current; if (form) { const input = document.createElement("input"); input.type = "hidden"; input.name = "intent"; input.value = "unpublish"; form.appendChild(input); form.requestSubmit(); form.removeChild(input); } } }}>{t("Unpublish", "Unpublish")}</Button>}
            <Button name="intent" value="draft" type="submit" variant="outline" disabled={pending || slugStatus === "taken"}><Save className="h-4 w-4" />{pending ? t("Menyimpan…", "Saving…") : t("Simpan draft", "Save draft")}</Button>
            <Button name="intent" value="publish" type="submit" disabled={pending || slugStatus === "taken"}><Send className="h-4 w-4" />{pending ? t("Memproses…", "Publishing…") : t("Publish perubahan", "Publish changes")}</Button>
          </div>
        </div>
      </form>

      <section aria-label={t("Preview landing page", "Landing page preview")} className={`${mode === "edit" ? "hidden xl:block" : "block"} min-w-0`}>
        <div className="sticky top-20 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2"><div><h2 className="font-semibold">{t("Preview langsung", "Live preview")}</h2><p className="text-xs text-muted-foreground">{t("Preview memakai data yang sama dengan payload simpan.", "Preview uses the same data as the save payload.")}</p></div><PreviewToggle mode={previewMode} onChange={setPreviewMode} /></div>
          <div className={`mx-auto overflow-hidden rounded-2xl border bg-background shadow-sm transition-[max-width] ${previewMode === "mobile" ? "max-w-[375px]" : "max-w-full"}`}><PersonalSiteRenderer site={site} labels={labels} embedded /></div>
        </div>
      </section>
    </div>

    <div className={`${mode === "preview" ? "hidden" : "fixed"} inset-x-0 bottom-0 z-40 flex items-center justify-between gap-2 border-t bg-background/95 p-3 backdrop-blur xl:hidden`}>
      <Button type="button" variant="ghost" size="sm" disabled={!dirty || pending} onClick={reset}><Undo2 className="h-4 w-4" /><span className="sr-only">{t("Batalkan", "Discard")}</span></Button>
      <div className="flex flex-1 justify-end gap-2">
        {site.published && <Button name="intent" value="unpublish" type="button" variant="outline" size="sm" disabled={pending} onClick={async () => { const ok = await confirm({ title: t("Sembunyikan halaman?", "Unpublish page?"), description: t("Sembunyikan halaman publik ini?", "Unpublish this public page?"), confirmLabel: t("Unpublish", "Unpublish"), destructive: true }); if (ok) { const form = mobileFormRef.current; if (form) { const input = document.createElement("input"); input.type = "hidden"; input.name = "intent"; input.value = "unpublish"; form.appendChild(input); form.requestSubmit(); form.removeChild(input); } } }}>{t("Unpublish", "Unpublish")}</Button>}
        <form id="mobile-site-save" action={formAction} onSubmit={() => { submittedSnapshotRef.current = serialized; }} className="contents"><input type="hidden" name="site" value={serialized} /><Button name="intent" value="draft" type="submit" variant="outline" size="sm" disabled={pending || slugStatus === "taken"}><Save className="h-4 w-4" />{t("Draft", "Draft")}</Button><Button name="intent" value="publish" type="submit" size="sm" disabled={pending || slugStatus === "taken"}><Send className="h-4 w-4" />{t("Publish", "Publish")}</Button></form>
      </div>
    </div>
  </div>;
}

function Field({ label, children, hint, error }: { label: string; children: React.ReactNode; hint?: string; error?: string }) {
  return <label className="block space-y-2"><span className="text-sm font-medium">{label}</span>{children}{hint && <span className="block break-all text-xs text-muted-foreground">{hint}</span>}{error && <span className="block text-xs text-red-600">{error}</span>}</label>;
}
