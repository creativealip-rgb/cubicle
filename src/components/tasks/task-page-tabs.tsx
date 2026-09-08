"use client";

import { useSearchParams } from "next/navigation";
import { StatusFilterTabs } from "@/components/ui/status-filter-tabs";
import { useT } from "@/lib/i18n-client";

type TaskPageTab = "workflow" | "reusable" | "templates";

export function TaskPageTabs({ current }: { current: TaskPageTab }) {
  const { t } = useT();
  const searchParams = useSearchParams();
  const href = (tab: TaskPageTab) => {
    const next = new URLSearchParams(searchParams.toString());
    next.set("tab", tab);
    next.delete("page");
    return `/app/tasks?${next.toString()}`;
  };
  return <StatusFilterTabs activeValue={current} hideEmpty={false} tabs={[
    { value: "workflow", label: t("Sekali", "One-time"), href: href("workflow"), alwaysShow: true },
    { value: "reusable", label: t("Berulang", "Recurring"), href: href("reusable"), alwaysShow: true },
    { value: "templates", label: t("Template", "Templates"), href: href("templates"), alwaysShow: true },
  ]} />;
}
