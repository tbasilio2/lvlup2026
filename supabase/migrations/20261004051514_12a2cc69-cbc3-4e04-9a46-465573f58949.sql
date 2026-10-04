CREATE TABLE public.broker_accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  platform text NOT NULL CHECK (platform IN ('tradelocker','matchtrader','ctrader')),
  label text NOT NULL,
  server text,
  base_url text,
  email text,
  external_account_id text,
  state text DEFAULT 'CONNECTED',
  balance numeric,
  equity numeric,
  currency text,
  last_synced_at timestamptz,
  last_error text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, DELETE ON public.broker_accounts TO authenticated;
GRANT ALL ON public.broker_accounts TO service_role;
ALTER TABLE public.broker_accounts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users view own broker accounts" ON public.broker_accounts FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users delete own broker accounts" ON public.broker_accounts FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Credentials: only reachable by backend functions
CREATE TABLE public.broker_credentials (
  broker_account_id uuid PRIMARY KEY REFERENCES public.broker_accounts(id) ON DELETE CASCADE,
  secret jsonb NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.broker_credentials TO service_role;
ALTER TABLE public.broker_credentials ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.trades ADD COLUMN IF NOT EXISTS broker_account_id uuid REFERENCES public.broker_accounts(id) ON DELETE SET NULL;