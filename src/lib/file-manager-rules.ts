export interface FolderScope {
  clientId: string | null;
  projectId: string | null;
}

export function assertFolderScopeMatches(parent: FolderScope, child: FolderScope) {
  if (parent.clientId !== child.clientId || parent.projectId !== child.projectId) {
    throw new Error("Folder induk harus berada dalam lingkup klien dan proyek yang sama");
  }
}

export function formatFileDate(
  value: Date | string,
  lang: "id" | "en",
  timeZone?: string,
): string {
  return new Intl.DateTimeFormat(lang === "en" ? "en-US" : "id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    ...(timeZone ? { timeZone } : {}),
  }).format(new Date(value));
}
