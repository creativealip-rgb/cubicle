import { describe, expect, it } from "vitest";
import { readFileSync } from "fs";
import { resolve } from "path";

describe("calendar and public booking page wiring", () => {
  it("uses 'Booking Page' button in calendar page header", () => {
    const calendarPage = readFileSync(
      resolve(__dirname, "../app/(app)/app/calendar/page.tsx"),
      "utf8",
    );
    expect(calendarPage).toContain('<span>{t("Booking Page", "Booking Page")}</span>');
  });

  it("uses PublicBookingForm client component so date apply preserves typed form data", () => {
    const bookingPage = readFileSync(
      resolve(__dirname, "../app/booking/[slug]/page.tsx"),
      "utf8",
    );
    expect(bookingPage).toContain("PublicBookingForm");
    expect(bookingPage).not.toContain('form="dateForm"');

    const bookingForm = readFileSync(
      resolve(__dirname, "../components/calendar/public-booking-form.tsx"),
      "utf8",
    );
    expect(bookingForm).toContain("handleApplyDate");
    expect(bookingForm).toContain("getAvailableSlots");
  });
});
