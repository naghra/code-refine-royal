-- Change default of confirmed to false
ALTER TABLE public.orders ALTER COLUMN confirmed SET DEFAULT false;

-- Backfill: orders that were never actually confirmed should be false
UPDATE public.orders
SET confirmed = false
WHERE confirmed_at IS NULL
  AND confirmation_response IS NULL;