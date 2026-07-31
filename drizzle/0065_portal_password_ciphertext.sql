ALTER TABLE "clients" ADD COLUMN IF NOT EXISTS "portal_password_ciphertext" text;
ALTER TABLE "clients" ADD COLUMN IF NOT EXISTS "portal_password_nonce" text;
ALTER TABLE "clients" ADD COLUMN IF NOT EXISTS "portal_password_encryption_version" integer;
ALTER TABLE "clients" ADD COLUMN IF NOT EXISTS "portal_password_encrypted_at" timestamptz;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'clients_portal_password_ciphertext_complete_check'
      AND conrelid = 'clients'::regclass
  ) THEN
    ALTER TABLE "clients" ADD CONSTRAINT "clients_portal_password_ciphertext_complete_check" CHECK (
      ("portal_password_ciphertext" IS NULL AND "portal_password_nonce" IS NULL AND "portal_password_encryption_version" IS NULL AND "portal_password_encrypted_at" IS NULL)
      OR
      ("portal_password_hash" IS NOT NULL AND "portal_password_ciphertext" IS NOT NULL AND "portal_password_nonce" IS NOT NULL AND "portal_password_encryption_version" IS NOT NULL AND "portal_password_encrypted_at" IS NOT NULL)
    );
  END IF;
END $$;
