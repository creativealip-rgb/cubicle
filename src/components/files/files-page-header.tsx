"use client";

import { useSearchParams } from "next/navigation";
import { NewFolderButton } from "@/components/files/folder-actions";
import { UploadButton } from "@/components/files/upload-button";

export function FilesPageHeader({
  workspaceId,
  canWrite,
  title,
  subtitle,
}: {
  workspaceId: string;
  canWrite: boolean;
  title: string;
  subtitle: string;
}) {
  const sp = useSearchParams();
  const clientId = sp.get("clientId") || undefined;
  const projectId = sp.get("projectId") || undefined;
  const folderId = sp.get("folderId") || undefined;

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
        <p className="text-sm text-muted-foreground mt-1">{subtitle}</p>
      </div>
      {canWrite && (
        <div className="flex items-center gap-2">
          <NewFolderButton
            workspaceId={workspaceId}
            clientId={clientId}
            projectId={projectId}
            parentId={folderId}
          />
          <UploadButton
            workspaceId={workspaceId}
            clientId={clientId}
            projectId={projectId}
            folderId={folderId}
          />
        </div>
      )}
    </div>
  );
}
