ALTER TABLE "personal_notes" ALTER COLUMN "workspace_id" DROP NOT NULL;
ALTER TABLE "personal_notes" DROP CONSTRAINT IF EXISTS "personal_notes_workspace_id_workspaces_id_fk";
ALTER TABLE "personal_notes" ADD CONSTRAINT "personal_notes_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS "personal_notes_user_updated_idx" ON "personal_notes" ("user_id", "updated_at" DESC);