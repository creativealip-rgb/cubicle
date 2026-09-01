"use server";
import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { and, desc, eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import {
  personalTransactionCategories,
  personalTransactions,
} from "@/db/schema";
import { auth } from "@/lib/auth";
import { requireUser } from "@/lib/access";
import { assertIsoCurrency } from "@/lib/personal-productivity/money";
import {
  deleteStoredFile,
  getSignedDownloadUrl,
  getSignedUploadUrl,
} from "@/lib/r2";

async function userId() {
  const session = await auth.api.getSession({ headers: await headers() });
  return requireUser(session?.user).id;
}
function refresh() {
  revalidatePath("/app/expenses");
}
const categoryInput = z.object({
  name: z.string().trim().min(1).max(100),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/),
  icon: z.string().max(50).nullable().optional(),
  defaultBucket: z.enum(["needs", "wants", "savings", "unbudgeted"]),
});
const transactionInput = z
  .object({
    categoryId: z.string().uuid().nullable().optional(),
    transactionType: z.enum(["expense", "allocation"]),
    budgetBucket: z.enum(["needs", "wants", "savings", "unbudgeted"]),
    amount: z.string().regex(/^\d+(\.\d{1,2})?$/),
    currency: z.string(),
    date: z.string().date(),
    description: z.string().trim().min(1).max(500),
    merchant: z.string().trim().max(200).nullable().optional(),
  })
  .superRefine((v, c) => {
    if (v.transactionType === "allocation" && v.budgetBucket !== "savings")
      c.addIssue({ code: "custom", message: "Allocations must use savings" });
    if (v.transactionType === "expense" && v.budgetBucket === "savings")
      c.addIssue({ code: "custom", message: "Expenses cannot use savings" });
  });
export async function listPersonalTransactionCategories() {
  const id = await userId();
  return db
    .select()
    .from(personalTransactionCategories)
    .where(eq(personalTransactionCategories.userId, id))
    .orderBy(personalTransactionCategories.name);
}
export async function createPersonalTransactionCategory(
  raw: z.input<typeof categoryInput>,
) {
  const id = await userId(),
    v = categoryInput.parse(raw);
  const [row] = await db
    .insert(personalTransactionCategories)
    .values({ ...v, userId: id })
    .returning();
  refresh();
  return row;
}
export async function updatePersonalTransactionCategory(
  categoryId: string,
  raw: z.input<typeof categoryInput>,
) {
  const id = await userId(),
    v = categoryInput.parse(raw);
  const [row] = await db
    .update(personalTransactionCategories)
    .set({ ...v, updatedAt: new Date() })
    .where(
      and(
        eq(personalTransactionCategories.id, categoryId),
        eq(personalTransactionCategories.userId, id),
      ),
    )
    .returning();
  if (!row) throw new Error("Category not found");
  refresh();
  return row;
}

export async function deletePersonalTransactionCategory(categoryId: string) {
  const id = await userId();
  return db.transaction(async (tx) => {
    const [category] = await tx
      .select()
      .from(personalTransactionCategories)
      .where(
        and(
          eq(personalTransactionCategories.id, categoryId),
          eq(personalTransactionCategories.userId, id),
        ),
      )
      .for("update");
    if (!category) throw new Error("Category not found");
    await tx
      .update(personalTransactions)
      .set({ categoryId: null, updatedAt: new Date() })
      .where(
        and(
          eq(personalTransactions.categoryId, categoryId),
          eq(personalTransactions.userId, id),
        ),
      );
    await tx
      .delete(personalTransactionCategories)
      .where(
        and(
          eq(personalTransactionCategories.id, categoryId),
          eq(personalTransactionCategories.userId, id),
        ),
      );
    refresh();
    return { ok: true };
  });
}
export async function listPersonalTransactions() {
  const id = await userId();
  return db
    .select()
    .from(personalTransactions)
    .where(eq(personalTransactions.userId, id))
    .orderBy(
      desc(personalTransactions.date),
      desc(personalTransactions.createdAt),
      desc(personalTransactions.id),
    );
}
export async function createPersonalTransaction(
  raw: z.input<typeof transactionInput>,
) {
  const id = await userId(),
    v = transactionInput.parse(raw),
    currency = assertIsoCurrency(v.currency);
  if (v.categoryId) {
    const [category] = await db
      .select()
      .from(personalTransactionCategories)
      .where(
        and(
          eq(personalTransactionCategories.id, v.categoryId),
          eq(personalTransactionCategories.userId, id),
        ),
      );
    if (!category) throw new Error("Category not found");
  }
  const [row] = await db
    .insert(personalTransactions)
    .values({ ...v, userId: id, currency })
    .returning();
  refresh();
  return row;
}
export async function updatePersonalTransaction(
  transactionId: string,
  raw: z.input<typeof transactionInput>,
) {
  const id = await userId(),
    v = transactionInput.parse(raw),
    currency = assertIsoCurrency(v.currency);
  if (v.categoryId) {
    const [category] = await db
      .select()
      .from(personalTransactionCategories)
      .where(
        and(
          eq(personalTransactionCategories.id, v.categoryId),
          eq(personalTransactionCategories.userId, id),
        ),
      );
    if (!category) throw new Error("Category not found");
  }
  const [row] = await db
    .update(personalTransactions)
    .set({ ...v, currency, updatedAt: new Date() })
    .where(
      and(
        eq(personalTransactions.id, transactionId),
        eq(personalTransactions.userId, id),
      ),
    )
    .returning();
  if (!row) throw new Error("Transaction not found");
  refresh();
  return row;
}

export async function deletePersonalTransaction(transactionId: string) {
  const id = await userId();
  const [row] = await db
    .delete(personalTransactions)
    .where(
      and(
        eq(personalTransactions.id, transactionId),
        eq(personalTransactions.userId, id),
      ),
    )
    .returning();
  if (!row) throw new Error("Transaction not found");
  if (row.receiptKey) await deleteStoredFile(row.receiptKey);
  refresh();
  return { ok: true };
}
const receiptTypes = {
  "application/pdf": "pdf",
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
} as const;
export async function createPersonalReceiptUpload(
  transactionId: string,
  input: {
    mime: string;
    size: number;
    checksum: string;
    filename: string;
    magic: string;
  },
) {
  const id = await userId();
  const expectedExtension =
    receiptTypes[input.mime as keyof typeof receiptTypes];
  const extension = input.filename.toLowerCase().split(".").pop();
  const magicValid =
    input.mime === "application/pdf"
      ? input.magic.startsWith("25504446")
      : input.mime === "image/jpeg"
        ? input.magic.startsWith("ffd8ff")
        : input.mime === "image/png"
          ? input.magic.startsWith("89504e470d0a1a0a")
          : input.mime === "image/webp"
            ? input.magic.startsWith("52494646") &&
              input.magic.slice(16, 24) === "57454250"
            : false;
  if (
    !(input.mime in receiptTypes) ||
    input.size <= 0 ||
    input.size > 10 * 1024 * 1024 ||
    !input.checksum ||
    !magicValid ||
    !(
      extension === expectedExtension ||
      (expectedExtension === "jpg" && extension === "jpeg")
    )
  )
    throw new Error("Invalid receipt");
  const [row] = await db
    .select()
    .from(personalTransactions)
    .where(
      and(
        eq(personalTransactions.id, transactionId),
        eq(personalTransactions.userId, id),
      ),
    );
  if (!row) throw new Error("Transaction not found");
  const ext = receiptTypes[input.mime as keyof typeof receiptTypes],
    key = `personal/${id}/receipts/${transactionId}/${crypto.randomUUID()}.${ext}`;
  return { key, url: await getSignedUploadUrl(key, input.mime, 300) };
}
export async function confirmPersonalReceipt(
  transactionId: string,
  input: { key: string; mime: string; size: number; checksum: string },
) {
  const id = await userId(),
    prefix = `personal/${id}/receipts/${transactionId}/`;
  if (!input.key.startsWith(prefix)) throw new Error("Invalid receipt key");
  const [existing] = await db
    .select()
    .from(personalTransactions)
    .where(
      and(
        eq(personalTransactions.id, transactionId),
        eq(personalTransactions.userId, id),
      ),
    );
  if (!existing) throw new Error("Transaction not found");
  const [row] = await db
    .update(personalTransactions)
    .set({
      receiptKey: input.key,
      receiptMime: input.mime,
      receiptSizeBytes: input.size,
      receiptChecksum: input.checksum,
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(personalTransactions.id, transactionId),
        eq(personalTransactions.userId, id),
      ),
    )
    .returning();
  if (existing.receiptKey && existing.receiptKey !== input.key)
    await deleteStoredFile(existing.receiptKey);
  refresh();
  return row;
}
export async function deletePersonalReceipt(transactionId: string) {
  const id = await userId();
  const [row] = await db
    .select()
    .from(personalTransactions)
    .where(
      and(
        eq(personalTransactions.id, transactionId),
        eq(personalTransactions.userId, id),
      ),
    );
  if (!row) throw new Error("Transaction not found");
  if (row.receiptKey) await deleteStoredFile(row.receiptKey);
  const [updated] = await db
    .update(personalTransactions)
    .set({
      receiptKey: null,
      receiptMime: null,
      receiptSizeBytes: null,
      receiptChecksum: null,
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(personalTransactions.id, transactionId),
        eq(personalTransactions.userId, id),
      ),
    )
    .returning();
  refresh();
  return updated;
}

export async function abandonPersonalReceiptUpload(
  transactionId: string,
  key: string,
) {
  const id = await userId(),
    prefix = `personal/${id}/receipts/${transactionId}/`;
  if (!key.startsWith(prefix)) throw new Error("Invalid receipt key");
  const [row] = await db
    .select({ id: personalTransactions.id })
    .from(personalTransactions)
    .where(
      and(
        eq(personalTransactions.id, transactionId),
        eq(personalTransactions.userId, id),
      ),
    );
  if (!row) throw new Error("Transaction not found");
  await deleteStoredFile(key);
  return { ok: true };
}

export async function getPersonalReceiptDownloadUrl(transactionId: string) {
  const id = await userId();
  const [row] = await db
    .select()
    .from(personalTransactions)
    .where(
      and(
        eq(personalTransactions.id, transactionId),
        eq(personalTransactions.userId, id),
      ),
    );
  if (!row?.receiptKey) return null;
  if (!row.receiptKey.startsWith(`personal/${id}/receipts/${transactionId}/`))
    throw new Error("Invalid receipt key");
  return getSignedDownloadUrl(row.receiptKey, 300);
}
