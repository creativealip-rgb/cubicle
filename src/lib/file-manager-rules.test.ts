import { describe, expect, it } from "vitest";
import {
  addExpandedClient,
  assertFolderScopeMatches,
  formatFileDate,
  getFolderDeleteBlocker,
  toggleExpandedClient,
} from "@/lib/file-manager-rules";

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

describe("expanded clients", () => {
  it("adds active client without closing clients already expanded", () => {
    expect(addExpandedClient(new Set(["client-1"]), "client-2")).toEqual(
      new Set(["client-1", "client-2"]),
    );
  });

  it("toggles only selected client", () => {
    expect(toggleExpandedClient(new Set(["client-1", "client-2"]), "client-1")).toEqual(
      new Set(["client-2"]),
    );
  });
});

describe("getFolderDeleteBlocker", () => {
  it("returns subfolder message before file message", () => {
    expect(getFolderDeleteBlocker({ hasChildFolder: true, hasChildFile: true })).toBe(
      "Folder masih punya sub-folder. Kosongkan dulu.",
    );
  });

  it("returns file message when folder contains a file", () => {
    expect(getFolderDeleteBlocker({ hasChildFolder: false, hasChildFile: true })).toBe(
      "Folder masih berisi file. Pindahkan atau hapus dulu.",
    );
  });

  it("returns null for an empty folder", () => {
    expect(getFolderDeleteBlocker({ hasChildFolder: false, hasChildFile: false })).toBeNull();
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
