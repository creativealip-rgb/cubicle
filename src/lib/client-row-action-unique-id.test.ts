import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const source = readFileSync("src/components/clients/client-row-actions.tsx", "utf8");

describe("client row action trigger IDs", () => {
  it("uses a unique React ID for each responsive instance", () => {
    expect(source).toContain('import { useId, useState } from "react"');
    expect(source).toContain("const editTriggerId = useId()");
    expect(source).not.toContain("`client-edit-${client.id}`");
  });
});
