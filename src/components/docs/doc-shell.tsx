import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { ChevronRight, Clock3 } from "lucide-react";
import { cn } from "@/lib/utils";

/* ------------------------------------------------------------------ */
/* Shared metadata helpers                                              */
/* ------------------------------------------------------------------ */

export type DocText = { id: string; en: string };

export function docText(text: DocText, lang: "id" | "en") {
  return lang === "en" ? text.en : text.id;
}

/** Rough reading time (Indonesian/English ~200 wpm). */
export function estimateReadMinutes(content: string): number {
  const words = content.trim().split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.round(words / 200));
}

/* ------------------------------------------------------------------ */
/* Breadcrumb                                                          */
/* ------------------------------------------------------------------ */

export function DocsBreadcrumb({
  items,
}: {
  items: Array<{ label: string; href?: string }>;
}) {
  return (
    <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-xs text-muted-foreground">
      {items.map((item, i) => {
        const isLast = i === items.length - 1;
        return (
          <span key={i} className="flex min-w-0 items-center gap-1.5">
            {i > 0 && <ChevronRight className="h-3.5 w-3.5 shrink-0 opacity-50" aria-hidden />}
            {item.href && !isLast ? (
              <Link
                href={item.href}
                className="rounded-sm transition-colors hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                {item.label}
              </Link>
            ) : (
              <span className={cn("truncate", isLast && "font-medium text-foreground/80")} aria-current={isLast ? "page" : undefined}>
                {item.label}
              </span>
            )}
          </span>
        );
      })}
    </nav>
  );
}

/* ------------------------------------------------------------------ */
/* Hero                                                                */
/* ------------------------------------------------------------------ */

export function DocsHero({
  icon: Icon,
  title,
  description,
  category,
  readMinutes,
}: {
  icon: LucideIcon;
  title: string;
  description: string;
  category: string;
  readMinutes?: number;
}) {
  return (
    <div className="relative overflow-hidden rounded-2xl border bg-gradient-to-br from-primary/[0.08] via-card to-card p-6 shadow-sm sm:p-7">
      <div
        aria-hidden
        className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-primary/[0.07] blur-2xl"
      />
      <div className="relative flex items-start gap-4">
        <div className="hidden h-12 w-12 shrink-0 items-center justify-center rounded-xl border bg-card text-primary shadow-sm sm:flex">
          <Icon className="h-6 w-6" aria-hidden />
        </div>
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center rounded-full border bg-card px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-primary">
              {category}
            </span>
            {typeof readMinutes === "number" && (
              <span className="inline-flex items-center gap-1 text-[11px] font-medium text-muted-foreground">
                <Clock3 className="h-3 w-3" aria-hidden />
                {readMinutes} min
              </span>
            )}
          </div>
          <h1 className="mt-2 font-display text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
            {title}
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground">{description}</p>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Two-column layout + sticky table of contents                        */
/* ------------------------------------------------------------------ */

export type TocItem = { id: string; label: string };

export function DocsLayout({
  toc,
  tocLabel = "Daftar Isi",
  children,
}: {
  toc: TocItem[];
  tocLabel?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="lg:grid lg:grid-cols-[minmax(0,1fr)_250px] lg:items-start lg:gap-10">
      <div className="min-w-0 space-y-5">{children}</div>
      <aside className="mt-10 hidden lg:sticky lg:top-24 lg:mt-0 lg:block">
        <nav
          aria-label={tocLabel}
          className="max-h-[calc(100vh-8rem)] overflow-y-auto rounded-xl border bg-card/60 p-4"
        >
          <p className="px-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            {tocLabel}
          </p>
          <ul className="mt-2 space-y-0.5 border-l border-border">
            {toc.map((item) => (
              <li key={item.id}>
                <a
                  href={`#${item.id}`}
                  className="-ml-px block border-l-2 border-transparent px-3 py-1.5 text-[13px] leading-snug text-muted-foreground transition-colors hover:border-primary hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  {item.label}
                </a>
              </li>
            ))}
          </ul>
        </nav>
      </aside>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Section block                                                       */
/* ------------------------------------------------------------------ */

export function DocsSection({
  id,
  step,
  icon: Icon,
  title,
  children,
}: {
  id: string;
  step?: number;
  icon?: LucideIcon;
  title: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section
      id={id}
      className="scroll-mt-24 rounded-xl border bg-card p-5 shadow-sm transition-shadow hover:shadow-md sm:p-6"
    >
      <div className="flex items-center gap-3">
        {typeof step === "number" && (
          <span
            aria-hidden
            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground"
          >
            {step}
          </span>
        )}
        {Icon && !step ? (
          <span
            aria-hidden
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary"
          >
            <Icon className="h-4.5 w-4.5" />
          </span>
        ) : null}
        <h2 className="font-display text-base font-semibold tracking-tight text-foreground sm:text-lg">
          {title}
        </h2>
      </div>
      <div className="mt-3 space-y-3 text-sm leading-relaxed text-muted-foreground">{children}</div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* Steps / callouts / link helpers                                     */
/* ------------------------------------------------------------------ */

export function DocsSteps({ items }: { items: React.ReactNode[] }) {
  return (
    <ol className="list-decimal space-y-1.5 pl-5 marker:font-medium marker:text-primary">
      {items.map((item, i) => (
        <li key={i} className="pl-1">
          {item}
        </li>
      ))}
    </ol>
  );
}

export function DocsCallout({
  variant = "info",
  title,
  children,
}: {
  variant?: "info" | "tip" | "warning";
  title?: string;
  children: React.ReactNode;
}) {
  const styles = {
    info: "border-blue-200 bg-blue-50/70 text-blue-900",
    tip: "border-emerald-200 bg-emerald-50/70 text-emerald-900",
    warning: "border-amber-200 bg-amber-50/70 text-amber-900",
  } as const;
  const label = {
    info: "Info",
    tip: "Tip",
    warning: "Perhatian",
  } as const;
  return (
    <div className={cn("rounded-lg border px-3.5 py-3 text-[13px] leading-relaxed", styles[variant])}>
      {title && <p className="mb-0.5 font-semibold">{title}</p>}
      {children}
      <span className="sr-only">{label[variant]}</span>
    </div>
  );
}

export function DocsInlineLink({
  href,
  children,
}: {
  href: string;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className="font-medium text-primary underline decoration-primary/30 underline-offset-2 transition-colors hover:decoration-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-sm"
    >
      {children}
    </Link>
  );
}

/* ------------------------------------------------------------------ */
/* Index page card                                                     */
/* ------------------------------------------------------------------ */

export function DocsCard({
  href,
  icon: Icon,
  title,
  description,
  category,
}: {
  href: string;
  icon: LucideIcon;
  title: string;
  description: string;
  category?: string;
}) {
  return (
    <Link
      href={href}
      className="group flex flex-col gap-3 rounded-xl border bg-card p-5 shadow-sm transition-all hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      <div className="flex items-center justify-between gap-2">
        <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
          <Icon className="h-5 w-5" aria-hidden />
        </span>
        {category && (
          <span className="rounded-full border bg-muted/40 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
            {category}
          </span>
        )}
      </div>
      <div className="min-w-0">
        <h2 className="font-display text-sm font-semibold tracking-tight text-foreground transition-colors group-hover:text-primary">
          {title}
        </h2>
        <p className="mt-1 line-clamp-3 text-xs leading-relaxed text-muted-foreground">{description}</p>
      </div>
    </Link>
  );
}
