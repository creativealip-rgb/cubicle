import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const read = (file: string) => fs.readFileSync(path.join(root, file), "utf8");

describe("contract number duplicate handling", () => {
  it("returns a typed result and keeps the create dialog open with localized feedback", () => {
    const action = read("src/lib/actions/contracts.ts");
    const form = read("src/components/contracts/create-contract-button.tsx");
    expect(action).toContain('return { error: "contract_number_taken" } as const');
    expect(form).toContain('if ("error" in c)');
    expect(form).toContain('Contract number already exists in this workspace');
    expect(form.indexOf('if ("error" in c)')).toBeLessThan(form.indexOf("setOpen(false)"));
    expect(action).not.toContain("Contract number must use format CONT-YYYY-####");
    expect(action).toContain("Contract number must be printable text and at most 100 characters");
  });
});
