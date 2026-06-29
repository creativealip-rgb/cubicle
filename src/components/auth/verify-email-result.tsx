"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { CheckCircle, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export function VerifyEmailSuccess() {
  const router = useRouter();
  const [countdown, setCountdown] = useState(5);

  useEffect(() => {
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          router.push("/app/dashboard");
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
          src="/icon-192.png"
          alt="Cubiqlo"
          width={40}
          height={40}
          className="mx-auto mb-3 h-10 w-10 rounded-lg object-cover"
        />
        <CheckCircle className="mx-auto h-12 w-12 text-green-600" />
        <CardTitle className="text-2xl">Email terverifikasi!</CardTitle>
        <CardDescription>
          Akun kamu sudah aktif. Selamat datang di Cubiqlo!
        </CardDescription>
      </CardHeader>
      <CardContent className="text-center">
        <p className="text-sm text-muted-foreground">
          Otomatis masuk dalam {countdown} detik...
        </p>
      </CardContent>
      <CardFooter className="flex justify-center">
        <Button onClick={() => router.push("/app/dashboard")}>
          Masuk ke Dashboard
        </Button>
      </CardFooter>
    </Card>
  );
}

export function VerifyEmailError() {
  return (
    <Card className="w-full max-w-md">
      <CardHeader className="space-y-1 text-center">
        <Image
          src="/icon-192.png"
          alt="Cubiqlo"
          width={40}
          height={40}
          className="mx-auto mb-3 h-10 w-10 rounded-lg object-cover"
        />
        <XCircle className="mx-auto h-12 w-12 text-destructive" />
        <CardTitle className="text-2xl">Link tidak valid</CardTitle>
        <CardDescription>
          Link verifikasi sudah kedaluwarsa atau tidak valid. Minta link baru.
        </CardDescription>
      </CardHeader>
      <CardFooter className="flex justify-center">
        <Link href="/login">
          <Button variant="outline">Kembali ke login</Button>
        </Link>
      </CardFooter>
    </Card>
  );
}
