import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { MfaSetupForm } from "@/components/auth/mfa-setup-form";

export default async function MfaSetupPage({
  searchParams,
}: {
  searchParams?: Promise<{ force?: string }>;
}) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) redirect("/login?redirect=/mfa/setup");
  const params = searchParams ? await searchParams : {};
  if (session.user.twoFactorEnabled && params.force !== "1") redirect("/app/settings?tab=account");

  return <MfaSetupForm />;
}
