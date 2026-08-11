import { Suspense } from "react";
import { LoginForm } from "@/components/auth/login-form";
import { AuthShell } from "@/components/auth/auth-shell";
import type { Metadata } from "next";
import { getCurrentLang, createT } from "@/lib/i18n";

export async function generateMetadata(): Promise<Metadata> {
  const t = createT(await getCurrentLang("en"));
  return { title: `${t("Masuk", "Sign in")} | Cubiqlo`, description: t("Masuk ke workspace Cubiqlo untuk mengelola kerja klien.", "Sign in to your Cubiqlo workspace to manage client work.") };
}

export default function LoginPage() {
  return (
    <AuthShell>
      <Suspense>
        <LoginForm />
      </Suspense>
    </AuthShell>
  );
}
