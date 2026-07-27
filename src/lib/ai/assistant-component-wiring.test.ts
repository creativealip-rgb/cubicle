import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";
const read = (file: string) => fs.readFileSync(path.join(process.cwd(), file), "utf8");

describe("full-page Assistant wiring", () => {
  it("uses localized registries and extracted full-page components", () => {
    const panel = read("src/components/ai/chat-panel.tsx");
    expect(panel).toContain("useT()");
    expect(panel).toContain("AssistantEmptyState");
    expect(panel).toContain("AssistantHistory");
    expect(panel).toContain("humanizeToolStatus");
    expect(panel).toContain("sanitizeAssistantError");
  });
  it("prefills primary quick actions instead of sending immediately", () => {
    const empty = read("src/components/ai/assistant-empty-state.tsx");
    expect(empty).toContain("primaryAssistantActions");
    expect(empty).toContain("setInput(prompt)");
    expect(empty).not.toContain("send(prompt)");
  });
  it("history requires custom delete confirmation and row loading", () => {
    const history = read("src/components/ai/assistant-history.tsx");
    expect(history).toContain("deleteTarget");
    expect(history).toContain("deletingId");
    expect(history).not.toContain("window.confirm");
  });
  it("invoice confirmation never claims to send", () => {
    const card = read("src/components/ai/assistant-confirmation.tsx");
    expect(card).toContain("copyDraft");
    expect(card).toContain("confirmDraft");
    expect(card).not.toMatch(/Send email|Kirim email/);
  });
});
