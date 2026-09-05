import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";

const read = (file: string) => fs.readFileSync(path.join(process.cwd(), file), "utf8");

describe("AI action safety wiring", () => {
  it("does not silently substitute unrelated clients or projects", () => {
    const tools = read("src/lib/ai/tools.ts");
    expect(tools).not.toContain("const [firstClient]");
    expect(tools).not.toContain("const [firstProj]");
    expect(tools).toContain("Client not found:");
    expect(tools).toContain("Project not found:");
  });

  it("keeps confirmation conversation id and rejects malformed message tails", () => {
    const route = read("src/app/api/ai/chat/route.ts");
    expect(route).toContain('conversationId: conversationId');
    expect(route).not.toContain("const fallbackUser");
  });

  it("validates create action foreign keys inside current workspace", () => {
    const route = read("src/app/api/ai/action/route.ts");
    expect(route).toContain("assertClientInWorkspace");
    expect(route).toContain("assertProjectInWorkspace");
    expect(route).toContain("assertTaskInWorkspace");
  });

  it("does not label cancellation as successful completion", () => {
    const panel = read("src/components/ai/chat-panel.tsx");
    expect(panel).toContain('confirmationStatus: "cancelled"');
  });

  it("persists and reads message confirmation lifecycle statuses", () => {
    const schema = read("src/db/schema.ts");
    const store = read("src/lib/ai/conv-store.ts");
    const action = read("src/app/api/ai/action/route.ts");
    const convRoute = read("src/app/api/ai/conversations/route.ts");
    const chatPanel = read("src/components/ai/chat-panel.tsx");

    expect(schema).toContain('confirmationStatus: text("confirmation_status"');
    expect(store).toContain("updateMessageConfirmationStatus");
    expect(action).toContain("updateMessageConfirmationStatus");
    expect(convRoute).toContain("confirmationStatus");
    expect(chatPanel).toContain('m.confirmationStatus ?? "pending"');
  });
});
