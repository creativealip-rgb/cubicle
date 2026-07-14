import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { db } from "@/db";
import {
  appointments,
  availabilityRules,
  users,
} from "@/db/schema";
import { eq, and, gte } from "drizzle-orm";
import { requireUser, assertWorkspaceMember } from "@/lib/access";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { cancelAppointment, deleteAvailabilityRule } from "@/lib/actions/appointments";
import { Calendar, Clock, MapPin, XCircle } from "lucide-react";
import Link from "next/link";
import { getWorkspaceFullForCurrentUser } from "@/lib/workspace";
import { AvailabilityRuleForm } from "@/components/calendar/availability-rule-form";

export default async function CalendarPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  const user = requireUser(session?.user);
  const ws = await getWorkspaceFullForCurrentUser();
  const workspaceId = ws.id;
  await assertWorkspaceMember(db, user.id, workspaceId);

  // Upcoming appointments
  const upcoming = await db
    .select({
      id: appointments.id,
      title: appointments.title,
      notes: appointments.notes,
      attendeeName: appointments.attendeeName,
      attendeeEmail: appointments.attendeeEmail,
      startTime: appointments.startTime,
      endTime: appointments.endTime,
      status: appointments.status,
      userId: appointments.userId,
      userName: users.name,
    })
    .from(appointments)
    .leftJoin(users, eq(users.id, appointments.userId))
    .where(
      and(
        eq(appointments.workspaceId, workspaceId),
        eq(appointments.status, "scheduled"),
        gte(appointments.startTime, new Date())
      )
    )
    .orderBy(appointments.startTime)
    .limit(20);

  // Availability rules
  const rules = await db
    .select({
      id: availabilityRules.id,
      dayOfWeek: availabilityRules.dayOfWeek,
      startTime: availabilityRules.startTime,
      endTime: availabilityRules.endTime,
      timezone: availabilityRules.timezone,
    })
    .from(availabilityRules)
    .where(eq(availabilityRules.workspaceId, workspaceId))
    .orderBy(availabilityRules.dayOfWeek);

  const dayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

  function formatDateTime(d: string | Date): string {
    return new Date(d).toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  function formatTime(d: string | Date): string {
    return new Date(d).toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Kalender</h1>
          <p className="text-sm text-muted-foreground">
            Kelola janji temu dan ketersediaan
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" asChild>
            <Link href="/app/questionnaires/new">
              Buat formulir
            </Link>
          </Button>
          {ws.bookingSlug && (
            <Button variant="outline" size="sm" asChild>
              <Link href={`/booking/${ws.bookingSlug}`} target="_blank">
                <Calendar className="mr-2 h-4 w-4" />
                Public Booking Page
              </Link>
            </Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Availability Rules */}
        <Card className="lg:col-span-1">
          <CardHeader className="flex flex-row items-center justify-between gap-3">
            <CardTitle className="text-base font-semibold">
              <Clock className="mr-2 inline h-4 w-4" />
              Availability Rules
            </CardTitle>
            <AvailabilityRuleForm />
          </CardHeader>
          <CardContent className="space-y-2">
            {rules.length === 0 && (
              <div className="py-6 text-center">
                <Calendar className="mx-auto mb-2 h-8 w-8 text-muted-foreground/50" />
                <p className="text-sm text-muted-foreground">No availability rules set</p>
                <p className="text-xs text-muted-foreground">
                  Add rules to define when you&apos;re available for bookings
                </p>
              </div>
            )}
            {rules.map((rule) => (
              <div
                key={rule.id}
                className="flex items-center justify-between rounded-lg border p-3"
              >
                <div>
                  <p className="text-sm font-medium">{dayNames[rule.dayOfWeek]}</p>
                  <p className="text-xs text-muted-foreground">
                    {rule.startTime.substring(0, 5)} – {rule.endTime.substring(0, 5)} ({rule.timezone})
                  </p>
                </div>
                <form
                  action={async () => {
                    "use server";
                    await deleteAvailabilityRule(rule.id);
                  }}
                >
                  <Button variant="ghost" size="icon" className="h-7 w-7" type="submit">
                    <XCircle className="h-4 w-4 text-red-500" />
                  </Button>
                </form>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Upcoming Appointments */}
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base font-semibold">
              <Calendar className="mr-2 inline h-4 w-4" />
              Upcoming Appointments
            </CardTitle>
            <Badge variant="secondary" className="text-xs">
              {upcoming.length} scheduled
            </Badge>
          </CardHeader>
          <CardContent className="space-y-3">
            {upcoming.length === 0 && (
              <div className="py-8 text-center">
                <Calendar className="mx-auto mb-2 h-10 w-10 text-muted-foreground/30" />
                <p className="text-sm text-muted-foreground">No upcoming appointments</p>
                <p className="text-xs text-muted-foreground">
                  Share your booking link to let clients schedule time
                </p>
              </div>
            )}
            {upcoming.map((apt, i) => (
              <div key={apt.id}>
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <p className="text-sm font-medium">{apt.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {formatDateTime(apt.startTime)} – {formatTime(apt.endTime)}
                    </p>
                    {apt.attendeeName && (
                      <p className="text-xs text-muted-foreground">
                        <MapPin className="mr-1 inline h-3 w-3" />
                        {apt.attendeeName}
                        {apt.attendeeEmail && ` (${apt.attendeeEmail})`}
                      </p>
                    )}
                    {apt.notes && (
                      <p className="text-xs text-muted-foreground italic">{apt.notes}</p>
                    )}
                    {apt.userName && (
                      <p className="text-xs text-muted-foreground">
                        Assigned to: {apt.userName}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge
                      variant={apt.status === "scheduled" ? "default" : "secondary"}
                      className="text-xs"
                    >
                      {apt.status}
                    </Badge>
                    <Button variant="outline" size="sm" asChild>
                      <Link href={`/api/calendar/${apt.id}/ics`} target="_blank">.ics</Link>
                    </Button>
                    {/* Cancel button — inline form for server action */}
                    <form
                      action={async () => {
                        "use server";
                        await cancelAppointment(apt.id);
                      }}
                    >
                      <Button variant="ghost" size="icon" className="h-7 w-7" type="submit">
                        <XCircle className="h-4 w-4 text-red-500" />
                      </Button>
                    </form>
                  </div>
                </div>
                {i < upcoming.length - 1 && <Separator className="mt-3" />}
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
