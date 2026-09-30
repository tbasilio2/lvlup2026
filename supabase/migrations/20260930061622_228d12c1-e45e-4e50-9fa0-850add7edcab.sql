ALTER TABLE public.subscriptions
  ADD COLUMN IF NOT EXISTS provider text,
  ADD COLUMN IF NOT EXISTS license_key text,
  ADD COLUMN IF NOT EXISTS provider_subscription_id text,
  ADD COLUMN IF NOT EXISTS provider_email text;

CREATE UNIQUE INDEX IF NOT EXISTS subscriptions_license_key_unique
  ON public.subscriptions (license_key) WHERE license_key IS NOT NULL;

GRANT SELECT ON public.subscriptions TO authenticated;
GRANT ALL ON public.subscriptions TO service_role;