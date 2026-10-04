"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { authClient } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { CheckCircle, Loader2, Mail } from "lucide-react";
import { useT } from "@/lib/i18n-client";

export function VerifyEmailContent() {
  const { t } = useT();
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
        callbackURL: "/onboarding",
      });
      setResent(true);
    } catch {
      setError(t("Gagal mengirim ulang email. Coba lagi nanti.", "Failed to resend email. Please try again later."));
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
        <CardTitle className="text-2xl">{t("Cek email kamu", "Check your email")}</CardTitle>
        <CardDescription>
          {t("Kami sudah mengirim link verifikasi ke", "We sent a verification link to")}{" "}
          {email ? (
            <span className="font-medium text-foreground">{email}</span>
          ) : (
            t("alamat email kamu", "your email address")
          )}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="rounded-lg bg-muted/50 px-4 py-3 text-sm text-muted-foreground">
          <p className="mb-1 font-medium text-foreground">{t("Langkah selanjutnya:", "Next steps:")}</p>
          <ol className="list-inside list-decimal space-y-1">
            <li>{t("Buka inbox email kamu", "Open your email inbox")}</li>
            <li>{t("Cari email dari", "Look for an email from")} <span className="font-medium">Cubiqlo</span></li>
            <li>{t("Klik tombol \u201CVerify Email\u201D", "Click the \u201CVerify Email\u201D button")}</li>
          </ol>
        </div>
        <p className="text-center text-xs text-muted-foreground">
          {t("Email tidak masuk? Cek folder spam/promotions.", "Didn't receive it? Check spam/promotions folder.")}
        </p>
        {error && (
          <div className="rounded-lg bg-destructive/10 px-4 py-3 text-sm text-destructive">
            {error}
          </div>
        )}
        {resent && (
          <div className="flex items-center gap-2 rounded-lg bg-green-50 px-4 py-3 text-sm text-green-800">
            <CheckCircle className="h-4 w-4" />
            {t("Email verifikasi berhasil dikirim ulang!", "Verification email sent successfully!")}
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
            {resending && <Loader2 className="h-4 w-4 animate-spin" />}
            {resent ? t("Email terkirim", "Email sent") : t("Kirim ulang email verifikasi", "Resend verification email")}
          </Button>
        )}
        <p className="text-center text-sm text-muted-foreground">
          <Link
            href="/login"
            className="font-medium text-primary underline-offset-4 hover:underline"
          >
            {t("Kembali ke login", "Back to login")}
          </Link>
        </p>
      </CardFooter>
    </Card>
  );
}
