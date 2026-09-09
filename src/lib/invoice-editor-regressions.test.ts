import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
const read=(p:string)=>readFileSync(p,"utf8");
describe("invoice editor regressions",()=>{
  it("keeps client results open and semantic",()=>{const s=read("src/components/invoices/invoice-create-dialog.tsx"); expect(s).toContain('role="listbox"'); expect(s).toContain('role="option"'); expect(s).not.toContain("PopoverAnchor");});
  it("renders one item action",()=>{const s=read("src/components/invoices/invoice-full-editor.tsx"); expect(s).toContain("{!locked && sourceActions}"); expect(s).not.toContain('t("Tambah Item", "Add Item")');});
  it("supports charge type and manual workflow status",()=>{const s=read("src/components/invoices/invoice-full-editor.tsx"); expect(s).toContain('"admin_fee"'); expect(s).toContain('"none"'); expect(s).toContain("status: form.status");});
});
