import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { db } from "@/db";
import { appointments, workspaces } from "@/db/schema";
import { requireUser, assertWorkspaceMember } from "@/lib/access";
import { eq } from "drizzle-orm";

function icsDate(value: Date | string) {
  return new Date(value).toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z");
}

function escapeIcs(value: unknown) {
  return String(value ?? "")
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\n/g, "\\n");
}

export async function GET(_req: NextRequest, { params }: { params: Promise<{ appointmentId: string }> }) {
  const session = await auth.api.getSession({ headers: await headers() });
  const user = requireUser(session?.user);
  const { appointmentId } = await params;

  const [appointment] = await db
    .select({
      id: appointments.id,
      workspaceId: appointments.workspaceId,
      title: appointments.title,
      notes: appointments.notes,
      attendeeName: appointments.attendeeName,
      attendeeEmail: appointments.attendeeEmail,
      startTime: appointments.startTime,
      endTime: appointments.endTime,
      status: appointments.status,
      workspaceName: workspaces.name,
    })
    .from(appointments)
    .innerJoin(workspaces, eq(workspaces.id, appointments.workspaceId))
    .where(eq(appointments.id, appointmentId))
    .limit(1);

  if (!appointment) return NextResponse.json({ error: "Appointment not found" }, { status: 404 });
  await assertWorkspaceMember(db, user.id, appointment.workspaceId);

  const ics = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Cubiqlo//Calendar//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:${appointment.id}@cubiqlo.com`,
    `DTSTAMP:${icsDate(new Date())}`,
    `DTSTART:${icsDate(appointment.startTime)}`,
    `DTEND:${icsDate(appointment.endTime)}`,
    `SUMMARY:${escapeIcs(appointment.title)}`,
    `DESCRIPTION:${escapeIcs(appointment.notes || `Meeting with ${appointment.attendeeName}`)}`,
    `ORGANIZER;CN=${escapeIcs(appointment.workspaceName)}:mailto:noreply@cubiqlo.com`,
    appointment.attendeeEmail ? `ATTENDEE;CN=${escapeIcs(appointment.attendeeName)};ROLE=REQ-PARTICIPANT:mailto:${escapeIcs(appointment.attendeeEmail)}` : null,
    `STATUS:${appointment.status === "cancelled" ? "CANCELLED" : "CONFIRMED"}`,
    "END:VEVENT",
    "END:VCALENDAR",
  ].filter(Boolean).join("\r\n");

  return new NextResponse(ics, {
    headers: {
      "content-type": "text/calendar; charset=utf-8",
      "content-disposition": `attachment; filename="cubiqlo-appointment-${appointment.id}.ics"`,
    },
  });
}
