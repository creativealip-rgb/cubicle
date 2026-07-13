import {
  bigint,
  boolean,
  date,
  integer,
  jsonb,
  numeric,
  pgTable,
  text,
  time,
  timestamp,
  unique,
  uuid,
} from "drizzle-orm/pg-core";
import { relations, sql } from "drizzle-orm";

// ─── Better-Auth tables ───

export const users = pgTable("users", {
  id: text("id").primaryKey(),
  name: text("name"),
  email: text("email").notNull().unique(),
  emailVerified: boolean("email_verified").notNull().default(false),
  image: text("image"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  plan: text("plan").notNull().default("free"), // free | solo | team
  planExpiresAt: timestamp("plan_expires_at", { withTimezone: true }),
});

export const sessions = pgTable("sessions", {
  id: text("id").primaryKey(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  token: text("token").notNull().unique(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
});

export const accounts = pgTable("accounts", {
  id: text("id").primaryKey(),
  accountId: text("account_id").notNull(),
  providerId: text("provider_id").notNull(),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  accessToken: text("access_token"),
  refreshToken: text("refresh_token"),
  idToken: text("id_token"),
  accessTokenExpiresAt: timestamp("access_token_expires_at", { withTimezone: true }),
  refreshTokenExpiresAt: timestamp("refresh_token_expires_at", { withTimezone: true }),
  scope: text("scope"),
  password: text("password"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const verifications = pgTable("verifications", {
  id: text("id").primaryKey(),
  identifier: text("identifier").notNull(),
  value: text("value").notNull(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

// ─── Workspace ───

export const workspaces = pgTable("workspaces", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  ownerId: text("owner_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  defaultCurrency: text("default_currency").notNull().default("IDR"),
  defaultHourlyRate: numeric("default_hourly_rate", { precision: 12, scale: 2 }),
  defaultInvoiceTerms: text("default_invoice_terms"),
  defaultTaxRate: numeric("default_tax_rate", { precision: 5, scale: 2 }).notNull().default("0"),
  billingName: text("billing_name"),
  billingAddress: text("billing_address"),
  billingEmail: text("billing_email"),
  billingPhone: text("billing_phone"),
  taxId: text("tax_id"),
  logoUrl: text("logo_url"),
  replyToEmail: text("reply_to_email"),
  bookingSlug: text("booking_slug").unique(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const pakasirPayments = pgTable("pakasir_payments", {
  id: uuid("id").defaultRandom().primaryKey(),
  workspaceId: uuid("workspace_id").notNull().references(() => workspaces.id, { onDelete: "cascade" }),
  orderId: text("order_id").notNull().unique(),
  plan: text("plan", { enum: ["solo", "team"] }).notNull(),
  amount: numeric("amount", { precision: 12, scale: 2 }).notNull(),
  status: text("status", { enum: ["pending", "completed", "failed"] }).notNull().default("pending"),
  paymentMethod: text("payment_method").notNull().default("PAKASIR_QRIS"),
  rawPayload: jsonb("raw_payload"),
  paidAt: timestamp("paid_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const workspaceMembers = pgTable("workspace_members", {
  id: uuid("id").defaultRandom().primaryKey(),
  workspaceId: uuid("workspace_id").notNull().references(() => workspaces.id, { onDelete: "cascade" }),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  role: text("role", { enum: ["owner", "member", "viewer"] }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [unique().on(table.workspaceId, table.userId)]);

export const workspaceInvoiceCounters = pgTable("workspace_invoice_counters", {
  workspaceId: uuid("workspace_id").primaryKey().references(() => workspaces.id, { onDelete: "cascade" }),
  nextNumber: integer("next_number").notNull().default(1),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

// ─── AI usage counter (DB-backed rate limit, persists across restarts) ───

export const aiUsageDaily = pgTable("ai_usage_daily", {
  workspaceId: uuid("workspace_id").notNull().references(() => workspaces.id, { onDelete: "cascade" }),
  usageDate: date("usage_date").notNull(),
  count: integer("count").notNull().default(0),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  unique("ai_usage_daily_ws_date").on(t.workspaceId, t.usageDate),
]);

// ─── Clients ───

export const clients = pgTable("clients", {
  id: uuid("id").defaultRandom().primaryKey(),
  workspaceId: uuid("workspace_id").notNull().references(() => workspaces.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  companyName: text("company_name"),
  email: text("email"),
  phone: text("phone"),
  website: text("website"),
  address: text("address"),
  status: text("status", { enum: ["active", "inactive", "archived"] }).notNull().default("active"),
  tags: text("tags").array().notNull().default(sql`'{}'::text[]`),
  internalNotes: text("internal_notes"),
  portalEnabled: boolean("portal_enabled").notNull().default(false),
  portalTokenHash: text("portal_token_hash").unique(),
  portalTokenExpiresAt: timestamp("portal_token_expires_at", { withTimezone: true }),
  portalTokenRevokedAt: timestamp("portal_token_revoked_at", { withTimezone: true }),
  portalSlug: text("portal_slug").unique(),
  portalSlugEnabled: boolean("portal_slug_enabled").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

// ─── Projects ───

export const projects = pgTable("projects", {
  id: uuid("id").defaultRandom().primaryKey(),
  workspaceId: uuid("workspace_id").notNull().references(() => workspaces.id, { onDelete: "cascade" }),
  clientId: uuid("client_id").notNull().references(() => clients.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  description: text("description"),
  status: text("status", { enum: ["draft", "active", "on_hold", "completed", "cancelled"] }).notNull().default("active"),
  billingType: text("billing_type", { enum: ["project", "hours", "package"] }).notNull().default("project"),
  rate: numeric("rate", { precision: 12, scale: 2 }),
  budget: numeric("budget", { precision: 12, scale: 2 }),
  currency: text("currency").notNull().default("IDR"),
  startDate: date("start_date"),
  finishDate: date("finish_date"),
  dueDate: date("due_date"),
  clientVisible: boolean("client_visible").notNull().default(false),
  selectedPackageId: uuid("selected_package_id"),
  createdBy: text("created_by").references(() => users.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const projectMembers = pgTable("project_members", {
  id: uuid("id").defaultRandom().primaryKey(),
  projectId: uuid("project_id").notNull().references(() => projects.id, { onDelete: "cascade" }),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [unique().on(table.projectId, table.userId)]);

// ─── Packages (for "by_package" billing) ───

export const packages = pgTable("packages", {
  id: uuid("id").defaultRandom().primaryKey(),
  workspaceId: uuid("workspace_id").notNull().references(() => workspaces.id, { onDelete: "cascade" }),
  projectId: uuid("project_id").notNull().references(() => projects.id, { onDelete: "cascade" }),
  name: text("name").notNull(), // e.g. "40 HOURS", "60 HOURS"
  hours: integer("hours"), // hours included per month
  price: numeric("price", { precision: 12, scale: 2 }).notNull(),
  currency: text("currency").notNull().default("IDR"),
  description: text("description"), // subtitle
  features: text("features"), // JSON array of feature strings
  badge: text("badge"), // e.g. "BEST FOR A TEAM"
  sortOrder: integer("sort_order").notNull().default(0),
  active: boolean("active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  customPrice: numeric("custom_price", { precision: 12, scale: 2 }),
  minHours: integer("min_hours"),
  maxHours: integer("max_hours"),
  allowCustom: boolean("allow_custom").notNull().default(false),
});

// ─── Tasks ───

export const tasks = pgTable("tasks", {
  id: uuid("id").defaultRandom().primaryKey(),
  workspaceId: uuid("workspace_id").notNull().references(() => workspaces.id, { onDelete: "cascade" }),
  projectId: uuid("project_id").notNull().references(() => projects.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  description: text("description"),
  status: text("status", { enum: ["todo", "in_progress", "review", "done"] }).notNull().default("todo"),
  priority: text("priority", { enum: ["low", "medium", "high", "urgent"] }).notNull().default("medium"),
  assigneeId: text("assignee_id").references(() => users.id, { onDelete: "set null" }),
  dueDate: date("due_date"),
  position: integer("position").notNull().default(0),
  clientVisible: boolean("client_visible").notNull().default(false),
  createdBy: text("created_by").references(() => users.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});


export const portalRequests = pgTable("portal_requests", {
  id: uuid("id").defaultRandom().primaryKey(),
  workspaceId: uuid("workspace_id").notNull().references(() => workspaces.id, { onDelete: "cascade" }),
  clientId: uuid("client_id").notNull().references(() => clients.id, { onDelete: "cascade" }),
  projectId: uuid("project_id").references(() => projects.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  description: text("description"),
  type: text("type", { enum: ["document", "approval", "info", "other"] }).notNull().default("document"),
  status: text("status", { enum: ["pending", "completed", "cancelled"] }).notNull().default("pending"),
  dueDate: date("due_date"),
  completedAt: timestamp("completed_at", { withTimezone: true }),
  createdBy: text("created_by").references(() => users.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

// ─── Custom Package Requests (client portal) ───

export const customPackageRequests = pgTable("custom_package_requests", {
  id: uuid("id").defaultRandom().primaryKey(),
  workspaceId: uuid("workspace_id").notNull().references(() => workspaces.id, { onDelete: "cascade" }),
  projectId: uuid("project_id").notNull().references(() => projects.id, { onDelete: "cascade" }),
  clientPortalToken: text("client_portal_token").notNull(),
  requestedHours: integer("requested_hours").notNull(),
  estimatedPrice: numeric("estimated_price", { precision: 12, scale: 2 }),
  message: text("message"),
  status: text("status", { enum: ["pending", "approved", "rejected"] }).notNull().default("pending"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

// ─── Package Orders (client portal) ───

export const packageOrders = pgTable("package_orders", {
  id: uuid("id").defaultRandom().primaryKey(),
  workspaceId: uuid("workspace_id").notNull().references(() => workspaces.id, { onDelete: "cascade" }),
  projectId: uuid("project_id").notNull().references(() => projects.id, { onDelete: "cascade" }),
  packageId: uuid("package_id").notNull().references(() => packages.id, { onDelete: "cascade" }),
  clientPortalToken: text("client_portal_token").notNull(),
  packageName: text("package_name").notNull(),
  hours: integer("hours"),
  price: numeric("price", { precision: 12, scale: 2 }).notNull(),
  currency: text("currency").notNull().default("USD"),
  message: text("message"),
  status: text("status", { enum: ["pending", "confirmed", "invoiced", "cancelled"] }).notNull().default("pending"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

// ─── Comments (polymorphic) ───

export const comments = pgTable("comments", {
  id: uuid("id").defaultRandom().primaryKey(),
  workspaceId: uuid("workspace_id").notNull().references(() => workspaces.id, { onDelete: "cascade" }),
  entityType: text("entity_type", { enum: ["project", "task", "file", "invoice", "support_ticket"] }).notNull(),
  entityId: uuid("entity_id").notNull(),
  body: text("body").notNull(),
  visibility: text("visibility", { enum: ["internal", "client"] }).notNull().default("internal"),
  authorId: text("author_id").references(() => users.id, { onDelete: "set null" }),
  authorName: text("author_name"),
  authorEmail: text("author_email"),
  source: text("source", { enum: ["internal", "portal"] }).notNull().default("internal"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

// ─── Folders + Files ───

export const folders = pgTable("folders", {
  id: uuid("id").defaultRandom().primaryKey(),
  workspaceId: uuid("workspace_id").notNull().references(() => workspaces.id, { onDelete: "cascade" }),
  clientId: uuid("client_id").references(() => clients.id, { onDelete: "cascade" }),
  projectId: uuid("project_id").references(() => projects.id, { onDelete: "cascade" }),
  parentId: uuid("parent_id").references((): any => folders.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const files = pgTable("files", {
  id: uuid("id").defaultRandom().primaryKey(),
  workspaceId: uuid("workspace_id").notNull().references(() => workspaces.id, { onDelete: "cascade" }),
  clientId: uuid("client_id").references(() => clients.id, { onDelete: "cascade" }),
  projectId: uuid("project_id").references(() => projects.id, { onDelete: "cascade" }),
  folderId: uuid("folder_id").references(() => folders.id, { onDelete: "set null" }),
  name: text("name").notNull(),
  storageKey: text("storage_key").notNull(),
  mimeType: text("mime_type"),
  sizeBytes: bigint("size_bytes", { mode: "number" }),
  visibility: text("visibility", { enum: ["internal", "client"] }).notNull().default("internal"),
  fileType: text("file_type", { enum: ["working_file", "deliverable"] }).notNull().default("working_file"),
  uploadedBy: text("uploaded_by").references(() => users.id, { onDelete: "set null" }),
  lastViewedAt: timestamp("last_viewed_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

// ─── Time tracking ───

export const timeEntries = pgTable("time_entries", {
  id: uuid("id").defaultRandom().primaryKey(),
  workspaceId: uuid("workspace_id").notNull().references(() => workspaces.id, { onDelete: "cascade" }),
  clientId: uuid("client_id").notNull().references(() => clients.id, { onDelete: "cascade" }),
  projectId: uuid("project_id").notNull().references(() => projects.id, { onDelete: "cascade" }),
  taskId: uuid("task_id").references(() => tasks.id, { onDelete: "set null" }),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  description: text("description"),
  tags: text("tags"),
  startTime: timestamp("start_time", { withTimezone: true }),
  endTime: timestamp("end_time", { withTimezone: true }),
  manualMinutes: integer("manual_minutes"),
  durationMinutes: integer("duration_minutes").generatedAlwaysAs(
    sql`case when start_time is not null and end_time is not null then greatest(0, floor(extract(epoch from (end_time - start_time)) / 60)::integer) else coalesce(manual_minutes, 0) end`,
  ),
  billable: boolean("billable").notNull().default(true),
  hourlyRate: numeric("hourly_rate", { precision: 12, scale: 2 }),
  status: text("status", { enum: ["draft", "approved", "invoiced"] }).notNull().default("draft"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

// ─── Invoices ───

export const invoices = pgTable("invoices", {
  id: uuid("id").defaultRandom().primaryKey(),
  workspaceId: uuid("workspace_id").notNull().references(() => workspaces.id, { onDelete: "cascade" }),
  clientId: uuid("client_id").notNull().references(() => clients.id, { onDelete: "cascade" }),
  projectId: uuid("project_id").references(() => projects.id, { onDelete: "set null" }),
  invoiceNumber: text("invoice_number").notNull(),
  issueDate: date("issue_date").notNull(),
  dueDate: date("due_date"),
  currency: text("currency").notNull().default("IDR"),
  subtotal: numeric("subtotal", { precision: 12, scale: 2 }).notNull().default("0"),
  discount: numeric("discount", { precision: 12, scale: 2 }).notNull().default("0"),
  tax: numeric("tax", { precision: 12, scale: 2 }).notNull().default("0"),
  total: numeric("total", { precision: 12, scale: 2 }).notNull().default("0"),
  status: text("status", { enum: ["draft", "sent", "viewed", "paid", "overdue", "cancelled"] }).notNull().default("draft"),
  notes: text("notes"),
  terms: text("terms"),
  sharedTokenHash: text("shared_token_hash").unique(),
  sharedTokenExpiresAt: timestamp("shared_token_expires_at", { withTimezone: true }),
  sharedTokenRevokedAt: timestamp("shared_token_revoked_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [unique().on(table.workspaceId, table.invoiceNumber)]);

export const invoiceItems = pgTable("invoice_items", {
  id: uuid("id").defaultRandom().primaryKey(),
  invoiceId: uuid("invoice_id").notNull().references(() => invoices.id, { onDelete: "cascade" }),
  description: text("description").notNull(),
  quantity: numeric("quantity", { precision: 12, scale: 2 }).notNull().default("1"),
  unitPrice: numeric("unit_price", { precision: 12, scale: 2 }).notNull().default("0"),
  amount: numeric("amount", { precision: 12, scale: 2 }).notNull().default("0"),
  sourceType: text("source_type", { enum: ["manual", "time_entry"] }),
  sourceId: uuid("source_id"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const payments = pgTable("payments", {
  id: uuid("id").defaultRandom().primaryKey(),
  invoiceId: uuid("invoice_id").notNull().references(() => invoices.id, { onDelete: "cascade" }),
  amount: numeric("amount", { precision: 12, scale: 2 }).notNull(),
  paidAt: date("paid_at").notNull(),
  method: text("method"),
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

// ─── Appointments ───

export const availabilityRules = pgTable("availability_rules", {
  id: uuid("id").defaultRandom().primaryKey(),
  workspaceId: uuid("workspace_id").notNull().references(() => workspaces.id, { onDelete: "cascade" }),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  dayOfWeek: integer("day_of_week").notNull(),
  startTime: time("start_time").notNull(),
  endTime: time("end_time").notNull(),
  timezone: text("timezone").notNull().default("UTC"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const appointments = pgTable("appointments", {
  id: uuid("id").defaultRandom().primaryKey(),
  workspaceId: uuid("workspace_id").notNull().references(() => workspaces.id, { onDelete: "cascade" }),
  clientId: uuid("client_id").references(() => clients.id, { onDelete: "set null" }),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  notes: text("notes"),
  attendeeName: text("attendee_name"),
  attendeeEmail: text("attendee_email"),
  startTime: timestamp("start_time", { withTimezone: true }).notNull(),
  endTime: timestamp("end_time", { withTimezone: true }).notNull(),
  status: text("status", { enum: ["scheduled", "cancelled", "completed"] }).notNull().default("scheduled"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

// ─── AI Prompts ───

export const promptTemplates = pgTable("prompt_templates", {
  id: uuid("id").defaultRandom().primaryKey(),
  workspaceId: uuid("workspace_id").references(() => workspaces.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  category: text("category").notNull(),
  description: text("description"),
  template: text("template").notNull(),
  isSystem: boolean("is_system").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const promptGenerations = pgTable("prompt_generations", {
  id: uuid("id").defaultRandom().primaryKey(),
  workspaceId: uuid("workspace_id").notNull().references(() => workspaces.id, { onDelete: "cascade" }),
  clientId: uuid("client_id").references(() => clients.id, { onDelete: "set null" }),
  projectId: uuid("project_id").references(() => projects.id, { onDelete: "set null" }),
  templateId: uuid("template_id").references(() => promptTemplates.id, { onDelete: "set null" }),
  input: jsonb("input").notNull().default({}),
  generatedPrompt: text("generated_prompt"),
  generatedOutput: text("generated_output"),
  model: text("model"),
  inputTokens: integer("input_tokens").notNull().default(0),
  outputTokens: integer("output_tokens").notNull().default(0),
  costUsd: numeric("cost_usd", { precision: 10, scale: 4 }).notNull().default("0"),
  createdBy: text("created_by").references(() => users.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

// ─── Logging ───

export const activityLogs = pgTable("activity_logs", {
  id: uuid("id").defaultRandom().primaryKey(),
  workspaceId: uuid("workspace_id").notNull().references(() => workspaces.id, { onDelete: "cascade" }),
  actorId: text("actor_id").references(() => users.id, { onDelete: "set null" }),
  action: text("action").notNull(),
  entityType: text("entity_type").notNull(),
  entityId: uuid("entity_id"),
  metadata: jsonb("metadata").notNull().default({}),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const portalAccessLogs = pgTable("portal_access_logs", {
  id: uuid("id").defaultRandom().primaryKey(),
  workspaceId: uuid("workspace_id").references(() => workspaces.id, { onDelete: "set null" }),
  clientId: uuid("client_id").references(() => clients.id, { onDelete: "set null" }),
  invoiceId: uuid("invoice_id").references(() => invoices.id, { onDelete: "set null" }),
  tokenType: text("token_type", { enum: ["client_portal", "invoice_share"] }).notNull(),
  tokenHashPrefix: text("token_hash_prefix"),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  accessedAt: timestamp("accessed_at", { withTimezone: true }).notNull().defaultNow(),
});

// ─── Relations ───

export const workspaceRelations = relations(workspaces, ({ many }) => ({
  members: many(workspaceMembers),
  clients: many(clients),
  projects: many(projects),
}));

export const clientRelations = relations(clients, ({ one, many }) => ({
  workspace: one(workspaces, { fields: [clients.workspaceId], references: [workspaces.id] }),
  projects: many(projects),
}));

export const projectRelations = relations(projects, ({ one, many }) => ({
  workspace: one(workspaces, { fields: [projects.workspaceId], references: [workspaces.id] }),
  client: one(clients, { fields: [projects.clientId], references: [clients.id] }),
  tasks: many(tasks),
  members: many(projectMembers),
}));

export const taskRelations = relations(tasks, ({ one }) => ({
  project: one(projects, { fields: [tasks.projectId], references: [projects.id] }),
}));

// ─── AI Assistant ───

export const aiConversations = pgTable("ai_conversations", {
  id: uuid("id").defaultRandom().primaryKey(),
  workspaceId: uuid("workspace_id").notNull().references(() => workspaces.id, { onDelete: "cascade" }),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  title: text("title").notNull().default("New chat"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const aiMessages = pgTable("ai_messages", {
  id: uuid("id").defaultRandom().primaryKey(),
  conversationId: uuid("conversation_id").notNull().references(() => aiConversations.id, { onDelete: "cascade" }),
  role: text("role", { enum: ["user", "assistant", "tool"] }).notNull(),
  content: text("content").notNull().default(""),
  toolCalls: jsonb("tool_calls").notNull().default(sql`'[]'::jsonb`),
  toolName: text("tool_name"),
  tokens: integer("tokens").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const aiConversationRelations = relations(aiConversations, ({ many }) => ({
  messages: many(aiMessages),
}));

export const aiMessageRelations = relations(aiMessages, ({ one }) => ({
  conversation: one(aiConversations, {
    fields: [aiMessages.conversationId],
    references: [aiConversations.id],
  }),
}));

// ─── Finance: Expenses (Sprint H) ───

export const expenseCategories = pgTable("expense_categories", {
  id: uuid("id").defaultRandom().primaryKey(),
  workspaceId: uuid("workspace_id").notNull().references(() => workspaces.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  color: text("color").notNull().default("#64748b"),
  icon: text("icon"),
  isDefault: boolean("is_default").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [unique().on(table.workspaceId, table.name)]);

export const expenses = pgTable("expenses", {
  id: uuid("id").defaultRandom().primaryKey(),
  workspaceId: uuid("workspace_id").notNull().references(() => workspaces.id, { onDelete: "cascade" }),
  categoryId: uuid("category_id").references(() => expenseCategories.id, { onDelete: "set null" }),
  projectId: uuid("project_id").references(() => projects.id, { onDelete: "set null" }),
  clientId: uuid("client_id").references(() => clients.id, { onDelete: "set null" }),
  amount: numeric("amount", { precision: 12, scale: 2 }).notNull(),
  currency: text("currency").notNull().default("IDR"),
  date: date("date").notNull(),
  description: text("description").notNull(),
  vendor: text("vendor"),
  receiptUrl: text("receipt_url"),
  taxIncluded: boolean("tax_included").notNull().default(false),
  taxAmount: numeric("tax_amount", { precision: 12, scale: 2 }),
  createdBy: text("created_by").references(() => users.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const expenseCategoryRelations = relations(expenseCategories, ({ one, many }) => ({
  workspace: one(workspaces, { fields: [expenseCategories.workspaceId], references: [workspaces.id] }),
  expenses: many(expenses),
}));

export const expenseRelations = relations(expenses, ({ one }) => ({
  workspace: one(workspaces, { fields: [expenses.workspaceId], references: [workspaces.id] }),
  category: one(expenseCategories, { fields: [expenses.categoryId], references: [expenseCategories.id] }),
  project: one(projects, { fields: [expenses.projectId], references: [projects.id] }),
  client: one(clients, { fields: [expenses.clientId], references: [clients.id] }),
  createdByUser: one(users, { fields: [expenses.createdBy], references: [users.id] }),
}));

// ─── Pre-deal: Proposals (Sprint J — P2.7 phase 1) ───

export const proposals = pgTable("proposals", {
  id: uuid("id").defaultRandom().primaryKey(),
  workspaceId: uuid("workspace_id").notNull().references(() => workspaces.id, { onDelete: "cascade" }),
  clientId: uuid("client_id").notNull().references(() => clients.id, { onDelete: "cascade" }),
  projectId: uuid("project_id").references(() => projects.id, { onDelete: "set null" }),
  title: text("title").notNull(),
  body: text("body"),
  // Stored as JSONB array: [{ description, quantity, unitPrice, amount }]
  lineItems: jsonb("line_items").notNull().default(sql`'[]'::jsonb`),
  subtotal: numeric("subtotal", { precision: 12, scale: 2 }).notNull().default("0"),
  tax: numeric("tax", { precision: 12, scale: 2 }).notNull().default("0"),
  total: numeric("total", { precision: 12, scale: 2 }).notNull().default("0"),
  currency: text("currency").notNull().default("IDR"),
  downPaymentPercent: numeric("down_payment_percent", { precision: 5, scale: 2 }).notNull().default("50"),
  validUntil: date("valid_until"),
  status: text("status", { enum: ["draft", "sent", "viewed", "accepted", "declined", "expired"] }).notNull().default("draft"),
  declineReason: text("decline_reason"),
  sharedTokenHash: text("shared_token_hash").unique(),
  sharedTokenExpiresAt: timestamp("shared_token_expires_at", { withTimezone: true }),
  sharedTokenRevokedAt: timestamp("shared_token_revoked_at", { withTimezone: true }),
  sentAt: timestamp("sent_at", { withTimezone: true }),
  viewedAt: timestamp("viewed_at", { withTimezone: true }),
  acceptedAt: timestamp("accepted_at", { withTimezone: true }),
  declinedAt: timestamp("declined_at", { withTimezone: true }),
  createdBy: text("created_by").references(() => users.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const proposalRelations = relations(proposals, ({ one }) => ({
  workspace: one(workspaces, { fields: [proposals.workspaceId], references: [workspaces.id] }),
  client: one(clients, { fields: [proposals.clientId], references: [clients.id] }),
  project: one(projects, { fields: [proposals.projectId], references: [projects.id] }),
  createdByUser: one(users, { fields: [proposals.createdBy], references: [users.id] }),
}));

// ─── Finance: Recurring Expenses (Sprint K — P2.8 phase 3) ───

export const expenseRecurring = pgTable("expense_recurring", {
  id: uuid("id").defaultRandom().primaryKey(),
  workspaceId: uuid("workspace_id").notNull().references(() => workspaces.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  amount: numeric("amount", { precision: 12, scale: 2 }).notNull(),
  currency: text("currency").notNull().default("IDR"),
  categoryId: uuid("category_id").references(() => expenseCategories.id, { onDelete: "set null" }),
  projectId: uuid("project_id").references(() => projects.id, { onDelete: "set null" }),
  frequency: text("frequency", { enum: ["monthly", "quarterly", "yearly"] }).notNull().default("monthly"),
  startDate: date("start_date").notNull(),
  endDate: date("end_date"),
  lastGeneratedDate: date("last_generated_date"),
  isActive: boolean("is_active").notNull().default(true),
  notes: text("notes"),
  createdBy: text("created_by").references(() => users.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const expenseRecurringRelations = relations(expenseRecurring, ({ one }) => ({
  workspace: one(workspaces, { fields: [expenseRecurring.workspaceId], references: [workspaces.id] }),
  category: one(expenseCategories, { fields: [expenseRecurring.categoryId], references: [expenseCategories.id] }),
  project: one(projects, { fields: [expenseRecurring.projectId], references: [projects.id] }),
}));

// ─── Pre-deal: Questionnaires (Sprint L — P2.7.2) ───

// `schema` JSONB: array of fields
// Field shape: { id: string, type: "text"|"textarea"|"select"|"multiselect"|"number"|"date"|"email"|"url", label: string, required: boolean, options?: string[], placeholder?: string }
export const questionnaires = pgTable("questionnaires", {
  id: uuid("id").defaultRandom().primaryKey(),
  workspaceId: uuid("workspace_id").notNull().references(() => workspaces.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  description: text("description"),
  schema: jsonb("schema").notNull().default(sql`'[]'::jsonb`),
  createdBy: text("created_by").references(() => users.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

// `answers` JSONB: { [fieldId: string]: string | string[] | number }
export const questionnaireResponses = pgTable("questionnaire_responses", {
  id: uuid("id").defaultRandom().primaryKey(),
  workspaceId: uuid("workspace_id").notNull().references(() => workspaces.id, { onDelete: "cascade" }),
  questionnaireId: uuid("questionnaire_id").notNull().references(() => questionnaires.id, { onDelete: "cascade" }),
  clientId: uuid("client_id").references(() => clients.id, { onDelete: "set null" }),
  projectId: uuid("project_id").references(() => projects.id, { onDelete: "set null" }),
  // Client metadata (filled on public form)
  respondentName: text("respondent_name"),
  respondentEmail: text("respondent_email"),
  // `answers` is the submitted form data: { fieldId: value }
  answers: jsonb("answers").notNull().default(sql`'{}'::jsonb`),
  status: text("status", { enum: ["pending", "submitted"] }).notNull().default("pending"),
  sharedTokenHash: text("shared_token_hash").unique(),
  sharedTokenExpiresAt: timestamp("shared_token_expires_at", { withTimezone: true }),
  sharedTokenRevokedAt: timestamp("shared_token_revoked_at", { withTimezone: true }),
  submittedAt: timestamp("submitted_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const questionnaireRelations = relations(questionnaires, ({ one, many }) => ({
  workspace: one(workspaces, { fields: [questionnaires.workspaceId], references: [workspaces.id] }),
  createdByUser: one(users, { fields: [questionnaires.createdBy], references: [users.id] }),
  responses: many(questionnaireResponses),
}));

export const questionnaireResponseRelations = relations(questionnaireResponses, ({ one }) => ({
  workspace: one(workspaces, { fields: [questionnaireResponses.workspaceId], references: [workspaces.id] }),
  questionnaire: one(questionnaires, { fields: [questionnaireResponses.questionnaireId], references: [questionnaires.id] }),
  client: one(clients, { fields: [questionnaireResponses.clientId], references: [clients.id] }),
  project: one(projects, { fields: [questionnaireResponses.projectId], references: [projects.id] }),
}));

// ─── Pre-deal: Contracts + E-signature (Sprint M — P2.7.3) ───

// `body` is markdown template with `{{variable}}` placeholders
// Variables resolved at send time: client.name, client.email, project.name, workspace.name, today, valid_until
export const contractTemplates = pgTable("contract_templates", {
  id: uuid("id").defaultRandom().primaryKey(),
  workspaceId: uuid("workspace_id").notNull().references(() => workspaces.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  body: text("body").notNull(),
  isDefault: boolean("is_default").notNull().default(false),
  createdBy: text("created_by").references(() => users.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

// `body_resolved` is the rendered contract at send time (immutable after send)
// `variables` jsonb stores the {client_name, project_name, etc} snapshot used to render
export const contracts = pgTable("contracts", {
  id: uuid("id").defaultRandom().primaryKey(),
  workspaceId: uuid("workspace_id").notNull().references(() => workspaces.id, { onDelete: "cascade" }),
  clientId: uuid("client_id").notNull().references(() => clients.id, { onDelete: "cascade" }),
  projectId: uuid("project_id").references(() => projects.id, { onDelete: "set null" }),
  templateId: uuid("template_id").references(() => contractTemplates.id, { onDelete: "set null" }),
  title: text("title").notNull(),
  body: text("body"), // original template body (with placeholders), for record
  bodyResolved: text("body_resolved"), // rendered at send, immutable
  variables: jsonb("variables").notNull().default(sql`'{}'::jsonb`),
  validUntil: date("valid_until"),
  status: text("status", { enum: ["draft", "sent", "viewed", "signed", "declined", "expired", "revoked"] }).notNull().default("draft"),
  declineReason: text("decline_reason"),
  // Signature data
  signedName: text("signed_name"),
  signedEmail: text("signed_email"),
  signatureDataUrl: text("signature_data_url"), // base64 PNG from canvas
  signedAt: timestamp("signed_at", { withTimezone: true }),
  signedFromIp: text("signed_from_ip"),
  signedUserAgent: text("signed_user_agent"),
  // Token
  sharedTokenHash: text("shared_token_hash").unique(),
  sharedTokenExpiresAt: timestamp("shared_token_expires_at", { withTimezone: true }),
  sharedTokenRevokedAt: timestamp("shared_token_revoked_at", { withTimezone: true }),
  sentAt: timestamp("sent_at", { withTimezone: true }),
  viewedAt: timestamp("viewed_at", { withTimezone: true }),
  declinedAt: timestamp("declined_at", { withTimezone: true }),
  createdBy: text("created_by").references(() => users.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const contractTemplateRelations = relations(contractTemplates, ({ one, many }) => ({
  workspace: one(workspaces, { fields: [contractTemplates.workspaceId], references: [workspaces.id] }),
  createdByUser: one(users, { fields: [contractTemplates.createdBy], references: [users.id] }),
  contracts: many(contracts),
}));

export const contractRelations = relations(contracts, ({ one }) => ({
  workspace: one(workspaces, { fields: [contracts.workspaceId], references: [workspaces.id] }),
  client: one(clients, { fields: [contracts.clientId], references: [clients.id] }),
  project: one(projects, { fields: [contracts.projectId], references: [projects.id] }),
  template: one(contractTemplates, { fields: [contracts.templateId], references: [contractTemplates.id] }),
  createdByUser: one(users, { fields: [contracts.createdBy], references: [users.id] }),
}));

// ─── Notifications ───

export const notifications = pgTable("notifications", {
  id: uuid("id").defaultRandom().primaryKey(),
  workspaceId: uuid("workspace_id").notNull().references(() => workspaces.id, { onDelete: "cascade" }),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  type: text("type", {
    enum: [
      "task_assigned",      // X assigned you to task Y
      "task_commented",     // X commented on your task
      "client_comment",     // client posted comment via portal
      "file_viewed",        // client viewed file via portal
      "invoice_paid",       // invoice marked paid
      "invoice_sent",       // invoice sent to client
      "proposal_viewed",    // client viewed proposal
      "contract_signed",    // client signed contract
      "contract_viewed",    // client viewed contract
      "questionnaire_answered", // client answered questionnaire
      "booking_created",    // client booked via booking page
      "task_status_changed", // task status changed
      "task_due_soon",      // due date reminder
      "invoice_overdue",    // invoice overdue reminder
      "mention",            // @mentioned in comment
    ],
  }).notNull(),
  title: text("title").notNull(),
  body: text("body"),
  // Link to navigate to when clicked (relative path)
  link: text("link"),
  // Optional resource ref for grouping/dedup
  entityType: text("entity_type"),
  entityId: uuid("entity_id"),
  actorId: text("actor_id").references(() => users.id, { onDelete: "set null" }),
  readAt: timestamp("read_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const notificationRelations = relations(notifications, ({ one }) => ({
  workspace: one(workspaces, { fields: [notifications.workspaceId], references: [workspaces.id] }),
  user: one(users, { fields: [notifications.userId], references: [users.id] }),
  actor: one(users, { fields: [notifications.actorId], references: [users.id] }),
}));

// ─── P4: Email suite + personal workspace ───

export const emailTemplates = pgTable("email_templates", {
  id: uuid("id").defaultRandom().primaryKey(),
  workspaceId: uuid("workspace_id").notNull().references(() => workspaces.id, { onDelete: "cascade" }),
  userId: text("user_id").references(() => users.id, { onDelete: "set null" }),
  name: text("name").notNull(),
  subject: text("subject").notNull(),
  body: text("body").notNull(),
  category: text("category").notNull().default("general"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [unique().on(table.workspaceId, table.name)]);

export const emailMessages = pgTable("email_messages", {
  id: uuid("id").defaultRandom().primaryKey(),
  workspaceId: uuid("workspace_id").notNull().references(() => workspaces.id, { onDelete: "cascade" }),
  clientId: uuid("client_id").references(() => clients.id, { onDelete: "set null" }),
  projectId: uuid("project_id").references(() => projects.id, { onDelete: "set null" }),
  userId: text("user_id").references(() => users.id, { onDelete: "set null" }),
  toEmail: text("to_email").notNull(),
  subject: text("subject").notNull(),
  body: text("body").notNull(),
  status: text("status", { enum: ["draft", "sent", "failed"] }).notNull().default("draft"),
  sentAt: timestamp("sent_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const personalNotes = pgTable("personal_notes", {
  id: uuid("id").defaultRandom().primaryKey(),
  workspaceId: uuid("workspace_id").notNull().references(() => workspaces.id, { onDelete: "cascade" }),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  body: text("body"),
  dueDate: timestamp("due_date", { withTimezone: true }),
  recurrenceRule: text("recurrence_rule").notNull().default("none"),
  notify7d: boolean("notify_7d").notNull().default(false),
  notify3d: boolean("notify_3d").notNull().default(false),
  notify1d: boolean("notify_1d").notNull().default(false),
  status: text("status", { enum: ["open", "done", "archived"] }).notNull().default("open"),
  pinned: boolean("pinned").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

// ─── Portal visit audit ───

export const supportTickets = pgTable("support_tickets", {
  id: uuid("id").defaultRandom().primaryKey(),
  workspaceId: uuid("workspace_id").notNull().references(() => workspaces.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  description: text("description"),
  status: text("status", { enum: ["open", "in_progress", "resolved", "closed"] }).notNull().default("open"),
  priority: text("priority", { enum: ["low", "medium", "high", "urgent"] }).notNull().default("medium"),
  assigneeId: text("assignee_id").references(() => users.id, { onDelete: "set null" }),
  clientId: uuid("client_id").references(() => clients.id, { onDelete: "set null" }),
  projectId: uuid("project_id").references(() => projects.id, { onDelete: "set null" }),
  createdBy: text("created_by").references(() => users.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const invoiceTemplates = pgTable("invoice_templates", {
  id: uuid("id").defaultRandom().primaryKey(),
  workspaceId: uuid("workspace_id").notNull().references(() => workspaces.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  terms: text("terms"),
  notes: text("notes"),
  defaultCurrency: text("default_currency").notNull().default("IDR"),
  defaultTaxRate: numeric("default_tax_rate", { precision: 5, scale: 2 }).default("0"),
  lineItems: text("line_items"), // JSON array of {description, quantity, unitPrice}
  createdBy: text("created_by").references(() => users.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const portalVisits = pgTable("portal_visits", {
  id: uuid("id").defaultRandom().primaryKey(),
  workspaceId: uuid("workspace_id").notNull().references(() => workspaces.id, { onDelete: "cascade" }),
  resourceType: text("resource_type").notNull(),
  resourceId: uuid("resource_id").notNull(),
  clientId: uuid("client_id").references(() => clients.id, { onDelete: "cascade" }),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  visitedAt: timestamp("visited_at", { withTimezone: true }).notNull().defaultNow(),
});

export const portalVisitRelations = relations(portalVisits, ({ one }) => ({
  workspace: one(workspaces, { fields: [portalVisits.workspaceId], references: [workspaces.id] }),
  client: one(clients, { fields: [portalVisits.clientId], references: [clients.id] }),
}));
