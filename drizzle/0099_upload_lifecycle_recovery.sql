ALTER TABLE upload_intents ADD COLUMN validation_attempt_id uuid;
ALTER TABLE upload_intents ADD COLUMN validation_lease_owner text;
ALTER TABLE upload_intents ADD COLUMN validation_lease_expires_at timestamptz;
CREATE INDEX upload_intents_validation_lease_idx ON upload_intents(state, validation_lease_expires_at);
