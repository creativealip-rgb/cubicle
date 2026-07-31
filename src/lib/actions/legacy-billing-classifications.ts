"use server";

import { db } from "@/db";
import { legacyProjectBillingClassifications, projects } from "@/db/schema";
import { assertWorkspaceWritable } from "@/lib/access";
import { auth } from "@/lib/auth";
import { writeActivityLog } from "@/lib/actions/activity";
import { applyLegacyBillingClassification } from "@/lib/legacy-billing-cutover";
import { getWorkspaceForCurrentUser } from "@/lib/workspace";
import { and, eq } from "drizzle-orm";
import { headers } from "next/headers";
import { z } from "zod";

const classificationInputSchema = z.object({
  projectId: z.string().uuid(),
  targetBillingModel: z.enum(["fixed_price", "retainer"]),
  confidence: z.enum(["automatic", "manual", "blocked"]).default("manual"),
  evidence: z.record(z.string(), z.unknown()).default({}),
  notes: z.string().optional(),
});

const cutoverInputSchema = z.object({ projectId: z.string().uuid() });

async function requireWritableWorkspace() {
  const session = await auth.api.getSession({ headers: await headers() });
  const user = session?.user;
  if (!user) throw new Error("Unauthorized");
  const workspaceId = await getWorkspaceForCurrentUser();
  await assertWorkspaceWritable(db, user.id, workspaceId);
  return { user, workspaceId };
}

export async function reviewLegacyBillingClassification(input: z.infer<typeof classificationInputSchema>) {
  const { user, workspaceId } = await requireWritableWorkspace();
  const parsed = classificationInputSchema.parse(input);

  const [project] = await db.select({ id: projects.id, billingModel: projects.billingModel, billingType: projects.billingType }).from(projects).where(and(eq(projects.id, parsed.projectId), eq(projects.workspaceId, workspaceId), eq(projects.billingModel, "legacy_package"))).limit(1);
  if (!project) throw new Error("Project Paket legacy tidak ditemukan");

  const [classification] = await db.insert(legacyProjectBillingClassifications).values({
    projectId: parsed.projectId,
    workspaceId,
    legacyBillingType: project.billingType,
    targetBillingModel: parsed.targetBillingModel,
    confidence: parsed.confidence,
    evidence: parsed.evidence,
    reviewedBy: user.id,
    reviewedAt: new Date(),
    notes: parsed.notes ?? null,
  }).onConflictDoUpdate({
    target: legacyProjectBillingClassifications.projectId,
    set: {
      targetBillingModel: parsed.targetBillingModel,
      confidence: parsed.confidence,
      evidence: parsed.evidence,
      reviewedBy: user.id,
      reviewedAt: new Date(),
      notes: parsed.notes ?? null,
    },
  }).returning();

  await writeActivityLog(workspaceId, user.id, "reviewed_legacy_billing_classification", "project", parsed.projectId);
  return classification;
}

export async function applyLegacyBillingCutover(input: z.infer<typeof cutoverInputSchema>) {
  const { user, workspaceId } = await requireWritableWorkspace();
  const parsed = cutoverInputSchema.parse(input);

  const updated = await db.transaction(async (tx) => {
    const [classification] = await tx.select().from(legacyProjectBillingClassifications).where(and(legacyProjectBillingClassifications.workspaceId, eq(legacyProjectBillingClassifications.workspaceId, workspaceId), eq(legacyProjectBillingClassifications.projectId, parsed.projectId))).for("update").limit(1);
    if (!classification) throw new Error("Klasifikasi Project legacy belum ada");

    const cutover = applyLegacyBillingClassification(classification);
    const [project] = await tx.update(projects).set({
      billingModel: cutover.billingModel,
      billingType: "package",
      updatedAt: new Date(),
    }).where(and(eq(projects.id, parsed.projectId), eq(projects.workspaceId, workspaceId), eq(projects.billingModel, "legacy_package"))).returning();
    if (!project) throw new Error("Project legacy tidak ditemukan atau sudah cutover");
    return { ...project, cutover };
  });

  await writeActivityLog(workspaceId, user.id, "applied_legacy_billing_cutover", "project", parsed.projectId);
  return updated;
}
