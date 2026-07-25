-- Generated from production read-only constraint inventory on 2026-07-25.
-- Run only after backup and in a transaction.
BEGIN;
SET lock_timeout = '5s';
SET statement_timeout = '60s';

-- Keep ai_messages_conversation_id_ai_conversations_id_fk; remove semantically identical ai_messages_conversation_id_fkey.
ALTER TABLE public."ai_messages" DROP CONSTRAINT IF EXISTS "ai_messages_conversation_id_fkey";
-- Keep custom_package_requests_project_id_projects_id_fk; remove semantically identical custom_package_requests_project_id_fkey.
ALTER TABLE public."custom_package_requests" DROP CONSTRAINT IF EXISTS "custom_package_requests_project_id_fkey";
-- Keep custom_package_requests_workspace_id_workspaces_id_fk; remove semantically identical custom_package_requests_workspace_id_fkey.
ALTER TABLE public."custom_package_requests" DROP CONSTRAINT IF EXISTS "custom_package_requests_workspace_id_fkey";
-- Keep email_messages_project_id_projects_id_fk; remove semantically identical email_messages_project_id_fkey.
ALTER TABLE public."email_messages" DROP CONSTRAINT IF EXISTS "email_messages_project_id_fkey";
-- Keep email_messages_workspace_id_workspaces_id_fk; remove semantically identical email_messages_workspace_id_fkey.
ALTER TABLE public."email_messages" DROP CONSTRAINT IF EXISTS "email_messages_workspace_id_fkey";
-- Keep email_messages_client_id_clients_id_fk; remove semantically identical email_messages_client_id_fkey.
ALTER TABLE public."email_messages" DROP CONSTRAINT IF EXISTS "email_messages_client_id_fkey";
-- Keep email_messages_user_id_users_id_fk; remove semantically identical email_messages_user_id_fkey.
ALTER TABLE public."email_messages" DROP CONSTRAINT IF EXISTS "email_messages_user_id_fkey";
-- Keep email_templates_user_id_users_id_fk; remove semantically identical email_templates_user_id_fkey.
ALTER TABLE public."email_templates" DROP CONSTRAINT IF EXISTS "email_templates_user_id_fkey";
-- Keep email_templates_workspace_id_workspaces_id_fk; remove semantically identical email_templates_workspace_id_fkey.
ALTER TABLE public."email_templates" DROP CONSTRAINT IF EXISTS "email_templates_workspace_id_fkey";
-- Keep invoices_project_id_projects_id_fk; remove semantically identical invoices_project_id_fkey.
ALTER TABLE public."invoices" DROP CONSTRAINT IF EXISTS "invoices_project_id_fkey";
-- Keep invoice_templates_created_by_users_id_fk; remove semantically identical invoice_templates_created_by_fkey.
ALTER TABLE public."invoice_templates" DROP CONSTRAINT IF EXISTS "invoice_templates_created_by_fkey";
-- Keep invoice_templates_workspace_id_workspaces_id_fk; remove semantically identical invoice_templates_workspace_id_fkey.
ALTER TABLE public."invoice_templates" DROP CONSTRAINT IF EXISTS "invoice_templates_workspace_id_fkey";
-- Keep notifications_user_id_users_id_fk; remove semantically identical notifications_user_id_fkey.
ALTER TABLE public."notifications" DROP CONSTRAINT IF EXISTS "notifications_user_id_fkey";
-- Keep notifications_actor_id_users_id_fk; remove semantically identical notifications_actor_id_fkey.
ALTER TABLE public."notifications" DROP CONSTRAINT IF EXISTS "notifications_actor_id_fkey";
-- Keep notifications_workspace_id_workspaces_id_fk; remove semantically identical notifications_workspace_id_fkey.
ALTER TABLE public."notifications" DROP CONSTRAINT IF EXISTS "notifications_workspace_id_fkey";
-- Keep package_orders_package_id_packages_id_fk; remove semantically identical package_orders_package_id_fkey.
ALTER TABLE public."package_orders" DROP CONSTRAINT IF EXISTS "package_orders_package_id_fkey";
-- Keep package_orders_workspace_id_workspaces_id_fk; remove semantically identical package_orders_workspace_id_fkey.
ALTER TABLE public."package_orders" DROP CONSTRAINT IF EXISTS "package_orders_workspace_id_fkey";
-- Keep package_orders_project_id_projects_id_fk; remove semantically identical package_orders_project_id_fkey.
ALTER TABLE public."package_orders" DROP CONSTRAINT IF EXISTS "package_orders_project_id_fkey";
-- Keep packages_workspace_id_workspaces_id_fk; remove semantically identical packages_workspace_id_fkey.
ALTER TABLE public."packages" DROP CONSTRAINT IF EXISTS "packages_workspace_id_fkey";
-- Keep packages_project_id_projects_id_fk; remove semantically identical packages_project_id_fkey.
ALTER TABLE public."packages" DROP CONSTRAINT IF EXISTS "packages_project_id_fkey";
-- Keep pakasir_payments_workspace_id_workspaces_id_fk; remove semantically identical pakasir_payments_workspace_id_fkey.
ALTER TABLE public."pakasir_payments" DROP CONSTRAINT IF EXISTS "pakasir_payments_workspace_id_fkey";
-- Keep personal_notes_converted_task_id_tasks_id_fk; remove semantically identical personal_notes_converted_task_id_fkey.
ALTER TABLE public."personal_notes" DROP CONSTRAINT IF EXISTS "personal_notes_converted_task_id_fkey";
-- Keep personal_notes_workspace_id_workspaces_id_fk; remove semantically identical personal_notes_workspace_id_fkey.
ALTER TABLE public."personal_notes" DROP CONSTRAINT IF EXISTS "personal_notes_workspace_id_fkey";
-- Keep personal_notes_user_id_users_id_fk; remove semantically identical personal_notes_user_id_fkey.
ALTER TABLE public."personal_notes" DROP CONSTRAINT IF EXISTS "personal_notes_user_id_fkey";
-- Keep portal_requests_created_by_users_id_fk; remove semantically identical portal_requests_created_by_fkey.
ALTER TABLE public."portal_requests" DROP CONSTRAINT IF EXISTS "portal_requests_created_by_fkey";
-- Keep portal_requests_workspace_id_workspaces_id_fk; remove semantically identical portal_requests_workspace_id_fkey.
ALTER TABLE public."portal_requests" DROP CONSTRAINT IF EXISTS "portal_requests_workspace_id_fkey";
-- Keep portal_requests_client_id_clients_id_fk; remove semantically identical portal_requests_client_id_fkey.
ALTER TABLE public."portal_requests" DROP CONSTRAINT IF EXISTS "portal_requests_client_id_fkey";
-- Keep portal_requests_project_id_projects_id_fk; remove semantically identical portal_requests_project_id_fkey.
ALTER TABLE public."portal_requests" DROP CONSTRAINT IF EXISTS "portal_requests_project_id_fkey";
-- Keep portal_visits_client_id_clients_id_fk; remove semantically identical portal_visits_client_id_fkey.
ALTER TABLE public."portal_visits" DROP CONSTRAINT IF EXISTS "portal_visits_client_id_fkey";
-- Keep portal_visits_workspace_id_workspaces_id_fk; remove semantically identical portal_visits_workspace_id_fkey.
ALTER TABLE public."portal_visits" DROP CONSTRAINT IF EXISTS "portal_visits_workspace_id_fkey";
-- Keep support_tickets_client_id_clients_id_fk; remove semantically identical support_tickets_client_id_fkey.
ALTER TABLE public."support_tickets" DROP CONSTRAINT IF EXISTS "support_tickets_client_id_fkey";
-- Keep support_tickets_created_by_users_id_fk; remove semantically identical support_tickets_created_by_fkey.
ALTER TABLE public."support_tickets" DROP CONSTRAINT IF EXISTS "support_tickets_created_by_fkey";
-- Keep support_tickets_workspace_id_workspaces_id_fk; remove semantically identical support_tickets_workspace_id_fkey.
ALTER TABLE public."support_tickets" DROP CONSTRAINT IF EXISTS "support_tickets_workspace_id_fkey";
-- Keep support_tickets_assignee_id_users_id_fk; remove semantically identical support_tickets_assignee_id_fkey.
ALTER TABLE public."support_tickets" DROP CONSTRAINT IF EXISTS "support_tickets_assignee_id_fkey";
-- Keep support_tickets_project_id_projects_id_fk; remove semantically identical support_tickets_project_id_fkey.
ALTER TABLE public."support_tickets" DROP CONSTRAINT IF EXISTS "support_tickets_project_id_fkey";

-- Verification must return zero rows before COMMIT:
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint con
    JOIN pg_namespace n ON n.oid=(SELECT relnamespace FROM pg_class WHERE oid=con.conrelid)
    WHERE con.contype='f' AND n.nspname='public'
    GROUP BY con.conrelid,con.conkey,con.confrelid,con.confkey,con.confupdtype,con.confdeltype,con.confmatchtype
    HAVING count(*)>1
  ) THEN
    RAISE EXCEPTION 'Duplicate foreign keys remain after cleanup';
  END IF;
END $$;
COMMIT;
