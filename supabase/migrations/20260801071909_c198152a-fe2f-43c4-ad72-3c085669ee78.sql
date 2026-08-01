ALTER TABLE public.trades
  ADD COLUMN IF NOT EXISTS stop_loss numeric,
  ADD COLUMN IF NOT EXISTS take_profit numeric;