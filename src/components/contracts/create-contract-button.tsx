"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";

import { Plus, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { createContract } from "@/lib/actions/contracts";
import { useT } from "@/lib/i18n-client";

export function CreateContractButton({
  workspaceId,
  clients: _clients,
}: {
  workspaceId: string;
  clients: { id: string; name: string }[];
}) {
  const { t } = useT();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  const [clientName, setClientName] = useState("");
  const [clientEmail, setClientEmail] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [title, setTitle] = useState("");
  const [validUntil, setValidUntil] = useState("");

  function handleCreate() {
    if (!title.trim()) {
      toast.error(t("Judul wajib diisi", "Title is required"));
      return;
    }
    if (!clientName.trim() || !clientEmail.trim()) {
      toast.error(t("Nama dan email client wajib diisi", "Client name and email are required"));
      return;
    }
    startTransition(async () => {
      try {
        const c = await createContract({
          workspaceId,
          clientName: clientName.trim(),
          clientEmail: clientEmail.trim(),
          companyName: companyName.trim() || undefined,
          title: title.trim(),
          body: "",
          validUntil: validUntil || undefined,
        });
        setOpen(false);
        toast.success(t("Draf kontrak dibuat", "Contract draft created"));
        router.push(`/app/contracts/${c.id}/edit`);
        router.refresh();
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : t("Gagal membuat kontrak", "Failed to create contract");
        toast.error(msg);
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" className="gap-1">
          <Plus className="h-4 w-4" />
          {t("Kontrak baru", "New contract")}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t("Kontrak baru", "New contract")}</DialogTitle>
          <DialogDescription>
            {t("Mulai dari template, edit isinya, lalu kirim ke klien untuk tanda tangan elektronik.", "Start from template, edit content, then send to client for e-signature.")}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div><label className="text-sm font-medium block mb-1">{t("Nama client", "Client name")}</label><Input value={clientName} onChange={(e) => setClientName(e.target.value)} /></div>
          <div><label className="text-sm font-medium block mb-1">{t("Email client", "Client email")}</label><Input type="email" value={clientEmail} onChange={(e) => setClientEmail(e.target.value)} required /></div>
          <div><label className="text-sm font-medium block mb-1">{t("Nama perusahaan", "Company name")}</label><Input value={companyName} onChange={(e) => setCompanyName(e.target.value)} /></div>
          <div>
            <label className="text-sm font-medium block mb-1">{t("Judul", "Title")}</label>
            <Input
              placeholder={t("mis. Perjanjian Kerja Sama — Brand refresh", "e.g. Service Agreement — Brand refresh")}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>
          <div>
            <label className="text-sm font-medium block mb-1">
              {t("Berlaku sampai (opsional)", "Valid until (optional)")}
            </label>
            <Input
              type="date"
              value={validUntil}
              onChange={(e) => setValidUntil(e.target.value)}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)} disabled={pending}>
            {t("Batal", "Cancel")}
          </Button>
          <Button onClick={handleCreate} disabled={pending}>
            {pending ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : null}
            {t("Buat draf", "Create draft")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
