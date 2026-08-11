"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Trash2 } from "lucide-react";
import { deleteQuestionnaire } from "@/lib/actions/questionnaires";
import { LoadingButton } from "@/components/ui/loading-button";

export function DeleteQuestionnaireButton({ questionnaireId }: { questionnaireId: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function remove() {
    if (!window.confirm("Hapus kuesioner ini? Tidak bisa dibatalkan.")) return;
    setLoading(true);
    try {
      await deleteQuestionnaire(questionnaireId);
      toast.success("Kuesioner dihapus");
      router.push("/app/questionnaires");
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Gagal menghapus kuesioner");
      setLoading(false);
    }
  }

  return (
    <LoadingButton type="button" variant="outline" size="sm" onClick={remove} loading={loading} loadingText="..." className="gap-1 text-destructive hover:text-destructive">
      <Trash2 className="h-4 w-4" /> Hapus
    </LoadingButton>
  );
}
