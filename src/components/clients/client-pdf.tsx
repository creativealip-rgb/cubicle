import { Document, Page, StyleSheet, Text, View } from "@react-pdf/renderer";

type ClientPdfItem = {
  name: string;
  companyName: string | null;
  email: string | null;
  phone: string | null;
  website: string | null;
  address: string | null;
  status: string;
  tags: string[];
  internalNotes: string | null;
  portalEnabled: boolean;
  createdAt: string;
  projects: Array<{ name: string; status: string; dueDate: string | null; clientVisible: boolean }>;
};

type ClientPdfData = {
  title: string;
  generatedAt: string;
  workspaceName: string;
  clients: ClientPdfItem[];
  lang?: "id" | "en";
};

const styles = StyleSheet.create({
  page: { padding: 32, fontSize: 10, color: "#111827", fontFamily: "Helvetica" },
  title: { fontSize: 22, fontWeight: 700, marginBottom: 4 },
  meta: { fontSize: 9, color: "#6b7280", marginBottom: 18 },
  section: { marginBottom: 18, paddingBottom: 14, borderBottomWidth: 1, borderBottomColor: "#e5e7eb" },
  clientName: { fontSize: 16, fontWeight: 700, marginBottom: 8 },
  grid: { display: "flex", flexDirection: "row", gap: 12 },
  col: { flexGrow: 1, flexBasis: 0 },
  label: { fontSize: 8, color: "#6b7280", textTransform: "uppercase", marginBottom: 2 },
  value: { fontSize: 10, marginBottom: 7 },
  badge: { fontSize: 8, color: "#374151", marginBottom: 4 },
  subhead: { fontSize: 11, fontWeight: 700, marginTop: 8, marginBottom: 6 },
  projectRow: { display: "flex", flexDirection: "row", justifyContent: "space-between", borderTopWidth: 1, borderTopColor: "#f3f4f6", paddingTop: 5, marginTop: 5 },
  note: { lineHeight: 1.45, color: "#374151" },
});

const dash = "—";

function Field({ label, value }: { label: string; value?: string | null }) {
  return (
    <View>
      <Text style={styles.label}>{label}</Text>
      <Text style={styles.value}>{value || dash}</Text>
    </View>
  );
}

export function ClientPDF({ title, generatedAt, workspaceName, clients, lang = "id" }: ClientPdfData) {
  const t = (id: string, en: string) => (lang === "en" ? en : id);

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.meta}>{workspaceName} · {t("Dibuat", "Generated")} {generatedAt}</Text>

        {clients.map((client, index) => (
          <View key={`${client.name}-${index}`} style={styles.section} wrap={false}>
            <Text style={styles.clientName}>{client.name}</Text>
            <View style={styles.grid}>
              <View style={styles.col}>
                <Field label={t("Perusahaan", "Company")} value={client.companyName} />
                <Field label="Email" value={client.email} />
                <Field label={t("Telepon", "Phone")} value={client.phone} />
                <Field label="Website" value={client.website} />
              </View>
              <View style={styles.col}>
                <Field label={t("Alamat", "Address")} value={client.address} />
                <Field label="Status" value={client.status} />
                <Field label="Portal" value={client.portalEnabled ? t("Aktif", "Enabled") : t("Nonaktif", "Disabled")} />
                <Field label={t("Tanggal dibuat", "Created at")} value={client.createdAt} />
              </View>
            </View>

            <Text style={styles.label}>Tags</Text>
            <Text style={styles.badge}>{client.tags.length ? client.tags.join(", ") : dash}</Text>

            {client.internalNotes && (
              <>
                <Text style={styles.subhead}>{t("Catatan internal", "Internal notes")}</Text>
                <Text style={styles.note}>{client.internalNotes}</Text>
              </>
            )}

            <Text style={styles.subhead}>{t("Ringkasan proyek", "Project summary")}</Text>
            {client.projects.length === 0 ? (
              <Text style={styles.value}>{t("Belum ada proyek", "No projects yet")}</Text>
            ) : (
              client.projects.map((project) => (
                <View key={project.name} style={styles.projectRow}>
                  <Text>{project.name}</Text>
                  <Text>{project.status}{project.dueDate ? ` · ${project.dueDate}` : ""}</Text>
                </View>
              ))
            )}
          </View>
        ))}
      </Page>
    </Document>
  );
}
