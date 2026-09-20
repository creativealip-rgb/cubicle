"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight, BriefcaseBusiness, Check, Loader2, Settings, Sparkles } from "lucide-react";
import { finishOnboarding } from "@/lib/actions/onboarding";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";

type PlanChoice = "solo" | "team" | "enterprise";
type SourceChoice = "instagram" | "google" | "friend" | "tiktok" | "other";

export function FirstWorkspaceModal({ lang }: { lang: "id" | "en" }) {
  const t = (id: string, en: string) => lang === "id" ? id : en;
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [plan, setPlan] = useState<PlanChoice | "">("");
  const [source, setSource] = useState<SourceChoice | "">("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");

  const plans: Array<{ id: PlanChoice; title: string; note: string }> = [
    { id: "solo", title: "Solo", note: t("Untuk kerja sendiri dan mulai cepat.", "For solo work and quick start.") },
    { id: "team", title: "Team", note: t("Untuk kolaborasi dengan tim kecil.", "For collaborating with a small team.") },
    { id: "enterprise", title: "Enterprise", note: t("Untuk operasional besar dan kebutuhan khusus.", "For larger operations and custom needs.") },
  ];
  const sources: Array<{ id: SourceChoice; label: string }> = [
    { id: "instagram", label: "Instagram" },
    { id: "google", label: "Google" },
    { id: "friend", label: t("Teman / rekomendasi", "Friend / referral") },
    { id: "tiktok", label: "TikTok" },
    { id: "other", label: t("Lainnya", "Other") },
  ];
  const steps = [
    { label: "Plan", icon: BriefcaseBusiness },
    { label: t("Sumber", "Source"), icon: Sparkles },
    { label: "Setup", icon: Settings },
  ];

  async function finish() {
    if (!plan || !source || pending) return;
    setPending(true);
    setError("");
    try {
      await finishOnboarding({ plan, source });
      router.replace("/app/settings?tab=account");
      router.refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : t("Gagal menyelesaikan onboarding", "Could not finish onboarding"));
      setPending(false);
    }
  }

  function next() {
    if (step === 1 && !plan) return;
    if (step === 2 && !source) return;
    setStep((current) => Math.min(3, current + 1));
  }

  return (
    <Dialog open={true}>
      <DialogContent hideClose className="max-w-xl" onEscapeKeyDown={(event) => event.preventDefault()} onPointerDownOutside={(event) => event.preventDefault()}>
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
          <DialogTitle>{t("Setup akun Cubiqlo", "Set up your Cubiqlo account")}</DialogTitle>
          <DialogDescription>{t("Pilih kebutuhan, sumber, lalu lanjutkan setup di Settings.", "Choose your need, source, then continue setup in Settings.")}</DialogDescription>
        </DialogHeader>

        <div className="min-h-72">
          {step === 1 && <div className="space-y-4">
            <div className="text-center"><BriefcaseBusiness className="mx-auto h-12 w-12 text-primary" /><h3 className="mt-2 text-lg font-semibold">{t("Pilih tipe akun", "Choose account type")}</h3><p className="text-sm text-muted-foreground">{t("Ini membantu kami menyiapkan flow yang pas.", "This helps us prepare the right flow.")}</p></div>
            <div className="grid gap-3 sm:grid-cols-3">{plans.map((item) => <button key={item.id} type="button" onClick={() => setPlan(item.id)} className={`rounded-xl border p-4 text-left transition hover:border-primary ${plan === item.id ? "border-primary bg-primary/5 ring-1 ring-primary/30" : "border-border bg-card"}`}><span className="font-semibold">{item.title}</span><span className="mt-2 block text-xs leading-5 text-muted-foreground">{item.note}</span></button>)}</div>
          </div>}

          {step === 2 && <div className="space-y-4">
            <div className="text-center"><Sparkles className="mx-auto h-12 w-12 text-primary" /><h3 className="mt-2 text-lg font-semibold">{t("Tau Cubiqlo dari mana?", "Where did you hear about Cubiqlo?")}</h3><p className="text-sm text-muted-foreground">{t("Pilih satu sumber utama.", "Choose one main source.")}</p></div>
            <div className="grid gap-2 sm:grid-cols-2">{sources.map((item) => <button key={item.id} type="button" onClick={() => setSource(item.id)} className={`flex items-center justify-between rounded-xl border px-4 py-3 text-sm transition hover:border-primary ${source === item.id ? "border-primary bg-primary/5 ring-1 ring-primary/30" : "border-border bg-card"}`}>{item.label}{source === item.id && <Check className="h-4 w-4 text-primary" />}</button>)}</div>
          </div>}

          {step === 3 && <div className="space-y-4 text-center"><Settings className="mx-auto h-16 w-16 text-primary" /><div><h3 className="text-xl font-semibold">{t("Lanjut setup account di Settings", "Continue account setup in Settings")}</h3><p className="mt-1 text-sm text-muted-foreground">{t("Lengkapi profil akun, workspace, invoice, team, dan billing.", "Complete account profile, workspace, invoice, team, and billing.")}</p></div><div className="mx-auto grid max-w-sm gap-2 rounded-xl border bg-muted/30 p-3 text-left text-sm"><div><span className="text-muted-foreground">Plan:</span> <strong>{plans.find((item) => item.id === plan)?.title}</strong></div><div><span className="text-muted-foreground">{t("Sumber", "Source")}:</span> <strong>{sources.find((item) => item.id === source)?.label}</strong></div></div></div>}
        </div>

        {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
        <div className="flex items-center justify-between gap-3">
          {step > 1 ? <Button variant="outline" onClick={() => setStep(step - 1)} disabled={pending}><ArrowLeft className="mr-1 h-4 w-4" />{t("Kembali", "Back")}</Button> : <span />}
          {step < 3 ? <Button onClick={next} disabled={(step === 1 && !plan) || (step === 2 && !source)}>{t("Lanjut", "Continue")}<ArrowRight className="ml-1 h-4 w-4" /></Button> : <Button onClick={finish} disabled={pending}>{pending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}{t("Buka Settings", "Open Settings")}</Button>}
        </div>
      </DialogContent>
    </Dialog>
  );
}
