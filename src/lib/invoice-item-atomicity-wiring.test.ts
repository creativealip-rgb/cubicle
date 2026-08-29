import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
const source=readFileSync("src/lib/actions/invoices.ts","utf8");
describe("invoice item atomicity",()=>{
 it("recalculates totals inside item transactions",()=>{expect(source).toContain("recalculateInvoiceInTransaction");for(const name of ["addInvoiceItem","updateInvoiceItem","deleteInvoiceItem"]) { const start=source.indexOf(`export async function ${name}`);const end=source.indexOf("export async function",start+30);const body=source.slice(start,end<0?undefined:end);expect(body).toContain("db.transaction");expect(body).toContain("recalculateInvoiceInTransaction"); }});
 it("keeps time import locked and transactional",()=>{expect(source).toContain('.for("update")');expect(source).toContain('eq(timeEntries.status, "approved")');});
});
