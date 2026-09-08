"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { LayoutDashboard, CheckSquare, FileText, Clock, Wallet } from "lucide-react";
import { useT } from "@/lib/i18n-client";

type ProjectTabsNavProps = {
  initialTab: string;
  tasksCount: number;
  filesCount: number;
  timeCount: number;
  invoicesCount: number;
  showTimeTab: boolean;
  overviewContent: React.ReactNode;
  tasksAction?: React.ReactNode;
  filesAction?: React.ReactNode;
  billingAction?: React.ReactNode;
  timeAction?: React.ReactNode;
  tasksContent: React.ReactNode;
  filesContent: React.ReactNode;
  billingContent: React.ReactNode;
  timeContent?: React.ReactNode;
};

export function ProjectTabsNav({
  initialTab,
  tasksCount,
  filesCount,
  timeCount,
  invoicesCount,
  showTimeTab,
  overviewContent,
  tasksAction,
  filesAction,
  billingAction,
  timeAction,
  tasksContent,
  filesContent,
  billingContent,
  timeContent,
}: ProjectTabsNavProps) {
  const { t } = useT();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const currentTab = searchParams.get("tab") || initialTab;

  const handleTabChange = (value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("tab", value);
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  };

  const activeAction =
    currentTab === "work"
      ? tasksAction
      : currentTab === "files"
        ? filesAction
        : currentTab === "billing"
          ? billingAction
          : currentTab === "time"
            ? timeAction
            : null;

  return (
    <Tabs value={currentTab} onValueChange={handleTabChange} className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <TabsList className="h-auto min-h-9 w-auto inline-flex max-w-full justify-start gap-1 overflow-x-auto bg-muted/60 p-1">
          <TabsTrigger value="overview" className="gap-1.5 px-3 py-1.5 text-xs font-semibold sm:text-sm data-[state=active]:shadow-sm">
            <LayoutDashboard className="h-3.5 w-3.5 shrink-0" /> Overview
          </TabsTrigger>
          <TabsTrigger value="work" className="gap-1.5 px-3 py-1.5 text-xs font-semibold sm:text-sm data-[state=active]:shadow-sm">
            <CheckSquare className="h-3.5 w-3.5 shrink-0" /> {t("Tugas", "Tasks")} <span className="rounded-full bg-background px-1.5 py-0.2 text-[10px] font-bold text-muted-foreground">{tasksCount}</span>
          </TabsTrigger>
          <TabsTrigger value="files" className="gap-1.5 px-3 py-1.5 text-xs font-semibold sm:text-sm data-[state=active]:shadow-sm">
            <FileText className="h-3.5 w-3.5 shrink-0" /> {t("Berkas", "Files")} <span className="rounded-full bg-background px-1.5 py-0.2 text-[10px] font-bold text-muted-foreground">{filesCount}</span>
          </TabsTrigger>
          {showTimeTab ? (
            <TabsTrigger value="time" className="gap-1.5 px-3 py-1.5 text-xs font-semibold sm:text-sm data-[state=active]:shadow-sm">
              <Clock className="h-3.5 w-3.5 shrink-0" /> {t("Waktu", "Time")} <span className="rounded-full bg-background px-1.5 py-0.2 text-[10px] font-bold text-muted-foreground">{timeCount}</span>
            </TabsTrigger>
          ) : null}
          <TabsTrigger value="billing" className="gap-1.5 px-3 py-1.5 text-xs font-semibold sm:text-sm data-[state=active]:shadow-sm">
            <Wallet className="h-3.5 w-3.5 shrink-0" /> {t("Invoice", "Invoices")} <span className="rounded-full bg-background px-1.5 py-0.2 text-[10px] font-bold text-muted-foreground">{invoicesCount}</span>
          </TabsTrigger>
        </TabsList>

        {activeAction && (
          <div className="flex shrink-0 items-center justify-end">
            {activeAction}
          </div>
        )}
      </div>

      <TabsContent value="overview" className="pt-1">
        {currentTab === "overview" ? overviewContent : null}
      </TabsContent>

      <TabsContent value="work" className="pt-1">
        {currentTab === "work" ? <div className="rounded-xl border bg-card p-4 shadow-xs">{tasksContent}</div> : null}
      </TabsContent>

      <TabsContent value="files" className="pt-1">
        {currentTab === "files" ? <div className="rounded-xl border bg-card p-4 shadow-xs">{filesContent}</div> : null}
      </TabsContent>

      <TabsContent value="billing" className="pt-1">
        {currentTab === "billing" ? <div className="rounded-xl border bg-card p-4 shadow-xs">{billingContent}</div> : null}
      </TabsContent>

      {showTimeTab && timeContent ? (
        <TabsContent value="time" className="pt-1">
          {currentTab === "time" ? <div className="rounded-xl border bg-card p-4 shadow-xs">{timeContent}</div> : null}
        </TabsContent>
      ) : null}
    </Tabs>
  );
}
