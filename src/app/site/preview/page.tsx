import type { Metadata } from "next";
import { Button } from "@/components/ui/button";
import { listPersonalNotes } from "@/lib/actions/personal-notes";
import { requireAppSession } from "@/lib/app-auth";

const KEY = "[site]";

type SiteData = {
  title: string;
  subtitle: string;
  hero: string;
  about: string;
  ctaLabel: string;
  ctaUrl: string;
  background: string;
  accent: string;
  sections: string;
  links: string;
};

const defaults: SiteData = {
  title: "Your Name / Studio",
  subtitle: "Freelancer · Agency · Consultant",
  hero: "Simple client-facing landing page for your services.",
  about: "Tell clients what you do, who you help, and why they should work with you.",
  ctaLabel: "Book a call",
  ctaUrl: "/app/calendar",
  background: "Indigo gradient",
  accent: "#7c3aed",
  sections: "Services|Website, automation, design, and consulting.\nProcess|Discovery, build, review, launch.\nPricing|Project packages start from your custom offer.",
  links: "Portfolio=https://example.com\nEmail=mailto:hello@example.com",
};

export const metadata: Metadata = {
  title: "Landing Page Preview",
  robots: { index: false, follow: false },
};

function parseSite(body?: string | null): SiteData {
  try {
    return { ...defaults, ...JSON.parse(body || "{}") };
  } catch {
    return defaults;
  }
}

function safeHref(value?: string) {
  const href = (value || "#").trim();
  if (!href) return "#";
  if (href.startsWith("/") || href.startsWith("#") || href.startsWith("mailto:") || href.startsWith("tel:")) return href;
  if (href.startsWith("http://") || href.startsWith("https://")) return href;
  return `https://${href}`;
}

function parseRows(text: string, divider: string) {
  return text
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const [label, ...bodyParts] = line.split(divider);
      return { label: label?.trim() || "Untitled", body: bodyParts.join(divider).trim() };
    });
}

export default async function PersonalSitePreviewPage() {
  await requireAppSession("/site/preview");
  const existing = (await listPersonalNotes(KEY)).find((note) => note.title === KEY);
  const site = parseSite(existing?.body);
  const accent = site.accent || defaults.accent;
  const parsedSections = parseRows(site.sections, "|");
  const parsedLinks = parseRows(site.links, "=").map((link) => ({ label: link.label, url: safeHref(link.body) }));

  return (
    <main className="min-h-screen bg-white text-slate-950">
      <section className="bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950 px-6 py-20 text-white md:px-12 lg:px-20">
        <div className="mx-auto max-w-6xl">
          <div className="inline-flex rounded-full border border-white/20 px-3 py-1 text-xs uppercase tracking-[0.2em] text-indigo-100">{site.background}</div>
          <p className="mt-8 text-sm uppercase tracking-[0.24em] text-indigo-200">{site.subtitle}</p>
          <h1 className="mt-5 max-w-4xl text-5xl font-bold tracking-tight md:text-7xl">{site.title}</h1>
          <p className="mt-6 max-w-2xl text-lg leading-8 text-slate-200 md:text-xl">{site.hero}</p>
          <Button className="mt-8 rounded-full px-6 text-white hover:opacity-90" style={{ backgroundColor: accent }} asChild>
            <a href={safeHref(site.ctaUrl)}>{site.ctaLabel}</a>
          </Button>
        </div>
      </section>

      <section className="px-6 py-14 md:px-12 lg:px-20">
        <div className="mx-auto grid max-w-6xl gap-10 lg:grid-cols-[0.8fr_1.2fr]">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.2em]" style={{ color: accent }}>About</p>
            <h2 className="mt-3 text-3xl font-bold">What I do</h2>
          </div>
          <p className="whitespace-pre-wrap text-base leading-8 text-slate-600">{site.about}</p>
        </div>
      </section>

      <section className="bg-slate-50 px-6 py-14 md:px-12 lg:px-20">
        <div className="mx-auto max-w-6xl">
          <p className="text-sm font-semibold uppercase tracking-[0.2em]" style={{ color: accent }}>Sections</p>
          <div className="mt-6 grid gap-4 md:grid-cols-3">
            {parsedSections.map((section, index) => (
              <article key={`${section.label}-${index}`} className="rounded-3xl border bg-white p-6 shadow-sm">
                <div className="mb-5 h-1 w-12 rounded-full" style={{ backgroundColor: accent }} />
                <h3 className="text-xl font-semibold">{section.label}</h3>
                <p className="mt-3 whitespace-pre-wrap text-sm leading-7 text-slate-600">{section.body || "Add content in builder."}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="px-6 py-14 md:px-12 lg:px-20">
        <div className="mx-auto max-w-6xl rounded-3xl border p-8 text-center shadow-sm">
          <h2 className="text-3xl font-bold">Work with me</h2>
          <p className="mx-auto mt-3 max-w-2xl text-slate-600">Open portfolio, email, booking, or social links below.</p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            {parsedLinks.map((link, index) => (
              <Button key={`${link.label}-${index}`} variant="outline" className="rounded-full" asChild>
                <a href={link.url}>{link.label}</a>
              </Button>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
