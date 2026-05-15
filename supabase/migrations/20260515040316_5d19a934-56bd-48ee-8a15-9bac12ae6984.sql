
-- 1. Make trade-screenshots bucket private
UPDATE storage.buckets SET public = false WHERE id = 'trade-screenshots';

-- 2. Drop overly-permissive public read policy if present
DROP POLICY IF EXISTS "Public trade screenshot read access" ON storage.objects;
DROP POLICY IF EXISTS "Public read access" ON storage.objects;

-- 3. Ensure authenticated owner read policy exists
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage' AND tablename = 'objects'
      AND policyname = 'Users can read own trade screenshots'
  ) THEN
    CREATE POLICY "Users can read own trade screenshots"
      ON storage.objects FOR SELECT TO authenticated
      USING (bucket_id = 'trade-screenshots' AND (storage.foldername(name))[1] = auth.uid()::text);
  END IF;
END $$;

-- 4. Remove trades from the realtime publication (no client subscribes)
DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'trades'
  ) THEN
    EXECUTE 'ALTER PUBLICATION supabase_realtime DROP TABLE public.trades';
  END IF;
END $$;

-- 5. Restrict realtime.messages to authenticated users (default-deny for anon)
ALTER TABLE realtime.messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated users can receive realtime" ON realtime.messages;
CREATE POLICY "Authenticated users can receive realtime"
  ON realtime.messages FOR SELECT TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Authenticated users can send realtime" ON realtime.messages;
CREATE POLICY "Authenticated users can send realtime"
  ON realtime.messages FOR INSERT TO authenticated
  WITH CHECK (true);
