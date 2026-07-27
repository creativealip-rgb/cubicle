import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const read = (file: string) => fs.readFileSync(path.join(root, file), "utf8");

describe("AI Assistant security wiring", () => {
  it("scopes conversation message reads to workspace and user", () => {
    const route = read("src/app/api/ai/conversations/route.ts");
    const store = read("src/lib/ai/conv-store.ts");

    expect(route).toContain("listMessages(id, wsId, session.user.id)");
    expect(store).toContain("eq(aiConversations.workspaceId, workspaceId)");
    expect(store).toContain("eq(aiConversations.userId, userId)");
  });

  it("keeps invoice reminder confirmation as a draft and never sends email", () => {
    const route = read("src/app/api/ai/action/route.ts");

    expect(route).not.toContain("sendNotification(");
    expect(route).toContain("draft: {");
    expect(route).toContain('action: "ai.invoice_reminder_draft_confirmed"');
  });

  it("records task mutations and prevents no-op replay writes", () => {
    const route = read("src/app/api/ai/action/route.ts");

    expect(route).toContain("ne(tasks.status, p.newStatus)");
    expect(route).toContain('action: "ai.task_status_updated"');
  });

  it("does not return raw server errors to clients", () => {
    const route = read("src/app/api/ai/action/route.ts");

    expect(route).not.toContain("err.message");
    expect(route).toContain('error: "Action could not be completed"');
  });
});
