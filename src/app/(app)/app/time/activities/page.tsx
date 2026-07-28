import { getWorkspaceActivities } from "@/lib/actions/activities";
import {
  ActivityCatalog,
  type CatalogActivity,
} from "@/components/activities/activity-catalog";
import { TimePageShell } from "@/components/time/time-header";

export const dynamic = "force-dynamic";

export default async function TimeActivitiesPage() {
  const rows = await getWorkspaceActivities({ includeArchived: true });
  const activities: CatalogActivity[] = rows.map((row) => ({
    id: row.id,
    name: row.name,
    defaultBillable: row.defaultBillable,
    defaultHourlyRate: row.defaultHourlyRate,
    status: row.status,
  }));

  return (
    <TimePageShell>
      <ActivityCatalog activities={activities} />
    </TimePageShell>
  );
}
