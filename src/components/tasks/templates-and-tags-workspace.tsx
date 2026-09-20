"use client";

import { useState } from "react";
import { LayoutTemplate, Tag } from "lucide-react";
import { TaskTemplateWorkspace } from "@/components/tasks/task-template-workspace";
import { TimerTagsManager } from "@/components/tasks/timer-tags-manager";
import { useT } from "@/lib/i18n-client";
import { cn } from "@/lib/utils";

type Tab = "templates" | "tags";

export function TemplatesAndTagsWorkspace({
  templates,
  projects,
  tags,
}: {
  templates: Array<{
    id: string;
    name: string;
    description: string | null;
    target: "fixed_price" | "hourly_retainer" | "all";
    status: "active" | "archived";
    createdAt: Date;
    updatedAt: Date;
    items: Array<{
      id: string;
      templateId: string;
      title: string;
      description: string | null;
      defaultAssigneeId: string | null;
      position: number;
    }>;
  }>;
  projects: Array<{ id: string; name: string }>;
  tags: Array<{ id: string; name: string; color: string | null }>;
}) {
  const { t } = useT();
  const [activeTab, setActiveTab] = useState<Tab>("templates");

  return (
    <div className="space-y-6">
      <div className="inline-flex rounded-lg border bg-muted/40 p-1">
        <button
          type="button"
          onClick={() => setActiveTab("templates")}
          className={cn(
            "flex items-center gap-2 rounded-md px-3 py-1.5 text-xs font-semibold transition-colors",
            activeTab === "templates"
              ? "bg-background text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground",
          )}
        >
          <LayoutTemplate className="h-3.5 w-3.5 text-primary" />
          {t("Template Tugas", "Task Templates")}
          <span className="rounded-full bg-primary/10 px-1.5 py-0.2 text-[10px] text-primary font-bold">
            {templates.length}
          </span>
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("tags")}
          className={cn(
            "flex items-center gap-2 rounded-md px-3 py-1.5 text-xs font-semibold transition-colors",
            activeTab === "tags"
              ? "bg-background text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground",
          )}
        >
          <Tag className="h-3.5 w-3.5 text-primary" />
          {t("Tag Timer", "Timer Tags")}
          <span className="rounded-full bg-primary/10 px-1.5 py-0.2 text-[10px] text-primary font-bold">
            {tags.length}
          </span>
        </button>
      </div>

      {activeTab === "templates" ? (
        <TaskTemplateWorkspace templates={templates} projects={projects} />
      ) : (
        <TimerTagsManager initialTags={tags} />
      )}
    </div>
  );
}
