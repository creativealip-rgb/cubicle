"use client";

import { useMemo, useTransition } from "react";
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
type ProjectOption = { id: string; name: string; clientId: string };

interface ProjectFiltersProps {
  clients: ClientOption[];
  projects: ProjectOption[];
  current: {
    status?: string;
    clientId?: string;
    projectId?: string;
  };
}

function buildHref(opts: {
  status?: string;
  clientId?: string;
  projectId?: string;
}) {
  const params = new URLSearchParams();
  if (opts.status && opts.status !== "all") params.set("status", opts.status);
  if (opts.clientId) params.set("clientId", opts.clientId);
  if (opts.projectId) params.set("projectId", opts.projectId);
  const qs = params.toString();
  return qs ? `/app/projects?${qs}` : "/app/projects";
}

export function ProjectFilters({ clients, projects, current }: ProjectFiltersProps) {
  const { t } = useT();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [pending, startTransition] = useTransition();

  const status = current.status && current.status !== "all" ? current.status : undefined;
  const clientId = current.clientId || undefined;
  const projectId = current.projectId || undefined;

  const projectOptions = useMemo(() => {
    if (!clientId) return projects;
    return projects.filter((p) => p.clientId === clientId);
  }, [clientId, projects]);

  function apply(next: {
    status?: string | null;
    clientId?: string | null;
    projectId?: string | null;
  }) {
    const params = new URLSearchParams(searchParams.toString());

    const setOrDelete = (key: string, value?: string | null) => {
      if (!value || value === "all") params.delete(key);
      else params.set(key, value);
    };

    if ("status" in next) setOrDelete("status", next.status);
    if ("clientId" in next) setOrDelete("clientId", next.clientId);
    if ("projectId" in next) setOrDelete("projectId", next.projectId);

    // If client changes, drop project if it no longer belongs to that client
    if ("clientId" in next) {
      const nextClientId = next.clientId && next.clientId !== "all" ? next.clientId : undefined;
      const selectedProjectId = params.get("projectId");
      if (selectedProjectId) {
        const project = projects.find((p) => p.id === selectedProjectId);
        if (!project || (nextClientId && project.clientId !== nextClientId)) {
          params.delete("projectId");
        }
      }
    }

    startTransition(() => {
      const qs = params.toString();
      router.push(qs ? `/app/projects?${qs}` : "/app/projects");
    });
  }

  const hasExtraFilters = Boolean(clientId || projectId);

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
        value={projectId ?? "all"}
        onValueChange={(v) => apply({ projectId: v })}
      >
        <SelectTrigger className="h-9 w-full text-sm sm:w-52" aria-label={t("Proyek", "Project")}>
          <SelectValue placeholder={t("Semua proyek", "All projects")} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">{t("Semua proyek", "All projects")}</SelectItem>
          {projectOptions.length === 0 ? (
            <SelectItem value="__empty" disabled>
              {t("Tidak ada proyek", "No projects")}
            </SelectItem>
          ) : (
            projectOptions.map((p) => (
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
