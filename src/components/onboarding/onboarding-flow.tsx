"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAppTransition } from "@/lib/transition-provider";
import { ArrowLeft, ArrowRight, BriefcaseBusiness, Check, Loader2, Settings, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { finishOnboarding } from "@/lib/actions/onboarding";

type PlanChoice = "solo" | "team" | "enterprise";
type SourceChoice = "instagram" | "google" | "friend" | "tiktok" | "other";

const steps = [
  { id: 1, label: "Plan", icon: BriefcaseBusiness },
  { id: 2, label: "Sumber", icon: Sparkles },
  { id: 3, label: "Setup", icon: Settings },
];

const plans: Array<{ id: PlanChoice; title: string; note: string }> = [
  { id: "solo", title: "Solo", note: "Untuk kerja sendiri dan mulai cepat." },
  { id: "team", title: "Team", note: "Untuk kolaborasi dengan tim kecil." },
  { id: "enterprise", title: "Enterprise", note: "Untuk operasional besar dan kebutuhan khusus." },
];

const sources: Array<{ id: Exclude<SourceChoice, "other">; label: string }> = [
  { id: "instagram", label: "Instagram" },
  { id: "google", label: "Google" },
  { id: "friend", label: "Teman / rekomendasi" },
  { id: "tiktok", label: "TikTok" },
];

export function OnboardingFlow() {
  const router = useRouter();
  const { refresh } = useAppTransition();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [plan, setPlan] = useState<PlanChoice | "">("");
  const [source, setSource] = useState<SourceChoice | "">("");
  const [sourceOther, setSourceOther] = useState("");

  async function finish() {
    if (!plan || !source || loading) return;
    setLoading(true);
    setError(null);
    try {
      await finishOnboarding({ plan, source, sourceOther: sourceOther.trim() || undefined });
      router.push("/app/settings?tab=account");
      refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Gagal menyelesaikan onboarding.");
      setLoading(false);
    }
  }

  function next() {
    if (step === 1 && !plan) return;
    if (step === 2 && !source) return;
    setStep((current) => Math.min(3, current + 1));
  }

  return (
    <div className="flex min-h-screen w-full items-center justify-center bg-[radial-gradient(circle_at_top,#F0ECFF,transparent_36%),#FBFAFE] px-4 py-8">
      <Card className="w-full max-w-xl rounded-3xl border-slate-200 bg-white/95 shadow-2xl shadow-slate-200/60">
        <CardHeader className="space-y-4 text-center">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo-header.png" alt="Cubiqlo" className="mx-auto h-9 w-auto object-contain" />
          <div className="flex items-center justify-center gap-2">
            {steps.map((item, index) => {
              const Icon = item.icon;
              const done = item.id < step;
              const active = item.id === step;
              return (
                <div key={item.id} className="flex items-center gap-2">
                  <div className={`flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium ${active ? "bg-primary text-primary-foreground" : done ? "bg-emerald-100 text-emerald-700" : "bg-muted text-muted-foreground"}`}>
                    {done ? <Check className="h-3 w-3" /> : <Icon className="h-3 w-3" />}
                    {item.label}
                  </div>
                  {index < steps.length - 1 && <div className="h-px w-5 bg-border" />}
                </div>
              );
            })}
          </div>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Setup akun Cubiqlo</h1>
            <p className="mt-1 text-sm text-muted-foreground">Jawab beberapa pertanyaan dulu, lalu lanjut setup di Settings.</p>
          </div>
        </CardHeader>

        <CardContent className="min-h-72 space-y-4">
          {error && <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</div>}

          {step === 1 && (
            <div className="space-y-3">
              <div className="text-center"><BriefcaseBusiness className="mx-auto h-12 w-12 text-primary" /><h2 className="mt-2 text-lg font-semibold">Pilih tipe akun</h2><p className="text-sm text-muted-foreground">Ini membantu kami menyiapkan flow yang pas.</p></div>
              <div className="grid gap-3 sm:grid-cols-3">
                {plans.map((item) => (
                  <button key={item.id} type="button" onClick={() => setPlan(item.id)} className={`rounded-xl border p-4 text-left transition hover:border-primary ${plan === item.id ? "border-primary bg-primary/5 ring-1 ring-primary/30" : "border-border bg-card"}`}>
                    <span className="font-semibold">{item.title}</span>
                    <span className="mt-2 block text-xs leading-5 text-muted-foreground">{item.note}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-3">
              <div className="text-center"><Sparkles className="mx-auto h-12 w-12 text-primary" /><h2 className="mt-2 text-lg font-semibold">Tau Cubiqlo dari mana?</h2><p className="text-sm text-muted-foreground">Pilih satu sumber utama.</p></div>
              <div className="grid gap-2 sm:grid-cols-2">
                {sources.map((item) => (
                  <button key={item.id} type="button" onClick={() => { setSource(item.id); setSourceOther(""); }} className={`flex items-center justify-between rounded-xl border px-4 py-3 text-sm transition hover:border-primary ${source === item.id ? "border-primary bg-primary/5 ring-1 ring-primary/30" : "border-border bg-card"}`}>
                    {item.label}
                    {source === item.id && <Check className="h-4 w-4 text-primary" />}
                  </button>
                ))}
                <div className={`relative flex items-center rounded-xl border transition ${source === "other" ? "border-primary bg-primary/5 ring-1 ring-primary/30" : "border-border bg-card"}`}>
                  <Input
                    value={sourceOther}
                    onFocus={() => setSource("other")}
                    onChange={(event) => {
                      setSourceOther(event.target.value);
                      setSource("other");
                    }}
                    placeholder="Lainnya (tulis manual)..."
                    className="h-11 border-0 bg-transparent pr-9 text-sm shadow-none focus-visible:ring-0"
                  />
                  {source === "other" && <Check className="pointer-events-none absolute right-3 h-4 w-4 text-primary" />}
                </div>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-4 text-center">
              <Settings className="mx-auto h-16 w-16 text-primary" />
              <div><h2 className="text-xl font-semibold">Setup account di Settings</h2><p className="mt-1 text-sm text-muted-foreground">Kami akan arahkan ke Settings untuk lengkapi profil akun, workspace, invoice, team, dan billing.</p></div>
              <div className="mx-auto grid max-w-sm gap-2 rounded-xl border bg-muted/30 p-3 text-left text-sm">
                <div><span className="text-muted-foreground">Plan:</span> <strong>{plans.find((item) => item.id === plan)?.title}</strong></div>
                <div><span className="text-muted-foreground">Sumber:</span> <strong>{sources.find((item) => item.id === source)?.label}</strong></div>
              </div>
            </div>
          )}
        </CardContent>

        <CardFooter className="flex justify-between gap-3">
          {step > 1 ? <Button variant="outline" onClick={() => setStep(step - 1)} disabled={loading}><ArrowLeft className="h-4 w-4" />Kembali</Button> : <div />}
          {step < 3 ? <Button onClick={next} disabled={(step === 1 && !plan) || (step === 2 && !source)}>Lanjut<ArrowRight className="h-4 w-4" /></Button> : <Button onClick={finish} disabled={loading}>{loading && <Loader2 className="h-4 w-4 animate-spin" />}Buka Settings</Button>}
        </CardFooter>
      </Card>
    </div>
  );
}
