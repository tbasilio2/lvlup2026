
CREATE TABLE public.chart_analyses (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  kind TEXT NOT NULL,
  symbol TEXT,
  direction TEXT,
  entry_price TEXT,
  stop_loss TEXT,
  take_profit TEXT,
  risk_reward TEXT,
  quality NUMERIC,
  screenshot_url TEXT,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.chart_analyses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own chart_analyses"
  ON public.chart_analyses FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own chart_analyses"
  ON public.chart_analyses FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own chart_analyses"
  ON public.chart_analyses FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE INDEX idx_chart_analyses_user_created ON public.chart_analyses(user_id, created_at DESC);
