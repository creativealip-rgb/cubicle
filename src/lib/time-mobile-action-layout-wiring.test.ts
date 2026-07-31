import { describe, expect, it } from "vitest";
import fs from "node:fs";

const read = (path: string) => fs.readFileSync(path, "utf8");

describe("Waktu mobile action layout", () => {
  it("uses a balanced two-column mobile action grid with full-width final action", () => {
    const source = read("src/components/time/waktu-navigation.tsx");
    expect(source).toContain("grid w-full grid-cols-2");
    expect(source).toContain("[&>*:last-child]:col-span-2");
    expect(source).toContain("sm:flex sm:w-auto");
  });

  it("keeps all three mobile actions at least 44px tall and full-width", () => {
    const manual = read("src/components/time/add-time-log-dialog.tsx");
    const timer = read("src/components/time/new-timer-dialog.tsx");
    const pdf = read("src/components/time/pdf-export-button.tsx");
    for (const source of [manual, timer, pdf]) {
      expect(source).toContain("h-11 w-full");
      expect(source).toContain("sm:h-");
      expect(source).toContain("sm:w-auto");
    }
  });
});
