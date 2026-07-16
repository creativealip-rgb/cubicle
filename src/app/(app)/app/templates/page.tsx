import { Suspense } from "react";
import { TemplateCenterClient } from "@/components/template-center-client";

export default async function TemplateCenterPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const params = await searchParams;
  const tab =
    params.tab === "contract" || params.tab === "prompt" || params.tab === "invoice"
      ? params.tab
      : "invoice";

  return (
    <div className="p-6">
      <Suspense
        fallback={
          <div className="space-y-4">
            <div className="h-8 w-48 rounded bg-muted animate-pulse" />
            <div className="h-4 w-72 rounded bg-muted animate-pulse" />
            <div className="h-10 w-80 rounded bg-muted animate-pulse" />
          </div>
        }
      >
        <TemplateCenterClient initialTab={tab} />
      </Suspense>
    </div>
  );
}
