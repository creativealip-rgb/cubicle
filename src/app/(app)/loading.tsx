import { Skeleton } from "@/components/ui/skeleton";

export default function AppLoading() {
  return (
    <div className="flex min-h-screen">
      {/* Sidebar skeleton — desktop only */}
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-[260px] flex-col border-r bg-sidebar-background lg:flex">
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
      <div className="flex min-w-0 flex-1 flex-col lg:ml-[260px]">
        {/* Topbar skeleton */}
        <header className="sticky top-0 z-30 flex h-14 items-center gap-2 border-b bg-background px-3 sm:gap-4 sm:px-4">
          <Skeleton className="h-9 w-9 shrink-0 lg:hidden" />
          <Skeleton className="hidden h-9 w-full max-w-md sm:block" />
          <div className="ml-auto flex items-center gap-1.5 sm:gap-2">
            <Skeleton className="h-9 w-9 sm:w-16" />
            <Skeleton className="h-9 w-9" />
            <Skeleton className="h-8 w-8 rounded-full" />
          </div>
        </header>

        {/* Content skeleton */}
        <main className="flex-1 p-3 sm:p-4 md:p-6">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-28 rounded-xl sm:h-32" />
            ))}
          </div>
          <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
            <div className="space-y-4 lg:col-span-2">
              <Skeleton className="h-10 w-40 sm:h-12 sm:w-48" />
              <Skeleton className="h-52 rounded-xl sm:h-64" />
            </div>
            <div className="space-y-4">
              <Skeleton className="h-10 w-40 sm:h-12 sm:w-48" />
              <Skeleton className="h-52 rounded-xl sm:h-64" />
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
