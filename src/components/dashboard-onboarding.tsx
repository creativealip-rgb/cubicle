"use client";

import { useState } from "react";
import Link from "next/link";
import {
  BookOpen,
  Globe,
  Sparkles,
  UserPlus,
  ArrowUpRight,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";

export interface OnboardingStep {
  key: "client" | "landingpage" | "personal" | "docs" | string;
  done: boolean;
  href: string;
}

interface DashboardOnboardingProps {
  lang: "id" | "en";
  steps: OnboardingStep[];
}

const STEP_META: Record<
  string,
  {
    icon: typeof UserPlus;
    id: { title: string; desc: string };
    en: { title: string; desc: string };
  }
> = {
  client: {
    icon: UserPlus,
    id: { title: "Tambah Klien Pertama", desc: "Simpan kontak & detail klien baru." },
    en: { title: "Add first client", desc: "Save contact and client details." },
  },
  landingpage: {
    icon: Globe,
    id: { title: "Buat Landing Page", desc: "Publikasikan website portfolio bisnismu." },
    en: { title: "Create Landing Page", desc: "Publish your personal or agency website." },
  },
  personal: {
    icon: Sparkles,
    id: { title: "Setup Personal Activity", desc: "Atur daily goals, habit & catatan." },
    en: { title: "Setup your personal activity", desc: "Manage daily goals, habits & notes." },
  },
  docs: {
    icon: BookOpen,
    id: { title: "Cek Documentation Hub", desc: "Pelajari panduan fitur & alur kerja." },
    en: { title: "Check Documentation Hub", desc: "Explore workflow guides and features." },
  },
};

export function DashboardOnboarding({ lang, steps }: DashboardOnboardingProps) {
  const [dismissed, setDismissed] = useState(false);
  const t = (id: string, en: string) => (lang === "en" ? en : id);

  const doneCount = steps.filter((s) => s.done).length;
  const total = steps.length;
  const pct = total > 0 ? Math.round((doneCount / total) * 100) : 0;
  const pendingSteps = steps.filter((s) => !s.done);

  if (dismissed || (total > 0 && doneCount === total) || pendingSteps.length === 0) return null;

  return (
    <div className="relative overflow-hidden rounded-2xl border border-slate-200/80 bg-white/95 p-5 shadow-xs transition-all backdrop-blur-sm">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-4">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <Sparkles className="h-4 w-4" />
          </div>
          <div>
            <h2 className="text-sm font-bold tracking-tight text-slate-900">
              {t("Langkah Awal Memulai", "Getting Started Checklist")}
            </h2>
            <p className="text-xs text-muted-foreground">
              {t(
                "Selesaikan langkah berikut untuk memaksimalkan workspace Cubiqlo kamu.",
                "Complete these initial steps to get the most out of Cubiqlo.",
              )}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-700">
            <span>
              {doneCount}/{total} {t("selesai", "completed")}
            </span>
            <div className="h-2 w-24 overflow-hidden rounded-full bg-slate-100">
              <div
                className="h-full rounded-full bg-primary transition-all duration-500"
                style={{ width: `${pct}%` }}
              />
            </div>
          </div>

          <button
            type="button"
            onClick={() => setDismissed(true)}
            className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
            title={t("Tutup", "Dismiss")}
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Pending Steps Cards Grid Layout */}
      <div
        className={cn(
          "mt-4 grid gap-3",
          pendingSteps.length === 1
            ? "grid-cols-1"
            : pendingSteps.length === 2
              ? "grid-cols-1 sm:grid-cols-2"
              : pendingSteps.length === 3
                ? "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3"
                : "grid-cols-1 sm:grid-cols-2 lg:grid-cols-4"
        )}
      >
        {pendingSteps.map((step) => {
          const meta = STEP_META[step.key] || {
            icon: Sparkles,
            id: { title: step.key, desc: "" },
            en: { title: step.key, desc: "" },
          };
          const Icon = meta.icon;
          const copy = meta[lang];

          return (
            <Link
              key={step.key}
              href={step.href}
              className="group relative flex flex-col justify-between rounded-xl border border-slate-200/80 bg-slate-50/40 p-4 transition-all duration-150 hover:border-primary/40 hover:bg-primary/[0.02] hover:shadow-sm"
            >
              <div>
                <div className="flex items-start justify-between gap-2">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white text-slate-700 shadow-xs transition group-hover:bg-primary group-hover:text-white">
                    <Icon className="h-4 w-4" />
                  </div>
                  <ArrowUpRight className="h-4 w-4 text-slate-400 shrink-0 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-primary" />
                </div>

                <div className="mt-3">
                  <h3 className="text-xs font-bold text-slate-900 transition group-hover:text-primary">
                    {copy.title}
                  </h3>
                  <p className="mt-0.5 text-[11px] leading-relaxed text-muted-foreground">
                    {copy.desc}
                  </p>
                </div>
              </div>

              <div className="mt-3 flex items-center text-[10px] font-semibold">
                <span className="text-primary group-hover:underline">{t("Mulai sekarang →", "Start now →")}</span>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
