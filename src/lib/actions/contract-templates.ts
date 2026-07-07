"use server";

import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { db } from "@/db";
import { contractTemplates } from "@/db/schema";
import { eq, and, desc } from "drizzle-orm";
import { requireUser, assertWorkspaceMember } from "@/lib/access";
import { getWorkspaceForCurrentUser } from "@/lib/workspace";
import { z } from "zod";

const schema = z.object({
  name: z.string().min(1).max(200),
  body: z.string().optional(),
  isDefault: z.boolean().default(false),
});

async function getWorkspaceId(): Promise<string> {
  return getWorkspaceForCurrentUser();
}

export async function createContractTemplate(input: z.infer<typeof schema>) {
  const session = await auth.api.getSession({ headers: await headers() });
  const user = requireUser(session?.user);
  const workspaceId = await getWorkspaceId();
  const member = await assertWorkspaceMember(db, user.id, workspaceId);
  if (member.role === "viewer") throw new Error("Viewers cannot create templates");

  const parsed = schema.parse(input);

  const [tpl] = await db
    .insert(contractTemplates)
    .values({
      workspaceId,
      name: parsed.name,
      body: parsed.body || "",
      isDefault: parsed.isDefault,
      createdBy: user.id,
    })
    .returning();

  return tpl;
}

export async function updateContractTemplate(templateId: string, input: z.infer<typeof schema>) {
  const session = await auth.api.getSession({ headers: await headers() });
  const user = requireUser(session?.user);
  const workspaceId = await getWorkspaceId();
  const member = await assertWorkspaceMember(db, user.id, workspaceId);
  if (member.role === "viewer") throw new Error("Viewers cannot update templates");

  const parsed = schema.parse(input);

  const [tpl] = await db
    .update(contractTemplates)
    .set({
      name: parsed.name,
      body: parsed.body || "",
      isDefault: parsed.isDefault,
      updatedAt: new Date(),
    })
    .where(and(eq(contractTemplates.id, templateId), eq(contractTemplates.workspaceId, workspaceId)))
    .returning();

  return tpl;
}

export async function deleteContractTemplate(templateId: string) {
  const session = await auth.api.getSession({ headers: await headers() });
  const user = requireUser(session?.user);
  const workspaceId = await getWorkspaceId();

  await db
    .delete(contractTemplates)
    .where(and(eq(contractTemplates.id, templateId), eq(contractTemplates.workspaceId, workspaceId)));
}

export async function listContractTemplates() {
  const workspaceId = await getWorkspaceId();

  return db
    .select()
    .from(contractTemplates)
    .where(eq(contractTemplates.workspaceId, workspaceId))
    .orderBy(desc(contractTemplates.updatedAt))
    .limit(100);
}
