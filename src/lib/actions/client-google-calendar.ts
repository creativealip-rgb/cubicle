"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { requireUser, assertClientInWorkspace } from "@/lib/access";
import { db } from "@/db";
import { getWorkspaceForCurrentUser } from "@/lib/workspace";
import {
  createClientGoogleInviteLink,
  disconnectClientGoogleCalendar,
  getClientGoogleConnectionStatus,
  listClientGoogleEvents,
} from "@/lib/client-google-calendar";

async function requireClientAccess(clientId: string) {
  const session = await auth.api.getSession({ headers: await headers() });
  const user = requireUser(session?.user);
  const workspaceId = await getWorkspaceForCurrentUser();
  await assertClientInWorkspace(db, user.id, workspaceId, clientId);
  return { user, workspaceId };
}

export async function generateClientGoogleCalendarInvite(clientId: string) {
  const { user, workspaceId } = await requireClientAccess(clientId);
  const result = await createClientGoogleInviteLink({
    clientId,
    workspaceId,
    userId: user.id,
  });
  revalidatePath(`/app/clients/${clientId}`);
  return {
    inviteUrl: result.inviteUrl,
    expiresAt: result.expiresAt.toISOString(),
  };
}

export async function disconnectClientGoogleCalendarAction(clientId: string) {
  await requireClientAccess(clientId);
  await disconnectClientGoogleCalendar(clientId);
  revalidatePath(`/app/clients/${clientId}`);
  return { ok: true as const };
}

export async function getClientGoogleCalendarPanel(clientId: string) {
  await requireClientAccess(clientId);
  const status = await getClientGoogleConnectionStatus(clientId);
  let events: Awaited<ReturnType<typeof listClientGoogleEvents>>["events"] = [];
  let eventsError: string | undefined;
  if (status.connected) {
    const listed = await listClientGoogleEvents(clientId);
    events = listed.events;
    eventsError = listed.error;
  }
  return {
    configured: status.configured,
    connected: status.connected,
    pendingInvite: status.pendingInvite,
    email: status.connection?.googleAccountEmail ?? null,
    status: status.connection?.status ?? null,
    lastError: status.connection?.lastError ?? null,
    connectedAt: status.connection?.connectedAt?.toISOString() ?? null,
    events,
    eventsError: eventsError ?? null,
  };
}
