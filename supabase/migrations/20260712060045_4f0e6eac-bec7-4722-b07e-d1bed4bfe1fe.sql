DROP INDEX IF EXISTS public.trades_user_metaapi_deal_unique;
ALTER TABLE public.trades ADD CONSTRAINT trades_user_metaapi_deal_unique UNIQUE (user_id, metaapi_deal_id);