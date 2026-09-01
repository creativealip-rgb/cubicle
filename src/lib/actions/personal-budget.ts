"use server";
import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { and, eq, gte, lte, sql } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { personalBudgets, personalTransactions } from "@/db/schema";
import { auth } from "@/lib/auth";
import { requireUser } from "@/lib/access";
import {
  assertIsoCurrency,
  summarizeBudget,
} from "@/lib/personal-productivity/money";
import { budgetTargets } from "@/lib/personal-productivity/budget";

async function userId() {
  const session = await auth.api.getSession({ headers: await headers() });
  return requireUser(session?.user).id;
}
const input = z.object({
  month: z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/),
  monthlyIncome: z.string().regex(/^\d+(\.\d{1,2})?$/),
  currency: z.string(),
  needsPercent: z.string(),
  wantsPercent: z.string(),
  savingsPercent: z.string(),
});
function monthStart(value: string) {
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(value)) throw new Error("Invalid month");
  return `${value}-01`;
}
export async function setPersonalBudgetEnabled(
  month: string,
  currency: string,
  enabled: boolean,
) {
  const id = await userId();
  const normalizedMonth = monthStart(month);
  const [row] = await db
    .update(personalBudgets)
    .set({ enabled, updatedAt: new Date() })
    .where(
      and(
        eq(personalBudgets.userId, id),
        eq(personalBudgets.month, normalizedMonth),
        eq(personalBudgets.currency, assertIsoCurrency(currency)),
      ),
    )
    .returning();
  if (!row) throw new Error("Budget not found");
  revalidatePath("/app/expenses");
  return row;
}

export async function upsertPersonalBudget(raw: z.input<typeof input>) {
  const id = await userId(),
    v = input.parse(raw),
    currency = assertIsoCurrency(v.currency),
    month = monthStart(v.month);
  if (Number(v.monthlyIncome) <= 0) throw new Error("Income must be positive");
  budgetTargets(
    v.monthlyIncome,
    v.needsPercent,
    v.wantsPercent,
    v.savingsPercent,
  );
  const [row] = await db
    .insert(personalBudgets)
    .values({
      userId: id,
      month,
      income: v.monthlyIncome,
      currency,
      needsPct: v.needsPercent,
      wantsPct: v.wantsPercent,
      savingsPct: v.savingsPercent,
    })
    .onConflictDoUpdate({
      target: [
        personalBudgets.userId,
        personalBudgets.month,
        personalBudgets.currency,
      ],
      set: {
        income: v.monthlyIncome,
        needsPct: v.needsPercent,
        wantsPct: v.wantsPercent,
        savingsPct: v.savingsPercent,
        updatedAt: new Date(),
      },
    })
    .returning();
  revalidatePath("/app/expenses");
  return row;
}
export async function getPersonalBudget(
  month: string,
  selectedCurrency?: string,
) {
  const id = await userId();
  const normalizedMonth = monthStart(month);
  const budgets = await db
    .select()
    .from(personalBudgets)
    .where(
      and(
        eq(personalBudgets.userId, id),
        eq(personalBudgets.month, normalizedMonth),
      ),
    );
  const currency = selectedCurrency
    ? assertIsoCurrency(selectedCurrency)
    : budgets[0]?.currency;
  const budget = budgets.find((row) => row.currency === currency);
  const start = normalizedMonth,
    [year, number] = month.split("-").map(Number),
    end = `${month}-${String(new Date(year, number, 0).getDate()).padStart(2, "0")}`;
  const transactions = await db
    .select({
      type: personalTransactions.transactionType,
      bucket: personalTransactions.budgetBucket,
      amount: personalTransactions.amount,
      currency: personalTransactions.currency,
    })
    .from(personalTransactions)
    .where(
      and(
        eq(personalTransactions.userId, id),
        gte(personalTransactions.date, start),
        lte(personalTransactions.date, end),
      ),
    );
  const sameCurrency = budget
    ? transactions.filter((row) => row.currency === budget.currency)
    : [];
  return {
    budget,
    currencies: [
      ...new Set([
        ...budgets.map((row) => row.currency),
        ...transactions.map((row) => row.currency),
      ]),
    ].sort(),
    actual: summarizeBudget(
      sameCurrency.map((row) => ({
        type: row.type as "expense" | "allocation",
        bucket: row.bucket as "needs" | "wants" | "savings" | "unbudgeted",
        amount: row.amount,
      })),
    ),
    excludedCurrencies: [
      ...new Set(
        transactions
          .filter((row) => budget && row.currency !== budget.currency)
          .map((row) => row.currency),
      ),
    ],
  };
}
export async function copyPreviousPersonalBudget(
  targetMonth: string,
  currency: string,
  replace = false,
) {
  const id = await userId(),
    target = monthStart(targetMonth),
    code = assertIsoCurrency(currency);
  return db.transaction(async (tx) => {
    await tx.execute(
      sql`select pg_advisory_xact_lock(hashtext(${id}), hashtext(${`${target}:${code}`}))`,
    );
    const [existing] = await tx
      .select({ id: personalBudgets.id })
      .from(personalBudgets)
      .where(
        and(
          eq(personalBudgets.userId, id),
          eq(personalBudgets.month, target),
          eq(personalBudgets.currency, code),
        ),
      );
    if (existing && !replace)
      return { created: false, replaced: false, requiresConfirmation: true };
    const date = new Date(`${target}T12:00:00Z`);
    date.setUTCMonth(date.getUTCMonth() - 1);
    const previous = `${date.toISOString().slice(0, 7)}-01`;
    const [source] = await tx
      .select()
      .from(personalBudgets)
      .where(
        and(
          eq(personalBudgets.userId, id),
          eq(personalBudgets.month, previous),
          eq(personalBudgets.currency, code),
        ),
      );
    if (!source) throw new Error("Previous budget not found");
    await tx
      .insert(personalBudgets)
      .values({
        userId: id,
        month: target,
        currency: code,
        income: source.income,
        needsPct: source.needsPct,
        wantsPct: source.wantsPct,
        savingsPct: source.savingsPct,
        enabled: source.enabled,
      })
      .onConflictDoUpdate({
        target: [
          personalBudgets.userId,
          personalBudgets.month,
          personalBudgets.currency,
        ],
        set: {
          income: source.income,
          needsPct: source.needsPct,
          wantsPct: source.wantsPct,
          savingsPct: source.savingsPct,
          enabled: source.enabled,
          updatedAt: new Date(),
        },
      });
    revalidatePath("/app/expenses");
    return {
      created: !existing,
      replaced: Boolean(existing),
      requiresConfirmation: false,
    };
  });
}
