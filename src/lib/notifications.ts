// Notifications — Resend-backed with console fallback when API key missing.
// Set RESEND_API_KEY in env to enable. Set EMAIL_FROM to override sender
// (default: Cubiqlo <onboarding@resend.dev> until you verify a domain).

import { Resend } from "resend";

type SendOpts = {
  to: string;
  subject: string;
  html?: string;
  text?: string;
  type?: string;
  replyTo?: string;
};

const apiKey = process.env.RESEND_API_KEY;
const fromAddress = process.env.EMAIL_FROM ?? "Cubiqlo <onboarding@resend.dev>";
const appUrl = process.env.APP_URL ?? process.env.BETTER_AUTH_URL ?? "https://cubiqlo.com";
const brandLogoUrl = `${appUrl.replace(/\/$/, "")}/logo-icon.png`;

const resend = apiKey ? new Resend(apiKey) : null;

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function wrapTemplate(opts: { title: string; bodyHtml: string }): string {
  return `<!doctype html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escapeHtml(opts.title)}</title></head>
<body style="margin:0;padding:0;background:#f6f7f9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#1a1d24;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f6f7f9;padding:32px 16px;">
  <tr><td align="center">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border-radius:12px;border:1px solid #e5e7eb;">
      <tr><td style="padding:24px 32px;border-bottom:1px solid #e5e7eb;">
        <table role="presentation" cellpadding="0" cellspacing="0" style="width:100%;">
          <tr>
            <td style="width:48px;vertical-align:middle;">
              <img src="${brandLogoUrl}" width="40" height="40" alt="Cubiqlo" style="display:block;border-radius:10px;object-fit:cover;">
            </td>
            <td style="vertical-align:middle;">
              <div style="font-size:14px;font-weight:700;letter-spacing:.04em;text-transform:uppercase;color:#111827;">Cubiqlo</div>
              <div style="font-size:12px;color:#6b7280;margin-top:2px;">Client operations hub</div>
            </td>
          </tr>
        </table>
      </td></tr>
      <tr><td style="padding:32px;font-size:15px;line-height:1.6;color:#1a1d24;">${opts.bodyHtml}</td></tr>
      <tr><td style="padding:16px 32px;border-top:1px solid #e5e7eb;font-size:12px;color:#6b7280;text-align:center;">
        Sent by Cubiqlo — client operations hub
      </td></tr>
    </table>
  </td></tr>
</table>
</body></html>`;
}

export async function sendNotification(opts: SendOpts) {
  const text = opts.text ?? "";
  const html = opts.html ?? wrapTemplate({
    title: opts.subject,
    bodyHtml: `<p style="margin:0;">${escapeHtml(text).replace(/\n/g, "<br>")}</p>`,
  });

  if (!resend) {
    console.log(
      `\n📧 [NOTIFY-DEV ${opts.type ?? "general"}] To: ${opts.to} | Subject: ${opts.subject}\n   ${text.split("\n").join("\n   ")}\n`
    );
    return { success: true, fallback: "console" as const };
  }

  try {
    const result = await resend.emails.send({
      from: fromAddress,
      to: opts.to,
      subject: opts.subject,
      html,
      text,
      ...(opts.replyTo ? { replyTo: [opts.replyTo] } : {}),
    });
    if ((result as { error?: unknown }).error) {
      console.error(`[NOTIFY-FAIL ${opts.type}] Resend error:`, (result as { error: unknown }).error);
      return { success: false, error: (result as { error: unknown }).error };
    }
    return { success: true, id: (result as { data?: { id?: string } }).data?.id };
  } catch (err) {
    console.error(`[NOTIFY-EXCEPTION ${opts.type}]`, err);
    return { success: false, error: err };
  }
}

// ─── Convenience wrappers ───

export async function notifyAppointmentBooked(opts: {
  attendeeEmail: string;
  attendeeName: string;
  appointmentTitle: string;
  dateTime: string;
  workspaceName?: string;
  replyTo?: string;
}) {
  const text =
    `Hi ${opts.attendeeName},\n\n` +
    `Your appointment "${opts.appointmentTitle}" has been scheduled for ${opts.dateTime}` +
    (opts.workspaceName ? ` with ${opts.workspaceName}` : "") +
    `.\n\nWe look forward to meeting with you!`;
  return sendNotification({
    to: opts.attendeeEmail,
    subject: `Appointment Confirmed: ${opts.appointmentTitle}`,
    text,
    type: "appointment_booked",
    replyTo: opts.replyTo,
  });
}

export async function notifyAppointmentCancelled(opts: {
  attendeeEmail: string;
  attendeeName: string | null;
  appointmentTitle: string;
  dateTime: string;
  replyTo?: string;
}) {
  return sendNotification({
    to: opts.attendeeEmail,
    subject: `Appointment Cancelled: ${opts.appointmentTitle}`,
    text:
      `Hi ${opts.attendeeName ?? "there"},\n\n` +
      `Your appointment "${opts.appointmentTitle}" scheduled for ${opts.dateTime} has been cancelled.\n\n` +
      `If this was a mistake, please book a new slot.`,
    type: "appointment_cancelled",
    replyTo: opts.replyTo,
  });
}

function applyInvoiceEmailTemplate(
  template: string,
  vars: Record<string, string>,
) {
  return template.replace(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g, (_, key: string) => {
    return vars[key] ?? "";
  });
}

export async function notifyInvoiceSent(opts: {
  clientEmail: string;
  clientName: string;
  invoiceNumber: string;
  amount: string;
  portalUrl: string;
  workspaceName?: string;
  replyTo?: string;
  projectName?: string;
  dueDate?: string | null;
  customBody?: string | null;
  detailReportUrl?: string | null;
}) {
  const vars = {
    client_name: opts.clientName,
    invoice_number: opts.invoiceNumber,
    project_name: opts.projectName ?? "",
    amount: opts.amount,
    due_date: opts.dueDate ?? "",
    invoice_link: opts.portalUrl,
    detail_report_link: opts.detailReportUrl ?? "",
    workspace_name: opts.workspaceName ?? "Cubiqlo",
  };

  const defaultText =
    `Hi ${opts.clientName},\n\n` +
    `Invoice ${opts.invoiceNumber} for ${opts.amount} is ready.\n\n` +
    `Download / view PDF invoice:\n${opts.portalUrl}\n\n` +
    `Thank you for your business.`;

  const baseText = opts.customBody?.trim()
    ? applyInvoiceEmailTemplate(opts.customBody, vars)
    : defaultText;
  const text = opts.detailReportUrl && !baseText.includes(opts.detailReportUrl)
    ? `${baseText}\n\nDetail report:\n${opts.detailReportUrl}`
    : baseText;

  return sendNotification({
    to: opts.clientEmail,
    subject: `Invoice ${opts.invoiceNumber} from ${opts.workspaceName ?? "Cubiqlo"}`,
    text,
    type: "invoice_sent",
    replyTo: opts.replyTo,
  });
}

export async function notifyInvoicePaymentReminder(opts: {
  clientEmail: string;
  clientName: string;
  invoiceNumber: string;
  amount: string;
  dueDate?: string | null;
  portalUrl: string;
  workspaceName?: string;
  replyTo?: string;
}) {
  const dueLine = opts.dueDate ? `This invoice was due on ${opts.dueDate}.\n\n` : "";
  return sendNotification({
    to: opts.clientEmail,
    subject: `Payment reminder: Invoice ${opts.invoiceNumber}`,
    text:
      `Hi ${opts.clientName},\n\n` +
      `Friendly reminder that invoice ${opts.invoiceNumber} for ${opts.amount} is still unpaid.\n\n` +
      dueLine +
      `Download / view PDF invoice:\n${opts.portalUrl}\n\n` +
      `If you've already paid, please ignore this email.`,
    type: "invoice_payment_reminder",
    replyTo: opts.replyTo,
  });
}

export async function notifyInvoiceViewed(opts: {
  workspaceEmail: string;
  invoiceNumber: string;
  clientName?: string;
}) {
  return sendNotification({
    to: opts.workspaceEmail,
    subject: `Invoice ${opts.invoiceNumber} has been viewed`,
    text:
      `Your invoice ${opts.invoiceNumber}` +
      (opts.clientName ? ` was viewed by ${opts.clientName}` : ` has been viewed`) +
      `.`,
    type: "invoice_viewed",
  });
}

export async function notifyPortalComment(opts: {
  workspaceEmail: string;
  clientName: string;
  entityType: string;
  entityTitle?: string;
  commentPreview?: string;
}) {
  return sendNotification({
    to: opts.workspaceEmail,
    subject: `New portal comment from ${opts.clientName}`,
    text:
      `${opts.clientName} left a new comment on a ${opts.entityType}` +
      (opts.entityTitle ? ` (${opts.entityTitle})` : "") +
      ` via the client portal.\n\n` +
      (opts.commentPreview ? `Preview: "${opts.commentPreview}"\n\n` : "") +
      `Sign in to respond.`,
    type: "portal_comment",
  });
}

export async function notifyWorkspaceInvite(opts: {
  email: string;
  workspaceName: string;
  inviterName: string;
  inviteUrl: string;
  replyTo?: string;
}) {
  return sendNotification({
    to: opts.email,
    subject: `${opts.inviterName} invited you to ${opts.workspaceName}`,
    text:
      `Hi,\n\n` +
      `${opts.inviterName} has invited you to join the "${opts.workspaceName}" workspace on Cubiqlo.\n\n` +
      `Accept the invitation: ${opts.inviteUrl}`,
    type: "workspace_invite",
    replyTo: opts.replyTo,
  });
}

export async function notifyTaskAssigned(opts: {
  assigneeEmail: string;
  assigneeName: string;
  taskTitle: string;
  taskId: string;
  assignerName: string;
  dueDate?: string | null;
}) {
  return sendNotification({
    to: opts.assigneeEmail,
    subject: `You were assigned: ${opts.taskTitle}`,
    text:
      `Hi ${opts.assigneeName},\n\n` +
      `${opts.assignerName} assigned you a new task: "${opts.taskTitle}".\n\n` +
      (opts.dueDate ? `Due: ${opts.dueDate}\n\n` : ``) +
      `Open in Cubiqlo: /app/tasks?assignee=me`,
    type: "task_assigned",
  });
}
