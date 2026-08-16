import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const read = (path: string) => readFileSync(path, "utf8");

describe("meeting revision wiring", () => {
  it("uses active as the default project tab and removes All", () => {
    const page = read("src/app/(app)/app/projects/page.tsx");
    expect(page).not.toContain('"all",\n  "active"');
    expect(page).toContain('return "active";');
  });

  it("removes portal overview and defaults to projects", () => {
    const tabs = read("src/components/portal/portal-tabs.tsx");
    expect(tabs).not.toContain('"overview"');
    expect(tabs).toContain('return "projects";');
  });

  it("removes invoice timesheet import UI", () => {
    const form = read("src/components/forms/invoice-form.tsx");
    expect(form).not.toContain("Import timesheet");
    expect(form).not.toContain("selectedTimeIds");
  });

  it("adds article generation with ready-to-use cards and raw JSON prompt view", () => {
    const catalog = read("src/lib/prompts/catalog.ts");
    const result = read("src/components/prompts/prompt-result.tsx");
    expect(catalog).toContain('"article"');
    // Cards view surfaces readyOutput as per-item copyable cards
    expect(result).toContain("result.readyOutput.map");
    expect(result).toContain('view?: "cards" | "prompt"');
    // Prompt view renders the full result as raw JSON (with a copy button)
    expect(result).toContain("JSON.stringify(result, null, 2)");
    expect(result).toContain('view === "prompt"');
  });

  it("shows generation quota instead of spend", () => {
    const studio = read("src/components/prompts/prompt-studio.tsx");
    expect(studio).toContain("generationLimit");
    expect(studio).not.toContain("usage.totalCost.toFixed");
  });

  it("keeps personal page at ten items and uses Todoist compact rows", () => {
    const action = read("src/lib/actions/personal-notes.ts");
    const page = read("src/app/(app)/app/personal/page.tsx");
    const list = read("src/components/notes/notes-list-client.tsx");
    expect(action).toContain("const NOTES_PAGE_SIZE = 10");
    expect(page).toContain("<StatusFilterTabs");
    expect(page).toContain('data-ui="notes-todoist-compact"');
    expect(page).toContain('data-ui="notes-split-view"');
    expect(page).toContain("lg:grid-cols-[minmax(0,400px)_minmax(0,1fr)]");
    expect(list).toContain('data-ui="todoist-note-list"');
    expect(list).not.toContain("IntersectionObserver");
  });

  it("keeps Journal separate with compact timeline rows", () => {
    const page = read("src/app/(app)/app/journal/page.tsx");
    const list = read("src/components/journal/journal-list.tsx");
    expect(page).toContain('data-ui="journal-compact-timeline"');
    expect(page).toContain('data-ui="journal-split-view"');
    expect(page).toContain("lg:grid-cols-[400px_minmax(0,1fr)]");
    expect(list).toContain('data-ui="journal-timeline-list"');
    expect(page).toContain("const pageSize = 10");
    expect(list).not.toContain("todoist-note-list");
  });

  it("keeps dashboard to fixed top reminder cards", () => {
    const page = read("src/app/(app)/app/dashboard/page.tsx");
    expect(page).not.toContain('label: t("Klien Aktif", "Active Clients")');
    expect(page).not.toContain('{t("Kerja", "Work")}');
    expect(page).toContain('key: "active-projects"');
    expect(page).toContain('key: "tasks-due"');
    expect(page).toContain('key: "note-reminders"');
    expect(page).toContain('key: "invoice-due"');
    expect(page).toContain('key: "approval"');
    expect(page).toContain("xl:grid-cols-[minmax(0,1fr)_400px]");
  });
});
