-- Additive, replay-safe audit integrity foundation.
ALTER TABLE "admin_audit_logs" ADD COLUMN IF NOT EXISTS "actor_name_snapshot" text;
ALTER TABLE "admin_audit_logs" ADD COLUMN IF NOT EXISTS "actor_email_snapshot" text;
ALTER TABLE "admin_audit_logs" ADD COLUMN IF NOT EXISTS "target_label_snapshot" text;
ALTER TABLE "admin_audit_logs" ADD COLUMN IF NOT EXISTS "user_agent" text;
ALTER TABLE "admin_audit_logs" ADD COLUMN IF NOT EXISTS "request_id" text;

UPDATE "admin_audit_logs" a SET
  "actor_name_snapshot" = COALESCE(a."actor_name_snapshot", u."name"),
  "actor_email_snapshot" = COALESCE(a."actor_email_snapshot", u."email")
FROM "users" u WHERE u."id" = a."admin_user_id"
  AND (a."actor_name_snapshot" IS NULL OR a."actor_email_snapshot" IS NULL);

CREATE OR REPLACE FUNCTION prevent_admin_audit_mutation() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'admin_audit_logs is append-only';
END; $$;
DROP TRIGGER IF EXISTS admin_audit_logs_append_only ON "admin_audit_logs";
CREATE TRIGGER admin_audit_logs_append_only
  BEFORE UPDATE OR DELETE ON "admin_audit_logs"
  FOR EACH ROW EXECUTE FUNCTION prevent_admin_audit_mutation();

CREATE INDEX IF NOT EXISTS admin_audit_logs_request_id_idx ON "admin_audit_logs" ("request_id");
CREATE INDEX IF NOT EXISTS admin_audit_logs_action_created_idx ON "admin_audit_logs" ("action", "created_at" DESC);
