import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const schema = readFileSync("src/db/schema.ts", "utf8");
const migration = readFileSync("drizzle/0045_meeting_request_workflow.sql", "utf8");

describe("meeting request workflow schema", () => {
  it("adds structured meeting negotiation fields", () => {
    expect(schema).toContain('meetingStartTime: timestamp("meeting_start_time", { withTimezone: true })');
    expect(schema).toContain('meetingDurationMinutes: integer("meeting_duration_minutes")');
    expect(schema).toContain('meetingTimezone: text("meeting_timezone")');
    expect(schema).toContain('enum: ["requested", "counter_proposed", "approved", "rejected"]');
    expect(schema).toContain('meetingProposedByUserId: text("meeting_proposed_by_user_id")');
    expect(schema).toContain('appointmentId: uuid("appointment_id")');
  });

  it("tracks Google sync independently per calendar target", () => {
    expect(schema).toContain('export const appointmentCalendarSyncs = pgTable(');
    expect(schema).toContain('enum: ["user", "client"]');
    expect(schema).toContain('enum: ["pending", "synced", "failed", "skipped"]');
    expect(schema).toContain('unique().on(table.appointmentId, table.targetType, table.provider)');
  });

  it("ships a non-destructive migration with constraints and indexes", () => {
    expect(migration).toContain('ADD COLUMN IF NOT EXISTS "meeting_start_time" timestamp with time zone');
    expect(migration).toContain('ADD COLUMN IF NOT EXISTS "appointment_id" uuid');
    expect(migration).toContain('CREATE TABLE IF NOT EXISTS "appointment_calendar_syncs"');
    expect(migration).toContain('portal_requests_meeting_status_check');
    expect(migration).toContain('portal_requests_appointment_id_unique');
    expect(migration).not.toMatch(/DROP TABLE|DROP COLUMN/);
  });
});
