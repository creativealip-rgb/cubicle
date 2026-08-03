"use client";

import { useRef, useState } from "react";
import { Upload, Loader2, X } from "lucide-react";
import { Button } from "@/components/ui/button";

type Props = {
  value: string;
  onChange: (url: string) => void;
  label?: string;
};

export function ImageUpload({ value, onChange, label = "Upload gambar" }: Props) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  async function handleUpload(file: File | undefined) {
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      alert("Max 5MB");
      return;
    }
    if (!["image/png", "image/jpeg", "image/webp", "image/gif"].includes(file.type)) {
      alert("Format: PNG, JPG, WebP, GIF");
      return;
    }
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/workspace/logo", { method: "POST", body: fd });
      const data = (await res.json().catch(() => ({}))) as { ok?: boolean; logoUrl?: string; error?: string };
      if (!res.ok || !data.ok || !data.logoUrl) {
        throw new Error(data.error || "Upload gagal");
      }
      onChange(data.logoUrl);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Upload gagal");
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
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={value} alt="" className="h-8 w-8 rounded object-cover shrink-0" />
          <span className="text-xs text-muted-foreground truncate flex-1">{value.split("/").pop()}</span>
          <Button type="button" variant="ghost" size="icon" className="h-6 w-6 shrink-0" onClick={() => onChange("")}>
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
          {label}
        </Button>
      )}
    </div>
  );
}
