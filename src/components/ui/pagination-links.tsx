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

export function PaginationLinks({ page, totalPages, href, labels }: PaginationLinksProps) {
  if (totalPages <= 1) return null;
  return (
    <nav aria-label={labels.page} className="flex flex-wrap items-center justify-between gap-3 pt-4">
      <span className="text-sm text-muted-foreground">
        {labels.page} {page} {labels.page.includes("Halaman") ? "dari" : "of"} {totalPages}
      </span>
      <div className="flex gap-2">
        <Button
          asChild={page > 1}
          variant="outline"
          size="sm"
          className={`h-9 rounded border px-3 py-2 text-sm font-medium ${page <= 1 ? "pointer-events-none opacity-50" : ""}`}
          disabled={page <= 1}
        >
          {page > 1 ? (
            <Link href={href(page - 1)} scroll={false}>
              {labels.previous}
            </Link>
          ) : (
            <span>{labels.previous}</span>
          )}
        </Button>
        <Button
          asChild={page < totalPages}
          variant="outline"
          size="sm"
          className={`h-9 rounded border px-3 py-2 text-sm font-medium ${page >= totalPages ? "pointer-events-none opacity-50" : ""}`}
          disabled={page >= totalPages}
        >
          {page < totalPages ? (
            <Link href={href(page + 1)} scroll={false}>
              {labels.next}
            </Link>
          ) : (
            <span>{labels.next}</span>
          )}
        </Button>
      </div>
    </nav>
  );
}

