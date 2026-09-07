CREATE TABLE IF NOT EXISTS auth_backup_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id text NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  code_hash text NOT NULL UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now(),
  consumed_at timestamptz
);
CREATE INDEX IF NOT EXISTS auth_backup_codes_user_active_idx ON auth_backup_codes(user_id) WHERE consumed_at IS NULL;
INSERT INTO cubiqlo_migrations (id, checksum, operator_name)
VALUES ('0092_independent_backup_codes.sql', 'independent-backup-codes-v1', current_user)
ON CONFLICT (id) DO NOTHING;
