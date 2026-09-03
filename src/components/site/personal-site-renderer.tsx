import Link from "next/link";
import Image from "next/image";
import type { CSSProperties, ReactNode } from "react";
import {
  accentForeground,
  isPlaceholderHref,
  isEditorialPlaceholderText,
  safePublicHref,
  sectionHasContent,
  type PersonalSiteInput,
  type PersonalSiteSection,
} from "@/lib/personal-site/model";
import { AnimateOnScroll } from "./animate-on-scroll";
import { ContactForm } from "./contact-form";
import "@/styles/site-animations.css";

const themeStyles = {
  midnight: {
    page: "bg-white text-slate-950",
    hero: "bg-slate-950 text-white",
    heroMuted: "text-slate-300",
    eyebrow: "text-violet-200",
    sectionAlt: "bg-slate-50",
    panel: "bg-white shadow-[0_12px_40px_rgba(15,23,42,0.08)] ring-1 ring-slate-900/5",
  },
  paper: {
    page: "bg-[#f6f0e4] text-[#34291f]",
    hero: "bg-[#34291f] text-[#fffaf0]",
    heroMuted: "text-[#e5d7c5]",
    eyebrow: "text-[#e7cba7]",
    sectionAlt: "bg-[#ede3d2]",
    panel: "bg-[#fffaf0] shadow-[0_12px_35px_rgba(74,55,38,0.09)] ring-1 ring-[#5c4633]/10",
  },
  studio: {
    page: "bg-white text-[#292D34]",
    hero: "bg-[#f4f1ff] text-[#292D34]",
    heroMuted: "text-slate-600",
    eyebrow: "text-[#6647F0]",
    sectionAlt: "bg-[#f8f7fc]",
    panel: "bg-white shadow-[0_10px_34px_rgba(68,54,124,0.10)] ring-1 ring-[#6647F0]/10",
  },
  ocean: {
    page: "bg-[#f0f9ff] text-[#0c4a6e]",
    hero: "bg-[#0c4a6e] text-white",
    heroMuted: "text-[#bae6fd]",
    eyebrow: "text-[#7dd3fc]",
    sectionAlt: "bg-[#e0f2fe]",
    panel: "bg-white shadow-[0_12px_40px_rgba(14,165,233,0.10)] ring-1 ring-[#0ea5e9]/10",
  },
  forest: {
    page: "bg-[#f0fdf4] text-[#14532d]",
    hero: "bg-[#14532d] text-white",
    heroMuted: "text-[#bbf7d0]",
    eyebrow: "text-[#86efac]",
    sectionAlt: "bg-[#dcfce7]",
    panel: "bg-white shadow-[0_12px_40px_rgba(22,163,74,0.10)] ring-1 ring-[#16a34a]/10",
  },
  sunset: {
    page: "bg-[#fff7ed] text-[#7c2d12]",
    hero: "bg-[#7c2d12] text-white",
    heroMuted: "text-[#fed7aa]",
    eyebrow: "text-[#fdba74]",
    sectionAlt: "bg-[#ffedd5]",
    panel: "bg-white shadow-[0_12px_40px_rgba(234,88,12,0.10)] ring-1 ring-[#ea580c]/10",
  },
  rose: {
    page: "bg-[#fff1f2] text-[#881337]",
    hero: "bg-[#881337] text-white",
    heroMuted: "text-[#fecdd3]",
    eyebrow: "text-[#fda4af]",
    sectionAlt: "bg-[#ffe4e6]",
    panel: "bg-white shadow-[0_12px_40px_rgba(225,29,72,0.10)] ring-1 ring-[#e11d48]/10",
  },
  dark: {
    page: "bg-[#030712] text-[#e2e8f0]",
    hero: "bg-[#1e1b4b] text-white",
    heroMuted: "text-[#c4b5fd]",
    eyebrow: "text-[#a78bfa]",
    sectionAlt: "bg-[#0f172a]",
    panel: "bg-[#1e293b] shadow-[0_12px_40px_rgba(0,0,0,0.3)] ring-1 ring-[#a78bfa]/10",
  },
} as const;

export type PersonalSiteRendererLabels = {
  about: string;
  workWithMe: string;
  contactHint: string;
  contact: string;
  openProject: string;
  pageNav: string;
};

const defaultLabels: PersonalSiteRendererLabels = {
  about: "About",
  workWithMe: "Work with me",
  contactHint: "Choose a contact or portfolio link below.",
  contact: "Contact me",
  openProject: "Open project",
  pageNav: "Site pages",
};

function ItemCard({ children, panel }: { children: ReactNode; panel: string }) {
  return <article className={`rounded-2xl p-5 sm:p-6 ${panel}`}>{children}</article>;
}

// Mirrors the model's fake-proof guard so stale sites carrying template
// testimonials (Budi Santoso / StartupX / "40%") never render as public proof.
function looksLikeFakeProof(quote: string, author: string, role: string) {
  const text = `${quote} ${author} ${role}`.trim().toLowerCase();
  if (!text) return false;
  return /(budi santoso|siti rahmawati|andi wijaya|startupx|techcorp|ceo startup)/i.test(text)
    || /\b\d+\s*%|\b\d+\+\s*(project|tahun|klien)/i.test(text);
}

function SectionBody({ section, accent, panel, buttonRadius, labels }: { section: PersonalSiteSection; accent: string; panel: string; buttonRadius: string; labels: PersonalSiteRendererLabels }) {
  const marker = <span aria-hidden className="mb-4 block h-1 w-10 rounded-full" style={{ backgroundColor: accent }} />;

  switch (section.type) {
    case "services":
      return <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">{section.items.filter((item) => item.title || item.description).map((item) => (
        <ItemCard key={item.id} panel={panel}>{marker}<h3 className="text-lg font-semibold">{item.title}</h3>{item.description && <p className="mt-2 whitespace-pre-wrap text-sm leading-6 opacity-70">{item.description}</p>}</ItemCard>
      ))}</div>;
    case "process":
      return <ol className="grid gap-5 md:grid-cols-2">{section.steps.filter((step) => step.title || step.description).map((step, index) => (
        <li key={step.id} className="grid grid-cols-[44px_1fr] gap-4">
          <span className="flex h-11 w-11 items-center justify-center rounded-full text-sm font-bold" style={{ backgroundColor: accent, color: accentForeground(accent) }}>{String(index + 1).padStart(2, "0")}</span>
          <div className="pt-1"><h3 className="font-semibold">{step.title}</h3>{step.description && <p className="mt-1 whitespace-pre-wrap text-sm leading-6 opacity-70">{step.description}</p>}</div>
        </li>
      ))}</ol>;
    case "pricing":
      return <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">{section.offers.filter((offer) => offer.name || offer.price || offer.description).map((offer) => (
        <ItemCard key={offer.id} panel={panel}>{marker}<h3 className="font-semibold">{offer.name}</h3>{offer.price && <p className="mt-3 text-2xl font-bold" style={{ color: accent }}>{offer.price}</p>}{offer.description && <p className="mt-3 whitespace-pre-wrap text-sm leading-6 opacity-70">{offer.description}</p>}</ItemCard>
      ))}</div>;
    case "portfolio":
      return <div className="grid gap-4 md:grid-cols-2">{section.projects.filter((project) => project.title || project.description || project.url).map((project) => (
        <ItemCard key={project.id} panel={panel}>{marker}<h3 className="text-lg font-semibold">{project.title}</h3>{project.description && <p className="mt-2 whitespace-pre-wrap text-sm leading-6 opacity-70">{project.description}</p>}{project.url && !isPlaceholderHref(project.url) && <a className="mt-4 inline-flex min-h-10 items-center font-semibold underline underline-offset-4" href={safePublicHref(project.url)} target="_blank" rel="noreferrer">{labels.openProject}</a>}</ItemCard>
      ))}</div>;
    case "testimonials":
      return <div className="grid gap-4 md:grid-cols-2">{section.testimonials.filter((item) => item.quote && (item.author || item.role) && !looksLikeFakeProof(item.quote, item.author, item.role)).map((item) => (
        <figure key={item.id} className={`rounded-2xl p-6 ${panel}`}><blockquote className="text-lg leading-8">“{item.quote}”</blockquote><figcaption className="mt-5 text-sm"><strong>{item.author}</strong>{item.role && <span className="opacity-65"> · {item.role}</span>}</figcaption></figure>
      ))}</div>;
    case "faq":
      return <div className="space-y-3">{section.items.filter((item) => item.question && item.answer).map((item) => (
        <details key={item.id} className={`group rounded-2xl px-5 py-4 ${panel}`}><summary className="cursor-pointer list-none pr-8 font-semibold marker:content-none">{item.question}<span aria-hidden className="float-right text-xl group-open:rotate-45">+</span></summary><p className="mt-3 whitespace-pre-wrap text-sm leading-7 opacity-70">{item.answer}</p></details>
      ))}</div>;
    case "contact":
      return <div className="flex flex-wrap gap-3">{section.methods.filter((item) => item.label && (item.value || item.url)).map((item) => item.url && !isPlaceholderHref(item.url) ? (
        <a key={item.id} className={`min-h-11 rounded-xl px-4 py-3 text-sm font-semibold ${panel}`} href={safePublicHref(item.url)}>{item.label}{item.value ? ` · ${item.value}` : ""}</a>
      ) : <span key={item.id} className={`rounded-xl px-4 py-3 text-sm ${panel}`}><strong>{item.label}</strong>{item.value ? ` · ${item.value}` : ""}</span>)}</div>;
    case "custom":
      return <div className={`rounded-2xl p-6 ${panel}`}><p className="max-w-3xl whitespace-pre-wrap text-base leading-8 opacity-75">{section.content}</p></div>;
    case "gallery":
      return <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{section.images.filter((img) => img.url).map((img) => (
        <div key={img.id} className="relative aspect-[4/3] w-full overflow-hidden rounded-2xl"><Image src={img.url.startsWith("http") ? img.url : img.url.startsWith("/") ? img.url : `/${img.url}`} alt={img.alt || ""} fill sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw" className="object-cover" loading="lazy" /></div>
      ))}</div>;
    case "embed":
      return section.url ? <iframe src={section.url} className="w-full rounded-2xl" style={{ height: section.height || 400 }} allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen loading="lazy" /> : null;
    case "social":
      return <div className="flex flex-wrap gap-3">{section.links.filter((link) => link.url).map((link) => (
        <a key={link.id} className={`inline-flex min-h-11 items-center rounded-xl px-5 py-3 text-sm font-semibold ${panel}`} href={safePublicHref(link.url)} target="_blank" rel="noreferrer">{link.platform}</a>
      ))}</div>;
    case "cta":
      return <div className={`rounded-2xl p-8 text-center ${panel}`}>{section.text && <p className="mx-auto max-w-xl text-lg leading-8 opacity-75">{section.text}</p>}{section.buttonLabel && section.buttonUrl && !isPlaceholderHref(section.buttonUrl) && safePublicHref(section.buttonUrl) !== "#" && <a className="mt-6 inline-flex min-h-11 items-center justify-center px-6 py-3 text-sm font-semibold shadow-lg" style={{ backgroundColor: accent, color: accentForeground(accent), borderRadius: buttonRadius }} href={safePublicHref(section.buttonUrl)}>{section.buttonLabel}</a>}</div>;
    case "divider":
      return <hr className="border-t border-current opacity-15" />;
    case "collapsible":
      return <div className="space-y-3">{section.items.filter((item) => item.title && item.content).map((item) => (
        <details key={item.id} className={`group rounded-2xl px-5 py-4 ${panel}`}><summary className="cursor-pointer list-none pr-8 font-semibold">{item.title}<span aria-hidden className="float-right text-xl group-open:rotate-45">+</span></summary><p className="mt-3 whitespace-pre-wrap text-sm leading-7 opacity-70">{item.content}</p></details>
      ))}</div>;
    case "spacer":
      return <div style={{ height: section.height ?? 40 }} />;
    case "tableOfContents":
      return null; // Auto-generated, skip in public render
    case "contentBlock":
      return <div className={`grid gap-4 ${section.columns === 2 ? "sm:grid-cols-2" : section.columns === 3 ? "sm:grid-cols-3" : "sm:grid-cols-4"}`}>{section.items.filter((item) => item.content.trim()).map((item) => (
        <div key={item.id} className={`rounded-2xl p-6 ${panel}`}><p className="whitespace-pre-wrap text-sm leading-7 opacity-75">{item.content}</p></div>
      ))}</div>;
  }
}

export function PersonalSiteRenderer({
  site,
  labels = defaultLabels,
  embedded = false,
  activePageSlug = "",
}: {
  site: PersonalSiteInput;
  labels?: PersonalSiteRendererLabels;
  embedded?: boolean;
  activePageSlug?: string;
}) {
  const styles = themeStyles[site.theme];
  const pages = site.pages?.length ? site.pages : [{ id: "home", slug: "", title: "Home", isHome: true, sections: site.sections }];
  const activePage = pages.find((page) => page.slug === activePageSlug) ?? pages.find((page) => page.isHome) ?? pages[0];
  const visiblePages = pages.filter((page) => page.title);
  const visibleSections = (activePage?.sections?.length ? activePage.sections : site.sections).filter(sectionHasContent);
  const visibleLinks = site.links.filter((link) => link.label && !isPlaceholderHref(link.url) && safePublicHref(link.url) !== "#");
  const heroCopy = isEditorialPlaceholderText(site.hero) ? "" : site.hero;
  const aboutCopy = isEditorialPlaceholderText(site.about) ? "" : site.about;
  const themeConfig = site.themeConfig;
  const accent = themeConfig?.primaryColor ?? site.accent;
  const buttonRadius = themeConfig?.buttonStyle === "pill" ? "999px" : themeConfig?.buttonStyle === "square" ? "0.25rem" : "0.75rem";
  const heroShellClass = themeConfig?.headerStyle === "contained" ? "mx-auto my-6 max-w-6xl rounded-[2rem]" : themeConfig?.headerStyle === "minimal" ? "bg-transparent" : "";
  const accentStyle = {
    "--site-accent": accent,
    "--site-button-radius": buttonRadius,
    ...(themeConfig?.backgroundColor ? { "--site-bg": themeConfig.backgroundColor, backgroundColor: themeConfig.backgroundColor } : {}),
    ...(themeConfig?.textColor ? { "--site-text": themeConfig.textColor, color: themeConfig.textColor } : {}),
    ...(themeConfig?.fontBody ? { fontFamily: themeConfig.fontBody } : {}),
  } as CSSProperties;
  const headingStyle = themeConfig?.fontHeading ? { fontFamily: themeConfig.fontHeading } : undefined;

  return (
    <main data-testid="personal-site-renderer" data-theme={site.theme} style={accentStyle} className={`${embedded ? "min-h-0" : "min-h-screen"} overflow-hidden ${styles.page}`}>
      <section className={`relative ${styles.hero} ${heroShellClass} px-6 py-14 sm:px-10 sm:py-20 lg:px-16 lg:py-24`} style={{ backgroundColor: themeConfig?.headerStyle === "minimal" ? "transparent" : accent }}>
        {site.heroImage && (
          <Image
            src={site.heroImage}
            alt=""
            fill
            sizes="100vw"
            aria-hidden="true"
            className="object-cover opacity-20"
          />
        )}
        <div className="relative z-10 mx-auto max-w-6xl">
          {site.subtitle && <p className={`text-xs font-semibold uppercase tracking-[0.2em] sm:text-sm ${styles.eyebrow}`}>{site.subtitle}</p>}
          <h1 className={`${site.subtitle ? "mt-5" : ""} max-w-4xl text-4xl font-bold leading-[1.05] tracking-[-0.02em] sm:text-6xl lg:text-7xl`} style={headingStyle}>{site.title}</h1>
          {heroCopy && <p className={`mt-6 max-w-2xl text-base leading-7 sm:text-xl sm:leading-8 ${styles.heroMuted}`}>{heroCopy}</p>}
          {site.ctaLabel && site.ctaUrl && !isPlaceholderHref(site.ctaUrl) && safePublicHref(site.ctaUrl) !== "#" && (
            <a className="mt-8 inline-flex min-h-11 items-center justify-center px-6 py-3 text-sm font-semibold shadow-lg transition-transform hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2" style={{ backgroundColor: accent, color: accentForeground(accent), borderRadius: buttonRadius }} href={safePublicHref(site.ctaUrl)}>{site.ctaLabel}</a>
          )}
        {visiblePages.length > 1 && (
          <nav className="mt-8 flex flex-wrap gap-2" aria-label={labels.pageNav}>
            {visiblePages.map((page) => {
              const href = page.slug ? `/site/${site.slug}/${page.slug}` : `/site/${site.slug}`;
              const active = page.id === activePage?.id;
              return (
                <Link
                  key={page.id}
                  href={href}
                  className={`inline-flex min-h-10 items-center rounded-full border px-4 py-2 text-sm font-semibold transition ${active ? "bg-white text-slate-950" : "border-white/30 text-white hover:bg-white/10"}`}
                >
                  {page.title}
                </Link>
              );
            })}
          </nav>
        )}

        </div>
      </section>

      {aboutCopy && <section className="px-6 py-14 sm:px-10 lg:px-16 lg:py-20"><div className="mx-auto grid max-w-6xl gap-6 lg:grid-cols-[0.65fr_1.35fr]"><div><p className="text-xs font-bold uppercase tracking-[0.18em]" style={{ color: accent }}>{labels.about}</p><h2 className="mt-3 text-3xl font-bold tracking-[-0.01em]" style={headingStyle}>{site.title}</h2></div><p className="whitespace-pre-wrap text-base leading-8 opacity-70">{aboutCopy}</p></div></section>}

      {visibleSections.map((section, index) => (
        <AnimateOnScroll key={section.id} animation={section.animation}>
          <section data-section-type={section.type} className={`${index % 2 === 0 ? styles.sectionAlt : ""} px-6 py-14 sm:px-10 lg:px-16 lg:py-20`}>
            <div className="mx-auto max-w-6xl"><h2 className="mb-7 text-2xl font-bold tracking-[-0.01em] sm:text-3xl" style={headingStyle}>{section.heading}</h2><SectionBody section={section} accent={accent} panel={styles.panel} buttonRadius={buttonRadius} labels={labels} /></div>
          </section>
        </AnimateOnScroll>
      ))}

      {visibleLinks.length > 0 && <section className="px-6 py-14 sm:px-10 lg:px-16 lg:py-20"><div className={`mx-auto max-w-6xl rounded-3xl p-7 text-center sm:p-10 ${styles.panel}`}><h2 className="text-2xl font-bold sm:text-3xl">{labels.workWithMe}</h2><p className="mx-auto mt-3 max-w-xl text-sm leading-6 opacity-65">{labels.contactHint}</p><div className="mt-6 flex flex-wrap justify-center gap-3">{visibleLinks.map((link) => <a key={link.id} className="inline-flex min-h-11 items-center rounded-xl px-5 py-3 text-sm font-semibold" style={{ backgroundColor: accent, color: accentForeground(accent), borderRadius: buttonRadius }} href={safePublicHref(link.url)} target={/^https?:/i.test(link.url) ? "_blank" : undefined} rel={/^https?:/i.test(link.url) ? "noreferrer" : undefined}>{link.label}</a>)}</div></div></section>}

      {/* Contact form */}
      <section className="px-6 py-14 sm:px-10 lg:px-16 lg:py-20">
        <div className="mx-auto max-w-lg">
          <h2 className="mb-7 text-2xl font-bold tracking-[-0.01em] sm:text-3xl text-center" style={{ color: site.themeConfig?.primaryColor ?? site.accent }}>
            {labels.contact}
          </h2>
          <ContactForm siteSlug={site.slug} />
        </div>
      </section>
    </main>
  );
}
