export interface FolderScope {
  clientId: string | null;
  projectId: string | null;
}

export function assertFolderScopeMatches(parent: FolderScope, child: FolderScope) {
  if (parent.clientId !== child.clientId || parent.projectId !== child.projectId) {
    throw new Error("Folder induk harus berada dalam lingkup klien dan proyek yang sama");
  }
}

export function getFolderDeleteBlocker(input: {
  hasChildFolder: boolean;
  hasChildFile: boolean;
}): string | null {
  if (input.hasChildFolder) return "Folder masih punya sub-folder. Kosongkan dulu.";
  if (input.hasChildFile) return "Folder masih berisi file. Pindahkan atau hapus dulu.";
  return null;
}

export function addExpandedClient(expanded: ReadonlySet<string>, clientId?: string): Set<string> {
  const next = new Set(expanded);
  if (clientId) next.add(clientId);
  return next;
}

export function toggleExpandedClient(expanded: ReadonlySet<string>, clientId: string): Set<string> {
  const next = new Set(expanded);
  if (next.has(clientId)) next.delete(clientId);
  else next.add(clientId);
  return next;
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
