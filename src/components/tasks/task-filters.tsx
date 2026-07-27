"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useTransition } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useT } from "@/lib/i18n-client";
import { Loader2 } from "lucide-react";

interface TaskFiltersProps {
  projects: Array<{ id: string; name: string }>;
  members: Array<{ id: string; name: string | null; email: string | null }>;
  currentUserId: string;
  current: {
    status?: string;
    priority?: string;
    projectId?: string;
    assignee?: string;
  };
}

export function TaskFilters({ projects, members, current, currentUserId }: TaskFiltersProps) {
  const { t } = useT();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [pending, startTransition] = useTransition();

  function apply(key: string, value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (!value || value === "all") {
      params.delete(key);
    } else {
      params.set(key, value);
    }
    startTransition(() => {
      router.push(`/app/tasks${params.toString() ? `?${params.toString()}` : ""}`);
    });
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Select value={current.status ?? "all"} onValueChange={(v) => apply("status", v)}>
        <SelectTrigger className="h-9 w-full text-xs sm:w-[140px]">
          <SelectValue placeholder={t("Status", "Status")} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">{t("Semua Status", "All Statuses")}</SelectItem>
          <SelectItem value="todo">{t("Belum Mulai", "To Do")}</SelectItem>
          <SelectItem value="in_progress">{t("Dikerjakan", "In Progress")}</SelectItem>
          <SelectItem value="review">{t("Review", "Review")}</SelectItem>
          <SelectItem value="done">{t("Selesai", "Done")}</SelectItem>
        </SelectContent>
      </Select>

      <Select value={current.priority ?? "all"} onValueChange={(v) => apply("priority", v)}>
        <SelectTrigger className="h-9 w-full text-xs sm:w-[140px]">
          <SelectValue placeholder={t("Prioritas", "Priority")} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">{t("Semua Prioritas", "All Priorities")}</SelectItem>
          <SelectItem value="urgent">{t("Mendesak", "Urgent")}</SelectItem>
          <SelectItem value="high">{t("Tinggi", "High")}</SelectItem>
          <SelectItem value="medium">{t("Sedang", "Medium")}</SelectItem>
          <SelectItem value="low">{t("Rendah", "Low")}</SelectItem>
        </SelectContent>
      </Select>

      <Select value={current.projectId ?? "all"} onValueChange={(v) => apply("projectId", v)}>
        <SelectTrigger className="h-9 w-full text-xs sm:w-[160px]">
          <SelectValue placeholder={t("Proyek", "Project")} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">{t("Semua Proyek", "All Projects")}</SelectItem>
          {projects.map((p) => (
            <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select value={current.assignee ?? "all"} onValueChange={(v) => apply("assignee", v)}>
        <SelectTrigger className="h-9 w-full text-xs sm:w-[160px]">
          <SelectValue placeholder={t("Ditugaskan ke", "Assignee")} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">{t("Semua Petugas", "All Assignees")}</SelectItem>
          <SelectItem value="me">{t("Saya", "Me")}</SelectItem>
          <SelectItem value="unassigned">{t("Belum ditugaskan", "Unassigned")}</SelectItem>
          {members.filter((m) => m.id !== currentUserId).map((m) => (
            <SelectItem key={m.id} value={m.id}>
              {m.name || m.email || m.id.slice(0, 8)}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {pending && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
    </div>
  );
}
