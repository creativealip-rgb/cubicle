import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Compass } from "lucide-react";

export default function NotFound() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
      <div className="w-full max-w-md rounded-2xl border bg-white p-8 text-center shadow-sm">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-slate-100">
          <Compass className="h-6 w-6 text-slate-600" />
        </div>
        <h1 className="text-xl font-semibold text-slate-950">Page not found</h1>
        <p className="mt-2 text-sm text-slate-600">
          We can't find the page you're looking for. It may have been moved or never existed.
        </p>
        <div className="mt-6 flex justify-center gap-2">
          <Button asChild>
            <Link href="/app/dashboard">Back to dashboard</Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/">Public site</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
