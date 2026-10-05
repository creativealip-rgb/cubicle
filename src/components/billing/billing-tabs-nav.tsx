"use client";

import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useT } from "@/lib/i18n-client";

export function BillingTabsNav({ currentTab }: { currentTab: string }) {
  const { t } = useT();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const handleTabChange = (value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (value === "plans") {
      params.delete("tab");
    } else {
      params.set("tab", value);
    }
    const query = params.toString();
    router.replace(`${pathname}${query ? `?${query}` : ""}`, { scroll: false });
  };

  return (
    <Tabs value={currentTab} onValueChange={handleTabChange} className="w-fit">
      <TabsList className="bg-muted/80 p-1">
        <TabsTrigger value="plans" className="text-xs font-semibold px-4">
          {t("Paket", "Plans")}
        </TabsTrigger>
        <TabsTrigger value="addons" className="text-xs font-semibold px-4">
          {t("Add-on", "Add-ons")}
        </TabsTrigger>
      </TabsList>
    </Tabs>
  );
}
