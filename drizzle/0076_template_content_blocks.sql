-- Migration 0076: unified template content blocks
-- Additive and idempotent. Gives contract and proposal templates the same
-- JSONB document-block storage that contracts/proposals already use, so the
-- block editor can be reused in Template Center. Legacy body fields are kept
-- intact; existing rows default to an empty block list.

ALTER TABLE "contract_templates" ADD COLUMN IF NOT EXISTS "content_blocks" jsonb NOT NULL DEFAULT '[]'::jsonb;
ALTER TABLE "proposal_templates" ADD COLUMN IF NOT EXISTS "content_blocks" jsonb NOT NULL DEFAULT '[]'::jsonb;
