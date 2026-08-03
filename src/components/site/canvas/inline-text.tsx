"use client";

import { useRef, useEffect } from "react";
import { cn } from "@/lib/utils";

type Tag = "h1" | "h2" | "h3" | "p" | "span";

type Props = {
  value: string;
  onChange: (value: string) => void;
  tag?: Tag;
  className?: string;
  placeholder?: string;
};

export function InlineText({ value, onChange, tag: Tag = "p", className = "", placeholder = "Klik untuk edit..." }: Props) {
  const ref = useRef<HTMLElement>(null);

  useEffect(() => {
    if (ref.current && ref.current.textContent !== value) {
      ref.current.textContent = value;
    }
  }, [value]);

  return (
    <Tag
      ref={ref as React.Ref<HTMLHeadingElement & HTMLParagraphElement & HTMLSpanElement>}
      contentEditable
      suppressContentEditableWarning
      className={cn(
        "outline-none focus:ring-1 focus:ring-primary/30 rounded px-1 -mx-1 cursor-text",
        "empty:before:content-[attr(data-placeholder)] empty:before:text-muted-foreground/50",
        className,
      )}
      data-placeholder={placeholder}
      onBlur={(e) => onChange(e.currentTarget.textContent || "")}
    />
  );
}
