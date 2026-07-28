"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const tabs = [
  { href: "/app/time", label: "Timer" },
  { href: "/app/time/timesheet", label: "Lembar Waktu" },
  { href: "/app/time/history", label: "Riwayat" },
  { href: "/app/time/approvals", label: "Persetujuan" },
] as const;

export function TimeHeader() {
  const pathname = usePathname();

  return (
    <header className="space-y-4">
      <div>
        <h1 className="app-page-title">Pelacakan Waktu</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Catat waktu, tinjau lembar mingguan, dan kelola persetujuan.
        </p>
      </div>
      <div className="flex flex-col gap-3 border-b sm:flex-row sm:items-end sm:justify-between">
        <nav aria-label="Navigasi waktu" className="flex min-w-0 gap-1 overflow-x-auto">
          {tabs.map((tab) => {
            const active = pathname === tab.href;
            return (
              <Link
                key={tab.href}
                href={tab.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "shrink-0 border-b-2 px-3 py-2 text-sm font-medium transition-colors",
                  active
                    ? "border-primary text-foreground"
                    : "border-transparent text-muted-foreground hover:text-foreground",
                )}
              >
                {tab.label}
              </Link>
            );
          })}
        </nav>
        <Link
          href="/app/time/activities"
          className={cn(
            "mb-2 shrink-0 text-sm font-medium text-muted-foreground hover:text-foreground sm:ml-4",
            pathname === "/app/time/activities" && "text-foreground",
          )}
        >
          Kelola Aktivitas
        </Link>
      </div>
    </header>
  );
}

export function TimePageShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-w-0 space-y-4 sm:space-y-6">
      <TimeHeader />
      {children}
    </div>
  );
}
