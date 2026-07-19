import { createHash, createHmac, randomBytes, timingSafeEqual } from "crypto";
import { and, eq, gte, isNotNull } from "drizzle-orm";
import { db } from "@/db";
import {
  appointments,
  clientGoogleCalendarConnections,
  clients,
} from "@/db/schema";
import {
  buildGoogleAuthUrl,
  decryptSecret,
  encryptSecret,
  GOOGLE_CALENDAR_SCOPES,
  isGoogleCalendarConfigured,
} from "@/lib/google-calendar";

const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";
const GOOGLE_USERINFO_URL = "https://www.googleapis.com/oauth2/v2/userinfo";
const GOOGLE_EVENTS_URL = "https://www.googleapis.com/calendar/v3/calendars";

function appUrl() {
  return (
    process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ||
    process.env.BETTER_AUTH_URL?.replace(/\/$/, "") ||
    "https://cubiqlo.com"
  );
}

function stateSecret() {
  return (
    process.env.GOOGLE_TOKEN_ENCRYPTION_KEY?.trim() ||
    process.env.BETTER_AUTH_SECRET?.trim() ||
    "dev-build-placeholder-secret-change-me"
  );
}

function hashInviteToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

type ClientOAuthState = {
  kind: "client";
  clientId: string;
  inviteToken: string;
  exp: number;
  nonce: string;
};

export function createClientOAuthState(clientId: string, inviteToken: string) {
  const nonce = randomBytes(16).toString("base64url");
  const exp = Date.now() + 15 * 60 * 1000;
  const body = Buffer.from(
    JSON.stringify({
      kind: "client",
      clientId,
      inviteToken,
      exp,
      nonce,
    } satisfies ClientOAuthState),
    "utf8",
  ).toString("base64url");
  const sig = createHmac("sha256", stateSecret()).update(body).digest("base64url");
  return `${body}.${sig}`;
}

export function parseClientOAuthState(state: string): {
  clientId: string;
  inviteToken: string;
} {
  const [body, sig] = state.split(".");
  if (!body || !sig) throw new Error("Invalid OAuth state");
  const expected = createHmac("sha256", stateSecret()).update(body).digest("base64url");
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) {
    throw new Error("Invalid OAuth state signature");
  }
  const parsed = JSON.parse(Buffer.from(body, "base64url").toString("utf8")) as ClientOAuthState;
  if (parsed.kind !== "client" || !parsed.clientId || !parsed.inviteToken || !parsed.exp) {
    throw new Error("Invalid client OAuth state");
  }
  if (Date.now() > parsed.exp) throw new Error("OAuth state expired");
  return { clientId: parsed.clientId, inviteToken: parsed.inviteToken };
}

export function isClientOAuthState(state: string): boolean {
  try {
    const [body] = state.split(".");
    if (!body) return false;
    const parsed = JSON.parse(Buffer.from(body, "base64url").toString("utf8")) as {
      kind?: string;
    };
    return parsed.kind === "client";
  } catch {
    return false;
  }
}

type TokenResponse = {
  access_token: string;
  expires_in?: number;
  refresh_token?: string;
  scope?: string;
  token_type?: string;
};

async function exchangeCode(code: string): Promise<TokenResponse> {
  const body = new URLSearchParams({
    code,
    client_id: process.env.GOOGLE_CLIENT_ID!,
    client_secret: process.env.GOOGLE_CLIENT_SECRET!,
    redirect_uri:
      process.env.GOOGLE_REDIRECT_URI?.trim() ||
      `${appUrl()}/api/integrations/google-calendar/callback`,
    grant_type: "authorization_code",
  });
  const res = await fetch(GOOGLE_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });
  const data = (await res.json()) as TokenResponse & {
    error?: string;
    error_description?: string;
  };
  if (!res.ok || !data.access_token) {
    throw new Error(data.error_description || data.error || "Gagal tukar OAuth code");
  }
  return data;
}

async function refreshAccessToken(refreshToken: string): Promise<TokenResponse> {
  const body = new URLSearchParams({
    client_id: process.env.GOOGLE_CLIENT_ID!,
    client_secret: process.env.GOOGLE_CLIENT_SECRET!,
    refresh_token: refreshToken,
    grant_type: "refresh_token",
  });
  const res = await fetch(GOOGLE_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });
  const data = (await res.json()) as TokenResponse & {
    error?: string;
    error_description?: string;
  };
  if (!res.ok || !data.access_token) {
    throw new Error(data.error_description || data.error || "Gagal refresh Google token");
  }
  return data;
}

async function fetchGoogleEmail(accessToken: string): Promise<string | null> {
  try {
    const res = await fetch(GOOGLE_USERINFO_URL, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { email?: string };
    return data.email ?? null;
  } catch {
    return null;
  }
}

export async function getClientGoogleConnectionStatus(clientId: string) {
  const [conn] = await db
    .select({
      id: clientGoogleCalendarConnections.id,
      googleAccountEmail: clientGoogleCalendarConnections.googleAccountEmail,
      calendarId: clientGoogleCalendarConnections.calendarId,
      status: clientGoogleCalendarConnections.status,
      lastError: clientGoogleCalendarConnections.lastError,
      connectedAt: clientGoogleCalendarConnections.connectedAt,
      updatedAt: clientGoogleCalendarConnections.updatedAt,
      inviteTokenExpiresAt: clientGoogleCalendarConnections.inviteTokenExpiresAt,
    })
    .from(clientGoogleCalendarConnections)
    .where(eq(clientGoogleCalendarConnections.clientId, clientId))
    .limit(1);

  return {
    configured: isGoogleCalendarConfigured(),
    connected: Boolean(conn && conn.status === "connected"),
    pendingInvite: Boolean(
      conn &&
        conn.status === "pending_invite" &&
        conn.inviteTokenExpiresAt &&
        conn.inviteTokenExpiresAt.getTime() > Date.now(),
    ),
    connection: conn ?? null,
  };
}

export async function createClientGoogleInviteLink(input: {
  clientId: string;
  workspaceId: string;
  userId: string;
}) {
  if (!isGoogleCalendarConfigured()) {
    throw new Error("Google Calendar belum dikonfigurasi di server");
  }

  const rawToken = randomBytes(24).toString("base64url");
  const tokenHash = hashInviteToken(rawToken);
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

  const [existing] = await db
    .select()
    .from(clientGoogleCalendarConnections)
    .where(eq(clientGoogleCalendarConnections.clientId, input.clientId))
    .limit(1);

  if (existing) {
    await db
      .update(clientGoogleCalendarConnections)
      .set({
        workspaceId: input.workspaceId,
        connectedByUserId: input.userId,
        inviteTokenHash: tokenHash,
        inviteTokenExpiresAt: expiresAt,
        status:
          existing.status === "connected" ? "connected" : "pending_invite",
        lastError: null,
        updatedAt: new Date(),
      })
      .where(eq(clientGoogleCalendarConnections.id, existing.id));
  } else {
    await db.insert(clientGoogleCalendarConnections).values({
      clientId: input.clientId,
      workspaceId: input.workspaceId,
      connectedByUserId: input.userId,
      inviteTokenHash: tokenHash,
      inviteTokenExpiresAt: expiresAt,
      status: "pending_invite",
    });
  }

  return {
    inviteUrl: `${appUrl()}/api/integrations/google-calendar/client-invite/${rawToken}`,
    expiresAt,
  };
}

export async function resolveClientInviteToken(rawToken: string) {
  const tokenHash = hashInviteToken(rawToken);
  const [conn] = await db
    .select({
      id: clientGoogleCalendarConnections.id,
      clientId: clientGoogleCalendarConnections.clientId,
      workspaceId: clientGoogleCalendarConnections.workspaceId,
      status: clientGoogleCalendarConnections.status,
      inviteTokenExpiresAt: clientGoogleCalendarConnections.inviteTokenExpiresAt,
      refreshTokenEnc: clientGoogleCalendarConnections.refreshTokenEnc,
    })
    .from(clientGoogleCalendarConnections)
    .where(eq(clientGoogleCalendarConnections.inviteTokenHash, tokenHash))
    .limit(1);

  if (!conn) throw new Error("Invite link tidak valid");
  if (!conn.inviteTokenExpiresAt || conn.inviteTokenExpiresAt.getTime() < Date.now()) {
    throw new Error("Invite link sudah kedaluwarsa. Minta user Cubiqlo generate ulang.");
  }

  const [client] = await db
    .select({ id: clients.id, name: clients.name })
    .from(clients)
    .where(eq(clients.id, conn.clientId))
    .limit(1);
  if (!client) throw new Error("Client tidak ditemukan");

  return { conn, client };
}

export async function startClientGoogleOAuthFromInvite(rawToken: string) {
  const { conn, client } = await resolveClientInviteToken(rawToken);
  const state = createClientOAuthState(client.id, rawToken);
  const url = buildGoogleAuthUrl(state);
  return { url, clientId: client.id, connectionId: conn.id };
}

export async function saveClientGoogleConnectionFromCode(input: {
  clientId: string;
  inviteToken: string;
  code: string;
}) {
  const { conn } = await resolveClientInviteToken(input.inviteToken);
  if (conn.clientId !== input.clientId) {
    throw new Error("Invite token tidak cocok dengan client");
  }

  const tokens = await exchangeCode(input.code);
  if (!tokens.refresh_token && !conn.refreshTokenEnc) {
    throw new Error(
      "Google tidak mengirim refresh token. Cabut akses Cubiqlo di Google Account lalu connect ulang.",
    );
  }

  const email = await fetchGoogleEmail(tokens.access_token);
  const expiryDate = tokens.expires_in
    ? new Date(Date.now() + tokens.expires_in * 1000)
    : null;
  const refreshTokenEnc = tokens.refresh_token
    ? encryptSecret(tokens.refresh_token)
    : conn.refreshTokenEnc;
  if (!refreshTokenEnc) throw new Error("Refresh token Google tidak tersedia");

  const [updated] = await db
    .update(clientGoogleCalendarConnections)
    .set({
      googleAccountEmail: email,
      accessTokenEnc: encryptSecret(tokens.access_token),
      refreshTokenEnc,
      scope: tokens.scope || GOOGLE_CALENDAR_SCOPES,
      tokenType: tokens.token_type || "Bearer",
      expiryDate,
      calendarId: "primary",
      // one-time invite after successful connect
      inviteTokenHash: null,
      inviteTokenExpiresAt: null,
      status: "connected",
      lastError: null,
      connectedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(clientGoogleCalendarConnections.id, conn.id))
    .returning({
      id: clientGoogleCalendarConnections.id,
      clientId: clientGoogleCalendarConnections.clientId,
      googleAccountEmail: clientGoogleCalendarConnections.googleAccountEmail,
    });

  return updated;
}

export async function disconnectClientGoogleCalendar(clientId: string) {
  await db
    .delete(clientGoogleCalendarConnections)
    .where(eq(clientGoogleCalendarConnections.clientId, clientId));
  return { ok: true as const };
}

async function getValidClientAccessToken(clientId: string): Promise<{
  accessToken: string;
  calendarId: string;
  connectionId: string;
} | null> {
  if (!isGoogleCalendarConfigured()) return null;

  const [conn] = await db
    .select()
    .from(clientGoogleCalendarConnections)
    .where(
      and(
        eq(clientGoogleCalendarConnections.clientId, clientId),
        eq(clientGoogleCalendarConnections.status, "connected"),
        isNotNull(clientGoogleCalendarConnections.refreshTokenEnc),
      ),
    )
    .limit(1);

  if (!conn?.refreshTokenEnc || !conn.accessTokenEnc) return null;

  try {
    const expiresSoon =
      !conn.expiryDate || conn.expiryDate.getTime() <= Date.now() + 60_000;

    if (!expiresSoon) {
      return {
        accessToken: decryptSecret(conn.accessTokenEnc),
        calendarId: conn.calendarId || "primary",
        connectionId: conn.id,
      };
    }

    const refreshToken = decryptSecret(conn.refreshTokenEnc);
    const refreshed = await refreshAccessToken(refreshToken);
    const expiryDate = refreshed.expires_in
      ? new Date(Date.now() + refreshed.expires_in * 1000)
      : null;

    await db
      .update(clientGoogleCalendarConnections)
      .set({
        accessTokenEnc: encryptSecret(refreshed.access_token),
        expiryDate,
        scope: refreshed.scope || conn.scope,
        tokenType: refreshed.token_type || conn.tokenType,
        status: "connected",
        lastError: null,
        updatedAt: new Date(),
      })
      .where(eq(clientGoogleCalendarConnections.id, conn.id));

    return {
      accessToken: refreshed.access_token,
      calendarId: conn.calendarId || "primary",
      connectionId: conn.id,
    };
  } catch (err) {
    await db
      .update(clientGoogleCalendarConnections)
      .set({
        status: "error",
        lastError: err instanceof Error ? err.message : "Token refresh failed",
        updatedAt: new Date(),
      })
      .where(eq(clientGoogleCalendarConnections.id, conn.id));
    return null;
  }
}

export type ClientGoogleEvent = {
  id: string;
  title: string;
  description: string | null;
  start: string | null;
  end: string | null;
  htmlLink: string | null;
  status: string | null;
  location: string | null;
};

export async function listClientGoogleEvents(
  clientId: string,
  opts?: { daysAhead?: number; daysBehind?: number; maxResults?: number },
): Promise<{ events: ClientGoogleEvent[]; error?: string }> {
  const auth = await getValidClientAccessToken(clientId);
  if (!auth) {
    return { events: [], error: "Google Calendar client belum terhubung" };
  }

  const daysBehind = opts?.daysBehind ?? 7;
  const daysAhead = opts?.daysAhead ?? 60;
  const maxResults = opts?.maxResults ?? 25;
  const timeMin = new Date(Date.now() - daysBehind * 24 * 60 * 60 * 1000).toISOString();
  const timeMax = new Date(Date.now() + daysAhead * 24 * 60 * 60 * 1000).toISOString();
  const calendarId = encodeURIComponent(auth.calendarId || "primary");
  const params = new URLSearchParams({
    singleEvents: "true",
    orderBy: "startTime",
    timeMin,
    timeMax,
    maxResults: String(maxResults),
  });

  try {
    const res = await fetch(
      `${GOOGLE_EVENTS_URL}/${calendarId}/events?${params.toString()}`,
      {
        headers: { Authorization: `Bearer ${auth.accessToken}` },
        next: { revalidate: 0 },
      },
    );
    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`Google list events failed: ${res.status} ${errText}`);
    }
    const data = (await res.json()) as {
      items?: Array<{
        id?: string;
        summary?: string;
        description?: string;
        status?: string;
        location?: string;
        htmlLink?: string;
        start?: { dateTime?: string; date?: string };
        end?: { dateTime?: string; date?: string };
      }>;
    };

    const events: ClientGoogleEvent[] = (data.items || [])
      .filter((item) => item.id)
      .map((item) => ({
        id: item.id!,
        title: item.summary || "(Tanpa judul)",
        description: item.description || null,
        start: item.start?.dateTime || item.start?.date || null,
        end: item.end?.dateTime || item.end?.date || null,
        htmlLink: item.htmlLink || null,
        status: item.status || null,
        location: item.location || null,
      }));

    return { events };
  } catch (err) {
    await db
      .update(clientGoogleCalendarConnections)
      .set({
        status: "error",
        lastError: err instanceof Error ? err.message : "List events failed",
        updatedAt: new Date(),
      })
      .where(eq(clientGoogleCalendarConnections.clientId, clientId));
    return {
      events: [],
      error: err instanceof Error ? err.message : "Gagal ambil event Google",
    };
  }
}

export async function listClientAppointments(clientId: string) {
  return db
    .select({
      id: appointments.id,
      title: appointments.title,
      startTime: appointments.startTime,
      endTime: appointments.endTime,
      status: appointments.status,
      attendeeName: appointments.attendeeName,
      attendeeEmail: appointments.attendeeEmail,
      googleEventId: appointments.googleEventId,
    })
    .from(appointments)
    .where(
      and(
        eq(appointments.clientId, clientId),
        gte(appointments.startTime, new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)),
      ),
    )
    .orderBy(appointments.startTime)
    .limit(50);
}
