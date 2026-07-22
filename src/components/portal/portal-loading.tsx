import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent } from "@/components/ui/card";

/** Full-page skeleton while client portal token page loads. */
export function PortalPageSkeleton() {
  return (
    <div className="min-h-screen bg-muted/30">
      <div className="mx-auto max-w-5xl space-y-8 px-4 py-12">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-start gap-3">
            <Skeleton className="h-12 w-12 rounded-xl" />
            <div className="space-y-2">
              <Skeleton className="h-6 w-48" />
              <Skeleton className="h-4 w-36" />
            </div>
          </div>
          <div className="flex gap-2">
            <Skeleton className="h-9 w-28 rounded-md" />
            <Skeleton className="h-9 w-24 rounded-md" />
          </div>
        </div>

        {/* Tab bar */}
        <div className="flex flex-wrap gap-1 rounded-lg bg-muted/60 p-1">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-9 w-24 rounded-md" />
          ))}
        </div>

        {/* Content cards */}
        <div className="space-y-4">
          <Skeleton className="h-5 w-40" />
          {Array.from({ length: 3 }).map((_, i) => (
            <Card key={i} className="overflow-hidden">
              <CardContent className="space-y-3 p-5">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex flex-1 items-start gap-3">
                    <Skeleton className="mt-1 h-5 w-5 rounded" />
                    <div className="w-full space-y-2">
                      <Skeleton className="h-5 w-2/3 max-w-xs" />
                      <Skeleton className="h-3 w-40" />
                      <Skeleton className="h-3 w-56" />
                    </div>
                  </div>
                  <Skeleton className="h-6 w-24 rounded-full" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}

export function PortalTabsFallback() {
  return (
    <div className="space-y-5">
      <div className="flex flex-wrap gap-1 rounded-lg bg-muted/60 p-1">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-9 w-24 rounded-md" />
        ))}
      </div>
      <div className="min-h-[min(70vh,640px)] space-y-4">
        <Skeleton className="h-5 w-36" />
        {Array.from({ length: 2 }).map((_, i) => (
          <Card key={i}>
            <CardContent className="space-y-3 p-5">
              <Skeleton className="h-5 w-1/2 max-w-sm" />
              <Skeleton className="h-3 w-40" />
              <Skeleton className="h-20 w-full rounded-lg" />
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
