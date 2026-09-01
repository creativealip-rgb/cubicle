ALTER TABLE personal_goals ADD COLUMN IF NOT EXISTS progress_updated_at timestamptz;
UPDATE personal_goals SET progress_updated_at = updated_at WHERE progress_updated_at IS NULL;
ALTER TABLE personal_goals ALTER COLUMN progress_updated_at SET DEFAULT now();
ALTER TABLE personal_goals ALTER COLUMN progress_updated_at SET NOT NULL;

INSERT INTO cubiqlo_migrations (id,checksum,operator_name)
VALUES ('0088_productivity_retention_completion.sql','productivity-retention-completion-v1',current_user)
ON CONFLICT (id) DO NOTHING;
