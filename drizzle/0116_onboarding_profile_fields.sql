ALTER TABLE "users" 
ADD COLUMN IF NOT EXISTS "birth_date" date,
ADD COLUMN IF NOT EXISTS "country" text,
ADD COLUMN IF NOT EXISTS "city" text;

ALTER TABLE "workspaces" 
ADD COLUMN IF NOT EXISTS "industry" text,
ADD COLUMN IF NOT EXISTS "team_size" text;
