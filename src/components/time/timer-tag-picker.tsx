"use client";

import { useState, useMemo, useEffect, useRef } from "react";
import { getTimerTags, createTimerTag } from "@/lib/actions/tags";
import { useT } from "@/lib/i18n-client";
import { Check, Plus, X } from "lucide-react";
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
  const inputRef = useRef<HTMLInputElement>(null);

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
    setSearch("");
    inputRef.current?.focus();
  };

  const handleCreateNewTag = async () => {
    const cleanName = search.trim();
    if (!cleanName) return;

    setCreating(true);
    try {
      const created = await createTimerTag({ name: cleanName });
      setTagsList((prev) => [...prev, { id: created.id, name: created.name, color: created.color }]);
      handleToggleTag(created.name);
      toast.success(t("Tag baru dibuat & dipilih", "New tag created & selected"));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("Gagal membuat tag", "Failed to create tag"));
    } finally {
      setCreating(false);
    }
  };

  return (
    <div ref={containerRef} className={`relative space-y-1.5 ${className}`}>
      {/* Unified Input + Chips Box */}
      <div
        onClick={() => {
          setIsOpen(true);
          inputRef.current?.focus();
        }}
        className="flex min-h-[40px] w-full flex-wrap items-center gap-1.5 rounded-lg border border-border/70 bg-background px-2.5 py-1.5 text-xs shadow-2xs cursor-text focus-within:border-primary focus-within:ring-1 focus-within:ring-primary/40 transition-colors"
      >
        {selectedTags.map((tagName) => {
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
        })}

        {/* Real Single Input field */}
        <input
          ref={inputRef}
          type="text"
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setIsOpen(true);
          }}
          onFocus={() => setIsOpen(true)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && search.trim()) {
              e.preventDefault();
              const exactMatch = filteredTags.find((t) => t.name.toLowerCase() === search.trim().toLowerCase());
              if (exactMatch) {
                handleToggleTag(exactMatch.name);
              } else {
                handleCreateNewTag();
              }
            } else if (e.key === "Backspace" && !search && selectedTags.length > 0) {
              const lastTag = selectedTags[selectedTags.length - 1];
              handleToggleTag(lastTag);
            }
          }}
          placeholder={selectedTags.length === 0 ? (placeholder || t("Ketik atau cari tag...", "Type or search tags...")) : ""}
          className="flex-1 min-w-[120px] bg-transparent border-0 p-0 text-xs text-foreground placeholder:text-muted-foreground/70 focus:outline-none focus:ring-0"
        />
      </div>

      {/* Dropdown Options Only (No duplicate input) */}
      {isOpen && (
        <div className="absolute left-0 right-0 top-full z-50 mt-1 max-h-48 overflow-y-auto rounded-xl border border-border/80 bg-popover p-1 shadow-lg space-y-0.5">
          {filteredTags.length > 0 ? (
            filteredTags.map((tag) => {
              const isSelected = selectedTags.includes(tag.name);
              return (
                <div
                  key={tag.id}
                  onClick={() => handleToggleTag(tag.name)}
                  className={`flex items-center justify-between rounded-lg px-2.5 py-1.5 text-xs font-medium cursor-pointer transition-colors ${
                    isSelected ? "bg-primary/10 text-primary font-semibold" : "hover:bg-muted/60 text-foreground"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span
                      className="h-2 w-2 rounded-full shrink-0"
                      style={{ backgroundColor: tag.color || "currentColor" }}
                    />
                    <span>{tag.name}</span>
                  </div>
                  {isSelected && <Check className="h-3.5 w-3.5 shrink-0 text-primary" />}
                </div>
              );
            })
          ) : search.trim() ? (
            <div className="p-2 text-center text-xs text-muted-foreground">
              <p className="mb-1.5">{t("Tag tidak ditemukan.", "Tag not found.")}</p>
              <button
                type="button"
                disabled={creating}
                onClick={handleCreateNewTag}
                className="inline-flex items-center gap-1 rounded-lg bg-primary/10 px-2.5 py-1 font-medium text-primary hover:bg-primary/20 transition-colors"
              >
                <Plus className="h-3 w-3" />
                {t(`Buat tag "${search.trim()}" (Enter)`, `Create tag "${search.trim()}" (Enter)`)}
              </button>
            </div>
          ) : (
            <div className="py-2.5 text-center text-xs text-muted-foreground">
              {t("Belum ada tag.", "No tags yet.")}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
