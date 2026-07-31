import {
  bigint,
  boolean,
  check,
  date,
  foreignKey,
  index,
  integer,
  jsonb,
  numeric,
  pgTable,
  text,
  time,
  timestamp,
  unique,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import { relations, sql } from "drizzle-orm";
import type { PersonalSiteLink, PersonalSiteSection } from "@/lib/personal-site/model";

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
  /** Show secondary ≈ base-currency amount under multi-currency list rows. */
  showBaseCurrencyApprox: boolean("show_base_currency_approx").notNull().default(true),
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
  invoiceEmailBody: text("invoice_email_body"),
  bookingSlug: text("booking_slug").unique(),
  timezone: text("timezone").notNull().default("UTC"),
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
  clientNumber: text("client_number"),
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
  portalTokenEnc: text("portal_token_enc"),
  portalTokenExpiresAt: timestamp("portal_token_expires_at", { withTimezone: true }),
  portalTokenRevokedAt: timestamp("portal_token_revoked_at", { withTimezone: true }),
  portalSlug: text("portal_slug").unique(),
  portalSlugEnabled: boolean("portal_slug_enabled").notNull().default(false),
  portalPasswordHash: text("portal_password_hash"),
  portalSessionVersion: text("portal_session_version").notNull().default("1"),
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
  status: text("status", { enum: ["draft", "active", "on_hold", "completed", "cancelled", "archived"] }).notNull().default("active"),
  billingType: text("billing_type", { enum: ["fixed_price", "hourly", "retainer", "package", "project", "hours"] }).notNull().default("fixed_price"),
  billingModel: text("billing_model", { enum: ["fixed_price", "hourly", "retainer", "legacy_package"] }),
  taskModePolicy: text("task_mode_policy", { enum: ["billing_default", "workflow", "reusable", "mixed"] }).notNull().default("billing_default"),
  retainerFee: numeric("retainer_fee", { precision: 12, scale: 2 }),
  retainerIncludedMinutes: integer("retainer_included_minutes"),
  retainerPeriodUnit: text("retainer_period_unit", { enum: ["month"] }),
  retainerResetDay: integer("retainer_reset_day"),
  retainerOveragePolicy: text("retainer_overage_policy", { enum: ["none", "warn", "bill"] }),
  retainerOverageRate: numeric("retainer_overage_rate", { precision: 12, scale: 2 }),
  timeTrackingMode: text("time_tracking_mode", { enum: ["off", "internal", "billable"] }).notNull().default("internal"),
  activityRequired: boolean("activity_required").notNull().default(false),
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
}, (table) => [
  unique("projects_id_workspace_unique").on(table.id, table.workspaceId),
  check("projects_task_mode_policy_check", sql`${table.taskModePolicy} in ('billing_default', 'workflow', 'reusable', 'mixed')`),
]);

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
  // NULL projectId = workspace-level catalog template (reusable across projects).
  // Non-NULL = legacy per-project package (kept for backward compatibility).
  projectId: uuid("project_id").references(() => projects.id, { onDelete: "cascade" }),
  name: text("name").notNull(), // e.g. "40 HOURS", "60 HOURS"
  hours: integer("hours"), // legacy included hours; dual-read with allowanceValue
  price: numeric("price", { precision: 12, scale: 2 }).notNull(),
  currency: text("currency").notNull().default("IDR"),
  description: text("description"), // subtitle
  features: text("features"), // JSON array of feature strings
  badge: text("badge"), // e.g. "BEST FOR A TEAM"
  sortOrder: integer("sort_order").notNull().default(0),
  active: boolean("active").notNull().default(true), // legacy status flag
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  customPrice: numeric("custom_price", { precision: 12, scale: 2 }),
  minHours: integer("min_hours"),
  maxHours: integer("max_hours"),
  allowCustom: boolean("allow_custom").notNull().default(false),
  allowanceType: text("allowance_type", { enum: ["hours"] }).notNull().default("hours"),
  allowanceValue: numeric("allowance_value", { precision: 12, scale: 2 }),
  lifecycleClass: text("lifecycle_class", { enum: ["one_off", "legacy_recurring_unmodeled"] }).notNull().default("one_off"),
  status: text("status", { enum: ["active", "archived"] }).notNull().default("active"),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  unique("packages_id_workspace_unique").on(table.id, table.workspaceId),
  index("packages_workspace_status_sort_idx").on(table.workspaceId, table.status, table.sortOrder),
  check("packages_price_check", sql`${table.price} >= 0`),
  check("packages_allowance_value_check", sql`${table.allowanceValue} is null or ${table.allowanceValue} >= 0`),
]);

// ─── Services (Phase 3 catalog) ───

export const serviceCategories = pgTable("service_categories", {
  id: uuid("id").defaultRandom().primaryKey(),
  workspaceId: uuid("workspace_id").notNull().references(() => workspaces.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  normalizedName: text("normalized_name").notNull(),
  color: text("color").notNull().default("#64748b"),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  unique("service_categories_id_workspace_unique").on(table.id, table.workspaceId),
  unique("service_categories_workspace_normalized_name_unique").on(table.workspaceId, table.normalizedName),
  check("service_categories_name_not_blank_check", sql`length(btrim(${table.name})) > 0`),
]);

export const services = pgTable("services", {
  id: uuid("id").defaultRandom().primaryKey(),
  workspaceId: uuid("workspace_id").notNull().references(() => workspaces.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  normalizedName: text("normalized_name").notNull(),
  description: text("description"),
  categoryId: uuid("category_id"),
  defaultPricingModel: text("default_pricing_model", { enum: ["fixed", "hourly", "unit"] }).notNull().default("fixed"),
  defaultUnit: text("default_unit").notNull().default("service"),
  defaultPrice: numeric("default_price", { precision: 12, scale: 2 }),
  currency: text("currency").notNull().default("IDR"),
  status: text("status", { enum: ["active", "archived"] }).notNull().default("active"),
  createdBy: text("created_by").references(() => users.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  unique("services_id_workspace_unique").on(table.id, table.workspaceId),
  uniqueIndex("services_workspace_active_normalized_name_uidx")
    .on(table.workspaceId, table.normalizedName)
    .where(sql`${table.status} = 'active'`),
  foreignKey({
    columns: [table.categoryId, table.workspaceId],
    foreignColumns: [serviceCategories.id, serviceCategories.workspaceId],
    name: "services_category_workspace_fk",
  }).onDelete("set null"),
  index("services_workspace_status_name_idx").on(table.workspaceId, table.status, table.name),
  check("services_name_not_blank_check", sql`length(btrim(${table.name})) > 0`),
  check("services_default_price_check", sql`${table.defaultPrice} is null or ${table.defaultPrice} >= 0`),
]);

export const packageItems = pgTable("package_items", {
  id: uuid("id").defaultRandom().primaryKey(),
  workspaceId: uuid("workspace_id").notNull().references(() => workspaces.id, { onDelete: "cascade" }),
  packageId: uuid("package_id").notNull(),
  serviceId: uuid("service_id").notNull(),
  quantity: numeric("quantity", { precision: 12, scale: 2 }).notNull().default("1"),
  unit: text("unit").notNull().default("service"),
  unitPrice: numeric("unit_price", { precision: 12, scale: 2 }),
  currency: text("currency").notNull().default("IDR"),
  includedAllowance: numeric("included_allowance", { precision: 12, scale: 2 }),
  sortOrder: integer("sort_order").notNull().default(0),
  status: text("status", { enum: ["active", "archived"] }).notNull().default("active"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  unique("package_items_id_workspace_unique").on(table.id, table.workspaceId),
  unique("package_items_package_service_unique").on(table.packageId, table.serviceId),
  foreignKey({
    columns: [table.packageId, table.workspaceId],
    foreignColumns: [packages.id, packages.workspaceId],
    name: "package_items_package_workspace_fk",
  }).onDelete("cascade"),
  foreignKey({
    columns: [table.serviceId, table.workspaceId],
    foreignColumns: [services.id, services.workspaceId],
    name: "package_items_service_workspace_fk",
  }).onDelete("restrict"),
  index("package_items_workspace_package_status_idx").on(table.workspaceId, table.packageId, table.status),
  check("package_items_quantity_check", sql`${table.quantity} >= 0`),
  check("package_items_unit_price_check", sql`${table.unitPrice} is null or ${table.unitPrice} >= 0`),
  check("package_items_included_allowance_check", sql`${table.includedAllowance} is null or ${table.includedAllowance} >= 0`),
]);

export const projectPackageAssignments = pgTable("project_package_assignments", {
  id: uuid("id").defaultRandom().primaryKey(),
  workspaceId: uuid("workspace_id").notNull().references(() => workspaces.id, { onDelete: "cascade" }),
  projectId: uuid("project_id").notNull(),
  sourcePackageId: uuid("source_package_id"),
  sourceLifecycleClass: text("source_lifecycle_class", { enum: ["one_off", "legacy_recurring_unmodeled"] }).notNull().default("one_off"),
  nameSnapshot: text("name_snapshot").notNull(),
  descriptionSnapshot: text("description_snapshot"),
  priceSnapshot: numeric("price_snapshot", { precision: 12, scale: 2 }).notNull(),
  currencySnapshot: text("currency_snapshot").notNull().default("IDR"),
  allowanceTypeSnapshot: text("allowance_type_snapshot", { enum: ["hours"] }).notNull().default("hours"),
  allowanceValueSnapshot: numeric("allowance_value_snapshot", { precision: 12, scale: 2 }),
  assignedAt: timestamp("assigned_at", { withTimezone: true }).notNull().defaultNow(),
  status: text("status", { enum: ["active", "archived"] }).notNull().default("active"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  unique("project_package_assignments_id_workspace_unique").on(table.id, table.workspaceId),
  uniqueIndex("project_package_assignments_active_project_uidx")
    .on(table.projectId)
    .where(sql`${table.status} = 'active'`),
  foreignKey({
    columns: [table.projectId, table.workspaceId],
    foreignColumns: [projects.id, projects.workspaceId],
    name: "project_package_assignments_project_workspace_fk",
  }).onDelete("cascade"),
  foreignKey({
    columns: [table.sourcePackageId, table.workspaceId],
    foreignColumns: [packages.id, packages.workspaceId],
    name: "project_package_assignments_source_package_workspace_fk",
  }).onDelete("set null"),
  index("project_package_assignments_workspace_project_status_idx").on(table.workspaceId, table.projectId, table.status),
  check("project_package_assignments_price_snapshot_check", sql`${table.priceSnapshot} >= 0`),
  check("project_package_assignments_allowance_value_check", sql`${table.allowanceValueSnapshot} is null or ${table.allowanceValueSnapshot} >= 0`),
]);

export const projectServices = pgTable("project_services", {
  id: uuid("id").defaultRandom().primaryKey(),
  workspaceId: uuid("workspace_id").notNull().references(() => workspaces.id, { onDelete: "cascade" }),
  projectId: uuid("project_id").notNull(),
  serviceId: uuid("service_id"),
  packageItemId: uuid("package_item_id"),
  projectPackageAssignmentId: uuid("project_package_assignment_id"),
  sourcePackageAssignmentId: uuid("source_package_assignment_id"),
  nameSnapshot: text("name_snapshot").notNull(),
  descriptionSnapshot: text("description_snapshot"),
  pricingModelSnapshot: text("pricing_model_snapshot", { enum: ["fixed", "hourly", "unit"] }).notNull().default("fixed"),
  quantity: numeric("quantity", { precision: 12, scale: 2 }).notNull().default("1"),
  unit: text("unit").notNull().default("service"),
  unitPrice: numeric("unit_price", { precision: 12, scale: 2 }),
  currencySnapshot: text("currency_snapshot").notNull().default("IDR"),
  amount: numeric("amount", { precision: 12, scale: 2 }),
  includedAllowance: numeric("included_allowance", { precision: 12, scale: 2 }),
  estimatedMinutes: integer("estimated_minutes"),
  costRateSnapshot: numeric("cost_rate_snapshot", { precision: 12, scale: 2 }),
  sortOrder: integer("sort_order").notNull().default(0),
  status: text("status", { enum: ["active", "archived"] }).notNull().default("active"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  unique("project_services_id_workspace_unique").on(table.id, table.workspaceId),
  unique("project_services_project_service_unique").on(table.projectId, table.serviceId),
  foreignKey({
    columns: [table.projectId, table.workspaceId],
    foreignColumns: [projects.id, projects.workspaceId],
    name: "project_services_project_workspace_fk",
  }).onDelete("cascade"),
  foreignKey({
    columns: [table.serviceId, table.workspaceId],
    foreignColumns: [services.id, services.workspaceId],
    name: "project_services_service_workspace_fk",
  }).onDelete("restrict"),
  foreignKey({
    columns: [table.packageItemId, table.workspaceId],
    foreignColumns: [packageItems.id, packageItems.workspaceId],
    name: "project_services_package_item_workspace_fk",
  }).onDelete("set null"),
  foreignKey({
    columns: [table.projectPackageAssignmentId, table.workspaceId],
    foreignColumns: [projectPackageAssignments.id, projectPackageAssignments.workspaceId],
    name: "project_services_project_package_assignment_workspace_fk",
  }).onDelete("set null"),
  foreignKey({
    columns: [table.sourcePackageAssignmentId, table.workspaceId],
    foreignColumns: [projectPackageAssignments.id, projectPackageAssignments.workspaceId],
    name: "project_services_source_package_assignment_workspace_fk",
  }).onDelete("set null"),
  index("project_services_workspace_project_status_idx").on(table.workspaceId, table.projectId, table.status),
  check("project_services_quantity_check", sql`${table.quantity} >= 0`),
  check("project_services_unit_price_check", sql`${table.unitPrice} is null or ${table.unitPrice} >= 0`),
  check("project_services_amount_check", sql`${table.amount} is null or ${table.amount} >= 0`),
]);

// ─── Tasks ───

export const taskTemplates = pgTable("task_templates", {
  id: uuid("id").defaultRandom().primaryKey(),
  workspaceId: uuid("workspace_id").notNull().references(() => workspaces.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  normalizedName: text("normalized_name").generatedAlwaysAs(sql`lower(btrim(name))`),
  description: text("description"),
  target: text("target", { enum: ["fixed_price", "hourly_retainer", "all"] }).notNull().default("all"),
  status: text("status", { enum: ["active", "archived"] }).notNull().default("active"),
  createdBy: text("created_by").notNull().references(() => users.id, { onDelete: "restrict" }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  unique("task_templates_id_workspace_unique").on(table.id, table.workspaceId),
  uniqueIndex("task_templates_workspace_active_normalized_name_uidx").on(table.workspaceId, table.normalizedName).where(sql`${table.status} = 'active'`),
  check("task_templates_target_check", sql`${table.target} in ('fixed_price', 'hourly_retainer', 'all')`),
  check("task_templates_status_check", sql`${table.status} in ('active', 'archived')`),
  check("task_templates_name_not_blank_check", sql`length(btrim(${table.name})) > 0`),
]);

export const taskTemplateItems = pgTable("task_template_items", {
  id: uuid("id").defaultRandom().primaryKey(),
  workspaceId: uuid("workspace_id").notNull().references(() => workspaces.id, { onDelete: "cascade" }),
  templateId: uuid("template_id").notNull(),
  title: text("title").notNull(),
  description: text("description"),
  defaultAssigneeId: text("default_assignee_id"),
  position: integer("position").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  unique("task_template_items_id_workspace_unique").on(table.id, table.workspaceId),
  unique("task_template_items_template_position_unique").on(table.templateId, table.position),
  foreignKey({ columns: [table.templateId, table.workspaceId], foreignColumns: [taskTemplates.id, taskTemplates.workspaceId], name: "task_template_items_template_workspace_fk" }).onDelete("cascade"),
  foreignKey({ columns: [table.workspaceId, table.defaultAssigneeId], foreignColumns: [workspaceMembers.workspaceId, workspaceMembers.userId], name: "task_template_items_assignee_workspace_fk" }),
  check("task_template_items_position_check", sql`${table.position} >= 0`),
  check("task_template_items_title_not_blank_check", sql`length(btrim(${table.title})) > 0`),
]);

export const taskTemplateImports = pgTable("task_template_imports", {
  id: uuid("id").defaultRandom().primaryKey(),
  workspaceId: uuid("workspace_id").notNull().references(() => workspaces.id, { onDelete: "cascade" }),
  projectId: uuid("project_id").notNull(),
  idempotencyKey: text("idempotency_key").notNull(),
  payloadFingerprint: text("payload_fingerprint").notNull(),
  result: jsonb("result"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  completedAt: timestamp("completed_at", { withTimezone: true }),
}, (table) => [
  unique("task_template_imports_idempotency_unique").on(table.workspaceId, table.projectId, table.idempotencyKey),
  foreignKey({ columns: [table.projectId, table.workspaceId], foreignColumns: [projects.id, projects.workspaceId], name: "task_template_imports_project_workspace_fk" }).onDelete("cascade"),
]);

export const tasks = pgTable("tasks", {
  id: uuid("id").defaultRandom().primaryKey(),
  workspaceId: uuid("workspace_id").notNull().references(() => workspaces.id, { onDelete: "cascade" }),
  projectId: uuid("project_id").notNull().references(() => projects.id, { onDelete: "cascade" }),
  behavior: text("behavior", { enum: ["one_time", "recurring"] }),
  mode: text("mode", { enum: ["workflow", "reusable"] }).notNull().default("workflow"),
  lifecycle: text("lifecycle", { enum: ["active", "archived"] }).notNull().default("active"),
  templateItemSourceId: uuid("template_item_source_id"),
  archivedAt: timestamp("archived_at", { withTimezone: true }),
  projectServiceId: uuid("project_service_id").references(() => projectServices.id, { onDelete: "set null" }),
  title: text("title").notNull(),
  description: text("description"),
  status: text("status", { enum: ["todo", "in_progress", "review", "done"] }).notNull().default("todo"),
  priority: text("priority", { enum: ["low", "medium", "high", "urgent"] }).notNull().default("medium"),
  assigneeId: text("assignee_id").references(() => users.id, { onDelete: "set null" }),
  dueDate: date("due_date"),
  position: integer("position").notNull().default(0),
  clientVisible: boolean("client_visible").notNull().default(false),
  /** Personal note this task was converted from (optional reverse link). */
  sourceNoteId: uuid("source_note_id"),
  createdBy: text("created_by").references(() => users.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  foreignKey({ columns: [table.projectId, table.workspaceId], foreignColumns: [projects.id, projects.workspaceId], name: "tasks_project_workspace_fk" }).onDelete("cascade"),
  // Migration adds ON DELETE SET NULL (template_item_source_id); Drizzle 0.45
  // cannot represent a column-list SET NULL action on a composite foreign key.
  foreignKey({ columns: [table.templateItemSourceId, table.workspaceId], foreignColumns: [taskTemplateItems.id, taskTemplateItems.workspaceId], name: "tasks_template_item_source_workspace_fk" }),
  index("tasks_workspace_mode_lifecycle_idx").on(table.workspaceId, table.mode, table.lifecycle),
  index("tasks_project_mode_lifecycle_position_idx").on(table.projectId, table.mode, table.lifecycle, table.position),
]);


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
  meetingStartTime: timestamp("meeting_start_time", { withTimezone: true }),
  meetingDurationMinutes: integer("meeting_duration_minutes"),
  meetingTimezone: text("meeting_timezone"),
  meetingStatus: text("meeting_status", {
    enum: ["requested", "counter_proposed", "approved", "rejected"],
  }),
  meetingResponseNote: text("meeting_response_note"),
  meetingProposedByUserId: text("meeting_proposed_by_user_id").references(() => users.id, { onDelete: "set null" }),
  appointmentId: uuid("appointment_id").references(() => appointments.id, { onDelete: "set null" }),
  completedAt: timestamp("completed_at", { withTimezone: true }),
  createdBy: text("created_by").references(() => users.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

// ─── Custom Package Requests (client portal) ───

export const customPackageRequests = pgTable("custom_package_requests", {
  id: uuid("id").defaultRandom().primaryKey(),
  workspaceId: uuid("workspace_id").notNull().references(() => workspaces.id, { onDelete: "cascade" }),
  projectId: uuid("project_id").notNull().references(() => projects.id, { onDelete: "restrict" }),
  clientId: uuid("client_id").references(() => clients.id, { onDelete: "restrict" }),
  clientPortalToken: text("client_portal_token"), // legacy only; new writes use client_id
  idempotencyKey: text("idempotency_key"),
  requestedHours: integer("requested_hours").notNull(),
  estimatedPrice: numeric("estimated_price", { precision: 12, scale: 2 }),
  message: text("message"),
  status: text("status", { enum: ["pending", "approved", "rejected"] }).notNull().default("pending"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  uniqueIndex("custom_package_requests_client_idempotency_uidx")
    .on(table.clientId, table.idempotencyKey)
    .where(sql`${table.idempotencyKey} is not null`),
]);

// ─── Package Orders (client portal) ───

export const packageOrders = pgTable("package_orders", {
  id: uuid("id").defaultRandom().primaryKey(),
  workspaceId: uuid("workspace_id").notNull().references(() => workspaces.id, { onDelete: "cascade" }),
  projectId: uuid("project_id").notNull().references(() => projects.id, { onDelete: "restrict" }),
  packageId: uuid("package_id").references(() => packages.id, { onDelete: "set null" }),
  projectPackageAssignmentId: uuid("project_package_assignment_id"),
  clientId: uuid("client_id").references(() => clients.id, { onDelete: "restrict" }),
  clientPortalToken: text("client_portal_token"), // legacy only; new writes use client_id
  idempotencyKey: text("idempotency_key"),
  packageName: text("package_name").notNull(),
  hours: integer("hours"),
  price: numeric("price", { precision: 12, scale: 2 }).notNull(),
  currency: text("currency").notNull().default("USD"),
  message: text("message"),
  status: text("status", { enum: ["pending", "confirmed", "invoiced", "cancelled"] }).notNull().default("pending"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  uniqueIndex("package_orders_client_idempotency_uidx")
    .on(table.clientId, table.idempotencyKey)
    .where(sql`${table.idempotencyKey} is not null`),
  foreignKey({
    columns: [table.projectPackageAssignmentId, table.workspaceId],
    foreignColumns: [projectPackageAssignments.id, projectPackageAssignments.workspaceId],
    name: "package_orders_project_package_assignment_workspace_fk",
  }).onDelete("set null"),
]);

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

export const activities = pgTable("activities", {
  id: uuid("id").defaultRandom().primaryKey(),
  workspaceId: uuid("workspace_id").notNull().references(() => workspaces.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  defaultBillable: boolean("default_billable").notNull().default(true),
  defaultHourlyRate: numeric("default_hourly_rate", { precision: 12, scale: 2 }),
  status: text("status", { enum: ["active", "archived"] }).notNull().default("active"),
  createdBy: text("created_by").references(() => users.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  unique("activities_id_workspace_unique").on(table.id, table.workspaceId),
  uniqueIndex("activities_workspace_active_name_uidx")
    .on(table.workspaceId, sql`lower(btrim(${table.name}))`)
    .where(sql`${table.status} = 'active'`),
  index("activities_workspace_status_name_idx").on(table.workspaceId, table.status, table.name),
  check("activities_name_not_blank_check", sql`length(btrim(${table.name})) > 0`),
  check(
    "activities_default_hourly_rate_check",
    sql`${table.defaultHourlyRate} is null or ${table.defaultHourlyRate} >= 0`,
  ),
]);

export const projectActivities = pgTable("project_activities", {
  workspaceId: uuid("workspace_id").notNull().references(() => workspaces.id, { onDelete: "cascade" }),
  projectId: uuid("project_id").notNull(),
  activityId: uuid("activity_id").notNull(),
  enabled: boolean("enabled").notNull().default(true),
  rateOverride: numeric("rate_override", { precision: 12, scale: 2 }),
  billableOverride: boolean("billable_override"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  unique("project_activities_project_activity_unique").on(table.projectId, table.activityId),
  foreignKey({
    columns: [table.projectId, table.workspaceId],
    foreignColumns: [projects.id, projects.workspaceId],
    name: "project_activities_project_workspace_fk",
  }).onDelete("cascade"),
  foreignKey({
    columns: [table.activityId, table.workspaceId],
    foreignColumns: [activities.id, activities.workspaceId],
    name: "project_activities_activity_workspace_fk",
  }).onDelete("cascade"),
  index("project_activities_workspace_project_enabled_idx").on(
    table.workspaceId,
    table.projectId,
    table.enabled,
  ),
  check(
    "project_activities_rate_override_check",
    sql`${table.rateOverride} is null or ${table.rateOverride} >= 0`,
  ),
]);

export const clientServiceRateCards = pgTable("client_service_rate_cards", {
  id: uuid("id").defaultRandom().primaryKey(),
  workspaceId: uuid("workspace_id").notNull().references(() => workspaces.id, { onDelete: "cascade" }),
  clientId: uuid("client_id").notNull().references(() => clients.id, { onDelete: "cascade" }),
  serviceId: uuid("service_id").notNull(),
  hourlyRate: numeric("hourly_rate", { precision: 12, scale: 2 }).notNull(),
  currency: text("currency").notNull().default("IDR"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  unique("client_service_rate_cards_client_service_unique").on(table.clientId, table.serviceId),
  foreignKey({ columns: [table.serviceId, table.workspaceId], foreignColumns: [services.id, services.workspaceId], name: "client_service_rate_cards_service_workspace_fk" }).onDelete("cascade"),
]);

export const timesheetSubmissions = pgTable("timesheet_submissions", {
  id: uuid("id").defaultRandom().primaryKey(),
  workspaceId: uuid("workspace_id").notNull().references(() => workspaces.id, { onDelete: "cascade" }),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  weekStart: date("week_start").notNull(),
  status: text("status", { enum: ["submitted", "approved", "rejected"] }).notNull().default("submitted"),
  submitterNote: text("submitter_note"),
  reviewNote: text("review_note"),
  totalMinutes: integer("total_minutes").notNull().default(0),
  billableMinutes: integer("billable_minutes").notNull().default(0),
  submittedAt: timestamp("submitted_at", { withTimezone: true }).notNull().defaultNow(),
  reviewedAt: timestamp("reviewed_at", { withTimezone: true }),
  reviewedBy: text("reviewed_by").references(() => users.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  unique("timesheet_submissions_workspace_user_week_unique").on(table.workspaceId, table.userId, table.weekStart),
  index("timesheet_submissions_workspace_status_week_idx").on(table.workspaceId, table.status, table.weekStart),
]);

export const retainerPeriods = pgTable("retainer_periods", {
  id: uuid("id").defaultRandom().primaryKey(),
  workspaceId: uuid("workspace_id").notNull().references(() => workspaces.id, { onDelete: "restrict" }),
  projectId: uuid("project_id").notNull(),
  periodStart: date("period_start").notNull(),
  periodEnd: date("period_end").notNull(),
  timezoneSnapshot: text("timezone_snapshot").notNull(),
  feeSnapshot: numeric("fee_snapshot", { precision: 12, scale: 2 }).notNull(),
  currencySnapshot: text("currency_snapshot").notNull(),
  includedMinutesSnapshot: integer("included_minutes_snapshot").notNull(),
  overagePolicySnapshot: text("overage_policy_snapshot", { enum: ["none", "warn", "bill"] }).notNull(),
  overageRateSnapshot: numeric("overage_rate_snapshot", { precision: 12, scale: 2 }),
  approvedMinutes: integer("approved_minutes").notNull().default(0),
  overageMinutes: integer("overage_minutes").notNull().default(0),
  status: text("status", { enum: ["open", "locked", "invoiced"] }).notNull().default("open"),
  invoiceGeneration: integer("invoice_generation").notNull().default(0),
  lockedAt: timestamp("locked_at", { withTimezone: true }),
  invoicedAt: timestamp("invoiced_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  unique("retainer_periods_id_workspace_unique").on(t.id, t.workspaceId),
  unique().on(t.projectId, t.periodStart, t.periodEnd),
  foreignKey({ columns: [t.projectId, t.workspaceId], foreignColumns: [projects.id, projects.workspaceId] }).onDelete("restrict"),
]);

export const timeEntries = pgTable("time_entries", {
  id: uuid("id").defaultRandom().primaryKey(),
  workspaceId: uuid("workspace_id").notNull().references(() => workspaces.id, { onDelete: "cascade" }),
  // Nullable so quick-timer can start/stop empty; fill later via timesheet edit.
  clientId: uuid("client_id").references(() => clients.id, { onDelete: "cascade" }),
  projectId: uuid("project_id").references(() => projects.id, { onDelete: "cascade" }),
  activityId: uuid("activity_id"),
  projectServiceId: uuid("project_service_id").references(() => projectServices.id, { onDelete: "set null" }),
  taskId: uuid("task_id").references(() => tasks.id, { onDelete: "set null" }),
  retainerPeriodId: uuid("retainer_period_id"),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  description: text("description"),
  tags: text("tags"),
  startTime: timestamp("start_time", { withTimezone: true }),
  endTime: timestamp("end_time", { withTimezone: true }),
  // When set, timer is paused on the same open entry (endTime still null).
  pausedAt: timestamp("paused_at", { withTimezone: true }),
  manualMinutes: integer("manual_minutes"),
  entryType: text("entry_type", { enum: ["timer", "duration"] }).notNull().default("timer"),
  workDate: date("work_date"),
  timezoneSnapshot: text("timezone_snapshot").notNull().default("UTC"),
  durationMinutes: integer("duration_minutes").generatedAlwaysAs(
    sql`case when start_time is not null and end_time is not null then greatest(0, floor(extract(epoch from (end_time - start_time)) / 60)::integer) else coalesce(manual_minutes, 0) end`,
  ),
  billable: boolean("billable").notNull().default(true),
  hourlyRate: numeric("hourly_rate", { precision: 12, scale: 2 }),
  currencySnapshot: text("currency_snapshot").notNull().default("IDR"),
  status: text("status", { enum: ["draft", "submitted", "approved", "rejected", "invoiced"] }).notNull().default("draft"),
  submittedAt: timestamp("submitted_at", { withTimezone: true }),
  approvedAt: timestamp("approved_at", { withTimezone: true }),
  rejectedAt: timestamp("rejected_at", { withTimezone: true }),
  reviewedBy: text("reviewed_by").references(() => users.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  uniqueIndex("time_entries_one_active_per_user_workspace_uidx")
    .on(table.workspaceId, table.userId)
    .where(sql`${table.endTime} is null and ${table.manualMinutes} is null`),
  foreignKey({
    columns: [table.activityId, table.workspaceId],
    foreignColumns: [activities.id, activities.workspaceId],
    name: "time_entries_activity_workspace_fk",
  }).onDelete("restrict"),
  index("time_entries_workspace_activity_start_idx").on(
    table.workspaceId,
    table.activityId,
    table.startTime,
  ),
]);

export const timerSegments = pgTable("timer_segments", {
  id: uuid("id").defaultRandom().primaryKey(),
  workspaceId: uuid("workspace_id").notNull().references(() => workspaces.id, { onDelete: "cascade" }),
  timeEntryId: uuid("time_entry_id").notNull().references(() => timeEntries.id, { onDelete: "cascade" }),
  startedAt: timestamp("started_at", { withTimezone: true }).notNull(),
  endedAt: timestamp("ended_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  index("timer_segments_entry_started_idx").on(table.timeEntryId, table.startedAt),
  uniqueIndex("timer_segments_one_open_per_entry_uidx")
    .on(table.timeEntryId)
    .where(sql`${table.endedAt} is null`),
]);

// ─── Invoices ───

export const invoices = pgTable("invoices", {
  id: uuid("id").defaultRandom().primaryKey(),
  workspaceId: uuid("workspace_id").notNull().references(() => workspaces.id, { onDelete: "cascade" }),
  clientId: uuid("client_id").notNull().references(() => clients.id, { onDelete: "cascade" }),
  projectId: uuid("project_id").references(() => projects.id, { onDelete: "set null" }),
  billingSource: text("billing_source"),
  billingPeriodStart: date("billing_period_start"),
  billingPeriodEnd: date("billing_period_end"),
  retainerPeriodId: uuid("retainer_period_id"),
  invoiceNumber: text("invoice_number").notNull(),
  issueDate: date("issue_date").notNull(),
  dueDate: date("due_date"),
  currency: text("currency").notNull().default("IDR"),
  subtotal: numeric("subtotal", { precision: 12, scale: 2 }).notNull().default("0"),
  discount: numeric("discount", { precision: 12, scale: 2 }).notNull().default("0"),
  tax: numeric("tax", { precision: 12, scale: 2 }).notNull().default("0"),
  total: numeric("total", { precision: 12, scale: 2 }).notNull().default("0"),
  status: text("status", { enum: ["draft", "sent", "viewed", "paid", "overdue", "cancelled", "archived"] }).notNull().default("draft"),
  notes: text("notes"),
  terms: text("terms"),
  sharedTokenHash: text("shared_token_hash").unique(),
  sharedTokenEnc: text("shared_token_enc"),
  sharedTokenExpiresAt: timestamp("shared_token_expires_at", { withTimezone: true }),
  sharedTokenRevokedAt: timestamp("shared_token_revoked_at", { withTimezone: true }),
  clientFirstViewedAt: timestamp("client_first_viewed_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [unique().on(table.workspaceId, table.invoiceNumber)]);

export const legacyProjectBillingClassifications = pgTable("legacy_project_billing_classifications", { projectId: uuid("project_id").primaryKey(), workspaceId: uuid("workspace_id").notNull(), legacyBillingType: text("legacy_billing_type").notNull(), targetBillingModel: text("target_billing_model"), confidence: text("confidence").notNull().default("unreviewed"), evidence: jsonb("evidence").notNull().default(sql`'{}'::jsonb`), reviewedBy: text("reviewed_by"), reviewedAt: timestamp("reviewed_at", {withTimezone:true}), notes: text("notes") });

export const invoiceItems = pgTable("invoice_items", {
  id: uuid("id").defaultRandom().primaryKey(),
  invoiceId: uuid("invoice_id").notNull().references(() => invoices.id, { onDelete: "cascade" }),
  description: text("description").notNull(),
  quantity: numeric("quantity", { precision: 12, scale: 2 }).notNull().default("1"),
  unitPrice: numeric("unit_price", { precision: 12, scale: 2 }).notNull().default("0"),
  amount: numeric("amount", { precision: 12, scale: 2 }).notNull().default("0"),
  sourceType: text("source_type", { enum: ["manual", "time_entry", "project"] }),
  sourceId: uuid("source_id"),
  previousTimeEntryStatus: text("previous_time_entry_status", { enum: ["draft", "approved"] }),
  originalCurrency: text("original_currency"),
  originalAmount: numeric("original_amount", { precision: 12, scale: 2 }),
  conversionRate: numeric("conversion_rate", { precision: 18, scale: 8 }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  uniqueIndex("invoice_items_time_entry_source_uidx")
    .on(table.sourceId)
    .where(sql`${table.sourceType} = 'time_entry' and ${table.sourceId} is not null`),
  index("invoice_items_source_lookup_idx").on(table.sourceType, table.sourceId),
]);

export const payments = pgTable("payments", {
  id: uuid("id").defaultRandom().primaryKey(),
  invoiceId: uuid("invoice_id").notNull().references(() => invoices.id, { onDelete: "cascade" }),
  amount: numeric("amount", { precision: 12, scale: 2 }).notNull(),
  paidAt: date("paid_at").notNull(),
  method: text("method"),
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

// Manual FX rates: 1 from_currency = rate × workspace.default_currency
export const workspaceCurrencyRates = pgTable(
  "workspace_currency_rates",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    fromCurrency: text("from_currency").notNull(),
    rate: numeric("rate", { precision: 18, scale: 8 }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [unique().on(table.workspaceId, table.fromCurrency)],
);

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
  googleEventId: text("google_event_id"),
  googleCalendarId: text("google_calendar_id"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const appointmentCalendarSyncs = pgTable(
  "appointment_calendar_syncs",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    appointmentId: uuid("appointment_id").notNull().references(() => appointments.id, { onDelete: "cascade" }),
    targetType: text("target_type", { enum: ["user", "client"] }).notNull(),
    targetId: text("target_id").notNull(),
    provider: text("provider", { enum: ["google"] }).notNull().default("google"),
    externalEventId: text("external_event_id"),
    externalCalendarId: text("external_calendar_id"),
    status: text("status", { enum: ["pending", "synced", "failed", "skipped"] }).notNull().default("pending"),
    lastError: text("last_error"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [unique().on(table.appointmentId, table.targetType, table.provider)],
);

// ─── Google Calendar connections (per user / workspace owner) ───

export const googleCalendarConnections = pgTable("google_calendar_connections", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }).unique(),
  googleAccountEmail: text("google_account_email"),
  accessTokenEnc: text("access_token_enc").notNull(),
  refreshTokenEnc: text("refresh_token_enc").notNull(),
  scope: text("scope"),
  tokenType: text("token_type"),
  expiryDate: timestamp("expiry_date", { withTimezone: true }),
  calendarId: text("calendar_id").notNull().default("primary"),
  status: text("status", { enum: ["connected", "error", "disconnected"] }).notNull().default("connected"),
  lastError: text("last_error"),
  connectedAt: timestamp("connected_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

// ─── Google Calendar connections (per client — separate from user calendar) ───

export const clientGoogleCalendarConnections = pgTable("client_google_calendar_connections", {
  id: uuid("id").defaultRandom().primaryKey(),
  clientId: uuid("client_id").notNull().references(() => clients.id, { onDelete: "cascade" }).unique(),
  workspaceId: uuid("workspace_id").notNull().references(() => workspaces.id, { onDelete: "cascade" }),
  connectedByUserId: text("connected_by_user_id").references(() => users.id, { onDelete: "set null" }),
  googleAccountEmail: text("google_account_email"),
  accessTokenEnc: text("access_token_enc"),
  refreshTokenEnc: text("refresh_token_enc"),
  scope: text("scope"),
  tokenType: text("token_type"),
  expiryDate: timestamp("expiry_date", { withTimezone: true }),
  calendarId: text("calendar_id").notNull().default("primary"),
  inviteTokenHash: text("invite_token_hash").unique(),
  inviteTokenExpiresAt: timestamp("invite_token_expires_at", { withTimezone: true }),
  status: text("status", {
    enum: ["pending_invite", "connected", "error", "disconnected"],
  })
    .notNull()
    .default("pending_invite"),
  lastError: text("last_error"),
  connectedAt: timestamp("connected_at", { withTimezone: true }),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
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
  packages: many(packages),
  packageItems: many(packageItems),
  projectPackageAssignments: many(projectPackageAssignments),
  activities: many(activities),
  serviceCategories: many(serviceCategories),
  services: many(services),
  projectServices: many(projectServices),
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
  activities: many(projectActivities),
  services: many(projectServices),
  packageAssignments: many(projectPackageAssignments),
}));

export const packageRelations = relations(packages, ({ one, many }) => ({
  workspace: one(workspaces, { fields: [packages.workspaceId], references: [workspaces.id] }),
  project: one(projects, { fields: [packages.projectId], references: [projects.id] }),
  packageItems: many(packageItems),
  assignments: many(projectPackageAssignments),
  orders: many(packageOrders),
}));

export const serviceCategoryRelations = relations(serviceCategories, ({ one, many }) => ({
  workspace: one(workspaces, { fields: [serviceCategories.workspaceId], references: [workspaces.id] }),
  services: many(services),
}));

export const serviceRelations = relations(services, ({ one, many }) => ({
  workspace: one(workspaces, { fields: [services.workspaceId], references: [workspaces.id] }),
  category: one(serviceCategories, { fields: [services.categoryId], references: [serviceCategories.id] }),
  packageItems: many(packageItems),
  projects: many(projectServices),
}));

export const packageItemRelations = relations(packageItems, ({ one, many }) => ({
  workspace: one(workspaces, { fields: [packageItems.workspaceId], references: [workspaces.id] }),
  package: one(packages, { fields: [packageItems.packageId], references: [packages.id] }),
  service: one(services, { fields: [packageItems.serviceId], references: [services.id] }),
  projectServices: many(projectServices),
}));

export const projectPackageAssignmentRelations = relations(projectPackageAssignments, ({ one, many }) => ({
  workspace: one(workspaces, { fields: [projectPackageAssignments.workspaceId], references: [workspaces.id] }),
  project: one(projects, { fields: [projectPackageAssignments.projectId], references: [projects.id] }),
  package: one(packages, { fields: [projectPackageAssignments.sourcePackageId], references: [packages.id] }),
  projectServices: many(projectServices),
  packageOrders: many(packageOrders),
}));

export const projectServiceRelations = relations(projectServices, ({ one, many }) => ({
  workspace: one(workspaces, { fields: [projectServices.workspaceId], references: [workspaces.id] }),
  project: one(projects, { fields: [projectServices.projectId], references: [projects.id] }),
  service: one(services, { fields: [projectServices.serviceId], references: [services.id] }),
  packageItem: one(packageItems, { fields: [projectServices.packageItemId], references: [packageItems.id] }),
  packageAssignment: one(projectPackageAssignments, { fields: [projectServices.projectPackageAssignmentId], references: [projectPackageAssignments.id] }),
  tasks: many(tasks),
  timeEntries: many(timeEntries),
}));

export const activityRelations = relations(activities, ({ one, many }) => ({
  workspace: one(workspaces, { fields: [activities.workspaceId], references: [workspaces.id] }),
  projects: many(projectActivities),
  timeEntries: many(timeEntries),
}));

export const projectActivityRelations = relations(projectActivities, ({ one }) => ({
  workspace: one(workspaces, { fields: [projectActivities.workspaceId], references: [workspaces.id] }),
  project: one(projects, { fields: [projectActivities.projectId], references: [projects.id] }),
  activity: one(activities, { fields: [projectActivities.activityId], references: [activities.id] }),
}));

export const timeEntryRelations = relations(timeEntries, ({ one }) => ({
  workspace: one(workspaces, { fields: [timeEntries.workspaceId], references: [workspaces.id] }),
  client: one(clients, { fields: [timeEntries.clientId], references: [clients.id] }),
  project: one(projects, { fields: [timeEntries.projectId], references: [projects.id] }),
  task: one(tasks, { fields: [timeEntries.taskId], references: [tasks.id] }),
  activity: one(activities, { fields: [timeEntries.activityId], references: [activities.id] }),
  projectService: one(projectServices, { fields: [timeEntries.projectServiceId], references: [projectServices.id] }),
  user: one(users, { fields: [timeEntries.userId], references: [users.id] }),
}));

export const taskRelations = relations(tasks, ({ one }) => ({
  project: one(projects, { fields: [tasks.projectId], references: [projects.id] }),
  projectService: one(projectServices, { fields: [tasks.projectServiceId], references: [projectServices.id] }),
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
      "client_task_approved", // client approved task via portal
      "client_task_revision", // client requested task revision via portal
      "file_viewed",        // client viewed file via portal
      "client_file_uploaded", // client uploaded file via portal folders
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
      "portal_report_request",  // client requested report via portal
      "portal_meeting_request", // client requested meeting via portal
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
  lastReminded7d: timestamp("last_reminded_7d", { withTimezone: true }),
  lastReminded3d: timestamp("last_reminded_3d", { withTimezone: true }),
  lastReminded1d: timestamp("last_reminded_1d", { withTimezone: true }),
  status: text("status", { enum: ["open", "done", "archived"] }).notNull().default("open"),
  pinned: boolean("pinned").notNull().default(false),
  /** Task created from this note via convert (optional reverse link). */
  convertedTaskId: uuid("converted_task_id").references(() => tasks.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

// One public personal/studio landing page per workspace owner.
export const personalSites = pgTable("personal_sites", {
  id: uuid("id").defaultRandom().primaryKey(),
  workspaceId: uuid("workspace_id").notNull().references(() => workspaces.id, { onDelete: "cascade" }),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  slug: text("slug").notNull(),
  published: boolean("published").notNull().default(false),
  title: text("title").notNull(),
  subtitle: text("subtitle"),
  hero: text("hero").notNull(),
  about: text("about"),
  ctaLabel: text("cta_label"),
  ctaUrl: text("cta_url"),
  theme: text("theme", { enum: ["midnight", "paper", "studio"] }).notNull().default("midnight"),
  accent: text("accent").notNull().default("#6647F0"),
  sections: jsonb("sections").$type<PersonalSiteSection[]>().notNull().default(sql`'[]'::jsonb`),
  links: jsonb("links").$type<PersonalSiteLink[]>().notNull().default(sql`'[]'::jsonb`),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  uniqueIndex("personal_sites_owner_workspace_uidx").on(table.workspaceId, table.userId),
  uniqueIndex("personal_sites_slug_uidx").on(table.slug),
  index("personal_sites_public_slug_idx").on(table.slug, table.published),
]);

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

// Reusable proposal defaults (scope body, currency, tax, DP%) — applied from form later
export const proposalTemplates = pgTable("proposal_templates", {
  id: uuid("id").defaultRandom().primaryKey(),
  workspaceId: uuid("workspace_id").notNull().references(() => workspaces.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  body: text("body"), // scope / cover text
  defaultCurrency: text("default_currency").notNull().default("IDR"),
  defaultTaxRate: numeric("default_tax_rate", { precision: 5, scale: 2 }).notNull().default("0"),
  defaultDownPaymentPercent: numeric("default_down_payment_percent", { precision: 5, scale: 2 }).notNull().default("50"),
  lineItems: text("line_items"), // optional JSON array of {description, quantity, unitPrice}
  isDefault: boolean("is_default").notNull().default(false),
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
