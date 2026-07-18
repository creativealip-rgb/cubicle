"use client";

import { useEffect, useState, useCallback } from "react";
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
  Check,
  Building2,
  PlusCircle,
  Loader2,
  Crown,
  UserPlus,
  Users,
  CreditCard,
  X,
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
import { getUserWorkspaces, switchWorkspace, createWorkspace } from "@/lib/actions/workspace-switch";
import { pauseTimer, stopTimer } from "@/lib/actions/time";
import { useT } from "@/lib/i18n-client";
import { cn } from "@/lib/utils";

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

type WorkspaceItem = {
  id: string;
  name: string;
  slug: string;
  role: string;
  isActive: boolean;
};

type WorkspaceData = {
  workspaces: WorkspaceItem[];
  plan: string;
  canCreate: boolean;
  canCreateReason?: string;
  canInvite: boolean;
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
  const { t } = useT();
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const [activeTimer, setActiveTimer] = useState<ActiveTimer | null>(null);
  const [elapsed, setElapsed] = useState("00:00");
  const { setMobileOpen } = useSidebar();
  const [wsData, setWsData] = useState<WorkspaceData | null>(null);
  const [switching, setSwitching] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    if (search.trim()) {
      router.push(`/app/search?q=${encodeURIComponent(search.trim())}`);
      setSearchOpen(false);
    }
  }

  async function handleSignOut() {
    await authClient.signOut();
    router.push("/login");
    router.refresh();
  }

  const loadWorkspaces = useCallback(async () => {
    try {
      const data = await getUserWorkspaces();
      setWsData(data);
    } catch {
      // silent
    }
  }, []);

  async function handleSwitchWorkspace(wsId: string) {
    if (switching) return;
    setSwitching(wsId);
    try {
      const result = await switchWorkspace(wsId);
      if (result.ok) {
        router.refresh();
        await new Promise((r) => setTimeout(r, 300));
        await loadWorkspaces();
      }
    } finally {
      setSwitching(null);
    }
  }

  async function handleCreateWorkspace() {
    const name = prompt("Nama workspace baru:");
    if (!name?.trim()) return;
    setCreating(true);
    try {
      const result = await createWorkspace(name.trim());
      if (result.ok) {
        router.refresh();
      } else {
        alert(result.error);
      }
    } finally {
      setCreating(false);
    }
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
        // silent
      }
    }

    loadActiveTimer();
    loadWorkspaces();
    const poll = window.setInterval(loadActiveTimer, 15000);
    window.addEventListener("cubicle:timer-changed", loadActiveTimer);
    window.addEventListener("focus", loadActiveTimer);
    window.addEventListener("focus", loadWorkspaces);
    return () => {
      alive = false;
      window.clearInterval(poll);
      window.removeEventListener("cubicle:timer-changed", loadActiveTimer);
      window.removeEventListener("focus", loadActiveTimer);
      window.removeEventListener("focus", loadWorkspaces);
    };
  }, [loadWorkspaces]);

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

  const activeWorkspace = wsData?.workspaces.find((w) => w.isActive);
  const isFree = !wsData || wsData.plan === "free";

  async function finishActiveTimer(action: "pause" | "stop") {
    if (!activeTimer) {
      router.push("/app/time");
      return;
    }
    if (action === "pause") {
      await pauseTimer(activeTimer.id);
    } else {
      await stopTimer(activeTimer.id);
    }
    setActiveTimer(null);
    setElapsed("00:00");
    window.dispatchEvent(new Event("cubicle:timer-changed"));
    router.refresh();
  }

  const timerTitle = activeTimer
    ? [activeTimer.clientName, activeTimer.projectName, activeTimer.taskTitle, activeTimer.description]
        .filter(Boolean)
        .join(" • ")
    : t("Tidak ada timer aktif", "No active timer");

  return (
    <header className="sticky top-0 z-30 flex h-14 items-center gap-1.5 border-b border-slate-200/80 bg-white/90 px-2 backdrop-blur-xl sm:gap-2 sm:px-3 lg:gap-3 lg:px-4">
      {/* Mobile/tablet hamburger */}
      <Button
        variant="ghost"
        size="icon"
        className="h-9 w-9 shrink-0 lg:hidden"
        onClick={() => setMobileOpen(true)}
        aria-label="Buka menu"
      >
        <Menu className="h-5 w-5" />
      </Button>

      {/* Mobile search expand */}
      {searchOpen ? (
        <form onSubmit={handleSearch} className="relative flex min-w-0 flex-1 items-center gap-1 lg:hidden">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            autoFocus
            type="search"
            placeholder={t("Cari…", "Search…")}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-9 pl-9 pr-9 text-sm"
          />
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="absolute right-0.5 h-8 w-8"
            onClick={() => {
              setSearchOpen(false);
              setSearch("");
            }}
            aria-label={t("Tutup pencarian", "Close search")}
          >
            <X className="h-4 w-4" />
          </Button>
        </form>
      ) : (
        <>
          {/* Desktop / tablet wide search */}
          <form onSubmit={handleSearch} className="relative hidden min-w-0 flex-1 max-w-md sm:block">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="search"
              placeholder={t("Cari…", "Search…")}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-9 pl-9 text-sm"
            />
          </form>

          {/* Phone: icon-only search */}
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-9 w-9 shrink-0 sm:hidden"
            onClick={() => setSearchOpen(true)}
            aria-label={t("Cari", "Search")}
          >
            <Search className="h-4 w-4" />
          </Button>

          <div className="ml-auto flex items-center gap-1 sm:gap-1.5">
            {/* New — always visible if can write */}
            {canWrite && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button size="sm" className="h-9 gap-1 px-2.5 sm:px-3">
                    <Plus className="h-4 w-4" />
                    <span className="hidden sm:inline">{t("Baru", "New")}</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  <DropdownMenuLabel>{t("Buat baru", "Create new")}</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                    <Link href="/app/projects/new">{t("Proyek", "Project")}</Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link href="/app/tasks/new">{t("Tugas", "Task")}</Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link href="/app/clients/new">{t("Klien", "Client")}</Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link href="/app/invoices/new">{t("Invoice", "Invoice")}</Link>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}

            {/* Timer: md+ always; phone only when running */}
            {canWrite && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant={activeTimer ? "destructive" : "outline"}
                    size="sm"
                    className={cn(
                      "h-9 gap-1 px-2 sm:px-2.5",
                      !activeTimer && "hidden md:inline-flex",
                    )}
                    title={timerTitle}
                  >
                    <Timer className="h-4 w-4" />
                    <span className="tabular-nums text-xs sm:text-sm">
                      {activeTimer ? elapsed : <span className="hidden lg:inline">{elapsed}</span>}
                    </span>
                    <ChevronDown className="hidden h-3 w-3 opacity-60 sm:block" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuLabel className="text-xs text-muted-foreground">
                    {activeTimer ? t("Timer aktif", "Active timer") : "Timer"}
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  {activeTimer ? (
                    <>
                      <DropdownMenuItem onClick={() => finishActiveTimer("pause")}>
                        {t("Jeda timer", "Pause timer")}
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => finishActiveTimer("stop")}
                        className="text-red-600 focus:text-red-600"
                      >
                        {t("Hentikan timer", "Stop timer")}
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => router.push("/app/time")}>
                        {t("Lihat detail timer", "View timer details")}
                      </DropdownMenuItem>
                    </>
                  ) : (
                    <DropdownMenuItem onClick={() => router.push("/app/time")}>
                      {t("Mulai timer", "Start timer")}
                    </DropdownMenuItem>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            )}

            {/* AI — tablet/desktop only */}
            <Button
              variant="outline"
              size="icon"
              className="hidden h-9 w-9 text-blue-600 hover:bg-blue-50 hover:text-blue-700 md:inline-flex"
              onClick={() => window.dispatchEvent(new Event("cubicle:toggle-ai"))}
              aria-label={t("Asisten AI", "AI Assistant")}
              title={t("Asisten AI", "AI Assistant")}
            >
              <Sparkles className="h-4 w-4" />
            </Button>

            <NotificationsBell />

            {/* Workspace switcher — desktop only (mobile: inside avatar menu) */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="hidden max-w-[160px] gap-1.5 text-muted-foreground lg:inline-flex"
                >
                  <Building2 className="h-3.5 w-3.5 shrink-0" />
                  <span className="truncate text-xs font-medium">
                    {activeWorkspace?.name || t("Ruang Kerja", "Workspace")}
                  </span>
                  <ChevronDown className="h-3 w-3 shrink-0" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-72">
                <DropdownMenuLabel className="text-xs font-normal text-muted-foreground">
                  {t("Ruang Kerja", "Workspace")}
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                {wsData?.workspaces.map((ws) => (
                  <DropdownMenuItem
                    key={ws.id}
                    onClick={() => handleSwitchWorkspace(ws.id)}
                    className="flex cursor-pointer items-center gap-2"
                    disabled={switching === ws.id}
                  >
                    <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-sidebar-primary/10 text-xs font-semibold text-sidebar-primary">
                      {ws.name.charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{ws.name}</p>
                      <p className="text-[10px] capitalize text-muted-foreground">{ws.role}</p>
                    </div>
                    {ws.isActive && <Check className="h-4 w-4 shrink-0 text-primary" />}
                    {switching === ws.id && (
                      <Loader2 className="h-4 w-4 shrink-0 animate-spin text-muted-foreground" />
                    )}
                  </DropdownMenuItem>
                ))}
                <DropdownMenuSeparator />
                {isFree ? (
                  <DropdownMenuItem asChild className="cursor-pointer">
                    <Link href="/app/billing" className="flex items-center gap-2">
                      <Crown className="h-4 w-4 text-amber-500" />
                      <div className="flex-1">
                        <p className="text-xs font-medium">
                          {t("Upgrade untuk multi workspace", "Upgrade for multiple workspaces")}
                        </p>
                        <p className="text-[10px] text-muted-foreground">
                          Solo · Rp 49rb/{t("bulan", "month")}
                        </p>
                      </div>
                    </Link>
                  </DropdownMenuItem>
                ) : (
                  <DropdownMenuItem
                    onClick={handleCreateWorkspace}
                    className="cursor-pointer"
                    disabled={creating || !wsData?.canCreate}
                  >
                    {creating ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <PlusCircle className="h-4 w-4" />
                    )}
                    <span className="text-xs">
                      {wsData?.canCreate
                        ? t("Buat workspace baru", "Create new workspace")
                        : wsData?.canCreateReason || t("Batas workspace tercapai", "Workspace limit reached")}
                    </span>
                  </DropdownMenuItem>
                )}
                {isFree ? (
                  <DropdownMenuItem asChild className="cursor-pointer">
                    <Link href="/app/billing" className="flex items-center gap-2">
                      <Crown className="h-4 w-4 text-amber-500" />
                      <div className="flex-1">
                        <p className="text-xs font-medium">
                          {t("Upgrade untuk undang anggota", "Upgrade to invite members")}
                        </p>
                        <p className="text-[10px] text-muted-foreground">
                          Team · Rp 99rb/{t("bulan", "month")}
                        </p>
                      </div>
                    </Link>
                  </DropdownMenuItem>
                ) : wsData?.canInvite ? (
                  <DropdownMenuItem asChild className="cursor-pointer">
                    <Link href="/app/settings?tab=members" className="flex items-center gap-2">
                      <UserPlus className="h-4 w-4" />
                      <span className="text-xs">{t("Undang anggota", "Invite member")}</span>
                    </Link>
                  </DropdownMenuItem>
                ) : null}
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild className="cursor-pointer">
                  <Link href="/app/settings" className="flex items-center gap-2">
                    <Users className="h-4 w-4" />
                    <span className="text-xs">{t("Kelola workspace", "Manage workspace")}</span>
                  </Link>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            {/* User menu — also carries mobile-only shortcuts */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-9 w-9 rounded-full">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={user.image ?? undefined} alt={user.name} />
                    <AvatarFallback className="bg-sidebar-primary text-xs text-sidebar-primary-foreground">
                      {initials}
                    </AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-64">
                <DropdownMenuLabel className="font-normal">
                  <div className="flex flex-col space-y-1">
                    <p className="text-sm font-medium leading-none">{user.name}</p>
                    <p className="text-xs leading-none text-muted-foreground">{user.email}</p>
                    {activeWorkspace && (
                      <p className="pt-1 text-[11px] text-muted-foreground lg:hidden">
                        <Building2 className="mr-1 inline h-3 w-3" />
                        {activeWorkspace.name}
                      </p>
                    )}
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />

                {/* Mobile shortcuts: workspace, AI, timer start */}
                <DropdownMenuGroup className="lg:hidden">
                  <DropdownMenuLabel className="text-[10px] font-normal uppercase tracking-wide text-muted-foreground">
                    {t("Cepat", "Quick")}
                  </DropdownMenuLabel>
                  {wsData?.workspaces.map((ws) => (
                    <DropdownMenuItem
                      key={ws.id}
                      onClick={() => handleSwitchWorkspace(ws.id)}
                      className="cursor-pointer"
                      disabled={switching === ws.id}
                    >
                      <Building2 className="h-4 w-4" />
                      <span className="truncate">{ws.name}</span>
                      {ws.isActive && <Check className="ml-auto h-3.5 w-3.5 text-primary" />}
                    </DropdownMenuItem>
                  ))}
                  <DropdownMenuItem
                    className="cursor-pointer md:hidden"
                    onClick={() => window.dispatchEvent(new Event("cubicle:toggle-ai"))}
                  >
                    <Sparkles className="h-4 w-4 text-blue-600" />
                    {t("Asisten AI", "AI Assistant")}
                  </DropdownMenuItem>
                  {canWrite && !activeTimer && (
                    <DropdownMenuItem
                      className="cursor-pointer md:hidden"
                      onClick={() => router.push("/app/time")}
                    >
                      <Timer className="h-4 w-4" />
                      {t("Mulai timer", "Start timer")}
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuSeparator />
                </DropdownMenuGroup>

                <DropdownMenuGroup>
                  <DropdownMenuItem asChild>
                    <Link href="/app/settings" className="cursor-pointer">
                      <Settings className="h-4 w-4" />
                      {t("Pengaturan", "Settings")}
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link href="/app/billing" className="cursor-pointer">
                      <CreditCard className="h-4 w-4" />
                      {t("Tagihan", "Billing")}
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link href="/app/support" className="cursor-pointer">
                      <HelpCircle className="h-4 w-4" />
                      {t("Bantuan & Dukungan", "Help & Support")}
                    </Link>
                  </DropdownMenuItem>
                </DropdownMenuGroup>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleSignOut} className="cursor-pointer">
                  <LogOut className="h-4 w-4" />
                  {t("Keluar", "Sign out")}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </>
      )}
    </header>
  );
}
