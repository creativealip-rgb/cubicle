import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { db } from "@/db";
import { sendNotification } from "@/lib/notifications";

const appUrl = process.env.BETTER_AUTH_URL ?? "http://localhost:3000";

export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: "pg",
    usePlural: true,
  }),
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: false,
    sendResetPassword: async ({ user, url }) => {
      await sendNotification({
        to: user.email,
        subject: "Reset your Cubicle password",
        text:
          `Hi ${user.name ?? ""},\n\n` +
          `We received a request to reset your Cubicle password.\n\n` +
          `Click the link below to choose a new password (valid for 1 hour):\n${url}\n\n` +
          `If you didn't request this, you can safely ignore this email.`,
        type: "password_reset",
      });
    },
    resetPasswordTokenExpiresIn: 60 * 60, // 1 hour
  },
  emailVerification: {
    sendVerificationEmail: async ({ user, url }) => {
      await sendNotification({
        to: user.email,
        subject: "Verify your Cubicle email",
        text:
          `Hi ${user.name ?? ""},\n\n` +
          `Welcome to Cubicle! Please verify your email address by clicking:\n${url}\n\n` +
          `If you didn't sign up, ignore this email.`,
        type: "email_verification",
      });
    },
  },
  secret: process.env.BETTER_AUTH_SECRET ?? "dev-build-placeholder-secret-change-me",
  baseURL: process.env.BETTER_AUTH_URL,
  trustedOrigins: [
    appUrl,
    "http://localhost:3000",
  ].filter(Boolean),
});
