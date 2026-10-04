"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { CheckCircle, XCircle } from "lucide-react";
import { useT } from "@/lib/i18n-client";

export function VerifyEmailSuccess() {
  const { t } = useT();
  const router = useRouter();
  const [countdown, setCountdown] = useState(3);

  useEffect(() => {
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          router.push("/onboarding");
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [router]);

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
        <CheckCircle className="mx-auto h-12 w-12 text-green-500" />
        <CardTitle className="text-2xl">{t("Email berhasil diverifikasi!", "Email verified successfully!")}</CardTitle>
        <CardDescription>
          {t("Akun kamu sudah aktif. Selamat datang di Cubiqlo!", "Your account is active. Welcome to Cubiqlo!")}
        </CardDescription>
      </CardHeader>
      <CardContent className="text-center">
        <p className="text-sm text-muted-foreground">
          {t("Otomatis masuk dalam", "Redirecting in")} {countdown} {t("detik...", "seconds...")}
        </p>
      </CardContent>
      <CardFooter className="flex justify-center">
        <Button onClick={() => router.push("/onboarding")}>
          {t("Lanjut setup akun", "Continue account setup")}
        </Button>
      </CardFooter>
    </Card>
  );
}

export function VerifyEmailError() {
  const { t } = useT();
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
        <XCircle className="mx-auto h-12 w-12 text-destructive" />
        <CardTitle className="text-2xl">{t("Link tidak valid", "Invalid link")}</CardTitle>
        <CardDescription>
          {t("Link verifikasi sudah kedaluwarsa atau tidak valid. Minta link baru.", "Verification link is invalid or has expired. Please request a new link.")}
        </CardDescription>
      </CardHeader>
      <CardFooter className="flex justify-center">
        <Link href="/login">
          <Button variant="outline">{t("Kembali ke login", "Back to login")}</Button>
        </Link>
      </CardFooter>
    </Card>
  );
}
