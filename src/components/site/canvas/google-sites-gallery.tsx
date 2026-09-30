"use client";

import { useState, useRef, useEffect } from "react";
import Image from "next/image";
import {
  Upload,
  Loader2,
  Trash2,
  Plus,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useT } from "@/lib/i18n-client";
import { toast } from "sonner";
import type { PersonalSiteSection } from "@/lib/personal-site/model";

type ResizeHandleType = "n" | "s" | "e" | "w" | "ne" | "nw" | "se" | "sw";

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
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);

  // Resize State for Currently Selected Single Item
  const resizeRef = useRef<{
    handle: ResizeHandleType;
    index: number;
    startX: number;
    startY: number;
    startWidth: number;
    startHeight: number;
  } | null>(null);

  const columns = section.columns ?? 3;
  const gridClass =
    columns === 1
      ? "grid-cols-1"
      : columns === 2
      ? "grid-cols-1 sm:grid-cols-2"
      : columns === 4
      ? "grid-cols-2 sm:grid-cols-4"
      : "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3";

  // Global mouse move & mouse up handler for 8-direction corner/edge drag
  useEffect(() => {
    function handleMouseMove(e: MouseEvent) {
      if (!resizeRef.current) return;
      const { handle, index, startX, startY, startWidth, startHeight } = resizeRef.current;
      const deltaX = e.clientX - startX;
      const deltaY = e.clientY - startY;

      let newWidth = startWidth;
      let newHeight = startHeight;

      // Handle vertical resizing (N, S, NE, NW, SE, SW)
      if (handle.includes("s")) {
        newHeight = Math.max(100, Math.min(800, startHeight + deltaY));
      } else if (handle.includes("n")) {
        newHeight = Math.max(100, Math.min(800, startHeight - deltaY));
      }

      // Handle horizontal resizing (E, W, NE, NW, SE, SW)
      if (handle.includes("e")) {
        newWidth = Math.max(100, Math.min(1000, startWidth + deltaX));
      } else if (handle.includes("w")) {
        newWidth = Math.max(100, Math.min(1000, startWidth - deltaX));
      }

      const updated = [...section.images];
      if (updated[index]) {
        updated[index] = {
          ...updated[index],
          height: Math.round(newHeight),
          width: Math.round(newWidth),
        };
        onUpdate({ images: updated });
      }
    }

    function handleMouseUp() {
      if (resizeRef.current) {
        resizeRef.current = null;
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
  }, [section.images, onUpdate]);

  function startResize(
    e: React.MouseEvent,
    index: number,
    handle: ResizeHandleType,
    currentWidth: number,
    currentHeight: number
  ) {
    e.preventDefault();
    e.stopPropagation();

    let cursor = "default";
    if (handle === "n" || handle === "s") cursor = "ns-resize";
    else if (handle === "e" || handle === "w") cursor = "ew-resize";
    else if (handle === "ne" || handle === "sw") cursor = "nesw-resize";
    else if (handle === "nw" || handle === "se") cursor = "nwse-resize";

    document.body.style.cursor = cursor;
    document.body.style.userSelect = "none";

    resizeRef.current = {
      handle,
      index,
      startX: e.clientX,
      startY: e.clientY,
      startWidth: currentWidth,
      startHeight: currentHeight,
    };
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

  function updateItem(index: number, patch: Partial<any>) {
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

      {/* Section Heading */}
      <input
        type="text"
        value={section.heading}
        onChange={(e) => onUpdate({ heading: e.target.value })}
        placeholder={t("Judul Galeri...", "Gallery Heading...")}
        className="text-xl font-bold bg-transparent border-none outline-none mb-4 w-full focus:ring-1 focus:ring-primary rounded px-1"
      />

      {/* Multi-Column Google Sites Canvas Layout */}
      <div className={`grid ${gridClass} gap-5 items-start`}>
        {section.images.map((item, index) => {
          const isSelected = selectedItemId === item.id;
          const itemHeight = item.height ?? section.imageHeight ?? 240;
          const itemWidth = item.width ? `${item.width}px` : "100%";

          return (
            <div
              key={item.id}
              onClick={(e) => {
                e.stopPropagation();
                setSelectedItemId(item.id);
              }}
              style={{ width: item.width ? `${item.width}px` : undefined, maxWidth: "100%" }}
              className="flex flex-col gap-2 group relative"
            >
              {/* IMAGE CONTAINER BOX (Individual Sizing & Corner Handles) */}
              <div
                style={{ height: `${itemHeight}px`, width: itemWidth }}
                className={`relative rounded-xl overflow-hidden bg-muted/40 border-2 transition-all flex items-center justify-center ${
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

                    {/* Quick overlay buttons (Change & Delete) */}
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
                  /* Empty State Button */
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

                {/* GOOGLE SITES 8-DIRECTION DRAG HANDLES (Active Only on This Single Selected Card) */}
                {isSelected && (
                  <>
                    {/* Corner Handles (NW, NE, SW, SE) */}
                    <div
                      onMouseDown={(e) => startResize(e, index, "nw", item.width ?? 300, itemHeight)}
                      className="absolute -top-1 -left-1 h-3.5 w-3.5 rounded-full bg-primary border-2 border-white ring-1 ring-primary/40 cursor-nwse-resize z-20 hover:scale-125 transition-transform"
                      title={t("Tarik sudut kiri atas", "Resize Top-Left")}
                    />
                    <div
                      onMouseDown={(e) => startResize(e, index, "ne", item.width ?? 300, itemHeight)}
                      className="absolute -top-1 -right-1 h-3.5 w-3.5 rounded-full bg-primary border-2 border-white ring-1 ring-primary/40 cursor-nesw-resize z-20 hover:scale-125 transition-transform"
                      title={t("Tarik sudut kanan atas", "Resize Top-Right")}
                    />
                    <div
                      onMouseDown={(e) => startResize(e, index, "sw", item.width ?? 300, itemHeight)}
                      className="absolute -bottom-1 -left-1 h-3.5 w-3.5 rounded-full bg-primary border-2 border-white ring-1 ring-primary/40 cursor-nesw-resize z-20 hover:scale-125 transition-transform"
                      title={t("Tarik sudut kiri bawah", "Resize Bottom-Left")}
                    />
                    <div
                      onMouseDown={(e) => startResize(e, index, "se", item.width ?? 300, itemHeight)}
                      className="absolute -bottom-1 -right-1 h-3.5 w-3.5 rounded-full bg-primary border-2 border-white ring-1 ring-primary/40 cursor-nwse-resize z-20 hover:scale-125 transition-transform"
                      title={t("Tarik sudut kanan bawah", "Resize Bottom-Right")}
                    />

                    {/* Edge Handles (N, S, E, W) */}
                    <div
                      onMouseDown={(e) => startResize(e, index, "n", item.width ?? 300, itemHeight)}
                      className="absolute top-0 inset-x-0 h-2 cursor-ns-resize z-10 hover:bg-primary/30 transition-colors"
                      title={t("Tarik ke atas", "Resize Top")}
                    />
                    <div
                      onMouseDown={(e) => startResize(e, index, "s", item.width ?? 300, itemHeight)}
                      className="absolute bottom-0 inset-x-0 h-2.5 cursor-ns-resize z-10 hover:bg-primary/30 transition-colors flex items-center justify-center"
                      title={t("Tarik ke bawah", "Resize Bottom")}
                    >
                      <div className="h-1 w-6 rounded-full bg-primary/80" />
                    </div>
                    <div
                      onMouseDown={(e) => startResize(e, index, "w", item.width ?? 300, itemHeight)}
                      className="absolute inset-y-0 left-0 w-2 cursor-ew-resize z-10 hover:bg-primary/30 transition-colors"
                      title={t("Tarik ke kiri", "Resize Left")}
                    />
                    <div
                      onMouseDown={(e) => startResize(e, index, "e", item.width ?? 300, itemHeight)}
                      className="absolute inset-y-0 right-0 w-2 cursor-ew-resize z-10 hover:bg-primary/30 transition-colors"
                      title={t("Tarik ke kanan", "Resize Right")}
                    />
                  </>
                )}
              </div>

              {/* SEPARATE TEXT AREA (Clean & Non-Enclosed Background) */}
              <div className="space-y-1 px-0.5">
                <input
                  type="text"
                  value={item.title ?? ""}
                  onChange={(e) => updateItem(index, { title: e.target.value })}
                  placeholder={t("Klik untuk mengedit teks", "Click to edit heading")}
                  className="w-full text-sm font-semibold bg-transparent border-none outline-none text-foreground placeholder:text-muted-foreground/50 focus:ring-1 focus:ring-primary rounded px-1"
                />
                <textarea
                  value={item.description ?? ""}
                  onChange={(e) => updateItem(index, { description: e.target.value })}
                  rows={2}
                  placeholder={t("Klik untuk mengedit teks", "Click to edit text description")}
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
