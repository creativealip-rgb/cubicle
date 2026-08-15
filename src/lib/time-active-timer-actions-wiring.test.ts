import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const read = (path: string) => readFileSync(join(process.cwd(), path), "utf8");

describe("active timer actions wiring", () => {
  it("keeps Start Timer on the Time page, restores browser-tab timer, and removes navbar timer control", () => {
    const route = read("src/components/time/time-route-content.tsx");
    const topbar = read("src/components/app-topbar.tsx");

    expect(route).toContain("<NewTimerDialog");
    expect(route).not.toContain("!activeTimer && <NewTimerDialog");
    expect(topbar).toContain("/api/time/active");
    expect(topbar).toContain("document.title = `⏱️ [${formatElapsed(activeTimer.startTime)}] ${baseTitle}`");
    expect(topbar).not.toContain("handleStopTimer");
    expect(topbar).not.toContain("<DropdownMenuTrigger asChild>\n                  <Button\n                    variant={isPaused ? \"secondary\" : \"destructive\"}");
  });
});
