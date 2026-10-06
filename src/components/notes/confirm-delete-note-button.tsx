"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
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
  const [open, setOpen] = useState(false);

  async function handleDelete() {
    const fd = new FormData();
    fd.append("noteId", noteId);
    fd.append("tab", tab);
    await action(fd);
  }

  return (
    <>
      <Button
        type="button"
        size="icon"
        variant="ghost"
        className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
        aria-label={label}
        onClick={() => setOpen(true)}
      >
        <Trash2 className="h-4 w-4" />
      </Button>
      <ConfirmDialog
        open={open}
        onOpenChange={setOpen}
        title={label}
        description={confirmMessage}
        confirmLabel={label}
        cancelLabel="Batal"
        destructive
        onConfirm={handleDelete}
      />
    </>
  );
}
