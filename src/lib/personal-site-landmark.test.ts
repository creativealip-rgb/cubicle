import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const source = readFileSync("src/components/site/canvas/canvas-editor.tsx", "utf8");

describe("personal site landmarks", () => {
  it("does not nest a second main landmark inside the app shell", () => {
    expect(source).not.toContain('<main className="flex-1 overflow-y-auto overflow-x-hidden');
    expect(source).toContain('<div className="flex-1 overflow-y-auto overflow-x-hidden');
  });
});
