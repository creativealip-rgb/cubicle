import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  Font,
  Image,
  Link,
} from "@react-pdf/renderer";

Font.register({
  family: "Inter",
  fonts: [
    {
      src: "https://fonts.gstatic.com/s/inter/v18/UcCO3FwrK3iLTeHuS_nVMrMxCp50SjIw2boKoduKmMEVuLyfMZhrib2Bg-4.ttf",
      fontWeight: 400,
    },
    {
      src: "https://fonts.gstatic.com/s/inter/v18/UcCO3FwrK3iLTeHuS_nVMrMxCp50SjIw2boKoduKmMEVuFuYMZhrib2Bg-4.ttf",
      fontWeight: 700,
    },
  ],
});

const ACCENT = "#6366f1";
const ACCENT_DARK = "#4f46e5";
const ACCENT_SOFT = "#eef2ff";
const TEXT = "#1e293b";
const MUTED = "#64748b";
const SUBTLE = "#94a3b8";
const BORDER = "#e2e8f0";
const STATUS_STYLES: Record<string, { bg: string; fg: string; label: string }> = {
  draft: { bg: "#f1f5f9", fg: "#475569", label: "DRAFT" },
  sent: { bg: "#dbeafe", fg: "#1e40af", label: "SENT" },
  viewed: { bg: "#fef3c7", fg: "#92400e", label: "VIEWED" },
  paid: { bg: "#dcfce7", fg: "#166534", label: "PAID" },
  overdue: { bg: "#fee2e2", fg: "#991b1b", label: "OVERDUE" },
  cancelled: { bg: "#e5e7eb", fg: "#374151", label: "CANCELLED" },
};

const styles = StyleSheet.create({
  page: {
    padding: 44,
    paddingBottom: 66, // leave room for footer
    fontFamily: "Inter",
    fontSize: 10,
    color: TEXT,
  },
  // Header
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 28,
    marginTop: 0,
    paddingBottom: 18,
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
  },
  brandBlock: { flexDirection: "row", alignItems: "center", flex: 1 },
  logo: { width: 48, height: 48, marginRight: 12, borderRadius: 8 },
  logoFallback: {
    width: 48,
    height: 48,
    marginRight: 12,
    borderRadius: 10,
    backgroundColor: ACCENT,
    alignItems: "center",
    justifyContent: "center",
  },
  logoFallbackText: { color: "#ffffff", fontSize: 18, fontWeight: 700 },
  companyName: {
    fontSize: 18,
    fontWeight: 700,
    color: "#0f172a",
    marginBottom: 2,
  },
  companyAddress: {
    fontSize: 9,
    color: MUTED,
    maxWidth: 240,
    lineHeight: 1.4,
  },
  invoiceMeta: { alignItems: "flex-end" },
  invoiceTitle: {
    fontSize: 28,
    fontWeight: 700,
    color: "#0f172a",
    letterSpacing: 2,
    marginBottom: 6,
  },
  invoiceNumber: {
    fontSize: 13,
    fontWeight: 700,
    color: ACCENT_DARK,
    marginBottom: 6,
  },
  statusBadge: {
    fontSize: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
    fontWeight: 700,
    letterSpacing: 1,
  },
  // Info row (issue / due / status)
  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 24,
    padding: 14,
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 10,
    backgroundColor: "#ffffff",
  },
  infoLabel: {
    fontSize: 8,
    color: MUTED,
    fontWeight: 700,
    textTransform: "uppercase",
    letterSpacing: 0.6,
    marginBottom: 3,
  },
  infoValue: { fontSize: 10, color: TEXT, fontWeight: 700 },
  // Bill To
  billToSection: { marginBottom: 20, padding: 14, borderWidth: 1, borderColor: BORDER, borderRadius: 10 },
  billToTitle: {
    fontSize: 8,
    fontWeight: 700,
    color: MUTED,
    textTransform: "uppercase",
    letterSpacing: 0.6,
    marginBottom: 4,
  },
  clientName: {
    fontSize: 13,
    fontWeight: 700,
    color: "#0f172a",
    marginBottom: 2,
  },
  clientAddress: { fontSize: 9, color: "#475569", lineHeight: 1.4 },
  // Table
  table: { marginBottom: 20 },
  tableHeader: {
    flexDirection: "row",
    backgroundColor: "#f1f5f9",
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
    borderTopWidth: 1,
    borderTopColor: BORDER,
    paddingVertical: 9,
    borderTopLeftRadius: 8,
    borderTopRightRadius: 8,
  },
  tableRow: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: "#f1f5f9",
    paddingVertical: 8,
  },
  tableRowAlt: { backgroundColor: "#fafbfc" },
  colDesc: { flex: 3, paddingHorizontal: 8 },
  colQty: { flex: 0.8, paddingHorizontal: 8, textAlign: "right" },
  colRate: { flex: 1.2, paddingHorizontal: 8, textAlign: "right" },
  colAmount: { flex: 1.2, paddingHorizontal: 8, textAlign: "right" },
  headerText: {
    fontSize: 8,
    fontWeight: 700,
    color: MUTED,
    textTransform: "uppercase",
    letterSpacing: 0.6,
  },
  cellText: { fontSize: 9, color: "#334155", lineHeight: 1.4 },
  // Totals
  totalsSection: { alignItems: "flex-end", marginBottom: 24 },
  totalRow: {
    flexDirection: "row",
    justifyContent: "flex-end",
    marginBottom: 4,
    width: "55%",
  },
  totalLabel: {
    fontSize: 9,
    color: MUTED,
    flex: 1,
    textAlign: "right",
    paddingRight: 16,
  },
  totalValue: {
    fontSize: 10,
    color: TEXT,
    width: 90,
    textAlign: "right",
  },
  totalValueBold: {
    fontSize: 15,
    fontWeight: 700,
    color: ACCENT_DARK,
    width: 90,
    textAlign: "right",
  },
  totalBorder: {
    borderTopWidth: 1,
    borderTopColor: BORDER,
    paddingTop: 6,
    marginTop: 4,
  },
  // Notes & terms
  notesSection: {
    marginTop: 20,
    borderTopWidth: 1,
    borderTopColor: BORDER,
    paddingTop: 14,
  },
  paymentBox: {
    marginTop: 4,
    marginBottom: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: "#c7d2fe",
    borderRadius: 10,
    backgroundColor: ACCENT_SOFT,
  },
  notesTitle: {
    fontSize: 8,
    fontWeight: 700,
    color: MUTED,
    textTransform: "uppercase",
    letterSpacing: 0.6,
    marginBottom: 4,
  },
  notes: { fontSize: 9, color: "#475569", lineHeight: 1.5 },
  detailReportUnderDesc: {
    marginTop: 6,
    marginBottom: 16,
    paddingHorizontal: 8,
  },
  detailReportLabel: {
    fontSize: 8,
    fontWeight: 700,
    color: MUTED,
    textTransform: "uppercase",
    letterSpacing: 0.6,
    marginBottom: 2,
  },
  detailReportLink: {
    fontSize: 8,
    color: ACCENT_DARK,
    textDecoration: "underline",
    lineHeight: 1.4,
  },
  // Footer
  footer: {
    position: "absolute",
    bottom: 24,
    left: 48,
    right: 48,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: BORDER,
    fontSize: 8,
    color: SUBTLE,
  },
  footerLeft: { fontWeight: 700, color: MUTED, letterSpacing: 0.4 },
  thankYou: { fontSize: 11, fontWeight: 700, color: ACCENT_DARK, marginBottom: 8 },
});

function formatCurrency(amount: number | string, currency: string): string {
  const num = typeof amount === "string" ? Number(amount) : amount;
  if (!Number.isFinite(num)) return "-";
  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: currency || "USD",
    }).format(num);
  } catch {
    return `${currency} ${num.toFixed(2)}`;
  }
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return "-";
  return new Date(dateStr).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

interface InvoicePDFProps {
  invoice: {
    invoiceNumber: string;
    issueDate: string;
    dueDate: string | null;
    currency: string;
    subtotal: string;
    tax: string;
    discount: string;
    total: string;
    status: string;
    notes: string | null;
    terms: string | null;
  };
  workspace: {
    billingName: string | null;
    billingAddress: string | null;
    billingEmail: string | null;
    billingPhone: string | null;
    taxId: string | null;
    logoUrl: string | null;
    defaultInvoiceTerms?: string | null;
  };
  client: {
    name: string;
    companyName: string | null;
    address: string | null;
  };
  items: Array<{
    id: string;
    description: string;
    quantity: string;
    unitPrice: string;
    amount: string;
  }>;
  timesheetReportUrl?: string | null;
}

export function InvoicePDF({
  invoice,
  workspace,
  client,
  items,
  timesheetReportUrl,
}: InvoicePDFProps) {
  const companyName = workspace.billingName || "Cubiqlo";
  const initials = companyName.slice(0, 2).toUpperCase();
  const sub = Number(invoice.subtotal);
  const tax = Number(invoice.tax);
  const discount = Number(invoice.discount);
  const total = Number(invoice.total);
  const statusStyle = STATUS_STYLES[invoice.status] ?? STATUS_STYLES.draft;

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header — plain white, no accent band */}
        <View style={styles.header}>
          <View style={styles.brandBlock}>
            {workspace.logoUrl ? (
              // eslint-disable-next-line jsx-a11y/alt-text -- @react-pdf/renderer Image has no alt prop API
              <Image src={workspace.logoUrl} style={styles.logo} />
            ) : (
              <View style={styles.logoFallback}>
                <Text style={styles.logoFallbackText}>{initials}</Text>
              </View>
            )}
            <View style={{ flex: 1 }}>
              <Text style={styles.companyName}>
                {companyName}
              </Text>
              {workspace.billingAddress && (
                <Text style={styles.companyAddress}>{workspace.billingAddress}</Text>
              )}
              {workspace.billingPhone && (
                <Text style={styles.companyAddress}>{workspace.billingPhone}</Text>
              )}
              {workspace.billingEmail && (
                <Text style={styles.companyAddress}>{workspace.billingEmail}</Text>
              )}
              {workspace.taxId && (
                <Text style={styles.companyAddress}>NPWP: {workspace.taxId}</Text>
              )}
            </View>
          </View>
          <View style={styles.invoiceMeta}>
            <Text style={styles.invoiceTitle}>INVOICE</Text>
            <Text style={styles.invoiceNumber}>#{invoice.invoiceNumber}</Text>
            <View
              style={[
                styles.statusBadge,
                { backgroundColor: statusStyle.bg, color: statusStyle.fg },
              ]}
            >
              <Text style={{ color: statusStyle.fg }}>{statusStyle.label}</Text>
            </View>
          </View>
        </View>

        {/* Info Row */}
        <View style={styles.infoRow}>
          <View>
            <Text style={styles.infoLabel}>Issue Date</Text>
            <Text style={styles.infoValue}>{formatDate(invoice.issueDate)}</Text>
          </View>
          <View>
            <Text style={styles.infoLabel}>Due Date</Text>
            <Text style={styles.infoValue}>{formatDate(invoice.dueDate)}</Text>
          </View>
          <View>
            <Text style={styles.infoLabel}>
              {invoice.status === "paid" ? "Paid" : invoice.status === "cancelled" ? "Cancelled" : "Amount Due"}
            </Text>
            <Text style={styles.infoValue}>
              {invoice.status === "paid" || invoice.status === "cancelled"
                ? formatCurrency(0, invoice.currency)
                : formatCurrency(total, invoice.currency)}
            </Text>
          </View>
        </View>

        {/* Bill To */}
        <View style={styles.billToSection}>
          <Text style={styles.billToTitle}>Bill To</Text>
          <Text style={styles.clientName}>
            {client.companyName || client.name}
          </Text>
          {client.address && (
            <Text style={styles.clientAddress}>{client.address}</Text>
          )}
        </View>

        {/* Items Table */}
        <View style={styles.table}>
          <View style={styles.tableHeader}>
            <View style={styles.colDesc}>
              <Text style={styles.headerText}>Description</Text>
            </View>
            <View style={styles.colQty}>
              <Text style={styles.headerText}>Qty</Text>
            </View>
            <View style={styles.colRate}>
              <Text style={styles.headerText}>Rate</Text>
            </View>
            <View style={styles.colAmount}>
              <Text style={styles.headerText}>Amount</Text>
            </View>
          </View>

          {items.map((item, i) => (
            <View
              key={item.id || i}
              style={i % 2 === 1 ? [styles.tableRow, styles.tableRowAlt] : styles.tableRow}
            >
              <View style={styles.colDesc}>
                <Text style={styles.cellText}>{item.description}</Text>
              </View>
              <View style={styles.colQty}>
                <Text style={styles.cellText}>{Number(item.quantity).toFixed(2)}</Text>
              </View>
              <View style={styles.colRate}>
                <Text style={styles.cellText}>
                  {formatCurrency(item.unitPrice, invoice.currency)}
                </Text>
              </View>
              <View style={styles.colAmount}>
                <Text style={styles.cellText}>
                  {formatCurrency(item.amount, invoice.currency)}
                </Text>
              </View>
            </View>
          ))}
        </View>

        {/* Detail report — under description table */}
        {timesheetReportUrl ? (
          <View style={styles.detailReportUnderDesc}>
            <Text style={styles.detailReportLabel}>Detail report</Text>
            <Link src={timesheetReportUrl} style={styles.detailReportLink}>
              {timesheetReportUrl}
            </Link>
          </View>
        ) : null}

        {/* Totals */}
        <View style={styles.totalsSection}>
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Subtotal</Text>
            <Text style={styles.totalValue}>{formatCurrency(sub, invoice.currency)}</Text>
          </View>
          {discount > 0 && (
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>Discount</Text>
              <Text style={styles.totalValue}>-{formatCurrency(discount, invoice.currency)}</Text>
            </View>
          )}
          {tax > 0 && (
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>Tax</Text>
              <Text style={styles.totalValue}>{formatCurrency(tax, invoice.currency)}</Text>
            </View>
          )}
          <View style={[styles.totalRow, styles.totalBorder]}>
            <Text style={styles.totalLabel}>Total</Text>
            <Text style={styles.totalValueBold}>{formatCurrency(total, invoice.currency)}</Text>
          </View>
        </View>

        {/* Payment hint */}
        <View style={styles.paymentBox}>
          <Text style={styles.thankYou}>Thank you for your business.</Text>
          <Text style={styles.notes}>Please include invoice number #{invoice.invoiceNumber} when making payment.</Text>
        </View>

        {/* Notes & Terms */}
        {(invoice.notes || invoice.terms) && (
          <View style={styles.notesSection}>
            {invoice.notes && (
              <View>
                <Text style={styles.notesTitle}>Notes</Text>
                <Text style={styles.notes}>{invoice.notes}</Text>
              </View>
            )}
            {invoice.terms && (
              <View style={{ marginTop: 12 }}>
                <Text style={styles.notesTitle}>Terms</Text>
                <Text style={styles.notes}>{invoice.terms}</Text>
              </View>
            )}
          </View>
        )}

        {/* Footer */}
        <View style={styles.footer} fixed>
          <Text style={styles.footerLeft}>
            {companyName}
          </Text>
          <Text
            render={({ pageNumber, totalPages }) => `Page ${pageNumber} of ${totalPages}`}
          />
        </View>
      </Page>
    </Document>
  );
}
