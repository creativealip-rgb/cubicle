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
import { EmptyState } from "@/components/empty-state";
import { Calendar, CalendarDays, Clock, User } from "lucide-react";
import Link from "next/link";
import { getWorkspaceFullForCurrentUser } from "@/lib/workspace";
import { AvailabilityRuleForm } from "@/components/calendar/availability-rule-form";
import { BookingSlugForm } from "@/components/settings/booking-slug-form";
import { AppointmentActions, DeleteAvailabilityRuleButton } from "@/components/calendar/calendar-item-actions";
import { getCurrentLang, createT, getLocale } from "@/lib/i18n";

export const dynamic = "force-dynamic";

export default async function CalendarPage() {
  const lang = await getCurrentLang();
  const t = createT(lang);
  const locale = getLocale(lang);
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

  const dayNames = lang === "en"
    ? ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"]
    : ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];

  function formatDateTime(d: string | Date): string {
    return new Date(d).toLocaleDateString(locale, {
      weekday: "short",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  function formatTime(d: string | Date): string {
    return new Date(d).toLocaleTimeString(locale, {
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <h1 className="app-page-title">{t("Kalender", "Calendar")}</h1>
          <p className="text-sm text-muted-foreground">
            {t("Kelola janji temu dan ketersediaan", "Manage appointments and availability")}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {ws.bookingSlug ? (
            <Button size="sm" className="gap-1" asChild>
              <Link href={`/booking/${ws.bookingSlug}`} target="_blank">
                <Calendar className="h-4 w-4" />
                <span>{t("Booking Page", "Booking Page")}</span>
              </Link>
            </Button>
          ) : (
            <Button size="sm" className="gap-1" asChild>
              <Link href="/app/settings">
                <Calendar className="h-4 w-4" />
                <span>{t("Aktifkan booking", "Enable booking")}</span>
              </Link>
            </Button>
          )}
          <BookingSlugForm defaultSlug={ws.bookingSlug} canEdit={ws.ownerId === user.id} />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Availability Rules */}
        <Card className="lg:col-span-1">
          <CardHeader className="flex flex-row items-center justify-between gap-3">
            <CardTitle className="text-base font-semibold">
              <Clock className="mr-2 inline h-4 w-4" />
              {t("Aturan Ketersediaan", "Availability Rules")}
            </CardTitle>
            <AvailabilityRuleForm />
          </CardHeader>
          <CardContent className="space-y-2">
            {rules.length === 0 && (
              <EmptyState
                icon={Clock}
                title={t("Belum ada aturan ketersediaan", "No availability rules yet")}
                description={t("Tambah aturan untuk menentukan kapan kamu tersedia menerima booking", "Add rules to define when you're available for bookings")}
              />
            )}
            {rules.map((rule) => (
              <div
                key={rule.id}
                className="flex items-center justify-between gap-3 rounded-lg border bg-card p-3 shadow-sm transition-colors hover:border-primary/30"
              >
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-foreground">{dayNames[rule.dayOfWeek]}</p>
                  <p className="mt-0.5 inline-flex items-center gap-1.5 text-xs text-foreground/70">
                    <Clock className="h-3 w-3 shrink-0" aria-hidden />
                    <span>
                      {rule.startTime.substring(0, 5)} – {rule.endTime.substring(0, 5)}
                    </span>
                    <span className="text-muted-foreground">({rule.timezone})</span>
                  </p>
                </div>
                <DeleteAvailabilityRuleButton
                  id={rule.id}
                  label={`${dayNames[rule.dayOfWeek]} ${rule.startTime.substring(0, 5)}–${rule.endTime.substring(0, 5)}`}
                />
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Upcoming Appointments */}
        <Card className="flex h-full flex-col lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base font-semibold">
              <Calendar className="mr-2 inline h-4 w-4" />
              {t("Janji Temu Mendatang", "Upcoming Appointments")}
            </CardTitle>
            <Badge variant="secondary" className="text-xs">
              {upcoming.length} {t("terjadwal", "scheduled")}
            </Badge>
          </CardHeader>
          <CardContent className="flex flex-1 flex-col space-y-3">
            {upcoming.length === 0 && (
              <div className="flex min-h-[20rem] flex-1 items-center justify-center py-8 text-center">
                <EmptyState
                  icon={CalendarDays}
                  title={t("Belum ada jadwal mendatang", "No upcoming appointments")}
                  description={t("Bagikan link booking supaya klien bisa atur jadwal sendiri", "Share your booking link so clients can schedule themselves")}
                />
              </div>
            )}
            {upcoming.map((apt, i) => (
              <div key={apt.id}>
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0 space-y-1">
                    <p className="text-sm font-medium">{apt.title}</p>
                    <p className="inline-flex items-center gap-1.5 text-sm font-semibold text-foreground">
                      <Clock className="h-3.5 w-3.5 shrink-0 text-primary" aria-hidden />
                      {formatDateTime(apt.startTime)} – {formatTime(apt.endTime)}
                    </p>
                    {apt.attendeeName && (
                      <p className="text-xs text-foreground/70">
                        <User className="mr-1 inline h-3 w-3" aria-hidden />
                        {apt.attendeeName}
                        {apt.attendeeEmail && ` (${apt.attendeeEmail})`}
                      </p>
                    )}
                    {apt.notes && (
                      <p className="rounded-md bg-muted/40 px-2 py-1 text-xs text-foreground/70 italic">{apt.notes}</p>
                    )}
                    {apt.userName && (
                      <p className="text-xs text-foreground/70">
                        {t("Ditugaskan ke", "Assigned to")}: {apt.userName}
                      </p>
                    )}
                  </div>
                  <div className="flex flex-wrap items-center justify-end gap-2">
                    <Badge
                      variant={apt.status === "scheduled" ? "default" : "secondary"}
                      className="text-xs"
                    >
                      {apt.status === "scheduled" ? t("terjadwal", "scheduled") : apt.status}
                    </Badge>
                    <AppointmentActions id={apt.id} title={apt.title} />
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
