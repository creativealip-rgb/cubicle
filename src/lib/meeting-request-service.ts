import { db } from "@/db";
import { appointments, clients, portalRequests, projects, workspaces } from "@/db/schema";
import { and, eq, gt, lt, sql } from "drizzle-orm";
import { buildMeetingSchedule, type MeetingStatus } from "@/lib/meeting-schedule";

export type MeetingScheduleInput = {
  date: string;
  time: string;
  durationMinutes: number;
  timezone: string;
};

type Actor = {
  workspaceId: string;
  clientId?: string;
  userId?: string;
};

async function lockedRequest(tx: Parameters<Parameters<typeof db.transaction>[0]>[0], requestId: string, actor: Actor) {
  const rows = await tx.execute(sql`
    SELECT * FROM portal_requests
    WHERE id = ${requestId}::uuid
      AND workspace_id = ${actor.workspaceId}::uuid
      ${actor.clientId ? sql`AND client_id = ${actor.clientId}::uuid` : sql``}
    FOR UPDATE
  `);
  return rows.rows[0] as Record<string, unknown> | undefined;
}

function requestDate(value: unknown) {
  if (value instanceof Date) return value;
  if (typeof value === "string") return new Date(value);
  return null;
}

export async function approveMeetingRequestRecord(requestId: string, actor: Actor) {
  if (!actor.userId) throw new Error("User wajib untuk menyetujui meeting");
  return createAppointmentForRequest(requestId, actor, actor.userId, "requested");
}

export async function acceptMeetingCounterProposalRecord(requestId: string, actor: Actor) {
  return db.transaction(async (tx) => {
    const request = await lockedRequest(tx, requestId, actor);
    if (!request) throw new Error("Request tidak ditemukan");
    const assignedUserId = String(request.meeting_proposed_by_user_id || "");
    if (!assignedUserId) {
      const [workspace] = await tx.select({ ownerId: workspaces.ownerId }).from(workspaces)
        .where(eq(workspaces.id, actor.workspaceId)).limit(1);
      if (!workspace) throw new Error("Workspace tidak ditemukan");
      return createAppointmentInsideTransaction(tx, request, workspace.ownerId, "counter_proposed");
    }
    return createAppointmentInsideTransaction(tx, request, assignedUserId, "counter_proposed");
  });
}

async function createAppointmentForRequest(requestId: string, actor: Actor, assignedUserId: string, expected: MeetingStatus) {
  return db.transaction(async (tx) => {
    const request = await lockedRequest(tx, requestId, actor);
    if (!request) throw new Error("Request tidak ditemukan");
    return createAppointmentInsideTransaction(tx, request, assignedUserId, expected);
  });
}

async function createAppointmentInsideTransaction(
  tx: Parameters<Parameters<typeof db.transaction>[0]>[0],
  request: Record<string, unknown>,
  assignedUserId: string,
  expected: MeetingStatus,
) {
  if (request.appointment_id) {
    const [existing] = await tx.select().from(appointments)
      .where(eq(appointments.id, String(request.appointment_id))).limit(1);
    if (existing) return existing;
  }
  if (request.meeting_status !== expected) throw new Error("Status request sudah berubah");
  const startTime = requestDate(request.meeting_start_time);
  const duration = Number(request.meeting_duration_minutes);
  if (!startTime || !Number.isFinite(duration) || duration <= 0) throw new Error("Jadwal meeting belum lengkap");
  if (startTime <= new Date()) throw new Error("Jadwal harus di masa depan");
  const endTime = new Date(startTime.getTime() + duration * 60_000);

  const [conflict] = await tx.select({ id: appointments.id }).from(appointments).where(and(
    eq(appointments.workspaceId, String(request.workspace_id)),
    eq(appointments.status, "scheduled"),
    lt(appointments.startTime, endTime),
    gt(appointments.endTime, startTime),
  )).limit(1);
  if (conflict) throw new Error("Jadwal bentrok dengan agenda lain");

  const [client] = await tx.select({ name: clients.name, companyName: clients.companyName, email: clients.email })
    .from(clients).where(eq(clients.id, String(request.client_id))).limit(1);
  if (!client) throw new Error("Klien tidak ditemukan");
  let projectName: string | null = null;
  if (request.project_id) {
    const [project] = await tx.select({ name: projects.name }).from(projects)
      .where(and(eq(projects.id, String(request.project_id)), eq(projects.clientId, String(request.client_id)))).limit(1);
    projectName = project?.name || null;
  }
  const clientLabel = client.companyName || client.name || "Klien";
  const [appointment] = await tx.insert(appointments).values({
    workspaceId: String(request.workspace_id),
    clientId: String(request.client_id),
    userId: assignedUserId,
    title: `Meeting — ${clientLabel}${projectName ? ` — ${projectName}` : ""}`,
    notes: typeof request.description === "string" ? request.description : null,
    attendeeName: client.name || client.companyName,
    attendeeEmail: client.email,
    startTime,
    endTime,
    status: "scheduled",
  }).returning();

  await tx.update(portalRequests).set({
    meetingStatus: "approved",
    status: "completed",
    appointmentId: appointment.id,
    completedAt: new Date(),
    updatedAt: new Date(),
  }).where(and(
    eq(portalRequests.id, String(request.id)),
    eq(portalRequests.workspaceId, String(request.workspace_id)),
  ));
  return appointment;
}

export async function rejectMeetingRequestRecord(requestId: string, actor: Actor, reason: string) {
  const note = reason.trim();
  if (!note) throw new Error("Alasan penolakan wajib diisi");
  return updateActionableRequest(requestId, actor, {
    meetingStatus: "rejected",
    meetingResponseNote: note,
    status: "completed",
    completedAt: new Date(),
  });
}

export async function counterProposeMeetingRequestRecord(requestId: string, actor: Actor, schedule: MeetingScheduleInput, note?: string) {
  if (!actor.userId) throw new Error("User wajib untuk mengubah jadwal");
  const parsed = buildMeetingSchedule(schedule);
  return updateActionableRequest(requestId, actor, {
    meetingStartTime: parsed.start,
    meetingDurationMinutes: parsed.durationMinutes,
    meetingTimezone: parsed.timezone,
    meetingStatus: "counter_proposed",
    meetingResponseNote: note?.trim() || null,
    meetingProposedByUserId: actor.userId,
    status: "pending",
    completedAt: null,
  });
}

export async function resubmitMeetingRequestRecord(requestId: string, actor: Actor, schedule: MeetingScheduleInput, note?: string) {
  const parsed = buildMeetingSchedule(schedule);
  return updateActionableRequest(requestId, actor, {
    meetingStartTime: parsed.start,
    meetingDurationMinutes: parsed.durationMinutes,
    meetingTimezone: parsed.timezone,
    meetingStatus: "requested",
    meetingResponseNote: note?.trim() || null,
    meetingProposedByUserId: null,
    status: "pending",
    completedAt: null,
  });
}

async function updateActionableRequest(
  requestId: string,
  actor: Actor,
  values: Partial<typeof portalRequests.$inferInsert>,
) {
  return db.transaction(async (tx) => {
    const request = await lockedRequest(tx, requestId, actor);
    if (!request) throw new Error("Request tidak ditemukan");
    if (request.appointment_id || ["approved", "rejected"].includes(String(request.meeting_status))) {
      throw new Error("Request sudah ditutup");
    }
    const [updated] = await tx.update(portalRequests).set({ ...values, updatedAt: new Date() }).where(and(
      eq(portalRequests.id, requestId),
      eq(portalRequests.workspaceId, actor.workspaceId),
      actor.clientId ? eq(portalRequests.clientId, actor.clientId) : undefined,
    )).returning();
    if (!updated) throw new Error("Status request sudah berubah");
    return updated;
  });
}
