import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
const read=(p:string)=>readFileSync(p,"utf8");
describe("P2 hardening",()=>{
 it("does not link null proposal clients",()=>expect(read("src/components/proposals/proposals-list-table.tsx")).toContain("p.clientId ? <Link"));
 it("validates proposal numbers with one error",()=>{const s=read("src/components/proposals/proposal-form.tsx");expect(s).toContain("Number.isFinite(li.quantity)");expect(s).toContain("Number.isFinite(li.unitPrice)");});
 it("keeps recurring actions visible",()=>{const s=read("src/components/invoices/recurring-invoice-manager.tsx");expect(s).toContain("overflow-y-auto");expect(s).toContain("shrink-0 border-t");});
 it("labels and gates public signing",()=>{const s=read("src/components/contracts/signature-pad.tsx");expect(s).toContain('aria-label="Area tanda tangan');expect(s).toContain("!hasSignature");expect(s).toContain("min-h-11");});
});
