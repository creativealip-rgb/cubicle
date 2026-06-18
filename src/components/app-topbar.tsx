"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Search,
  Plus,
  Timer,
  ChevronDown,
  LogOut,
  Settings,
  HelpCircle,
  Menu,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { authClient } from "@/lib/auth-client";
import { useSidebar } from "@/components/app-shell";
import { NotificationsBell } from "@/components/notifications-bell";

interface AppTopbarProps {
  user: {
    name: string;
    email: string;
    image?: string | null;
    role?: "owner" | "member" | "viewer";
  };
}

type ActiveTimer = {
  id: string;
  startTime: string;
  clientName?: string | null;
  projectName?: string | null;
  taskTitle?: string | null;
  description?: string | null;
};

function formatElapsed(startTime?: string | null) {
  if (!startTime) return "00:00";
  const seconds = Math.max(0, Math.floor((Date.now() - new Date(startTime).getTime()) / 1000));
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  return hours > 0
    ? `${hours}:${String(minutes).padStart(2, "0")}:${String(secs).padStart(2, "0")}`
    : `${String(minutes).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
}

export function AppTopbar({ user }: AppTopbarProps) {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [activeTimer, setActiveTimer] = useState<ActiveTimer | null>(null);
  const [elapsed, setElapsed] = useState("00:00");
  const { setMobileOpen } = useSidebar();

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    if (search.trim()) {
      router.push(`/app/search?q=${encodeURIComponent(search.trim())}`);
    }
  }

  async function handleSignOut() {
    await authClient.signOut();
    router.push("/login");
    router.refresh();
  }

  useEffect(() => {
    let alive = true;

    async function loadActiveTimer() {
      try {
        const res = await fetch("/api/time/active", { cache: "no-store" });
        if (!res.ok) return;
        const data = (await res.json()) as { activeTimer: ActiveTimer | null };
        if (alive) setActiveTimer(data.activeTimer);
      } catch {
        // keep timer quiet in topbar
      }
    }

    loadActiveTimer();
    const poll = window.setInterval(loadActiveTimer, 15000);
    window.addEventListener("cubicle:timer-changed", loadActiveTimer);
    window.addEventListener("focus", loadActiveTimer);
    return () => {
      alive = false;
      window.clearInterval(poll);
      window.removeEventListener("cubicle:timer-changed", loadActiveTimer);
      window.removeEventListener("focus", loadActiveTimer);
    };
  }, []);

  useEffect(() => {
    setElapsed(formatElapsed(activeTimer?.startTime));
    if (!activeTimer?.startTime) return;
    const tick = window.setInterval(() => {
      setElapsed(formatElapsed(activeTimer.startTime));
    }, 1000);
    return () => window.clearInterval(tick);
  }, [activeTimer]);

  const canWrite = user.role === "owner" || user.role === "member";

  const initials = user.name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  return (
    <header className="sticky top-0 z-30 flex h-14 items-center gap-2 border-b bg-background px-3 md:gap-4 md:px-4">
      {/* Mobile hamburger */}
      <Button
        variant="ghost"
        size="icon"
        className="h-9 w-9 shrink-0 md:hidden"
        onClick={() => setMobileOpen(true)}
        aria-label="Open menu"
      >
        <Menu className="h-5 w-5" />
      </Button>
      {/* Search */}
      <form onSubmit={handleSearch} className="relative min-w-0 flex-1 max-w-md">
        <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground pointer-events-none" />
        <Input
          type="search"
          placeholder="Search... (Ctrl+K)"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="h-9 pl-9 text-sm"
        />
      </form>

      <div className="flex items-center gap-2 ml-auto">
        {/* New button */}
        {canWrite && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button size="sm" className="gap-1">
              <Plus className="h-4 w-4" />
              <span className="hidden sm:inline">New</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuLabel>Create new</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link href="/app/projects/new">Project</Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link href="/app/tasks/new">Task</Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link href="/app/clients/new">Client</Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link href="/app/invoices/new">Invoice</Link>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
        )}

        {/* Timer */}
        {canWrite && (
        <Button
          variant={activeTimer ? "destructive" : "outline"}
          size="sm"
          className="gap-1"
          onClick={() => router.push("/app/time")}
          title={
            activeTimer
              ? [activeTimer.clientName, activeTimer.projectName, activeTimer.taskTitle, activeTimer.description]
                  .filter(Boolean)
                  .join(" • ")
              : "No active timer"
          }
        >
          <Timer className="h-4 w-4" />
          <span className="hidden sm:inline">{elapsed}</span>
        </Button>
        )}

        {/* AI assistant button (replaces floating FAB to avoid overlap) */}
        <Button
          variant="outline"
          size="icon"
          className="h-9 w-9 text-blue-600 hover:text-blue-700 hover:bg-blue-50"
          onClick={() => window.dispatchEvent(new Event("cubicle:toggle-ai"))}
          aria-label="Toggle AI assistant"
          title="AI assistant"
        >
          <Sparkles className="h-4 w-4" />
        </Button>

        {/* Notifications */}
        <NotificationsBell />

        {/* Workspace switcher */}
        <Button variant="ghost" size="sm" className="gap-1 text-muted-foreground">
          <span className="hidden sm:inline text-xs font-medium">
            My Workspace
          </span>
          <ChevronDown className="h-3 w-3" />
        </Button>

        {/* User menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="rounded-full">
              <Avatar className="h-8 w-8">
                <AvatarImage src={user.image ?? undefined} alt={user.name} />
                <AvatarFallback className="text-xs bg-sidebar-primary text-sidebar-primary-foreground">
                  {initials}
                </AvatarFallback>
              </Avatar>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel className="font-normal">
              <div className="flex flex-col space-y-1">
                <p className="text-sm font-medium leading-none">{user.name}</p>
                <p className="text-xs leading-none text-muted-foreground">
                  {user.email}
                </p>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuGroup>
              <DropdownMenuItem asChild>
                <Link href="/app/settings" className="cursor-pointer">
                  <Settings className="h-4 w-4" />
                  Settings
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href="/app/help" className="cursor-pointer">
                  <HelpCircle className="h-4 w-4" />
                  Help & Support
                </Link>
              </DropdownMenuItem>
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleSignOut} className="cursor-pointer">
              <LogOut className="h-4 w-4" />
              Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
