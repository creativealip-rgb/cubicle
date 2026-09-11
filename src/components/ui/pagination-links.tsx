import Link from "next/link";
import { Button } from "@/components/ui/button";

type PaginationLabels = { previous: string; next: string; page: string };

type PaginationLinksProps = {
  page: number;
  totalPages: number;
  href: (page: number) => string;
  labels: PaginationLabels;
  total?: number;
  pageSize?: number;
};

export function PaginationLinks({ page, totalPages, href, labels, total, pageSize = 10 }: PaginationLinksProps) {
  if (totalPages <= 1) return null;
  const from = total ? (page - 1) * pageSize + 1 : 0;
  const to = total ? Math.min(page * pageSize, total) : 0;
  return (
    <nav aria-label={labels.page} className="flex flex-col gap-3 border-t border-border/70 pt-4 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
      {total ? <span className="tabular-nums">{from}–{to} / {total}</span> : <span className="tabular-nums">{labels.page} {page} / {totalPages}</span>}
      <div className="flex items-center gap-2">
        <Button asChild={page > 1} variant="outline" size="sm" className="h-8 gap-1 text-xs" disabled={page <= 1}>{page > 1 ? <Link href={href(page - 1)} scroll={false}><span className="sr-only">{labels.previous}</span>‹</Link> : <span><span className="sr-only">{labels.previous}</span>‹</span>}</Button>
        <span className="min-w-12 text-center tabular-nums">{page}/{totalPages}</span>
        <Button asChild={page < totalPages} variant="outline" size="sm" className="h-8 gap-1 text-xs" disabled={page >= totalPages}>{page < totalPages ? <Link href={href(page + 1)} scroll={false}><span className="sr-only">{labels.next}</span>›</Link> : <span><span className="sr-only">{labels.next}</span>›</span>}</Button>
      </div>
    </nav>
  );
}
