ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS phone_1 text,
  ADD COLUMN IF NOT EXISTS phone_2 text,
  ADD COLUMN IF NOT EXISTS phone_status text,
  ADD COLUMN IF NOT EXISTS phone_final text;