import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { db } from "@/db";
import { sendNotification } from "@/lib/notifications";

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
        subject: "Reset your Cubiqlo password",
        text:
          `Hi ${user.name ?? ""},\n\n` +
          `We received a request to reset your Cubiqlo password.\n\n` +
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
        subject: "Verify your Cubiqlo email",
        text:
          `Hi ${user.name ?? ""},\n\n` +
          `Welcome to Cubiqlo! Please verify your email address by clicking:\n${url}\n\n` +
          `If you didn't sign up, ignore this email.`,
        type: "email_verification",
      });
    },
  },
  secret: process.env.BETTER_AUTH_SECRET ?? "dev-build-placeholder-secret-change-me",
  baseURL: process.env.BETTER_AUTH_URL,
  trustedOrigins: [
    process.env.BETTER_AUTH_URL ?? "http://localhost:3000",
    "https://cubicle.168-144-37-19.sslip.io",
    "http://cubicle.168-144-37-19.sslip.io",
    "https://cubiqlo.com",
    "http://cubiqlo.com",
    "https://www.cubiqlo.com",
    "http://www.cubiqlo.com",
    "https://cubicle.168.144.37.19.sslip.io",
    "http://cubicle.168.144.37.19.sslip.io",
    "https://localhost:3000",
    "http://localhost:3000",
    "https://127.0.0.1:3000",
    "http://127.0.0.1:3000",
  ].map((s) => s.replace(/\/$/, "")),
});
