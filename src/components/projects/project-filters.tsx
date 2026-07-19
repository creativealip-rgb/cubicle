"use client";

import { useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { useT } from "@/lib/i18n-client";
import Link from "next/link";

type ClientOption = { id: string; name: string };
type PackageOption = { id: string; name: string };

interface ProjectFiltersProps {
  clients: ClientOption[];
  packages: PackageOption[];
  current: {
    status?: string;
    clientId?: string;
    packageId?: string;
  };
}

function buildHref(opts: {
  status?: string;
  clientId?: string;
  packageId?: string;
}) {
  const params = new URLSearchParams();
  if (opts.status && opts.status !== "all") params.set("status", opts.status);
  if (opts.clientId) params.set("clientId", opts.clientId);
  if (opts.packageId) params.set("packageId", opts.packageId);
  const qs = params.toString();
  return qs ? `/app/projects?${qs}` : "/app/projects";
}

export function ProjectFilters({ clients, packages, current }: ProjectFiltersProps) {
  const { t } = useT();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [pending, startTransition] = useTransition();

  const status = current.status && current.status !== "all" ? current.status : undefined;
  const clientId = current.clientId || undefined;
  const packageId = current.packageId || undefined;

  function apply(next: {
    status?: string | null;
    clientId?: string | null;
    packageId?: string | null;
  }) {
    const params = new URLSearchParams(searchParams.toString());

    const setOrDelete = (key: string, value?: string | null) => {
      if (!value || value === "all") params.delete(key);
      else params.set(key, value);
    };

    if ("status" in next) setOrDelete("status", next.status);
    if ("clientId" in next) setOrDelete("clientId", next.clientId);
    if ("packageId" in next) setOrDelete("packageId", next.packageId);

    startTransition(() => {
      const qs = params.toString();
      router.push(qs ? `/app/projects?${qs}` : "/app/projects");
    });
  }

  const hasExtraFilters = Boolean(clientId || packageId);

  return (
    <div className="flex w-full flex-col gap-2 sm:flex-row sm:items-center lg:w-auto">
      <Select
        value={clientId ?? "all"}
        onValueChange={(v) => apply({ clientId: v })}
      >
        <SelectTrigger className="h-9 w-full text-sm sm:w-44" aria-label={t("Klien", "Client")}>
          <SelectValue placeholder={t("Semua klien", "All clients")} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">{t("Semua klien", "All clients")}</SelectItem>
          {clients.map((c) => (
            <SelectItem key={c.id} value={c.id}>
              {c.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select
        value={packageId ?? "all"}
        onValueChange={(v) => apply({ packageId: v })}
      >
        <SelectTrigger className="h-9 w-full text-sm sm:w-52" aria-label={t("Paket", "Package")}>
          <SelectValue placeholder={t("Semua paket", "All packages")} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">{t("Semua paket", "All packages")}</SelectItem>
          {packages.length === 0 ? (
            <SelectItem value="__empty" disabled>
              {t("Tidak ada paket", "No packages")}
            </SelectItem>
          ) : (
            packages.map((p) => (
              <SelectItem key={p.id} value={p.id}>
                {p.name}
              </SelectItem>
            ))
          )}
        </SelectContent>
      </Select>

      <div className="flex items-center gap-2">
        {hasExtraFilters && (
          <Link href={buildHref({ status })}>
            <Button type="button" variant="ghost" size="sm">
              {t("Reset", "Reset")}
            </Button>
          </Link>
        )}
        {pending && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
      </div>
    </div>
  );
}
