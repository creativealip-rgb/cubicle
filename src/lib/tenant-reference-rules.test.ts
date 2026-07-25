import { describe, expect, it } from "vitest";
import {
  assertClientReference,
  assertProjectReference,
  assertWorkspaceUserReference,
  assertWritableRole,
} from "./tenant-reference-rules";

describe("tenant reference rules", () => {
  it("rejects a client from another workspace", () => {
    expect(() => assertClientReference({ id: "client-b", workspaceId: "ws-b" }, "ws-a"))
      .toThrow("Client access denied");
  });

  it("accepts a client from current workspace", () => {
    expect(() => assertClientReference({ id: "client-a", workspaceId: "ws-a" }, "ws-a"))
      .not.toThrow();
  });

  it("rejects a project from another workspace", () => {
    expect(() => assertProjectReference({ id: "project-b", workspaceId: "ws-b", clientId: "client-b" }, { workspaceId: "ws-a" }))
      .toThrow("Project access denied");
  });

  it("rejects project-client mismatch in same workspace", () => {
    expect(() => assertProjectReference({ id: "project-a", workspaceId: "ws-a", clientId: "client-b" }, { workspaceId: "ws-a", clientId: "client-a" }))
      .toThrow("Project does not belong to client");
  });

  it("accepts matching project and client", () => {
    expect(() => assertProjectReference({ id: "project-a", workspaceId: "ws-a", clientId: "client-a" }, { workspaceId: "ws-a", clientId: "client-a" }))
      .not.toThrow();
  });

  it("rejects assignee who is not a workspace member", () => {
    expect(() => assertWorkspaceUserReference(null, "user-b"))
      .toThrow("Assignee access denied");
  });

  it("accepts null assignee and current workspace member", () => {
    expect(() => assertWorkspaceUserReference(null, null)).not.toThrow();
    expect(() => assertWorkspaceUserReference({ userId: "user-a" }, "user-a")).not.toThrow();
  });

  it("allows owner and member mutations", () => {
    expect(() => assertWritableRole("owner")).not.toThrow();
    expect(() => assertWritableRole("member")).not.toThrow();
  });

  it("rejects viewer mutations", () => {
    expect(() => assertWritableRole("viewer")).toThrow("Read-only role cannot mutate workspace data");
  });
});
