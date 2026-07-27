import { SignupForm } from "@/components/auth/signup-form";
import { AuthShell } from "@/components/auth/auth-shell";
import type { Metadata } from "next";
export const metadata: Metadata = { title: "Daftar | Cubiqlo", description: "Buat workspace Cubiqlo gratis untuk mengelola kerja klien." };

export default function SignupPage() {
  return (
    <AuthShell>
      <SignupForm />
    </AuthShell>
  );
}
