import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const read = (path: string) => readFileSync(join(process.cwd(), path), "utf8");

/** Extract a single exported function's body from the actions file. */
function actionBody(name: string): string {
  const actions = read("src/lib/actions/invoices.ts");
  const start = actions.indexOf(`export async function ${name}`);
  if (start === -1) throw new Error(`function ${name} not found`);
  const nextExport = actions.indexOf("\nexport async function", start + 1);
  const end = nextExport === -1 ? actions.length : nextExport;
  return actions.slice(start, end);
}

describe("paid invoice void flow", () => {
  it("exposes a voidInvoice action that requires a reason", () => {
    const actions = read("src/lib/actions/invoices.ts");

    expect(actions).toContain("export async function voidInvoice");
    expect(actions).toContain("reason: z.string().trim().min(1, \"Alasan wajib diisi\").max(1000)");
  });

  it("validates workspace and user like other invoice actions", () => {
    const body = actionBody("voidInvoice");

    expect(body).toContain("assertWorkspaceWritable(db, user.id, workspaceId)");
    expect(body).toContain("assertInvoiceInWorkspace(parsed.invoiceId, workspaceId)");
    expect(body).toContain("requireUser(session?.user)");
  });

  it("only allows voiding paid or partially paid invoices", () => {
    const body = actionBody("voidInvoice");

    expect(body).toContain("Hanya invoice yang sudah dibayar atau sebagian dibayar yang bisa dibatalkan");
    expect(body).toContain("[\"cancelled\", \"archived\"].includes(inv.status)");
    expect(body).toContain("coalesce(sum(${payments.amount}), '0')");
  });

  it("keeps payment rows and does not delete anything on void", () => {
    const body = actionBody("voidInvoice");

    // Void must not delete payments, items, or the invoice itself.
    expect(body).not.toContain("tx.delete(payments)");
    expect(body).not.toContain("tx.delete(invoiceItems)");
    expect(body).not.toContain("tx.delete(invoices)");
    // Payment rows remain: only status is flipped to cancelled.
    expect(body).toContain(".set({ status: \"cancelled\", updatedAt: new Date() })");
  });

  it("writes an audit log entry with the void reason", () => {
    const body = actionBody("voidInvoice");

    expect(body).toContain("writeActivityLog(workspaceId, user.id, \"voided_invoice\", \"invoice\", parsed.invoiceId, {");
    expect(body).toContain("reason: parsed.reason,");
  });

  it("keeps delete disabled for paid invoices", () => {
    const actions = read("src/lib/actions/invoices.ts");

    expect(actions).toContain("Hanya invoice draf atau dibatalkan yang bisa dihapus");
    expect(actions).toContain("if (![\"draft\", \"cancelled\"].includes(inv.status))");
  });

  it("wires the void button into the invoice detail header with correct gating", () => {
    const page = read("src/app/(app)/app/invoices/[invoiceId]/page.tsx");

    expect(page).toContain("import { VoidInvoiceButton } from \"./void-invoice-button\";");
    expect(page).toContain("<VoidInvoiceButton");
    expect(page).toContain("disabled={!voidable}");
    // Fully-paid cancelled invoices must still show "Dibatalkan", not "Lunas".
    expect(page).toContain("[\"cancelled\", \"archived\"].includes(inv.status)");
  });

  it("shows a required-reason dialog in the void button", () => {
    const button = read("src/app/(app)/app/invoices/[invoiceId]/void-invoice-button.tsx");

    expect(button).toContain("voidInvoice({ invoiceId, reason: reason.trim() })");
    expect(button).toContain("Alasan wajib diisi");
    expect(button).toContain('t("Alasan pembatalan *", "Void reason *")');
    expect(button).toContain("disabled={!reason.trim()}");
    expect(button).toContain("import { voidInvoice } from \"@/lib/actions/invoices\";");
  });
});
