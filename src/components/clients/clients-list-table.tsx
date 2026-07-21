"use client";

import { useMemo } from "react";
import Link from "next/link";
import { MoreHorizontal, Globe, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { SortableHeader } from "@/components/ui/sortable-header";
import { useTableSort } from "@/hooks/use-table-sort";
import { useT } from "@/lib/i18n-client";

export type ClientListItem = {
  id: string;
  clientNumber: string | null;
  name: string;
  companyName: string | null;
  status: string;
  tags: string[] | null;
  portalEnabled: boolean | null;
  projectCount: number;
};

const STATUS_ORDER = ["active", "inactive", "archived"] as const;
type SortKey = "number" | "name" | "company" | "projects" | "portal" | "status";

export function ClientsListTable({
  clients,
  clientCount,
  canWrite,
  isAtLimit,
}: {
  clients: ClientListItem[];
  clientCount: number;
  canWrite: boolean;
  isAtLimit: boolean;
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
      number: (r: ClientListItem) => r.clientNumber ?? "",
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
          {canWrite && !isAtLimit && (
            <Button asChild className="mt-4">
              <Link href="/app/clients/new">
                <Plus className="h-4 w-4 mr-1" />
                {t("Tambah Klien", "Add Client")}
              </Link>
            </Button>
          )}
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
      <div className="hidden md:block rounded-lg border bg-card">
        <div className="grid grid-cols-8 gap-4 p-3 text-xs font-medium text-muted-foreground border-b">
          <div>
            <SortableHeader
              as="div"
              label={t("No.", "No.")}
              dir={dirFor("number")}
              onClick={() => toggle("number")}
              className="text-xs"
            />
          </div>
          <div className="col-span-2">
            <SortableHeader
              as="div"
              label={t("Klien", "Client")}
              dir={dirFor("name")}
              onClick={() => toggle("name")}
              className="text-xs"
            />
          </div>
          <div>
            <SortableHeader
              as="div"
              label={t("Perusahaan", "Company")}
              dir={dirFor("company")}
              onClick={() => toggle("company")}
              className="text-xs"
            />
          </div>
          <div>
            <SortableHeader
              as="div"
              label={t("Proyek", "Projects")}
              dir={dirFor("projects")}
              onClick={() => toggle("projects")}
              className="text-xs"
            />
          </div>
          <div>
            <SortableHeader
              as="div"
              label={t("Portal", "Portal")}
              dir={dirFor("portal")}
              onClick={() => toggle("portal")}
              className="text-xs"
            />
          </div>
          <div>
            <SortableHeader
              as="div"
              label={t("Status", "Status")}
              dir={dirFor("status")}
              onClick={() => toggle("status")}
              className="text-xs"
            />
          </div>
          <div className="text-right">{t("Aksi", "Actions")}</div>
        </div>
        {clients.length === 0 && emptyDesktop}
        {sorted.map((client) => (
          <div
            key={client.id}
            className="grid grid-cols-8 gap-4 p-3 items-center border-b last:border-0 hover:bg-muted/50 transition-colors"
          >
            <div className="text-xs font-mono text-muted-foreground">
              {client.clientNumber || "—"}
            </div>
            <div className="col-span-2">
              <Link
                href={`/app/clients/${client.id}`}
                className="font-medium hover:underline"
              >
                {client.name}
              </Link>
              {client.tags && client.tags.length > 0 && (
                <div className="flex gap-1 mt-1 flex-wrap">
                  {client.tags.slice(0, 3).map((tag) => (
                    <Badge
                      key={tag}
                      variant="outline"
                      className="text-[10px] px-1.5 py-0"
                    >
                      {tag}
                    </Badge>
                  ))}
                </div>
              )}
            </div>
            <div className="text-sm text-muted-foreground truncate">
              {client.companyName || "—"}
            </div>
            <div className="text-sm">{client.projectCount}</div>
            <div>
              {client.portalEnabled ? (
                <Badge
                  variant="outline"
                  className="gap-1 text-xs border-green-200 text-green-700"
                >
                  <Globe className="h-3 w-3" /> {t("Nyala", "On")}
                </Badge>
              ) : (
                <span className="text-xs text-muted-foreground">—</span>
              )}
            </div>
            <div>
              <Badge
                variant={client.status === "active" ? "default" : "secondary"}
                className="text-xs"
              >
                {statusLabel(client.status)}
              </Badge>
            </div>
            <div className="text-right">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8">
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem asChild>
                    <Link href={`/app/clients/${client.id}`}>
                      {t("Lihat Detail", "View Details")}
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link href={`/app/projects?clientId=${client.id}`}>
                      {t("Lihat Proyek", "View Projects")}
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <a
                      href={`/api/clients/${client.id}/export/pdf`}
                      target="_blank"
                      rel="noreferrer"
                    >
                      {t("Unduh PDF", "Download PDF")}
                    </a>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <a href={`/api/clients/${client.id}/export/xlsx`} rel="noreferrer">
                      {t("Unduh Excel", "Download Excel")}
                    </a>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
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
                {canWrite && !isAtLimit && (
                  <Button asChild className="mt-4">
                    <Link href="/app/clients/new">
                      <Plus className="h-4 w-4 mr-1" />
                      {t("Tambah Klien", "Add Client")}
                    </Link>
                  </Button>
                )}
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
          <Card key={client.id}>
            <CardContent className="p-4">
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  {client.clientNumber && (
                    <p className="text-[11px] font-mono text-muted-foreground">
                      {client.clientNumber}
                    </p>
                  )}
                  <Link
                    href={`/app/clients/${client.id}`}
                    className="font-medium hover:underline"
                  >
                    {client.name}
                  </Link>
                  {client.companyName && (
                    <p className="text-sm text-muted-foreground">
                      {client.companyName}
                    </p>
                  )}
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Badge variant="outline" className="text-[10px]">
                      {client.projectCount} {t("proyek", "projects")}
                    </Badge>
                    <Badge
                      variant={
                        client.status === "active" ? "default" : "secondary"
                      }
                      className="text-[10px]"
                    >
                      {statusLabel(client.status)}
                    </Badge>
                  </div>
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem asChild>
                      <Link href={`/app/clients/${client.id}`}>
                        {t("Lihat Detail", "View Details")}
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <a
                        href={`/api/clients/${client.id}/export/pdf`}
                        target="_blank"
                        rel="noreferrer"
                      >
                        {t("Unduh PDF", "Download PDF")}
                      </a>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <a href={`/api/clients/${client.id}/export/xlsx`} rel="noreferrer">
                        {t("Unduh Excel", "Download Excel")}
                      </a>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </>
  );
}
