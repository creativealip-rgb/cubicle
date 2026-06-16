"use client";

import { Button } from "@/components/ui/button";
import { Folder, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface FolderItem {
  id: string;
  name: string;
  type: "client" | "project" | "folder";
  parentId?: string | null;
}

interface FolderTreeProps {
  currentClientId?: string;
  currentProjectId?: string;
  currentFolderId?: string;
  clients: { id: string; name: string }[];
  projects: { id: string; name: string }[];
  folders: FolderItem[];
}

export function FolderTree({
  currentClientId,
  currentProjectId,
  // eslint-disable-next-line unused-imports/no-unused-vars
  currentFolderId,
  clients,
  projects,
  // eslint-disable-next-line unused-imports/no-unused-vars
  folders,
}: FolderTreeProps) {
  return (
    <div className="space-y-1">
      <p className="text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wider">
        Folders
      </p>
      {/* All Files */}
      <Button
        variant="ghost"
        size="sm"
        className={cn(
          "w-full justify-start gap-2 text-sm",
          !currentClientId && !currentProjectId && "bg-muted"
        )}
        asChild
      >
        <a href="/app/files">
          <Folder className="h-3.5 w-3.5" /> All Files
        </a>
      </Button>

      {/* Clients */}
      {clients.map((client) => (
        <div key={client.id} className="space-y-0.5">
          <Button
            variant="ghost"
            size="sm"
            className={cn(
              "w-full justify-start gap-2 text-sm pl-6",
              currentClientId === client.id && !currentProjectId && "bg-muted"
            )}
            asChild
          >
            <a href={`/app/files?clientId=${client.id}`}>
              <ChevronRight className="h-3 w-3 opacity-50" />
              {client.name}
            </a>
          </Button>
          {/* Projects under client */}
          {currentClientId === client.id &&
            projects
              .filter((_p) => {
                // All projects shown when under that client
                return true;
              })
              .map((project) => (
                <Button
                  key={project.id}
                  variant="ghost"
                  size="sm"
                  className={cn(
                    "w-full justify-start gap-2 text-sm pl-10",
                    currentProjectId === project.id && "bg-muted"
                  )}
                  asChild
                >
                  <a href={`/app/files?clientId=${client.id}&projectId=${project.id}`}>
                    <Folder className="h-3 w-3 opacity-50" />
                    {project.name}
                  </a>
                </Button>
              ))}
        </div>
      ))}
    </div>
  );
}
