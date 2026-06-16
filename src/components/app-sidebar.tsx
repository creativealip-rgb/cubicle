"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
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
} from "lucide-react";

const navItems = [
  { label: "Dashboard", href: "/app/dashboard", icon: LayoutDashboard },
  { label: "Clients", href: "/app/clients", icon: Users },
  { label: "Projects", href: "/app/projects", icon: Briefcase },
  { label: "Tasks", href: "/app/tasks", icon: CheckSquare },
  { label: "Files", href: "/app/files", icon: FolderOpen },
  { label: "Time", href: "/app/time", icon: Clock },
  { label: "Invoices", href: "/app/invoices", icon: Receipt },
  { label: "Calendar", href: "/app/calendar", icon: Calendar },
  { label: "Prompts", href: "/app/prompts", icon: Sparkles },
  { label: "Settings", href: "/app/settings", icon: Settings },
];

interface AppSidebarProps {
  collapsed: boolean;
  onToggle: () => void;
}

export function AppSidebar({ collapsed, onToggle }: AppSidebarProps) {
  const pathname = usePathname();

  return (
    <aside
      className={cn(
        "fixed inset-y-0 left-0 z-40 flex flex-col border-r bg-sidebar-background transition-all duration-200",
        collapsed ? "w-[68px]" : "w-[260px]",
      )}
    >
      {/* Logo */}
      <div
        className={cn(
          "flex h-14 items-center border-b border-sidebar-border px-3",
          collapsed ? "justify-center" : "justify-between",
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
          <Link href="/app/dashboard" className="flex h-7 w-7 items-center justify-center rounded-md bg-sidebar-primary">
            <span className="text-xs font-bold text-sidebar-primary-foreground">
              C
            </span>
          </Link>
        )}
        {!collapsed && (
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-sidebar-foreground hover:bg-sidebar-accent"
            onClick={onToggle}
          >
            <PanelLeftClose className="h-4 w-4" />
          </Button>
        )}
        {collapsed && (
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-sidebar-foreground hover:bg-sidebar-accent absolute -right-3 top-3 rounded-full border bg-background shadow-sm"
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
                        {!collapsed && <span>{item.label}</span>}
                      </Link>
                    </TooltipTrigger>
                    {collapsed && (
                      <TooltipContent side="right">
                        {item.label}
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
