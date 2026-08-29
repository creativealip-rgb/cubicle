"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { finishOnboarding } from "@/lib/actions/onboarding";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function FirstWorkspaceModal({ lang }: { lang: "id" | "en" }) {
  const t = (id: string, en: string) => lang === "id" ? id : en;
  const router = useRouter();
  const [workspaceName, setWorkspaceName] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (workspaceName.trim().length < 2 || pending) return;
    setPending(true);
    setError("");
    try {
      await finishOnboarding({ workspaceName });
      router.refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : t("Gagal membuat workspace", "Could not create workspace"));
      setPending(false);
    }
  }

  return (
    <Dialog open={true}>
      <DialogContent hideClose className="max-w-md" onEscapeKeyDown={(event) => event.preventDefault()} onPointerDownOutside={(event) => event.preventDefault()}>
        <DialogHeader>
          <DialogTitle>{t("Siapkan workspace", "Set up your workspace")}</DialogTitle>
          <DialogDescription>{t("Nama ini akan tampil di invoice, proposal, kontrak, dan portal klien.", "This name appears on invoices, proposals, contracts, and your client portal.")}</DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="first-workspace-name">{t("Nama workspace", "Workspace name")}</Label>
            <Input id="first-workspace-name" autoFocus maxLength={80} value={workspaceName} onChange={(event) => setWorkspaceName(event.target.value)} placeholder={t("Studio Mika", "Mika Studio")} disabled={pending} />
          </div>
          {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
          <Button type="submit" className="w-full" disabled={workspaceName.trim().length < 2 || pending}>
            {pending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {t("Buat workspace", "Create workspace")}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
