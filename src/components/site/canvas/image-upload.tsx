"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import { Upload, Loader2, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useT } from "@/lib/i18n-client";

type Props = {
  value: string;
  onChange: (url: string) => void;
  label?: string;
};

export function ImageUpload({ value, onChange, label }: Props) {
  const { t } = useT();
  const uploadLabel = label ?? t("Unggah gambar", "Upload image");
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  async function handleUpload(file: File | undefined) {
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Max 5MB");
      return;
    }
    if (!["image/png", "image/jpeg", "image/webp", "image/gif"].includes(file.type)) {
      toast.error("Format: PNG, JPG, WebP, GIF");
      return;
    }
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/site/upload", { method: "POST", body: fd });
      const data = (await res.json().catch(() => ({}))) as { ok?: boolean; url?: string; error?: string };
      if (!res.ok || !data.ok || !data.url) {
        throw new Error(data.error || t("Unggah gagal", "Upload failed"));
      }
      onChange(data.url);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("Unggah gagal", "Upload failed"));
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  return (
    <div className="flex items-center gap-2">
      <input
        ref={fileRef}
        type="file"
        accept="image/png,image/jpeg,image/webp,image/gif"
        className="hidden"
        onChange={(e) => handleUpload(e.target.files?.[0])}
      />
      {value ? (
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <div className="relative h-8 w-8 rounded overflow-hidden shrink-0">
            <Image src={value} alt="" fill sizes="32px" className="object-cover" />
          </div>
          <span className="text-xs text-muted-foreground truncate flex-1">{value.split("/").pop()}</span>
          <Button type="button" variant="ghost" size="icon" className="h-6 w-6 shrink-0" aria-label={t("Hapus gambar", "Remove image")} onClick={() => onChange("")}>
            <X className="h-3 w-3" />
          </Button>
        </div>
      ) : (
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="gap-1"
          disabled={uploading}
          onClick={() => fileRef.current?.click()}
        >
          {uploading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Upload className="h-3 w-3" />}
          {uploadLabel}
        </Button>
      )}
    </div>
  );
}
