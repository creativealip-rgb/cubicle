import { describe, expect, it } from "vitest";
import {
  defaultTaskWorkMode,
  projectTaskDefaults,
  resolveProjectTaskMode,
  resolveTaskWorkMode,
  type TaskWorkMode,
} from "@/lib/task-work-mode";

describe("task work mode policy", () => {
  it("defaults fixed-price work to workflow and hourly/retainer work to reusable", () => {
    expect(defaultTaskWorkMode("fixed_price")).toBe("workflow");
    expect(defaultTaskWorkMode("hourly")).toBe("reusable");
    expect(defaultTaskWorkMode("retainer")).toBe("reusable");
  });

  it("rejects legacy-package writes before accepting an explicit valid override", () => {
    expect(() => resolveTaskWorkMode("legacy_package", "workflow")).toThrow(
      "Project Paket legacy harus diklasifikasikan sebelum menerima perubahan baru",
    );
  });

  it("accepts a valid explicit override after validating the billing model", () => {
    expect(resolveTaskWorkMode("fixed_price", "reusable")).toBe("reusable");
    expect(resolveTaskWorkMode("hourly", "workflow")).toBe("workflow");
  });

  it("supports every canonical project policy across billing transitions", () => {
    expect(resolveProjectTaskMode("billing_default", "fixed_price")).toBe("workflow");
    expect(resolveProjectTaskMode("billing_default", "hourly")).toBe("reusable");
    expect(resolveProjectTaskMode("billing_default", "retainer")).toBe("reusable");
    expect(resolveProjectTaskMode("workflow", "retainer")).toBe("workflow");
    expect(resolveProjectTaskMode("reusable", "fixed_price")).toBe("reusable");
    expect(resolveProjectTaskMode("mixed", "hourly", "workflow")).toBe("workflow");
  });

  it("rejects explicit modes that conflict with workflow or reusable policy", () => {
    expect(() => resolveProjectTaskMode("workflow", "hourly", "reusable")).toThrow(
      "Mode task eksplisit bertentangan dengan kebijakan Project",
    );
    expect(() => resolveProjectTaskMode("reusable", "fixed_price", "workflow")).toThrow(
      "Mode task eksplisit bertentangan dengan kebijakan Project",
    );
    expect(resolveProjectTaskMode("workflow", "hourly", "workflow")).toBe("workflow");
  });

  it("requires an explicit mode for mixed policy", () => {
    expect(() => resolveProjectTaskMode("mixed", "fixed_price")).toThrow(
      "Kebijakan mixed memerlukan mode task eksplisit",
    );
  });

  it("billing_default permits an explicit override", () => {
    expect(resolveProjectTaskMode("billing_default", "fixed_price", "reusable")).toBe("reusable");
  });

  it("resolves future mode after billing transition without mutating stored historical task", () => {
    const historical: { id: string; mode: TaskWorkMode; status: string } = {
      id: "task-existing",
      mode: "workflow",
      status: "done",
    };
    const snapshot = { ...historical };

    const futureMode = resolveProjectTaskMode("billing_default", "retainer");

    expect(futureMode).toBe("reusable");
    expect(historical).toEqual(snapshot);
    expect(historical.mode).toBe("workflow");
  });

  it("returns mode-specific defaults without fake reusable workflow fields", () => {
    expect(projectTaskDefaults("workflow")).toEqual({
      mode: "workflow",
      status: "todo",
      priority: "medium",
      lifecycle: "active",
    });
    expect(projectTaskDefaults("reusable")).toEqual({ mode: "reusable", lifecycle: "active" });
  });
});
