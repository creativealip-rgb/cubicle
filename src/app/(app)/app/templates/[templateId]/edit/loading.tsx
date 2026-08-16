import { Skeleton } from "@/components/ui/skeleton";

export default function TemplateEditorLoading() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-4 w-32" />
      <div className="app-page-header">
        <div>
          <Skeleton className="h-8 w-64" />
          <Skeleton className="mt-1 h-4 w-96" />
        </div>
      </div>
      <Skeleton className="h-[70vh] w-full rounded-xl" />
    </div>
  );
}
