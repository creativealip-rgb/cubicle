import { describe, expect, it } from "vitest";
import { readRequestBodyWithinLimit } from "@/lib/upload-request-limit";

describe("readRequestBodyWithinLimit", () => {
  it("rejects a declared oversized body before reading", async () => {
    const request = new Request("http://local/upload", { method: "POST", body: "x", headers: { "content-length": "11" } });
    await expect(readRequestBodyWithinLimit(request, 10)).rejects.toMatchObject({ status: 413 });
  });

  it("rejects a chunked body once aggregate bytes exceed the limit", async () => {
    const stream = new ReadableStream({ start(controller) { controller.enqueue(new Uint8Array(6)); controller.enqueue(new Uint8Array(6)); controller.close(); } });
    const request = new Request("http://local/upload", { method: "POST", body: stream, duplex: "half" } as RequestInit);
    await expect(readRequestBodyWithinLimit(request, 10)).rejects.toMatchObject({ status: 413 });
  });

  it("returns a replayable request for a valid multipart body", async () => {
    const form = new FormData(); form.set("token", "ok"); form.set("file", new File(["abc"], "a.txt"));
    const request = new Request("http://local/upload", { method: "POST", body: form });
    const limited = await readRequestBodyWithinLimit(request, 1024);
    expect((await limited.formData()).get("token")).toBe("ok");
  });
});
