"use client";

import { useState, useRef, useEffect } from "react";
import {
  ChevronDown,
  Bold,
  Italic,
  Underline,
  Strikethrough,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Copy,
  Trash2,
  MoreHorizontal,
  Type,
} from "lucide-react";
import { CUBIQLO_FONTS, getFontFamily } from "@/lib/builder-fonts";
import { useT } from "@/lib/i18n-client";

type TypographyState = {
  fontFamily?: string;
  fontSize?: "sm" | "base" | "lg" | "xl";
  align?: "left" | "center" | "right";
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
  strikethrough?: boolean;
};

type Props = {
  active: boolean;
  value: TypographyState;
  onChange: (patch: Partial<TypographyState>) => void;
  onDuplicate?: () => void;
  onDelete?: () => void;
  tagType?: "heading" | "body" | "card";
  className?: string;
};

export function FloatingContextToolbar({
  active,
  value,
  onChange,
  onDuplicate,
  onDelete,
  tagType = "heading",
  className = "",
}: Props) {
  const { t } = useT();
  const [fontOpen, setFontOpen] = useState(false);
  const [sizeOpen, setSizeOpen] = useState(false);
  const [alignOpen, setAlignOpen] = useState(false);
  const [styleOpen, setStyleOpen] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setFontOpen(false);
        setSizeOpen(false);
        setAlignOpen(false);
        setStyleOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  if (!active) return null;

  const currentFontObj = CUBIQLO_FONTS.find((f) => f.id === value.fontFamily) || CUBIQLO_FONTS[0];
  const currentSize = value.fontSize || "base";
  const currentAlign = value.align || "left";

  const sizeLabels: Record<string, string> = {
    sm: "14",
    base: "16",
    lg: "24",
    xl: "34",
  };

  const tagLabels: Record<string, string> = {
    heading: t("Judul", "Heading"),
    card: t("Subjudul", "Subheading"),
    body: t("Paragraf", "Body"),
  };

  return (
    <div
      ref={containerRef}
      onClick={(e) => e.stopPropagation()}
      className={`absolute -top-12 left-0 sm:left-1/2 sm:-translate-x-1/2 z-50 flex items-center bg-white text-slate-800 rounded-lg shadow-2xl border border-slate-200/90 px-2 py-1 text-xs gap-1 select-none animate-in fade-in zoom-in-95 duration-100 max-w-none whitespace-nowrap ${className}`}
    >
      {/* 1. Tag / Text Type Dropdown */}
      <div className="relative shrink-0">
        <button
          type="button"
          onClick={() => { setStyleOpen(!styleOpen); setFontOpen(false); setSizeOpen(false); setAlignOpen(false); }}
          className="flex items-center gap-1.5 px-2 py-1 hover:bg-slate-100 rounded font-medium text-slate-700 whitespace-nowrap justify-between transition-colors"
        >
          <span className="font-semibold">{tagLabels[tagType] || t("Paragraf", "Body")}</span>
          <ChevronDown className="h-3 w-3 text-slate-400 shrink-0" />
        </button>
        {styleOpen && (
          <div className="absolute top-full mt-1.5 left-0 w-32 bg-white border border-slate-200 rounded-md shadow-lg py-1 z-50">
            <button
              type="button"
              onClick={() => { onChange({ fontSize: "xl", bold: true }); setStyleOpen(false); }}
              className="w-full text-left px-3 py-1.5 hover:bg-slate-100 font-bold text-sm text-slate-800"
            >
              {t("Judul", "Heading")}
            </button>
            <button
              type="button"
              onClick={() => { onChange({ fontSize: "lg", bold: true }); setStyleOpen(false); }}
              className="w-full text-left px-3 py-1.5 hover:bg-slate-100 font-semibold text-xs text-slate-700"
            >
              {t("Subjudul", "Subheading")}
            </button>
            <button
              type="button"
              onClick={() => { onChange({ fontSize: "base", bold: false }); setStyleOpen(false); }}
              className="w-full text-left px-3 py-1.5 hover:bg-slate-100 text-xs text-slate-600"
            >
              {t("Paragraf", "Body Text")}
            </button>
          </div>
        )}
      </div>

      <div className="w-px h-4 bg-slate-200 my-auto" />

      {/* 2. Font Dropdown */}
      <div className="relative">
        <button
          type="button"
          onClick={() => { setFontOpen(!fontOpen); setStyleOpen(false); setSizeOpen(false); setAlignOpen(false); }}
          className="flex items-center gap-1 px-2 py-1 hover:bg-slate-100 rounded font-medium text-slate-700 min-w-[90px] max-w-[120px] justify-between truncate transition-colors"
        >
          <span className="truncate">{currentFontObj.name}</span>
          <ChevronDown className="h-3 w-3 text-slate-400 shrink-0" />
        </button>
        {fontOpen && (
          <div className="absolute top-full mt-1.5 left-0 w-44 max-h-56 overflow-y-auto bg-white border border-slate-200 rounded-md shadow-lg py-1 z-50">
            {CUBIQLO_FONTS.map((f) => (
              <button
                key={f.id}
                type="button"
                style={{ fontFamily: getFontFamily(f.id) }}
                onClick={() => { onChange({ fontFamily: f.id }); setFontOpen(false); }}
                className={`w-full text-left px-3 py-1.5 text-xs transition-colors flex items-center justify-between ${
                  currentFontObj.id === f.id ? "bg-primary/10 text-primary font-semibold" : "hover:bg-slate-100 text-slate-700"
                }`}
              >
                <span>{f.name}</span>
                <span className="text-[10px] text-muted-foreground">{f.category}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="w-px h-4 bg-slate-200 my-auto" />

      {/* 3. Font Size Dropdown */}
      <div className="relative">
        <button
          type="button"
          onClick={() => { setSizeOpen(!sizeOpen); setFontOpen(false); setStyleOpen(false); setAlignOpen(false); }}
          className="flex items-center gap-1 px-2 py-1 hover:bg-slate-100 rounded font-medium text-slate-700 min-w-[45px] justify-between transition-colors"
        >
          <span>{sizeLabels[currentSize]}</span>
          <ChevronDown className="h-3 w-3 text-slate-400" />
        </button>
        {sizeOpen && (
          <div className="absolute top-full mt-1.5 left-0 w-24 bg-white border border-slate-200 rounded-md shadow-lg py-1 z-50">
            {[
              { id: "sm", label: "14 (SM)" },
              { id: "base", label: "16 (BASE)" },
              { id: "lg", label: "24 (LG)" },
              { id: "xl", label: "34 (XL)" },
            ].map((sz) => (
              <button
                key={sz.id}
                type="button"
                onClick={() => { onChange({ fontSize: sz.id as any }); setSizeOpen(false); }}
                className={`w-full text-left px-3 py-1.5 text-xs hover:bg-slate-100 transition-colors ${
                  currentSize === sz.id ? "font-bold text-primary bg-primary/5" : "text-slate-700"
                }`}
              >
                {sz.label}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="w-px h-4 bg-slate-200 my-auto" />

      {/* 4. Text Formatting Buttons (B, I, U, S) */}
      <button
        type="button"
        title={t("Tebal", "Bold")}
        onClick={() => onChange({ bold: !value.bold })}
        className={`p-1.5 rounded hover:bg-slate-100 transition-colors ${value.bold ? "bg-slate-200 text-slate-900 font-bold" : "text-slate-600"}`}
      >
        <Bold className="h-3.5 w-3.5" />
      </button>
      <button
        type="button"
        title={t("Miring", "Italic")}
        onClick={() => onChange({ italic: !value.italic })}
        className={`p-1.5 rounded hover:bg-slate-100 transition-colors ${value.italic ? "bg-slate-200 text-slate-900 font-bold" : "text-slate-600"}`}
      >
        <Italic className="h-3.5 w-3.5" />
      </button>
      <button
        type="button"
        title={t("Garis Bawah", "Underline")}
        onClick={() => onChange({ underline: !value.underline })}
        className={`p-1.5 rounded hover:bg-slate-100 transition-colors ${value.underline ? "bg-slate-200 text-slate-900 font-bold" : "text-slate-600"}`}
      >
        <Underline className="h-3.5 w-3.5" />
      </button>
      <button
        type="button"
        title={t("Coret", "Strikethrough")}
        onClick={() => onChange({ strikethrough: !value.strikethrough })}
        className={`p-1.5 rounded hover:bg-slate-100 transition-colors ${value.strikethrough ? "bg-slate-200 text-slate-900 font-bold" : "text-slate-600"}`}
      >
        <Strikethrough className="h-3.5 w-3.5" />
      </button>

      {/* Color Indicator (A) */}
      <div className="flex flex-col items-center justify-center p-1 rounded hover:bg-slate-100 cursor-pointer" title={t("Warna Teks", "Text Color")}>
        <span className="font-bold text-[11px] leading-none text-slate-800">A</span>
        <div className="h-0.5 w-3.5 bg-primary rounded-full mt-0.5" />
      </div>

      <div className="w-px h-4 bg-slate-200 my-auto" />

      {/* 5. Text Alignment Dropdown */}
      <div className="relative">
        <button
          type="button"
          onClick={() => { setAlignOpen(!alignOpen); setFontOpen(false); setSizeOpen(false); setStyleOpen(false); }}
          className="flex items-center gap-1 p-1.5 hover:bg-slate-100 rounded text-slate-700 transition-colors"
          title={t("Perataan", "Alignment")}
        >
          {currentAlign === "center" ? (
            <AlignCenter className="h-3.5 w-3.5" />
          ) : currentAlign === "right" ? (
            <AlignRight className="h-3.5 w-3.5" />
          ) : (
            <AlignLeft className="h-3.5 w-3.5" />
          )}
          <ChevronDown className="h-2.5 w-2.5 text-slate-400" />
        </button>
        {alignOpen && (
          <div className="absolute top-full mt-1.5 left-0 w-28 bg-white border border-slate-200 rounded-md shadow-lg py-1 z-50">
            <button
              type="button"
              onClick={() => { onChange({ align: "left" }); setAlignOpen(false); }}
              className="w-full flex items-center gap-2 px-3 py-1.5 text-xs hover:bg-slate-100 text-slate-700"
            >
              <AlignLeft className="h-3.5 w-3.5" /> {t("Rata Kiri", "Left")}
            </button>
            <button
              type="button"
              onClick={() => { onChange({ align: "center" }); setAlignOpen(false); }}
              className="w-full flex items-center gap-2 px-3 py-1.5 text-xs hover:bg-slate-100 text-slate-700"
            >
              <AlignCenter className="h-3.5 w-3.5" /> {t("Rata Tengah", "Center")}
            </button>
            <button
              type="button"
              onClick={() => { onChange({ align: "right" }); setAlignOpen(false); }}
              className="w-full flex items-center gap-2 px-3 py-1.5 text-xs hover:bg-slate-100 text-slate-700"
            >
              <AlignRight className="h-3.5 w-3.5" /> {t("Rata Kanan", "Right")}
            </button>
          </div>
        )}
      </div>

      <div className="w-px h-4 bg-slate-200 my-auto" />

      {/* 6. Action buttons (Duplicate, Delete) */}
      {onDuplicate && (
        <button
          type="button"
          title={t("Duplikat", "Duplicate")}
          onClick={onDuplicate}
          className="p-1.5 rounded hover:bg-slate-100 text-slate-600 transition-colors"
        >
          <Copy className="h-3.5 w-3.5" />
        </button>
      )}
      {onDelete && (
        <button
          type="button"
          title={t("Hapus", "Delete")}
          onClick={onDelete}
          className="p-1.5 rounded hover:bg-destructive/10 text-destructive transition-colors"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      )}
    </div>
  );
}
