
CREATE TABLE public.mt5_accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  label text NOT NULL,
  broker_server text NOT NULL,
  login text NOT NULL,
  platform text NOT NULL DEFAULT 'mt5',
  metaapi_account_id text,
  state text NOT NULL DEFAULT 'provisioning',
  last_synced_at timestamptz,
  last_error text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.mt5_accounts TO authenticated;
GRANT ALL ON public.mt5_accounts TO service_role;

ALTER TABLE public.mt5_accounts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage their own mt5 accounts"
  ON public.mt5_accounts FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_mt5_accounts_updated_at
  BEFORE UPDATE ON public.mt5_accounts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.trades ADD COLUMN IF NOT EXISTS metaapi_deal_id text;
ALTER TABLE public.trades ADD COLUMN IF NOT EXISTS mt5_account_id uuid REFERENCES public.mt5_accounts(id) ON DELETE SET NULL;

CREATE UNIQUE INDEX IF NOT EXISTS trades_user_metaapi_deal_id_key
  ON public.trades (user_id, metaapi_deal_id)
  WHERE metaapi_deal_id IS NOT NULL;
