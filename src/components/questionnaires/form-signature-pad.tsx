"use client";

import { useEffect, useRef, useState } from "react";
import { PenTool, Type, Trash2, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useT } from "@/lib/i18n-client";

interface FormSignaturePadProps {
  value?: string;
  onChange: (dataUrl: string) => void;
  disabled?: boolean;
}

export function FormSignaturePad({
  value,
  onChange,
  disabled = false,
}: FormSignaturePadProps) {
  const { t } = useT();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [drawing, setDrawing] = useState(false);
  const [hasSignature, setHasSignature] = useState(false);
  const [mode, setMode] = useState<"draw" | "type">("draw");
  const [typedName, setTypedName] = useState("");

  // Setup canvas high-DPI scaling
  useEffect(() => {
    if (mode !== "draw") return;
    const canvas = canvasRef.current;
    if (!canvas) return;

    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return;

    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.scale(dpr, dpr);
    ctx.strokeStyle = "#0f172a";
    ctx.lineWidth = 2.5;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
  }, [mode]);

  function getPoint(e: React.PointerEvent<HTMLCanvasElement>) {
    const rect = e.currentTarget.getBoundingClientRect();
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    };
  }

  function startDraw(e: React.PointerEvent<HTMLCanvasElement>) {
    if (disabled) return;
    e.preventDefault();
    const ctx = canvasRef.current?.getContext("2d");
    if (!ctx) return;
    setDrawing(true);
    const p = getPoint(e);
    ctx.beginPath();
    ctx.moveTo(p.x, p.y);
  }

  function draw(e: React.PointerEvent<HTMLCanvasElement>) {
    if (!drawing || disabled) return;
    e.preventDefault();
    const ctx = canvasRef.current?.getContext("2d");
    if (!ctx) return;
    const p = getPoint(e);
    ctx.lineTo(p.x, p.y);
    ctx.stroke();
    setHasSignature(true);
  }

  function endDraw() {
    if (!drawing || disabled) return;
    setDrawing(false);
    if (canvasRef.current) {
      const dataUrl = canvasRef.current.toDataURL("image/png");
      onChange(dataUrl);
    }
  }

  function clearSignature() {
    if (disabled) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setHasSignature(false);
    onChange("");
  }

  function handleTypeChange(val: string) {
    setTypedName(val);
    if (!val.trim()) {
      onChange("");
      return;
    }
    const canvas = document.createElement("canvas");
    canvas.width = 700;
    canvas.height = 180;
    const context = canvas.getContext("2d");
    if (!context) return;
    context.fillStyle = "#ffffff";
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.fillStyle = "#0f172a";
    context.font = "italic 48px serif";
    context.textAlign = "center";
    context.textBaseline = "middle";
    context.fillText(val.trim(), canvas.width / 2, canvas.height / 2);
    onChange(canvas.toDataURL("image/png"));
  }

  return (
    <div className="border border-border/80 rounded-2xl bg-card overflow-hidden shadow-2xs">
      {/* Mode Switcher Tabs */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-border/60 bg-muted/20">
        <div className="flex items-center gap-1 bg-muted/60 p-0.5 rounded-lg">
          <button
            type="button"
            onClick={() => setMode("draw")}
            className={`flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-md transition-all ${
              mode === "draw"
                ? "bg-background text-foreground shadow-2xs"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <PenTool className="h-3.5 w-3.5" />
            <span>{t("Coret / Gambar", "Draw Signature")}</span>
          </button>
          <button
            type="button"
            onClick={() => setMode("type")}
            className={`flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-md transition-all ${
              mode === "type"
                ? "bg-background text-foreground shadow-2xs"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Type className="h-3.5 w-3.5" />
            <span>{t("Ketik Nama", "Type Name")}</span>
          </button>
        </div>

        {mode === "draw" && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={clearSignature}
            disabled={!hasSignature || disabled}
            className="h-7 px-2 text-xs text-muted-foreground hover:text-destructive gap-1"
          >
            <Trash2 className="h-3.5 w-3.5" />
            <span>{t("Hapus", "Clear")}</span>
          </Button>
        )}
      </div>

      {/* Signature Input Canvas / Field */}
      <div className="p-3 bg-muted/5">
        {mode === "draw" ? (
          <div className="relative">
            <canvas
              ref={canvasRef}
              onPointerDown={startDraw}
              onPointerMove={draw}
              onPointerUp={endDraw}
              onPointerLeave={endDraw}
              className="w-full h-36 bg-background rounded-xl border border-dashed border-border/80 touch-none cursor-crosshair"
            />
            {!hasSignature && (
              <div className="pointer-events-none absolute inset-0 flex items-center justify-center text-xs text-muted-foreground/50 select-none">
                {t("Coret atau gambar tanda tangan di area ini...", "Draw or sign here...")}
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-2">
            <Input
              type="text"
              value={typedName}
              onChange={(e) => handleTypeChange(e.target.value)}
              placeholder={t("Ketik nama lengkap Anda di sini...", "Type your full name here...")}
              disabled={disabled}
              className="h-11 bg-background text-sm font-medium"
            />
            {typedName.trim() && (
              <div className="p-4 bg-background border border-border/70 rounded-xl flex items-center justify-center min-h-[90px]">
                <span className="font-serif italic text-2xl text-slate-900 tracking-wide select-none">
                  {typedName.trim()}
                </span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Verified Footer Helper */}
      <div className="px-3.5 py-2 border-t border-border/50 bg-muted/10 flex items-center justify-between text-[11px] text-muted-foreground">
        <span className="flex items-center gap-1.5 font-medium">
          <CheckCircle2 className="h-3.5 w-3.5 text-primary" />
          <span>{t("Tanda tangan digital terenkripsi", "Encrypted digital signature")}</span>
        </span>
        <span className="text-[10px] text-muted-foreground/70">E-Signature Pad</span>
      </div>
    </div>
  );
}
