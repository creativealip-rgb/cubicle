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
      <TemplateCenterClient initialTab={tab} />
    </div>
  );
}
