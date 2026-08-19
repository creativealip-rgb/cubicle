import { betterAuth, APIError } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { db } from "@/db";
import { sessions, users } from "@/db/schema";
import { eq } from "drizzle-orm";
import { sendNotification } from "@/lib/notifications";
import { resolveBetterAuthSecret } from "@/lib/auth-secret";
import { getAuthEnvironmentOptions } from "@/lib/auth-environment";
import {
  IDLE_SESSION_SECONDS,
  SESSION_UPDATE_AGE_SECONDS,
  capSessionExpiry,
} from "@/lib/auth-policy";

const authEnvironment = getAuthEnvironmentOptions(
  process.env.BETTER_AUTH_URL,
  process.env.NODE_ENV,
);

export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: "pg",
    usePlural: true,
  }),
  socialProviders: {
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID ?? "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET ?? "",
    },
  },
  account: {
    accountLinking: {
      enabled: true,
      trustedProviders: ["google"],
      allowDifferentEmails: false,
      requireLocalEmailVerified: true,
    },
  },
  session: {
    expiresIn: IDLE_SESSION_SECONDS,
    updateAge: SESSION_UPDATE_AGE_SECONDS,
  },
  databaseHooks: {
    session: {
      create: {
        before: async (session) => {
          // Superadmin control plane: banned users cannot create sessions.
          // `session.userId` is present on the create path; throwing APIError
          // makes Better Auth reject the login cleanly (a plain Error would
          // not surface as an auth failure).
          if (session?.userId) {
            const [target] = await db
              .select({ banned: users.banned })
              .from(users)
              .where(eq(users.id, session.userId))
              .limit(1);
            if (target?.banned) {
              throw new APIError("FORBIDDEN", {
                code: "ACCOUNT_BANNED",
                message: "This account has been suspended.",
              });
            }
          }
          return {
            data: {
              ...session,
              expiresAt: capSessionExpiry(session.createdAt, session.expiresAt),
            },
          };
        },
      },
      update: {
        before: async (session) => {
          if (!session.expiresAt) return;
          const token = typeof session.token === "string" ? session.token : null;
          const createdAt = session.createdAt ?? (token
            ? (await db
                .select({ createdAt: sessions.createdAt })
                .from(sessions)
                .where(eq(sessions.token, token))
                .limit(1))[0]?.createdAt
            : null);
          if (!createdAt) return;
          return {
            data: {
              ...session,
              expiresAt: capSessionExpiry(createdAt, session.expiresAt),
            },
          };
        },
      },
    },
  },
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: true,
    sendResetPassword: async ({ user, url }) => {
      // Better Auth builds the reset link against `baseURL + basePath`, which
      // resolves to `https://app.cubiqlo.com/api/auth/reset-password/{token}`.
      // That path is the *API* GET endpoint (which redirects), not the app's
      // `/reset-password/{token}` page. Strip the `/api/auth` segment so the
      // email link points straight at the frontend reset page.
      const resetUrl = url.replace(/(\/api\/auth)(?=\/reset-password\/)/, "");
      const html = `<!doctype html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f6f7f9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#1a1d24;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f6f7f9;padding:32px 16px;">
  <tr><td align="center">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border-radius:12px;border:1px solid #e5e7eb;">
      <tr><td style="padding:24px 32px;border-bottom:1px solid #e5e7eb;">
        <div style="font-size:14px;font-weight:600;letter-spacing:.04em;text-transform:uppercase;color:#6b7280;">Cubiqlo</div>
      </td></tr>
      <tr><td style="padding:32px;font-size:15px;line-height:1.6;color:#1a1d24;">
        <h2 style="margin:0 0 16px;font-size:20px;font-weight:600;">Reset your password</h2>
        <p style="margin:0 0 16px;">Hi ${user.name ?? "there"},</p>
        <p style="margin:0 0 24px;">We received a request to reset your password. Click the button below to choose a new one. This link expires in 1 hour.</p>
        <table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 auto 24px;">
          <tr><td style="border-radius:8px;background:#1a1d24;">
            <a href="${resetUrl}" target="_blank" style="display:inline-block;padding:12px 32px;font-size:15px;font-weight:600;color:#ffffff;text-decoration:none;">Reset Password</a>
          </td></tr>
        </table>
        <p style="margin:0 0 8px;font-size:13px;color:#6b7280;">If the button doesn't work, copy this link:</p>
        <p style="margin:0;font-size:13px;color:#6b7280;word-break:break-all;">${resetUrl}</p>
      </td></tr>
      <tr><td style="padding:16px 32px;border-top:1px solid #e5e7eb;font-size:12px;color:#6b7280;text-align:center;">
        <p style="margin:0;">If you didn't request this, you can safely ignore this email.</p>
      </td></tr>
      <tr><td style="padding:12px 32px;font-size:11px;color:#9ca3af;text-align:center;">
        Sent by Cubiqlo — client operations hub
      </td></tr>
    </table>
  </td></tr>
</table>
</body></html>`;
      await sendNotification({
        to: user.email,
        subject: "Reset your Cubiqlo password",
        text:
          `Hi ${user.name ?? ""},\n\n` +
          `We received a request to reset your password.\n\n` +
          `Reset link (expires in 1 hour):\n${resetUrl}\n\n` +
          `If you didn't request this, ignore this email.`,
        html,
        type: "password_reset",
      });
    },
    resetPasswordTokenExpiresIn: 60 * 60, // 1 hour
  },
  emailVerification: {
    sendOnSignUp: true,
    autoSignInAfterVerification: true,
    sendVerificationEmail: async ({ user, url }) => {
      // Redirect to success page after verification instead of home
      let verifyUrl = url;
      if (url.includes("callbackURL=")) {
        verifyUrl = url.replace(
          /callbackURL=[^&]*/,
          "callbackURL=" + encodeURIComponent("/verify-email/success")
        );
      } else {
        const sep = url.includes("?") ? "&" : "?";
        verifyUrl = url + sep + "callbackURL=" + encodeURIComponent("/verify-email/success");
      }
      const html = `<!doctype html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f6f7f9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#1a1d24;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f6f7f9;padding:32px 16px;">
  <tr><td align="center">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border-radius:12px;border:1px solid #e5e7eb;">
      <tr><td style="padding:24px 32px;border-bottom:1px solid #e5e7eb;">
        <div style="font-size:14px;font-weight:600;letter-spacing:.04em;text-transform:uppercase;color:#6b7280;">Cubiqlo</div>
      </td></tr>
      <tr><td style="padding:32px;font-size:15px;line-height:1.6;color:#1a1d24;">
        <h2 style="margin:0 0 16px;font-size:20px;font-weight:600;">Verify your email</h2>
        <p style="margin:0 0 16px;">Hi ${user.name ?? "there"},</p>
        <p style="margin:0 0 24px;">Welcome to Cubiqlo! Verify your email to activate your workspace and start managing clients, invoices, and projects.</p>
        <table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 auto 24px;">
          <tr><td style="border-radius:8px;background:#1a1d24;">
            <a href="${verifyUrl}" target="_blank" style="display:inline-block;padding:12px 32px;font-size:15px;font-weight:600;color:#ffffff;text-decoration:none;">Verify Email</a>
          </td></tr>
        </table>
        <p style="margin:0 0 8px;font-size:13px;color:#6b7280;">If the button doesn't work, copy this link:</p>
        <p style="margin:0;font-size:13px;color:#6b7280;word-break:break-all;">${verifyUrl}</p>
      </td></tr>
      <tr><td style="padding:16px 32px;border-top:1px solid #e5e7eb;font-size:12px;color:#6b7280;text-align:center;">
        <p style="margin:0;">If you didn't sign up, you can safely ignore this email.</p>
      </td></tr>
      <tr><td style="padding:12px 32px;font-size:11px;color:#9ca3af;text-align:center;">
        Sent by Cubiqlo — client operations hub
      </td></tr>
    </table>
  </td></tr>
</table>
</body></html>`;
      await sendNotification({
        to: user.email,
        subject: "Verify your Cubiqlo email",
        text:
          `Hi ${user.name ?? ""},\n\n` +
          `Welcome to Cubiqlo! Verify your email to activate your workspace.\n\n` +
          `Verify link:\n${verifyUrl}\n\n` +
          `If you didn't sign up, ignore this email.`,
        html,
        type: "email_verification",
      });
    },
  },
  secret: resolveBetterAuthSecret(process.env.BETTER_AUTH_SECRET, process.env.NODE_ENV),
  baseURL: process.env.BETTER_AUTH_URL,
  trustedOrigins: [
    process.env.BETTER_AUTH_URL ?? "http://localhost:3000",
    "https://app.cubiqlo.com",
    "http://app.cubiqlo.com",
    "https://cubiqlo.com",
    "http://cubiqlo.com",
    "https://www.cubiqlo.com",
    "http://www.cubiqlo.com",
    "https://admin.cubiqlo.com",
    "http://admin.cubiqlo.com",
    "https://localhost:3000",
    "http://localhost:3000",
    "https://127.0.0.1:3000",
    "http://127.0.0.1:3000",
  ].map((s) => s.replace(/\/$/, "")),
  advanced: {
    cookiePrefix: authEnvironment.cookiePrefix,
    crossSubDomainCookies: authEnvironment.crossSubDomainCookies,
  },
});
