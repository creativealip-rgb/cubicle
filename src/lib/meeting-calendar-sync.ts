import { db } from "@/db";
import { appointmentCalendarSyncs, appointments } from "@/db/schema";
import { and, eq } from "drizzle-orm";
import { syncAppointmentToGoogleCalendar } from "@/lib/google-calendar";
import { createClientGoogleEvent, getClientGoogleConnectionStatus } from "@/lib/client-google-calendar";

async function saveStatus(appointmentId: string, targetType: "user" | "client", targetId: string, status: "synced" | "skipped" | "failed", externalEventId?: string | null, error?: string | null) {
  const values = { appointmentId, targetType, targetId, provider: "google" as const, status, externalEventId: externalEventId || null, lastError: error || null, updatedAt: new Date() };
  const [existing] = await db.select({ id: appointmentCalendarSyncs.id }).from(appointmentCalendarSyncs).where(and(eq(appointmentCalendarSyncs.appointmentId, appointmentId), eq(appointmentCalendarSyncs.targetType, targetType), eq(appointmentCalendarSyncs.provider, "google"))).limit(1);
  if (existing) await db.update(appointmentCalendarSyncs).set(values).where(eq(appointmentCalendarSyncs.id, existing.id));
  else await db.insert(appointmentCalendarSyncs).values(values);
}

export async function syncMeetingAppointmentCalendars(appointmentId: string, timezone = "Asia/Jakarta") {
  const [appointment] = await db.select().from(appointments).where(eq(appointments.id, appointmentId)).limit(1);
  if (!appointment) throw new Error("Appointment tidak ditemukan");
  if (!appointment.userId || !appointment.clientId) throw new Error("Appointment meeting tidak punya user/client");
  const input = { title: appointment.title, notes: appointment.notes, attendeeName: appointment.attendeeName, attendeeEmail: appointment.attendeeEmail, startTime: appointment.startTime, endTime: appointment.endTime, timezone };
  try {
    const eventId = await syncAppointmentToGoogleCalendar({ appointmentId, userId: appointment.userId, ...input });
    await saveStatus(appointmentId, "user", appointment.userId, eventId ? "synced" : "skipped", eventId);
  } catch (error) {
    await saveStatus(appointmentId, "user", appointment.userId, "failed", null, error instanceof Error ? error.message : "Sync gagal");
  }
  try {
    const status = await getClientGoogleConnectionStatus(appointment.clientId);
    if (!status.connected) await saveStatus(appointmentId, "client", appointment.clientId, "skipped");
    else {
      const event = await createClientGoogleEvent(appointment.clientId, { title: appointment.title, description: appointment.notes, start: appointment.startTime.toISOString(), end: appointment.endTime.toISOString(), timezone });
      await saveStatus(appointmentId, "client", appointment.clientId, "synced", event.id);
    }
  } catch (error) {
    await saveStatus(appointmentId, "client", appointment.clientId, "failed", null, error instanceof Error ? error.message : "Sync gagal");
  }
}
