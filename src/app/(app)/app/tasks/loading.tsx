import { Skeleton } from "@/components/ui/skeleton";

export default function TasksLoading() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <Skeleton className="h-8 w-16" />
          <Skeleton className="mt-1 h-4 w-48" />
        </div>
        <Skeleton className="h-9 w-24" />
      </div>
      <div className="flex gap-2">
        <Skeleton className="h-8 w-[130px]" />
        <Skeleton className="h-8 w-[130px]" />
        <Skeleton className="h-8 w-[150px]" />
      </div>
      <div className="space-y-2">
        {Array.from({ length: 8 }).map((_, i) => (
          <Skeleton key={i} className="h-16 w-full rounded-lg" />
        ))}
      </div>
    </div>
  );
}
