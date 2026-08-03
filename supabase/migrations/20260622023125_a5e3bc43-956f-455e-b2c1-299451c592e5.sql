
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS nationality text,
  ADD COLUMN IF NOT EXISTS monthly_obligations numeric;
