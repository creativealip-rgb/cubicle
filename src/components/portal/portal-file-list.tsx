import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { FileText, Download, File, Image } from "lucide-react";

interface PortalFile {
  id: string;
  name: string;
  mimeType: string | null;
  sizeBytes: number | null;
  fileType?: string;
  createdAt: string;
}

export function PortalFileList({
  files,
  token,
}: {
  files: PortalFile[];
  token?: string;
}) {
  function getFileIcon(mimeType: string | null) {
    if (!mimeType) return <File className="h-4 w-4 text-muted-foreground" />;
    if (mimeType.startsWith("image/"))
      // eslint-disable-next-line jsx-a11y/alt-text -- decorative icon, aria-hidden suffices
      return <Image className="h-4 w-4 text-blue-500" aria-hidden="true" />;
    return <FileText className="h-4 w-4 text-orange-500" />;
  }

  function formatSize(bytes: number | null): string {
    if (!bytes) return "-";
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  return (
    <div className="border rounded-lg divide-y">
      {files.map((file) => (
        <div key={file.id} className="flex items-center gap-3 p-3">
          {getFileIcon(file.mimeType)}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <p className="text-sm font-medium truncate">{file.name}</p>
              {file.fileType === "deliverable" && <Badge className="text-[10px]">Deliverable</Badge>}
            </div>
            <p className="text-xs text-muted-foreground">
              {formatSize(file.sizeBytes)} •{" "}
              {new Date(file.createdAt).toLocaleDateString()}
            </p>
          </div>
          <a
            href={`/api/files/${file.id}/download${token ? `?token=${token}` : ""}`}
            target="_blank"
            rel="noopener"
          >
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <Download className="h-4 w-4" />
            </Button>
          </a>
        </div>
      ))}
    </div>
  );
}
