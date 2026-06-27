import { VerifyEmailSuccess, VerifyEmailError } from "@/components/auth/verify-email-result";
import { Suspense } from "react";

export default async function VerifyEmailSuccessPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const params = await searchParams;

  return (
    <div className="flex min-h-screen w-full items-center justify-center px-4">
      <Suspense>
        {params.error ? <VerifyEmailError /> : <VerifyEmailSuccess />}
      </Suspense>
    </div>
  );
}
