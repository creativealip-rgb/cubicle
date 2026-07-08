import {
  FileText,
  Clock,
  CheckCircle2,
  FolderOpen,
  Activity,
} from "lucide-react";

interface ActivityItem {
  id: string;
  type: "invoice" | "time_entry" | "task" | "project";
  description: string;
  date: Date;
  icon: "invoice" | "clock" | "check" | "project";
}

const iconMap = {
  invoice: FileText,
  clock: Clock,
  check: CheckCircle2,
  project: FolderOpen,
};

const iconColorMap = {
  invoice: "text-blue-500 bg-blue-50",
  clock: "text-purple-500 bg-purple-50",
  check: "text-emerald-500 bg-emerald-50",
  project: "text-amber-500 bg-amber-50",
};

function relativeTime(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return "just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays === 1) return "yesterday";
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString();
}

export function ActivityFeed({ items }: { items: ActivityItem[] }) {
  if (items.length === 0) {
    return (
      <div className="py-8 text-center text-muted-foreground">
        <Activity className="h-10 w-10 mx-auto mb-2 opacity-30" />
        <p className="text-sm">No recent activity</p>
      </div>
    );
  }

  return (
    <div className="space-y-1">
      {items.map((item) => {
        const Icon = iconMap[item.icon];
        const colorClass = iconColorMap[item.icon];
        return (
          <div
            key={item.id}
            className="flex items-start gap-3 rounded-lg p-2.5 hover:bg-muted/50 transition-colors"
          >
            <div className={`rounded-full p-1.5 ${colorClass} shrink-0`}>
              <Icon className="h-3.5 w-3.5" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm leading-snug">{item.description}</p>
            </div>
            <span className="text-xs text-muted-foreground shrink-0 pt-0.5">
              {relativeTime(item.date)}
            </span>
          </div>
        );
      })}
    </div>
  );
}

export type { ActivityItem };
