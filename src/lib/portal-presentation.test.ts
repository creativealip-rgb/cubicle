import { describe, expect, it } from "vitest";
import {
  cleanPortalRequestDescription,
  partitionPortalRequests,
  groupByProjectId,
  portalOpenVisit,
  projectProgressLabel,
  summarizeProjectHours,
} from "./portal-presentation";

describe("portal presentation", () => {
  it("hides client-origin metadata but keeps the client message", () => {
    expect(
      cleanPortalRequestDescription(
        "[CLIENT_ORIGIN meeting]\nPreferred date: 2026-07-23\nMohon sore hari",
      ),
    ).toBe("Tanggal pilihan: 23 Jul 2026\nMohon sore hari");
  });

  it("puts open requests before closed history", () => {
    const rows = [
      { id: "done", status: "completed" },
      { id: "open", status: "pending" },
    ];
    expect(partitionPortalRequests(rows)).toEqual({
      open: [rows[1]],
      history: [rows[0]],
    });
  });

  it("groups portal rows by project in one pass", () => {
    const rows = [
      { id: "f1", projectId: "p1" },
      { id: "f2", projectId: "p2" },
      { id: "f3", projectId: "p1" },
    ];
    expect(groupByProjectId(rows).get("p1")).toEqual([rows[0], rows[2]]);
  });

  it("summarizes manual, duration, and running-time entries", () => {
    expect(
      summarizeProjectHours([
        {
          projectId: "p1",
          manualMinutes: 30,
          durationMinutes: 10,
          startTime: null,
          endTime: null,
          billable: true,
        },
        {
          projectId: "p1",
          manualMinutes: null,
          durationMinutes: 15,
          startTime: null,
          endTime: null,
          billable: false,
        },
        {
          projectId: "p2",
          manualMinutes: null,
          durationMinutes: null,
          startTime: new Date("2026-01-01T00:00:00Z"),
          endTime: new Date("2026-01-01T01:00:00Z"),
          billable: true,
        },
      ]),
    ).toEqual(
      new Map([
        ["p1", { totalMinutes: 45, billableMinutes: 30, entryCount: 2 }],
        ["p2", { totalMinutes: 60, billableMinutes: 60, entryCount: 1 }],
      ]),
    );
  });

  it("creates a general portal-open visit without a file resource", () => {
    expect(portalOpenVisit("workspace", "client")).toEqual({
      workspaceId: "workspace",
      clientId: "client",
      resourceType: "portal_open",
      resourceId: "client",
    });
  });

  it("explains a fully completed active project", () => {
    expect(projectProgressLabel("active", 2, 2)).toBe(
      "Semua tugas selesai · menunggu penutupan",
    );
  });
});
