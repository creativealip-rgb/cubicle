import { Suspense } from "react";
import { LoginForm } from "@/components/auth/login-form";
import { AuthShell } from "@/components/auth/auth-shell";
import type { Metadata } from "next";
export const metadata: Metadata = { title: "Masuk | Cubiqlo", description: "Masuk ke workspace Cubiqlo untuk mengelola kerja klien." };

export default function LoginPage() {
  return (
    <AuthShell>
      <Suspense>
        <LoginForm />
      </Suspense>
    </AuthShell>
  );
}
