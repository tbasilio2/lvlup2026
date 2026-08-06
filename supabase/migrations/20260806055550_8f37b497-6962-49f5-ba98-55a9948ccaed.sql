CREATE TABLE public.weekly_reports (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  week_start DATE NOT NULL,
  week_end DATE NOT NULL,
  stats JSONB NOT NULL DEFAULT '{}'::jsonb,
  report JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (user_id, week_start)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.weekly_reports TO authenticated;
GRANT ALL ON public.weekly_reports TO service_role;
ALTER TABLE public.weekly_reports ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own weekly reports" ON public.weekly_reports FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);