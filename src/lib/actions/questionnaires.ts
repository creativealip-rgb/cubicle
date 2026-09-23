"use server";
import { getWorkspaceForCurrentUser } from "@/lib/workspace";

import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { db } from "@/db";
import { questionnaires, questionnaireResponses, clients, workspaces } from "@/db/schema";
import { eq, and, desc } from "drizzle-orm";
import { z } from "zod";
import * as crypto from "node:crypto";
import { requireUser, assertWorkspaceMember, assertWorkspaceWritable } from "@/lib/access";
import { writeActivityLog } from "@/lib/actions/activity";
import { notifyWorkspaceMembers } from "@/lib/in-app-notifications";
import { sendNotification } from "@/lib/notifications";
import { resolveWorkspaceReplyTo } from "@/lib/workspace-reply-to";
import {
  questionnaireSchemaInput,
  safeParseQuestionnaireSchema,
} from "@/lib/questionnaire-schema";

const createQuestionnaireSchema = z.object({
  workspaceId: z.string().uuid(),
  name: z.string().min(1).max(200),
  description: z.string().max(2000).optional().nullable(),
  schema: questionnaireSchemaInput,
});

const updateQuestionnaireSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  description: z.string().max(2000).optional().nullable(),
  schema: questionnaireSchemaInput.optional(),
});

async function getWorkspaceId(): Promise<string> {
  return getWorkspaceForCurrentUser();
}

function generateToken() {
  return crypto.randomBytes(32).toString("base64url");
}

function hashToken(token: string) {
  return crypto.createHash("sha256").update(token).digest("hex");
}

// ─── Authenticated: Manage Questionnaires ───

export async function createQuestionnaire(input: Omit<z.infer<typeof createQuestionnaireSchema>, "workspaceId"> & { workspaceId?: string }) {
  const session = await auth.api.getSession({ headers: await headers() });
  const user = requireUser(session?.user);
  const targetWorkspaceId = input.workspaceId || (await getWorkspaceId());
  await assertWorkspaceWritable(db, user.id, targetWorkspaceId);

  const parsed = createQuestionnaireSchema.parse({ ...input, workspaceId: targetWorkspaceId });

  const [q] = await db.insert(questionnaires).values({
    workspaceId: parsed.workspaceId,
    name: parsed.name,
    description: parsed.description || null,
    schema: parsed.schema,
    createdBy: user.id,
  }).returning();

  await writeActivityLog(parsed.workspaceId, user.id, "created_questionnaire", "questionnaire", q.id, {
    name: q.name,
  });
  return q;
}

export async function updateQuestionnaire(questionnaireId: string, input: z.infer<typeof updateQuestionnaireSchema>) {
  const session = await auth.api.getSession({ headers: await headers() });
  const user = requireUser(session?.user);
  const workspaceId = await getWorkspaceId();
  await assertWorkspaceWritable(db, user.id, workspaceId);
  const parsed = updateQuestionnaireSchema.parse(input);

  const [existing] = await db.select().from(questionnaires)
    .where(and(eq(questionnaires.id, questionnaireId), eq(questionnaires.workspaceId, workspaceId)))
    .limit(1);
  if (!existing) throw new Error("Questionnaire not found");

  const [updated] = await db.update(questionnaires)
    .set({ ...parsed, updatedAt: new Date() })
    .where(eq(questionnaires.id, questionnaireId))
    .returning();

  await writeActivityLog(workspaceId, user.id, "updated_questionnaire", "questionnaire", questionnaireId, {
    name: updated.name,
  });
  return updated;
}

export async function duplicateQuestionnaire(questionnaireId: string) {
  const session = await auth.api.getSession({ headers: await headers() });
  const user = requireUser(session?.user);
  const workspaceId = await getWorkspaceId();
  await assertWorkspaceWritable(db, user.id, workspaceId);

  const [existing] = await db
    .select()
    .from(questionnaires)
    .where(and(eq(questionnaires.id, questionnaireId), eq(questionnaires.workspaceId, workspaceId)))
    .limit(1);
  if (!existing) throw new Error("Questionnaire not found");

  const [created] = await db
    .insert(questionnaires)
    .values({
      workspaceId,
      name: `${existing.name} (Salinan)`,
      description: existing.description,
      schema: existing.schema,
      createdBy: user.id,
    })
    .returning();

  await writeActivityLog(workspaceId, user.id, "created_questionnaire", "questionnaire", created.id, {
    name: created.name,
    duplicatedFrom: questionnaireId,
  });

  return created;
}

export async function deleteQuestionnaire(questionnaireId: string) {
  const session = await auth.api.getSession({ headers: await headers() });
  const user = requireUser(session?.user);
  const workspaceId = await getWorkspaceId();
  await assertWorkspaceWritable(db, user.id, workspaceId);

  const [existing] = await db.select().from(questionnaires)
    .where(and(eq(questionnaires.id, questionnaireId), eq(questionnaires.workspaceId, workspaceId)))
    .limit(1);
  if (!existing) throw new Error("Questionnaire not found");

  await db.delete(questionnaires).where(eq(questionnaires.id, questionnaireId));
  await writeActivityLog(workspaceId, user.id, "deleted_questionnaire", "questionnaire", questionnaireId, {
    name: existing.name,
  });
  return { success: true };
}

// ─── Authenticated: Send Questionnaire to a Client ───

export async function sendQuestionnaire(input: {
  questionnaireId: string;
  clientId: string;
  projectId?: string | null;
  ttlDays?: number;
}) {
  const session = await auth.api.getSession({ headers: await headers() });
  const user = requireUser(session?.user);
  const workspaceId = await getWorkspaceId();
  await assertWorkspaceWritable(db, user.id, workspaceId);

  const [q] = await db.select().from(questionnaires)
    .where(and(eq(questionnaires.id, input.questionnaireId), eq(questionnaires.workspaceId, workspaceId)))
    .limit(1);
  if (!q) throw new Error("Questionnaire not found");

  const [c] = await db.select().from(clients)
    .where(and(eq(clients.id, input.clientId), eq(clients.workspaceId, workspaceId)))
    .limit(1);
  if (!c) throw new Error("Client not found");
  if (!c.email) throw new Error("Client email is missing");
  const recipientEmail = c.email;
  const [ws] = await db.select({ name: workspaces.name })
    .from(workspaces)
    .where(eq(workspaces.id, workspaceId))
    .limit(1);

  const token = generateToken();
  const ttl = input.ttlDays ?? 30;
  const expiresAt = new Date(Date.now() + ttl * 24 * 60 * 60 * 1000);

  // Transactional send: create the pending response + share token and email the
  // client, committing only after the email succeeded. If the email fails, throw
  // so the transaction rolls back — no orphaned "pending" response is created.
  const [resp] = await db.transaction(async (tx) => {
    const appUrl = (
      process.env.NEXT_PUBLIC_APP_URL ??
      process.env.BETTER_AUTH_URL ??
      "https://cubiqlo.com"
    ).replace(/\/$/, "");
    const replyTo = await resolveWorkspaceReplyTo(workspaceId);
    const emailResult = await sendNotification({
      to: recipientEmail,
      subject: `Questionnaire: ${q.name}`,
      text:
        `Hi ${c.name || "there"},\n\n` +
        `${ws?.name || "Cubiqlo"} sent you a questionnaire: "${q.name}".\n\n` +
        `Fill it out here:\n${appUrl}/intake/${token}\n\n` +
        `This link is valid for ${ttl} days. If you have any questions, just reply to this email.`,
      type: "questionnaire_sent",
      replyTo,
    });
    if (!emailResult.success) {
      throw new Error("Failed to send questionnaire email — response was not created");
    }

    return tx.insert(questionnaireResponses).values({
      workspaceId,
      questionnaireId: q.id,
      clientId: c.id,
      projectId: input.projectId || null,
      respondentName: c.name,
      respondentEmail: c.email,
      status: "pending",
      sharedTokenHash: hashToken(token),
      sharedTokenExpiresAt: expiresAt,
    }).returning();
  });

  await writeActivityLog(workspaceId, user.id, "sent_questionnaire", "questionnaire_response", resp.id, {
    questionnaireName: q.name,
    clientName: c.name,
  });

  return { response: resp, token };
}

export async function listQuestionnaires() {
  const session = await auth.api.getSession({ headers: await headers() });
  const user = requireUser(session?.user);
  const workspaceId = await getWorkspaceId();
  await assertWorkspaceMember(db, user.id, workspaceId);

  return db.select().from(questionnaires)
    .where(eq(questionnaires.workspaceId, workspaceId))
    .orderBy(desc(questionnaires.createdAt));
}

export async function getQuestionnaire(questionnaireId: string) {
  const session = await auth.api.getSession({ headers: await headers() });
  const user = requireUser(session?.user);
  const workspaceId = await getWorkspaceId();
  await assertWorkspaceMember(db, user.id, workspaceId);

  const [q] = await db.select().from(questionnaires)
    .where(and(eq(questionnaires.id, questionnaireId), eq(questionnaires.workspaceId, workspaceId)))
    .limit(1);
  if (!q) throw new Error("Questionnaire not found");

  // Include all responses for this questionnaire
  const responses = await db.select().from(questionnaireResponses)
    .where(eq(questionnaireResponses.questionnaireId, questionnaireId))
    .orderBy(desc(questionnaireResponses.createdAt));

  return { ...q, responses };
}

// ─── Public: Fill & Submit ───

// Note: Public route bypasses auth, so we hash the provided token to look up
// ─── Convert Questionnaire Response to Client / Project ───

export async function convertResponseToClient(responseId: string) {
  const session = await auth.api.getSession({ headers: await headers() });
  const user = requireUser(session?.user);
  const workspaceId = await getWorkspaceId();
  await assertWorkspaceWritable(db, user.id, workspaceId);

  const [resp] = await db
    .select()
    .from(questionnaireResponses)
    .where(and(eq(questionnaireResponses.id, responseId), eq(questionnaireResponses.workspaceId, workspaceId)))
    .limit(1);

  if (!resp) throw new Error("Respon tidak ditemukan");

  const answers = (resp.answers as Record<string, unknown>) || {};
  let phone = "";
  for (const [k, v] of Object.entries(answers)) {
    if (typeof v === "string" && (/^\+?[0-9\s-]{8,20}$/.test(v) || k.toLowerCase().includes("phone") || k.toLowerCase().includes("wa"))) {
      phone = v;
      break;
    }
  }

  const clientName = resp.respondentName?.trim() || "Klien Baru (dari Form)";
  const clientEmail = resp.respondentEmail?.trim() || "";

  // Create new client
  const { createClient } = await import("@/lib/actions/clients");
  const res = await createClient({
    name: clientName,
    email: clientEmail,
    phone: phone || undefined,
    tags: [],
    internalNotes: `Dibuat otomatis dari respon formulir pada ${new Date().toLocaleDateString("id-ID")}`,
  });

  if (!res.ok || !res.client) {
    throw new Error(res.error || "Gagal membuat klien");
  }

  // Link response to created client
  await db
    .update(questionnaireResponses)
    .set({ clientId: res.client.id })
    .where(eq(questionnaireResponses.id, responseId));

  return { ok: true, clientId: res.client.id, clientName };
}

export async function convertResponseToProject(responseId: string, projectNameInput?: string) {
  const session = await auth.api.getSession({ headers: await headers() });
  const user = requireUser(session?.user);
  const workspaceId = await getWorkspaceId();
  await assertWorkspaceWritable(db, user.id, workspaceId);

  const [resp] = await db
    .select()
    .from(questionnaireResponses)
    .where(and(eq(questionnaireResponses.id, responseId), eq(questionnaireResponses.workspaceId, workspaceId)))
    .limit(1);

  if (!resp) throw new Error("Respon tidak ditemukan");

  const [q] = await db
    .select()
    .from(questionnaires)
    .where(eq(questionnaires.id, resp.questionnaireId))
    .limit(1);

  const fields = q ? safeParseQuestionnaireSchema(q.schema) : [];
  const answers = (resp.answers as Record<string, unknown>) || {};

  // Build project description from form brief
  const briefLines = fields.map((f) => {
    const val = answers[f.id];
    const display = val ? (Array.isArray(val) ? val.join(", ") : String(val)) : "-";
    return `### ${f.label}\n${display}`;
  });

  const finalProjectName =
    projectNameInput?.trim() ||
    `Proyek Brief: ${resp.respondentName || q?.name || "Klien"}`;

  const { createProject } = await import("@/lib/actions/projects");
  const res = await createProject({
    name: finalProjectName,
    description: briefLines.join("\n\n"),
    clientId: resp.clientId || undefined,
    billingType: "fixed_price",
    status: "active",
  });

  if ("id" in res && typeof res.id === "string") {
    await db
      .update(questionnaireResponses)
      .set({ projectId: res.id })
      .where(eq(questionnaireResponses.id, responseId));
  }

  return res;
}
export async function getPublicQuestionnaire(tokenOrId: string) {
  const tokenHash = hashToken(tokenOrId);
  
  // 1. Coba cari by direct response token (link khusus per klien/respon)
  const [resp] = await db
    .select()
    .from(questionnaireResponses)
    .where(eq(questionnaireResponses.sharedTokenHash, tokenHash))
    .limit(1);

  if (resp) {
    if (resp.sharedTokenRevokedAt) return { error: "revoked" as const };
    if (resp.sharedTokenExpiresAt && resp.sharedTokenExpiresAt < new Date()) {
      return { error: "expired" as const };
    }
    if (resp.status === "submitted") {
      return { error: "already_submitted" as const };
    }

    const [q] = await db
      .select()
      .from(questionnaires)
      .where(eq(questionnaires.id, resp.questionnaireId))
      .limit(1);
    if (!q) return { error: "not_found" as const };

    return {
      response: resp,
      questionnaire: q,
      isPublicMasterLink: false,
    };
  }

  // 2. Jika bukan token respon spesifik, coba cari by Questionnaire Master ID (Public Shareable Link ke siapapun)
  const [qMaster] = await db
    .select()
    .from(questionnaires)
    .where(eq(questionnaires.id, tokenOrId))
    .limit(1);

  if (qMaster) {
    return {
      questionnaire: qMaster,
      isPublicMasterLink: true,
    };
  }

  return { error: "not_found" as const };
}

export async function submitQuestionnaire(input: {
  token: string;
  answers: Record<string, string | string[] | number>;
  respondentName?: string;
  respondentEmail?: string;
}) {
  const { enforceServerActionRateLimit } = await import("@/lib/distributed-rate-limit");
  await enforceServerActionRateLimit("questionnaire:submit", input.token, { limit: 20, windowSec: 300 });

  const tokenHash = hashToken(input.token);

  // 1. Coba submit via specific client token
  const [resp] = await db
    .select()
    .from(questionnaireResponses)
    .where(eq(questionnaireResponses.sharedTokenHash, tokenHash))
    .limit(1);

  if (resp) {
    if (resp.sharedTokenRevokedAt) throw new Error("Token revoked");
    if (resp.sharedTokenExpiresAt && resp.sharedTokenExpiresAt < new Date()) {
      throw new Error("Token expired");
    }
    if (resp.status === "submitted") throw new Error("Already submitted");

    // Validate required fields
    const [q] = await db
      .select()
      .from(questionnaires)
      .where(eq(questionnaires.id, resp.questionnaireId))
      .limit(1);
    if (!q) throw new Error("Questionnaire not found");

    const fields = safeParseQuestionnaireSchema(q.schema);
    for (const field of fields) {
      if (field.required && field.type !== "heading" && field.type !== "divider" && field.type !== "info" && field.type !== "page_break") {
        const val = input.answers[field.id];
        if (val === undefined || val === null || val === "" || (Array.isArray(val) && val.length === 0)) {
          throw new Error(`Field "${field.label}" is required`);
        }
      }
    }

    const [updated] = await db
      .update(questionnaireResponses)
      .set({
        answers: input.answers,
        respondentName: input.respondentName || resp.respondentName,
        respondentEmail: input.respondentEmail || resp.respondentEmail,
        status: "submitted",
        submittedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(questionnaireResponses.id, resp.id))
      .returning();

    await writeActivityLog(resp.workspaceId, null, "submitted_questionnaire", "questionnaire_response", resp.id, {
      questionnaireName: q.name,
      respondentEmail: resp.respondentEmail,
    });

    try {
      await notifyWorkspaceMembers(resp.workspaceId, {
        type: "questionnaire_answered",
        title: `${resp.respondentName ?? resp.respondentEmail ?? "Responden"} answered form`,
        body: q.name,
        link: `/app/questionnaires/${q.id}`,
        entityType: "questionnaire_response",
        entityId: resp.id,
        actorId: null,
      });
    } catch {
      // best-effort
    }

    return updated;
  }

  // 2. Submit via Public Master Link (Membuat entry respon baru di database secara dinamis)
  const [qMaster] = await db
    .select()
    .from(questionnaires)
    .where(eq(questionnaires.id, input.token))
    .limit(1);

  if (!qMaster) throw new Error("Formulir tidak ditemukan");

  const fields = safeParseQuestionnaireSchema(qMaster.schema);
  for (const field of fields) {
    if (field.required && field.type !== "heading" && field.type !== "divider" && field.type !== "info" && field.type !== "page_break") {
      const val = input.answers[field.id];
      if (val === undefined || val === null || val === "" || (Array.isArray(val) && val.length === 0)) {
        throw new Error(`Field "${field.label}" is required`);
      }
    }
  }

  const [newResponse] = await db
    .insert(questionnaireResponses)
    .values({
      workspaceId: qMaster.workspaceId,
      questionnaireId: qMaster.id,
      respondentName: input.respondentName || (input.answers["name"] as string) || (input.answers["full_name"] as string) || null,
      respondentEmail: input.respondentEmail || (input.answers["email"] as string) || null,
      answers: input.answers,
      status: "submitted",
      submittedAt: new Date(),
    })
    .returning();

  await writeActivityLog(qMaster.workspaceId, null, "submitted_questionnaire", "questionnaire_response", newResponse.id, {
    questionnaireName: qMaster.name,
    respondentEmail: newResponse.respondentEmail,
  });

  try {
    await notifyWorkspaceMembers(qMaster.workspaceId, {
      type: "questionnaire_answered",
      title: `${newResponse.respondentName ?? newResponse.respondentEmail ?? "Responden"} mengisi formulir`,
      body: qMaster.name,
      link: `/app/questionnaires/${qMaster.id}`,
      entityType: "questionnaire_response",
      entityId: newResponse.id,
      actorId: null,
    });
  } catch {
    // best-effort
  }

  return newResponse;
}
