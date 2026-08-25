ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "preferred_language" text;

DO $$ BEGIN
  ALTER TABLE "users" ADD CONSTRAINT "users_preferred_language_check" CHECK ("preferred_language" IS NULL OR "preferred_language" IN ('id', 'en'));
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
