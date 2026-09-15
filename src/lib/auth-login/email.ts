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
    subject: "Your Cubiqlo login code",
    type: "login_otp",
    text: `Your Cubiqlo login code: ${code}\n\nThis code expires in 10 minutes. Do not share it with anyone.`,
    idempotencyKey: `login-otp-${email}-${Date.now()}`,
  });
  if (!result.success) throw new Error("OTP delivery failed");
}
