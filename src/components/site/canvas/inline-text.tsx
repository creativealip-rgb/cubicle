"use client";

import { useRef, useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { FloatingContextToolbar, type TypographyState } from "./floating-context-toolbar";
import { getFontFamily } from "@/lib/builder-fonts";

type Tag = "h1" | "h2" | "h3" | "p" | "span" | "div";

export type TextTypography = TypographyState;

type Props = {
  value: string;
  onChange: (value: string) => void;
  typography?: TextTypography;
  onTypographyChange?: (patch: Partial<TextTypography>) => void;
  tag?: Tag;
  tagType?: "heading" | "card" | "body";
  className?: string;
  placeholder?: string;
  style?: React.CSSProperties;
  enableFloatingToolbar?: boolean;
};

export function InlineText({
  value,
  onChange,
  typography = {},
  onTypographyChange,
  tag: Tag = "p",
  tagType = "body",
  className = "",
  placeholder = "Klik untuk edit...",
  style,
  enableFloatingToolbar = true,
}: Props) {
  const ref = useRef<HTMLElement>(null);
  const [isFocused, setIsFocused] = useState(false);

  useEffect(() => {
    if (ref.current && ref.current.textContent !== value) {
      ref.current.textContent = value;
    }
  }, [value]);

  // Compute typography classes
  const isBold = typography.bold;
  const isItalic = typography.italic;
  const isUnderline = typography.underline;
  const isStrike = typography.strikethrough;
  const align = typography.align || "left";
  const fontSize = typography.fontSize;
  const color = typography.color;
  const listType = typography.listType;

  const sizeClass =
    fontSize === "sm"
      ? "text-xs"
      : fontSize === "lg"
      ? "text-xl font-bold"
      : fontSize === "xl"
      ? "text-3xl font-extrabold"
      : fontSize === "base"
      ? "text-base"
      : "";

  const alignClass =
    align === "center"
      ? "text-center"
      : align === "right"
      ? "text-right"
      : "text-left";

  const fontFam = typography.fontFamily ? getFontFamily(typography.fontFamily) : undefined;

  const combinedStyle: React.CSSProperties = {
    ...style,
    ...(fontFam ? { fontFamily: fontFam } : {}),
    ...(color ? { color } : {}),
  };

  function handleInsertEmoji(emoji: string) {
    if (ref.current) {
      const current = ref.current.textContent || "";
      const updated = current + emoji;
      ref.current.textContent = updated;
      onChange(updated);
    }
  }

  return (
    <div className="relative group/inline-text inline-block w-full">
      {enableFloatingToolbar && isFocused && onTypographyChange && (
        <FloatingContextToolbar
          active={isFocused}
          value={typography}
          onChange={onTypographyChange}
          onInsertEmoji={handleInsertEmoji}
          tagType={tagType}
          className="-top-16"
        />
      )}
      <div className={cn("flex items-start gap-2", align === "center" ? "justify-center" : align === "right" ? "justify-end" : "justify-start")}>
        {listType === "bullet" && <span className="select-none text-primary font-bold mt-0.5">•</span>}
        {listType === "number" && <span className="select-none text-muted-foreground font-semibold text-xs mt-1">1.</span>}
        <Tag
          ref={ref as React.Ref<HTMLHeadingElement & HTMLParagraphElement & HTMLSpanElement>}
          contentEditable
          suppressContentEditableWarning
          style={combinedStyle}
          className={cn(
            "outline-none rounded px-1 -mx-1 cursor-text transition-all flex-1",
            isFocused ? "ring-2 ring-primary ring-offset-2" : "hover:ring-1 hover:ring-primary/40",
            sizeClass,
            alignClass,
            isBold && "font-bold",
            isItalic && "italic",
            isUnderline && "underline",
            isStrike && "line-through",
            typography.linkUrl && "underline text-primary cursor-pointer",
            "empty:before:content-[attr(data-placeholder)] empty:before:text-muted-foreground/50",
            className,
          )}
          data-placeholder={placeholder}
          onFocus={() => setIsFocused(true)}
          onBlur={(e) => {
            // Delay un-focus slightly so clicks inside floating toolbar register
            setTimeout(() => setIsFocused(false), 200);
            onChange(e.currentTarget.textContent || "");
          }}
        />
      </div>
    </div>
  );
}
