"use server";
import { getWorkspaceForCurrentUser } from "@/lib/workspace";

import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { db } from "@/db";
import {
  appointments,
  availabilityRules,
  workspaces,
} from "@/db/schema";
import { eq, and, gte, lte, lt, gt, desc } from "drizzle-orm";
import { z } from "zod";
import { requireUser, assertWorkspaceMember, assertWorkspaceWritable } from "@/lib/access";
import { writeActivityLog } from "@/lib/actions/activity";
import { notifyAppointmentBooked, notifyAppointmentCancelled } from "@/lib/notifications";
import { notifyWorkspaceMembers } from "@/lib/in-app-notifications";

async function getWorkspaceId(): Promise<string> {
  return getWorkspaceForCurrentUser();
}

const availabilitySchema = z.object({
  dayOfWeek: z.number().min(0).max(6),
  startTime: z.string().min(1),
  endTime: z.string().min(1),
  timezone: z.string().default("UTC"),
});

export async function createAvailabilityRule(
  input: z.infer<typeof availabilitySchema>
) {
  const session = await auth.api.getSession({ headers: await headers() });
  const user = requireUser(session?.user);
  const workspaceId = await getWorkspaceId();
  await assertWorkspaceWritable(db, user.id, workspaceId);

  const parsed = availabilitySchema.parse(input);

  const [rule] = await db
    .insert(availabilityRules)
    .values({
      workspaceId,
      userId: user.id,
      dayOfWeek: parsed.dayOfWeek,
      startTime: parsed.startTime,
      endTime: parsed.endTime,
      timezone: parsed.timezone,
    })
    .returning();

  await writeActivityLog(workspaceId, user.id, "created_availability_rule", "availability_rule", rule.id);
  return rule;
}

export async function updateAvailabilityRule(
  ruleId: string,
  input: Partial<z.infer<typeof availabilitySchema>>
) {
  const session = await auth.api.getSession({ headers: await headers() });
  const user = requireUser(session?.user);
  const workspaceId = await getWorkspaceId();
  await assertWorkspaceWritable(db, user.id, workspaceId);

  const parsed = availabilitySchema.partial().parse(input);

  const [rule] = await db
    .select()
    .from(availabilityRules)
    .where(
      and(
        eq(availabilityRules.id, ruleId),
        eq(availabilityRules.workspaceId, workspaceId)
      )
    )
    .limit(1);

  if (!rule) throw new Error("Availability rule not found");

  const updateData: Record<string, unknown> = {};
  if (parsed.dayOfWeek !== undefined) updateData.dayOfWeek = parsed.dayOfWeek;
  if (parsed.startTime !== undefined) updateData.startTime = parsed.startTime;
  if (parsed.endTime !== undefined) updateData.endTime = parsed.endTime;
  if (parsed.timezone !== undefined) updateData.timezone = parsed.timezone;

  const [updated] = await db
    .update(availabilityRules)
    .set(updateData)
    .where(eq(availabilityRules.id, ruleId))
    .returning();

  await writeActivityLog(workspaceId, user.id, "updated_availability_rule", "availability_rule", ruleId);
  return updated;
}

export async function deleteAvailabilityRule(ruleId: string) {
  const session = await auth.api.getSession({ headers: await headers() });
  const user = requireUser(session?.user);
  const workspaceId = await getWorkspaceId();
  await assertWorkspaceWritable(db, user.id, workspaceId);

  const [rule] = await db
    .select()
    .from(availabilityRules)
    .where(
      and(
        eq(availabilityRules.id, ruleId),
        eq(availabilityRules.workspaceId, workspaceId)
      )
    )
    .limit(1);

  if (!rule) throw new Error("Availability rule not found");

  await db.delete(availabilityRules).where(eq(availabilityRules.id, ruleId));
  await writeActivityLog(workspaceId, user.id, "deleted_availability_rule", "availability_rule", ruleId);
  return { success: true };
}

export async function listAvailabilityRules(workspaceId: string) {
  const session = await auth.api.getSession({ headers: await headers() });
  const user = requireUser(session?.user);
  await assertWorkspaceMember(db, user.id, workspaceId);

  return db
    .select()
    .from(availabilityRules)
    .where(eq(availabilityRules.workspaceId, workspaceId))
    .orderBy(availabilityRules.dayOfWeek);
}

export async function listAppointments(
  workspaceId?: string,
  clientId?: string,
  dateRange?: { from?: string; to?: string }
) {
  const session = await auth.api.getSession({ headers: await headers() });
  const user = requireUser(session?.user);
  const wsId = workspaceId || (await getWorkspaceId());
  await assertWorkspaceMember(db, user.id, wsId);

  const conditions = [eq(appointments.workspaceId, wsId)];
  if (clientId) conditions.push(eq(appointments.clientId, clientId));
  if (dateRange?.from) conditions.push(gte(appointments.startTime, new Date(dateRange.from)));
  if (dateRange?.to) conditions.push(lte(appointments.endTime, new Date(dateRange.to)));

  return db
    .select()
    .from(appointments)
    .where(and(...conditions))
    .orderBy(desc(appointments.startTime));
}

export async function cancelAppointment(appointmentId: string) {
  const session = await auth.api.getSession({ headers: await headers() });
  const user = requireUser(session?.user);
  const workspaceId = await getWorkspaceId();
  await assertWorkspaceWritable(db, user.id, workspaceId);

  const [apt] = await db
    .select()
    .from(appointments)
    .where(
      and(
        eq(appointments.id, appointmentId),
        eq(appointments.workspaceId, workspaceId)
      )
    )
    .limit(1);

  if (!apt) throw new Error("Appointment not found");

  const [updated] = await db
    .update(appointments)
    .set({ status: "cancelled" })
    .where(eq(appointments.id, appointmentId))
    .returning();

  await writeActivityLog(workspaceId, user.id, "cancelled_appointment", "appointment", appointmentId);

  if (apt.attendeeEmail) {
    const [ws] = await db
      .select({ replyToEmail: workspaces.replyToEmail })
      .from(workspaces)
      .where(eq(workspaces.id, workspaceId))
      .limit(1);
    await notifyAppointmentCancelled({
      attendeeEmail: apt.attendeeEmail,
      attendeeName: apt.attendeeName,
      appointmentTitle: apt.title,
      dateTime: apt.startTime.toISOString(),
      replyTo: ws?.replyToEmail ?? undefined,
    });
  }

  return updated;
}

// ─── Public booking ───

const publicBookingSchema = z.object({
  workspaceId: z.string().uuid(),
  title: z.string().min(1, "Title required"),
  notes: z.string().optional(),
  attendeeName: z.string().min(1, "Name required"),
  attendeeEmail: z.string().email("Valid email required"),
  startTime: z.string().min(1),
  endTime: z.string().min(1),
});

export async function createPublicAppointment(
  input: z.infer<typeof publicBookingSchema>
) {
  const parsed = publicBookingSchema.parse(input);
  const startTime = new Date(parsed.startTime);
  const endTime = new Date(parsed.endTime);

  // Validate slot: must be in the future
  if (startTime <= new Date()) {
    throw new Error("Cannot book a slot in the past");
  }
  if (endTime <= startTime) {
    throw new Error("End time must be after start time");
  }

  // Check workspace exists and has booking enabled
  const [ws] = await db
    .select({ id: workspaces.id, bookingSlug: workspaces.bookingSlug, name: workspaces.name, replyToEmail: workspaces.replyToEmail })
    .from(workspaces)
    .where(eq(workspaces.id, parsed.workspaceId))
    .limit(1);

  if (!ws) throw new Error("Workspace not found");
  if (!ws.bookingSlug) throw new Error("Booking not enabled for this workspace");

  // Find a user to assign (first owner/member)
  // For simplicity, use the workspace owner; in production, match against availability
  const [owner] = await db
    .select({ userId: workspaces.ownerId })
    .from(workspaces)
    .where(eq(workspaces.id, parsed.workspaceId))
    .limit(1);

  if (!owner) throw new Error("No available user for booking");

  // Check double-booking: app-layer interval overlap check.
  // Half-open interval semantics: [start, end), so a booking ending exactly at
  // requested start or starting exactly at requested end is allowed.
  const conflicting = await db
    .select({ id: appointments.id })
    .from(appointments)
    .where(
      and(
        eq(appointments.workspaceId, parsed.workspaceId),
        eq(appointments.status, "scheduled"),
        lt(appointments.startTime, endTime),
        gt(appointments.endTime, startTime),
      )
    )
    .limit(1);

  if (conflicting.length > 0) {
    throw new Error("This time slot is already booked");
  }

  const [appointment] = await db
    .insert(appointments)
    .values({
      workspaceId: parsed.workspaceId,
      userId: owner.userId,
      title: parsed.title,
      notes: parsed.notes || null,
      attendeeName: parsed.attendeeName,
      attendeeEmail: parsed.attendeeEmail,
      startTime,
      endTime,
      status: "scheduled",
    })
    .returning();

  await writeActivityLog(parsed.workspaceId, null, "booked_appointment_public", "appointment", appointment.id);

  // Notify attendee + workspace owner
  await notifyAppointmentBooked({
    attendeeEmail: parsed.attendeeEmail,
    attendeeName: parsed.attendeeName,
    appointmentTitle: parsed.title,
    dateTime: startTime.toISOString(),
    workspaceName: ws.name,
    replyTo: ws.replyToEmail ?? undefined,
  });

  try {
    await notifyWorkspaceMembers(parsed.workspaceId, {
      type: "booking_created",
      title: `${parsed.attendeeName} booked ${parsed.title}`,
      body: startTime.toISOString(),
      link: `/app/calendar`,
      entityType: "appointment",
      entityId: appointment.id,
      actorId: null,
    });
  } catch {
    // best-effort
  }

  return appointment;
}

// ─── Slot computation ───

export async function getAvailableSlots(workspaceId: string, date: string) {
  const rules = await db
    .select()
    .from(availabilityRules)
    .where(eq(availabilityRules.workspaceId, workspaceId))
    .orderBy(availabilityRules.dayOfWeek);

  const targetDate = new Date(date);
  const dayOfWeek = targetDate.getDay();

  const dayRules = rules.filter((r) => r.dayOfWeek === dayOfWeek);

  if (dayRules.length === 0) {
    return [];
  }

  // Get booked appointments for that day
  const dayStart = new Date(targetDate);
  dayStart.setHours(0, 0, 0, 0);
  const dayEnd = new Date(targetDate);
  dayEnd.setHours(23, 59, 59, 999);

  const bookedSlots = await db
    .select({ startTime: appointments.startTime, endTime: appointments.endTime })
    .from(appointments)
    .where(
      and(
        eq(appointments.workspaceId, workspaceId),
        eq(appointments.status, "scheduled"),
        gte(appointments.startTime, dayStart),
        lte(appointments.endTime, dayEnd)
      )
    );

  // Generate 30-min slots from availability rules, excluding booked
  const slots: { start: string; end: string }[] = [];

  for (const rule of dayRules) {
    const [sh, sm] = rule.startTime.split(":").map(Number);
    const [eh, em] = rule.endTime.split(":").map(Number);
    let current = new Date(targetDate);
    current.setHours(sh, sm, 0, 0);
    const ruleEnd = new Date(targetDate);
    ruleEnd.setHours(eh, em, 0, 0);

    while (current < ruleEnd) {
      const slotEnd = new Date(current.getTime() + 30 * 60 * 1000);
      if (slotEnd <= ruleEnd) {
        const overlaps = bookedSlots.some(
          (b) =>
            new Date(b.startTime).getTime() < slotEnd.getTime() &&
            new Date(b.endTime).getTime() > current.getTime()
        );
        if (!overlaps && current > new Date()) {
          slots.push({
            start: current.toISOString(),
            end: slotEnd.toISOString(),
          });
        }
      }
      current = new Date(current.getTime() + 30 * 60 * 1000);
    }
  }

  return slots;
}
