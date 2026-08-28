import { expect, it } from "vitest";
import { readFileSync } from "node:fs";

const page = readFileSync("src/app/(app)/app/calendar/page.tsx", "utf8");

it("places booking slug directly above availability rules in the left column", () => {
  const slug = page.indexOf("<BookingSlugForm");
  const rules = page.indexOf("{/* Availability Rules */}");
  const upcoming = page.indexOf("{/* Upcoming Appointments */}");
  expect(slug).toBeGreaterThan(page.indexOf('className="space-y-4 lg:col-span-1"'));
  expect(slug).toBeLessThan(rules);
  expect(rules).toBeLessThan(upcoming);
  expect(page.slice(0, page.indexOf('<div className="grid grid-cols-1 gap-6 lg:grid-cols-3">'))).not.toContain("<BookingSlugForm");
});
