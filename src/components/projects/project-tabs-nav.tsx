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

  return (
    <Tabs value={currentTab} onValueChange={handleTabChange}>
      <TabsList className="max-w-full justify-start overflow-x-auto">
        <TabsTrigger value="work" className="gap-1">
          <CheckSquare className="h-3 w-3" /> {t("Tugas", "Tasks")} ({tasksCount})
        </TabsTrigger>
        <TabsTrigger value="files" className="gap-1">
          <FileText className="h-3 w-3" /> {t("Berkas", "Files")} ({filesCount})
        </TabsTrigger>
        {showTimeTab ? (
          <TabsTrigger value="time" className="gap-1">
            <Clock className="h-3 w-3" /> {t("Waktu", "Time")} ({timeCount})
          </TabsTrigger>
        ) : null}
        <TabsTrigger value="billing" className="gap-1">
          <Wallet className="h-3 w-3" /> Invoice ({invoicesCount})
        </TabsTrigger>
      </TabsList>

      <TabsContent value="work" className="pt-4">
        {tasksContent}
      </TabsContent>

      <TabsContent value="files" className="pt-4">
        {filesContent}
      </TabsContent>

      <TabsContent value="billing" className="pt-4">
        {billingContent}
      </TabsContent>

      {showTimeTab && timeContent ? (
        <TabsContent value="time" className="pt-4">
          {timeContent}
        </TabsContent>
      ) : null}
    </Tabs>
  );
}
