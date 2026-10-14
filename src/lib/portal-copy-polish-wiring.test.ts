import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
const read=(p:string)=>readFileSync(p,"utf8");
describe("portal copy polish",()=>{
 it("uses canonical billing and localized navigation labels",()=>{const _page=read("src/app/client-portal/[token]/page.tsx");const tabs=read("src/components/portal/portal-tabs.tsx");const accordion=read("src/components/portal/project-accordion.tsx");expect(accordion).toContain('t("Per jam", "Hourly")');expect(tabs).toContain('t("Invoice", "Invoices")');expect(tabs).toContain('t("Permintaan", "Requests")');});
 it("renders secure access as a lock badge and improves empty state",()=>{const page=read("src/app/client-portal/[token]/page.tsx");expect(page).toContain('t("Akses Aman", "Secure Access")');expect(page).toContain('t("Buka portal", "Open portal")');});
 it("keeps meeting request as the only portal request action",()=>{const actions=read("src/components/portal/portal-action-buttons.tsx");expect(actions).toContain('setKind("meeting")');expect(actions).not.toContain('setKind("report")');});
});
