import { db } from "@/db"
import { users, workspaces, workspaceMembers, clients, projects, projectMembers, tasks, comments, files, timeEntries, invoices, invoiceItems, payments, appointments, availabilityRules, promptTemplates, promptGenerations, activityLogs } from "@/db/schema"
import { randomUUID } from "crypto"

async function seed() {
  console.log("🌱 Seeding Cubicle demo data...\n")

  // Clean existing workspace
  await db.delete(activityLogs).execute().catch(() => {})
  await db.delete(promptGenerations).execute().catch(() => {})
  await db.delete(promptTemplates).execute().catch(() => {})
  await db.delete(appointments).execute().catch(() => {})
  await db.delete(availabilityRules).execute().catch(() => {})
  await db.delete(payments).execute().catch(() => {})
  await db.delete(invoiceItems).execute().catch(() => {})
  await db.delete(invoices).execute().catch(() => {})
  await db.delete(timeEntries).execute().catch(() => {})
  await db.delete(files).execute().catch(() => {})
  await db.delete(comments).execute().catch(() => {})
  await db.delete(tasks).execute().catch(() => {})
  await db.delete(projectMembers).execute().catch(() => {})
  await db.delete(projects).execute().catch(() => {})
  await db.delete(clients).execute().catch(() => {})
  await db.delete(workspaceMembers).execute().catch(() => {})
  await db.delete(workspaces).execute().catch(() => {})
  await db.delete(users).execute().catch(() => {})

  // Users
  const ownerId = randomUUID()
  const memberId = randomUUID()
  const viewerId = randomUUID()

  await db.insert(users).values([
    { id: ownerId, name: "Alex Owner", email: "owner@cubicle.test", emailVerified: true },
    { id: memberId, name: "Budi Member", email: "member@cubicle.test", emailVerified: true },
    { id: viewerId, name: "Citra Viewer", email: "viewer@cubicle.test", emailVerified: true },
  ])
  console.log("✅ Users: owner, member, viewer")

  // Workspace
  const wsId = randomUUID()
  await db.insert(workspaces).values({
    id: wsId,
    name: "Acme Creative Studio",
    slug: "acme-creative",
    ownerId,
    defaultCurrency: "IDR",
    defaultHourlyRate: "250000",
    defaultTaxRate: "11",
    bookingSlug: "acme-creative",
  })

  await db.insert(workspaceMembers).values([
    { workspaceId: wsId, userId: ownerId, role: "owner" },
    { workspaceId: wsId, userId: memberId, role: "member" },
    { workspaceId: wsId, userId: viewerId, role: "viewer" },
  ])
  console.log("✅ Workspace: Acme Creative Studio")

  // Clients
  const client1Id = randomUUID()
  const client2Id = randomUUID()
  const client3Id = randomUUID()

  await db.insert(clients).values([
    { id: client1Id, workspaceId: wsId, name: "Kopi Senja", companyName: "PT Kopi Senja Nusantara", email: "hello@kopisenja.id", phone: "+628123456781", website: "kopisenja.id", status: "active", tags: ["branding", "social"], internalNotes: "Budget Q4: 50 juta. Client agak picky soal warna.", portalEnabled: true },
    { id: client2Id, workspaceId: wsId, name: "Klinik Harmoni", companyName: "Klinik Harmoni Sejahtera", email: "admin@klinikharmoni.com", phone: "+628123456782", website: "klinikharmoni.com", status: "active", tags: ["website", "seo"], internalNotes: "Kontrak 1 tahun. Renewal bulan depan.", portalEnabled: true },
    { id: client3Id, workspaceId: wsId, name: "PT Awan Digital", companyName: "PT Awan Digital Solusi", email: "info@awandigital.id", status: "inactive", tags: ["consulting"], internalNotes: "Sudah selesai project. Mungkin balik Q1 tahun depan.", portalEnabled: false },
  ])
  console.log("✅ Clients: Kopi Senja, Klinik Harmoni, PT Awan Digital")

  // Projects
  const p1Id = randomUUID()
  const p2Id = randomUUID()
  const p3Id = randomUUID()
  const p4Id = randomUUID()
  const p5Id = randomUUID()

  await db.insert(projects).values([
    { id: p1Id, workspaceId: wsId, clientId: client1Id, name: "Instagram Launch Campaign", status: "active", clientVisible: true, createdBy: ownerId },
    { id: p2Id, workspaceId: wsId, clientId: client1Id, name: "Brand Guideline Refresh", status: "active", clientVisible: false, createdBy: ownerId },
    { id: p3Id, workspaceId: wsId, clientId: client2Id, name: "Website Redesign", status: "active", clientVisible: true, createdBy: ownerId, dueDate: "2026-07-15" },
    { id: p4Id, workspaceId: wsId, clientId: client2Id, name: "SEO Monthly Retainer", status: "on_hold", clientVisible: true, createdBy: ownerId },
    { id: p5Id, workspaceId: wsId, clientId: client3Id, name: "Internal Ops Consulting", status: "completed", clientVisible: false, createdBy: ownerId },
  ])

  await db.insert(projectMembers).values([
    { projectId: p1Id, userId: memberId },
    { projectId: p3Id, userId: memberId },
  ])
  console.log("✅ Projects: 5")

  // Tasks
  const taskIds: string[] = []
  const taskData = [
    { projectId: p1Id, title: "Buat mood board campaign", status: "done", priority: "high", assigneeId: memberId, clientVisible: true, dueDate: "2026-06-10" },
    { projectId: p1Id, title: "Desain 5 feed template", status: "in_progress", priority: "high", assigneeId: memberId, clientVisible: true, dueDate: "2026-06-18" },
    { projectId: p1Id, title: "Bikin copywriting 10 caption", status: "todo", priority: "medium", assigneeId: memberId, clientVisible: true, dueDate: "2026-06-20" },
    { projectId: p1Id, title: "Shooting product photo", status: "review", priority: "urgent", assigneeId: memberId, clientVisible: false, dueDate: "2026-06-12" },
    { projectId: p1Id, title: "Internal budget review", status: "todo", priority: "high", clientVisible: false },
    { projectId: p2Id, title: "Audit existing brand assets", status: "done", priority: "medium", assigneeId: memberId, clientVisible: false },
    { projectId: p2Id, title: "Draft new color palette", status: "in_progress", priority: "high", assigneeId: memberId, clientVisible: false },
    { projectId: p2Id, title: "Typography selection", status: "todo", priority: "medium", clientVisible: false },
    { projectId: p3Id, title: "Wireframe homepage baru", status: "done", priority: "high", assigneeId: memberId, clientVisible: true },
    { projectId: p3Id, title: "Design system setup", status: "done", priority: "high", assigneeId: memberId, clientVisible: false },
    { projectId: p3Id, title: "Develop frontend", status: "in_progress", priority: "high", assigneeId: memberId, clientVisible: true, dueDate: "2026-07-01" },
    { projectId: p3Id, title: "Integrasi appointment booking", status: "todo", priority: "medium", clientVisible: true, dueDate: "2026-07-10" },
    { projectId: p3Id, title: "SEO optimization page", status: "todo", priority: "medium", clientVisible: false },
    { projectId: p4Id, title: "Keyword research", status: "done", priority: "medium", clientVisible: true },
    { projectId: p4Id, title: "On-page optimization", status: "in_progress", priority: "medium", clientVisible: true },
    { projectId: p4Id, title: "Monthly report June", status: "todo", priority: "medium", assigneeId: memberId, clientVisible: true, dueDate: "2026-06-30" },
    { projectId: p5Id, title: "Initial consultation", status: "done", priority: "high", clientVisible: false },
    { projectId: p5Id, title: "Ops audit report", status: "done", priority: "high", clientVisible: false },
    { projectId: p5Id, title: "Final presentation", status: "done", priority: "high", clientVisible: false },
  ]

  for (const t of taskData) {
    const id = randomUUID()
    taskIds.push(id)
    await db.insert(tasks).values({ id, workspaceId: wsId, ...t })
  }
  console.log("✅ Tasks: 19")

  // Comments
  await db.insert(comments).values([
    { workspaceId: wsId, entityType: "task", entityId: taskIds[1], body: "Template nomor 3 perlu revisi warna ya, client minta tone earth.", visibility: "internal", authorId: memberId, source: "internal" },
    { workspaceId: wsId, entityType: "task", entityId: taskIds[1], body: "Ok, nanti gue adjust. Deadline masih 18 kan?", visibility: "internal", authorId: ownerId, source: "internal" },
    { workspaceId: wsId, entityType: "task", entityId: taskIds[2], body: "Caption sudah ok semua? Bisa minta preview sebelum final?", visibility: "client", authorName: "Sarah (Kopi Senja)", authorEmail: "sarah@kopisenja.id", source: "portal" },
    { workspaceId: wsId, entityType: "project", entityId: p3Id, body: "Bisa share wireframe yang udah jadi? Mau review dulu.", visibility: "client", authorName: "Dr. Rina", authorEmail: "rina@klinikharmoni.com", source: "portal" },
  ])
  console.log("✅ Comments: 4 (2 internal, 2 client)")

  // Time entries
  const d = (s: string) => new Date(s)
  await db.insert(timeEntries).values([
    { workspaceId: wsId, clientId: client1Id, projectId: p1Id, taskId: taskIds[0], userId: memberId, description: "Mood board research", startTime: d("2026-06-08T09:00:00Z"), endTime: d("2026-06-08T11:30:00Z"), billable: true, hourlyRate: "250000", status: "draft" },
    { workspaceId: wsId, clientId: client1Id, projectId: p1Id, taskId: taskIds[1], userId: memberId, description: "Feed template design", startTime: d("2026-06-10T08:00:00Z"), endTime: d("2026-06-10T12:00:00Z"), billable: true, hourlyRate: "250000", status: "draft" },
    { workspaceId: wsId, clientId: client2Id, projectId: p3Id, taskId: taskIds[8], userId: memberId, description: "Wireframe homepage", manualMinutes: 90, billable: true, hourlyRate: "250000", status: "approved" },
    { workspaceId: wsId, clientId: client2Id, projectId: p3Id, taskId: taskIds[10], userId: memberId, description: "Frontend development", startTime: d("2026-06-12T09:00:00Z"), endTime: d("2026-06-12T14:00:00Z"), billable: true, hourlyRate: "250000", status: "approved" },
    { workspaceId: wsId, clientId: client1Id, projectId: p1Id, taskId: taskIds[2], userId: memberId, description: "Copywriting", manualMinutes: 60, billable: false, status: "draft" },
    // Active timer
    { workspaceId: wsId, clientId: client1Id, projectId: p1Id, taskId: taskIds[1], userId: memberId, description: "Revisi template #3", startTime: d("2026-06-15T08:00:00Z"), billable: true, hourlyRate: "250000", status: "draft" },
  ])
  console.log("✅ Time entries: 6 (1 active timer)")

  // Invoices
  const inv1Id = randomUUID()
  const inv2Id = randomUUID()
  const inv3Id = randomUUID()

  await db.insert(invoices).values([
    { id: inv1Id, workspaceId: wsId, clientId: client1Id, invoiceNumber: "INV-0001", issueDate: "2026-06-01", dueDate: "2026-06-15", currency: "IDR", subtotal: "5000000", tax: "550000", total: "5550000", status: "sent", notes: "Pekerjaan branding Instagram campaign" },
    { id: inv2Id, workspaceId: wsId, clientId: client2Id, invoiceNumber: "INV-0002", issueDate: "2026-06-05", dueDate: "2026-06-20", currency: "IDR", subtotal: "3500000", tax: "385000", total: "3885000", status: "draft", notes: "Website redesign - milestone 1" },
    { id: inv3Id, workspaceId: wsId, clientId: client2Id, invoiceNumber: "INV-0003", issueDate: "2026-05-01", dueDate: "2026-05-15", currency: "IDR", subtotal: "2000000", tax: "220000", total: "2220000", status: "paid", notes: "SEO retainer May" },
  ])

  await db.insert(invoiceItems).values([
    { invoiceId: inv1Id, description: "Instagram campaign design", quantity: "1", unitPrice: "5000000", amount: "5000000", sourceType: "manual" },
    { invoiceId: inv2Id, description: "Website wireframing", quantity: "1", unitPrice: "2000000", amount: "2000000", sourceType: "time_entry" },
    { invoiceId: inv2Id, description: "UI Design", quantity: "1", unitPrice: "1500000", amount: "1500000", sourceType: "manual" },
    { invoiceId: inv3Id, description: "SEO optimization May", quantity: "1", unitPrice: "2000000", amount: "2000000", sourceType: "manual" },
  ])

  await db.insert(payments).values([
    { invoiceId: inv3Id, amount: "2220000", paidAt: "2026-05-14", method: "Bank Transfer", notes: "Transfer via BCA" },
  ])
  console.log("✅ Invoices: 3 (sent, draft, paid)")

  // Appointments
  await db.insert(availabilityRules).values([
    { workspaceId: wsId, userId: ownerId, dayOfWeek: 1, startTime: "09:00", endTime: "17:00", timezone: "Asia/Jakarta" },
    { workspaceId: wsId, userId: ownerId, dayOfWeek: 2, startTime: "09:00", endTime: "17:00", timezone: "Asia/Jakarta" },
    { workspaceId: wsId, userId: ownerId, dayOfWeek: 3, startTime: "09:00", endTime: "17:00", timezone: "Asia/Jakarta" },
    { workspaceId: wsId, userId: ownerId, dayOfWeek: 4, startTime: "09:00", endTime: "17:00", timezone: "Asia/Jakarta" },
    { workspaceId: wsId, userId: ownerId, dayOfWeek: 5, startTime: "09:00", endTime: "15:00", timezone: "Asia/Jakarta" },
  ])

  await db.insert(appointments).values([
    { workspaceId: wsId, userId: ownerId, clientId: client1Id, title: "Review campaign progress", attendeeName: "Sarah", attendeeEmail: "sarah@kopisenja.id", startTime: d("2026-06-17T10:00:00Z"), endTime: d("2026-06-17T11:00:00Z"), status: "scheduled" },
    { workspaceId: wsId, userId: ownerId, clientId: client2Id, title: "Website demo", attendeeName: "Dr. Rina", attendeeEmail: "rina@klinikharmoni.com", startTime: d("2026-06-20T14:00:00Z"), endTime: d("2026-06-20T15:00:00Z"), status: "scheduled" },
  ])
  console.log("✅ Appointments: 2")

  // Prompt templates
  await db.insert(promptTemplates).values([
    { workspaceId: wsId, name: "Social Caption", category: "social", description: "Generate engaging social media caption", template: "Write a caption for {{platform}} about {{topic}}. Tone: {{tone}}. Include emojis and hashtags.", isSystem: true },
    { workspaceId: wsId, name: "Copywriting", category: "copy", description: "Write marketing copy", template: "Write {{type}} copy for {{audience}}. Key message: {{message}}. CTA: {{cta}}.", isSystem: true },
    { workspaceId: wsId, name: "Email Marketing", category: "email", description: "Craft email newsletter", template: "Write an email about {{topic}} for {{audience}}. Subject line should be catchy. Include CTA.", isSystem: true },
  ])
  console.log("✅ Prompt templates: 3")

  // Activity logs
  await db.insert(activityLogs).values([
    { workspaceId: wsId, actorId: ownerId, action: "created_workspace", entityType: "workspace", entityId: wsId },
    { workspaceId: wsId, actorId: ownerId, action: "created_client", entityType: "client", entityId: client1Id },
    { workspaceId: wsId, actorId: ownerId, action: "created_client", entityType: "client", entityId: client2Id },
    { workspaceId: wsId, actorId: memberId, action: "created_task", entityType: "task", entityId: taskIds[0] },
    { workspaceId: wsId, actorId: memberId, action: "updated_task_status", entityType: "task", entityId: taskIds[0] },
    { workspaceId: wsId, actorId: memberId, action: "created_time_entry", entityType: "time_entry" },
    { workspaceId: wsId, actorId: ownerId, action: "created_invoice", entityType: "invoice", entityId: inv1Id },
    { workspaceId: wsId, actorId: ownerId, action: "sent_invoice", entityType: "invoice", entityId: inv1Id },
  ])
  console.log("✅ Activity logs: 8")

  // Summary
  console.log("\n📊 Seed Summary:")
  console.log("  Users:       3 (owner@cubicle.test / member@cubicle.test / viewer@cubicle.test)")
  console.log("  Password:    password123 (Better-Auth hash)")
  console.log("  Workspace:   Acme Creative Studio (acme-creative)")
  console.log("  Clients:     3 (2 active, 1 inactive)")
  console.log("  Projects:    5")
  console.log("  Tasks:       19 (5 done, 4 in_progress, 1 review, 9 todo)")
  console.log("  Comments:    4")
  console.log("  Time:        6 entries (1 active timer)")
  console.log("  Invoices:    3 (1 sent, 1 draft, 1 paid)")
  console.log("  Appointments: 2 upcoming")
  console.log("\n✨ Seed complete!")
}

seed().catch((e) => {
  console.error("Seed failed:", e)
  process.exit(1)
})
