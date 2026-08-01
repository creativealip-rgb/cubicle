import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const read = (path: string) => readFileSync(resolve(process.cwd(), path), "utf8");

describe("authenticated interaction mobile polish", () => {
  it("hard-navigates after create and invalidates the client list", () => {
    const form = read("src/components/forms/client-form.tsx");
    const actions = read("src/lib/actions/clients.ts");
    expect(form).toContain("if (redirectTo) window.location.assign(redirectTo);");
    expect(form).not.toContain("router.push(redirectTo)");
    expect(actions).toContain('revalidatePath("/app/clients")');
  });

  it("keeps one mobile-scrollable canonical invoice status row", () => {
    const source = read("src/app/(app)/app/invoices/page.tsx");
    expect(source).not.toContain("InvoiceAreaTabs");
    expect(source).not.toContain("Semua Invoice");
    expect(source).toContain("<StatusFilterTabs");
    expect(source).toContain("activeValue={statusTab}");
  });
});
