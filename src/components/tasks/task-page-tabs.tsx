"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";

export function TaskPageTabs({ current }: { current: "tasks" | "templates" }) {
  return <div className="inline-flex rounded-lg border bg-muted/30 p-1">
    <Button asChild size="sm" variant={current === "tasks" ? "default" : "ghost"}><Link href="/app/tasks?tab=tasks">Tugas Proyek</Link></Button>
    <Button asChild size="sm" variant={current === "templates" ? "default" : "ghost"}><Link href="/app/tasks?tab=templates">Template Tugas</Link></Button>
  </div>;
}
