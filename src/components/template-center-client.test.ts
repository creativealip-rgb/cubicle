import { describe, expect, it } from "vitest";
import { normalizeTemplateTab } from "./template-center-client";

describe("normalizeTemplateTab", () => {
  it.each(["proposal", "contract"] as const)("accepts mature tab %s", (tab) => {
    expect(normalizeTemplateTab(tab)).toBe(tab);
  });

  it.each([undefined, null, "invoice", "prompt", "email", "questionnaire", "unknown"])(
    "defaults unsupported tab %s to proposal",
    (tab) => expect(normalizeTemplateTab(tab)).toBe("proposal"),
  );
});