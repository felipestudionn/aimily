-- 072_fix_vault_store_token_after_column_drop
--
-- Felipe 2026-05-20 · regression fix from migration 069. We dropped the
-- plaintext `access_token` column but the SECURITY DEFINER helper
-- `tenant_sales_connections_store_token` still tried to `SET access_token = ''`,
-- so every call failed with `column "access_token" of relation
-- "tenant_sales_connections" does not exist` AFTER 069 went live. Caught
-- in production end-to-end OAuth install (connection row created, secret
-- never persisted in Vault).

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
    SET access_token_secret_id = v_secret_id
    WHERE id = p_connection_id;
  RETURN v_secret_id;
END;
$$;
