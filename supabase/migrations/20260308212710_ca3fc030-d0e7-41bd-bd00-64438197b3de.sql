-- Create trades table
CREATE TABLE public.trades (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  symbol text NOT NULL,
  direction text NOT NULL CHECK (direction IN ('long', 'short')),
  entry_price numeric NOT NULL,
  exit_price numeric,
  quantity numeric NOT NULL DEFAULT 1,
  entry_date timestamptz NOT NULL,
  exit_date timestamptz,
  pnl numeric,
  fees numeric DEFAULT 0,
  strategy text,
  notes text,
  screenshot_url text,
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'closed')),
  tags text[] DEFAULT '{}'
);

ALTER TABLE public.trades ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can CRUD own trades"
ON public.trades FOR ALL TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Create storage bucket for trade screenshots
INSERT INTO storage.buckets (id, name, public) VALUES ('trade-screenshots', 'trade-screenshots', true);

CREATE POLICY "Users can upload own trade screenshots"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'trade-screenshots' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Users can update own trade screenshots"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'trade-screenshots' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Users can delete own trade screenshots"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'trade-screenshots' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Public trade screenshot read access"
ON storage.objects FOR SELECT TO public
USING (bucket_id = 'trade-screenshots');

-- Enable realtime for trades
ALTER PUBLICATION supabase_realtime ADD TABLE public.trades;