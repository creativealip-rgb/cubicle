"use client";

import { Button } from "@/components/ui/button";
import { Trash2 } from "lucide-react";

export function ConfirmDeleteNoteButton({
  noteId,
  tab,
  action,
  label,
  confirmMessage,
}: {
  noteId: string;
  tab: string;
  action: (formData: FormData) => Promise<void>;
  label: string;
  confirmMessage: string;
}) {
  return (
    <form
      action={action}
      onSubmit={(e) => {
        if (!confirm(confirmMessage)) e.preventDefault();
      }}
    >
      <input type="hidden" name="noteId" value={noteId} />
      <input type="hidden" name="tab" value={tab} />
      <Button type="submit" size="sm" variant="ghost" aria-label={label}>
        <Trash2 className="h-4 w-4 text-destructive" />
      </Button>
    </form>
  );
}
