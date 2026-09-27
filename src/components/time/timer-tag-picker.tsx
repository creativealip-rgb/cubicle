"use client";

import { useState, useMemo, useEffect, useRef } from "react";
import { getTimerTags, createTimerTag } from "@/lib/actions/tags";
import { useT } from "@/lib/i18n-client";
import { Tag, Check, Plus, X, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

interface TimerTag {
  id: string;
  name: string;
  color: string | null;
}

interface TimerTagPickerProps {
  value: string; // comma separated string e.g. "Editing, VFX"
  onChange: (value: string) => void;
  availableTags?: TimerTag[];
  placeholder?: string;
  className?: string;
}

export function TimerTagPicker({
  value,
  onChange,
  availableTags: initialTags,
  placeholder,
  className = "",
}: TimerTagPickerProps) {
  const { t } = useT();
  const [tagsList, setTagsList] = useState<TimerTag[]>(initialTags || []);
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [creating, setCreating] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!initialTags) {
      getTimerTags().then((data) => {
        setTagsList(data.map((item) => ({ id: item.id, name: item.name, color: item.color })));
      });
    } else {
      setTagsList(initialTags);
    }
  }, [initialTags]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const selectedTags = useMemo(() => {
    return value
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
  }, [value]);

  const filteredTags = useMemo(() => {
    const q = search.toLowerCase().trim();
    if (!q) return tagsList;
    return tagsList.filter((item) => item.name.toLowerCase().includes(q));
  }, [tagsList, search]);

  const handleToggleTag = (tagName: string) => {
    if (selectedTags.includes(tagName)) {
      const next = selectedTags.filter((t) => t !== tagName);
      onChange(next.join(", "));
    } else {
      onChange([...selectedTags, tagName].join(", "));
    }
  };

  const handleCreateNewTag = async () => {
    const cleanName = search.trim();
    if (!cleanName) return;

    setCreating(true);
    try {
      const created = await createTimerTag({ name: cleanName });
      setTagsList((prev) => [...prev, { id: created.id, name: created.name, color: created.color }]);
      handleToggleTag(created.name);
      setSearch("");
      toast.success(t("Tag baru dibuat & dipilih", "New tag created & selected"));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("Gagal membuat tag", "Failed to create tag"));
    } finally {
      setCreating(false);
    }
  };

  return (
    <div ref={containerRef} className={`relative space-y-1.5 ${className}`}>
      {/* Selected Tags Preview + Trigger Box */}
      <div
        onClick={() => setIsOpen(true)}
        className="flex min-h-[38px] w-full flex-wrap items-center gap-1.5 rounded-lg border border-border/70 bg-background px-2.5 py-1.5 text-xs shadow-2xs cursor-text focus-within:border-primary/50 focus-within:ring-1 focus-within:ring-primary/20"
      >
        {selectedTags.length > 0 ? (
          selectedTags.map((tagName) => {
            const tagObj = tagsList.find((t) => t.name.toLowerCase() === tagName.toLowerCase());
            return (
              <Badge
                key={tagName}
                variant="secondary"
                className="h-5 gap-1 px-1.5 text-[11px] font-medium border border-border/60"
                style={tagObj?.color ? { borderColor: `${tagObj.color}40`, backgroundColor: `${tagObj.color}15`, color: tagObj.color } : {}}
              >
                {tagObj?.color && (
                  <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: tagObj.color }} />
                )}
                <span>{tagName}</span>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleToggleTag(tagName);
                  }}
                  className="rounded-full hover:bg-black/10 dark:hover:bg-white/20 p-0.5"
                >
                  <X className="h-2.5 w-2.5" />
                </button>
              </Badge>
            );
          })
        ) : (
          <span className="text-muted-foreground/70 text-xs">
            {placeholder || t("Pilih atau cari tag...", "Select or search tags...")}
          </span>
        )}
      </div>

      {/* Dropdown Popup with Search */}
      {isOpen && (
        <div className="absolute z-50 mt-1 w-full rounded-xl border border-border/80 bg-popover p-2 shadow-lg animate-in fade-in-50 zoom-in-95">
          {/* Search Bar */}
          <div className="relative mb-2">
            <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              autoFocus
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t("Cari tag atau ketik tag baru...", "Search tags or type new tag...")}
              className="h-8 pl-8 text-xs bg-background"
            />
          </div>

          {/* Tags List */}
          <div className="max-h-48 overflow-y-auto space-y-1 pr-1">
            {filteredTags.length > 0 ? (
              filteredTags.map((tag) => {
                const isSelected = selectedTags.includes(tag.name);
                return (
                  <div
                    key={tag.id}
                    onClick={() => handleToggleTag(tag.name)}
                    className={`flex items-center justify-between rounded-lg px-2.5 py-1.5 text-xs font-medium cursor-pointer transition-colors ${
                      isSelected ? "bg-primary/10 text-primary" : "hover:bg-muted/60 text-foreground"
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span
                        className="h-2 w-2 rounded-full shrink-0"
                        style={{ backgroundColor: tag.color || "currentColor" }}
                      />
                      <span>{tag.name}</span>
                    </div>
                    {isSelected && <Check className="h-3.5 w-3.5 shrink-0" />}
                  </div>
                );
              })
            ) : search.trim() ? (
              <div className="py-2 text-center text-xs text-muted-foreground">
                <p className="mb-2">{t("Tag tidak ditemukan.", "Tag not found.")}</p>
                <button
                  type="button"
                  disabled={creating}
                  onClick={handleCreateNewTag}
                  className="inline-flex items-center gap-1 rounded-lg bg-primary/10 px-2.5 py-1 font-medium text-primary hover:bg-primary/20 transition-colors"
                >
                  <Plus className="h-3 w-3" />
                  {t(`Buat tag "${search.trim()}"`, `Create tag "${search.trim()}"`)}
                </button>
              </div>
            ) : (
              <div className="py-3 text-center text-xs text-muted-foreground">
                {t("Belum ada tag yang dibuat.", "No tags created yet.")}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
