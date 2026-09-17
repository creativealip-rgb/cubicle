"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { normalizeAnalyticsPath } from "@/lib/analytics";

export function UsageTracker() {
  const pathname = usePathname();
  const last = useRef<string | null>(null);
  useEffect(() => {
    const path = normalizeAnalyticsPath(pathname);
    if (!path || path === last.current) return;
    last.current = path;
    void fetch("/api/analytics/events", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ eventName: "page_viewed", metadata: { path } }),
      keepalive: true,
    });
  }, [pathname]);
  return null;
}

export default UsageTracker;
