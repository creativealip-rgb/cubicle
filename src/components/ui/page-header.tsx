import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function PageHeader({
  children,
  actions,
  className,
}: {
  children: ReactNode;
  actions?: ReactNode;
  className?: string;
}) {
  return (
    <header className={cn("app-page-header", className)}>
      <div className="min-w-0">{children}</div>
      {actions ? <div className="app-page-actions">{actions}</div> : null}
    </header>
  );
}

export function PageHeaderTitle({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return <h1 className={cn("app-page-title", className)}>{children}</h1>;
}

export function PageHeaderDescription({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return <p className={cn("app-page-description", className)}>{children}</p>;
}
