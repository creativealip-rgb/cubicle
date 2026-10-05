"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAppTransition } from "@/lib/transition-provider";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { finishOnboarding } from "@/lib/actions/onboarding";
import { useT } from "@/lib/i18n-client";

type PlanChoice = "free" | "solo" | "team";
type SourceChoice =
  | "google"
  | "instagram"
  | "tiktok"
  | "youtube"
  | "friend"
  | "articles"
  | "other";

const COUNTRIES = [
  "Indonesia",
  "Malaysia",
  "Singapore",
  "United States",
  "Australia",
  "United Kingdom",
  "Germany",
  "Netherlands",
  "Japan",
  "South Korea",
  "India",
  "Philippines",
  "Thailand",
  "Vietnam",
  "Canada",
  "France",
  "Brazil",
  "United Arab Emirates",
  "Saudi Arabia",
  "Other Country",
];

const INDUSTRIES = [
  { value: "digital_agency", label: "Digital Agency" },
  { value: "freelancer", label: "Freelancer / Individual Contractor" },
  { value: "tech_software", label: "Tech & Software Development" },
  { value: "creative_design", label: "Creative & Design Studio" },
  { value: "consulting", label: "Consulting & Professional Services" },
  { value: "marketing_media", label: "Marketing & Content Creation" },
  { value: "ecommerce", label: "E-Commerce & Retail" },
  { value: "other", label: "Other" },
];

const TEAM_SIZES = [
  { value: "1", label: "1" },
  { value: "2-5", label: "2 - 5" },
  { value: "6-10", label: "6 - 10" },
  { value: "11-15", label: "11 - 15" },
  { value: "15+", label: "15+" },
];

const SOURCES: Array<{ id: SourceChoice; label: { id: string; en: string } }> = [
  { id: "google", label: { id: "Google Search", en: "Google Search" } },
  { id: "instagram", label: { id: "Instagram", en: "Instagram" } },
  { id: "tiktok", label: { id: "TikTok", en: "TikTok" } },
  { id: "youtube", label: { id: "YouTube", en: "YouTube" } },
  { id: "friend", label: { id: "Teman", en: "Friends" } },
  { id: "articles", label: { id: "Artikel", en: "Articles" } },
  { id: "other", label: { id: "Lainnya", en: "Others" } },
];

export function OnboardingFlow() {
  const router = useRouter();
  const { refresh } = useAppTransition();
  const { t } = useT();

  const [step, setStep] = useState<1 | 2>(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Page 1 state
  const [name, setName] = useState("");
  const [birthDate, setBirthDate] = useState("");
  const [country, setCountry] = useState("");
  const [city, setCity] = useState("");
  const [source, setSource] = useState<SourceChoice | "">("");
  const [sourceOther, setSourceOther] = useState("");

  // Page 2 state
  const [businessName, setBusinessName] = useState("");
  const [industry, setIndustry] = useState("");
  const [plan, setPlan] = useState<PlanChoice>("free");
  const [teamSize, setTeamSize] = useState("1");

  function canProceedPage1() {
    if (!name.trim()) return false;
    if (!birthDate.trim()) return false;
    if (!country.trim()) return false;
    if (!city.trim()) return false;
    if (!source) return false;
    if (source === "other" && !sourceOther.trim()) return false;
    return true;
  }

  function canSubmitPage2() {
    if (!businessName.trim()) return false;
    if (!industry.trim()) return false;
    if (!plan) return false;
    if (!teamSize.trim()) return false;
    return true;
  }

  async function handleFinish() {
    if (!canSubmitPage2() || loading) return;
    setLoading(true);
    setError(null);
    try {
      const res = await finishOnboarding({
        name: name.trim(),
        birthDate: birthDate.trim(),
        country: country.trim(),
        city: city.trim(),
        source: source as SourceChoice,
        sourceOther: source === "other" ? sourceOther.trim() : undefined,
        businessName: businessName.trim(),
        industry: industry.trim(),
        plan,
        teamSize,
      });

      if (res.redirectTo) {
        router.push(res.redirectTo);
      } else {
        router.push("/app/settings?tab=account");
      }
      refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : t("Gagal menyelesaikan onboarding.", "Failed to complete onboarding."));
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen w-full items-center justify-center bg-muted/20 px-4 py-8">
      <Card className="w-full max-w-lg rounded-2xl border border-border/80 bg-background shadow-lg">
        {/* Top Progress Track */}
        <div className="h-1 w-full bg-muted">
          <div
            className="h-full bg-primary transition-all duration-300"
            style={{ width: `${(step / 2) * 100}%` }}
          />
        </div>

        <CardHeader className="space-y-2 pb-4 pt-6 text-center">
          <div className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">
            {t(`Langkah ${step} dari 2`, `Step ${step} of 2`)}
          </div>
          <h1 className="text-xl font-bold tracking-tight text-foreground sm:text-2xl">
            {step === 1 && t("Profil & Sumber Informasi", "Profile & Discovery")}
            {step === 2 && t("Detail Bisnis & Workspace", "Business & Workspace Scale")}
          </h1>
          <p className="text-xs text-muted-foreground sm:text-sm">
            {step === 1 && t("Lengkapi profil Anda", "Complete your profile")}
            {step === 2 && t("Atur bisnis & paket akun Anda", "Set your business & plan")}
          </p>
        </CardHeader>

        <CardContent className="space-y-4 px-6 py-2">
          {error && (
            <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-xs text-destructive">
              {error}
            </div>
          )}

          {/* ──────── PAGE 1: PROFIL & REFERENSI ──────── */}
          {step === 1 && (
            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="ob-name" className="text-xs font-semibold">
                  {t("Nama Lengkap *", "Full Name *")}
                </Label>
                <Input
                  id="ob-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder={t("Nama Anda", "Your full name")}
                  className="h-9 text-xs sm:text-sm"
                  autoFocus
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="ob-birth" className="text-xs font-semibold">
                    {t("Tanggal Lahir *", "Birth Date *")}
                  </Label>
                  <Input
                    id="ob-birth"
                    type="date"
                    value={birthDate}
                    onChange={(e) => setBirthDate(e.target.value)}
                    className="h-9 text-xs sm:text-sm"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="ob-country" className="text-xs font-semibold">
                    {t("Lokasi Negara *", "Country *")}
                  </Label>
                  <Select value={country} onValueChange={setCountry}>
                    <SelectTrigger id="ob-country" className="h-9 text-xs sm:text-sm">
                      <SelectValue placeholder={t("Pilih negara", "Select country")} />
                    </SelectTrigger>
                    <SelectContent className="max-h-56">
                      {COUNTRIES.map((c) => (
                        <SelectItem key={c} value={c} className="text-xs sm:text-sm">
                          {c}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="ob-city" className="text-xs font-semibold">
                  {t("Kota Domisili *", "City *")}
                </Label>
                <Input
                  id="ob-city"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  placeholder={t("Contoh: Jakarta, Surabaya, Bali", "e.g. London, New York, Jakarta")}
                  className="h-9 text-xs sm:text-sm"
                />
              </div>

              <div className="space-y-2 pt-1">
                <Label className="text-xs font-semibold">
                  {t("Tahu Cubiqlo dari mana? *", "How did you find Cubiqlo? *")}
                </Label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {SOURCES.map((s) => {
                    const active = source === s.id;
                    return (
                      <button
                        key={s.id}
                        type="button"
                        onClick={() => {
                          setSource(s.id);
                          if (s.id !== "other") setSourceOther("");
                        }}
                        className={`rounded-lg border px-3 py-2 text-center text-xs font-medium transition-all ${
                          active
                            ? "border-primary bg-primary text-primary-foreground font-semibold shadow-xs"
                            : "border-border/80 bg-background text-foreground hover:border-border hover:bg-muted/40"
                        }`}
                      >
                        {t(s.label.id, s.label.en)}
                      </button>
                    );
                  })}
                </div>

                {source === "other" && (
                  <div className="pt-1 animate-in fade-in-50 duration-200">
                    <Input
                      autoFocus
                      value={sourceOther}
                      onChange={(e) => setSourceOther(e.target.value)}
                      placeholder={t("Sebutkan sumber lainnya...", "Tell us other source...")}
                      className="h-9 text-xs sm:text-sm"
                    />
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ──────── PAGE 2: BISNIS & PILIHAN AKUN ──────── */}
          {step === 2 && (
            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="ob-business" className="text-xs font-semibold">
                  {t("Nama Bisnis / Studio *", "Business / Studio Name *")}
                </Label>
                <Input
                  id="ob-business"
                  value={businessName}
                  onChange={(e) => setBusinessName(e.target.value)}
                  placeholder={t("Contoh: Arka Digital Studio", "e.g. Acme Creative Lab")}
                  className="h-9 text-xs sm:text-sm"
                  autoFocus
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="ob-industry" className="text-xs font-semibold">
                    {t("Bidang Bisnis *", "Industry *")}
                  </Label>
                  <Select value={industry} onValueChange={setIndustry}>
                    <SelectTrigger id="ob-industry" className="h-9 text-xs sm:text-sm">
                      <SelectValue placeholder={t("Pilih bidang", "Select industry")} />
                    </SelectTrigger>
                    <SelectContent>
                      {INDUSTRIES.map((ind) => (
                        <SelectItem key={ind.value} value={ind.value} className="text-xs sm:text-sm">
                          {ind.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="ob-teamsize" className="text-xs font-semibold">
                    {t("Jumlah Anggota Tim *", "Team Size *")}
                  </Label>
                  <Select value={teamSize} onValueChange={setTeamSize}>
                    <SelectTrigger id="ob-teamsize" className="h-9 text-xs sm:text-sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {TEAM_SIZES.map((ts) => (
                        <SelectItem key={ts.value} value={ts.value} className="text-xs sm:text-sm">
                          {ts.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2 pt-1">
                <Label className="text-xs font-semibold">
                  {t("Kebutuhan Akun (Pilihan Paket) *", "Account Plan Requirement *")}
                </Label>
                <div className="grid gap-2 sm:grid-cols-3">
                  {/* Free Plan */}
                  <button
                    type="button"
                    onClick={() => setPlan("free")}
                    className={`rounded-xl border p-3 text-left transition-all ${
                      plan === "free"
                        ? "border-primary bg-primary/[0.04] ring-1 ring-primary"
                        : "border-border/80 bg-background hover:border-border hover:bg-muted/30"
                    }`}
                  >
                    <div className="text-xs font-bold text-foreground">Free Forever</div>
                    <div className="text-[11px] text-muted-foreground mt-0.5">$0</div>
                    <p className="mt-2 text-[10px] text-muted-foreground leading-snug">
                      {t("Fitur inti, 1 workspace aktif untuk mulai cepat.", "Core features, 1 active workspace.")}
                    </p>
                  </button>

                  {/* Solo Plan */}
                  <button
                    type="button"
                    onClick={() => setPlan("solo")}
                    className={`rounded-xl border p-3 text-left transition-all ${
                      plan === "solo"
                        ? "border-primary bg-primary/[0.04] ring-1 ring-primary"
                        : "border-border/80 bg-background hover:border-border hover:bg-muted/30"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-foreground">Solo</span>
                    </div>
                    <div className="text-[11px] text-primary font-semibold mt-0.5">$9 / mo</div>
                    <p className="mt-2 text-[10px] text-muted-foreground leading-snug">
                      {t("Klien unlimited, custom slug & branding penuh.", "Unlimited clients & custom branding.")}
                    </p>
                  </button>

                  {/* Team Plan */}
                  <button
                    type="button"
                    onClick={() => setPlan("team")}
                    className={`rounded-xl border p-3 text-left transition-all ${
                      plan === "team"
                        ? "border-primary bg-primary/[0.04] ring-1 ring-primary"
                        : "border-border/80 bg-background hover:border-border hover:bg-muted/30"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-foreground">Team</span>
                    </div>
                    <div className="text-[11px] text-primary font-semibold mt-0.5">$19 / mo</div>
                    <p className="mt-2 text-[10px] text-muted-foreground leading-snug">
                      {t("Multi-member, delegasi tugas & kolaborasi agensi.", "Multi-member team collaboration.")}
                    </p>
                  </button>
                </div>
              </div>
            </div>
          )}
        </CardContent>

        <CardFooter className="flex justify-between border-t border-border/80 bg-muted/20 px-6 py-4">
          {step === 2 ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setStep(1)}
              disabled={loading}
              className="text-xs"
            >
              {t("Kembali", "Back")}
            </Button>
          ) : (
            <div />
          )}

          {step === 1 ? (
            <Button
              type="button"
              size="sm"
              onClick={() => {
                if (canProceedPage1()) setStep(2);
              }}
              disabled={!canProceedPage1()}
              className="px-5 text-xs font-semibold"
            >
              {t("Lanjut →", "Continue →")}
            </Button>
          ) : (
            <Button
              type="button"
              size="sm"
              onClick={handleFinish}
              disabled={!canSubmitPage2() || loading}
              className="px-5 text-xs font-semibold"
            >
              {loading
                ? t("Menyimpan...", "Saving...")
                : plan === "free"
                  ? t("Selesai & Masuk Akun →", "Finish & Enter →")
                  : t("Lanjut ke Pembayaran →", "Proceed to Payment →")}
            </Button>
          )}
        </CardFooter>
      </Card>
    </div>
  );
}
