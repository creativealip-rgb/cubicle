"use client";

import { useSearchParams } from "next/navigation";
import { StatusFilterTabs } from "@/components/ui/status-filter-tabs";

export function TaskPageTabs({ current }: { current: "tasks" | "templates" }) {
  const searchParams = useSearchParams();
  const href = (tab: "tasks" | "templates") => {
    const next = new URLSearchParams(searchParams.toString());
    next.set("tab", tab);
    next.delete("page");
    return `/app/tasks?${next.toString()}`;
  };
  return <StatusFilterTabs activeValue={current} hideEmpty={false} tabs={[
    { value: "tasks", label: "Tugas Proyek", href: href("tasks"), alwaysShow: true },
    { value: "templates", label: "Template Tugas", href: href("templates"), alwaysShow: true },
  ]} />;
}
