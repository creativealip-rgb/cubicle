"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAppTransition } from "@/lib/transition-provider";
import { toast } from "sonner";
import { Trash2 } from "lucide-react";
import { deleteQuestionnaire } from "@/lib/actions/questionnaires";
import { LoadingButton } from "@/components/ui/loading-button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

export function DeleteQuestionnaireButton({
  questionnaireId,
  redirectTo,
  variant = "outline",
  size = "sm",
  className,
}: {
  questionnaireId: string;
  redirectTo?: string;
  variant?: "outline" | "ghost" | "destructive";
  size?: "default" | "sm" | "lg" | "icon";
  className?: string;
}) {
  const router = useRouter();
  const { refresh } = useAppTransition();
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);

  async function remove() {
    setLoading(true);
    try {
      await deleteQuestionnaire(questionnaireId);
      toast.success("Formulir dihapus");
      setOpen(false);
      if (redirectTo) {
        router.push(redirectTo);
      }
      refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Gagal menghapus formulir");
      setLoading(false);
    }
  }

  return (
    <>
      <Button
        type="button"
        variant={variant}
        size={size}
        onClick={() => setOpen(true)}
        className={className ?? "gap-1 text-destructive hover:bg-destructive/10 hover:text-destructive"}
      >
        <Trash2 className="h-3.5 w-3.5" />
        {size !== "icon" && <span>Hapus</span>}
      </Button>
      <Dialog open={open} onOpenChange={(next) => !loading && setOpen(next)}>
        <DialogContent className="sm:max-w-md"><DialogHeader><DialogTitle>Hapus formulir?</DialogTitle><DialogDescription>Tindakan ini tidak bisa dibatalkan.</DialogDescription></DialogHeader><DialogFooter><Button variant="outline" disabled={loading} onClick={() => setOpen(false)}>Batal</Button><LoadingButton variant="destructive" onClick={remove} loading={loading} loadingText="Menghapus...">Hapus</LoadingButton></DialogFooter></DialogContent>
      </Dialog>
    </>
  );
}
