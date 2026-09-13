import { expect, it } from "vitest";
import { CopyObjectCommand, GetObjectCommand, HeadObjectCommand } from "@aws-sdk/client-s3";
import { createHash } from "node:crypto";
import { promoteValidatedUploadObject } from "./upload-object-promotion";

async function* stream(body: Buffer) { yield body.subarray(0, 3); yield body.subarray(3); }

it("binds validation/copy/final verification to exact object identity", async () => {
  const body = Buffer.from("%PDF-1.7\nhello");
  const sha = createHash("sha256").update(body).digest("hex");
  const calls: unknown[] = [];
  const client = { send: async (command: unknown) => {
    calls.push(command);
    if (command instanceof HeadObjectCommand) return calls.filter((x) => x instanceof HeadObjectCommand).length === 1
      ? { ContentLength: body.length, ContentType: "application/pdf", ETag: '"source-etag"', VersionId: "source-v1" }
      : { ContentLength: body.length, ContentType: "application/pdf", ETag: '"final-etag"', Metadata: { intentid: "intent-1", attemptid: "attempt-1", sha256: sha } };
    if (command instanceof GetObjectCommand) return { Body: stream(body), ETag: '"source-etag"', VersionId: "source-v1", ContentLength: body.length, ContentType: "application/pdf" };
    if (command instanceof CopyObjectCommand) return { CopyObjectResult: { ETag: '"final-etag"' } };
    throw new Error("unexpected command");
  }};

  await expect(promoteValidatedUploadObject(client, { bucket: "bucket", intentId: "intent-1", attemptId: "attempt-1", quarantineKey: "quarantine/ws/object", finalKey: "workspaces/ws/files/object", expectedBytes: body.length, maxBytes: body.length, expectedMime: "application/pdf", expectedSha256: sha })).resolves.toMatchObject({ sha256: sha, sourceVersionId: "source-v1" });
  expect(calls).toHaveLength(4);
  expect(calls[2]).toBeInstanceOf(CopyObjectCommand);
});

it("rejects changed source identity before copy", async () => {
  const body = Buffer.from("%PDF-1.7\nhello");
  const client = { send: async (command: unknown) => {
    if (command instanceof HeadObjectCommand) return { ContentLength: body.length, ContentType: "application/pdf", ETag: '"head-etag"', VersionId: "v1" };
    if (command instanceof GetObjectCommand) return { Body: stream(body), ETag: '"changed-etag"', VersionId: "v1", ContentLength: body.length, ContentType: "application/pdf" };
    throw new Error("copy must not run");
  }};
  await expect(promoteValidatedUploadObject(client, { bucket: "bucket", intentId: "i", attemptId: "a", quarantineKey: "quarantine/ws/o", finalKey: "workspaces/ws/files/o", expectedBytes: body.length, maxBytes: body.length, expectedMime: "application/pdf" })).rejects.toThrow("SOURCE_OBJECT_CHANGED");
});
