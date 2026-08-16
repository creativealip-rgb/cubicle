import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  Font,
} from "@react-pdf/renderer";
import { normalizeDocumentBlocks } from "@/lib/document-blocks";
import { renderDocumentBlock } from "@/lib/document-block-renderer";

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
const TEXT = "#1e293b";
const MUTED = "#64748b";
const BORDER = "#e2e8f0";
const ROW_ALT = "#f8fafc";

const STATUS_STYLES: Record<string, { bg: string; fg: string; label: string }> = {
  draft: { bg: "#f1f5f9", fg: "#475569", label: "DRAFT" },
  sent: { bg: "#dbeafe", fg: "#1e40af", label: "SENT" },
  viewed: { bg: "#fef3c7", fg: "#92400e", label: "VIEWED" },
  accepted: { bg: "#dcfce7", fg: "#166534", label: "ACCEPTED" },
  declined: { bg: "#fee2e2", fg: "#991b1b", label: "DECLINED" },
  expired: { bg: "#fee2e2", fg: "#991b1b", label: "EXPIRED" },
};

const styles = StyleSheet.create({
  page: {
    padding: 48,
    paddingBottom: 64,
    fontFamily: "Inter",
    fontSize: 10,
    color: TEXT,
    lineHeight: 1.5,
  },
  accentBar: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 6,
    backgroundColor: ACCENT,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 28,
    marginTop: 4,
  },
  brandBlock: { flexDirection: "column", flex: 1 },
  brandName: {
    fontSize: 18,
    fontWeight: 700,
    color: "#0f172a",
    marginBottom: 2,
  },
  brandLabel: {
    fontSize: 8,
    color: MUTED,
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  titleBlock: { alignItems: "flex-end" },
  docType: {
    fontSize: 8,
    color: MUTED,
    textTransform: "uppercase",
    letterSpacing: 1,
    marginBottom: 2,
  },
  docTitle: {
    fontSize: 14,
    fontWeight: 700,
    color: "#0f172a",
    marginBottom: 6,
  },
  statusBadge: {
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: 4,
    fontSize: 8,
    fontWeight: 700,
    letterSpacing: 0.5,
  },
  meta: {
    fontSize: 8,
    color: MUTED,
    marginTop: 1,
  },
  parties: {
    flexDirection: "row",
    gap: 16,
    marginBottom: 24,
  },
  party: {
    flex: 1,
    backgroundColor: ROW_ALT,
    padding: 12,
    borderRadius: 6,
    borderLeftWidth: 2,
    borderLeftColor: ACCENT,
  },
  partyLabel: {
    fontSize: 7,
    color: MUTED,
    textTransform: "uppercase",
    letterSpacing: 1,
    marginBottom: 4,
  },
  partyName: {
    fontSize: 11,
    fontWeight: 700,
    color: "#0f172a",
    marginBottom: 2,
  },
  partyDetail: {
    fontSize: 9,
    color: MUTED,
  },
  body: {
    fontSize: 10,
    color: TEXT,
    lineHeight: 1.6,
  },
  bodySection: { marginBottom: 12 },
  bodyH1: {
    fontSize: 14,
    fontWeight: 700,
    color: "#0f172a",
    marginBottom: 8,
  },
  bodyH2: {
    fontSize: 12,
    fontWeight: 700,
    color: "#0f172a",
    marginTop: 8,
    marginBottom: 4,
  },
  bodyText: { marginBottom: 6 },
  // Line items table
  table: {
    marginTop: 20,
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 6,
    overflow: "hidden",
  },
  tableHeader: {
    flexDirection: "row",
    backgroundColor: ROW_ALT,
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
    paddingVertical: 6,
    paddingHorizontal: 8,
  },
  tableHeaderCell: {
    fontSize: 8,
    fontWeight: 700,
    color: MUTED,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  tableRow: {
    flexDirection: "row",
    paddingVertical: 6,
    paddingHorizontal: 8,
    borderBottomWidth: 0.5,
    borderBottomColor: BORDER,
  },
  tableCell: { fontSize: 9, color: TEXT },
  colDesc: { flex: 4 },
  colQty: { flex: 1, textAlign: "right" },
  colUnit: { flex: 2, textAlign: "right" },
  colAmount: { flex: 2, textAlign: "right" },
  totals: {
    marginTop: 8,
    alignItems: "flex-end",
  },
  totalRow: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 24,
    marginBottom: 2,
  },
  totalLabel: { fontSize: 9, color: MUTED },
  totalValue: { fontSize: 9, color: TEXT, minWidth: 80, textAlign: "right" },
  grandTotal: {
    marginTop: 4,
    paddingTop: 6,
    borderTopWidth: 1,
    borderTopColor: BORDER,
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 24,
  },
  grandTotalLabel: { fontSize: 10, fontWeight: 700, color: "#0f172a" },
  grandTotalValue: {
    fontSize: 10,
    fontWeight: 700,
    color: "#0f172a",
    minWidth: 80,
    textAlign: "right",
  },
  dpBlock: {
    marginTop: 16,
    padding: 12,
    backgroundColor: "#eff6ff",
    borderWidth: 1,
    borderColor: "#bfdbfe",
    borderRadius: 6,
  },
  dpTitle: {
    fontSize: 9,
    fontWeight: 700,
    color: "#1e40af",
    marginBottom: 2,
  },
  dpDetail: {
    fontSize: 9,
    color: "#1d4ed8",
  },
  footer: {
    position: "absolute",
    bottom: 32,
    left: 48,
    right: 48,
    flexDirection: "row",
    justifyContent: "space-between",
    fontSize: 8,
    color: MUTED,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: BORDER,
  },
});

interface LineItem {
  description: string;
  quantity?: number;
  qty?: number;
  unitPrice?: number;
  unit_price?: number;
  amount: number;
}

interface ProposalData {
  proposal: {
    title: string;
    status: string;
    body: string | null;
    contentBlocks?: unknown;
    lineItems?: unknown;
    subtotal?: string;
    tax?: string;
    total?: string;
    currency: string;
    downPaymentPercent?: string;
    validUntil: string | null;
    sentAt: string | null;
  };
  workspace: { name: string; billingName: string | null; billingAddress: string | null };
  client: { name: string; email: string | null; companyName: string | null };
}

function renderMarkdown(text: string) {
  // Lightweight markdown: headings + paragraphs only
  const lines = text.split("\n");
  const blocks: Array<{ type: "h1" | "h2" | "p"; text: string }> = [];
  let para: string[] = [];

  function flushPara() {
    if (para.length === 0) return;
    blocks.push({ type: "p", text: para.join(" ").trim() });
    para = [];
  }

  for (const raw of lines) {
    const line = raw.trimEnd();
    if (line.startsWith("# ")) {
      flushPara();
      blocks.push({ type: "h1", text: line.slice(2).trim() });
    } else if (line.startsWith("## ")) {
      flushPara();
      blocks.push({ type: "h2", text: line.slice(3).trim() });
    } else if (line.trim() === "") {
      flushPara();
    } else {
      para.push(line.trim());
    }
  }
  flushPara();

  return blocks.map((b, i) => {
    if (b.type === "h1") return <Text key={i} style={styles.bodyH1}>{stripBold(b.text)}</Text>;
    if (b.type === "h2") return <Text key={i} style={styles.bodyH2}>{stripBold(b.text)}</Text>;
    return <Text key={i} style={styles.bodyText}>{stripBold(b.text)}</Text>;
  });
}

function stripBold(text: string): string {
  return text.replace(/\*\*/g, "");
}

function formatCurrency(amount: number | string | null | undefined, currency: string): string {
  const num = typeof amount === "string" ? Number(amount) : amount;
  if (!num || !Number.isFinite(num)) return "-";
  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: currency || "USD",
    }).format(num);
  } catch {
    return `${currency} ${num.toFixed(2)}`;
  }
}

export function ProposalPDF({ proposal, workspace, client }: ProposalData) {
  const status = STATUS_STYLES[proposal.status] || STATUS_STYLES.draft;
  const items = ((proposal.lineItems as LineItem[] | null) ?? []).map((li) => ({
    description: li.description,
    quantity: li.quantity ?? li.qty ?? 1,
    unitPrice: li.unitPrice ?? li.unit_price ?? 0,
    amount:
      li.amount ??
      (li.quantity ?? li.qty ?? 1) * (li.unitPrice ?? li.unit_price ?? 0),
  }));
  const subtotal = Number(proposal.subtotal ?? items.reduce((s, li) => s + Number(li.amount), 0));
  const tax = Number(proposal.tax ?? 0);
  const total = Number(proposal.total ?? subtotal + tax);
  const dpPercent = Number(proposal.downPaymentPercent ?? 0);
  const dpAmount = total * (dpPercent / 100);

  const blocks = normalizeDocumentBlocks(proposal.contentBlocks, "proposal");

  return (
    <Document
      title={`${proposal.title} — Cubiqlo`}
      author={workspace.billingName || workspace.name}
      subject="Proposal"
    >
      <Page size="A4" style={styles.page}>
        <View style={styles.accentBar} fixed />

        <View style={styles.header} fixed>
          <View style={styles.brandBlock}>
            <Text style={styles.brandName}>{workspace.billingName || workspace.name}</Text>
            <Text style={styles.brandLabel}>Proposal</Text>
            {workspace.billingAddress && (
              <Text style={styles.meta}>{workspace.billingAddress}</Text>
            )}
          </View>
          <View style={styles.titleBlock}>
            <Text style={styles.docType}>Proposal</Text>
            <Text style={styles.docTitle}>{proposal.title}</Text>
            <View style={{ backgroundColor: status.bg, paddingVertical: 3, paddingHorizontal: 8, borderRadius: 4 }}>
              <Text style={{ fontSize: 8, fontWeight: 700, color: status.fg, letterSpacing: 0.5 }}>{status.label}</Text>
            </View>
            {proposal.validUntil && (
              <Text style={styles.meta}>Valid until: {proposal.validUntil}</Text>
            )}
            {proposal.sentAt && (
              <Text style={styles.meta}>Sent: {proposal.sentAt}</Text>
            )}
          </View>
        </View>

        <View style={styles.parties}>
          <View style={styles.party}>
            <Text style={styles.partyLabel}>From</Text>
            <Text style={styles.partyName}>{workspace.billingName || workspace.name}</Text>
            <Text style={styles.partyDetail}>{workspace.billingAddress || "Service Provider"}</Text>
          </View>
          <View style={styles.party}>
            <Text style={styles.partyLabel}>To</Text>
            <Text style={styles.partyName}>{client.companyName || client.name}</Text>
            <Text style={styles.partyDetail}>{client.email || "—"}</Text>
          </View>
        </View>

        <View style={styles.body}>
          {blocks.length > 0
            ? blocks.map((block) => (
                <Text key={block.id} style={[block.type === "heading" ? styles.bodyH2 : styles.bodyText, ...(block.align ? [{ textAlign: block.align as "left" | "center" | "right" }] : [])]}>
                  {renderDocumentBlock(block, {
                    client_name: client.name,
                    client_email: client.email,
                    company_name: client.companyName,
                    valid_until: proposal.validUntil,
                    today: new Date().toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" }),
                    subtotal,
                    tax,
                    total_amount: total,
                    down_payment: dpAmount,
                  })}
                </Text>
              ))
            : proposal.body
              ? renderMarkdown(proposal.body)
              : null}
        </View>

        {items.length > 0 && (
          <View style={styles.table}>
            <View style={styles.tableHeader}>
              <Text style={[styles.tableHeaderCell, styles.colDesc]}>Description</Text>
              <Text style={[styles.tableHeaderCell, styles.colQty]}>Qty</Text>
              <Text style={[styles.tableHeaderCell, styles.colUnit]}>Unit Price</Text>
              <Text style={[styles.tableHeaderCell, styles.colAmount]}>Amount</Text>
            </View>
            {items.map((li, i) => (
              <View key={i} style={styles.tableRow}>
                <Text style={[styles.tableCell, styles.colDesc]}>{li.description}</Text>
                <Text style={[styles.tableCell, styles.colQty]}>{li.quantity}</Text>
                <Text style={[styles.tableCell, styles.colUnit]}>{formatCurrency(li.unitPrice, proposal.currency)}</Text>
                <Text style={[styles.tableCell, styles.colAmount]}>{formatCurrency(li.amount, proposal.currency)}</Text>
              </View>
            ))}
          </View>
        )}

        {items.length > 0 && (
          <View style={styles.totals}>
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>Subtotal</Text>
              <Text style={styles.totalValue}>{formatCurrency(subtotal, proposal.currency)}</Text>
            </View>
            {tax > 0 && (
              <View style={styles.totalRow}>
                <Text style={styles.totalLabel}>Tax</Text>
                <Text style={styles.totalValue}>{formatCurrency(tax, proposal.currency)}</Text>
              </View>
            )}
            <View style={styles.grandTotal}>
              <Text style={styles.grandTotalLabel}>Total</Text>
              <Text style={styles.grandTotalValue}>{formatCurrency(total, proposal.currency)}</Text>
            </View>
          </View>
        )}

        {dpPercent > 0 && (
          <View style={styles.dpBlock} wrap={false}>
            <Text style={styles.dpTitle}>Down payment to begin work</Text>
            <Text style={styles.dpDetail}>
              {dpPercent}% ({formatCurrency(dpAmount, proposal.currency)}) is due upon acceptance to begin work.
            </Text>
          </View>
        )}

        <View style={styles.footer} fixed>
          <Text>{workspace.billingName || workspace.name} · Powered by Cubiqlo</Text>
          <Text
            render={({ pageNumber, totalPages }) => `Page ${pageNumber} of ${totalPages}`}
          />
        </View>
      </Page>
    </Document>
  );
}
