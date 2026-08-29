import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
const source = readFileSync("src/lib/actions/invoices.ts", "utf8");
const body = (name: string, next: string) => source.slice(source.indexOf(`export async function ${name}`), source.indexOf(next, source.indexOf(`export async function ${name}`)));

describe("invoice hardening", () => {
  it("validates updated client and project in active workspace", () => {
    const fn = body("updateInvoice", "type InvoiceTx");
    expect(fn).toContain("clients.workspaceId");
    expect(fn).toContain("projects.workspaceId");
    expect(fn).toContain("Proyek tidak sesuai dengan klien invoice");
  });
  it("serializes mark-paid state and synthetic payment", () => {
    const fn = body("updateInvoice", "type InvoiceTx");
    expect(fn).toContain("db.transaction");
    expect(fn).toContain('.for("update")');
    expect(fn).toContain("tx.insert(payments)");
  });
  it("serializes payment remaining validation", () => {
    const fn = body("recordPayment", "// ─── Send");
    expect(fn).toContain("db.transaction");
    expect(fn).toContain('.for("update")');
    expect(fn).toContain("tx.insert(payments)");
  });
  it("re-checks payments after locking during void", () => {
    const fn = body("voidInvoice", "export async function recalculateInvoice");
    expect(fn.indexOf('.for("update")')).toBeLessThan(fn.indexOf("sum(${payments.amount})"));
  });
});
