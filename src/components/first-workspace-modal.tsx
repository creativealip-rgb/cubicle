"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight, Building2, Check, Loader2, Rocket, Users } from "lucide-react";
import { finishOnboarding } from "@/lib/actions/onboarding";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function FirstWorkspaceModal({ lang }: { lang: "id" | "en" }) {
  const t = (id: string, en: string) => lang === "id" ? id : en;
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [workspaceName, setWorkspaceName] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");

  async function finish() {
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

  const steps = [
    { label: t("Workspace", "Workspace"), icon: Building2 },
    { label: t("Tim", "Team"), icon: Users },
    { label: t("Siap", "Ready"), icon: Rocket },
  ];

  return (
    <Dialog open={true}>
      <DialogContent hideClose className="max-w-lg" onEscapeKeyDown={(event) => event.preventDefault()} onPointerDownOutside={(event) => event.preventDefault()}>
        <DialogHeader>
          <div className="mb-3 flex items-center justify-center gap-2">
            {steps.map(({ label, icon: Icon }, index) => {
              const number = index + 1;
              return <div key={label} className="flex items-center gap-2">
                <div className={`flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${number === step ? "bg-primary text-primary-foreground" : number < step ? "bg-emerald-100 text-emerald-700" : "bg-muted text-muted-foreground"}`}>
                  {number < step ? <Check className="h-3 w-3" /> : <Icon className="h-3 w-3" />}{label}
                </div>
                {index < steps.length - 1 && <div className="h-px w-3 bg-border sm:w-5" />}
              </div>;
            })}
          </div>
          <DialogTitle className="sr-only">{t("Siapkan workspace", "Set up your workspace")}</DialogTitle>
          <DialogDescription className="sr-only">{t("Selesaikan tiga langkah setup", "Complete three setup steps")}</DialogDescription>
        </DialogHeader>

        <div className="min-h-56">
          {step === 1 && <div className="space-y-5">
            <div className="text-center"><Building2 className="mx-auto h-12 w-12 text-primary" /><h3 className="mt-2 text-lg font-semibold">{t("Buat workspace kamu", "Create your workspace")}</h3><p className="text-sm text-muted-foreground">{t("Di sinilah kamu kelola klien, proyek, dan invoice.", "This is where you manage clients, projects, and invoices.")}</p></div>
            <div className="space-y-2"><Label htmlFor="first-workspace-name">{t("Nama workspace", "Workspace name")}</Label><Input id="first-workspace-name" autoFocus maxLength={80} value={workspaceName} onChange={(event) => setWorkspaceName(event.target.value)} placeholder={t("Studio Mika", "Mika Studio")} /></div>
          </div>}

          {step === 2 && <div className="space-y-5 text-center"><Users className="mx-auto h-12 w-12 text-primary" /><div><h3 className="text-lg font-semibold">{t("Undang tim kamu", "Invite your team")}</h3><p className="mt-1 text-sm text-muted-foreground">{t("Workspace perlu dibuat dulu. Undang anggota kapan saja melalui Settings setelah setup selesai.", "Your workspace needs to be created first. Invite members anytime from Settings after setup.")}</p></div><div className="rounded-lg border bg-muted/40 p-4 text-sm text-muted-foreground">{t("Langkah ini opsional.", "This step is optional.")}</div></div>}

          {step === 3 && <div className="space-y-5 text-center"><Rocket className="mx-auto h-16 w-16 text-primary" /><div><h3 className="text-xl font-semibold">{t("Semua siap!", "You're ready!")}</h3><p className="mt-1 text-sm text-muted-foreground">{t("Workspace", "Workspace")} <strong>{workspaceName}</strong> {t("siap dibuat.", "is ready to be created.")}</p></div><div className="mx-auto flex w-fit items-center gap-2 rounded-full bg-emerald-100 px-3 py-1.5 text-xs font-medium text-emerald-700"><Check className="h-3.5 w-3.5" />{t("Nama workspace siap", "Workspace name ready")}</div></div>}
        </div>

        {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
        <div className="flex items-center justify-between gap-3">
          {step > 1 ? <Button variant="outline" onClick={() => setStep(step - 1)} disabled={pending}><ArrowLeft className="mr-1 h-4 w-4" />{t("Kembali", "Back")}</Button> : <span />}
          {step < 3 ? <Button onClick={() => setStep(step + 1)} disabled={step === 1 && workspaceName.trim().length < 2}>{step === 2 ? t("Lewati", "Skip") : t("Lanjut", "Continue")}<ArrowRight className="ml-1 h-4 w-4" /></Button> : <Button onClick={finish} disabled={pending}>{pending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}{t("Ke Dashboard", "Enter dashboard")}</Button>}
        </div>
      </DialogContent>
    </Dialog>
  );
}
