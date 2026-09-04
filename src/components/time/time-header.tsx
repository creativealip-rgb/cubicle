"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { Clock } from "lucide-react";
import { useT } from "@/lib/i18n-client";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";

export function TimeHeader({ actions }: { actions?: React.ReactNode }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { t } = useT();

  const currentView = pathname === "/app/time" ? (searchParams.get("view") ?? "daily") : "daily";

  return (
    <header className="space-y-4">
      <PageHeader
        icon={Clock}
        title={t("Waktu & Timesheet", "Time & Timesheet")}
        description={t(
          "Catat durasi kerja harian, jalankan timer proyek, dan kelola timesheet mingguan.",
          "Log daily work hours, track project timers, and manage weekly timesheets.",
        )}
        actions={actions}
      />

      {/* Segmented Pill Navigation */}
      <div className="flex items-center justify-between gap-3">
        <div className="inline-flex rounded-xl bg-muted/70 p-1 border shadow-xs">
          <Button
            asChild
            size="sm"
            variant="ghost"
            className={`h-8 rounded-lg px-4 text-xs font-semibold transition-all ${
              currentView === "daily"
                ? "bg-background text-foreground shadow-sm hover:bg-background"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Link href="/app/time?view=daily">
              {t("Harian (Daily)", "Daily")}
            </Link>
          </Button>

          <Button
            asChild
            size="sm"
            variant="ghost"
            className={`h-8 rounded-lg px-4 text-xs font-semibold transition-all ${
              currentView === "weekly"
                ? "bg-background text-foreground shadow-sm hover:bg-background"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Link href="/app/time?view=weekly">
              {t("Mingguan (Weekly)", "Weekly")}
            </Link>
          </Button>
        </div>
      </div>
    </header>
  );
}

export function TimePageShell({ children, actions }: { children: React.ReactNode; actions?: React.ReactNode }) {
  return (
    <div className="min-w-0 space-y-4 sm:space-y-6">
      <TimeHeader actions={actions} />
      {children}
    </div>
  );
}
