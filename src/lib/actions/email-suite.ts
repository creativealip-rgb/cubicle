"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { and, desc, eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { clients, emailMessages, projects, workspaces } from "@/db/schema";
import { auth } from "@/lib/auth";
import { assertWorkspaceWritable, requireUser } from "@/lib/access";
import { getWorkspaceForCurrentUser } from "@/lib/workspace";
import { sendNotification } from "@/lib/notifications";
import { writeActivityLog } from "@/lib/actions/activity";

const emailSchema = z.object({
  toEmail: z.string().email(),
  subject: z.string().min(1).max(200),
  body: z.string().min(1).max(10000),
  clientId: z.string().uuid().optional().or(z.literal("")),
  projectId: z.string().uuid().optional().or(z.literal("")),
});

async function getContext() {
  const session = await auth.api.getSession({ headers: await headers() });
  const user = requireUser(session?.user);
  const workspaceId = await getWorkspaceForCurrentUser();
  await assertWorkspaceWritable(db, user.id, workspaceId);
  return { user, workspaceId };
}

export async function listEmailMessages() {
  const { user, workspaceId } = await getContext();
  await assertWorkspaceWritable(db, user.id, workspaceId);
  return db
    .select({
      id: emailMessages.id,
      toEmail: emailMessages.toEmail,
      subject: emailMessages.subject,
      body: emailMessages.body,
      status: emailMessages.status,
      sentAt: emailMessages.sentAt,
      createdAt: emailMessages.createdAt,
      clientName: clients.name,
      projectName: projects.name,
    })
    .from(emailMessages)
    .leftJoin(clients, eq(clients.id, emailMessages.clientId))
    .leftJoin(projects, eq(projects.id, emailMessages.projectId))
    .where(eq(emailMessages.workspaceId, workspaceId))
    .orderBy(desc(emailMessages.createdAt))
    .limit(50);
}

export async function createEmailDraft(input: z.infer<typeof emailSchema>) {
  const { user, workspaceId } = await getContext();
  const parsed = emailSchema.parse(input);
  const [draft] = await db
    .insert(emailMessages)
    .values({
      workspaceId,
      userId: user.id,
      toEmail: parsed.toEmail,
      subject: parsed.subject,
      body: parsed.body,
      clientId: parsed.clientId || null,
      projectId: parsed.projectId || null,
      status: "draft",
    })
    .returning();
  await writeActivityLog(workspaceId, user.id, "created_email_draft", "email", draft.id);
  revalidatePath("/app/email");
  return draft;
}

export async function sendEmailMessage(input: z.infer<typeof emailSchema>) {
  const { user, workspaceId } = await getContext();
  const parsed = emailSchema.parse(input);
  const [workspace] = await db
    .select({ name: workspaces.name, replyToEmail: workspaces.replyToEmail })
    .from(workspaces)
    .where(eq(workspaces.id, workspaceId))
    .limit(1);

  const sendResult = await sendNotification({
    to: parsed.toEmail,
    subject: parsed.subject,
    text: parsed.body,
    type: "email_suite",
    replyTo: workspace?.replyToEmail ?? undefined,
  });

  const [message] = await db
    .insert(emailMessages)
    .values({
      workspaceId,
      userId: user.id,
      toEmail: parsed.toEmail,
      subject: parsed.subject,
      body: parsed.body,
      clientId: parsed.clientId || null,
      projectId: parsed.projectId || null,
      status: sendResult.success ? "sent" : "failed",
      sentAt: sendResult.success ? new Date() : null,
    })
    .returning();

  await writeActivityLog(
    workspaceId,
    user.id,
    sendResult.success ? "sent_email_message" : "failed_email_message",
    "email",
    message.id,
    { workspaceName: workspace?.name ?? null },
  );
  revalidatePath("/app/email");
  return { message, sendResult };
}

export async function deleteEmailMessage(messageId: string) {
  const { user, workspaceId } = await getContext();
  const [message] = await db
    .select({ id: emailMessages.id })
    .from(emailMessages)
    .where(and(eq(emailMessages.id, messageId), eq(emailMessages.workspaceId, workspaceId)))
    .limit(1);
  if (!message) throw new Error("Email message not found");
  await db.delete(emailMessages).where(eq(emailMessages.id, messageId));
  await writeActivityLog(workspaceId, user.id, "deleted_email_message", "email", messageId);
  revalidatePath("/app/email");
  return { success: true };
}
