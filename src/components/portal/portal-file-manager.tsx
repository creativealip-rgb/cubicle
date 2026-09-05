"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { useAppTransition } from "@/lib/transition-provider";
import {
  ChevronRight,
  Download,
  File,
  FileText,
  Folder,
  FolderOpen,
  Home,
  Image as ImageIcon,
  Loader2,
  Upload,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { useT } from "@/lib/i18n-client";
import { quotaBlockMessage } from "@/lib/upload-quota-messages";
import { portalLocale, portalStatusLabel } from "@/lib/portal-i18n";

export type PortalFmProject = {
  id: string;
  name: string;
  status: string;
};

export type PortalFmFolder = {
  id: string;
  name: string;
  parentId: string | null;
  projectId: string | null;
  clientId: string | null;
};

export type PortalFmFile = {
  id: string;
  name: string;
  mimeType: string | null;
  sizeBytes: number | null;
  fileType?: string;
  createdAt: string;
  projectId: string | null;
  folderId: string | null;
};

type PortalFileManagerProps = {
  token: string;
  projects: PortalFmProject[];
  folders: PortalFmFolder[];
  files: PortalFmFile[];
  initialProjectId?: string | null;
  initialFolderId?: string | null;
};

function formatSize(bytes: number | null): string {
  if (!bytes) return "-";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function fileIcon(mimeType: string | null) {
  if (!mimeType) return <File className="h-5 w-5 text-muted-foreground" />;
  if (mimeType.startsWith("image/")) {
    return <ImageIcon className="h-5 w-5 text-blue-500" aria-hidden="true" />;
  }
  return <FileText className="h-5 w-5 text-orange-500" />;
}

export function PortalFileManager({
  token,
  projects,
  folders,
  files: initialFiles,
  initialProjectId,
  initialFolderId,
}: PortalFileManagerProps) {
  const { refresh } = useAppTransition();
  const { lang, t } = useT();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const inputRef = useRef<HTMLInputElement>(null);

  const [files, setFiles] = useState<PortalFmFile[]>(initialFiles);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);

  // Local scope so folder switches don't hard-remount the portal page.
  const [projectId, setProjectId] = useState<string | null>(
    () => searchParams.get("projectId") ?? initialProjectId ?? null,
  );
  const [folderId, setFolderId] = useState<string | null>(
    () => searchParams.get("folderId") ?? initialFolderId ?? null,
  );

  useEffect(() => {
    setFiles(initialFiles);
  }, [initialFiles]);

  // Sync if parent URL changes via real Next navigation (rare).
  useEffect(() => {
    const nextProject =
      searchParams.get("projectId") ?? initialProjectId ?? null;
    const nextFolder = searchParams.get("folderId") ?? initialFolderId ?? null;
    setProjectId(nextProject);
    setFolderId(nextFolder);
  }, [searchParams, initialProjectId, initialFolderId]);

  const navigate = useCallback(
    (next: { projectId?: string | null; folderId?: string | null }) => {
      const nextProject =
        next.projectId === undefined ? projectId : next.projectId;
      const nextFolder = next.folderId === undefined ? folderId : next.folderId;
      setProjectId(nextProject);
      setFolderId(nextFolder);

      const params = new URLSearchParams(searchParams.toString());
      params.set("tab", "files");
      if (nextProject) params.set("projectId", nextProject);
      else params.delete("projectId");
      if (nextFolder) params.set("folderId", nextFolder);
      else params.delete("folderId");
      const qs = params.toString();
      // Soft URL — keep portal shell mounted.
      window.history.replaceState(
        window.history.state,
        "",
        qs ? `${pathname}?${qs}` : pathname,
      );
    },
    [folderId, pathname, projectId, searchParams],
  );

  const activeProject = projectId
    ? (projects.find((p) => p.id === projectId) ?? null)
    : null;

  const folderChain = useMemo(() => {
    if (!folderId) return [] as PortalFmFolder[];
    const chain: PortalFmFolder[] = [];
    let cursor = folders.find((f) => f.id === folderId);
    let guard = 0;
    while (cursor && guard < 30) {
      chain.unshift(cursor);
      cursor = cursor.parentId
        ? folders.find((f) => f.id === cursor!.parentId)
        : undefined;
      guard += 1;
    }
    return chain;
  }, [folderId, folders]);

  const rootProjectCards = useMemo(() => {
    return projects.map((project) => {
      const nestedFiles = files.filter((f) => f.projectId === project.id);
      const nestedFolders = folders.filter((f) => f.projectId === project.id);
      return {
        project,
        folderCount: nestedFolders.length,
        fileCount: nestedFiles.length,
      };
    });
  }, [projects, folders, files]);

  const clientRootFolders = useMemo(
    () => folders.filter((f) => !f.projectId && !f.parentId),
    [folders],
  );

  const clientRootFiles = useMemo(
    () => files.filter((f) => !f.projectId && !f.folderId),
    [files],
  );

  const currentFolders = useMemo(() => {
    if (!projectId && !folderId) return clientRootFolders;
    return folders.filter((f) => {
      if (folderId) return f.parentId === folderId;
      return f.projectId === projectId && !f.parentId;
    });
  }, [clientRootFolders, folderId, folders, projectId]);

  const currentFiles = useMemo(() => {
    if (!projectId && !folderId) return clientRootFiles;
    return files.filter((f) => {
      if (folderId) return f.folderId === folderId;
      return f.projectId === projectId && !f.folderId;
    });
  }, [clientRootFiles, files, folderId, projectId]);

  const totalFiles = files.length;
  const showRootProjects = !projectId && !folderId;
  // Upload allowed at root (client-level), project root, or inside folder.
  const canUpload = true;

  async function uploadOne(file: File) {
    const form = new FormData();
    form.append("token", token);
    form.append("file", file);
    if (projectId) form.append("projectId", projectId);
    if (folderId) form.append("folderId", folderId);

    const res = await fetch("/api/client-portal/files/upload", {
      method: "POST",
      body: form,
    });
    const data = (await res.json().catch(() => ({}))) as {
      ok?: boolean;
      error?: string;
      file?: PortalFmFile;
    };
    if (!res.ok || !data.file) {
      const error = data.error || t("Upload gagal", "Upload failed");
      throw new Error(quotaBlockMessage(error, lang) ?? error);
    }
    return data.file;
  }

  async function handleFiles(fileList: FileList | File[]) {
    const list = Array.from(fileList);
    if (list.length === 0) return;
    setUploading(true);
    setUploadError(null);
    try {
      const uploaded: PortalFmFile[] = [];
      for (const file of list) {
        uploaded.push(await uploadOne(file));
      }
      setFiles((prev) => {
        const map = new Map(prev.map((f) => [f.id, f]));
        for (const f of uploaded) map.set(f.id, f);
        return [...map.values()];
      });
      refresh();
    } catch (err) {
      setUploadError(
        err instanceof Error ? err.message : t("Upload gagal", "Upload failed"),
      );
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg border border-primary/20 bg-primary/10 text-primary">
            <FolderOpen className="h-3.5 w-3.5" />
          </div>
          <div>
            <h2 className="text-base sm:text-lg font-bold text-foreground leading-tight">{t("File & Dokumen", "Files & Documents")}</h2>
            <p className="text-xs text-muted-foreground">
              {t(
                "Kelola dan unduh file proyek yang dibagikan. Total",
                "Manage and download shared project files. Total",
              )}{" "}
              {totalFiles} file.
            </p>
          </div>
        </div>
        {canUpload && (
          <div className="flex items-center gap-2">
            <input
              ref={inputRef}
              type="file"
              multiple
              className="hidden"
              onChange={(e) => {
                if (e.target.files) void handleFiles(e.target.files);
              }}
            />
            <Button
              type="button"
              size="sm"
              disabled={uploading}
              onClick={() => inputRef.current?.click()}
              className="h-8.5 gap-1.5 rounded-xl px-3 text-xs font-semibold shadow-xs"
            >
              {uploading ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Upload className="h-3.5 w-3.5" />
              )}
              {uploading
                ? t("Mengunggah…", "Uploading…")
                : t("Unggah file", "Upload file")}
            </Button>
          </div>
        )}
      </div>

      {/* Breadcrumb Navigation Pill */}
      <nav className="flex flex-wrap items-center gap-1.5 rounded-xl border border-border/80 bg-muted/20 px-3 py-1.5 text-xs text-muted-foreground">
        <button
          type="button"
          onClick={() => navigate({ projectId: null, folderId: null })}
          className={cn(
            "inline-flex items-center gap-1.5 rounded-lg px-2 py-1 font-medium transition-colors hover:bg-muted hover:text-foreground",
            !projectId && !folderId && "bg-background text-foreground shadow-2xs font-semibold",
          )}
        >
          <Home className="h-3.5 w-3.5" />
          {t("Semua", "All")}
        </button>
        {activeProject && (
          <>
            <ChevronRight className="h-3 w-3 opacity-40" />
            <button
              type="button"
              onClick={() =>
                navigate({ projectId: activeProject.id, folderId: null })
              }
              className={cn(
                "rounded-lg px-2 py-1 font-medium transition-colors hover:bg-muted hover:text-foreground",
                !folderId && "bg-background text-foreground shadow-2xs font-semibold",
              )}
            >
              {activeProject.name}
            </button>
          </>
        )}
        {folderChain.map((node, idx) => (
          <span key={node.id} className="inline-flex items-center gap-1.5">
            <ChevronRight className="h-3 w-3 opacity-40" />
            <button
              type="button"
              onClick={() =>
                navigate({
                  projectId: node.projectId ?? projectId,
                  folderId: node.id,
                })
              }
              className={cn(
                "rounded-lg px-2 py-1 font-medium transition-colors hover:bg-muted hover:text-foreground",
                idx === folderChain.length - 1 && "bg-background text-foreground shadow-2xs font-semibold",
              )}
            >
              {node.name}
            </button>
          </span>
        ))}
      </nav>

      {uploadError && (
        <p className="rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
          {uploadError}
        </p>
      )}

      <Card
        className={cn(
          "shadow-none transition-colors",
          dragOver && "border-primary ring-2 ring-primary/20",
        )}
        onDragEnter={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={(e) => {
          e.preventDefault();
          if (e.currentTarget === e.target) setDragOver(false);
        }}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          if (e.dataTransfer.files?.length) {
            void handleFiles(e.dataTransfer.files);
          }
        }}
      >
        <CardContent className="p-0">
          {dragOver && (
            <div className="border-b border-dashed border-primary/40 bg-primary/5 px-4 py-6 text-center text-sm text-primary">
              {t("Lepaskan file untuk mengunggah", "Drop files to upload")}
            </div>
          )}

          {/* Root project grid */}
          {showRootProjects && (
            <div className="divide-y">
              {rootProjectCards.length === 0 &&
                clientRootFolders.length === 0 &&
                clientRootFiles.length === 0 && (
                  <div className="px-4 py-12 text-center text-muted-foreground">
                    <FolderOpen className="mx-auto mb-3 h-12 w-12 opacity-30" />
                    <p>
                      {t(
                        "Belum ada folder atau file yang dibagikan.",
                        "No folders or files have been shared yet.",
                      )}
                    </p>
                    <p className="mt-1 text-xs">
                      {t(
                        "Unggah file di sini atau buka folder proyek.",
                        "Upload files here or open a project folder.",
                      )}
                    </p>
                  </div>
                )}

              {rootProjectCards.map(({ project, folderCount, fileCount }) => (
                <button
                  key={project.id}
                  type="button"
                  onClick={() =>
                    navigate({ projectId: project.id, folderId: null })
                  }
                  className="flex w-full items-center gap-3 px-3.5 py-3 text-left transition-colors hover:bg-muted/40 group"
                >
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-primary/20 bg-primary/10 text-primary">
                    <Folder className="h-4.5 w-4.5 fill-primary/20 text-primary" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="truncate text-sm font-bold text-foreground group-hover:text-primary transition-colors">
                        {project.name}
                      </span>
                      <Badge
                        variant="outline"
                        className="text-[10px] font-bold h-5 px-2 rounded-full border border-blue-500/30 bg-blue-500/10 text-blue-700 dark:text-blue-400 capitalize"
                      >
                        <span className="mr-1 h-1.5 w-1.5 rounded-full bg-blue-600" />
                        {project.status === "active"
                          ? portalStatusLabel("active", lang)
                          : project.status === "completed"
                            ? portalStatusLabel("completed", lang)
                            : project.status}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {folderCount} folder · {fileCount} file
                    </p>
                  </div>
                  <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-foreground transition-colors" />
                </button>
              ))}

              {clientRootFolders.map((folder) => (
                <button
                  key={folder.id}
                  type="button"
                  onClick={() =>
                    navigate({ projectId: null, folderId: folder.id })
                  }
                  className="flex w-full items-center gap-3 px-3.5 py-3 text-left transition-colors hover:bg-muted/40 group"
                >
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-amber-500/20 bg-amber-500/10 text-amber-600 dark:text-amber-400">
                    <Folder className="h-4.5 w-4.5 fill-amber-500/20" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-bold text-foreground group-hover:text-amber-600 transition-colors">
                      {folder.name}
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">{t("Folder", "Folder")}</p>
                  </div>
                  <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-foreground transition-colors" />
                </button>
              ))}

              {clientRootFiles.map((file) => (
                <FileRow key={file.id} file={file} token={token} />
              ))}
            </div>
          )}

          {/* Inside project / folder */}
          {!showRootProjects && (
            <div className="divide-y">
              {currentFolders.length === 0 && currentFiles.length === 0 && (
                <div className="px-4 py-12 text-center text-muted-foreground">
                  <FolderOpen className="mx-auto mb-3 h-12 w-12 opacity-30" />
                  <p>
                    {t("Folder ini masih kosong.", "This folder is empty.")}
                  </p>
                  <p className="mt-1 text-xs">
                    {t(
                      "Lepaskan atau unggah file untuk dibagikan.",
                      "Drop or upload files to share them.",
                    )}
                  </p>
                </div>
              )}

              {currentFolders.map((folder) => (
                <button
                  key={folder.id}
                  type="button"
                  onClick={() =>
                    navigate({
                      projectId: folder.projectId ?? projectId,
                      folderId: folder.id,
                    })
                  }
                  className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-muted/50"
                >
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-50 text-amber-600 dark:bg-amber-950/40">
                    <Folder className="h-5 w-5 fill-amber-100 dark:fill-amber-900" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="break-words text-sm font-medium">
                      {folder.name}
                    </p>
                    <p className="text-xs text-muted-foreground">{t("Folder", "Folder")}</p>
                  </div>
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                </button>
              ))}

              {currentFiles.map((file) => (
                <FileRow key={file.id} file={file} token={token} />
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function FileRow({ file, token }: { file: PortalFmFile; token: string }) {
  const { lang, t } = useT();
  return (
    <div className="flex items-center gap-3 px-4 py-3">
      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted">
        {fileIcon(file.mimeType)}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <p className="break-words text-sm font-medium">{file.name}</p>
          {file.fileType === "deliverable" && (
            <Badge className="text-[10px]">
              {t("Hasil kerja", "Deliverable")}
            </Badge>
          )}
        </div>
        <p className="text-xs text-muted-foreground">
          {formatSize(file.sizeBytes)} ·{" "}
          {new Date(file.createdAt).toLocaleDateString(portalLocale(lang))}
        </p>
      </div>
      <a
        href={`/api/files/${file.id}/download?token=${encodeURIComponent(token)}`}
        target="_blank"
        rel="noopener noreferrer"
        aria-label={`${t("Unduh", "Download")} ${file.name}`}
        title={`${t("Unduh", "Download")} ${file.name}`}
        className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-md hover:bg-muted"
      >
        <Download className="h-4 w-4" aria-hidden="true" />
      </a>
    </div>
  );
}
