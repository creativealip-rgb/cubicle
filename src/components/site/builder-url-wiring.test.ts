import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("personal site builder URL wiring", () => {
  it("resolves environment-aware URLs on the server and passes plain strings to the client", () => {
    const page = readFileSync("src/app/(app)/app/personal-site/page.tsx", "utf8");
    const client = readFileSync("src/components/site/builder-client.tsx", "utf8");

    expect(page).toContain("publicSiteBaseUrl={personalSitePublicBaseUrl()}");
    expect(page).toContain("previewUrl={personalSitePreviewUrl(site.slug)}");
    expect(client).not.toContain('from "@/lib/personal-site/urls"');
    expect(client).toContain("const publicUrl = `${publicSiteBaseUrl}/${normalizedSlug}`");
  });

  it("tracks the exact submitted payload before accepting a successful save", () => {
    const client = readFileSync("src/components/site/builder-client.tsx", "utf8");

    expect(client).toContain("const submittedSnapshotRef = useRef(JSON.stringify(initialSite))");
    expect(client).toContain("submittedSnapshotRef.current = serialized");
    expect(client).toContain("const submitted = JSON.parse(submittedSnapshotRef.current)");
    expect(client).toContain("if (pending) return");
  });
});
