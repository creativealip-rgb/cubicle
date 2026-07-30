"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useTransition } from "react";
import { cn } from "@/lib/utils";
import { useT } from "@/lib/i18n-client";

export function TaskBehaviorTabs({ current }: { current?: string }) {
  const { t } = useT();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [pending, startTransition] = useTransition();
  const selected = current === "one_time" || current === "recurring" ? current : "all";
  const tabs = [
    { value: "all", label: t("Semua", "All") },
    { value: "one_time", label: t("Sekali selesai", "One-time") },
    { value: "recurring", label: t("Aktivitas berulang", "Recurring activity") },
  ];

  function apply(value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value === "all") params.delete("behavior");
    else params.set("behavior", value);
    startTransition(() => router.push(`/app/tasks${params.size ? `?${params.toString()}` : ""}`));
  }

  return (
    <div className="flex max-w-full gap-1 overflow-x-auto rounded-lg border bg-muted/40 p-1" aria-busy={pending}>
      {tabs.map((tab) => (
        <button key={tab.value} type="button" onClick={() => apply(tab.value)} className={cn("whitespace-nowrap rounded-md px-3 py-2 text-xs font-medium transition-colors", selected === tab.value ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground")}>
          {tab.label}
        </button>
      ))}
    </div>
  );
}
