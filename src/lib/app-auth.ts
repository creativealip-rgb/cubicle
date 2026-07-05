import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

export async function requireAppSession(redirectTo?: string) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user?.id) {
    const target = redirectTo ? `/login?redirect=${encodeURIComponent(redirectTo)}` : "/login";
    redirect(target);
  }
  return session;
}
