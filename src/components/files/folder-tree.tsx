"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Folder, FolderOpen, ChevronRight, Files } from "lucide-react";
import { cn } from "@/lib/utils";
import { useT } from "@/lib/i18n-client";
import { FolderRowActions } from "@/components/files/folder-actions";

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

/** Build the querystring for a scope link, preserving client/project context. */
function scopeHref(params: {
  clientId?: string;
  projectId?: string;
  folderId?: string;
}): string {
  const sp = new URLSearchParams();
  if (params.clientId) sp.set("clientId", params.clientId);
  if (params.projectId) sp.set("projectId", params.projectId);
  if (params.folderId) sp.set("folderId", params.folderId);
  const qs = sp.toString();
  return qs ? `/app/files?${qs}` : "/app/files";
}

export function FolderTree({
  clients,
  projects,
  folders,
  canWrite = false,
}: FolderTreeProps) {
  const { t } = useT();
  const sp = useSearchParams();
  const currentClientId = sp.get("clientId") || undefined;
  const currentProjectId = sp.get("projectId") || undefined;
  const currentFolderId = sp.get("folderId") || undefined;

  // Folders in the currently active scope (client/project), rendered as a nested tree.
  const scopedFolders = folders.filter(
    (f) =>
      (currentClientId ? f.clientId === currentClientId : !f.clientId) &&
      (currentProjectId ? f.projectId === currentProjectId : !f.projectId),
  );

  function renderFolderNodes(parentId: string | null, depth: number) {
    const nodes = scopedFolders.filter((f) => f.parentId === parentId);
    if (nodes.length === 0) return null;
    return nodes.map((folder) => (
      <div key={folder.id}>
        <div
          className={cn(
            "group flex items-center rounded-md",
            currentFolderId === folder.id && "bg-muted",
          )}
        >
          <Button
            variant="ghost"
            size="sm"
            className="flex-1 justify-start gap-2 text-sm min-w-0"
            style={{ paddingLeft: `${depth * 12 + 12}px` }}
            asChild
          >
            <Link
              href={scopeHref({
                clientId: currentClientId,
                projectId: currentProjectId,
                folderId: folder.id,
              })}
              prefetch
              scroll={false}
            >
              {currentFolderId === folder.id ? (
                <FolderOpen className="h-3.5 w-3.5 flex-shrink-0 text-primary" />
              ) : (
                <Folder className="h-3.5 w-3.5 flex-shrink-0 opacity-60" />
              )}
              <span className="truncate" title={folder.name}>{folder.name}</span>
            </Link>
          </Button>
          {canWrite && <FolderRowActions folderId={folder.id} currentName={folder.name} />}
        </div>
        {renderFolderNodes(folder.id, depth + 1)}
      </div>
    ));
  }

  return (
    <div className="space-y-1">
      <p className="text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wider">
        {t("Folder", "Folders")}
      </p>

      <Button
        variant="ghost"
        size="sm"
        className={cn(
          "w-full justify-start gap-2 text-sm",
          !currentClientId && !currentProjectId && !currentFolderId && "bg-muted",
        )}
        asChild
      >
        <Link href="/app/files" prefetch scroll={false}>
          <Files className="h-3.5 w-3.5" /> {t("Semua File", "All Files")}
        </Link>
      </Button>

      {!currentClientId && !currentProjectId && renderFolderNodes(null, 0)}

      {clients.map((client) => (
        <div key={client.id} className="space-y-0.5">
          <Button
            variant="ghost"
            size="sm"
            className={cn(
              "w-full justify-start gap-2 text-sm pl-6",
              currentClientId === client.id && !currentProjectId && !currentFolderId && "bg-muted",
            )}
            asChild
          >
            <Link href={scopeHref({ clientId: client.id })} prefetch scroll={false}>
              <ChevronRight className="h-3 w-3 opacity-50" />
              <span className="truncate" title={client.name}>{client.name}</span>
            </Link>
          </Button>

          {currentClientId === client.id && (
            <>
              {!currentProjectId && renderFolderNodes(null, 1)}

              {projects
                .filter((p) => p.clientId === client.id)
                .map((project) => (
                  <div key={project.id}>
                    <Button
                      variant="ghost"
                      size="sm"
                      className={cn(
                        "w-full justify-start gap-2 text-sm pl-10",
                        currentProjectId === project.id && !currentFolderId && "bg-muted",
                      )}
                      asChild
                    >
                      <Link
                        href={scopeHref({ clientId: client.id, projectId: project.id })}
                        prefetch
                        scroll={false}
                      >
                        <Folder className="h-3 w-3 opacity-50" />
                        <span className="truncate" title={project.name}>{project.name}</span>
                      </Link>
                    </Button>
                    {currentProjectId === project.id && renderFolderNodes(null, 3)}
                  </div>
                ))}
            </>
          )}
        </div>
      ))}
    </div>
  );
}
