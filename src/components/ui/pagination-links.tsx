import Link from "next/link";
import { Button } from "@/components/ui/button";

export function PaginationLinks({ page, totalPages, href, labels }: { page: number; totalPages: number; href: (page: number) => string; labels: { previous: string; next: string; page: string } }) {
  if (totalPages <= 1) return null;
  return <nav aria-label={labels.page} className="flex items-center justify-between gap-3 pt-2">
    <Button asChild={page > 1} variant="outline" size="sm" disabled={page <= 1}>{page > 1 ? <Link href={href(page - 1)} scroll={false}>{labels.previous}</Link> : <span>{labels.previous}</span>}</Button>
    <span className="text-xs text-muted-foreground">{labels.page} {page} / {totalPages}</span>
    <Button asChild={page < totalPages} variant="outline" size="sm" disabled={page >= totalPages}>{page < totalPages ? <Link href={href(page + 1)} scroll={false}>{labels.next}</Link> : <span>{labels.next}</span>}</Button>
  </nav>;
}
