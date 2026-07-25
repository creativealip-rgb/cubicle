-- Add leading-column indexes for every remaining foreign key.
-- Tables are currently small (largest 1.5 MiB), so transactional CREATE INDEX is
-- safer than CREATE INDEX CONCURRENTLY and remains atomic with migration ledger.
SET lock_timeout = '5s';
SET statement_timeout = '60s';

CREATE INDEX IF NOT EXISTS "idx_notifications_user_id"
  ON public."notifications" ("user_id");
CREATE INDEX IF NOT EXISTS "idx_personal_notes_user_id"
  ON public."personal_notes" ("user_id");
CREATE INDEX IF NOT EXISTS "idx_ai_conversations_user_id"
  ON public."ai_conversations" ("user_id");
CREATE INDEX IF NOT EXISTS "idx_client_google_calendar_connections_connected_by_user_id"
  ON public."client_google_calendar_connections" ("connected_by_user_id");
CREATE INDEX IF NOT EXISTS "idx_project_members_user_id"
  ON public."project_members" ("user_id");
CREATE INDEX IF NOT EXISTS "idx_proposal_templates_created_by"
  ON public."proposal_templates" ("created_by");
CREATE INDEX IF NOT EXISTS "idx_workspace_members_user_id"
  ON public."workspace_members" ("user_id");

DO $$
BEGIN
  IF EXISTS (
    WITH fk AS (
      SELECT c.conrelid, c.conkey
      FROM pg_constraint c
      WHERE c.contype = 'f'
        AND c.connamespace = 'public'::regnamespace
    )
    SELECT 1
    FROM fk
    WHERE NOT EXISTS (
      SELECT 1
      FROM pg_index i
      WHERE i.indrelid = fk.conrelid
        AND i.indisvalid
        AND i.indisready
        AND i.indpred IS NULL
        AND (i.indkey::smallint[])[0:cardinality(fk.conkey)-1] = fk.conkey
    )
  ) THEN
    RAISE EXCEPTION 'Foreign keys without valid leading-column indexes remain';
  END IF;
END $$;
