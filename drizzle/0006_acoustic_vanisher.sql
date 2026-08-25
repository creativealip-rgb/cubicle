CREATE TABLE "activities" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" uuid NOT NULL,
	"name" text NOT NULL,
	"default_billable" boolean DEFAULT true NOT NULL,
	"default_hourly_rate" numeric(12, 2),
	"status" text DEFAULT 'active' NOT NULL,
	"created_by" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "activities_id_workspace_unique" UNIQUE("id","workspace_id"),
	CONSTRAINT "activities_name_not_blank_check" CHECK (length(btrim("activities"."name")) > 0),
	CONSTRAINT "activities_default_hourly_rate_check" CHECK ("activities"."default_hourly_rate" is null or "activities"."default_hourly_rate" >= 0)
);
--> statement-breakpoint
CREATE TABLE "admin_audit_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"admin_user_id" text,
	"action" text NOT NULL,
	"target_user_id" text,
	"target_workspace_id" uuid,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"ip_address" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ai_usage_daily" (
	"workspace_id" uuid NOT NULL,
	"usage_date" date NOT NULL,
	"count" integer DEFAULT 0 NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "ai_usage_daily_ws_date" UNIQUE("workspace_id","usage_date")
);
--> statement-breakpoint
CREATE TABLE "appointment_calendar_syncs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"appointment_id" uuid NOT NULL,
	"target_type" text NOT NULL,
	"target_id" text NOT NULL,
	"provider" text DEFAULT 'google' NOT NULL,
	"external_event_id" text,
	"external_calendar_id" text,
	"status" text DEFAULT 'pending' NOT NULL,
	"last_error" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "appointment_calendar_syncs_appointment_id_target_type_provider_unique" UNIQUE("appointment_id","target_type","provider")
);
--> statement-breakpoint
CREATE TABLE "client_google_calendar_connections" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"client_id" uuid NOT NULL,
	"workspace_id" uuid NOT NULL,
	"connected_by_user_id" text,
	"google_account_email" text,
	"access_token_enc" text,
	"refresh_token_enc" text,
	"scope" text,
	"token_type" text,
	"expiry_date" timestamp with time zone,
	"calendar_id" text DEFAULT 'primary' NOT NULL,
	"invite_token_hash" text,
	"invite_token_expires_at" timestamp with time zone,
	"status" text DEFAULT 'pending_invite' NOT NULL,
	"last_error" text,
	"connected_at" timestamp with time zone,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "client_google_calendar_connections_client_id_unique" UNIQUE("client_id"),
	CONSTRAINT "client_google_calendar_connections_invite_token_hash_unique" UNIQUE("invite_token_hash")
);
--> statement-breakpoint
CREATE TABLE "client_service_rate_cards" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" uuid NOT NULL,
	"client_id" uuid NOT NULL,
	"service_id" uuid NOT NULL,
	"hourly_rate" numeric(12, 2) NOT NULL,
	"currency" text DEFAULT 'IDR' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "client_service_rate_cards_client_service_unique" UNIQUE("client_id","service_id")
);
--> statement-breakpoint
CREATE TABLE "google_calendar_connections" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"google_account_email" text,
	"access_token_enc" text NOT NULL,
	"refresh_token_enc" text NOT NULL,
	"scope" text,
	"token_type" text,
	"expiry_date" timestamp with time zone,
	"calendar_id" text DEFAULT 'primary' NOT NULL,
	"status" text DEFAULT 'connected' NOT NULL,
	"last_error" text,
	"connected_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "google_calendar_connections_user_id_unique" UNIQUE("user_id")
);
--> statement-breakpoint
CREATE TABLE "legacy_project_billing_classifications" (
	"project_id" uuid PRIMARY KEY NOT NULL,
	"workspace_id" uuid NOT NULL,
	"legacy_billing_type" text NOT NULL,
	"target_billing_model" text,
	"confidence" text DEFAULT 'unreviewed' NOT NULL,
	"evidence" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"reviewed_by" text,
	"reviewed_at" timestamp with time zone,
	"notes" text
);
--> statement-breakpoint
CREATE TABLE "package_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" uuid NOT NULL,
	"package_id" uuid NOT NULL,
	"service_id" uuid NOT NULL,
	"quantity" numeric(12, 2) DEFAULT '1' NOT NULL,
	"unit" text DEFAULT 'service' NOT NULL,
	"unit_price" numeric(12, 2),
	"currency" text DEFAULT 'IDR' NOT NULL,
	"included_allowance" numeric(12, 2),
	"sort_order" integer DEFAULT 0 NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "package_items_id_workspace_unique" UNIQUE("id","workspace_id"),
	CONSTRAINT "package_items_package_service_unique" UNIQUE("package_id","service_id"),
	CONSTRAINT "package_items_quantity_check" CHECK ("package_items"."quantity" >= 0),
	CONSTRAINT "package_items_unit_price_check" CHECK ("package_items"."unit_price" is null or "package_items"."unit_price" >= 0),
	CONSTRAINT "package_items_included_allowance_check" CHECK ("package_items"."included_allowance" is null or "package_items"."included_allowance" >= 0)
);
--> statement-breakpoint
CREATE TABLE "personal_sites" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" uuid NOT NULL,
	"user_id" text NOT NULL,
	"slug" text NOT NULL,
	"published" boolean DEFAULT false NOT NULL,
	"title" text NOT NULL,
	"subtitle" text,
	"hero" text NOT NULL,
	"about" text,
	"cta_label" text,
	"cta_url" text,
	"theme" text DEFAULT 'midnight' NOT NULL,
	"accent" text DEFAULT '#6647F0' NOT NULL,
	"sections" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"links" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"pages" jsonb DEFAULT '[]'::jsonb,
	"theme_config" jsonb,
	"seo" jsonb,
	"hero_image" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "project_activities" (
	"workspace_id" uuid NOT NULL,
	"project_id" uuid NOT NULL,
	"activity_id" uuid NOT NULL,
	"enabled" boolean DEFAULT true NOT NULL,
	"rate_override" numeric(12, 2),
	"billable_override" boolean,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "project_activities_project_activity_unique" UNIQUE("project_id","activity_id"),
	CONSTRAINT "project_activities_rate_override_check" CHECK ("project_activities"."rate_override" is null or "project_activities"."rate_override" >= 0)
);
--> statement-breakpoint
CREATE TABLE "project_package_assignments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" uuid NOT NULL,
	"project_id" uuid NOT NULL,
	"source_package_id" uuid,
	"source_lifecycle_class" text DEFAULT 'one_off' NOT NULL,
	"name_snapshot" text NOT NULL,
	"description_snapshot" text,
	"price_snapshot" numeric(12, 2) NOT NULL,
	"currency_snapshot" text DEFAULT 'IDR' NOT NULL,
	"allowance_type_snapshot" text DEFAULT 'hours' NOT NULL,
	"allowance_value_snapshot" numeric(12, 2),
	"assigned_at" timestamp with time zone DEFAULT now() NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "project_package_assignments_id_workspace_unique" UNIQUE("id","workspace_id"),
	CONSTRAINT "project_package_assignments_price_snapshot_check" CHECK ("project_package_assignments"."price_snapshot" >= 0),
	CONSTRAINT "project_package_assignments_allowance_value_check" CHECK ("project_package_assignments"."allowance_value_snapshot" is null or "project_package_assignments"."allowance_value_snapshot" >= 0)
);
--> statement-breakpoint
CREATE TABLE "project_services" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" uuid NOT NULL,
	"project_id" uuid NOT NULL,
	"service_id" uuid,
	"package_item_id" uuid,
	"project_package_assignment_id" uuid,
	"source_package_assignment_id" uuid,
	"name_snapshot" text NOT NULL,
	"description_snapshot" text,
	"pricing_model_snapshot" text DEFAULT 'fixed' NOT NULL,
	"quantity" numeric(12, 2) DEFAULT '1' NOT NULL,
	"unit" text DEFAULT 'service' NOT NULL,
	"unit_price" numeric(12, 2),
	"currency_snapshot" text DEFAULT 'IDR' NOT NULL,
	"amount" numeric(12, 2),
	"included_allowance" numeric(12, 2),
	"estimated_minutes" integer,
	"cost_rate_snapshot" numeric(12, 2),
	"sort_order" integer DEFAULT 0 NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "project_services_id_workspace_unique" UNIQUE("id","workspace_id"),
	CONSTRAINT "project_services_project_service_unique" UNIQUE("project_id","service_id"),
	CONSTRAINT "project_services_quantity_check" CHECK ("project_services"."quantity" >= 0),
	CONSTRAINT "project_services_unit_price_check" CHECK ("project_services"."unit_price" is null or "project_services"."unit_price" >= 0),
	CONSTRAINT "project_services_amount_check" CHECK ("project_services"."amount" is null or "project_services"."amount" >= 0)
);
--> statement-breakpoint
CREATE TABLE "proposal_templates" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" uuid NOT NULL,
	"name" text NOT NULL,
	"body" text,
	"content_blocks" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"default_currency" text DEFAULT 'IDR' NOT NULL,
	"default_tax_rate" numeric(5, 2) DEFAULT '0' NOT NULL,
	"default_down_payment_percent" numeric(5, 2) DEFAULT '50' NOT NULL,
	"line_items" text,
	"is_default" boolean DEFAULT false NOT NULL,
	"created_by" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "retainer_periods" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" uuid NOT NULL,
	"project_id" uuid NOT NULL,
	"period_start" date NOT NULL,
	"period_end" date NOT NULL,
	"timezone_snapshot" text NOT NULL,
	"fee_snapshot" numeric(12, 2) NOT NULL,
	"currency_snapshot" text NOT NULL,
	"included_minutes_snapshot" integer NOT NULL,
	"overage_policy_snapshot" text NOT NULL,
	"overage_rate_snapshot" numeric(12, 2),
	"approved_minutes" integer DEFAULT 0 NOT NULL,
	"overage_minutes" integer DEFAULT 0 NOT NULL,
	"status" text DEFAULT 'open' NOT NULL,
	"invoice_generation" integer DEFAULT 0 NOT NULL,
	"locked_at" timestamp with time zone,
	"invoiced_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "retainer_periods_id_workspace_unique" UNIQUE("id","workspace_id"),
	CONSTRAINT "retainer_periods_project_id_period_start_period_end_unique" UNIQUE("project_id","period_start","period_end")
);
--> statement-breakpoint
CREATE TABLE "service_categories" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" uuid NOT NULL,
	"name" text NOT NULL,
	"normalized_name" text NOT NULL,
	"color" text DEFAULT '#64748b' NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "service_categories_id_workspace_unique" UNIQUE("id","workspace_id"),
	CONSTRAINT "service_categories_workspace_normalized_name_unique" UNIQUE("workspace_id","normalized_name"),
	CONSTRAINT "service_categories_name_not_blank_check" CHECK (length(btrim("service_categories"."name")) > 0)
);
--> statement-breakpoint
CREATE TABLE "services" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" uuid NOT NULL,
	"name" text NOT NULL,
	"normalized_name" text NOT NULL,
	"description" text,
	"category_id" uuid,
	"default_pricing_model" text DEFAULT 'fixed' NOT NULL,
	"default_unit" text DEFAULT 'service' NOT NULL,
	"default_price" numeric(12, 2),
	"currency" text DEFAULT 'IDR' NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"created_by" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "services_id_workspace_unique" UNIQUE("id","workspace_id"),
	CONSTRAINT "services_name_not_blank_check" CHECK (length(btrim("services"."name")) > 0),
	CONSTRAINT "services_default_price_check" CHECK ("services"."default_price" is null or "services"."default_price" >= 0)
);
--> statement-breakpoint
CREATE TABLE "task_template_imports" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" uuid NOT NULL,
	"project_id" uuid NOT NULL,
	"idempotency_key" text NOT NULL,
	"payload_fingerprint" text NOT NULL,
	"result" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"completed_at" timestamp with time zone,
	CONSTRAINT "task_template_imports_idempotency_unique" UNIQUE("workspace_id","project_id","idempotency_key")
);
--> statement-breakpoint
CREATE TABLE "task_template_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" uuid NOT NULL,
	"template_id" uuid NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"default_assignee_id" text,
	"position" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "task_template_items_id_workspace_unique" UNIQUE("id","workspace_id"),
	CONSTRAINT "task_template_items_template_position_unique" UNIQUE("template_id","position"),
	CONSTRAINT "task_template_items_position_check" CHECK ("task_template_items"."position" >= 0),
	CONSTRAINT "task_template_items_title_not_blank_check" CHECK (length(btrim("task_template_items"."title")) > 0)
);
--> statement-breakpoint
CREATE TABLE "task_templates" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" uuid NOT NULL,
	"name" text NOT NULL,
	"normalized_name" text GENERATED ALWAYS AS (lower(btrim(name))) STORED,
	"description" text,
	"target" text DEFAULT 'all' NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"created_by" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "task_templates_id_workspace_unique" UNIQUE("id","workspace_id"),
	CONSTRAINT "task_templates_target_check" CHECK ("task_templates"."target" in ('fixed_price', 'hourly_retainer', 'all')),
	CONSTRAINT "task_templates_status_check" CHECK ("task_templates"."status" in ('active', 'archived')),
	CONSTRAINT "task_templates_name_not_blank_check" CHECK (length(btrim("task_templates"."name")) > 0)
);
--> statement-breakpoint
CREATE TABLE "timer_segments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" uuid NOT NULL,
	"time_entry_id" uuid NOT NULL,
	"started_at" timestamp with time zone NOT NULL,
	"ended_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "timesheet_submissions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" uuid NOT NULL,
	"user_id" text NOT NULL,
	"week_start" date NOT NULL,
	"status" text DEFAULT 'submitted' NOT NULL,
	"submitter_note" text,
	"review_note" text,
	"total_minutes" integer DEFAULT 0 NOT NULL,
	"billable_minutes" integer DEFAULT 0 NOT NULL,
	"submitted_at" timestamp with time zone DEFAULT now() NOT NULL,
	"reviewed_at" timestamp with time zone,
	"reviewed_by" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "timesheet_submissions_workspace_user_week_unique" UNIQUE("workspace_id","user_id","week_start")
);
--> statement-breakpoint
CREATE TABLE "user_extra_workspace_entitlements" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"quantity" integer DEFAULT 1 NOT NULL,
	"amount" numeric(12, 2) NOT NULL,
	"billing_period" text NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"starts_at" timestamp with time zone NOT NULL,
	"ends_at" timestamp with time zone NOT NULL,
	"auto_renew" boolean DEFAULT false NOT NULL,
	"provider_order_id" text,
	"provider_event_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "user_extra_workspace_entitlements_provider_order_id_unique" UNIQUE("provider_order_id"),
	CONSTRAINT "user_extra_workspace_entitlements_provider_event_id_unique" UNIQUE("provider_event_id")
);
--> statement-breakpoint
CREATE TABLE "user_storage_addons" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"storage_bytes" bigint NOT NULL,
	"amount" numeric(12, 2) NOT NULL,
	"billing_period" text NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"starts_at" timestamp with time zone NOT NULL,
	"ends_at" timestamp with time zone NOT NULL,
	"auto_renew" boolean DEFAULT false NOT NULL,
	"provider_order_id" text,
	"provider_event_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "user_storage_addons_provider_order_id_unique" UNIQUE("provider_order_id"),
	CONSTRAINT "user_storage_addons_provider_event_id_unique" UNIQUE("provider_event_id")
);
--> statement-breakpoint
CREATE TABLE "workspace_currency_rates" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" uuid NOT NULL,
	"from_currency" text NOT NULL,
	"rate" numeric(18, 8) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "workspace_currency_rates_workspace_id_from_currency_unique" UNIQUE("workspace_id","from_currency")
);
--> statement-breakpoint
CREATE TABLE "workspace_storage_usage" (
	"workspace_id" uuid PRIMARY KEY NOT NULL,
	"reserved_bytes" bigint DEFAULT 0 NOT NULL,
	"reserved_files" integer DEFAULT 0 NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "contracts" DROP CONSTRAINT "contracts_client_id_clients_id_fk";
--> statement-breakpoint
ALTER TABLE "custom_package_requests" DROP CONSTRAINT "custom_package_requests_project_id_projects_id_fk";
--> statement-breakpoint
ALTER TABLE "package_orders" DROP CONSTRAINT "package_orders_project_id_projects_id_fk";
--> statement-breakpoint
ALTER TABLE "package_orders" DROP CONSTRAINT "package_orders_package_id_packages_id_fk";
--> statement-breakpoint
ALTER TABLE "proposals" DROP CONSTRAINT "proposals_client_id_clients_id_fk";
--> statement-breakpoint
ALTER TABLE "clients" ALTER COLUMN "portal_slug_enabled" SET DEFAULT false;--> statement-breakpoint
ALTER TABLE "contracts" ALTER COLUMN "client_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "custom_package_requests" ALTER COLUMN "client_portal_token" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "package_orders" ALTER COLUMN "package_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "package_orders" ALTER COLUMN "client_portal_token" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "packages" ALTER COLUMN "project_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "projects" ALTER COLUMN "billing_type" SET DEFAULT 'fixed_price';--> statement-breakpoint
ALTER TABLE "proposals" ALTER COLUMN "client_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "time_entries" ALTER COLUMN "client_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "time_entries" ALTER COLUMN "project_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "appointments" ADD COLUMN "google_event_id" text;--> statement-breakpoint
ALTER TABLE "appointments" ADD COLUMN "google_calendar_id" text;--> statement-breakpoint
ALTER TABLE "clients" ADD COLUMN "client_number" text;--> statement-breakpoint
ALTER TABLE "clients" ADD COLUMN "portal_token_enc" text;--> statement-breakpoint
ALTER TABLE "clients" ADD COLUMN "portal_password_hash" text;--> statement-breakpoint
ALTER TABLE "clients" ADD COLUMN "portal_password_ciphertext" text;--> statement-breakpoint
ALTER TABLE "clients" ADD COLUMN "portal_password_nonce" text;--> statement-breakpoint
ALTER TABLE "clients" ADD COLUMN "portal_password_encryption_version" integer;--> statement-breakpoint
ALTER TABLE "clients" ADD COLUMN "portal_password_encrypted_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "clients" ADD COLUMN "portal_session_version" text DEFAULT '1' NOT NULL;--> statement-breakpoint
ALTER TABLE "contract_templates" ADD COLUMN "content_blocks" jsonb DEFAULT '[]'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "contracts" ADD COLUMN "client_name" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "contracts" ADD COLUMN "client_email" text;--> statement-breakpoint
ALTER TABLE "contracts" ADD COLUMN "company_name" text;--> statement-breakpoint
ALTER TABLE "contracts" ADD COLUMN "contract_number" text;--> statement-breakpoint
ALTER TABLE "contracts" ADD COLUMN "contract_date" date;--> statement-breakpoint
ALTER TABLE "contracts" ADD COLUMN "content_blocks" jsonb DEFAULT '[]'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "contracts" ADD COLUMN "content_revision" integer DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE "custom_package_requests" ADD COLUMN "client_id" uuid;--> statement-breakpoint
ALTER TABLE "custom_package_requests" ADD COLUMN "idempotency_key" text;--> statement-breakpoint
ALTER TABLE "invoice_items" ADD COLUMN "previous_time_entry_status" text;--> statement-breakpoint
ALTER TABLE "invoice_items" ADD COLUMN "source_mode" text;--> statement-breakpoint
ALTER TABLE "invoice_items" ADD COLUMN "source_metadata" jsonb;--> statement-breakpoint
ALTER TABLE "invoice_items" ADD COLUMN "original_currency" text;--> statement-breakpoint
ALTER TABLE "invoice_items" ADD COLUMN "original_amount" numeric(12, 2);--> statement-breakpoint
ALTER TABLE "invoice_items" ADD COLUMN "conversion_rate" numeric(18, 8);--> statement-breakpoint
ALTER TABLE "invoices" ADD COLUMN "billing_source" text;--> statement-breakpoint
ALTER TABLE "invoices" ADD COLUMN "billing_period_start" date;--> statement-breakpoint
ALTER TABLE "invoices" ADD COLUMN "billing_period_end" date;--> statement-breakpoint
ALTER TABLE "invoices" ADD COLUMN "retainer_period_id" uuid;--> statement-breakpoint
ALTER TABLE "invoices" ADD COLUMN "shared_token_enc" text;--> statement-breakpoint
ALTER TABLE "invoices" ADD COLUMN "client_first_viewed_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "package_orders" ADD COLUMN "project_package_assignment_id" uuid;--> statement-breakpoint
ALTER TABLE "package_orders" ADD COLUMN "client_id" uuid;--> statement-breakpoint
ALTER TABLE "package_orders" ADD COLUMN "idempotency_key" text;--> statement-breakpoint
ALTER TABLE "packages" ADD COLUMN "allowance_type" text DEFAULT 'hours' NOT NULL;--> statement-breakpoint
ALTER TABLE "packages" ADD COLUMN "allowance_value" numeric(12, 2);--> statement-breakpoint
ALTER TABLE "packages" ADD COLUMN "lifecycle_class" text DEFAULT 'one_off' NOT NULL;--> statement-breakpoint
ALTER TABLE "packages" ADD COLUMN "status" text DEFAULT 'active' NOT NULL;--> statement-breakpoint
ALTER TABLE "packages" ADD COLUMN "updated_at" timestamp with time zone DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "pakasir_payments" ADD COLUMN "billing_period" text DEFAULT 'yearly' NOT NULL;--> statement-breakpoint
ALTER TABLE "pakasir_payments" ADD COLUMN "payment_type" text DEFAULT 'plan' NOT NULL;--> statement-breakpoint
ALTER TABLE "pakasir_payments" ADD COLUMN "entitlement_ref" text;--> statement-breakpoint
ALTER TABLE "personal_notes" ADD COLUMN "last_reminded_7d" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "personal_notes" ADD COLUMN "last_reminded_3d" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "personal_notes" ADD COLUMN "last_reminded_1d" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "personal_notes" ADD COLUMN "converted_task_id" uuid;--> statement-breakpoint
ALTER TABLE "portal_requests" ADD COLUMN "meeting_start_time" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "portal_requests" ADD COLUMN "meeting_duration_minutes" integer;--> statement-breakpoint
ALTER TABLE "portal_requests" ADD COLUMN "meeting_timezone" text;--> statement-breakpoint
ALTER TABLE "portal_requests" ADD COLUMN "meeting_status" text;--> statement-breakpoint
ALTER TABLE "portal_requests" ADD COLUMN "meeting_response_note" text;--> statement-breakpoint
ALTER TABLE "portal_requests" ADD COLUMN "meeting_proposed_by_user_id" text;--> statement-breakpoint
ALTER TABLE "portal_requests" ADD COLUMN "appointment_id" uuid;--> statement-breakpoint
ALTER TABLE "projects" ADD COLUMN "billing_model" text;--> statement-breakpoint
ALTER TABLE "projects" ADD COLUMN "task_mode_policy" text DEFAULT 'billing_default' NOT NULL;--> statement-breakpoint
ALTER TABLE "projects" ADD COLUMN "retainer_fee" numeric(12, 2);--> statement-breakpoint
ALTER TABLE "projects" ADD COLUMN "retainer_included_minutes" integer;--> statement-breakpoint
ALTER TABLE "projects" ADD COLUMN "retainer_period_unit" text;--> statement-breakpoint
ALTER TABLE "projects" ADD COLUMN "retainer_reset_day" integer;--> statement-breakpoint
ALTER TABLE "projects" ADD COLUMN "retainer_overage_policy" text;--> statement-breakpoint
ALTER TABLE "projects" ADD COLUMN "retainer_overage_rate" numeric(12, 2);--> statement-breakpoint
ALTER TABLE "projects" ADD COLUMN "time_tracking_mode" text DEFAULT 'internal' NOT NULL;--> statement-breakpoint
ALTER TABLE "projects" ADD COLUMN "activity_required" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "proposals" ADD COLUMN "client_name" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "proposals" ADD COLUMN "client_email" text;--> statement-breakpoint
ALTER TABLE "proposals" ADD COLUMN "company_name" text;--> statement-breakpoint
ALTER TABLE "proposals" ADD COLUMN "proposal_number" text;--> statement-breakpoint
ALTER TABLE "proposals" ADD COLUMN "content_blocks" jsonb DEFAULT '[]'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "proposals" ADD COLUMN "content_revision" integer DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE "tasks" ADD COLUMN "behavior" text;--> statement-breakpoint
ALTER TABLE "tasks" ADD COLUMN "mode" text DEFAULT 'workflow' NOT NULL;--> statement-breakpoint
ALTER TABLE "tasks" ADD COLUMN "lifecycle" text DEFAULT 'active' NOT NULL;--> statement-breakpoint
ALTER TABLE "tasks" ADD COLUMN "template_item_source_id" uuid;--> statement-breakpoint
ALTER TABLE "tasks" ADD COLUMN "archived_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "tasks" ADD COLUMN "project_service_id" uuid;--> statement-breakpoint
ALTER TABLE "tasks" ADD COLUMN "source_note_id" uuid;--> statement-breakpoint
ALTER TABLE "time_entries" ADD COLUMN "activity_id" uuid;--> statement-breakpoint
ALTER TABLE "time_entries" ADD COLUMN "project_service_id" uuid;--> statement-breakpoint
ALTER TABLE "time_entries" ADD COLUMN "retainer_period_id" uuid;--> statement-breakpoint
ALTER TABLE "time_entries" ADD COLUMN "paused_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "time_entries" ADD COLUMN "entry_type" text DEFAULT 'timer' NOT NULL;--> statement-breakpoint
ALTER TABLE "time_entries" ADD COLUMN "work_date" date;--> statement-breakpoint
ALTER TABLE "time_entries" ADD COLUMN "timezone_snapshot" text DEFAULT 'UTC' NOT NULL;--> statement-breakpoint
ALTER TABLE "time_entries" ADD COLUMN "currency_snapshot" text DEFAULT 'IDR' NOT NULL;--> statement-breakpoint
ALTER TABLE "time_entries" ADD COLUMN "submitted_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "time_entries" ADD COLUMN "approved_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "time_entries" ADD COLUMN "rejected_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "time_entries" ADD COLUMN "reviewed_by" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "role" text DEFAULT 'user' NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "banned" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "banned_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "banned_reason" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "preferred_language" text;--> statement-breakpoint
ALTER TABLE "workspaces" ADD COLUMN "show_base_currency_approx" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "workspaces" ADD COLUMN "invoice_email_body" text;--> statement-breakpoint
ALTER TABLE "workspaces" ADD COLUMN "timezone" text DEFAULT 'UTC' NOT NULL;--> statement-breakpoint
ALTER TABLE "activities" ADD CONSTRAINT "activities_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "activities" ADD CONSTRAINT "activities_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "admin_audit_logs" ADD CONSTRAINT "admin_audit_logs_admin_user_id_users_id_fk" FOREIGN KEY ("admin_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "admin_audit_logs" ADD CONSTRAINT "admin_audit_logs_target_user_id_users_id_fk" FOREIGN KEY ("target_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "admin_audit_logs" ADD CONSTRAINT "admin_audit_logs_target_workspace_id_workspaces_id_fk" FOREIGN KEY ("target_workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_usage_daily" ADD CONSTRAINT "ai_usage_daily_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "appointment_calendar_syncs" ADD CONSTRAINT "appointment_calendar_syncs_appointment_id_appointments_id_fk" FOREIGN KEY ("appointment_id") REFERENCES "public"."appointments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "client_google_calendar_connections" ADD CONSTRAINT "client_google_calendar_connections_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "client_google_calendar_connections" ADD CONSTRAINT "client_google_calendar_connections_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "client_google_calendar_connections" ADD CONSTRAINT "client_google_calendar_connections_connected_by_user_id_users_id_fk" FOREIGN KEY ("connected_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "client_service_rate_cards" ADD CONSTRAINT "client_service_rate_cards_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "client_service_rate_cards" ADD CONSTRAINT "client_service_rate_cards_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "client_service_rate_cards" ADD CONSTRAINT "client_service_rate_cards_service_workspace_fk" FOREIGN KEY ("service_id","workspace_id") REFERENCES "public"."services"("id","workspace_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "google_calendar_connections" ADD CONSTRAINT "google_calendar_connections_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "package_items" ADD CONSTRAINT "package_items_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "package_items" ADD CONSTRAINT "package_items_package_workspace_fk" FOREIGN KEY ("package_id","workspace_id") REFERENCES "public"."packages"("id","workspace_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "package_items" ADD CONSTRAINT "package_items_service_workspace_fk" FOREIGN KEY ("service_id","workspace_id") REFERENCES "public"."services"("id","workspace_id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "personal_sites" ADD CONSTRAINT "personal_sites_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "personal_sites" ADD CONSTRAINT "personal_sites_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_activities" ADD CONSTRAINT "project_activities_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_activities" ADD CONSTRAINT "project_activities_project_workspace_fk" FOREIGN KEY ("project_id","workspace_id") REFERENCES "public"."projects"("id","workspace_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_activities" ADD CONSTRAINT "project_activities_activity_workspace_fk" FOREIGN KEY ("activity_id","workspace_id") REFERENCES "public"."activities"("id","workspace_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_package_assignments" ADD CONSTRAINT "project_package_assignments_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_package_assignments" ADD CONSTRAINT "project_package_assignments_project_workspace_fk" FOREIGN KEY ("project_id","workspace_id") REFERENCES "public"."projects"("id","workspace_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_package_assignments" ADD CONSTRAINT "project_package_assignments_source_package_workspace_fk" FOREIGN KEY ("source_package_id","workspace_id") REFERENCES "public"."packages"("id","workspace_id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_services" ADD CONSTRAINT "project_services_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_services" ADD CONSTRAINT "project_services_project_workspace_fk" FOREIGN KEY ("project_id","workspace_id") REFERENCES "public"."projects"("id","workspace_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_services" ADD CONSTRAINT "project_services_service_workspace_fk" FOREIGN KEY ("service_id","workspace_id") REFERENCES "public"."services"("id","workspace_id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_services" ADD CONSTRAINT "project_services_package_item_workspace_fk" FOREIGN KEY ("package_item_id","workspace_id") REFERENCES "public"."package_items"("id","workspace_id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_services" ADD CONSTRAINT "project_services_project_package_assignment_workspace_fk" FOREIGN KEY ("project_package_assignment_id","workspace_id") REFERENCES "public"."project_package_assignments"("id","workspace_id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_services" ADD CONSTRAINT "project_services_source_package_assignment_workspace_fk" FOREIGN KEY ("source_package_assignment_id","workspace_id") REFERENCES "public"."project_package_assignments"("id","workspace_id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "proposal_templates" ADD CONSTRAINT "proposal_templates_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "proposal_templates" ADD CONSTRAINT "proposal_templates_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "retainer_periods" ADD CONSTRAINT "retainer_periods_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "retainer_periods" ADD CONSTRAINT "retainer_periods_project_id_workspace_id_projects_id_workspace_id_fk" FOREIGN KEY ("project_id","workspace_id") REFERENCES "public"."projects"("id","workspace_id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "service_categories" ADD CONSTRAINT "service_categories_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "services" ADD CONSTRAINT "services_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "services" ADD CONSTRAINT "services_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "services" ADD CONSTRAINT "services_category_workspace_fk" FOREIGN KEY ("category_id","workspace_id") REFERENCES "public"."service_categories"("id","workspace_id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "task_template_imports" ADD CONSTRAINT "task_template_imports_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "task_template_imports" ADD CONSTRAINT "task_template_imports_project_workspace_fk" FOREIGN KEY ("project_id","workspace_id") REFERENCES "public"."projects"("id","workspace_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "task_template_items" ADD CONSTRAINT "task_template_items_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "task_template_items" ADD CONSTRAINT "task_template_items_template_workspace_fk" FOREIGN KEY ("template_id","workspace_id") REFERENCES "public"."task_templates"("id","workspace_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "task_template_items" ADD CONSTRAINT "task_template_items_assignee_workspace_fk" FOREIGN KEY ("workspace_id","default_assignee_id") REFERENCES "public"."workspace_members"("workspace_id","user_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "task_templates" ADD CONSTRAINT "task_templates_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "task_templates" ADD CONSTRAINT "task_templates_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "timer_segments" ADD CONSTRAINT "timer_segments_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "timer_segments" ADD CONSTRAINT "timer_segments_time_entry_id_time_entries_id_fk" FOREIGN KEY ("time_entry_id") REFERENCES "public"."time_entries"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "timesheet_submissions" ADD CONSTRAINT "timesheet_submissions_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "timesheet_submissions" ADD CONSTRAINT "timesheet_submissions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "timesheet_submissions" ADD CONSTRAINT "timesheet_submissions_reviewed_by_users_id_fk" FOREIGN KEY ("reviewed_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_extra_workspace_entitlements" ADD CONSTRAINT "user_extra_workspace_entitlements_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_storage_addons" ADD CONSTRAINT "user_storage_addons_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workspace_currency_rates" ADD CONSTRAINT "workspace_currency_rates_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workspace_storage_usage" ADD CONSTRAINT "workspace_storage_usage_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "activities_workspace_active_name_uidx" ON "activities" USING btree ("workspace_id",lower(btrim("name"))) WHERE "activities"."status" = 'active';--> statement-breakpoint
CREATE INDEX "activities_workspace_status_name_idx" ON "activities" USING btree ("workspace_id","status","name");--> statement-breakpoint
CREATE INDEX "admin_audit_logs_created_idx" ON "admin_audit_logs" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "admin_audit_logs_admin_created_idx" ON "admin_audit_logs" USING btree ("admin_user_id","created_at");--> statement-breakpoint
CREATE INDEX "admin_audit_logs_target_user_idx" ON "admin_audit_logs" USING btree ("target_user_id");--> statement-breakpoint
CREATE INDEX "package_items_workspace_package_status_idx" ON "package_items" USING btree ("workspace_id","package_id","status");--> statement-breakpoint
CREATE UNIQUE INDEX "personal_sites_owner_workspace_uidx" ON "personal_sites" USING btree ("workspace_id","user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "personal_sites_slug_uidx" ON "personal_sites" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "personal_sites_public_slug_idx" ON "personal_sites" USING btree ("slug","published");--> statement-breakpoint
CREATE INDEX "project_activities_workspace_project_enabled_idx" ON "project_activities" USING btree ("workspace_id","project_id","enabled");--> statement-breakpoint
CREATE UNIQUE INDEX "project_package_assignments_active_project_uidx" ON "project_package_assignments" USING btree ("project_id") WHERE "project_package_assignments"."status" = 'active';--> statement-breakpoint
CREATE INDEX "project_package_assignments_workspace_project_status_idx" ON "project_package_assignments" USING btree ("workspace_id","project_id","status");--> statement-breakpoint
CREATE INDEX "project_services_workspace_project_status_idx" ON "project_services" USING btree ("workspace_id","project_id","status");--> statement-breakpoint
CREATE UNIQUE INDEX "proposal_templates_one_default_per_ws_uidx" ON "proposal_templates" USING btree ("workspace_id") WHERE "proposal_templates"."is_default" = true;--> statement-breakpoint
CREATE UNIQUE INDEX "services_workspace_active_normalized_name_uidx" ON "services" USING btree ("workspace_id","normalized_name") WHERE "services"."status" = 'active';--> statement-breakpoint
CREATE INDEX "services_workspace_status_name_idx" ON "services" USING btree ("workspace_id","status","name");--> statement-breakpoint
CREATE UNIQUE INDEX "task_templates_workspace_active_normalized_name_uidx" ON "task_templates" USING btree ("workspace_id","normalized_name") WHERE "task_templates"."status" = 'active';--> statement-breakpoint
CREATE INDEX "timer_segments_entry_started_idx" ON "timer_segments" USING btree ("time_entry_id","started_at");--> statement-breakpoint
CREATE UNIQUE INDEX "timer_segments_one_open_per_entry_uidx" ON "timer_segments" USING btree ("time_entry_id") WHERE "timer_segments"."ended_at" is null;--> statement-breakpoint
CREATE INDEX "timesheet_submissions_workspace_status_week_idx" ON "timesheet_submissions" USING btree ("workspace_id","status","week_start");--> statement-breakpoint
ALTER TABLE "contracts" ADD CONSTRAINT "contracts_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "custom_package_requests" ADD CONSTRAINT "custom_package_requests_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "custom_package_requests" ADD CONSTRAINT "custom_package_requests_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "package_orders" ADD CONSTRAINT "package_orders_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "package_orders" ADD CONSTRAINT "package_orders_project_package_assignment_workspace_fk" FOREIGN KEY ("project_package_assignment_id","workspace_id") REFERENCES "public"."project_package_assignments"("id","workspace_id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "package_orders" ADD CONSTRAINT "package_orders_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "package_orders" ADD CONSTRAINT "package_orders_package_id_packages_id_fk" FOREIGN KEY ("package_id") REFERENCES "public"."packages"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "personal_notes" ADD CONSTRAINT "personal_notes_converted_task_id_tasks_id_fk" FOREIGN KEY ("converted_task_id") REFERENCES "public"."tasks"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "portal_requests" ADD CONSTRAINT "portal_requests_meeting_proposed_by_user_id_users_id_fk" FOREIGN KEY ("meeting_proposed_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "portal_requests" ADD CONSTRAINT "portal_requests_appointment_id_appointments_id_fk" FOREIGN KEY ("appointment_id") REFERENCES "public"."appointments"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "proposals" ADD CONSTRAINT "proposals_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_project_service_id_project_services_id_fk" FOREIGN KEY ("project_service_id") REFERENCES "public"."project_services"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_project_workspace_fk" FOREIGN KEY ("project_id","workspace_id") REFERENCES "public"."projects"("id","workspace_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_template_item_source_workspace_fk" FOREIGN KEY ("template_item_source_id","workspace_id") REFERENCES "public"."task_template_items"("id","workspace_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "time_entries" ADD CONSTRAINT "time_entries_project_service_id_project_services_id_fk" FOREIGN KEY ("project_service_id") REFERENCES "public"."project_services"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "time_entries" ADD CONSTRAINT "time_entries_reviewed_by_users_id_fk" FOREIGN KEY ("reviewed_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "time_entries" ADD CONSTRAINT "time_entries_activity_workspace_fk" FOREIGN KEY ("activity_id","workspace_id") REFERENCES "public"."activities"("id","workspace_id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "contract_templates_one_default_per_ws_uidx" ON "contract_templates" USING btree ("workspace_id") WHERE "contract_templates"."is_default" = true;--> statement-breakpoint
CREATE UNIQUE INDEX "custom_package_requests_client_idempotency_uidx" ON "custom_package_requests" USING btree ("client_id","idempotency_key") WHERE "custom_package_requests"."idempotency_key" is not null;--> statement-breakpoint
CREATE UNIQUE INDEX "invoice_items_time_entry_source_uidx" ON "invoice_items" USING btree ("source_id") WHERE "invoice_items"."source_type" = 'time_entry' and "invoice_items"."source_id" is not null;--> statement-breakpoint
CREATE INDEX "invoice_items_source_lookup_idx" ON "invoice_items" USING btree ("source_type","source_id");--> statement-breakpoint
CREATE INDEX "invoices_workspace_client_status_idx" ON "invoices" USING btree ("workspace_id","client_id","status");--> statement-breakpoint
CREATE INDEX "invoices_workspace_status_issue_date_idx" ON "invoices" USING btree ("workspace_id","status","issue_date");--> statement-breakpoint
CREATE UNIQUE INDEX "package_orders_client_idempotency_uidx" ON "package_orders" USING btree ("client_id","idempotency_key") WHERE "package_orders"."idempotency_key" is not null;--> statement-breakpoint
CREATE INDEX "packages_workspace_status_sort_idx" ON "packages" USING btree ("workspace_id","status","sort_order");--> statement-breakpoint
CREATE INDEX "tasks_workspace_mode_lifecycle_idx" ON "tasks" USING btree ("workspace_id","mode","lifecycle");--> statement-breakpoint
CREATE INDEX "tasks_project_mode_lifecycle_position_idx" ON "tasks" USING btree ("project_id","mode","lifecycle","position");--> statement-breakpoint
CREATE UNIQUE INDEX "time_entries_one_active_per_user_workspace_uidx" ON "time_entries" USING btree ("workspace_id","user_id") WHERE "time_entries"."end_time" is null and "time_entries"."manual_minutes" is null;--> statement-breakpoint
CREATE INDEX "time_entries_workspace_activity_start_idx" ON "time_entries" USING btree ("workspace_id","activity_id","start_time");--> statement-breakpoint
CREATE INDEX "time_entries_workspace_user_work_date_idx" ON "time_entries" USING btree ("workspace_id","user_id","work_date");--> statement-breakpoint
CREATE INDEX "time_entries_workspace_project_status_idx" ON "time_entries" USING btree ("workspace_id","project_id","status");--> statement-breakpoint
ALTER TABLE "packages" ADD CONSTRAINT "packages_id_workspace_unique" UNIQUE("id","workspace_id");--> statement-breakpoint
ALTER TABLE "projects" ADD CONSTRAINT "projects_id_workspace_unique" UNIQUE("id","workspace_id");--> statement-breakpoint
ALTER TABLE "packages" ADD CONSTRAINT "packages_price_check" CHECK ("packages"."price" >= 0);--> statement-breakpoint
ALTER TABLE "packages" ADD CONSTRAINT "packages_allowance_value_check" CHECK ("packages"."allowance_value" is null or "packages"."allowance_value" >= 0);--> statement-breakpoint
ALTER TABLE "projects" ADD CONSTRAINT "projects_task_mode_policy_check" CHECK ("projects"."task_mode_policy" in ('billing_default', 'workflow', 'reusable', 'mixed'));