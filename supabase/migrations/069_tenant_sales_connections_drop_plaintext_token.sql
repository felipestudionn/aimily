-- 069_tenant_sales_connections_drop_plaintext_token
--
-- Felipe 2026-05-19/20 · drop legacy plaintext access_token column.
-- Tokens now live exclusively in Supabase Vault, accessed via
-- tenant_sales_connections_get_token / _store_token (migration 067).
-- Code paths in src/lib/strategy/sync-sales-connection.ts and the
-- sales-connections POST handler were updated in the same commit to
-- read/write only through the vault helpers — the plaintext fallback
-- was removed before this migration.

ALTER TABLE public.tenant_sales_connections
  DROP COLUMN IF EXISTS access_token;
