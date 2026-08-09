"use client";

import { useSearchParams } from "next/navigation";
import { StatusFilterTabs } from "@/components/ui/status-filter-tabs";
import { useT } from "@/lib/i18n-client";

export function TaskPageTabs({ current }: { current: "tasks" | "templates" }) {
  const { t } = useT();
  const searchParams = useSearchParams();
  const href = (tab: "tasks" | "templates") => {
    const next = new URLSearchParams(searchParams.toString());
    next.set("tab", tab);
    next.delete("page");
    return `/app/tasks?${next.toString()}`;
  };
  return <StatusFilterTabs activeValue={current} hideEmpty={false} tabs={[
    { value: "tasks", label: t("Tugas Proyek", "Project Tasks"), href: href("tasks"), alwaysShow: true },
    { value: "templates", label: t("Template Tugas", "Task Templates"), href: href("templates"), alwaysShow: true },
  ]} />;
}
