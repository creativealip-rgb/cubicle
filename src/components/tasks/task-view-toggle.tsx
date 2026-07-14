"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useTransition } from "react";
import { cn } from "@/lib/utils";
import { useT } from "@/lib/i18n-client";
import { List, LayoutGrid } from "lucide-react";

export function TaskViewToggle({ current }: { current: "list" | "board" }) {
  const { t } = useT();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [, startTransition] = useTransition();

  function setView(view: "list" | "board") {
    const params = new URLSearchParams(searchParams.toString());
    if (view === "list") {
      params.delete("view");
    } else {
      params.set("view", view);
    }
    startTransition(() => {
      router.push(`/app/tasks${params.toString() ? `?${params.toString()}` : ""}`);
    });
  }

  const base = "flex items-center gap-1.5 h-8 px-3 text-xs font-medium rounded-md transition-colors";
  return (
    <div className="inline-flex items-center gap-1 rounded-lg border bg-muted/40 p-0.5">
      <button
        type="button"
        onClick={() => setView("list")}
        className={cn(base, current === "list" ? "bg-background shadow-sm" : "text-muted-foreground hover:text-foreground")}
      >
        <List className="h-3.5 w-3.5" /> {t("Daftar", "List")}
      </button>
      <button
        type="button"
        onClick={() => setView("board")}
        className={cn(base, current === "board" ? "bg-background shadow-sm" : "text-muted-foreground hover:text-foreground")}
      >
        <LayoutGrid className="h-3.5 w-3.5" /> {t("Papan", "Board")}
      </button>
    </div>
  );
}
