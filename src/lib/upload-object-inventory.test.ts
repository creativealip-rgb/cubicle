import { HeadObjectCommand, ListObjectsV2Command } from "@aws-sdk/client-s3";
import { readFileSync } from "node:fs";
import { expect, it } from "vitest";
import { scanUploadObjectInventory } from "./upload-object-inventory";

it("paginates saga namespaces and classifies missing/orphan/metadata mismatch without deletion", async () => {
  const calls: unknown[] = [];
  const client = { send: async (command: unknown) => {
    calls.push(command);
    if (command instanceof ListObjectsV2Command) {
      const token = command.input.ContinuationToken;
      if (!token) return { Contents: [{ Key: "quarantine/ws/i1", LastModified: new Date("2026-01-01") }], IsTruncated: true, NextContinuationToken: "p2" };
      return { Contents: [{ Key: "workspaces/ws/files/orphan", LastModified: new Date("2026-01-01") }], IsTruncated: false };
    }
    if (command instanceof HeadObjectCommand) return { Metadata: { intentid: "wrong", attemptid: "a1" }, ContentLength: 10, ContentType: "application/pdf" };
    throw new Error("unexpected command");
  }};
  const report = await scanUploadObjectInventory(client, {
    bucket: "b", now: new Date("2026-02-01"), graceMs: 86_400_000,
    references: [
      { key: "quarantine/ws/i1", intentId: "i1", attemptId: "a1", expectedBytes: 10, expectedMime: "application/pdf" },
      { key: "workspaces/ws/files/missing", intentId: "i2", attemptId: "a2", expectedBytes: 2, expectedMime: "image/png" },
    ],
  });
  expect(report.pages).toBe(2);
  expect(report.missing).toEqual(["workspaces/ws/files/missing"]);
  expect(report.orphans).toEqual(["workspaces/ws/files/orphan"]);
  expect(report.metadataMismatches).toEqual(["quarantine/ws/i1"]);
  expect(calls.filter((x) => x instanceof ListObjectsV2Command)).toHaveLength(2);
});

it("contains no object deletion capability", () => {
  expect(readFileSync("src/lib/upload-object-inventory.ts", "utf8")).not.toContain("DeleteObjectCommand");
});

it("rejects invalid canonical reference keys and incomplete pagination", async () => {
  await expect(scanUploadObjectInventory({ send: async () => ({ Contents: [], IsTruncated: false }) }, { bucket: "b", now: new Date(), graceMs: 1, references: [{ key: "other/key", intentId: "i", attemptId: null, expectedBytes: 1, expectedMime: "x" }] })).rejects.toThrow("INVALID_UPLOAD_OBJECT_KEY");
  await expect(scanUploadObjectInventory({ send: async () => ({ Contents: [], IsTruncated: true }) }, { bucket: "b", now: new Date(), graceMs: 1, references: [] })).rejects.toThrow("INCOMPLETE_OBJECT_PAGINATION");
});
