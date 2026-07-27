import Link from "next/link";
import { cn } from "@/lib/utils";

export type StatusFilterTab = {
  value: string;
  label: string;
  href: string;
  count?: number;
  /** Keep visible even when count is 0 and inactive. Default: true for value "all". */
  alwaysShow?: boolean;
};

type StatusFilterTabsProps = {
  tabs: StatusFilterTab[];
  activeValue: string;
  className?: string;
  listClassName?: string;
  /** Hide inactive zero-count tabs unless alwaysShow. Default true. */
  hideEmpty?: boolean;
};

/**
 * Shared status filter pills — same look as /app/projects:
 * muted track, white active pill, purple count badge when active.
 *
 * Plain links (no Radix Tabs) so active state always matches URL,
 * even with Next.js Link soft nav / SSR.
 */
export function StatusFilterTabs({
  tabs,
  activeValue,
  className,
  listClassName,
  hideEmpty = true,
}: StatusFilterTabsProps) {
  const visible = tabs.filter((tab) => {
    const active = tab.value === activeValue;
    if (active) return true;
    if (!hideEmpty) return true;
    if (tab.alwaysShow) return true;
    if (tab.value === "all") return true;
    if (typeof tab.count === "number" && tab.count === 0) return false;
    return true;
  });

  return (
    <div
      role="tablist"
      className={cn(
        "inline-flex h-auto w-full items-center justify-start overflow-x-auto rounded-lg bg-muted p-1 text-muted-foreground lg:w-auto",
        listClassName,
        className,
      )}
    >
      {visible.map((tab) => {
        const active = tab.value === activeValue;
        const hasCount = typeof tab.count === "number";
        return (
          <Link
            key={tab.value}
            href={tab.href}
            role="tab"
            aria-selected={active}
            data-state={active ? "active" : "inactive"}
            className={cn(
              "inline-flex shrink-0 items-center justify-center gap-1.5 whitespace-nowrap rounded-md px-3 py-1 text-sm font-medium transition-all",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
              active
                ? "bg-background text-foreground shadow"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            <span>{tab.label}</span>
            {hasCount ? (
              <span
                className={cn(
                  "rounded-full px-1.5 py-0.5 text-[10px] tabular-nums",
                  active
                    ? "bg-primary/10 text-primary"
                    : "bg-background/80 text-muted-foreground",
                )}
              >
                {tab.count}
              </span>
            ) : null}
          </Link>
        );
      })}
    </div>
  );
}
