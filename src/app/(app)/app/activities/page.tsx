import { getWorkspaceActivities } from "@/lib/actions/activities";
import {
  ActivityCatalog,
  type CatalogActivity,
} from "@/components/activities/activity-catalog";

export const dynamic = "force-dynamic";

export default async function ActivitiesPage() {
  const rows = await getWorkspaceActivities({ includeArchived: true });
  const activities: CatalogActivity[] = rows.map((row) => ({
    id: row.id,
    name: row.name,
    defaultBillable: row.defaultBillable,
    defaultHourlyRate: row.defaultHourlyRate,
    status: row.status,
  }));

  return <ActivityCatalog activities={activities} />;
}
