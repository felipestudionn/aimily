-- Supplier + factory network, user-scoped so designers build a
-- single address book reused across every collection.

CREATE TABLE IF NOT EXISTS public.suppliers (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name            text NOT NULL,
  supplier_type   text,
  region          text,
  moq             integer,
  lead_time_days  integer,
  cost_note       text,
  certifications  text[] DEFAULT '{}'::text[],
  contact_email   text,
  contact_phone   text,
  contact_name    text,
  website         text,
  notes           text,
  created_at      timestamptz DEFAULT now(),
  updated_at      timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS suppliers_user_idx ON public.suppliers (user_id, name);

CREATE TABLE IF NOT EXISTS public.factories (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name            text NOT NULL,
  region          text,
  specialties     text[] DEFAULT '{}'::text[],
  capacity_note   text,
  moq             integer,
  lead_time_days  integer,
  cost_note       text,
  past_collabs    text,
  contact_email   text,
  contact_phone   text,
  contact_name    text,
  website         text,
  notes           text,
  created_at      timestamptz DEFAULT now(),
  updated_at      timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS factories_user_idx ON public.factories (user_id, name);

ALTER TABLE public.suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.factories ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS suppliers_owner ON public.suppliers;
CREATE POLICY suppliers_owner ON public.suppliers FOR ALL USING (user_id = auth.uid());

DROP POLICY IF EXISTS factories_owner ON public.factories;
CREATE POLICY factories_owner ON public.factories FOR ALL USING (user_id = auth.uid());

CREATE OR REPLACE FUNCTION public.touch_suppliers_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;
DROP TRIGGER IF EXISTS suppliers_touch ON public.suppliers;
CREATE TRIGGER suppliers_touch BEFORE UPDATE ON public.suppliers
  FOR EACH ROW EXECUTE FUNCTION public.touch_suppliers_updated_at();

CREATE OR REPLACE FUNCTION public.touch_factories_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;
DROP TRIGGER IF EXISTS factories_touch ON public.factories;
CREATE TRIGGER factories_touch BEFORE UPDATE ON public.factories
  FOR EACH ROW EXECUTE FUNCTION public.touch_factories_updated_at();
