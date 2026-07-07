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
  const router = useRouter();
  const [search, setSearch] = useState("");
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
    return () => {
      alive = false;
      window.clearInterval(poll);
      window.removeEventListener("cubicle:timer-changed", loadActiveTimer);
      window.removeEventListener("focus", loadActiveTimer);
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

  const activeWorkspace = wsData?.workspaces.find(w => w.isActive);
  const isFree = !wsData || wsData.plan === "free";
  return (
    <header className="sticky top-0 z-30 flex h-14 items-center gap-2 border-b border-slate-200/80 bg-white/80 backdrop-blur-xl px-3 md:gap-4 md:px-4">
      {/* Mobile hamburger */}
      <Button
        variant="ghost"
        size="icon"
        className="h-9 w-9 shrink-0 md:hidden"
        onClick={() => setMobileOpen(true)}
        aria-label="Buka menu"
      >
        <Menu className="h-5 w-5" />
      </Button>
      {/* Search */}
      <form onSubmit={handleSearch} className="relative min-w-0 flex-1 max-w-md">
        <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground pointer-events-none" />
        <Input
          type="search"
          placeholder="Cari... (Ctrl+K)"
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
              <span className="hidden sm:inline">Baru</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuLabel>Buat baru</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link href="/app/projects/new">Proyek</Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link href="/app/tasks/new">Tugas</Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link href="/app/clients/new">Klien</Link>
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
              : "Tidak ada timer aktif"
          }
        >
          <Timer className="h-4 w-4" />
          <span className="hidden sm:inline">{elapsed}</span>
        </Button>
        )}

        {/* AI assistant button */}
        <Button
          variant="outline"
          size="icon"
          className="h-9 w-9 text-blue-600 hover:text-blue-700 hover:bg-blue-50"
          onClick={() => window.dispatchEvent(new Event("cubicle:toggle-ai"))}
          aria-label="Asisten AI"
          title="Asisten AI"
        >
          <Sparkles className="h-4 w-4" />
        </Button>

        {/* Notifications */}
        <NotificationsBell />

        {/* Workspace switcher */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" className="gap-1.5 text-muted-foreground max-w-[180px]">
              <Building2 className="h-3.5 w-3.5 shrink-0" />
              <span className="hidden sm:inline text-xs font-medium truncate">
                {activeWorkspace?.name || "Workspace"}
              </span>
              <ChevronDown className="h-3 w-3 shrink-0" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-72">
            {/* Current workspace */}
            <DropdownMenuLabel className="text-xs text-muted-foreground font-normal">
              Workspace
            </DropdownMenuLabel>
            <DropdownMenuSeparator />

            {/* Workspace list */}
            {wsData?.workspaces.map((ws) => (
              <DropdownMenuItem
                key={ws.id}
                onClick={() => handleSwitchWorkspace(ws.id)}
                className="flex items-center gap-2 cursor-pointer"
                disabled={switching === ws.id}
              >
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-sidebar-primary/10 text-sidebar-primary text-xs font-semibold">
                  {ws.name.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{ws.name}</p>
                  <p className="text-[10px] text-muted-foreground capitalize">{ws.role}</p>
                </div>
                {ws.isActive && <Check className="h-4 w-4 shrink-0 text-primary" />}
                {switching === ws.id && <Loader2 className="h-4 w-4 shrink-0 animate-spin text-muted-foreground" />}
              </DropdownMenuItem>
            ))}

            <DropdownMenuSeparator />

            {/* Create workspace — gated */}
            {isFree ? (
              <DropdownMenuItem asChild className="cursor-pointer">
                <Link href="/app/billing" className="flex items-center gap-2">
                  <Crown className="h-4 w-4 text-amber-500" />
                  <div className="flex-1">
                    <p className="text-xs font-medium">Upgrade untuk multi workspace</p>
                    <p className="text-[10px] text-muted-foreground">Solo · Rp 49rb/bulan</p>
                  </div>
                </Link>
              </DropdownMenuItem>
            ) : (
              <DropdownMenuItem
                onClick={handleCreateWorkspace}
                className="cursor-pointer"
                disabled={creating || !wsData?.canCreate}
              >
                {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : <PlusCircle className="h-4 w-4" />}
                <span className="text-xs">
                  {wsData?.canCreate ? "Buat workspace baru" : wsData?.canCreateReason || "Batas workspace tercapai"}
                </span>
              </DropdownMenuItem>
            )}

            {/* Invite member — gated */}
            {isFree ? (
              <DropdownMenuItem asChild className="cursor-pointer">
                <Link href="/app/billing" className="flex items-center gap-2">
                  <Crown className="h-4 w-4 text-amber-500" />
                  <div className="flex-1">
                    <p className="text-xs font-medium">Upgrade untuk undang anggota</p>
                    <p className="text-[10px] text-muted-foreground">Team · Rp 99rb/bulan</p>
                  </div>
                </Link>
              </DropdownMenuItem>
            ) : wsData?.canInvite ? (
              <DropdownMenuItem asChild className="cursor-pointer">
                <Link href="/app/settings?tab=members" className="flex items-center gap-2">
                  <UserPlus className="h-4 w-4" />
                  <span className="text-xs">Undang anggota</span>
                </Link>
              </DropdownMenuItem>
            ) : null}

            {/* Manage workspace */}
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild className="cursor-pointer">
              <Link href="/app/settings" className="flex items-center gap-2">
                <Users className="h-4 w-4" />
                <span className="text-xs">Kelola workspace</span>
              </Link>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

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
                  Pengaturan
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href="/app/billing" className="cursor-pointer">
                  <CreditCard className="h-4 w-4" />
                  Tagihan
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href="/app/support" className="cursor-pointer">
                  <HelpCircle className="h-4 w-4" />
                  Bantuan & Dukungan
                </Link>
              </DropdownMenuItem>
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleSignOut} className="cursor-pointer">
              <LogOut className="h-4 w-4" />
              Keluar
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
