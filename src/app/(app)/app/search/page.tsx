import Link from "next/link";
import { Building2, Briefcase, CheckSquare, Receipt, Search as SearchIcon } from "lucide-react";
import { requireAppSession } from "@/lib/app-auth";
import { requireUser } from "@/lib/access";
import { getWorkspaceForCurrentUser } from "@/lib/workspace";
import { getCurrentLang, createT } from "@/lib/i18n";
import { searchWorkspaceEntities, type SearchKind } from "@/lib/search-workspace";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { StatusFilterTabs } from "@/components/ui/status-filter-tabs";
import { invoiceStatusVariant, taskStatusVariant } from "@/lib/status-badge";

interface SearchParams {
  q?: string;
  kind?: string;
}

const KIND_META: Record<
  SearchKind,
  { labelId: string; labelEn: string; icon: typeof Building2 }
> = {
  client: { labelId: "Klien", labelEn: "Client", icon: Building2 },
  project: { labelId: "Proyek", labelEn: "Project", icon: Briefcase },
  task: { labelId: "Tugas", labelEn: "Task", icon: CheckSquare },
  invoice: { labelId: "Invoice", labelEn: "Invoice", icon: Receipt },
};

function statusBadge(kind: SearchKind, status: string | null | undefined, lang: "id" | "en") {
  if (!status) return null;
  if (kind === "invoice") {
    const cfg = invoiceStatusVariant(status, lang);
    return <Badge variant={cfg.variant}>{cfg.label}</Badge>;
  }
  if (kind === "task") {
    const cfg = taskStatusVariant(status, lang);
    return <Badge variant={cfg.variant}>{cfg.label}</Badge>;
  }
  return (
    <Badge variant="outline" className="capitalize">
      {status.replaceAll("_", " ")}
    </Badge>
  );
}

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const session = await requireAppSession("/app/search");
  requireUser(session.user);
  const lang = await getCurrentLang();
  const t = createT(lang);
  const workspaceId = await getWorkspaceForCurrentUser();
  const params = await searchParams;
  const q = (params.q ?? "").trim();
  const kindFilter = (params.kind ?? "all").toLowerCase();
  const kinds =
    kindFilter === "client" ||
    kindFilter === "project" ||
    kindFilter === "task" ||
    kindFilter === "invoice"
      ? ([kindFilter] as SearchKind[])
      : undefined;

  const result = q
    ? await searchWorkspaceEntities({
        workspaceId,
        q,
        limit: 40,
        kinds,
      })
    : { query: "", count: 0, results: [] };

  const grouped = {
    client: result.results.filter((r) => r.kind === "client"),
    project: result.results.filter((r) => r.kind === "project"),
    task: result.results.filter((r) => r.kind === "task"),
    invoice: result.results.filter((r) => r.kind === "invoice"),
  } as const;

  const filters: Array<{ key: string; label: string }> = [
    { key: "all", label: t("Semua", "All") },
    { key: "client", label: t("Klien", "Clients") },
    { key: "project", label: t("Proyek", "Projects") },
    { key: "task", label: t("Tugas", "Tasks") },
    { key: "invoice", label: t("Invoice", "Invoices") },
  ];

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-6 p-4 sm:p-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">
          {t("Pencarian", "Search")}
        </h1>
        <p className="text-sm text-muted-foreground">
          {t(
            "Cari klien, proyek, tugas, dan invoice di workspace aktif.",
            "Search clients, projects, tasks, and invoices in the active workspace.",
          )}
        </p>
      </div>

      <Card>
        <CardContent className="p-4 sm:p-5">
          <form action="/app/search" method="get" className="flex flex-col gap-3 sm:flex-row">
            <div className="relative min-w-0 flex-1">
              <SearchIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                name="q"
                defaultValue={q}
                placeholder={t("Ketik nama, email, nomor invoice…", "Type name, email, invoice number…")}
                className="h-10 pl-9"
                autoFocus
              />
            </div>
            {kindFilter !== "all" && <input type="hidden" name="kind" value={kindFilter} />}
            <Button type="submit" className="h-10 shrink-0">
              {t("Cari", "Search")}
            </Button>
          </form>

          <div className="mt-3">
            <StatusFilterTabs
              activeValue={kindFilter}
              hideEmpty={false}
              listClassName="w-full"
              tabs={filters.map((f) => ({
                value: f.key,
                label: f.label,
                href: q
                  ? `/app/search?q=${encodeURIComponent(q)}${f.key === "all" ? "" : `&kind=${f.key}`}`
                  : `/app/search${f.key === "all" ? "" : `?kind=${f.key}`}`,
                alwaysShow: true,
              }))}
            />
          </div>
        </CardContent>
      </Card>

      {!q ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-2 p-10 text-center text-sm text-muted-foreground">
            <SearchIcon className="h-8 w-8 opacity-40" />
            <p>{t("Mulai ketik query di atas.", "Start typing a query above.")}</p>
          </CardContent>
        </Card>
      ) : result.count === 0 ? (
        <Card>
          <CardContent className="p-10 text-center text-sm text-muted-foreground">
            {t(`Tidak ada hasil untuk “${q}”.`, `No results for “${q}”.`)}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-5">
          <p className="text-sm text-muted-foreground">
            {t(
              `${result.count} hasil untuk “${result.query}”`,
              `${result.count} results for “${result.query}”`,
            )}
          </p>

          {(Object.keys(grouped) as SearchKind[]).map((kind) => {
            const items = grouped[kind];
            if (!items.length) return null;
            const meta = KIND_META[kind];
            const Icon = meta.icon;
            return (
              <Card key={kind}>
                <CardHeader className="pb-2">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Icon className="h-4 w-4 text-muted-foreground" />
                    {lang === "en" ? meta.labelEn : meta.labelId}
                    <Badge variant="secondary" className="ml-1">
                      {items.length}
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent className="divide-y p-0">
                  {items.map((item) => (
                    <Link
                      key={`${item.kind}-${item.id}`}
                      href={item.href}
                      className="flex items-start justify-between gap-3 px-6 py-3 transition-colors hover:bg-slate-50"
                    >
                      <div className="min-w-0">
                        <p className="truncate font-medium">{item.title}</p>
                        {item.subtitle ? (
                          <p className="truncate text-xs text-muted-foreground">{item.subtitle}</p>
                        ) : null}
                      </div>
                      {statusBadge(item.kind, item.status, lang)}
                    </Link>
                  ))}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
