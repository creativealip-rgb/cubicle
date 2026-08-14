"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { cn } from "@/lib/utils";
import { useT } from "@/lib/i18n-client";

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
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="app-page-title">{t("Waktu", "Time")}</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {t("Catat waktu dan isi timesheet mingguan.", "Log time and fill weekly timesheets.")}
          </p>
        </div>
        {actions && (
          <div className="flex w-full flex-wrap gap-2 sm:w-auto sm:justify-end">
            {actions}
          </div>
        )}
      </div>

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
                  "min-h-11 shrink-0 border-b-2 px-2.5 py-2 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 sm:px-3",
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
