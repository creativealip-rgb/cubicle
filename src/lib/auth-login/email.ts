import { sendNotification } from "@/lib/notifications";

export async function sendLoginOtpEmail({
  email,
  code,
}: {
  email: string;
  code: string;
}) {
  const result = await sendNotification({
    to: email,
    subject: "Kode login Cubiqlo",
    type: "login_otp",
    text: `Kode login Cubiqlo kamu: ${code}\n\nKode berlaku 10 menit. Jangan bagikan kode ini.`,
    idempotencyKey: `login-otp-${email}-${Date.now()}`,
  });
  if (!result.success) throw new Error("OTP delivery failed");
}
