import { Skeleton } from "@/components/ui/skeleton";

export default function PromptsLoading() {
  return (
    <div className="space-y-6">
      <div>
        <Skeleton className="mb-2 h-8 w-56" />
        <Skeleton className="h-4 w-80" />
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-20 rounded-xl" />
        ))}
      </div>
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-5">
        <div className="lg:col-span-3 space-y-4">
          <Skeleton className="h-10 w-48" />
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-40 w-full" />
        </div>
        <div className="lg:col-span-2 space-y-3">
          <Skeleton className="h-10 w-32" />
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-16 w-full rounded-lg" />
          ))}
        </div>
      </div>
    </div>
  );
}
