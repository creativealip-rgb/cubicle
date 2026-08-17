import { Suspense } from "react";
import { ResetPasswordForm } from "@/components/auth/reset-password-form";

export const dynamic = "force-dynamic";

export default async function ResetPasswordTokenPage({
  params,
  searchParams,
}: {
  params: Promise<{ token: string }>;
  searchParams: Promise<{ callbackURL?: string }>;
}) {
  const { token } = await params;
  const { callbackURL } = await searchParams;
  return (
    <div className="flex min-h-screen w-full items-center justify-center px-4">
      <Suspense fallback={null}>
        <ResetPasswordForm
          token={decodeURIComponent(token)}
          callbackURL={callbackURL}
        />
      </Suspense>
    </div>
  );
}
