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

export function DeleteQuestionnaireButton({ questionnaireId }: { questionnaireId: string }) {
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
      router.push("/app/questionnaires");
      refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Gagal menghapus formulir");
      setLoading(false);
    }
  }

  return (
    <>
      <Button type="button" variant="outline" size="sm" onClick={() => setOpen(true)} className="gap-1 text-destructive hover:text-destructive"><Trash2 className="h-4 w-4" /> Hapus</Button>
      <Dialog open={open} onOpenChange={(next) => !loading && setOpen(next)}>
        <DialogContent className="sm:max-w-md"><DialogHeader><DialogTitle>Hapus formulir?</DialogTitle><DialogDescription>Tindakan ini tidak bisa dibatalkan.</DialogDescription></DialogHeader><DialogFooter><Button variant="outline" disabled={loading} onClick={() => setOpen(false)}>Batal</Button><LoadingButton variant="destructive" onClick={remove} loading={loading} loadingText="Menghapus...">Hapus</LoadingButton></DialogFooter></DialogContent>
      </Dialog>
    </>
  );
}
