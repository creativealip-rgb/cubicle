"use server";

import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { db } from "@/db";
import { questionnaires, questionnaireResponses, clients, projects, workspaces } from "@/db/schema";
import { eq, and, desc, sql } from "drizzle-orm";
import { z } from "zod";
import crypto from "crypto";
import { requireUser, assertWorkspaceMember, assertWorkspaceWritable } from "@/lib/access";
import { writeActivityLog } from "@/lib/actions/activity";

// Field schema for the form builder
const fieldSchema = z.object({
  id: z.string().min(1).max(100),
  type: z.enum(["text", "textarea", "select", "multiselect", "number", "date", "email", "url"]),
  label: z.string().min(1).max(200),
  required: z.boolean().default(false),
  options: z.array(z.string()).optional(),
  placeholder: z.string().optional(),
});

const createQuestionnaireSchema = z.object({
  workspaceId: z.string().uuid(),
  name: z.string().min(1).max(200),
  description: z.string().max(2000).optional().nullable(),
  schema: z.array(fieldSchema).max(50),
});

const updateQuestionnaireSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  description: z.string().max(2000).optional().nullable(),
  schema: z.array(fieldSchema).max(50).optional(),
});

async function getWorkspaceId(): Promise<string> {
  const [ws] = await db.select({ id: workspaces.id }).from(workspaces).where(eq(workspaces.slug, "acme-creative")).limit(1);
  if (!ws) throw new Error("Workspace not found");
  return ws.id;
}

function generateToken() {
  return crypto.randomBytes(32).toString("base64url");
}

function hashToken(token: string) {
  return crypto.createHash("sha256").update(token).digest("hex");
}

// ─── Authenticated: Manage Questionnaires ───

export async function createQuestionnaire(input: z.infer<typeof createQuestionnaireSchema>) {
  const session = await auth.api.getSession({ headers: await headers() });
  const user = requireUser(session?.user);
  await assertWorkspaceWritable(db, user.id, input.workspaceId);
  const parsed = createQuestionnaireSchema.parse(input);

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

  const token = generateToken();
  const ttl = input.ttlDays ?? 30;
  const expiresAt = new Date(Date.now() + ttl * 24 * 60 * 60 * 1000);

  const [resp] = await db.insert(questionnaireResponses).values({
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
export async function getPublicQuestionnaire(token: string) {
  const tokenHash = hashToken(token);
  const [resp] = await db.select().from(questionnaireResponses)
    .where(eq(questionnaireResponses.sharedTokenHash, tokenHash))
    .limit(1);
  if (!resp) return { error: "not_found" as const };
  if (resp.sharedTokenRevokedAt) return { error: "revoked" as const };
  if (resp.sharedTokenExpiresAt && resp.sharedTokenExpiresAt < new Date()) {
    return { error: "expired" as const };
  }
  if (resp.status === "submitted") {
    return { error: "already_submitted" as const };
  }

  const [q] = await db.select().from(questionnaires)
    .where(eq(questionnaires.id, resp.questionnaireId))
    .limit(1);
  if (!q) return { error: "not_found" as const };

  return {
    response: resp,
    questionnaire: q,
  };
}

export async function submitQuestionnaire(input: {
  token: string;
  answers: Record<string, string | string[] | number>;
}) {
  const tokenHash = hashToken(input.token);
  const [resp] = await db.select().from(questionnaireResponses)
    .where(eq(questionnaireResponses.sharedTokenHash, tokenHash))
    .limit(1);
  if (!resp) throw new Error("Response not found");
  if (resp.sharedTokenRevokedAt) throw new Error("Token revoked");
  if (resp.sharedTokenExpiresAt && resp.sharedTokenExpiresAt < new Date()) {
    throw new Error("Token expired");
  }
  if (resp.status === "submitted") throw new Error("Already submitted");

  // Validate required fields
  const [q] = await db.select().from(questionnaires)
    .where(eq(questionnaires.id, resp.questionnaireId))
    .limit(1);
  if (!q) throw new Error("Questionnaire not found");

  const fields = (q.schema as Array<z.infer<typeof fieldSchema>>) || [];
  for (const field of fields) {
    if (field.required) {
      const val = input.answers[field.id];
      if (val === undefined || val === null || val === "" || (Array.isArray(val) && val.length === 0)) {
        throw new Error(`Field "${field.label}" is required`);
      }
    }
  }

  const [updated] = await db.update(questionnaireResponses)
    .set({
      answers: input.answers,
      status: "submitted",
      submittedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(questionnaireResponses.id, resp.id))
    .returning();

  await writeActivityLog(resp.workspaceId, resp.respondentEmail || "anonymous", "submitted_questionnaire", "questionnaire_response", resp.id, {
    questionnaireName: q.name,
  });

  return updated;
}
