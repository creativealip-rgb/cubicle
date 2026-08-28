"use client";

import { useState } from "react";
import { GripVertical, Copy, Trash2, ChevronUp, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { useT } from "@/lib/i18n-client";

type Props = {
  id: string;
  selected: boolean;
  onSelect: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
  children: React.ReactNode;
};

export function CanvasSection({ id, selected, onSelect, onMoveUp, onMoveDown, onDuplicate, onDelete, children }: Props) {
  const { t } = useT();
  const [hovered, setHovered] = useState(false);

  return (
    <div
      data-section-id={id}
      onClick={(e) => { e.stopPropagation(); onSelect(); }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className={cn(
        "relative group transition-[outline] rounded-lg",
        selected ? "outline-2 outline-primary outline-offset-2" : "outline-transparent",
        hovered && !selected && "outline-1 outline-muted-foreground/20 outline-offset-2",
      )}
    >
      {(hovered || selected) && (
        <div className="absolute -top-3 right-2 z-20 flex items-center gap-0.5 rounded-lg border bg-background px-1 py-0.5 shadow-sm">
          <button type="button" onClick={(e) => { e.stopPropagation(); onMoveUp(); }} className="p-1 hover:bg-muted rounded" aria-label={t("Naikkan", "Move up")}>
            <ChevronUp className="h-3 w-3" />
          </button>
          <button type="button" onClick={(e) => { e.stopPropagation(); onMoveDown(); }} className="p-1 hover:bg-muted rounded" aria-label={t("Turunkan", "Move down")}>
            <ChevronDown className="h-3 w-3" />
          </button>
          <div className="w-px h-3 bg-border mx-0.5" />
          <button type="button" onClick={(e) => { e.stopPropagation(); onDuplicate(); }} className="p-1 hover:bg-muted rounded" aria-label={t("Duplikat", "Duplicate")}>
            <Copy className="h-3 w-3" />
          </button>
          <button type="button" onClick={(e) => { e.stopPropagation(); onDelete(); }} className="p-1 hover:bg-muted rounded text-destructive" aria-label={t("Hapus", "Delete")}>
            <Trash2 className="h-3 w-3" />
          </button>
          <div className="cursor-grab p-1 hover:bg-muted rounded" aria-label={t("Seret untuk mengurutkan", "Drag to reorder")}>
            <GripVertical className="h-3 w-3" />
          </div>
        </div>
      )}
      {children}
    </div>
  );
}
