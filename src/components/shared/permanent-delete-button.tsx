"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";
import { permanentlyDeleteClient } from "@/lib/actions/clients";
import { permanentlyDeleteProject } from "@/lib/actions/projects";
import { permanentlyDeleteTask } from "@/lib/actions/tasks";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

type EntityType = "client" | "project" | "task";

export function PermanentDeleteButton({ entityType, entityId, entityName, redirectTo, size = "sm" }: {
  entityType: EntityType;
  entityId: string;
  entityName: string;
  redirectTo?: string;
  size?: "sm" | "default";
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [confirmation, setConfirmation] = useState("");
  const [loading, setLoading] = useState(false);

  async function remove() {
    if (confirmation !== entityName) return;
    setLoading(true);
    try {
      if (entityType === "client") await permanentlyDeleteClient(entityId);
      else if (entityType === "project") await permanentlyDeleteProject(entityId);
      else await permanentlyDeleteTask(entityId);
      toast.success(`${entityName} dihapus permanen`);
      setOpen(false);
      if (redirectTo) router.push(redirectTo);
      else router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Gagal menghapus permanen");
    } finally {
      setLoading(false);
    }
  }

  return <Dialog open={open} onOpenChange={(next) => { setOpen(next); if (!next) setConfirmation(""); }}>
    <DialogTrigger asChild>
      <Button type="button" variant="outline" size={size} className="gap-1 text-destructive hover:text-destructive">
        <Trash2 className="h-3.5 w-3.5" /> Hapus Permanen
      </Button>
    </DialogTrigger>
    <DialogContent className="sm:max-w-md">
      <DialogHeader>
        <DialogTitle>Hapus permanen {entityName}?</DialogTitle>
        <DialogDescription>
          Data ini dan seluruh data terkait akan dihapus. Tindakan tidak dapat dibatalkan.
        </DialogDescription>
      </DialogHeader>
      <div className="space-y-2">
        <label htmlFor={`delete-${entityId}`} className="text-sm font-medium">Ketik nama untuk konfirmasi</label>
        <Input id={`delete-${entityId}`} value={confirmation} onChange={(event) => setConfirmation(event.target.value)} placeholder={entityName} autoComplete="off" />
      </div>
      <DialogFooter>
        <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={loading}>Batal</Button>
        <Button type="button" variant="destructive" onClick={remove} disabled={loading || confirmation !== entityName}>
          {loading ? "Menghapus..." : "Hapus Permanen"}
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>;
}
