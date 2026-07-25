--
-- PostgreSQL database dump
--

\restrict ocNCKTWWif5bVnUeQpebNRsIx43ioPm1xOFnbNWh6iPp2l6vF0tekXRLFzuXElQ

-- Dumped from database version 16.14 (Debian 16.14-1.pgdg13+1)
-- Dumped by pg_dump version 16.14 (Debian 16.14-1.pgdg13+1)

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: pg_trgm; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS pg_trgm WITH SCHEMA public;


--
-- Name: EXTENSION pg_trgm; Type: COMMENT; Schema: -; Owner: -
--

COMMENT ON EXTENSION pg_trgm IS 'text similarity measurement and index searching based on trigrams';


--
-- Name: assign_client_number(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.assign_client_number() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  IF NEW.client_number IS NULL THEN
    PERFORM pg_advisory_xact_lock(hashtext(NEW.workspace_id::text));
    SELECT 'CLI-' || lpad((coalesce(max(substring(client_number from 5)::int), 0) + 1)::text, 6, '0')
      INTO NEW.client_number FROM clients WHERE workspace_id = NEW.workspace_id;
  END IF;
  RETURN NEW;
END;
$$;


SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: accounts; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.accounts (
    id text NOT NULL,
    account_id text NOT NULL,
    provider_id text NOT NULL,
    user_id text NOT NULL,
    access_token text,
    refresh_token text,
    id_token text,
    access_token_expires_at timestamp with time zone,
    refresh_token_expires_at timestamp with time zone,
    scope text,
    password text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: activity_logs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.activity_logs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    workspace_id uuid NOT NULL,
    actor_id text,
    action text NOT NULL,
    entity_type text NOT NULL,
    entity_id uuid,
    metadata jsonb DEFAULT '{}'::jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: ai_conversations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.ai_conversations (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    workspace_id uuid NOT NULL,
    user_id text NOT NULL,
    title text DEFAULT 'New chat'::text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: ai_messages; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.ai_messages (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    conversation_id uuid NOT NULL,
    role text NOT NULL,
    content text DEFAULT ''::text NOT NULL,
    tool_calls jsonb DEFAULT '[]'::jsonb NOT NULL,
    tool_name text,
    tokens integer DEFAULT 0 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT ai_messages_role_check CHECK ((role = ANY (ARRAY['user'::text, 'assistant'::text, 'tool'::text])))
);


--
-- Name: ai_usage_daily; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.ai_usage_daily (
    workspace_id uuid NOT NULL,
    usage_date date NOT NULL,
    count integer DEFAULT 0 NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: appointments; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.appointments (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    workspace_id uuid NOT NULL,
    client_id uuid,
    user_id text NOT NULL,
    title text NOT NULL,
    notes text,
    attendee_name text,
    attendee_email text,
    start_time timestamp with time zone NOT NULL,
    end_time timestamp with time zone NOT NULL,
    status text DEFAULT 'scheduled'::text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    google_event_id text,
    google_calendar_id text
);


--
-- Name: availability_rules; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.availability_rules (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    workspace_id uuid NOT NULL,
    user_id text NOT NULL,
    day_of_week integer NOT NULL,
    start_time time without time zone NOT NULL,
    end_time time without time zone NOT NULL,
    timezone text DEFAULT 'UTC'::text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: client_google_calendar_connections; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.client_google_calendar_connections (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    client_id uuid NOT NULL,
    workspace_id uuid NOT NULL,
    connected_by_user_id text,
    google_account_email text,
    access_token_enc text,
    refresh_token_enc text,
    scope text,
    token_type text,
    expiry_date timestamp with time zone,
    calendar_id text DEFAULT 'primary'::text NOT NULL,
    invite_token_hash text,
    invite_token_expires_at timestamp with time zone,
    status text DEFAULT 'pending_invite'::text NOT NULL,
    last_error text,
    connected_at timestamp with time zone,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: clients; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.clients (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    workspace_id uuid NOT NULL,
    name text NOT NULL,
    company_name text,
    email text,
    phone text,
    website text,
    address text,
    status text DEFAULT 'active'::text NOT NULL,
    tags text[] DEFAULT '{}'::text[] NOT NULL,
    internal_notes text,
    portal_enabled boolean DEFAULT false NOT NULL,
    portal_token_hash text,
    portal_token_expires_at timestamp with time zone,
    portal_token_revoked_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    portal_slug text,
    portal_slug_enabled boolean DEFAULT true NOT NULL,
    client_number text
);


--
-- Name: comments; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.comments (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    workspace_id uuid NOT NULL,
    entity_type text NOT NULL,
    entity_id uuid NOT NULL,
    body text NOT NULL,
    visibility text DEFAULT 'internal'::text NOT NULL,
    author_id text,
    author_name text,
    author_email text,
    source text DEFAULT 'internal'::text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: contract_templates; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.contract_templates (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    workspace_id uuid NOT NULL,
    name text NOT NULL,
    body text NOT NULL,
    is_default boolean DEFAULT false NOT NULL,
    created_by text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: contracts; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.contracts (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    workspace_id uuid NOT NULL,
    client_id uuid NOT NULL,
    project_id uuid,
    template_id uuid,
    title text NOT NULL,
    body text,
    body_resolved text,
    variables jsonb DEFAULT '{}'::jsonb NOT NULL,
    valid_until date,
    status text DEFAULT 'draft'::text NOT NULL,
    decline_reason text,
    signed_name text,
    signed_email text,
    signature_data_url text,
    signed_at timestamp with time zone,
    signed_from_ip text,
    signed_user_agent text,
    shared_token_hash text,
    shared_token_expires_at timestamp with time zone,
    shared_token_revoked_at timestamp with time zone,
    sent_at timestamp with time zone,
    viewed_at timestamp with time zone,
    declined_at timestamp with time zone,
    created_by text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: custom_package_requests; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.custom_package_requests (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    workspace_id uuid NOT NULL,
    project_id uuid NOT NULL,
    client_portal_token text NOT NULL,
    requested_hours integer NOT NULL,
    estimated_price numeric(12,2),
    message text,
    status text DEFAULT 'pending'::text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: email_messages; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.email_messages (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    workspace_id uuid NOT NULL,
    client_id uuid,
    project_id uuid,
    user_id text,
    to_email text NOT NULL,
    subject text NOT NULL,
    body text NOT NULL,
    status text DEFAULT 'draft'::text NOT NULL,
    sent_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: email_templates; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.email_templates (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    workspace_id uuid NOT NULL,
    user_id text,
    name text NOT NULL,
    subject text NOT NULL,
    body text NOT NULL,
    category text DEFAULT 'general'::text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: expense_categories; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.expense_categories (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    workspace_id uuid NOT NULL,
    name text NOT NULL,
    color text DEFAULT '#64748b'::text NOT NULL,
    icon text,
    is_default boolean DEFAULT false NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: expense_recurring; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.expense_recurring (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    workspace_id uuid NOT NULL,
    name text NOT NULL,
    amount numeric(12,2) NOT NULL,
    currency text DEFAULT 'IDR'::text NOT NULL,
    category_id uuid,
    project_id uuid,
    frequency text DEFAULT 'monthly'::text NOT NULL,
    start_date date NOT NULL,
    end_date date,
    last_generated_date date,
    is_active boolean DEFAULT true NOT NULL,
    notes text,
    created_by text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: expenses; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.expenses (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    workspace_id uuid NOT NULL,
    category_id uuid,
    project_id uuid,
    client_id uuid,
    amount numeric(12,2) NOT NULL,
    currency text DEFAULT 'IDR'::text NOT NULL,
    date date NOT NULL,
    description text NOT NULL,
    vendor text,
    receipt_url text,
    tax_included boolean DEFAULT false NOT NULL,
    tax_amount numeric(12,2),
    created_by text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: files; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.files (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    workspace_id uuid NOT NULL,
    client_id uuid,
    project_id uuid,
    folder_id uuid,
    name text NOT NULL,
    storage_key text NOT NULL,
    mime_type text,
    size_bytes bigint,
    visibility text DEFAULT 'internal'::text NOT NULL,
    uploaded_by text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    file_type text DEFAULT 'working_file'::text NOT NULL,
    last_viewed_at timestamp with time zone,
    CONSTRAINT files_file_type_check CHECK ((file_type = ANY (ARRAY['working_file'::text, 'deliverable'::text])))
);


--
-- Name: folders; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.folders (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    workspace_id uuid NOT NULL,
    client_id uuid,
    project_id uuid,
    parent_id uuid,
    name text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: google_calendar_connections; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.google_calendar_connections (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id text NOT NULL,
    google_account_email text,
    access_token_enc text NOT NULL,
    refresh_token_enc text NOT NULL,
    scope text,
    token_type text,
    expiry_date timestamp with time zone,
    calendar_id text DEFAULT 'primary'::text NOT NULL,
    status text DEFAULT 'connected'::text NOT NULL,
    last_error text,
    connected_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: invoice_items; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.invoice_items (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    invoice_id uuid NOT NULL,
    description text NOT NULL,
    quantity numeric(12,2) DEFAULT '1'::numeric NOT NULL,
    unit_price numeric(12,2) DEFAULT '0'::numeric NOT NULL,
    amount numeric(12,2) DEFAULT '0'::numeric NOT NULL,
    source_type text,
    source_id uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    original_currency text,
    original_amount numeric(12,2),
    conversion_rate numeric(18,8)
);


--
-- Name: invoice_templates; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.invoice_templates (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    workspace_id uuid NOT NULL,
    name text NOT NULL,
    terms text,
    notes text,
    default_currency text DEFAULT 'IDR'::text NOT NULL,
    default_tax_rate numeric(5,2) DEFAULT '0'::numeric,
    line_items text,
    created_by text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: invoices; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.invoices (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    workspace_id uuid NOT NULL,
    client_id uuid NOT NULL,
    invoice_number text NOT NULL,
    issue_date date NOT NULL,
    due_date date,
    currency text DEFAULT 'IDR'::text NOT NULL,
    subtotal numeric(12,2) DEFAULT '0'::numeric NOT NULL,
    discount numeric(12,2) DEFAULT '0'::numeric NOT NULL,
    tax numeric(12,2) DEFAULT '0'::numeric NOT NULL,
    total numeric(12,2) DEFAULT '0'::numeric NOT NULL,
    status text DEFAULT 'draft'::text NOT NULL,
    notes text,
    terms text,
    shared_token_hash text,
    shared_token_expires_at timestamp with time zone,
    shared_token_revoked_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    project_id uuid,
    client_first_viewed_at timestamp with time zone
);


--
-- Name: notifications; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.notifications (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    workspace_id uuid NOT NULL,
    user_id text NOT NULL,
    type text NOT NULL,
    title text NOT NULL,
    body text,
    link text,
    entity_type text,
    entity_id uuid,
    actor_id text,
    read_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: package_orders; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.package_orders (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    workspace_id uuid NOT NULL,
    project_id uuid NOT NULL,
    package_id uuid NOT NULL,
    client_portal_token text NOT NULL,
    package_name text NOT NULL,
    hours integer,
    price numeric(12,2) NOT NULL,
    currency text DEFAULT 'USD'::text NOT NULL,
    message text,
    status text DEFAULT 'pending'::text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: packages; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.packages (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    workspace_id uuid NOT NULL,
    project_id uuid,
    name text NOT NULL,
    hours integer,
    price numeric(12,2) NOT NULL,
    currency text DEFAULT 'IDR'::text NOT NULL,
    description text,
    features text,
    badge text,
    sort_order integer DEFAULT 0 NOT NULL,
    active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    custom_price numeric(12,2),
    min_hours integer,
    max_hours integer,
    allow_custom boolean DEFAULT false NOT NULL
);


--
-- Name: pakasir_payments; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.pakasir_payments (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    workspace_id uuid NOT NULL,
    order_id text NOT NULL,
    plan text NOT NULL,
    amount numeric(12,2) NOT NULL,
    status text DEFAULT 'pending'::text NOT NULL,
    payment_method text DEFAULT 'PAKASIR_QRIS'::text NOT NULL,
    raw_payload jsonb,
    paid_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: payments; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.payments (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    invoice_id uuid NOT NULL,
    amount numeric(12,2) NOT NULL,
    paid_at date NOT NULL,
    method text,
    notes text,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: personal_notes; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.personal_notes (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    workspace_id uuid NOT NULL,
    user_id text NOT NULL,
    title text NOT NULL,
    body text,
    status text DEFAULT 'open'::text NOT NULL,
    pinned boolean DEFAULT false NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    due_date timestamp with time zone,
    recurrence_rule text DEFAULT 'none'::text NOT NULL,
    notify_7d boolean DEFAULT false NOT NULL,
    notify_3d boolean DEFAULT false NOT NULL,
    notify_1d boolean DEFAULT false NOT NULL,
    last_reminded_7d timestamp with time zone,
    last_reminded_3d timestamp with time zone,
    last_reminded_1d timestamp with time zone,
    converted_task_id uuid
);


--
-- Name: portal_access_logs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.portal_access_logs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    workspace_id uuid,
    client_id uuid,
    invoice_id uuid,
    token_type text NOT NULL,
    token_hash_prefix text,
    ip_address text,
    user_agent text,
    accessed_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: portal_requests; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.portal_requests (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    workspace_id uuid NOT NULL,
    client_id uuid NOT NULL,
    project_id uuid,
    title text NOT NULL,
    description text,
    type text DEFAULT 'document'::text NOT NULL,
    status text DEFAULT 'pending'::text NOT NULL,
    due_date date,
    completed_at timestamp with time zone,
    created_by text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT portal_requests_status_check CHECK ((status = ANY (ARRAY['pending'::text, 'completed'::text, 'cancelled'::text]))),
    CONSTRAINT portal_requests_type_check CHECK ((type = ANY (ARRAY['document'::text, 

... [OUTPUT TRUNCATED - 64859 chars omitted out of 114859 total] ...

 public.folders
    ADD CONSTRAINT folders_client_id_clients_id_fk FOREIGN KEY (client_id) REFERENCES public.clients(id) ON DELETE CASCADE;


--
-- Name: folders folders_parent_id_folders_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.folders
    ADD CONSTRAINT folders_parent_id_folders_id_fk FOREIGN KEY (parent_id) REFERENCES public.folders(id) ON DELETE CASCADE;


--
-- Name: folders folders_project_id_projects_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.folders
    ADD CONSTRAINT folders_project_id_projects_id_fk FOREIGN KEY (project_id) REFERENCES public.projects(id) ON DELETE CASCADE;


--
-- Name: folders folders_workspace_id_workspaces_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.folders
    ADD CONSTRAINT folders_workspace_id_workspaces_id_fk FOREIGN KEY (workspace_id) REFERENCES public.workspaces(id) ON DELETE CASCADE;


--
-- Name: google_calendar_connections google_calendar_connections_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.google_calendar_connections
    ADD CONSTRAINT google_calendar_connections_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: invoice_items invoice_items_invoice_id_invoices_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.invoice_items
    ADD CONSTRAINT invoice_items_invoice_id_invoices_id_fk FOREIGN KEY (invoice_id) REFERENCES public.invoices(id) ON DELETE CASCADE;


--
-- Name: invoice_templates invoice_templates_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.invoice_templates
    ADD CONSTRAINT invoice_templates_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: invoice_templates invoice_templates_created_by_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.invoice_templates
    ADD CONSTRAINT invoice_templates_created_by_users_id_fk FOREIGN KEY (created_by) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: invoice_templates invoice_templates_workspace_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.invoice_templates
    ADD CONSTRAINT invoice_templates_workspace_id_fkey FOREIGN KEY (workspace_id) REFERENCES public.workspaces(id) ON DELETE CASCADE;


--
-- Name: invoice_templates invoice_templates_workspace_id_workspaces_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.invoice_templates
    ADD CONSTRAINT invoice_templates_workspace_id_workspaces_id_fk FOREIGN KEY (workspace_id) REFERENCES public.workspaces(id) ON DELETE CASCADE;


--
-- Name: invoices invoices_client_id_clients_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.invoices
    ADD CONSTRAINT invoices_client_id_clients_id_fk FOREIGN KEY (client_id) REFERENCES public.clients(id) ON DELETE CASCADE;


--
-- Name: invoices invoices_project_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.invoices
    ADD CONSTRAINT invoices_project_id_fkey FOREIGN KEY (project_id) REFERENCES public.projects(id) ON DELETE SET NULL;


--
-- Name: invoices invoices_project_id_projects_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.invoices
    ADD CONSTRAINT invoices_project_id_projects_id_fk FOREIGN KEY (project_id) REFERENCES public.projects(id) ON DELETE SET NULL;


--
-- Name: invoices invoices_workspace_id_workspaces_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.invoices
    ADD CONSTRAINT invoices_workspace_id_workspaces_id_fk FOREIGN KEY (workspace_id) REFERENCES public.workspaces(id) ON DELETE CASCADE;


--
-- Name: notifications notifications_actor_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT notifications_actor_id_fkey FOREIGN KEY (actor_id) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: notifications notifications_actor_id_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT notifications_actor_id_users_id_fk FOREIGN KEY (actor_id) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: notifications notifications_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT notifications_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: notifications notifications_user_id_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT notifications_user_id_users_id_fk FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: notifications notifications_workspace_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT notifications_workspace_id_fkey FOREIGN KEY (workspace_id) REFERENCES public.workspaces(id) ON DELETE CASCADE;


--
-- Name: notifications notifications_workspace_id_workspaces_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT notifications_workspace_id_workspaces_id_fk FOREIGN KEY (workspace_id) REFERENCES public.workspaces(id) ON DELETE CASCADE;


--
-- Name: package_orders package_orders_package_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.package_orders
    ADD CONSTRAINT package_orders_package_id_fkey FOREIGN KEY (package_id) REFERENCES public.packages(id) ON DELETE CASCADE;


--
-- Name: package_orders package_orders_package_id_packages_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.package_orders
    ADD CONSTRAINT package_orders_package_id_packages_id_fk FOREIGN KEY (package_id) REFERENCES public.packages(id) ON DELETE CASCADE;


--
-- Name: package_orders package_orders_project_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.package_orders
    ADD CONSTRAINT package_orders_project_id_fkey FOREIGN KEY (project_id) REFERENCES public.projects(id) ON DELETE CASCADE;


--
-- Name: package_orders package_orders_project_id_projects_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.package_orders
    ADD CONSTRAINT package_orders_project_id_projects_id_fk FOREIGN KEY (project_id) REFERENCES public.projects(id) ON DELETE CASCADE;


--
-- Name: package_orders package_orders_workspace_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.package_orders
    ADD CONSTRAINT package_orders_workspace_id_fkey FOREIGN KEY (workspace_id) REFERENCES public.workspaces(id) ON DELETE CASCADE;


--
-- Name: package_orders package_orders_workspace_id_workspaces_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.package_orders
    ADD CONSTRAINT package_orders_workspace_id_workspaces_id_fk FOREIGN KEY (workspace_id) REFERENCES public.workspaces(id) ON DELETE CASCADE;


--
-- Name: packages packages_project_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.packages
    ADD CONSTRAINT packages_project_id_fkey FOREIGN KEY (project_id) REFERENCES public.projects(id) ON DELETE CASCADE;


--
-- Name: packages packages_project_id_projects_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.packages
    ADD CONSTRAINT packages_project_id_projects_id_fk FOREIGN KEY (project_id) REFERENCES public.projects(id) ON DELETE CASCADE;


--
-- Name: packages packages_workspace_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.packages
    ADD CONSTRAINT packages_workspace_id_fkey FOREIGN KEY (workspace_id) REFERENCES public.workspaces(id) ON DELETE CASCADE;


--
-- Name: packages packages_workspace_id_workspaces_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.packages
    ADD CONSTRAINT packages_workspace_id_workspaces_id_fk FOREIGN KEY (workspace_id) REFERENCES public.workspaces(id) ON DELETE CASCADE;


--
-- Name: pakasir_payments pakasir_payments_workspace_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pakasir_payments
    ADD CONSTRAINT pakasir_payments_workspace_id_fkey FOREIGN KEY (workspace_id) REFERENCES public.workspaces(id) ON DELETE CASCADE;


--
-- Name: pakasir_payments pakasir_payments_workspace_id_workspaces_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pakasir_payments
    ADD CONSTRAINT pakasir_payments_workspace_id_workspaces_id_fk FOREIGN KEY (workspace_id) REFERENCES public.workspaces(id) ON DELETE CASCADE;


--
-- Name: payments payments_invoice_id_invoices_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payments
    ADD CONSTRAINT payments_invoice_id_invoices_id_fk FOREIGN KEY (invoice_id) REFERENCES public.invoices(id) ON DELETE CASCADE;


--
-- Name: personal_notes personal_notes_converted_task_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.personal_notes
    ADD CONSTRAINT personal_notes_converted_task_id_fkey FOREIGN KEY (converted_task_id) REFERENCES public.tasks(id) ON DELETE SET NULL;


--
-- Name: personal_notes personal_notes_converted_task_id_tasks_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.personal_notes
    ADD CONSTRAINT personal_notes_converted_task_id_tasks_id_fk FOREIGN KEY (converted_task_id) REFERENCES public.tasks(id) ON DELETE SET NULL;


--
-- Name: personal_notes personal_notes_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.personal_notes
    ADD CONSTRAINT personal_notes_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: personal_notes personal_notes_user_id_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.personal_notes
    ADD CONSTRAINT personal_notes_user_id_users_id_fk FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: personal_notes personal_notes_workspace_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.personal_notes
    ADD CONSTRAINT personal_notes_workspace_id_fkey FOREIGN KEY (workspace_id) REFERENCES public.workspaces(id) ON DELETE CASCADE;


--
-- Name: personal_notes personal_notes_workspace_id_workspaces_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.personal_notes
    ADD CONSTRAINT personal_notes_workspace_id_workspaces_id_fk FOREIGN KEY (workspace_id) REFERENCES public.workspaces(id) ON DELETE CASCADE;


--
-- Name: portal_access_logs portal_access_logs_client_id_clients_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.portal_access_logs
    ADD CONSTRAINT portal_access_logs_client_id_clients_id_fk FOREIGN KEY (client_id) REFERENCES public.clients(id) ON DELETE SET NULL;


--
-- Name: portal_access_logs portal_access_logs_invoice_id_invoices_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.portal_access_logs
    ADD CONSTRAINT portal_access_logs_invoice_id_invoices_id_fk FOREIGN KEY (invoice_id) REFERENCES public.invoices(id) ON DELETE SET NULL;


--
-- Name: portal_access_logs portal_access_logs_workspace_id_workspaces_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.portal_access_logs
    ADD CONSTRAINT portal_access_logs_workspace_id_workspaces_id_fk FOREIGN KEY (workspace_id) REFERENCES public.workspaces(id) ON DELETE SET NULL;


--
-- Name: portal_requests portal_requests_client_id_clients_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.portal_requests
    ADD CONSTRAINT portal_requests_client_id_clients_id_fk FOREIGN KEY (client_id) REFERENCES public.clients(id) ON DELETE CASCADE;


--
-- Name: portal_requests portal_requests_client_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.portal_requests
    ADD CONSTRAINT portal_requests_client_id_fkey FOREIGN KEY (client_id) REFERENCES public.clients(id) ON DELETE CASCADE;


--
-- Name: portal_requests portal_requests_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.portal_requests
    ADD CONSTRAINT portal_requests_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: portal_requests portal_requests_created_by_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.portal_requests
    ADD CONSTRAINT portal_requests_created_by_users_id_fk FOREIGN KEY (created_by) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: portal_requests portal_requests_project_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.portal_requests
    ADD CONSTRAINT portal_requests_project_id_fkey FOREIGN KEY (project_id) REFERENCES public.projects(id) ON DELETE CASCADE;


--
-- Name: portal_requests portal_requests_project_id_projects_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.portal_requests
    ADD CONSTRAINT portal_requests_project_id_projects_id_fk FOREIGN KEY (project_id) REFERENCES public.projects(id) ON DELETE CASCADE;


--
-- Name: portal_requests portal_requests_workspace_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.portal_requests
    ADD CONSTRAINT portal_requests_workspace_id_fkey FOREIGN KEY (workspace_id) REFERENCES public.workspaces(id) ON DELETE CASCADE;


--
-- Name: portal_requests portal_requests_workspace_id_workspaces_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.portal_requests
    ADD CONSTRAINT portal_requests_workspace_id_workspaces_id_fk FOREIGN KEY (workspace_id) REFERENCES public.workspaces(id) ON DELETE CASCADE;


--
-- Name: portal_visits portal_visits_client_id_clients_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.portal_visits
    ADD CONSTRAINT portal_visits_client_id_clients_id_fk FOREIGN KEY (client_id) REFERENCES public.clients(id) ON DELETE CASCADE;


--
-- Name: portal_visits portal_visits_client_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.portal_visits
    ADD CONSTRAINT portal_visits_client_id_fkey FOREIGN KEY (client_id) REFERENCES public.clients(id) ON DELETE CASCADE;


--
-- Name: portal_visits portal_visits_workspace_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.portal_visits
    ADD CONSTRAINT portal_visits_workspace_id_fkey FOREIGN KEY (workspace_id) REFERENCES public.workspaces(id) ON DELETE CASCADE;


--
-- Name: portal_visits portal_visits_workspace_id_workspaces_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.portal_visits
    ADD CONSTRAINT portal_visits_workspace_id_workspaces_id_fk FOREIGN KEY (workspace_id) REFERENCES public.workspaces(id) ON DELETE CASCADE;


--
-- Name: project_members project_members_project_id_projects_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.project_members
    ADD CONSTRAINT project_members_project_id_projects_id_fk FOREIGN KEY (project_id) REFERENCES public.projects(id) ON DELETE CASCADE;


--
-- Name: project_members project_members_user_id_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.project_members
    ADD CONSTRAINT project_members_user_id_users_id_fk FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: projects projects_client_id_clients_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.projects
    ADD CONSTRAINT projects_client_id_clients_id_fk FOREIGN KEY (client_id) REFERENCES public.clients(id) ON DELETE CASCADE;


--
-- Name: projects projects_created_by_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.projects
    ADD CONSTRAINT projects_created_by_users_id_fk FOREIGN KEY (created_by) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: projects projects_selected_package_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.projects
    ADD CONSTRAINT projects_selected_package_id_fkey FOREIGN KEY (selected_package_id) REFERENCES public.packages(id) ON DELETE SET NULL;


--
-- Name: projects projects_workspace_id_workspaces_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.projects
    ADD CONSTRAINT projects_workspace_id_workspaces_id_fk FOREIGN KEY (workspace_id) REFERENCES public.workspaces(id) ON DELETE CASCADE;


--
-- Name: prompt_generations prompt_generations_client_id_clients_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.prompt_generations
    ADD CONSTRAINT prompt_generations_client_id_clients_id_fk FOREIGN KEY (client_id) REFERENCES public.clients(id) ON DELETE SET NULL;


--
-- Name: prompt_generations prompt_generations_created_by_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.prompt_generations
    ADD CONSTRAINT prompt_generations_created_by_users_id_fk FOREIGN KEY (created_by) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: prompt_generations prompt_generations_project_id_projects_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.prompt_generations
    ADD CONSTRAINT prompt_generations_project_id_projects_id_fk FOREIGN KEY (project_id) REFERENCES public.projects(id) ON DELETE SET NULL;


--
-- Name: prompt_generations prompt_generations_template_id_prompt_templates_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.prompt_generations
    ADD CONSTRAINT prompt_generations_template_id_prompt_templates_id_fk FOREIGN KEY (template_id) REFERENCES public.prompt_templates(id) ON DELETE SET NULL;


--
-- Name: prompt_generations prompt_generations_workspace_id_workspaces_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.prompt_generations
    ADD CONSTRAINT prompt_generations_workspace_id_workspaces_id_fk FOREIGN KEY (workspace_id) REFERENCES public.workspaces(id) ON DELETE CASCADE;


--
-- Name: prompt_templates prompt_templates_workspace_id_workspaces_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.prompt_templates
    ADD CONSTRAINT prompt_templates_workspace_id_workspaces_id_fk FOREIGN KEY (workspace_id) REFERENCES public.workspaces(id) ON DELETE CASCADE;


--
-- Name: proposal_templates proposal_templates_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.proposal_templates
    ADD CONSTRAINT proposal_templates_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: proposal_templates proposal_templates_workspace_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.proposal_templates
    ADD CONSTRAINT proposal_templates_workspace_id_fkey FOREIGN KEY (workspace_id) REFERENCES public.workspaces(id) ON DELETE CASCADE;


--
-- Name: proposals proposals_client_id_clients_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.proposals
    ADD CONSTRAINT proposals_client_id_clients_id_fk FOREIGN KEY (client_id) REFERENCES public.clients(id) ON DELETE CASCADE;


--
-- Name: proposals proposals_created_by_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.proposals
    ADD CONSTRAINT proposals_created_by_users_id_fk FOREIGN KEY (created_by) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: proposals proposals_project_id_projects_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.proposals
    ADD CONSTRAINT proposals_project_id_projects_id_fk FOREIGN KEY (project_id) REFERENCES public.projects(id) ON DELETE SET NULL;


--
-- Name: proposals proposals_workspace_id_workspaces_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.proposals
    ADD CONSTRAINT proposals_workspace_id_workspaces_id_fk FOREIGN KEY (workspace_id) REFERENCES public.workspaces(id) ON DELETE CASCADE;


--
-- Name: questionnaire_responses questionnaire_responses_client_id_clients_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.questionnaire_responses
    ADD CONSTRAINT questionnaire_responses_client_id_clients_id_fk FOREIGN KEY (client_id) REFERENCES public.clients(id) ON DELETE SET NULL;


--
-- Name: questionnaire_responses questionnaire_responses_project_id_projects_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.questionnaire_responses
    ADD CONSTRAINT questionnaire_responses_project_id_projects_id_fk FOREIGN KEY (project_id) REFERENCES public.projects(id) ON DELETE SET NULL;


--
-- Name: questionnaire_responses questionnaire_responses_questionnaire_id_questionnaires_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.questionnaire_responses
    ADD CONSTRAINT questionnaire_responses_questionnaire_id_questionnaires_id_fk FOREIGN KEY (questionnaire_id) REFERENCES public.questionnaires(id) ON DELETE CASCADE;


--
-- Name: questionnaire_responses questionnaire_responses_workspace_id_workspaces_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.questionnaire_responses
    ADD CONSTRAINT questionnaire_responses_workspace_id_workspaces_id_fk FOREIGN KEY (workspace_id) REFERENCES public.workspaces(id) ON DELETE CASCADE;


--
-- Name: questionnaires questionnaires_created_by_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.questionnaires
    ADD CONSTRAINT questionnaires_created_by_users_id_fk FOREIGN KEY (created_by) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: questionnaires questionnaires_workspace_id_workspaces_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.questionnaires
    ADD CONSTRAINT questionnaires_workspace_id_workspaces_id_fk FOREIGN KEY (workspace_id) REFERENCES public.workspaces(id) ON DELETE CASCADE;


--
-- Name: sessions sessions_user_id_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sessions
    ADD CONSTRAINT sessions_user_id_users_id_fk FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: support_tickets support_tickets_assignee_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.support_tickets
    ADD CONSTRAINT support_tickets_assignee_id_fkey FOREIGN KEY (assignee_id) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: support_tickets support_tickets_assignee_id_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.support_tickets
    ADD CONSTRAINT support_tickets_assignee_id_users_id_fk FOREIGN KEY (assignee_id) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: support_tickets support_tickets_client_id_clients_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.support_tickets
    ADD CONSTRAINT support_tickets_client_id_clients_id_fk FOREIGN KEY (client_id) REFERENCES public.clients(id) ON DELETE SET NULL;


--
-- Name: support_tickets support_tickets_client_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.support_tickets
    ADD CONSTRAINT support_tickets_client_id_fkey FOREIGN KEY (client_id) REFERENCES public.clients(id) ON DELETE SET NULL;


--
-- Name: support_tickets support_tickets_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.support_tickets
    ADD CONSTRAINT support_tickets_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: support_tickets support_tickets_created_by_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.support_tickets
    ADD CONSTRAINT support_tickets_created_by_users_id_fk FOREIGN KEY (created_by) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: support_tickets support_tickets_project_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.support_tickets
    ADD CONSTRAINT support_tickets_project_id_fkey FOREIGN KEY (project_id) REFERENCES public.projects(id) ON DELETE SET NULL;


--
-- Name: support_tickets support_tickets_project_id_projects_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.support_tickets
    ADD CONSTRAINT support_tickets_project_id_projects_id_fk FOREIGN KEY (project_id) REFERENCES public.projects(id) ON DELETE SET NULL;


--
-- Name: support_tickets support_tickets_workspace_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.support_tickets
    ADD CONSTRAINT support_tickets_workspace_id_fkey FOREIGN KEY (workspace_id) REFERENCES public.workspaces(id) ON DELETE CASCADE;


--
-- Name: support_tickets support_tickets_workspace_id_workspaces_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.support_tickets
    ADD CONSTRAINT support_tickets_workspace_id_workspaces_id_fk FOREIGN KEY (workspace_id) REFERENCES public.workspaces(id) ON DELETE CASCADE;


--
-- Name: tasks tasks_assignee_id_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tasks
    ADD CONSTRAINT tasks_assignee_id_users_id_fk FOREIGN KEY (assignee_id) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: tasks tasks_created_by_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tasks
    ADD CONSTRAINT tasks_created_by_users_id_fk FOREIGN KEY (created_by) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: tasks tasks_project_id_projects_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tasks
    ADD CONSTRAINT tasks_project_id_projects_id_fk FOREIGN KEY (project_id) REFERENCES public.projects(id) ON DELETE CASCADE;


--
-- Name: tasks tasks_source_note_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tasks
    ADD CONSTRAINT tasks_source_note_id_fkey FOREIGN KEY (source_note_id) REFERENCES public.personal_notes(id) ON DELETE SET NULL;


--
-- Name: tasks tasks_workspace_id_workspaces_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tasks
    ADD CONSTRAINT tasks_workspace_id_workspaces_id_fk FOREIGN KEY (workspace_id) REFERENCES public.workspaces(id) ON DELETE CASCADE;


--
-- Name: time_entries time_entries_client_id_clients_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.time_entries
    ADD CONSTRAINT time_entries_client_id_clients_id_fk FOREIGN KEY (client_id) REFERENCES public.clients(id) ON DELETE CASCADE;


--
-- Name: time_entries time_entries_project_id_projects_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.time_entries
    ADD CONSTRAINT time_entries_project_id_projects_id_fk FOREIGN KEY (project_id) REFERENCES public.projects(id) ON DELETE CASCADE;


--
-- Name: time_entries time_entries_task_id_tasks_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.time_entries
    ADD CONSTRAINT time_entries_task_id_tasks_id_fk FOREIGN KEY (task_id) REFERENCES public.tasks(id) ON DELETE SET NULL;


--
-- Name: time_entries time_entries_user_id_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.time_entries
    ADD CONSTRAINT time_entries_user_id_users_id_fk FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: time_entries time_entries_workspace_id_workspaces_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.time_entries
    ADD CONSTRAINT time_entries_workspace_id_workspaces_id_fk FOREIGN KEY (workspace_id) REFERENCES public.workspaces(id) ON DELETE CASCADE;


--
-- Name: workspace_currency_rates workspace_currency_rates_workspace_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.workspace_currency_rates
    ADD CONSTRAINT workspace_currency_rates_workspace_id_fkey FOREIGN KEY (workspace_id) REFERENCES public.workspaces(id) ON DELETE CASCADE;


--
-- Name: workspace_invoice_counters workspace_invoice_counters_workspace_id_workspaces_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.workspace_invoice_counters
    ADD CONSTRAINT workspace_invoice_counters_workspace_id_workspaces_id_fk FOREIGN KEY (workspace_id) REFERENCES public.workspaces(id) ON DELETE CASCADE;


--
-- Name: workspace_members workspace_members_user_id_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.workspace_members
    ADD CONSTRAINT workspace_members_user_id_users_id_fk FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: workspace_members workspace_members_workspace_id_workspaces_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.workspace_members
    ADD CONSTRAINT workspace_members_workspace_id_workspaces_id_fk FOREIGN KEY (workspace_id) REFERENCES public.workspaces(id) ON DELETE CASCADE;


--
-- Name: workspaces workspaces_owner_id_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.workspaces
    ADD CONSTRAINT workspaces_owner_id_users_id_fk FOREIGN KEY (owner_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- PostgreSQL database dump complete
--

\unrestrict ocNCKTWWif5bVnUeQpebNRsIx43ioPm1xOFnbNWh6iPp2l6vF0tekXRLFzuXElQ