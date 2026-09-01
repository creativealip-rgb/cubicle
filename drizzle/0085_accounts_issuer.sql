ALTER TABLE "accounts" ADD COLUMN IF NOT EXISTS "issuer" text;

INSERT INTO public."cubiqlo_migrations" (id, checksum, applied_at, execution_ms)
SELECT '0085_accounts_issuer.sql', 'manual-accounts-issuer', now(), 0
WHERE NOT EXISTS (
  SELECT 1 FROM public."cubiqlo_migrations" WHERE id = '0085_accounts_issuer.sql'
);

UPDATE public."cubiqlo_migrations"
SET checksum = 'manual-accounts-issuer', applied_at = now(), execution_ms = 0
WHERE id = '0085_accounts_issuer.sql';
