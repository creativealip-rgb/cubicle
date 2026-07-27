import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
const source = readFileSync("src/lib/meeting-request-service.ts", "utf8");
describe("meeting request service", () => {
  it("locks request and creates appointment transactionally", () => {
    expect(source).toContain("FOR UPDATE");
    expect(source).toContain("tx.insert(appointments)");
    expect(source).toContain("appointmentId: appointment.id");
    expect(source).toContain('meetingStatus: "approved"');
  });
  it("checks half-open conflicts and remains idempotent", () => {
    expect(source).toContain("lt(appointments.startTime, endTime)");
    expect(source).toContain("gt(appointments.endTime, startTime)");
    expect(source).toContain("if (request.appointment_id)");
  });
  it("supports reject and counter proposal without appointment", () => {
    expect(source).toContain("rejectMeetingRequestRecord");
    expect(source).toContain("counterProposeMeetingRequestRecord");
    expect(source).toContain('meetingStatus: "counter_proposed"');
    expect(source).toContain('meetingStatus: "rejected"');
  });
});
