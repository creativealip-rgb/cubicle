"use client";

import { useEffect } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { AlertTriangle } from "lucide-react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log to console for now; wire to Sentry/PostHog later
    console.error("Cubicle global error:", error);
  }, [error]);

  return (
    <html>
      <body>
        <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
          <div className="w-full max-w-md rounded-2xl border bg-white p-8 text-center shadow-sm">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-100">
              <AlertTriangle className="h-6 w-6 text-red-600" />
            </div>
            <h1 className="text-xl font-semibold text-slate-950">Something went wrong</h1>
            <p className="mt-2 text-sm text-slate-600">
              We hit an unexpected error. You can try again, or come back to the dashboard.
            </p>
            {error.digest && (
              <p className="mt-3 font-mono text-xs text-slate-400">
                Ref: {error.digest}
              </p>
            )}
            <div className="mt-6 flex justify-center gap-2">
              <Button onClick={reset} variant="outline">
                Try again
              </Button>
              <Button asChild>
                <Link href="/app/dashboard">Back to dashboard</Link>
              </Button>
            </div>
          </div>
        </div>
      </body>
    </html>
  );
}
