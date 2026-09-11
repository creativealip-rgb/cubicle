import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const source = readFileSync("src/components/forms/client-form.tsx", "utf8");

describe("client create refresh contract", () => {
  it("refreshes stay-on-page create flows before callback", () => {
    expect(source).toContain("if (stayOnPage) router.refresh();");
    expect(source.indexOf("if (stayOnPage) router.refresh();")).toBeLessThan(
      source.indexOf("onSuccess?.(result.client.id, result.client.name)")
    );
  });
});
