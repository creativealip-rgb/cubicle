"use client";

import { useEffect } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { AlertTriangle, RefreshCw } from "lucide-react";
import { isStaleServerActionError } from "@/lib/client-errors";

export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const stale = isStaleServerActionError(error);

  useEffect(() => {
    console.error("Cubiqlo app error:", error);
    if (stale) {
      // Auto-recover after deploy: hard reload picks new Server Action IDs
      const t = setTimeout(() => window.location.reload(), 1200);
      return () => clearTimeout(t);
    }
  }, [error, stale]);

  return (
    <div className="flex min-h-[60vh] items-center justify-center px-4 py-12">
      <div className="w-full max-w-md rounded-2xl border bg-white p-8 text-center shadow-sm">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-amber-100">
          <AlertTriangle className="h-6 w-6 text-amber-600" />
        </div>
        <h1 className="text-xl font-semibold text-slate-950">
          {stale ? "App baru di-update" : "Ada yang error"}
        </h1>
        <p className="mt-2 text-sm text-slate-600">
          {stale
            ? "Browser masih pakai versi lama. Halaman akan di-refresh otomatis…"
            : "Terjadi error tak terduga. Coba lagi, atau kembali ke dashboard."}
        </p>
        {error.digest && (
          <p className="mt-3 font-mono text-xs text-slate-400">Ref: {error.digest}</p>
        )}
        <div className="mt-6 flex justify-center gap-2">
          <Button
            onClick={() => {
              if (stale) window.location.reload();
              else reset();
            }}
            variant="outline"
            className="gap-1.5"
          >
            <RefreshCw className="h-4 w-4" />
            {stale ? "Refresh sekarang" : "Coba lagi"}
          </Button>
          <Button asChild>
            <Link href="/app/dashboard">Dashboard</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
