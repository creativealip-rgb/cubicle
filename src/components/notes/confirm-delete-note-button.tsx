"use client";

import { ConfirmSubmitButton } from "@/components/ui/confirm-submit-button";
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
    <ConfirmSubmitButton
      action={action}
      fields={{ noteId, tab }}
      label={label}
      title={label}
      description={confirmMessage}
      destructive
    >
      <Trash2 className="h-4 w-4 text-destructive" />
    </ConfirmSubmitButton>
  );
}
