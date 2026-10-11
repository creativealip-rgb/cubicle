import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const read = (path: string) => readFileSync(path, "utf8");

describe("document publish security regressions", () => {
  it("does not expose or sign draft contracts", () => {
    const actions = read("src/lib/actions/contracts.ts");
    expect(actions).toContain('if (c.status === "draft") return { error: "not_sent" as const };');
    expect(actions).toContain('allowedStatuses: ["sent", "viewed", "signed"]');
    expect(actions).not.toContain('allowedStatuses: ["draft", "sent", "viewed", "signed"]');
  });

  it("handles clipboard rejection and still gives user feedback", () => {
    const publish = read("src/components/public/unified-publish-view.tsx");
    expect(publish).toContain("async function copyShareUrl");
    expect(publish).toContain("document.execCommand(\"copy\")");
    expect(publish).toContain("toast.error");
  });

  it("enforces form expiry and response limit at the write boundary", () => {
    const actions = read("src/lib/actions/questionnaires.ts");
    expect(actions).toContain(".for(\"update\")");
    expect(actions).toContain("qMaster.expiresAt <= new Date()");
    expect(actions).toContain("count >= qMaster.maxResponses");
  });

  it("binds document settings labels to controls", () => {
    const editor = read("src/components/documents/document-block-editor.tsx");
    for (const id of [
      "document-title", "document-client-name", "document-client-email",
      "document-company-name", "document-valid-until", "document-contract-number",
      "proposal-tax-rate", "proposal-down-payment", "document-custom-slug",
    ]) {
      expect(editor).toContain(`htmlFor=\"${id}\"`);
      expect(editor).toContain(`id=\"${id}\"`);
    }
  });
});
