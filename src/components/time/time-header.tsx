"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BarChart3, ChevronDown, ReceiptText, Settings2 } from "lucide-react";
import { cn } from "@/lib/utils";

const primaryTabs = [
  { href: "/app/time", label: "Timer", mobileLabel: "Timer" },
  { href: "/app/time/timesheet", label: "Lembar Waktu", mobileLabel: "Lembar" },
  { href: "/app/time/history", label: "Riwayat", mobileLabel: "Riwayat" },
] as const;

const secondaryItems = [
  { href: "/app/time/approvals", label: "Persetujuan", icon: Settings2 },
  { href: "/app/time/activities", label: "Kelola Aktivitas", icon: Settings2 },
  { href: "/app/reports?tab=time", label: "Laporan Waktu", icon: BarChart3 },
  { href: "/app/invoices?tab=uninvoiced", label: "Belum Ditagihkan", icon: ReceiptText },
] as const;

export function TimeHeader() {
  const pathname = usePathname();
  const secondaryActive = pathname === "/app/time/approvals" || pathname === "/app/time/activities";

  return (
    <header className="space-y-3 sm:space-y-4">
      <div>
        <h1 className="app-page-title">Pelacakan Waktu</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Catat waktu, tinjau lembar mingguan, dan kelola persetujuan.
        </p>
      </div>

      <div className="border-b">
        <div className="flex min-w-0 items-end justify-between gap-2">
          <nav aria-label="Navigasi waktu" className="flex min-w-0 gap-0.5 sm:gap-1">
            {primaryTabs.map((tab) => {
              const active = pathname === tab.href;
              return (
                <Link
                  key={tab.href}
                  href={tab.href}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "shrink-0 border-b-2 px-2.5 py-2 text-sm font-medium transition-colors sm:px-3",
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

            <details className="group relative sm:hidden">
              <summary
                className={cn(
                  "flex cursor-pointer list-none items-center gap-1 border-b-2 px-2.5 py-2 text-sm font-medium [&::-webkit-details-marker]:hidden",
                  secondaryActive ? "border-primary text-foreground" : "border-transparent text-muted-foreground",
                )}
              >
                Lainnya <ChevronDown className="h-3.5 w-3.5 transition-transform group-open:rotate-180" />
              </summary>
              <div className="absolute right-0 top-full z-40 mt-2 w-56 rounded-xl border bg-background p-1.5 shadow-xl">
                {secondaryItems.map((item) => {
                  const Icon = item.icon;
                  const active = pathname === item.href.split("?")[0];
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      aria-current={active ? "page" : undefined}
                      className={cn(
                        "flex min-h-11 items-center gap-2 rounded-lg px-3 text-sm font-medium",
                        active ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-muted hover:text-foreground",
                      )}
                    >
                      <Icon className="h-4 w-4" />
                      {item.label}
                    </Link>
                  );
                })}
              </div>
            </details>
          </nav>

          <div className="mb-1.5 hidden shrink-0 items-center gap-1 sm:flex">
            <Link
              href="/app/time/approvals"
              className={cn("rounded-lg px-2.5 py-1.5 text-sm font-medium hover:bg-muted", pathname === "/app/time/approvals" ? "text-primary" : "text-muted-foreground")}
            >
              Persetujuan
            </Link>
            <Link
              href="/app/time/activities"
              className={cn("rounded-lg px-2.5 py-1.5 text-sm font-medium hover:bg-muted", pathname === "/app/time/activities" ? "text-primary" : "text-muted-foreground")}
            >
              Kelola Aktivitas
            </Link>
            <details className="group relative">
              <summary className="flex cursor-pointer list-none items-center gap-1 rounded-lg px-2.5 py-1.5 text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground [&::-webkit-details-marker]:hidden">
                Tautan <ChevronDown className="h-3.5 w-3.5 transition-transform group-open:rotate-180" />
              </summary>
              <div className="absolute right-0 top-full z-40 mt-2 w-52 rounded-xl border bg-background p-1.5 shadow-xl">
                {secondaryItems.slice(2).map((item) => {
                  const Icon = item.icon;
                  return <Link key={item.href} href={item.href} className="flex min-h-10 items-center gap-2 rounded-lg px-3 text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground"><Icon className="h-4 w-4" />{item.label}</Link>;
                })}
              </div>
            </details>
          </div>
        </div>
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
