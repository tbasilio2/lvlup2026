ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS onboarding_completed_at timestamptz, ADD COLUMN IF NOT EXISTS trading_preferences jsonb NOT NULL DEFAULT '{}'::jsonb;
ALTER TABLE public.subscriptions ADD COLUMN IF NOT EXISTS plan_version text NOT NULL DEFAULT 'legacy';
COMMENT ON COLUMN public.subscriptions.plan_version IS 'legacy preserves historic paid entitlements; current uses public Free/Pro/Elite packaging';
UPDATE public.profiles p SET onboarding_completed_at = now() WHERE p.onboarding_completed_at IS NULL AND (EXISTS (SELECT 1 FROM public.trades t WHERE t.user_id = p.id) OR EXISTS (SELECT 1 FROM public.habits h WHERE h.user_id = p.id) OR EXISTS (SELECT 1 FROM public.goals g WHERE g.user_id = p.id) OR EXISTS (SELECT 1 FROM public.journal_entries j WHERE j.user_id = p.id) OR EXISTS (SELECT 1 FROM public.mt5_accounts m WHERE m.user_id = p.id) OR EXISTS (SELECT 1 FROM public.broker_accounts b WHERE b.user_id = p.id));
CREATE OR REPLACE FUNCTION public.trader_has_feature(_user_id uuid, _feature text) RETURNS boolean LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE s public.subscriptions%ROWTYPE;
BEGIN
  IF auth.role() IS DISTINCT FROM 'service_role' AND auth.uid() IS DISTINCT FROM _user_id THEN RETURN false; END IF;
  IF _feature IN ('goals', 'trading', 'basic_analytics') THEN RETURN true; END IF;
  SELECT * INTO s FROM public.subscriptions WHERE user_id = _user_id;
  IF NOT FOUND THEN RETURN false; END IF;
  IF s.trial_ends_at > now() AND NOT (s.status = 'active' AND s.tier <> 'free') THEN RETURN true; END IF;
  IF s.status <> 'active' OR (s.current_period_end IS NOT NULL AND s.current_period_end <= now()) THEN RETURN false; END IF;
  IF s.tier IN ('elite', 'lifetime') OR (s.tier = 'pro' AND s.plan_version = 'legacy') THEN RETURN true; END IF;
  IF s.tier IN ('pro', 'elite') AND _feature IN ('journal', 'unlimited_trades', 'mt5_sync', 'analytics', 'ai_review') THEN RETURN true; END IF;
  IF s.tier = 'journal' AND _feature IN ('journal', 'reflection_ai') THEN RETURN true; END IF;
  RETURN false;
END;
$$;
REVOKE ALL ON FUNCTION public.trader_has_feature(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.trader_has_feature(uuid, text) TO authenticated, service_role;
CREATE OR REPLACE FUNCTION public.enforce_free_trade_limit() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF auth.role() = 'service_role' OR auth.uid() IS NULL THEN RETURN NEW; END IF;
  IF NEW.user_id IS DISTINCT FROM auth.uid() THEN RAISE EXCEPTION 'Trade owner must match signed-in user'; END IF;
  IF NEW.broker_account_id IS NOT NULL OR NEW.mt5_account_id IS NOT NULL OR NEW.metaapi_deal_id IS NOT NULL THEN RAISE EXCEPTION 'Broker trade identifiers are reserved for server sync'; END IF;
  IF public.trader_has_feature(NEW.user_id, 'unlimited_trades') THEN RETURN NEW; END IF;
  PERFORM pg_advisory_xact_lock(hashtextextended(NEW.user_id::text, 0));
  IF (SELECT count(*) FROM public.trades WHERE user_id = NEW.user_id AND mt5_account_id IS NULL AND broker_account_id IS NULL AND metaapi_deal_id IS NULL) >= 10 THEN
    RAISE EXCEPTION 'Free includes 10 manual trades. Upgrade to Pro for unlimited trades.' USING ERRCODE = 'P0001';
  END IF;
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.enforce_free_trade_limit() FROM PUBLIC, anon, authenticated;
CREATE TRIGGER enforce_free_trade_limit BEFORE INSERT ON public.trades FOR EACH ROW EXECUTE FUNCTION public.enforce_free_trade_limit();
CREATE TABLE public.conversion_events (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), event_name text NOT NULL CHECK (event_name IN ('landing_view','pricing_view','start_free_clicked','checkout_clicked','signup_completed','onboarding_completed','first_trade_added','broker_connect_clicked')), created_at timestamptz NOT NULL DEFAULT now());
GRANT INSERT (event_name) ON public.conversion_events TO anon, authenticated;
GRANT ALL ON public.conversion_events TO service_role;
ALTER TABLE public.conversion_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Append anonymous conversion events" ON public.conversion_events FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE INDEX conversion_events_name_date_idx ON public.conversion_events(event_name, created_at);
COMMENT ON TABLE public.conversion_events IS 'Aggregate conversion events only. No user IDs, credentials, account information or browser fingerprints.';