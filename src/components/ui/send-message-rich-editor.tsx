"use client";

import { useState, useRef } from "react";
import {
  Bold,
  Italic,
  Underline,
  Strikethrough,
  Heading1,
  Heading2,
  List,
  ListOrdered,
  Quote,
  Eye,
  Edit3,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useT } from "@/lib/i18n-client";
import { formatRichEmailHtml } from "@/lib/rich-email";

export function SendMessageRichEditor({
  value,
  onChange,
  variables = [],
  placeholder,
  minRows = 6,
}: {
  value: string;
  onChange: (val: string) => void;
  variables?: Array<{ tag: string; label: string }>;
  placeholder?: string;
  minRows?: number;
}) {
  const { t } = useT();
  const [activeTab, setActiveTab] = useState<"edit" | "preview">("edit");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const insertTag = (tag: string) => {
    const textarea = textareaRef.current;
    if (!textarea) {
      onChange(value ? `${value}\n${tag}` : tag);
      return;
    }
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const nextValue = value.substring(0, start) + tag + value.substring(end);
    onChange(nextValue);
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + tag.length, start + tag.length);
    }, 10);
  };

  const applyFormat = (prefix: string, suffix: string = "") => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selected = value.substring(start, end);

    let nextValue = "";
    let nextStart = start;
    let nextEnd = end;

    if (selected) {
      nextValue = value.substring(0, start) + prefix + selected + suffix + value.substring(end);
      nextStart = start;
      nextEnd = end + prefix.length + suffix.length;
    } else {
      nextValue = value.substring(0, start) + prefix + suffix + value.substring(end);
      nextStart = start + prefix.length;
      nextEnd = start + prefix.length;
    }

    onChange(nextValue);
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(nextStart, nextEnd);
    }, 10);
  };

  const applyLinePrefix = (prefix: string) => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const before = value.substring(0, start);
    const lastNewline = before.lastIndexOf("\n");
    const lineStart = lastNewline === -1 ? 0 : lastNewline + 1;

    const nextValue = value.substring(0, lineStart) + prefix + value.substring(lineStart);
    onChange(nextValue);
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + prefix.length, end + prefix.length);
    }, 10);
  };

  return (
    <div className="space-y-2">
      {/* Editor Header & Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-1.5 rounded-t-lg border border-b-0 bg-muted/40 p-1.5 text-muted-foreground">
        <div className="flex flex-wrap items-center gap-0.5">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-7 w-7 rounded"
            onClick={() => applyFormat("**", "**")}
            title="Bold (Tebal)"
          >
            <Bold className="h-3.5 w-3.5" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-7 w-7 rounded"
            onClick={() => applyFormat("*", "*")}
            title="Italic (Miring)"
          >
            <Italic className="h-3.5 w-3.5" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-7 w-7 rounded"
            onClick={() => applyFormat("<u>", "</u>")}
            title="Underline (Garis bawah)"
          >
            <Underline className="h-3.5 w-3.5" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-7 w-7 rounded"
            onClick={() => applyFormat("~~", "~~")}
            title="Strikethrough (Coret)"
          >
            <Strikethrough className="h-3.5 w-3.5" />
          </Button>

          <div className="mx-1 h-4 w-px bg-border" />

          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-7 w-7 rounded"
            onClick={() => applyLinePrefix("# ")}
            title="Heading 1"
          >
            <Heading1 className="h-3.5 w-3.5" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-7 w-7 rounded"
            onClick={() => applyLinePrefix("## ")}
            title="Heading 2"
          >
            <Heading2 className="h-3.5 w-3.5" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-7 w-7 rounded"
            onClick={() => applyLinePrefix("• ")}
            title="Bullet List"
          >
            <List className="h-3.5 w-3.5" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-7 w-7 rounded"
            onClick={() => applyLinePrefix("1. ")}
            title="Numbered List"
          >
            <ListOrdered className="h-3.5 w-3.5" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-7 w-7 rounded"
            onClick={() => applyLinePrefix("> ")}
            title="Quote"
          >
            <Quote className="h-3.5 w-3.5" />
          </Button>
        </div>

        {/* View Toggle */}
        <div className="flex items-center gap-1 rounded bg-background p-0.5 border">
          <Button
            type="button"
            size="sm"
            variant={activeTab === "edit" ? "secondary" : "ghost"}
            className="h-6 px-2 text-[11px] gap-1"
            onClick={() => setActiveTab("edit")}
          >
            <Edit3 className="h-3 w-3" />
            {t("Edit", "Edit")}
          </Button>
          <Button
            type="button"
            size="sm"
            variant={activeTab === "preview" ? "secondary" : "ghost"}
            className="h-6 px-2 text-[11px] gap-1"
            onClick={() => setActiveTab("preview")}
          >
            <Eye className="h-3 w-3" />
            {t("Preview", "Preview")}
          </Button>
        </div>
      </div>

      {/* Editor Body */}
      {activeTab === "edit" ? (
        <Textarea
          ref={textareaRef}
          rows={minRows}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder || t("Tulis pesan di sini...", "Type your message here...")}
          className="rounded-t-none font-sans text-sm leading-relaxed border-t-0 focus-visible:ring-0 focus-visible:border-primary"
        />
      ) : (
        <div
          className="min-h-[140px] rounded-b-lg border border-t-0 bg-background p-4 text-sm leading-relaxed text-foreground/90 overflow-y-auto max-h-60"
          dangerouslySetInnerHTML={{
            __html: formatRichEmailHtml(value || t("(Pesan kosong)", "(Empty message)")),
          }}
        />
      )}

      {/* Variables helper tags */}
      {variables.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5 pt-1">
          <span className="text-[11px] font-medium text-muted-foreground">
            {t("Variabel Cepat:", "Quick Tags:")}
          </span>
          {variables.map((v) => (
            <button
              key={v.tag}
              type="button"
              onClick={() => insertTag(v.tag)}
              className="inline-flex items-center rounded-md bg-secondary/80 hover:bg-secondary px-2 py-0.5 text-[11px] font-mono text-secondary-foreground transition-colors cursor-pointer"
              title={v.label}
            >
              {v.tag}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
