"use client";

import { useMemo, useState, useRef, useCallback } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  FolderKanban,
  FolderOpen,
  Receipt,
  Bell,
  MessageCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useT } from "@/lib/i18n-client";
import { PortalActionButtons } from "./portal-action-buttons";

export type PortalTabKey = "projects" | "files" | "invoices" | "requests";

const TAB_KEYS: PortalTabKey[] = ["projects", "files", "invoices", "requests"];

function normalizeTab(raw: string | null | undefined): PortalTabKey {
  if (raw && (TAB_KEYS as string[]).includes(raw)) {
    return raw as PortalTabKey;
  }
  return "projects";
}

export type PortalTabsProps = {
  initialTab?: string;
  token?: string;
  projectOptions?: Array<{ id: string; name: string }>;
  projects: React.ReactNode;
  files: React.ReactNode;
  invoices: React.ReactNode;
  requests: React.ReactNode;
  contact?: React.ReactNode;
  counts?: {
    projects?: number;
    files?: number;
    invoices?: number;
    requests?: number;
  };
};

export function PortalTabs({
  initialTab,
  token,
  projectOptions,
  projects,
  files,
  invoices,
  requests,
  contact,
  counts,
}: PortalTabsProps) {
  const { t } = useT();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const urlTab = normalizeTab(searchParams.get("tab") ?? initialTab);
  const [activeTab, setActiveTab] = useState<PortalTabKey>(urlTab);
  const tabRefs = useRef<
    Partial<Record<PortalTabKey, HTMLButtonElement | null>>
  >({});

  const changeTab = useCallback(
    (tab: string) => {
      const next = normalizeTab(tab);
      setActiveTab(next);

      const params = new URLSearchParams(searchParams.toString());
      if (next !== "files") {
        params.delete("projectId");
        params.delete("folderId");
      }
      if (next === "projects") params.delete("tab");
      else params.set("tab", next);

      const qs = params.toString();
      const url = qs ? `${pathname}?${qs}` : pathname;
      window.history.replaceState(window.history.state, "", url);
    },
    [pathname, searchParams],
  );

  const tabs: Array<{
    key: PortalTabKey;
    label: string;
    icon: React.ReactNode;
    badge?: number;
  }> = [
    {
      key: "projects",
      label: t("Proyek", "Projects"),
      icon: <FolderKanban className="h-3.5 w-3.5" />,
      badge: counts?.projects,
    },
    {
      key: "files",
      label: t("File", "Files"),
      icon: <FolderOpen className="h-3.5 w-3.5" />,
      badge: counts?.files,
    },
    {
      key: "invoices",
      label: t("Invoice", "Invoices"),
      icon: <Receipt className="h-3.5 w-3.5" />,
      badge: counts?.invoices,
    },
    {
      key: "requests",
      label: t("Permintaan", "Requests"),
      icon: <Bell className="h-3.5 w-3.5" />,
      badge: counts?.requests,
    },
  ];

  const panelClass =
    "mt-0 space-y-6 focus-visible:outline-none data-[state=inactive]:hidden data-[state=active]:portal-fade-in";

  return (
    <Tabs value={activeTab} onValueChange={changeTab} className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative w-full sm:w-auto overflow-x-auto">
          <TabsList className="h-auto min-w-max justify-start gap-1 bg-muted/60 p-1 rounded-2xl border border-border/80">
            {tabs.map((tab) => (
              <TabsTrigger
                key={tab.key}
                ref={(node) => {
                  tabRefs.current[tab.key] = node;
                }}
                value={tab.key}
                className="min-h-9 gap-1.5 rounded-xl px-3 py-1.5 text-xs font-semibold transition-all data-[state=active]:shadow-xs"
              >
                {tab.icon}
                <span>{tab.label}</span>
                {typeof tab.badge === "number" && tab.badge > 0 ? (
                  <span className="rounded-full bg-background px-1.5 py-0.2 text-[10px] font-bold text-muted-foreground border border-border/60">
                    {tab.badge}
                  </span>
                ) : null}
              </TabsTrigger>
            ))}
            <Dialog>
              <DialogTrigger asChild>
                <Button
                  type="button"
                  variant="ghost"
                  className="min-h-9 gap-1.5 rounded-xl px-3 py-1.5 text-xs font-semibold hover:bg-background/80"
                >
                  <MessageCircle className="h-3.5 w-3.5" />
                  {t("Kontak", "Contact")}
                </Button>
              </DialogTrigger>
              <DialogContent className="w-[calc(100%-2rem)] max-w-sm gap-5 overflow-hidden rounded-2xl p-0">
                <DialogHeader className="border-b bg-muted/30 px-6 pb-5 pt-6 text-left">
                  <DialogTitle>{t("Hubungi tim", "Contact team")}</DialogTitle>
                  <DialogDescription>
                    {t(
                      "Pilih kanal komunikasi yang paling nyaman untuk menghubungi tim.",
                      "Choose your preferred channel to contact the team.",
                    )}
                  </DialogDescription>
                </DialogHeader>
                <div className="px-6 pb-6">{contact}</div>
              </DialogContent>
            </Dialog>
          </TabsList>
        </div>

        {token && (
          <div className="flex shrink-0 items-center justify-end">
            <PortalActionButtons
              token={token}
              projects={projectOptions ?? []}
            />
          </div>
        )}
      </div>

      <TabsContent value="projects" className={panelClass}>
        {projects}
      </TabsContent>

      <TabsContent value="files" className={panelClass}>
        {files}
      </TabsContent>

      <TabsContent value="invoices" className={panelClass}>
        {invoices}
      </TabsContent>

      <TabsContent value="requests" className={panelClass}>
        {requests}
      </TabsContent>
    </Tabs>
  );
}
