import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

import { Button } from "@/components/ui/button";

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  action?: {
    label: string;
    href: string;
  };
  /** Custom action node (e.g. a dialog trigger) rendered in place of the link button. */
  actionNode?: ReactNode;
}

export function EmptyState({ icon: Icon, title, description, action, actionNode }: EmptyStateProps) {
  return (
    <div className="flex min-h-56 flex-col items-center justify-center rounded-xl border border-border/70 bg-card p-6 py-12 text-center shadow-xs">
      <div className="mb-3.5 flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
        <Icon className="h-6 w-6" />
      </div>
      <h3 className="font-semibold text-base text-foreground">{title}</h3>
      <p className="mt-1.5 max-w-sm text-xs sm:text-sm text-muted-foreground">{description}</p>
      {action ? (
        <Button asChild size="sm" className="mt-4 rounded-lg">
          <Link href={action.href}>{action.label}</Link>
        </Button>
      ) : actionNode ? (
        <div className="mt-4">{actionNode}</div>
      ) : null}
    </div>
  );
}
