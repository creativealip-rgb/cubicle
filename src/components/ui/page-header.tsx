import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface PageHeaderProps {
  icon?: LucideIcon;
  title?: ReactNode;
  description?: ReactNode;
  badge?: ReactNode;
  actions?: ReactNode;
  children?: ReactNode;
  className?: string;
}

export function PageHeader({
  icon: Icon,
  title,
  description,
  badge,
  actions,
  children,
  className,
}: PageHeaderProps) {
  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-xl border border-border/70 bg-gradient-to-r from-primary/[0.04] via-violet-500/[0.02] to-transparent p-3.5 sm:p-4 transition-all",
        className,
      )}
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3 min-w-0">
          {Icon && (
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary shadow-xs ring-1 ring-primary/20">
              <Icon className="h-4 w-4" />
            </div>
          )}
          <div className="min-w-0">
            {title ? (
              <>
                <div className="flex items-center gap-2">
                  <h1 className="text-lg sm:text-xl font-bold tracking-tight text-foreground truncate">
                    {title}
                  </h1>
                  {badge && <div className="shrink-0">{badge}</div>}
                </div>
                {description && (
                  <p className="text-xs text-muted-foreground truncate max-w-2xl mt-0.5">
                    {description}
                  </p>
                )}
              </>
            ) : (
              children
            )}
          </div>
        </div>

        {actions && (
          <div className="flex shrink-0 flex-wrap items-center gap-2">
            {actions}
          </div>
        )}
      </div>
    </div>
  );
}

export function PageHeaderTitle({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return <h1 className={cn("text-lg sm:text-xl font-bold tracking-tight text-foreground", className)}>{children}</h1>;
}

export function PageHeaderDescription({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return <p className={cn("text-xs text-muted-foreground mt-0.5", className)}>{children}</p>;
}
