"use client";

import { useEffect } from "react";
import { isStaleServerActionError } from "@/lib/client-errors";

export function GlobalVersionSkewRecovery() {
  useEffect(() => {
    const handle = (event: ErrorEvent | PromiseRejectionEvent) => {
      const error = "reason" in event ? event.reason : event.error;
      if (!isStaleServerActionError(error)) return;
      event.preventDefault();
      window.location.reload();
    };
    window.addEventListener("error", handle);
    window.addEventListener("unhandledrejection", handle);
    return () => {
      window.removeEventListener("error", handle);
      window.removeEventListener("unhandledrejection", handle);
    };
  }, []);
  return null;
}
