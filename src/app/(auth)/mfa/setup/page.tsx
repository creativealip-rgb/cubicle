import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { MfaSetupForm } from "@/components/auth/mfa-setup-form";

export default async function MfaSetupPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) redirect("/login?redirect=/mfa/setup");
  if (session.user.twoFactorEnabled) redirect("/app/dashboard");

  return <MfaSetupForm />;
}
