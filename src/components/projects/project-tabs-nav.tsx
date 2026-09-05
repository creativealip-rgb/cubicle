"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { CheckSquare, FileText, Clock, Wallet } from "lucide-react";
import { useT } from "@/lib/i18n-client";

type ProjectTabsNavProps = {
  initialTab: string;
  tasksCount: number;
  filesCount: number;
  timeCount: number;
  invoicesCount: number;
  showTimeTab: boolean;
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
        <TabsList className="w-auto inline-flex max-w-full justify-start overflow-x-auto rounded-xl border border-border/80 bg-muted/40 p-1">
          <TabsTrigger value="work" className="gap-1.5 rounded-lg text-xs font-semibold data-[state=active]:bg-background data-[state=active]:shadow-2xs">
            <CheckSquare className="h-3.5 w-3.5 text-primary" /> {t("Tugas", "Tasks")} ({tasksCount})
          </TabsTrigger>
          <TabsTrigger value="files" className="gap-1.5 rounded-lg text-xs font-semibold data-[state=active]:bg-background data-[state=active]:shadow-2xs">
            <FileText className="h-3.5 w-3.5 text-blue-500" /> {t("Berkas", "Files")} ({filesCount})
          </TabsTrigger>
          {showTimeTab ? (
            <TabsTrigger value="time" className="gap-1.5 rounded-lg text-xs font-semibold data-[state=active]:bg-background data-[state=active]:shadow-2xs">
              <Clock className="h-3.5 w-3.5 text-amber-500" /> {t("Waktu", "Time")} ({timeCount})
            </TabsTrigger>
          ) : null}
          <TabsTrigger value="billing" className="gap-1.5 rounded-lg text-xs font-semibold data-[state=active]:bg-background data-[state=active]:shadow-2xs">
            <Wallet className="h-3.5 w-3.5 text-emerald-500" /> Invoice ({invoicesCount})
          </TabsTrigger>
        </TabsList>

        {activeAction && (
          <div className="flex shrink-0 items-center justify-end">
            {activeAction}
          </div>
        )}
      </div>

      <TabsContent value="work" className="pt-1">
        {currentTab === "work" ? tasksContent : null}
      </TabsContent>

      <TabsContent value="files" className="pt-1">
        {currentTab === "files" ? filesContent : null}
      </TabsContent>

      <TabsContent value="billing" className="pt-1">
        {currentTab === "billing" ? billingContent : null}
      </TabsContent>

      {showTimeTab && timeContent ? (
        <TabsContent value="time" className="pt-1">
          {currentTab === "time" ? timeContent : null}
        </TabsContent>
      ) : null}
    </Tabs>
  );
}
