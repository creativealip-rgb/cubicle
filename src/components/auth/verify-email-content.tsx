"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { Loader2, Mail, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { authClient } from "@/lib/auth-client";

export function VerifyEmailContent() {
  const searchParams = useSearchParams();
  const email = searchParams.get("email") ?? "";

  const [resending, setResending] = useState(false);
  const [resent, setResent] = useState(false);
  const [error, setError] = useState("");

  async function handleResend() {
    if (!email) return;
    setResending(true);
    setError("");
    try {
      await authClient.sendVerificationEmail({
        email,
        callbackURL: "/app/dashboard",
      });
      setResent(true);
    } catch {
      setError("Gagal mengirim ulang email. Coba lagi nanti.");
    } finally {
      setResending(false);
    }
  }

  return (
    <Card className="w-full max-w-md">
      <CardHeader className="space-y-1 text-center">
        <Image
          src="/logo-icon.png"
          alt="Cubiqlo"
          width={40}
          height={40}
          className="mx-auto mb-3 h-10 w-10 rounded-lg object-cover"
        />
        <Mail className="mx-auto h-12 w-12 text-primary" />
        <CardTitle className="text-2xl">Cek email kamu</CardTitle>
        <CardDescription>
          Kami sudah mengirim link verifikasi ke{" "}
          {email ? (
            <span className="font-medium text-foreground">{email}</span>
          ) : (
            "alamat email kamu"
          )}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="rounded-lg bg-muted/50 px-4 py-3 text-sm text-muted-foreground">
          <p className="mb-1 font-medium text-foreground">Langkah selanjutnya:</p>
          <ol className="list-inside list-decimal space-y-1">
            <li>Buka inbox email kamu</li>
            <li>Cari email dari <span className="font-medium">Cubiqlo</span></li>
            <li>Klik tombol &ldquo;Verify Email&rdquo;</li>
          </ol>
        </div>
        <p className="text-center text-xs text-muted-foreground">
          Email tidak masuk? Cek folder spam/promotions.
        </p>
        {error && (
          <div className="rounded-lg bg-destructive/10 px-4 py-3 text-sm text-destructive">
            {error}
          </div>
        )}
        {resent && (
          <div className="flex items-center gap-2 rounded-lg bg-green-50 px-4 py-3 text-sm text-green-800">
            <CheckCircle className="h-4 w-4" />
            Email verifikasi berhasil dikirim ulang!
          </div>
        )}
      </CardContent>
      <CardFooter className="flex flex-col gap-3">
        {email && (
          <Button
            variant="outline"
            className="w-full"
            onClick={handleResend}
            disabled={resending || resent}
          >
            {resending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {resent ? "Email terkirim" : "Kirim ulang email verifikasi"}
          </Button>
        )}
        <Link
          href="/login"
          className="text-sm text-muted-foreground underline-offset-4 hover:underline"
        >
          Kembali ke login
        </Link>
      </CardFooter>
    </Card>
  );
}
