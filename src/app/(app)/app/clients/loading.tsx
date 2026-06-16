import { Skeleton } from "@/components/ui/skeleton";

export default function ClientsLoading() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <Skeleton className="h-8 w-24" />
          <Skeleton className="mt-1 h-4 w-48" />
        </div>
        <Skeleton className="h-9 w-28" />
      </div>
      <div className="flex items-center justify-between">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-10 w-64" />
      </div>
      <div className="rounded-lg border">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex items-center gap-4 p-3 border-b last:border-0">
            <div className="flex-1 space-y-2">
              <Skeleton className="h-5 w-32" />
              <Skeleton className="h-3 w-20" />
            </div>
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-4 w-12" />
            <Skeleton className="h-5 w-16" />
            <Skeleton className="h-8 w-8 rounded-full" />
          </div>
        ))}
      </div>
    </div>
  );
}
