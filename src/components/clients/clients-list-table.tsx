"use client";

import { useMemo } from "react";
import Link from "next/link";
import { Globe, Plus } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { SortableHeader } from "@/components/ui/sortable-header";
import { useTableSort } from "@/hooks/use-table-sort";
import { useT } from "@/lib/i18n-client";
import { ClientStatusEditDialog } from "@/components/clients/client-status-edit-dialog";

export type ClientListItem = {
  id: string;
  clientNumber: string | null;
  name: string;
  companyName: string | null;
  status: string;
  tags: string[] | null;
  portalEnabled: boolean | null;
  portalSlug: string | null;
  portalSlugEnabled: boolean | null;
  projectCount: number;
};

const STATUS_ORDER = ["active", "inactive", "archived"] as const;
type SortKey = "name" | "company" | "projects" | "portal" | "status";

export function ClientsListTable({
  clients,
  clientCount,
  canWrite,
  isAtLimit: _isAtLimit,
}: {
  clients: ClientListItem[];
  clientCount: number;
  canWrite: boolean;
  isAtLimit: boolean; // Used by parent to show upgrade banner, not consumed here
}) {
  const { t } = useT();

  const statusLabel = (status: string) => {
    if (status === "active") return t("Aktif", "Active");
    if (status === "inactive") return t("Nonaktif", "Inactive");
    if (status === "archived") return t("Diarsipkan", "Archived");
    return status;
  };

  const getters = useMemo(
    () => ({
      name: (r: ClientListItem) => r.name,
      company: (r: ClientListItem) => r.companyName ?? "",
      projects: (r: ClientListItem) => r.projectCount,
      portal: (r: ClientListItem) => (r.portalEnabled ? 1 : 0),
      status: (r: ClientListItem) => r.status,
    }),
    [],
  );

  const orders = useMemo(() => ({ status: STATUS_ORDER }), []);
  const { sorted, toggle, dirFor } = useTableSort<ClientListItem, SortKey>(
    clients,
    getters,
    orders,
  );

  const emptyDesktop = (
    <div className="p-10 text-center">
      {clientCount === 0 ? (
        <>
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-muted">
            <Plus className="h-6 w-6 text-muted-foreground" />
          </div>
          <h3 className="font-medium">{t("Belum ada klien", "No clients yet")}</h3>
          <p className="mx-auto mt-1 max-w-sm text-sm text-muted-foreground">
            {t(
              "Tambah klien pertama untuk mulai kelola project, invoice, dan portal mereka.",
              "Add your first client to start managing their projects, invoices, and portal.",
            )}
          </p>
        </>
      ) : (
        <p className="text-sm text-muted-foreground">
          {t(
            "Tidak ada klien yang cocok dengan pencarian atau filter.",
            "No clients match your search or filter.",
          )}
        </p>
      )}
    </div>
  );

  return (
    <>
      <div className="hidden md:block overflow-hidden rounded-xl border border-border/80 bg-card shadow-xs">
        <div className="grid grid-cols-12 gap-3 px-3.5 py-2 text-[11px] font-semibold text-muted-foreground bg-muted/40 border-b border-border/80 items-center">
          <div className="col-span-4">
            <SortableHeader
              as="div"
              label={t("Klien", "Client")}
              dir={dirFor("name")}
              onClick={() => toggle("name")}
              className="text-[11px] uppercase tracking-wider"
            />
          </div>
          <div className="col-span-3">
            <SortableHeader
              as="div"
              label={t("Perusahaan", "Company")}
              dir={dirFor("company")}
              onClick={() => toggle("company")}
              className="text-[11px] uppercase tracking-wider"
            />
          </div>
          <div className="col-span-1 text-center">
            <SortableHeader
              as="div"
              label={t("Proyek", "Projects")}
              dir={dirFor("projects")}
              onClick={() => toggle("projects")}
              className="text-[11px] uppercase tracking-wider justify-center"
            />
          </div>
          <div className="col-span-2">
            <SortableHeader
              as="div"
              label={t("Portal", "Portal")}
              dir={dirFor("portal")}
              onClick={() => toggle("portal")}
              className="text-[11px] uppercase tracking-wider"
            />
          </div>
          <div className="col-span-1">
            <SortableHeader
              as="div"
              label={t("Status", "Status")}
              dir={dirFor("status")}
              onClick={() => toggle("status")}
              className="text-[11px] uppercase tracking-wider"
            />
          </div>
          <div className="col-span-1 text-right text-[11px] uppercase tracking-wider">{t("Aksi", "Action")}</div>
        </div>
        {clients.length === 0 && emptyDesktop}
        {sorted.map((client) => (
          <div
            key={client.id}
            className="grid grid-cols-12 gap-3 border-b border-border/60 px-3.5 py-2 items-center transition-colors last:border-0 hover:bg-muted/40"
          >
            <div className="col-span-4 flex items-center gap-2.5 min-w-0">
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-xs font-bold text-primary">
                {client.name.charAt(0).toUpperCase()}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <Link
                    href={`/app/clients/${client.id}`}
                    className="text-xs font-semibold text-foreground hover:text-primary transition-colors truncate"
                  >
                    {client.name}
                  </Link>
                  {client.tags && client.tags.length > 0 && (
                    <div className="flex gap-1">
                      {client.tags.slice(0, 2).map((tag) => (
                        <span
                          key={tag}
                          className="text-[9px] px-1.5 py-0.2 rounded bg-muted/60 text-muted-foreground border border-border/60"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
            <div className="col-span-3 text-xs text-muted-foreground truncate">
              {client.companyName || "—"}
            </div>
            <div className="col-span-1 text-center text-xs font-medium text-foreground">{client.projectCount}</div>
            <div className="col-span-2">
              {client.portalEnabled ? (
                <Badge
                  variant="outline"
                  className="gap-1 text-[10px] font-medium border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 rounded-full px-2 py-0 h-5"
                >
                  <Globe className="h-2.5 w-2.5" /> {t("Portal Aktif", "Portal Active")}
                </Badge>
              ) : (
                <span className="text-xs text-muted-foreground">—</span>
              )}
            </div>
            <div className="col-span-1">
              <Badge
                variant="outline"
                className={
                  client.status === "active"
                    ? "gap-1 text-[10px] font-medium border-primary/30 bg-primary/10 text-primary rounded-full px-2 py-0 h-5"
                    : "gap-1 text-[10px] font-medium border-border/80 bg-muted/60 text-muted-foreground rounded-full px-2 py-0 h-5"
                }
              >
                <span className={`h-1 w-1 rounded-full ${client.status === "active" ? "bg-primary" : "bg-muted-foreground"}`} />
                {statusLabel(client.status)}
              </Badge>
            </div>
            <div className="col-span-1 flex justify-end">{canWrite ? <ClientStatusEditDialog clientId={client.id} clientName={client.name} currentStatus={client.status} /> : null}</div>
          </div>
        ))}
      </div>

      <div className="md:hidden space-y-3">
        {clients.length === 0 && (
          <div className="rounded-lg border p-8 text-center">
            {clientCount === 0 ? (
              <>
                <p className="font-medium">{t("Belum ada klien", "No clients yet")}</p>
                <p className="mx-auto mt-1 max-w-xs text-sm text-muted-foreground">
                  {t(
                    "Tambah klien pertama untuk mulai kelola project & invoice.",
                    "Add your first client to start managing projects & invoices.",
                  )}
                </p>
              </>
            ) : (
              <p className="text-sm text-muted-foreground">
                {t(
                  "Tidak ada klien yang cocok dengan pencarian atau filter.",
                  "No clients match your search or filter.",
                )}
              </p>
            )}
          </div>
        )}
        {sorted.map((client) => (
          <Card key={client.id} className="rounded-xl border border-border/80 bg-card shadow-xs transition-colors hover:bg-muted/40">
            <CardContent className="p-4">
              <div className="space-y-1.5">
                <Link
                  href={`/app/clients/${client.id}`}
                  className="text-sm font-semibold text-foreground hover:text-primary transition-colors"
                >
                  {client.name}
                </Link>
                {client.companyName && (
                  <p className="text-xs text-muted-foreground">
                    {client.companyName}
                  </p>
                )}
                <div className="flex items-center gap-2 text-xs text-muted-foreground pt-1">
                  <Badge variant="outline" className="text-[10px] rounded-md border-border/70">
                    {client.projectCount} {t("proyek", "projects")}
                  </Badge>
                  <Badge
                    variant="outline"
                    className={
                      client.status === "active"
                        ? "gap-1 text-[10px] font-medium border-primary/30 bg-primary/10 text-primary rounded-full px-2"
                        : "gap-1 text-[10px] font-medium border-border/80 bg-muted/60 text-muted-foreground rounded-full px-2"
                    }
                  >
                    <span className={`h-1 w-1 rounded-full ${client.status === "active" ? "bg-primary" : "bg-muted-foreground"}`} />
                    {statusLabel(client.status)}
                  </Badge>
                </div>
                {canWrite ? <div className="pt-2"><ClientStatusEditDialog clientId={client.id} clientName={client.name} currentStatus={client.status} /></div> : null}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </>
  );
}
