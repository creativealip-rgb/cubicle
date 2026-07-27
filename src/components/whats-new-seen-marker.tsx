"use client";

import { useEffect } from "react";
import { WHATS_NEW_STORAGE_KEY } from "@/lib/product-updates";

export function WhatsNewSeenMarker({ releaseId }: { releaseId: string }) {
  useEffect(() => {
    try {
      window.localStorage.setItem(WHATS_NEW_STORAGE_KEY, releaseId);
      window.dispatchEvent(new CustomEvent("cubiqlo:whats-new-seen", { detail: releaseId }));
    } catch {
      // Storage may be disabled; page stays usable.
    }
  }, [releaseId]);

  return null;
}
