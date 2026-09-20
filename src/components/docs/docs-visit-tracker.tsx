"use client";

import { useEffect } from "react";

export function DocsVisitTracker() {
  useEffect(() => {
    try {
      document.cookie = "cubiqlo_docs_visited=1; path=/; max-age=31536000; SameSite=Lax";
    } catch {
      // ignore
    }
  }, []);

  return null;
}
