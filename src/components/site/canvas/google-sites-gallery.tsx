"use client";

import { useState, useRef, useEffect } from "react";
import Image from "next/image";
import {
  Upload,
  Loader2,
  Trash2,
  Plus,
  Move,
  GripVertical,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useT } from "@/lib/i18n-client";
import { toast } from "sonner";
import type { PersonalSiteSection } from "@/lib/personal-site/model";

type GalleryItem = {
  id: string;
  url: string;
  alt?: string;
  title?: string;
  description?: string;
};

export function GoogleSitesGalleryCanvas({
  section,
  onUpdate,
}: {
  section: Extract<PersonalSiteSection, { type: "gallery" }>;
  onUpdate: (patch: Partial<PersonalSiteSection>) => void;
}) {
  const { t } = useT();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [activeUploadIndex, setActiveUploadIndex] = useState<number | null>(null);
  const [uploading, setUploading] = useState(false);
  const [selectedCardId, setSelectedCardId] = useState<string | null>(null);

  // Height resize state
  const height = section.imageHeight ?? 240;
  const isResizingRef = useRef(false);
  const startYRef = useRef(0);
  const startHeightRef = useRef(height);

  const columns = section.columns ?? 3;
  const gridClass =
    columns === 1
      ? "grid-cols-1"
      : columns === 2
      ? "grid-cols-1 sm:grid-cols-2"
      : columns === 4
      ? "grid-cols-2 sm:grid-cols-4"
      : "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3";

  // Drag Resize Handle Listener
  useEffect(() => {
    function handleMouseMove(e: MouseEvent) {
      if (!isResizingRef.current) return;
      const deltaY = e.clientY - startYRef.current;
      const newH = Math.max(100, Math.min(600, startHeightRef.current + deltaY));
      onUpdate({ imageHeight: Math.round(newH) });
    }

    function handleMouseUp() {
      if (isResizingRef.current) {
        isResizingRef.current = false;
        document.body.style.cursor = "default";
        document.body.style.userSelect = "auto";
      }
    }

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [onUpdate]);

  function startResize(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    isResizingRef.current = true;
    startYRef.current = e.clientY;
    startHeightRef.current = height;
    document.body.style.cursor = "ns-resize";
    document.body.style.userSelect = "none";
  }

  async function handleFileUpload(file?: File) {
    if (!file || activeUploadIndex === null) return;
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Maksimal 5MB");
      return;
    }
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/site/upload", { method: "POST", body: fd });
      const data = (await res.json().catch(() => ({}))) as { ok?: boolean; url?: string; error?: string };
      if (!res.ok || !data.ok || !data.url) {
        throw new Error(data.error || "Gagal mengunggah gambar");
      }

      const updated = [...section.images];
      updated[activeUploadIndex] = {
        ...updated[activeUploadIndex],
        url: data.url,
      };
      onUpdate({ images: updated });
      toast.success(t("Gambar berhasil diunggah", "Image uploaded successfully"));
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Upload error");
    } finally {
      setUploading(false);
      setActiveUploadIndex(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  function triggerUpload(index: number) {
    setActiveUploadIndex(index);
    fileInputRef.current?.click();
  }

  function updateItem(index: number, patch: Partial<GalleryItem>) {
    const updated = [...section.images];
    updated[index] = { ...updated[index], ...patch };
    onUpdate({ images: updated });
  }

  function removeItem(index: number, e: React.MouseEvent) {
    e.stopPropagation();
    const updated = section.images.filter((_, i) => i !== index);
    onUpdate({ images: updated });
  }

  return (
    <div className="py-4 select-none">
      <input
        ref={fileInputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp,image/gif"
        className="hidden"
        onChange={(e) => handleFileUpload(e.target.files?.[0])}
      />

      {/* Heading */}
      <input
        type="text"
        value={section.heading}
        onChange={(e) => onUpdate({ heading: e.target.value })}
        placeholder={t("Judul Galeri...", "Gallery Heading...")}
        className="text-xl font-bold bg-transparent border-none outline-none mb-4 w-full focus:ring-1 focus:ring-primary rounded px-1"
      />

      {/* Google Sites Style Multi-Column Grid */}
      <div className={`grid ${gridClass} gap-4 items-start`}>
        {section.images.map((item, index) => {
          const isSelected = selectedCardId === item.id;
          return (
            <div
              key={item.id}
              onClick={() => setSelectedCardId(item.id)}
              className="flex flex-col gap-2 group relative"
            >
              {/* IMAGE BOX (Isolated Background with Google Sites Resize Dot Handles) */}
              <div
                style={{ height: `${height}px` }}
                className={`relative w-full rounded-xl overflow-hidden bg-muted/40 border-2 transition-all flex items-center justify-center ${
                  isSelected
                    ? "border-primary ring-2 ring-primary/20 shadow-md"
                    : "border-border/60 hover:border-border"
                }`}
              >
                {item.url ? (
                  <>
                    <Image
                      src={item.url}
                      alt={item.alt || item.title || ""}
                      fill
                      sizes="400px"
                      className="object-cover"
                    />
                    {/* Hover actions */}
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                      <Button
                        type="button"
                        variant="secondary"
                        size="sm"
                        className="h-8 text-xs font-semibold gap-1 rounded-lg"
                        onClick={(e) => {
                          e.stopPropagation();
                          triggerUpload(index);
                        }}
                      >
                        {uploading && activeUploadIndex === index ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <Upload className="h-3.5 w-3.5" />
                        )}
                        {t("Ganti", "Change")}
                      </Button>
                      <Button
                        type="button"
                        variant="destructive"
                        size="sm"
                        className="h-8 w-8 p-0 rounded-lg"
                        onClick={(e) => removeItem(index, e)}
                        title={t("Hapus", "Delete")}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </>
                ) : (
                  /* Empty State: Google Sites Center Plus (+) Button */
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      triggerUpload(index);
                    }}
                    className="flex flex-col items-center justify-center gap-2 p-4 cursor-pointer group/btn"
                  >
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-background border border-border shadow-xs text-muted-foreground group-hover/btn:text-primary group-hover/btn:border-primary group-hover/btn:scale-110 transition-all">
                      {uploading && activeUploadIndex === index ? (
                        <Loader2 className="h-6 w-6 animate-spin" />
                      ) : (
                        <Plus className="h-6 w-6 stroke-[2.5]" />
                      )}
                    </div>
                    <span className="text-[11px] font-semibold text-muted-foreground group-hover/btn:text-foreground">
                      {t("Pilih Gambar", "Select Image")}
                    </span>
                  </button>
                )}

                {/* Google Sites Visual Resize Handles (When Selected) */}
                {isSelected && (
                  <>
                    <div className="absolute top-2 left-2 h-2.5 w-2.5 rounded-full bg-primary border-2 border-white ring-1 ring-primary/40" />
                    <div className="absolute top-2 right-2 h-2.5 w-2.5 rounded-full bg-primary border-2 border-white ring-1 ring-primary/40" />
                    <div className="absolute bottom-2 left-2 h-2.5 w-2.5 rounded-full bg-primary border-2 border-white ring-1 ring-primary/40" />
                    <div className="absolute bottom-2 right-2 h-2.5 w-2.5 rounded-full bg-primary border-2 border-white ring-1 ring-primary/40" />

                    {/* Interactive Bottom Height Resize Bar */}
                    <div
                      onMouseDown={startResize}
                      className="absolute bottom-0 inset-x-0 h-4 bg-primary/20 hover:bg-primary/40 cursor-ns-resize flex items-center justify-center transition-colors"
                      title={t("Tarik untuk ubah tinggi gambar", "Drag to resize height")}
                    >
                      <div className="h-1 w-8 rounded-full bg-primary" />
                    </div>
                  </>
                )}
              </div>

              {/* SEPARATE TEXT AREA (Clean & Non-Enclosed Background) */}
              <div className="space-y-1 px-0.5">
                <input
                  type="text"
                  value={item.title ?? ""}
                  onChange={(e) => updateItem(index, { title: e.target.value })}
                  placeholder={t("Klik untuk mengedit judul", "Click to edit heading")}
                  className="w-full text-sm font-semibold bg-transparent border-none outline-none text-foreground placeholder:text-muted-foreground/50 focus:ring-1 focus:ring-primary rounded px-1"
                />
                <textarea
                  value={item.description ?? ""}
                  onChange={(e) => updateItem(index, { description: e.target.value })}
                  rows={2}
                  placeholder={t("Klik untuk mengedit teks keterangan", "Click to edit text description")}
                  className="w-full text-xs text-muted-foreground bg-transparent border-none outline-none resize-none placeholder:text-muted-foreground/40 focus:ring-1 focus:ring-primary rounded px-1"
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
