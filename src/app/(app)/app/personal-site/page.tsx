import { redirect } from "next/navigation";
import { createPersonalNote, listPersonalNotes, updatePersonalNote } from "@/lib/actions/personal-notes";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import Link from "next/link";

const KEY = "[site]";

type SiteData = {
  title: string;
  subtitle: string;
  hero: string;
  about: string;
  ctaLabel: string;
  ctaUrl: string;
  links: string;
};

const defaults: SiteData = {
  title: "Your Name / Studio",
  subtitle: "Freelancer · Agency · Consultant",
  hero: "Simple client-facing landing page for your services.",
  about: "Tell clients what you do, who you help, and why they should work with you.",
  ctaLabel: "Book a call",
  ctaUrl: "/app/calendar",
  links: "Portfolio=https://example.com\nEmail=mailto:hello@example.com",
};

function parseSite(body?: string | null): SiteData {
  try {
    return { ...defaults, ...JSON.parse(body || "{}") };
  } catch {
    return defaults;
  }
}

export default async function PersonalSiteBuilderPage() {
  const existing = (await listPersonalNotes(KEY)).find((note) => note.title === KEY);
  const site = parseSite(existing?.body);

  async function saveSite(formData: FormData) {
    "use server";
    const payload: SiteData = {
      title: String(formData.get("title") || defaults.title),
      subtitle: String(formData.get("subtitle") || defaults.subtitle),
      hero: String(formData.get("hero") || defaults.hero),
      about: String(formData.get("about") || defaults.about),
      ctaLabel: String(formData.get("ctaLabel") || defaults.ctaLabel),
      ctaUrl: String(formData.get("ctaUrl") || defaults.ctaUrl),
      links: String(formData.get("links") || defaults.links),
    };
    const body = JSON.stringify(payload, null, 2);
    if (existing?.id) {
      await updatePersonalNote(existing.id, { title: KEY, body, pinned: true });
    } else {
      await createPersonalNote({ title: KEY, body, pinned: true });
    }
    redirect("/app/personal-site");
  }

  const parsedLinks = site.links
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const [label, ...urlParts] = line.split("=");
      return { label: label?.trim() || "Link", url: urlParts.join("=").trim() || "#" };
    });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Personal Landing Page Builder</h1>
          <p className="mt-1 text-sm text-muted-foreground">Mini Canvasite/Google Sites style builder untuk halaman personal sederhana.</p>
        </div>
        <Button variant="outline" asChild><Link href="/app/personal-site#preview">Preview</Link></Button>
      </div>

      <div className="grid gap-6 lg:grid-cols-[420px_1fr]">
        <Card className="h-fit">
          <CardHeader><CardTitle>Page content</CardTitle></CardHeader>
          <CardContent>
            <form action={saveSite} className="space-y-4">
              <div className="space-y-2"><label className="text-sm font-medium">Title</label><Input name="title" defaultValue={site.title} /></div>
              <div className="space-y-2"><label className="text-sm font-medium">Subtitle</label><Input name="subtitle" defaultValue={site.subtitle} /></div>
              <div className="space-y-2"><label className="text-sm font-medium">Hero</label><Textarea name="hero" rows={3} defaultValue={site.hero} /></div>
              <div className="space-y-2"><label className="text-sm font-medium">About</label><Textarea name="about" rows={6} defaultValue={site.about} /></div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-2"><label className="text-sm font-medium">CTA label</label><Input name="ctaLabel" defaultValue={site.ctaLabel} /></div>
                <div className="space-y-2"><label className="text-sm font-medium">CTA URL</label><Input name="ctaUrl" defaultValue={site.ctaUrl} /></div>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Links</label>
                <Textarea name="links" rows={5} defaultValue={site.links} placeholder="Label=https://url.com" />
                <p className="text-xs text-muted-foreground">One link per line: Label=https://url.com</p>
              </div>
              <Button type="submit" className="w-full">Save landing page</Button>
            </form>
          </CardContent>
        </Card>

        <Card id="preview" className="overflow-hidden">
          <div className="bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950 p-8 text-white md:p-12">
            <p className="text-sm uppercase tracking-[0.2em] text-indigo-200">{site.subtitle}</p>
            <h2 className="mt-4 max-w-3xl text-4xl font-bold tracking-tight md:text-6xl">{site.title}</h2>
            <p className="mt-5 max-w-2xl text-lg text-slate-200">{site.hero}</p>
            <Button className="mt-6 bg-white text-slate-950 hover:bg-slate-100" asChild><Link href={site.ctaUrl}>{site.ctaLabel}</Link></Button>
          </div>
          <CardContent className="space-y-6 p-8">
            <section>
              <h3 className="text-lg font-semibold">About</h3>
              <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-muted-foreground">{site.about}</p>
            </section>
            <section>
              <h3 className="text-lg font-semibold">Links</h3>
              <div className="mt-3 flex flex-wrap gap-2">
                {parsedLinks.map((link) => (
                  <Button key={`${link.label}-${link.url}`} variant="outline" size="sm" asChild><Link href={link.url}>{link.label}</Link></Button>
                ))}
              </div>
            </section>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
