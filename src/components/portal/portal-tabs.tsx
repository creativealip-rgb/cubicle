"use client";

import { useCallback, useEffect, useState, type ReactNode } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  LayoutDashboard,
  FolderKanban,
  FolderOpen,
  Receipt,
  MessageCircle,
} from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export type PortalTabKey =
  | "overview"
  | "projects"
  | "files"
  | "invoices"
  | "contact";

const TAB_KEYS: PortalTabKey[] = [
  "overview",
  "projects",
  "files",
  "invoices",
  "contact",
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

export function PortalTabs({
  initialTab,
  overview,
  projects,
  files,
  invoices,
  contact,
  counts,
}: PortalTabsProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const urlTab = normalizeTab(searchParams.get("tab") ?? initialTab);
  const [activeTab, setActiveTab] = useState<PortalTabKey>(urlTab);

  useEffect(() => {
    setActiveTab(urlTab);
  }, [urlTab]);

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
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    },
    [pathname, router, searchParams],
  );

  const tabs: Array<{
    key: PortalTabKey;
    label: string;
    icon: ReactNode;
    badge?: number;
  }> = [
    {
      key: "overview",
      label: "Overview",
      icon: <LayoutDashboard className="h-3.5 w-3.5" />,
    },
    {
      key: "projects",
      label: "Projects",
      icon: <FolderKanban className="h-3.5 w-3.5" />,
      badge: counts?.projects,
    },
    {
      key: "files",
      label: "Folders",
      icon: <FolderOpen className="h-3.5 w-3.5" />,
      badge: counts?.files,
    },
    {
      key: "invoices",
      label: "Invoices",
      icon: <Receipt className="h-3.5 w-3.5" />,
      badge: counts?.invoices,
    },
    {
      key: "contact",
      label: "Contact",
      icon: <MessageCircle className="h-3.5 w-3.5" />,
    },
  ];

  return (
    <Tabs value={activeTab} onValueChange={changeTab} className="space-y-5">
      <TabsList className="h-auto w-full flex-wrap justify-start gap-1 bg-muted/60 p-1">
        {tabs.map((tab) => (
          <TabsTrigger
            key={tab.key}
            value={tab.key}
            className="gap-1.5 px-3 py-2 text-xs sm:text-sm"
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
      </TabsList>

      <TabsContent value="overview" className="mt-0 space-y-6 focus-visible:outline-none">
        {overview}
      </TabsContent>
      <TabsContent value="projects" className="mt-0 space-y-6 focus-visible:outline-none">
        {projects}
      </TabsContent>
      <TabsContent value="files" className="mt-0 space-y-6 focus-visible:outline-none">
        {files}
      </TabsContent>
      <TabsContent value="invoices" className="mt-0 space-y-6 focus-visible:outline-none">
        {invoices}
      </TabsContent>
      <TabsContent value="contact" className="mt-0 space-y-6 focus-visible:outline-none">
        {contact}
      </TabsContent>
    </Tabs>
  );
}
