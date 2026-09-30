"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import { Upload, Loader2, X, Crop } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useT } from "@/lib/i18n-client";
import { ImageCropModal } from "./image-crop-modal";

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
  const [cropModalOpen, setCropModalOpen] = useState(false);

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
        <div className="flex items-center gap-2 bg-muted/40 p-1.5 rounded-xl border border-border/70">
          <div className="relative h-9 w-9 rounded-lg overflow-hidden shrink-0 border border-border bg-background shadow-xs">
            <Image src={value} alt="" fill sizes="36px" className="object-cover" />
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-7 text-xs gap-1 px-2 font-medium"
            disabled={uploading}
            onClick={() => fileRef.current?.click()}
          >
            {uploading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Upload className="h-3 w-3" />}
            {t("Ganti", "Change")}
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-7 text-xs gap-1 px-2 font-medium"
            onClick={() => setCropModalOpen(true)}
            title={t("Potong / Atur Posisi", "Crop / Adjust")}
          >
            <Crop className="h-3 w-3" />
            {t("Crop", "Crop")}
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-muted-foreground hover:bg-destructive/10 hover:text-destructive rounded-lg"
            aria-label={t("Hapus gambar", "Remove image")}
            onClick={() => onChange("")}
            title={t("Hapus gambar", "Remove image")}
          >
            <X className="h-3.5 w-3.5" />
          </Button>
          <ImageCropModal
            open={cropModalOpen}
            onOpenChange={setCropModalOpen}
            imageUrl={value}
            onCropComplete={(croppedUrl) => onChange(croppedUrl)}
          />
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
