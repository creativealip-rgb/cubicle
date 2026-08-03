-- Migration 0067: Add SEO metadata column to personal_sites for share/SEO Phase 7
ALTER TABLE public.personal_sites ADD COLUMN IF NOT EXISTS seo jsonb;
