"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAppTransition } from "@/lib/transition-provider";
import {
  ArrowLeft,
  ArrowRight,
  Building2,
  Camera,
  Check,
  CheckCircle2,
  Globe,
  Loader2,
  MessageSquare,
  Sparkles,
  User,
  Users,
  Video,
  MoreHorizontal,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { finishOnboarding } from "@/lib/actions/onboarding";

type PlanChoice = "solo" | "team" | "enterprise";
type SourceChoice = "instagram" | "google" | "friend" | "tiktok" | "youtube" | "other";

const plans: Array<{
  id: PlanChoice;
  title: string;
  badge?: string;
  note: string;
  icon: typeof User;
}> = [
  {
    id: "solo",
    title: "Solo",
    note: "Freelancer / individu yang ingin mulai cepat.",
    icon: User,
  },
  {
    id: "team",
    title: "Team",
    badge: "Populer",
    note: "Agensi kecil / tim kreatif untuk kolaborasi.",
    icon: Users,
  },
  {
    id: "enterprise",
    title: "Enterprise",
    note: "Organisasi besar dengan custom workflow.",
    icon: Building2,
  },
];

const predefinedSources: Array<{
  id: SourceChoice;
  label: string;
  icon: typeof Camera;
}> = [
  { id: "instagram", label: "Instagram", icon: Camera },
  { id: "tiktok", label: "TikTok", icon: Video },
  { id: "google", label: "Google Search", icon: Globe },
  { id: "youtube", label: "YouTube / Media", icon: Sparkles },
  { id: "friend", label: "Teman / Rekan", icon: MessageSquare },
  { id: "other", label: "Lainnya", icon: MoreHorizontal },
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
    if (source === "other" && !sourceOther.trim()) return;
    setLoading(true);
    setError(null);
    try {
      await finishOnboarding({
        plan,
        source: source === "youtube" ? "other" : source,
        sourceOther: source === "youtube" ? "YouTube" : source === "other" ? sourceOther.trim() : undefined,
      });
      router.push("/app/settings?tab=account");
      refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Gagal menyelesaikan onboarding.");
      setLoading(false);
    }
  }

  function next() {
    if (step === 1 && !plan) return;
    if (step === 2 && (!source || (source === "other" && !sourceOther.trim()))) return;
    setStep((current) => Math.min(3, current + 1));
  }

  const selectedPlanObj = plans.find((p) => p.id === plan);
  const selectedSourceLabel =
    source === "other"
      ? sourceOther.trim() || "Lainnya"
      : predefinedSources.find((s) => s.id === source)?.label || "";

  return (
    <div className="flex min-h-screen w-full items-center justify-center bg-[radial-gradient(circle_at_top,#F3E8FF,transparent_40%),#FAFAFA] px-4 py-8">
      <Card className="w-full max-w-lg overflow-hidden rounded-3xl border border-slate-200/80 bg-white/95 shadow-2xl shadow-purple-900/5 backdrop-blur-md">
        {/* Top Slim Progress Bar */}
        <div className="h-1.5 w-full bg-slate-100">
          <div
            className="h-full bg-primary transition-all duration-300"
            style={{ width: `${(step / 3) * 100}%` }}
          />
        </div>

        <CardHeader className="space-y-4 pb-4 pt-7 text-center">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo-header.png" alt="Cubiqlo" className="mx-auto h-8 w-auto object-contain" />

          <div>
            <span className="text-xs font-semibold tracking-wider text-primary uppercase">
              Langkah {step} dari 3
            </span>
            <h1 className="mt-1 text-xl font-bold tracking-tight text-slate-900 sm:text-2xl">
              {step === 1 && "Pilih Tipe Penggunaan"}
              {step === 2 && "Dari Mana Kamu Tau Cubiqlo?"}
              {step === 3 && "Akun Kamu Siap Digunakan!"}
            </h1>
            <p className="mt-1 text-xs text-slate-500 sm:text-sm">
              {step === 1 && "Pilih skala workspace agar pengalaman disesuaikan untukmu."}
              {step === 2 && "Bantu kami memahami channel terbaik untuk menjangkau pengguna."}
              {step === 3 && "Selesaikan onboarding untuk langsung mengatur detail akun di Settings."}
            </p>
          </div>
        </CardHeader>

        <CardContent className="min-h-64 px-6 py-2">
          {error && (
            <div className="mb-4 rounded-xl border border-destructive/20 bg-destructive/10 p-3 text-xs text-destructive">
              {error}
            </div>
          )}

          {/* STEP 1: PLAN CHOOSER */}
          {step === 1 && (
            <div className="grid gap-3">
              {plans.map((item) => {
                const Icon = item.icon;
                const active = plan === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setPlan(item.id)}
                    className={`group relative flex items-center gap-4 rounded-2xl border p-4 text-left transition-all duration-150 ${
                      active
                        ? "border-primary bg-primary/[0.03] ring-2 ring-primary/20"
                        : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50/50"
                    }`}
                  >
                    <div
                      className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl transition ${
                        active ? "bg-primary text-primary-foreground" : "bg-slate-100 text-slate-600 group-hover:bg-slate-200"
                      }`}
                    >
                      <Icon className="h-5 w-5" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-slate-900">{item.title}</span>
                        {item.badge && (
                          <span className="rounded-full bg-purple-100 px-2 py-0.5 text-[10px] font-semibold text-primary">
                            {item.badge}
                          </span>
                        )}
                      </div>
                      <p className="mt-0.5 text-xs text-slate-500">{item.note}</p>
                    </div>
                    <div
                      className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border transition ${
                        active ? "border-primary bg-primary text-white" : "border-slate-300"
                      }`}
                    >
                      {active && <Check className="h-3 w-3 stroke-[3]" />}
                    </div>
                  </button>
                );
              })}
            </div>
          )}

          {/* STEP 2: SOURCE DISCOVERY (2x3 Uniform Buttons + Dropdown Input on 'Lainnya') */}
          {step === 2 && (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-2.5">
                {predefinedSources.map((item) => {
                  const Icon = item.icon;
                  const active = source === item.id;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => {
                        setSource(item.id);
                        if (item.id !== "other") setSourceOther("");
                      }}
                      className={`flex items-center gap-2.5 rounded-xl border p-3.5 text-left transition-all duration-150 ${
                        active
                          ? "border-primary bg-primary/[0.04] ring-2 ring-primary/20"
                          : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50/50"
                      }`}
                    >
                      <Icon
                        className={`h-4 w-4 shrink-0 transition ${
                          active ? "text-primary" : "text-slate-500"
                        }`}
                      />
                      <span className="truncate text-xs font-semibold text-slate-800">{item.label}</span>
                      {active && <Check className="ml-auto h-3.5 w-3.5 shrink-0 text-primary" />}
                    </button>
                  );
                })}
              </div>

              {/* Expanding input field ONLY when 'Lainnya' is clicked */}
              {source === "other" && (
                <div className="animate-in fade-in-50 slide-in-from-top-1 duration-200">
                  <Input
                    autoFocus
                    value={sourceOther}
                    onChange={(e) => setSourceOther(e.target.value)}
                    placeholder="Beri tahu kami sumber lainnya..."
                    className="h-10 rounded-xl border-slate-300 bg-white px-3 text-xs shadow-sm focus-visible:ring-primary"
                  />
                </div>
              )}
            </div>
          )}

          {/* STEP 3: FINISH & SUMMARY */}
          {step === 3 && (
            <div className="space-y-4 py-2">
              <div className="rounded-2xl border border-purple-100 bg-purple-50/50 p-4">
                <h3 className="text-xs font-bold uppercase tracking-wider text-primary">
                  Ringkasan Akun
                </h3>
                <div className="mt-3 space-y-2.5">
                  <div className="flex items-center justify-between text-xs sm:text-sm">
                    <span className="text-slate-500">Tipe Penggunaan</span>
                    <span className="font-semibold text-slate-900">{selectedPlanObj?.title}</span>
                  </div>
                  <div className="flex items-center justify-between text-xs sm:text-sm">
                    <span className="text-slate-500">Sumber Referensi</span>
                    <span className="font-semibold text-slate-900">{selectedSourceLabel}</span>
                  </div>
                  <div className="flex items-center justify-between text-xs sm:text-sm">
                    <span className="text-slate-500">Tujuan Pertama</span>
                    <span className="font-medium text-primary">Account Settings</span>
                  </div>
                </div>
              </div>

              <div className="space-y-2 rounded-xl bg-slate-50 p-3 text-xs text-slate-600">
                <div className="flex items-start gap-2">
                  <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-600" />
                  <span>Workspace default otomatis siap digunakan.</span>
                </div>
                <div className="flex items-start gap-2">
                  <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-600" />
                  <span>Kamu bisa melengkapi profil, invoice & branding di Settings.</span>
                </div>
              </div>
            </div>
          )}
        </CardContent>

        <CardFooter className="flex justify-between border-t border-slate-100 bg-slate-50/50 px-6 py-4">
          {step > 1 ? (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setStep(step - 1)}
              disabled={loading}
              className="rounded-xl border-slate-200 text-xs font-medium"
            >
              <ArrowLeft className="mr-1.5 h-3.5 w-3.5" />
              Kembali
            </Button>
          ) : (
            <div />
          )}

          {step < 3 ? (
            <Button
              size="sm"
              onClick={next}
              disabled={
                (step === 1 && !plan) ||
                (step === 2 && (!source || (source === "other" && !sourceOther.trim())))
              }
              className="rounded-xl px-5 text-xs font-semibold"
            >
              Lanjut
              <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
            </Button>
          ) : (
            <Button
              size="sm"
              onClick={finish}
              disabled={loading}
              className="rounded-xl px-5 text-xs font-semibold"
            >
              {loading && <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />}
              Buka Settings →
            </Button>
          )}
        </CardFooter>
      </Card>
    </div>
  );
}
