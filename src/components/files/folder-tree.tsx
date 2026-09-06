"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ChevronRight, Folder, FolderOpen, Users } from "lucide-react";
import { cn } from "@/lib/utils";
import { useT } from "@/lib/i18n-client";
import { FolderRowActions } from "@/components/files/folder-actions";
import { toggleExpandedClient } from "@/lib/file-manager-rules";

interface FolderItem {
  id: string;
  name: string;
  parentId: string | null;
  clientId: string | null;
  projectId: string | null;
}

interface FolderTreeProps {
  clients: { id: string; name: string }[];
  projects: { id: string; name: string; clientId: string | null }[];
  folders: FolderItem[];
  canWrite?: boolean;
}

function scopeHref(params: { clientId?: string; projectId?: string; folderId?: string }): string {
  const sp = new URLSearchParams();
  if (params.clientId) sp.set("clientId", params.clientId);
  if (params.projectId) sp.set("projectId", params.projectId);
  if (params.folderId) sp.set("folderId", params.folderId);
  const qs = sp.toString();
  return qs ? `/app/files?${qs}` : "/app/files";
}

export function FolderTree({ clients, projects, folders, canWrite = false }: FolderTreeProps) {
  const { t } = useT();
  const sp = useSearchParams();
  const currentClientId = sp.get("clientId") || undefined;
  const currentProjectId = sp.get("projectId") || undefined;
  const currentFolderId = sp.get("folderId") || undefined;

  const [workspaceExpanded, setWorkspaceExpanded] = useState(false);
  const [clientsExpanded, setClientsExpanded] = useState(false);
  const [expandedClients, setExpandedClients] = useState<Set<string>>(() => new Set());
  const [expandedProjects, setExpandedProjects] = useState<Set<string>>(() => new Set());
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(() => new Set());

  function renderFolderNodes(
    scopeFolders: FolderItem[],
    parentId: string | null,
    depth: number,
    scope: { clientId?: string; projectId?: string },
  ) {
    const nodes = scopeFolders.filter((folder) => folder.parentId === parentId);
    if (nodes.length === 0) return null;

    return nodes.map((folder) => {
      const hasChildren = scopeFolders.some((candidate) => candidate.parentId === folder.id);
      const expanded = expandedFolders.has(folder.id);
      const active = currentFolderId === folder.id;

      return (
        <div key={folder.id}>
          <div className={cn("group flex items-center rounded-md", active && "bg-muted/70")}>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-9 w-8 shrink-0"
              style={{ marginLeft: `${depth * 12}px` }}
              aria-label={expanded ? t("Tutup folder", "Collapse folder") : t("Buka folder", "Expand folder")}
              aria-expanded={expanded}
              disabled={!hasChildren}
              onClick={() => setExpandedFolders((current) => toggleExpandedClient(current, folder.id))}
            >
              <ChevronRight
                className={cn(
                  "h-3.5 w-3.5 text-muted-foreground transition-transform duration-200",
                  expanded && "rotate-90",
                  !hasChildren && "opacity-0",
                )}
              />
            </Button>
            <Button variant="ghost" size="sm" className="min-w-0 flex-1 justify-start gap-2.5 px-2 text-sm rounded-xl font-medium" asChild>
              <Link href={scopeHref({ ...scope, folderId: folder.id })} prefetch scroll={false}>
                {active ? (
                  <FolderOpen className="h-4 w-4 shrink-0 text-primary" />
                ) : (
                  <Folder className="h-4 w-4 shrink-0 text-amber-500" />
                )}
                <span className={cn("truncate", active ? "font-semibold text-primary" : "text-foreground")} title={folder.name}>{folder.name}</span>
              </Link>
            </Button>
            {canWrite && <FolderRowActions folderId={folder.id} currentName={folder.name} />}
          </div>
          {expanded && renderFolderNodes(scopeFolders, folder.id, depth + 1, scope)}
        </div>
      );
    });
  }

  const workspaceFolders = folders.filter((folder) => !folder.clientId && !folder.projectId);

  return (
    <nav className="space-y-3" aria-label={t("Direktori berkas", "File directory")}>
      {/* 1. Workspace Section (Accordion Dropdown) */}
      <section className="space-y-1">
        <button
          type="button"
          onClick={() => setWorkspaceExpanded((v) => !v)}
          className="flex w-full items-center justify-between px-2 py-1.5 text-[11px] font-bold uppercase tracking-wider text-muted-foreground hover:text-foreground rounded-lg hover:bg-muted/40 transition-colors"
        >
          <span className="flex items-center gap-1.5">
            <Folder className="h-3.5 w-3.5 text-amber-500" />
            {t("Workspace", "Workspace")} ({workspaceFolders.length})
          </span>
          <ChevronRight className={cn("h-3.5 w-3.5 transition-transform duration-200", workspaceExpanded && "rotate-90")} />
        </button>
        {workspaceExpanded && (
          <div className="pl-1 space-y-0.5 animate-in fade-in-50 duration-150">
            {renderFolderNodes(workspaceFolders, null, 0, {}) ?? (
              <p className="px-3 py-1 text-xs text-muted-foreground">{t("Belum ada folder", "No folders yet")}</p>
            )}
          </div>
        )}
      </section>

      {/* 2. Clients Section (Accordion Dropdown) */}
      <section className="space-y-1">
        <button
          type="button"
          onClick={() => setClientsExpanded((v) => !v)}
          className="flex w-full items-center justify-between px-2 py-1.5 text-[11px] font-bold uppercase tracking-wider text-muted-foreground hover:text-foreground rounded-lg hover:bg-muted/40 transition-colors"
        >
          <span className="flex items-center gap-1.5">
            <Users className="h-3.5 w-3.5 text-blue-500" />
            {t("Klien", "Clients")} ({clients.length})
          </span>
          <ChevronRight className={cn("h-3.5 w-3.5 transition-transform duration-200", clientsExpanded && "rotate-90")} />
        </button>
        {clientsExpanded && (
          <div className="pl-1 space-y-0.5 animate-in fade-in-50 duration-150">
            {clients.map((client) => {
              const expanded = expandedClients.has(client.id);
              const clientFolders = folders.filter((folder) => folder.clientId === client.id && !folder.projectId);

              return (
                <div key={client.id} className="space-y-0.5">
                  <div className="flex items-center rounded-md">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-9 w-8 shrink-0"
                      aria-label={expanded ? t("Tutup klien", "Collapse client") : t("Buka klien", "Expand client")}
                      aria-expanded={expanded}
                      onClick={() => setExpandedClients((current) => toggleExpandedClient(current, client.id))}
                    >
                      <ChevronRight className={cn("h-3.5 w-3.5 transition-transform duration-200", expanded && "rotate-90")} />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className={cn(
                        "min-w-0 flex-1 justify-start px-1 text-sm rounded-xl font-medium",
                        currentClientId === client.id && !currentProjectId && !currentFolderId && "bg-muted/70 font-semibold text-primary",
                      )}
                      asChild
                    >
                      <Link href={scopeHref({ clientId: client.id })} prefetch scroll={false}>
                        <span className="truncate" title={client.name}>{client.name}</span>
                      </Link>
                    </Button>
                  </div>

                  {expanded && (
                    <div>
                      {renderFolderNodes(clientFolders, null, 1, { clientId: client.id })}
                      {projects.filter((project) => project.clientId === client.id).map((project) => {
                        const projectExpanded = expandedProjects.has(project.id);
                        const projectFolders = folders.filter((folder) => folder.projectId === project.id);

                        return (
                          <div key={project.id}>
                            <div className="flex items-center rounded-md pl-3">
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="h-9 w-8 shrink-0"
                                aria-label={projectExpanded ? t("Tutup proyek", "Collapse project") : t("Buka proyek", "Expand project")}
                                aria-expanded={projectExpanded}
                                onClick={() => setExpandedProjects((current) => toggleExpandedClient(current, project.id))}
                              >
                                <ChevronRight className={cn("h-3.5 w-3.5 transition-transform duration-200", projectExpanded && "rotate-90")} />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                className={cn(
                                  "min-w-0 flex-1 justify-start gap-2 px-1 text-sm rounded-xl font-medium",
                                  currentProjectId === project.id && !currentFolderId && "bg-muted/70 font-semibold text-primary",
                                )}
                                asChild
                              >
                                <Link href={scopeHref({ clientId: client.id, projectId: project.id })} prefetch scroll={false}>
                                  <Folder className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                                  <span className="truncate" title={project.name}>{project.name}</span>
                                </Link>
                              </Button>
                            </div>
                            {projectExpanded && renderFolderNodes(projectFolders, null, 2, { clientId: client.id, projectId: project.id })}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </section>
    </nav>
  );
}
