"use server";

import { headers } from "next/headers";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { requireUser } from "@/lib/access";
import { db } from "@/db";
import { users, workspaces } from "@/db/schema";
import { createWorkspaceForUser } from "@/lib/workspace";
import { writeActivityLog } from "@/lib/actions/activity";

const onboardingSchema = z.object({
  // Page 1: Personal profile
  name: z.string().trim().min(1, "Nama wajib diisi").max(100).optional(),
  birthDate: z.string().trim().optional().nullish(),
  country: z.string().trim().min(1, "Negara wajib dipilih").optional(),
  city: z.string().trim().min(1, "Kota wajib diisi").optional(),
  source: z.enum(["website", "instagram", "tiktok", "google", "youtube", "friend", "other"]).optional(),
  sourceOther: z.string().trim().max(120).optional(),

  // Page 2: Business & scaling
  businessName: z.string().trim().min(1, "Nama bisnis wajib diisi").max(80).optional(),
  workspaceName: z.string().trim().max(80).optional(),
  industry: z.string().trim().optional(),
  plan: z.enum(["free", "solo", "team", "enterprise"]).optional(),
  teamSize: z.string().trim().optional(),
});

export async function finishOnboarding(input: z.infer<typeof onboardingSchema>) {
  const session = await auth.api.getSession({ headers: await headers() });
  const user = requireUser(session?.user);
  const parsed = onboardingSchema.parse(input);

  // 1. Update user profile data
  await db
    .update(users)
    .set({
      name: parsed.name,
      birthDate: parsed.birthDate ? String(parsed.birthDate).slice(0, 10) : null,
      country: parsed.country,
      city: parsed.city,
      updatedAt: new Date(),
    })
    .where(eq(users.id, user.id));

  // 2. Create workspace with customized business name, industry, and team size
  const workspace = await createWorkspaceForUser(user.id, parsed.businessName);
  const workspaceId = workspace.id;

  await db
    .update(workspaces)
    .set({
      industry: parsed.industry,
      teamSize: parsed.teamSize,
      updatedAt: new Date(),
    })
    .where(eq(workspaces.id, workspaceId));

  // 3. Log activity
  await writeActivityLog(workspaceId, user.id, "completed_onboarding", "workspace", workspaceId, {
    workspaceName: parsed.businessName,
    industry: parsed.industry,
    teamSize: parsed.teamSize,
    plan: parsed.plan,
    source: parsed.source,
    sourceOther: parsed.sourceOther,
    country: parsed.country,
    city: parsed.city,
  });

  return {
    success: true,
    workspace,
    plan: parsed.plan,
    redirectTo:
      parsed.plan === "free"
        ? "/app/settings?tab=account"
        : `/app/billing?plan=${parsed.plan}&checkout=auto`,
  };
}
