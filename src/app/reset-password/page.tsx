import { Suspense } from "react";
import { ResetPasswordFallback } from "@/components/auth/reset-password-fallback";

export const dynamic = "force-dynamic";

export default function ResetPasswordPage() {
  return (
    <div className="flex min-h-screen w-full items-center justify-center px-4">
      <Suspense fallback={null}>
        <ResetPasswordFallback />
      </Suspense>
    </div>
  );
}
