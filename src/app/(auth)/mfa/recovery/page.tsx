import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { MfaRecoveryForm } from "@/components/auth/mfa-recovery-form";

export default function MfaRecoveryPage() {
  return <main className="flex min-h-screen items-center justify-center bg-muted/30 px-4 py-10">
    <Card className="w-full max-w-md"><CardHeader><CardTitle>Manual MFA recovery</CardTitle><CardDescription>Use only when passkey, authenticator, and recovery codes are unavailable. Recovery cannot complete before 72 hours and requires two administrators.</CardDescription></CardHeader><CardContent className="space-y-4"><MfaRecoveryForm /><Link href="/two-factor" className="block text-center text-sm text-muted-foreground hover:underline">Back to verification</Link></CardContent></Card>
  </main>;
}
