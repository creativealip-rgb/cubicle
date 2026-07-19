import { createCipheriv, createDecipheriv, createHash, createHmac, randomBytes, timingSafeEqual } from "crypto";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { appointments, googleCalendarConnections } from "@/db/schema";

const GOOGLE_AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth";
const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";
const GOOGLE_USERINFO_URL = "https://www.googleapis.com/oauth2/v2/userinfo";
const GOOGLE_EVENTS_URL = "https://www.googleapis.com/calendar/v3/calendars";

export const GOOGLE_CALENDAR_SCOPES = [
  "openid",
  "email",
  "profile",
  "https://www.googleapis.com/auth/calendar.events",
].join(" ");

function appUrl() {
  return (
    process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ||
    process.env.BETTER_AUTH_URL?.replace(/\/$/, "") ||
    "https://cubiqlo.com"
  );
}

export function isGoogleCalendarConfigured() {
  return Boolean(
    process.env.GOOGLE_CLIENT_ID?.trim() &&
      process.env.GOOGLE_CLIENT_SECRET?.trim(),
  );
}

export function getGoogleRedirectUri() {
  return (
    process.env.GOOGLE_REDIRECT_URI?.trim() ||
    `${appUrl()}/api/integrations/google-calendar/callback`
  );
}

function encryptionKey() {
  const secret =
    process.env.GOOGLE_TOKEN_ENCRYPTION_KEY?.trim() ||
    process.env.BETTER_AUTH_SECRET?.trim() ||
    "dev-build-placeholder-secret-change-me";
  return createHash("sha256").update(secret).digest();
}

export function encryptSecret(value: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", encryptionKey(), iv);
  const encrypted = Buffer.concat([cipher.update(value, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${iv.toString("base64url")}.${tag.toString("base64url")}.${encrypted.toString("base64url")}`;
}

export function decryptSecret(payload: string): string {
  const [ivB64, tagB64, dataB64] = payload.split(".");
  if (!ivB64 || !tagB64 || !dataB64) throw new Error("Invalid encrypted token payload");
  const decipher = createDecipheriv(
    "aes-256-gcm",
    encryptionKey(),
    Buffer.from(ivB64, "base64url"),
  );
  decipher.setAuthTag(Buffer.from(tagB64, "base64url"));
  const decrypted = Buffer.concat([
    decipher.update(Buffer.from(dataB64, "base64url")),
    decipher.final(),
  ]);
  return decrypted.toString("utf8");
}

function stateSecret() {
  return (
    process.env.GOOGLE_TOKEN_ENCRYPTION_KEY?.trim() ||
    process.env.BETTER_AUTH_SECRET?.trim() ||
    "dev-build-placeholder-secret-change-me"
  );
}

export function createOAuthState(userId: string) {
  const nonce = randomBytes(16).toString("base64url");
  const exp = Date.now() + 15 * 60 * 1000;
  const body = Buffer.from(JSON.stringify({ userId, nonce, exp }), "utf8").toString("base64url");
  const sig = createHmac("sha256", stateSecret()).update(body).digest("base64url");
  return `${body}.${sig}`;
}

export function parseOAuthState(state: string): { userId: string } {
  const [body, sig] = state.split(".");
  if (!body || !sig) throw new Error("Invalid OAuth state");
  const expected = createHmac("sha256", stateSecret()).update(body).digest("base64url");
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) {
    throw new Error("Invalid OAuth state signature");
  }
  const parsed = JSON.parse(Buffer.from(body, "base64url").toString("utf8")) as {
    userId: string;
    exp: number;
  };
  if (!parsed.userId || !parsed.exp || Date.now() > parsed.exp) {
    throw new Error("OAuth state expired");
  }
  return { userId: parsed.userId };
}

export function buildGoogleAuthUrl(state: string) {
  if (!isGoogleCalendarConfigured()) {
    throw new Error("Google Calendar belum dikonfigurasi (GOOGLE_CLIENT_ID/SECRET)");
  }
  const params = new URLSearchParams({
    client_id: process.env.GOOGLE_CLIENT_ID!,
    redirect_uri: getGoogleRedirectUri(),
    response_type: "code",
    scope: GOOGLE_CALENDAR_SCOPES,
    access_type: "offline",
    prompt: "consent",
    include_granted_scopes: "true",
    state,
  });
  return `${GOOGLE_AUTH_URL}?${params.toString()}`;
}

type TokenResponse = {
  access_token: string;
  expires_in?: number;
  refresh_token?: string;
  scope?: string;
  token_type?: string;
  id_token?: string;
};

async function exchangeCode(code: string): Promise<TokenResponse> {
  const body = new URLSearchParams({
    code,
    client_id: process.env.GOOGLE_CLIENT_ID!,
    client_secret: process.env.GOOGLE_CLIENT_SECRET!,
    redirect_uri: getGoogleRedirectUri(),
    grant_type: "authorization_code",
  });
  const res = await fetch(GOOGLE_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });
  const data = (await res.json()) as TokenResponse & { error?: string; error_description?: string };
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
  const data = (await res.json()) as TokenResponse & { error?: string; error_description?: string };
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

export async function saveGoogleConnectionFromCode(userId: string, code: string) {
  const tokens = await exchangeCode(code);
  if (!tokens.refresh_token) {
    // Maybe reconnect without re-consent; keep existing refresh if present
    const [existing] = await db
      .select()
      .from(googleCalendarConnections)
      .where(eq(googleCalendarConnections.userId, userId))
      .limit(1);
    if (!existing?.refreshTokenEnc) {
      throw new Error("Google tidak mengirim refresh token. Cabut akses Cubiqlo di Google Account lalu connect ulang.");
    }
  }

  const email = await fetchGoogleEmail(tokens.access_token);
  const expiryDate = tokens.expires_in
    ? new Date(Date.now() + tokens.expires_in * 1000)
    : null;

  const [existing] = await db
    .select()
    .from(googleCalendarConnections)
    .where(eq(googleCalendarConnections.userId, userId))
    .limit(1);

  const refreshTokenEnc = tokens.refresh_token
    ? encryptSecret(tokens.refresh_token)
    : existing?.refreshTokenEnc;
  if (!refreshTokenEnc) {
    throw new Error("Refresh token Google tidak tersedia");
  }

  const values = {
    userId,
    googleAccountEmail: email,
    accessTokenEnc: encryptSecret(tokens.access_token),
    refreshTokenEnc,
    scope: tokens.scope || GOOGLE_CALENDAR_SCOPES,
    tokenType: tokens.token_type || "Bearer",
    expiryDate,
    calendarId: existing?.calendarId || "primary",
    status: "connected" as const,
    lastError: null,
    updatedAt: new Date(),
  };

  if (existing) {
    const [updated] = await db
      .update(googleCalendarConnections)
      .set(values)
      .where(eq(googleCalendarConnections.id, existing.id))
      .returning();
    return updated;
  }

  const [created] = await db
    .insert(googleCalendarConnections)
    .values({
      ...values,
      connectedAt: new Date(),
    })
    .returning();
  return created;
}

export async function getGoogleConnectionStatus(userId: string) {
  const [conn] = await db
    .select({
      id: googleCalendarConnections.id,
      googleAccountEmail: googleCalendarConnections.googleAccountEmail,
      calendarId: googleCalendarConnections.calendarId,
      status: googleCalendarConnections.status,
      lastError: googleCalendarConnections.lastError,
      connectedAt: googleCalendarConnections.connectedAt,
      updatedAt: googleCalendarConnections.updatedAt,
    })
    .from(googleCalendarConnections)
    .where(eq(googleCalendarConnections.userId, userId))
    .limit(1);

  return {
    configured: isGoogleCalendarConfigured(),
    connected: Boolean(conn && conn.status === "connected"),
    connection: conn ?? null,
  };
}

export async function disconnectGoogleCalendar(userId: string) {
  await db
    .delete(googleCalendarConnections)
    .where(eq(googleCalendarConnections.userId, userId));
  return { ok: true as const };
}

async function getValidAccessToken(userId: string): Promise<{
  accessToken: string;
  calendarId: string;
  connectionId: string;
} | null> {
  if (!isGoogleCalendarConfigured()) return null;

  const [conn] = await db
    .select()
    .from(googleCalendarConnections)
    .where(
      and(
        eq(googleCalendarConnections.userId, userId),
        eq(googleCalendarConnections.status, "connected"),
      ),
    )
    .limit(1);

  if (!conn) return null;

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
      .update(googleCalendarConnections)
      .set({
        accessTokenEnc: encryptSecret(refreshed.access_token),
        expiryDate,
        scope: refreshed.scope || conn.scope,
        tokenType: refreshed.token_type || conn.tokenType,
        status: "connected",
        lastError: null,
        updatedAt: new Date(),
      })
      .where(eq(googleCalendarConnections.id, conn.id));

    return {
      accessToken: refreshed.access_token,
      calendarId: conn.calendarId || "primary",
      connectionId: conn.id,
    };
  } catch (err) {
    await db
      .update(googleCalendarConnections)
      .set({
        status: "error",
        lastError: err instanceof Error ? err.message : "Token refresh failed",
        updatedAt: new Date(),
      })
      .where(eq(googleCalendarConnections.id, conn.id));
    return null;
  }
}

function eventBody(input: {
  title: string;
  notes?: string | null;
  attendeeName?: string | null;
  attendeeEmail?: string | null;
  startTime: Date;
  endTime: Date;
  timezone?: string;
}) {
  const descriptionParts = [
    input.notes?.trim() || null,
    input.attendeeName ? `Attendee: ${input.attendeeName}` : null,
    input.attendeeEmail ? `Email: ${input.attendeeEmail}` : null,
    "Created by Cubiqlo booking",
  ].filter(Boolean);

  return {
    summary: input.title,
    description: descriptionParts.join("\n"),
    start: {
      dateTime: input.startTime.toISOString(),
      timeZone: input.timezone || "UTC",
    },
    end: {
      dateTime: input.endTime.toISOString(),
      timeZone: input.timezone || "UTC",
    },
    attendees: input.attendeeEmail
      ? [
          {
            email: input.attendeeEmail,
            displayName: input.attendeeName || undefined,
          },
        ]
      : undefined,
    reminders: {
      useDefault: true,
    },
  };
}

export async function syncAppointmentToGoogleCalendar(input: {
  appointmentId: string;
  userId: string;
  title: string;
  notes?: string | null;
  attendeeName?: string | null;
  attendeeEmail?: string | null;
  startTime: Date;
  endTime: Date;
  timezone?: string;
}) {
  const auth = await getValidAccessToken(input.userId);
  if (!auth) return null;

  try {
    const [existing] = await db
      .select({
        googleEventId: appointments.googleEventId,
        googleCalendarId: appointments.googleCalendarId,
      })
      .from(appointments)
      .where(eq(appointments.id, input.appointmentId))
      .limit(1);

    const calendarId = encodeURIComponent(existing?.googleCalendarId || auth.calendarId || "primary");
    const body = eventBody(input);

    let eventId = existing?.googleEventId || null;
    if (eventId) {
      const res = await fetch(`${GOOGLE_EVENTS_URL}/${calendarId}/events/${encodeURIComponent(eventId)}`, {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${auth.accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        // recreate if missing
        if (res.status === 404) {
          eventId = null;
        } else {
          const errText = await res.text();
          throw new Error(`Google update event failed: ${res.status} ${errText}`);
        }
      } else {
        const data = (await res.json()) as { id?: string };
        eventId = data.id || eventId;
      }
    }

    if (!eventId) {
      const res = await fetch(
        `${GOOGLE_EVENTS_URL}/${calendarId}/events?sendUpdates=all`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${auth.accessToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(body),
        },
      );
      if (!res.ok) {
        const errText = await res.text();
        throw new Error(`Google create event failed: ${res.status} ${errText}`);
      }
      const data = (await res.json()) as { id?: string };
      eventId = data.id || null;
    }

    if (eventId) {
      await db
        .update(appointments)
        .set({
          googleEventId: eventId,
          googleCalendarId: auth.calendarId || "primary",
        })
        .where(eq(appointments.id, input.appointmentId));
    }

    return eventId;
  } catch (err) {
    await db
      .update(googleCalendarConnections)
      .set({
        status: "error",
        lastError: err instanceof Error ? err.message : "Sync failed",
        updatedAt: new Date(),
      })
      .where(eq(googleCalendarConnections.userId, input.userId));
    return null;
  }
}

export async function cancelAppointmentOnGoogleCalendar(input: {
  appointmentId: string;
  userId: string;
  googleEventId?: string | null;
  googleCalendarId?: string | null;
}) {
  const auth = await getValidAccessToken(input.userId);
  if (!auth) return false;

  const eventId = input.googleEventId;
  if (!eventId) return false;

  try {
    const calendarId = encodeURIComponent(input.googleCalendarId || auth.calendarId || "primary");
    const res = await fetch(
      `${GOOGLE_EVENTS_URL}/${calendarId}/events/${encodeURIComponent(eventId)}?sendUpdates=all`,
      {
        method: "DELETE",
        headers: { Authorization: `Bearer ${auth.accessToken}` },
      },
    );
    // 404/410 = already gone
    if (!res.ok && res.status !== 404 && res.status !== 410) {
      const errText = await res.text();
      throw new Error(`Google delete event failed: ${res.status} ${errText}`);
    }

    await db
      .update(appointments)
      .set({
        googleEventId: null,
        googleCalendarId: null,
      })
      .where(eq(appointments.id, input.appointmentId));

    return true;
  } catch (err) {
    await db
      .update(googleCalendarConnections)
      .set({
        status: "error",
        lastError: err instanceof Error ? err.message : "Cancel sync failed",
        updatedAt: new Date(),
      })
      .where(eq(googleCalendarConnections.userId, input.userId));
    return false;
  }
}
