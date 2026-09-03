"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { Clock } from "lucide-react";
import { cn } from "@/lib/utils";
import { useT } from "@/lib/i18n-client";
import { PageHeader } from "@/components/ui/page-header";

export function TimeHeader({ actions }: { actions?: React.ReactNode }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { t } = useT();

  const primaryTabs = [
    { href: "/app/time?view=daily", label: t("Harian", "Daily"), mobileLabel: t("Harian", "Daily") },
    { href: "/app/time?view=weekly", label: t("Mingguan", "Weekly"), mobileLabel: t("Mingguan", "Weekly") },
  ] as const;

  return (
    <header className="space-y-3 sm:space-y-4">
      <PageHeader
        icon={Clock}
        title={t("Waktu", "Time")}
        description={t("Catat durasi kerja harian dan kelola timesheet mingguan proyek.", "Log daily work hours and manage weekly project timesheets.")}
        actions={actions}
      />

      <div className="border-b">
        <nav aria-label={t("Navigasi waktu", "Time navigation")} className="flex min-w-0 gap-0.5 sm:gap-1">
          {primaryTabs.map((tab) => {
            const active = pathname === "/app/time" && (searchParams.get("view") ?? "daily") === (tab.href.includes("weekly") ? "weekly" : "daily");
            return (
              <Link
                key={tab.href}
                href={tab.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "min-h-10 shrink-0 border-b-2 px-3 py-2 text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                  active
                    ? "border-primary text-foreground"
                    : "border-transparent text-muted-foreground hover:text-foreground",
                )}
              >
                <span className="sm:hidden">{tab.mobileLabel}</span>
                <span className="hidden sm:inline">{tab.label}</span>
              </Link>
            );
          })}
        </nav>
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
