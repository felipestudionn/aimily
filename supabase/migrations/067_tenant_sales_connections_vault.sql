-- =============================================================================
-- Migration 067 · Vault encryption for tenant_sales_connections access_token
-- =============================================================================
-- Felipe 2026-05-19 noche · security hardening pendiente desde m066.
--
-- Plaintext access_token was a TODO from the start (m066 has a COMMENT
-- flagging it). This migration adds a vault-backed alternative + SECURITY
-- DEFINER helpers that wrap vault.create_secret / decrypted_secrets so
-- application code never touches the vault tables directly.
--
-- Existing rows are NOT auto-migrated (run tenant_sales_connections_store_token
-- per row from a script). The plaintext access_token column is preserved for
-- backward compat during transition; a follow-up migration will drop it once
-- all rows have access_token_secret_id wired.

ALTER TABLE tenant_sales_connections
  ADD COLUMN access_token_secret_id uuid;

COMMENT ON COLUMN tenant_sales_connections.access_token_secret_id IS
  'UUID of the secret stored in vault.secrets that encrypts access_token. When set, sync helper reads via tenant_sales_connections_get_token(). Plaintext column preserved during transition.';

CREATE INDEX tenant_sales_connections_secret_idx
  ON tenant_sales_connections(access_token_secret_id)
  WHERE access_token_secret_id IS NOT NULL;

CREATE OR REPLACE FUNCTION tenant_sales_connections_store_token(
  p_connection_id uuid,
  p_token text
) RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = vault, public, pg_catalog
AS $$
DECLARE
  v_secret_id uuid;
  v_name text;
BEGIN
  v_name := 'tenant_sales_token_' || p_connection_id::text;
  SELECT id INTO v_secret_id FROM vault.secrets WHERE name = v_name LIMIT 1;
  IF v_secret_id IS NULL THEN
    v_secret_id := vault.create_secret(p_token, v_name, 'Shopify/Stripe API token for tenant_sales_connection');
  ELSE
    PERFORM vault.update_secret(v_secret_id, p_token, v_name, 'Shopify/Stripe API token for tenant_sales_connection');
  END IF;
  UPDATE tenant_sales_connections
    SET access_token_secret_id = v_secret_id,
        access_token = ''
    WHERE id = p_connection_id;
  RETURN v_secret_id;
END;
$$;

GRANT EXECUTE ON FUNCTION tenant_sales_connections_store_token(uuid, text) TO service_role;

CREATE OR REPLACE FUNCTION tenant_sales_connections_get_token(
  p_connection_id uuid
) RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = vault, public, pg_catalog
AS $$
DECLARE
  v_secret_id uuid;
  v_token text;
BEGIN
  SELECT access_token_secret_id INTO v_secret_id
    FROM tenant_sales_connections
    WHERE id = p_connection_id;
  IF v_secret_id IS NULL THEN
    RETURN NULL;
  END IF;
  SELECT decrypted_secret INTO v_token
    FROM vault.decrypted_secrets
    WHERE id = v_secret_id;
  RETURN v_token;
END;
$$;

GRANT EXECUTE ON FUNCTION tenant_sales_connections_get_token(uuid) TO service_role;
