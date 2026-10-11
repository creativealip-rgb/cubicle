import { expect, it } from "vitest";
import { readFileSync } from "node:fs";

const page = readFileSync("src/app/(app)/app/calendar/page.tsx", "utf8");

it("keeps booking slug in the page header and availability in the left column", () => {
  const header = page.indexOf("actions={");
  const widget = page.indexOf("<BookingSlugHeaderWidget");
  const gridStart = page.indexOf('<div className="grid grid-cols-1 gap-6 lg:grid-cols-3');
  const settings = page.indexOf("<BookingSettingsPanel");
  const appointments = page.indexOf("{/* Appointments List Panel with Status Tabs */}");
  // Slug control is surfaced through the page header action, not the settings column.
  expect(widget).toBeGreaterThan(-1);
  expect(header).toBeLessThan(widget);
  expect(widget).toBeLessThan(gridStart);
  // Left column keeps the working-hours/availability panel before appointments.
  expect(settings).toBeGreaterThan(gridStart);
  expect(settings).toBeLessThan(appointments);
  expect(page).not.toContain("<BookingSlugForm");
});
