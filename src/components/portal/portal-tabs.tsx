"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { usePathname, useSearchParams } from "next/navigation";
import {
  LayoutDashboard,
  FolderKanban,
  FolderOpen,
  Receipt,
  MessageCircle,
} from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useT } from "@/lib/i18n-client";

export type PortalTabKey = "overview" | "projects" | "files" | "invoices";

const TAB_KEYS: PortalTabKey[] = [
  "overview",
  "projects",
  "files",
  "invoices",
];

function normalizeTab(tab?: string | null): PortalTabKey {
  if (tab && (TAB_KEYS as string[]).includes(tab)) {
    return tab as PortalTabKey;
  }
  return "overview";
}

type PortalTabsProps = {
  initialTab?: string | null;
  overview: ReactNode;
  projects: ReactNode;
  files: ReactNode;
  invoices: ReactNode;
  contact: ReactNode;
  counts?: {
    projects?: number;
    files?: number;
    invoices?: number;
  };
};

/**
 * Client portal tabs.
 * - Soft URL update (history.replaceState) so page shell tidak remount / loncat tinggi.
 * - Render hanya tab aktif agar DOM mobile tetap ringan.
 * - min-h panel: tinggi area konten lebih stabil antar tab.
 */
export function PortalTabs({
  initialTab,
  overview,
  projects,
  files,
  invoices,
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

  useEffect(() => {
    setActiveTab(urlTab);
  }, [urlTab]);

  useEffect(() => {
    tabRefs.current[activeTab]?.scrollIntoView({
      behavior: "smooth",
      block: "nearest",
      inline: "center",
    });
  }, [activeTab]);

  const changeTab = useCallback(
    (tab: string) => {
      const next = normalizeTab(tab);
      setActiveTab(next);

      const params = new URLSearchParams(searchParams.toString());
      // Keep file-manager params only on files tab.
      if (next !== "files") {
        params.delete("projectId");
        params.delete("folderId");
      }
      if (next === "overview") params.delete("tab");
      else params.set("tab", next);

      const qs = params.toString();
      const url = qs ? `${pathname}?${qs}` : pathname;
      // Soft URL — no Next.js navigation / RSC remount / height flash.
      window.history.replaceState(window.history.state, "", url);
    },
    [pathname, searchParams],
  );

  const tabs: Array<{
    key: PortalTabKey;
    label: string;
    icon: ReactNode;
    badge?: number;
  }> = [
    {
      key: "overview",
      label: t("Ringkasan", "Overview"),
      icon: <LayoutDashboard className="h-3.5 w-3.5" />,
    },
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
      label: "Invoice",
      icon: <Receipt className="h-3.5 w-3.5" />,
      badge: counts?.invoices,
    },
  ];

  const panelClass =
    "mt-0 space-y-6 focus-visible:outline-none data-[state=inactive]:hidden data-[state=active]:portal-fade-in";

  return (
    <Tabs value={activeTab} onValueChange={changeTab} className="space-y-5">
      <div className="relative w-full after:pointer-events-none after:absolute after:inset-y-0 after:right-0 after:w-8 after:bg-gradient-to-l after:from-background after:to-transparent">
        <div className="w-full overflow-x-auto pb-1 pr-6">
          <TabsList className="h-auto min-w-max justify-start gap-1 bg-muted/60 p-1">
            {tabs.map((tab) => (
              <TabsTrigger
                key={tab.key}
                ref={(node) => {
                  tabRefs.current[tab.key] = node;
                }}
                value={tab.key}
                className="min-h-11 gap-1.5 px-3 py-2 text-xs transition-all sm:text-sm data-[state=active]:shadow-sm"
              >
                {tab.icon}
                <span>{tab.label}</span>
                {typeof tab.badge === "number" && tab.badge > 0 ? (
                  <span className="rounded-full bg-background px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
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
                  className="min-h-11 gap-1.5 px-3 py-2 text-xs font-medium sm:text-sm"
                >
                  <MessageCircle className="h-3.5 w-3.5" />
                  {t("Kontak", "Contact")}
                </Button>
              </DialogTrigger>
              <DialogContent className="w-[calc(100%-2rem)] max-w-sm">
                <DialogHeader>
                  <DialogTitle>{t("Kontak", "Contact")}</DialogTitle>
                </DialogHeader>
                {contact}
              </DialogContent>
            </Dialog>
          </TabsList>
        </div>
      </div>

      <TabsContent value="overview" className={panelClass}>
        {overview}
      </TabsContent>
      <TabsContent value="projects" className={panelClass}>
        {projects}
      </TabsContent>
      <TabsContent value="files" className={panelClass}>
        {files}
      </TabsContent>
      <TabsContent value="invoices" className={panelClass}>
        {invoices}
      </TabsContent>
    </Tabs>
  );
}
