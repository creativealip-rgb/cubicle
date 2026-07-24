import { describe, expect, it } from "vitest";
import { assertFolderScopeMatches, formatFileDate } from "@/lib/file-manager-rules";

describe("assertFolderScopeMatches", () => {
  it("accepts parent with same client and project scope", () => {
    expect(() =>
      assertFolderScopeMatches(
        { clientId: "client-1", projectId: "project-1" },
        { clientId: "client-1", projectId: "project-1" },
      ),
    ).not.toThrow();
  });

  it("rejects parent from different scope", () => {
    expect(() =>
      assertFolderScopeMatches(
        { clientId: "client-1", projectId: null },
        { clientId: "client-2", projectId: null },
      ),
    ).toThrow("Folder induk harus berada dalam lingkup klien dan proyek yang sama");
  });
});

describe("formatFileDate", () => {
  it("uses Indonesian locale when app language is Indonesian", () => {
    expect(formatFileDate("2026-07-24T00:00:00.000Z", "id", "UTC")).toBe("24 Jul 2026");
  });

  it("uses English locale when app language is English", () => {
    expect(formatFileDate("2026-07-24T00:00:00.000Z", "en", "UTC")).toBe("Jul 24, 2026");
  });
});
