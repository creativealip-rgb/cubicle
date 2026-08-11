import { SignupForm } from "@/components/auth/signup-form";
import { AuthShell } from "@/components/auth/auth-shell";
import type { Metadata } from "next";
import { getCurrentLang, createT } from "@/lib/i18n";

export async function generateMetadata(): Promise<Metadata> {
  const t = createT(await getCurrentLang("en"));
  return { title: `${t("Daftar", "Sign up")} | Cubiqlo`, description: t("Buat workspace Cubiqlo gratis untuk mengelola kerja klien.", "Create your free Cubiqlo workspace to manage client work.") };
}

export default function SignupPage() {
  return (
    <AuthShell>
      <SignupForm />
    </AuthShell>
  );
}
