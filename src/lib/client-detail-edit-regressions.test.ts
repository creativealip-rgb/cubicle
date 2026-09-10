import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const overview = readFileSync("src/components/clients/client-overview.tsx", "utf8");
const projectOverview = readFileSync("src/components/projects/project-overview.tsx", "utf8");
const form = readFileSync("src/components/forms/client-form.tsx", "utf8");
const actions = readFileSync("src/lib/actions/clients.ts", "utf8");

describe("client detail edit regressions", () => {
  it("keeps detail content away from action dividers", () => {
    expect(overview).toContain('className="mt-3 space-y-2 pb-3 text-sm"');
    expect(projectOverview).toContain('className="space-y-3 pb-4 text-sm"');
  });

  it("does not resubmit unchanged portal state during contact-only edits", () => {
    expect(form).toContain('portalSlug: form.portalSlug || undefined,\n        ...(form.portalSlug !== (defaultValues?.portalSlug ?? "")');
  });

  it("revalidates client list and detail after update", () => {
    expect(actions).toContain('revalidatePath("/app/clients");\n    revalidatePath(`/app/clients/${clientId}`);');
  });
});
