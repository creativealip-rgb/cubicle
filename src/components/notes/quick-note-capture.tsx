"use client";

import { useState } from "react";
import { Plus, Sparkles, Calendar, Tag } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useT } from "@/lib/i18n-client";

export function QuickNoteCapture({
  action,
}: {
  action: (formData: FormData) => Promise<void>;
}) {
  const { t } = useT();
  const [title, setTitle] = useState("");
  const [focused, setFocused] = useState(false);

  return (
    <form
      action={async (formData) => {
        await action(formData);
        setTitle("");
      }}
      className="rounded-2xl border border-primary/20 bg-gradient-to-r from-primary/[0.04] via-violet-500/[0.02] to-transparent p-3 shadow-2xs transition-all focus-within:border-primary/50 focus-within:shadow-xs"
    >
      <div className="flex items-center gap-2">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-primary text-white shadow-2xs">
          <Plus className="h-4 w-4" />
        </div>
        <Input
          name="title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder={t(
            "Tulis catatan atau ide cepat di sini (tekan Enter untuk menyimpan)...",
            "Type a quick note or idea here (press Enter to save)..."
          )}
          className="h-8 border-none bg-transparent px-2 text-sm shadow-none focus-visible:ring-0"
          onFocus={() => setFocused(true)}
          required
        />
        <input type="hidden" name="body" value="" />
        <input type="hidden" name="pinned" value="false" />
        <input type="hidden" name="recurrenceRule" value="none" />
        <Button
          type="submit"
          size="sm"
          disabled={!title.trim()}
          className="h-8 shrink-0 rounded-xl bg-primary px-3 text-xs font-semibold text-white shadow-xs"
        >
          {t("Simpan", "Save")}
        </Button>
      </div>
    </form>
  );
}
