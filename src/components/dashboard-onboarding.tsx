"use client";

import { useState } from "react";
import Link from "next/link";
import { ChevronDown, ChevronRight, ChevronUp, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

export interface OnboardingStep {
  key: string;
  done: boolean;
  href: string;
}

interface DashboardOnboardingProps {
  lang: "id" | "en";
  steps: OnboardingStep[];
}

const COPY: Record<
  string,
  { id: { title: string; desc: string }; en: { title: string; desc: string } }
> = {
  workspace: {
    id: { title: "Lengkapi profil workspace", desc: "Nama bisnis, email, alamat, dan logo." },
    en: { title: "Complete workspace profile", desc: "Business name, email, address, and logo." },
  },
  invoiceSettings: {
    id: { title: "Atur invoice & pembayaran", desc: "Mata uang, pajak, terms, dan email invoice." },
    en: { title: "Set invoice & payment defaults", desc: "Currency, tax, terms, and invoice email." },
  },
  client: {
    id: { title: "Tambah klien pertama", desc: "Simpan kontak & data klien." },
    en: { title: "Add your first client", desc: "Save a contact and client details." },
  },
  project: {
    id: { title: "Buat proyek", desc: "Kelompokkan kerja per proyek klien." },
    en: { title: "Create a project", desc: "Group work under a client project." },
  },
  time: {
    id: { title: "Catat waktu kerja", desc: "Pakai timer atau input manual." },
    en: { title: "Track your time", desc: "Use the timer or add it manually." },
  },
  invoice: {
    id: { title: "Terbitkan invoice", desc: "Ubah kerja jadi tagihan." },
    en: { title: "Send an invoice", desc: "Turn your work into a bill." },
  },
  portal: {
    id: {
      title: "Aktifkan portal klien",
      desc: "Generate token, share file hasil kerja, kirim link.",
    },
    en: {
      title: "Activate client portal",
      desc: "Generate token, share deliverables, send the link.",
    },
  },
};

export function DashboardOnboarding({ lang, steps }: DashboardOnboardingProps) {
  const [expanded, setExpanded] = useState(false);
  const t = (id: string, en: string) => (lang === "en" ? en : id);

  const doneCount = steps.filter((s) => s.done).length;
  const total = steps.length;
  const pendingSteps = steps.filter((step) => !step.done);
  const visibleSteps = expanded ? steps : (pendingSteps.length > 0 ? pendingSteps.slice(0, 3) : steps);

  const pct = Math.round((doneCount / total) * 100);

  if (total > 0 && doneCount === total) return null;

  return (
    <div className="relative overflow-hidden rounded-xl border border-blue-200 bg-gradient-to-br from-blue-50 via-indigo-50 to-white p-5 shadow-sm">
      <div className="absolute -right-10 -top-10 h-36 w-36 rounded-full bg-blue-200/30 blur-2xl" />
      <div className="relative">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-full bg-blue-600 text-white">
              <Sparkles className="h-4 w-4" />
            </div>
            <div>
              <h2 className="text-sm font-semibold tracking-tight text-blue-950">
                {t("Mulai dari Pengaturan", "Start from Settings")}
              </h2>
              <p className="text-xs text-blue-800/70">
                {t(
                  "Lengkapi workspace dan pengaturan invoice sebelum membuat proyek pertama.",
                  "Set up your workspace and invoice defaults before creating your first project.",
                )}
              </p>
              <p className="text-xs text-blue-800/70">{t(`${doneCount} dari ${total} langkah selesai`, `${doneCount} of ${total} steps done`)}</p>
            </div>
          </div>

        </div>

        {/* Progress bar */}
        <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-blue-100">
          <div
            className="h-full rounded-full bg-blue-600 transition-all duration-500"
            style={{ width: `${pct}%` }}
          />
        </div>

        {/* Next actions */}
        <div className="mt-4 space-y-2">
          {visibleSteps.map((step) => {
            const copy = COPY[step.key]?.[lang] ?? { title: step.key, desc: "" };
            return (
              <Link
                key={step.key}
                href={step.href}
                className={cn(
                  "group flex min-h-11 items-center gap-3 rounded-lg border border-blue-200 bg-white/70 px-3 py-2.5 transition-all hover:border-blue-400 hover:shadow-sm"
                )}
              >
                <div className={cn("flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full border text-xs font-semibold", step.done ? "border-emerald-500 bg-emerald-50 text-emerald-600" : "border-blue-300 text-blue-600")}>
                  {step.done ? "✓" : ""}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-slate-900">{copy.title}</p>
                  <p className="line-clamp-1 text-xs text-muted-foreground">
                    {copy.desc}
                  </p>
                </div>
                <ChevronRight className="h-4 w-4 flex-shrink-0 text-blue-400 transition-transform group-hover:translate-x-0.5" />
              </Link>
            );
          })}
        </div>
        {pendingSteps.length > 3 && (
          <button
            type="button"
            onClick={() => setExpanded((value) => !value)}
            className="mt-2 flex min-h-11 w-full items-center justify-center gap-1.5 rounded-lg text-xs font-semibold text-blue-700 transition-colors hover:bg-blue-100/70"
            aria-expanded={expanded}
          >
            {expanded
              ? t("Ringkas langkah", "Show fewer steps")
              : t(`Lihat ${pendingSteps.length - 3} langkah lagi`, `Show ${pendingSteps.length - 3} more steps`)}
            {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </button>
        )}
      </div>
    </div>
  );
}
