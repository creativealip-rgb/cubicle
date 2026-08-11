"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Globe, FileText, Receipt, Calendar } from "lucide-react";
import { useT } from "@/lib/i18n-client";

type ClientTabsNavProps = {
  initialTab: string;
  projectsCount: number;
  invoicesCount: number;
  portalContent: React.ReactNode;
  projectsContent: React.ReactNode;
  invoicesContent: React.ReactNode;
  calendarContent: React.ReactNode;
};

export function ClientTabsNav({
  initialTab,
  projectsCount,
  invoicesCount,
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
    <Tabs value={currentTab} onValueChange={handleTabChange}>
      <div className="overflow-x-auto -mx-1 px-1">
        <TabsList className="h-auto min-h-9 w-full flex-wrap justify-start gap-1 p-1">
          <TabsTrigger value="portal" className="gap-1 px-2.5 text-xs sm:px-3 sm:text-sm">
            <Globe className="h-3 w-3 shrink-0" /> {t("Portal", "Portal")}
          </TabsTrigger>
          <TabsTrigger value="projects" className="gap-1 px-2.5 text-xs sm:px-3 sm:text-sm">
            <FileText className="h-3 w-3 shrink-0" /> {t("Proyek", "Projects")} ({projectsCount})
          </TabsTrigger>
          <TabsTrigger value="invoices" className="gap-1 px-2.5 text-xs sm:px-3 sm:text-sm">
            <Receipt className="h-3 w-3 shrink-0" /> {t("Invoice", "Invoices")} ({invoicesCount})
          </TabsTrigger>
          <TabsTrigger value="calendar" className="gap-1 px-2.5 text-xs sm:px-3 sm:text-sm">
            <Calendar className="h-3 w-3 shrink-0" /> {t("Kalender", "Calendar")}
          </TabsTrigger>
        </TabsList>
      </div>

      <TabsContent value="portal" className="pt-4">
        {portalContent}
      </TabsContent>

      <TabsContent value="projects" className="pt-4">
        {projectsContent}
      </TabsContent>

      <TabsContent value="invoices" className="pt-4">
        {invoicesContent}
      </TabsContent>

      <TabsContent value="calendar" className="pt-4">
        {calendarContent}
      </TabsContent>
    </Tabs>
  );
}
