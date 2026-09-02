CREATE TABLE IF NOT EXISTS personal_receipt_cleanup_queue (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id text NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  storage_key text NOT NULL,
  attempts integer NOT NULL DEFAULT 0,
  last_error text,
  next_attempt_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT personal_receipt_cleanup_queue_key_uq UNIQUE (storage_key),
  CONSTRAINT personal_receipt_cleanup_queue_prefix_ck CHECK (storage_key LIKE ('personal/'||user_id||'/receipts/%')),
  CONSTRAINT personal_receipt_cleanup_queue_attempts_ck CHECK (attempts >= 0)
);
CREATE INDEX IF NOT EXISTS personal_receipt_cleanup_queue_due_idx ON personal_receipt_cleanup_queue(next_attempt_at, id);
INSERT INTO cubiqlo_migrations (id,checksum,operator_name)
VALUES ('0089_personal_receipt_cleanup_queue.sql','personal-receipt-cleanup-queue-v1',current_user)
ON CONFLICT (id) DO NOTHING;
