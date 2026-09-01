"use client";
import { useState } from "react";
import {
  createPersonalReceiptUpload,
  confirmPersonalReceipt,
  deletePersonalReceipt,
  getPersonalReceiptDownloadUrl,
  abandonPersonalReceiptUpload,
} from "@/lib/actions/personal-transactions";
import { Button } from "@/components/ui/button";

export function PersonalReceiptControl({
  transactionId,
  hasReceipt,
  label,
}: {
  transactionId: string;
  hasReceipt: boolean;
  label: { upload: string; download: string; remove: string };
}) {
  const [busy, setBusy] = useState(false);
  async function upload(file: File) {
    setBusy(true);
    let key = "";
    try {
      const bytes = new Uint8Array(await file.slice(0, 16).arrayBuffer()),
        magic = Array.from(bytes)
          .map((v) => v.toString(16).padStart(2, "0"))
          .join("");
      const checksum = Array.from(
        new Uint8Array(
          await crypto.subtle.digest("SHA-256", await file.arrayBuffer()),
        ),
      )
        .map((v) => v.toString(16).padStart(2, "0"))
        .join("");
      const signed = await createPersonalReceiptUpload(transactionId, {
        mime: file.type,
        size: file.size,
        checksum,
        filename: file.name,
        magic,
      });
      key = signed.key;
      const response = await fetch(signed.url, {
        method: "PUT",
        headers: { "Content-Type": file.type },
        body: file,
      });
      if (!response.ok) throw new Error("Upload failed");
      await confirmPersonalReceipt(transactionId, {
        key,
        mime: file.type,
        size: file.size,
        checksum,
      });
      location.reload();
    } catch (error) {
      if (key)
        await abandonPersonalReceiptUpload(transactionId, key).catch(
          () => undefined,
        );
      alert(error instanceof Error ? error.message : "Upload failed");
    } finally {
      setBusy(false);
    }
  }
  async function download() {
    setBusy(true);
    try {
      const url = await getPersonalReceiptDownloadUrl(transactionId);
      if (url) location.href = url;
    } finally {
      setBusy(false);
    }
  }
  async function remove() {
    setBusy(true);
    try {
      await deletePersonalReceipt(transactionId);
      location.reload();
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="flex flex-wrap gap-2">
      {hasReceipt ? (
        <>
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={busy}
            onClick={download}
          >
            {label.download}
          </Button>
          <Button
            type="button"
            size="sm"
            variant="ghost"
            disabled={busy}
            onClick={remove}
          >
            {label.remove}
          </Button>
        </>
      ) : (
        <label className="inline-flex h-9 cursor-pointer items-center rounded-md border px-3 text-sm">
          <input
            className="sr-only"
            type="file"
            accept="application/pdf,image/jpeg,image/png,image/webp"
            disabled={busy}
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) void upload(file);
            }}
          />
          {label.upload}
        </label>
      )}
    </div>
  );
}
