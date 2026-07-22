import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent } from "@/components/ui/card";

/** Only the list panel — tree in layout stays visible while files load. */
export default function FilesLoading() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-4 w-64" />
      <div className="space-y-3">
        {[1, 2, 3, 4, 5].map((i) => (
          <Card key={i}>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <Skeleton className="h-5 w-5 rounded" />
                <div className="flex-1">
                  <Skeleton className="h-4 w-48" />
                  <Skeleton className="h-3 w-64 mt-1" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
