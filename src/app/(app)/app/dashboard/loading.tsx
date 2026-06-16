import { Skeleton } from "@/components/ui/skeleton";

export default function DashboardLoading() {
  return (
    <div className="space-y-6">
      {/* Header skeleton */}
      <div>
        <Skeleton className="h-8 w-40" />
        <Skeleton className="mt-2 h-4 w-64" />
      </div>

      {/* KPI skeletons */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="rounded-xl border p-6">
            <div className="flex items-start justify-between">
              <div className="space-y-3">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-8 w-20" />
                <Skeleton className="h-3 w-32" />
              </div>
              <Skeleton className="h-10 w-10 rounded-lg" />
            </div>
          </div>
        ))}
      </div>

      {/* Content grid skeletons */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 rounded-xl border p-6">
          <div className="flex items-center justify-between mb-4">
            <Skeleton className="h-5 w-32" />
            <Skeleton className="h-8 w-16" />
          </div>
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="mt-4">
              <div className="flex justify-between">
                <div className="space-y-2">
                  <Skeleton className="h-4 w-36" />
                  <Skeleton className="h-3 w-48" />
                </div>
                <Skeleton className="h-3 w-12" />
              </div>
              {i < 4 && <Skeleton className="mt-4 h-px w-full" />}
            </div>
          ))}
        </div>
        <div className="space-y-6">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-44 rounded-xl" />
          ))}
        </div>
      </div>
    </div>
  );
}
