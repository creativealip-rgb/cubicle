import { assertSupportedBillingModel, type BillingModel } from "@/lib/billing-model";

export type TaskWorkMode = "workflow" | "reusable";
export type TaskLifecycle = "active" | "archived";
export type ProjectTaskModePolicy = "billing_default" | "workflow" | "reusable" | "mixed";

export type WorkflowTaskDefaults = {
  mode: "workflow";
  status: "todo";
  priority: "medium";
  lifecycle: "active";
};

export type ReusableTaskDefaults = {
  mode: "reusable";
  lifecycle: "active";
};

export type ProjectTaskDefaults = WorkflowTaskDefaults | ReusableTaskDefaults;

function assertTaskWorkMode(mode: string): asserts mode is TaskWorkMode {
  if (mode !== "workflow" && mode !== "reusable") {
    throw new Error("Mode task tidak didukung");
  }
}

export function defaultTaskWorkMode(model: BillingModel): TaskWorkMode {
  assertSupportedBillingModel(model);
  return model === "fixed_price" ? "workflow" : "reusable";
}

export function resolveTaskWorkMode(model: BillingModel, override?: TaskWorkMode): TaskWorkMode {
  assertSupportedBillingModel(model);
  if (override !== undefined) {
    assertTaskWorkMode(override);
    return override;
  }
  return defaultTaskWorkMode(model);
}

export function resolveProjectTaskMode(
  policy: ProjectTaskModePolicy,
  model: BillingModel,
  explicitMode?: TaskWorkMode,
): TaskWorkMode | undefined {
  assertSupportedBillingModel(model);
  if (explicitMode !== undefined) assertTaskWorkMode(explicitMode);

  if (policy === "billing_default") return resolveTaskWorkMode(model, explicitMode);
  if (policy === "workflow" || policy === "reusable") {
    if (explicitMode !== undefined && explicitMode !== policy) {
      throw new Error("Mode task eksplisit bertentangan dengan kebijakan Project");
    }
    return policy;
  }
  if (policy === "mixed") {
    if (explicitMode === undefined) {
      throw new Error("Kebijakan mixed memerlukan mode task eksplisit");
    }
    return explicitMode;
  }
  throw new Error("Kebijakan mode task Project tidak didukung");
}

export function projectTaskDefaults(mode: TaskWorkMode): ProjectTaskDefaults {
  assertTaskWorkMode(mode);
  if (mode === "workflow") {
    return { mode, status: "todo", priority: "medium", lifecycle: "active" };
  }
  return { mode, lifecycle: "active" };
}
