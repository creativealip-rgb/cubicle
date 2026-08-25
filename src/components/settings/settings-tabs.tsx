"use client";

import { useCallback, useEffect, useState, type ReactNode } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  Settings,
  Users,
  User,
  ImageIcon,
  Plug,
  LayoutGrid,
} from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useT } from "@/lib/i18n-client";

export type SettingsTabKey =
  | "workspace"
  | "invoice"
  | "account"
  | "team"
  | "integrations"
  | "billing";

const TAB_KEYS: SettingsTabKey[] = [
  "workspace",
  "invoice",
  "team",
  "account",
  "integrations",
  "billing",
];

function normalizeTab(tab?: string | null): SettingsTabKey {
  if (tab === "branding") return "invoice";
  if (tab === "more") return "billing";
  if (tab && (TAB_KEYS as string[]).includes(tab)) {
    return tab as SettingsTabKey;
  }
  return "workspace";
}

type SettingsTabsProps = {
  initialTab?: string | null;
  workspace: ReactNode;
  account: ReactNode;
  team: ReactNode;
  invoice: ReactNode;
  integrations: ReactNode;
  billing: ReactNode;
};

export function SettingsTabs({
  initialTab,
  workspace,
  account,
  team,
  invoice,
  integrations,
  billing,
}: SettingsTabsProps) {
  const { t } = useT();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // OAuth return for Google Calendar should land on integrations.
  const gcal = searchParams.get("gcal");
  const urlTab = gcal
    ? "integrations"
    : normalizeTab(searchParams.get("tab") ?? initialTab);

  const [activeTab, setActiveTab] = useState<SettingsTabKey>(urlTab);

  useEffect(() => {
    setActiveTab(urlTab);
  }, [urlTab]);

  const changeTab = useCallback(
    (tab: string) => {
      const next = normalizeTab(tab);
      setActiveTab(next);
      const params = new URLSearchParams(searchParams.toString());
      // Drop OAuth flash params when user switches tabs.
      params.delete("gcal");
      params.delete("error");
      if (next === "workspace") params.delete("tab");
      else params.set("tab", next);
      const qs = params.toString();
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    },
    [pathname, router, searchParams],
  );

  const tabs: Array<{
    key: SettingsTabKey;
    label: string;
    icon: ReactNode;
  }> = [
    {
      key: "workspace",
      label: t("Workspace", "Workspace"),
      icon: <Settings className="h-3.5 w-3.5" />,
    },
    {
      key: "invoice",
      label: t("Invoice", "Invoice"),
      icon: <LayoutGrid className="h-3.5 w-3.5" />,
    },
    {
      key: "team",
      label: t("Tim", "Team"),
      icon: <Users className="h-3.5 w-3.5" />,
    },
    {
      key: "account",
      label: t("Akun", "Account"),
      icon: <User className="h-3.5 w-3.5" />,
    },
    {
      key: "integrations",
      label: t("Integrasi", "Integrations"),
      icon: <Plug className="h-3.5 w-3.5" />,
    },
    {
      key: "billing",
      label: t("Billing", "Billing"),
      icon: <ImageIcon className="h-3.5 w-3.5" />,
    },
  ];
  const activeTabItem = tabs.find((tab) => tab.key === activeTab);

  return (
    <Tabs value={activeTab} onValueChange={changeTab} className="space-y-4">
      <label className="block md:hidden">
        <span className="mb-1.5 block text-xs font-medium text-muted-foreground">
          {t("Bagian pengaturan", "Settings section")}
        </span>
        <select
          value={activeTabItem?.key ?? "workspace"}
          onChange={(event) => changeTab(event.target.value)}
          aria-label={t("Pilih bagian pengaturan", "Choose settings section")}
          className="h-11 w-full rounded-md border border-input bg-background px-3 text-sm font-medium focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          {tabs.map((tab) => <option key={tab.key} value={tab.key}>{tab.label}</option>)}
        </select>
      </label>
      <div className="hidden md:block">
        <TabsList className="h-auto min-h-9 w-max min-w-full justify-start gap-1 bg-muted/70 p-1 pr-3 sm:min-w-0">
          {tabs.map((tab) => (
            <TabsTrigger
              key={tab.key}
              value={tab.key}
              className="min-h-9 gap-1.5 px-2.5 py-1.5 text-xs sm:text-sm"
            >
              {tab.icon}
              <span className="whitespace-nowrap">{tab.label}</span>
            </TabsTrigger>
          ))}
        </TabsList>
      </div>

      <TabsContent value="workspace" className="mt-0 space-y-4 focus-visible:ring-0">
        {workspace}
      </TabsContent>
      <TabsContent value="account" className="mt-0 space-y-4 focus-visible:ring-0">
        {account}
      </TabsContent>
      <TabsContent value="team" className="mt-0 space-y-4 focus-visible:ring-0">
        {team}
      </TabsContent>
      <TabsContent value="invoice" className="mt-0 space-y-4 focus-visible:ring-0">
        {invoice}
      </TabsContent>
      <TabsContent value="integrations" className="mt-0 space-y-4 focus-visible:ring-0">
        {integrations}
      </TabsContent>
      <TabsContent value="billing" className="mt-0 space-y-4 focus-visible:ring-0">
        {billing}
      </TabsContent>
    </Tabs>
  );
}
