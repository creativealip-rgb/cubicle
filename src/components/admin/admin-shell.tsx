"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  Building2,
  CreditCard,
  LayoutDashboard,
  ScrollText,
  ShieldCheck,
  Users,
} from "lucide-react";

const NAV = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/users", label: "Users", icon: Users },
  { href: "/workspaces", label: "Workspaces", icon: Building2 },
  { href: "/payments", label: "Payments", icon: CreditCard },
  { href: "/audit", label: "Audit Log", icon: ScrollText },
  { href: "/mfa-recovery", label: "MFA Recovery", icon: ShieldCheck },
];

/**
 * Admin control-plane shell (client) — own sidebar/topbar, separate from the
 * (app) AppShell. Visible URLs on admin.cubiqlo.com are the clean paths
 * (/dashboard, /users, ...); the proxy rewrites them to /admin/* internally,
 * so internal links use the clean hrefs.
 */
export function AdminShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="flex min-h-screen bg-slate-50">
      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-56 flex-col border-r border-slate-200 bg-white md:flex">
        <div className="flex items-center gap-2 border-b border-slate-100 px-4 py-4">
          <ShieldCheck className="h-5 w-5 text-[#6647F0]" />
          <div>
            <p className="text-sm font-semibold leading-tight text-[#292D34]">Cubiqlo Admin</p>
            <p className="text-xs text-muted-foreground">Control plane</p>
          </div>
        </div>
        <nav className="flex-1 space-y-1 p-3">
          {NAV.map(({ href, label, icon: Icon }) => {
            const active = pathname?.startsWith(href);
            return (
              <Link
                key={href}
                href={href}
                className={cn(
                  "flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                  active
                    ? "bg-[#6647F0] text-white"
                    : "text-[#292D34] hover:bg-slate-100",
                )}
              >
                <Icon className="h-4 w-4 shrink-0" />
                {label}
              </Link>
            );
          })}
        </nav>
        <div className="border-t border-slate-100 p-3 text-xs text-muted-foreground">
          admin.cubiqlo.com
        </div>
      </aside>

      {/* Mobile top bar + horizontal nav */}
      <div className="fixed inset-x-0 top-0 z-30 border-b border-slate-200 bg-white md:hidden">
        <div className="flex items-center gap-2 px-4 py-2.5">
          <ShieldCheck className="h-5 w-5 text-[#6647F0]" />
          <span className="text-sm font-semibold text-[#292D34]">Cubiqlo Admin</span>
        </div>
        <nav className="flex gap-1 overflow-x-auto px-2 pb-2">
          {NAV.map(({ href, label, icon: Icon }) => {
            const active = pathname?.startsWith(href);
            return (
              <Link
                key={href}
                href={href}
                className={cn(
                  "flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors",
                  active ? "bg-[#6647F0] text-white" : "bg-slate-100 text-[#292D34]",
                )}
              >
                <Icon className="h-3.5 w-3.5" />
                {label}
              </Link>
            );
          })}
        </nav>
      </div>

      <main className="min-h-screen w-full flex-1 px-4 pb-12 pt-28 md:ml-56 md:px-8 md:pt-8">
        {children}
      </main>
    </div>
  );
}
