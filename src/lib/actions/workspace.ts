"use server";

import { z } from "zod";
import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { workspaces } from "@/db/schema";
import { requireUser, assertWorkspaceOwner, assertWorkspaceWritable } from "@/lib/access";
import { getWorkspaceForCurrentUser } from "@/lib/workspace";
import { writeActivityLog } from "@/lib/actions/activity";

const renameSchema = z.object({
  name: z.string().trim().min(2).max(100),
});

const brandingSchema = z.object({
  billingName: z.string().max(200).optional().or(z.literal("")),
  billingEmail: z.string().email().optional().or(z.literal("")),
  billingPhone: z.string().max(50).optional().or(z.literal("")),
  billingAddress: z.string().max(2000).optional().or(z.literal("")),
  taxId: z.string().max(100).optional().or(z.literal("")),
  logoUrl: z
    .string()
    .url()
    .max(1000)
    .optional()
    .or(z.literal(""))
    .or(z.null()),
  defaultCurrency: z.string().min(3).max(3).optional(),
  defaultTaxRate: z.number().min(0).max(100).optional(),
  defaultHourlyRate: z.number().nonnegative().optional().nullable(),
  defaultInvoiceTerms: z.string().max(5000).optional().or(z.literal("")),
});

export async function updateWorkspaceName(input: z.infer<typeof renameSchema>) {
  const session = await auth.api.getSession({ headers: await headers() });
  const user = requireUser(session?.user);
  const workspaceId = await getWorkspaceForCurrentUser();
  await assertWorkspaceOwner(db, user.id, workspaceId);

  const parsed = renameSchema.parse(input);

  await db
    .update(workspaces)
    .set({
      name: parsed.name,
      updatedAt: new Date(),
    })
    .where(eq(workspaces.id, workspaceId));

  await writeActivityLog(workspaceId, user.id, "updated_workspace_name", "workspace", workspaceId);
  revalidatePath("/app/settings");
  revalidatePath("/app");
  return { ok: true as const, name: parsed.name };
}

export async function updateWorkspaceBranding(input: z.infer<typeof brandingSchema>) {
  const session = await auth.api.getSession({ headers: await headers() });
  const user = requireUser(session?.user);
  const workspaceId = await getWorkspaceForCurrentUser();
  await assertWorkspaceWritable(db, user.id, workspaceId);

  const parsed = brandingSchema.parse(input);

  await db
    .update(workspaces)
    .set({
      billingName: parsed.billingName || null,
      billingEmail: parsed.billingEmail || null,
      billingPhone: parsed.billingPhone || null,
      billingAddress: parsed.billingAddress || null,
      taxId: parsed.taxId || null,
      logoUrl: parsed.logoUrl || null,
      defaultCurrency: parsed.defaultCurrency || undefined,
      defaultTaxRate:
        parsed.defaultTaxRate !== undefined ? String(parsed.defaultTaxRate) : undefined,
      defaultHourlyRate:
        parsed.defaultHourlyRate === undefined
          ? undefined
          : parsed.defaultHourlyRate === null
            ? null
            : String(parsed.defaultHourlyRate),
      defaultInvoiceTerms: parsed.defaultInvoiceTerms || null,
      updatedAt: new Date(),
    })
    .where(eq(workspaces.id, workspaceId));

  await writeActivityLog(workspaceId, user.id, "updated_workspace_branding", "workspace", workspaceId);
  revalidatePath("/app/settings");
  revalidatePath("/app/invoices");
  revalidatePath("/app/packages");
  return { ok: true as const };
}
