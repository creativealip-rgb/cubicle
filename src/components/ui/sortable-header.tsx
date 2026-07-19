"use client";

import { ArrowDown, ArrowUp, ArrowUpDown } from "lucide-react";
import { cn } from "@/lib/utils";
import type { SortDir } from "@/lib/table-sort";

type SortableHeaderProps = {
  label: React.ReactNode;
  dir: SortDir | null;
  onClick: () => void;
  className?: string;
  /** Use for shadcn <th> vs plain div headers */
  as?: "button" | "div";
  align?: "left" | "right" | "center";
};

export function SortableHeader({
  label,
  dir,
  onClick,
  className,
  as = "button",
  align = "left",
}: SortableHeaderProps) {
  const Icon = dir === "asc" ? ArrowUp : dir === "desc" ? ArrowDown : ArrowUpDown;
  const active = dir !== null;

  const content = (
    <>
      <span className="truncate">{label}</span>
      <Icon
        className={cn(
          "h-3 w-3 shrink-0 transition-opacity",
          active ? "opacity-100 text-foreground" : "opacity-40",
        )}
        aria-hidden
      />
    </>
  );

  const alignClass =
    align === "right"
      ? "justify-end text-right"
      : align === "center"
        ? "justify-center text-center"
        : "justify-start text-left";

  if (as === "div") {
    return (
      <button
        type="button"
        onClick={onClick}
        className={cn(
          "inline-flex w-full items-center gap-1 select-none transition-colors hover:text-foreground",
          alignClass,
          active ? "text-foreground" : "text-muted-foreground",
          className,
        )}
        aria-sort={dir === "asc" ? "ascending" : dir === "desc" ? "descending" : "none"}
      >
        {content}
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "inline-flex w-full items-center gap-1 select-none font-medium transition-colors hover:text-foreground",
        alignClass,
        active ? "text-foreground" : "text-muted-foreground",
        className,
      )}
      aria-sort={dir === "asc" ? "ascending" : dir === "desc" ? "descending" : "none"}
    >
      {content}
    </button>
  );
}
