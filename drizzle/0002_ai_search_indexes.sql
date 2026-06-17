-- Sprint F.3: Trigram indexes for AI semantic search
-- Enables the `search_workspace` tool in the AI assistant.
-- Idempotent: safe to re-run.

CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE INDEX IF NOT EXISTS clients_name_trgm
  ON clients USING gin (name gin_trgm_ops);

CREATE INDEX IF NOT EXISTS projects_name_trgm
  ON projects USING gin (name gin_trgm_ops);

CREATE INDEX IF NOT EXISTS tasks_title_trgm
  ON tasks USING gin (title gin_trgm_ops);

CREATE INDEX IF NOT EXISTS invoices_number_trgm
  ON invoices USING gin (invoice_number gin_trgm_ops);
