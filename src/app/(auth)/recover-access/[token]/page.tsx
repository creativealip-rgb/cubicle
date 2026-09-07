import { AuthShell } from "@/components/auth/auth-shell";
import { RecoveryHandoffButton } from "@/components/auth/recovery-handoff-button";
export default async function RecoveryHandoffPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  return (
    <AuthShell>
      <div className="w-full max-w-md rounded-xl border bg-white p-6 shadow-xl">
        <h1 className="text-xl font-semibold">Recover account access</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          This one-time link signs you in, then opens Account Settings. Change
          your email or password there.
        </p>
        <RecoveryHandoffButton token={token} />
      </div>
    </AuthShell>
  );
}
