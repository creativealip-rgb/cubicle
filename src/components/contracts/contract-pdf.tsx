import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  Font,
  Image,
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
const TEXT = "#1e293b";
const MUTED = "#64748b";
const BORDER = "#e2e8f0";
const ROW_ALT = "#f8fafc";

const STATUS_STYLES: Record<string, { bg: string; fg: string; label: string }> = {
  draft: { bg: "#f1f5f9", fg: "#475569", label: "DRAFT" },
  sent: { bg: "#dbeafe", fg: "#1e40af", label: "SENT" },
  viewed: { bg: "#fef3c7", fg: "#92400e", label: "VIEWED" },
  signed: { bg: "#dcfce7", fg: "#166534", label: "SIGNED" },
  declined: { bg: "#fee2e2", fg: "#991b1b", label: "DECLINED" },
  expired: { bg: "#fee2e2", fg: "#991b1b", label: "EXPIRED" },
  revoked: { bg: "#e5e7eb", fg: "#374151", label: "REVOKED" },
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
  // Parties
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
  // Body
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
  bodyList: { marginLeft: 12 },
  // Signature block
  signatureBlock: {
    marginTop: 32,
    padding: 16,
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 6,
    backgroundColor: "#fafbff",
  },
  signatureTitle: {
    fontSize: 11,
    fontWeight: 700,
    color: "#0f172a",
    marginBottom: 10,
  },
  signatureGrid: {
    flexDirection: "row",
    gap: 16,
  },
  signatureCol: { flex: 1 },
  signatureLabel: {
    fontSize: 7,
    color: MUTED,
    textTransform: "uppercase",
    letterSpacing: 1,
    marginBottom: 2,
  },
  signatureValue: {
    fontSize: 9,
    color: TEXT,
    marginBottom: 8,
  },
  signatureImageBox: {
    marginTop: 8,
    padding: 8,
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 4,
    minHeight: 60,
    justifyContent: "center",
    alignItems: "center",
  },
  signatureImage: {
    maxHeight: 50,
    maxWidth: 200,
    objectFit: "contain",
  },
  signaturePlaceholder: {
    fontSize: 8,
    color: MUTED,
    fontStyle: "italic",
  },
  // Footer
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

interface ContractData {
  contract: {
    title: string;
    status: string;
    body: string;
    validUntil: string | null;
    sentAt: string | null;
    signedAt: string | null;
    signedName: string | null;
    signedEmail: string | null;
    signatureDataUrl: string | null;
    signedFromIp: string | null;
    declineReason: string | null;
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
  // Remove ** marks (PDF font is plain; bold not supported in heading strip)
  return text.replace(/\*\*/g, "");
}

export function ContractPDF({ contract, workspace, client }: ContractData) {
  const status = STATUS_STYLES[contract.status] || STATUS_STYLES.draft;

  return (
    <Document
      title={`${contract.title} — Cubicle`}
      author={workspace.billingName || workspace.name}
      subject="Service Agreement"
    >
      <Page size="A4" style={styles.page}>
        <View style={styles.accentBar} fixed />

        <View style={styles.header} fixed>
          <View style={styles.brandBlock}>
            <Text style={styles.brandName}>{workspace.billingName || workspace.name}</Text>
            <Text style={styles.brandLabel}>Service Provider</Text>
            {workspace.billingAddress && (
              <Text style={styles.meta}>{workspace.billingAddress}</Text>
            )}
          </View>
          <View style={styles.titleBlock}>
            <Text style={styles.docType}>Service Agreement</Text>
            <Text style={styles.docTitle}>{contract.title}</Text>
            <View style={{ backgroundColor: status.bg, paddingVertical: 3, paddingHorizontal: 8, borderRadius: 4 }}>
              <Text style={{ fontSize: 8, fontWeight: 700, color: status.fg, letterSpacing: 0.5 }}>{status.label}</Text>
            </View>
            {contract.validUntil && (
              <Text style={styles.meta}>Valid until: {contract.validUntil}</Text>
            )}
            {contract.sentAt && (
              <Text style={styles.meta}>Sent: {contract.sentAt}</Text>
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
          {renderMarkdown(contract.body)}
        </View>

        {contract.status === "signed" && (
          <View style={styles.signatureBlock} wrap={false}>
            <Text style={styles.signatureTitle}>Signature</Text>
            <View style={styles.signatureGrid}>
              <View style={styles.signatureCol}>
                <Text style={styles.signatureLabel}>Signatory</Text>
                <Text style={styles.signatureValue}>{contract.signedName}</Text>
                <Text style={styles.signatureValue}>{contract.signedEmail}</Text>
                <Text style={styles.signatureLabel}>Signed at</Text>
                <Text style={styles.signatureValue}>{contract.signedAt}</Text>
              </View>
              <View style={styles.signatureCol}>
                <Text style={styles.signatureLabel}>IP address</Text>
                <Text style={styles.signatureValue}>{contract.signedFromIp || "—"}</Text>
                <Text style={styles.signatureLabel}>Signature</Text>
                <View style={styles.signatureImageBox}>
                  {contract.signatureDataUrl ? (
                    <Image src={contract.signatureDataUrl} style={styles.signatureImage} />
                  ) : (
                    <Text style={styles.signaturePlaceholder}>(no signature data)</Text>
                  )}
                </View>
              </View>
            </View>
          </View>
        )}

        {contract.status === "declined" && contract.declineReason && (
          <View style={styles.signatureBlock} wrap={false}>
            <Text style={styles.signatureTitle}>Declined</Text>
            <Text style={{ fontSize: 9, color: MUTED, marginBottom: 4 }}>
              This contract was declined.
            </Text>
            <Text style={styles.signatureValue}>Reason: {contract.declineReason}</Text>
          </View>
        )}

        <View style={styles.footer} fixed>
          <Text>{workspace.billingName || workspace.name} · Powered by Cubicle</Text>
          <Text
            render={({ pageNumber, totalPages }) => `Page ${pageNumber} of ${totalPages}`}
          />
        </View>
      </Page>
    </Document>
  );
}
