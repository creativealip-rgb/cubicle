-- Cubicle / Kubikel MVP Schema
-- Target: Neon Postgres + Drizzle ORM + Better-Auth + Cloudflare R2

create extension if not exists pgcrypto;
create extension if not exists btree_gist;

-- Better-Auth tables are created by Better-Auth migrations.
-- Expected primary user table: public.users(id text primary key, ...)
-- If Better-Auth uses uuid ids in implementation, change all user_id/owner_id/actor_id fields from text to uuid consistently.

create table if not exists workspaces (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text unique not null,
  owner_id text not null references users(id) on delete cascade,
  default_currency text not null default 'USD',
  default_hourly_rate numeric(12,2),
  default_invoice_terms text,
  default_tax_rate numeric(5,2) not null default 0,
  billing_name text,
  billing_address text,
  logo_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists workspace_members (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces(id) on delete cascade,
  user_id text not null references users(id) on delete cascade,
  role text not null check (role in ('owner','member','viewer')),
  created_at timestamptz not null default now(),
  unique(workspace_id, user_id)
);

create table if not exists clients (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces(id) on delete cascade,
  name text not null,
  company_name text,
  email text,
  phone text,
  website text,
  address text,
  status text not null default 'active' check (status in ('active','inactive','archived')),
  tags text[] not null default '{}',
  internal_notes text,
  portal_enabled boolean not null default false,
  portal_token_hash text unique,
  portal_token_expires_at timestamptz,
  portal_token_revoked_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Deferred from MVP UI unless needed; kept for later migration compatibility.
create table if not exists client_contacts (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references clients(id) on delete cascade,
  name text not null,
  email text,
  phone text,
  role text,
  is_primary boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists projects (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces(id) on delete cascade,
  client_id uuid not null references clients(id) on delete cascade,
  name text not null,
  description text,
  status text not null default 'active' check (status in ('draft','active','on_hold','completed','cancelled')),
  due_date date,
  client_visible boolean not null default false,
  created_by text references users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists project_members (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  user_id text not null references users(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique(project_id, user_id)
);

create table if not exists tasks (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces(id) on delete cascade,
  project_id uuid not null references projects(id) on delete cascade,
  title text not null,
  description text,
  status text not null default 'todo' check (status in ('todo','in_progress','review','done')),
  priority text not null default 'medium' check (priority in ('low','medium','high','urgent')),
  assignee_id text references users(id) on delete set null,
  due_date date,
  client_visible boolean not null default false,
  created_by text references users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists comments (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces(id) on delete cascade,
  entity_type text not null check (entity_type in ('project','task','file','invoice')),
  entity_id uuid not null,
  body text not null,
  visibility text not null default 'internal' check (visibility in ('internal','client')),
  author_id text references users(id) on delete set null,
  author_name text,
  author_email text,
  source text not null default 'internal' check (source in ('internal','portal')),
  created_at timestamptz not null default now()
);

-- MVP folders should stay depth <= 1 in app code.
create table if not exists folders (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces(id) on delete cascade,
  client_id uuid references clients(id) on delete cascade,
  project_id uuid references projects(id) on delete cascade,
  parent_id uuid references folders(id) on delete cascade,
  name text not null,
  created_at timestamptz not null default now()
);

create table if not exists files (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces(id) on delete cascade,
  client_id uuid references clients(id) on delete cascade,
  project_id uuid references projects(id) on delete cascade,
  folder_id uuid references folders(id) on delete set null,
  name text not null,
  storage_key text not null,
  mime_type text,
  size_bytes bigint,
  visibility text not null default 'internal' check (visibility in ('internal','client')),
  uploaded_by text references users(id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists time_entries (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces(id) on delete cascade,
  client_id uuid not null references clients(id) on delete cascade,
  project_id uuid not null references projects(id) on delete cascade,
  task_id uuid references tasks(id) on delete set null,
  user_id text not null references users(id) on delete cascade,
  description text,
  start_time timestamptz,
  end_time timestamptz,
  manual_minutes integer,
  duration_minutes integer generated always as (
    case
      when start_time is not null and end_time is not null then greatest(0, floor(extract(epoch from (end_time - start_time)) / 60)::integer)
      else coalesce(manual_minutes, 0)
    end
  ) stored,
  billable boolean not null default true,
  hourly_rate numeric(12,2),
  status text not null default 'draft' check (status in ('draft','approved','invoiced')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (end_time is null or start_time is null or end_time >= start_time)
);

create table if not exists workspace_invoice_counters (
  workspace_id uuid primary key references workspaces(id) on delete cascade,
  next_number integer not null default 1,
  updated_at timestamptz not null default now()
);

create table if not exists invoices (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces(id) on delete cascade,
  client_id uuid not null references clients(id) on delete cascade,
  invoice_number text not null,
  issue_date date not null,
  due_date date,
  currency text not null default 'USD',
  subtotal numeric(12,2) not null default 0,
  discount numeric(12,2) not null default 0,
  tax numeric(12,2) not null default 0,
  total numeric(12,2) not null default 0,
  status text not null default 'draft' check (status in ('draft','sent','viewed','paid','overdue','cancelled')),
  notes text,
  terms text,
  shared_token_hash text unique,
  shared_token_expires_at timestamptz,
  shared_token_revoked_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(workspace_id, invoice_number)
);

create table if not exists invoice_items (
  id uuid primary key default gen_random_uuid(),
  invoice_id uuid not null references invoices(id) on delete cascade,
  description text not null,
  quantity numeric(12,2) not null default 1,
  unit_price numeric(12,2) not null default 0,
  amount numeric(12,2) not null default 0,
  source_type text check (source_type in ('manual','time_entry')),
  source_id uuid,
  created_at timestamptz not null default now()
);

create table if not exists payments (
  id uuid primary key default gen_random_uuid(),
  invoice_id uuid not null references invoices(id) on delete cascade,
  amount numeric(12,2) not null,
  paid_at date not null,
  method text,
  notes text,
  created_at timestamptz not null default now()
);

create table if not exists availability_rules (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces(id) on delete cascade,
  user_id text not null references users(id) on delete cascade,
  day_of_week integer not null check (day_of_week between 0 and 6),
  start_time time not null,
  end_time time not null,
  timezone text not null default 'UTC',
  created_at timestamptz not null default now(),
  check (end_time > start_time)
);

create table if not exists appointments (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces(id) on delete cascade,
  client_id uuid references clients(id) on delete set null,
  user_id text not null references users(id) on delete cascade,
  title text not null,
  notes text,
  attendee_name text,
  attendee_email text,
  start_time timestamptz not null,
  end_time timestamptz not null,
  status text not null default 'scheduled' check (status in ('scheduled','cancelled','completed')),
  created_at timestamptz not null default now(),
  check (end_time > start_time)
);

alter table appointments
  drop constraint if exists appointments_no_overlap;

alter table appointments
  add constraint appointments_no_overlap
  exclude using gist (
    workspace_id with =,
    user_id with =,
    tstzrange(start_time, end_time, '[)') with &&
  ) where (status = 'scheduled');

create table if not exists prompt_templates (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid references workspaces(id) on delete cascade,
  name text not null,
  category text not null,
  description text,
  template text not null,
  is_system boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists prompt_generations (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces(id) on delete cascade,
  client_id uuid references clients(id) on delete set null,
  project_id uuid references projects(id) on delete set null,
  template_id uuid references prompt_templates(id) on delete set null,
  input jsonb not null default '{}',
  generated_prompt text,
  generated_output text,
  model text,
  input_tokens integer not null default 0,
  output_tokens integer not null default 0,
  cost_usd numeric(10,4) not null default 0,
  created_by text references users(id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists activity_logs (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces(id) on delete cascade,
  actor_id text references users(id) on delete set null,
  action text not null,
  entity_type text not null,
  entity_id uuid,
  metadata jsonb not null default '{}',
  created_at timestamptz not null default now()
);

create table if not exists portal_access_logs (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid references workspaces(id) on delete set null,
  client_id uuid references clients(id) on delete set null,
  invoice_id uuid references invoices(id) on delete set null,
  token_type text not null check (token_type in ('client_portal','invoice_share')),
  token_hash_prefix text,
  ip_address inet,
  user_agent text,
  accessed_at timestamptz not null default now()
);

-- Useful indexes
create index if not exists idx_workspace_members_user_id on workspace_members(user_id);
create index if not exists idx_clients_workspace_id on clients(workspace_id);
create index if not exists idx_clients_portal_token_hash on clients(portal_token_hash);
create index if not exists idx_projects_workspace_id on projects(workspace_id);
create index if not exists idx_projects_client_id on projects(client_id);
create index if not exists idx_tasks_workspace_id on tasks(workspace_id);
create index if not exists idx_tasks_project_id on tasks(project_id);
create index if not exists idx_comments_workspace_entity on comments(workspace_id, entity_type, entity_id);
create index if not exists idx_files_workspace_id on files(workspace_id);
create index if not exists idx_time_entries_workspace_id on time_entries(workspace_id);
create index if not exists idx_time_entries_project_id on time_entries(project_id);
create index if not exists idx_time_entries_status on time_entries(status);
create index if not exists idx_invoices_workspace_id on invoices(workspace_id);
create index if not exists idx_invoices_client_id on invoices(client_id);
create index if not exists idx_invoices_shared_token_hash on invoices(shared_token_hash);
create index if not exists idx_activity_logs_workspace_id on activity_logs(workspace_id);
create index if not exists idx_portal_access_logs_workspace_id on portal_access_logs(workspace_id);
create index if not exists idx_prompt_generations_workspace_id on prompt_generations(workspace_id);

create unique index if not exists uniq_invoice_items_time_entry_source
  on invoice_items(source_id)
  where source_type = 'time_entry' and source_id is not null;

-- App-layer required routines:
-- 1. generateInvoiceNumber(workspaceId): transaction + select workspace_invoice_counters row for update.
-- 2. recalculateInvoice(invoiceId): update subtotal/tax/total after invoice_items mutation.
-- 3. generatePortalToken/generateInvoiceToken: store sha256 hash only, show raw token once.
-- 4. R2 object keys must include workspace_id and file id prefix for authorization checks.
