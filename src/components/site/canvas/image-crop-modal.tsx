"use client";

import { useState, useRef, useEffect } from "react";
import {
  Crop,
  Check,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Loader2,
  X,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useT } from "@/lib/i18n-client";
import { toast } from "sonner";

interface ImageCropModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  imageUrl: string;
  onCropComplete: (croppedUrl: string) => void;
}

export function ImageCropModal({
  open,
  onOpenChange,
  imageUrl,
  onCropComplete,
}: ImageCropModalProps) {
  const { t } = useT();
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [aspectRatio, setAspectRatio] = useState<number | null>(16 / 9);
  const [saving, setSaving] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const isDraggingRef = useRef(false);
  const startDragRef = useRef({ x: 0, y: 0 });
  const imageObjRef = useRef<HTMLImageElement | null>(null);

  // Reset when modal opens or aspect ratio changes
  useEffect(() => {
    if (open && imageUrl) {
      setZoom(1);
      setPan({ x: 0, y: 0 });
      const img = new window.Image();
      img.crossOrigin = "anonymous";
      img.src = imageUrl;
      img.onload = () => {
        imageObjRef.current = img;
      };
    }
  }, [open, imageUrl]);

  // When changing aspect ratio, reset pan & zoom to maintain centering
  const handleSelectAspect = (val: number | null) => {
    setAspectRatio(val);
    setZoom(1);
    setPan({ x: 0, y: 0 });
  };

  function handleMouseDown(e: React.MouseEvent) {
    e.preventDefault();
    isDraggingRef.current = true;
    startDragRef.current = { x: e.clientX - pan.x, y: e.clientY - pan.y };
  }

  function handleMouseMove(e: React.MouseEvent) {
    if (!isDraggingRef.current) return;
    setPan({
      x: e.clientX - startDragRef.current.x,
      y: e.clientY - startDragRef.current.y,
    });
  }

  function handleMouseUp() {
    isDraggingRef.current = false;
  }

  async function handleApplyCrop() {
    if (!imageObjRef.current || !containerRef.current) return;
    setSaving(true);

    try {
      const container = containerRef.current;
      const rect = container.getBoundingClientRect();
      const img = imageObjRef.current;

      const width = rect.width;
      const height = rect.height;

      // Create high-res canvas (max 2400px width/height for clean clarity)
      const scaleFactor = Math.min(2.5, Math.max(1.5, 1600 / Math.max(width, height)));
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("Canvas context error");

      canvas.width = Math.round(width * scaleFactor);
      canvas.height = Math.round(height * scaleFactor);
      ctx.scale(scaleFactor, scaleFactor);
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = "high";

      // Calculate rendered dimensions of image based on object-cover logic
      const imgAspect = img.naturalWidth / img.naturalHeight;
      const containerAspect = width / height;

      let baseRenderWidth = width;
      let baseRenderHeight = height;

      if (imgAspect > containerAspect) {
        baseRenderHeight = height;
        baseRenderWidth = height * imgAspect;
      } else {
        baseRenderWidth = width;
        baseRenderHeight = width / imgAspect;
      }

      const scaledRenderWidth = baseRenderWidth * zoom;
      const scaledRenderHeight = baseRenderHeight * zoom;

      // Center with pan offset
      const startX = (width - scaledRenderWidth) / 2 + pan.x;
      const startY = (height - scaledRenderHeight) / 2 + pan.y;

      ctx.drawImage(img, startX, startY, scaledRenderWidth, scaledRenderHeight);

      // Convert canvas to Blob & Upload as cropped image
      canvas.toBlob(async (blob) => {
        if (!blob) {
          toast.error("Gagal memproses crop");
          setSaving(false);
          return;
        }

        const fd = new FormData();
        fd.append("file", blob, "cropped-image.webp");

        const res = await fetch("/api/site/upload", {
          method: "POST",
          body: fd,
        });

        const data = await res.json().catch(() => ({}));
        if (!res.ok || !data.ok || !data.url) {
          throw new Error(data.error || "Gagal menyimpan hasil crop");
        }

        onCropComplete(data.url);
        toast.success(t("Gambar berhasil di-crop", "Image cropped successfully"));
        onOpenChange(false);
        setSaving(false);
      }, "image/webp", 0.92);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Crop error");
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[620px] p-0 overflow-hidden border-border bg-card">
        <DialogHeader className="p-4 pb-2 border-b">
          <DialogTitle className="text-base font-semibold flex items-center gap-2">
            <Crop className="h-4 w-4 text-primary" />
            {t("Sesuaikan & Crop Gambar", "Adjust & Crop Image")}
          </DialogTitle>
        </DialogHeader>

        <div className="p-4 space-y-4">
          {/* Aspect Ratio Options */}
          <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
            <span className="font-semibold text-muted-foreground">{t("Rasio Potong:", "Aspect Ratio:")}</span>
            <div className="flex items-center gap-1.5 bg-muted/60 p-1 rounded-lg border border-border/60">
              {[
                { label: "16:9", val: 16 / 9 },
                { label: "4:3", val: 4 / 3 },
                { label: "1:1", val: 1 },
                { label: "3:4", val: 3 / 4 },
                { label: "21:9", val: 21 / 9 },
                { label: t("Bebas", "Free"), val: null },
              ].map((item) => (
                <button
                  type="button"
                  key={item.label}
                  onClick={() => handleSelectAspect(item.val)}
                  className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition-all cursor-pointer ${
                    aspectRatio === item.val
                      ? "bg-background text-primary shadow-xs ring-1 ring-border"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>

          {/* Interactive Crop Viewport Box */}
          <div
            className="relative w-full h-[320px] bg-slate-950/90 rounded-xl overflow-hidden flex items-center justify-center cursor-grab active:cursor-grabbing select-none border border-border/80 shadow-inner"
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
          >
            {/* Target Crop Viewport Frame */}
            <div
              ref={containerRef}
              style={{
                aspectRatio: aspectRatio ? `${aspectRatio}` : "auto",
                width: aspectRatio && aspectRatio < 1 ? "auto" : "85%",
                height: aspectRatio && aspectRatio < 1 ? "85%" : "auto",
                maxHeight: "85%",
                maxWidth: "85%",
              }}
              className="relative rounded-lg overflow-hidden border-2 border-dashed border-primary shadow-[0_0_0_9999px_rgba(0,0,0,0.65)] flex items-center justify-center z-10"
            >
              {imageUrl && (
                <img
                  src={imageUrl}
                  alt="Crop preview"
                  draggable={false}
                  style={{
                    position: "absolute",
                    top: "50%",
                    left: "50%",
                    transform: `translate(calc(-50% + ${pan.x}px), calc(-50% + ${pan.y}px)) scale(${zoom})`,
                    transformOrigin: "center center",
                    transition: isDraggingRef.current ? "none" : "transform 0.05s ease-out",
                    minWidth: "100%",
                    minHeight: "100%",
                    width: "100%",
                    height: "100%",
                    objectFit: "cover",
                  }}
                  className="max-w-none max-h-none pointer-events-none select-none"
                />
              )}

              {/* Grid overlay rule of thirds */}
              <div className="absolute inset-0 grid grid-cols-3 grid-rows-3 pointer-events-none border border-white/20">
                <div className="border-r border-b border-white/20" />
                <div className="border-r border-b border-white/20" />
                <div className="border-b border-white/20" />
                <div className="border-r border-b border-white/20" />
                <div className="border-r border-b border-white/20" />
                <div className="border-b border-white/20" />
                <div className="border-r border-white/20" />
                <div className="border-r border-white/20" />
                <div />
              </div>
            </div>

            {/* Drag instruction hint */}
            <div className="absolute bottom-2 left-3 text-[10px] text-white/60 pointer-events-none">
              {t("💡 Klik & geser foto untuk menyesuaikan posisi", "💡 Click & drag photo to adjust focal point")}
            </div>
          </div>

          {/* Zoom Controls */}
          <div className="flex items-center justify-between gap-4 pt-1">
            <div className="flex items-center gap-2 flex-1">
              <ZoomOut className="h-4 w-4 text-muted-foreground" />
              <input
                type="range"
                min="0.8"
                max="3"
                step="0.05"
                value={zoom}
                onChange={(e) => setZoom(parseFloat(e.target.value))}
                className="w-full h-1.5 bg-muted rounded-lg appearance-none cursor-pointer accent-primary"
              />
              <ZoomIn className="h-4 w-4 text-muted-foreground" />
            </div>

            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-8 text-xs gap-1"
              onClick={() => {
                setZoom(1);
                setPan({ x: 0, y: 0 });
              }}
            >
              <RotateCcw className="h-3 w-3" />
              {t("Reset", "Reset")}
            </Button>
          </div>
        </div>

        <DialogFooter className="p-4 pt-2 border-t bg-muted/20 flex items-center justify-end gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => onOpenChange(false)}
            disabled={saving}
          >
            {t("Batal", "Cancel")}
          </Button>
          <Button
            type="button"
            size="sm"
            onClick={handleApplyCrop}
            disabled={saving}
            className="gap-1.5"
          >
            {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
            {t("Terapkan Hasil Crop", "Apply Crop")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
