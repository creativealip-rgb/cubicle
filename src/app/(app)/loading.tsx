import { Skeleton } from "@/components/ui/skeleton";

export default function AppLoading() {
  return (
    <div className="flex min-h-screen">
      {/* Sidebar skeleton */}
      <aside className="fixed inset-y-0 left-0 z-40 flex w-[260px] flex-col border-r bg-sidebar-background">
        <div className="flex h-14 items-center border-b px-4">
          <Skeleton className="h-7 w-20" />
        </div>
        <div className="flex-1 space-y-2 px-3 py-4">
          {Array.from({ length: 10 }).map((_, i) => (
            <Skeleton key={i} className="h-9 w-full rounded-lg" />
          ))}
        </div>
      </aside>

      {/* Main area */}
      <div className="ml-[260px] flex flex-1 flex-col">
        {/* Topbar skeleton */}
        <header className="sticky top-0 z-30 flex h-14 items-center gap-4 border-b bg-background px-4">
          <Skeleton className="h-9 w-full max-w-md" />
          <div className="ml-auto flex items-center gap-2">
            <Skeleton className="h-9 w-16" />
            <Skeleton className="h-9 w-16" />
            <Skeleton className="h-8 w-8 rounded-full" />
          </div>
        </header>

        {/* Content skeleton */}
        <main className="flex-1 p-6">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-32 rounded-xl" />
            ))}
          </div>
          <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
            <div className="lg:col-span-2 space-y-4">
              <Skeleton className="h-12 w-48" />
              <Skeleton className="h-64 rounded-xl" />
            </div>
            <div className="space-y-4">
              <Skeleton className="h-12 w-48" />
              <Skeleton className="h-64 rounded-xl" />
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
