-- Dedicated personal landing-page storage.
-- Keeps legacy personal_notes rows intact for rollback/compatibility.
CREATE TABLE IF NOT EXISTS personal_sites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  user_id text NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  slug text NOT NULL,
  published boolean NOT NULL DEFAULT false,
  title text NOT NULL,
  subtitle text,
  hero text NOT NULL,
  about text,
  cta_label text,
  cta_url text,
  theme text NOT NULL DEFAULT 'midnight',
  accent text NOT NULL DEFAULT '#6647F0',
  sections jsonb NOT NULL DEFAULT '[]'::jsonb,
  links jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'personal_sites_slug_check') THEN
    ALTER TABLE personal_sites
      ADD CONSTRAINT personal_sites_slug_check
      CHECK (
        char_length(slug) BETWEEN 2 AND 48
        AND slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'
        AND slug NOT IN ('preview', 'new', 'edit', 'admin', 'api')
      );
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'personal_sites_theme_check') THEN
    ALTER TABLE personal_sites
      ADD CONSTRAINT personal_sites_theme_check
      CHECK (theme IN ('midnight', 'paper', 'studio'));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'personal_sites_accent_check') THEN
    ALTER TABLE personal_sites
      ADD CONSTRAINT personal_sites_accent_check
      CHECK (accent ~ '^#[0-9A-Fa-f]{6}$');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'personal_sites_sections_array_check') THEN
    ALTER TABLE personal_sites
      ADD CONSTRAINT personal_sites_sections_array_check
      CHECK (jsonb_typeof(sections) = 'array');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'personal_sites_links_array_check') THEN
    ALTER TABLE personal_sites
      ADD CONSTRAINT personal_sites_links_array_check
      CHECK (jsonb_typeof(links) = 'array');
  END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS personal_sites_owner_workspace_uidx
  ON personal_sites (workspace_id, user_id);
CREATE UNIQUE INDEX IF NOT EXISTS personal_sites_slug_uidx
  ON personal_sites (slug);
CREATE INDEX IF NOT EXISTS personal_sites_public_slug_idx
  ON personal_sites (slug, published);

-- Migrate the newest valid [site] note per workspace/user.
-- Malformed JSON is skipped rather than aborting the migration.
WITH parsed_legacy AS MATERIALIZED (
  SELECT
    pn.workspace_id,
    pn.user_id,
    pn.created_at,
    pn.updated_at,
    CASE
      WHEN pn.body ~ '^\s*\{' AND pg_input_is_valid(pn.body, 'jsonb') THEN pn.body::jsonb
      ELSE NULL
    END AS data
  FROM personal_notes pn
  WHERE pn.title = '[site]'
    AND pn.body IS NOT NULL
), latest_legacy AS (
  SELECT DISTINCT ON (workspace_id, user_id)
    workspace_id,
    user_id,
    created_at,
    updated_at,
    data
  FROM parsed_legacy
  WHERE data IS NOT NULL
  ORDER BY workspace_id, user_id, updated_at DESC
), normalized AS (
  SELECT
    latest_legacy.*,
    left(
      trim(both '-' from lower(regexp_replace(trim(coalesce(data->>'slug', 'my-studio')), '[^a-zA-Z0-9]+', '-', 'g'))),
      48
    ) AS clean_slug
  FROM latest_legacy
), reserved_normalized AS (
  SELECT
    normalized.*,
    CASE
      WHEN clean_slug IN ('preview','new','edit','admin','api') THEN left(clean_slug, 43) || '-site'
      ELSE clean_slug
    END AS base_slug
  FROM normalized
), ranked AS (
  SELECT
    reserved_normalized.*,
    row_number() OVER (PARTITION BY base_slug ORDER BY updated_at DESC, user_id) AS slug_rank
  FROM reserved_normalized
), converted AS (
  SELECT
    workspace_id,
    user_id,
    CASE
      WHEN char_length(base_slug) < 2 THEN 'site-' || left(regexp_replace(user_id, '[^a-zA-Z0-9]+', '', 'g'), 12) || '-' || slug_rank
      WHEN slug_rank = 1 THEN base_slug
      ELSE left(base_slug, 47 - char_length(slug_rank::text)) || '-' || slug_rank
    END AS slug,
    CASE
      WHEN lower(coalesce(data->>'published', 'false')) IN ('true', 'false')
        THEN (data->>'published')::boolean
      ELSE false
    END AS published,
    left(coalesce(nullif(trim(data->>'title'), ''), 'Nama atau studio kamu'), 100) AS title,
    left(coalesce(data->>'subtitle', ''), 160) AS subtitle,
    left(coalesce(nullif(trim(data->>'hero'), ''), 'Jelaskan hasil utama yang kamu bantu capai untuk klien.'), 500) AS hero,
    left(coalesce(data->>'about', ''), 2000) AS about,
    left(coalesce(data->>'ctaLabel', ''), 60) AS cta_label,
    CASE
      WHEN coalesce(data->>'ctaUrl', '') ~* '^(https?://|mailto:|tel:|/(booking|intake|site)/)' AND coalesce(data->>'ctaUrl', '') !~* '^/app(/|$)'
        THEN data->>'ctaUrl'
      ELSE ''
    END AS cta_url,
    CASE WHEN data->>'theme' IN ('midnight','paper','studio') THEN data->>'theme' ELSE 'midnight' END AS theme,
    CASE WHEN coalesce(data->>'accent', '') ~ '^#[0-9A-Fa-f]{6}$' THEN data->>'accent' ELSE '#6647F0' END AS accent,
    CASE
      WHEN jsonb_typeof(data->'sections') = 'array' THEN (
        SELECT coalesce(jsonb_agg(
          CASE coalesce(section->>'type', 'custom')
            WHEN 'services' THEN jsonb_build_object(
              'id', 'legacy-' || ordinality,
              'type', 'services',
              'heading', left(coalesce(nullif(trim(section->>'heading'), ''), 'Layanan'), 80),
              'items', coalesce((
                SELECT jsonb_agg(jsonb_build_object(
                  'id', 'legacy-' || ordinality || '-service-' || line_no,
                  'title', left(trim(line), 100),
                  'description', ''
                ) ORDER BY line_no)
                FROM unnest(string_to_array(coalesce(section->>'content', ''), E'\n')) WITH ORDINALITY AS lines(line, line_no)
                WHERE trim(line) <> ''
                  AND line_no <= 12
              ), '[]'::jsonb)
            )
            WHEN 'process' THEN jsonb_build_object(
              'id', 'legacy-' || ordinality,
              'type', 'process',
              'heading', left(coalesce(nullif(trim(section->>'heading'), ''), 'Proses'), 80),
              'steps', coalesce((
                SELECT jsonb_agg(jsonb_build_object(
                  'id', 'legacy-' || ordinality || '-step-' || line_no,
                  'title', left(regexp_replace(trim(line), '^\d+[.)]\s*', ''), 100),
                  'description', ''
                ) ORDER BY line_no)
                FROM unnest(string_to_array(coalesce(section->>'content', ''), E'\n')) WITH ORDINALITY AS lines(line, line_no)
                WHERE trim(line) <> ''
                  AND line_no <= 12
              ), '[]'::jsonb)
            )
            WHEN 'pricing' THEN jsonb_build_object(
              'id', 'legacy-' || ordinality,
              'type', 'pricing',
              'heading', left(coalesce(nullif(trim(section->>'heading'), ''), 'Harga'), 80),
              'offers', coalesce((
                SELECT jsonb_agg(jsonb_build_object(
                  'id', 'legacy-' || ordinality || '-offer-' || line_no,
                  'name', left(trim(split_part(line, ':', 1)), 100),
                  'price', left(trim(substring(line from position(':' in line) + 1)), 80),
                  'description', ''
                ) ORDER BY line_no)
                FROM unnest(string_to_array(coalesce(section->>'content', ''), E'\n')) WITH ORDINALITY AS lines(line, line_no)
                WHERE trim(line) <> ''
                  AND line_no <= 8
              ), '[]'::jsonb)
            )
            ELSE jsonb_build_object(
              'id', 'legacy-' || ordinality,
              'type', 'custom',
              'heading', left(coalesce(nullif(trim(section->>'heading'), ''), 'Section'), 80),
              'content', left(coalesce(section->>'content', ''), 4000)
            )
          END
          ORDER BY ordinality
        ), '[]'::jsonb)
        FROM jsonb_array_elements(data->'sections') WITH ORDINALITY AS s(section, ordinality)
        WHERE jsonb_typeof(section) = 'object'
          AND ordinality <= 12
      )
      WHEN jsonb_typeof(data->'sections') = 'string' THEN (
        SELECT coalesce(jsonb_agg(jsonb_build_object(
          'id', 'legacy-' || line_no,
          'type', 'custom',
          'heading', left(coalesce(nullif(trim(split_part(line, '|', 1)), ''), 'Section'), 80),
          'content', left(trim(substring(line from position('|' in line) + 1)), 4000)
        ) ORDER BY line_no), '[]'::jsonb)
        FROM unnest(string_to_array(data->>'sections', E'\n')) WITH ORDINALITY AS lines(line, line_no)
        WHERE trim(line) <> ''
          AND line_no <= 12
      )
      ELSE '[]'::jsonb
    END AS sections,
    CASE
      WHEN jsonb_typeof(data->'links') = 'array' THEN (
        SELECT coalesce(jsonb_agg(jsonb_build_object(
          'id', 'legacy-link-' || ordinality,
          'label', left(trim(link->>'label'), 80),
          'url', trim(link->>'url')
        ) ORDER BY ordinality), '[]'::jsonb)
        FROM jsonb_array_elements(data->'links') WITH ORDINALITY AS l(link, ordinality)
        WHERE jsonb_typeof(link) = 'object'
          AND ordinality <= 8
          AND trim(coalesce(link->>'label', '')) <> ''
          AND trim(coalesce(link->>'url', '')) ~* '^(https?://|mailto:|tel:|/(booking|intake|site)/)'
          AND trim(coalesce(link->>'url', '')) !~* '^/app(/|$)'
      )
      WHEN jsonb_typeof(data->'links') = 'string' THEN (
        SELECT coalesce(jsonb_agg(jsonb_build_object(
          'id', 'legacy-link-' || line_no,
          'label', left(trim(split_part(line, '=', 1)), 80),
          'url', trim(substring(line from position('=' in line) + 1))
        ) ORDER BY line_no), '[]'::jsonb)
        FROM unnest(string_to_array(data->>'links', E'\n')) WITH ORDINALITY AS lines(line, line_no)
        WHERE trim(line) <> ''
          AND line_no <= 8
          AND trim(split_part(line, '=', 1)) <> ''
          AND trim(substring(line from position('=' in line) + 1)) ~* '^(https?://|mailto:|tel:|/(booking|intake|site)/)'
          AND trim(substring(line from position('=' in line) + 1)) !~* '^/app(/|$)'
      )
      ELSE '[]'::jsonb
    END AS links,
    created_at,
    updated_at
  FROM ranked
)
INSERT INTO personal_sites (
  workspace_id, user_id, slug, published, title, subtitle, hero, about,
  cta_label, cta_url, theme, accent, sections, links, created_at, updated_at
)
SELECT
  workspace_id, user_id, slug, published, title, subtitle, hero, about,
  cta_label, cta_url, theme, accent, sections, links, created_at, updated_at
FROM converted
ON CONFLICT (workspace_id, user_id) DO NOTHING;
