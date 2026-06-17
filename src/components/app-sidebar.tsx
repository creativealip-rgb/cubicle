"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  LayoutDashboard,
  Users,
  Briefcase,
  CheckSquare,
  FolderOpen,
  Clock,
  Receipt,
  Calendar,
  Sparkles,
  Settings,
  PanelLeftClose,
  PanelLeft,
  X,
  Wallet,
  BarChart3,
  FileText,
} from "lucide-react";
import { useSidebar } from "@/components/app-shell";

const navItems = [
  { label: "Dashboard", href: "/app/dashboard", icon: LayoutDashboard },
  { label: "Clients", href: "/app/clients", icon: Users },
  { label: "Projects", href: "/app/projects", icon: Briefcase },
  { label: "Tasks", href: "/app/tasks", icon: CheckSquare, badgeKey: "myOpenTasks" as const },
  { label: "Files", href: "/app/files", icon: FolderOpen },
  { label: "Time", href: "/app/time", icon: Clock },
  { label: "Invoices", href: "/app/invoices", icon: Receipt },
  { label: "Expenses", href: "/app/expenses", icon: Wallet },
  { label: "Reports", href: "/app/reports", icon: BarChart3 },
  { label: "Proposals", href: "/app/proposals", icon: FileText },
  { label: "Calendar", href: "/app/calendar", icon: Calendar },
  { label: "Prompts", href: "/app/prompts", icon: Sparkles },
  { label: "Settings", href: "/app/settings", icon: Settings },
];

interface AppSidebarProps {
  collapsed: boolean;
  onToggle: () => void;
  myOpenTasksCount?: number;
}

export function AppSidebar({ collapsed, onToggle, myOpenTasksCount = 0 }: AppSidebarProps) {
  const pathname = usePathname();
  const { mobileOpen, setMobileOpen } = useSidebar();

  // Close mobile sidebar on route change
  useEffect(() => {
    setMobileOpen(false);
  }, [pathname, setMobileOpen]);

  return (
    <aside
      className={cn(
        "fixed inset-y-0 left-0 z-50 flex flex-col border-r bg-sidebar-background transition-all duration-200",
        // Desktop: always visible, normal collapse behavior
        "md:translate-x-0",
        collapsed ? "md:w-[68px]" : "md:w-[260px]",
        // Mobile: off-canvas by default, slide in when open
        "w-[260px] -translate-x-full",
        mobileOpen && "translate-x-0"
      )}
    >
      {/* Logo */}
      <div
        className={cn(
          "flex h-14 items-center border-b border-sidebar-border px-3",
          collapsed ? "md:justify-center" : "md:justify-between justify-between"
        )}
      >
        {!collapsed && (
          <Link href="/app/dashboard" className="flex items-center gap-2 font-semibold text-sidebar-foreground">
            <div className="flex h-7 w-7 items-center justify-center rounded-md bg-sidebar-primary">
              <span className="text-xs font-bold text-sidebar-primary-foreground">
                C
              </span>
            </div>
            <span className="text-sm">Cubicle</span>
          </Link>
        )}
        {collapsed && (
          <Link href="/app/dashboard" className="hidden md:flex h-7 w-7 items-center justify-center rounded-md bg-sidebar-primary">
            <span className="text-xs font-bold text-sidebar-primary-foreground">
              C
            </span>
          </Link>
        )}
        {/* Mobile close button */}
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-sidebar-foreground hover:bg-sidebar-accent md:hidden"
          onClick={() => setMobileOpen(false)}
          aria-label="Close menu"
        >
          <X className="h-4 w-4" />
        </Button>
        {!collapsed && (
          <Button
            variant="ghost"
            size="icon"
            className="hidden md:flex h-8 w-8 text-sidebar-foreground hover:bg-sidebar-accent"
            onClick={onToggle}
          >
            <PanelLeftClose className="h-4 w-4" />
          </Button>
        )}
        {collapsed && (
          <Button
            variant="ghost"
            size="icon"
            className="hidden md:flex h-8 w-8 text-sidebar-foreground hover:bg-sidebar-accent absolute -right-3 top-3 rounded-full border bg-background shadow-sm"
            onClick={onToggle}
          >
            <PanelLeft className="h-3 w-3" />
          </Button>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto px-2 py-3">
        <TooltipProvider delayDuration={300}>
          <ul className="space-y-1">
            {navItems.map((item) => {
              const isActive =
                pathname === item.href ||
                (item.href !== "/app/dashboard" &&
                  pathname.startsWith(item.href + "/"));
              const Icon = item.icon;
              const badge =
                "badgeKey" in item && item.badgeKey === "myOpenTasks"
                  ? myOpenTasksCount
                  : 0;

              return (
                <li key={item.href}>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Link
                        href={item.href}
                        className={cn(
                          "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                          isActive
                            ? "bg-sidebar-primary text-sidebar-primary-foreground"
                            : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                          collapsed && "justify-center px-2",
                        )}
                      >
                        <Icon className="h-4 w-4 shrink-0" />
                        {!collapsed && <span className="flex-1">{item.label}</span>}
                        {!collapsed && badge > 0 && (
                          <span
                            className={cn(
                              "ml-auto inline-flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-xs font-semibold",
                              isActive
                                ? "bg-sidebar-primary-foreground text-sidebar-primary"
                                : "bg-blue-600 text-white",
                            )}
                            aria-label={`${badge} open tasks assigned to you`}
                          >
                            {badge > 99 ? "99+" : badge}
                          </span>
                        )}
                        {collapsed && badge > 0 && (
                          <span
                            className="absolute right-1 top-1 inline-flex h-2 w-2 rounded-full bg-blue-500"
                            aria-label={`${badge} open tasks assigned to you`}
                          />
                        )}
                      </Link>
                    </TooltipTrigger>
                    {collapsed && (
                      <TooltipContent side="right">
                        {item.label}
                        {badge > 0 ? ` (${badge})` : ""}
                      </TooltipContent>
                    )}
                  </Tooltip>
                </li>
              );
            })}
          </ul>
        </TooltipProvider>
      </nav>

      {/* Footer */}
      <div className="border-t border-sidebar-border p-3">
        {!collapsed && (
          <p className="text-xs text-muted-foreground">
            Cubicle v0.1.0
          </p>
        )}
      </div>
    </aside>
  );
}
