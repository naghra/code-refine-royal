-- Add requires_confirmation flag to products
ALTER TABLE public.products
ADD COLUMN IF NOT EXISTS requires_confirmation boolean NOT NULL DEFAULT false;

-- Add confirmation tracking to orders
ALTER TABLE public.orders
ADD COLUMN IF NOT EXISTS confirmed boolean NOT NULL DEFAULT true,
ADD COLUMN IF NOT EXISTS confirmed_at timestamp with time zone;

-- Existing orders are considered confirmed by default (backwards compatibility)
UPDATE public.orders SET confirmed = true WHERE confirmed IS NULL;