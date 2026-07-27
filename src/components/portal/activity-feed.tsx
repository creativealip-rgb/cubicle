"use client";

import { useState } from "react";
import {
  FileText,
  Clock,
  CheckCircle2,
  FolderOpen,
  Activity,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useT } from "@/lib/i18n-client";
import { portalLocale } from "@/lib/portal-i18n";

interface ActivityItem {
  id: string;
  type: "invoice" | "time_entry" | "task" | "project" | "file";
  description: string;
  date: Date | string;
  icon: "invoice" | "clock" | "check" | "project" | "file";
}

const iconMap = {
  invoice: FileText,
  clock: Clock,
  check: CheckCircle2,
  project: FolderOpen,
  file: FileText,
};

const iconColorMap = {
  invoice: "text-blue-500 bg-blue-50",
  clock: "text-purple-500 bg-purple-50",
  check: "text-emerald-500 bg-emerald-50",
  project: "text-amber-500 bg-amber-50",
  file: "text-sky-500 bg-sky-50",
};

const DEFAULT_VISIBLE = 3;

function relativeTime(date: Date, lang: "id" | "en"): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return lang === "en" ? "just now" : "baru saja";
  if (diffMins < 60)
    return lang === "en" ? `${diffMins}m ago` : `${diffMins}m lalu`;
  if (diffHours < 24)
    return lang === "en" ? `${diffHours}h ago` : `${diffHours}j lalu`;
  if (diffDays === 1) return lang === "en" ? "yesterday" : "kemarin";
  if (diffDays < 7)
    return lang === "en" ? `${diffDays}d ago` : `${diffDays}h lalu`;
  return date.toLocaleDateString(portalLocale(lang), {
    day: "numeric",
    month: "short",
  });
}

export function ActivityFeed({
  items,
  initialVisible = DEFAULT_VISIBLE,
}: {
  items: ActivityItem[];
  /** How many rows to show before "Show more". Default 3. */
  initialVisible?: number;
}) {
  const { lang, t } = useT();
  const [expanded, setExpanded] = useState(false);

  if (items.length === 0) {
    return (
      <div className="py-8 text-center text-muted-foreground">
        <Activity className="mx-auto mb-2 h-10 w-10 opacity-30" />
        <p className="text-sm">
          {t("Belum ada aktivitas terbaru", "No recent activity")}
        </p>
      </div>
    );
  }

  const limit = Math.max(1, initialVisible);
  const visible = expanded ? items : items.slice(0, limit);
  const hiddenCount = Math.max(0, items.length - limit);

  return (
    <div className="space-y-1">
      {visible.map((item) => {
        const Icon = iconMap[item.icon] ?? Activity;
        const colorClass =
          iconColorMap[item.icon] ?? "text-slate-500 bg-slate-50";
        const date =
          item.date instanceof Date ? item.date : new Date(item.date);
        return (
          <div
            key={item.id}
            className="flex items-start gap-3 rounded-lg p-2.5 transition-colors hover:bg-muted/50"
          >
            <div className={`shrink-0 rounded-full p-1.5 ${colorClass}`}>
              <Icon className="h-3.5 w-3.5" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm leading-snug">{item.description}</p>
            </div>
            <span className="shrink-0 pt-0.5 text-xs text-muted-foreground">
              {relativeTime(date, lang)}
            </span>
          </div>
        );
      })}

      {hiddenCount > 0 && (
        <div className="pt-1">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-8 w-full gap-1 text-xs text-muted-foreground"
            onClick={() => setExpanded((v) => !v)}
          >
            {expanded ? (
              <>
                <ChevronUp className="h-3.5 w-3.5" />
                {t("Sembunyikan", "Hide")}
              </>
            ) : (
              <>
                <ChevronDown className="h-3.5 w-3.5" />
                {t("Lihat", "View")} {hiddenCount} {t("lainnya", "more")}
              </>
            )}
          </Button>
        </div>
      )}
    </div>
  );
}

export type { ActivityItem };
