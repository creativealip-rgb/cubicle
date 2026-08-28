import { expect, it } from "vitest";
import { readFileSync } from "node:fs";

it("handles booking slug collisions without throwing from a Server Action", () => {
  const action = readFileSync("src/lib/actions/workspace.ts", "utf8");
  const form = readFileSync("src/components/settings/booking-slug-form.tsx", "utf8");
  expect(action).toContain('return { error: "booking_slug_taken" } as const');
  expect(form).toContain('if ("error" in result)');
  expect(form).toContain("Booking slug is already used by another workspace");
});
