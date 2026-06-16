import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent } from "@/components/ui/card";

export default function TimeLoading() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <Skeleton className="h-8 w-40" />
          <Skeleton className="h-4 w-56 mt-2" />
        </div>
        <div className="flex gap-2">
          <Skeleton className="h-9 w-28" />
          <Skeleton className="h-9 w-28" />
        </div>
      </div>

      {/* Timer skeleton */}
      <Card>
        <CardContent className="p-6 space-y-4">
          <Skeleton className="h-5 w-24" />
          <div className="grid grid-cols-3 gap-3">
            <Skeleton className="h-9 w-full" />
            <Skeleton className="h-9 w-full" />
            <Skeleton className="h-9 w-full" />
          </div>
          <Skeleton className="h-9 w-full" />
          <Skeleton className="h-10 w-full" />
        </CardContent>
      </Card>

      {/* Summary skeleton */}
      <div className="grid grid-cols-3 gap-3">
        {[1, 2, 3].map((i) => (
          <Card key={i}>
            <CardContent className="p-4">
              <Skeleton className="h-3 w-16" />
              <Skeleton className="h-7 w-20 mt-2" />
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Entry list skeleton */}
      <div className="space-y-2">
        {[1, 2, 3, 4, 5].map((i) => (
          <Card key={i}>
            <CardContent className="p-4 flex items-center gap-3">
              <Skeleton className="h-5 w-5 rounded" />
              <div className="flex-1">
                <Skeleton className="h-4 w-40" />
                <Skeleton className="h-3 w-56 mt-1" />
              </div>
              <Skeleton className="h-5 w-14 rounded" />
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
