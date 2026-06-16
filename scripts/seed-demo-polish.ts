// Seed additional demo data for P1.3 polish:
// - 5 files (mix deliverable + working_file, mix client/internal visibility)
// - 3 time entries
// - 3 comments
// - Clean up the Jan 2027 odd appointment + 0-minute stub time entry
// Run: pnpm tsx scripts/seed-demo-polish.ts
import { db } from "@/db";
import { files, timeEntries, comments, appointments, tasks, projects } from "@/db/schema";
import { eq, and, sql } from "drizzle-orm";

const WS_ID = "12fc318e-c946-4a91-b389-60e39e270f33";
const OWNER_ID = "05fba341-488d-4e6f-ad67-b1226c41964d";
const MEMBER_ID = "3f978a18-99d5-40e5-b450-c0f379637420";

async function main() {
  // 1. Add files (mixed visibility + project)
  const [webRedesign] = await db.select().from(projects).where(eq(projects.name, "Website Redesign")).limit(1);
  const [brandRefresh] = await db.select().from(projects).where(eq(projects.name, "Brand Guideline Refresh")).limit(1);
  const [igCampaign] = await db.select().from(projects).where(eq(projects.name, "Instagram Launch Campaign")).limit(1);
  const [seoRetainer] = await db.select().from(projects).where(eq(projects.name, "SEO Monthly Retainer")).limit(1);

  const fileSeed = [
    { project: webRedesign, name: "Homepage-Wireframe-v2.pdf", visibility: "client" as const, file_type: "deliverable" as const, size: 482_104, mime: "application/pdf" },
    { project: webRedesign, name: "Component-Library.fig", visibility: "internal" as const, file_type: "working_file" as const, size: 2_104_887, mime: "application/octet-stream" },
    { project: brandRefresh, name: "Logo-Exploration-Round-2.pdf", visibility: "client" as const, file_type: "deliverable" as const, size: 1_842_004, mime: "application/pdf" },
    { project: brandRefresh, name: "Color-Palette-Source.ai", visibility: "internal" as const, file_type: "working_file" as const, size: 624_812, mime: "application/postscript" },
    { project: igCampaign, name: "IG-Feed-Caption-Draft.docx", visibility: "client" as const, file_type: "deliverable" as const, size: 28_104, mime: "application/vnd.openxmlformats-officedocument.wordprocessingml.document" },
    { project: igCampaign, name: "Storyboard-Final.pdf", visibility: "client" as const, file_type: "deliverable" as const, size: 988_402, mime: "application/pdf" },
    { project: seoRetainer, name: "Monthly-Report-May-2026.pdf", visibility: "client" as const, file_type: "deliverable" as const, size: 612_048, mime: "application/pdf" },
    { project: seoRetainer, name: "Keyword-Research-Raw.csv", visibility: "internal" as const, file_type: "working_file" as const, size: 84_104, mime: "text/csv" },
  ];

  for (const f of fileSeed) {
    if (!f.project) continue;
    await db.insert(files).values({
      workspaceId: WS_ID,
      projectId: f.project.id,
      clientId: f.project.clientId,
      name: f.name,
      storageKey: `seed/${f.project.id}/${f.name}`,
      mimeType: f.mime,
      sizeBytes: f.size,
      visibility: f.visibility,
      uploadedBy: f.project.id === webRedesign?.id ? MEMBER_ID : OWNER_ID,
      fileType: f.file_type,
    });
  }
  console.log(`+${fileSeed.length} files`);

  // 2. Clean up the 0-minute stub time entry + add 3 more realistic ones
  await db.delete(timeEntries).where(and(eq(timeEntries.description, "Revisi template #3"), eq(timeEntries.durationMinutes, 0)));
  const [task1] = await db.select().from(tasks).where(eq(tasks.title, "Frontend development")).limit(1);
  const [task2] = await db.select().from(tasks).where(eq(tasks.title, "Wireframe homepage")).limit(1);
  if (task1) {
    await db.insert(timeEntries).values({ workspaceId: WS_ID, taskId: task1.id, userId: MEMBER_ID, description: "Implement hero section + responsive nav", durationMinutes: 240, billable: true });
  }
  if (task2) {
    await db.insert(timeEntries).values({ workspaceId: WS_ID, taskId: task2.id, userId: OWNER_ID, description: "Stakeholder review + iteration pass", durationMinutes: 90, billable: false });
  }
  await db.insert(timeEntries).values({ workspaceId: WS_ID, userId: OWNER_ID, description: "Client kickoff call - Kopi Senja", durationMinutes: 60, billable: true });
  console.log("+3 time entries, -1 stub");

  // 3. Add 3 more comments
  const [task3] = await db.select().from(tasks).where(eq(tasks.title, "Caption writing")).limit(1);
  if (task3) {
    await db.insert(comments).values({ workspaceId: WS_ID, taskId: task3.id, userId: OWNER_ID, body: "Caption set A ready for review, prefer B for energy tone." });
    await db.insert(comments).values({ workspaceId: WS_ID, taskId: task3.id, userId: MEMBER_ID, body: "Sip, gue finalize B + tambahin CTA variant." });
  }
  await db.insert(comments).values({ workspaceId: WS_ID, userId: OWNER_ID, body: "Reminder: monthly report template updated, all SEO deliverables pakai format baru mulai bulan ini." });
  console.log("+3 comments");

  // 4. Clean up odd Jan 2027 QA test appointment
  await db.delete(appointments).where(sql`${appointments.startTime} > '2026-12-31'`);
  console.log("Cleaned future-dated appointments");

  console.log("Done.");
}

main().catch((e) => { console.error(e); process.exit(1); });
