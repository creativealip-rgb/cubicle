-- Migration 0075: autosave revision guard for proposal/contract blocks
-- Additive and idempotent. Existing rows default to revision 1, so a client
-- that has never loaded a revision must pass 1 (or omit it, which the server
-- treats as 1) to keep saving. Every successful block save atomically bumps
-- the revision, and a save carrying an older revision is rejected as stale.

ALTER TABLE "proposals" ADD COLUMN IF NOT EXISTS "content_revision" integer NOT NULL DEFAULT 1;
ALTER TABLE "contracts" ADD COLUMN IF NOT EXISTS "content_revision" integer NOT NULL DEFAULT 1;
