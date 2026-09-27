import { TimeRouteContent } from "@/components/time/time-route-content";
import { getTimerTags } from "@/lib/actions/tags";
import { TimerTagsManager } from "@/components/tasks/timer-tags-manager";
import { TimePageShell } from "@/components/time/time-header";

function dateInTimezone(timezone: string): string {
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone: timezone, year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(new Date());
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${values.year}-${values.month}-${values.day}`;
}

export default async function Page({ searchParams }: { searchParams: Promise<{ view?: string; date?: string; action?: string }> }) {
  const params = await searchParams;
  if (params.view === "tags") {
    const tags = await getTimerTags();
    return (
      <TimePageShell>
        <div className="max-w-2xl">
          <TimerTagsManager initialTags={tags} />
        </div>
      </TimePageShell>
    );
  }
  const view = params.view === "weekly" ? "weekly" : "daily";
  const selectedDate = /^\d{4}-\d{2}-\d{2}$/.test(params.date ?? "") ? params.date! : dateInTimezone("Asia/Jakarta");
  return <TimeRouteContent mode={view === "weekly" ? "timesheet" : "history"} view={view} selectedDate={selectedDate} action={params.action} />;
}
