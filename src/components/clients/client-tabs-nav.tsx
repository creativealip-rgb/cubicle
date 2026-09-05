"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Globe, FileText, Receipt, Calendar } from "lucide-react";
import { useT } from "@/lib/i18n-client";

type ClientTabsNavProps = {
  initialTab: string;
  projectsCount: number;
  invoicesCount: number;
  projectsAction?: React.ReactNode;
  invoicesAction?: React.ReactNode;
  portalContent: React.ReactNode;
  projectsContent: React.ReactNode;
  invoicesContent: React.ReactNode;
  calendarContent: React.ReactNode;
};

export function ClientTabsNav({
  initialTab,
  projectsCount,
  invoicesCount,
  projectsAction,
  invoicesAction,
  portalContent,
  projectsContent,
  invoicesContent,
  calendarContent,
}: ClientTabsNavProps) {
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
    <Tabs value={currentTab} onValueChange={handleTabChange} className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="overflow-x-auto -mx-1 px-1">
          <TabsList className="h-auto min-h-9 w-auto inline-flex justify-start gap-1 bg-muted/60 p-1">
            <TabsTrigger value="portal" className="gap-1.5 px-3 py-1.5 text-xs font-semibold sm:text-sm data-[state=active]:shadow-sm">
              <Globe className="h-3.5 w-3.5 shrink-0" /> {t("Portal", "Portal")}
            </TabsTrigger>
            <TabsTrigger value="projects" className="gap-1.5 px-3 py-1.5 text-xs font-semibold sm:text-sm data-[state=active]:shadow-sm">
              <FileText className="h-3.5 w-3.5 shrink-0" /> {t("Proyek", "Projects")}
              <span className="rounded-full bg-background px-1.5 py-0.2 text-[10px] font-bold text-muted-foreground">
                {projectsCount}
              </span>
            </TabsTrigger>
            <TabsTrigger value="invoices" className="gap-1.5 px-3 py-1.5 text-xs font-semibold sm:text-sm data-[state=active]:shadow-sm">
              <Receipt className="h-3.5 w-3.5 shrink-0" /> {t("Invoice", "Invoices")}
              <span className="rounded-full bg-background px-1.5 py-0.2 text-[10px] font-bold text-muted-foreground">
                {invoicesCount}
              </span>
            </TabsTrigger>
            <TabsTrigger value="calendar" className="gap-1.5 px-3 py-1.5 text-xs font-semibold sm:text-sm data-[state=active]:shadow-sm">
              <Calendar className="h-3.5 w-3.5 shrink-0" /> {t("Kalender", "Calendar")}
            </TabsTrigger>
          </TabsList>
        </div>

        {/* Dynamic Action Button aligned with tabs */}
        <div className="flex shrink-0 items-center justify-end">
          {currentTab === "projects" && projectsAction}
          {currentTab === "invoices" && invoicesAction}
        </div>
      </div>

      <TabsContent value="portal" className="pt-1">
        {currentTab === "portal" ? portalContent : null}
      </TabsContent>

      <TabsContent value="projects" className="pt-1">
        {currentTab === "projects" ? projectsContent : null}
      </TabsContent>

      <TabsContent value="invoices" className="pt-1">
        {currentTab === "invoices" ? invoicesContent : null}
      </TabsContent>

      <TabsContent value="calendar" className="pt-1">
        {currentTab === "calendar" ? calendarContent : null}
      </TabsContent>
    </Tabs>
  );
}
