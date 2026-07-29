import { TimeRouteContent } from "@/components/time/time-route-content";
import { localDateIso } from "@/lib/effective-work-date";

export default async function Page({ searchParams }: { searchParams: Promise<{ view?: string; date?: string; action?: string }> }) {
  const params = await searchParams;
  const view = params.view === "weekly" ? "weekly" : "daily";
  const selectedDate = /^\d{4}-\d{2}-\d{2}$/.test(params.date ?? "") ? params.date! : localDateIso(new Date());
  return <TimeRouteContent mode={view === "weekly" ? "timesheet" : "history"} view={view} selectedDate={selectedDate} action={params.action} />;
}
