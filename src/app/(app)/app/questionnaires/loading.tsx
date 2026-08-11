import { Skeleton } from "@/components/ui/skeleton";

export default function QuestionnairesLoading() {
  return (
    <div className="min-w-0 space-y-4 sm:space-y-6">
      <div className="app-page-header">
        <div className="space-y-2">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-4 w-72" />
        </div>
        <Skeleton className="h-9 w-40" />
      </div>
      <Skeleton className="h-10 w-full rounded-xl" />
      <div className="rounded-2xl border bg-white p-6 space-y-4">
        {[1, 2, 3, 4].map((row) => (
          <div key={row} className="flex items-center gap-4">
            <Skeleton className="h-10 w-10 rounded-lg" />
            <div className="flex-1 space-y-2"><Skeleton className="h-4 w-48" /><Skeleton className="h-3 w-72" /></div>
            <Skeleton className="h-8 w-24" />
          </div>
        ))}
      </div>
    </div>
  );
}