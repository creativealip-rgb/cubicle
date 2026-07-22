"use server";

import { z } from "zod";
import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { and, eq } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { workspaceCurrencyRates, workspaces } from "@/db/schema";
import { requireUser, assertWorkspaceMember, assertWorkspaceWritable } from "@/lib/access";
import { getWorkspaceForCurrentUser } from "@/lib/workspace";
import { writeActivityLog } from "@/lib/actions/activity";
import { normalizeCurrency } from "@/lib/currency-base";

const rateSchema = z.object({
  fromCurrency: z
    .string()
    .trim()
    .min(3)
    .max(3)
    .transform((v) => v.toUpperCase())
    .refine((v) => /^[A-Z]{3}$/.test(v), "Currency harus 3 huruf (USD, EUR, …)"),
  rate: z.number().positive().max(1_000_000_000),
});

const deleteSchema = z.object({
  fromCurrency: z
    .string()
    .trim()
    .min(3)
    .max(3)
    .transform((v) => v.toUpperCase()),
});

export async function listWorkspaceCurrencyRates() {
  const session = await auth.api.getSession({ headers: await headers() });
  const user = requireUser(session?.user);
  const workspaceId = await getWorkspaceForCurrentUser();
  await assertWorkspaceMember(db, user.id, workspaceId);

  const [workspace] = await db
    .select({ defaultCurrency: workspaces.defaultCurrency })
    .from(workspaces)
    .where(eq(workspaces.id, workspaceId))
    .limit(1);

  const rates = await db
    .select({
      id: workspaceCurrencyRates.id,
      fromCurrency: workspaceCurrencyRates.fromCurrency,
      rate: workspaceCurrencyRates.rate,
      updatedAt: workspaceCurrencyRates.updatedAt,
    })
    .from(workspaceCurrencyRates)
    .where(eq(workspaceCurrencyRates.workspaceId, workspaceId))
    .orderBy(workspaceCurrencyRates.fromCurrency);

  return {
    baseCurrency: workspace?.defaultCurrency || "IDR",
    rates: rates.map((r) => ({
      id: r.id,
      fromCurrency: r.fromCurrency,
      rate: Number(r.rate),
      updatedAt: r.updatedAt,
    })),
  };
}

/** Upsert: 1 fromCurrency = rate × base currency. */
export async function upsertWorkspaceCurrencyRate(input: z.infer<typeof rateSchema>) {
  const session = await auth.api.getSession({ headers: await headers() });
  const user = requireUser(session?.user);
  const workspaceId = await getWorkspaceForCurrentUser();
  await assertWorkspaceWritable(db, user.id, workspaceId);

  const parsed = rateSchema.parse(input);
  const fromCurrency = normalizeCurrency(parsed.fromCurrency);

  const [workspace] = await db
    .select({ defaultCurrency: workspaces.defaultCurrency })
    .from(workspaces)
    .where(eq(workspaces.id, workspaceId))
    .limit(1);

  const base = normalizeCurrency(workspace?.defaultCurrency || "IDR");
  if (fromCurrency === base) {
    throw new Error(`Tidak perlu rate untuk base currency ${base}`);
  }

  const [existing] = await db
    .select({ id: workspaceCurrencyRates.id })
    .from(workspaceCurrencyRates)
    .where(
      and(
        eq(workspaceCurrencyRates.workspaceId, workspaceId),
        eq(workspaceCurrencyRates.fromCurrency, fromCurrency),
      ),
    )
    .limit(1);

  const now = new Date();
  if (existing) {
    await db
      .update(workspaceCurrencyRates)
      .set({
        rate: String(parsed.rate),
        updatedAt: now,
      })
      .where(eq(workspaceCurrencyRates.id, existing.id));
  } else {
    await db.insert(workspaceCurrencyRates).values({
      workspaceId,
      fromCurrency,
      rate: String(parsed.rate),
      createdAt: now,
      updatedAt: now,
    });
  }

  await writeActivityLog(
    workspaceId,
    user.id,
    "updated_currency_rate",
    "workspace",
    workspaceId,
  );
  revalidatePath("/app/settings");
  revalidatePath("/app/dashboard");
  revalidatePath("/app/reports");
  revalidatePath("/app/expenses");
  revalidatePath("/app/invoices");
  revalidatePath("/app/packages");
  return { ok: true as const, fromCurrency, rate: parsed.rate, baseCurrency: base };
}

export async function deleteWorkspaceCurrencyRate(input: z.infer<typeof deleteSchema>) {
  const session = await auth.api.getSession({ headers: await headers() });
  const user = requireUser(session?.user);
  const workspaceId = await getWorkspaceForCurrentUser();
  await assertWorkspaceWritable(db, user.id, workspaceId);

  const parsed = deleteSchema.parse(input);
  const fromCurrency = normalizeCurrency(parsed.fromCurrency);

  await db
    .delete(workspaceCurrencyRates)
    .where(
      and(
        eq(workspaceCurrencyRates.workspaceId, workspaceId),
        eq(workspaceCurrencyRates.fromCurrency, fromCurrency),
      ),
    );

  await writeActivityLog(
    workspaceId,
    user.id,
    "deleted_currency_rate",
    "workspace",
    workspaceId,
  );
  revalidatePath("/app/settings");
  revalidatePath("/app/dashboard");
  revalidatePath("/app/reports");
  revalidatePath("/app/expenses");
  revalidatePath("/app/invoices");
  revalidatePath("/app/packages");
  return { ok: true as const };
}

const approxToggleSchema = z.object({
  enabled: z.boolean(),
});

/** Toggle secondary ≈ base-currency display under list rows (invoice/expense/package). */
export async function updateShowBaseCurrencyApprox(
  input: z.infer<typeof approxToggleSchema>,
) {
  const session = await auth.api.getSession({ headers: await headers() });
  const user = requireUser(session?.user);
  const workspaceId = await getWorkspaceForCurrentUser();
  await assertWorkspaceWritable(db, user.id, workspaceId);

  const parsed = approxToggleSchema.parse(input);
  await db
    .update(workspaces)
    .set({
      showBaseCurrencyApprox: parsed.enabled,
      updatedAt: new Date(),
    })
    .where(eq(workspaces.id, workspaceId));

  await writeActivityLog(
    workspaceId,
    user.id,
    "updated_show_base_currency_approx",
    "workspace",
    workspaceId,
  );
  revalidatePath("/app/settings");
  revalidatePath("/app/dashboard");
  revalidatePath("/app/reports");
  revalidatePath("/app/expenses");
  revalidatePath("/app/invoices");
  revalidatePath("/app/packages");
  return { ok: true as const, enabled: parsed.enabled };
}
