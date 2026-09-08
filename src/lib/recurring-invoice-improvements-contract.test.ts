import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
const ui=readFileSync("src/components/invoices/recurring-invoice-manager.tsx","utf8");
const action=readFileSync("src/lib/actions/recurring-invoices.ts","utf8");
const schema=readFileSync("src/db/schema.ts","utf8");
const migration=readFileSync("drizzle/0094_recurring_invoice_financials.sql","utf8");
const creation=readFileSync("src/lib/invoice-creation.ts","utf8");
describe("recurring invoice improvements",()=>{
 it("persists financial and due-date settings",()=>{for(const s of [schema,migration]) for(const key of ["discount","charge_type","charge_rate","due_days"]) expect(s).toContain(key);expect(creation).toContain("discount?: number");expect(action).toContain("dueDays: z.number()");});
 it("validates merged schedules and currencies",()=>{expect(action).toContain("mergedEndDate");expect(action).toContain("SUPPORTED_CURRENCIES");});
 it("supports searchable dependent pickers and multiple lines",()=>{expect(ui).toContain("clientSearchOpen");expect(ui).toContain("projectSearchOpen");expect(ui).toContain("setLines");expect(ui).toContain('t("Tambah item","Add item")');});
 it("handles stale actions and clear generation copy",()=>{expect(ui).toContain("isStaleServerActionError");expect(ui).toContain('t("Generate jika jatuh tempo","Generate if due")');});
});
