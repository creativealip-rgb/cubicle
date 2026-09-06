import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

describe("productivity next goal step UX", () => {
  const source = readFileSync(
    resolve(process.cwd(), "src/components/productivity/unified-today-action-card.tsx"),
    "utf8",
  );

  it("explains that selecting a goal changes the shown next step", () => {
    expect(source).toContain("Pilih tujuan untuk melihat dan menyelesaikan langkah berikutnya.");
    expect(source).toContain("Select a goal to view and complete its next step.");
  });

  it("labels the goal selector and names the completion action clearly", () => {
    expect(source).toContain('aria-label={t("Pilih tujuan", "Select goal")}');
    expect(source).toContain('t("Selesaikan Langkah", "Complete Step")');
  });
});
