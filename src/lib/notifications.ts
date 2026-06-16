// MVP: Log notifications to console. Replace with Resend/SendGrid later.

export async function sendNotification(opts: {
  to: string;
  subject: string;
  body: string;
  type?: string;
}) {
  console.log(`\n📧 [NOTIFICATION] To: ${opts.to} | Subject: ${opts.subject}`);
  console.log(`   Type: ${opts.type ?? "general"}`);
  console.log(`   Body: ${opts.body.substring(0, 200)}${opts.body.length > 200 ? "..." : ""}\n`);
  return { success: true };
}

// ─── Convenience wrappers for key events ───

export async function notifyAppointmentBooked(opts: {
  attendeeEmail: string;
  attendeeName: string;
  appointmentTitle: string;
  dateTime: string;
}) {
  return sendNotification({
    to: opts.attendeeEmail,
    subject: `Appointment Confirmed: ${opts.appointmentTitle}`,
    body: `Hi ${opts.attendeeName},\n\nYour appointment "${opts.appointmentTitle}" has been scheduled for ${opts.dateTime}.\n\nWe look forward to meeting with you!`,
    type: "appointment_booked",
  });
}

export async function notifyInvoiceViewed(opts: {
  clientEmail: string;
  invoiceNumber: string;
}) {
  return sendNotification({
    to: opts.clientEmail,
    subject: `Invoice ${opts.invoiceNumber} has been viewed`,
    body: `Your invoice ${opts.invoiceNumber} has been viewed by the client.`,
    type: "invoice_viewed",
  });
}

export async function notifyPortalComment(opts: {
  workspaceEmail: string;
  clientName: string;
  entityType: string;
}) {
  return sendNotification({
    to: opts.workspaceEmail,
    subject: `New portal comment from ${opts.clientName}`,
    body: `${opts.clientName} left a new comment on a ${opts.entityType} via the client portal.`,
    type: "portal_comment",
  });
}

export async function notifyWorkspaceInvite(opts: {
  email: string;
  workspaceName: string;
  inviterName: string;
}) {
  return sendNotification({
    to: opts.email,
    subject: `${opts.inviterName} invited you to ${opts.workspaceName}`,
    body: `Hi,\n\n${opts.inviterName} has invited you to join the "${opts.workspaceName}" workspace on Cubicle.\n\nPlease log in to accept the invitation.`,
    type: "workspace_invite",
  });
}
