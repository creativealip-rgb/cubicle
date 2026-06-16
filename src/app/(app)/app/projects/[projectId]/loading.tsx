import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent } from "@/components/ui/card";

export default function ProjectDetailLoading() {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-4 w-40" />
      </div>
      <Card>
        <CardContent className="p-4 space-y-2">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-3 w-full rounded-full" />
        </CardContent>
      </Card>
      <Skeleton className="h-10 w-64" />
      <div className="grid grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-64 rounded-lg" />
        ))}
      </div>
    </div>
  );
}
