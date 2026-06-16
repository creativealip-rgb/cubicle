"use client";

import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  Font,
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

const styles = StyleSheet.create({
  page: {
    padding: 48,
    fontFamily: "Inter",
    fontSize: 10,
    color: "#1e293b",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 32,
  },
  companyName: {
    fontSize: 20,
    fontWeight: 700,
    color: "#0f172a",
    marginBottom: 4,
  },
  companyAddress: {
    fontSize: 9,
    color: "#64748b",
    maxWidth: 220,
  },
  invoiceTitle: {
    fontSize: 28,
    fontWeight: 700,
    color: "#0f172a",
    textAlign: "right",
    marginBottom: 4,
  },
  invoiceNumber: {
    fontSize: 14,
    fontWeight: 700,
    color: "#6366f1",
    textAlign: "right",
  },
  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  infoLabel: {
    fontSize: 9,
    color: "#64748b",
    fontWeight: 700,
    textTransform: "uppercase",
    marginBottom: 2,
  },
  infoValue: {
    fontSize: 10,
    color: "#1e293b",
  },
  billToSection: {
    marginBottom: 24,
    marginTop: 16,
  },
  billToTitle: {
    fontSize: 10,
    fontWeight: 700,
    color: "#64748b",
    textTransform: "uppercase",
    marginBottom: 4,
  },
  clientName: {
    fontSize: 13,
    fontWeight: 700,
    color: "#0f172a",
  },
  clientAddress: {
    fontSize: 10,
    color: "#475569",
  },
  table: {
    marginBottom: 24,
  },
  tableHeader: {
    flexDirection: "row",
    backgroundColor: "#f8fafc",
    borderBottomWidth: 1,
    borderBottomColor: "#e2e8f0",
    borderTopWidth: 1,
    borderTopColor: "#e2e8f0",
    paddingVertical: 6,
  },
  tableRow: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: "#f1f5f9",
    paddingVertical: 6,
  },
  colDesc: { flex: 3, paddingHorizontal: 8 },
  colQty: { flex: 1, paddingHorizontal: 8, textAlign: "right" },
  colRate: { flex: 1.2, paddingHorizontal: 8, textAlign: "right" },
  colAmount: { flex: 1.2, paddingHorizontal: 8, textAlign: "right" },
  headerText: { fontSize: 8, fontWeight: 700, color: "#64748b", textTransform: "uppercase" },
  cellText: { fontSize: 9, color: "#334155" },
  totalsSection: {
    alignItems: "flex-end",
    marginBottom: 24,
  },
  totalRow: {
    flexDirection: "row",
    justifyContent: "flex-end",
    marginBottom: 4,
    width: "50%",
  },
  totalLabel: {
    fontSize: 9,
    color: "#64748b",
    flex: 1,
    textAlign: "right",
    paddingRight: 12,
  },
  totalValue: {
    fontSize: 9,
    color: "#1e293b",
    width: 80,
    textAlign: "right",
  },
  totalValueBold: {
    fontSize: 12,
    fontWeight: 700,
    color: "#0f172a",
    width: 80,
    textAlign: "right",
  },
  totalBorder: {
    borderTopWidth: 1,
    borderTopColor: "#e2e8f0",
    paddingTop: 4,
    marginTop: 4,
  },
  notesSection: {
    marginTop: 24,
    borderTopWidth: 1,
    borderTopColor: "#e2e8f0",
    paddingTop: 16,
  },
  notesTitle: {
    fontSize: 9,
    fontWeight: 700,
    color: "#64748b",
    textTransform: "uppercase",
    marginBottom: 4,
  },
  notes: {
    fontSize: 9,
    color: "#475569",
    lineHeight: 1.5,
  },
  statusBadge: {
    fontSize: 8,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
    alignSelf: "flex-start",
  },
});

function formatCurrency(amount: number | string, currency: string): string {
  const num = typeof amount === "string" ? Number(amount) : amount;
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency || "USD",
  }).format(num);
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
    logoUrl: string | null;
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
}

export function InvoicePDF({ invoice, workspace, client, items }: InvoicePDFProps) {
  const sub = Number(invoice.subtotal);
  const tax = Number(invoice.tax);
  const total = Number(invoice.total);

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.companyName}>
              {workspace.billingName || "Company Name"}
            </Text>
            {workspace.billingAddress && (
              <Text style={styles.companyAddress}>{workspace.billingAddress}</Text>
            )}
          </View>
          <View>
            <Text style={styles.invoiceTitle}>INVOICE</Text>
            <Text style={styles.invoiceNumber}>{invoice.invoiceNumber}</Text>
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
            <Text style={styles.infoLabel}>Status</Text>
            <Text style={styles.infoValue}>
              {invoice.status.charAt(0).toUpperCase() + invoice.status.slice(1)}
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
            <View key={item.id || i} style={styles.tableRow}>
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

        {/* Totals */}
        <View style={styles.totalsSection}>
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Subtotal</Text>
            <Text style={styles.totalValue}>{formatCurrency(sub, invoice.currency)}</Text>
          </View>
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Tax</Text>
            <Text style={styles.totalValue}>{formatCurrency(tax, invoice.currency)}</Text>
          </View>
          <View style={[styles.totalRow, styles.totalBorder]}>
            <Text style={styles.totalLabel}>Total</Text>
            <Text style={styles.totalValueBold}>{formatCurrency(total, invoice.currency)}</Text>
          </View>
        </View>

        {/* Notes & Terms */}
        {(invoice.notes || invoice.terms) && (
          <View style={styles.notesSection}>
            {invoice.notes && (
              <>
                <Text style={styles.notesTitle}>Notes</Text>
                <Text style={styles.notes}>{invoice.notes}</Text>
              </>
            )}
            {invoice.terms && (
              <View style={{ marginTop: 12 }}>
                <Text style={styles.notesTitle}>Terms</Text>
                <Text style={styles.notes}>{invoice.terms}</Text>
              </View>
            )}
          </View>
        )}
      </Page>
    </Document>
  );
}
