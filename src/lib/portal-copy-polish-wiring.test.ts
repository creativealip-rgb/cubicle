import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
const read=(p:string)=>readFileSync(p,"utf8");
describe("portal copy polish",()=>{
 it("uses canonical billing and localized navigation labels",()=>{const page=read("src/app/client-portal/[token]/page.tsx");const tabs=read("src/components/portal/portal-tabs.tsx");expect(page).toContain('t("Fixed Price", "Fixed Price")');expect(page).toContain('t("Hourly", "Hourly")');expect(page).toContain('t("Retainer", "Retainer")');expect(page).toContain('t("Invoice", "Invoice")');expect(tabs).toContain('t("Permintaan", "Requests")');});
 it("renders secure access as a lock badge and improves empty state",()=>{const page=read("src/app/client-portal/[token]/page.tsx");expect(page).toContain("LockKeyhole");expect(page).toContain("Hubungi pengelola workspace");});
 it("makes meeting primary and report secondary",()=>{const actions=read("src/components/portal/portal-action-buttons.tsx");expect(actions).toContain('variant="outline"');expect(actions).toContain('onClick={() => setKind("meeting")}');expect(actions).toContain('className="min-h-11 gap-2 rounded-lg px-4"');});
});
