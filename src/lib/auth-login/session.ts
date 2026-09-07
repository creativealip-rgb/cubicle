import { makeSignature } from "better-auth/crypto";
import { getCookies } from "better-auth/cookies";
import { auth } from "@/lib/auth";

export async function createBetterAuthSession(userId: string, secret: string) {
  const context = await auth.$context;
  const session = await context.internalAdapter.createSession(userId);
  if (!session) throw new Error("Session creation failed");
  const cookie = getCookies(auth.options).sessionToken;
  const signature = await makeSignature(session.token, secret);
  return {
    name: cookie.name,
    value: `${session.token}.${signature}`,
    attributes: {
      ...cookie.attributes,
      sameSite: String(cookie.attributes.sameSite).toLowerCase() as "lax" | "strict" | "none",
    },
  };
}
