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
  idempotencyKey?: string;
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
      ...(opts.idempotencyKey ? { headers: { "Idempotency-Key": opts.idempotencyKey } } : {}),
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
  calendarUrl?: string;
  notes?: string | null;
  hostEmail?: string;
}) {
  const readableDateTime = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Jakarta",
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZoneName: "short",
  }).format(new Date(opts.dateTime));

  // 1. Email konfirmasi ke Klien (Attendee)
  const clientText =
    `Hi ${opts.attendeeName},\n\n` +
    `Your appointment "${opts.appointmentTitle}" has been scheduled for ${readableDateTime}` +
    (opts.workspaceName ? ` with ${opts.workspaceName}` : "") +
    `.\n\nWe look forward to meeting with you!` +
    (opts.calendarUrl ? `\n\nAdd to Google Calendar: ${opts.calendarUrl}` : "");

  const calendarHtml = opts.calendarUrl
    ? `<p style="margin:24px 0 0;"><a href="${escapeHtml(opts.calendarUrl)}" style="display:inline-block;background:#2563eb;color:#fff;padding:10px 16px;border-radius:6px;text-decoration:none;font-weight:600;">Add to Google Calendar</a></p>`
    : "";

  const clientPromise = sendNotification({
    to: opts.attendeeEmail,
    subject: `Appointment Confirmed: ${opts.appointmentTitle}`,
    text: clientText,
    html: wrapTemplate({ title: `Appointment Confirmed: ${opts.appointmentTitle}`, bodyHtml: `<p style="margin:0;">${escapeHtml(clientText).replace(/\n/g, "<br>")}</p>${calendarHtml}` }),
    type: "appointment_booked",
    replyTo: opts.replyTo,
  });

  // 2. Email notifikasi ke Host / Owner Cubiqlo
  let hostPromise: Promise<unknown> = Promise.resolve();
  if (opts.hostEmail && opts.hostEmail.includes("@")) {
    const wsName = opts.workspaceName || "Cubiqlo";
    const hostText =
      `Halo,\n\n` +
      `Ada jadwal appointment baru yang telah dibooking oleh klien!\n\n` +
      `Detail Appointment:\n` +
      `- Judul: ${opts.appointmentTitle}\n` +
      `- Nama Klien: ${opts.attendeeName}\n` +
      `- Email Klien: ${opts.attendeeEmail}\n` +
      `- Waktu Pertemuan: ${readableDateTime}\n` +
      (opts.notes ? `- Catatan / Keperluan: ${opts.notes}\n` : "") +
      `\nBuka kalender untuk melihat jadwal:\nhttps://app.cubiqlo.com/app/calendar\n\n` +
      (opts.calendarUrl ? `Tambahkan ke Google Calendar: ${opts.calendarUrl}\n\n` : "") +
      `Salam,\n${wsName} Notification`;

    const hostHtml =
      `<div style="font-family:sans-serif;line-height:1.5;color:#1e293b;">` +
      `<h2 style="margin:0 0 16px;color:#0f172a;font-size:18px;">📅 Appointment Baru Diterima</h2>` +
      `<p style="margin:0 0 16px;">Klien <strong>${escapeHtml(opts.attendeeName)}</strong> telah memesan jadwal meeting dengan Anda.</p>` +
      `<div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:16px;margin:0 0 20px;">` +
      `<p style="margin:0 0 8px;"><strong>Judul:</strong> ${escapeHtml(opts.appointmentTitle)}</p>` +
      `<p style="margin:0 0 8px;"><strong>Nama Klien:</strong> ${escapeHtml(opts.attendeeName)} (${escapeHtml(opts.attendeeEmail)})</p>` +
      `<p style="margin:0 0 8px;"><strong>Waktu:</strong> <span style="color:#2563eb;font-weight:600;">${escapeHtml(readableDateTime)}</span></p>` +
      (opts.notes ? `<p style="margin:0;"><strong>Catatan:</strong> ${escapeHtml(opts.notes)}</p>` : "") +
      `</div>` +
      `<div style="margin:24px 0 0;display:flex;gap:12px;">` +
      `<a href="https://app.cubiqlo.com/app/calendar" style="display:inline-block;background:#0f172a;color:#fff;padding:10px 18px;border-radius:6px;text-decoration:none;font-weight:600;font-size:13px;">Buka Kalender Cubiqlo</a>` +
      (opts.calendarUrl ? ` &nbsp; <a href="${escapeHtml(opts.calendarUrl)}" style="display:inline-block;background:#2563eb;color:#fff;padding:10px 18px;border-radius:6px;text-decoration:none;font-weight:600;font-size:13px;">Sync ke Google Calendar</a>` : "") +
      `</div>` +
      `</div>`;

    hostPromise = sendNotification({
      to: opts.hostEmail,
      subject: `[Jadwal Baru] ${opts.attendeeName} memesan "${opts.appointmentTitle}" (${readableDateTime})`,
      text: hostText,
      html: wrapTemplate({ title: `Jadwal Baru: ${opts.appointmentTitle}`, bodyHtml: hostHtml }),
      type: "appointment_booked",
      replyTo: opts.attendeeEmail,
    });
  }

  const [clientRes] = await Promise.all([clientPromise, hostPromise]);
  return clientRes;
}

export async function notifyAppointmentCancelled(opts: {
  attendeeEmail: string;
  attendeeName: string | null;
  appointmentTitle: string;
  dateTime: string;
  replyTo?: string;
  hostEmail?: string;
  workspaceName?: string;
}) {
  const readableDateTime = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Jakarta",
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZoneName: "short",
  }).format(new Date(opts.dateTime));

  const clientText =
    `Hi ${opts.attendeeName ?? "there"},\n\n` +
    `Your appointment "${opts.appointmentTitle}" scheduled for ${readableDateTime} has been cancelled.\n\n` +
    `If this was a mistake, please book a new slot.`;

  const clientPromise = sendNotification({
    to: opts.attendeeEmail,
    subject: `Appointment Cancelled: ${opts.appointmentTitle}`,
    text: clientText,
    type: "appointment_cancelled",
    replyTo: opts.replyTo,
  });

  let hostPromise: Promise<unknown> = Promise.resolve();
  if (opts.hostEmail && opts.hostEmail.includes("@")) {
    const hostText =
      `Halo,\n\n` +
      `Jadwal appointment "${opts.appointmentTitle}" bersama ${opts.attendeeName ?? opts.attendeeEmail} untuk ${readableDateTime} telah dibatalkan.\n\n` +
      `Buka dashboard kalender:\nhttps://app.cubiqlo.com/app/calendar`;

    hostPromise = sendNotification({
      to: opts.hostEmail,
      subject: `[Dibatalkan] Jadwal appointment "${opts.appointmentTitle}" dibatalkan`,
      text: hostText,
      type: "appointment_cancelled",
    });
  }

  const [clientRes] = await Promise.all([clientPromise, hostPromise]);
  return clientRes;
}

export async function notifyProposalAccepted(opts: {
  hostEmail: string;
  clientName: string;
  clientEmail?: string | null;
  proposalTitle: string;
  proposalId: string;
  totalAmount: string;
  currency?: string;
  downPaymentAmount?: number;
  workspaceName?: string;
}) {
  const wsName = opts.workspaceName || "Cubiqlo";
  const currency = opts.currency || "IDR";
  const formattedTotal = `${currency} ${Number(opts.totalAmount || 0).toLocaleString("en-US")}`;
  const formattedDp = opts.downPaymentAmount
    ? `${currency} ${Number(opts.downPaymentAmount).toLocaleString("en-US")}`
    : null;

  // English default + Indonesian bilingual structure
  const text =
    `Hello,\n\n` +
    `Great news! Your proposal "${opts.proposalTitle}" has been accepted by ${opts.clientName} (${opts.clientEmail || "-"}).\n\n` +
    `Proposal Summary:\n` +
    `- Title: ${opts.proposalTitle}\n` +
    `- Client: ${opts.clientName}\n` +
    `- Total Value: ${formattedTotal}\n` +
    (formattedDp ? `- Down Payment: ${formattedDp}\n` : "") +
    `- Accepted Date: ${new Date().toLocaleDateString("en-US", { dateStyle: "long" })}\n\n` +
    `View proposal details in your dashboard:\n` +
    `https://app.cubiqlo.com/app/proposals/${opts.proposalId}\n\n` +
    `---\n` +
    `Kabar baik! Proposal "${opts.proposalTitle}" Anda telah disetujui oleh klien ${opts.clientName}. Project baru dan draft invoice DP otomatis dibuatkan di workspace Anda.\n\n` +
    `Best regards,\n${wsName} Notification`;

  const html =
    `<div style="font-family:sans-serif;line-height:1.5;color:#1e293b;">` +
    `<div style="display:inline-block;background:#ecfdf5;border:1px solid #a7f3d0;color:#065f46;font-size:12px;font-weight:700;padding:4px 10px;border-radius:20px;margin-bottom:12px;text-transform:uppercase;letter-spacing:0.05em;">✓ Proposal Accepted / Disetujui</div>` +
    `<h2 style="margin:0 0 14px;color:#0f172a;font-size:18px;">Proposal "${escapeHtml(opts.proposalTitle)}" has been accepted!</h2>` +
    `<p style="margin:0 0 16px;color:#334155;font-size:14px;"><strong>${escapeHtml(opts.clientName)}</strong> has reviewed and accepted your proposal. A new project workspace and down payment invoice have been initialized automatically.</p>` +
    `<div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:16px;margin:0 0 20px;">` +
    `<p style="margin:0 0 8px;font-size:13px;"><strong>Proposal:</strong> ${escapeHtml(opts.proposalTitle)}</p>` +
    `<p style="margin:0 0 8px;font-size:13px;"><strong>Client:</strong> ${escapeHtml(opts.clientName)} ${opts.clientEmail ? `(${escapeHtml(opts.clientEmail)})` : ""}</p>` +
    `<p style="margin:0 0 8px;font-size:13px;"><strong>Total Value:</strong> <span style="color:#059669;font-weight:700;">${escapeHtml(formattedTotal)}</span></p>` +
    (formattedDp ? `<p style="margin:0 0 8px;font-size:13px;"><strong>Down Payment:</strong> <span style="color:#2563eb;font-weight:600;">${escapeHtml(formattedDp)}</span></p>` : "") +
    `<p style="margin:0;font-size:13px;"><strong>Accepted On:</strong> ${escapeHtml(new Date().toLocaleDateString("en-US", { dateStyle: "long" }))}</p>` +
    `</div>` +
    `<div style="margin:20px 0 0;">` +
    `<a href="https://app.cubiqlo.com/app/proposals/${encodeURIComponent(opts.proposalId)}" style="display:inline-block;background:#059669;color:#ffffff;padding:10px 18px;border-radius:6px;text-decoration:none;font-weight:600;font-size:13px;">Open Proposal in Dashboard</a>` +
    `</div>` +
    `</div>`;

  return sendNotification({
    to: opts.hostEmail,
    subject: `[Accepted] Proposal "${opts.proposalTitle}" accepted by ${opts.clientName}`,
    text,
    html: wrapTemplate({ title: `Proposal Accepted: ${opts.proposalTitle}`, bodyHtml: html }),
    type: "proposal_accepted",
    replyTo: opts.clientEmail || undefined,
  });
}

export async function notifyContractSigned(opts: {
  hostEmail: string;
  clientEmail?: string | null;
  clientName: string;
  contractTitle: string;
  contractNumber?: string | null;
  contractId: string;
  signedName: string;
  signedEmail: string;
  workspaceName?: string;
}) {
  const wsName = opts.workspaceName || "Cubiqlo";
  const numDisplay = opts.contractNumber ? `(${opts.contractNumber})` : "";

  // English default + Indonesian bilingual structure
  const text =
    `Hello,\n\n` +
    `Great news! Contract "${opts.contractTitle}" ${numDisplay} has been digitally signed by ${opts.signedName} (${opts.signedEmail}).\n\n` +
    `Contract Summary:\n` +
    `- Title: ${opts.contractTitle}\n` +
    (opts.contractNumber ? `- Number: ${opts.contractNumber}\n` : "") +
    `- Signer Name: ${opts.signedName}\n` +
    `- Signer Email: ${opts.signedEmail}\n` +
    `- Signed Date: ${new Date().toLocaleDateString("en-US", { dateStyle: "long" })}\n\n` +
    `View contract audit trail and signed document:\n` +
    `https://app.cubiqlo.com/app/contracts/${opts.contractId}\n\n` +
    `---\n` +
    `Kabar baik! Kontrak "${opts.contractTitle}" telah ditandatangani secara digital oleh ${opts.signedName}. Dokumen ini sekarang resmi dan terkunci.\n\n` +
    `Best regards,\n${wsName} Notification`;

  const html =
    `<div style="font-family:sans-serif;line-height:1.5;color:#1e293b;">` +
    `<div style="display:inline-block;background:#ecfdf5;border:1px solid #a7f3d0;color:#065f46;font-size:12px;font-weight:700;padding:4px 10px;border-radius:20px;margin-bottom:12px;text-transform:uppercase;letter-spacing:0.05em;">✓ Contract Signed / Ditandatangani</div>` +
    `<h2 style="margin:0 0 14px;color:#0f172a;font-size:18px;">Contract "${escapeHtml(opts.contractTitle)}" has been digitally signed!</h2>` +
    `<p style="margin:0 0 16px;color:#334155;font-size:14px;"><strong>${escapeHtml(opts.signedName)}</strong> (${escapeHtml(opts.signedEmail)}) has digitally signed contract <strong>${escapeHtml(opts.contractTitle)}</strong> ${opts.contractNumber ? `(${escapeHtml(opts.contractNumber)})` : ""}.</p>` +
    `<div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:16px;margin:0 0 20px;">` +
    `<p style="margin:0 0 8px;font-size:13px;"><strong>Contract:</strong> ${escapeHtml(opts.contractTitle)} ${opts.contractNumber ? `(${escapeHtml(opts.contractNumber)})` : ""}</p>` +
    `<p style="margin:0 0 8px;font-size:13px;"><strong>Signer:</strong> ${escapeHtml(opts.signedName)} (${escapeHtml(opts.signedEmail)})</p>` +
    `<p style="margin:0;font-size:13px;"><strong>Signed On:</strong> ${escapeHtml(new Date().toLocaleDateString("en-US", { dateStyle: "long" }))}</p>` +
    `</div>` +
    `<div style="margin:20px 0 0;">` +
    `<a href="https://app.cubiqlo.com/app/contracts/${encodeURIComponent(opts.contractId)}" style="display:inline-block;background:#2563eb;color:#ffffff;padding:10px 18px;border-radius:6px;text-decoration:none;font-weight:600;font-size:13px;">View Signed Contract</a>` +
    `</div>` +
    `</div>`;

  return sendNotification({
    to: opts.hostEmail,
    subject: `[Signed] Contract "${opts.contractTitle}" signed by ${opts.signedName}`,
    text,
    html: wrapTemplate({ title: `Contract Signed: ${opts.contractTitle}`, bodyHtml: html }),
    type: "contract_signed",
    replyTo: opts.signedEmail || undefined,
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
