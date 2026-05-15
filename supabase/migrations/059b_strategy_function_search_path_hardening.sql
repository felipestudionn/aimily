
-- Fix Supabase advisor warning: function_search_path_mutable on strategy_touch_updated_at.
-- The SECURITY DEFINER tenant-member helper already has search_path set; this is the trigger fn.

CREATE OR REPLACE FUNCTION strategy_touch_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $fn$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END
$fn$;
