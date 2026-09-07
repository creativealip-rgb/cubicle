import Link from "next/link";
import { AuthShell } from "@/components/auth/auth-shell";
import { AccessRecoveryForm } from "@/components/auth/access-recovery-form";
export default function RecoverAccessPage() {
  return (
    <AuthShell>
      <div className="w-full max-w-md rounded-xl border bg-white p-6 shadow-xl">
        <h1 className="text-xl font-semibold">Recover account access</h1>
        <p className="mt-2 mb-6 text-sm text-muted-foreground">
          Lost access to your email? Use a registered passkey or one unused
          backup code.
        </p>
        <AccessRecoveryForm />
        <p className="mt-6 text-center text-xs text-muted-foreground">
          No passkey or backup code?{" "}
          <Link className="underline" href="/mfa/recovery">
            Request manual recovery
          </Link>
        </p>
      </div>
    </AuthShell>
  );
}
