import { describe, expect, it } from "vitest";
import { normalizeAssistantMarkdown } from "./markdown";

describe("normalizeAssistantMarkdown", () => {
  it("separates concatenated bullets and repairs missing bullet spacing", () => {
    expect(
      normalizeAssistantMarkdown(
        "**Revenue**\n*IDR 12,000,000\n* Fixed Rate: Task 2* Fixed Rate: Task 3",
      ),
    ).toBe(
      "**Revenue**\n* IDR 12,000,000\n* Fixed Rate: Task 2\n* Fixed Rate: Task 3",
    );
  });
});
