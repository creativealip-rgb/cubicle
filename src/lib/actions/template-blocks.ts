"use server";

import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { db } from "@/db";
import { contractTemplates, proposalTemplates } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { requireUser, assertWorkspaceWritable } from "@/lib/access";
import { getWorkspaceForCurrentUser } from "@/lib/workspace";
import { isSameOriginMediaSrc, normalizeDocumentBlocks } from "@/lib/document-blocks";
import { z } from "zod";

const blockSaveSchema = z.object({
  contentBlocks: z.unknown(),
});

/**
 * Save contract template editor blocks. Unlike live documents, templates have
 * no content revision (no concurrent autosave races), so this is a plain
 * workspace-scoped update — no compare-and-swap. Blocks are still normalized
 * server-side so untrusted client payloads cannot smuggle unsafe structures
 * into storage.
 */
export async function saveContractTemplateBlocks(
  templateId: string,
  input: z.infer<typeof blockSaveSchema>,
) {
  const session = await auth.api.getSession({ headers: await headers() });
  const user = requireUser(session?.user);
  const workspaceId = await getWorkspaceForCurrentUser();
  await assertWorkspaceWritable(db, user.id, workspaceId);

  const parsed = blockSaveSchema.parse(input);
  const blocks = normalizeDocumentBlocks(parsed.contentBlocks, "contract");

  const [existing] = await db
    .select({ id: contractTemplates.id })
    .from(contractTemplates)
    .where(
      and(
        eq(contractTemplates.id, templateId),
        eq(contractTemplates.workspaceId, workspaceId),
      ),
    )
    .limit(1);
  if (!existing) throw new Error("Template tidak ditemukan");

  const [updated] = await db
    .update(contractTemplates)
    .set({ contentBlocks: blocks, updatedAt: new Date() })
    .where(
      and(
        eq(contractTemplates.id, templateId),
        eq(contractTemplates.workspaceId, workspaceId),
      ),
    )
    .returning();

  revalidatePath("/app/templates");
  revalidatePath("/app/contract-templates");
  revalidatePath(`/app/contract-templates/${templateId}`);
  revalidatePath(`/app/templates/${templateId}/edit`);
  return updated;
}

/**
 * Proposal counterpart of `saveContractTemplateBlocks` — same workspace-scoped
 * guard, same server-side block normalization, no CAS.
 */
export async function saveProposalTemplateBlocks(
  templateId: string,
  input: z.infer<typeof blockSaveSchema>,
) {
  const session = await auth.api.getSession({ headers: await headers() });
  const user = requireUser(session?.user);
  const workspaceId = await getWorkspaceForCurrentUser();
  await assertWorkspaceWritable(db, user.id, workspaceId);

  const parsed = blockSaveSchema.parse(input);
  const blocks = normalizeDocumentBlocks(parsed.contentBlocks, "proposal");
  for (const block of blocks) {
    if (block.type === "image" && block.src && !isSameOriginMediaSrc(block.src)) {
      // Media blocks must reference files uploaded through the workspace
      // upload proxy; external URLs would bypass upload validation/quota.
      throw new Error("Gambar hanya bisa dari file workspace");
    }
  }

  const [existing] = await db
    .select({ id: proposalTemplates.id })
    .from(proposalTemplates)
    .where(
      and(
        eq(proposalTemplates.id, templateId),
        eq(proposalTemplates.workspaceId, workspaceId),
      ),
    )
    .limit(1);
  if (!existing) throw new Error("Template tidak ditemukan");

  const [updated] = await db
    .update(proposalTemplates)
    .set({ contentBlocks: blocks, updatedAt: new Date() })
    .where(
      and(
        eq(proposalTemplates.id, templateId),
        eq(proposalTemplates.workspaceId, workspaceId),
      ),
    )
    .returning();

  revalidatePath("/app/templates");
  revalidatePath("/app/proposals");
  revalidatePath("/app/proposals/new");
  revalidatePath(`/app/templates/${templateId}/edit`);
  return updated;
}
