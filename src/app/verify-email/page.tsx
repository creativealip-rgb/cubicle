import { VerifyEmailContent } from "@/components/auth/verify-email-content";
import { Suspense } from "react";

export default function VerifyEmailPage() {
  return (
    <div className="flex min-h-screen w-full items-center justify-center px-4">
      <Suspense>
        <VerifyEmailContent />
      </Suspense>
    </div>
  );
}
