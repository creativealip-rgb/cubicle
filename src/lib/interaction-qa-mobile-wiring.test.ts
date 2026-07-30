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

  it("adds a mobile scroll affordance to invoice status filters", () => {
    const source = read("src/app/(app)/app/invoices/page.tsx");
    expect(source).toContain('className="relative -mx-1 overflow-hidden px-1 after:pointer-events-none after:absolute after:inset-y-0 after:right-0 after:w-8 after:bg-gradient-to-l after:from-background after:to-transparent lg:after:hidden"');
    expect(source).toContain('listClassName="max-w-full pr-8 lg:pr-1"');
  });
});
