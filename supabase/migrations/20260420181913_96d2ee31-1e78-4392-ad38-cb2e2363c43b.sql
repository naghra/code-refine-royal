ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS lead_score integer,
  ADD COLUMN IF NOT EXISTS lead_quality text;

CREATE INDEX IF NOT EXISTS idx_orders_lead_quality ON public.orders(lead_quality);