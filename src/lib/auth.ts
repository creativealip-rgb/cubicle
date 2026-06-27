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
    requireEmailVerification: true,
    sendResetPassword: async ({ user, url }) => {
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
            <a href="${url}" target="_blank" style="display:inline-block;padding:12px 32px;font-size:15px;font-weight:600;color:#ffffff;text-decoration:none;">Reset Password</a>
          </td></tr>
        </table>
        <p style="margin:0 0 8px;font-size:13px;color:#6b7280;">If the button doesn't work, copy this link:</p>
        <p style="margin:0;font-size:13px;color:#6b7280;word-break:break-all;">${url}</p>
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
          `Reset link (expires in 1 hour):\n${url}\n\n` +
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
            <a href="${url}" target="_blank" style="display:inline-block;padding:12px 32px;font-size:15px;font-weight:600;color:#ffffff;text-decoration:none;">Verify Email</a>
          </td></tr>
        </table>
        <p style="margin:0 0 8px;font-size:13px;color:#6b7280;">If the button doesn't work, copy this link:</p>
        <p style="margin:0;font-size:13px;color:#6b7280;word-break:break-all;">${url}</p>
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
          `Verify link:\n${url}\n\n` +
          `If you didn't sign up, ignore this email.`,
        html,
        type: "email_verification",
      });
    },
  },
  secret: process.env.BETTER_AUTH_SECRET ?? "dev-build-placeholder-secret-change-me",
  baseURL: process.env.BETTER_AUTH_URL,
  trustedOrigins: [
    process.env.BETTER_AUTH_URL ?? "http://localhost:3000",
    "https://cubiqlo.com",
    "http://cubiqlo.com",
    "https://www.cubiqlo.com",
    "http://www.cubiqlo.com",
    "https://localhost:3000",
    "http://localhost:3000",
    "https://127.0.0.1:3000",
    "http://127.0.0.1:3000",
  ].map((s) => s.replace(/\/$/, "")),
});
