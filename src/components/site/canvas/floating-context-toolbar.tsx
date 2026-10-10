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
  List,
  ListOrdered,
  Link as LinkIcon,
  Smile,
  Copy,
  Trash2,
  Check,
  X,
} from "lucide-react";
import { CUBIQLO_FONTS, getFontFamily } from "@/lib/builder-fonts";
import { useT } from "@/lib/i18n-client";

export type TypographyState = {
  fontFamily?: string;
  fontSize?: "sm" | "base" | "lg" | "xl";
  align?: "left" | "center" | "right";
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
  strikethrough?: boolean;
  color?: string;
  listType?: "none" | "bullet" | "number";
  linkUrl?: string;
};

type Props = {
  active: boolean;
  value: TypographyState;
  onChange: (patch: Partial<TypographyState>) => void;
  onDuplicate?: () => void;
  onDelete?: () => void;
  onInsertEmoji?: (emoji: string) => void;
  tagType?: "heading" | "body" | "card";
  className?: string;
};

const PALETTE_COLORS = [
  { name: "Default (Slate)", hex: "" },
  { name: "Cobalt Blue", hex: "#2563EB" },
  { name: "Indigo", hex: "#4F46E5" },
  { name: "Emerald Green", hex: "#10B981" },
  { name: "Amber Orange", hex: "#F59E0B" },
  { name: "Rose Red", hex: "#F43F5E" },
  { name: "Purple", hex: "#9333EA" },
  { name: "Dark Slate", hex: "#0F172A" },
  { name: "Muted Gray", hex: "#64748B" },
];

const EMOJI_LIST = ["🚀", "✨", "💡", "🎯", "🔥", "⭐", "👍", "💼", "🤝", "✅", "📈", "❤️"];

export function FloatingContextToolbar({
  active,
  value,
  onChange,
  onDuplicate,
  onDelete,
  onInsertEmoji,
  tagType = "heading",
  className = "",
}: Props) {
  const { t } = useT();
  const [fontOpen, setFontOpen] = useState(false);
  const [sizeOpen, setSizeOpen] = useState(false);
  const [alignOpen, setAlignOpen] = useState(false);
  const [styleOpen, setStyleOpen] = useState(false);
  const [colorOpen, setColorOpen] = useState(false);
  const [linkOpen, setLinkOpen] = useState(false);
  const [emojiOpen, setEmojiOpen] = useState(false);
  const [linkInput, setLinkInput] = useState(value.linkUrl || "");

  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setLinkInput(value.linkUrl || "");
  }, [value.linkUrl]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setFontOpen(false);
        setSizeOpen(false);
        setAlignOpen(false);
        setStyleOpen(false);
        setColorOpen(false);
        setLinkOpen(false);
        setEmojiOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  if (!active) return null;

  const currentFontObj = CUBIQLO_FONTS.find((f) => f.id === value.fontFamily) || CUBIQLO_FONTS[0];
  const currentSize = value.fontSize || (tagType === "heading" ? "xl" : tagType === "card" ? "base" : "sm");
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
    body: t("Teks normal", "Normal text"),
  };

  return (
    <div
      ref={containerRef}
      onMouseDown={(e) => {
        // Crucial: prevent active input from losing focus/blur
        e.preventDefault();
        e.stopPropagation();
      }}
      onClick={(e) => e.stopPropagation()}
      className={`absolute -top-14 left-4 z-50 flex items-center bg-white text-slate-800 rounded-lg shadow-2xl border border-slate-200/90 px-2 py-1 text-xs gap-1 select-none animate-in fade-in zoom-in-95 duration-100 max-w-none whitespace-nowrap ${className}`}
    >
      {/* 1. Tag / Text Type Dropdown */}
      <div className="relative shrink-0">
        <button
          type="button"
          onClick={() => {
            setStyleOpen(!styleOpen);
            setFontOpen(false);
            setSizeOpen(false);
            setAlignOpen(false);
            setColorOpen(false);
            setLinkOpen(false);
            setEmojiOpen(false);
          }}
          className="flex items-center gap-1.5 px-2 py-1 hover:bg-slate-100 rounded font-semibold text-slate-700 whitespace-nowrap justify-between transition-colors"
        >
          <span>{tagLabels[tagType] || t("Teks normal", "Normal text")}</span>
          <ChevronDown className="h-3 w-3 text-slate-400 shrink-0" />
        </button>
        {styleOpen && (
          <div
            onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); }}
            className="absolute bottom-full mb-1.5 left-0 w-36 bg-white border border-slate-200 rounded-md shadow-xl py-1 z-50 flex flex-col divide-y divide-slate-100"
          >
            <button
              type="button"
              onMouseDown={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onChange({ fontSize: "xl", bold: true });
                setStyleOpen(false);
              }}
              className="w-full text-left px-3 py-2 hover:bg-slate-100 font-bold text-sm text-slate-800 transition-colors"
            >
              {t("Judul", "Heading")}
            </button>
            <button
              type="button"
              onMouseDown={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onChange({ fontSize: "lg", bold: true });
                setStyleOpen(false);
              }}
              className="w-full text-left px-3 py-2 hover:bg-slate-100 font-semibold text-xs text-slate-700 transition-colors"
            >
              {t("Subjudul", "Subheading")}
            </button>
            <button
              type="button"
              onMouseDown={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onChange({ fontSize: "base", bold: false });
                setStyleOpen(false);
              }}
              className="w-full text-left px-3 py-2 hover:bg-slate-100 text-xs text-slate-600 transition-colors"
            >
              {t("Teks normal", "Normal text")}
            </button>
          </div>
        )}
      </div>

      <div className="w-px h-4 bg-slate-200 my-auto" />

      {/* 2. Font Family Dropdown (Expanded vertical list above toolbar) */}
      <div className="relative">
        <button
          type="button"
          onMouseDown={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setFontOpen(!fontOpen);
            setStyleOpen(false);
            setSizeOpen(false);
            setAlignOpen(false);
            setColorOpen(false);
            setLinkOpen(false);
            setEmojiOpen(false);
          }}
          className="flex items-center gap-1 px-2 py-1 hover:bg-slate-100 rounded font-medium text-slate-700 min-w-[95px] max-w-[130px] justify-between truncate transition-colors"
        >
          <span className="truncate">{currentFontObj.name.split(" ")[0]}</span>
          <ChevronDown className="h-3 w-3 text-slate-400 shrink-0" />
        </button>
        {fontOpen && (
          <div
            onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); }}
            className="absolute bottom-full mb-1.5 left-0 w-56 max-h-72 overflow-y-auto bg-white border border-slate-200 rounded-md shadow-xl py-1 z-50 flex flex-col"
          >
            {CUBIQLO_FONTS.map((f) => (
              <button
                key={f.id}
                type="button"
                style={{ fontFamily: getFontFamily(f.id) }}
                onMouseDown={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  onChange({ fontFamily: f.id });
                  setFontOpen(false);
                }}
                className={`w-full text-left px-3 py-2 text-xs transition-colors flex items-center justify-between ${
                  currentFontObj.id === f.id ? "bg-primary/10 text-primary font-semibold" : "hover:bg-slate-100 text-slate-700"
                }`}
              >
                <span>{f.name}</span>
                <span className="text-[10px] text-muted-foreground uppercase">{f.category}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="w-px h-4 bg-slate-200 my-auto" />

      {/* 3. Font Size Dropdown (Vertical list above toolbar) */}
      <div className="relative">
        <button
          type="button"
          onMouseDown={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setSizeOpen(!sizeOpen);
            setFontOpen(false);
            setStyleOpen(false);
            setAlignOpen(false);
            setColorOpen(false);
            setLinkOpen(false);
            setEmojiOpen(false);
          }}
          className="flex items-center gap-1 px-2 py-1 hover:bg-slate-100 rounded font-medium text-slate-700 min-w-[45px] justify-between transition-colors"
        >
          <span>{sizeLabels[currentSize]}</span>
          <ChevronDown className="h-3 w-3 text-slate-400" />
        </button>
        {sizeOpen && (
          <div
            onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); }}
            className="absolute bottom-full mb-1.5 left-0 w-28 bg-white border border-slate-200 rounded-md shadow-xl py-1 z-50 flex flex-col divide-y divide-slate-100"
          >
            {[
              { id: "sm", label: "14" },
              { id: "base", label: "16" },
              { id: "lg", label: "24" },
              { id: "xl", label: "34" },
            ].map((sz) => (
              <button
                key={sz.id}
                type="button"
                onMouseDown={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  onChange({ fontSize: sz.id as any });
                  setSizeOpen(false);
                }}
                className={`w-full text-left px-3 py-2 text-xs hover:bg-slate-100 transition-colors flex items-center justify-between ${
                  currentSize === sz.id ? "font-bold text-primary bg-primary/5" : "text-slate-700"
                }`}
              >
                <span>{sz.label}</span>
                {currentSize === sz.id && <Check className="h-3 w-3 text-primary" />}
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

      {/* 5. Interactive Color Picker (A) */}
      <div className="relative">
        <button
          type="button"
          onMouseDown={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setColorOpen(!colorOpen);
            setFontOpen(false);
            setSizeOpen(false);
            setAlignOpen(false);
            setStyleOpen(false);
            setLinkOpen(false);
            setEmojiOpen(false);
          }}
          className={`flex flex-col items-center justify-center p-1 rounded hover:bg-slate-100 transition-colors ${colorOpen ? "bg-slate-100 ring-1 ring-primary/40" : ""}`}
          title={t("Warna Teks", "Text Color")}
        >
          <span className="font-bold text-[11px] leading-none" style={{ color: value.color || "#0F172A" }}>A</span>
          <div className="h-0.5 w-3.5 rounded-full mt-0.5" style={{ backgroundColor: value.color || "#2563EB" }} />
        </button>
        {colorOpen && (
          <div 
            onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); }}
            className="absolute top-full mt-1.5 left-0 w-44 bg-white border border-slate-200 rounded-md shadow-lg p-2 z-50"
          >
            <p className="text-[10px] font-semibold text-slate-400 mb-1.5 uppercase tracking-wider">{t("Pilih Warna", "Select Color")}</p>
            <div className="grid grid-cols-5 gap-1.5">
              {PALETTE_COLORS.map((col) => (
                <button
                  key={col.name}
                  type="button"
                  title={col.name}
                  onMouseDown={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    onChange({ color: col.hex });
                    setColorOpen(false);
                  }}
                  className={`h-6 w-6 rounded-md border flex items-center justify-center transition-transform hover:scale-110 ${
                    (value.color || "") === col.hex ? "ring-2 ring-primary ring-offset-1 border-slate-400" : "border-slate-200"
                  }`}
                  style={{ backgroundColor: col.hex || "#0F172A" }}
                >
                  {(value.color || "") === col.hex && <Check className="h-3 w-3 text-white drop-shadow-xs" />}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* 6. Hyperlink Dialog Button */}
      <div className="relative">
        <button
          type="button"
          onMouseDown={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setLinkOpen(!linkOpen);
            setFontOpen(false);
            setSizeOpen(false);
            setAlignOpen(false);
            setStyleOpen(false);
            setColorOpen(false);
            setEmojiOpen(false);
          }}
          className={`p-1.5 rounded hover:bg-slate-100 transition-colors ${value.linkUrl ? "text-primary bg-primary/10 font-bold" : "text-slate-600"}`}
          title={t("Sisipkan Link", "Insert Link")}
        >
          <LinkIcon className="h-3.5 w-3.5" />
        </button>
        {linkOpen && (
          <div 
            onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); }}
            className="absolute top-full mt-1.5 left-0 w-64 bg-white border border-slate-200 rounded-md shadow-xl p-2 z-50"
          >
            <p className="text-[10px] font-semibold text-slate-400 mb-1 uppercase tracking-wider">{t("Tautan URL", "URL Link")}</p>
            <div className="flex items-center gap-1">
              <input
                type="text"
                value={linkInput}
                onChange={(e) => setLinkInput(e.target.value)}
                onMouseDown={(e) => e.stopPropagation()}
                placeholder="https://example.com"
                className="flex-1 text-xs border border-slate-300 rounded px-2 py-1 outline-none focus:ring-1 focus:ring-primary"
              />
              <button
                type="button"
                onMouseDown={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  onChange({ linkUrl: linkInput.trim() });
                  setLinkOpen(false);
                }}
                className="bg-primary text-white text-xs px-2 py-1 rounded font-medium hover:bg-primary/90"
              >
                {t("Simpan", "Save")}
              </button>
              {value.linkUrl && (
                <button
                  type="button"
                  onMouseDown={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    onChange({ linkUrl: undefined });
                    setLinkInput("");
                    setLinkOpen(false);
                  }}
                  className="text-destructive hover:bg-destructive/10 p-1 rounded"
                  title={t("Hapus Link", "Remove Link")}
                >
                  <X className="h-3 w-3" />
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* 7. Sticker / Emoji Picker */}
      <div className="relative">
        <button
          type="button"
          onMouseDown={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setEmojiOpen(!emojiOpen);
            setFontOpen(false);
            setSizeOpen(false);
            setAlignOpen(false);
            setStyleOpen(false);
            setColorOpen(false);
            setLinkOpen(false);
          }}
          className="p-1.5 rounded hover:bg-slate-100 text-slate-600 transition-colors"
          title={t("Sisipkan Emoji", "Insert Emoji")}
        >
          <Smile className="h-3.5 w-3.5" />
        </button>
        {emojiOpen && (
          <div 
            onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); }}
            className="absolute top-full mt-1.5 left-0 w-44 bg-white border border-slate-200 rounded-md shadow-lg p-2 z-50"
          >
            <div className="grid grid-cols-4 gap-1">
              {EMOJI_LIST.map((em) => (
                <button
                  key={em}
                  type="button"
                  onMouseDown={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    if (onInsertEmoji) onInsertEmoji(em);
                    setEmojiOpen(false);
                  }}
                  className="text-base p-1 hover:bg-slate-100 rounded transition-transform hover:scale-125"
                >
                  {em}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="w-px h-4 bg-slate-200 my-auto" />

      {/* 8. Text Alignment Dropdown (Vertical menu above toolbar) */}
      <div className="relative">
        <button
          type="button"
          onMouseDown={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setAlignOpen(!alignOpen);
            setFontOpen(false);
            setSizeOpen(false);
            setStyleOpen(false);
            setColorOpen(false);
            setLinkOpen(false);
            setEmojiOpen(false);
          }}
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
          <div
            onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); }}
            className="absolute bottom-full mb-1.5 left-0 w-32 bg-white border border-slate-200 rounded-md shadow-xl py-1 z-50 flex flex-col divide-y divide-slate-100"
          >
            <button
              type="button"
              onMouseDown={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onChange({ align: "left" });
                setAlignOpen(false);
              }}
              className="w-full flex items-center gap-2 px-3 py-2 text-xs hover:bg-slate-100 text-slate-700 transition-colors"
            >
              <AlignLeft className="h-3.5 w-3.5" /> {t("Rata Kiri", "Left")}
            </button>
            <button
              type="button"
              onMouseDown={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onChange({ align: "center" });
                setAlignOpen(false);
              }}
              className="w-full flex items-center gap-2 px-3 py-2 text-xs hover:bg-slate-100 text-slate-700 transition-colors"
            >
              <AlignCenter className="h-3.5 w-3.5" /> {t("Rata Tengah", "Center")}
            </button>
            <button
              type="button"
              onMouseDown={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onChange({ align: "right" });
                setAlignOpen(false);
              }}
              className="w-full flex items-center gap-2 px-3 py-2 text-xs hover:bg-slate-100 text-slate-700 transition-colors"
            >
              <AlignRight className="h-3.5 w-3.5" /> {t("Rata Kanan", "Right")}
            </button>
          </div>
        )}
      </div>

      {/* 9. Listikal Nomor (123) & Bullet List Buttons */}
      <button
        type="button"
        title={t("List Bernomor (1, 2, 3)", "Numbered List")}
        onClick={() => onChange({ listType: value.listType === "number" ? "none" : "number" })}
        className={`p-1.5 rounded hover:bg-slate-100 transition-colors ${value.listType === "number" ? "bg-slate-200 text-slate-900 font-bold" : "text-slate-600"}`}
      >
        <ListOrdered className="h-3.5 w-3.5" />
      </button>
      <button
        type="button"
        title={t("List Bulet (•)", "Bullet List")}
        onClick={() => onChange({ listType: value.listType === "bullet" ? "none" : "bullet" })}
        className={`p-1.5 rounded hover:bg-slate-100 transition-colors ${value.listType === "bullet" ? "bg-slate-200 text-slate-900 font-bold" : "text-slate-600"}`}
      >
        <List className="h-3.5 w-3.5" />
      </button>

      <div className="w-px h-4 bg-slate-200 my-auto" />

      {/* 10. Action buttons (Duplicate, Delete) */}
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
