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
  const listType = typography.listType;

  useEffect(() => {
    // Native contenteditable lists own their <li> structure. Flattening through
    // textContent would make Enter continue inside one marker instead of creating
    // a new list item.
    if (listType === "bullet" || listType === "number") return;
    if (!ref.current) return;
    const selected = typography.linkText;
    if (ref.current.textContent === value && (!selected || !typography.linkUrl)) return;
    ref.current.replaceChildren();
    const index = selected ? value.indexOf(selected) : -1;
    if (index >= 0 && selected && typography.linkUrl) {
      ref.current.append(document.createTextNode(value.slice(0, index)));
      const link = document.createElement("a");
      link.textContent = selected;
      link.href = typography.linkUrl;
      link.className = "underline text-primary";
      ref.current.append(link, document.createTextNode(value.slice(index + selected.length)));
    } else {
      ref.current.textContent = value;
    }
  }, [value, listType, typography.linkText, typography.linkUrl]);

  // Compute typography classes
  const isBold = typography.bold;
  const isItalic = typography.italic;
  const isUnderline = typography.underline;
  const isStrike = typography.strikethrough;
  const align = typography.align || "left";
  const fontSize = typography.fontSize;
  const color = typography.color;

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

  function finishEditing(element: HTMLElement) {
    const text = listType && listType !== "none"
      ? Array.from(element.querySelectorAll("li")).map((item) => item.textContent || "").join("\n")
      : element.textContent || "";
    setTimeout(() => {
      const wrapper = ref.current?.parentElement?.parentElement;
      if (!wrapper?.contains(document.activeElement)) setIsFocused(false);
    }, 0);
    onChange(text);
  }

  if (listType === "bullet" || listType === "number") {
    const ListTag = listType === "bullet" ? "ul" : "ol";
    const lines = value.split(/\r?\n/).filter(Boolean);
    const selected = typography.linkText;
    const linkedLine = (line: string) => {
      const start = selected ? line.indexOf(selected) : -1;
      if (start < 0 || !selected || !typography.linkUrl) return line;
      return <>{line.slice(0, start)}<a href={typography.linkUrl} className="underline text-primary">{selected}</a>{line.slice(start + selected.length)}</>;
    };
    return (
      <div className="relative group/inline-text inline-block w-full">
        {enableFloatingToolbar && isFocused && onTypographyChange && (
          <FloatingContextToolbar active value={typography} onChange={onTypographyChange} onInsertEmoji={handleInsertEmoji} tagType={tagType} className="-top-16" />
        )}
        <ListTag
          ref={ref as React.Ref<HTMLUListElement & HTMLOListElement>}
          contentEditable
          suppressContentEditableWarning
          style={combinedStyle}
          className={cn(
            "outline-none rounded px-1 cursor-text transition-all space-y-1",
            listType === "bullet" ? "list-disc pl-6" : "list-decimal pl-6",
            isFocused ? "ring-2 ring-primary ring-offset-2" : "hover:ring-1 hover:ring-primary/40",
            sizeClass, alignClass, isBold && "font-bold", isItalic && "italic", isUnderline && "underline", isStrike && "line-through", className,
          )}
          onFocus={() => setIsFocused(true)}
          onBlur={(e) => finishEditing(e.currentTarget)}
        >
          {(lines.length ? lines : [""]).map((line, index) => <li key={`${index}-${line}`}>{linkedLine(line)}</li>)}
        </ListTag>
      </div>
    );
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

            "empty:before:content-[attr(data-placeholder)] empty:before:text-muted-foreground/50",
            className,
          )}
          data-placeholder={placeholder}
          onFocus={() => setIsFocused(true)}
          onBlur={(e) => {
            const text = e.currentTarget.textContent || "";
            // Keep toolbar mounted while focus moves into its link input/popovers.
            setTimeout(() => {
              const wrapper = ref.current?.parentElement?.parentElement;
              if (!wrapper?.contains(document.activeElement)) setIsFocused(false);
            }, 0);
            onChange(text);
          }}
        />
      </div>
    </div>
  );
}
