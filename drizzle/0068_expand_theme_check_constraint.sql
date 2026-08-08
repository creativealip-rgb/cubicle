-- Migration 0068: expand theme check constraint to 8 themes
-- Code defines PERSONAL_SITE_THEMES = [midnight, paper, studio, ocean, forest, sunset, rose, dark]
-- but DB constraint was still limited to 3 (midnight, paper, studio).
ALTER TABLE public.personal_sites DROP CONSTRAINT IF EXISTS personal_sites_theme_check;
ALTER TABLE public.personal_sites ADD CONSTRAINT personal_sites_theme_check
  CHECK (theme = ANY (ARRAY['midnight', 'paper', 'studio', 'ocean', 'forest', 'sunset', 'rose', 'dark']));
