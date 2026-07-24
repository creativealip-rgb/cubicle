"use client";

import { useSearchParams } from "next/navigation";
import { NewFolderButton } from "@/components/files/folder-actions";
import { UploadButton } from "@/components/files/upload-button";
import { PageHeader, PageHeaderDescription, PageHeaderTitle } from "@/components/ui/page-header";

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
    <PageHeader
      actions={canWrite ? (
        <div className="grid grid-cols-2 gap-2 sm:flex sm:items-center">
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
      ) : undefined}
    >
      <PageHeaderTitle>{title}</PageHeaderTitle>
      <PageHeaderDescription>{subtitle}</PageHeaderDescription>
    </PageHeader>
  );
}
