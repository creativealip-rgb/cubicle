import { describe, expect, it } from "vitest";
import {
  assertActivitySelection,
  assertSelectableActivity,
  resolveActivityHourlyRate,
} from "@/lib/activity-policy";

describe("activity policy", () => {
  it("allows a required Project timer to start without Activity for instant capture", () => {
    expect(() =>
      assertActivitySelection({
        activityRequired: true,
        activityId: null,
        stage: "start",
      }),
    ).not.toThrow();
  });

  it.each(["completion", "manual", "edit", "approval"] as const)(
    "requires Activity during %s for Projects configured as required",
    (stage) => {
      expect(() =>
        assertActivitySelection({
          activityRequired: true,
          activityId: null,
          stage,
        }),
      ).toThrow("Activity wajib dipilih untuk Project ini");
    },
  );

  it.each(["completion", "manual", "edit", "approval"] as const)(
    "keeps Activity optional during %s when Project does not require it",
    (stage) => {
      expect(() =>
        assertActivitySelection({
          activityRequired: false,
          activityId: null,
          stage,
        }),
      ).not.toThrow();
    },
  );

  it("accepts only active, same-workspace Activities enabled for Project", () => {
    expect(() =>
      assertSelectableActivity({ sameWorkspace: true, status: "active", projectEnabled: true }),
    ).not.toThrow();
    expect(() =>
      assertSelectableActivity({ sameWorkspace: false, status: "active", projectEnabled: true }),
    ).toThrow("Activity tidak berada di workspace aktif");
    expect(() =>
      assertSelectableActivity({ sameWorkspace: true, status: "archived", projectEnabled: true }),
    ).toThrow("Activity sudah diarsipkan");
    expect(() =>
      assertSelectableActivity({ sameWorkspace: true, status: "active", projectEnabled: false }),
    ).toThrow("Activity tidak diaktifkan untuk Project ini");
  });

  it("resolves rate using explicit, Project Activity, Project, Activity, then workspace precedence", () => {
    const base = {
      explicitRate: null,
      projectActivityRate: null,
      projectRate: null,
      activityDefaultRate: null,
      workspaceDefaultRate: 50,
    };
    expect(resolveActivityHourlyRate(base)).toBe(50);
    expect(resolveActivityHourlyRate({ ...base, activityDefaultRate: 75 })).toBe(75);
    expect(resolveActivityHourlyRate({ ...base, activityDefaultRate: 75, projectRate: 100 })).toBe(100);
    expect(
      resolveActivityHourlyRate({
        ...base,
        activityDefaultRate: 75,
        projectRate: 100,
        projectActivityRate: 125,
      }),
    ).toBe(125);
    expect(
      resolveActivityHourlyRate({
        ...base,
        activityDefaultRate: 75,
        projectRate: 100,
        projectActivityRate: 125,
        explicitRate: 150,
      }),
    ).toBe(150);
  });

  it("ignores invalid and negative rate candidates", () => {
    expect(
      resolveActivityHourlyRate({
        explicitRate: Number.NaN,
        projectActivityRate: -1,
        projectRate: 0,
        activityDefaultRate: 80,
        workspaceDefaultRate: 50,
      }),
    ).toBe(80);
  });
});
