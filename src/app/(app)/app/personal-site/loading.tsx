import { Skeleton } from "@/components/ui/skeleton";

export default function PersonalSiteLoading() {
  return (
    <div className="space-y-6">
      <div className="app-page-header">
        <div>
          <Skeleton className="h-8 w-40" />
          <Skeleton className="mt-1 h-4 w-64" />
        </div>
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <Skeleton className="h-[60vh] w-full rounded-xl" />
        <Skeleton className="h-[60vh] w-full rounded-xl" />
      </div>
    </div>
  );
}
